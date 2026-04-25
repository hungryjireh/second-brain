# Second Brain — POC

> Voice/text → classify → store → remind via Telegram → view in web dashboard.

## Quick start

### 1. Clone & install

```bash
git clone <your-repo>
cd second-brain-poc
npm run setup        # installs root deps + webapp deps
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all six values:

| Variable | How to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Create a bot via [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Message [@userinfobot](https://t.me/userinfobot) to find your chat ID |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `PORT` | Leave as `3000` |
| `VITE_API_URL` | Leave as `http://localhost:3000` |

### 3. Run everything

```bash
npm run dev
```

This starts three processes concurrently:
- **API** — Express on `http://localhost:3000`
- **Bot** — Telegram polling
- **Web** — Vite dev server on `http://localhost:5173`

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Usage

### Via Telegram (primary)
- **Text** — send any text message to your bot
- **Voice** — record a voice note; it gets transcribed via Whisper first

The bot will reply confirming the category and reminder time (if applicable).

### Via web dashboard
- Type directly into the input bar at the bottom and press Enter or ↗
- Search entries with the top search bar
- Filter by category using the left sidebar
- Delete entries with the × button (click twice to confirm)

---

## Architecture

```
You (voice/text)
      │
      ▼
Telegram Bot  ◄─────────────────────────────┐
      │                                      │
      │ transcribed text                     │ reminder fires
      ▼                                      │
Backend (Node.js / Express)                  │
      │                                      │
      ├──► Groq Whisper   (voice → text)    │
      ├──► Claude API      (classify+parse)  │
      ├──► SQLite DB       (store entry)     │
      └──► node-cron       (1-min poll) ─────┘
                │
                ▼
      Web Dashboard (React + Tailwind)
      localhost:5173 — no auth
```

---

## Project structure

```
second-brain-poc/
├── bot/
│   ├── index.js       # Bot entry + message handlers (text + voice)
│   ├── whisper.js     # Groq Whisper transcription (whisper-large-v3-turbo)
│   └── notify.js      # Telegram sendMessage wrapper
│
├── api/
│   ├── index.js       # Express server, starts cron
│   ├── routes/
│   │   └── entries.js # GET /entries, POST /entries, DELETE /entries/:id
│   └── services/
│       ├── classify.js# Claude classification
│       ├── cron.js    # node-cron: polls every minute for due reminders
│       └── db.js      # SQLite via libSQL (`@libsql/client`)
│
├── webapp/
│   ├── src/
│   │   ├── App.jsx              # Main dashboard
│   │   └── components/
│   │       ├── EntryCard.jsx    # Individual entry with delete
│   │       ├── Sidebar.jsx      # Category nav + counts
│   │       └── StatsBar.jsx     # 4-stat summary row
│   ├── index.html
│   └── vite.config.js           # Proxies /entries → localhost:3000
│
├── data/                        # SQLite DB lives here (auto-created)
├── .env.example
└── package.json
```

---

## API reference

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/entries` | — | All entries, newest first |
| `GET` | `/entries?category=reminder` | — | Filtered by category |
| `POST` | `/entries` | `{ "text": "..." }` | Classify + save new entry |
| `DELETE` | `/entries/:id` | — | Delete entry by ID |
| `GET` | `/health` | — | Liveness check |

---

## Entry categories

| Category | When used |
|---|---|
| `reminder` | Something to do at a specific time — fires a Telegram notification |
| `todo` | A task with no specific time |
| `thought` | A spontaneous idea or reflection |
| `note` | A fact to remember (appointment, reference, info) |

---

## Migrating to the full plan

When the POC validates the workflow, the delta is:

1. Add `magic_links` table to SQLite
2. Add `POST /auth/request` + `GET /auth/verify` (Resend + JWT)
3. Add `middleware/auth.js` and protect the entries routes
4. Add `Login.jsx` + React Router with protected routes
5. Replace auto-increment IDs with UUIDs
6. Add `RESEND_API_KEY`, `JWT_SECRET`, `MAGIC_LINK_EMAIL` to `.env`
7. Deploy behind HTTPS before sharing beyond localhost
