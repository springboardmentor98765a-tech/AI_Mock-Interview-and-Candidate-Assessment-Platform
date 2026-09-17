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


HR_QUESTIONS = {
    "easy": [
        "Tell me about yourself.",
        "Why do you want to work with us?",
        "What are your strengths and weaknesses?",
        "Where do you see yourself in five years?",
        "Why are you looking to leave your current role?",
        "What do you know about our company?",
        "Why should we hire you?",
        "What does a typical day at your last job look like?",
        "What are you passionate about outside of work?",
        "How would your previous manager describe you?",
    ],
    "medium": [
        "What motivates you to do your best work?",
        "How do you handle constructive criticism?",
        "Describe your ideal work environment.",
        "What are your salary expectations for this role?",
        "How do you prioritize tasks when everything feels urgent?",
        "How do you handle repetitive or tedious work?",
        "What's a professional accomplishment you're most proud of?",
        "How do you stay current in your field?",
        "Describe how you handle working under a tight deadline.",
        "What would you do in your first 90 days in this role?",
    ],
    "hard": [
        "Tell me about a time you disagreed with a manager and how you handled it.",
        "Describe a situation where you had to make an unpopular decision.",
        "How would you handle being asked to do something you believe is unethical?",
        "What would you do if you found out a close teammate was underperforming badly?",
        "How do you decide when to walk away from a job offer?",
        "Tell me about a time you had to deliver bad news to a stakeholder.",
        "Describe a time your judgment was questioned by someone senior to you.",
        "How would you handle discovering a serious mistake after a project shipped?",
        "Tell me about a time you had to say no to a request from leadership.",
        "How do you approach a role where the expectations are unclear or shifting?",
    ],
}

BEHAVIORAL_QUESTIONS = {
    "easy": [
        "Describe a time you worked successfully as part of a team.",
        "Tell me about a goal you set and how you achieved it.",
        "Give an example of when you had to learn something new quickly.",
        "Describe a time you helped a colleague solve a problem.",
        "Tell me about a project you are proud of.",
        "Describe a time you had to work with someone whose style was different from yours.",
        "Tell me about a time you asked for help.",
        "Give an example of a time you managed your time well under a deadline.",
        "Describe a time you had to explain something technical to a non-technical person.",
        "Tell me about a time you received positive feedback that meant a lot to you.",
    ],
    "medium": [
        "Describe a time you missed a deadline. What happened and what did you learn?",
        "Tell me about a time you had to adapt to a significant change at work.",
        "Give an example of when you took initiative without being asked.",
        "Describe a conflict with a coworker and how you resolved it.",
        "Tell me about a time you received difficult feedback and how you responded.",
        "Describe a time you had to persuade someone to see things your way.",
        "Tell me about a time you juggled multiple projects at once.",
        "Give an example of a time you caught a mistake before it became a problem.",
        "Describe a time you had to work with incomplete information.",
        "Tell me about a time a plan you made didn't work out.",
    ],
    "hard": [
        "Describe the most complex problem you have solved and your approach to it.",
        "Tell me about a time you had to influence someone without formal authority.",
        "Describe a time you failed at something important. How did you recover?",
        "Tell me about a time you had to manage competing priorities under pressure with limited resources.",
        "Describe a situation where you had to lead a team through ambiguity.",
        "Tell me about a time you had to make a decision with significant consequences and little time to think.",
        "Describe a time you had to rebuild trust with a team or stakeholder after a setback.",
        "Tell me about a time you had to challenge the status quo on a team.",
        "Describe how you've handled a situation where two priorities were both genuinely urgent.",
        "Tell me about a time you had to mentor or coach someone who was struggling.",
    ],
}

APTITUDE_QUESTIONS = {
    "easy": [
        "If a train travels 60 km in 1.5 hours, what is its average speed?",
        "What is 15% of 200?",
        "Find the next number in the series: 2, 4, 6, 8, __",
        "A shirt costs $40 after a 20% discount. What was the original price?",
        "If today is Monday, what day will it be after 17 days?",
        "A dozen eggs cost $3.60. What is the cost of one egg?",
        "What is the average of 12, 18, 24, and 30?",
        "If a book is on sale for 25% off its $80 price, what is the sale price?",
        "Find the missing number: 5, 10, 20, 40, __",
        "A car covers 150 km using 10 liters of fuel. What is its mileage per liter?",
    ],
    "medium": [
        "Two pipes can fill a tank in 6 and 8 hours respectively. How long will both take together?",
        "A is twice as old as B. In 10 years, A will be 1.5 times as old as B. Find their current ages.",
        "If the ratio of boys to girls in a class is 3:2 and there are 30 students, how many are girls?",
        "A sum of money doubles itself in 8 years at simple interest. Find the rate of interest.",
        "Find the missing number: 3, 7, 15, 31, __",
        "A train 150m long crosses a pole in 15 seconds. Find its speed in km/h.",
        "If 8 workers can complete a task in 20 days, how many days will 10 workers take?",
        "The average of 5 numbers is 20. If one number is removed, the average becomes 18. Find the removed number.",
        "A mixture contains milk and water in the ratio 4:1. If 5 liters of water is added, the ratio becomes 4:3. Find the initial quantity of milk.",
        "Find the odd one out: 8, 27, 64, 100, 125.",
    ],
    "hard": [
        "A boat travels 30 km upstream in 6 hours and returns downstream in 3 hours. Find the speed of the boat in still water.",
        "In how many ways can 5 people be seated in a row such that two specific people always sit together?",
        "A dice is rolled twice. What is the probability that the sum of the two rolls is greater than 9?",
        "A works twice as fast as B. Together they finish a job in 12 days. How long would B alone take?",
        "Three numbers are in the ratio 2:3:5 and their sum is 200. Find the largest number.",
        "A can do a piece of work in 10 days, B in 15 days. They work together for 4 days, then A leaves. How many more days does B need to finish?",
        "A sum of $12,000 is invested at 10% compound interest annually. Find the amount after 2 years.",
        "In a group of 60 people, 25 like tea, 20 like coffee, and 10 like both. How many like neither?",
        "A clock shows 3:15. What is the angle between the hour and minute hands?",
        "The sum of two numbers is 25 and their product is 144. Find the difference between the numbers.",
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
            "What is the difference between method overloading and overriding?",
            "What is the purpose of the 'static' keyword in Java?",
            "What is an interface, and why would you use one?",
            "What is autoboxing and unboxing in Java?",
            "What is the difference between checked and unchecked exceptions?",
        ],
        "medium": [
            "Explain the difference between abstract classes and interfaces in Java.",
            'What is the purpose of the "final" keyword and where can it be used?',
            "How does exception handling work in Java (try/catch/finally)?",
            "Explain how HashMap works internally in Java.",
            "What is multithreading, and how do you create a thread in Java?",
            "What is the difference between fail-fast and fail-safe iterators?",
            "Explain the difference between composition and inheritance in Java.",
            "How does the Comparable interface differ from Comparator?",
            "What is dependency injection, and how is it used in Spring?",
            "Explain the difference between deep copy and shallow copy of objects.",
        ],
        "hard": [
            "Explain the Java memory model and how garbage collection works.",
            "How would you design a thread-safe singleton in Java?",
            "Explain the differences between synchronized blocks and java.util.concurrent locks.",
            "How does the JVM optimize code at runtime (JIT compilation)?",
            "Design a rate limiter using Java concurrency primitives.",
            "How would you diagnose a memory leak in a long-running Java service?",
            "Explain how the ForkJoinPool works and when you'd use it.",
            "Design a thread-safe LRU cache in Java.",
            "How would you handle backpressure in a Java-based streaming pipeline?",
            "Explain the trade-offs between different Java garbage collectors (G1, ZGC, etc).",
        ],
    },
    "python": {
        "easy": [
            "What is the difference between a list and a tuple in Python?",
            "What are Python decorators used for?",
            "How does Python manage memory?",
            'What is the difference between "is" and "==" in Python?',
            "What are *args and **kwargs used for?",
            "What is the difference between a shallow and deep copy in Python?",
            "What is a Python virtual environment, and why use one?",
            "What is the difference between a module and a package?",
            "How do you handle exceptions in Python?",
            "What are Python's built-in data types?",
        ],
        "medium": [
            "Explain Python's Global Interpreter Lock (GIL) and its impact on multithreading.",
            "What is the difference between a generator and a list comprehension?",
            'How do context managers (the "with" statement) work in Python?',
            "Explain shallow copy vs deep copy in Python.",
            "How would you handle circular imports in a Python project?",
            "What is the difference between @staticmethod and @classmethod?",
            "How does Python's garbage collector reference-count objects?",
            "Explain how Python's `__slots__` can improve memory usage.",
            "What is the difference between multiprocessing and multithreading in Python?",
            "How would you profile and optimize a slow Python function?",
        ],
        "hard": [
            "How would you optimize a Python application that is CPU-bound?",
            "Explain how Python's asyncio event loop works.",
            "Design a caching decorator with configurable expiry in Python.",
            "How does Python's garbage collector handle reference cycles?",
            "Explain metaclasses in Python and a real use case for them.",
            "How would you design a plugin system using Python's import machinery?",
            "Explain the descriptor protocol and where it's used in Python internals.",
            "How would you build a rate-limited async HTTP client in Python?",
            "Design a distributed task queue using Python (conceptually).",
            "How would you debug a Python service that intermittently deadlocks?",
        ],
    },
    "frontend": {
        "easy": [
            "What is the difference between HTML, CSS, and JavaScript?",
            "What is the DOM, and how does JavaScript interact with it?",
            'What is the difference between "let", "const", and "var"?',
            "What is responsive design, and how do you achieve it?",
            "What is the box model in CSS?",
            "What is the difference between == and === in JavaScript?",
            "What is a callback function in JavaScript?",
            "What is the difference between inline, internal, and external CSS?",
            "What is semantic HTML, and why does it matter?",
            "What is the difference between a class and an id selector in CSS?",
        ],
        "medium": [
            "Explain the difference between client-side and server-side rendering.",
            "What is the virtual DOM, and how does it improve performance?",
            "How does event delegation work in JavaScript?",
            "What are Promises, and how do they differ from callbacks?",
            "How would you optimize the load time of a web page?",
            "Explain closures in JavaScript with an example use case.",
            "What is the difference between flexbox and CSS grid?",
            "How does React's reconciliation algorithm decide what to re-render?",
            "What is CORS, and why does it exist?",
            "Explain debouncing and throttling and when you'd use each.",
        ],
        "hard": [
            "Design a component architecture for a large, scalable single-page application.",
            "Explain how you would implement code-splitting and lazy loading in a React app.",
            "How would you diagnose and fix a memory leak in a front-end application?",
            "Explain the trade-offs between different state management approaches.",
            "How would you design a design system used across multiple product teams?",
            "How would you architect a micro-frontend setup for a large organization?",
            "Explain how you would implement optimistic UI updates safely.",
            "How would you design accessibility testing into a CI pipeline?",
            "Design a strategy for progressively migrating a legacy jQuery app to React.",
            "How would you profile and fix jank in a scroll-heavy interface?",
        ],
    },
    "data": {
        "easy": [
            "What is the difference between a primary key and a foreign key?",
            "What is the difference between mean, median, and mode?",
            "What is normalization in database design?",
            "What is the difference between SQL and NoSQL databases?",
            "What does a JOIN do in SQL?",
            "What is an index, and why does it speed up queries?",
            "What is the difference between a database and a data warehouse?",
            "What is the difference between structured and unstructured data?",
            "What is a GROUP BY clause used for in SQL?",
            "What is the difference between a view and a table in SQL?",
        ],
        "medium": [
            "Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN.",
            "How would you handle missing data in a dataset?",
            "What is the difference between correlation and causation?",
            "Explain overfitting and how to prevent it in a machine learning model.",
            "How would you design a data pipeline to process daily sales data?",
            "What is the difference between batch and stream processing?",
            "Explain the bias-variance tradeoff in machine learning.",
            "How would you choose between precision and recall for a given problem?",
            "What is feature engineering, and why does it matter?",
            "Explain how you would validate a machine learning model before deployment.",
        ],
        "hard": [
            "How would you design a data warehouse schema for a retail company?",
            "Explain how you would detect and handle outliers in a large dataset.",
            "How would you evaluate whether an A/B test result is statistically significant?",
            "Design an approach to build and maintain a real-time analytics dashboard.",
            "How would you optimize a slow-running SQL query on a multi-million row table?",
            "How would you design a schema to support both fast writes and fast analytical reads?",
            "Explain how you would build a data quality monitoring system for a pipeline.",
            "How would you design a recommendation system for an e-commerce platform?",
            "Explain how you would handle schema evolution in a large production data warehouse.",
            "How would you design an experimentation platform to run multiple A/B tests safely?",
        ],
    },
    "general": {
        "easy": [
            "What is the difference between a stack and a queue?",
            "What is Big-O notation, and why does it matter?",
            "What is version control, and why is Git useful?",
            "What is the difference between an array and a linked list?",
            "What does REST stand for, and what makes an API RESTful?",
            "What is the difference between synchronous and asynchronous code?",
            "What is a hash table, and how does it achieve fast lookups?",
            "What is the difference between a compiler and an interpreter?",
            "What is recursion, and what's a simple example of it?",
            "What is the difference between GET and POST HTTP methods?",
        ],
        "medium": [
            "Explain the difference between processes and threads.",
            "How would you design a URL-shortening service at a high level?",
            "What is database indexing, and how does it improve performance?",
            "Explain the difference between authentication and authorization.",
            "How do you approach debugging a production issue you can't reproduce locally?",
            "What is the CAP theorem, and what does it imply for distributed systems?",
            "Explain the difference between horizontal and vertical scaling.",
            "What is a race condition, and how would you prevent one?",
            "Explain the difference between SQL transactions' isolation levels.",
            "How would you design a basic caching layer for a web application?",
        ],
        "hard": [
            "Design a scalable notification system that supports email, SMS, and push.",
            "How would you design a system to handle millions of concurrent WebSocket connections?",
            "Explain how you would design a distributed rate limiter across multiple servers.",
            "Walk through how you would design a fault-tolerant job scheduling system.",
            "How would you design a system for real-time collaborative document editing?",
            "How would you design a globally distributed key-value store?",
            "Explain how you would design an idempotent payment processing system.",
            "How would you design a system to detect and prevent fraud in real time?",
            "Walk through designing a search autocomplete system at scale.",
            "How would you design a multi-region disaster recovery strategy for a critical service?",
        ],
    },
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


def pick_questions(
    category: str, difficulty: str, domain: Optional[str], count: int
) -> list[GeneratedQuestion]:
    """Pulls `count` questions for a single category/difficulty/domain
    combination, filling in from adjacent difficulty tiers if the
    primary pool runs short (keeps output count consistent)."""
    bank = _bank_for(category, domain)
    pool = list(bank[difficulty])
    random.shuffle(pool)
    picked = pool[:count]

    if len(picked) < count:
        extras: list[str] = []
        for d in VALID_DIFFICULTIES:
            if d != difficulty:
                extras.extend(bank.get(d, []))
        random.shuffle(extras)
        needed = count - len(picked)
        picked = picked + extras[:needed]

    return [{"text": text, "category": category, "difficulty": difficulty} for text in picked]


def _generate_for_category(
    category: str,
    difficulty: str,
    domain: Optional[str],
    count: int,
    interview_type: Optional[str],
    use_ai: bool,
) -> list[GeneratedQuestion]:
    """Tries the LLM provider chain first (fresh, non-repetitive
    questions); falls back to the curated bank — in full, or to top
    up a short AI response — so output count is always satisfied even
    with zero API keys / no internet / Ollama not running."""
    if use_ai:
        try:
            ai_questions = ai_providers.generate_questions_llm(
                interview_type=interview_type or category,
                category=category,
                difficulty=difficulty,
                domain=domain,
                count=count,
            )
        except Exception:
            ai_questions = None

        if ai_questions:
            if len(ai_questions) < count:
                ai_questions = ai_questions + pick_questions(
                    category, difficulty, domain, count - len(ai_questions)
                )
            return ai_questions[:count]

    return pick_questions(category, difficulty, domain, count)


def generate_questions(
    category: str,
    difficulty: str = "medium",
    domain: Optional[str] = None,
    count: int = 5,
    interview_type: Optional[str] = None,
    use_ai: bool = True,
) -> list[GeneratedQuestion]:
    safe_difficulty = difficulty if difficulty in VALID_DIFFICULTIES else "medium"
    safe_count = max(1, min(int(count or 5), 20))

    if category == "Mixed":
        per_category = max(1, safe_count // len(VALID_CATEGORIES))
        questions: list[GeneratedQuestion] = []
        for cat in VALID_CATEGORIES:
            questions.extend(
                _generate_for_category(cat, safe_difficulty, domain, per_category, interview_type, use_ai)
            )
        while len(questions) < safe_count:
            questions.extend(
                _generate_for_category("HR", safe_difficulty, domain, 1, interview_type, use_ai)
            )
        random.shuffle(questions)
        return questions[:safe_count]

    safe_category = category if category in VALID_CATEGORIES else "Technical"
    return _generate_for_category(safe_category, safe_difficulty, domain, safe_count, interview_type, use_ai)


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def generate_assessment() -> dict:
    """Simulated scoring for an instantly-completed mock interview —
    matches generateAssessment() in aiEngine.js so scores/feedback
    bands feel consistent across both services. Also the Module 7
    fallback used whenever the AI provider chain is unavailable for a
    real (answered) session — see scoring_engine.compute_score()."""
    base = random.randint(60, 97)

    skill_communication = _clamp(base + random.randint(-8, 8), 40, 100)
    skill_technical = _clamp(base + random.randint(-10, 10), 40, 100)
    skill_confidence = _clamp(base + random.randint(-8, 8), 40, 100)
    skill_problem_solving = _clamp(base + random.randint(-10, 10), 40, 100)
    skill_professionalism = _clamp(base + random.randint(-8, 8), 40, 100)

    # Module 7 overall formula: Communication 30 / Confidence 25 /
    # Technical Relevance 30 / Professionalism 15.
    score = _clamp(
        round(
            skill_communication * 0.30
            + skill_confidence * 0.25
            + skill_technical * 0.30
            + skill_professionalism * 0.15
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

    structured_feedback_by_band = {
        "excellent": {
            "strengths": ["Clear, well-structured answers", "Confident, decisive delivery", "Strong technical depth"],
            "weaknesses": ["Minor edge cases could be explored further"],
            "improvements": ["Keep refining answers for even the rare edge-case questions"],
            "practice_recommendations": ["Try a harder difficulty level to keep growing"],
            "learning_resources": ["Advanced system design or domain-specialization material"],
        },
        "strong": {
            "strengths": ["Solid communication", "Good technical grounding"],
            "weaknesses": ["A few answers could go deeper on specifics"],
            "improvements": ["Add concrete examples or numbers to back up claims"],
            "practice_recommendations": ["Practice 2-3 more mock sessions at the same difficulty"],
            "learning_resources": ["STAR-method structuring guides for behavioral answers"],
        },
        "solid": {
            "strengths": ["Made a genuine attempt at every question"],
            "weaknesses": ["Answer structure and depth were inconsistent"],
            "improvements": ["Structure answers with a clear beginning, middle, and end"],
            "practice_recommendations": ["Practice answering out loud, timing yourself"],
            "learning_resources": ["Core concept refreshers for this role's domain"],
        },
        "developing": {
            "strengths": ["Completed the interview end to end"],
            "weaknesses": ["Answers were short or hesitant in places"],
            "improvements": ["Slow down and organize thoughts before answering"],
            "practice_recommendations": ["Rehearse common questions for this role daily"],
            "learning_resources": ["Beginner-friendly interview-prep guides for this role"],
        },
    }

    return {
        "score": score,
        "skill_communication": skill_communication,
        "skill_technical": skill_technical,
        "skill_confidence": skill_confidence,
        "skill_problem_solving": skill_problem_solving,
        "skill_professionalism": skill_professionalism,
        "rating_label": _rating_label(score),
        "ai_feedback": feedback_by_band[band],
        "feedback": structured_feedback_by_band[band],
    }


def _rating_label(score: int) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 60:
        return "Average"
    if score >= 40:
        return "Needs Improvement"
    return "Poor"
