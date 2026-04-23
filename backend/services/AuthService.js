/**
 * AuthService.js — Google OAuth Authentication
 *
 * Handles Google login flow using Passport.js.
 * After login, user is stored in SQLite via DatabaseService.
 *
 * Flow:
 * 1. User clicks "Login with Google"
 * 2. Google redirects to /auth/google
 * 3. User approves → Google sends profile to callback
 * 4. We create/find user in DB
 * 5. User is stored in session
 * 6. Frontend redirected to /dashboard
 *
 * 🤗 HF_DEPLOY — works as-is on HuggingFace Spaces
 * Just update GOOGLE_CALLBACK_URL in environment variables
 *
 * 💳 PAYMENT_HOOK — after login, check subscription status
 * and update user tier from payment provider (Stripe/Razorpay)
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const dbService = require('./DatabaseService');

class AuthService {

  /**
   * Initialize Passport with Google OAuth strategy
   * Call this once during app startup
   */
  init() {
    this._setupGoogleStrategy();
    this._setupSessionHandlers();
    console.log('✅ AuthService initialized');
  }

  /**
   * Setup Google OAuth strategy
   * Private method
   */
  _setupGoogleStrategy() {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = dbService.findUserByGoogleId(profile.id);

          if (!user) {
            // First time login — create new user
            const newUser = {
              id: uuidv4(),
              google_id: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              avatar: profile.photos[0]?.value || null,
              tier: process.env.DEFAULT_USER_TIER || 'free',
            };
            user = dbService.createUser(newUser);
            console.log(`✅ New user created: ${user.email}`);
          } else {
            // Existing user — update last login
            dbService.updateLastLogin(user.id);
            console.log(`✅ User logged in: ${user.email}`);
          }

          // 💳 PAYMENT_HOOK — check subscription status here
          // const subscription = await paymentService.getSubscription(user.email);
          // if (subscription) dbService.updateUserTier(user.id, subscription.tier);

          return done(null, user);

        } catch (err) {
          console.error('❌ Auth error:', err);
          return done(err, null);
        }
      }
    ));
  }

  /**
   * Setup session serialization/deserialization
   * Private method
   */
  _setupSessionHandlers() {
    // Save user ID to session cookie
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    // Load user from DB using session cookie
    passport.deserializeUser((id, done) => {
      const user = dbService.findUserById(id);
      done(null, user || false);
    });
  }

  /**
   * Middleware to check if user is logged in
   * Use on any protected route
   * @returns {function} Express middleware
   */
  requireAuth() {
    return (req, res, next) => {
      if (req.isAuthenticated()) return next();
      res.status(401).json({
        success: false,
        message: 'Please login to continue',
      });
    };
  }

  /**
   * Get passport instance for use in Express app
   * @returns {object} passport
   */
  getPassport() {
    return passport;
  }
}

// Export single instance
const authService = new AuthService();
module.exports = authService;