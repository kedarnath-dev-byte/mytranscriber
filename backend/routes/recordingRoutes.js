/**
 * recordingRoutes.js — Recording Upload, Fetch, Delete Routes
 *
 * Routes:
 * POST /api/recordings/upload  → Upload audio, transcribe, summarize
 * GET  /api/recordings         → Get all recordings for user
 * GET  /api/recordings/:id     → Get single recording with full transcript
 * DELETE /api/recordings/:id   → Delete a recording
 *
 * 🤗 HF_DEPLOY — works as-is, just ensure temp folder is writable
 * 💳 PAYMENT_HOOK — tier limits enforced via tierMiddleware
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const authService = require('../services/AuthService');
const transcriptService = require('../services/TranscriptService');
const summaryService = require('../services/SummaryService');
const dbService = require('../services/DatabaseService');
const { hasFeature } = require('../config/tiers');

// ─── Multer Setup ──────────────────────────────────────────
// Stores uploaded audio temporarily before processing
const uploadDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max (Whisper limit)
  fileFilter: (req, file, cb) => {
    const allowed = [
      'audio/webm', 'audio/mp4', 'audio/mpeg',
      'audio/wav', 'audio/m4a', 'video/mp4',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio/video files are allowed'));
    }
  },
});

// Auth middleware — all routes require login
const requireAuth = authService.requireAuth();

// ─── Upload & Process Recording ────────────────────────────
router.post('/upload', requireAuth, upload.single('audio'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided',
      });
    }

    const userTier = req.user.tier || 'free';
    const { mode, durationSeconds } = req.body;

    // Check recording limit for free tier
    const maxRecordings = hasFeature(userTier, 'maxRecordings');
    if (maxRecordings !== Infinity) {
      const count = dbService.getRecordingCountThisMonth(req.user.id);
      if (count >= maxRecordings) {
        return res.status(403).json({
          success: false,
          message: `Free tier limit reached (${maxRecordings} recordings/month). Please upgrade to Pro.`,
          upgradeRequired: true,
        });
      }
    }

    // Read audio file as buffer
    const audioBuffer = fs.readFileSync(filePath);

    // Step 1 — Transcribe audio with Whisper
    console.log(`🎙️ Starting transcription for user: ${req.user.email}`);
    const transcript = await transcriptService.transcribe(
      audioBuffer,
      req.file.mimetype
    );

    // Step 2 — Analyze transcript with LLM
    console.log(`🤖 Analyzing transcript (tier: ${userTier})`);
    const analysis = await summaryService.analyze(transcript, userTier);

    // Step 3 — Save to database
    const recording = {
      id: uuidv4(),
      user_id: req.user.id,
      title: analysis.title,
      mode: mode || 'system',
      duration_seconds: parseInt(durationSeconds) || 0,
      transcript,
      summary: analysis.summary,
      action_items: JSON.stringify(analysis.action_items),
      tier_used: userTier,
    };

    const saved = dbService.createRecording(recording);

    res.json({
      success: true,
      data: {
        ...saved,
        action_items: analysis.action_items,
      },
    });

  } catch (err) {
    console.error('❌ Recording processing failed:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Processing failed. Check your API key.',
    });
  } finally {
    // Always clean up uploaded temp file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// ─── Get All Recordings ────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  try {
    const recordings = dbService.getRecordingsByUser(req.user.id);
    res.json({ success: true, data: recordings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get Single Recording ──────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  try {
    const recording = dbService.getRecordingById(req.params.id);

    if (!recording || recording.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found',
      });
    }

    res.json({ success: true, data: recording });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Delete Recording ──────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const deleted = dbService.deleteRecording(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found',
      });
    }

    res.json({ success: true, message: 'Recording deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;