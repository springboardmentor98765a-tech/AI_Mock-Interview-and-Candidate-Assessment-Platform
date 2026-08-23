"""
Question Generation Logic (Module 3: AI Interview Generation).

Python port of backend/utils/aiEngine.js so behaviour matches the
existing Node service exactly. A deterministic, curated question bank
keyed by category and difficulty; Technical questions are further
keyed by domain (java, python, frontend, data, general). This stands
in for a real generative model while keeping output stable and free
to run (no API key / no model hosting required).
"""
import random
from typing import Optional, TypedDict

from app import ai_providers

VALID_CATEGORIES = ["HR", "Technical", "Behavioral", "Aptitude"]
VALID_DIFFICULTIES = ["easy", "medium", "hard"]


class GeneratedQuestion(TypedDict):
    text: str
    category: str
    difficulty: str
    keywords: list[str]


HR_QUESTIONS = {
    "easy": [
        "Tell me about yourself.",
        "Why do you want to work with us?",
        "What are your strengths and weaknesses?",
        "Where do you see yourself in five years?",
        "Why are you looking to leave your current role?",
    ],
    "medium": [
        "What motivates you to do your best work?",
        "How do you handle constructive criticism?",
        "Describe your ideal work environment.",
        "What are your salary expectations for this role?",
        "How do you prioritize tasks when everything feels urgent?",
    ],
    "hard": [
        "Tell me about a time you disagreed with a manager and how you handled it.",
        "Describe a situation where you had to make an unpopular decision.",
        "How would you handle being asked to do something you believe is unethical?",
        "What would you do if you found out a close teammate was underperforming badly?",
        "How do you decide when to walk away from a job offer?",
    ],
}

BEHAVIORAL_QUESTIONS = {
    "easy": [
        "Describe a time you worked successfully as part of a team.",
        "Tell me about a goal you set and how you achieved it.",
        "Give an example of when you had to learn something new quickly.",
        "Describe a time you helped a colleague solve a problem.",
        "Tell me about a project you are proud of.",
    ],
    "medium": [
        "Describe a time you missed a deadline. What happened and what did you learn?",
        "Tell me about a time you had to adapt to a significant change at work.",
        "Give an example of when you took initiative without being asked.",
        "Describe a conflict with a coworker and how you resolved it.",
        "Tell me about a time you received difficult feedback and how you responded.",
    ],
    "hard": [
        "Describe the most complex problem you have solved and your approach to it.",
        "Tell me about a time you had to influence someone without formal authority.",
        "Describe a time you failed at something important. How did you recover?",
        "Tell me about a time you had to manage competing priorities under pressure with limited resources.",
        "Describe a situation where you had to lead a team through ambiguity.",
    ],
}

APTITUDE_QUESTIONS = {
    "easy": [
        "If a train travels 60 km in 1.5 hours, what is its average speed?",
        "What is 15% of 200?",
        "Find the next number in the series: 2, 4, 6, 8, __",
        "A shirt costs $40 after a 20% discount. What was the original price?",
        "If today is Monday, what day will it be after 17 days?",
    ],
    "medium": [
        "Two pipes can fill a tank in 6 and 8 hours respectively. How long will both take together?",
        "A is twice as old as B. In 10 years, A will be 1.5 times as old as B. Find their current ages.",
        "If the ratio of boys to girls in a class is 3:2 and there are 30 students, how many are girls?",
        "A sum of money doubles itself in 8 years at simple interest. Find the rate of interest.",
        "Find the missing number: 3, 7, 15, 31, __",
    ],
    "hard": [
        "A boat travels 30 km upstream in 6 hours and returns downstream in 3 hours. Find the speed of the boat in still water.",
        "In how many ways can 5 people be seated in a row such that two specific people always sit together?",
        "A dice is rolled twice. What is the probability that the sum of the two rolls is greater than 9?",
        "A works twice as fast as B. Together they finish a job in 12 days. How long would B alone take?",
        "Three numbers are in the ratio 2:3:5 and their sum is 200. Find the largest number.",
    ],
}

TECHNICAL_QUESTIONS = {
    "java": {
        "easy": [
            "What is the difference between JDK, JRE, and JVM?",
            "What is the difference between == and .equals() in Java?",
            "What are the main principles of Object-Oriented Programming?",
            "What is the difference between an ArrayList and a LinkedList?",
            "What is a constructor, and how does it differ from a method?",
        ],
        "medium": [
            "Explain the difference between abstract classes and interfaces in Java.",
            'What is the purpose of the "final" keyword and where can it be used?',
            "How does exception handling work in Java (try/catch/finally)?",
            "Explain how HashMap works internally in Java.",
            "What is multithreading, and how do you create a thread in Java?",
        ],
        "hard": [
            "Explain the Java memory model and how garbage collection works.",
            "How would you design a thread-safe singleton in Java?",
            "Explain the differences between synchronized blocks and java.util.concurrent locks.",
            "How does the JVM optimize code at runtime (JIT compilation)?",
            "Design a rate limiter using Java concurrency primitives.",
        ],
    },
    "python": {
        "easy": [
            "What is the difference between a list and a tuple in Python?",
            "What are Python decorators used for?",
            "How does Python manage memory?",
            'What is the difference between "is" and "==" in Python?',
            "What are *args and **kwargs used for?",
        ],
        "medium": [
            "Explain Python's Global Interpreter Lock (GIL) and its impact on multithreading.",
            "What is the difference between a generator and a list comprehension?",
            'How do context managers (the "with" statement) work in Python?',
            "Explain shallow copy vs deep copy in Python.",
            "How would you handle circular imports in a Python project?",
        ],
        "hard": [
            "How would you optimize a Python application that is CPU-bound?",
            "Explain how Python's asyncio event loop works.",
            "Design a caching decorator with configurable expiry in Python.",
            "How does Python's garbage collector handle reference cycles?",
            "Explain metaclasses in Python and a real use case for them.",
        ],
    },
    "frontend": {
        "easy": [
            "What is the difference between HTML, CSS, and JavaScript?",
            "What is the DOM, and how does JavaScript interact with it?",
            'What is the difference between "let", "const", and "var"?',
            "What is responsive design, and how do you achieve it?",
            "What is the box model in CSS?",
        ],
        "medium": [
            "Explain the difference between client-side and server-side rendering.",
            "What is the virtual DOM, and how does it improve performance?",
            "How does event delegation work in JavaScript?",
            "What are Promises, and how do they differ from callbacks?",
            "How would you optimize the load time of a web page?",
        ],
        "hard": [
            "Design a component architecture for a large, scalable single-page application.",
            "Explain how you would implement code-splitting and lazy loading in a React app.",
            "How would you diagnose and fix a memory leak in a front-end application?",
            "Explain the trade-offs between different state management approaches.",
            "How would you design a design system used across multiple product teams?",
        ],
    },
    "data": {
        "easy": [
            "What is the difference between a primary key and a foreign key?",
            "What is the difference between mean, median, and mode?",
            "What is normalization in database design?",
            "What is the difference between SQL and NoSQL databases?",
            "What does a JOIN do in SQL?",
        ],
        "medium": [
            "Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN.",
            "How would you handle missing data in a dataset?",
            "What is the difference between correlation and causation?",
            "Explain overfitting and how to prevent it in a machine learning model.",
            "How would you design a data pipeline to process daily sales data?",
        ],
        "hard": [
            "How would you design a data warehouse schema for a retail company?",
            "Explain how you would detect and handle outliers in a large dataset.",
            "How would you evaluate whether an A/B test result is statistically significant?",
            "Design an approach to build and maintain a real-time analytics dashboard.",
            "How would you optimize a slow-running SQL query on a multi-million row table?",
        ],
    },
    "general": {
        "easy": [
            "What is the difference between a stack and a queue?",
            "What is Big-O notation, and why does it matter?",
            "What is version control, and why is Git useful?",
            "What is the difference between an array and a linked list?",
            "What does REST stand for, and what makes an API RESTful?",
        ],
        "medium": [
            "Explain the difference between processes and threads.",
            "How would you design a URL-shortening service at a high level?",
            "What is database indexing, and how does it improve performance?",
            "Explain the difference between authentication and authorization.",
            "How do you approach debugging a production issue you can't reproduce locally?",
        ],
        "hard": [
            "Design a scalable notification system that supports email, SMS, and push.",
            "How would you design a system to handle millions of concurrent WebSocket connections?",
            "Explain how you would design a distributed rate limiter across multiple servers.",
            "Walk through how you would design a fault-tolerant job scheduling system.",
            "How would you design a system for real-time collaborative document editing?",
        ],
    },
}


# ================================================================
# MCQ round — Aptitude questions are asked as multiple choice and
# graded deterministically (1 mark for the correct option, 0 for a
# wrong one) instead of being scored holistically by the AI/simulator.
# ================================================================
MCQ_APTITUDE_QUESTIONS = {
    "easy": [
        {
            "text": "If a train travels 60 km in 1.5 hours, what is its average speed?",
            "options": ["30 km/h", "40 km/h", "45 km/h", "60 km/h"],
            "correct": "B",
        },
        {
            "text": "What is 15% of 200?",
            "options": ["20", "25", "30", "35"],
            "correct": "C",
        },
        {
            "text": "Find the next number in the series: 2, 4, 6, 8, __",
            "options": ["9", "10", "12", "16"],
            "correct": "B",
        },
        {
            "text": "A shirt costs $40 after a 20% discount. What was the original price?",
            "options": ["$45", "$48", "$50", "$60"],
            "correct": "C",
        },
        {
            "text": "If today is Monday, what day will it be after 17 days?",
            "options": ["Wednesday", "Thursday", "Friday", "Saturday"],
            "correct": "C",
        },
    ],
    "medium": [
        {
            "text": "Two pipes can fill a tank in 6 and 8 hours respectively. How long will both take together?",
            "options": ["3 hours", "3.43 hours", "4 hours", "7 hours"],
            "correct": "B",
        },
        {
            "text": "A is twice as old as B. In 10 years, A will be 1.5 times as old as B. What is B's current age?",
            "options": ["10", "15", "20", "25"],
            "correct": "C",
        },
        {
            "text": "If the ratio of boys to girls in a class is 3:2 and there are 30 students, how many are girls?",
            "options": ["10", "12", "15", "18"],
            "correct": "B",
        },
        {
            "text": "A sum of money doubles itself in 8 years at simple interest. Find the rate of interest.",
            "options": ["10%", "12%", "12.5%", "15%"],
            "correct": "C",
        },
        {
            "text": "Find the missing number: 3, 7, 15, 31, __",
            "options": ["47", "55", "63", "71"],
            "correct": "C",
        },
    ],
    "hard": [
        {
            "text": "A boat travels 30 km upstream in 6 hours and returns downstream in 3 hours. Find the speed of the boat in still water.",
            "options": ["6 km/h", "7.5 km/h", "9 km/h", "10 km/h"],
            "correct": "B",
        },
        {
            "text": "In how many ways can 5 people be seated in a row such that two specific people always sit together?",
            "options": ["24", "48", "60", "120"],
            "correct": "B",
        },
        {
            "text": "A dice is rolled twice. What is the probability that the sum of the two rolls is greater than 9?",
            "options": ["1/6", "5/36", "1/9", "1/12"],
            "correct": "B",
        },
        {
            "text": "A works twice as fast as B. Together they finish a job in 12 days. How long would B alone take?",
            "options": ["24 days", "30 days", "36 days", "18 days"],
            "correct": "C",
        },
        {
            "text": "Three numbers are in the ratio 2:3:5 and their sum is 200. Find the largest number.",
            "options": ["60", "80", "100", "120"],
            "correct": "C",
        },
    ],
}

MCQ_MARKS = 2  # each Aptitude MCQ is worth 2 marks — full marks if correct, 0 if wrong

# ================================================================
# Coding round — one auto-gradable coding question per session,
# worth 10 marks, graded by running the candidate's program against
# >=3 test cases (stdin -> stdout) and awarding partial credit for
# marks * (test cases passed / total test cases).
# ================================================================
CODING_MARKS = 10

CODING_QUESTIONS = [
    {
        "title": "Sum of Two Numbers",
        "text": (
            "Read two integers from a single line of input (space-separated) "
            "and print their sum."
        ),
        "starter_code": {
            "python": "# Read two integers separated by a space and print their sum\na, b = map(int, input().split())\nprint(a + b)\n",
            "javascript": (
                "// Read two integers separated by a space and print their sum\n"
                "const line = require('fs').readFileSync(0, 'utf-8').trim();\n"
                "const [a, b] = line.split(' ').map(Number);\n"
                "console.log(a + b);\n"
            ),
        },
        "test_cases": [
            {"input": "2 3", "output": "5"},
            {"input": "10 20", "output": "30"},
            {"input": "-7 7", "output": "0"},
        ],
    },
    {
        "title": "Reverse a String",
        "text": "Read a single line of text and print it reversed.",
        "starter_code": {
            "python": "# Read a line and print it reversed\ns = input()\nprint(s[::-1])\n",
            "javascript": (
                "// Read a line and print it reversed\n"
                "const s = require('fs').readFileSync(0, 'utf-8').replace(/\\n$/, '');\n"
                "console.log(s.split('').reverse().join(''));\n"
            ),
        },
        "test_cases": [
            {"input": "hello", "output": "olleh"},
            {"input": "OpenAI", "output": "IAnepO"},
            {"input": "a", "output": "a"},
        ],
    },
    {
        "title": "Check Palindrome",
        "text": (
            "Read a single word and print YES if it is a palindrome, "
            "otherwise print NO (case-sensitive)."
        ),
        "starter_code": {
            "python": "# Read a word; print YES if it's a palindrome, else NO\ns = input()\nprint('YES' if s == s[::-1] else 'NO')\n",
            "javascript": (
                "// Read a word; print YES if it's a palindrome, else NO\n"
                "const s = require('fs').readFileSync(0, 'utf-8').replace(/\\n$/, '');\n"
                "console.log(s === s.split('').reverse().join('') ? 'YES' : 'NO');\n"
            ),
        },
        "test_cases": [
            {"input": "madam", "output": "YES"},
            {"input": "hello", "output": "NO"},
            {"input": "level", "output": "YES"},
        ],
    },
    {
        "title": "FizzBuzz",
        "text": (
            "Read an integer N. For each i from 1 to N (inclusive), print 'Fizz' if i is "
            "divisible by 3, 'Buzz' if divisible by 5, 'FizzBuzz' if divisible by both, "
            "otherwise print i. Print each result on its own line."
        ),
        "starter_code": {
            "python": (
                "# Read N and print FizzBuzz from 1..N, one result per line\n"
                "n = int(input())\n"
                "for i in range(1, n + 1):\n"
                "    if i % 15 == 0:\n"
                "        print('FizzBuzz')\n"
                "    elif i % 3 == 0:\n"
                "        print('Fizz')\n"
                "    elif i % 5 == 0:\n"
                "        print('Buzz')\n"
                "    else:\n"
                "        print(i)\n"
            ),
            "javascript": (
                "// Read N and print FizzBuzz from 1..N, one result per line\n"
                "const n = parseInt(require('fs').readFileSync(0, 'utf-8').trim(), 10);\n"
                "const lines = [];\n"
                "for (let i = 1; i <= n; i++) {\n"
                "  if (i % 15 === 0) lines.push('FizzBuzz');\n"
                "  else if (i % 3 === 0) lines.push('Fizz');\n"
                "  else if (i % 5 === 0) lines.push('Buzz');\n"
                "  else lines.push(String(i));\n"
                "}\n"
                "console.log(lines.join('\\n'));\n"
            ),
        },
        "test_cases": [
            {"input": "5", "output": "1\n2\nFizz\n4\nBuzz"},
            {"input": "3", "output": "1\n2\nFizz"},
            {"input": "15", "output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"},
        ],
    },
]


def pick_mcq_questions(difficulty: str, count: int, exclude_texts: Optional[set[str]] = None) -> list[dict]:
    """Pulls `count` Aptitude questions as MCQs (question_type='mcq'),
    each worth 1 mark, graded deterministically against `correct`."""
    excluded = exclude_texts or set()

    def fresh_pool(*diffs: str) -> list[dict]:
        pool: list[dict] = []
        for d in diffs:
            pool.extend(MCQ_APTITUDE_QUESTIONS.get(d, []))
        random.shuffle(pool)
        return [q for q in pool if _norm_text(q["text"]) not in excluded]

    safe_difficulty = difficulty if difficulty in VALID_DIFFICULTIES else "medium"
    picked = fresh_pool(safe_difficulty)[:count]
    if len(picked) < count:
        other_diffs = [d for d in VALID_DIFFICULTIES if d != safe_difficulty]
        picked += fresh_pool(*other_diffs)[: count - len(picked)]
    if len(picked) < count:
        all_q = [q for d in VALID_DIFFICULTIES for q in MCQ_APTITUDE_QUESTIONS.get(d, [])]
        random.shuffle(all_q)
        picked += all_q[: count - len(picked)]

    return [
        {
            "text": q["text"],
            "category": "Aptitude",
            "difficulty": safe_difficulty,
            "keywords": [],
            "question_type": "mcq",
            "options": list(q["options"]),
            "correct_option": q["correct"],
            "marks": MCQ_MARKS,
        }
        for q in picked
    ]


def pick_coding_question(exclude_texts: Optional[set[str]] = None) -> dict:
    """Picks one coding question (question_type='coding'), worth 10
    marks, with >=3 stdin/stdout test cases for the judge to run."""
    excluded = exclude_texts or set()
    pool = [q for q in CODING_QUESTIONS if _norm_text(q["title"]) not in excluded]
    if not pool:
        pool = CODING_QUESTIONS
    problem = random.choice(pool)
    return {
        "text": f"{problem['title']}: {problem['text']}",
        "category": "Technical",
        "difficulty": "medium",
        "keywords": [],
        "question_type": "coding",
        "marks": CODING_MARKS,
        "test_cases": problem["test_cases"],
        "starter_code": problem["starter_code"],
    }


def normalize_domain(domain: Optional[str]) -> str:
    if not domain:
        return "general"
    d = str(domain).lower()
    if "java" in d:
        return "java"
    if "python" in d:
        return "python"
    if any(k in d for k in ("front", "react", "web", "ui")):
        return "frontend"
    if "data" in d:
        return "data"
    return "general"


def _bank_for(category: str, domain: Optional[str]) -> dict:
    if category == "HR":
        return HR_QUESTIONS
    if category == "Behavioral":
        return BEHAVIORAL_QUESTIONS
    if category == "Aptitude":
        return APTITUDE_QUESTIONS
    return TECHNICAL_QUESTIONS.get(normalize_domain(domain), TECHNICAL_QUESTIONS["general"])


def _norm_text(text: str) -> str:
    """Loose match key for de-duplication — case/whitespace-insensitive
    so 'What is REST?' and 'what is rest?' are treated as the same
    question even if punctuation/casing differs slightly."""
    return " ".join((text or "").lower().split())


def pick_questions(
    category: str,
    difficulty: str,
    domain: Optional[str],
    count: int,
    exclude_texts: Optional[set[str]] = None,
) -> list[GeneratedQuestion]:
    """Pulls `count` questions for a single category/difficulty/domain
    combination, filling in from adjacent difficulty tiers if the
    primary pool runs short (keeps output count consistent).

    `exclude_texts` (normalized question text) is used to skip
    anything this candidate has already been asked before, so the
    bank doesn't repeat the same set every time a new session is
    generated — the pool is small (5 per bucket), so without this a
    candidate sees the exact same questions almost immediately.
    Exclusions are dropped (not enforced) only as an absolute last
    resort, once every bucket is exhausted, so `count` is still met
    rather than returning fewer questions than asked for."""
    excluded = exclude_texts or set()
    bank = _bank_for(category, domain)

    def fresh_pool(*diffs: str) -> list[str]:
        pool: list[str] = []
        for d in diffs:
            pool.extend(bank.get(d, []))
        random.shuffle(pool)
        return [t for t in pool if _norm_text(t) not in excluded]

    picked = fresh_pool(difficulty)[:count]

    if len(picked) < count:
        other_diffs = [d for d in VALID_DIFFICULTIES if d != difficulty]
        needed = count - len(picked)
        picked += fresh_pool(*other_diffs)[:needed]

    if len(picked) < count:
        # Every unseen question in this bucket is used up — repeat
        # rather than short-change the requested count.
        all_texts = list(bank.get(difficulty, [])) + [
            t for d in VALID_DIFFICULTIES if d != difficulty for t in bank.get(d, [])
        ]
        random.shuffle(all_texts)
        needed = count - len(picked)
        picked += all_texts[:needed]

    return [
        {"text": text, "category": category, "difficulty": difficulty, "keywords": []} for text in picked
    ]


def _generate_for_category(
    category: str,
    difficulty: str,
    domain: Optional[str],
    count: int,
    interview_type: Optional[str],
    use_ai: bool,
    exclude_texts: Optional[set[str]] = None,
) -> list[GeneratedQuestion]:
    """Tries the LLM provider chain first (fresh, non-repetitive
    questions); falls back to the curated bank — in full, or to top
    up a short AI response — so output count is always satisfied even
    with zero API keys / no internet / Ollama not running."""
    if category == "Aptitude":
        # Aptitude is always asked as MCQs, graded deterministically
        # (1 mark correct / 0 wrong) — never routed through the AI/open-
        # text path, since a free-form AI-written question wouldn't
        # have a single gradable correct option.
        return pick_mcq_questions(difficulty, count, exclude_texts)

    if use_ai:
        try:
            ai_questions = ai_providers.generate_questions_llm(
                interview_type=interview_type or category,
                category=category,
                difficulty=difficulty,
                domain=domain,
                count=count,
                exclude_texts=exclude_texts,
            )
        except Exception:
            ai_questions = None

        if ai_questions:
            # Belt-and-braces: drop anything the AI returned that
            # matches an already-asked question despite the prompt
            # instruction, then top up from the bank if that leaves us short.
            excluded = exclude_texts or set()
            ai_questions = [q for q in ai_questions if _norm_text(q["text"]) not in excluded]
            if len(ai_questions) < count:
                ai_questions = ai_questions + pick_questions(
                    category, difficulty, domain, count - len(ai_questions), exclude_texts
                )
            return ai_questions[:count]

    return pick_questions(category, difficulty, domain, count, exclude_texts)


def generate_questions(
    category: str,
    difficulty: str = "medium",
    domain: Optional[str] = None,
    count: int = 5,
    interview_type: Optional[str] = None,
    use_ai: bool = True,
    exclude_texts: Optional[set[str]] = None,
) -> list[GeneratedQuestion]:
    safe_difficulty = difficulty if difficulty in VALID_DIFFICULTIES else "medium"
    safe_count = max(1, min(int(count or 5), 20))

    if category == "Mixed":
        per_category = max(1, safe_count // len(VALID_CATEGORIES))
        questions: list[GeneratedQuestion] = []
        for cat in VALID_CATEGORIES:
            questions.extend(
                _generate_for_category(
                    cat, safe_difficulty, domain, per_category, interview_type, use_ai, exclude_texts
                )
            )
        while len(questions) < safe_count:
            questions.extend(
                _generate_for_category(
                    "HR", safe_difficulty, domain, 1, interview_type, use_ai, exclude_texts
                )
            )
        random.shuffle(questions)
        questions = questions[:safe_count]
    else:
        safe_category = category if category in VALID_CATEGORIES else "Technical"
        questions = _generate_for_category(
            safe_category, safe_difficulty, domain, safe_count, interview_type, use_ai, exclude_texts
        )

    # Coding round: every generated session gets exactly one auto-graded
    # coding question worth 10 marks (>=3 test cases), appended after
    # the requested question set — a separate round on top of it, not
    # eating into questionCount.
    questions.append(pick_coding_question(exclude_texts))
    return questions


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def generate_assessment() -> dict:
    """Simulated scoring for an instantly-completed mock interview —
    matches generateAssessment() in aiEngine.js so scores/feedback
    bands feel consistent across both services."""
    base = random.randint(60, 97)

    skill_communication = _clamp(base + random.randint(-8, 8), 40, 100)
    skill_technical = _clamp(base + random.randint(-10, 10), 40, 100)
    skill_confidence = _clamp(base + random.randint(-8, 8), 40, 100)
    skill_problem_solving = _clamp(base + random.randint(-10, 10), 40, 100)

    score = _clamp(
        round(
            (skill_communication + skill_technical + skill_confidence + skill_problem_solving)
            / 4
        ),
        0,
        100,
    )

    if score >= 90:
        band = "excellent"
    elif score >= 80:
        band = "strong"
    elif score >= 65:
        band = "solid"
    else:
        band = "developing"

    feedback_by_band = {
        "excellent": "Outstanding performance — clear, structured answers with strong technical "
        "depth and confident delivery. Ready for real interviews.",
        "strong": "Strong performance overall. Communication and technical answers were solid; "
        "tightening up a few edge-case explanations will push this even higher.",
        "solid": "A solid attempt with room to grow — focus on structuring answers more clearly "
        "and backing up claims with concrete examples.",
        "developing": "Good starting point. Prioritize practicing core concepts out loud and slow "
        "down under pressure to reduce filler and hesitation.",
    }

    return {
        "score": score,
        "skill_communication": skill_communication,
        "skill_technical": skill_technical,
        "skill_confidence": skill_confidence,
        "skill_problem_solving": skill_problem_solving,
        "ai_feedback": feedback_by_band[band],
    }
