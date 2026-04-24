/**
 * @module TiersConfig
 * @description Feature flags and limits per subscription tier.
 *              All tier logic lives here — single source of truth.
 *              To add a feature: add to TIERS object only.
 */

const TIERS = {
  free: {
    maxMinutesPerMonth: 30,
    maxRecordings: 10,
    summaryType: 'basic',
    actionItems: false,
    speakerDetection: false,
    exportPDF: false,
    exportTXT: false,
    apiAccess: false,
    model: 'free',
  },
  pro: {
    maxMinutesPerMonth: 300,   // 5 hours
    maxRecordings: Infinity,
    summaryType: 'detailed',
    actionItems: true,
    speakerDetection: true,
    exportPDF: true,
    exportTXT: true,
    apiAccess: false,
    model: 'pro',
  },
  max: {
    maxMinutesPerMonth: Infinity,
    maxRecordings: Infinity,
    summaryType: 'detailed',
    actionItems: true,
    speakerDetection: true,
    exportPDF: true,
    exportTXT: true,
    apiAccess: true,
    model: 'max',
  },
};

/**
 * Check if a tier has access to a specific feature
 * @param {string} tier - 'free' | 'pro' | 'max'
 * @param {string} feature - key from TIERS object
 * @returns {boolean|number|string} feature value
 */
function hasFeature(tier, feature) {
  const tierConfig = TIERS[tier] || TIERS.free;
  return tierConfig[feature];
}

/**
 * Get full config for a tier
 * @param {string} tier - 'free' | 'pro' | 'max'
 * @returns {object} full tier config
 */
function getTierConfig(tier) {
  return TIERS[tier] || TIERS.free;
}

module.exports = { TIERS, hasFeature, getTierConfig };