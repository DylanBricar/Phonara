# Microphone diagnostics

`phonara --audio-diagnostics` runs as an independent headless instance. It does not open an input stream, load a speech model, or change microphone preferences. Its JSON includes the raw CPAL identities, Windows input mute controls, saved priorities, data/log paths and three wireless observations.

On Windows, use explicit redirected handles because the executable uses the GUI subsystem:

```powershell
$app = Join-Path $env:LOCALAPPDATA 'Phonara/phonara.exe'
Start-Process $app -ArgumentList '--audio-diagnostics' -Wait -WindowStyle Hidden -RedirectStandardOutput 'microphones.json' -RedirectStandardError 'microphones.stderr.log'
```

To verify capture, pass one exact ID from that report:

```powershell
Start-Process $app -ArgumentList '--probe-microphone', 'wasapi:EXACT-ID-FROM-REPORT' -Wait -WindowStyle Hidden -RedirectStandardOutput 'capture.json' -RedirectStandardError 'capture.stderr.log'
```

The capture probe opens that exact input twice, for 1.5 seconds each: first through the native input API (`capture_probe`), then through Phonara's production recorder, bounded ring and 16 kHz resampler (`recorder_probe`). It reports callback/sample counts, a peak and stream errors. Audio exists only temporarily in memory; it is never saved or transcribed. A successful exit proves both paths delivered samples without a stream error; silence does not prove the headset is off. These reports contain local device IDs and paths, so review them before sharing.

## Availability and fallback

The UI preserves the raw OS inventory. An unavailable reason affects candidate selection without making a Windows-present device look physically disconnected. Windows endpoint mute controls are read without changing their state or opening capture. Hardware mute is supported when its driver exposes it through that control; unsupported hardware states remain unknown.

The explicitly supported Corsair XT receiver is identified by VID/PID, HID collection and exact audio container mapping. The poll reads its connected-slot bitfield before and after probing, checks connected slots 1-7, and repeats each product read. A stable empty slot inventory, or disappearance of the previously identified XT slot with the other slots accounted for, can establish absence after three spaced observations. Timeouts, inconsistent inventories and uncorrelated reports alone never establish absence. Uncertainty retains only an already-confirmed absence until its original eight-second expiry.

Protocol facts were checked against [ckb-next's property table](https://github.com/ckb-next/ckb-next/blob/833ab50951e230674bda02e8448ef6ef365dfd81/src/daemon/bragi_proto.h), [slot enumeration](https://github.com/ckb-next/ckb-next/blob/833ab50951e230674bda02e8448ef6ef365dfd81/src/daemon/bragi_common.c), and [Corsair's Multipoint FAQ](https://help.corsair.com/hc/en-us/articles/4403176744717-SLIPSTREAM-Multipoint-FAQ). These sources document the protocol and receiver capability; the actual slot assignment and physical power/mute transitions still require testing on the user's headset.

Stable IDs remain authoritative. An unambiguous replacement with the same name, or its hardware-qualified Windows display name, is offered as an explicit reconnect action when Windows has assigned a different ID. No automatic guess changes a saved identity. During a capture interruption, Phonara preserves the captured audio and finishes that dictation; the next dictation uses the available fallback. It does not splice a different microphone into the middle of a sentence.
