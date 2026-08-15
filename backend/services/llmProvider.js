'use strict'

/**
 * llmProvider.js
 *
 * Provider abstraction layer for text generation.
 *
 * Routes every text generation call to either:
 *   - Ollama (local Qwen)  — AI_PROVIDER=ollama
 *   - Gemini (cloud)       — AI_PROVIDER=gemini
 *
 * Configuration (read from process.env / .env):
 *   AI_PROVIDER           — "ollama" | "gemini"  (default: "gemini")
 *   OLLAMA_MODEL          — primary Ollama model  (default: "qwen2.5:7b")
 *   OLLAMA_FALLBACK_MODEL — logged for future failover, not used yet
 *
 * Public API:
 *   generate(prompt, options)  → Promise<string>  (plain generated text)
 *   getActiveProvider()        → string
 *   getActiveModel()           → string
 *
 * Intentionally does NOT:
 *   - Generate TTS audio (ttsService.js owns that)
 *   - Touch any database
 *   - Modify interview logic
 *   - Implement streaming
 */

const { executeGeminiCall } = require('../utils/geminiKeyManager')
const { GEMINI_TEXT_MODELS } = require('../config/geminiKeys')

const OLLAMA_BASE = 'http://localhost:11434'

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function getProvider() {
  return (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim()
}

function getOllamaModel() {
  return (process.env.OLLAMA_MODEL || 'qwen2.5:7b').trim()
}

function getOllamaFallbackModel() {
  return (process.env.OLLAMA_FALLBACK_MODEL || 'qwen2.5:3b').trim()
}

// ---------------------------------------------------------------------------
// Ollama path
// ---------------------------------------------------------------------------

/**
 * Call Ollama's /api/generate endpoint with stream:false.
 *
 * Maps caller options to Ollama's option format:
 *   options.maxTokens   → options.num_predict
 *   options.temperature → options.temperature
 *
 * @param {string} prompt
 * @param {object} [options]
 * @param {number} [options.maxTokens=4096]
 * @param {number} [options.temperature=0.2]
 * @returns {Promise<string>} raw text from data.response
 */
async function callOllama(prompt, options = {}) {
  const model       = getOllamaModel()
  const num_predict = typeof options.maxTokens   === 'number' ? options.maxTokens   : 4096
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.2

  console.log(
    `[LLMProvider] Ollama → model=${model} ` +
    `num_predict=${num_predict} temperature=${temperature}`
  )

  const body = {
    model,
    prompt,
    stream:     false,
    keep_alive: '30m',           // keep model loaded for 30 min — prevents reload mid-interview
    options:    { temperature, num_predict },
  }

  let res
  try {
    res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch (connErr) {
    throw new Error(
      `Ollama connection failed (is Ollama running on ${OLLAMA_BASE}?): ${connErr.message}`
    )
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '(unreadable)')
    throw new Error(`Ollama HTTP ${res.status}: ${errBody}`)
  }

  let data
  try {
    data = await res.json()
  } catch (parseErr) {
    throw new Error(`Ollama response was not valid JSON: ${parseErr.message}`)
  }

  const text = typeof data.response === 'string' ? data.response.trim() : ''
  if (!text) {
    throw new Error('Ollama returned an empty response field')
  }

  console.log(`[LLMProvider] Ollama response received (${text.length} chars)`)
  return text
}

// ---------------------------------------------------------------------------
// Gemini path  (uses existing key-rotation infrastructure unchanged)
// ---------------------------------------------------------------------------

/**
 * Call Gemini through the existing executeGeminiCall key-rotation infrastructure.
 * Mirrors the retry-over-models logic that interviewService.js previously owned.
 *
 * @param {string} prompt
 * @param {object} [options]
 * @param {number} [options.maxTokens=4096]
 * @param {number} [options.temperature=0.2]
 * @returns {Promise<string>} raw text from Gemini
 */
async function callGemini(prompt, options = {}) {
  const maxTokens   = typeof options.maxTokens   === 'number' ? options.maxTokens   : 4096
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.2

  let lastError

  for (const model of GEMINI_TEXT_MODELS) {
    try {
      console.log(`[LLMProvider] Gemini → trying model=${model}`)

      const response = await executeGeminiCall(model, async (client) => {
        return client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        })
      })

      let text = response.text ?? ''
      if (!text && response.candidates?.[0]?.content?.parts) {
        text = response.candidates[0].content.parts
          .map(p => p.text || '')
          .join('')
      }

      if (!text || !text.trim()) throw new Error('Gemini returned empty response')

      console.log(`[LLMProvider] Gemini success using ${model}`)
      return text.trim()

    } catch (err) {
      lastError = err
      console.warn(`[LLMProvider] Gemini model ${model} failed: ${err.message}`)
    }
  }

  throw lastError || new Error('All Gemini models failed')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate text using the configured LLM provider.
 *
 * Returns a plain string — the same type callers previously received from Gemini.
 *
 * @param {string} prompt
 * @param {object} [options]
 * @param {number} [options.maxTokens]    max tokens to generate
 * @param {number} [options.temperature]  sampling temperature
 * @returns {Promise<string>}
 */
async function generate(prompt, options = {}) {
  const provider = getProvider()

  if (provider === 'ollama') {
    console.log(
      `[LLMProvider] Provider=ollama | primary=${getOllamaModel()} | ` +
      `fallback=${getOllamaFallbackModel()} (fallback reserved for future phase)`
    )
    return callOllama(prompt, options)
  }

  if (provider === 'gemini') {
    console.log(`[LLMProvider] Provider=gemini | models=${GEMINI_TEXT_MODELS.join(', ')}`)
    return callGemini(prompt, options)
  }

  throw new Error(
    `Unknown AI_PROVIDER value: "${provider}". ` +
    `Expected "ollama" or "gemini".`
  )
}

/**
 * Return the currently configured provider name.
 * @returns {"ollama"|"gemini"|string}
 */
function getActiveProvider() {
  return getProvider()
}

/**
 * Return the primary model name for the active provider.
 * @returns {string}
 */
function getActiveModel() {
  const provider = getProvider()
  if (provider === 'ollama') return getOllamaModel()
  return GEMINI_TEXT_MODELS[0] || 'gemini-flash-latest'
}

module.exports = {
  generate,
  getActiveProvider,
  getActiveModel,
  callOllama,
  callGemini,
}
