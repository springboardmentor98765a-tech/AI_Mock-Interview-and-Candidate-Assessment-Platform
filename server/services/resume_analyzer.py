"""
Resume Analyzer service (Module: Resume Analyzer).

Deep resume review powered by Groq (qwen/qwen3.6-27b). Produces a
ResumeWorded-style report:
  * overall score out of 100
  * five category scores (Impact, Brevity & Style, Sections & Format,
    Skills & Keywords, ATS Compatibility)
  * top fixes with counts
  * checks the resume passed ("What you did well")
  * prioritized issues with concrete fixes
  * ATS keyword coverage vs. the target role

Falls back to a deterministic rule-based analyzer when the LLM is
unavailable so the feature never hard-fails.
"""

import json
import re
import time
import urllib.error
import urllib.request

from config import (
    GROQ_API_KEY, GROQ_BASE_URL, GROQ_RESUME_MODEL,
    GROQ_API_KEY_2, GROQ_RESUME_MODEL_2,
)

CATEGORY_KEYS = ["impact", "brevity", "structure", "skills", "ats"]
EXPERIENCE_LEVELS = {
    "student": "Student / Fresher - currently studying or under 1 year of experience",
    "entry": "Entry-level - less than 2 years of work experience",
    "mid": "Mid-level - between 2 and 10 years of experience",
    "senior": "Senior-level - more than 10 years of experience",
    "switcher": "Career switcher - moving into a new domain",
}

ROLE_KEYWORDS = {
    "software engineer": ["python", "java", "javascript", "react", "node", "api", "git", "sql", "docker", "aws", "testing", "algorithms"],
    "data scientist": ["python", "sql", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "machine learning", "statistics", "visualization"],
    "data analyst": ["sql", "excel", "python", "tableau", "power bi", "dashboards", "statistics", "pandas", "reporting"],
    "ml engineer": ["python", "pytorch", "tensorflow", "mlops", "docker", "kubernetes", "llm", "model deployment", "feature engineering"],
    "web developer": ["javascript", "html", "css", "react", "node", "mongodb", "rest api", "responsive design", "git"],
    "product manager": ["roadmap", "stakeholder", "agile", "scrum", "metrics", "user research", "prioritization", "a/b testing"],
    "business analyst": ["sql", "excel", "requirements", "stakeholder", "process", "dashboards", "documentation"],
    "devops engineer": ["docker", "kubernetes", "ci/cd", "terraform", "aws", "linux", "monitoring", "jenkins"],
    "ui/ux designer": ["figma", "wireframes", "prototyping", "usability", "design system", "user research"],
    "qa engineer": ["automation", "selenium", "test cases", "api testing", "regression", "jira"],
}

# 15 granular recruiter checks that power the left-rail audit (0-10 each, like
# ResumeWorded's sheet). Keep labels short so they fit the narrow rail.
AUDIT_BLUEPRINT = [
    {"key": "quantify_impact", "title": "Quantify impact", "max": 10, "bucket": "Impact"},
    {"key": "summary", "title": "Summary section", "max": 10, "bucket": "Sections"},
    {"key": "dates", "title": "Dates & ordering", "max": 10, "bucket": "Style"},
    {"key": "repetition", "title": "Repetition", "max": 10, "bucket": "Brevity"},
    {"key": "communication", "title": "Communication", "max": 10, "bucket": "Brevity"},
    {"key": "unnecessary_sections", "title": "Unnecessary sections", "max": 10, "bucket": "Sections"},
    {"key": "readability", "title": "Readability", "max": 10, "bucket": "Brevity"},
    {"key": "contact_details", "title": "Contact details", "max": 10, "bucket": "Sections"},
    {"key": "page_density", "title": "Page density", "max": 10, "bucket": "Structure"},
    {"key": "active_voice", "title": "Active voice", "max": 10, "bucket": "Brevity"},
    {"key": "verb_tenses", "title": "Verb tenses", "max": 10, "bucket": "Style"},
    {"key": "bullet_style", "title": "Bullet style", "max": 10, "bucket": "Structure"},
    {"key": "action_verbs", "title": "Action verbs", "max": 10, "bucket": "Impact"},
    {"key": "skills_keywords", "title": "Skills & keywords", "max": 10, "bucket": "Skills"},
    {"key": "ats_parse", "title": "ATS parse rate", "max": 10, "bucket": "ATS"},
]


def _groq_configs():
    """Available Groq credentials in failover order."""
    configs = []
    if GROQ_API_KEY:
        configs.append((GROQ_API_KEY, GROQ_RESUME_MODEL))
    if GROQ_API_KEY_2:
        configs.append((GROQ_API_KEY_2, GROQ_RESUME_MODEL_2))
    # Debug: log which keys are configured (masked) so dashboard issues are visible
    try:
        masked = [f"{m} ({k[:7]}...{k[-4:]})" if k else f"{m} (empty)" for k, m in configs]
        print(f"[groq] configured models: {masked} | base={GROQ_BASE_URL}")
    except Exception:
        pass
    return configs


def _groq_chat(messages, timeout=90):
    """Call Groq with automatic failover across configured keys/models.

    Returns a tuple (content, model_used). Diagnosed issues fixed:
      * Groq free tier = 8000 TPM per *organization* (both keys share the same
        org, so failover alone doesn't double quota). Budget prompt + max_tokens
        to stay < 8000 so two rapid calls still fit.
      * qwen reasoning model burns tokens on <think> — disabled via /no_think.
      * Cloudflare blocks requests without a browser User-Agent (403 error 1010).
      * Some models reject response_format=json_object -> retry without it.
    """
    configs = _groq_configs()
    if not configs:
        raise RuntimeError("Groq API key not configured.")

    # Free tier = 8000 TPM per organization (both keys share the same org).
    # Use ~5000 max so the full JSON report fits (needs ~4800 with reasoning),
    # and rely on the 30s wait-and-retry for the second call in a burst.
    base_payload = {
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 5000,
        "response_format": {"type": "json_object"},
    }
    common_headers = {
        "Content-Type": "application/json",
        "User-Agent": "SmartHireAI/1.0",
    }

    last_exc = None
    for idx, (api_key, model) in enumerate(configs):
        # gpt-oss sometimes rejects json_object on first try; second attempt
        # retries the same model without that constraint.
        payload_variants = [
            {**base_payload, "model": model},
            {**base_payload, "model": model, "response_format": None},
        ]
        # Remove None entry so it isn't sent as JSON null
        if payload_variants[1]["response_format"] is None:
            del payload_variants[1]["response_format"]

        headers = {**common_headers, "Authorization": f"Bearer {api_key}"}

        for variant_idx, variant in enumerate(payload_variants):
            payload = json.dumps(variant).encode("utf-8")
            is_last_variant_of_last_config = idx == len(configs) - 1 and variant_idx == len(payload_variants) - 1
            attempts = 2 if is_last_variant_of_last_config else 1
            for attempt in range(attempts):
                req = urllib.request.Request(f"{GROQ_BASE_URL}/chat/completions", data=payload, headers=headers)
                try:
                    with urllib.request.urlopen(req, timeout=timeout) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                    print(f"[groq] ✓ {model} -> {len(data['choices'][0]['message']['content'])} chars")
                    return data["choices"][0]["message"]["content"], model
                except urllib.error.HTTPError as exc:
                    last_exc = exc
                    # 413/429 = TPM exhausted for this org — sleep once on the
                    # very last attempt, otherwise fail fast to the next key/
                    # variant. 400 on the first variant often means that model
                    # rejects response_format, so the second variant (without it)
                    # is worth trying immediately.
                    is_rate = exc.code in (413, 429)
                    if is_rate and attempt + 1 < attempts:
                        time.sleep(30)
                        continue
                    if exc.code == 400 and variant_idx == 0:
                        # try same key without response_format
                        break
                    if is_rate and idx + 1 < len(configs):
                        time.sleep(2)
                    break
                except Exception as exc:
                    last_exc = exc
                    break
    raise last_exc


def build_prompt(resume_text, experience_level, target_role):
    level_desc = EXPERIENCE_LEVELS.get(experience_level, EXPERIENCE_LEVELS["entry"])
    return (
        "You are a senior technical recruiter and professional resume writer "
        "with 15+ years of hiring experience. Perform a deep, honest review "
        "of the candidate's resume below.\n\n"
        f"Candidate profile: {level_desc}\n"
        f"Target role: {target_role or 'General'}\n\n"
        "Score strictly like a real recruiter would (most resumes land 45-75; "
        "only exceptional resumes exceed 85).\n\n"
        "Return ONLY a valid JSON object with EXACTLY this structure:\n"
        "{\n"
        '  "overall_score": <int 0-100>,\n'
        '  "verdict_line": "<one-sentence recruiter verdict>",\n'
        '  "categories": [\n'
        '    {"key": "impact", "label": "Impact & Results", "score": <0-100>, "summary": "<1 line>"},\n'
        '    {"key": "brevity", "label": "Brevity & Style", "score": <0-100>, "summary": "<1 line>"},\n'
        '    {"key": "structure", "label": "Sections & Formatting", "score": <0-100>, "summary": "<1 line>"},\n'
        '    {"key": "skills", "label": "Skills & Keywords", "score": <0-100>, "summary": "<1 line>"},\n'
        '    {"key": "ats", "label": "ATS Compatibility", "score": <0-100>, "summary": "<1 line>"}\n'
        "  ],\n"
        '  "detailed_audit": [\n'
        '    {"key": "<one of: quantify_impact/summary/dates/repetition/communication/unnecessary_sections/readability/contact_details/page_density/active_voice/verb_tenses/bullet_style/action_verbs/skills_keywords/ats_parse>", "title": "<same label>", "score": <0-10>, "max_score": 10, "bucket": "<Impact|Sections|Style|Brevity|Skills|ATS|Structure>"}\n'
        "  ],\n"
        '  "checks_passed": [{"title": "<short check name>", "detail": "<why it passed>"}],\n'
        '  "issues": [\n'
        '    {"severity": "critical|warning|minor", "category": "<e.g. Impact, Style, Sections>", '
        '"title": "<short title>", "detail": "<what is wrong and why it matters to recruiters>", '
        '"fix": "<a concrete rewrite example or fix step>"}\n'
        "  ],\n"
        '  "top_fixes": [{"title": "<highest-impact fix>", "count": <int occurrences>, "detail": "<why it moves the needle>"}],\n'
        '  "recommendations": [{"title": "<action>", "description": "<how to do it>"}],\n'
        '  "keywords_found": ["<role-relevant keywords present>"],\n'
        '  "keywords_missing": ["<important missing keywords for the target role>"],\n'
        '  "detected_skills": ["<top skills detected>"]\n'
        "}\n\n"
        "Rules: 5-8 issues sorted by severity; at least 4 checks_passed when possible; "
        "produce exactly 15 detailed_audit entries (one per key above, scored 0-10 where 10 is perfect); "
        "be specific to THIS resume (quote its content); fixes must be actionable.\n\n"
        f"RESUME CONTENT:\n{resume_text}"
    )


def heuristic_analysis(resume_text, filename, experience_level, target_role):
    """Rule-based fallback used when the LLM provider is unreachable."""
    text_l = resume_text.lower()
    words = len(resume_text.split())
    has_email = bool(re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", resume_text))
    has_phone = bool(re.search(r"(\+?\d[\d\s\-()]{8,})", resume_text))
    has_linkedin = "linkedin" in text_l
    numbers_used = len(re.findall(r"\b\d+(?:\.\d+)?%?\b", resume_text))
    action_verbs = ["led", "built", "designed", "developed", "implemented", "managed",
                    "created", "improved", "reduced", "increased", "launched", "automated"]
    verb_hits = sum(1 for v in action_verbs if v in text_l)
    sections = {
        "experience": any(s in text_l for s in ["experience", "internship", "employment"]),
        "education": "education" in text_l,
        "skills": "skill" in text_l,
        "projects": "project" in text_l,
        "summary": "summary" in text_l or "objective" in text_l,
    }
    sections_present = sum(sections.values())

    role_key = (target_role or "").lower().strip()
    kws = ROLE_KEYWORDS.get(role_key, ROLE_KEYWORDS["software engineer"])
    found = [k for k in kws if k in text_l]
    missing = [k for k in kws if k not in text_l]
    ats_pct = round(len(found) / max(1, len(kws)) * 100)

    impact_score = min(100, int(numbers_used / 12 * 60 + verb_hits / 8 * 40))
    brevity = 90 if 200 <= words <= 900 else (70 if words < 1200 else 50)
    structure = round(sections_present / 5 * 100)
    skills_score = min(100, 40 + len(found) * 8)
    overall = round(impact_score * 0.28 + brevity * 0.18 + structure * 0.22 + skills_score * 0.17 + ats_pct * 0.15)

    checks = []
    if has_email and has_phone:
        checks.append({"title": "Contact details", "detail": "Email and phone are present and findable."})
    if sections["education"]:
        checks.append({"title": "Education section", "detail": "Your education background is clearly listed."})
    if sections_present >= 4:
        checks.append({"title": "Core sections", "detail": f"{sections_present} of 5 standard resume sections were found."})
    if verb_hits >= 4:
        checks.append({"title": "Action verbs", "detail": "Good use of strong action verbs."})

    issues = []
    if numbers_used < 10:
        issues.append({"severity": "critical", "category": "Impact", "title": "Not enough quantified impact",
                       "detail": f"Only {numbers_used} numeric achievements were detected.",
                       "fix": "Add metrics to bullets, e.g. 'Reduced load time by 35%' instead of 'Improved performance'."})
    if not sections["projects"]:
        issues.append({"severity": "warning", "category": "Sections", "title": "Missing Projects section",
                       "detail": "Recruiters scan for projects to validate hands-on ability.",
                       "fix": "Add 2-3 bullet projects with tech stack + outcome."})
    if missing:
        issues.append({"severity": "warning", "category": "Skills & Keywords", "title": "Missing target-role keywords",
                       "detail": f"ATS scans expect: {', '.join(missing[:6])}.",
                       "fix": "Weave these keywords into skills/projects where genuinely applicable."})
    if words > 1000:
        issues.append({"severity": "minor", "category": "Brevity", "title": "Resume may be too long",
                       "detail": f"{words} words detected.", "fix": "Trim older roles; target one page for <10 yrs experience."})

    def _score_10(raw, lo=0, hi=10):
        return max(0, min(10, int(round(raw))))

    # 15 granular audit checks (0-10) mirroring ResumeWorded's sheet
    bullet_hits = resume_text.count("•") + resume_text.count("- ")
    has_summary = sections["summary"]
    has_dates = bool(re.search(r"(20\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)", resume_text))
    detail_audit = [
        {"key": "quantify_impact", "title": "Quantify impact", "score": _score_10(min(10, numbers_used * 1.1 + verb_hits * 0.4)), "max_score": 10, "bucket": "Impact"},
        {"key": "summary", "title": "Summary section", "score": 9 if has_summary else 4, "max_score": 10, "bucket": "Sections"},
        {"key": "dates", "title": "Dates", "score": 8 if has_dates else 5, "max_score": 10, "bucket": "Style"},
        {"key": "repetition", "title": "Repetition", "score": _score_10(10 - max(0, len(re.findall(r"\b(\w+)\b.*\b\1\b", text_l, flags=re.I)) * 0.6)), "max_score": 10, "bucket": "Brevity"},
        {"key": "communication", "title": "Communication", "score": _score_10(6 + verb_hits * 0.5 + (1 if has_email else 0)), "max_score": 10, "bucket": "Brevity"},
        {"key": "unnecessary_sections", "title": "Unnecessary sections", "score": 10 if sections_present >= 4 and words < 900 else 7, "max_score": 10, "bucket": "Sections"},
        {"key": "readability", "title": "Readability", "score": 10 if 200 <= words <= 900 else (7 if words < 1200 else 5), "max_score": 10, "bucket": "Brevity"},
        {"key": "contact_details", "title": "Contact details", "score": 10 if (has_email and has_phone) else (6 if has_email else 4), "max_score": 10, "bucket": "Sections"},
        {"key": "page_density", "title": "Page density", "score": 10 if 250 <= words <= 750 else (7 if words < 1000 else 5), "max_score": 10, "bucket": "Structure"},
        {"key": "active_voice", "title": "Active voice", "score": _score_10(5 + verb_hits * 0.7), "max_score": 10, "bucket": "Brevity"},
        {"key": "verb_tenses", "title": "Verb tenses", "score": 9 if verb_hits >= 3 else 6, "max_score": 10, "bucket": "Style"},
        {"key": "bullet_style", "title": "Bullet style", "score": 9 if bullet_hits >= 4 else (6 if bullet_hits >= 2 else 4), "max_score": 10, "bucket": "Structure"},
        {"key": "action_verbs", "title": "Action verbs", "score": _score_10(4 + verb_hits * 0.8), "max_score": 10, "bucket": "Impact"},
        {"key": "skills_keywords", "title": "Skills & keywords", "score": _score_10(3 + len(found) * 0.7), "max_score": 10, "bucket": "Skills"},
        {"key": "ats_parse", "title": "ATS parse rate", "score": _score_10(ats_pct / 10), "max_score": 10, "bucket": "ATS"},
    ]

    return {
        "overall_score": max(20, min(95, overall)),
        "verdict_line": f"Heuristic review complete - {len(issues)} improvement areas identified for your target role.",
        "categories": [
            {"key": "impact", "label": "Impact & Results", "score": impact_score, "summary": f"{numbers_used} quantified achievements"},
            {"key": "brevity", "label": "Brevity & Style", "score": brevity, "summary": f"{words} words"},
            {"key": "structure", "label": "Sections & Formatting", "score": structure, "summary": f"{sections_present}/5 core sections"},
            {"key": "skills", "label": "Skills & Keywords", "score": skills_score, "summary": f"{len(found)} role keywords found"},
            {"key": "ats", "label": "ATS Compatibility", "score": ats_pct, "summary": f"{ats_pct}% keyword coverage"},
        ],
        "detailed_audit": detail_audit,
        "checks_passed": checks or [{"title": "Parsed successfully", "detail": "Resume text was extracted and reviewed."}],
        "issues": issues or [{"severity": "minor", "category": "General", "title": "Solid baseline",
                              "detail": "No critical problems detected by rule-based checks.",
                              "fix": "Run again later for a full AI-powered deep review."}],
        "top_fixes": [{"title": i["title"], "count": 1, "detail": i["fix"]} for i in issues[:3]],
        "recommendations": [{"title": "Quantify your impact", "description": "Add measurable outcomes to as many bullets as possible."},
                            {"title": "Tailor to the role", "description": f"Mirror keywords from real {target_role or 'target'} job posts."}],
        "keywords_found": found,
        "keywords_missing": missing,
        "detected_skills": found[:12],
    }


def analyze_resume(filename, content_bytes, raw_text, experience_level="entry", target_role=""):
    """Full analysis entry point. Raises nothing - always returns an analysis dict."""
    trimmed = raw_text[:4500]
    analysis = None
    ai_model = None
    try:
        raw_out, ai_model = _groq_chat([
            # /no_think: qwen3.6 is a reasoning model - without this switch it
            # burns its whole token budget on hidden <think> blocks and the
            # JSON comes back empty.
            {"role": "system", "content": "/no_think You are an expert resume reviewer API that replies only with valid JSON."},
            {"role": "user", "content": build_prompt(trimmed, experience_level, target_role)},
        ])
        # reasoning models may emit <think> blocks - strip them before JSON extraction
        cleaned = re.sub(r"<think>.*?</think>", "", str(raw_out).strip(), flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned.strip(), flags=re.IGNORECASE)
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "overall_score" in parsed:
            analysis = parsed
    except Exception:
        analysis = None

    source = "groq_ai"
    if not analysis:
        analysis = heuristic_analysis(trimmed, filename, experience_level, target_role)
        source = "heuristic_fallback"
        ai_model = None

    categories = []
    for cat in analysis.get("categories", [])[:5]:
        if not isinstance(cat, dict):
            continue
        score = cat.get("score", 0)
        try:
            score = max(0, min(100, int(round(float(score)))))
        except Exception:
            score = 0
        categories.append({
            "key": cat.get("key") or "",
            "label": cat.get("label") or cat.get("key") or "Category",
            "score": score,
            "summary": cat.get("summary") or "",
        })
    for key, label in zip(CATEGORY_KEYS, ["Impact & Results", "Brevity & Style", "Sections & Formatting", "Skills & Keywords", "ATS Compatibility"]):
        if not any(c["key"] == key for c in categories):
            categories.append({"key": key, "label": label, "score": 50, "summary": ""})
    categories.sort(key=lambda c: CATEGORY_KEYS.index(c["key"]) if c["key"] in CATEGORY_KEYS else 99)

    overall = analysis.get("overall_score", 50)
    try:
        overall = max(0, min(100, int(round(float(overall)))))
    except Exception:
        overall = 50

    def _str_list(val, limit=12):
        if not isinstance(val, list):
            return []
        return [str(v)[:160] for v in val][:limit]

    kw_found = _str_list(analysis.get("keywords_found"))
    kw_missing = _str_list(analysis.get("keywords_missing"), 14)
    skills = _str_list(analysis.get("detected_skills"))

    # The model sometimes omits keyword/skill data - backfill from the
    # rule-based detector so the report sections are never empty.
    if source == "groq_ai" and not kw_found and not kw_missing:
        heuristic = heuristic_analysis(trimmed, filename, experience_level, target_role)
        kw_found = [k.capitalize() for k in heuristic.get("keywords_found", [])]
        kw_missing = [k.capitalize() for k in heuristic.get("keywords_missing", [])]
        if not skills:
            skills = [s.capitalize() for s in heuristic.get("detected_skills", [])]

    # Normalize 15-item detailed audit (0-10 per check). If AI omitted it or
    # returned fewer than 8 items, synthesize from the heuristic so the left
    # rail is always fully populated like ResumeWorded's 20-check sheet.
    raw_audit = analysis.get("detailed_audit")
    if not isinstance(raw_audit, list) or len(raw_audit) < 8:
        heuristic = heuristic_analysis(trimmed, filename, experience_level, target_role) if "heuristic" not in locals() else heuristic
        raw_audit = heuristic.get("detailed_audit", [])

    blueprint_map = {b["key"]: b for b in AUDIT_BLUEPRINT}
    audit = []
    seen = set()
    for item in (raw_audit or [])[:15]:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or item.get("title") or "").strip().lower().replace(" ", "_")
        if key not in blueprint_map:
            # try fuzzy match on title
            title_l = str(item.get("title") or "").lower()
            for bk, bv in blueprint_map.items():
                if bv["title"].lower() in title_l or title_l in bv["title"].lower():
                    key = bk
                    break
        if key not in blueprint_map or key in seen:
            continue
        try:
            sc = max(0, min(10, int(round(float(item.get("score", 5))))))
        except Exception:
            sc = 5
        bp = blueprint_map[key]
        audit.append({"key": key, "title": bp["title"], "score": sc, "max_score": 10, "bucket": bp["bucket"]})
        seen.add(key)

    for b in AUDIT_BLUEPRINT:
        if b["key"] not in seen:
            # pull from heuristic if available
            h_item = next((x for x in (heuristic.get("detailed_audit", []) if "heuristic" in locals() else []) if x["key"] == b["key"]), None)
            sc = h_item["score"] if h_item else 5
            audit.append({"key": b["key"], "title": b["title"], "score": sc, "max_score": 10, "bucket": b["bucket"]})

    audit.sort(key=lambda x: [b["key"] for b in AUDIT_BLUEPRINT].index(x["key"]))

    # Keep a short preview of the extracted resume text for the right-hand
    # live preview pane (mirrors ResumeWorded's right column). Preserve
    # line breaks so the preview looks like the original document.
    _preview = re.sub(r"[ \t]+", " ", trimmed)
    _preview = re.sub(r"\n{3,}", "\n\n", _preview)
    resume_preview = _preview.strip()[:2200]

    return {
        "source": source,
        "ai_model": ai_model,
        "filename": filename,
        "experience_level": experience_level,
        "target_role": target_role or None,
        "overall_score": overall,
        "verdict_line": str(analysis.get("verdict_line") or "")[:300],
        "categories": categories,
        "detailed_audit": audit,
        "resume_preview": resume_preview,
        "checks_passed": _str_list_dicts(analysis.get("checks_passed")),
        "issues": _normalize_issues(analysis.get("issues")),
        "top_fixes": _str_list_dicts(analysis.get("top_fixes")),
        "recommendations": _str_list_dicts(analysis.get("recommendations")),
        "keywords_found": kw_found,
        "keywords_missing": kw_missing,
        "detected_skills": skills,
    }


def _str_list_dicts(val, limit=10):
    out = []
    if isinstance(val, list):
        for item in val[:limit]:
            if isinstance(item, dict):
                out.append({k: str(v)[:400] for k, v in item.items()})
            elif isinstance(item, str):
                out.append({"title": item[:200], "detail": ""})
    return out


def _normalize_issues(val, limit=10):
    order = {"critical": 0, "warning": 1, "minor": 2}
    items = _str_list_dicts(val)
    for item in items:
        sev = str(item.get("severity", "warning")).lower()
        item["severity"] = sev if sev in order else "warning"
    items.sort(key=lambda i: order[i["severity"]])
    return items
