// backend/services/ttsService.js

'use strict'

const { GEMINI_TTS_MODELS } = require('../config/geminiKeys')
const { executeGeminiCall } = require('../utils/geminiKeyManager')
const kokoroService         = require('./kokoroService')

function pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
  const dataSize   = pcmBuffer.length
  const byteRate   = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const header     = Buffer.alloc(44)

  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcmBuffer])
}

async function _generateGeminiSpeech(text, voice) {
  let lastError

  for (const model of GEMINI_TTS_MODELS) {
    try {
      console.log(`[TTS] Trying Gemini model: ${model}`)

      const response = await executeGeminiCall(model, async (client) => {
        return client.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [{ text }]
            }
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice
                }
              }
            }
          }
        })
      })

      const part = response.candidates?.[0]?.content?.parts?.[0]

      if (!part?.inlineData?.data) {
        throw new Error('No audio data returned from Gemini TTS')
      }

      const mimeType   = part.inlineData.mimeType || 'audio/l16;codec=pcm;rate=24000'
      const rateMatch  = mimeType.match(/rate=(\d+)/)
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000
      const pcmBuffer  = Buffer.from(part.inlineData.data, 'base64')

      console.log(`[TTS] Gemini success using ${model}`)
      return pcmToWav(pcmBuffer, sampleRate, 1, 16)

    } catch (err) {
      lastError = err
      console.warn(`[TTS] ${model} failed (${err.message}). Trying next TTS model...`)
      continue
    }
  }

  throw lastError || new Error('Voice temporarily unavailable')
}

async function generateSpeech(text, voice = 'Kore') {
  const provider = (process.env.TTS_PROVIDER || 'gemini').toLowerCase()

  if (provider === 'kokoro') {
    try {
      console.log('[TTS] Provider=kokoro')
      return await kokoroService.generateSpeech(text)
    } catch (kokoroErr) {
      console.warn(`[TTS] Kokoro failed (${kokoroErr.message}), falling back to Gemini TTS`)
      return _generateGeminiSpeech(text, voice)
    }
  }

  // default: gemini
  console.log('[TTS] Provider=gemini')
  return _generateGeminiSpeech(text, voice)
}

module.exports = {
  generateSpeech
}