import json
import re
import os
import requests
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from backend.config import settings
from backend.models.speech_models import (
    GrammarAnalysisResult,
    GrammarMistake,
    SentenceGrammarAnalysis,
)

def _get_gemini_client():
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if api_key:
        try:
            return genai.Client(api_key=api_key)
        except Exception:
            return None
    return None

# Pre-compiled high-performance grammatical rules for sub-millisecond execution
PRECOMPILED_RULES = [
    # --- 1. Subject-Verb Agreement (Singular / Plural Pronouns & Nouns) ---
    (re.compile(r'\b(I|i)\s+is\b', re.IGNORECASE), "I is", "I am", "Subject-verb agreement: 'I' requires 'am'.", "High"),
    (re.compile(r'\b(I|i)\s+has\b', re.IGNORECASE), "I has", "I have", "Subject-verb agreement: 'I' requires 'have'.", "High"),
    (re.compile(r'\b(I|i)\s+does\b', re.IGNORECASE), "I does", "I do", "Subject-verb agreement: 'I' requires 'do'.", "High"),
    (re.compile(r'\b(they|we|you)\s+was\b', re.IGNORECASE), "was", "were", "Plural pronoun requires 'were'.", "High"),
    (re.compile(r'\b(they|we|you)\s+is\b', re.IGNORECASE), "is", "are", "Plural pronoun requires 'are'.", "High"),
    (re.compile(r'\b(they|we|you)\s+has\b', re.IGNORECASE), "has", "have", "Plural pronoun requires 'have'.", "High"),
    (re.compile(r'\b(they|we|you)\s+does\b', re.IGNORECASE), "does", "do", "Plural pronoun requires 'do'.", "High"),
    (re.compile(r'\b(he|she|it)\s+don\'?t\b', re.IGNORECASE), "don't", "doesn't", "Third-person singular requires 'doesn't'.", "High"),
    (re.compile(r'\b(he|she|it)\s+are\b', re.IGNORECASE), "are", "is", "Third-person singular requires 'is'.", "High"),
    (re.compile(r'\b(he|she|it)\s+have\b', re.IGNORECASE), "have", "has", "Third-person singular requires 'has'.", "High"),
    (re.compile(r'\b(he|she|it)\s+do\b', re.IGNORECASE), "do", "does", "Third-person singular requires 'does'.", "High"),
    (re.compile(r'\b(this|that)\s+(are|were)\b', re.IGNORECASE), "this/that + are/were", "is/was", "Singular demonstrative requires singular verb.", "High"),
    (re.compile(r'\b(these|those)\s+(is|was)\b', re.IGNORECASE), "these/those + is/was", "are/were", "Plural demonstrative requires plural verb.", "High"),
    (re.compile(r'\b(everyone|everybody|someone|somebody|nobody|no\s+one)\s+(are|were)\b', re.IGNORECASE), "indefinite pronoun + are/were", "is/was", "Indefinite pronoun takes singular verb.", "High"),
    (re.compile(r'\b(everyone|everybody|someone|somebody|nobody|no\s+one)\s+have\b', re.IGNORECASE), "indefinite pronoun + have", "has", "Indefinite pronoun takes singular verb 'has'.", "High"),

    # --- 2. Redundant & Incorrect Comparatives & Superlatives ---
    (re.compile(r'\bmore\s+(better|faster|easier|harder|bigger|smaller|stronger|simpler|closer|higher|cleaner|smarter|safer)\b', re.IGNORECASE), "more + comparative", "better/faster/easier", "Redundant comparative quantifier: '-er' comparative suffix is already present.", "Medium"),
    (re.compile(r'\bmost\s+(best|fastest|easiest|hardest|biggest|smallest|strongest|closest|highest|cleanest|smartest|safest)\b', re.IGNORECASE), "most + superlative", "best/fastest/easiest", "Redundant superlative quantifier.", "Medium"),

    # --- 3. Past Participle & Auxiliary Verb Mismatches ---
    (re.compile(r'\b(have|has|had)\s+went\b', re.IGNORECASE), "went", "gone", "Past participle form 'gone' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+saw\b', re.IGNORECASE), "saw", "seen", "Past participle form 'seen' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+did\b', re.IGNORECASE), "did", "done", "Past participle form 'done' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+wrote\b', re.IGNORECASE), "wrote", "written", "Past participle form 'written' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+took\b', re.IGNORECASE), "took", "taken", "Past participle form 'taken' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+spoke\b', re.IGNORECASE), "spoke", "spoken", "Past participle form 'spoken' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+broke\b', re.IGNORECASE), "broke", "broken", "Past participle form 'broken' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+chose\b', re.IGNORECASE), "chose", "chosen", "Past participle form 'chosen' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+drove\b', re.IGNORECASE), "drove", "driven", "Past participle form 'driven' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+ran\b', re.IGNORECASE), "ran", "run", "Past participle form 'run' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+gave\b', re.IGNORECASE), "gave", "given", "Past participle form 'given' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+came\b', re.IGNORECASE), "came", "come", "Past participle form 'come' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+ate\b', re.IGNORECASE), "ate", "eaten", "Past participle form 'eaten' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+knew\b', re.IGNORECASE), "knew", "known", "Past participle form 'known' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+grew\b', re.IGNORECASE), "grew", "grown", "Past participle form 'grown' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+began\b', re.IGNORECASE), "began", "begun", "Past participle form 'begun' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+drank\b', re.IGNORECASE), "drank", "drunk", "Past participle form 'drunk' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+flew\b', re.IGNORECASE), "flew", "flown", "Past participle form 'flown' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+threw\b', re.IGNORECASE), "threw", "thrown", "Past participle form 'thrown' required after have/has/had.", "High"),
    (re.compile(r'\b(have|has|had)\s+fell\b', re.IGNORECASE), "fell", "fallen", "Past participle form 'fallen' required after have/has/had.", "High"),

    # --- 4. Double Modals & Do/Did Auxiliary Misuse ---
    (re.compile(r'\b(did|didn\'?t)\s+(went|saw|spoke|wrote|took|broke|did|came|ate|knew|began|ran|gave|felt)\b', re.IGNORECASE), "did + past tense", "did + base verb", "Auxiliary 'did/didn't' must be followed by the base form of the verb.", "High"),
    (re.compile(r'\b(does|doesn\'?t)\s+(goes|has|works|makes|builds|writes|takes|creates|runs|shows|calls)\b', re.IGNORECASE), "does + s-form", "does + base verb", "Auxiliary 'does/doesn't' already carries third-person inflection; use base verb.", "High"),
    (re.compile(r'\bcan\s+able\s+to\b', re.IGNORECASE), "can able to", "can / is able to", "Redundant modal combination. Use either 'can' or 'is able to'.", "Medium"),
    (re.compile(r'\bwill\s+can\b', re.IGNORECASE), "will can", "will be able to", "Double modal. Use 'will be able to'.", "High"),

    # --- 5. Modal Preposition Substitution ("could of", "should of", etc.) ---
    (re.compile(r'\bcould\s+of\b', re.IGNORECASE), "could of", "could have", "Incorrect preposition substitution for modal auxiliary 'have'.", "Medium"),
    (re.compile(r'\bshould\s+of\b', re.IGNORECASE), "should of", "should have", "Incorrect preposition substitution for modal auxiliary 'have'.", "Medium"),
    (re.compile(r'\bwould\s+of\b', re.IGNORECASE), "would of", "would have", "Incorrect preposition substitution for modal auxiliary 'have'.", "Medium"),
    (re.compile(r'\bmust\s+of\b', re.IGNORECASE), "must of", "must have", "Incorrect preposition substitution for modal auxiliary 'have'.", "Medium"),
    (re.compile(r'\bmight\s+of\b', re.IGNORECASE), "might of", "might have", "Incorrect preposition substitution for modal auxiliary 'have'.", "Medium"),

    # --- 6. Double Negatives ---
    (re.compile(r'\b(don\'?t|didn\'?t|can\'?t|couldn\'?t|won\'?t|wouldn\'?t)\s+no\b', re.IGNORECASE), "negative + no", "any / none", "Double negative construction.", "Medium"),
    (re.compile(r'\b(haven\'?t|hasn\'?t|hadn\'?t)\s+no\b', re.IGNORECASE), "haven't no", "haven't any", "Double negative construction.", "Medium"),
    (re.compile(r'\b(don\'?t|didn\'?t|can\'?t)\s+never\b', re.IGNORECASE), "don't never", "never / don't ever", "Double negative construction.", "Medium"),
    (re.compile(r'\bain\'?t\s+no\b', re.IGNORECASE), "ain't no", "is not any / has no", "Nonstandard double negative.", "Medium"),

    # --- 7. Articles (a vs an) with Technical & Common Vocabulary ---
    (re.compile(r'\ba\s+(apple|engineer|api|endpoint|architecture|instance|algorithm|optimizer|operation|issue|error|exception|interface|index|asset|array|object|alert|action)\b', re.IGNORECASE), "a + vowel sound", "an + vowel sound", "Use article 'an' before words starting with vowel sounds.", "Low"),
    (re.compile(r'\ban\s+(user|unique|unit|system|backend|database|framework|server|router|table|component|module|service|project|container|cluster|pipeline)\b', re.IGNORECASE), "an + consonant sound", "a + consonant sound", "Use article 'a' before words starting with consonant sounds.", "Low"),

    # --- 8. Common Redundancies & Phrasal Idioms ---
    (re.compile(r'\bdiscuss\s+about\b', re.IGNORECASE), "discuss about", "discuss", "Redundant preposition: 'discuss' already means 'talk about'.", "Low"),
    (re.compile(r'\bcope\s+up\s+with\b', re.IGNORECASE), "cope up with", "cope with", "Incorrect phrasal idiom. Use 'cope with'.", "Low"),
    (re.compile(r'\brevert\s+back\b', re.IGNORECASE), "revert back", "revert / reply back", "Redundant modifier: 'revert' already implies returning.", "Low"),
    (re.compile(r'\brepeat\s+again\b', re.IGNORECASE), "repeat again", "repeat", "Redundant modifier: 'repeat' already means to do or say again.", "Low"),
    (re.compile(r'\bcomprise\s+of\b', re.IGNORECASE), "comprise of", "comprise / is composed of", "Standard usage: 'comprise' or 'is composed of'.", "Low"),
    (re.compile(r'\bin\s+regards\s+to\b', re.IGNORECASE), "in regards to", "with regard to / in regard to", "Standard formal phrasing is 'with regard to' or 'in regard to'.", "Low"),
    (re.compile(r'\ball\s+of\s+sudden\b', re.IGNORECASE), "all of sudden", "all of a sudden", "Missing article in idiom: 'all of a sudden'.", "Low"),
    (re.compile(r'\ba\s+lots\s+of\b', re.IGNORECASE), "a lots of", "a lot of / lots of", "Incorrect blend of 'a lot of' and 'lots of'.", "Low"),
    (re.compile(r'\birregardless\b', re.IGNORECASE), "irregardless", "regardless", "Nonstandard term. Use 'regardless'.", "Low"),
    (re.compile(r'\btheirselves\b', re.IGNORECASE), "theirselves", "themselves", "Nonstandard reflexive pronoun. Use 'themselves'.", "Medium"),
    (re.compile(r'\byourselfs\b', re.IGNORECASE), "yourselfs", "yourselves", "Plural reflexive form is 'yourselves'.", "Medium"),
    (re.compile(r'\banyways\b', re.IGNORECASE), "anyways", "anyway", "Informal colloquialism. In professional settings, use 'anyway'.", "Low")
]

def split_into_sentences(text: str) -> List[str]:
    """
    Robust sentence segmenter for transcripts and spoken responses.
    Splits by standard punctuation (. ! ?) and newlines while trimming whitespace.
    """
    if not text:
        return []
    raw_sentences = re.split(r'(?<=[.!?])\s+|\n+', text.strip())
    sentences = [s.strip() for s in raw_sentences if s.strip()]
    if not sentences and text.strip():
        sentences = [text.strip()]
    return sentences

def analyze_grammar(transcript: str) -> GrammarAnalysisResult:
    """
    Comprehensive Sentence-by-Sentence Grammar Analysis.
    Every sentence in the transcript is evaluated individually for grammatical correctness,
    returning structured per-sentence diagnostics and overall communication health.
    """
    if not transcript or not transcript.strip():
        return GrammarAnalysisResult(
            score=100,
            mistakes_count=0,
            corrected_sentences_count=0,
            total_sentences_count=0,
            passed_sentences_count=0,
            mistakes=[],
            sentences_analysis=[],
            improvement_suggestions=["Speak clearly with complete, well-formed sentences."]
        )

    clean_text = transcript.strip()
    sentences = split_into_sentences(clean_text)
    total_sentences_count = len(sentences)

    sentences_analysis: List[SentenceGrammarAnalysis] = []
    all_mistakes: List[GrammarMistake] = []
    seen_keys = set()

    # Query LanguageTool once for the full text if reachable (1.5s max timeout)
    lt_matches_by_sentence: Dict[str, List[Dict[str, Any]]] = {}
    try:
        lt_res = requests.post(
            "https://api.languagetool.org/v2/check",
            data={"text": clean_text, "language": "en-US"},
            timeout=1.5
        )
        if lt_res.status_code == 200:
            lt_data = lt_res.json()
            for m in lt_data.get("matches", []):
                rule_cat = m.get("rule", {}).get("category", {}).get("id", "")
                if rule_cat in ["TYPOGRAPHY", "CASING"]:
                    continue
                m_sent = m.get("sentence", "").strip()
                if m_sent:
                    lt_matches_by_sentence.setdefault(m_sent, []).append(m)
    except Exception:
        pass

    # Process EVERY single sentence individually
    for idx, sentence_text in enumerate(sentences, start=1):
        s_clean = sentence_text.strip()
        sent_mistakes: List[GrammarMistake] = []
        sent_seen_keys = set()
        corrected_sentence = s_clean

        # 1. Precompiled Linguistic Rules Evaluation for this sentence
        for regex, incorrect_label, correct_label, explanation, severity in PRECOMPILED_RULES:
            match = regex.search(s_clean)
            if match:
                matched_str = match.group(0)
                # Determine precise incorrect portion and replacement
                inc_portion = matched_str
                sug_portion = correct_label
                if "/" in correct_label:
                    # Generic label, refine with match
                    sug_portion = correct_label.split("/")[0]

                # Specific subject-verb adjustments
                if regex.pattern.startswith(r'\b(they|we|you)\s+was'):
                    sug_portion = re.sub(r'\bwas\b', 'were', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\b(they|we|you)\s+is'):
                    sug_portion = re.sub(r'\bis\b', 'are', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\b(they|we|you)\s+has'):
                    sug_portion = re.sub(r'\bhas\b', 'have', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\b(I|i)\s+is'):
                    sug_portion = re.sub(r'\bis\b', 'am', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\b(I|i)\s+has'):
                    sug_portion = re.sub(r'\bhas\b', 'have', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\b(he|she|it)\s+don\'?t'):
                    sug_portion = re.sub(r'\bdon\'?t\b', "doesn't", matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\bmore\s+'):
                    sug_portion = re.sub(r'\bmore\s+', '', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\b(have|has|had)\s+went'):
                    sug_portion = re.sub(r'\bwent\b', 'gone', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\b(have|has|had)\s+saw'):
                    sug_portion = re.sub(r'\bsaw\b', 'seen', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\bcould\s+of'):
                    sug_portion = re.sub(r'\bcould\s+of\b', 'could have', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\bshould\s+of'):
                    sug_portion = re.sub(r'\bshould\s+of\b', 'should have', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\bwould\s+of'):
                    sug_portion = re.sub(r'\bwould\s+of\b', 'would have', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\ba\s+'):
                    sug_portion = re.sub(r'\ba\s+', 'an ', matched_str, flags=re.IGNORECASE)
                elif regex.pattern.startswith(r'\ban\s+'):
                    sug_portion = re.sub(r'\ban\s+', 'a ', matched_str, flags=re.IGNORECASE)

                m_key = f"{inc_portion}_{sug_portion}"
                if m_key not in sent_seen_keys:
                    sent_seen_keys.add(m_key)
                    mistake = GrammarMistake(
                        original_sentence=s_clean,
                        incorrect_portion=inc_portion,
                        suggested_correction=sug_portion,
                        explanation=explanation,
                        severity=severity
                    )
                    sent_mistakes.append(mistake)
                    
                    # Apply correction to corrected sentence
                    esc = re.escape(inc_portion)
                    corrected_sentence = re.sub(rf'\b{esc}\b', sug_portion, corrected_sentence, flags=re.IGNORECASE, count=1)

        # 2. Add LanguageTool results for this sentence if any
        matching_lt = lt_matches_by_sentence.get(s_clean, [])
        for m in matching_lt:
            context_obj = m.get("context", {})
            offset = context_obj.get("offset", 0)
            length = context_obj.get("length", 0)
            ctx_text = context_obj.get("text", "")
            incorrect = ctx_text[offset:offset+length] if (offset >= 0 and length > 0 and len(ctx_text) >= offset+length) else ""
            replacements = m.get("replacements", [])
            suggested = replacements[0].get("value", "correction") if replacements else "revise phrasing"
            explanation = m.get("message", "Grammar error detected.")
            
            if incorrect:
                m_key = f"{incorrect}_{suggested}"
                if m_key not in sent_seen_keys:
                    sent_seen_keys.add(m_key)
                    issue_type = m.get("rule", {}).get("issueType", "").lower()
                    severity = "High" if "grammar" in issue_type or "agreement" in explanation.lower() else ("Medium" if "verb" in explanation.lower() or "tense" in explanation.lower() else "Low")
                    mistake = GrammarMistake(
                        original_sentence=s_clean,
                        incorrect_portion=incorrect,
                        suggested_correction=suggested,
                        explanation=explanation.replace("‘", "'").replace("’", "'").replace("“", '"').replace("”", '"'),
                        severity=severity
                    )
                    sent_mistakes.append(mistake)
                    esc = re.escape(incorrect)
                    corrected_sentence = re.sub(rf'\b{esc}\b', suggested, corrected_sentence, flags=re.IGNORECASE, count=1)

        # Calculate individual sentence score
        is_valid = len(sent_mistakes) == 0
        sent_penalty = sum(20 if m.severity == "High" else (12 if m.severity == "Medium" else 6) for m in sent_mistakes)
        sent_score = max(30, 100 - sent_penalty) if not is_valid else 100
        sent_status = "Correct" if is_valid else "Needs Correction"

        sent_analysis = SentenceGrammarAnalysis(
            sentence_index=idx,
            original_sentence=s_clean,
            is_valid=is_valid,
            status=sent_status,
            corrected_sentence=corrected_sentence if not is_valid else s_clean,
            mistakes=sent_mistakes,
            mistakes_count=len(sent_mistakes),
            score=sent_score
        )
        sentences_analysis.append(sent_analysis)

        # Aggregate mistakes for global reporting
        for m in sent_mistakes:
            glob_key = f"{m.original_sentence[:30]}_{m.incorrect_portion}"
            if glob_key not in seen_keys:
                seen_keys.add(glob_key)
                all_mistakes.append(m)

    # Compute overall summary metrics
    passed_sentences_count = sum(1 for s in sentences_analysis if s.is_valid)
    total_mistakes_count = len(all_mistakes)
    corrected_sentences_count = total_sentences_count - passed_sentences_count

    # Global score weighted across all sentences
    if total_sentences_count > 0:
        avg_sent_score = int(sum(s.score for s in sentences_analysis) / total_sentences_count)
        base_score = max(40, min(100, avg_sent_score))
    else:
        base_score = 100

    # Build highlighted transcript with interactive error/correction pill tags
    highlighted_text = clean_text
    applied_portions = set()
    for m in all_mistakes:
        inc = m.incorrect_portion.strip() if m.incorrect_portion else ""
        if inc and inc.lower() not in applied_portions and len(inc) > 1:
            applied_portions.add(inc.lower())
            escaped = re.escape(inc)
            pat = re.compile(rf'\b({escaped})\b', re.IGNORECASE)
            title_attr = f"❌ Mistake: '{inc}' ➔ ✅ Suggested: '{m.suggested_correction}' ({m.explanation})"
            rep = f'<mark class="grammar-tag" title="{title_attr}"><span class="grammar-incorrect-word">\\1</span><span class="grammar-correction-pill">➔ {m.suggested_correction}</span></mark>'
            if pat.search(highlighted_text):
                highlighted_text = pat.sub(rep, highlighted_text, count=1)

    suggestions = [
        "Use active voice and direct sentence structures for technical clarity.",
        "Ensure subject-verb agreements remain consistent throughout multi-sentence descriptions."
    ]
    if all_mistakes:
        suggestions.insert(0, "Review subject-verb agreement and past participle forms in spoken responses.")
    if passed_sentences_count == total_sentences_count and total_sentences_count > 0:
        suggestions = ["Excellent syntax! All spoken sentences demonstrate flawless grammatical consistency."]

    return GrammarAnalysisResult(
        score=base_score,
        mistakes_count=total_mistakes_count,
        corrected_sentences_count=corrected_sentences_count,
        total_sentences_count=total_sentences_count,
        passed_sentences_count=passed_sentences_count,
        mistakes=all_mistakes,
        sentences_analysis=sentences_analysis,
        improvement_suggestions=suggestions,
        highlighted_transcript=highlighted_text
    )
