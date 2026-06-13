# Plan 007: Backfill the 36 missing translation keys across all 19 locales

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 104a551..HEAD -- src/i18n`
> If the i18n files changed since this plan was written, re-run
> `bun scripts/check-translations.ts` to get the current missing-key set before
> proceeding.

## Why this matters

`bun scripts/check-translations.ts` currently reports **0/19 languages passing**:
every non-English locale is missing the same ~36 keys (the `settings.longAudioModel.*`
group, several `settings.general.shortcut.*` keys, `settings.models.tabs.*`, etc.).
These keys exist only in the English reference. Two concrete costs:

1. The translation-consistency check fails, so it cannot be used as a CI gate —
   real future regressions hide in the existing noise.
2. For every non-English user, those ~36 strings are untranslated. (They render
   as English at runtime because `src/i18n/index.ts` sets `fallbackLng: "en"`, so
   the UI is not *broken* — but features like the Long Audio Model settings show
   only in English regardless of the chosen language.)

Backfilling the keys makes the check pass (restoring it as a gate) and makes the
untranslated strings explicit so translators can fill them in.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: i18n
- **Planned at**: commit `104a551`, 2026-06-13

## Current state

- `src/i18n/locales/en/translation.json` is the **reference** and is complete.
- The other 19 locale directories each contain a `translation.json` missing the
  same set of keys. Sampled English values for the missing keys:

```json
"settings.longAudioModel": {
  "title": "Long Audio Model",
  "description": "Automatically switch to a different model when recording duration exceeds the threshold.",
  "modelLabel": "Model for long recordings",
  "modelDescription": "Select a model to use for recordings longer than the threshold.",
  "thresholdLabel": "Duration threshold (seconds)",
  "thresholdDescription": "Switch to the long audio model when recording exceeds this duration.",
  "disabled": "Disabled",
  "seconds": "{{value}}s"
},
"settings.general.shortcut.clickToSet": "Click to set",
"settings.general.shortcut.bindings.show_history.name": "Show History",
"settings.models.tabs": { "transcription": "Transcription", "processing": "Processing" }
```
  (…and ~26 more, all reported by the check script.)

- `scripts/check-translations.ts` compares **nested** key paths: the reference is
  walked recursively (`getAllKeyPaths`), and each locale is checked with
  `hasKeyPath`. So missing keys must be inserted at the correct nesting position,
  not as flat dotted strings.

- The full, authoritative list of missing keys per locale is whatever
  `bun scripts/check-translations.ts` prints — use the script output, not this
  excerpt, as the source of truth.

## Commands you will need

| Purpose            | Command                                | Expected on success |
|--------------------|----------------------------------------|---------------------|
| Translation check  | `bun scripts/check-translations.ts`    | `✓ All 19 languages have complete translations!`, exit 0 |
| JSON sanity        | `bunx prettier --check "src/i18n/locales/**/*.json"` | exit 0 (after formatting in Step 3) |

## Scope

**In scope** (modify only these):
- The 19 non-English `src/i18n/locales/<lang>/translation.json` files.

**Out of scope** (do NOT touch):
- `src/i18n/locales/en/translation.json` — it is the complete reference; changing
  it changes the contract for every locale.
- `scripts/check-translations.ts` — do not weaken or modify the checker.
- `src/i18n/index.ts`, `languages.ts`, and any component using `t(...)`.

## Git workflow

- Branch: `advisor/007-fill-missing-translation-keys`
- Commit message style: conventional commits, e.g.
  `chore(i18n): backfill missing translation keys with English placeholders`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the missing-key set

Run `bun scripts/check-translations.ts` and capture the output. Note that each
locale is missing the same ~36 keys. This is the work list.

### Step 2: Backfill missing keys from English (deep-merge)

The reliable, deterministic way to insert ~36 nested keys into 19 files is a
one-off merge script that copies any key present in `en` but missing in a locale,
using the **English value as a placeholder**. Create a temporary script
`scripts/_sync-translations.tmp.ts`:

```ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES = path.join(__dirname, "..", "src", "i18n", "locales");
const REF = "en";

type Obj = Record<string, unknown>;

// Insert keys from `ref` that are missing in `target`, in place. Returns count.
function fillMissing(ref: Obj, target: Obj): number {
  let added = 0;
  for (const key of Object.keys(ref)) {
    const rv = ref[key];
    if (rv && typeof rv === "object" && !Array.isArray(rv)) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      added += fillMissing(rv as Obj, target[key] as Obj);
    } else if (!(key in target)) {
      target[key] = rv; // English placeholder
      added++;
    }
  }
  return added;
}

const ref = JSON.parse(
  fs.readFileSync(path.join(LOCALES, REF, "translation.json"), "utf8"),
) as Obj;

for (const lang of fs.readdirSync(LOCALES)) {
  if (lang === REF) continue;
  const file = path.join(LOCALES, lang, "translation.json");
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as Obj;
  const added = fillMissing(ref, data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`${lang}: +${added} keys`);
}
```

Run it: `bun scripts/_sync-translations.tmp.ts`. It will report `+N keys` per
locale (N ≈ 36).

This only **adds** missing keys; it never overwrites an existing translated
value, and it never removes "extra" keys.

**Verify**: `bun scripts/check-translations.ts` → `✓ All 19 languages have
complete translations!`, exit 0.

### Step 3: Format and remove the temporary script

- Format the touched JSON so it matches repo style:
  `bunx prettier --write "src/i18n/locales/**/translation.json"`.
- Delete the temporary script (use the repo's deletion-safe convention — `trash`
  or `git`-tracked removal — not `rm -rf`):
  `trash scripts/_sync-translations.tmp.ts` (the file was never committed, so
  this just removes it from the working tree).

**Verify**:
- `git status` shows changes only under `src/i18n/locales/` (19 files) and **no**
  leftover `_sync-translations.tmp.ts`.
- `bun scripts/check-translations.ts` → still passes (exit 0).

## Test plan

- The check script *is* the test: `bun scripts/check-translations.ts` must report
  19/19 passing.
- Spot-check two locale files (e.g. `fr` and `ja`) to confirm the new keys landed
  at the correct nesting (e.g. a real `settings.longAudioModel.title` object path,
  not a flat `"settings.longAudioModel.title"` string key).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun scripts/check-translations.ts` exits 0 and prints "All 19 languages
      have complete translations!".
- [ ] `src/i18n/locales/en/translation.json` is unchanged (`git diff --stat`
      shows no entry for it).
- [ ] `scripts/check-translations.ts` is unchanged.
- [ ] No temporary script remains (`ls scripts/_sync-translations.tmp.ts` → not
      found).
- [ ] `git status` shows only the 19 non-English `translation.json` files
      modified.
- [ ] `plans/README.md` status row for plan 007 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- After running, `check-translations.ts` reports **extra** keys in some locale
  (keys present in a locale but not in `en`). That is a pre-existing divergence
  the merge does not fix; report it rather than deleting keys.
- The missing-key set printed by the script differs wildly from ~36 per locale
  (e.g. hundreds), implying the reference file drifted — re-verify against the
  current `en`.
- The script reports `+0 keys` for a locale that the check still marks as
  failing (indicates a structural mismatch, e.g. a string where `en` has an
  object).

## Maintenance notes

- The inserted values are **English placeholders**. Native translations are a
  follow-up — ideally tracked by marking these keys for translators (e.g. a
  `// TODO translate` companion list) or a community PR request. The app already
  falls back to English at runtime, so placeholders don't regress UX.
- Once green, wire `bun scripts/check-translations.ts` into CI / pre-commit so the
  check stays at 19/19 — deliberately out of scope here, but this plan makes it
  possible.
- A reviewer should confirm no real existing translation was overwritten (the
  merge is additive-only by construction; the diff should show only insertions).
