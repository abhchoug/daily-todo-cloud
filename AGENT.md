# AGENT.md — Daily ToDo Cloud

This file helps AI agents understand the project structure, conventions, and workflows for this repository.

---

## Project Overview

**Daily ToDo Cloud** is a browser-based task management calendar. Users see a monthly grid (Mon–Fri only; weekends are hidden) where each day cell holds a list of tasks. Data is stored in Cloud Firestore, scoped per authenticated user.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, plain CSS |
| Auth | Firebase Auth (Email, Google, GitHub) |
| Database | Cloud Firestore |
| Backend | Firebase Cloud Functions v5 (Node 20, TypeScript, Express) |
| Hosting | Firebase Hosting |
| Dev server | `next dev` on port 8000 (or `--port 3000` override) |

---

## Repository Structure

```
daily-todo-cloud/
├── frontend/                   # Next.js app
│   ├── src/app/
│   │   ├── page.js             # Main calendar UI (single-page app)
│   │   ├── layout.js           # Root layout, applies theme class to <body>
│   │   └── globals.css         # All styling — CSS variables, themes, grid
│   └── src/lib/
│       └── firebase.js         # Firebase SDK init (auth + db exports)
├── functions/                  # Cloud Functions (TypeScript)
│   └── src/index.ts            # All HTTP endpoints via Express
├── scripts/                    # One-off Node.js utility scripts
│   └── migrate-sqlite-to-firestore.js  # SQLite → Firestore migration
├── firestore.rules             # Firestore security rules
├── firebase.json               # Firebase project config (hosting, functions)
├── preview.html                # Static standalone UI preview (no auth required)
└── docs/                       # Architecture, API, migration, security docs
```

---

## Key Files to Know

### `frontend/src/app/page.js`
The entire frontend lives here. Key sections:
- **Constants** (`dayNames`, `DESIGN_THEMES`, `monthNames`) — top of file
- **State** — `tasksByDate`, `selectedYear`, `selectedMonth`, `designTheme`
- **`firstDayIndex`** — Mon-aligned (Sun=6, Mon=0…Sat=5). Used to compute empty offset cells.
- **`weekdayFirstIndex`** — derived from `firstDayIndex`; clamps to 0 for months starting Sat/Sun so no phantom empty columns appear in the 5-col grid.
- **Calendar render loop** — skips days where `dayOfWeek === 5 || dayOfWeek === 6` (Sat/Sun).
- **Tasks** are stored in `tasksByDate` keyed by `YYYY-MM-DD` strings.
- Each date always has at least one **placeholder task** (blank, `placeholder: true`) to show the "Add task" input.

### `frontend/src/app/globals.css`
- All CSS variables are defined in `:root` (default = macOS Sonoma dark theme).
- Each design theme overrides variables under `body.theme-<name>`.
- **Calendar grid**: `grid-template-columns: repeat(5, 1fr)` — 5 weekday columns.
- Month-specific body backgrounds are applied via `.month-<name>` classes on `<body>`.

### `functions/src/index.ts`
- Express app exported as a single Firebase Function (`api`).
- All routes require a valid Firebase ID token (`Authorization: Bearer <token>`).
- Firestore path: `users/{uid}/tasks/{taskId}`.
- Task document shape: `{ date: "YYYY-MM-DD", text: string, checked: boolean, createdAt, updatedAt }`.

### `firestore.rules`
- Users can only read/write `users/{their own uid}` and its `tasks` subcollection.
- `metadata/**` is publicly readable, never writable.

---

## Data Model

```
Firestore
└── users/
    └── {uid}/
        └── tasks/
            └── {taskId}
                ├── date      : "YYYY-MM-DD"
                ├── text      : string
                ├── checked   : boolean
                ├── createdAt : Timestamp
                └── updatedAt : Timestamp
```

---

## Environment Variables

The frontend reads these from a `.env.local` file (never commit this):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

---

## Common Commands

### Frontend
```bash
cd frontend
npm install
npm run dev          # dev server → http://localhost:8000
npm run build        # production build
npm run lint         # ESLint
```

### Cloud Functions
```bash
cd functions
npm install
npm run build        # esbuild → lib/index.js
npm run serve        # local emulator
npm run deploy       # firebase deploy --only functions
npm run logs         # tail function logs
```

### Firestore rules
```bash
node scripts/deploy-rules.js   # or: firebase deploy --only firestore:rules
```

### Data migration (SQLite → Firestore)
```bash
cd scripts && npm install
node migrate-sqlite-to-firestore.js
```

### Static UI preview (no auth)
```bash
# From repo root — open preview.html in any browser or serve it:
python3 -m http.server 4000
# then open http://localhost:4000/preview.html
```

---

## Design Themes

Six themes are defined, toggled by adding `theme-<id>` to `<body>`:

| ID | Name |
|---|---|
| *(none / default)* | macOS Sonoma |
| `glassmorphism` | Glassmorphism Dark |
| `notion` | Notion Minimal |
| `cyberpunk` | Neon Cyberpunk |
| `pastel` | Soft Pastel |
| `material` | Material You |

When adding a new theme: add an entry to `DESIGN_THEMES` in `page.js` and a `body.theme-<id> { }` block in `globals.css` overriding the relevant CSS variables.

---

## Conventions & Patterns

- **Date keys** are always `YYYY-MM-DD` strings (padded). Use `getDateKey(year, month, day)` — `month` is 0-indexed.
- **Placeholder tasks** (`placeholder: true`) are never persisted. They exist only in local state to show empty input rows.
- **`withPlaceholder(tasks, dateKey)`** ensures every date always has one placeholder at the end.
- **No `useState` outside `Home()`** — all state lives in the single page component.
- CSS uses CSS custom properties (variables) exclusively — avoid hardcoded colours.
- The frontend talks to Firestore directly via the Firebase client SDK; the Cloud Functions API (`functions/src/index.ts`) exists as an alternative but is not the primary data path for the current UI.
- Weekend days (Sat/Sun) are intentionally **not rendered** — do not add them back.

---

## Deployment

```bash
# Full deploy (hosting + functions + rules)
firebase deploy

# Hosting only (after next build)
cd frontend && npm run build
firebase deploy --only hosting

# Functions only
firebase deploy --only functions

# Rules only
firebase deploy --only firestore:rules
```
