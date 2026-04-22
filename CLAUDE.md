# CLAUDE.md — MyTranscriber Project Rules
# Based on Andrej Karpathy's LLM Coding Guidelines

## 1. Think Before Coding
- State assumptions explicitly before writing any code
- If uncertain about requirements, ask — never guess silently
- Present tradeoffs when multiple approaches exist
- Stop and ask when confused — never silently pick an interpretation
- Push back if a simpler approach exists

## 2. Simplicity First
- Write minimum code that solves the problem — nothing extra
- No abstractions unless used in 3+ places
- No "future flexibility" code that wasn't asked for
- No error handling for impossible scenarios
- If 200 lines can be 50 lines, write 50
- Test: would a senior engineer say this is overcomplicated? If yes, simplify

## 3. Surgical Changes
- Touch only what the task requires
- Never "improve" adjacent code, comments, or formatting
- Match existing code style even if you'd do it differently
- If you notice unrelated dead code, mention it — never delete it silently
- Every changed line must trace directly to the user's request

## 4. Goal-Driven Execution
- Define success criteria before starting
- For multi-step tasks, state a plan first
- Format: [Step] → verify: [check]
- Transform "fix the bug" into "write test that reproduces it, then fix it"
- Loop until criteria are met — don't stop at "looks right"

---

## Project-Specific Rules

### Stack
- Electron + React + Vite (desktop app)
- Express.js (backend API — kept separate for future web/HuggingFace deploy)
- SQLite (local DB — swappable to Postgres later)
- OpenRouter API (LLM + Whisper transcription)
- Google OAuth (authentication)

### Tier System (Free / Pro / Max)
- ALL tier logic lives in `backend/config/tiers.js` — one place only
- ALL model choices live in `backend/config/models.js` — one place only
- Never hardcode tier checks inside business logic
- Adding a new tier = edit only tiers.js and models.js

### LLM Models by Tier
# FREE users  → meta-llama/llama-3.3-70b-instruct:free (OpenRouter free)
# PRO users   → openai/gpt-4o-mini (cheap, fast, high quality)
# MAX users   → anthropic/claude-sonnet-4-5 (best quality)
# Transcription (all tiers) → openai/whisper (via OpenRouter)

### Folder Rules
- backend/services/ → all business logic (Audio, Transcript, Summary, DB, Auth)
- backend/routes/   → only HTTP routing, no logic
- backend/config/   → all configuration (models, tiers, constants)
- src/pages/        → one file per page
- src/components/   → only reusable UI pieces
- Never put business logic in routes or UI components

### Deployment Flexibility
- Backend must run standalone (without Electron) for web deploy
- Never import Electron modules inside backend/
- Docker-ready: backend must work inside a container
- Environment variables for ALL secrets — never hardcode

### Git Commit Rules
- Every commit message must explain WHAT and WHY
- Format: type(scope): description
- Types: feat, fix, refactor, docs, config, style
- Example: feat(audio): add system audio capture with 2 recording modes
- Commits must be small and focused — one feature per commit

### Code Comments
- Every service class must have a top comment explaining its purpose
- Every public method must have a one-line comment
- Mark tier-specific code with: // 🟢 FREE | 🔵 PRO | 🟣 MAX
- Mark future payment gateway hooks with: // 💳 PAYMENT_HOOK (future)
- Mark HuggingFace deploy notes with: // 🤗 HF_DEPLOY

### Extension Points (Do Not Build Yet — Just Mark)
- Payment gateway → mark with // 💳 PAYMENT_HOOK
- HuggingFace deploy → mark with // 🤗 HF_DEPLOY  
- Mobile (Capacitor) → mark with // 📱 MOBILE_HOOK
- Webhook support → mark with // 🔗 WEBHOOK_HOOK