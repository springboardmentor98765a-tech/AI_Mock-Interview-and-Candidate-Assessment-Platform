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


COMMON_FILLER_WORDS = [
    "um", "uh", "er", "ah", "like", "you know", "basically", "actually",
    "literally", "sort of", "kind of", "i mean", "right"
]


def detect_fillers_heuristically(text: str) -> Dict[str, Any]:
    """Fallback detector for verbal filler words."""
    if not text:
        return {"filler_score": 95.0, "filler_count": 0, "filler_words": [], "filler_status": "Clear Fluency"}

    text_lower = text.lower()
    counts = {}
    total_fillers = 0
    for filler in COMMON_FILLER_WORDS:
        pattern = r"\b" + re.escape(filler) + r"\b"
        matches = len(re.findall(pattern, text_lower))
        if matches > 0:
            counts[filler] = matches
            total_fillers += matches

    words = text.split()
    total_words = max(1, len(words))
    filler_ratio = total_fillers / total_words

    if total_fillers == 0:
        score = 98.0
        status = "Clear Fluency"
    elif filler_ratio < 0.05:
        score = max(80.0, 95.0 - (total_fillers * 3.0))
        status = "Minimal Fillers"
    elif filler_ratio < 0.12:
        score = max(65.0, 80.0 - (total_fillers * 4.0))
        status = "Moderate Fillers"
    else:
        score = max(45.0, 65.0 - (total_fillers * 5.0))
        status = "High Hesitation"

    filler_list = [{"word": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: x[1], reverse=True)]
    return {
        "filler_score": round(score, 2),
        "filler_count": total_fillers,
        "filler_words": filler_list,
        "filler_status": status,
    }


def detect_grammar_heuristically(text: str) -> Dict[str, Any]:
    """Fallback detector for basic grammatical issues."""
    if not text:
        return {"grammar_score": 90.0, "issues": [], "message": "No major grammar issues detected."}

    issues = []
    text_lower = text.lower()

    rules = [
        (r"\b(he|she|it)\s+go\s+(to\s+.*)?yesterday\b", "He went to the office yesterday.", "Use the past tense because the action happened yesterday."),
        (r"\b(he|she|it)\s+go\b", "He goes / He went", "Subject-verb agreement: use 'goes' for present tense or 'went' for past tense with singular subjects."),
        (r"\b(he|she|it)\s+have\b", "He/she has", "Use 'has' with third-person singular subjects (he/she/it)."),
        (r"\b(they|we)\s+was\b", "They were", "Subject-verb agreement: use 'were' with plural subjects."),
        (r"\byou\s+was\b", "You were", "Subject-verb agreement: 'you' always takes the plural verb form 'were' in past tense."),
        (r"\b(i)\s+has\b", "I have", "Use 'have' with first-person singular 'I'."),
        (r"\b(i|they|we|you)\s+does\b", "I/they/we do", "Use 'do' with plural subjects and 'I'."),
        (r"\b(more\s+better|most\s+best)\b", "better / best", "Avoid double comparatives/superlatives; 'better' and 'best' already express comparison."),
        (r"\bdidn't\s+(\w+ed|\w+went|\w+saw)\b", "didn't + base verb", "Use the base form of the verb after 'did not / didn't' (e.g., 'didn't go', not 'didn't went')."),
    ]

    matched_spans = []
    for pattern, corr, why in rules:
        for match in re.finditer(pattern, text_lower):
            span = match.span()
            # Check if this span overlaps with an already matched span
            if any(s[0] <= span[0] and span[1] <= s[1] for s in matched_spans):
                continue
            matched_spans.append(span)
            orig = match.group(0)
            issues.append({"original": orig, "correction": corr, "why": why})

    words = text.split()
    if not issues:
        grammar_score = 96.0 if len(words) >= 15 else 92.0
        return {
            "grammar_score": grammar_score,
            "issues": [],
            "message": "No major grammar issues detected.",
        }

    grammar_score = max(50.0, 92.0 - (len(issues) * 10.0))
    return {
        "grammar_score": round(grammar_score, 2),
        "issues": issues,
        "message": f"{len(issues)} issue{'s' if len(issues) > 1 else ''} detected",
    }


def evaluate_answer_full(question_text: str, category: str, difficulty: str, answer_text: str) -> Dict[str, Any]:
    """Evaluate candidate answer across Module 5 spoken communication, grammar, fillers, pronunciation, technical accuracy, and professionalism."""
    if llm.configured():
        try:
            prompt = (
                "You are an expert AI interview and communication evaluator for SmartHire AI. "
                "Analyze the candidate's spoken response transcript thoroughly across grammatical quality, verbal fluency (fillers), "
                "pronunciation/enunciation clarity, speaking pace, technical accuracy, and professionalism.\n\n"
                f"Question: {question_text}\n"
                f"Category: {category}\n"
                f"Difficulty: {difficulty}\n"
                f"Candidate Spoken Answer: {answer_text}\n\n"
                "Return ONLY a raw JSON object (no markdown code blocks, no backticks) strictly matching this schema:\n"
                "{\n"
                '  "grammar_score": 82,\n'
                '  "grammar_issues": [\n'
                '    {\n'
                '      "original": "He go to the office yesterday.",\n'
                '      "correction": "He went to the office yesterday.",\n'
                '      "why": "Use the past tense because the action happened yesterday."\n'
                '    }\n'
                '  ],\n'
                '  "filler_score": 90,\n'
                '  "filler_count": 1,\n'
                '  "filler_words": [{"word": "like", "count": 1}],\n'
                '  "filler_status": "Clear Fluency",\n'
                '  "pronunciation_score": 92,\n'
                '  "pronunciation_status": "Crisp & Articulate",\n'
                '  "pronunciation_notes": [\n'
                '    {"word": "asynchronous", "tip": "Pronounced /eɪˈsɪŋkrənəs/ - enunciate all syllables clearly."}\n'
                '  ],\n'
                '  "speaking_pace_score": 85,\n'
                '  "wpm_estimate": 140,\n'
                '  "speaking_pace_status": "Optimal Cadence",\n'
                '  "confidence_score": 80,\n'
                '  "technical_score": 90,\n'
                '  "professionalism_score": 85,\n'
                '  "parameters": {\n'
                '    "speech_clarity": 90,\n'
                '    "grammar_quality": 85,\n'
                '    "filler_word_freq": 90,\n'
                '    "speaking_pace": 85,\n'
                '    "response_completeness": 85,\n'
                '    "eye_contact_consistency": 85,\n'
                '    "facial_engagement": 80,\n'
                '    "response_hesitation": 85,\n'
                '    "speaking_confidence": 80,\n'
                '    "attention_level": 85,\n'
                '    "technical_accuracy": 90,\n'
                '    "keyword_relevance": 90,\n'
                '    "problem_solving_ability": 85,\n'
                '    "domain_knowledge": 90,\n'
                '    "answer_completeness": 85,\n'
                '    "time_management": 85,\n'
                '    "response_organization": 85,\n'
                '    "professional_communication": 85,\n'
                '    "interview_etiquette": 90\n'
                '  },\n'
                '  "feedback": "2 sentence detailed feedback on technical correctness and communication delivery."\n'
                "}\n"
                "Note: If there are NO grammar errors, set grammar_score to 95-100 and grammar_issues to []. If no fillers, set filler_count to 0 and filler_words to []."
            )
            data = llm.chat_json({
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            }, is_eval=True)

            if isinstance(data, dict):
                g_score = float(data.get("grammar_score", 90))
                g_issues = data.get("grammar_issues", [])
                if not isinstance(g_issues, list): g_issues = []

                f_score = float(data.get("filler_score", 95))
                f_count = int(data.get("filler_count", len(data.get("filler_words", []))))
                f_words = data.get("filler_words", [])
                if not isinstance(f_words, list): f_words = []
                f_status = str(data.get("filler_status") or ("Clear Fluency" if f_count == 0 else "Moderate Fillers"))

                p_score = float(data.get("pronunciation_score", 90))
                p_status = str(data.get("pronunciation_status") or "Crisp & Articulate")
                p_notes = data.get("pronunciation_notes", [])
                if not isinstance(p_notes, list): p_notes = []

                pace_score = float(data.get("speaking_pace_score", 85))
                wpm_est = int(data.get("wpm_estimate", 140))
                pace_status = str(data.get("speaking_pace_status") or "Optimal Cadence")

                params = data.get("parameters", {})
                speech_clarity = float(params.get("speech_clarity", p_score))
                grammar_quality = float(params.get("grammar_quality", g_score))
                filler_word_freq = float(params.get("filler_word_freq", f_score))
                speaking_pace = float(params.get("speaking_pace", pace_score))
                response_completeness = float(params.get("response_completeness", 80))

                # Module 5 Communication Score Formula (30% total interview weight):
                # 20% clarity + 25% grammar + 20% filler control + 15% pace + 20% completeness
                comm = round((speech_clarity * 0.20) + (grammar_quality * 0.25) + (filler_word_freq * 0.20) + (speaking_pace * 0.15) + (response_completeness * 0.20), 2)
                conf = round(float(data.get("confidence_score", 75)), 2)
                tech = round(float(data.get("technical_score", 75)), 2)
                prof = round(float(data.get("professionalism_score", 80)), 2)
                overall = calculate_weighted_overall(comm, conf, tech, prof)

                # Ensure parameters object has all keys populated
                params.update({
                    "speech_clarity": speech_clarity,
                    "grammar_quality": grammar_quality,
                    "filler_word_freq": filler_word_freq,
                    "speaking_pace": speaking_pace,
                    "response_completeness": response_completeness,
                })

                grammar_analysis = {
                    "grammar_score": round(g_score, 2),
                    "issues_count": len(g_issues),
                    "issues": g_issues,
                    "message": "No major grammar issues detected." if not g_issues else f"{len(g_issues)} issue{'s' if len(g_issues) > 1 else ''} detected",
                }
                filler_analysis = {
                    "filler_score": round(f_score, 2),
                    "filler_count": f_count,
                    "filler_words": f_words,
                    "filler_status": f_status,
                }
                pronunciation_analysis = {
                    "pronunciation_score": round(p_score, 2),
                    "pronunciation_status": p_status,
                    "pronunciation_notes": p_notes,
                }
                pace_analysis = {
                    "speaking_pace_score": round(pace_score, 2),
                    "wpm": wpm_est,
                    "status": pace_status,
                }
                communication_analysis = {
                    "communication_score": comm,
                    "parameters": {
                        "speech_clarity": speech_clarity,
                        "grammar_quality": grammar_quality,
                        "filler_word_freq": filler_word_freq,
                        "speaking_pace": speaking_pace,
                        "response_completeness": response_completeness,
                    },
                    "grammar_analysis": grammar_analysis,
                    "filler_analysis": filler_analysis,
                    "pronunciation_analysis": pronunciation_analysis,
                    "pace_analysis": pace_analysis,
                }

                return {
                    "communication_score": comm,
                    "confidence_score": conf,
                    "technical_score": tech,
                    "professionalism_score": prof,
                    "score": overall,
                    "parameters": params,
                    "grammar_analysis": grammar_analysis,
                    "filler_analysis": filler_analysis,
                    "pronunciation_analysis": pronunciation_analysis,
                    "pace_analysis": pace_analysis,
                    "communication_analysis": communication_analysis,
                    "feedback": str(data.get("feedback") or "Demonstrated solid domain understanding."),
                }
        except Exception:
            pass

    # Heuristic fallback evaluation if LLM service is temporarily unavailable
    word_count = len(answer_text.strip().split())
    base_score = 40.0
    if word_count > 60:
        base_score = 82.0
    elif word_count > 30:
        base_score = 72.0
    elif word_count > 15:
        base_score = 60.0

    grammar_analysis = detect_grammar_heuristically(answer_text)
    filler_analysis = detect_fillers_heuristically(answer_text)

    speech_clarity = round(min(100.0, base_score + (5.0 if word_count > 30 else 0.0)), 2)
    grammar_quality = grammar_analysis["grammar_score"]
    filler_word_freq = filler_analysis["filler_score"]
    speaking_pace = 85.0
    response_completeness = round(min(100.0, base_score + (8.0 if word_count > 50 else 2.0)), 2)

    comm = round((speech_clarity * 0.20) + (grammar_quality * 0.25) + (filler_word_freq * 0.20) + (speaking_pace * 0.15) + (response_completeness * 0.20), 2)
    conf = round(min(100.0, base_score + 2.0), 2)
    tech = round(min(100.0, base_score + (8.0 if word_count > 50 else 0.0)), 2)
    prof = round(min(100.0, base_score + 5.0), 2)
    overall = calculate_weighted_overall(comm, conf, tech, prof)

    pronunciation_analysis = {
        "pronunciation_score": speech_clarity,
        "pronunciation_status": "Crisp & Articulate" if speech_clarity >= 75 else "Good Enunciation",
        "pronunciation_notes": [],
    }
    pace_analysis = {
        "speaking_pace_score": speaking_pace,
        "wpm": 140,
        "status": "Optimal Cadence",
    }
    communication_analysis = {
        "communication_score": comm,
        "parameters": {
            "speech_clarity": speech_clarity,
            "grammar_quality": grammar_quality,
            "filler_word_freq": filler_word_freq,
            "speaking_pace": speaking_pace,
            "response_completeness": response_completeness,
        },
        "grammar_analysis": grammar_analysis,
        "filler_analysis": filler_analysis,
        "pronunciation_analysis": pronunciation_analysis,
        "pace_analysis": pace_analysis,
    }

    params = {
        "speech_clarity": speech_clarity, "grammar_quality": grammar_quality, "filler_word_freq": filler_word_freq, "speaking_pace": speaking_pace, "response_completeness": response_completeness,
        "eye_contact_consistency": conf, "facial_engagement": conf, "response_hesitation": conf, "speaking_confidence": conf, "attention_level": conf,
        "technical_accuracy": tech, "keyword_relevance": tech, "problem_solving_ability": tech, "domain_knowledge": tech, "answer_completeness": tech,
        "time_management": prof, "response_organization": prof, "professional_communication": prof, "interview_etiquette": prof
    }
    fb = "Demonstrated clear understanding. Elaborate further with architectural details for maximum score." if overall >= 70 else "Response received. Structure your explanation with more clarity and technical detail."

    return {
        "communication_score": comm,
        "confidence_score": conf,
        "technical_score": tech,
        "professionalism_score": prof,
        "score": overall,
        "parameters": params,
        "grammar_analysis": grammar_analysis,
        "filler_analysis": filler_analysis,
        "pronunciation_analysis": pronunciation_analysis,
        "pace_analysis": pace_analysis,
        "communication_analysis": communication_analysis,
        "feedback": fb,
    }


def generate_final_report(interview_id: int, conn: Any) -> Dict[str, Any]:
    """Aggregate all question evaluations, calculate final weighted scores, rating rubric,
    and generate AI feedback arrays and Module 5 communication analytics (Grammar, Fillers, Pace, Pronunciation).
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

    interview_row = conn.execute("SELECT * FROM interview_session WHERE id = ?", (interview_id,)).fetchone()
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

    # Aggregate parameter breakdowns and Module 5 communication analytics
    param_totals = {}
    param_counts = {}
    all_grammar_issues = []
    all_filler_words_map = {}
    all_pronunciation_notes = []
    total_fillers_detected = 0

    for q in questions:
        if q["parameters_json"]:
            try:
                p_dict = json.loads(q["parameters_json"])
                for k, v in p_dict.items():
                    if isinstance(v, (int, float)):
                        param_totals[k] = param_totals.get(k, 0.0) + float(v)
                        param_counts[k] = param_counts.get(k, 0) + 1
            except Exception:
                pass

        # Parse question-level grammar, fillers, pronunciation if present
        if "grammar_json" in q.keys() and q["grammar_json"]:
            try:
                g_data = json.loads(q["grammar_json"])
                for iss in g_data.get("issues", []):
                    if iss not in all_grammar_issues:
                        all_grammar_issues.append(iss)
            except Exception:
                pass

        if "filler_json" in q.keys() and q["filler_json"]:
            try:
                f_data = json.loads(q["filler_json"])
                total_fillers_detected += f_data.get("filler_count", 0)
                for fw in f_data.get("filler_words", []):
                    w = fw.get("word")
                    c = fw.get("count", 1)
                    if w:
                        all_filler_words_map[w] = all_filler_words_map.get(w, 0) + c
            except Exception:
                pass

        if "pronunciation_json" in q.keys() and q["pronunciation_json"]:
            try:
                p_data = json.loads(q["pronunciation_json"])
                for note in p_data.get("pronunciation_notes", []):
                    if note not in all_pronunciation_notes:
                        all_pronunciation_notes.append(note)
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

    # Aggregate Module 5 Analytics
    grammar_score = detailed_params.get("grammar_quality", avg_comm)
    grammar_analysis = {
        "grammar_score": grammar_score,
        "issues_count": len(all_grammar_issues),
        "issues": all_grammar_issues,
        "message": "No major grammar issues detected." if not all_grammar_issues else f"{len(all_grammar_issues)} issue{'s' if len(all_grammar_issues) > 1 else ''} detected",
    }

    filler_score = detailed_params.get("filler_word_freq", 95.0)
    filler_words_list = [{"word": k, "count": v} for k, v in sorted(all_filler_words_map.items(), key=lambda x: x[1], reverse=True)]
    filler_analysis = {
        "filler_score": filler_score,
        "filler_count": total_fillers_detected or sum(all_filler_words_map.values()),
        "filler_words": filler_words_list,
        "filler_status": "Clear Fluency" if (total_fillers_detected == 0 and not filler_words_list) else "Moderate Fillers" if total_fillers_detected < 5 else "High Hesitation",
    }

    pronunciation_score = detailed_params.get("speech_clarity", avg_comm)
    pronunciation_analysis = {
        "pronunciation_score": pronunciation_score,
        "pronunciation_status": "Crisp & Articulate" if pronunciation_score >= 85 else "Good Enunciation" if pronunciation_score >= 70 else "Needs Clarity",
        "pronunciation_notes": all_pronunciation_notes,
    }

    pace_score = detailed_params.get("speaking_pace", 85.0)
    pace_analysis = {
        "speaking_pace_score": pace_score,
        "wpm": 140,
        "status": "Optimal Cadence" if 75 <= pace_score <= 100 else "Pacing Varied",
    }

    communication_analysis = {
        "communication_score": avg_comm,
        "parameters": {
            "speech_clarity": detailed_params.get("speech_clarity", avg_comm),
            "grammar_quality": grammar_score,
            "filler_word_freq": filler_score,
            "speaking_pace": pace_score,
            "response_completeness": detailed_params.get("response_completeness", avg_comm),
        },
        "grammar_analysis": grammar_analysis,
        "filler_analysis": filler_analysis,
        "pronunciation_analysis": pronunciation_analysis,
        "pace_analysis": pace_analysis,
    }

    # Generate custom AI feedback if an LLM provider is configured
    if llm.configured():
        try:
            qa_summary = "\n".join([f"Q: {q['question_text']}\nA: {q['answer_text'] or 'No answer'}" for q in questions])
            ai_prompt = (
                f"Generate a final mock interview evaluation report for a {itype} interview in {domain}.\n"
                f"Overall Score: {avg_overall}% ({rating})\n"
                f"Communication Score: {avg_comm}%\n"
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
            }, is_eval=True)
            if isinstance(ai_report, dict):
                if ai_report.get("strengths"): strengths = ai_report["strengths"]
                if ai_report.get("weaknesses"): weaknesses = ai_report["weaknesses"]
                if ai_report.get("improvements"): improvements = ai_report["improvements"]
                if ai_report.get("recommendations"): recommendations = ai_report["recommendations"]
                if ai_report.get("resources"): resources = ai_report["resources"]
        except Exception:
            pass

    # Check columns in interview_session table
    session_cols = {row["name"] for row in conn.execute("PRAGMA table_info(interview_session)").fetchall()}
    if "grammar_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN grammar_analysis_json TEXT")
    if "filler_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN filler_analysis_json TEXT")
    if "pronunciation_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN pronunciation_analysis_json TEXT")
    if "communication_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN communication_analysis_json TEXT")

    conn.execute(
        """UPDATE interview_session SET
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
            detailed_parameters_json = ?,
            grammar_analysis_json = ?,
            filler_analysis_json = ?,
            pronunciation_analysis_json = ?,
            communication_analysis_json = ?
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
            json.dumps(grammar_analysis),
            json.dumps(filler_analysis),
            json.dumps(pronunciation_analysis),
            json.dumps(communication_analysis),
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
        "grammar_analysis": grammar_analysis,
        "filler_analysis": filler_analysis,
        "pronunciation_analysis": pronunciation_analysis,
        "pace_analysis": pace_analysis,
        "communication_analysis": communication_analysis,
    }
