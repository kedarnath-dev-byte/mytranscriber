/**
 * adminRoutes.js — Admin Dashboard Routes
 *
 * Routes:
 * GET  /admin/dashboard         → Admin stats + users list
 * GET  /admin/users             → Get all users with usage stats
 * GET  /admin/users/:id         → Get specific user's recordings
 * PATCH /admin/users/:id/tier   → Change user tier
 * DELETE /admin/users/:id       → Delete user
 * DELETE /admin/recordings/:id  → Delete recording
 *
 * 🔐 PROTECTED: Only ADMIN_EMAIL can access
 */

const express = require('express');
const router = express.Router();
const dbService = require('../services/DatabaseService');

// ─── Admin Auth Middleware ─────────────────────────────
function adminAuth(req, res, next) {
  const adminEmail = process.env.ADMIN_EMAIL;

  // Try session first
  if (req.user && req.user.email === adminEmail) {
    return next();
  }

  // Try email from header (for testing)
  const email = req.headers['x-admin-email'];
  if (email === adminEmail) {
    const user = dbService.db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Not authenticated or not admin
  return res.status(403).json({ 
    success: false, 
    message: 'Admin access required. Admin email: ' + adminEmail
  });
}

// ─── Admin Dashboard (Stats Overview) ──────────────────
router.get('/dashboard', adminAuth, (req, res) => {
  try {
    const users = dbService.getAllUsers();
    const recordings = dbService.getAllRecordings();

    // Calculate stats
    const stats = {
      totalUsers: users.length,
      totalRecordings: recordings.length,
      usersByTier: {
        free: users.filter(u => u.tier === 'free').length,
        pro: users.filter(u => u.tier === 'pro').length,
        max: users.filter(u => u.tier === 'max').length,
      },
      recordingsByStatus: {
        completed: recordings.filter(r => r.status === 'completed').length,
        pending: recordings.filter(r => r.status === 'pending').length,
        processing: recordings.filter(r => r.status === 'processing').length,
      },
      totalDuration: recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0),
    };

    res.json({ 
      success: true, 
      data: stats 
    });

  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ─── Get All Users with Stats ─────────────────────────
router.get('/users', adminAuth, (req, res) => {
  try {
    const users = dbService.getAllUsers();
    const recordings = dbService.getAllRecordings();

    // Add stats to each user
    const usersWithStats = users.map(user => {
      const userRecordings = recordings.filter(r => r.user_id === user.id);
      const totalDuration = userRecordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);

      return {
        ...user,
        recordingCount: userRecordings.length,
        totalDuration,
        totalDurationFormatted: formatDuration(totalDuration),
      };
    });

    res.json({ 
      success: true, 
      data: usersWithStats 
    });

  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ─── Get User's Recordings ────────────────────────────
router.get('/users/:id', adminAuth, (req, res) => {
  try {
    const user = dbService.findUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get recordings by user_id (not by uid)
    const recordings = dbService.db.prepare('SELECT * FROM recordings WHERE user_id = ? ORDER BY created_at DESC').all(user.id);

    res.json({ 
      success: true, 
      data: {
        user,
        recordings,
      }
    });

  } catch (error) {
    console.error('❌ Get user recordings error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ─── Change User Tier ─────────────────────────────────
router.patch('/users/:id/tier', adminAuth, (req, res) => {
  try {
    const { tier } = req.body;

    // Validate tier
    if (!['free', 'pro', 'max'].includes(tier)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tier. Must be free, pro, or max' 
      });
    }

    // Get user
    const user = dbService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Prevent admin from changing own tier
    if (user.email === process.env.ADMIN_EMAIL) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot change admin tier' 
      });
    }

    // Update tier (using id column, not uid)
    const stmt = dbService.db.prepare('UPDATE users SET tier = ? WHERE id = ?');
    stmt.run(tier, req.params.id);

    // Get updated user
    const updated = dbService.findUserById(req.params.id);

    console.log(`🔧 Admin changed ${user.email} tier from ${user.tier} to ${tier}`);

    res.json({ 
      success: true, 
      message: `Tier updated to ${tier}`,
      data: updated
    });

  } catch (error) {
    console.error('❌ Change tier error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ─── Delete User ──────────────────────────────────────
router.delete('/users/:id', adminAuth, (req, res) => {
  try {
    // Prevent admin from deleting self
    const user = dbService.findUserById(req.params.id);
    if (user && user.email === process.env.ADMIN_EMAIL) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot delete admin user' 
      });
    }

    // Delete all user's recordings first
    const recordings = dbService.db.prepare('SELECT * FROM recordings WHERE user_id = ?').all(req.params.id);
    for (const rec of recordings) {
      dbService.db.prepare('DELETE FROM recordings WHERE id = ?').run(rec.id);
    }

    // Delete user (using id column, not uid)
    const stmt = dbService.db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(req.params.id);

    console.log(`🗑️ Admin deleted user ${user?.email}`);

    res.json({ 
      success: true, 
      message: 'User deleted'
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ─── Delete Recording (as Admin) ────────────────────
router.delete('/recordings/:id', adminAuth, (req, res) => {
  try {
    const recording = dbService.getRecordingById(req.params.id);

    if (!recording) {
      return res.status(404).json({ 
        success: false, 
        message: 'Recording not found' 
      });
    }

    // Delete recording
    const stmt = dbService.db.prepare('DELETE FROM recordings WHERE id = ?');
    stmt.run(req.params.id);

    console.log(`🗑️ Admin deleted recording ${req.params.id}`);

    res.json({ 
      success: true, 
      message: 'Recording deleted'
    });

  } catch (error) {
    console.error('❌ Delete recording error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ─── Helper Functions ──────────────────────────────────
function formatDuration(seconds) {
  if (!seconds) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = router;