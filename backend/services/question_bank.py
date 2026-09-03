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
            {"text": "What makes you a good fit for this role?", "category": "Culture Fit"},
            {"text": "How did you hear about this position?", "category": "Introduction"},
            {"text": "Are you comfortable working remotely or in a hybrid environment?", "category": "Work Preference"},
            {"text": "What are your hobbies or interests outside of work?", "category": "Personal"},
            {"text": "What is your understanding of the job description for this role?", "category": "Job Alignment"},
            {"text": "How do you stay organized during a busy workday?", "category": "Work Habits"},
            {"text": "What are you looking for in your next role?", "category": "Career Goals"},
            {"text": "What do you think is the most important skill for this job?", "category": "Job Alignment"},
            {"text": "How do you define success in your career?", "category": "Values"},
            {"text": "Do you prefer working individually or as part of a team?", "category": "Teamwork"},
            {"text": "What are three words your friends would use to describe you?", "category": "Self-Assessment"},
            {"text": "How do you keep yourself motivated during repetitive tasks?", "category": "Motivation"},
            {"text": "What is your greatest weakness, and how are you working on it?", "category": "Self-Assessment"},
            {"text": "Are you willing to travel or relocate if required?", "category": "Flexibility"},
            {"text": "How do you handle transitions or changes in routine?", "category": "Adaptability"},
            {"text": "What is your proudest non-work achievement?", "category": "Values"},
            {"text": "What kind of office culture helps you thrive?", "category": "Culture Fit"},
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
            {"text": "How do you handle a situation where you disagree with a teammate?", "category": "Conflict Resolution"},
            {"text": "What are your salary expectations and how do you justify them?", "category": "Negotiation"},
            {"text": "Explain a time when you had to learn a complex topic in a short period.", "category": "Learning Agility"},
            {"text": "What is your preferred management style in a supervisor?", "category": "Work Preference"},
            {"text": "How do you handle interruptions or sudden changes in your schedule?", "category": "Adaptability"},
            {"text": "Describe a time when you had to manage a project with minimal supervision.", "category": "Independence"},
            {"text": "What has been the most challenging project of your career so far?", "category": "Problem Solving"},
            {"text": "Tell me about a time you had to work with a client who was unhappy with your service.", "category": "Customer Support"},
            {"text": "How do you handle situations where a team member is not contributing their fair share?", "category": "Teamwork"},
            {"text": "Describe a time you had to change your communication style to work with a colleague.", "category": "Communication"},
            {"text": "How do you keep yourself updated with trends in your industry?", "category": "Professional Development"},
            {"text": "Describe a time when you had to pitch a new idea to a group of colleagues.", "category": "Influence"},
            {"text": "What is your approach to handling conflicts of interest in the workplace?", "category": "Ethics"},
            {"text": "Describe a situation where you had to manage a project with a very tight budget.", "category": "Resource Management"},
            {"text": "How do you ensure you maintain a healthy work-life balance?", "category": "Wellbeing"},
            {"text": "Describe a time you had to coordinate with a cross-functional team.", "category": "Collaboration"},
        ],
        "hard": [
            {"text": "Tell me about a time you failed. What did you learn from it?", "category": "Resilience"},
            {"text": "How would you handle a situation where you disagree with your manager's decision?", "category": "Conflict Resolution"},
            {"text": "Describe a time you had to make a difficult decision with limited information.", "category": "Decision Making"},
            {"text": "How do you approach building relationships with stakeholders who are resistant to your ideas?", "category": "Influence"},
            {"text": "Tell me about a time you had to adapt to a major change at work.", "category": "Adaptability"},
            {"text": "How do you ensure diversity and inclusion in your work?", "category": "DEI"},
            {"text": "Describe a situation where you had to manage competing priorities from different stakeholders.", "category": "Stakeholder Management"},
            {"text": "How would you handle a situation where a project is failing due to factors outside your control?", "category": "Crisis Management"},
            {"text": "What would you do if you realized you made a critical error in a report after submitting it?", "category": "Accountability"},
            {"text": "Describe a time you had to lead a team through a period of low morale or high stress.", "category": "Leadership under Pressure"},
            {"text": "How do you handle ethical dilemmas or situations that compromise compliance standards in the workplace?", "category": "Ethics & Integrity"},
            {"text": "How would you pitch this company's product to a highly skeptical potential client?", "category": "Strategic Thinking"},
            {"text": "Tell me about a time you had to deliver bad news to a client or senior management. How did you handle it?", "category": "Difficult Communication"},
            {"text": "How would you design a remediation plan for a team that has consistently missed performance targets?", "category": "Strategic Leadership"},
            {"text": "Describe a situation where you had to navigate overlapping compliance or regulatory rules in your projects.", "category": "Compliance"},
            {"text": "How do you maintain focus and long-term vision during massive organizational restructuring?", "category": "Resilience"},
            {"text": "Tell me about a time you had to lead a task force to solve a critical, business-stopping issue.", "category": "Crisis Management"},
            {"text": "Describe a time you had to fire a team member or deliver highly negative performance reviews.", "category": "Management"},
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
            {"text": "What is the purpose of database normalization?", "category": "Databases"},
            {"text": "Explain the difference between compiler and interpreter.", "category": "Computer Systems"},
            {"text": "What is the function of a primary key in a relational database table?", "category": "Databases"},
            {"text": "What are semantic HTML tags and why are they used?", "category": "Frontend"},
            {"text": "What is JSON and how is it used in API communication?", "category": "Web Services"},
            {"text": "What is a git merge conflict and how do you resolve it?", "category": "Tooling"},
            {"text": "What is the difference between client-side and server-side scripting?", "category": "Programming"},
            {"text": "What is the role of DNS in web requests?", "category": "Networking"},
            {"text": "Explain the difference between local storage, session storage, and cookies.", "category": "Frontend"},
            {"text": "What is the purpose of a database foreign key?", "category": "Databases"},
            {"text": "Explain the differences between let, const, and var in JavaScript.", "category": "Programming"},
            {"text": "What is responsive design and how do media queries achieve it?", "category": "Frontend"},
            {"text": "What is a deadlock in database systems?", "category": "Databases"},
            {"text": "What does API stand for and how does it work at a high level?", "category": "Web Development"},
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
            {"text": "What is the difference between symmetric and asymmetric encryption?", "category": "Security"},
            {"text": "Explain the concept of inheritance vs composition in object-oriented programming.", "category": "Programming"},
            {"text": "What is CORS (Cross-Origin Resource Sharing) and how do you configure it safely?", "category": "Security"},
            {"text": "Explain the difference between optimistic and pessimistic locking in database transactions.", "category": "Databases"},
            {"text": "What are web sockets and how do they establish real-time connections?", "category": "Networking"},
            {"text": "Explain the MVC (Model-View-Controller) design pattern and its advantages.", "category": "Software Design"},
            {"text": "What is CI/CD (Continuous Integration / Continuous Deployment) and what tools support it?", "category": "DevOps"},
            {"text": "What is SQL injection, and how do parameterized queries mitigate this risk?", "category": "Security"},
            {"text": "Explain the difference between deep copying and shallow copying in programming.", "category": "Programming"},
            {"text": "Explain the concepts of database replication, clustering, and sharding.", "category": "Databases"},
            {"text": "How does dynamic routing work in modern single-page applications?", "category": "Frontend"},
            {"text": "What is JWT (JSON Web Token)? How is it structured and validated?", "category": "Authentication"},
            {"text": "Explain the difference between thread starvation and race conditions.", "category": "Operating Systems"},
            {"text": "What are the common HTTP status codes (200, 201, 400, 401, 403, 404, 500) and what do they mean?", "category": "Web Services"},
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
            {"text": "How would you design a highly available notification system serving millions of push alerts daily?", "category": "System Design"},
            {"text": "Explain the two-phase commit protocol and how it ensures consistency in distributed databases.", "category": "Databases"},
            {"text": "How do you secure web APIs from common vulnerabilities listed in the OWASP Top 10?", "category": "Security"},
            {"text": "Design a distributed logging and monitoring system for a microservices cluster.", "category": "DevOps"},
            {"text": "Explain the difference between relational database scaling (sharding vs replication) and their trade-offs.", "category": "System Design"},
            {"text": "How would you design a distributed ID generator like Snowflake?", "category": "System Design"},
            {"text": "Explain the difference between hot-warm-cold data storage architectures.", "category": "Data Engineering"},
            {"text": "Design a collaborative real-time document editing tool like Google Docs.", "category": "System Design"},
            {"text": "How would you implement secure OAuth2.0 authentication flows in microservices?", "category": "Security"},
            {"text": "Explain the Raft consensus algorithm and how it elects a leader in a distributed group.", "category": "Distributed Systems"},
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
            {"text": "Describe a situation where you had to adapt to a clean desk policy or new workspace.", "category": "Adaptability"},
            {"text": "Tell me about a time you had to follow instructions that you initially found confusing.", "category": "Communication"},
            {"text": "Describe a time you volunteered for an extra task at work or school.", "category": "Initiative"},
            {"text": "How do you approach learning a brand-new software tool?", "category": "Adaptability"},
            {"text": "Tell me about a time you had to explain a simple task to a classmate or coworker.", "category": "Communication"},
            {"text": "Describe a time you felt proud of a small daily milestone.", "category": "Values"},
        ],
        "medium": [
            {"text": "Tell me about a time you had to deal with a difficult team member.", "category": "Conflict Resolution"},
            {"text": "Describe a situation where you had to meet a tight deadline.", "category": "Time Management"},
            {"text": "Give an example of a time you showed initiative.", "category": "Initiative"},
            {"text": "Tell me about a time you had to persuade someone to see things your way.", "category": "Influence"},
            {"text": "Describe a time when you had to learn a new skill for a project.", "category": "Adaptability"},
            {"text": "Tell me about a time you had to give someone difficult feedback.", "category": "Communication"},
            {"text": "Describe a situation where you had to manage conflicting priorities.", "category": "Prioritization"},
            {"text": "Tell me about a time you had to compromise on your ideals to get a project shipped.", "category": "Trade-offs"},
            {"text": "Describe a situation where you noticed a team workflow inefficiency and resolved it.", "category": "Problem Solving"},
            {"text": "Tell me about a time you had to present complex findings to a non-technical audience.", "category": "Communication"},
            {"text": "Describe a time you noticed a project was falling behind and stepped in to help.", "category": "Collaboration"},
            {"text": "Tell me about a time you had to take over responsibilities from a departed colleague.", "category": "Adaptability"},
            {"text": "Describe a situation where you had to handle an angry client or stakeholder directly.", "category": "Customer Focus"},
            {"text": "Tell me about a time you successfully managed a team project conflict.", "category": "Conflict Resolution"},
        ],
        "hard": [
            {"text": "Tell me about a time you led a project that failed. What happened and what did you learn?", "category": "Leadership"},
            {"text": "Describe a situation where you had to make an unpopular decision.", "category": "Decision Making"},
            {"text": "Tell me about a time you had to navigate office politics to get something done.", "category": "Influence"},
            {"text": "Describe a time when you had to deliver bad news to a client or stakeholder.", "category": "Communication"},
            {"text": "Tell me about a time you had to manage a project with unclear requirements.", "category": "Problem Solving"},
            {"text": "Describe a situation where you had to balance quality with speed.", "category": "Trade-offs"},
            {"text": "Tell me about a time you had to champion a change that others resisted.", "category": "Change Management"},
            {"text": "Describe a situation where you had to resolve a high-stakes disagreement between two senior leaders.", "category": "Conflict Resolution"},
            {"text": "Tell me about a time you had to lead a crisis response when a critical system failed in production.", "category": "Crisis Management"},
            {"text": "Describe a time you had to allocate limited engineering resources across multiple critical business products.", "category": "Resource Management"},
            {"text": "Describe a situation where you had to negotiate a major scope reduction with a critical partner.", "category": "Negotiation"},
            {"text": "Tell me about a time you had to manage a team conflict that threatened to derail a production launch.", "category": "Team Leadership"},
            {"text": "Describe a time you had to decide between rebuilding a legacy system or refactoring it under pressure.", "category": "Technology Choices"},
            {"text": "Tell me about a time you had to deal with a failure that affected millions of users or core clients.", "category": "Accountability"},
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
            {"text": "If a rectangle has length 8m and width 5m, what is its perimeter?", "category": "Quantitative"},
            {"text": "What is the average of 12, 16, 20, and 24?", "category": "Quantitative"},
            {"text": "If a shirt costs $20 and is on sale for 10% off, what is the sale price?", "category": "Quantitative"},
            {"text": "How many seconds are there in 5 minutes?", "category": "Quantitative"},
            {"text": "Which number is the smallest: 0.5, 0.25, 0.75, 0.1?", "category": "Quantitative"},
            {"text": "If a bag has 3 red marbles and 2 blue marbles, what is the probability of drawing red?", "category": "Probability"},
        ],
        "medium": [
            {"text": "A shop offers 20% discount on a product marked at $500. What is the selling price?", "category": "Quantitative"},
            {"text": "If 5 machines can produce 5 widgets in 5 minutes, how long would 100 machines take to produce 100 widgets?", "category": "Logical Reasoning"},
            {"text": "Find the missing number: 3, 7, 15, 31, __", "category": "Logical Reasoning"},
            {"text": "A car travels from city A to B at 40 km/h and returns at 60 km/h. What is the average speed?", "category": "Quantitative"},
            {"text": "If FRIEND is coded as HUMJTK, how is CANDLE coded?", "category": "Coding-Decoding"},
            {"text": "Two pipes can fill a tank in 10 and 15 hours respectively. How long to fill together?", "category": "Quantitative"},
            {"text": "What is the probability of getting at least one head when flipping 3 coins?", "category": "Probability"},
            {"text": "A father is 30 years older than his son. In 5 years, he will be three times as old. How old is the son now?", "category": "Quantitative"},
            {"text": "If 4 workers build a wall in 6 days, how many days will 3 workers take?", "category": "Quantitative"},
            {"text": "In a code, 'RED' is written as 27. How is 'BLUE' written?", "category": "Coding-Decoding"},
            {"text": "If the length of a rectangle increases by 20% and its width decreases by 10%, what is the net percentage change in area?", "category": "Quantitative"},
            {"text": "Find the missing number in this sequence: 1, 4, 9, 16, 25, 36, __", "category": "Logical Reasoning"},
            {"text": "A sum of money doubles itself in 8 years under simple interest. What is the annual interest rate?", "category": "Quantitative"},
            {"text": "If a coin is tossed twice, what is the probability of getting at least one tail?", "category": "Probability"},
        ],
        "hard": [
            {"text": "A man walks at 5 km/h for 6 hours and then at 4 km/h for 8 hours. What is his average speed?", "category": "Quantitative"},
            {"text": "If the ratio of the ages of A and B is 3:5 and the sum of their ages is 48, find their ages.", "category": "Quantitative"},
            {"text": "In a group of 100 people, 60 like tea, 50 like coffee, and 20 like both. How many like neither?", "category": "Set Theory"},
            {"text": "A clock shows 3:15. What is the angle between the hour and minute hands?", "category": "Logical Reasoning"},
            {"text": "If log2(x) + log2(x-2) = 3, find x.", "category": "Quantitative"},
            {"text": "Three dice are thrown. What is the probability that all show the same number?", "category": "Probability"},
            {"text": "A boat travels 20 km upstream in 5 hours and 20 km downstream in 2 hours. Find the speed of the current.", "category": "Quantitative"},
            {"text": "A card is drawn from a standard deck. What is the probability that it is a spade or a face card?", "category": "Probability"},
            {"text": "Find the sum of all two-digit numbers divisible by 7.", "category": "Quantitative"},
            {"text": "If 12 men or 18 women can finish a piece of work in 14 days, in how many days can 8 men and 16 women finish it?", "category": "Work & Time"},
            {"text": "What is the remainder when 2^100 is divided by 7?", "category": "Number Theory"},
            {"text": "If the ratio of the volume of two spheres is 8:27, what is the ratio of their surface areas?", "category": "Geometry"},
            {"text": "In a class of 50 students, 30 study math, 25 study physics, and 10 study neither. How many study both?", "category": "Set Theory"},
            {"text": "A box contains 5 red, 4 green, and 3 blue balls. If 3 balls are drawn at random, what is the probability that none is green?", "category": "Probability"},
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


def _ensure_minimum_questions():
    """Generates unique, realistic mock questions dynamically until every list in QUESTION_BANK has at least 50 questions."""
    import itertools
    import re

    
    # 1. HR Templates & Permutations
    hr_details = {
        "easy": [
            ("What is your approach to handling {topic}?", "Work Habits"),
            ("How do you manage your time when {situation}?", "Time Management"),
            ("Tell me about your experience with {topic}.", "Experience"),
            ("Why is {value} important to you in a professional environment?", "Values"),
            ("What do you do when {problem}?", "Adaptability"),
        ],
        "medium": [
            ("Tell me about a time you had to deal with {obstacle} while working on {task}.", "Conflict Resolution"),
            ("How do you handle pressure when {stressor}?", "Stress Management"),
            ("Describe a situation where you had to lead {team} to achieve {goal}.", "Leadership"),
            ("How do you prioritize when {conflict}?", "Time Management"),
            ("Tell me about a time you made a mistake regarding {error_topic}. How did you fix it?", "Accountability"),
        ],
        "hard": [
            ("Describe a high-stakes scenario where you had to resolve {crisis} with limited resources.", "Crisis Management"),
            ("How do you influence key stakeholders when {disagreement}?", "Influence"),
            ("Tell me about a time you had to make an ethical decision concerning {dilemma}.", "Ethics"),
            ("Describe a situation where a major project failed due to {failure_reason}. What was your recovery plan?", "Resilience"),
            ("How do you maintain team alignment when {change}?", "Change Management"),
            ("How did you handle {crisis} when faced with {disagreement} among the team?", "Crisis Leadership"),
            ("Describe a time you resolved {crisis} but had to compromise due to {dilemma}.", "Ethics & Crisis"),
            ("When {change} occurred, how did you manage the team's response to {disagreement}?", "Change Management"),
            ("Tell me about a time you predicted a project would fail due to {failure_reason} and had to influence stakeholders despite {disagreement}.", "Risk Management"),
            ("How do you balance compliance during {change} when faced with an ethical {dilemma}?", "Ethics & Governance"),
        ]
    }
    
    # Fill in the replacements for HR
    hr_reps = {
        "topic": ["work-life balance", "professional development", "team collaboration", "goal setting", "receiving feedback", "remote work tools", "daily planning"],
        "situation": ["deadlines are shifting", "working across timezones", "tasks overlap", "requirements are vague", "learning new guidelines"],
        "value": ["transparency", "accountability", "continuous learning", "diversity", "customer satisfaction", "integrity", "mutual respect"],
        "problem": ["a teammate misses a meeting", "a tool you need goes offline", "you receive conflicting instructions", "you make a minor typo"],
        "obstacle": ["conflicting opinions", "resource constraints", "vague specifications", "unrealistic expectations", "a sudden shift in team structure"],
        "task": ["a client deliverables report", "a critical project phase", "a peer code review", "a budget estimation task", "a product presentation"],
        "stressor": ["multiple stakeholders demand updates", "production systems fail", "deadlines are moved up", "requirements change mid-sprint"],
        "team": ["a cross-functional group", "a remote engineering team", "a skeptical client committee", "a student project group"],
        "goal": ["a 20% performance increase", "a tight timeline launch", "a legacy migration target", "an automated workflow integration"],
        "conflict": ["your personal project conflicts with team priorities", "two senior leaders give opposing feedback", "emergency bugs override planned sprints"],
        "error_topic": ["a client communication delay", "an overlooked database constraint", "a mismatched API specification", "a budget calculation slip"],
        "crisis": ["a key developer leaving mid-project", "a critical API deprecation", "a client threat to cancel a contract", "a security compliance leak"],
        "disagreement": ["they favor a cheaper but less scalable solution", "they push for faster delivery over technical debt cleanup", "they resist changing legacy processes"],
        "dilemma": ["delivering a feature with known minor bugs", "sharing candidate information", "estimating project completion times optimistically"],
        "failure_reason": ["unforeseen API limitations", "sudden budget cuts", "lack of domain knowledge", "mismatched stakeholder expectations"],
        "change": ["the company pivots its product strategy", "the tech stack changes entirely", "management restructures the team dynamically"]
    }

    # 2. Technical Templates & Permutations
    tech_details = {
        "easy": [
            ("What is the difference between {tech_a} and {tech_b}?", "Fundamentals"),
            ("Explain the role of {concept} in modern software engineering.", "Concepts"),
            ("What is the main purpose of using {tool}?", "Tooling"),
            ("How does {mechanism} work at a high level?", "Architecture"),
            ("What are the advantages of {pattern} over traditional approaches?", "Software Design"),
        ],
        "medium": [
            ("Explain how {concept} is implemented in {tech_a}. What are the trade-offs?", "Programming"),
            ("How do you handle {challenge} in a {system_type} system?", "System Design"),
            ("Describe the mechanism of {mechanism} and how it impacts performance.", "Performance"),
            ("What is the difference between {advanced_a} and {advanced_b}? Provide real-world use cases.", "Advanced Concepts"),
            ("Explain how {tool} manages state or data consistency.", "Data Management"),
        ],
        "hard": [
            ("Design a highly available and scalable {system_type} system. How do you handle {challenge}?", "System Design"),
            ("How would you debug and resolve a critical issue with {issue_type} under heavy production load?", "Troubleshooting"),
            ("Explain the theoretical limitations of {concept} in a distributed environment.", "Distributed Systems"),
            ("How would you optimize a query or task involving {heavy_load} across multiple nodes?", "Performance Tuning"),
            ("Compare {advanced_a} vs {advanced_b} in terms of latency, consistency, and partition tolerance.", "Trade-offs"),
        ]
    }
    
    tech_reps = {
        "tech_a": ["SQL databases", "REST APIs", "compilers", "Docker containers", "Git merge", "stack memory", "monolithic systems", "GET requests", "threads"],
        "tech_b": ["NoSQL databases", "GraphQL", "interpreters", "virtual machines", "Git rebase", "heap memory", "microservices", "POST requests", "processes"],
        "concept": ["closure", "encapsulation", "polymorphism", "database indexing", "concurrency", "parallelism", "garbage collection", "rate limiting", "load balancing"],
        "tool": ["Docker", "Kubernetes", "Redis cache", "Prisma ORM", "FastAPI", "Next.js", "PostgreSQL", "Git", "Webpack"],
        "mechanism": ["TLS handshake", "asynchronous event loops", "virtual DOM diffing", "connection pooling", "database sharding", "optimistic locking", "thread execution"],
        "pattern": ["MVC pattern", "SOLID principles", "Singleton pattern", "Observer pattern", "Repository pattern", "Microservices architecture"],
        "challenge": ["data consistency", "race conditions", "connection exhaustion", "uncontrolled scaling", "latency peaks", "memory leaks", "deadlocks"],
        "system_type": ["real-time chat application", "URL shortener", "e-commerce catalog", "distributed caching service", "payment processing gateway"],
        "advanced_a": ["optimistic concurrency control", "eventual consistency", "symmetric encryption", "TCP protocol", "Server-Side Rendering (SSR)"],
        "advanced_b": ["pessimistic concurrency control", "strong consistency", "asymmetric encryption", "UDP protocol", "Incremental Static Regeneration (ISR)"],
        "issue_type": ["memory leaks", "thread starvation", "socket descriptor exhaustion", "CPU spikes", "database replication lag"],
        "heavy_load": ["millions of database rows", "distributed map-reduce tasks", "high-volume push notifications", "large file uploads"]
    }

    # 3. Behavioral Templates & Permutations
    behavioral_details = {
        "easy": [
            ("Describe a time when you had to {easy_task}.", "Task Management"),
            ("Tell me about a situation where you worked with {group}.", "Teamwork"),
            ("What do you do when you need to learn {skill_to_learn} quickly?", "Learning Agility"),
            ("Describe a small success you had while working on {project_type}.", "Achievement"),
            ("Tell me about a time you had to {easy_task} while collaborating with {group}.", "Teamwork & Tasks"),
            ("How did you learn {skill_to_learn} to help complete {project_type}?", "Learning Agility"),
            ("Describe how you helped {group} understand {skill_to_learn}.", "Peer Support"),
            ("What steps did you take when you had to {easy_task} for {project_type}?", "Task Execution"),
        ],
        "medium": [
            ("Tell me about a time you had to deal with {obstacle} while working on {project_type}.", "Conflict Resolution"),
            ("Describe a situation where you had to meet a tight deadline for {task_type}.", "Time Management"),
            ("Give an example of a time you showed initiative regarding {initiative_topic}.", "Initiative"),
            ("Tell me about a time you had to explain {complex_topic} to {audience}.", "Communication"),
        ],
        "hard": [
            ("Describe a situation where you led a team to resolve a critical failure in {critical_area}.", "Crisis Management"),
            ("Tell me about a time you had to make a technology decision between {choice_a} and {choice_b} under intense pressure.", "Decision Making"),
            ("Describe a high-stakes scenario where you had to negotiate scope or resources with {tough_stakeholder}.", "Negotiation"),
            ("Tell me about a time you had to champion a major process change that {resistance_type}.", "Change Management"),
            ("How did you manage a critical failure in {critical_area} while negotiating resources with {tough_stakeholder}?", "Crisis Management"),
            ("Describe a decision between {choice_a} and {choice_b} that faced severe resistance because it {resistance_type}.", "Technology Choices"),
            ("How did you communicate a process change that {resistance_type} to a difficult stakeholder like {tough_stakeholder}?", "Change Communication"),
            ("When resolving a failure in {critical_area}, how did you justify choosing {choice_a} over {choice_b}?", "Technology Decisions"),
        ]
    }

    
    behavioral_reps = {
        "easy_task": ["organize a group project", "help a classmate with debugging", "follow a checklist on short notice", "fix a small spelling error in documentation"],
        "group": ["a study group", "a remote partner", "a newly formed project team", "a colleague from another department"],
        "skill_to_learn": ["a new version control command", "a CSS formatting trick", "a database query optimization syntax", "a Markdown documentation format"],
        "project_type": ["a simple calculator webpage", "a script to parse CSV files", "a contact form server", "a terminal-based python game"],
        "obstacle": ["unclear REST API specifications", "a teammate missing deadlines", "conflicting styling ideas", "unstable test database instances"],
        "task_type": ["an academic project delivery", "a bug-fix release candidate", "a client dashboard mockup", "a database schema migration"],
        "initiative_topic": ["refactoring legacy utility functions", "writing unit test cases", "improving API documentation templates", "automating build check scripts"],
        "complex_topic": ["how database indexing speeds up queries", "how CSS flexbox structures layouts", "how CORS policies block headers", "how Git branches keep commits isolated"],
        "audience": ["a classmate", "a non-technical business manager", "a new intern", "a customer support representative"],
        "critical_area": ["production database connections", "OAuth login flows", "real-time messaging brokers", "payment gateway webhooks"],
        "choice_a": ["rebuilding the service from scratch using FastAPI", "introducing a Redis caching layer", "using SQL database transactions"],
        "choice_b": ["maintaining the legacy Next.js API routes", "scaling database replicas vertically", "migrating to a NoSQL database"],
        "tough_stakeholder": ["a demanding product manager", "a highly skeptical finance auditor", "an engineering lead with conflicting priorities"],
        "resistance_type": ["the entire team initially resisted", "caused significant friction in delivery schedules", "required rewriting the developer handbook"]
    }

    # 4. Aptitude Templates & Permutations
    aptitude_details = {
        "easy": [
            ("If a vehicle travels at {speed} km/h, how long will it take to cover {distance} km?", "Quantitative"),
            ("What is the average of {num1}, {num2}, {num3}, and {num4}?", "Quantitative"),
            ("If a product costs ${price} and is discounted by {discount}%, what is the final price?", "Quantitative"),
            ("Which number is the smallest in the set: {set_nums}?", "Quantitative"),
        ],
        "medium": [
            ("A pipe can fill a tank in {time1} hours, while another pipe empties it in {time2} hours. How long to fill it together?", "Quantitative"),
            ("A worker can complete a task in {days1} days. If another worker joins who is {perf}% faster, how many days will they take together?", "Quantitative"),
            ("Find the missing term in the sequence: {sequence}...", "Logical Reasoning"),
            ("What is the probability of drawing a {card_type} from a standard deck of 52 cards?", "Probability"),
        ],
        "hard": [
            ("A train of length {length1}m passes a platform of length {length2}m in {time} seconds. Find the speed of the train in km/h.", "Quantitative"),
            ("A boat travels {dist} km upstream in {t1} hours and the same distance downstream in {t2} hours. Find the current speed.", "Quantitative"),
            ("Find the remainder when {base}^{power} is divided by {divisor}.", "Number Theory"),
            ("In a survey of {total} professionals, {tea} prefer Next.js, {coffee} prefer FastAPI, and {both} prefer both. How many prefer neither?", "Set Theory"),
        ]
    }
    
    aptitude_reps = {
        "speed": ["50", "80", "120", "90"],
        "distance": ["150", "320", "480", "270"],
        "num1": ["15", "30", "45", "10"],
        "num2": ["25", "40", "55", "20"],
        "num3": ["35", "50", "65", "30"],
        "num4": ["45", "60", "75", "40"],
        "price": ["80", "150", "250", "400"],
        "discount": ["15", "25", "35", "5"],
        "set_nums": ["0.05, 0.5, 0.2, 0.12", "1/4, 2/5, 3/10, 1/8", "0.9, 0.89, 0.901, 0.09"],
        "time1": ["8", "12", "6", "10"],
        "time2": ["12", "18", "9", "15"],
        "days1": ["10", "15", "20", "12"],
        "perf": ["20", "50", "25", "30"],
        "sequence": ["5, 11, 23, 47, __", "2, 9, 28, 65, __", "1, 8, 27, 64, __"],
        "card_type": ["Red King", "Spade or Ace", "Heart face card", "Club numbered card"],
        "length1": ["120", "150", "200", "180"],
        "length2": ["280", "350", "400", "220"],
        "time": ["20", "25", "30", "18"],
        "dist": ["24", "30", "40", "36"],
        "t1": ["6", "5", "8", "4"],
        "t2": ["3", "2", "4", "2"],
        "base": ["3", "5", "2", "6"],
        "power": ["50", "75", "90", "100"],
        "divisor": ["5", "7", "11", "13"],
        "total": ["120", "200", "150", "300"],
        "tea": ["70", "110", "90", "160"],
        "coffee": ["60", "100", "80", "140"],
        "both": ["25", "40", "30", "50"]
    }

    # Helper mapping to bind templates & replacements per category
    category_map = {
        "hr": (hr_details, hr_reps),
        "technical": (tech_details, tech_reps),
        "behavioral": (behavioral_details, behavioral_reps),
        "aptitude": (aptitude_details, aptitude_reps)
    }

    for cat, (details, reps) in category_map.items():
        if cat not in QUESTION_BANK:
            QUESTION_BANK[cat] = {}
        for diff in ["easy", "medium", "hard"]:
            if diff not in QUESTION_BANK[cat]:
                QUESTION_BANK[cat][diff] = []
            
            current_list = QUESTION_BANK[cat][diff]
            templates_list = details[diff]
            existing_texts = {q["text"] for q in current_list}
            
            attempts = 0
            while len(current_list) < 50 and attempts < 1000:
                attempts += 1
                tmpl_text, category_val = random.choice(templates_list)
                
                # Extract placeholders in the template text
                placeholders = re.findall(r"\{(.*?)\}", tmpl_text)
                rep_dict = {}
                for ph in placeholders:
                    if ph in reps:
                        rep_dict[ph] = random.choice(reps[ph])
                
                formatted_text = tmpl_text.format(**rep_dict)
                formatted_category = category_val.format(**rep_dict) if "{" in category_val else category_val
                
                if formatted_text not in existing_texts:
                    existing_texts.add(formatted_text)
                    current_list.append({
                        "text": formatted_text,
                        "category": formatted_category,
                        "difficulty": diff
                    })


# Run the dynamic expansion automatically on module load
_ensure_minimum_questions()

