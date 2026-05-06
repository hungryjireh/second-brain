# secondbrain

Secondbrain is a Vercel-hosted app for capturing notes, todos, thoughts, and reminders from text/voice (Telegram) and managing them in a React dashboard.

## Current product state

### Webapp status (May 2026)
- `webapp/` is the active frontend used in local dev and Vercel deploys
- Auth flow is live with login-guarded routes and token-based session handling
- Entry lifecycle is end-to-end: create, classify, edit, archive, delete, export
- Settings and Telegram link-key UX are implemented in-app
- Mobile/desktop responsive behavior is implemented and currently maintained

### Webapp features (implemented)
- Email/username + password login at `/login`
- Protected dashboard route using bearer token auth
- Create entries from free-form text
- AI-assisted classification into `reminder`, `todo`, `thought`, `note`
- Edit entries: category, title, summary, description (markdown), remind time, priority (0-10), tags
- Archive/unarchive entries (including "Mark Done" for reminders)
- Delete entries
- Search/filter by text, category, priority band, tag, and archived state
- Virtualized entry list grouped by date buckets
- Entry detail modal with markdown rendering
- `.ics` export for reminder entries
- Settings panel for timezone updates
- Telegram account linking key generation in settings
- Import LLM conversation JSON into entries (Claude/ChatGPT style exports)
- Responsive layout for desktop and mobile

### API features (implemented)
- `POST /api/auth/login`
- `GET|POST|PATCH|DELETE /api/entries`
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/telegram/link-key`
- `POST /api/bot` (Telegram webhook receiver)
- `GET /api/ics?id=<entryId>` (calendar file export)

### Not currently in this repo
- No `/api/cron` route
- No Vercel cron config in `vercel.json`

## Stack
- Frontend: React 18 + Vite + React Router + Tailwind (token-based custom styling)
- Backend: Vercel serverless API routes + optional local Express route loader
- Data: Supabase (Postgres)
- AI: Groq (classification + Whisper transcription)
- Bot: Telegram webhook
- Runtime: Node 20.x

## Project structure

```text
.
├── api/
│   ├── auth/
│   │   └── login.js
│   ├── telegram/
│   │   └── link-key.js
│   ├── bot.js
│   ├── entries.js
│   ├── ics.js
│   └── settings.js
├── lib/
│   ├── auth.js
│   ├── classify.js
│   ├── db.js
│   ├── notify.js
│   └── whisper.js
├── scripts/
│   ├── local-api.js
│   ├── set-webhook.js
│   └── del-webhook.js
├── webapp/
│   ├── src/
│   └── package.json
├── vercel.json
└── package.json
```

## Local development

1. Install dependencies:

```bash
npm install
npm --prefix webapp install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Start API (root, port `3000`):

```bash
npm run start:api
```

4. Start webapp (new terminal):

```bash
cd webapp
npm run dev
```

The webapp uses `VITE_API_URL` when provided; otherwise it defaults to `/api`.

## Tests

Run all backend + webapp tests:

```bash
npm test
```

## TODO
- Reintroduce magic-link authentication (`/api/auth/request` and `/api/auth/verify`) with secure delivery and strict DB/RLS controls.

## Deploy notes
- `vercel.json` builds the frontend from `webapp/` and rewrites non-API routes to SPA `index.html`.
- API CORS headers are configured in `vercel.json` for `/api/*`.
- Telegram webhook can be registered with:

```bash
VERCEL_URL=https://<your-app>.vercel.app npm run webhook:set
```
