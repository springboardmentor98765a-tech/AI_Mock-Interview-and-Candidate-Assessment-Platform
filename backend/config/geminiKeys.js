// backend\config\geminiKeys.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const rawKeys = [
  process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7,
];

const keys = rawKeys.filter(k => k && typeof k === 'string' && k.trim() !== '');

if (keys.length === 0) {
  // Non-fatal: warn rather than crash so Express boots cleanly when AI_PROVIDER=ollama.
  // The Gemini call path in llmProvider.js will surface a per-request error if invoked.
  console.warn(
    '[geminiKeys] WARNING: Zero valid Gemini API keys found. ' +
    'Set GEMINI_API_KEY or GEMINI_API_KEY_1...7 in backend/.env. ' +
    'Gemini-based AI features will fail at request time if AI_PROVIDER=gemini.'
  );
}

const GEMINI_TEXT_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash'
];

const GEMINI_TTS_MODELS = [
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts'
];

const MODEL_CONFIGS = {
  ...Object.fromEntries(
  GEMINI_TEXT_MODELS.map(model => [
    model,
    {
      limit: 20,
      rotationPercentage: 95
    }
  ])
),

  ...Object.fromEntries(
    GEMINI_TTS_MODELS.map(model => [
      model,
      {
        limit: 10,
        rotationPercentage: 95
      }
    ])
  )
};

function getModelThreshold(modelName) {
  const config = MODEL_CONFIGS[modelName] || {};
  const limit = config.limit ?? 20;
  const rotationPercentage = config.rotationPercentage ?? 95;
  return Math.floor((limit * rotationPercentage) / 100);
}

module.exports = {
  keys,
  GEMINI_TEXT_MODELS,
  GEMINI_TTS_MODELS,
  MODEL_CONFIGS,
  getModelThreshold
};
