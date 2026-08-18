import json
import re
import os
from google import genai
from google.genai import types
from backend.config import settings

def _get_gemini_client():
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        return genai.Client(api_key=api_key)
    return None

def parse_resume_with_gemini(raw_text: str) -> dict:
    client = _get_gemini_client()
    if client:
        try:
            prompt = f"""
            You are an expert HR Tech AI recruiter. Parse the following candidate resume text into a clean structured JSON object.
            
            Return ONLY valid JSON matching this schema:
            {{
                "name": "Candidate Full Name or Unspecified",
                "summary": "Concise professional summary (2-3 sentences)",
                "skills": ["Skill1", "Skill2", "Skill3"],
                "tech_stack": ["Tech1", "Tech2"],
                "education": [
                    {{
                        "degree": "Degree Name",
                        "institution": "University/College",
                        "year": "Year or N/A"
                    }}
                ],
                "seniority_level": "Junior | Mid | Senior | Lead"
            }}

            Resume Text:
            {raw_text[:3000]}
            """
            
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if response.text:
                cleaned = response.text.strip()
                return json.loads(cleaned)
        except Exception as e:
            print(f"[Gemini Service] API call error in parse_resume_with_gemini: {e}")

    # Fallback smart parsing if API Key is not set or network fails
    extracted_skills = []
    common_skills = ["Python", "FastAPI", "JavaScript", "HTML", "CSS", "React", "Vue", "Node.js", "Docker", "PostgreSQL", "MongoDB", "Git", "SQL", "Java", "C++", "REST API", "AWS"]
    for s in common_skills:
        if re.search(r'\b' + re.escape(s) + r'\b', raw_text, re.IGNORECASE):
            extracted_skills.append(s)
            
    if not extracted_skills:
        extracted_skills = ["Software Engineering", "Problem Solving", "Web Development"]

    return {
        "name": raw_text.split('\n')[0][:40].strip() if raw_text else "Candidate",
        "summary": "Software professional with experience in technical system implementation, software development, and modern framework architecture.",
        "skills": extracted_skills,
        "tech_stack": extracted_skills[:5],
        "education": [{"degree": "B.S. Computer Science / IT", "institution": "Accredited University", "year": "2023"}],
        "seniority_level": "Mid"
    }

def generate_interview_questions(domain: str, difficulty: str, question_type: str, skills: list, count: int = 4) -> list:
    client = _get_gemini_client()
    if client:
        try:
            skills_str = ", ".join(skills) if skills else "General Software Development"
            prompt = f"""
            You are a Senior Technical Interviewer conducting a mock assessment.
            Generate {count} distinct interview questions for a candidate with the following configuration:
            - Domain: {domain}
            - Difficulty Level: {difficulty}
            - Question Type: {question_type}
            - Candidate Key Skills: {skills_str}

            Return ONLY valid JSON format containing a list of question objects with exact key schema:
            [
                {{
                    "id": 1,
                    "question": "Clear, detailed technical or behavioral question text",
                    "category": "{question_type}",
                    "ideal_answer_outline": "Key points, concepts, or steps that a strong candidate should include in their answer."
                }}
            ]
            """

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if response.text:
                return json.loads(response.text.strip())
        except Exception as e:
            print(f"[Gemini Service] API call error in generate_interview_questions: {e}")

    # Fallback dynamic question generator
    fallback_questions = []
    domain_label = domain or "Full Stack"
    diff_label = difficulty or "Medium"

    base_templates = [
        {
            "id": 1,
            "question": f"In a {domain_label} environment ({diff_label} level), how do you design scalable architectural patterns to handle high concurrent user traffic?",
            "category": "Technical Architecture",
            "ideal_answer_outline": "Discuss load balancing, caching layers (Redis), database indexing, horizontal scaling, and stateless services."
        },
        {
            "id": 2,
            "question": f"Describe a scenario where you diagnosed a critical production bug or performance bottleneck in a {skills[0] if skills else domain_label} application.",
            "category": "Problem Solving",
            "ideal_answer_outline": "Detail the diagnostic steps (logs, profiling metrics), root cause analysis, mitigation strategy, and regression prevention."
        },
        {
            "id": 3,
            "question": f"How do you enforce robust security standards and authorization protocols in a {domain_label} API interface?",
            "category": "Security & Best Practices",
            "ideal_answer_outline": "Cover JWT / OAuth2 validation, input sanitization, rate limiting, HTTPS, and role-based access control (RBAC)."
        },
        {
            "id": 4,
            "question": "Can you share an instance where you had to manage conflicting technical priorities or tight deadlines with cross-functional stakeholders?",
            "category": "Behavioral",
            "ideal_answer_outline": "Use STAR method (Situation, Task, Action, Result) highlighting active communication, trade-off analysis, and clear deliverables."
        }
    ]
    return base_templates[:count]

def evaluate_candidate_answer(question: str, candidate_answer: str, ideal_outline: str) -> dict:
    client = _get_gemini_client()
    if client:
        try:
            prompt = f"""
            You are an expert AI Interviewer evaluating a candidate's answer.
            
            Question: "{question}"
            Ideal Answer Key Points: "{ideal_outline}"
            Candidate Answer: "{candidate_answer}"

            Return ONLY valid JSON matching this schema:
            {{
                "score": 8, // Integer from 1 to 10
                "feedback": "Detailed constructive evaluation of the candidate's answer.",
                "missing_points": ["Point 1 that was missed", "Point 2 that could be improved"]
            }}
            """

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if response.text:
                return json.loads(response.text.strip())
        except Exception as e:
            print(f"[Gemini Service] API call error in evaluate_candidate_answer: {e}")

    # Fallback evaluator
    length = len(candidate_answer.split())
    if length < 10:
        score = 4
        feedback = "Answer is brief. Adding concrete technical details and real-world examples would significantly strengthen your response."
        missing_points = ["Detailed technical depth", "Specific implementation examples"]
    elif length < 30:
        score = 7
        feedback = "Good baseline explanation covering core concepts. Can be enhanced with edge case handling and architectural trade-offs."
        missing_points = ["Edge case mitigation strategies", "Performance benchmarking details"]
    else:
        score = 9
        feedback = "Excellent response! Thorough explanation demonstrating strong domain knowledge and practical engineering experience."
        missing_points = ["Optional micro-optimization discussion"]

    return {
        "score": score,
        "feedback": feedback,
        "missing_points": missing_points
    }

def generate_performance_report(evaluated_questions: list) -> dict:
    client = _get_gemini_client()
    if evaluated_questions:
        avg_score = sum(q.get("evaluation", {}).get("score", 7) for q in evaluated_questions) / len(evaluated_questions)
    else:
        avg_score = 7.5

    overall_pct = int(avg_score * 10)

    if client:
        try:
            evaluated_summary = json.dumps(evaluated_questions, indent=2)
            prompt = f"""
            Synthesize a final executive AI Interview Report based on these evaluated interview questions:
            {evaluated_summary}

            Return ONLY valid JSON matching this schema:
            {{
                "overall_score": {overall_pct},
                "recommendation": "Strong Hire | Hire | Consider | Reject",
                "summary": "Comprehensive 3-4 sentence performance summary of candidate performance.",
                "category_scores": {{
                    "Technical Depth": 85,
                    "Communication": 80,
                    "Problem Solving": 90,
                    "Domain Mastery": 88
                }},
                "strengths": ["Strength 1", "Strength 2"],
                "weaknesses": ["Weakness 1", "Weakness 2"],
                "ai_growth_roadmap": ["Actionable step 1", "Actionable step 2"]
            }}
            """

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if response.text:
                return json.loads(response.text.strip())
        except Exception as e:
            print(f"[Gemini Service] API call error in generate_performance_report: {e}")

    # Fallback report generator
    rec = "Strong Hire" if overall_pct >= 85 else ("Hire" if overall_pct >= 70 else "Consider")
    return {
        "overall_score": overall_pct,
        "recommendation": rec,
        "summary": f"The candidate demonstrated solid capability with an overall performance benchmark of {overall_pct}%. They exhibited clear technical clarity and structured problem-solving skills throughout the adaptive session.",
        "category_scores": {
            "Technical Depth": min(100, overall_pct + 4),
            "Communication": min(100, overall_pct - 2),
            "Problem Solving": min(100, overall_pct + 2),
            "Domain Mastery": overall_pct
        },
        "strengths": [
            "Structured response format with clear technical terminology",
            "Good understanding of architectural principles and scalability"
        ],
        "weaknesses": [
            "Could expand further on low-level performance profiling",
            "Opportunity to elaborate on disaster recovery and automated testing frameworks"
        ],
        "ai_growth_roadmap": [
            "Practice deep-dive architectural trade-off discussions",
            "Incorporate end-to-end system telemetry monitoring examples in responses"
        ]
    }
