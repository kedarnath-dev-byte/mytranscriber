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
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
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

// ─── Auth Middleware ───────────────────────────────────────
// Allow auth via session OR uid query/header (for Electron)
function flexAuth(req, res, next) {
  if (req.isAuthenticated()) return next();

  const uid = req.query.uid || req.headers['x-user-id'];
  console.log('🔑 flexAuth uid received:', uid);

  if (uid) {
    const user = dbService.findUserById(uid);
    console.log('🔑 flexAuth user found:', user?.email);
    if (user) {
      req.user = user;
      return next();
    }
  }

  console.log('❌ flexAuth failed — no valid uid');
  res.status(401).json({ success: false, message: 'User not found.' });
}

// ─── Upload & Process Recording (OFFLINE MODE SUPPORT) ─────
router.post('/upload', flexAuth, upload.single('audio'), async (req, res) => {
  try {
    const { uid, tier } = req.user;
    const { duration, durationSeconds } = req.body;
    const recordDuration = parseInt(duration || durationSeconds) || 0;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('📁 Audio file received:', req.file.originalname);

    // ===== OFFLINE MODE CHECK =====
    const ConnectivityService = require('../services/ConnectivityService');
    const online = await ConnectivityService.isOnline();

    if (!online) {
      // OFFLINE: Save audio for later processing
      console.log('⚠️ OFFLINE MODE: Saving recording for background processing');

      // Generate unique filename
      const timestamp = Date.now();
      const pendingFilename = `rec_${timestamp}.wav`;
      const pendingPath = path.join(__dirname, '../../data/pending', pendingFilename);

      // Move uploaded file to pending directory
      fs.renameSync(req.file.path, pendingPath);

      // Save to database with pending status
      const recordingId = dbService.savePendingRecording(
        uid,
        pendingPath,
        recordDuration,
        tier
      );

      console.log(`💾 Saved as pending recording #${recordingId}`);

      return res.status(202).json({
        id: recordingId,
        status: 'pending',
        message: '⏳ Recording saved. Will process automatically when internet is available.',
        title: 'Pending Recording',
        duration: recordDuration
      });
    }

    // ===== ONLINE MODE: Process immediately =====
    console.log('✅ ONLINE: Processing recording now');

    // Step 1: Transcribe
    console.log('🎤 Starting transcription...');
    const transcript = await transcriptService.transcribe(
      req.file.path,
      tier
    );
    console.log('✅ Transcription complete');

    // Step 2: Generate summary
    console.log('🤖 Generating summary...');
    const summary = await summaryService.generateSummary(transcript, tier);
    console.log('✅ Summary complete');

    // Step 3: Generate title from summary
    const title = summary.split('\n')[0].substring(0, 100) || 'Untitled Recording';

    // Step 4: Save to database
    const stmt = dbService.db.prepare(`
      INSERT INTO recordings (uid, title, transcript, summary, duration, created_at, tier, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      uid,
      title,
      transcript,
      summary,
      recordDuration,
      Date.now(),
      tier,
      'completed'
    );

    // Step 5: Cleanup temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.log('✅ Recording saved successfully');

    res.json({
      id: result.lastInsertRowid,
      status: 'completed',
      message: '✅ Recording processed successfully',
      title,
      duration: recordDuration
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process recording',
      details: error.message 
    });
  }
});

// ─── Get All Recordings ────────────────────────────────────
router.get('/', flexAuth, (req, res) => {
  try {
    const recordings = dbService.getRecordingsByUser(req.user.uid);
    res.json({ success: true, data: recordings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get Single Recording ──────────────────────────────────
router.get('/:id', flexAuth, (req, res) => {
  try {
    const recording = dbService.getRecordingById(req.params.id);

    if (!recording || recording.uid !== req.user.uid) {
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
router.delete('/:id', flexAuth, (req, res) => {
  try {
    const deleted = dbService.deleteRecording(req.params.id, req.user.uid);

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