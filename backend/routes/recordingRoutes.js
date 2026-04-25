/**
 * recordingRoutes.js — Recording Upload, Fetch, Delete Routes
 *
 * Routes:
 * POST /api/recordings/upload  → Upload audio, transcribe, summarize
 * GET  /api/recordings         → Get all recordings for user
 * GET  /api/recordings/:id     → Get single recording with full transcript
 * DELETE /api/recordings/:id   → Delete a recording
 * GET  /api/recordings/:id/export/pdf → Export as PDF
 * GET  /api/recordings/:id/export/txt → Export as TXT
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
// Allow auth via session OR id query/header (for Electron)
function flexAuth(req, res, next) {
  if (req.isAuthenticated()) return next();

  const id = req.query.id || req.headers['x-user-id'];
  console.log('🔑 flexAuth id received:', id);

  if (id) {
    const user = dbService.findUserById(id);
    console.log('🔑 flexAuth user found:', user?.email);
    if (user) {
      req.user = user;
      return next();
    }
  }

  console.log('❌ flexAuth failed — no valid id');
  res.status(401).json({ success: false, message: 'User not found.' });
}

// ─── Upload & Process Recording (OFFLINE MODE SUPPORT) ─────
router.post('/upload', flexAuth, upload.single('audio'), async (req, res) => {
  try {
    const { id, tier } = req.user;
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
        id,
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
    const audioBuffer = fs.readFileSync(req.file.path);
    const transcript = await transcriptService.transcribe(
      audioBuffer,
      req.file.mimetype
    );
    console.log('✅ Transcription complete');

    // Step 2: Generate summary
    console.log('🤖 Generating summary...');
    const summary = await summaryService.analyze(transcript, tier);
    console.log('✅ Summary complete');

    // Step 3: Generate title from analysis
    const title = summary.title || 'Untitled Recording';

    // Step 4: Save to database
    const recording = {
      id: uuidv4(),
      user_id: req.user.id,
      title: title,
      mode: 'system',
      duration_seconds: recordDuration,
      transcript: transcript,
      summary: JSON.stringify({
        title: title,
        summary: summary.summary || summary,
        action_items: summary.action_items || []
      }),
      action_items: JSON.stringify(summary.action_items || []),
      tier_used: tier,
    };

    const result = dbService.createRecording(recording);

    // Step 5: Cleanup temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.log('✅ Recording saved successfully');

    res.json({
      success: true,
      data: {
        ...result,
        action_items: summary.action_items || []
      }
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
    const recordings = dbService.getRecordingsByUser(req.user.id);
    res.json({ success: true, data: recordings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get Single Recording ──────────────────────────────────
router.get('/:id', flexAuth, (req, res) => {
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
router.delete('/:id', flexAuth, (req, res) => {
  try {
    const recording = dbService.getRecordingById(req.params.id);

    if (!recording || recording.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found',
      });
    }

    // Delete recording
    const stmt = dbService.db.prepare('DELETE FROM recordings WHERE id = ?');
    stmt.run(req.params.id);

    res.json({ success: true, message: 'Recording deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Export Recording as PDF ───────────────────────────
router.get('/:id/export/pdf', flexAuth, async (req, res) => {
  try {
    const ExportService = require('../services/ExportService');
    const { hasFeature } = require('../config/tiers');
    
    // Check tier
    if (!hasFeature(req.user.tier, 'exportPDF')) {
      return res.status(403).json({
        success: false,
        message: 'PDF export is available on Pro and Max plans only.'
      });
    }

    // Get recording
    const recording = dbService.getRecordingById(req.params.id);

    if (!recording || recording.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Generate PDF
    const filename = `${recording.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    const tempPath = path.join(__dirname, '../../temp', filename);

    await ExportService.exportPDF(recording, tempPath);

    // Send file
    res.download(tempPath, filename, (err) => {
      // Cleanup after download
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      if (err) {
        console.error('❌ Download error:', err);
      }
    });

  } catch (error) {
    console.error('❌ PDF export error:', error);
    res.status(500).json({ 
      error: 'Failed to export PDF',
      details: error.message 
    });
  }
});

// ─── Export Recording as TXT ───────────────────────────
router.get('/:id/export/txt', flexAuth, async (req, res) => {
  try {
    const ExportService = require('../services/ExportService');
    const { hasFeature } = require('../config/tiers');
    
    // Check tier
    if (!hasFeature(req.user.tier, 'exportTXT')) {
      return res.status(403).json({
        success: false,
        message: 'TXT export is available on Pro and Max plans only.'
      });
    }

    // Get recording
    const recording = dbService.getRecordingById(req.params.id);

    if (!recording || recording.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Generate TXT
    const filename = `${recording.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    const tempPath = path.join(__dirname, '../../temp', filename);

    await ExportService.exportTXT(recording, tempPath);

    // Send file
    res.download(tempPath, filename, (err) => {
      // Cleanup after download
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      if (err) {
        console.error('❌ Download error:', err);
      }
    });

  } catch (error) {
    console.error('❌ TXT export error:', error);
    res.status(500).json({ 
      error: 'Failed to export TXT',
      details: error.message 
    });
  }
});

module.exports = router;