// backend\services\interviewService.js

'use strict'

const llmProvider = require('./llmProvider')

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

function safeJsonParse(text) {
  const rawText = text || ''
  let cleaned = rawText.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  const extractedCandidate = extractFirstJson(rawText)
  const targetToParse = extractedCandidate || cleaned

  try {
    return JSON.parse(targetToParse)
  } catch (err) {
    console.error('\n==================== GEMINI JSON PARSE ERROR ====================')
    console.error('1. RAW GEMINI RESPONSE:\n', rawText)
    console.error('-----------------------------------------------------------------')
    console.error('2. CLEANED RESPONSE:\n', cleaned)
    console.error('-----------------------------------------------------------------')
    console.error('3. EXTRACTED JSON CANDIDATE:\n', extractedCandidate)
    console.error('-----------------------------------------------------------------')
    console.error('4. JSON LENGTH:', (targetToParse || '').length)
    console.error('-----------------------------------------------------------------')
    console.error('5. FIRST 300 CHARACTERS:\n', (targetToParse || '').slice(0, 300))
    console.error('-----------------------------------------------------------------')
    console.error('6. LAST 300 CHARACTERS:\n', (targetToParse || '').slice(-300))
    console.error('-----------------------------------------------------------------')
    console.error('7. EXACT PARSE ERROR:', err.message)
    console.error('=================================================================\n')
    throw err
  }
}

async function geminiGenerate(prompt, maxTokens = 4096) {
  return llmProvider.generate(prompt, { maxTokens, temperature: 0.2 })
}

async function recommendRoles(analysisData) {
  const { contact, skills, technologies, experience, education, summary } = analysisData

  const prompt = `You are an expert technical recruiter and career advisor.

Analyze this candidate's resume data and recommend the top 5 most suitable software engineering roles for them.

Resume Data:
- Name: ${contact?.name || 'Not provided'}
- Skills: ${(skills || []).join(', ') || 'None'}
- Technologies: ${(technologies || []).join(', ') || 'None'}
- Years of Experience: ${experience?.totalYears || 0}
- Work Experience: ${JSON.stringify((experience?.entries || []).map(e => `${e.title} at ${e.company}`).filter(Boolean))}
- Projects: ${JSON.stringify((experience?.projects || []).map(p => `${p.title}: ${p.description}`).slice(0, 5))}
- Education: ${JSON.stringify((education || []).map(e => `${e.degree} from ${e.institution}`).filter(Boolean))}
- Professional Summary: ${summary || 'Not provided'}

CRITICAL INSTRUCTION: Return ONLY raw valid JSON. Do NOT include markdown code blocks, do NOT include explanations, greetings, or trailing notes. Your response MUST begin with '[' and end with ']'.

Return exactly this structure (array of 5 objects):
[
  {
    "role": "exact role title",
    "confidence": 92,
    "reason": "2-3 sentence explanation based only on actual resume data"
  }
]

Rules:
- Rank from highest to lowest confidence.
- confidence must be a number between 50 and 99.
- Base recommendations ONLY on the actual skills and technologies listed.
- Do NOT invent skills or experience the candidate doesn't have.
- Choose from roles like: Machine Learning Engineer, AI Engineer, Backend Developer, Frontend Developer, Full Stack Developer, Python Developer, Java Developer, React Developer, Node.js Developer, Data Scientist, Data Analyst, Cloud Engineer, DevOps Engineer, Cybersecurity Engineer, Android Developer, iOS Developer, Software Engineer, Mobile Developer, Database Administrator, QA Engineer, Embedded Systems Engineer, Blockchain Developer.
- Return exactly 5 roles.`

  const text = await geminiGenerate(prompt, 2048)
  const parsed = safeJsonParse(text)
  if (!Array.isArray(parsed)) throw new Error('Expected array of roles')
  return parsed.slice(0, 5).map(r => ({
    role:       String(r.role || ''),
    confidence: Math.min(99, Math.max(50, Number(r.confidence) || 75)),
    reason:     String(r.reason || ''),
  }))
}

async function generateQuestions({ role, interviewType, difficulty, questionCount, resumeContext }) {
  const { skills, technologies, experience, education } = resumeContext || {}

  const prompt = `You are a Principal Technical Interviewer at a top-tier technology company.

Target Role: ${role}
Interview Type: ${interviewType}
Target Difficulty: ${difficulty}

Candidate Technologies:
${(technologies || []).join(', ') || 'Not specified'}

Candidate Skills:
${(skills || []).join(', ') || 'Not specified'}

Years of Experience:
${experience?.totalYears || 0}

Education:
${(education || []).map(e => e.degree).join(', ') || 'Not specified'}

CRITICAL INTERVIEW QUESTION GUIDELINES:
- SPOKEN VERBAL INTERVIEW FORMAT: Every question must be directly answerable verbally by the candidate into a microphone within 1 to 2 minutes.
- NEVER ask the candidate to implement, write, or construct an entire model, application, or project from scratch (e.g. NEVER ask "Implement linear regression from scratch in PyTorch and compare initialization steps").
- FOCUS ON INSIGHT & TRADE-OFFS: Ask about conceptual understanding, design decisions, architectural trade-offs, debugging scenarios, performance optimizations, and failure modes.
  * Good example for ML: "Can you explain the difference between batch gradient descent and stochastic gradient descent, and when you would choose one over the other?"
  * Good example for Backend: "How does connection pooling improve database throughput, and what are the risks of setting the pool size too high?"
  * Good example for React: "Can you explain how React's virtual DOM reconciliation works and why key props are important when rendering lists?"
- PROFESSIONAL RECRUITER PHRASING: Ask questions naturally as an expert interviewer speaks (e.g. "Can you explain...", "How would you design...", "What are the trade-offs between...", "Describe how you would debug...", "In what scenario would you choose X over Y?").
- ZERO META-COMMENTARY: Do NOT include preambles or conversational filler like "Great! Let's tackle...", "Awesome!", "Your task is to...", "Here is an assignment...". Output only the direct question.
- SINGLE-TOPIC QUESTIONS: Keep each question focused on one clear topic without convoluted multi-part requirements.
- DIFFICULTY CALIBRATION:
  * easy: Core definitions, basic syntax, fundamental concepts, and standard workflow understanding.
  * medium: Practical application, performance trade-offs, debugging, architectural patterns, and comparing alternatives.
  * hard: Deep system internals, distributed scaling, concurrency, edge-case failure modes, and low-level optimizations.

Interview Type Focus:
${interviewType === 'Technical'
? '- Focus on core technical concepts, architecture, trade-offs, and practical engineering problem-solving. No coding assignments from scratch.'
: ''}
${interviewType === 'HR'
? '- Focus on career goals, team collaboration, work ethic, and culture fit.'
: ''}
${interviewType === 'Behavioral'
? '- Focus on past experiences, conflict resolution, ownership, and STAR method situational questions.'
: ''}
${interviewType === 'Aptitude'
? '- Focus on logical reasoning, analytical problem-solving, and estimations.'
: ''}
${interviewType === 'Mixed'
? '- A balanced mix: 60% technical & architecture, 25% behavioral & project experience, 15% HR & collaboration.'
: ''}

Return ONLY raw valid JSON.
Do NOT use markdown.
Do NOT include explanations or code fences.
The response MUST begin with '[' and end with ']'.

Return exactly this structure:
[
  {
    "question": "Realistic spoken interview question",
    "questionType": "technical|behavioral|coding|system_design|aptitude|hr|project|resume",
    "expectedLanguage": null,
    "category": "Technical|Behavioral|HR|Problem Solving|Aptitude|System Design",
    "difficulty": "easy|medium|hard",
    "expected_points": [
      "Key concept 1",
      "Key concept 2",
      "Key concept 3"
    ]
  }
]

Validation Rules:
- Generate exactly ${questionCount} questions.
- Every question must be role-specific to "${role}".
- expected_points must contain exactly 3 concise bullet points (2–5 words each).
- Do not repeat questions or technologies unnecessarily.
`;

  const text = await geminiGenerate(prompt, 4096)
  const parsed = safeJsonParse(text)
  if (!Array.isArray(parsed)) throw new Error('Expected array of questions')

  const validTypes = ['technical', 'behavioral', 'coding', 'system_design', 'aptitude', 'hr', 'project', 'resume']

  return parsed.slice(0, questionCount).map((q, i) => {
    let rawType = (q.questionType || q.category || 'technical').toString().toLowerCase().trim().replace(/\s+/g, '_')
    if (!validTypes.includes(rawType)) {
      if (rawType.includes('code') || rawType.includes('program')) rawType = 'coding'
      else if (rawType.includes('behavior')) rawType = 'behavioral'
      else if (rawType.includes('system') || rawType.includes('design')) rawType = 'system_design'
      else if (rawType.includes('aptitude') || rawType.includes('problem')) rawType = 'aptitude'
      else if (rawType.includes('hr') || rawType.includes('culture')) rawType = 'hr'
      else if (rawType.includes('proj')) rawType = 'project'
      else if (rawType.includes('resum')) rawType = 'resume'
      else rawType = 'technical'
    }

    const expectedLanguage = rawType === 'coding' && q.expectedLanguage && q.expectedLanguage !== 'null'
      ? String(q.expectedLanguage).toLowerCase().trim()
      : null

    const diffStr = (q.difficulty || difficulty).toString().toLowerCase()

    return {
      question:        String(q.question || ''),
      category:        String(q.category || 'Technical'),
      questionType:    rawType,
      expectedLanguage,
      difficulty:      diffStr,
      expected_points: Array.isArray(q.expected_points) ? q.expected_points : [],
      sequence:        i + 1,
    }
  })
}

async function evaluateAnswers(questionsWithAnswers, role, interviewType) {
  const qaList = questionsWithAnswers
    .map((qa, i) => `Q${i + 1} [${qa.category}]: ${qa.question}\nExpected: ${qa.expected_points}\nCandidate Answer: ${qa.answer || '(No answer provided)'}`)
    .join('\n\n')

  const prompt = `You are an expert technical interviewer evaluating a candidate for the role of "${role}".

Interview Type: ${interviewType}

Here are all the questions and the candidate's answers:

${qaList}

CRITICAL INSTRUCTION: Return ONLY raw valid JSON. Do NOT include markdown code blocks, do NOT include explanations, notes, or extra text. Your response MUST begin with '{' and end with '}'.

Return exactly this structure:
{
  "overall_score": 75,
  "category_scores": {
    "technical": 78,
    "communication": 72,
    "problem_solving": 80,
    "confidence": 70,
    "grammar": 75
  },
  "question_feedback": [
    {
      "question_index": 0,
      "score": 80,
      "feedback": "Specific feedback for this answer",
      "strengths": "What the candidate did well",
      "improvements": "What could be improved"
    }
  ],
  "strengths": ["Overall strength 1", "Overall strength 2", "Overall strength 3"],
  "weaknesses": ["Area to improve 1", "Area to improve 2"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"],
  "overall_feedback": "2-3 sentence summary of overall performance",
  "hire_recommendation": "Recommended|Consider|Not Recommended"
}

Scoring rules:
- All scores are integers between 0 and 100.
- overall_score must reflect the candidate's actual performance.
- Score 0 for any question that has no answer.
- Be fair but honest. Do not inflate scores.
- question_feedback must have exactly ${questionsWithAnswers.length} entries (one per question, 0-indexed).`

  const text = await geminiGenerate(prompt, 6000)
  const parsed = safeJsonParse(text)

  return {
    overall_score:     Math.min(100, Math.max(0, Number(parsed.overall_score) || 0)),
    category_scores:   {
      technical:       Number(parsed.category_scores?.technical)       || 0,
      communication:   Number(parsed.category_scores?.communication)   || 0,
      problem_solving: Number(parsed.category_scores?.problem_solving) || 0,
      confidence:      Number(parsed.category_scores?.confidence)      || 0,
      grammar:         Number(parsed.category_scores?.grammar)         || 0,
    },
    question_feedback:   Array.isArray(parsed.question_feedback) ? parsed.question_feedback : [],
    strengths:           Array.isArray(parsed.strengths)         ? parsed.strengths         : [],
    weaknesses:          Array.isArray(parsed.weaknesses)        ? parsed.weaknesses        : [],
    recommendations:     Array.isArray(parsed.recommendations)   ? parsed.recommendations   : [],
    overall_feedback:    String(parsed.overall_feedback || ''),
    hire_recommendation: String(parsed.hire_recommendation || 'Consider'),
  }
}

module.exports = { recommendRoles, generateQuestions, evaluateAnswers }
