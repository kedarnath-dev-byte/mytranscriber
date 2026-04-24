# MyTranscriber — Project Status & Dev Log

> Personal AI meeting transcriber — record, transcribe and summarize 
> meetings locally. No subscription. No cloud. 100% private.

---

## 🏆 PHASE 1 — COMPLETE ✅
**Completed: 24 April 2026**

### What I Built:
A fully working Electron desktop app that:
- Captures computer audio or mic+system audio
- Transcribes using OpenAI Whisper
- Summarizes using GPT-4o-mini
- Stores everything locally in SQLite
- Google OAuth login
- Tier system (Free/Pro/Max)

---

## 📦 TECH STACK DECISIONS

| Layer | Technology | Why I Chose It |
|-------|-----------|----------------|
| Desktop | Electron | Best for Windows desktop + web tech |
| Frontend | React + Vite | Fast dev, component based |
| Backend | Express.js | Simple, flexible Node.js API |
| Database | SQLite (better-sqlite3) | Local, no server needed |
| Transcription | OpenAI Whisper | Best accuracy, cheap ($0.006/min) |
| Summarization | OpenAI GPT-4o-mini | Fast, cheap, high quality |
| Auth | Google OAuth + Passport.js | Easy login, no passwords |

---

## 🗺️ BUILD ORDER (What I Built and When)

### Commit 1 — CLAUDE.md (Karpathy Coding Rules)
- Think before coding
- Simplicity first
- Surgical changes only
- Goal-driven execution

### Commit 2 — Project Configuration
- package.json (Electron + React + Vite + Express)
- .env.example with all required keys
- .gitignore for node_modules, .env, data/

### Commit 3 — Config Layer
- backend/config/models.js — LLM model per tier
- backend/config/tiers.js — feature flags per tier

### Commit 4 — Service Layer
- DatabaseService.js — SQLite CRUD operations
- AuthService.js — Google OAuth with Passport
- TranscriptService.js — Whisper audio transcription
- SummaryService.js — LLM meeting analysis

### Commit 5 — Backend API
- server.js — Express app, CORS, sessions
- authRoutes.js — /auth/google, /auth/me, /auth/logout
- recordingRoutes.js — upload, fetch, delete recordings
- Tested: health check ✅ auth/me ✅ Google login ✅

### Commit 6 — React Frontend
- Login.jsx — Google OAuth button, feature list
- Home.jsx — Two record buttons, waveform, timer
- TranscriptDetail.jsx — Summary + transcript tabs
- Settings.jsx — Account info, tier comparison table
- Sidebar.jsx — Navigation + tier badge
- RecordingCard.jsx — Recording list item

### Commit 7 — Project Docs
- PROJECT_STATUS.md (this file)
- project-carry-forward.skill.md

### Commit 8 — Electron Core + Bug Fixes
- electron/main.js — Window creation, IPC, audio capture
- electron/preload.js — Secure IPC bridge to React
- Fixed: Electron white screen (wait-on + app.isPackaged)
- Fixed: axios baseURL for Electron (localhost:5000)
- Fixed: tiers.js was empty → added hasFeature()
- Fixed: Whisper via OpenRouter → switched to OpenAI direct
- Fixed: Session cookie in Electron → flexAuth + uid header
- Fixed: OpenRouter LLM unreliable → OpenAI gpt-4o-mini
- Fixed: Settings name blank → user.name not user.displayName
- Fixed: Settings page not scrollable → overflowY style

---

## 🔧 PROBLEMS I SOLVED

### Problem 1: Electron White Screen
**Symptom:** Desktop window opened but showed nothing  
**Root Cause:** Electron loaded before Vite dev server was ready  
**Solution:** Used `concurrently` + `wait-on` to start Vite first,
then Electron. Also fixed `isDev` detection using `app.isPackaged`
instead of `NODE_ENV` which wasn't being passed correctly.

### Problem 2: Session Cookies Broken in Electron
**Symptom:** 401 Unauthorized on every API call after login  
**Root Cause:** Electron and Express run on different ports.
Browser session cookies don't carry across ports in Electron.  
**Solution:** After Google login, stored user ID in localStorage.
Added `x-user-id` header to all axios requests.
Added `flexAuth` middleware that accepts session OR header auth.

### Problem 3: OpenRouter Not Supporting Whisper
**Symptom:** Connection error when trying to transcribe audio  
**Root Cause:** OpenRouter routes LLM text models but does NOT
support audio file uploads for Whisper transcription.  
**Solution:** Switched TranscriptService to use OpenAI API directly.
Kept OpenRouter as backup option for future LLM calls.

### Problem 4: tiers.js Was Empty
**Symptom:** `hasFeature is not a function` error  
**Root Cause:** File was created in folder structure but
content was never written — empty file.  
**Solution:** Wrote complete tiers.js with TIERS config object,
`hasFeature()` and `getTierConfig()` functions.

---

## 🔑 ENVIRONMENT VARIABLES

```env
OPENAI_API_KEY=        # For Whisper + GPT-4o-mini
OPENROUTER_API_KEY=    # Backup LLM (future use)
GOOGLE_CLIENT_ID=      # Google OAuth
GOOGLE_CLIENT_SECRET=  # Google OAuth
GOOGLE_CALLBACK_URL=   # http://localhost:5000/auth/google/callback
SESSION_SECRET=        # Express session encryption
PORT=5000
FRONTEND_URL=          # http://localhost:5173
NODE_ENV=development
```

---

## 🚀 HOW TO RUN

```bash
# Terminal 1 — Backend
node backend/server.js

# Terminal 2 — Electron + Frontend
npm run dev
```

---

## ⏳ PHASE 2 — PLANNED
- [ ] Live transcript overlay window (always on top)
- [ ] Speaker detection (who said what)
- [ ] Export PDF / TXT
- [ ] Search recordings

## ⏳ PHASE 3 — PLANNED
- [ ] Stripe / Razorpay payment gateway
- [ ] Pro and Max tier unlock

## ⏳ PHASE 4 — PLANNED
- [ ] HuggingFace Spaces web deployment

## ⏳ PHASE 5 — PLANNED
- [ ] Android app via Capacitor
- [ ] iOS app via Capacitor

---

## 📁 FOLDER STRUCTURE


mytranscriber/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Secure IPC bridge
├── backend/
│   ├── server.js        # Express API server
│   ├── config/
│   │   ├── models.js    # LLM model per tier
│   │   └── tiers.js     # Feature flags per tier
│   ├── services/
│   │   ├── DatabaseService.js    # SQLite
│   │   ├── AuthService.js        # Google OAuth
│   │   ├── TranscriptService.js  # Whisper
│   │   └── SummaryService.js     # LLM summary
│   └── routes/
│       ├── authRoutes.js         # /auth/*
│       └── recordingRoutes.js    # /api/recordings/*
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Home.jsx
│   │   ├── TranscriptDetail.jsx
│   │   └── Settings.jsx
│   └── components/
│       ├── Sidebar.jsx
│       └── RecordingCard.jsx
├── data/                # SQLite database (gitignored)
└── temp/                # Audio temp files (gitignored)

---
*Built by Kedarnath Mamani — April 2026*