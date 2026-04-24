/**
 * SummaryService.js — AI Meeting Summarization via OpenRouter
 *
 * Generates meeting summaries and action items from transcripts.
 * Uses different LLM models based on user tier:
 *
 * 🟢 FREE → Llama 3.3 70B (free model on OpenRouter)
 * 🔵 PRO  → GPT-4o Mini (cheap, fast, high quality)
 * 🟣 MAX  → Claude Sonnet 4.5 (best quality)
 *
 * 🤗 HF_DEPLOY — works as-is on HuggingFace Spaces
 * 💳 PAYMENT_HOOK — tier is passed in from user session
 */

const OpenAI = require('openai');
const { getModel } = require('../config/models');
const { hasFeature } = require('../config/tiers');

class SummaryService {

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

    // Using OpenAI directly for reliable connection
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('✅ SummaryService initialized with OpenAI');
  }

  /**
   * Generate full meeting analysis from transcript
   * Returns title, summary, and action items based on tier
   *
   * @param {string} transcript - full meeting transcript
   * @param {string} tier - user tier: 'free' | 'pro' | 'max'
   * @returns {Promise<object>} { title, summary, action_items }
   */
  async analyze(transcript, tier = 'free') {
    if (!this.client) this.init();

    const canGetActionItems = hasFeature(tier, 'actionItems');
    const prompt = this._buildPrompt(transcript, canGetActionItems);

    console.log(`🤖 Analyzing with gpt-4o-mini (${tier} tier)`);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert meeting assistant. Always respond with valid JSON only — no markdown, no explanation.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    return this._parseResponse(
      response.choices[0].message.content,
      canGetActionItems
    );
  }

  /**
   * Build analysis prompt based on tier features
   * Private method
   * @param {string} transcript
   * @param {boolean} includeActionItems
   * @returns {string} prompt
   */
  _buildPrompt(transcript, includeActionItems) {
    // 🟢 FREE — basic summary only
    if (!includeActionItems) {
      return `Analyze this meeting transcript and respond with JSON:
{
  "title": "short meeting title (max 6 words)",
  "summary": "2-3 sentence summary of what was discussed"
}

Transcript:
${transcript.slice(0, 3000)}`;   // Limit to 3000 chars for free tier
    }

    // 🔵 PRO / 🟣 MAX — full analysis with action items
    return `Analyze this meeting transcript and respond with JSON:
{
  "title": "short meeting title (max 6 words)",
  "summary": "3-4 sentence summary of what was discussed and decided",
  "action_items": ["action item 1", "action item 2", "action item 3"]
}

Transcript:
${transcript}`;
  }

  /**
   * Parse and validate LLM response
   * Private method
   * @param {string} content - raw LLM response
   * @param {boolean} hasActionItems
   * @returns {object} parsed result
   */
  _parseResponse(content, hasActionItems) {
    try {
      // Clean up response — remove markdown code blocks if present
      const cleaned = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      return {
        title: parsed.title || 'Meeting Recording',
        summary: parsed.summary || 'No summary available.',
        action_items: hasActionItems
          ? (parsed.action_items || [])
          : [],   // 🟢 FREE — no action items
      };

    } catch (err) {
      console.error('❌ Failed to parse LLM response:', content);
      // Return safe fallback
      return {
        title: 'Meeting Recording',
        summary: content.slice(0, 300),
        action_items: [],
      };
    }
  }
}

// Export single instance
const summaryService = new SummaryService();
module.exports = summaryService;