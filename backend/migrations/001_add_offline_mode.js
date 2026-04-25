// Migration: Add offline mode support columns
const Database = require('better-sqlite3');
const path = require('path');

function migrate() {
  const dbPath = path.join(__dirname, '../../data/transcriber.db');
  const db = new Database(dbPath);

  try {
    console.log('🔄 Running migration: Add offline mode columns...');

    // Add status column (pending, processing, completed)
    db.exec(`
      ALTER TABLE recordings 
      ADD COLUMN status TEXT DEFAULT 'completed'
    `);

    // Add audio_path column (stores WAV file path for pending recordings)
    db.exec(`
      ALTER TABLE recordings 
      ADD COLUMN audio_path TEXT
    `);

    console.log('✅ Migration completed successfully');
    console.log('   - Added "status" column (pending/processing/completed)');
    console.log('   - Added "audio_path" column (stores pending audio files)');

  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️  Columns already exist - skipping migration');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;