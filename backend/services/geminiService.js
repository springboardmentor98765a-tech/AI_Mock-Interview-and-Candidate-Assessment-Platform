// backend\services\geminiService.js

'use strict'

const llmProvider = require('./llmProvider')

/* ─────────────────────────────────────────────────────────────────────────
   ATS-grade prompt — upgraded
───────────────────────────────────────────────────────────────────────── */
const PROMPT_TEMPLATE = `You are an expert ATS (Applicant Tracking System) analyzer and AI Recruitment Assistant.

Analyze the following resume text and return ONLY one valid JSON object.
Do not return markdown, code fences, explanations, comments, or any text outside the JSON object.

Return exactly this schema:

{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "linkedin": "full URL string or null",
  "github": "full URL string or null",

  "skills": ["array of general skill strings"],

  "technologies": ["array of programming languages, frameworks, libraries, databases, cloud platforms, DevOps tools"],

  "experience": [
    {
      "company": "string",
      "designation": "string",
      "duration": "string",
      "years": 0
    }
  ],

  "projects": [
    {
      "title": "string",
      "description": "string",
      "technologies": ["array of strings"]
    }
  ],

  "education": [
    {
      "degree": "string",
      "institution": "string",
      "cgpa": "string or null",
      "graduationYear": "string or null"
    }
  ],

  "certifications": ["array of certification name strings"],

  "yearsOfProfessionalExperience": 0,

  "professionalSummary": "string — never empty",

  "atsScore": {
    "overall": 0,
    "breakdown": {
      "contactInformation": 0,
      "skills": 0,
      "education": 0,
      "projects": 0,
      "professionalExperience": 0,
      "resumeStructure": 0,
      "atsCompatibility": 0
    },
    "strengths": ["3 to 5 concise bullet point strings"],
    "improvements": ["3 to 5 actionable suggestion strings"]
  }
}

═══════════════════════════════════════════════════════
PROFESSIONAL SUMMARY RULES
═══════════════════════════════════════════════════════

Write a recruiter-style professional summary of 3–5 sentences.
- Base it ONLY on information explicitly present in the resume.
- Never invent companies, job titles, experience, certifications, skills, CGPA, or achievements.
- If the candidate has no professional experience, describe them as a student or fresher based only on education and projects listed.
- Mention the strongest technologies, important projects, education, and major skills when available.
- The professionalSummary field must NEVER be empty or null.

═══════════════════════════════════════════════════════
ATS SCORING RUBRIC — FOLLOW EXACTLY
═══════════════════════════════════════════════════════

Score the resume out of 100 using these weights:

  contactInformation    — max 10 points
    Full name + email + phone = 6 pts
    LinkedIn or GitHub present = +2 pts
    Location present = +2 pts

  skills                — max 20 points
    1–5 skills = 8 pts | 6–10 = 14 pts | 11–15 = 18 pts | 16+ = 20 pts

  education             — max 15 points
    Degree + institution present = 10 pts
    CGPA or percentage present = +3 pts
    Graduation year present = +2 pts

  projects              — max 20 points
    1 project = 10 pts | 2 = 14 pts | 3 = 17 pts | 4+ = 20 pts
    Deduct up to 5 pts if descriptions are vague or technologies are missing

  professionalExperience — max 20 points
    0 experience = 0 pts
    Internship only = 10 pts
    1 full-time job = 15 pts
    2+ jobs or 2+ years = 20 pts

  resumeStructure       — max 10 points
    All major sections present (contact, skills, education, experience/projects) = 8 pts
    Clear and readable structure = +2 pts

  atsCompatibility      — max 5 points
    No tables, columns, or graphics detected = 3 pts
    Good keyword density relevant to role = +2 pts

SCORING RULES:
- overall MUST equal the exact arithmetic sum of all 7 category scores.
- Never exceed any category maximum.
- If there is no professional experience at all, professionalExperience must be 0.
- strengths: 3–5 concise bullet points describing genuine resume strengths.
- improvements: 3–5 specific, actionable suggestions to improve the resume.
- Suggestions must be practical and directly relevant to what is missing or weak.

═══════════════════════════════════════════════════════
EXTRACTION RULES
═══════════════════════════════════════════════════════

1. Only use information explicitly present in the resume. Never invent or infer.

2. Distinguish strictly between Work Experience, Projects, and Skills/Tools:
   - "experience" = only real paid employment or internships at a company.
   - "projects" = personal, academic, freelance, hackathon, or side projects. NOT job roles.
   - Developer Tools / Technologies sections (e.g. "Git • GitHub • Linux • VS Code") are NOT work experience.

3. "yearsOfProfessionalExperience" = total calculated from real work/internship durations only. Return 0 if none.

4. Every key in the JSON schema is mandatory:
   - Use null for missing string values.
   - Use [] for missing arrays.
   - Use 0 for missing numeric values.
   - professionalSummary must never be null or empty.

5. Return ONLY the JSON object. No markdown. No code fences. No extra text.

Resume text:
`


function validateParsed(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
  const hasContact = obj.name || obj.email || obj.phone
  const hasContent =
    Array.isArray(obj.skills) ||
    Array.isArray(obj.technologies) ||
    Array.isArray(obj.education)
  return !!(hasContact || hasContent)
}

function safeArray(val) {
  return Array.isArray(val) ? val : []
}

function safeNum(val, max) {
  const n = typeof val === 'number' ? Math.round(val) : 0
  return max !== undefined ? Math.min(n, max) : n
}

function normalizeAtsScore(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      overall: 0,
      breakdown: {
        contactInformation:     0,
        skills:                 0,
        education:              0,
        projects:               0,
        professionalExperience: 0,
        resumeStructure:        0,
        atsCompatibility:       0,
      },
      strengths:    [],
      improvements: [],
    }
  }

  const bd = raw.breakdown || {}
  const breakdown = {
    contactInformation:     safeNum(bd.contactInformation,     10),
    skills:                 safeNum(bd.skills,                 20),
    education:              safeNum(bd.education,              15),
    projects:               safeNum(bd.projects,               20),
    professionalExperience: safeNum(bd.professionalExperience, 20),
    resumeStructure:        safeNum(bd.resumeStructure,        10),
    atsCompatibility:       safeNum(bd.atsCompatibility,        5),
  }

  // Always recompute overall from breakdown to guarantee accuracy
  const computed = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return {
    overall:      Math.min(computed, 100),
    breakdown,
    strengths:    safeArray(raw.strengths).map(String).slice(0, 5),
    improvements: safeArray(raw.improvements).map(String).slice(0, 5),
  }
}

function normalizeGeminiResponse(raw) {
  return {
    contact: {
      name:     raw.name     || null,
      email:    raw.email    || null,
      phone:    raw.phone    || null,
      location: raw.location || null,
      linkedin: raw.linkedin || null,
      github:   raw.github   || null,
    },
    skills:       safeArray(raw.skills),
    technologies: safeArray(raw.technologies),
    experience: {
      entries: safeArray(raw.experience).map(e => ({
        title:    e.designation || e.title || '',
        company:  e.company     || '',
        duration: e.duration    || '',
        years:    typeof e.years === 'number' ? e.years : null,
        current:  typeof e.duration === 'string' && /present|current|now/i.test(e.duration),
      })),
      totalYears:     typeof raw.yearsOfProfessionalExperience === 'number'
        ? raw.yearsOfProfessionalExperience
        : 0,
      projects:       safeArray(raw.projects),
      certifications: safeArray(raw.certifications),
    },
    education: safeArray(raw.education).map(e => ({
      degree:      e.degree         || null,
      institution: e.institution    || null,
      year:        e.graduationYear || null,
      cgpa:        e.cgpa           || null,
      percentage:  e.percentage     || null,
    })),
    summary:  raw.professionalSummary || '',
    atsScore: normalizeAtsScore(raw.atsScore),
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Public API
───────────────────────────────────────────────────────────────────────── */
async function analyzeWithGemini(resumeText) {
  const prompt = PROMPT_TEMPLATE + resumeText.slice(0, 30000)

  const rawText = await llmProvider.generate(prompt, {
    maxTokens:   8192,
    temperature: 0.1,
  })
  if (!rawText) throw new Error('LLM returned an empty response')

  // Strip markdown code fences if Gemini wraps the JSON
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Try to extract a JSON object from within surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Gemini response contains no valid JSON object')
    parsed = JSON.parse(jsonMatch[0])
  }

  if (!validateParsed(parsed)) {
    throw new Error('Gemini returned JSON that failed validation')
  }

  return normalizeGeminiResponse(parsed)
}

module.exports = { analyzeWithGemini }