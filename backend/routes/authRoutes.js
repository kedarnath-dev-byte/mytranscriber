/**
 * authRoutes.js — Google OAuth Login/Logout Routes
 *
 * Routes:
 * GET /auth/google          → Start Google login
 * GET /auth/google/callback → Google redirects here after login
 * GET /auth/me              → Get current logged in user
 * GET /auth/logout          → Logout user
 *
 * 🤗 HF_DEPLOY — update GOOGLE_CALLBACK_URL to your HF Space URL
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/AuthService');
const passport = authService.getPassport();

// Start Google OAuth login flow
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Google redirects here after user approves
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}?error=auth_failed`,
  }),
  (req, res) => {
    // Pass user id in URL so Electron can store it
    const userId = req.user.id;
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard?uid=${userId}`
    );
  }
);

// Get current logged in user info
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Not logged in',
    });
  }

  // Return safe user data — never return full DB object
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      tier: req.user.tier,
    },
  });
});

// Logout user
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;