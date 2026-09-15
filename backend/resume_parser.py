import re


def extract_email(text: str):
    match = re.search(
        r'[\w\.-]+@[\w\.-]+\.\w+',
        text
    )

    return match.group(0) if match else None


def extract_phone(text: str):
    match = re.search(
        r'(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)',
        text
    )

    return match.group(0) if match else None


def extract_name(text: str):
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    if not lines:
        return None

    # Usually the candidate's name is near the beginning
    for line in lines[:5]:

        if (
            len(line.split()) <= 5
            and not re.search(r'@|resume|curriculum|phone|mobile', line, re.I)
        ):
            return line

    return None


def extract_section(text: str, section_names):
    lines = text.splitlines()

    start_index = None

    for i, line in enumerate(lines):

        clean_line = line.strip().lower()

        for section_name in section_names:

            if clean_line == section_name.lower():
                start_index = i + 1
                break

        if start_index is not None:
            break

    if start_index is None:
        return []

    section_content = []

    common_sections = [
        "education",
        "experience",
        "work experience",
        "projects",
        "skills",
        "technical skills",
        "certifications",
        "achievements",
        "summary",
        "objective"
    ]

    for line in lines[start_index:]:

        clean_line = line.strip()

        if not clean_line:
            continue

        if clean_line.lower() in common_sections:
            break

        section_content.append(clean_line)

    return section_content


def parse_resume(text: str):

    return {
        "name": extract_name(text),

        "email": extract_email(text),

        "phone": extract_phone(text),

        "skills": extract_section(
            text,
            [
                "skills",
                "technical skills",
                "technical skills & languages"
            ]
        ),

        "education": extract_section(
            text,
            [
                "education",
                "academic background",
                "educational qualifications"
            ]
        ),

        "experience": extract_section(
            text,
            [
                "experience",
                "work experience",
                "professional experience"
            ]
        ),

        "projects": extract_section(
            text,
            [
                "projects",
                "academic projects",
                "personal projects"
            ]
        ),

        "certifications": extract_section(
            text,
            [
                "certifications",
                "certificates",
                "certifications & courses"
            ]
        )
    }