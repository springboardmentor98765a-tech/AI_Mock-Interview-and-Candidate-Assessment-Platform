'use strict'

function extractFirstJson(text) {
  if (!text || typeof text !== 'string') return null

  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  let startIdx = -1
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (ch === '[' || ch === '{') {
      startIdx = i
      break
    }
  }

  if (startIdx === -1) return null

  const stack = []
  let inString = false
  let isEscaped = false
  let endIdx = -1

  for (let i = startIdx; i < cleaned.length; i++) {
    const char = cleaned[i]

    if (inString) {
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{' || char === '[') {
      stack.push(char)
    } else if (char === '}' || char === ']') {
      if (stack.length === 0) break
      const top = stack[stack.length - 1]
      if ((char === '}' && top === '{') || (char === ']' && top === '[')) {
        stack.pop()
        if (stack.length === 0) {
          endIdx = i
          break
        }
      } else {
        break
      }
    }
  }

  if (endIdx === -1) return null

  let candidate = cleaned.slice(startIdx, endIdx + 1)
  candidate = candidate.replace(/,\s*([}\]])/g, '$1')

  return candidate
}

const tests = [
  'Some explanation...\n[{"a": 1}]\nExtra text [note]',
  '```json\n[{"role": "Dev"}]\n```',
  '[{"question": "What is OOP?"}]\nHope this helps!',
  '[{"id": 1}]\n[{"id": 2}]',
  '  \n\n  [{"nested": {"key": [1,2,3]}}]  \n  ',
  '[{"stringWithBrackets": "Look [here] and {there}"}] \n trailing notes [123]'
]

let passed = true
tests.forEach((t, i) => {
  const json = extractFirstJson(t)
  try {
    const parsed = JSON.parse(json)
    console.log(`Test ${i + 1} PASS:`, JSON.stringify(parsed))
  } catch(e) {
    passed = false
    console.error(`Test ${i + 1} FAIL:`, e.message, 'Extracted:', json)
  }
})

if (!passed) process.exit(1)
