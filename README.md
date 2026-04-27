# Second Brain — Vercel Deploy

> Voice/text → Groq classify → Turso store → remind via Telegram → React dashboard.

Everything runs on Vercel: API routes as serverless functions, the bot as a webhook endpoint, and reminders via Vercel Cron. No separate server needed.

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
                                └──► Turso DB       (store entry)

Vercel Cron (every minute)
      │
      ▼
/api/cron  ──► Turso DB (poll due reminders) ──► Telegram (send)

Browser
      │
      ▼
React SPA  ──► /api/entries  ──► Turso DB

---

## Local development architecture

When developing locally there are three common flows:

- Frontend-only (Vite proxy):

      Browser ──► Vite dev server (webapp) ──► `/api` proxy ──► Local backend (http://localhost:3000) ──► lib/db.js ──► Turso

      - Start the frontend and rely on Vite's proxy to forward `/api` requests to your backend. Set `VITE_API_URL` to point at your backend when running `npm run dev` from `webapp` if needed.

- Local API runner (lightweight):

      Browser ──► Vite dev server ──► `/api` proxy ──► `npm run start:api` (scripts/local-api.js) ──► `api/*` handlers ──► lib/db.js ──► Turso

      - Run the local API loader with `npm run start:api` (it preloads dotenv). Use `cp .env.example .env.local` and fill credentials so the API can connect to Turso and Groq.

- Full Vercel simulator (`vercel dev`):

      Browser ──► `vercel dev` (serves webapp + serverless `/api` routes) ──► `api/*` handlers ──► lib/db.js ──► Turso

      - Recommended when you want parity with production serverless behavior. Start with `npm run dev:vercel` after copying `.env.example` to `.env.local`.
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Hosting | Vercel (serverless) |
| Bot transport | Telegram webhook → `/api/bot` |
| Voice transcription | Groq Whisper (`whisper-large-v3-turbo`) |
| AI classification | Groq LLaMA (`llama-3.3-70b-versatile`) |
| Database | Turso (libSQL / SQLite-compatible) |
| Reminders | Vercel Cron → `/api/cron` (every minute) |
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
| **Turso DB** | `brew install tursodatabase/tap/turso` → `turso auth login` → `turso db create second-brain` → `turso db show second-brain` (copy URL) → `turso db tokens create second-brain` (copy token) |

### 3. Run the DB migration

```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node lib/db.js
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
| `TURSO_DATABASE_URL` | `turso db show second-brain` |
| `TURSO_AUTH_TOKEN` | `turso db tokens create second-brain` |
| `CRON_SECRET` | `openssl rand -hex 32` |

### 6. Register the Telegram webhook

After the first successful deploy, run once:

```bash
VERCEL_URL=https://your-app.vercel.app npm run webhook:set
```

Your bot is now live. Test it by sending `/start` in Telegram.

---

## Local development
There are three common local workflows:

- **Frontend-only (Vite)** — run the React dev server and point it at a running backend (uses Vite proxy when `VITE_API_URL` is set):

```bash
# from project root (starts webapp dev server only)
npm run dev
# or inside the webapp folder:
cd webapp
npm run dev
```

- **Local API runner (lightweight)** — run the new Express-based loader which mounts the files in `api/` as HTTP routes. This is useful when you want a simple local backend without `vercel dev`.

1. Copy and fill env values:

```bash
cp .env.example .env.local
# edit .env.local and add TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, GROQ_API_KEY, etc.
```

2. Start the API server (dotenv is preloaded automatically):

```bash
npm install           # if you haven't installed deps since this change
npm run start:api
```

3. In another terminal, start the frontend (Vite). Vite will proxy `/api` to `http://localhost:3000` by default:

```bash
npm run dev
```

- **Full Vercel simulator (`vercel dev`)** — runs the webapp and serverless functions with behavior close to production. Recommended for parity with Vercel serverless runtime:

```bash
cp .env.example .env.local   # fill in values
npm run dev:vercel
```

Notes:
- `start:api` preloads dotenv (`node -r dotenv/config scripts/local-api.js`) so `.env.local` in the project root is picked up automatically.
- If you run the frontend separately and your backend listens on a different port, set `VITE_API_URL` when starting Vite, for example:

```bash
cd webapp
VITE_API_URL=http://localhost:3000 npm run dev
```
- Telegram webhooks cannot reach localhost directly; use polling or a tunnel (ngrok) for webhook testing.

---

## Project structure

```
second-brain-poc/
├── api/                      # Vercel serverless functions
│   ├── bot.js                # POST /api/bot  — Telegram webhook
│   ├── entries.js            # GET / POST / DELETE /api/entries
│   └── cron.js               # GET /api/cron  — reminder poller
│
├── lib/                      # Shared services (imported by api/*)
│   ├── db.js                 # Turso/libSQL client + all query helpers
│   ├── classify.js           # Groq LLaMA classification
│   ├── whisper.js            # Groq Whisper transcription
│   └── notify.js             # Telegram sendMessage wrapper
│
├── scripts/
│   ├── dev.js                # guarded `vercel dev` spawner (npm run dev:vercel)
│   ├── local-api.js          # Express-based local API loader (npm run start:api)
│   ├── set-webhook.js        # npm run webhook:set
│   └── del-webhook.js        # npm run webhook:del
│
├── webapp/                   # React + Tailwind (Vite)
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── EntryCard.jsx
│           ├── Sidebar.jsx
│           └── StatsBar.jsx
│
├── vercel.json               # Build, routing, cron config
├── .env.example              # example env vars
├── .env.local                # local env file (gitignored) used by `vercel dev` and `start:api`
└── package.json
```

---

## API reference

| Method | Path | Body / Query | Description |
|---|---|---|---|
| `GET` | `/api/entries` | `?category=reminder` (optional) | All entries, newest first |
| `POST` | `/api/entries` | `{ "text": "..." }` | Classify + save new entry |
| `DELETE` | `/api/entries` | `?id=123` | Delete entry by ID |
| `POST` | `/api/bot` | Telegram Update JSON | Webhook receiver |
| `GET` | `/api/cron` | — (Vercel Cron only) | Fire due reminders |

---

## Migrating to the full plan (auth)

1. Add `magic_links` table to Turso
2. Add `POST /api/auth/request` + `GET /api/auth/verify` (Resend + JWT)
3. Add auth-check at the top of `api/entries.js`
4. Add `Login.jsx` + React Router with a protected route
5. Add `RESEND_API_KEY` and `JWT_SECRET` to Vercel env vars
