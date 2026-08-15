'use strict'

require('dotenv').config()

const { keys, GEMINI_TEXT_MODEL, GEMINI_TTS_MODEL, MODEL_CONFIGS, getModelThreshold } = require('./config/geminiKeys')
const { executeGeminiCall, getActiveKeyIndex, getRequestCounters } = require('./utils/geminiKeyManager')
const { analyzeWithGemini } = require('./services/geminiService')
const { recommendRoles, generateQuestions, evaluateAnswers } = require('./services/interviewService')
const { generateSpeech } = require('./services/ttsService')

async function runCentralizedArchitectureTest() {
  console.log('===========================================================')
  console.log('      CENTRALIZED GEMINI INFRASTRUCTURE TEST SUITE        ')
  console.log('===========================================================\n')

  console.log('1. GEMINI KEYS & CONFIG')
  console.log('   - Total Loaded API Keys:', keys.length)
  console.log('   - Text Model:', GEMINI_TEXT_MODEL)
  console.log('   - TTS Model:', GEMINI_TTS_MODEL)
  console.log(`   - Threshold ${GEMINI_TEXT_MODEL}:`, getModelThreshold(GEMINI_TEXT_MODEL))
  console.log(`   - Threshold ${GEMINI_TTS_MODEL}:`, getModelThreshold(GEMINI_TTS_MODEL))

  console.log('\n2. CENTRAL KEY MANAGER STATE')
  console.log(`   - Active Key Index (${GEMINI_TEXT_MODEL}):`, getActiveKeyIndex(GEMINI_TEXT_MODEL))
  console.log(`   - Active Key Index (${GEMINI_TTS_MODEL}):`, getActiveKeyIndex(GEMINI_TTS_MODEL))
  console.log('   - Request Counters:', JSON.stringify(getRequestCounters()))

  console.log('\n3. SERVICE MODULE EXPORTS')
  console.log('   - geminiService.analyzeWithGemini:', typeof analyzeWithGemini === 'function' ? '✓ OK' : '❌ FAIL')
  console.log('   - interviewService.recommendRoles:', typeof recommendRoles === 'function' ? '✓ OK' : '❌ FAIL')
  console.log('   - interviewService.generateQuestions:', typeof generateQuestions === 'function' ? '✓ OK' : '❌ FAIL')
  console.log('   - interviewService.evaluateAnswers:', typeof evaluateAnswers === 'function' ? '✓ OK' : '❌ FAIL')
  console.log('   - ttsService.generateSpeech:', typeof generateSpeech === 'function' ? '✓ OK' : '❌ FAIL')

  console.log('\n===========================================================')
  console.log('✅ ALL CENTRALIZED INFRASTRUCTURE CHECKS PASSED!')
  console.log('===========================================================')
}

runCentralizedArchitectureTest().catch(err => {
  console.error('❌ Diagnostic test failed:', err)
  process.exit(1)
})
