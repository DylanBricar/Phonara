# Parler Platform Plan

## Status

- Owner: Parler project
- Related tracker item: https://github.com/Melvynx/Parler/issues/11
- Scope: desktop app, web app, mobile app, cloud storage, auth, sharing, and review
- Target outcome: turn Parler from a desktop speech-to-text app into a cross-platform voice-to-text platform

## Executive Summary

Parler should become a voice-first writing and sharing system across desktop, web, and mobile.

The first important vertical slice is:

1. A signed-in desktop user records or imports audio.
2. Parler transcribes locally and preserves timestamped segments.
3. The user uploads MP3 audio and transcript metadata.
4. Audio is stored in Cloudflare R2.
5. Metadata is stored in Convex.
6. The user receives a shareable listen URL.
7. The listen URL opens a polished web player with synchronized transcript playback.

After that path is stable, Parler Mobile is added from `nowstack-mobile` to create a Wispr Flow-like mobile experience with a React Native app shell plus native OS integrations.

## Product Goals

### Primary Goals

- Let users dictate on desktop and share the result as a clean web audio page.
- Add a real account layer with Better Auth everywhere.
- Store audio files as MP3 in Cloudflare R2.
- Store users, metadata, transcript segments, device tokens, and library records in Convex.
- Add a beautiful `/listen/audio/{publicId}` page with audio playback and synced transcript highlighting.
- Add a mobile app based on `nowstack-mobile`.
- Add mobile dictation inside the app first.
- Add iOS and Android system-level dictation experiences after the app baseline is stable.

### Secondary Goals

- Support a CLI flow like `parler transcribe-file ./audio.mp3 --upload --copy-link`.
- Sync user dictionary, custom words, and settings across devices.
- Support private, unlisted, and public audio visibility.
- Prepare for local mobile models later without blocking the first release.

### Non-Goals For The First Vertical Slice

- Do not require local mobile models in the first version.
- Do not require a perfect iOS keyboard experience before shipping mobile dictation.
- Do not build billing/paywall until the core product loop works.
- Do not split shared types across duplicated ad hoc definitions.

## Architecture

```txt
Parler/
  src/                         existing desktop React/Tauri frontend
  src-tauri/                   existing Rust desktop backend
  web-app/                     TanStack Start + Better Auth + Convex + R2
  mobile-app/                  Expo React Native app from nowstack-mobile
  packages/
    parler-contracts/          shared TS contracts and API schemas
```

## Source Templates

### Web App Template

Use `nowstack-saas` as the web app source.

Copy and adapt:

- TanStack Start setup
- Better Auth
- Convex integration
- R2/S3 helpers
- provider wiring
- auth routes
- env scripts
- deployment conventions
- UI primitives

### Mobile App Template

Use local `nowstack-mobile` source:

`/Users/melvynx/Developer/apps/nowts-mobile/mobile-app`

Observed stack:

- Expo 54
- React Native 0.81
- Expo Router
- Better Auth Expo
- Convex
- Expo SecureStore
- Expo Linking
- Expo FileSystem
- Expo Media Library
- Expo Web Browser
- R2/S3 SDK packages
- native prebuild workflow

## Domain And App Identifiers

- Web domain: `https://parler.melvynx.dev`
- Desktop auth deep link: `parler://auth/callback`
- Mobile app scheme: `parler://`
- Suggested iOS bundle id: `dev.melvynx.parler`
- Suggested Android package id: `dev.melvynx.parler`

## Shared Data Contracts

Create shared contracts in `packages/parler-contracts`.

### Transcript Segment

```ts
export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};
```

### Audio Visibility

```ts
export type AudioVisibility = "private" | "unlisted" | "public";
```

### Audio File Record

```ts
export type AudioFileRecord = {
  id: string;
  publicId: string;
  userId: string;
  title?: string;
  originalFileName: string;
  mimeType: string;
  durationMs?: number;
  r2Key: string;
  transcriptText: string;
  transcriptSegments: TranscriptSegment[];
  visibility: AudioVisibility;
  createdAt: number;
  updatedAt: number;
};
```

### Upload Result

```ts
export type AudioUploadResult = {
  publicId: string;
  listenUrl: string;
};
```

## Convex Data Model

### `audioFiles`

Purpose: canonical metadata for uploaded audio and transcripts.

Fields:

- `userId`
- `publicId`
- `title`
- `originalFileName`
- `mimeType`
- `durationMs`
- `r2Key`
- `transcriptText`
- `transcriptSegments`
- `visibility`
- `createdAt`
- `updatedAt`

Indexes:

- by public id
- by user and created date
- by R2 key
- by visibility if public discovery is added later

Success criteria:

- A user can create an audio file record.
- A listen page can resolve an unlisted or public record by `publicId`.
- Private records cannot be fetched anonymously.
- A user can list only their own audio files.

### `deviceLoginSessions`

Purpose: short-lived web-to-desktop login exchange.

Fields:

- `code`
- `userId`
- `deviceId`
- `redirectUri`
- `expiresAt`
- `consumedAt`
- `createdAt`

Success criteria:

- Codes expire quickly.
- Codes can be consumed only once.
- Invalid, expired, or consumed codes fail.

### `desktopDevices`

Purpose: track linked desktop installs.

Fields:

- `userId`
- `deviceId`
- `deviceName`
- `lastSeenAt`
- `revokedAt`
- `createdAt`

Success criteria:

- User can see linked devices later.
- Revoked devices cannot upload.

### `desktopTokens`

Purpose: scoped desktop authentication tokens.

Fields:

- `userId`
- `deviceId`
- hashed token
- `expiresAt`
- `revokedAt`
- `createdAt`

Success criteria:

- Raw token is returned only once.
- Stored token is hashed.
- Expired or revoked token cannot upload.

### Mobile Tables

Add only when needed:

- `mobileDictationDrafts`
- `userDictionaryEntries`
- `userVoiceSettings`
- `promptPresets`

Success criteria:

- Mobile app does not block on over-modeled schema.
- Shared history remains consistent across desktop, web, and mobile.

## Authentication Plan

### Web

- Better Auth browser session.
- Convex integration through Better Auth.
- Protected routes for account/library.

Success criteria:

- Signed-out users can sign in.
- Signed-in users can access their library.
- Protected routes redirect correctly.

### Desktop

Flow:

1. Desktop opens `https://parler.melvynx.dev/auth/in-app-sign-in`.
2. Web authenticates user with Better Auth.
3. Web creates a device login code.
4. Web redirects to `parler://auth/callback?code=...`.
5. Tauri handles the deep link.
6. Desktop exchanges code for a scoped token.
7. Desktop stores token securely.

Success criteria:

- Deep link works on macOS, Windows, and Linux where supported.
- Desktop token is not stored in plaintext app settings.
- Revoked or expired token cannot upload.

### Mobile

- Better Auth Expo from nowstack-mobile.
- SecureStore for sensitive state.
- Convex client uses authenticated session.

Success criteria:

- User can sign in on iOS and Android.
- Session persists securely.
- Mobile library data matches web library data.

## Web App Plan

### Required Routes

- `/auth/signin`
- `/auth/signup`
- `/auth/in-app-sign-in`
- `/app/library`
- `/listen/audio/{publicId}`

### `/auth/in-app-sign-in`

Purpose: bridge desktop auth.

Success criteria:

- Requires web auth.
- Accepts optional `device_id` and `redirect_uri`.
- Creates short-lived login code.
- Redirects to `parler://auth/callback?code=...`.
- Shows a manual fallback link if automatic redirect fails.

### `/app/library`

Purpose: private user library.

Success criteria:

- Shows user's uploaded audio files.
- Supports copy listen link.
- Supports open listen page.
- Supports delete.
- Does not show other users' files.

### `/listen/audio/{publicId}`

Purpose: public/unlisted audio player.

Success criteria:

- Loads MP3 audio.
- Shows transcript text.
- Highlights current transcript segment based on audio time.
- Works on mobile and desktop viewports.
- Has copy transcript and copy link actions.
- Handles missing/private/deleted files cleanly.

## Desktop App Plan

### Timed Transcript Preservation

Current risk: desktop transcription currently collapses model results to plain text.

Required change:

- Preserve `segments` returned by the transcription engine.
- Keep existing paste behavior unchanged.
- Store `segments_json` in local history.

Success criteria:

- Existing shortcut transcription still pastes text.
- Local history stores transcript segments.
- Upload path can include transcript segments.

### Account UI

Add account state to settings.

Success criteria:

- User can see signed-in/signed-out state.
- User can start sign-in.
- User can sign out/revoke local token.

### Upload Latest Recording

Required behavior:

- Select latest/current recording.
- Convert or preserve MP3 for upload.
- Upload to R2 through web/Convex contract.
- Store remote URL and status in local history.
- Copy listen link.

Success criteria:

- Upload success copies URL.
- Upload error is visible.
- Retry is possible.
- Local history shows remote link.

### CLI Flow

Target command:

```bash
parler transcribe-file ./audio.mp3 --upload --copy-link
```

Success criteria:

- MP3 input works.
- Transcript segments are uploaded.
- Listen URL is printed.
- `--copy-link` copies URL.

## Mobile App Plan

### Phase 1: Integrate nowstack-mobile

Tasks:

- Copy nowstack-mobile into `mobile-app/`.
- Rename branding to Parler.
- Set bundle identifiers.
- Set `parler://` scheme.
- Wire Better Auth Expo.
- Wire Convex.
- Keep SecureStore and Linking.

Success criteria:

- `mobile-app` boots on iOS simulator.
- `mobile-app` boots on Android emulator.
- User can sign in.
- Auth session persists.

### Phase 2: In-App Dictation

Tasks:

- Add dictate screen.
- Add record button.
- Save temporary audio file.
- Transcribe with cloud/server path first.
- Show editable transcript.
- Save to library.
- Upload MP3 to R2.

Success criteria:

- User can record in mobile app.
- User receives transcript.
- User can copy transcript.
- User can upload and get listen URL.
- Uploaded item appears in web and mobile library.

### Phase 3: iOS Flow-Like Experience

Architecture:

```txt
React Native containing app
  owns microphone session
  records/transcribes
  writes result to App Group

Native iOS Keyboard Extension
  shows Parler button
  opens app through parler://dictate/start
  reads latest result from App Group
  inserts text via textDocumentProxy when possible
```

Success criteria:

- Keyboard extension builds.
- Keyboard can open Parler app.
- Parler can run dictation session.
- Result can be copied or inserted as fallback.
- UX is documented honestly around iOS constraints.

### Phase 4: Android Bubble Or IME

Recommended first step: floating bubble.

Tasks:

- Add native Android overlay/bubble.
- Request required permissions.
- Start dictation from bubble.
- Insert text or copy fallback.

Success criteria:

- Bubble appears around text-entry contexts where allowed.
- User can record from bubble.
- Text can be inserted or copied.
- Password/sensitive contexts are handled conservatively.

## Local Mobile Models Plan

Do not block MVP on this.

V2 options:

- iOS: whisper.cpp with Swift/C++ bridge, ONNX Runtime Mobile, or Core ML.
- Android: whisper.cpp via NDK, or ONNX Runtime Mobile.
- React Native bridge through native module or TurboModule.

Success criteria for V2:

- tiny/base model can run locally.
- Model download and storage works.
- Battery and memory are acceptable.
- Cloud fallback remains available.

## R2 Storage Plan

Use Cloudflare R2 as canonical audio storage.

Required behavior:

- Upload MP3.
- Store R2 object key in Convex.
- Generate public/signed access based on visibility.
- Delete or revoke object when audio record is deleted.

Success criteria:

- Uploaded audio is retrievable from listen page.
- Private files are not publicly accessible.
- Delete removes metadata and storage access.

## Design Requirements

### Web Listen Page

Direction: refined, focused, audio-native.

Success criteria:

- Looks premium on mobile.
- Looks premium on desktop.
- Transcript is readable for long files.
- Player controls are obvious.
- Current segment highlight is smooth and not distracting.

### Mobile App

Direction: fast voice utility, not generic SaaS.

Success criteria:

- Dictate screen is one-tap obvious.
- Recording states are clear.
- Transcript result is easy to copy/edit/save.
- Settings do not dominate the product.

## Security And Privacy Requirements

- Do not store raw desktop tokens in plaintext.
- Hash server-side tokens.
- Keep login codes short-lived.
- Enforce user ownership on all private data.
- Avoid recording in sensitive contexts where possible.
- Be clear about keyboard privacy and permissions.
- Provide delete path for audio records.

Success criteria:

- Unauthorized access tests exist for library and private listen files.
- Token rejection tests cover expired, revoked, and invalid token states.
- Permission copy is clear before mobile microphone/keyboard permissions.

## Phased Delivery

### Milestone 1: Desktop To Web Share

Deliver:

- web-app scaffold
- auth
- Convex schema
- R2 upload
- desktop sign-in bridge
- timed transcript preservation
- upload latest recording
- listen page

Success criteria:

- A real desktop recording can produce a real listen link.

### Milestone 2: Account Library

Deliver:

- web library
- delete
- copy link
- private/unlisted/public rules

Success criteria:

- User can manage uploaded recordings from web.

### Milestone 3: Mobile App Baseline

Deliver:

- mobile-app scaffold
- Better Auth Expo
- Convex session
- mobile library
- in-app dictation
- mobile upload

Success criteria:

- User can record on mobile and see the item on web.

### Milestone 4: Mobile System Integrations

Deliver:

- iOS keyboard extension proof of concept
- Android bubble proof of concept

Success criteria:

- User can start dictation outside the app on iOS and Android with fallback insertion/copy.

### Milestone 5: Local Mobile Models

Deliver:

- native model runtime prototype
- tiny/base model
- cloud fallback

Success criteria:

- Local transcription works on one iOS device and one Android device with acceptable latency.

## Verification Matrix

### Web

- `web-app` installs dependencies.
- `web-app` typechecks.
- `web-app` builds.
- Auth routes work.
- Listen page works with sample uploaded MP3.
- Mobile and desktop viewport screenshots are reviewed.

### Desktop

- Tauri dev build runs.
- Existing transcription still works.
- Timed segments are persisted.
- Deep link works.
- Upload works.
- Link copy works.

### Mobile

- iOS simulator boots.
- Android emulator boots.
- Better Auth Expo login works.
- Convex queries work.
- Recording flow works.
- Upload flow works.

### Security

- Private file anonymous access fails.
- Other-user private file access fails.
- Expired desktop code fails.
- Consumed desktop code fails.
- Revoked token fails.

## Definition Of Done

The project is done when:

- Desktop users can sign in and upload a real transcription.
- Audio is stored as MP3 on R2.
- Convex stores metadata and transcript segments.
- Web listen links work.
- Transcript sync works.
- User library works.
- Mobile app boots and supports signed-in in-app dictation.
- At least one iOS keyboard-extension proof of concept exists.
- At least one Android bubble or IME proof of concept exists.
- All touched projects pass their agreed verification commands.
- UI is reviewed on mobile and desktop.
- Security and privacy flows are reviewed.

## Open Decisions

- Whether desktop upload converts WAV to MP3 locally or asks server-side processing to normalize.
- Whether R2 objects are public with unguessable keys or private with signed URLs.
- Whether Android starts with bubble or full IME.
- Whether iOS insertion should prioritize keyboard insertion or clipboard fallback.
- Whether local mobile models are based on whisper.cpp, ONNX Runtime Mobile, or Core ML first.

