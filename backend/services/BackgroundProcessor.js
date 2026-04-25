/**
 * BackgroundProcessor
 * Automatically processes pending recordings when internet is available
 * - Runs every 30 seconds
 * - Checks for pending recordings
 * - Processes them if online
 * - Cleans up audio files after success
 */

const fs = require('fs');
const path = require('path');
const ConnectivityService = require('./ConnectivityService');
const TranscriptService = require('./TranscriptService');
const SummaryService = require('./SummaryService');

class BackgroundProcessor {
  constructor(databaseService) {
    this.db = databaseService;
    this.isProcessing = false;
    this.interval = null;
  }

  /**
   * Start background processing
   * Checks every 30 seconds for pending recordings
   */
  start() {
    console.log('🔄 Background processor started (checking every 30 seconds)');
    
    // Check immediately on start
    this.processPending();
    
    // Then check every 30 seconds
    this.interval = setInterval(() => {
      this.processPending();
    }, 30000); // 30 seconds
  }

  /**
   * Stop background processing
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('⏹️ Background processor stopped');
    }
  }

  /**
   * Process all pending recordings if online
   */
  async processPending() {
    // Skip if already processing
    if (this.isProcessing) {
      return;
    }

    // Check if online
    const online = await ConnectivityService.isOnline();
    if (!online) {
      return; // Still offline, skip
    }

    // Get pending recordings
    const pending = this.db.getPendingRecordings();
    if (pending.length === 0) {
      return; // Nothing to process
    }

    console.log(`📡 Internet detected! Processing ${pending.length} pending recording(s)...`);
    this.isProcessing = true;

    // Process each recording
    for (const recording of pending) {
      try {
        await this.processRecording(recording);
      } catch (error) {
        console.error(`❌ Failed to process recording ${recording.id}:`, error.message);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single recording
   * @param {Object} recording - Recording from database
   */
  async processRecording(recording) {
    const { id, audio_path, tier, uid } = recording;

    console.log(`⏳ Processing recording ${id}...`);

    // Update status to processing
    this.db.updateRecordingStatus(id, 'processing');

    try {
      // Step 1: Transcribe audio file
      console.log(`   🎤 Transcribing audio...`);
      const audioFilePath = path.resolve(audio_path);
      const transcript = await TranscriptService.transcribe(audioFilePath, tier);

      // Step 2: Generate summary
      console.log(`   🤖 Generating summary...`);
      const summary = await SummaryService.generateSummary(transcript, tier);

      // Step 3: Generate title from summary (first line)
      const title = summary.split('\n')[0].substring(0, 100) || 'Processed Recording';

      // Step 4: Update database
      console.log(`   💾 Saving to database...`);
      this.db.updateRecordingAfterProcessing(id, transcript, summary, title);

      // Step 5: Delete audio file (cleanup)
      console.log(`   🗑️ Cleaning up audio file...`);
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }

      console.log(`✅ Recording ${id} processed successfully!`);

    } catch (error) {
      // Reset to pending on failure
      this.db.updateRecordingStatus(id, 'pending');
      throw error;
    }
  }
}

module.exports = BackgroundProcessor;