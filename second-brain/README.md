# SecondBrain Mobile — Expo App

> Cross-platform SecondBrain client (iOS/Android/Web) with auth, entry management, offline queueing, voice capture, and brainstorming flows.

---

## What it is

### SecondBrain Mobile

A mobile-first SecondBrain client for capturing and organizing thoughts, todos, reminders, and notes. It connects to the existing backend APIs and supports both typed and voice-driven workflows.

---

## Architecture

```
You (mobile/web app)
      |
      v
Expo React Native app  ----->  /api/auth/*, /api/entries, /api/settings,
                               /api/telegram/link-key, /api/brainstorm,
                               /api/brainstorm-talk, /api/voice
                                         |
                                         v
                                   Vercel API + Supabase

Local resilience
      |
      v
AsyncStorage/SecureStore cache + offline queue
(retry/sync when network is available)
```

---

## Tech stack

| Layer                     | Technology                                     |
| ------------------------- | ---------------------------------------------- |
| App runtime               | Expo + React Native + React 19                 |
| Navigation                | `@react-navigation/native` + native stack      |
| Platforms                 | iOS, Android, Web                              |
| Auth/session storage      | `expo-secure-store` (fallback to AsyncStorage) |
| Local cache/offline queue | AsyncStorage                                   |
| Audio capture             | `expo-audio`                                   |
| API backend               | Existing Vercel serverless API + Supabase      |
| Testing                   | Jest + `@testing-library/react-native`         |

---

## One-time setup

### 1. Install dependencies

From the project root:

```bash
npm run setup
```

Or install only mobile deps:

```bash
cd second-brain
pnpm install
```

### 2. Configure environment variables

The mobile app reads env vars from (in order):

1. root `.env`
2. `second-brain/.env`
3. root `.env.local` (override)
4. `second-brain/.env.local` (override)

Minimum required mobile variables:

| Variable                                   | Purpose                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`                      | Base API URL (app appends `/api` if missing)                           |
| `EXPO_PUBLIC_SUPABASE_URL`                 | Supabase project URL                                                   |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`     | Supabase publishable key                                               |
| `EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1` | Optional feature flag for brainstorm-talk streaming scaffold (`0`/`1`) |

Required backend/API variables (for `api/` routes used by the app):

| Variable                        | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `JWT_SECRET`                    | JWT signing/verification for auth routes      |
| `AUTH_USERNAME`                 | Fallback login username                       |
| `AUTH_PASSWORD`                 | Fallback login password                       |
| `GROQ_API_KEY`                  | LLM + Whisper provider key                    |
| `GROQ_MODEL`                    | Model used for text generation/classification |
| `GROQ_WHISPER_MODEL`            | Model used for server-side transcription      |
| `UNREAL_SPEECH_API_KEY`         | Brainstorm-talk TTS provider key              |
| `UNREAL_SPEECH_STT_URL`         | Optional dedicated Unreal STT endpoint        |
| `TELEGRAM_BOT_TOKEN`            | Telegram bot integration                      |
| `TELEGRAM_WEBHOOK_SECRET`       | Telegram webhook verification secret          |
| `TELEGRAM_TOKEN_ENCRYPTION_KEY` | Encrypts stored Telegram link auth tokens     |

Notes:

- For physical devices, use your machine LAN IP (not `localhost`) in `EXPO_PUBLIC_API_URL`.
- Non-local `http://` URLs are normalized to `https://` by the app.

### 3. Start the app

```bash
cd second-brain
npm run start
```

Then open iOS simulator, Android emulator, or web from Expo.

---

## Current app state

- Auth-gated navigation with login and token/refresh-token persistence.
- Core entry workflows: create, edit, archive/unarchive, delete, filter, search, and pagination.
- Offline-first behavior on native: cached entries + queued mutations with later sync.
- Voice capture flow for creating entries from recorded audio.
- Brainstorm chat screen plus brainstorm talk screen with microphone-driven interaction.
- Queued edits management screen for pending offline-created entries.
- Settings modal with timezone update and Telegram link-key generation/copy.
- Web-only imports for LLM conversation history:

1. JSON upload
2. ChatGPT/Claude shared conversation URL import

---

## Local development

Run Expo:

```bash
cd second-brain
npm run start
```

Platform-specific commands:

```bash
npm run ios
npm run android
npm run web
```

The app defaults API calls to `http://localhost:3000/api` when `EXPO_PUBLIC_API_URL` is not set.

---

## Project structure

```
second-brain/
├── App.js                                  # App bootstrap + navigation + linking
├── src/
│   ├── api.js                              # API client, auth token lifecycle, cache helpers
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── SecondBrainScreen.js
│   │   ├── SecondBrainEntryDetailsScreen.js
│   │   ├── SecondBrainEditEntryScreen.js
│   │   ├── SecondBrainBrainstormScreen.js
│   │   ├── SecondBrainBrainstormTalkScreen.js
│   │   ├── SecondBrainVoiceCaptureScreen.js
│   │   └── SecondBrainQueuedEditsScreen.js
│   ├── hooks/                              # Data loading, filtering, settings, voice/stream hooks
│   ├── components/                         # Reusable UI components
│   ├── services/                           # Audio + brainstorm streaming transport services
│   ├── utils/                              # Parsing, formatting, session, responsive helpers
│   ├── constants/
│   └── __tests__/
├── widgets/                                # iOS widget extension files
├── assets/
├── app.config.js                           # Env loading + Expo config extension
├── app.json
├── metro.config.js
├── jest.config.js
└── package.json
```

---

## Scripts

| Command           | Description             |
| ----------------- | ----------------------- |
| `npm run start`   | Start Expo dev server   |
| `npm run ios`     | Run iOS app             |
| `npm run android` | Run Android app         |
| `npm run web`     | Run web target via Expo |
| `npm run test`    | Run Jest test suite     |

---

## Testing

```bash
cd second-brain
npm run test
```

The test suite covers screens, hooks, components, API helpers, and service utilities.
