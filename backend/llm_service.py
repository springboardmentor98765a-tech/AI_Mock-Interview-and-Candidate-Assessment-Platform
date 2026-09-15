import os
import json
import requests
from dotenv import load_dotenv
import time


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = "gemini-3.5-flash-lite"

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    + GEMINI_MODEL
    + ":generateContent"
)


# ============================================================
# BASIC VALIDATION
# ============================================================

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured. "
        "Add it to the .env file."
    )


# ============================================================
# GEMINI REQUEST
# ============================================================

def ask_gemini(prompt: str) -> str:
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    # Try the Gemini request up to 3 times
    # if Gemini temporarily returns 503 Service Unavailable.
    for attempt in range(3):

        response = requests.post(
            GEMINI_URL,
            headers=headers,
            json=payload,
            timeout=120
        )

        # Gemini is temporarily overloaded.
        # Wait longer before each retry.
        if response.status_code == 503:

            if attempt < 2:
                wait_time = 5 * (2 ** attempt)

                print(
                    f"Gemini returned 503. "
                    f"Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)
                continue

            # All 3 attempts failed.
            response.raise_for_status()

        response.raise_for_status()

        data = response.json()

        try:
            return (
                data["candidates"][0]
                ["content"]["parts"][0]
                ["text"]
                .strip()
            )

        except (KeyError, IndexError, TypeError):
            raise RuntimeError(
                f"Unexpected Gemini response: {data}"
            )

    raise RuntimeError("Gemini API request failed after retries.")
# ============================================================
# JSON PARSER
# ============================================================

def extract_json(response_text: str):

    response_text = response_text.strip()

    # Remove markdown code fences if present
    if response_text.startswith("```json"):
        response_text = response_text[7:]

    elif response_text.startswith("```"):
        response_text = response_text[3:]

    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    try:
        return json.loads(response_text)

    except json.JSONDecodeError as e:

        raise RuntimeError(
            f"Gemini returned invalid JSON: {response_text}"
        ) from e


# ============================================================
# TEST GEMINI CONNECTION
# ============================================================

def test_llm():

    prompt = """
You are the AI engine for SmartHire AI.

Return ONLY valid JSON.

Return exactly:

{
    "status": "ready",
    "message": "SmartHire AI LLM is connected"
}
"""

    response = ask_gemini(prompt)

    return extract_json(response)


# ============================================================
# AI RESUME ANALYSIS
# ============================================================

def analyze_resume_with_llm(resume_text: str):

    prompt = f"""
You are the resume analysis engine for SmartHire AI.

Analyze the resume below.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "skills": [],
    "experience": [],
    "education": [],
    "summary": ""
}}

Rules:

1. Extract technical and professional skills explicitly
   present in the resume.

2. Extract internships, jobs, projects, roles and other
   relevant experience.

3. Extract degrees, institutions, branches and academic
   information.

4. Write a concise professional summary.

5. Do NOT invent information.

6. Use only information present in the resume.

RESUME:

{resume_text}
"""

    response = ask_gemini(prompt)

    return extract_json(response)


# ============================================================
# AI INTERVIEW QUESTION GENERATION
# ============================================================

def generate_resume_interview_questions(
    resume_text: str,
    interview_type: str,
    domain: str,
    difficulty: str,
    number_of_questions: int
):

    interview_type_clean = interview_type.strip().lower()

    # ========================================================
    # APTITUDE MODE
    # ========================================================
    # IMPORTANT:
    # Aptitude questions must NOT use the resume.
    # ========================================================

    if interview_type_clean == "aptitude":

        prompt = f"""
You are the aptitude test question generator
for SmartHire AI.

Generate an aptitude test.

Interview Type: APTITUDE
Domain: {domain}
Difficulty: {difficulty}
Number of Questions: {number_of_questions}

IMPORTANT:

The candidate's resume MUST NOT influence these questions.

Do NOT ask about:
- Projects
- Programming languages
- Internships
- Education
- Certifications
- Work experience
- Resume skills
- Personal experiences

Generate ONLY aptitude questions.

Suitable areas include:

- Quantitative aptitude
- Percentages
- Profit and loss
- Ratios and proportions
- Averages
- Time and work
- Time, speed and distance
- Simple interest
- Compound interest
- Number systems
- Number sequences
- Probability
- Logical reasoning
- Basic data interpretation
- Mathematical problem solving

Difficulty: {difficulty}

Difficulty rules:

EASY:
Use straightforward calculations and basic reasoning.

MEDIUM:
Use multi-step calculations and reasoning.

HARD:
Use complex multi-step reasoning and challenging
problem solving.

Generate EXACTLY {number_of_questions} questions.

Do NOT include answers.

Do NOT include explanations.

Do NOT mention the candidate or their resume.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "questions": [
        "Question 1",
        "Question 2"
    ]
}}
"""

    # ========================================================
    # NON-APTITUDE MODE
    # ========================================================

    else:

        prompt = f"""
You are the AI interview question generation engine
for SmartHire AI.

Generate a personalized mock interview based on
the candidate's actual resume.

Interview Type: {interview_type}
Domain: {domain}
Difficulty: {difficulty}
Number of Questions: {number_of_questions}

IMPORTANT RULES:

1. Generate EXACTLY {number_of_questions} questions.

2. Use the candidate's actual resume.

3. Do NOT invent information.

4. Every question must be relevant to the selected
   interview type and domain.

5. For TECHNICAL interviews:

   Prioritize:
   - Projects
   - Technical skills
   - Technologies
   - Internships
   - Work experience
   - Certifications

   Ask questions about actual projects and technologies
   present in the resume.

6. For BEHAVIORAL interviews:

   Use actual experiences, projects, internships,
   leadership activities and teamwork experiences
   mentioned in the resume.

7. For HR interviews:

   Use the candidate's education, projects,
   experience, skills and career background.

8. Match the requested difficulty:

   EASY:
   Fundamental understanding.

   MEDIUM:
   Practical application and multi-step reasoning.

   HARD:
   Deep analysis, trade-offs and problem solving.

9. Do NOT invent projects, technologies,
   companies or experiences.

10. Do NOT include answers.

11. Each item must contain exactly one question.

12. Return ONLY valid JSON.

Use exactly this structure:

{{
    "questions": [
        "Question 1",
        "Question 2"
    ]
}}

CANDIDATE RESUME:

{resume_text}
"""

    # ========================================================
    # CALL GEMINI
    # ========================================================

    response = ask_gemini(prompt)

    result = extract_json(response)

    # ========================================================
    # VALIDATE RESPONSE
    # ========================================================

    if not isinstance(result, dict):

        raise RuntimeError(
            "Gemini returned an invalid interview question format."
        )

    questions = result.get("questions")

    if not isinstance(questions, list):

        raise RuntimeError(
            "Gemini did not return a valid questions list."
        )

    questions = [
        str(question).strip()
        for question in questions
        if str(question).strip()
    ]

    # Never return more than requested.
    questions = questions[:number_of_questions]

    # Exact count validation.
    if len(questions) != number_of_questions:

        raise RuntimeError(
            f"Gemini returned {len(questions)} questions, "
            f"but {number_of_questions} were requested."
        )

    return questions

# ============================================================
# AI INTERVIEW ANSWER EVALUATION
# ============================================================

def evaluate_interview_answer(
    question: str,
    answer: str,
    interview_type: str,
    domain: str,
    difficulty: str
):
    """
    Evaluate one candidate interview answer using Gemini.

    Returns:
    - relevance_score
    - technical_score
    - answer_quality_score
    - overall_score
    - feedback
    """

    prompt = f"""
You are the AI evaluation engine for SmartHire AI.

Evaluate the candidate's answer to the interview question.

INTERVIEW DETAILS:

Interview Type: {interview_type}
Domain: {domain}
Difficulty: {difficulty}

QUESTION:

{question}

CANDIDATE ANSWER:

{answer}

Evaluate the answer using these criteria:

1. RELEVANCE SCORE
   - Does the answer directly address the question?
   - Is the response focused on what was asked?
   - Score from 0 to 100.

2. TECHNICAL SCORE
   - Evaluate technical correctness.
   - Evaluate understanding of the relevant concepts.
   - Evaluate whether the candidate's explanation is technically sound.
   - For aptitude questions, evaluate the correctness of the reasoning/calculation
     instead of technical knowledge.
   - For HR questions, evaluate the appropriateness and professionalism of the response.
   - Score from 0 to 100.

3. ANSWER QUALITY SCORE
   - Clarity
   - Structure
   - Completeness
   - Explanation quality
   - Use of examples where appropriate
   - Score from 0 to 100.

4. OVERALL SCORE
   - Give an overall score based on relevance, technical correctness,
     answer quality, clarity, and completeness.
   - Score from 0 to 100.

SCORING CALIBRATION:

0:
- Blank answer
- Nonsense response
- Completely unrelated response
- No meaningful attempt to answer the question

1-20:
- Extremely poor answer
- Mostly incorrect or irrelevant
- Very little understanding demonstrated

21-40:
- Poor answer
- Candidate attempts to address the question but contains major
  mistakes, missing information, or weak understanding

41-60:
- Partially correct answer
- Some relevant understanding is demonstrated
- Important details are missing or there are noticeable mistakes

61-75:
- Good answer
- Mostly correct and relevant
- Demonstrates reasonable understanding
- Minor gaps may exist

76-90:
- Very good answer
- Correct, relevant, clear, and reasonably complete
- Demonstrates strong understanding

91-100:
- Excellent answer
- Highly accurate, directly relevant, well structured, complete,
  and demonstrates strong understanding with appropriate explanation
  or examples

IMPORTANT:
- Do not give 0 unless the answer is blank, nonsense, or completely
  unrelated to the question.
- A short but correct answer should receive a good score.
- Do not lower the score merely because the answer is short.
- Do not increase the score merely because the answer is long.

5. FEEDBACK
   - Give concise, useful feedback.
   - Mention what the candidate did well.
   - Mention what could be improved.
   - Do not invent facts about the candidate.

6. STRENGTHS
   - Identify the specific strengths demonstrated in the candidate's answer.
   - Base this ONLY on the answer provided.
   - If there are no clear strengths, return a short statement explaining that.

7. WEAKNESSES
   - Identify the specific weaknesses, missing points, errors, or gaps in the answer.
   - Base this ONLY on the answer provided.
   - Do not invent weaknesses that are not supported by the answer.

8. IMPROVEMENT SUGGESTIONS
   - Give practical suggestions for improving this type of answer.
   - Make the suggestions specific and actionable.

9. PRACTICE RECOMMENDATIONS
   - Recommend what the candidate should practice based on weaknesses in this answer.
   - Keep recommendations relevant to the interview type and domain.

10. LEARNING RESOURCES
   - Suggest useful topics or types of learning resources that could help improve the identified weak areas.
   - Do not invent specific URLs.
   - Examples may include documentation, tutorials, practice problems, or concept revision.

IMPORTANT RULES:

- Evaluate ONLY the answer provided.
- Do NOT assume information that is not present.
- Do NOT give a high score simply because the answer is long.
- A short but correct answer can receive a high score.
- A long but incorrect answer must receive a low score.
- For aptitude questions, correctness and reasoning are more important than
  technical terminology.
- For HR questions, communication, relevance and professionalism are important.
- Be objective and consistent.
- Use the full 0-100 scoring range appropriately.
- Do not default to 0 when the candidate has made a genuine attempt.
- If an answer contains some correct information, give credit for
  the correct portions.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "relevance_score": 0,
    "technical_score": 0,
    "answer_quality_score": 0,
    "overall_score": 0,
    "feedback": "",
    "strengths": "",
    "weaknesses": "",
    "improvement_suggestions": "",
    "practice_recommendations": "",
    "learning_resources": ""
}}
"""

    response = ask_gemini(prompt)

    result = extract_json(response)

    # ========================================================
    # VALIDATE RESPONSE
    # ========================================================

    if not isinstance(result, dict):
        raise RuntimeError(
            "Gemini returned an invalid interview evaluation format."
        )

    required_fields = [
        "relevance_score",
        "technical_score",
        "answer_quality_score",
        "overall_score",
        "feedback",
        "strengths",
        "weaknesses",
        "improvement_suggestions",
        "practice_recommendations",
        "learning_resources"
    ]

    for field in required_fields:
        if field not in result:
            raise RuntimeError(
                f"Gemini evaluation is missing field: {field}"
            )

    # ========================================================
    # VALIDATE SCORES
    # ========================================================

    score_fields = [
        "relevance_score",
        "technical_score",
        "answer_quality_score",
        "overall_score"
    ]

    for field in score_fields:

        try:
            result[field] = int(result[field])

        except (ValueError, TypeError):

            raise RuntimeError(
                f"Invalid score returned for {field}: "
                f"{result[field]}"
            )

        # Keep scores between 0 and 100
        result[field] = max(
            0,
            min(100, result[field])
        )

    # ========================================================
    # VALIDATE FEEDBACK
    # ========================================================

    result["feedback"] = str(
        result["feedback"]
    ).strip()

    return result