I am building a desktop app called MyTranscriber — a personal Fireflies 
alternative. Read everything carefully before starting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 WHAT THIS APP IS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A desktop app that works exactly like Fireflies.ai but runs 100% locally 
on my Windows laptop. When I open the app and click a button, it starts 
capturing my computer audio or mic+system audio, records it, then after 
I stop — it automatically transcribes the audio using Whisper AI and 
generates a summary + action items using LLM. All stored privately on 
my device. No subscription. No cloud.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💻 MY LAPTOP SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Windows 11 laptop (HP)
- VS Code with PowerShell terminal
- Node.js v20.19.1 installed at F:\nodejs
- Project at F:\Projects\mytranscriber
- GitHub: https://github.com/kedarnath-dev-byte/mytranscriber
- npm install always needs --legacy-peer-deps flag

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 API KEYS (already configured in .env)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- OPENAI_API_KEY — configured ✅ (Whisper + GPT-4o-mini)
- OPENROUTER_API_KEY — configured ✅ (backup)
- GOOGLE_CLIENT_ID — configured ✅
- GOOGLE_CLIENT_SECRET — configured ✅
- GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
- SESSION_SECRET — configured ✅
- PORT=5000
- FRONTEND_URL=http://localhost:5173
- NODE_ENV=development
- ADMIN_EMAIL=mkedarnath00@gmail.com (to be added)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Electron + React + Vite (desktop app)
- Express.js backend API (port 5000)
- SQLite via better-sqlite3 (local DB)
- OpenAI Whisper (transcription)
- OpenAI GPT-4o-mini (summarization)
- Google OAuth via Passport.js (login)
- electron-builder (builds .exe installer)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 LLM MODELS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ALL TIERS → OpenAI Whisper transcription
- ALL TIERS → OpenAI GPT-4o-mini summary
- FREE  → Llama 3.3 70B (planned)
- PRO   → GPT-4o Mini
- MAX   → Claude Sonnet 4.5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 TIER SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FREE:  999 recordings (dev mode), basic summary
PRO:   5 hrs/month, action items, export
MAX:   unlimited, API access, all features
- All tier logic in backend/config/tiers.js
- All model logic in backend/config/models.js
- Payment hooks marked as // 💳 PAYMENT_HOOK
- HuggingFace hooks marked as // 🤗 HF_DEPLOY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANT FIXES ALREADY MADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. electron/main.js uses !app.isPackaged for isDev
2. axios.defaults.baseURL = 'http://localhost:5000'
3. flexAuth middleware in recordingRoutes.js
4. uid stored in localStorage after login
5. SummaryService uses OpenAI gpt-4o-mini
6. TranscriptService uses OpenAI Whisper directly
7. CORS allows requests with no origin (Electron)
8. wait-on + concurrently in npm run dev
9. IST timezone fix in RecordingCard.jsx
10. Multer file size limit = 500MB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE 1 — COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Electron desktop app
✅ Google OAuth login
✅ Computer audio capture
✅ Whisper transcription (OpenAI)
✅ GPT-4o-mini summarization
✅ SQLite local database
✅ Recordings list + detail view
✅ Settings + tier table
✅ IST timezone fix
✅ GitHub pushed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ PHASE 2 — START HERE (CURRENT)
Power Features + Admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1: Offline Mode
  → Check internet before processing
  → If offline: save audio to data/pending/
  → Show "⏳ Pending" badge on recording
  → Background checker every 30 seconds
  → Auto process when internet returns
  → New DB columns: status + audio_path
  → Auto cleanup audio after processing

STEP 2: Auto Chunking (Long Recordings)
  → Split audio into 10 min chunks
  → Send each chunk to Whisper separately
  → Combine all transcripts together
  → Supports ANY recording length
  → No 25MB Whisper limit anymore

STEP 3: Export PDF / TXT
  → Download button on detail page
  → Export full transcript as PDF
  → Export as plain TXT file
  → Pro and Max tiers only

STEP 4: Search Recordings
  → Search bar on Home page
  → Search by keyword in transcript
  → Search by title
  → Results highlight matching text

STEP 5: Admin Dashboard
  → Only visible to ADMIN_EMAIL user
  → See ALL users list
  → See ANY user's recordings
  → Change user tier with dropdown
  → Usage stats per user
  → Delete user or recording
  → ADMIN_EMAIL=mkedarnath00@gmail.com in .env

STEP 6: Live Transcript Overlay
  → Floating window always on top
  → Shows live transcript while recording
  → Works over Zoom, YouTube, Teams
  → Show/hide with hotkey

STEP 7: Build .exe Installer
  → npm run build:win
  → Single .exe to install app
  → No terminals needed to run
  → Double click to open

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ PHASE 3 — FUTURE
Payments + Cloud Deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Deploy backend to Railway.app
STEP 2: Razorpay (India — UPI/cards)
  → Pro: ₹299/month
  → Max: ₹799/month
STEP 3: Stripe (International)
  → Pro: $4.99/month
  → Max: $9.99/month
STEP 4: Email notifications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ PHASE 4 — FUTURE
Web Version
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: HuggingFace Spaces deploy
STEP 2: Upload audio file feature
STEP 3: YouTube URL transcription
STEP 4: Google Meet integration
STEP 5: Auto backup to Google Drive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ PHASE 5 — FUTURE
Mobile Apps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Android app via Capacitor (.apk)
STEP 2: iOS app via Capacitor (.ipa)
STEP 3: Push notifications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ PHASE 6 — FUTURE
AI Power Features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Speaker detection (who said what)
STEP 2: Chat with your transcript (Q&A)
STEP 3: Meeting templates (sales/interview)
STEP 4: Multi language (Telugu, Hindi)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗂️ COMPLETE FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
F:\Projects\mytranscriber\
├── CLAUDE.md                    ✅
├── PROJECT_STATUS.md            ✅
├── package.json                 ✅
├── vite.config.js               ✅
├── .env                         ✅
├── .env.example                 ✅
├── .gitignore                   ✅
├── set-tier.js                  ✅ (admin utility)
├── backend/
│   ├── server.js                ✅
│   ├── config/
│   │   ├── models.js            ✅
│   │   └── tiers.js             ✅
│   ├── services/
│   │   ├── DatabaseService.js   ✅
│   │   ├── AuthService.js       ✅
│   │   ├── TranscriptService.js ✅ (OpenAI)
│   │   └── SummaryService.js    ✅ (OpenAI)
│   └── routes/
│       ├── authRoutes.js        ✅
│       └── recordingRoutes.js   ✅
├── electron/
│   ├── main.js                  ✅
│   └── preload.js               ✅
├── src/
│   ├── index.html               ✅
│   ├── main.jsx                 ✅
│   ├── App.jsx                  ✅
│   ├── global.css               ✅
│   ├── components/
│   │   ├── Sidebar.jsx          ✅
│   │   └── RecordingCard.jsx    ✅
│   └── pages/
│       ├── Login.jsx            ✅
│       ├── Home.jsx             ✅
│       ├── TranscriptDetail.jsx ✅
│       └── Settings.jsx         ✅
├── data/
│   ├── transcriber.db           ✅ (SQLite)
│   └── pending/                 ⏳ Phase 2
└── temp/                        ✅
