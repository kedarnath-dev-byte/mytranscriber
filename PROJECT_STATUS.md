# MyTranscriber — Dev Log

> I got tired of paying for Fireflies.ai every month just to transcribe 
> my own meetings. So I built my own version that runs completely on my 
> laptop. No subscription. No cloud. Everything stays on my device.

---

## Why I Built This

I use Zoom and Google Meet a lot. After every call I would forget half 
of what was discussed. Fireflies.ai is great but $18/month for a student 
is too much. I thought — how hard can it be to build something similar?

Turns out, pretty hard. But I did it anyway.

---

## What It Does

- I click a button and it starts recording whatever is playing on my computer
- When I stop, it automatically sends the audio to OpenAI Whisper
- Whisper converts speech to text
- Then GPT-4o-mini reads the transcript and writes a summary
- Everything is saved locally in a SQLite database on my laptop
- I can go back and read any past meeting anytime

---

## Tech I Used and Why

**Electron** — I wanted a real desktop app, not a website. Electron lets 
me use web technologies (React) but package it as a Windows .exe file.

**React + Vite** — I already know React. Vite is much faster than 
Create React App for development.

**Express.js** — Simple Node.js backend. I needed an API server to handle 
file uploads, database operations, and OAuth.

**SQLite** — No need for a separate database server. SQLite stores 
everything in a single file on my laptop. Perfect for a local app.

**OpenAI Whisper** — Best speech-to-text model available. Costs about 
$0.006 per minute which is extremely cheap.

**Google OAuth** — I did not want to build a login system from scratch. 
Google OAuth handles everything securely.

---

## Problems I Hit (And How I Fixed Them)

### The Electron White Screen Problem
When I first ran the Electron app, it just showed a blank white window. 
Nothing loaded. I spent time figuring out that Electron was starting 
before the Vite dev server was ready. Fixed it by using `wait-on` package 
to make Electron wait until Vite is fully running.

Also had another issue — `isDev` was always `false` because `NODE_ENV` 
was not being passed to Electron correctly. Changed the detection to use 
`app.isPackaged` instead which works reliably.

### The Cookie Problem in Electron
After Google login worked fine in the browser, I moved to Electron and 
suddenly every API call returned 401 Unauthorized. 

The problem was that the session cookie from Express (port 5000) was not 
being shared with the Electron window (port 5173). They are on different 
ports so the browser treats them as different origins.

My solution: after login, I store the user ID in localStorage. Then I 
send it as a custom header `x-user-id` with every API request. On the 
backend I added a `flexAuth` middleware that accepts either a valid 
session cookie OR this header. Problem solved.

### OpenRouter Does Not Support Audio
I originally planned to use OpenRouter for everything — both Whisper 
transcription and LLM summarization. Turns out OpenRouter only routes 
text models. It does not support audio file uploads for Whisper.

Switched TranscriptService to call OpenAI API directly. Works perfectly.

### The Empty tiers.js File
Got a weird error — `hasFeature is not a function`. Spent time debugging 
before I realized the `tiers.js` config file existed in the folder but 
was completely empty. It was created during the project setup but the 
content was never written. Wrote the complete file with all tier configs.

### OpenRouter LLM Connection Issues
Even for text summarization, OpenRouter kept giving connection errors 
from my network. Rather than waste more time debugging network issues, 
I just switched the SummaryService to use OpenAI GPT-4o-mini directly. 
More reliable and the quality is excellent.

---

## How To Run It

```bash
# Start the backend API server
node backend/server.js

# Start the Electron desktop app (in a second terminal)
npm run dev
```

Make sure you have a `.env` file with:
- `OPENAI_API_KEY` — for Whisper and GPT-4o-mini
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — for login

---

## Folder Structure



mytranscriber/
├── electron/
│   ├── main.js        # Creates the desktop window, handles audio capture
│   └── preload.js     # Secure bridge between Electron and React
├── backend/
│   ├── server.js      # Express API server on port 5000
│   ├── config/
│   │   ├── models.js  # Which AI model to use per tier
│   │   └── tiers.js   # What features each tier gets
│   ├── services/
│   │   ├── DatabaseService.js    # All SQLite database operations
│   │   ├── AuthService.js        # Google OAuth with Passport.js
│   │   ├── TranscriptService.js  # Whisper audio transcription
│   │   └── SummaryService.js     # GPT summary generation
│   └── routes/
│       ├── authRoutes.js         # Login, logout, user info
│       └── recordingRoutes.js    # Upload, fetch, delete recordings
├── src/
│   ├── pages/
│   │   ├── Login.jsx             # Google sign in page
│   │   ├── Home.jsx              # Main recording dashboard
│   │   ├── TranscriptDetail.jsx  # View a single recording
│   │   └── Settings.jsx          # Account and tier info
│   └── components/
│       ├── Sidebar.jsx           # Left navigation
│       └── RecordingCard.jsx     # Recording list item
└── data/
└── transcriber.db            # SQLite database (all recordings)


---

## What I Learned

- Electron is powerful but has quirks — especially around security 
  policies and how it handles cookies differently from browsers
- Session management across different ports is tricky
- OpenRouter is great for LLM text models but does not support 
  audio/file uploads — use OpenAI directly for Whisper
- SQLite is underrated for local desktop apps — simple and fast
- Building something you actually need is the best motivation

---

## What's Next

- **Live transcript overlay** — a small window that stays on top of 
  Zoom/YouTube and shows the transcript in real time while recording
- **Speaker detection** — figure out who said what in the meeting
- **Export to PDF/TXT** — so I can share meeting notes easily
- **Search** — find any past recording by keyword

---

## Build Log

| Date | What I Did |
|------|-----------|
| April 2026 | Started project, set up Electron + React + Express |
| April 2026 | Built all backend services and routes |
| April 2026 | Built complete React frontend |
| April 2026 | Added Electron window, fixed white screen bug |
| April 2026 | Fixed session/cookie issues in Electron |
| April 2026 | Switched to OpenAI for reliable transcription |
| April 2026 | First successful recording + transcript + summary ✅ |

---

*Built by Kedarnath Mamani — Rajamahendravaram, Andhra Pradesh*  
*"I built this because I needed it. Simple as that."*