/**
 * DatabaseService.js — Local SQLite Database Manager
 *
 * Handles all database operations for MyTranscriber.
 * Uses SQLite for local storage — no internet required.
 *
 * Database location:
 * - Dev: F:\Projects\mytranscriber\data\transcriber.db
 * - Production (Windows): %APPDATA%\MyTranscriber\transcriber.db
 *
 * Tables:
 * - users        → stores Google OAuth user profiles
 * - recordings   → stores all transcripts + summaries
 *
 * 🤗 HF_DEPLOY — swap better-sqlite3 for postgres by replacing
 * this service with PostgresDatabaseService.js — interface stays same
 *
 * 💳 PAYMENT_HOOK — add 'subscription_tier' and 'subscription_expiry'
 * columns to users table when payment is integrated
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseService {

  constructor() {
    this.db = null;
  }

  /**
   * Initialize database — creates tables if they don't exist
   * @param {string} dbPath - path to .db file
   */
  init(dbPath) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this._createTables();
    console.log(`✅ Database initialized at: ${dbPath}`);
  }

  /**
   * Create all required tables
   * Private method — called only during init
   */
  _createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        avatar TEXT,
        tier TEXT DEFAULT 'free',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        duration_seconds INTEGER DEFAULT 0,
        transcript TEXT,
        summary TEXT,
        action_items TEXT,
        tier_used TEXT DEFAULT 'free',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  }

  // ─── USER METHODS ──────────────────────────────────────

  /**
   * Find user by Google ID
   * @param {string} googleId
   * @returns {object|null} user or null
   */
  findUserByGoogleId(googleId) {
    return this.db
      .prepare('SELECT * FROM users WHERE google_id = ?')
      .get(googleId);
  }

  /**
   * Find user by ID
   * @param {string} id
   * @returns {object|null} user or null
   */
  findUserById(id) {
    return this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id);
  }

  /**
   * Create new user after Google login
   * @param {object} userData - { id, google_id, name, email, avatar }
   * @returns {object} created user
   */
  createUser(userData) {
    this.db.prepare(`
      INSERT INTO users (id, google_id, name, email, avatar, tier)
      VALUES (@id, @google_id, @name, @email, @avatar, @tier)
    `).run(userData);
    return this.findUserById(userData.id);
  }

  /**
   * Update user's last login timestamp
   * @param {string} id
   */
  updateLastLogin(id) {
    this.db
      .prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
      .run(id);
  }

  /**
   * Update user tier — called when payment is made
   * 💳 PAYMENT_HOOK — call this after successful payment
   * @param {string} id
   * @param {string} tier - 'free' | 'pro' | 'max'
   */
  updateUserTier(id, tier) {
    this.db
      .prepare('UPDATE users SET tier = ? WHERE id = ?')
      .run(tier, id);
  }

  // ─── RECORDING METHODS ─────────────────────────────────

  /**
   * Save a new recording with transcript and summary
   * @param {object} recording
   * @returns {object} saved recording
   */
  createRecording(recording) {
    this.db.prepare(`
      INSERT INTO recordings
        (id, user_id, title, mode, duration_seconds, transcript, summary, action_items, tier_used)
      VALUES
        (@id, @user_id, @title, @mode, @duration_seconds, @transcript, @summary, @action_items, @tier_used)
    `).run(recording);
    return this.getRecordingById(recording.id);
  }

  /**
   * Get all recordings for a user — newest first
   * @param {string} userId
   * @returns {array} list of recordings
   */
  getRecordingsByUser(userId) {
    return this.db.prepare(`
      SELECT id, title, mode, duration_seconds, summary, tier_used, created_at
      FROM recordings
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
  }

  /**
   * Get single recording by ID
   * @param {string} id
   * @returns {object|null} recording or null
   */
  getRecordingById(id) {
    const rec = this.db
      .prepare('SELECT * FROM recordings WHERE id = ?')
      .get(id);

    // Parse action_items from JSON string
    if (rec && rec.action_items) {
      try {
        rec.action_items = JSON.parse(rec.action_items);
      } catch (_) {
        rec.action_items = [];
      }
    }
    return rec;
  }

  /**
   * Delete a recording by ID
   * @param {string} id
   * @param {string} userId - for security check
   * @returns {boolean} true if deleted
   */
  deleteRecording(id, userId) {
    const result = this.db
      .prepare('DELETE FROM recordings WHERE id = ? AND user_id = ?')
      .run(id, userId);
    return result.changes > 0;
  }

  /**
   * Count recordings for a user this month
   * Used for enforcing free tier limits
   * @param {string} userId
   * @returns {number} count
   */
  getRecordingCountThisMonth(userId) {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM recordings
      WHERE user_id = ?
      AND created_at >= date('now', 'start of month')
    `).get(userId);
    return result.count;
  }
}

// Export single instance — used across entire app
const dbService = new DatabaseService();
module.exports = dbService;