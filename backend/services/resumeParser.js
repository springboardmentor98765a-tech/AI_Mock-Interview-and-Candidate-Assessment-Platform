// backend\services\resumeParser.js

const pdfParse = require('pdf-parse')

const TECH_KEYWORDS = [
  'java', 'python', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go', 'golang',
  'rust', 'swift', 'kotlin', 'scala', 'php', 'matlab', 'perl', 'bash', 'shell',
  'react', 'angular', 'vue', 'nextjs', 'next.js', 'svelte', 'jquery',
  'nodejs', 'node.js', 'express', 'expressjs', 'django', 'flask', 'fastapi',
  'spring', 'springboot', 'spring boot', 'laravel', 'rails', 'asp.net',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'cassandra', 'sqlite',
  'dynamodb', 'oracle', 'firebase', 'supabase',
  'docker', 'kubernetes', 'k8s', 'jenkins', 'github actions', 'gitlab ci', 'circleci',
  'terraform', 'ansible', 'aws', 'gcp', 'azure', 'heroku', 'vercel', 'netlify',
  'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
  'tensorflow', 'pytorch', 'scikit-learn', 'keras', 'pandas', 'numpy', 'matplotlib',
  'opencv', 'huggingface', 'langchain', 'openai', 'bert', 'gpt',
  'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'figma',
  'linux', 'unix', 'nginx', 'apache', 'graphql', 'websocket',
  'kafka', 'rabbitmq', 'elasticsearch', 'postman',
]

const SOFT_SKILLS = [
  'leadership', 'communication', 'teamwork', 'problem solving', 'problem-solving',
  'critical thinking', 'time management', 'adaptability', 'creativity', 'collaboration',
  'project management', 'agile', 'scrum', 'kanban', 'analytical',
]

const EXTRA_SKILLS = [
  'data structures', 'algorithms', 'machine learning', 'deep learning', 'nlp',
  'computer vision', 'cloud computing', 'devops', 'ci/cd', 'microservices',
  'system design', 'oop', 'functional programming', 'unit testing', 'tdd',
  'mobile development', 'android', 'ios', 'react native', 'flutter',
  'cybersecurity', 'networking', 'blockchain',
]

const ALL_SKILLS = [...new Set([...TECH_KEYWORDS, ...SOFT_SKILLS, ...EXTRA_SKILLS])]

function extractContactInfo(text) {
  const emailMatch   = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/)
  const phoneMatch   = text.match(/(?:\+91[\s-]?)?(?:\(?\d{3,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}/)
  const linkedinMatch = text.match(/linkedin\.com\/in\/([A-Za-z0-9_%-]+)/i)
  const githubMatch   = text.match(/github\.com\/([A-Za-z0-9_-]+)/i)

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let name = ''
  for (const line of lines.slice(0, 8)) {
    if (line.length < 4 || line.length > 60) continue
    if (/[@\d|•|]/.test(line)) continue
    if (/^(resume|curriculum|cv|profile|objective|summary|skills|experience|education|contact)/i.test(line)) continue
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(line) || /^[A-Z\s]{4,}$/.test(line)) {
      name = line.replace(/[^A-Za-z ]/g, '').trim()
      break
    }
  }

  const locationPatterns = [
    /(?:location|address|city)[:\s]+([A-Za-z ,.-]+)/i,
    /\b(Mumbai|Delhi|Bangalore|Bengaluru|Hyderabad|Chennai|Pune|Kolkata|Ahmedabad|Jaipur|Noida|Gurgaon|India|USA|UK|Canada|Australia|Singapore)\b/,
  ]
  let location = null
  for (const pat of locationPatterns) {
    const m = text.match(pat)
    if (m) { location = (m[1] || m[0]).trim(); break }
  }

  return {
    name:     name     || null,
    email:    emailMatch    ? emailMatch[0]                              : null,
    phone:    phoneMatch    ? phoneMatch[0].trim()                       : null,
    location: location     || null,
    linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : null,
    github:   githubMatch   ? `https://github.com/${githubMatch[1]}`        : null,
  }
}

function extractSkills(text) {
  const lower = text.toLowerCase()
  const found = new Set()
  for (const skill of ALL_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i').test(lower)) {
      found.add(skill)
    }
  }
  return Array.from(found).sort()
}

function detectTechnologies(text) {
  const lower = text.toLowerCase()
  const found = new Set()
  for (const tech of TECH_KEYWORDS) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i').test(lower)) {
      found.add(tech)
    }
  }
  return Array.from(found).sort()
}

function parseExperience(text) {
  const expSectionMatch = text.match(
    /(?:work\s+experience|professional\s+experience|employment\s+history|experience)([\s\S]*?)(?:education|skills|projects|certifications|awards|$)/i
  )
  const block = expSectionMatch ? expSectionMatch[1] : text

  const jobTitleKeywords = [
    'engineer', 'developer', 'analyst', 'designer', 'manager', 'lead', 'intern',
    'architect', 'consultant', 'scientist', 'researcher', 'associate', 'director', 'head',
  ]
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  const entries = []
  let current = null

  for (const line of lines) {
    const isTitle    = jobTitleKeywords.some(k => line.toLowerCase().includes(k)) && line.length < 90
    const isDuration = /\d{4}/.test(line) && /[-–]/.test(line)
    const isCompany  = /(?:inc|ltd|pvt|llc|corp|technologies|solutions|systems|services|software)/i.test(line) && line.length < 80

    if (isTitle && !isDuration) {
      if (current) entries.push(current)
      current = { title: line, company: '', duration: '', years: null, current: false }
    } else if (isCompany && current && !current.company) {
      current.company = line
    } else if (isDuration && current) {
      current.duration = line.trim()
      const ym = line.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current|now)/i)
      if (ym) {
        const start = parseInt(ym[1])
        const end   = /present|current|now/i.test(ym[2]) ? new Date().getFullYear() : parseInt(ym[2])
        current.years = Math.max(0, end - start)
        if (/present|current|now/i.test(ym[2])) current.current = true
      }
    }
  }
  if (current && current.title) entries.push(current)

  const durationRe = /(\d{4})\s*[-–]\s*(\d{4}|present|current|now)/gi
  let totalYears = 0, m
  while ((m = durationRe.exec(block)) !== null) {
    const start = parseInt(m[1])
    const end   = /present|current|now/i.test(m[2]) ? new Date().getFullYear() : parseInt(m[2])
    totalYears += Math.max(0, end - start)
  }

  return {
    entries:    entries.slice(0, 8),
    totalYears: Math.min(totalYears, 40),
  }
}

function parseEducation(text) {
  const results = []
  const eduSectionMatch = text.match(
    /education([\s\S]*?)(?:experience|skills|projects|certifications|awards|publications|$)/i
  )
  const block = eduSectionMatch ? eduSectionMatch[1] : text

  const degreeRe = /\b(b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc|bca|mca|bba|mba|phd|ph\.d|bachelor|master|diploma|10th|12th|ssc|hsc|secondary|intermediate)\b/gi
  let m
  const degrees = []
  while ((m = degreeRe.exec(block)) !== null) degrees.push({ degree: m[0], pos: m.index })

  for (let i = 0; i < Math.min(degrees.length, 4); i++) {
    const near = block.substring(Math.max(0, degrees[i].pos - 10), degrees[i].pos + 400)
    const yearMatch = near.match(/\b(19|20)\d{2}\b/)
    const cgpaMatch = near.match(/(?:cgpa|gpa)[:\s]*(\d+\.?\d*)/i)
    const percMatch = near.match(/(\d{2,3}(?:\.\d+)?)%/)
    let institution = ''
    for (const nl of near.split('\n').map(l => l.trim()).filter(Boolean)) {
      if (/(?:university|college|institute|school|academy|iit|nit|bit|vit|iiit)/i.test(nl) && nl.length < 120) {
        institution = nl; break
      }
    }
    results.push({
      degree:      degrees[i].degree,
      institution: institution || null,
      year:        yearMatch ? yearMatch[0] : null,
      cgpa:        cgpaMatch ? cgpaMatch[1] : null,
      percentage:  percMatch ? percMatch[1] : null,
    })
  }
  return results
}

function generateSummary(contact, skills, technologies, experience, education) {
  const name     = contact.name || 'The candidate'
  const expYears = experience.totalYears || 0
  const expLevel = expYears >= 5 ? 'senior' : expYears >= 2 ? 'mid-level' : expYears >= 1 ? 'junior' : 'fresher'
  const topTech  = technologies.slice(0, 5).join(', ')
  const topSkills = skills.filter(s => !TECH_KEYWORDS.includes(s)).slice(0, 5).join(', ')
  const degree   = education[0]?.degree || null
  const school   = education[0]?.institution || null

  let summary = `${name} is a ${expLevel} technology professional`
  if (expYears > 0) summary += ` with ${expYears} year${expYears !== 1 ? 's' : ''} of hands-on experience`
  summary += '.'

  if (topTech)   summary += ` Their core technology stack includes ${topTech}.`
  if (topSkills) summary += ` Key competencies include ${topSkills}.`

  if (degree) {
    summary += ` Academically, ${name.split(' ')[0]} holds a ${degree}`
    if (school) summary += ` from ${school}`
    summary += '.'
  }

  const recent = experience.entries[0]
  if (recent?.title) {
    if (recent.current && recent.company) {
      summary += ` Currently working as ${recent.title} at ${recent.company}.`
    } else {
      summary += ` Most recent role: ${recent.title}${recent.company ? ` at ${recent.company}` : ''}.`
    }
  }

  const strengths = []
  if (technologies.some(t => ['react', 'angular', 'vue', 'nextjs', 'svelte'].includes(t)))       strengths.push('frontend development')
  if (technologies.some(t => ['nodejs', 'express', 'django', 'flask', 'spring'].includes(t)))     strengths.push('backend development')
  if (technologies.some(t => ['docker', 'kubernetes', 'aws', 'gcp', 'azure'].includes(t)))        strengths.push('cloud & DevOps')
  if (technologies.some(t => ['tensorflow', 'pytorch', 'scikit-learn', 'keras'].includes(t)))     strengths.push('AI/ML')
  if (technologies.some(t => ['postgresql', 'mysql', 'mongodb', 'redis'].includes(t)))            strengths.push('database management')
  if (strengths.length > 0) summary += ` Key strengths include ${strengths.join(', ')}.`

  return summary
}

async function parseResume(filePath) {
  const fs     = require('fs')
  const buffer = fs.readFileSync(filePath)
  const data   = await pdfParse(buffer)
  const text   = (data.text || '').trim()

  // ── Primary: LLM AI analysis (Qwen via Ollama or Gemini via llmProvider) ──
  const aiEnabled = process.env.AI_PROVIDER || process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY
  if (aiEnabled) {
    try {
      const { analyzeWithGemini } = require('./geminiService')
      const aiResult = await analyzeWithGemini(text)
      console.log('[ResumeParser] AI analysis succeeded')
      return { rawText: text.slice(0, 20000), ...aiResult }
    } catch (aiErr) {
      console.error('[ResumeParser] AI analysis failed, falling back to regex parser:', aiErr.message)
    }
  } else {
    console.warn('[ResumeParser] No AI provider configured — using regex parser')
  }

  // ── Fallback: regex / keyword parser ─────────────────────────────────────
  const contact      = extractContactInfo(text)
  const skills       = extractSkills(text)
  const technologies = detectTechnologies(text)
  const experience   = parseExperience(text)
  const education    = parseEducation(text)
  const summary      = generateSummary(contact, skills, technologies, experience, education)

  return {
    rawText: text.slice(0, 20000),
    contact,
    skills,
    technologies,
    experience,
    education,
    summary,
  }
}

module.exports = { parseResume }

