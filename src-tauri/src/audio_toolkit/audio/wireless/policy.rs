use std::time::{Duration, Instant};

pub(super) const RECEIVER_PRODUCT: u16 = 0x0a64;
pub(super) const HEADSET_PRODUCT: u16 = 0x0a62;
pub(super) const POLL_INTERVAL: Duration = Duration::from_secs(2);
pub(super) const CACHE_TTL: Duration = Duration::from_secs(8);
const REQUIRED_TIMEOUTS: u8 = 3;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Reply {
    Product(u16),
    Unrelated,
    Malformed,
}

/// Product replies do not echo the property. The caller drains older reports,
/// serializes its queries, and accepts only the expected channel and product.
pub(super) fn parse_product_reply(data: &[u8], channel: u8) -> Reply {
    if data.len() < 4 {
        return Reply::Malformed;
    }
    if data[0] != 1 || data[1] != channel || data[2] != 2 {
        return Reply::Unrelated;
    }
    if data.len() < 6 || data[3] != 0 {
        return Reply::Malformed;
    }
    Reply::Product(u16::from_le_bytes([data[4], data[5]]))
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Query {
    Product(u16),
    Timeout,
    Unknown,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(super) enum Observation {
    Reachable,
    RadioTimeout,
    OtherModel,
    #[default]
    Unknown,
}

pub(super) fn classify(receiver: Query, radio: Query) -> Observation {
    if radio == Query::Product(HEADSET_PRODUCT) {
        return Observation::Reachable;
    }
    if matches!(radio, Query::Product(_)) {
        return Observation::OtherModel;
    }
    if receiver == Query::Product(RECEIVER_PRODUCT) && radio == Query::Timeout {
        return Observation::RadioTimeout;
    }
    Observation::Unknown
}

#[derive(Clone, Default)]
pub(super) struct Tracker {
    checked_at: Option<Instant>,
    consecutive_timeouts: u8,
    other_model: bool,
}

impl Tracker {
    pub(super) fn observe(&mut self, observation: Observation, now: Instant) {
        match observation {
            Observation::OtherModel => self.other_model = true,
            Observation::Reachable => self.other_model = false,
            _ => {}
        }
        if self
            .checked_at
            .is_some_and(|last| now.duration_since(last) > CACHE_TTL)
        {
            self.consecutive_timeouts = 0;
        }
        if observation == Observation::RadioTimeout && !self.other_model {
            if self
                .checked_at
                .is_some_and(|last| now.duration_since(last) < POLL_INTERVAL)
            {
                return;
            }
            self.consecutive_timeouts = self
                .consecutive_timeouts
                .saturating_add(1)
                .min(REQUIRED_TIMEOUTS);
        } else {
            self.consecutive_timeouts = 0;
        }
        self.checked_at = Some(now);
    }

    pub(super) fn is_unreachable(&self, now: Instant) -> bool {
        self.consecutive_timeouts >= REQUIRED_TIMEOUTS
            && self
                .checked_at
                .is_some_and(|last| now.duration_since(last) <= CACHE_TTL)
    }
}

pub(super) fn endpoints_for_container(
    endpoints: &[(String, u128)],
    container: u128,
    matching_receivers: usize,
) -> Vec<String> {
    if container == 0 || matching_receivers != 1 {
        return Vec::new();
    }
    endpoints
        .iter()
        .filter(|(_, id)| *id == container)
        .map(|(endpoint, _)| endpoint.clone())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_exact_channel_and_product_reply_are_accepted() {
        assert_eq!(
            parse_product_reply(&[1, 1, 2, 0, 0x62, 0x0a], 1),
            Reply::Product(0x0a62)
        );
        assert_eq!(
            parse_product_reply(&[1, 0, 2, 0, 0x64, 0x0a], 0),
            Reply::Product(0x0a64)
        );
        assert_eq!(
            parse_product_reply(&[1, 0, 2, 0, 0x64, 0x0a], 1),
            Reply::Unrelated
        );
        assert_eq!(parse_product_reply(&[1, 1, 2, 0], 1), Reply::Malformed);
        assert_eq!(
            parse_product_reply(&[1, 1, 2, 4, 0, 0], 1),
            Reply::Malformed
        );
        assert_eq!(
            parse_product_reply(&[1, 1, 1, 0x36, 0, 2], 1),
            Reply::Unrelated
        );
    }

    #[test]
    fn only_confirmed_receiver_with_silent_radio_can_count_as_timeout() {
        assert_eq!(
            classify(Query::Product(RECEIVER_PRODUCT), Query::Timeout),
            Observation::RadioTimeout
        );
        assert_eq!(
            classify(Query::Timeout, Query::Timeout),
            Observation::Unknown
        );
        assert_eq!(
            classify(Query::Unknown, Query::Timeout),
            Observation::Unknown
        );
        assert_eq!(
            classify(Query::Product(0x1234), Query::Timeout),
            Observation::Unknown
        );
        assert_eq!(
            classify(Query::Product(RECEIVER_PRODUCT), Query::Unknown),
            Observation::Unknown
        );
        assert_eq!(
            classify(Query::Product(RECEIVER_PRODUCT), Query::Product(0x1234)),
            Observation::OtherModel
        );
        assert_eq!(
            classify(Query::Timeout, Query::Product(HEADSET_PRODUCT)),
            Observation::Reachable
        );
    }

    #[test]
    fn offline_startup_requires_three_spaced_receiver_confirmed_timeouts() {
        let now = Instant::now();
        let mut tracker = Tracker::default();
        tracker.observe(Observation::RadioTimeout, now);
        assert!(!tracker.is_unreachable(now));
        tracker.observe(Observation::RadioTimeout, now + POLL_INTERVAL);
        assert!(!tracker.is_unreachable(now + POLL_INTERVAL));
        tracker.observe(Observation::RadioTimeout, now + POLL_INTERVAL * 2);
        assert!(tracker.is_unreachable(now + POLL_INTERVAL * 2));
    }

    #[test]
    fn repeated_reads_in_one_tick_do_not_manufacture_offline_confirmation() {
        let now = Instant::now();
        let mut tracker = Tracker::default();
        for _ in 0..10 {
            tracker.observe(Observation::RadioTimeout, now);
        }
        assert!(!tracker.is_unreachable(now));
        tracker.observe(Observation::RadioTimeout, now + POLL_INTERVAL);
        assert!(!tracker.is_unreachable(now + POLL_INTERVAL));
    }

    #[test]
    fn reconnect_and_unknown_clear_offline_immediately() {
        for observation in [Observation::Reachable, Observation::Unknown] {
            let now = Instant::now();
            let mut tracker = Tracker::default();
            for tick in 0..3 {
                tracker.observe(Observation::RadioTimeout, now + POLL_INTERVAL * tick);
            }
            assert!(tracker.is_unreachable(now + POLL_INTERVAL * 2));
            tracker.observe(observation, now + POLL_INTERVAL * 3);
            assert!(!tracker.is_unreachable(now + POLL_INTERVAL * 3));
        }
    }

    #[test]
    fn stale_results_and_sleep_gaps_never_hide_a_microphone() {
        let now = Instant::now();
        let mut tracker = Tracker::default();
        for tick in 0..3 {
            tracker.observe(Observation::RadioTimeout, now + POLL_INTERVAL * tick);
        }
        let stale = now + POLL_INTERVAL * 2 + CACHE_TTL + Duration::from_millis(1);
        assert!(!tracker.is_unreachable(stale));
        tracker.observe(Observation::RadioTimeout, stale);
        assert!(!tracker.is_unreachable(stale));
    }

    #[test]
    fn a_different_radio_model_disables_offline_inference_until_target_returns() {
        let now = Instant::now();
        let mut tracker = Tracker::default();
        tracker.observe(Observation::OtherModel, now);
        tracker.observe(Observation::Unknown, now + POLL_INTERVAL);
        for tick in 2..6 {
            tracker.observe(Observation::RadioTimeout, now + POLL_INTERVAL * tick);
            assert!(!tracker.is_unreachable(now + POLL_INTERVAL * tick));
        }
        tracker.observe(Observation::Reachable, now + POLL_INTERVAL * 6);
        for tick in 7..10 {
            tracker.observe(Observation::RadioTimeout, now + POLL_INTERVAL * tick);
        }
        assert!(tracker.is_unreachable(now + POLL_INTERVAL * 9));
    }

    #[test]
    fn endpoint_mapping_requires_exact_nonempty_unambiguous_container() {
        let endpoints = [("one".into(), 1), ("two".into(), 2), ("unset".into(), 0)];
        assert_eq!(
            endpoints_for_container(&endpoints, 1, 1),
            vec!["one".to_string()]
        );
        assert!(endpoints_for_container(&endpoints, 1, 2).is_empty());
        assert!(endpoints_for_container(&endpoints, 0, 1).is_empty());
        assert!(endpoints_for_container(&endpoints, 3, 1).is_empty());
    }
}
