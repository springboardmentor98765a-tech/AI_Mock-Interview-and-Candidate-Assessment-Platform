"""
Pull plain text out of a résumé PDF.

The known weakness of text extraction is scanned/photographed résumés: the PDF
contains images, not text, and pypdf returns almost nothing *without raising*.
Left unguarded that produces a confidently empty profile with no explanation,
so `extract_text` raises `UnreadablePDF` instead and the endpoint turns it into
a 422 the candidate can act on.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Below this many characters the PDF is almost certainly image-only. A genuine
# one-page résumé runs well over a thousand characters.
MIN_USABLE_CHARS = 200


class UnreadablePDF(ValueError):
    """The file is a PDF, but no usable text could be read from it."""


def extract_text(path: str | Path) -> str:
    """Return the PDF's text. Raises UnreadablePDF if there is too little of it."""
    from pypdf import PdfReader

    try:
        reader = PdfReader(str(path))
        pages = [(page.extract_text() or "") for page in reader.pages]
    except Exception as exc:
        logger.warning("pypdf could not read %s: %s", path, exc)
        raise UnreadablePDF(
            "This PDF could not be read. It may be corrupt or password-protected."
        ) from exc

    text = "\n".join(pages).strip()

    if len(text) < MIN_USABLE_CHARS:
        raise UnreadablePDF(
            "Could not read text from this PDF. It may be a scanned image; "
            "please upload a text-based PDF."
        )

    return text
