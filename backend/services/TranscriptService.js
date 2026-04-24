/**
 * TranscriptService.js — Audio Transcription via OpenRouter
 *
 * Converts audio recordings to text using OpenAI Whisper
 * accessed through OpenRouter API.
 *
 * Supported audio formats: webm, mp3, wav, mp4, m4a
 * Max file size: 25MB (Whisper API limit)
 *
 * Cost: ~$0.006 per minute of audio (all tiers)
 *
 * 🤗 HF_DEPLOY — works as-is, just set OPENROUTER_API_KEY
 * in HuggingFace Spaces secrets
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { getModel } = require('../config/models');

class TranscriptService {

  constructor() {
    this.client = null;
  }

  /**
   * Initialize OpenRouter client
   * Called once during app startup
   */
 init() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in .env file');
    }
    // Use OpenAI directly for Whisper audio transcription
    // OpenRouter does not support audio file uploads
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ TranscriptService initialized with OpenAI Whisper');
  }

  /**
   * Transcribe audio buffer to text using Whisper
   * @param {Buffer} audioBuffer - raw audio data
   * @param {string} mimeType - audio mime type (audio/webm etc)
   * @returns {Promise<string>} transcript text
   */
  async transcribe(audioBuffer, mimeType = 'audio/webm') {
    if (!this.client) this.init();

    // Get file extension from mime type
    const ext = this._getExtension(mimeType);

    // Save buffer to temp file — Whisper needs a file
    const tmpPath = path.join(os.tmpdir(), `rec-${uuidv4()}.${ext}`);

    try {
      fs.writeFileSync(tmpPath, audioBuffer);
      console.log(`🎙️ Transcribing audio file: ${tmpPath}`);

      const modelConfig = getModel('transcription');

      const response = await this.client.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: 'whisper-1',   // Whisper model name on OpenRouter
        language: 'en',       // Force English for better accuracy
        response_format: 'text',
      });

      console.log('✅ Transcription complete');
      return typeof response === 'string' ? response : response.text;

    } finally {
      // Always clean up temp file
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
        console.log(`🗑️ Temp file cleaned up: ${tmpPath}`);
      }
    }
  }

  /**
   * Get file extension from mime type
   * Private helper method
   * @param {string} mimeType
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