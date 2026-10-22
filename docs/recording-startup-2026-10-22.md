# Recording startup timing, 22 October 2026

## Failure and cause

In the supplied 0.9.7 diagnostic log, two Corsair recordings stop before the
microphone-ready event. Device opening takes 382 ms and 1,653 ms, and the complete
start effects take 395 ms and 1,965 ms. Each affected capture contains only 331
frames before voice filtering and no usable speech samples. The preceding fast
start correctly classifies a tap and records normally.

The coordinator serializes lifecycle effects, including synchronous WASAPI
startup. It previously assigned each keyboard edge its dequeue time. A release
queued during device opening was therefore measured against that delay instead
of the physical press duration. With the existing 300 ms hold-or-toggle threshold,
a short tap could become a hold and stop recording before the first samples.
The log does not independently establish how long the physical key was held.

## Correction

Capture a monotonic timestamp on entry to the shared shortcut callback, before
settings lookup. Carry it through the coordinator channel and use it for hold
classification, debounce, pending presses and release grace. The same dispatch
path preserves external toggle triggers without debounce. Resolve expired release
grace before a later keyboard edge using their original spacing: queued X11
auto-repeat pairs remain coalesced, while a real second tap still stops recording.

No activation threshold, microphone preference, always-on capture setting, device
driver, power policy, model or history schema changes. The ready cue continues to
require actual microphone samples. Debug timing messages contain binding IDs and
durations, never recognized text or audio.

## Verification scope

Regression tests exercise the actual coordinator channel and dispatcher with
392 ms and 1,965 ms device-startup delays. They cover a short tap that must remain
recording, a genuine long hold, a short push-to-talk press, queued X11 auto-repeat, a second tap and keyboard
debounce. Four of the first five scenarios failed with dequeue-time classification
before applying the timestamp correction. Existing lifecycle tests cover the
other activation modes, pending starts, cancellation and failed startup.

These deterministic tests establish the timing correction without accessing the
user's microphone. Build, installed runtime and operator confirmation are separate
delivery evidence, recorded in the associated change's verification report.

The strict dependency audit also detected that the previously locked Tokio
1.54.0 had been yanked. The lockfile now uses the compatible
[1.54.1 patch](https://github.com/tokio-rs/tokio/releases/tag/tokio-1.54.1), which
reverses the upstream timer regression. Cargo regenerated its existing Windows
dependency edges; no other crate version changed. The existing advisory policy
and exceptions are unchanged.
