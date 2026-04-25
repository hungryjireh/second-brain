# Second Brain — Project Plan

## Overview

A personal "second brain" system with two interfaces:
- **Telegram bot** — primary input via voice or text
- **Web dashboard** — browse, search, and manage all entries

You send a voice note saying *"Remind me tonight at 8pm to buy tomatoes"* and the system transcribes it, classifies it, stores it, and fires a Telegram message back to you at the right time.

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
Backend API (Node.js / Express)                     │
      │                                             │
      ├──► OpenAI Whisper        (voice → text)     │
      ├──► Claude API            (classify + parse) │
      ├──► SQLite DB             (store entry)      │
      └──► node-cron Scheduler ──────────────────── ┘
                │
                ▼
         Web Dashboard (React + Tailwind)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Telegram bot | `node-telegram-bot-api` |
| Voice transcription | OpenAI Whisper API (`whisper-1`) |
| AI classification | Anthropic Claude API |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| Scheduler | `node-cron` (1-min DB poll, no Redis) |
| Web frontend | React + Tailwind CSS (Vite) |
| Auth | Magic-link via email (Resend + JWT) |

---

## Data Model

### `entries` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `raw_text` | TEXT | Original transcribed or typed text |
| `category` | TEXT | `reminder`, `todo`, `thought`, `note` |
| `content` | TEXT | Cleaned/summarised content |
| `remind_at` | INTEGER | Unix timestamp — nullable, reminders only |
| `reminded` | INTEGER | 0 or 1 — has reminder been sent? |
| `source` | TEXT | `voice` or `text` |
| `created_at` | INTEGER | Unix timestamp |

### `magic_links` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `token` | TEXT | Random 64-char hex, hashed in DB |
| `email` | TEXT | Owner email |
| `expires_at` | INTEGER | Unix timestamp (15 min TTL) |
| `used` | INTEGER | 0 or 1 |

---

## Project Structure

```
second-brain/
├── bot/                        # Telegram bot process
│   ├── index.js                # Bot entry point + message handlers
│   ├── whisper.js              # OpenAI Whisper transcription
│   └── notify.js               # Send messages back to user
│
├── api/                        # Express REST API
│   ├── index.js                # Server entry point
│   ├── routes/
│   │   ├── entries.js          # GET /entries, POST /entries, DELETE /:id
│   │   └── auth.js             # POST /auth/request, GET /auth/verify
│   ├── services/
│   │   ├── classify.js         # Claude classification + time extraction
│   │   ├── cron.js             # node-cron: polls DB every minute for due reminders
│   │   └── db.js               # SQLite connection + helpers
│   └── middleware/
│       └── auth.js             # JWT verification middleware
│
├── webapp/                     # React + Tailwind SPA (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Magic-link request form
│   │   │   └── Dashboard.jsx   # Main view
│   │   └── components/
│   │       ├── EntryCard.jsx
│   │       ├── Sidebar.jsx
│   │       └── StatsBar.jsx
│   └── vite.config.js
│
├── .env                        # All secrets (never committed)
├── package.json
└── README.md
```

---

## Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=

# OpenAI (Whisper)
OPENAI_API_KEY=

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# Your Telegram chat ID (so the bot knows who to message)
TELEGRAM_CHAT_ID=

# Auth
JWT_SECRET=
MAGIC_LINK_EMAIL=          # "From" address (must be a verified Resend sender domain)
RESEND_API_KEY=

# App
PORT=3000
WEBAPP_URL=http://localhost:5173
```

---

## Key Flows

### 1. Voice message → classified entry

1. User sends voice note to Telegram bot
2. Bot downloads the OGG audio file from Telegram
3. `whisper.js` sends the file to OpenAI Whisper → returns plain text
4. `classify.js` sends the text to Claude with a structured prompt:
   - Returns `{ category, content, remind_at }` as JSON
5. Entry is saved to SQLite
6. If `remind_at` is set, no extra scheduling needed — `cron.js` will pick it up automatically
7. Bot replies to user: *"Got it — I'll remind you to buy tomatoes at 8pm tonight."*

### 2. Reminder fires

1. `cron.js` runs every minute: `SELECT * FROM entries WHERE remind_at <= now AND reminded = 0`
2. For each due entry, calls `notify.js` which sends a Telegram message to `TELEGRAM_CHAT_ID`
3. Entry is marked `reminded = 1` in the DB
4. Maximum latency is ~1 minute — acceptable for a personal tool

### 3. Magic-link login

1. User visits webapp, enters their email, clicks "Send magic link"
2. `POST /auth/request` generates a token, stores a hashed version in `magic_links`, sends an email via the Resend SDK with a link: `WEBAPP_URL/auth/verify?token=...`
3. User clicks the link → `GET /auth/verify` validates token, returns a signed JWT (24h expiry)
4. Webapp stores JWT in memory (not localStorage) and includes it on all API calls

### 4. Web dashboard

1. On load, webapp calls `GET /entries` (JWT in `Authorization` header)
2. Displays entries grouped by category with live counts
3. Sidebar filters by category; search bar filters client-side by content text
4. Entries can be deleted; reminders can be snoozed (update `remind_at` + reset `reminded = 0` in DB, cron picks it up automatically)

---

## Claude Classification Prompt

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

### Phase 1 — Core pipeline (week 1)
- [ ] Telegram bot listens for text messages
- [ ] Whisper transcription for voice messages
- [ ] Claude classification + storage to SQLite
- [ ] Bot sends confirmation reply

### Phase 2 — Reminders (week 1–2)
- [ ] `node-cron` job polling SQLite every minute for due reminders
- [ ] `notify.js` sends Telegram message when reminder is due
- [ ] Mark entry as `reminded` in DB

### Phase 3 — Web dashboard (week 2–3)
- [ ] Express API: `GET /entries`, `DELETE /entries/:id`
- [ ] Magic-link auth (Resend + JWT)
- [ ] React SPA: sidebar, entry cards, stats bar
- [ ] Category filter + client-side search

### Phase 4 — Polish (week 3–4)
- [ ] Snooze reminders from Telegram (inline keyboard buttons — updates `remind_at` in DB)
- [ ] Edit / complete TODOs from webapp
- [ ] Related entries linking (embeddings via Claude or OpenAI)
- [ ] Deploy: Railway or Fly.io (backend — no Redis needed), Vercel (webapp)

---

## Deployment Notes

- The **bot**, **API**, and **cron scheduler** all run in the same Node.js process — just `require` `cron.js` from `api/index.js`. No separate worker process needed.
- SQLite works fine for a single-user personal tool. No connection pooling needed — `better-sqlite3` is synchronous.
- No Redis dependency — the entire backend is a single deployable service with zero infrastructure add-ons.
- The webapp is a static build deployed to Vercel; it just needs the `VITE_API_URL` env var pointing at the backend.
