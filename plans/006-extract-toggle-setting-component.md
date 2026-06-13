# Plan 006: Extract a shared `ToggleSetting` component and collapse the duplicated toggles

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- src/components/settings`
> If the settings components changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Why this matters

There are eleven boolean-toggle settings components that are character-for-
character the same except for the setting key, the i18n label/description keys,
and the default value. Each is ~30 lines of identical `useSettings()` +
`ToggleSwitch` boilerplate. Any change to the toggle pattern (a prop rename on
`ToggleSwitch`, an analytics hook, a loading style) means editing eleven files
and risks copy-paste drift. Extracting one `ToggleSetting` component removes ~250
lines of duplication and gives a single place to evolve the pattern, while
keeping every existing component name and call site intact (so the settings pages
don't need to change).

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

`src/hooks/useSettings.ts` exposes the hook used by all of these:

```ts
const { getSetting, updateSetting, isUpdating } = useSettings();
// getSetting<K extends keyof Settings>(key: K): Settings[K] | undefined
// updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>
// isUpdating(key: string): boolean
```

The eleven components to collapse all follow this exact shape (example —
`src/components/settings/StartHidden.tsx`):

```tsx
export const StartHidden: React.FC<StartHiddenProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const startHidden = getSetting("start_hidden") ?? false;
    return (
      <ToggleSwitch
        checked={startHidden}
        onChange={(enabled) => updateSetting("start_hidden", enabled)}
        isUpdating={isUpdating("start_hidden")}
        label={t("settings.advanced.startHidden.label")}
        description={t("settings.advanced.startHidden.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
        tooltipPosition="bottom"
      />
    );
  },
);
```

The **eleven components in scope**, with their setting key, label key,
description key, default, and any extra `ToggleSwitch` prop:

| Component file | setting key | label key | description key | default | extra prop |
|---|---|---|---|---|---|
| `StartHidden.tsx` | `start_hidden` | `settings.advanced.startHidden.label` | `...startHidden.description` | `false` | `tooltipPosition="bottom"` |
| `ShowTrayIcon.tsx` | `show_tray_icon` | `settings.advanced.showTrayIcon.label` | `...showTrayIcon.description` | `true` | `tooltipPosition="bottom"` |
| `AlwaysOnMicrophone.tsx` | `always_on_microphone` | `settings.debug.alwaysOnMicrophone.label` | `...alwaysOnMicrophone.description` | `false` | — |
| `AppendTrailingSpace.tsx` | `append_trailing_space` | `settings.debug.appendTrailingSpace.label` | `...appendTrailingSpace.description` | `false` | — |
| `AutostartToggle.tsx` | `autostart_enabled` | `settings.advanced.autostart.label` | `...autostart.description` | `false` | — |
| `ExperimentalToggle.tsx` | `experimental_enabled` | `settings.advanced.experimentalToggle.label` | `...experimentalToggle.description` | `false` | — |
| `LazyStreamClose.tsx` | `lazy_stream_close` | `settings.advanced.lazyStreamClose.label` | `...lazyStreamClose.description` | `false` | — |
| `MuteWhileRecording.tsx` | `mute_while_recording` | `settings.debug.muteWhileRecording.label` | `...muteWhileRecording.description` | `false` | — |
| `PushToTalk.tsx` | `push_to_talk` | `settings.general.pushToTalk.label` | `...pushToTalk.description` | `false` | — |
| `TranslateToEnglish.tsx` | `translate_to_english` | `settings.advanced.translateToEnglish.label` | `...translateToEnglish.description` | `false` | — |
| `UpdateChecksToggle.tsx` | `update_checks_enabled` | `settings.debug.updateChecks.label` | `...updateChecks.description` | `true` | — |

**Excluded — do NOT migrate** (it is not a pure toggle; it also renders a
`VolumeSlider` and `SoundPicker`):
- `src/components/settings/AudioFeedback.tsx`

`ToggleSwitch` lives at `src/components/ui/ToggleSwitch.tsx`. The props used
above (`checked`, `onChange`, `isUpdating`, `label`, `description`,
`descriptionMode`, `grouped`, `tooltipPosition`) are its existing public props —
do not change `ToggleSwitch`.

## Commands you will need

| Purpose   | Command               | Expected on success |
|-----------|-----------------------|---------------------|
| Typecheck | `bunx tsc --noEmit`   | exit 0, no errors   |
| Lint      | `bun run lint`        | exit 0              |

(If plan 001 has landed, `bun run typecheck` is equivalent to `bunx tsc --noEmit`.)

## Scope

**In scope** (modify/create only these):
- Create `src/components/settings/ToggleSetting.tsx`
- Edit the **eleven** component files listed in the table above (rewrite each to
  delegate to `ToggleSetting`, keeping the same exported component name and
  props).

**Out of scope** (do NOT touch):
- `src/components/settings/AudioFeedback.tsx` (excluded above).
- `src/components/ui/ToggleSwitch.tsx` — reused as-is.
- Any settings *page* that renders these components (e.g.
  `general/GeneralSettings.tsx`, `advanced/AdvancedSettings.tsx`,
  `debug/DebugSettings.tsx`). Because each component keeps its name, exported
  symbol, and prop signature, the call sites must not need changes.
- `src/components/settings/index.ts` barrel exports — names are unchanged.

## Git workflow

- Branch: `advisor/006-extract-toggle-setting-component`
- Commit message style: conventional commits, e.g.
  `refactor(settings): extract shared ToggleSetting component`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `ToggleSetting.tsx`

Create `src/components/settings/ToggleSetting.tsx`. It owns the hook wiring and
renders `ToggleSwitch`. Constrain the setting key to boolean-valued settings so
`updateSetting` stays type-safe:

```tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";
import type { AppSettings as Settings } from "@/bindings";

// Keys of Settings whose value is a boolean.
type BooleanSettingKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

interface ToggleSettingProps {
  settingKey: BooleanSettingKey;
  labelKey: string;
  descriptionKey: string;
  defaultValue?: boolean;
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  tooltipPosition?: "top" | "bottom";
}

export const ToggleSetting: React.FC<ToggleSettingProps> = React.memo(
  ({
    settingKey,
    labelKey,
    descriptionKey,
    defaultValue = false,
    descriptionMode = "tooltip",
    grouped = false,
    tooltipPosition,
  }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const checked = getSetting(settingKey) ?? defaultValue;

    return (
      <ToggleSwitch
        checked={checked}
        onChange={(enabled) => updateSetting(settingKey, enabled)}
        isUpdating={isUpdating(settingKey)}
        label={t(labelKey)}
        description={t(descriptionKey)}
        descriptionMode={descriptionMode}
        grouped={grouped}
        tooltipPosition={tooltipPosition}
      />
    );
  },
);
```

If `ToggleSwitch`'s `tooltipPosition` prop is required (not optional) or typed
differently than `"top" | "bottom"`, match its actual type — read
`src/components/ui/ToggleSwitch.tsx` to confirm the exact prop types before
finalizing. Passing `tooltipPosition={undefined}` for the components that don't
set it must behave the same as omitting it today.

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 2: Rewrite each of the eleven components to delegate

For each file in the table, keep the exported component name, the `Props`
interface, and `React.memo`, but replace the body with a single `ToggleSetting`.
Example — `StartHidden.tsx` becomes:

```tsx
import React from "react";
import { ToggleSetting } from "./ToggleSetting";

interface StartHiddenProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const StartHidden: React.FC<StartHiddenProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => (
    <ToggleSetting
      settingKey="start_hidden"
      labelKey="settings.advanced.startHidden.label"
      descriptionKey="settings.advanced.startHidden.description"
      defaultValue={false}
      descriptionMode={descriptionMode}
      grouped={grouped}
      tooltipPosition="bottom"
    />
  ),
);
```

Apply the same transform to all eleven, filling `settingKey`, `labelKey`,
`descriptionKey`, `defaultValue`, and `tooltipPosition` from the table. Drop the
now-unused `useTranslation`, `useSettings`, and `ToggleSwitch` imports from each
migrated file.

Do this **one file at a time** and run `bunx tsc --noEmit` after each, so a
mistake is localized.

**Verify after each file**: `bunx tsc --noEmit` → exit 0.

### Step 3: Lint and full typecheck

**Verify**:
- `bunx tsc --noEmit` → exit 0.
- `bun run lint` → exit 0 (no unused-import or i18n-literal errors).

## Test plan

- There is no frontend unit-test runner in this repo (only Playwright), so the
  verification gates are the type-checker and the linter, plus a manual check:
- Manual smoke (only if a dev environment is already running; do not start one
  just for this): open Settings and confirm the General/Advanced/Debug toggles
  still render, reflect stored state, and flip on click. If you cannot run the
  app, state that in your report — the typecheck/lint gates plus the unchanged
  prop signatures are the contract.
- Do NOT add a test runner under this plan (that is plan 011).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/components/settings/ToggleSetting.tsx` exists and is the only new file.
- [ ] All eleven listed components import and render `ToggleSetting` and no longer
      call `useSettings`/`updateSetting` directly.
      Check: `grep -L "ToggleSetting" src/components/settings/{StartHidden,ShowTrayIcon,AlwaysOnMicrophone,AppendTrailingSpace,AutostartToggle,ExperimentalToggle,LazyStreamClose,MuteWhileRecording,PushToTalk,TranslateToEnglish,UpdateChecksToggle}.tsx`
      → returns nothing (every file references `ToggleSetting`).
- [ ] `src/components/settings/AudioFeedback.tsx` is unchanged (`git status`).
- [ ] `bunx tsc --noEmit` exits 0.
- [ ] `bun run lint` exits 0.
- [ ] No settings *page* file or barrel export was modified (`git status` shows
      only `ToggleSetting.tsx` + the eleven component files).
- [ ] `plans/README.md` status row for plan 006 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- Any of the eleven files differs materially from the documented shape (drift) —
  e.g. it now performs a side effect beyond `updateSetting` (like calling a
  plugin API). Such a file is no longer a pure toggle; exclude it and report.
- `ToggleSwitch`'s prop types make the generic `BooleanSettingKey` approach fail
  to type-check and you cannot resolve it without changing `ToggleSwitch`.
- A migrated component's call site turns out to pass a prop not in the documented
  `Props` interface.

## Maintenance notes

- New boolean toggles should be added by rendering `<ToggleSetting .../>` inline
  on the settings page, or by a thin wrapper like the migrated ones — not by
  copy-pasting a new 30-line component.
- A reviewer should confirm defaults match the originals exactly (`show_tray_icon`
  and `update_checks_enabled` default to **true**; the rest default to false) and
  that `tooltipPosition="bottom"` is preserved for `StartHidden` and
  `ShowTrayIcon`.
- `AudioFeedback` was intentionally left out because it composes extra controls;
  if it is ever reduced to a pure toggle it can join this pattern.
