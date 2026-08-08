// ============================================================
// Lightweight "AI" scoring engine for mock interviews.
// Not a real ML model — deterministic-ish simulator that
// produces a plausible score + skill breakdown + feedback
// so completed interviews always have something to show.
// ============================================================

function randomInRange(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// Question Generation Logic (Module 3: AI Interview Generation)
// ------------------------------------------------------------
// A deterministic, curated question bank keyed by category and
// difficulty. Technical questions are further keyed by domain so
// the same "Technical" category can be customized per role/skill
// (Java, Python, Frontend, Data Analyst, etc). This stands in for
// a real generative model while keeping output stable and free.
// ============================================================

const VALID_CATEGORIES = ['HR', 'Technical', 'Behavioral', 'Aptitude'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

const HR_QUESTIONS = {
  easy: [
    'Tell me about yourself.',
    'Why do you want to work with us?',
    'What are your strengths and weaknesses?',
    'Where do you see yourself in five years?',
    'Why are you looking to leave your current role?',
  ],
  medium: [
    'What motivates you to do your best work?',
    'How do you handle constructive criticism?',
    'Describe your ideal work environment.',
    'What are your salary expectations for this role?',
    'How do you prioritize tasks when everything feels urgent?',
  ],
  hard: [
    'Tell me about a time you disagreed with a manager and how you handled it.',
    'Describe a situation where you had to make an unpopular decision.',
    'How would you handle being asked to do something you believe is unethical?',
    'What would you do if you found out a close teammate was underperforming badly?',
    'How do you decide when to walk away from a job offer?',
  ],
};

const BEHAVIORAL_QUESTIONS = {
  easy: [
    'Describe a time you worked successfully as part of a team.',
    'Tell me about a goal you set and how you achieved it.',
    'Give an example of when you had to learn something new quickly.',
    'Describe a time you helped a colleague solve a problem.',
    'Tell me about a project you are proud of.',
  ],
  medium: [
    'Describe a time you missed a deadline. What happened and what did you learn?',
    'Tell me about a time you had to adapt to a significant change at work.',
    'Give an example of when you took initiative without being asked.',
    'Describe a conflict with a coworker and how you resolved it.',
    'Tell me about a time you received difficult feedback and how you responded.',
  ],
  hard: [
    'Describe the most complex problem you have solved and your approach to it.',
    'Tell me about a time you had to influence someone without formal authority.',
    'Describe a time you failed at something important. How did you recover?',
    'Tell me about a time you had to manage competing priorities under pressure with limited resources.',
    'Describe a situation where you had to lead a team through ambiguity.',
  ],
};

const APTITUDE_QUESTIONS = {
  easy: [
    'If a train travels 60 km in 1.5 hours, what is its average speed?',
    'What is 15% of 200?',
    'Find the next number in the series: 2, 4, 6, 8, __',
    'A shirt costs $40 after a 20% discount. What was the original price?',
    'If today is Monday, what day will it be after 17 days?',
  ],
  medium: [
    'Two pipes can fill a tank in 6 and 8 hours respectively. How long will both take together?',
    'A is twice as old as B. In 10 years, A will be 1.5 times as old as B. Find their current ages.',
    'If the ratio of boys to girls in a class is 3:2 and there are 30 students, how many are girls?',
    'A sum of money doubles itself in 8 years at simple interest. Find the rate of interest.',
    'Find the missing number: 3, 7, 15, 31, __',
  ],
  hard: [
    'A boat travels 30 km upstream in 6 hours and returns downstream in 3 hours. Find the speed of the boat in still water.',
    'In how many ways can 5 people be seated in a row such that two specific people always sit together?',
    'A dice is rolled twice. What is the probability that the sum of the two rolls is greater than 9?',
    'A works twice as fast as B. Together they finish a job in 12 days. How long would B alone take?',
    'Three numbers are in the ratio 2:3:5 and their sum is 200. Find the largest number.',
  ],
};

// Technical question bank, keyed by normalized domain, then difficulty.
// Falls back to a general software-engineering set for unknown domains.
const TECHNICAL_QUESTIONS = {
  java: {
    easy: [
      'What is the difference between JDK, JRE, and JVM?',
      'What is the difference between == and .equals() in Java?',
      'What are the main principles of Object-Oriented Programming?',
      'What is the difference between an ArrayList and a LinkedList?',
      'What is a constructor, and how does it differ from a method?',
    ],
    medium: [
      'Explain the difference between abstract classes and interfaces in Java.',
      'What is the purpose of the "final" keyword and where can it be used?',
      'How does exception handling work in Java (try/catch/finally)?',
      'Explain how HashMap works internally in Java.',
      'What is multithreading, and how do you create a thread in Java?',
    ],
    hard: [
      'Explain the Java memory model and how garbage collection works.',
      'How would you design a thread-safe singleton in Java?',
      'Explain the differences between synchronized blocks and java.util.concurrent locks.',
      'How does the JVM optimize code at runtime (JIT compilation)?',
      'Design a rate limiter using Java concurrency primitives.',
    ],
  },
  python: {
    easy: [
      'What is the difference between a list and a tuple in Python?',
      'What are Python decorators used for?',
      'How does Python manage memory?',
      'What is the difference between "is" and "==" in Python?',
      'What are *args and **kwargs used for?',
    ],
    medium: [
      'Explain Python\'s Global Interpreter Lock (GIL) and its impact on multithreading.',
      'What is the difference between a generator and a list comprehension?',
      'How do context managers (the "with" statement) work in Python?',
      'Explain shallow copy vs deep copy in Python.',
      'How would you handle circular imports in a Python project?',
    ],
    hard: [
      'How would you optimize a Python application that is CPU-bound?',
      'Explain how Python\'s asyncio event loop works.',
      'Design a caching decorator with configurable expiry in Python.',
      'How does Python\'s garbage collector handle reference cycles?',
      'Explain metaclasses in Python and a real use case for them.',
    ],
  },
  frontend: {
    easy: [
      'What is the difference between HTML, CSS, and JavaScript?',
      'What is the DOM, and how does JavaScript interact with it?',
      'What is the difference between "let", "const", and "var"?',
      'What is responsive design, and how do you achieve it?',
      'What is the box model in CSS?',
    ],
    medium: [
      'Explain the difference between client-side and server-side rendering.',
      'What is the virtual DOM, and how does it improve performance?',
      'How does event delegation work in JavaScript?',
      'What are Promises, and how do they differ from callbacks?',
      'How would you optimize the load time of a web page?',
    ],
    hard: [
      'Design a component architecture for a large, scalable single-page application.',
      'Explain how you would implement code-splitting and lazy loading in a React app.',
      'How would you diagnose and fix a memory leak in a front-end application?',
      'Explain the trade-offs between different state management approaches.',
      'How would you design a design system used across multiple product teams?',
    ],
  },
  data: {
    easy: [
      'What is the difference between a primary key and a foreign key?',
      'What is the difference between mean, median, and mode?',
      'What is normalization in database design?',
      'What is the difference between SQL and NoSQL databases?',
      'What does a JOIN do in SQL?',
    ],
    medium: [
      'Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN.',
      'How would you handle missing data in a dataset?',
      'What is the difference between correlation and causation?',
      'Explain overfitting and how to prevent it in a machine learning model.',
      'How would you design a data pipeline to process daily sales data?',
    ],
    hard: [
      'How would you design a data warehouse schema for a retail company?',
      'Explain how you would detect and handle outliers in a large dataset.',
      'How would you evaluate whether an A/B test result is statistically significant?',
      'Design an approach to build and maintain a real-time analytics dashboard.',
      'How would you optimize a slow-running SQL query on a multi-million row table?',
    ],
  },
  general: {
    easy: [
      'What is the difference between a stack and a queue?',
      'What is Big-O notation, and why does it matter?',
      'What is version control, and why is Git useful?',
      'What is the difference between an array and a linked list?',
      'What does REST stand for, and what makes an API RESTful?',
    ],
    medium: [
      'Explain the difference between processes and threads.',
      'How would you design a URL-shortening service at a high level?',
      'What is database indexing, and how does it improve performance?',
      'Explain the difference between authentication and authorization.',
      'How do you approach debugging a production issue you can\'t reproduce locally?',
    ],
    hard: [
      'Design a scalable notification system that supports email, SMS, and push.',
      'How would you design a system to handle millions of concurrent WebSocket connections?',
      'Explain how you would design a distributed rate limiter across multiple servers.',
      'Walk through how you would design a fault-tolerant job scheduling system.',
      'How would you design a system for real-time collaborative document editing?',
    ],
  },
};

function normalizeDomain(domain) {
  if (!domain) return 'general';
  const d = String(domain).toLowerCase();
  if (d.includes('java')) return 'java';
  if (d.includes('python')) return 'python';
  if (d.includes('front') || d.includes('react') || d.includes('web') || d.includes('ui')) return 'frontend';
  if (d.includes('data')) return 'data';
  return 'general';
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pulls `count` questions for a single category/difficulty/domain
 * combination, filling in from adjacent difficulty pools if the
 * primary pool runs short (keeps output count consistent).
 */
function pickQuestions(category, difficulty, domain, count) {
  let pool;
  if (category === 'HR') pool = HR_QUESTIONS[difficulty];
  else if (category === 'Behavioral') pool = BEHAVIORAL_QUESTIONS[difficulty];
  else if (category === 'Aptitude') pool = APTITUDE_QUESTIONS[difficulty];
  else pool = (TECHNICAL_QUESTIONS[normalizeDomain(domain)] || TECHNICAL_QUESTIONS.general)[difficulty];

  let picked = shuffle(pool).slice(0, count);
  if (picked.length < count) {
    // Top up from the other difficulty tiers of the same category so
    // requests for large counts still return the requested amount.
    const bank =
      category === 'HR'
        ? HR_QUESTIONS
        : category === 'Behavioral'
        ? BEHAVIORAL_QUESTIONS
        : category === 'Aptitude'
        ? APTITUDE_QUESTIONS
        : TECHNICAL_QUESTIONS[normalizeDomain(domain)] || TECHNICAL_QUESTIONS.general;
    const extras = VALID_DIFFICULTIES.filter((d) => d !== difficulty).flatMap((d) => bank[d] || []);
    const needed = count - picked.length;
    picked = picked.concat(shuffle(extras).slice(0, needed));
  }
  return picked.map((text) => ({ text, category, difficulty }));
}

/**
 * Generates a full set of interview questions for a session.
 *
 * @param {Object} opts
 * @param {'HR'|'Technical'|'Behavioral'|'Aptitude'|'Mixed'} opts.category
 * @param {'easy'|'medium'|'hard'} opts.difficulty
 * @param {string} [opts.domain] - only used to customize Technical questions
 * @param {number} [opts.count] - total number of questions to generate
 * @returns {Array<{ text: string, category: string, difficulty: string }>}
 */
function generateQuestions({ category, difficulty = 'medium', domain, count = 5 }) {
  const safeDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
  const safeCount = clamp(Number(count) || 5, 1, 20);

  if (category === 'Mixed') {
    // Spread questions evenly across all four categories.
    const perCategory = Math.max(1, Math.floor(safeCount / VALID_CATEGORIES.length));
    let questions = VALID_CATEGORIES.flatMap((cat) =>
      pickQuestions(cat, safeDifficulty, domain, perCategory)
    );
    // Top up any rounding shortfall from HR.
    while (questions.length < safeCount) {
      questions = questions.concat(pickQuestions('HR', safeDifficulty, domain, 1));
    }
    return shuffle(questions).slice(0, safeCount);
  }

  const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'Technical';
  return pickQuestions(safeCategory, safeDifficulty, domain, safeCount);
}

/**
 * Generates a simulated assessment for a completed mock interview.
 * Skill sub-scores are correlated with the overall score (with
 * some noise) so the numbers feel coherent rather than random.
 */
function generateAssessment() {
  const base = randomInRange(60, 97);

  const skillCommunication = clamp(base + randomInRange(-8, 8), 40, 100);
  const skillTechnical = clamp(base + randomInRange(-10, 10), 40, 100);
  const skillConfidence = clamp(base + randomInRange(-8, 8), 40, 100);
  const skillProblemSolving = clamp(base + randomInRange(-10, 10), 40, 100);

  const score = clamp(
    Math.round((skillCommunication + skillTechnical + skillConfidence + skillProblemSolving) / 4),
    0,
    100
  );

  let band;
  if (score >= 90) band = 'excellent';
  else if (score >= 80) band = 'strong';
  else if (score >= 65) band = 'solid';
  else band = 'developing';

  const feedbackByBand = {
    excellent:
      'Outstanding performance — clear, structured answers with strong technical depth and confident delivery. Ready for real interviews.',
    strong:
      'Strong performance overall. Communication and technical answers were solid; tightening up a few edge-case explanations will push this even higher.',
    solid:
      'A solid attempt with room to grow — focus on structuring answers more clearly and backing up claims with concrete examples.',
    developing:
      'Good starting point. Prioritize practicing core concepts out loud and slow down under pressure to reduce filler and hesitation.',
  };

  return {
    score,
    skillCommunication,
    skillTechnical,
    skillConfidence,
    skillProblemSolving,
    aiFeedback: feedbackByBand[band],
  };
}

module.exports = {
  generateAssessment,
  generateQuestions,
  VALID_CATEGORIES,
  VALID_DIFFICULTIES,
};
