'use strict'

require('dotenv').config()
const { GoogleGenAI } = require('@google/genai')

async function runDiagnostic() {
  console.log('====================================================')
  console.log('       GEMINI API CONNECTION DIAGNOSTIC SCRIPT      ')
  console.log('====================================================\n')

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.error('❌ ERROR: GEMINI_API_KEY is missing from environment or backend/.env')
    console.log('\nDiagnostic Category: Authentication / Environment Error')
    process.exit(1)
  }

  console.log('🔑 API Key Loaded: Present (Length:', apiKey.length, ')')
  console.log('🤖 Target Model: gemini-flash-latest')
  console.log('💬 Prompt: "Reply with exactly the word Hello."\n')

  const startTime = Date.now()
  const startDate = new Date(startTime).toISOString()

  console.log(`⏱️ Request Start Time: ${startDate} (${startTime} ms)`)
  console.log('🚀 Sending request to Gemini API...\n')

  try {
    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: 'Reply with exactly the word Hello.',
    })

    const endTime = Date.now()
    const endDate = new Date(endTime).toISOString()
    const durationMs = endTime - startTime

    const text = response.text ? response.text.trim() : ''

    console.log('====================================================')
    console.log('✅ REQUEST RESULT: SUCCESS')
    console.log('====================================================')
    console.log(`⏱️ Request End Time:   ${endDate} (${endTime} ms)`)
    console.log(`⚡ Total Duration:    ${durationMs} ms (${(durationMs / 1000).toFixed(2)} seconds)`)
    console.log(`📝 Response Text:     "${text}"`)
    console.log('====================================================\n')

  } catch (err) {
    const endTime = Date.now()
    const endDate = new Date(endTime).toISOString()
    const durationMs = endTime - startTime

    console.error('====================================================')
    console.error('❌ REQUEST RESULT: FAILED')
    console.error('====================================================')
    console.error(`⏱️ Request End Time:   ${endDate} (${endTime} ms)`)
    console.error(`⚡ Total Duration:    ${durationMs} ms (${(durationMs / 1000).toFixed(2)} seconds)`)
    console.error(`💥 Error Message:     ${err.message}`)
    console.error('====================================================\n')

    console.error('📜 Full Error Stack Trace:')
    console.error(err.stack || err)
    console.error('====================================================\n')

    // Categorize error type
    let category = 'Unknown / Unclassified Error'
    const msg = String(err.message || '') + String(err.cause || '') + String(err.code || '')

    if (msg.includes('UND_ERR_CONNECT_TIMEOUT') || msg.includes('ETIMEDOUT') || msg.includes('timeout') || msg.includes('fetch failed')) {
      category = 'Network Timeout Error (UND_ERR_CONNECT_TIMEOUT / fetch timeout)'
    } else if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('EHOSTUNREACH')) {
      category = 'DNS / Host Connectivity Error (ENOTFOUND / ECONNREFUSED)'
    } else if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded')) {
      category = 'Rate Limit / Quota Exceeded Error (429 RESOURCE_EXHAUSTED)'
    } else if (msg.includes('401') || msg.includes('403') || msg.includes('API_KEY_INVALID') || msg.includes('unauthorized')) {
      category = 'Authentication / API Key Error (401 / 403 Invalid Key)'
    } else if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
      category = 'Server Error (50x Internal Gemini Server Error)'
    } else if (err instanceof SyntaxError) {
      category = 'Parsing / Response Formatting Error'
    }

    console.error(`🏷️ Error Category: ${category}`)
    console.error('====================================================\n')
  }
}

runDiagnostic()
