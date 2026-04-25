/**
 * ChunkingService
 * Splits large audio files into smaller chunks for Whisper transcription
 * Whisper has a 25MB limit, so we chunk large files into 10-minute segments
 *
 * Workflow:
 * 1. Get audio file duration
 * 2. If > 25MB, split into 10-min chunks
 * 3. Transcribe each chunk separately
 * 4. Combine all transcripts
 * 5. Return complete transcript
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ChunkingService {
  /**
   * Get audio file duration in seconds
   * Uses ffprobe to read duration without processing
   * @param {string} audioPath - Path to audio file
   * @returns {number} - Duration in seconds
   */
  static getAudioDuration(audioPath) {
    try {
      // Use ffprobe to get duration
      const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noinvert_list=1 "${audioPath}"`;
      const output = execSync(cmd, { encoding: 'utf-8' });
      return Math.ceil(parseFloat(output.trim()));
    } catch (error) {
      console.error('❌ Failed to get audio duration:', error.message);
      return 0;
    }
  }

  /**
   * Check if file needs chunking
   * @param {string} audioPath - Path to audio file
   * @param {number} fileSizeBytes - File size in bytes
   * @returns {boolean} - true if needs chunking
   */
  static needsChunking(audioPath, fileSizeBytes) {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const WHISPER_MAX_DURATION = 25 * 60; // ~25 minutes of audio

    // Check file size
    if (fileSizeBytes > MAX_FILE_SIZE) {
      console.log(`📦 File too large (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) - will chunk`);
      return true;
    }

    // Check duration
    try {
      const duration = this.getAudioDuration(audioPath);
      if (duration > WHISPER_MAX_DURATION) {
        console.log(`⏱️ Audio too long (${duration}s) - will chunk`);
        return true;
      }
    } catch (e) {
      // If we can't get duration, assume no chunking needed
      console.log('⚠️ Could not determine duration, proceeding without chunking');
    }

    return false;
  }

  /**
   * Split audio file into chunks
   * Uses ffmpeg to extract 10-minute segments
   * @param {string} audioPath - Path to audio file
   * @param {string} outputDir - Directory to save chunks
   * @returns {Array<string>} - Paths to chunk files
   */
  static splitAudio(audioPath, outputDir) {
    const CHUNK_DURATION = 10 * 60; // 10 minutes in seconds

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🔪 Splitting audio into 10-minute chunks...`);

    try {
      // Get total duration
      const totalDuration = this.getAudioDuration(audioPath);
      console.log(`⏱️ Total duration: ${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`);

      const chunks = [];
      let chunkIndex = 0;

      // Calculate number of chunks needed
      const numChunks = Math.ceil(totalDuration / CHUNK_DURATION);

      // Extract each chunk
      for (let i = 0; i < numChunks; i++) {
        const startTime = i * CHUNK_DURATION;
        const chunkPath = path.join(outputDir, `chunk_${i}.wav`);

        console.log(`   📍 Extracting chunk ${i + 1}/${numChunks} (${Math.floor(startTime / 60)}m - ${Math.floor((startTime + CHUNK_DURATION) / 60)}m)...`);

        // FFmpeg command to extract chunk
        const cmd = `ffmpeg -i "${audioPath}" -ss ${startTime} -t ${CHUNK_DURATION} -c:a pcm_s16le -ar 16000 -ac 1 -y "${chunkPath}" 2>nul`;
        execSync(cmd);

        chunks.push(chunkPath);
        console.log(`   ✅ Chunk ${i + 1} extracted`);
      }

      console.log(`✅ Split complete: ${chunks.length} chunks created`);
      return chunks;

    } catch (error) {
      console.error('❌ Audio splitting failed:', error.message);
      throw new Error(`Failed to split audio: ${error.message}`);
    }
  }

  /**
   * Combine multiple transcripts into one
   * Preserves order and adds separator for clarity
   * @param {Array<string>} transcripts - Array of transcript strings
   * @returns {string} - Combined transcript
   */
  static combineTranscripts(transcripts) {
    console.log(`🔗 Combining ${transcripts.length} transcripts...`);

    return transcripts
      .filter(t => t && t.trim().length > 0)
      .join('\n\n')
      .trim();
  }

  /**
   * Cleanup chunk files
   * @param {Array<string>} chunkPaths - Paths to chunk files
   */
  static cleanup(chunkPaths) {
    console.log(`🗑️ Cleaning up ${chunkPaths.length} chunk files...`);

    for (const chunkPath of chunkPaths) {
      try {
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to delete ${chunkPath}:`, error.message);
      }
    }

    console.log(`✅ Cleanup complete`);
  }
}

module.exports = ChunkingService;