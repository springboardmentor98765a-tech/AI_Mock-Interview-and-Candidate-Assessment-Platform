import io
from pypdf import PdfReader
from fastapi import HTTPException

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        extracted_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
        
        extracted_text = extracted_text.strip()
        if not extracted_text:
            raise ValueError("No readable text found inside PDF.")
        return extracted_text
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process PDF file: {str(e)}"
        )
