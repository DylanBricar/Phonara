//! Receipt-sequenced clipboard paste ("reliable paste", debug-gated).
//!
//! The legacy clipboard paste (`clipboard::paste_via_clipboard`) restores the
//! previous clipboard after a fixed delay. The paste keystroke is only
//! *enqueued* at that point — the target application reads the clipboard
//! whenever its event loop gets to it, so any fixed delay can lose the race
//! and the user gets their old clipboard pasted back (#502).
//!
//! This module instead publishes the transcript as a *lazy promise* and waits
//! for the operating system to tell us that a consumer actually read the
//! clipboard — a "receipt" — before restoring:
//!
//! - Windows: delayed rendering (`SetClipboardData(CF_UNICODETEXT, NULL)`),
//!   the owner window receives `WM_RENDERFORMAT` on read.
//! - macOS: `declareTypes:owner:` with an owner object, the pasteboard calls
//!   `pasteboard:provideDataForType:` on read.
//!
//! Two rules make the receipt trustworthy:
//!
//! 1. Only receipts observed *after* the paste chord was injected count. A
//!    read before that is an eager third party (clipboard manager, antivirus)
//!    reacting to the clipboard change itself.
//! 2. Restoration only happens while we still own the clipboard
//!    (sequence number / changeCount unchanged, no ownership-lost event). If
//!    the user copied something else in the meantime, their action wins.
//!
//! The restore is additionally gated on a short quiet period after the *last*
//! receipt, because some applications read the clipboard several times per
//! paste (Chromium probes, then reads). A bounded timeout caps how long the
//! transcript may occupy the clipboard; the failure mode is always "the
//! transcript stays on the clipboard a bit longer", never "stale content gets
//! pasted".

// The shared transaction state is compiled on all platforms (for the unit
// tests), but only the macOS/Windows platform modules consume all of it.
#![cfg_attr(not(any(target_os = "macos", target_os = "windows")), allow(dead_code))]

use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc, Arc, Mutex, PoisonError,
};
use std::time::{Duration, Instant};

/// Owns serialization until the platform has actually restored the clipboard.
/// The caller may abandon its future while an OS callback is still queued.
pub(crate) struct PasteTransaction {
    permit: Mutex<Option<tokio::sync::OwnedMutexGuard<()>>>,
    completion: Mutex<Option<mpsc::Sender<Result<(), String>>>>,
    is_cancelled: crate::clipboard::CancellationCheck,
    cancelled: AtomicBool,
    completed: AtomicBool,
}

pub(crate) struct PasteOptions {
    pub auto_submit: bool,
    pub auto_submit_key: crate::settings::AutoSubmitKey,
    pub clipboard_handling: crate::settings::ClipboardHandling,
}

impl PasteTransaction {
    pub(crate) fn new(
        permit: Option<tokio::sync::OwnedMutexGuard<()>>,
        is_cancelled: crate::clipboard::CancellationCheck,
    ) -> (Arc<Self>, mpsc::Receiver<Result<(), String>>) {
        let (sender, receiver) = mpsc::channel();
        (
            Arc::new(Self {
                permit: Mutex::new(permit),
                completion: Mutex::new(Some(sender)),
                is_cancelled,
                cancelled: AtomicBool::new(false),
                completed: AtomicBool::new(false),
            }),
            receiver,
        )
    }

    pub(crate) fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Acquire) || self.is_completed() || (self.is_cancelled)()
    }

    pub(crate) fn cancel(&self) {
        self.cancelled.store(true, Ordering::Release);
    }

    pub(crate) fn is_completed(&self) -> bool {
        self.completed.load(Ordering::Acquire)
    }

    /// Reserve an injection attempt while the caller holds the state lock.
    /// Once marked, a target may still consume the queued chord after Escape.
    pub(crate) fn begin_injection(&self, state: &mut TxState, now: Instant) -> bool {
        if self.is_cancelled() || matches!(evaluate(state, now), WaitDecision::Finish) {
            return false;
        }
        state.injected_at = Some(now);
        true
    }

    pub(crate) fn wait_decision(&self, state: &TxState, now: Instant) -> WaitDecision {
        // Cancellation suppresses future input, but cannot recall a chord
        // already queued in another application's event loop. Keep the lazy
        // transcript published until that read drains or its normal deadline.
        if self.is_cancelled() && state.injected_at.is_none() {
            WaitDecision::Finish
        } else {
            evaluate(state, now)
        }
    }

    pub(crate) fn should_auto_submit(&self, enabled: bool, receipt_seen: bool) -> bool {
        enabled && receipt_seen && !self.is_cancelled()
    }

    pub(crate) fn take_permit(&self) -> Option<tokio::sync::OwnedMutexGuard<()>> {
        self.permit
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .take()
    }

    pub(crate) fn complete(&self, result: Result<(), String>) {
        // Release before waking the caller, but only after restoration. Taking
        // the sender makes completion idempotent (flush and timer may compete).
        let sender = self
            .completion
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .take();
        if let Some(sender) = sender {
            self.completed.store(true, Ordering::Release);
            drop(self.take_permit());
            let _ = sender.send(result);
        }
    }
}

impl Drop for PasteTransaction {
    fn drop(&mut self) {
        self.complete(Err(
            "Reliable paste transaction ended before restoration".to_string()
        ));
    }
}

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
use macos as platform;
#[cfg(target_os = "windows")]
use windows as platform;

/// How long after the *last* observed read the transcript stays on the
/// clipboard before restoring. Covers applications that read the clipboard
/// several times per paste (e.g. Chromium probe-then-read).
pub(crate) const QUIET_PERIOD: Duration = Duration::from_millis(200);

/// Upper bound on how long the transcript may occupy the clipboard before we
/// restore regardless of receipts. Long enough that a realistically loaded
/// target always gets to read first; short enough that a lost keystroke does
/// not strand the transcript on the clipboard for long.
pub(crate) const RESTORE_TIMEOUT: Duration = Duration::from_secs(8);

/// When the chord could not be injected at all, no legitimate receipt can
/// arrive, so restore quickly instead of waiting out the full timeout.
pub(crate) const FAILED_INJECTION_TIMEOUT: Duration = Duration::from_millis(500);

/// Shared, cross-thread record of one paste transaction.
#[derive(Debug)]
pub(crate) struct TxState {
    /// When the transcript was published to the clipboard.
    pub published_at: Instant,
    /// When the paste chord was injected. Only receipts *after* this count as
    /// evidence the target read the transcript — earlier reads are eager third
    /// parties reacting to the clipboard change itself.
    pub injected_at: Option<Instant>,
    /// The chord could not be sent; short-circuit the wait.
    pub injection_failed: bool,
    /// Times at which a consumer requested the clipboard data.
    pub receipts: Vec<Instant>,
    /// Someone else took clipboard ownership (user copied elsewhere, ...).
    pub ownership_lost: bool,
    /// The transaction has already been settled (see flush logic in the
    /// platform modules). This is separate from operation cancellation, which
    /// must still drain a chord that was injected before the user cancelled.
    pub cancelled: bool,
    /// The post-paste Enter (auto-submit) has been sent for this transaction.
    /// (Read on Windows; the macOS path settles via `MacPending::settled`.)
    #[allow(dead_code)]
    pub auto_submit_sent: bool,
    /// First post-injection receipt has been logged.
    pub logged_receipt: bool,
}

impl TxState {
    pub fn new() -> Self {
        Self {
            published_at: Instant::now(),
            injected_at: None,
            injection_failed: false,
            receipts: Vec::new(),
            ownership_lost: false,
            cancelled: false,
            auto_submit_sent: false,
            logged_receipt: false,
        }
    }

    /// Records a read receipt, logging the first one that counts as evidence.
    pub fn record_receipt(&mut self, at: Instant) {
        self.receipts.push(at);
        if !self.logged_receipt {
            if let Some(injected) = self.injected_at {
                if at >= injected {
                    self.logged_receipt = true;
                    log::info!(
                        "[reliable-paste] clipboard read {}ms after chord",
                        at.duration_since(injected).as_millis()
                    );
                }
            }
        }
    }

    pub fn last_receipt_after_injection(&self) -> Option<Instant> {
        let injected = self.injected_at?;
        self.receipts.iter().copied().rev().find(|t| *t >= injected)
    }

    pub fn any_receipt_after_injection(&self) -> bool {
        self.last_receipt_after_injection().is_some()
    }
}

pub(crate) enum WaitDecision {
    KeepWaiting,
    /// Stop waiting; settle the transaction (auto-submit + guarded restore).
    Finish,
}

/// Pure decision: given the current transaction state, keep waiting for the
/// target to read, or finish now. Both platform event loops call this.
pub(crate) fn evaluate(state: &TxState, now: Instant) -> WaitDecision {
    if state.ownership_lost || state.cancelled {
        return WaitDecision::Finish;
    }
    if let Some(last) = state.last_receipt_after_injection() {
        if now.duration_since(last) >= QUIET_PERIOD {
            return WaitDecision::Finish;
        }
    }
    let deadline = if state.injection_failed {
        FAILED_INJECTION_TIMEOUT
    } else {
        RESTORE_TIMEOUT
    };
    if now.duration_since(state.published_at) >= deadline {
        return WaitDecision::Finish;
    }
    WaitDecision::KeepWaiting
}

/// Modifier hold for the receipt-sequenced chord, kept at parity with the
/// legacy path (100ms) for the beta: that hold was added in #165 because real
/// users' systems dropped chords released too quickly, and the beta should
/// validate the receipt mechanism without changing a second variable.
///
/// Once receipts are proven in the field this becomes a safe tuning knob — a
/// chord the target never recognizes produces no receipt and is logged ("no
/// read within timeout") rather than failing silently, so a shorter hold
/// (measured working at 10ms on a fast machine, cutting visible latency from
/// ~110ms to ~20ms) can be tried as its own experiment later.
const CHORD_HOLD_MS: u64 = 100;

/// Sends the platform paste chord for the configured method.
pub(crate) fn send_chord(
    enigo: &mut enigo::Enigo,
    paste_method: &crate::settings::PasteMethod,
) -> Result<(), String> {
    use crate::settings::PasteMethod;
    match paste_method {
        PasteMethod::CtrlV => crate::input::send_paste_ctrl_v(enigo, CHORD_HOLD_MS),
        PasteMethod::CtrlShiftV => crate::input::send_paste_ctrl_shift_v(enigo, CHORD_HOLD_MS),
        PasteMethod::ShiftInsert => crate::input::send_paste_shift_insert(enigo, CHORD_HOLD_MS),
        other => Err(format!(
            "Invalid paste method for clipboard paste: {:?}",
            other
        )),
    }
}

/// Attempts the receipt-sequenced paste. Returns `Err` before anything has
/// been published when the platform transaction cannot start, in which case
/// the caller should fall back to the legacy paste path. On `Ok`, publishing
/// and chord injection have completed and the guarded restore (plus
/// auto-submit) finishes asynchronously.
#[cfg(any(target_os = "macos", target_os = "windows"))]
pub(crate) fn try_reliable_paste(
    text: &str,
    app_handle: &tauri::AppHandle,
    paste_method: &crate::settings::PasteMethod,
    enigo: &mut enigo::Enigo,
    options: PasteOptions,
    transaction: Arc<PasteTransaction>,
) -> Result<(), String> {
    platform::run(text, app_handle, paste_method, enigo, options, transaction)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn transaction_keeps_serialization_until_restore_even_if_caller_abandons_it() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.clone().lock_owned().await;
        let (transaction, completion) = PasteTransaction::new(Some(permit), Arc::new(|| false));
        drop(completion);
        transaction.cancel();
        assert!(transaction.is_cancelled());
        assert!(
            lock.try_lock().is_err(),
            "cancellation must not expose intermediate clipboard"
        );

        transaction.complete(Ok(()));
        assert!(
            lock.try_lock().is_ok(),
            "restoration releases serialization"
        );
    }

    #[tokio::test]
    async fn restore_error_is_terminal_and_completion_is_idempotent() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.clone().lock_owned().await;
        let (transaction, completion) = PasteTransaction::new(Some(permit), Arc::new(|| false));

        transaction.complete(Err("restore failed".to_string()));
        transaction.complete(Ok(()));
        assert_eq!(
            completion.try_recv().unwrap(),
            Err("restore failed".to_string())
        );
        assert!(lock.try_lock().is_ok());
    }

    #[tokio::test]
    async fn transaction_abandonment_signals_failure_and_releases_serialization() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.clone().lock_owned().await;
        let (transaction, completion) = PasteTransaction::new(Some(permit), Arc::new(|| false));
        drop(transaction);
        assert!(completion.try_recv().unwrap().is_err());
        assert!(lock.try_lock().is_ok());
    }

    #[tokio::test]
    async fn completed_transaction_cannot_inject_a_late_chord_or_submit() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.lock_owned().await;
        let (transaction, _completion) = PasteTransaction::new(Some(permit), Arc::new(|| false));
        assert!(!transaction.is_cancelled());
        transaction.complete(Ok(()));
        assert!(
            transaction.is_cancelled(),
            "input queued after restoration must be suppressed"
        );
        let mut state = TxState::new();
        assert!(!transaction.begin_injection(&mut state, Instant::now()));
        assert!(state.injected_at.is_none());
        assert!(!transaction.should_auto_submit(true, true));
    }

    #[tokio::test]
    async fn cancel_after_chord_preserves_transcript_until_target_reads_and_goes_quiet() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.clone().lock_owned().await;
        let user_cancelled = Arc::new(AtomicBool::new(false));
        let cancel_signal = Arc::clone(&user_cancelled);
        let (transaction, completion) = PasteTransaction::new(
            Some(permit),
            Arc::new(move || cancel_signal.load(Ordering::Acquire)),
        );
        let mut state = TxState::new();
        let published = state.published_at;
        assert!(transaction.begin_injection(&mut state, published + Duration::from_millis(1)));

        // Escape arrives after Ctrl+V was queued, before the target's event
        // loop reads the clipboard. The old code restored immediately here.
        user_cancelled.store(true, Ordering::Release);
        assert!(matches!(
            transaction.wait_decision(&state, published + Duration::from_millis(2)),
            WaitDecision::KeepWaiting
        ));
        assert!(lock.try_lock().is_err());
        assert!(matches!(
            completion.try_recv(),
            Err(mpsc::TryRecvError::Empty)
        ));

        let first_read = published + Duration::from_millis(50);
        state.record_receipt(first_read);
        assert!(matches!(
            transaction.wait_decision(&state, first_read),
            WaitDecision::KeepWaiting
        ));
        assert!(
            !transaction.should_auto_submit(true, true),
            "Escape must suppress delayed Enter"
        );

        // Chromium can probe, then read again: use the final receipt's quiet
        // period even though the operation has already been cancelled.
        let last_read = published + Duration::from_millis(100);
        state.record_receipt(last_read);
        assert!(matches!(
            transaction.wait_decision(&state, first_read + QUIET_PERIOD),
            WaitDecision::KeepWaiting
        ));
        assert!(matches!(
            transaction.wait_decision(&state, last_read + QUIET_PERIOD),
            WaitDecision::Finish
        ));
        transaction.complete(Ok(()));
        assert_eq!(completion.try_recv().unwrap(), Ok(()));
        assert!(lock.try_lock().is_ok());
    }

    #[tokio::test]
    async fn cancelled_injected_chord_without_receipt_still_has_a_bounded_drain() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.lock_owned().await;
        let (transaction, _completion) = PasteTransaction::new(Some(permit), Arc::new(|| false));
        let mut state = TxState::new();
        let published = state.published_at;
        assert!(transaction.begin_injection(&mut state, published));
        transaction.cancel();

        assert!(matches!(
            transaction.wait_decision(
                &state,
                published + RESTORE_TIMEOUT - Duration::from_millis(1)
            ),
            WaitDecision::KeepWaiting
        ));
        assert!(matches!(
            transaction.wait_decision(&state, published + RESTORE_TIMEOUT),
            WaitDecision::Finish
        ));
        assert!(!transaction.should_auto_submit(true, true));
    }

    #[tokio::test]
    async fn cancellation_before_injection_never_queues_input_and_can_restore_immediately() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.lock_owned().await;
        let (transaction, _completion) = PasteTransaction::new(Some(permit), Arc::new(|| false));
        let mut state = TxState::new();
        let published = state.published_at;
        assert!(!transaction.should_auto_submit(true, false));
        assert!(!transaction.should_auto_submit(false, true));
        assert!(transaction.should_auto_submit(true, true));
        transaction.cancel();

        assert!(!transaction.begin_injection(&mut state, published));
        assert!(state.injected_at.is_none());
        assert!(matches!(
            transaction.wait_decision(&state, published),
            WaitDecision::Finish
        ));
        assert!(!transaction.should_auto_submit(true, true));
    }

    #[tokio::test]
    async fn timer_claiming_restoration_prevents_a_chord_before_completion_is_signalled() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.lock_owned().await;
        let (transaction, _completion) = PasteTransaction::new(Some(permit), Arc::new(|| false));
        let mut state = TxState::new();
        let published = state.published_at;

        // The native timer reserves settlement under the state lock, then
        // releases it before the clipboard APIs and completion notification.
        state.cancelled = true;
        assert!(!transaction.is_completed());
        assert!(!transaction.begin_injection(&mut state, published));
        assert!(state.injected_at.is_none());

        state.cancelled = false;
        state.ownership_lost = true;
        assert!(!transaction.begin_injection(&mut state, published));
        state.ownership_lost = false;
        assert!(!transaction.begin_injection(&mut state, published + RESTORE_TIMEOUT));
        assert!(state.injected_at.is_none());
    }

    #[tokio::test]
    async fn cancelled_partial_injection_keeps_its_failed_injection_drain() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.lock_owned().await;
        let (transaction, _completion) = PasteTransaction::new(Some(permit), Arc::new(|| false));
        let mut state = TxState::new();
        let published = state.published_at;
        assert!(transaction.begin_injection(&mut state, published));
        state.injection_failed = true;
        transaction.cancel();

        assert!(matches!(
            transaction.wait_decision(
                &state,
                published + FAILED_INJECTION_TIMEOUT - Duration::from_millis(1)
            ),
            WaitDecision::KeepWaiting
        ));
        assert!(matches!(
            transaction.wait_decision(&state, published + FAILED_INJECTION_TIMEOUT),
            WaitDecision::Finish
        ));
        assert!(!transaction.should_auto_submit(true, true));
    }

    fn state_after_publish(published_ago: Duration) -> TxState {
        let mut s = TxState::new();
        s.published_at = Instant::now() - published_ago;
        s
    }

    #[test]
    fn keeps_waiting_without_receipt_within_timeout() {
        let s = state_after_publish(Duration::from_millis(100));
        assert!(matches!(
            evaluate(&s, Instant::now()),
            WaitDecision::KeepWaiting
        ));
    }

    #[test]
    fn finishes_after_quiet_period_once_read() {
        let mut s = state_after_publish(Duration::from_millis(300));
        s.injected_at = Some(Instant::now() - Duration::from_millis(250));
        s.receipts.push(Instant::now() - QUIET_PERIOD);
        assert!(matches!(evaluate(&s, Instant::now()), WaitDecision::Finish));
    }

    #[test]
    fn waits_through_quiet_period_after_recent_read() {
        let mut s = state_after_publish(Duration::from_millis(300));
        s.injected_at = Some(Instant::now() - Duration::from_millis(100));
        s.receipts.push(Instant::now() - Duration::from_millis(50));
        assert!(matches!(
            evaluate(&s, Instant::now()),
            WaitDecision::KeepWaiting
        ));
    }

    #[test]
    fn pre_injection_receipt_does_not_count() {
        let mut s = state_after_publish(Duration::from_millis(300));
        s.receipts.push(Instant::now() - Duration::from_millis(200));
        s.injected_at = Some(Instant::now() - Duration::from_millis(100));
        assert!(!s.any_receipt_after_injection());
        assert!(matches!(
            evaluate(&s, Instant::now()),
            WaitDecision::KeepWaiting
        ));
    }

    #[test]
    fn finishes_on_timeout_without_receipt() {
        let s = state_after_publish(RESTORE_TIMEOUT);
        assert!(matches!(evaluate(&s, Instant::now()), WaitDecision::Finish));
    }

    #[test]
    fn failed_injection_uses_short_timeout() {
        let mut s = state_after_publish(FAILED_INJECTION_TIMEOUT);
        s.injection_failed = true;
        assert!(matches!(evaluate(&s, Instant::now()), WaitDecision::Finish));
    }

    #[test]
    fn ownership_loss_finishes_immediately() {
        let mut s = state_after_publish(Duration::from_millis(10));
        s.ownership_lost = true;
        assert!(matches!(evaluate(&s, Instant::now()), WaitDecision::Finish));
    }
}
