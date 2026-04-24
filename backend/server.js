/**
 * server.js — Main Express Backend Server
 *
 * Entry point for the backend API.
 * Connects all services, middleware and routes.
 *
 * Runs on: http://localhost:5000
 *
 * 🤗 HF_DEPLOY — this file runs as-is on HuggingFace Spaces
 * Just set all environment variables in HF Spaces secrets
 * Change PORT to 7860 (HF default) in your HF environment
 *
 * 📱 MOBILE_HOOK — this API works as-is for mobile apps
 * Just point Capacitor/React Native to this server URL
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const authService = require('./services/AuthService');
const dbService = require('./services/DatabaseService');
const transcriptService = require('./services/TranscriptService');
const summaryService = require('./services/SummaryService');

const authRoutes = require('./routes/authRoutes');
const recordingRoutes = require('./routes/recordingRoutes');

// ─── App Setup ─────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Initialize Services ───────────────────────────────────
const dbPath = path.join(__dirname, '../data/transcriber.db');
dbService.init(dbPath);
authService.init();
transcriptService.init();
summaryService.init();

// ─── Middleware ────────────────────────────────────────────

// CORS — allow frontend to talk to backend
// Allow requests from Vite dev server AND Electron
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Electron, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true); // Allow all in development
  },
  credentials: true,
}));
// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session — keeps user logged in
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,      // Set true in production with HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    httpOnly: true,
  },
}));

// Passport — handles Google OAuth
const passport = authService.getPassport();
app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/recordings', recordingRoutes);

// Health check — used by deployment platforms
// 🤗 HF_DEPLOY — HuggingFace checks this endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🎙️  MyTranscriber Backend');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV}`);
  console.log(`✅ Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

module.exports = app;