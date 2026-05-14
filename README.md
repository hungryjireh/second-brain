# Outlobe — Vercel Deploy

> Voice/text → Groq classify → Supabase store → calendar reminder export → React dashboard.

Everything runs on Vercel: API routes as serverless functions and the bot as a webhook endpoint. No separate server needed.

---

## What it is

### SecondBrain

A website that acts as an extension of the human brain — searchable and less forgettable, but retaining brain-like behaviours like surfacing random memories. 

### OpenBrain

A social journaling app where users post one thought per day. No edits. No deletes. The constraint is the product — it pushes for honesty over performance, and makes each post feel considered.

---

## Architecture

```
You (voice/text)
      │
      ▼
Telegram  ──── POST ────►  /api/bot          (serverless function)
                                │
                                ├──► Groq Whisper   (voice → text)
                                ├──► Groq LLaMA     (classify + parse)
                                └──► Supabase       (store entry)

Browser
      │
      ▼
React SPA  ──► /api/entries, /api/settings, /api/ics, /api/telegram/link-key  ──► Supabase

Reminder delivery
      │
      ▼
No backend polling: reminder notifications are handled by the user's calendar app via downloaded `.ics` files from `/api/ics`.
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Hosting | Vercel (serverless) |
| Bot transport | Telegram webhook → `/api/bot` |
| Voice transcription | Groq Whisper (`whisper-large-v3-turbo`) |
| AI classification | Groq LLaMA (`llama-3.3-70b-versatile`) |
| Database | Supabase (Postgres + Auth + REST/RPC) |
| Reminders | Calendar-based (`.ics` export via `/api/ics`) |
| Frontend | React + Tailwind CSS (Vite) |

---

## One-time setup

### 1. Clone and install

```bash
git clone <your-repo>
cd second-brain-poc
npm run setup        # installs root + webapp deps
```

### 2. Create external services

| Service | Steps |
|---|---|
| **Telegram bot** | Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token |
| **Telegram chat ID** | Message [@userinfobot](https://t.me/userinfobot) → copy the id |
| **Groq API key** | [console.groq.com/keys](https://console.groq.com/keys) |
| **Supabase project** | Create a project at [supabase.com/dashboard](https://supabase.com/dashboard), then copy `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Project Settings → API |

### 3. Run the DB migration

Open the Supabase SQL editor and run the consolidated migration file:

- `scripts/sql/merged_migrations.sql`

Then run:

```bash
node lib/db.js
```

Or add the vars to `.env.local` first, then just `npm run migrate`.

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel                    # follow prompts, links your repo
```

### 5. Add environment variables in Vercel

Go to **Project → Settings → Environment Variables** and add every key from `.env.example`:

| Variable | Where to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `TELEGRAM_CHAT_ID` | @userinfobot |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string, e.g. `openssl rand -hex 32` |
| `GROQ_API_KEY` | console.groq.com |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Project Settings → API |
| `TELEGRAM_TOKEN_ENCRYPTION_KEY` | Random 32+ char secret (used to encrypt stored Telegram link auth tokens) |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `AUTH_USERNAME` | Local fallback login username |
| `AUTH_PASSWORD` | Local fallback login password |
| `CRON_SECRET` | `openssl rand -hex 32` |

### 6. Register the Telegram webhook

After the first successful deploy, run once:

```bash
VERCEL_URL=https://your-app.vercel.app npm run webhook:set
```

Your bot is now live. Test it by sending `/start` in Telegram.

---

## Current webapp state

- Auth-gated SPA with `/login` route and bearer-token session stored in `localStorage`.
- Entry workspace supports create, edit, archive/unarchive, delete, category filtering, search, priority filters, and tag-based filtering.
- Reminder entries support schedule display and one-click `.ics` calendar export.
- User settings currently include timezone persistence (`/api/settings`).
- Telegram account linking is available from the UI via generated `/api/telegram/link-key`.
- API data access is user-scoped through Supabase auth token verification and RLS-aware queries.

---

## Local development

There are two common local workflows now:

- **Frontend-only (Vite)** — runs the React dev server from the root (recommended when you have a backend running separately):

```bash
npm run dev
# or inside the webapp folder:
cd webapp
npm run dev
```

- **Full Vercel dev (API + cron + webapp)** — runs the guarded spawner which sets an env marker to avoid recursive `vercel dev` invocations and then starts `vercel dev`:

```bash
cp .env.example .env.local   # fill in values
npm run dev:vercel
```

`npm run dev` now starts only the Vite dev server. Use `npm run dev:vercel` when you want the Vercel function simulator (API + cron) together with the webapp.

Note: Telegram webhooks cannot reach localhost directly. For local webhook testing, use a tunnel (for example ngrok).

If you prefer to run the frontend while pointing at a backend on port 3000, set `VITE_API_URL` before starting Vite:

```bash
cd webapp
VITE_API_URL=http://localhost:3000 npm run dev
```

Note: the Vite dev server is configured to proxy `/api` to the backend during local development (see `webapp/vite.config.js`). If you run the frontend separately with `npm run dev`, either set `VITE_API_URL` to your backend URL or ensure your backend is available on `http://localhost:3000` so API requests return JSON instead of the frontend HTML.

For Expo/mobile, set `EXPO_PUBLIC_API_URL` so the app can reach your API:

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api npm run start
```

Use your machine's LAN IP (not `localhost`) when testing on a physical phone. `localhost` only works when the API is running on the same device as the app.

---

## Project structure

```
second-brain-poc/
├── api/                      # Vercel serverless functions
│   ├── bot.js                # POST /api/bot
│   ├── entries.js            # GET / POST / PATCH / DELETE /api/entries
│   ├── ics.js                # GET /api/ics?id=...
│   ├── settings.js           # GET / PATCH /api/settings
│   ├── auth/
│   │   └── login.js          # POST /api/auth/login
│   ├── telegram/
│   │   └── link-key.js       # GET /api/telegram/link-key
│   └── tests/                # Node test suites for API handlers/auth/tags
│
├── lib/                      # Shared services (imported by api/*)
│   ├── auth.js               # token helpers + auth verification
│   ├── classify.js           # Groq LLaMA classification
│   ├── db.js                 # Supabase REST/RPC access helpers
│   ├── notify.js             # Telegram sendMessage wrapper
│   └── whisper.js            # Groq Whisper transcription
│
├── scripts/
│   ├── local-api.js          # local API server (Express)
│   ├── set-webhook.js        # npm run webhook:set
│   ├── del-webhook.js        # npm run webhook:del
│   └── sql/                  # Supabase migration SQL
│
├── webapp/                   # React + Tailwind (Vite)
│   └── src/
│       ├── App.jsx
│       ├── Login.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       └── __tests__/
│
├── vercel.json               # Build + routing config
├── .env.example
└── package.json
```

---

## API reference

All protected routes require `Authorization: Bearer <token>`.

| Method | Path | Body / Query | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{ "username": "...", "password": "..." }` | Returns auth token for webapp session |
| `GET` | `/api/entries` | `?category=<string>&cursor=<opaque>&limit=<1-100>` | List entries (optional category filter + cursor pagination) |
| `POST` | `/api/entries` | `{ "description": "...", "category?": "reminder\|todo\|thought\|note", "priority?": 0-10, "tags?": ["..."] }` (also accepts `text` alias) | Classify and create one entry (`tags` in request override LLM-suggested tags) |
| `PATCH` | `/api/entries?id=<number>` | `{ "category?": "...", "title?": "...", "summary?": "...", "description?": "...", "content?": "...", "remind_at?": <unix|null>, "priority?": 0-10, "is_archived?": boolean, "tags?": ["..."] }` | Update one entry |
| `DELETE` | `/api/entries` | `?id=<number>` | Delete entry by ID |
| `GET` | `/api/settings` | — | Fetch current user settings (currently timezone) |
| `PATCH` | `/api/settings` | `{ "timezone": "Area/City" }` | Update timezone |
| `GET` | `/api/telegram/link-key` | — | Generate short-lived Telegram link key for `/link` bot command |
| `POST` | `/api/bot` | Telegram Update JSON | Telegram webhook receiver for text/voice ingestion |
| `GET` | `/api/ics` | `?id=<number>` | Download `.ics` file for a reminder entry |

---

## Migrating to the full plan (auth)

Current state:
1. Protected API routes already require bearer tokens and validate Supabase user identity.
2. The webapp currently uses `POST /api/auth/login` (username/password fallback) for session bootstrap.

Next migration steps:
1. Add magic-link endpoints (`POST /api/auth/request`, `GET /api/auth/verify`) and issue short-lived login tokens after verification.
2. Replace `webapp/src/Login.jsx` password form with email-first magic-link UX.
3. Add email delivery config in Vercel (`RESEND_API_KEY`, sender/from address, optional templates).
4. Keep current bearer-token checks in protected routes; only swap login issuance flow.
5. Decommission fallback credentials (`AUTH_USERNAME`, `AUTH_PASSWORD`) after magic-link rollout and validation.
