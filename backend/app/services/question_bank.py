"""
Built-in question bank — the fallback when the AI call fails or no key is set.

Every (interview_type, difficulty) pair has its own list, and the lists really
do differ by level: easy questions ask for definitions and self-description,
medium ask for applied judgement, hard ask for trade-offs, failure modes and
scale. `{domain}` is substituted with whatever domain the caller asked for, so
a brand-new domain string works without touching this file.
"""

from typing import Dict, List, Tuple

from app.models.interview import Difficulty, InterviewType

# Feature 6: hints for the UI only. The `domain` column is free text — sending a
# domain that is not on this list is perfectly valid and needs no code change.
SUGGESTED_DOMAINS: List[str] = [
    "software engineer",
    "backend developer",
    "frontend developer",
    "full stack developer",
    "mobile developer",
    "data scientist",
    "data analyst",
    "data engineer",
    "machine learning engineer",
    "devops engineer",
    "cloud engineer",
    "site reliability engineer",
    "qa engineer",
    "security engineer",
    "database administrator",
    "business analyst",
    "product manager",
    "project manager",
    "ui ux designer",
    "sales executive",
    "business development manager",
    "marketing executive",
    "digital marketing specialist",
    "hr executive",
    "hr manager",
    "recruiter",
    "finance analyst",
    "accountant",
    "operations manager",
    "customer support executive",
    "content writer",
    "teacher",
    "mechanical engineer",
    "civil engineer",
    "electrical engineer",
]

# (type, difficulty) -> list of (category, question template)
_BANK: Dict[Tuple[InterviewType, Difficulty], List[Tuple[str, str]]] = {
    # ---------------------------------------------------------------- HR
    (InterviewType.HR, Difficulty.EASY): [
        ("Introduction", "Tell me about yourself and why you applied for this {domain} role."),
        ("Motivation", "What interests you most about working as a {domain}?"),
        ("Company Fit", "What do you know about our company, and why do you want to join us?"),
        ("Strengths", "What would you say are your greatest strengths as a {domain}?"),
        ("Availability", "What is your notice period, and when could you start?"),
        ("Education", "Walk me through your educational background and how it prepared you for a {domain} role."),
        ("Goals", "Where do you see yourself in the next two years?"),
        ("Workplace", "Do you prefer working independently or as part of a team, and why?"),
    ],
    (InterviewType.HR, Difficulty.MEDIUM): [
        ("Career Path", "Why are you looking to leave your current role, and what are you looking for in your next {domain} position?"),
        ("Weakness", "What is a professional weakness you have actively worked on, and what changed as a result?"),
        ("Conflict", "Describe a disagreement with a manager or colleague. How did you handle it?"),
        ("Salary", "What are your salary expectations for this {domain} role, and how did you arrive at that number?"),
        ("Failure", "Tell me about a project that did not go as planned. What was your part in it?"),
        ("Prioritisation", "How do you decide what to work on when everything is marked urgent?"),
        ("Feedback", "Tell me about a time you received difficult feedback. What did you do with it?"),
        ("Culture", "What kind of team culture brings out your best work, and what kind slows you down?"),
    ],
    (InterviewType.HR, Difficulty.HARD): [
        ("Gap Analysis", "There is a gap in your CV. Talk me through that period honestly and what you took from it."),
        ("Ethics", "You are asked to do something as a {domain} that you believe is wrong but is not illegal. What do you do?"),
        ("Loyalty", "You have changed roles frequently. Why should we believe you will stay?"),
        ("Pressure", "Describe the most stressful period of your career. What did it reveal about how you operate?"),
        ("Counter-offer", "If your current employer counter-offered above our number, how would you decide?"),
        ("Self-critique", "If we asked your last manager where you most need to grow as a {domain}, what would they say?"),
        ("Trade-off", "Would you rather be the strongest person on a weak team or the weakest on a strong team? Defend your answer."),
        ("Long-term", "This role may not promote for two years. How does that affect your interest?"),
    ],
    # --------------------------------------------------------- TECHNICAL
    (InterviewType.TECHNICAL, Difficulty.EASY): [
        ("Fundamentals", "What are the core tools and technologies you use day to day as a {domain}?"),
        ("Basics", "Explain a concept every {domain} should know, as if teaching a beginner."),
        ("Version Control", "How do you use version control in your work? Walk me through your typical workflow."),
        ("Debugging", "What is the first thing you do when something you built stops working?"),
        ("Testing", "How do you check that your work is correct before you hand it over?"),
        ("Documentation", "How do you document your work so someone else can pick it up?"),
        ("Learning", "How do you keep your {domain} skills current?"),
        ("Project", "Describe a recent project and the part you personally built."),
    ],
    (InterviewType.TECHNICAL, Difficulty.MEDIUM): [
        ("Problem Solving", "Walk me through how you diagnosed a difficult bug in a {domain} project from symptom to root cause."),
        ("Design", "How would you structure a new {domain} project so it stays maintainable as the team grows?"),
        ("Performance", "Describe a time you made something measurably faster. How did you measure it?"),
        ("Trade-offs", "Give an example of choosing between two valid technical approaches as a {domain}. What decided it?"),
        ("Quality", "What does 'good enough to ship' mean to you, and how do you know when you have hit it?"),
        ("Integration", "How do you approach integrating with a system or API you did not build and cannot change?"),
        ("Data", "How do you decide how to store and structure data for a {domain} project?"),
        ("Review", "What do you look for when reviewing someone else's work?"),
    ],
    (InterviewType.TECHNICAL, Difficulty.HARD): [
        ("Architecture", "Design a system for a high-traffic {domain} use case. Walk me through the components and where it breaks first."),
        ("Scale", "Your solution works for 100 users and fails at 100,000. Talk me through finding and fixing the bottleneck."),
        ("Failure Modes", "What are the failure modes of the architecture you just described, and how would you detect each one in production?"),
        ("Trade-offs", "Argue for and then against the technology you most recently chose as a {domain}. When would it be the wrong call?"),
        ("Consistency", "How would you handle two processes trying to update the same record at once? Discuss the trade-offs of your approach."),
        ("Migration", "You must replace a core component with zero downtime and no data loss. Plan the migration."),
        ("Debugging", "A problem appears only in production, only under load, and cannot be reproduced locally. How do you proceed?"),
        ("Technical Debt", "How do you decide when to pay down technical debt versus ship the next feature? Give a concrete example."),
    ],
    # -------------------------------------------------------- BEHAVIORAL
    (InterviewType.BEHAVIORAL, Difficulty.EASY): [
        ("Teamwork", "Tell me about a time you worked well as part of a team."),
        ("Communication", "Describe a time you had to explain something complicated to someone without your background."),
        ("Initiative", "Tell me about something you improved without being asked to."),
        ("Reliability", "Describe a time you had to meet a tight deadline. How did you manage it?"),
        ("Adaptability", "Tell me about a time your priorities changed suddenly. How did you respond?"),
        ("Customer Focus", "Describe a time you helped a customer or colleague who was frustrated."),
        ("Learning", "Tell me about a skill you taught yourself for a {domain} role."),
        ("Collaboration", "Describe how you work with people whose role is very different from a {domain}."),
    ],
    (InterviewType.BEHAVIORAL, Difficulty.MEDIUM): [
        ("Conflict", "Tell me about a time you strongly disagreed with a teammate. Using STAR, what was the outcome?"),
        ("Ownership", "Describe a time you made a mistake that affected others. What did you do next?"),
        ("Influence", "Tell me about a time you convinced someone senior to change their mind."),
        ("Ambiguity", "Describe a project where the requirements were unclear. How did you move forward?"),
        ("Pressure", "Tell me about a time you had more work than time. How did you decide what to drop?"),
        ("Persuasion", "Describe a time you had to sell an idea to a sceptical audience as a {domain}."),
        ("Resilience", "Tell me about a time you failed publicly. How did you recover?"),
        ("Mentoring", "Describe a time you helped someone else improve at their job."),
    ],
    (InterviewType.BEHAVIORAL, Difficulty.HARD): [
        ("Leadership", "Describe a time you led without formal authority and the team initially resisted. What changed?"),
        ("Ethics", "Tell me about a time you had to push back on your own organisation. What did it cost you?"),
        ("Conflict", "Describe the hardest interpersonal conflict of your career. What would you do differently now?"),
        ("Judgement", "Tell me about a decision you made with incomplete information that turned out to be wrong. Walk me through your reasoning at the time."),
        ("Change", "Describe a time you drove a change that a majority of your team disagreed with."),
        ("Accountability", "Tell me about a time your team missed a commitment. How did you handle it upward and downward?"),
        ("Trade-off", "Describe a time you had to choose between doing the job well and doing it on time as a {domain}."),
        ("Culture", "Tell me about a time you had to work with someone you fundamentally did not respect professionally."),
    ],
    # ---------------------------------------------------------- APTITUDE
    (InterviewType.APTITUDE, Difficulty.EASY): [
        ("Quantitative", "A shirt costs 800 rupees after a 20% discount. What was the original price?"),
        ("Percentages", "If 45 out of 60 candidates passed a test, what percentage failed?"),
        ("Ratio", "Two numbers are in the ratio 3:5 and their sum is 64. Find both numbers."),
        ("Averages", "The average of five numbers is 20. If four of them are 18, 22, 19 and 25, what is the fifth?"),
        ("Time and Work", "A person completes a task in 6 days. How much of the task is done in 2 days?"),
        ("Logical Reasoning", "Complete the series: 2, 6, 12, 20, 30, ?"),
        ("Verbal", "Choose the word most opposite in meaning to 'abundant', and explain your choice."),
        ("Data Interpretation", "Sales were 120 units in January and 150 in February. What was the percentage growth?"),
    ],
    (InterviewType.APTITUDE, Difficulty.MEDIUM): [
        ("Time and Work", "A can finish a job in 12 days and B in 18 days. Working together, how long will they take?"),
        ("Speed and Distance", "A train 200 m long crosses a pole in 10 seconds. What is its speed in km/h?"),
        ("Probability", "Two dice are rolled. What is the probability the sum is greater than 9?"),
        ("Permutations", "In how many ways can the letters of the word 'INTERVIEW' be arranged?"),
        ("Profit and Loss", "An item sold at 1,200 rupees gives a 20% profit. What is the cost price, and what price gives a 10% loss?"),
        ("Mixtures", "A 40-litre mixture is 25% acid. How much pure acid must be added to make it 40% acid?"),
        ("Logical Reasoning", "All managers are employees. Some employees are engineers. Can we conclude some managers are engineers? Justify."),
        ("Data Interpretation", "A company's revenue rose 25% then fell 20%. What is the net change from the starting value?"),
    ],
    (InterviewType.APTITUDE, Difficulty.HARD): [
        ("Time and Work", "A and B together finish a job in 8 days, B and C in 12, A and C in 16. How long does each take alone?"),
        ("Probability", "Three cards are drawn without replacement from a standard deck. What is the probability all three are of different suits?"),
        ("Boats and Streams", "A boat covers 24 km upstream in 6 hours and 36 km downstream in 4 hours. Find the boat's speed and the stream's speed."),
        ("Ages", "The ratio of a father's age to his son's is 7:2. In 15 years it will be 2:1. Find their present ages."),
        ("Permutations", "How many six-digit numbers can be formed from 1-9 with no digit repeating and the number divisible by 5?"),
        ("Pipes and Cisterns", "Two pipes fill a tank in 20 and 30 minutes; a third empties it in 15. All three open, how long to fill?"),
        ("Logical Reasoning", "Five people sit in a row with three positional constraints. Deduce the seating order and explain your reasoning step by step."),
        ("Data Sufficiency", "To find a rectangle's area, is knowing the perimeter and that the length is twice the breadth sufficient? Justify."),
    ],
}


def get_questions(
    interview_type: InterviewType,
    difficulty: Difficulty,
    domain: str,
    count: int,
) -> List[Tuple[str, str]]:
    """
    Return up to `count` (category, question_text) pairs with `{domain}` filled in.

    If more questions are requested than the bank holds for that combination,
    the list cycles — numbering stays correct and the caller always gets the
    count it asked for.
    """
    entries = _BANK.get((interview_type, difficulty), [])
    if not entries:
        return []

    out: List[Tuple[str, str]] = []
    for i in range(count):
        category, template = entries[i % len(entries)]
        out.append((category, template.format(domain=domain)))
    return out
