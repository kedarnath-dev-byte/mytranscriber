/**
 * TranscriptService.js — Audio Transcription via OpenAI Whisper
 *
 * Converts audio recordings to text using OpenAI Whisper
 * Automatically chunks large files (>25MB or >25 min) into 10-minute segments
 *
 * Supported audio formats: webm, mp3, wav, mp4, m4a
 * Max single file: 25MB (Whisper API limit)
 * Max duration: 25 minutes (Whisper limit)
 * 
 * For larger files: automatically splits into chunks, transcribes each,
 * then combines all transcripts into one
 *
 * Cost: ~$0.006 per minute of audio (all tiers)
 *
 * 🤗 HF_DEPLOY — works as-is, just set OPENAI_API_KEY
 * in HuggingFace Spaces secrets
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const { getModel } = require('../config/models');

class TranscriptService {

  constructor() {
    this.client = null;
  }

  /**
   * Initialize OpenAI client
   * Called once during app startup
   */
  init() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in .env file');
    }
    // Use OpenAI directly for Whisper audio transcription
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ TranscriptService initialized with OpenAI Whisper');
  }

  /**
   * Main transcription method
   * Automatically handles chunking for large files
   * @param {Buffer|string} audioInput - raw audio data or file path
   * @param {string} mimeType - audio mime type (audio/webm etc)
   * @returns {Promise<string>} complete transcript text
   */
  async transcribe(audioInput, mimeType = 'audio/webm') {
    if (!this.client) this.init();

    // Convert buffer to temp file if needed
    let audioPath = audioInput;
    let createdTempFile = false;

    if (Buffer.isBuffer(audioInput)) {
      const ext = this._getExtension(mimeType);
      audioPath = path.join(os.tmpdir(), `rec-${uuidv4()}.${ext}`);
      fs.writeFileSync(audioPath, audioInput);
      createdTempFile = true;
    }

    try {
      // Get file size
      const fileStats = fs.statSync(audioPath);
      const fileSizeBytes = fileStats.size;

      // Check if file needs chunking
      const shouldChunk = this._needsChunking(audioPath, fileSizeBytes);

      if (!shouldChunk) {
        // ===== SINGLE FILE (no chunking needed) =====
        console.log(`📄 Single file transcription (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB)`);
        return await this._transcribeSingleFile(audioPath);
      }

      // ===== CHUNKED TRANSCRIPTION =====
      console.log('🔪 Large file detected - using chunked transcription');
      return await this._transcribeChunked(audioPath);

    } finally {
      // Clean up temp file if we created it from buffer
      if (createdTempFile && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
        console.log(`🗑️ Temp file cleaned up: ${audioPath}`);
      }
    }
  }

  /**
   * Transcribe a single audio file (no chunking)
   * @param {string} audioPath - path to audio file
   * @returns {Promise<string>} transcript
   */
  async _transcribeSingleFile(audioPath) {
    console.log(`🎙️ Transcribing audio file: ${audioPath}`);

    const response = await this.client.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    });

    console.log('✅ Transcription complete');
    return typeof response === 'string' ? response : response.text;
  }

  /**
   * Transcribe large audio file using chunking
   * @param {string} audioPath - path to audio file
   * @returns {Promise<string>} combined transcript
   */
  async _transcribeChunked(audioPath) {
    // Step 1: Split audio into chunks
    const tempChunkDir = path.join(os.tmpdir(), `chunks-${uuidv4()}`);
    const chunkPaths = this._splitAudio(audioPath, tempChunkDir);

    const transcripts = [];

    try {
      // Step 2: Transcribe each chunk
      for (let i = 0; i < chunkPaths.length; i++) {
        const chunkPath = chunkPaths[i];
        console.log(`🎤 Transcribing chunk ${i + 1}/${chunkPaths.length}...`);

        try {
          const response = await this.client.audio.transcriptions.create({
            file: fs.createReadStream(chunkPath),
            model: 'whisper-1',
            language: 'en',
            response_format: 'text',
          });

          const transcript = typeof response === 'string' ? response : response.text;
          transcripts.push(transcript);
          console.log(`✅ Chunk ${i + 1} transcribed`);
        } catch (error) {
          console.error(`❌ Failed to transcribe chunk ${i + 1}:`, error.message);
          throw error;
        }
      }

      // Step 3: Combine transcripts
      const combinedTranscript = this._combineTranscripts(transcripts);

      console.log('✅ Chunked transcription complete');
      return combinedTranscript;

    } finally {
      // Step 4: Cleanup chunk files
      this._cleanupChunks(chunkPaths, tempChunkDir);
    }
  }

  /**
   * Check if file needs chunking
   * @param {string} audioPath - path to audio file
   * @param {number} fileSizeBytes - file size in bytes
   * @returns {boolean} true if needs chunking
   */
  _needsChunking(audioPath, fileSizeBytes) {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const WHISPER_MAX_DURATION = 25 * 60; // ~25 minutes

    // Check file size
    if (fileSizeBytes > MAX_FILE_SIZE) {
      console.log(`📦 File too large (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) - will chunk`);
      return true;
    }

    // Check duration using ffprobe
    try {
      const duration = this._getAudioDuration(audioPath);
      if (duration > WHISPER_MAX_DURATION) {
        console.log(`⏱️ Audio too long (${Math.floor(duration / 60)}m ${duration % 60}s) - will chunk`);
        return true;
      }
    } catch (e) {
      console.log('⚠️ Could not determine duration, proceeding without chunking');
    }

    return false;
  }

  /**
   * Get audio duration in seconds using ffprobe
   * @param {string} audioPath - path to audio file
   * @returns {number} duration in seconds
   */
  _getAudioDuration(audioPath) {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    return Math.ceil(parseFloat(output.trim()));
  } catch (error) {
    console.error('❌ Failed to get audio duration:', error.message);
    throw error;
  }
}
  /**
   * Split audio into 10-minute chunks using ffmpeg
   * @param {string} audioPath - path to audio file
   * @param {string} outputDir - directory to save chunks
   * @returns {Array<string>} paths to chunk files
   */
  _splitAudio(audioPath, outputDir) {
    const CHUNK_DURATION = 10 * 60; // 10 minutes in seconds

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🔪 Splitting audio into 10-minute chunks...`);

    try {
      // Get total duration
      const totalDuration = this._getAudioDuration(audioPath);
      console.log(`⏱️ Total duration: ${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`);

      const chunks = [];
      const numChunks = Math.ceil(totalDuration / CHUNK_DURATION);

      // Extract each chunk
      for (let i = 0; i < numChunks; i++) {
        const startTime = i * CHUNK_DURATION;
        const chunkPath = path.join(outputDir, `chunk_${i}.wav`);

        const startMin = Math.floor(startTime / 60);
        const endMin = Math.floor((startTime + CHUNK_DURATION) / 60);
        console.log(`   📍 Extracting chunk ${i + 1}/${numChunks} (${startMin}m - ${endMin}m)...`);

        // FFmpeg command to extract chunk as WAV
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
   * @param {Array<string>} transcripts - array of transcript strings
   * @returns {string} combined transcript
   */
  _combineTranscripts(transcripts) {
    console.log(`🔗 Combining ${transcripts.length} transcripts...`);

    return transcripts
      .filter(t => t && t.trim().length > 0)
      .join('\n\n')
      .trim();
  }

  /**
   * Cleanup chunk files and directory
   * @param {Array<string>} chunkPaths - paths to chunk files
   * @param {string} chunkDir - directory containing chunks
   */
  _cleanupChunks(chunkPaths, chunkDir) {
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

    // Cleanup directory
    try {
      if (fs.existsSync(chunkDir)) {
        fs.rmdirSync(chunkDir);
      }
    } catch (e) {
      console.warn(`⚠️ Failed to delete chunk directory:`, e.message);
    }

    console.log(`✅ Cleanup complete`);
  }

  /**
   * Get file extension from mime type
   * @param {string} mimeType - mime type
   * @returns {string} file extension
   */
  _getExtension(mimeType) {
    const map = {
      'audio/webm': 'webm',
      'audio/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/m4a': 'm4a',
      'video/mp4': 'mp4',
    };
    return map[mimeType] || 'webm';
  }
}

// Export single instance
const transcriptService = new TranscriptService();
module.exports = transcriptService;