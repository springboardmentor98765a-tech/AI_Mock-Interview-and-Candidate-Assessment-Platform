import random

QUESTION_BANK = {
    "hr": {
        "easy": [
            {"text": "Tell me about yourself.", "category": "Introduction"},
            {"text": "Why do you want to work for this company?", "category": "Motivation"},
            {"text": "What are your strengths?", "category": "Self-Assessment"},
            {"text": "Where do you see yourself in 5 years?", "category": "Career Goals"},
            {"text": "Why are you leaving your current job?", "category": "Motivation"},
            {"text": "What motivates you at work?", "category": "Motivation"},
            {"text": "Describe your ideal work environment.", "category": "Culture Fit"},
            {"text": "What do you know about our company?", "category": "Research"},
        ],
        "medium": [
            {"text": "Tell me about a time you had to deal with a difficult coworker.", "category": "Conflict Resolution"},
            {"text": "How do you handle pressure or stressful situations?", "category": "Stress Management"},
            {"text": "What is your greatest professional achievement?", "category": "Achievement"},
            {"text": "Describe a situation where you showed leadership.", "category": "Leadership"},
            {"text": "How do you prioritize your work when you have multiple deadlines?", "category": "Time Management"},
            {"text": "What would your previous manager say about you?", "category": "Self-Assessment"},
            {"text": "How do you handle receiving constructive criticism?", "category": "Feedback"},
            {"text": "Describe a time you went above and beyond at work.", "category": "Initiative"},
        ],
        "hard": [
            {"text": "Tell me about a time you failed. What did you learn from it?", "category": "Resilience"},
            {"text": "How would you handle a situation where you disagree with your manager's decision?", "category": "Conflict Resolution"},
            {"text": "Describe a time you had to make a difficult decision with limited information.", "category": "Decision Making"},
            {"text": "How do you approach building relationships with stakeholders who are resistant to your ideas?", "category": "Influence"},
            {"text": "Tell me about a time you had to adapt to a major change at work.", "category": "Adaptability"},
            {"text": "How do you ensure diversity and inclusion in your work?", "category": "DEI"},
            {"text": "Describe a situation where you had to manage competing priorities from different stakeholders.", "category": "Stakeholder Management"},
        ],
    },
    "technical": {
        "easy": [
            {"text": "What is the difference between an array and a linked list?", "category": "Data Structures"},
            {"text": "Explain what a REST API is.", "category": "Web Development"},
            {"text": "What is version control and why is it important?", "category": "Software Engineering"},
            {"text": "What is the difference between SQL and NoSQL databases?", "category": "Databases"},
            {"text": "Explain the concept of OOP with examples.", "category": "Programming"},
            {"text": "What is a closure in JavaScript?", "category": "Programming"},
            {"text": "What is the difference between GET and POST HTTP methods?", "category": "Web Development"},
            {"text": "Explain what Docker is and why it is used.", "category": "DevOps"},
        ],
        "medium": [
            {"text": "Explain the difference between a stack and a queue. When would you use each?", "category": "Data Structures"},
            {"text": "What is Big O notation? Explain with examples.", "category": "Algorithms"},
            {"text": "How does a hash table work? What are collision resolution strategies?", "category": "Data Structures"},
            {"text": "Explain the SOLID principles in software design.", "category": "Software Engineering"},
            {"text": "What is database indexing and how does it improve performance?", "category": "Databases"},
            {"text": "Explain the difference between process and thread.", "category": "Operating Systems"},
            {"text": "What is a microservices architecture? What are its pros and cons?", "category": "System Design"},
            {"text": "How does HTTPS work? Explain the TLS handshake.", "category": "Networking"},
        ],
        "hard": [
            {"text": "Design a URL shortening service like bit.ly. Explain your approach.", "category": "System Design"},
            {"text": "How would you design a distributed caching system?", "category": "System Design"},
            {"text": "Explain the CAP theorem and its implications for distributed systems.", "category": "System Design"},
            {"text": "How would you optimize a slow database query that runs on millions of rows?", "category": "Databases"},
            {"text": "Design a real-time chat application. What technologies and patterns would you use?", "category": "System Design"},
            {"text": "Explain how garbage collection works in Java/Python. What are the different strategies?", "category": "Programming"},
            {"text": "How would you implement a rate limiter for an API?", "category": "System Design"},
            {"text": "Explain eventual consistency vs strong consistency with real-world examples.", "category": "Distributed Systems"},
        ],
    },
    "behavioral": {
        "easy": [
            {"text": "Describe a time when you worked successfully in a team.", "category": "Teamwork"},
            {"text": "Tell me about a time you learned something new quickly.", "category": "Learning Agility"},
            {"text": "How do you organize your day-to-day tasks?", "category": "Organization"},
            {"text": "Describe a situation where you helped a colleague.", "category": "Teamwork"},
            {"text": "What do you do when you make a mistake at work?", "category": "Accountability"},
            {"text": "Tell me about a time you received positive feedback.", "category": "Achievement"},
        ],
        "medium": [
            {"text": "Tell me about a time you had to deal with a difficult team member.", "category": "Conflict Resolution"},
            {"text": "Describe a situation where you had to meet a tight deadline.", "category": "Time Management"},
            {"text": "Give an example of a time you showed initiative.", "category": "Initiative"},
            {"text": "Tell me about a time you had to persuade someone to see things your way.", "category": "Influence"},
            {"text": "Describe a time when you had to learn a new skill for a project.", "category": "Adaptability"},
            {"text": "Tell me about a time you had to give someone difficult feedback.", "category": "Communication"},
            {"text": "Describe a situation where you had to manage conflicting priorities.", "category": "Prioritization"},
        ],
        "hard": [
            {"text": "Tell me about a time you led a project that failed. What happened and what did you learn?", "category": "Leadership"},
            {"text": "Describe a situation where you had to make an unpopular decision.", "category": "Decision Making"},
            {"text": "Tell me about a time you had to navigate office politics to get something done.", "category": "Influence"},
            {"text": "Describe a time when you had to deliver bad news to a client or stakeholder.", "category": "Communication"},
            {"text": "Tell me about a time you had to manage a project with unclear requirements.", "category": "Problem Solving"},
            {"text": "Describe a situation where you had to balance quality with speed.", "category": "Trade-offs"},
            {"text": "Tell me about a time you had to champion a change that others resisted.", "category": "Change Management"},
        ],
    },
    "aptitude": {
        "easy": [
            {"text": "If a train travels at 60 km/h, how long will it take to travel 240 km?", "category": "Quantitative"},
            {"text": "What comes next in the sequence: 2, 4, 8, 16, __?", "category": "Logical Reasoning"},
            {"text": "If 30% of a number is 45, what is the number?", "category": "Quantitative"},
            {"text": "A is twice as old as B. If B is 10 years old, how old is A?", "category": "Quantitative"},
            {"text": "Which word is the odd one out: Apple, Banana, Carrot, Mango?", "category": "Verbal Reasoning"},
            {"text": "If you rearrange the letters 'CIFAIPC', you get the name of a/an:", "category": "Verbal Reasoning"},
        ],
        "medium": [
            {"text": "A shop offers 20% discount on a product marked at $500. What is the selling price?", "category": "Quantitative"},
            {"text": "If 5 machines can produce 5 widgets in 5 minutes, how long would 100 machines take to produce 100 widgets?", "category": "Logical Reasoning"},
            {"text": "Find the missing number: 3, 7, 15, 31, __", "category": "Logical Reasoning"},
            {"text": "A car travels from city A to B at 40 km/h and returns at 60 km/h. What is the average speed?", "category": "Quantitative"},
            {"text": "If FRIEND is coded as HUMJTK, how is CANDLE coded?", "category": "Coding-Decoding"},
            {"text": "Two pipes can fill a tank in 10 and 15 hours respectively. How long to fill together?", "category": "Quantitative"},
            {"text": "What is the probability of getting at least one head when flipping 3 coins?", "category": "Probability"},
        ],
        "hard": [
            {"text": "A man walks at 5 km/h for 6 hours and then at 4 km/h for 8 hours. What is his average speed?", "category": "Quantitative"},
            {"text": "If the ratio of the ages of A and B is 3:5 and the sum of their ages is 48, find their ages.", "category": "Quantitative"},
            {"text": "In a group of 100 people, 60 like tea, 50 like coffee, and 20 like both. How many like neither?", "category": "Set Theory"},
            {"text": "A clock shows 3:15. What is the angle between the hour and minute hands?", "category": "Logical Reasoning"},
            {"text": "If log2(x) + log2(x-2) = 3, find x.", "category": "Quantitative"},
            {"text": "Three dice are thrown. What is the probability that all show the same number?", "category": "Probability"},
            {"text": "A boat travels 20 km upstream in 5 hours and 20 km downstream in 2 hours. Find the speed of the current.", "category": "Quantitative"},
        ],
    },
}

DOMAIN_QUESTIONS = {
    "computer science": {
        "technical": [
            {"text": "Explain the difference between TCP and UDP protocols.", "category": "Networking", "difficulty": "medium"},
            {"text": "What is a binary search tree? Explain its operations.", "category": "Data Structures", "difficulty": "medium"},
            {"text": "How does virtual memory work in an operating system?", "category": "Operating Systems", "difficulty": "hard"},
            {"text": "What is the difference between concurrency and parallelism?", "category": "Operating Systems", "difficulty": "medium"},
            {"text": "Explain the concept of dynamic programming with an example.", "category": "Algorithms", "difficulty": "hard"},
        ],
    },
    "data science": {
        "technical": [
            {"text": "What is the difference between supervised and unsupervised learning?", "category": "Machine Learning", "difficulty": "easy"},
            {"text": "Explain the bias-variance tradeoff.", "category": "Machine Learning", "difficulty": "medium"},
            {"text": "What is cross-validation and why is it used?", "category": "Machine Learning", "difficulty": "medium"},
            {"text": "How do you handle missing data in a dataset?", "category": "Data Processing", "difficulty": "medium"},
            {"text": "Explain the difference between L1 and L2 regularization.", "category": "Machine Learning", "difficulty": "hard"},
        ],
    },
    "web development": {
        "technical": [
            {"text": "Explain the box model in CSS.", "category": "Frontend", "difficulty": "easy"},
            {"text": "What is the virtual DOM and how does it improve performance?", "category": "Frontend", "difficulty": "medium"},
            {"text": "Explain the difference between authentication and authorization.", "category": "Security", "difficulty": "medium"},
            {"text": "What are web sockets and how do they differ from HTTP?", "category": "Networking", "difficulty": "medium"},
            {"text": "How would you implement server-side rendering (SSR)?", "category": "Architecture", "difficulty": "hard"},
        ],
    },
    "cybersecurity": {
        "technical": [
            {"text": "What is a SQL injection attack and how can it be prevented?", "category": "Security", "difficulty": "easy"},
            {"text": "Explain the difference between symmetric and asymmetric encryption.", "category": "Cryptography", "difficulty": "medium"},
            {"text": "What is a man-in-the-middle attack?", "category": "Security", "difficulty": "medium"},
            {"text": "How does two-factor authentication improve security?", "category": "Security", "difficulty": "easy"},
            {"text": "Explain the concept of zero-trust architecture.", "category": "Security", "difficulty": "hard"},
        ],
    },
    "cloud computing": {
        "technical": [
            {"text": "What is the difference between IaaS, PaaS, and SaaS?", "category": "Cloud Concepts", "difficulty": "easy"},
            {"text": "Explain auto-scaling and its benefits.", "category": "Cloud Architecture", "difficulty": "medium"},
            {"text": "What is a container orchestration tool? Give examples.", "category": "DevOps", "difficulty": "medium"},
            {"text": "How does load balancing work in a cloud environment?", "category": "Cloud Architecture", "difficulty": "medium"},
            {"text": "Explain the concept of serverless computing.", "category": "Cloud Architecture", "difficulty": "hard"},
        ],
    },
}


def _skill_questions(skills: list[str], difficulty: str) -> list[dict]:
    """Create targeted technical prompts from resume skills supplied by the client."""
    templates = {
        "easy": "What is {skill}, and where have you used it?",
        "medium": "Describe a project where you used {skill}. What trade-offs did you make?",
        "hard": "Design a production-ready solution using {skill}. How would you handle scale, failures, and testing?",
    }
    seen = set()
    questions = []
    for raw_skill in skills:
        skill = " ".join(raw_skill.split())
        key = skill.casefold()
        if not skill or key in seen:
            continue
        seen.add(key)
        questions.append({
            "text": templates[difficulty].format(skill=skill),
            "category": skill,
            "difficulty": difficulty,
        })
    return questions


def generate_questions(
    interview_type: str,
    difficulty: str = "medium",
    domain: str = None,
    num_questions: int = 5,
    skills: list[str] | None = None,
) -> list:
    questions = []
    interview_type = interview_type.lower()
    difficulty = difficulty.lower()

    type_key = interview_type
    if interview_type in ("hr", "human_resources"):
        type_key = "hr"
    elif interview_type in ("tech", "technical"):
        type_key = "technical"
    elif interview_type in ("behavioural", "behavioral"):
        type_key = "behavioral"
    elif interview_type in ("aptitude", "quantitative"):
        type_key = "aptitude"

    available = []
    # Resume skills are most useful for technical interviews.  They are placed
    # first so a generated session is personalized instead of merely random.
    if type_key == "technical" and skills:
        available.extend(_skill_questions(skills, difficulty))
    if type_key in QUESTION_BANK:
        if difficulty in QUESTION_BANK[type_key]:
            available.extend(QUESTION_BANK[type_key][difficulty])
        for diff in ["easy", "medium", "hard"]:
            if diff != difficulty and diff in QUESTION_BANK[type_key]:
                available.extend(QUESTION_BANK[type_key][diff])

    if domain and type_key == "technical":
        domain_lower = domain.lower()
        for domain_key in DOMAIN_QUESTIONS:
            if domain_key in domain_lower or domain_lower in domain_key:
                if "technical" in DOMAIN_QUESTIONS[domain_key]:
                    available.extend(DOMAIN_QUESTIONS[domain_key]["technical"])
                break

    if not available and type_key in QUESTION_BANK:
        for diff in QUESTION_BANK[type_key]:
            available.extend(QUESTION_BANK[type_key][diff])

    if not available:
        available = QUESTION_BANK.get("hr", {}).get("medium", [])

    # Keep personalized prompts stable at the start of the interview, but mix
    # the remaining bank questions so repeated sessions are not identical.
    personalized_count = len(available) if type_key == "technical" and skills else 0
    personalized = available[:personalized_count]
    remainder = available[personalized_count:]
    random.shuffle(remainder)
    selected = (personalized + remainder)[:num_questions]

    for i, q in enumerate(selected):
        questions.append({
            "question_text": q["text"],
            "category": q.get("category", type_key.title()),
            "difficulty": q.get("difficulty", difficulty),
            "sequence_no": i + 1,
        })

    return questions
