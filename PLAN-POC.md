# Second Brain — POC Plan

> Simplified single-user proof of concept. The full workflow is preserved — voice in, classify, store, remind via Telegram, view in webapp — with everything that only exists to support multi-user or production use stripped out.

---

## What's cut vs the full plan

| Full plan | POC |
|---|---|
| Magic-link auth (Resend + JWT) | **Removed** — webapp runs unprotected on localhost |
| `magic_links` DB table | **Removed** |
| `auth.js` route + middleware | **Removed** |
| `Login.jsx` page | **Removed** |
| React Router / protected routes | **Removed** — dashboard renders directly |
| UUID primary keys | **Simplified** — SQLite auto-increment integers |
| `source` column (voice/text) | **Optional** — keep if trivial, skip if not |

Everything else is identical to the full plan: Groq Whisper transcription, Groq LLM classification, SQLite storage, node-cron reminders, and the React dashboard.

---

## Architecture

```
You (voice/text)
      │
      ▼
Telegram Bot  ◄────────────────────────────────────┐
      │                                             │
      │ transcribed text                            │ reminder fires
      ▼                                             │
Backend (Node.js / Express)                         │
      │                                             │
      ├──► Groq Whisper          (voice → text)     │
      ├──► Groq LLM              (classify + parse) │
      ├──► SQLite DB             (store entry)      │
      └──► node-cron             (1-min DB poll) ───┘
                │
                ▼
      Web Dashboard (React + Tailwind)
      — no login, open on localhost —
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Telegram bot | `node-telegram-bot-api` |
| Voice transcription | Groq Whisper API (`whisper-large-v3-turbo`) |
| AI classification | Groq LLM API (`openai/gpt-oss-120b`) |
| Backend | Node.js + Express |
| Database | SQLite via `@libsql/client` (libSQL) |
| Scheduler | `node-cron` (1-min DB poll) |
| Web frontend | React + Tailwind CSS (Vite) |
| Auth | **None** — localhost only |

---

## Data Model

Single table. No `magic_links` table.

### `entries` table

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `raw_text` | TEXT | Original transcribed or typed text |
| `category` | TEXT | `reminder`, `todo`, `thought`, `note` |
| `content` | TEXT | Cleaned/summarised content |
| `remind_at` | INTEGER | Unix timestamp — nullable, reminders only |
| `reminded` | INTEGER | 0 or 1 — has reminder been sent? |
| `created_at` | INTEGER | Unix timestamp |

---

## Project Structure

```
second-brain-poc/
├── bot/
│   ├── index.js          # Bot entry point + message handlers
│   ├── whisper.js        # Groq Whisper transcription
│   └── notify.js         # Send Telegram messages back to user
│
├── api/
│   ├── index.js          # Express server + starts cron
│   ├── routes/
│   │   └── entries.js    # GET /entries, DELETE /entries/:id
│   └── services/
│       ├── classify.js   # Groq LLM classification + time extraction
│       ├── cron.js       # node-cron: polls DB every minute
│       └── db.js         # SQLite connection + helpers
│
├── webapp/
│   ├── src/
│   │   ├── App.jsx       # Mounts dashboard directly — no router
│   │   └── components/
│   │       ├── EntryCard.jsx
│   │       ├── Sidebar.jsx
│   │       └── StatsBar.jsx
│   └── vite.config.js
│
├── .env
├── package.json
└── README.md
```

Compared to the full plan: no `auth.js` route, no `middleware/` folder, no `Login.jsx`, no React Router.

---

## Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=       # Your personal chat ID — hardcoded trust boundary

# Groq (Whisper transcription + LLM classification)
GROQ_API_KEY=

# App
PORT=3000
VITE_API_URL=http://localhost:3000
```

Five variables total. One `GROQ_API_KEY` covers both transcription and classification. No JWT secret, no Resend key, no SMTP config.

---

## Key Flows

### 1. Voice message → classified entry

1. You send a voice note to the Telegram bot
2. Bot downloads the OGG audio file from Telegram
3. `whisper.js` sends it to Groq Whisper (`whisper-large-v3-turbo`) → returns plain text
4. `classify.js` sends the text to Groq (`openai/gpt-oss-120b`) → returns `{ category, content, remind_at }`
5. Entry is saved to SQLite
6. If `remind_at` is set, `cron.js` will pick it up automatically — nothing else to do
7. Bot replies: *"Got it — I'll remind you to buy tomatoes at 8pm tonight."*

### 2. Reminder fires

1. `cron.js` runs every minute: `SELECT * FROM entries WHERE remind_at <= ? AND reminded = 0`
2. For each due row, `notify.js` sends a Telegram message to `TELEGRAM_CHAT_ID`
3. Entry is marked `reminded = 1` in the DB

### 3. Web dashboard

1. `App.jsx` fetches `GET /entries` on load — no auth header needed
2. Displays entries grouped by category with counts
3. Sidebar filters by category; search filters client-side
4. Entries can be deleted via `DELETE /entries/:id`

---

## Security note

The API and webapp are **intentionally open** — no authentication. This is safe because both run on `localhost` and are never exposed to the internet during POC. Before any deployment, swap in the auth layer from the full plan.

`TELEGRAM_CHAT_ID` acts as a soft trust boundary for the bot: the bot only processes messages from your chat ID and ignores everything else. One guard in `bot/index.js`:

```js
if (msg.chat.id.toString() !== process.env.TELEGRAM_CHAT_ID) return;
```

---

## Groq Classification Prompt

```
You are a personal assistant parsing a voice/text note.
Classify the following note into exactly one category:
- "reminder" — something to do at a specific time
- "todo" — a task with no specific time
- "thought" — a spontaneous idea or reflection
- "note" — a fact to remember (appointment, info, reference)

If the category is "reminder", extract the scheduled time as an ISO 8601 datetime.
Assume the user's timezone is Asia/Singapore. Today is {{TODAY}}.

Respond ONLY with a JSON object, no other text:
{
  "category": "reminder" | "todo" | "thought" | "note",
  "content": "cleaned, concise version of the note",
  "remind_at": "ISO 8601 datetime or null"
}

Note: "{{RAW_TEXT}}"
```

---

## Build Phases

### Phase 1 — Core pipeline (day 1–2)
- [ ] Scaffold `package.json`, `.env`, `db.js` (create `entries` table)
- [ ] Telegram bot receives text messages + replies
- [ ] Whisper transcription for voice messages (Groq `whisper-large-v3-turbo`)
- [ ] Groq LLM classifies entry + saves to SQLite (`openai/gpt-oss-120b`)
- [ ] Bot confirms back to user

### Phase 2 — Reminders (day 2–3)
- [ ] `cron.js` polls every minute for due reminders
- [ ] `notify.js` sends Telegram message + marks `reminded = 1`

### Phase 3 — Web dashboard (day 3–5)
- [ ] `GET /entries` and `DELETE /entries/:id` routes (no auth middleware)
- [ ] React SPA: `EntryCard`, `Sidebar`, `StatsBar`
- [ ] Category filter + client-side search
- [ ] Vite proxy to backend so no CORS issues locally

---

## Migrating to the Full Plan

When the POC validates the workflow, the delta to reach the full plan is:

1. Add `magic_links` table to SQLite
2. Add `POST /auth/request` and `GET /auth/verify` routes (Resend + JWT)
3. Add `middleware/auth.js` and protect the `entries` routes
4. Add `Login.jsx` and wrap the React app in a router with a protected route
5. Replace auto-increment IDs with UUIDs
6. Add `RESEND_API_KEY`, `JWT_SECRET`, `MAGIC_LINK_EMAIL` to `.env`
7. Deploy behind HTTPS before sharing beyond localhost