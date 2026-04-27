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

Note: Telegram webhooks cannot reach localhost directly. For local webhook testing use polling or a tunnel (for example ngrok).

If you prefer to run the frontend while pointing at a backend on port 3000, set `VITE_API_URL` before starting Vite:

```bash
cd webapp
VITE_API_URL=http://localhost:3000 npm run dev
```

Note: the Vite dev server is configured to proxy `/api` to the backend during local development (see `webapp/vite.config.js`). If you run the frontend separately with `npm run dev`, either set `VITE_API_URL` to your backend URL or ensure your backend is available on `http://localhost:3000` so API requests return JSON instead of the frontend HTML.

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
├── .env.example
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
