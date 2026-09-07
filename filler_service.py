import re
from typing import List, Dict, Optional, Tuple
from backend.config import settings
from backend.models.speech_models import FillerAnalysisResult, FillerWordDetail

def analyze_fillers(transcript: str, custom_fillers: Optional[List[str]] = None) -> FillerAnalysisResult:
    """
    Detects filler words in the transcript using word-boundary regex patterns,
    calculates exact counts, rates, and produces a highlighted transcript.
    """
    if not transcript or not transcript.strip():
        return FillerAnalysisResult(
            total=0,
            rate=0.0,
            most_used=None,
            most_used_count=0,
            words={},
            details=[],
            highlighted_transcript=""
        )

    filler_list = custom_fillers or settings.FILLER_WORDS
    
    # Sort fillers by length descending so multi-word fillers (e.g. "you know", "i mean") match before single words ("you", "i")
    sorted_fillers = sorted(filler_list, key=lambda x: len(x), reverse=True)
    
    words_total = len(re.findall(r'\b[\w\'-]+\b', transcript))
    if words_total == 0:
        words_total = 1

    counts: Dict[str, int] = {}
    details: List[FillerWordDetail] = []
    
    highlighted = transcript
    total_fillers = 0

    for filler in sorted_fillers:
        # Match case-insensitively on whole phrase/word boundaries
        escaped = re.escape(filler.strip())
        pattern = r'(?i)\b' + escaped + r'\b'
        matches = list(re.finditer(pattern, transcript))
        count = len(matches)
        
        if count > 0:
            counts[filler.lower()] = count
            total_fillers += count
            details.append(FillerWordDetail(word=filler.lower(), count=count, timestamps=[]))

    # Generate highlighted HTML transcript
    for filler in sorted_fillers:
        escaped = re.escape(filler.strip())
        pattern = re.compile(r'\b(' + escaped + r')\b', re.IGNORECASE)
        highlighted = pattern.sub(r'<mark class="filler-tag" title="Filler Word: \1">\1</mark>', highlighted)

    filler_rate = round((total_fillers / words_total) * 100.0, 1)

    most_used = None
    most_used_count = 0
    if counts:
        most_used, most_used_count = max(counts.items(), key=lambda x: x[1])

    return FillerAnalysisResult(
        total=total_fillers,
        rate=filler_rate,
        most_used=most_used,
        most_used_count=most_used_count,
        words=counts,
        details=details,
        highlighted_transcript=highlighted
    )
