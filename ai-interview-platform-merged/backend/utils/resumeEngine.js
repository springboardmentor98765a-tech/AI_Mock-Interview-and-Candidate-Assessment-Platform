// ============================================================
// Resume parsing engine (Module 2: Resume Upload & Skill
// Extraction). Works on the plain text pulled out of an uploaded
// PDF by pdf-parse. Not a real ML model — a rules/keyword-based
// "AI-based" extractor: keyword matching against curated skill and
// degree dictionaries, plus regex heuristics for dates, section
// headers, and duration phrasing. Deterministic, fast, and free.
// ============================================================

// ---------------------------------------------------------------
// Skill / technology dictionary, grouped by category so results can
// power both flat "skills" and categorized "technologies" output.
// ---------------------------------------------------------------
const TECH_DICTIONARY = {
  languages: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'Go', 'Golang', 'Rust',
    'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Dart', 'Objective-C',
    'HTML', 'CSS', 'SQL', 'Shell', 'Bash',
  ],
  frameworks: [
    'React', 'Angular', 'Vue', 'Next.js', 'Nuxt.js', 'Express', 'Express.js', 'Node.js', 'Django',
    'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET', '.NET',
    'jQuery', 'Bootstrap', 'Tailwind', 'Tailwind CSS', 'Redux', 'GraphQL', 'REST', 'gRPC',
    'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Flutter', 'React Native',
  ],
  databases: [
    'PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'Redis', 'Oracle', 'SQL Server', 'MariaDB',
    'Cassandra', 'DynamoDB', 'Firebase', 'Elasticsearch', 'Neo4j', 'Supabase',
  ],
  cloudDevops: [
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform',
    'Ansible', 'CI/CD', 'GitHub Actions', 'GitLab CI', 'Nginx', 'Linux', 'Heroku', 'Vercel',
    'Netlify', 'CloudFormation', 'Serverless',
  ],
  tools: [
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'JIRA', 'Confluence', 'Postman', 'Figma', 'VS Code',
    'IntelliJ', 'Webpack', 'Vite', 'Babel', 'npm', 'Yarn', 'Agile', 'Scrum', 'Kanban',
    'Excel', 'Power BI', 'Tableau', 'Selenium', 'Jest', 'Mocha', 'JUnit',
  ],
};

const DEGREE_KEYWORDS = [
  { pattern: /ph\.?d\.?|doctor of philosophy/i, label: 'Ph.D.' },
  { pattern: /m\.?tech\.?|master of technology/i, label: 'M.Tech' },
  { pattern: /m\.?b\.?a\.?|master of business administration/i, label: 'MBA' },
  { pattern: /m\.?s\.?c?\.?\b|master of science/i, label: 'M.Sc / M.S.' },
  { pattern: /m\.?c\.?a\.?|master of computer applications/i, label: 'MCA' },
  { pattern: /b\.?tech\.?|bachelor of technology/i, label: 'B.Tech' },
  { pattern: /b\.?e\.?\b|bachelor of engineering/i, label: 'B.E.' },
  { pattern: /b\.?c\.?a\.?|bachelor of computer applications/i, label: 'BCA' },
  { pattern: /b\.?s\.?c?\.?\b|bachelor of science/i, label: 'B.Sc / B.S.' },
  { pattern: /b\.?com\.?|bachelor of commerce/i, label: 'B.Com' },
  { pattern: /diploma/i, label: 'Diploma' },
  { pattern: /high school|senior secondary|12th|hsc/i, label: 'High School' },
];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Feature 2: AI-based skill extraction.
 * Matches every dictionary term against the resume text using
 * word-boundary-safe regexes and returns the unique set found,
 * preserving dictionary casing (e.g. "JavaScript" not "javascript").
 */
function extractSkills(text) {
  const found = new Set();
  const allTerms = Object.values(TECH_DICTIONARY).flat();

  for (const term of allTerms) {
    const escaped = escapeRegExp(term);
    // Allow terms with punctuation (C++, Node.js) to still match as
    // whole tokens without requiring a strict \b on both sides.
    const re = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');
    if (re.test(text)) found.add(term);
  }
  return Array.from(found);
}

/**
 * Feature 4: Technology detection, categorized.
 */
function detectTechnologies(text, skills) {
  const skillSet = new Set(skills.map((s) => s.toLowerCase()));
  const categorized = {};
  for (const [category, terms] of Object.entries(TECH_DICTIONARY)) {
    categorized[category] = terms.filter((t) => skillSet.has(t.toLowerCase()));
  }
  return categorized;
}

/**
 * Feature 3: Experience parsing.
 * Looks for an explicit "X years of experience" statement first
 * (most reliable), then falls back to summing date ranges found
 * near job-title-like lines (e.g. "Jan 2021 - Present",
 * "2019 - 2022"). Also extracts individual role/company/duration
 * entries where the resume follows a fairly standard layout.
 */
function parseExperience(text) {
  let years = null;

  const explicitMatch = text.match(/(\d+(?:\.\d+)?)\+?\s*years?\s*(?:of)?\s*(?:relevant\s*)?experience/i);
  if (explicitMatch) {
    years = parseFloat(explicitMatch[1]);
  }

  const monthNames = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December';
  const dateRangeRe = new RegExp(
    `((?:${monthNames})\\.?\\s*\\d{4}|\\d{4})\\s*(?:-|–|to)\\s*((?:${monthNames})\\.?\\s*\\d{4}|Present|Current|\\d{4})`,
    'gi'
  );

  const entries = [];
  let totalMonths = 0;
  let match;
  while ((match = dateRangeRe.exec(text)) !== null) {
    const startYearMatch = match[1].match(/\d{4}/);
    const endRaw = match[2];
    const startYear = startYearMatch ? parseInt(startYearMatch[0], 10) : null;
    const isCurrent = /present|current/i.test(endRaw);
    const endYearMatch = endRaw.match(/\d{4}/);
    const endYear = isCurrent ? new Date().getFullYear() : endYearMatch ? parseInt(endYearMatch[0], 10) : null;

    if (startYear && endYear && endYear >= startYear) {
      totalMonths += (endYear - startYear) * 12;
    }

    // Try to pull a role/company line immediately preceding this date range.
    const lineStart = text.lastIndexOf('\n', match.index);
    const contextStart = Math.max(0, lineStart - 120);
    const context = text.slice(contextStart, match.index).trim();
    const lastLine = context.split(/\n/).filter(Boolean).pop() || '';

    entries.push({
      duration: `${match[1].trim()} - ${endRaw.trim()}`,
      context: lastLine.slice(0, 120),
    });
  }

  if (years === null && totalMonths > 0) {
    years = Math.round((totalMonths / 12) * 10) / 10;
  }

  return {
    years,
    entries: entries.slice(0, 8),
  };
}

/**
 * Feature 5: Education analysis.
 * Finds an "Education" section if present (to scope the search),
 * otherwise scans the whole document. Matches known degree
 * patterns and pairs each with the nearest 4-digit year found on
 * the same or an adjacent line.
 */
function analyzeEducation(text) {
  const eduSectionMatch = text.match(/education[\s\S]{0,1200}?(?=\n[A-Z][A-Za-z ]{2,30}\n|$)/i);
  const scope = eduSectionMatch ? eduSectionMatch[0] : text;

  const lines = scope.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const found = [];
  const seen = new Set();

  lines.forEach((line, idx) => {
    for (const { pattern, label } of DEGREE_KEYWORDS) {
      if (pattern.test(line) && !seen.has(label)) {
        const yearMatch =
          line.match(/(19|20)\d{2}/) ||
          (lines[idx + 1] || '').match(/(19|20)\d{2}/) ||
          (lines[idx - 1] || '').match(/(19|20)\d{2}/);
        found.push({
          degree: label,
          context: line.slice(0, 140),
          year: yearMatch ? yearMatch[0] : null,
        });
        seen.add(label);
        break;
      }
    }
  });

  return found;
}

/**
 * Feature 6: Resume summary generation.
 * Produces a short, human-readable paragraph from everything else
 * that was extracted, rather than a generic template — reads
 * naturally even though it's assembled from structured data.
 */
function generateSummary({ skills, technologies, experience, education }) {
  const parts = [];

  if (experience.years) {
    parts.push(`Candidate has approximately ${experience.years} year${experience.years === 1 ? '' : 's'} of professional experience.`);
  } else {
    parts.push('Candidate\'s resume does not state a clear number of years of experience.');
  }

  const topSkills = skills.slice(0, 6);
  if (topSkills.length > 0) {
    parts.push(`Core technical strengths include ${topSkills.join(', ')}.`);
  }

  const cloud = technologies.cloudDevops || [];
  if (cloud.length > 0) {
    parts.push(`Familiar with cloud/DevOps tooling such as ${cloud.slice(0, 4).join(', ')}.`);
  }

  if (education.length > 0) {
    const highest = education[0];
    parts.push(
      `Holds a ${highest.degree}${highest.year ? ` (${highest.year})` : ''}${
        education.length > 1 ? `, along with ${education.length - 1} other qualification${education.length - 1 === 1 ? '' : 's'} listed` : ''
      }.`
    );
  }

  if (skills.length === 0 && education.length === 0) {
    parts.push('Limited structured information could be extracted — consider uploading a text-based (not scanned/image) PDF for better results.');
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------
// Feature 7: ATS (Applicant Tracking System) friendliness scoring.
// Rules-based checks against things a real ATS parser (Workday,
// Taleo, Greenhouse, etc.) either needs to find or trips up on.
// Returns a 0-100 score plus a short list of specific, actionable
// findings — each tagged pass/warn/fail so the UI can colour them.
// ---------------------------------------------------------------
const SECTION_HEADERS = {
  experience: /\b(experience|employment history|work history)\b/i,
  education: /\beducation\b/i,
  skills: /\bskills\b/i,
  summary: /\b(summary|objective|profile)\b/i,
  contact: /\b(contact|email|phone)\b/i,
};

function scoreAts({ text, skills, technologies, experience, education }) {
  const cleanText = text || '';
  const wordCount = (cleanText.match(/\S+/g) || []).length;
  const findings = []; // { status: 'pass'|'warn'|'fail', message }
  let score = 100;

  const deduct = (points, status, message) => {
    score -= points;
    findings.push({ status, message });
  };

  // Contact details an ATS (and a recruiter) needs to find candidates.
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleanText);
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(cleanText);
  if (hasEmail) findings.push({ status: 'pass', message: 'Email address found.' });
  else deduct(15, 'fail', 'No email address detected — most ATS platforms reject resumes without one.');
  if (hasPhone) findings.push({ status: 'pass', message: 'Phone number found.' });
  else deduct(10, 'warn', 'No phone number detected.');

  // Standard, ATS-recognizable section headers.
  const missingSections = Object.entries(SECTION_HEADERS)
    .filter(([key]) => key !== 'contact')
    .filter(([, pattern]) => !pattern.test(cleanText))
    .map(([key]) => key);
  if (missingSections.length === 0) {
    findings.push({ status: 'pass', message: 'All standard section headers found (Summary, Experience, Education, Skills).' });
  } else {
    deduct(
      8 * missingSections.length,
      'warn',
      `Missing or non-standard section header(s): ${missingSections.join(', ')}. Use exact words like "Experience" and "Education" so ATS parsers recognize them.`
    );
  }

  // A dedicated, machine-parseable skills list matters a lot to ATS keyword matching.
  if (skills.length >= 8) {
    findings.push({ status: 'pass', message: `${skills.length} recognizable skill keywords found.` });
  } else if (skills.length >= 3) {
    deduct(8, 'warn', `Only ${skills.length} recognizable skill keywords found — list more relevant tools/technologies explicitly.`);
  } else {
    deduct(18, 'fail', 'Very few recognizable skill keywords found — add an explicit "Skills" section with specific tools/technologies.');
  }

  // Length — too short reads as thin, too long gets truncated by some parsers.
  if (wordCount < 150) {
    deduct(15, 'fail', `Resume is very short (${wordCount} words) — ATS and recruiters may see it as incomplete.`);
  } else if (wordCount > 1200) {
    deduct(8, 'warn', `Resume is quite long (${wordCount} words) — consider tightening it to 1-2 pages.`);
  } else {
    findings.push({ status: 'pass', message: `Resume length is reasonable (${wordCount} words).` });
  }

  // Quantified achievements (numbers/%) correlate strongly with resumes that pass human review.
  const hasNumbers = /\b\d+(\.\d+)?\s*(%|percent|\+)?\b/.test(cleanText.replace(/\b(19|20)\d{2}\b/g, ''));
  if (hasNumbers) findings.push({ status: 'pass', message: 'Contains quantified achievements (numbers/percentages).' });
  else deduct(6, 'warn', 'No quantified achievements found — adding numbers (%, $, team size, time saved) strengthens impact.');

  // Bullet-point usage — ATS and recruiters both parse bullets more reliably than dense paragraphs.
  const bulletLines = (cleanText.match(/^[\s]*[•\-*▪]\s+/gm) || []).length;
  if (bulletLines >= 3) findings.push({ status: 'pass', message: 'Uses bullet points for readability.' });
  else deduct(6, 'warn', 'Few or no bullet points detected — bullet points parse more reliably than paragraphs in most ATS.');

  // Education presence.
  if (education.length > 0) findings.push({ status: 'pass', message: 'Education section successfully parsed.' });
  else deduct(8, 'warn', 'No recognizable education entry found.');

  // Special-character density — heavy use of tables/icons/graphics often shows up as garbled
  // symbol runs once a PDF is text-extracted, which is roughly what an ATS parser also sees.
  const specialCharRatio = (cleanText.match(/[^\w\s.,;:()@%+\-\/&']/g) || []).length / Math.max(1, cleanText.length);
  if (specialCharRatio > 0.03) {
    deduct(10, 'warn', 'Unusual density of special characters/symbols — resumes built with tables, icons, or heavy graphics often parse poorly in ATS. A simple single-column layout is safest.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, findings };
}

/**
 * Runs the full Module 2 pipeline against raw resume text.
 */
function analyzeResumeText(text) {
  const cleanText = (text || '').replace(/\r/g, '');
  const skills = extractSkills(cleanText);
  const technologies = detectTechnologies(cleanText, skills);
  const experience = parseExperience(cleanText);
  const education = analyzeEducation(cleanText);
  const summary = generateSummary({ skills, technologies, experience, education });
  const ats = scoreAts({ text: cleanText, skills, technologies, experience, education });

  return {
    skills,
    technologies,
    experienceYears: experience.years,
    experienceEntries: experience.entries,
    education,
    summary,
    atsScore: ats.score,
    atsFeedback: ats.findings,
  };
}

module.exports = {
  analyzeResumeText,
  extractSkills,
  detectTechnologies,
  parseExperience,
  analyzeEducation,
  generateSummary,
  scoreAts,
};
