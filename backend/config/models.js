/**
 * models.js — Central LLM Model Configuration
 *
 * ALL model choices live here — never hardcode models elsewhere.
 * To swap a model: change it here only. Nothing else needs updating.
 *
 * OpenRouter Model Docs: https://openrouter.ai/models
 *
 * Cost Guide (per 1M tokens):
 * 🟢 FREE  — $0.00  (rate limited but great for personal use)
 * 🔵 PRO   — ~$0.15 (fast, high quality, cheap)
 * 🟣 MAX   — ~$3.00 (best quality, used for power users)
 */

const MODELS = {

  transcription: {
    // Used for ALL tiers — Whisper is cheap enough for everyone
    // Cost: ~$0.006 per minute of audio
    model: 'openai/whisper',
    description: 'OpenAI Whisper — best-in-class speech to text',
  },

  summarization: {

    // 🟢 FREE tier — Llama 3.3 70B is FREE on OpenRouter
    // Quality: Excellent for summaries. Rate limited but fine for personal use.
    free: {
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      description: 'Llama 3.3 70B — free, fast, great quality',
      maxTokens: 500,
    },

    // 🔵 PRO tier — GPT-4o mini is cheap but very high quality
    // Cost: $0.15/1M input tokens — 1 summary costs ~$0.001
    pro: {
      model: 'openai/gpt-4o-mini',
      description: 'GPT-4o Mini — fast, cheap, excellent quality',
      maxTokens: 800,
    },

    // 🟣 MAX tier — Claude Sonnet is best for long meetings
    // Cost: $3.00/1M input tokens — 1 summary costs ~$0.05
    max: {
      model: 'anthropic/claude-sonnet-4-5',
      description: 'Claude Sonnet 4.5 — best quality for complex meetings',
      maxTokens: 1500,
    },
  },

  actionItems: {
    // 🟢 FREE — not available (upgrade prompt shown)
    free: null,

    // 🔵 PRO — GPT-4o mini extracts action items accurately
    pro: {
      model: 'openai/gpt-4o-mini',
      maxTokens: 400,
    },

    // 🟣 MAX — Claude Sonnet for best action item extraction
    max: {
      model: 'anthropic/claude-sonnet-4-5',
      maxTokens: 600,
    },
  },
};

/**
 * Get the correct model config for a given feature and user tier
 * @param {string} feature - 'summarization' | 'actionItems' | 'transcription'
 * @param {string} tier - 'free' | 'pro' | 'max'
 * @returns {object|null} model config or null if not available for tier
 */
function getModel(feature, tier = 'free') {
  const featureConfig = MODELS[feature];
  if (!featureConfig) throw new Error(`Unknown feature: ${feature}`);

  // Transcription is same for all tiers
  if (feature === 'transcription') return featureConfig;

  return featureConfig[tier] || null;
}

module.exports = { MODELS, getModel };