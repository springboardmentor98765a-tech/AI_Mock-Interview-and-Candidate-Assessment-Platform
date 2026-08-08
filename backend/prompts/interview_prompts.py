from typing import Dict, List, Any

def build_interview_generation_prompt(
    parsed_resume_details: Dict[str, Any],
    domain: str,
    interview_type: str,
    difficulty: str,
    num_questions: int,
    experience_level: str,
    duration_mins: int
) -> str:
    """
    Builds a structured prompt for Google Gemini to generate professional interview questions.
    Forces JSON output with question, category, difficulty, expected_answer, and evaluation_points.
    """
    skills = parsed_resume_details.get("skills", [])
    skills_str = ", ".join(skills) if skills else "General Domain Skills"
    education = parsed_resume_details.get("education", "Not specified")
    work_exp = parsed_resume_details.get("work_experience", "Not specified")

    prompt = f"""
You are an expert AI Technical & Hiring Assessment Engine.
Generate exactly {num_questions} realistic, highly relevant, professional interview questions tailored to the candidate's background and selected interview settings.

INTERVIEW CONFIGURATION:
- Domain: {domain}
- Interview Type: {interview_type}
- Target Difficulty: {difficulty}
- Experience Level: {experience_level}
- Estimated Duration: {duration_mins} minutes

CANDIDATE BACKGROUND:
- Detected Skills: {skills_str}
- Education: {education}
- Work Experience: {work_exp}

CRITICAL RESPONSE RULES:
1. You MUST respond with ONLY a valid JSON object matching the following structure exactly:
{{
  "questions": [
    {{
      "question": "Question text here...",
      "category": "{interview_type}",
      "difficulty": "{difficulty}",
      "expected_answer": "Comprehensive answer outline expected from candidate...",
      "evaluation_points": [
        "Evaluation criteria point 1",
        "Evaluation criteria point 2",
        "Evaluation criteria point 3",
        "Evaluation criteria point 4"
      ]
    }}
  ]
}}
2. Do not include markdown code block backticks unless strictly required by JSON MIME type.
3. Ensure every question is unique, highly professional, realistic, and directly addresses the domain '{domain}' and type '{interview_type}'.
4. Include exactly {num_questions} questions in the 'questions' array.
"""
    return prompt.strip()


def build_single_question_regeneration_prompt(
    existing_questions: List[str],
    domain: str,
    interview_type: str,
    difficulty: str,
    experience_level: str
) -> str:
    """
    Builds a prompt to regenerate a single distinct interview question avoiding existing questions.
    """
    existing_str = "\n".join([f"- {q}" for q in existing_questions]) if existing_questions else "None"

    prompt = f"""
You are an expert AI Assessment Engine.
Generate exactly 1 NEW interview question for an interview session in the domain '{domain}' ({interview_type} round, {difficulty} difficulty, {experience_level} experience level).

EXISTING QUESTIONS TO AVOID (DO NOT REPEAT):
{existing_str}

CRITICAL RESPONSE RULES:
1. Respond with ONLY a valid JSON object matching this structure:
{{
  "questions": [
    {{
      "question": "Single new question text...",
      "category": "{interview_type}",
      "difficulty": "{difficulty}",
      "expected_answer": "Expected answer key...",
      "evaluation_points": [
        "Point 1",
        "Point 2",
        "Point 3"
      ]
    }}
  ]
}}
2. Return exactly 1 question in the 'questions' array.
"""
    return prompt.strip()
