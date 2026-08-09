import json
import re
from typing import Any, Dict, List
from services import llm


def get_rating_rubric(score: float) -> str:
    """Return rubric rating label based on overall score."""
    if score >= 90.0:
        return "Excellent"
    elif score >= 75.0:
        return "Good"
    elif score >= 60.0:
        return "Average"
    elif score >= 40.0:
        return "Needs Improvement"
    else:
        return "Poor"


def calculate_weighted_overall(comm: float, conf: float, tech: float, prof: float) -> float:
    """Calculate overall weighted score per assessment formula:

    Overall = (Communication × 30%) + (Confidence × 25%) + (Technical Relevance × 30%) + (Professionalism × 15%)
    """
    overall = (comm * 0.30) + (conf * 0.25) + (tech * 0.30) + (prof * 0.15)
    return round(max(0.0, min(100.0, overall)), 2)


def evaluate_answer_full(question_text: str, category: str, difficulty: str, answer_text: str) -> Dict[str, Any]:
    """Evaluate candidate answer across all assessment dimensions and parameters."""
    if llm.configured():
        try:
            prompt = (
                "You are an expert AI interview evaluator for SmartHire AI. Evaluate the candidate's answer against the question.\n"
                f"Question: {question_text}\n"
                f"Category: {category}\n"
                f"Difficulty: {difficulty}\n"
                f"Candidate Answer: {answer_text}\n\n"
                "Return ONLY a raw JSON object (no markdown code blocks) with exact numeric scores (0-100) for:\n"
                "{\n"
                '  "communication_score": 85,\n'
                '  "confidence_score": 80,\n'
                '  "technical_score": 90,\n'
                '  "professionalism_score": 85,\n'
                '  "parameters": {\n'
                '    "speech_clarity": 85, "grammar_quality": 85, "filler_word_freq": 90, "speaking_pace": 80, "response_completeness": 85,\n'
                '    "eye_contact_consistency": 80, "facial_engagement": 80, "response_hesitation": 85, "speaking_confidence": 80, "attention_level": 85,\n'
                '    "technical_accuracy": 90, "keyword_relevance": 90, "problem_solving_ability": 85, "domain_knowledge": 90, "answer_completeness": 85,\n'
                '    "time_management": 85, "response_organization": 85, "professional_communication": 85, "interview_etiquette": 90\n'
                '  },\n'
                '  "feedback": "2 sentence detailed feedback on the answer."\n'
                "}"
            )
            data = llm.chat_json({
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            })
            if isinstance(data, dict) and "communication_score" in data:
                comm = round(float(data.get("communication_score", 70)), 2)
                conf = round(float(data.get("confidence_score", 70)), 2)
                tech = round(float(data.get("technical_score", 70)), 2)
                prof = round(float(data.get("professionalism_score", 75)), 2)
                overall = calculate_weighted_overall(comm, conf, tech, prof)
                return {
                    "communication_score": comm,
                    "confidence_score": conf,
                    "technical_score": tech,
                    "professionalism_score": prof,
                    "score": overall,
                    "parameters": data.get("parameters", {}),
                    "feedback": str(data.get("feedback") or "Solid answer provided."),
                }
        except Exception:
            pass

    # Heuristic fallback evaluation if AI service is temporarily unavailable
    word_count = len(answer_text.strip().split())
    base_score = 40.0
    if word_count > 60:
        base_score = 82.0
    elif word_count > 30:
        base_score = 72.0
    elif word_count > 15:
        base_score = 60.0

    comm = round(min(100.0, base_score + (5.0 if word_count > 40 else 0.0)), 2)
    conf = round(min(100.0, base_score + 2.0), 2)
    tech = round(min(100.0, base_score + (8.0 if word_count > 50 else 0.0)), 2)
    prof = round(min(100.0, base_score + 5.0), 2)
    overall = calculate_weighted_overall(comm, conf, tech, prof)

    params = {
        "speech_clarity": comm, "grammar_quality": comm, "filler_word_freq": comm, "speaking_pace": comm, "response_completeness": comm,
        "eye_contact_consistency": conf, "facial_engagement": conf, "response_hesitation": conf, "speaking_confidence": conf, "attention_level": conf,
        "technical_accuracy": tech, "keyword_relevance": tech, "problem_solving_ability": tech, "domain_knowledge": tech, "answer_completeness": tech,
        "time_management": prof, "response_organization": prof, "professional_communication": prof, "interview_etiquette": prof
    }
    fb = "Demonstrated good understanding. Focus on expanding technical detail for higher impact." if overall >= 70 else "Response received. Try to provide more structured detail in your answers."

    return {
        "communication_score": comm,
        "confidence_score": conf,
        "technical_score": tech,
        "professionalism_score": prof,
        "score": overall,
        "parameters": params,
        "feedback": fb,
    }


def generate_final_report(interview_id: int, conn: Any) -> Dict[str, Any]:
    """Aggregate all question evaluations, calculate final weighted scores, rating rubric,

    and generate AI feedback arrays (Strengths, Weaknesses, Improvements, Recommendations, Resources).
    """
    questions = conn.execute(
        "SELECT * FROM interview_question WHERE interview_id = ? ORDER BY sequence_no", (interview_id,)
    ).fetchall()

    if not questions:
        return {}

    comm_list = [q["communication_score"] for q in questions if q["communication_score"] is not None]
    conf_list = [q["confidence_score"] for q in questions if q["confidence_score"] is not None]
    tech_list = [q["technical_score"] for q in questions if q["technical_score"] is not None]
    prof_list = [q["professionalism_score"] for q in questions if q["professionalism_score"] is not None]
    overall_list = [q["score"] for q in questions if q["score"] is not None]

    avg_comm = round(sum(comm_list) / len(comm_list), 2) if comm_list else 70.0
    avg_conf = round(sum(conf_list) / len(conf_list), 2) if conf_list else 70.0
    avg_tech = round(sum(tech_list) / len(tech_list), 2) if tech_list else 70.0
    avg_prof = round(sum(prof_list) / len(prof_list), 2) if prof_list else 75.0
    avg_overall = calculate_weighted_overall(avg_comm, avg_conf, avg_tech, avg_prof)

    rating = get_rating_rubric(avg_overall)

    interview_row = conn.execute("SELECT * FROM interview WHERE id = ?", (interview_id,)).fetchone()
    itype = interview_row["interview_type"] if interview_row else "Technical"
    domain = interview_row["domain"] if interview_row else "General"

    # Default structured feedback data
    strengths = [
        f"Clear structural articulation in answering {itype.lower()} questions.",
        "Good maintainance of professional tone and interview etiquette.",
        "Active listening and direct response to core question prompts.",
    ]
    weaknesses = [
        "Occasional hesitation during complex scenario questions.",
        "Could include more specific real-world metrics and quantitative results.",
    ]
    improvements = [
        "Use the STAR method (Situation, Task, Action, Result) to structure behavioral and domain responses.",
        "Practice speaking at a steady 130-150 WPM pace to project maximum authority.",
        "Incorporate relevant technical jargon and architecture patterns directly into explanations.",
    ]
    recommendations = [
        f"Mock practice 3 additional sessions in {domain} to sharpen instant recall.",
        "Record self-responses to analyze non-verbal filler words and eye contact consistency.",
        "Review core system design principles and data structure trade-offs.",
    ]
    resources = [
        {"title": "System Design & Architecture Playbook", "type": "Guide", "description": "Master scalable patterns, caching strategies, and database indexing.", "link": "https://github.com/donnemartin/system-design-primer"},
        {"title": "STAR Method Interview Technique", "type": "Article", "description": "How to structure impactful responses for HR & Behavioral interviews.", "link": "https://www.interactiveinterview.io/star-method"},
        {"title": "Technical Speech & Confidence Building", "type": "Course", "description": "Pacing, posture, and articulate delivery under pressure.", "link": "https://www.coursera.org/learn/public-speaking"},
    ]

    # Aggregate parameter breakdowns
    param_totals = {}
    param_counts = {}
    for q in questions:
        if q["parameters_json"]:
            try:
                p_dict = json.loads(q["parameters_json"])
                for k, v in p_dict.items():
                    param_totals[k] = param_totals.get(k, 0.0) + float(v)
                    param_counts[k] = param_counts.get(k, 0) + 1
            except Exception:
                pass

    detailed_params = {k: round(param_totals[k] / param_counts[k], 2) for k in param_totals}
    if not detailed_params:
        detailed_params = {
            "speech_clarity": avg_comm, "grammar_quality": avg_comm, "filler_word_freq": avg_comm, "speaking_pace": avg_comm, "response_completeness": avg_comm,
            "eye_contact_consistency": avg_conf, "facial_engagement": avg_conf, "response_hesitation": avg_conf, "speaking_confidence": avg_conf, "attention_level": avg_conf,
            "technical_accuracy": avg_tech, "keyword_relevance": avg_tech, "problem_solving_ability": avg_tech, "domain_knowledge": avg_tech, "answer_completeness": avg_tech,
            "time_management": avg_prof, "response_organization": avg_prof, "professional_communication": avg_prof, "interview_etiquette": avg_prof
        }

    # Generate custom AI feedback if an LLM provider is configured
    if llm.configured():
        try:
            qa_summary = "\n".join([f"Q: {q['question_text']}\nA: {q['answer_text'] or 'No answer'}" for q in questions])
            ai_prompt = (
                f"Generate a final mock interview evaluation report for a {itype} interview in {domain}.\n"
                f"Overall Score: {avg_overall}% ({rating})\n"
                f"Candidate QA Summary:\n{qa_summary}\n\n"
                "Return ONLY a JSON object (no markdown) with:\n"
                '{\n'
                '  "strengths": ["string", "string", "string"],\n'
                '  "weaknesses": ["string", "string"],\n'
                '  "improvements": ["string", "string", "string"],\n'
                '  "recommendations": ["string", "string", "string"],\n'
                '  "resources": [\n'
                '    {"title": "Resource Name", "type": "Guide/Course", "description": "Brief summary", "link": "https://example.com"}\n'
                '  ]\n'
                '}'
            )
            ai_report = llm.chat_json({
                "messages": [{"role": "user", "content": ai_prompt}],
                "temperature": 0.3,
            })
            if isinstance(ai_report, dict):
                if ai_report.get("strengths"): strengths = ai_report["strengths"]
                if ai_report.get("weaknesses"): weaknesses = ai_report["weaknesses"]
                if ai_report.get("improvements"): improvements = ai_report["improvements"]
                if ai_report.get("recommendations"): recommendations = ai_report["recommendations"]
                if ai_report.get("resources"): resources = ai_report["resources"]
        except Exception:
            pass

    conn.execute(
        """UPDATE interview SET
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            total_score = ?,
            communication_score = ?,
            confidence_score = ?,
            technical_score = ?,
            professionalism_score = ?,
            overall_score = ?,
            performance_rating = ?,
            strengths_json = ?,
            weaknesses_json = ?,
            improvements_json = ?,
            recommendations_json = ?,
            resources_json = ?,
            detailed_parameters_json = ?
           WHERE id = ?""",
        (
            avg_overall,
            avg_comm,
            avg_conf,
            avg_tech,
            avg_prof,
            avg_overall,
            rating,
            json.dumps(strengths),
            json.dumps(weaknesses),
            json.dumps(improvements),
            json.dumps(recommendations),
            json.dumps(resources),
            json.dumps(detailed_params),
            interview_id,
        ),
    )
    conn.commit()

    return {
        "interview_id": interview_id,
        "communication_score": avg_comm,
        "confidence_score": avg_conf,
        "technical_score": avg_tech,
        "professionalism_score": avg_prof,
        "overall_score": avg_overall,
        "performance_rating": rating,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "improvements": improvements,
        "recommendations": recommendations,
        "resources": resources,
        "detailed_parameters": detailed_params,
    }
