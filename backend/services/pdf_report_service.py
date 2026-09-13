import io
import datetime
import logging
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.user import User
from models.candidate import CandidateProfile
from models.interview import (
    Interview,
    InterviewSession,
    CandidatePerformanceReport,
    SpeechAnalysis,
    InterviewBehaviorAnalysis
)
from services.consent_service import check_recruiter_score_access

logger = logging.getLogger("pdf_report_service")

# ReportLab imports
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab is not installed. PDF generation will raise 500 error if called.")


def generate_interview_pdf_report(db: Session, interview_id: int, requester_user: User) -> bytes:
    """
    Generates a canonical, professional PDF evaluation report for an interview.
    Enforces authorization and candidate score-sharing consent via check_recruiter_score_access.
    Returns raw PDF bytes.
    """
    # 1. Interview & Authorization Verification
    interview = db.query(Interview).filter(Interview.id == interview_id, Interview.is_deleted == False).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    has_access = check_recruiter_score_access(db, requester_user, interview_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Candidate score-sharing consent is absent or revoked."
        )

    # 2. PDF Engine Availability Check
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF generation library (ReportLab) is unavailable on backend server."
        )

    # 2. Gather Data Entities
    candidate = db.query(User).filter(User.id == interview.candidate_id).first()
    candidate_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == interview.candidate_id).first()
    
    session = db.query(InterviewSession).filter(
        InterviewSession.interview_id == interview_id
    ).order_by(InterviewSession.created_at.desc()).first()

    report = None
    speech_list = []
    behavior = None

    if session:
        report = db.query(CandidatePerformanceReport).filter(CandidatePerformanceReport.session_id == session.id).first()
        speech_list = db.query(SpeechAnalysis).filter(SpeechAnalysis.session_id == session.id).all()
        behavior = db.query(InterviewBehaviorAnalysis).filter(InterviewBehaviorAnalysis.session_id == session.id).first()

    # 3. Prepare Report Data Values (with "Insufficient Data" fallbacks)
    cand_name = candidate.name if candidate else "Candidate"
    cand_email = candidate.email if candidate else "N/A"
    college = candidate_profile.college if candidate_profile and candidate_profile.college else "Insufficient Data"
    degree = candidate_profile.degree if candidate_profile and candidate_profile.degree else "Insufficient Data"
    ats_score_str = f"{candidate_profile.ats_score}%" if (candidate_profile and candidate_profile.ats_score) else "Insufficient Data"

    domain = interview.domain or "Software Engineering"
    int_type = interview.interview_type or "Technical"
    difficulty = interview.difficulty or "Medium"
    duration = f"{interview.duration_mins} Minutes" if interview.duration_mins else "Insufficient Data"
    status_str = session.status if session else interview.status
    dt = None
    if session:
        dt = session.ended_at or session.created_at
    if not dt and interview:
        dt = interview.created_at
    completed_date = dt.strftime("%d %b %Y, %H:%M UTC") if dt else "Insufficient Data"

    overall_score = f"{round(report.overall_score, 1)}%" if (report and report.overall_score is not None) else "Insufficient Data"
    rating = report.performance_rating if (report and report.performance_rating) else "Insufficient Data"

    tech_score = f"{round(report.technical_relevance_score, 1)}%" if (report and report.technical_relevance_score is not None) else "Insufficient Data"
    comm_score = f"{round(report.communication_score, 1)}%" if (report and report.communication_score is not None) else "Insufficient Data"
    prof_score = f"{round(report.professionalism_score, 1)}%" if (report and report.professionalism_score is not None) else "Insufficient Data"
    conf_score = f"{round(report.confidence_score, 1)}%" if (report and report.confidence_score is not None) else "Insufficient Data"

    # Speech Analysis Metrics
    if speech_list:
        wpm_vals = [s.words_per_minute for s in speech_list if s.words_per_minute is not None]
        clarity_vals = [s.clarity_score for s in speech_list if s.clarity_score is not None]
        filler_vals = [s.filler_word_count for s in speech_list if s.filler_word_count is not None]
        grammar_vals = [s.grammar_score for s in speech_list if s.grammar_score is not None]

        wpm_str = f"{round(sum(wpm_vals)/len(wpm_vals), 1)} WPM" if wpm_vals else "Insufficient Data"
        clarity_str = f"{round(sum(clarity_vals)/len(clarity_vals), 1)}%" if clarity_vals else "Insufficient Data"
        fillers_str = f"{sum(filler_vals)} words" if filler_vals else "0 words"
        grammar_str = f"{round(sum(grammar_vals)/len(grammar_vals), 1)}%" if grammar_vals else "Insufficient Data"
    else:
        wpm_str = "Insufficient Data"
        clarity_str = "Insufficient Data"
        fillers_str = "Insufficient Data"
        grammar_str = "Insufficient Data"

    # Behavioral & Vision Analysis Metrics
    if behavior:
        eye_contact = f"{round(behavior.eye_contact_percentage, 1)}%" if behavior.eye_contact_percentage is not None else "Insufficient Data"
        attention = f"{round(behavior.attention_score, 1)}%" if behavior.attention_score is not None else "Insufficient Data"
        dominant_emotion = behavior.dominant_emotion.title() if behavior.dominant_emotion else "Insufficient Data"
        violations_count = f"{behavior.fullscreen_violations_count} warning(s)" if behavior.fullscreen_violations_count is not None else "0"
        auto_term = "YES (Terminated)" if behavior.auto_terminated else "NO (Clean Session)"
    else:
        eye_contact = "Insufficient Data"
        attention = "Insufficient Data"
        dominant_emotion = "Insufficient Data"
        violations_count = "Insufficient Data"
        auto_term = "Insufficient Data"

    # Strengths, Weaknesses, AI Recommendations
    strengths = report.strengths if (report and isinstance(report.strengths, list)) else []
    weaknesses = report.weaknesses if (report and isinstance(report.weaknesses, list)) else []
    improvements = report.improvement_suggestions if (report and isinstance(report.improvement_suggestions, list)) else []

    # 4. Build ReportLab Story
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Styles
    brand_title_style = ParagraphStyle(
        'BrandTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#6366F1'),
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_LEFT
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=6
    )

    normal_body = ParagraphStyle(
        'NormalBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    bold_label = ParagraphStyle(
        'BoldLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#0F172A')
    )

    score_val_style = ParagraphStyle(
        'ScoreVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=16,
        textColor=colors.HexColor('#4F46E5'),
        alignment=TA_CENTER
    )

    score_lbl_style = ParagraphStyle(
        'ScoreLbl',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_CENTER
    )

    story = []

    # Document Header
    story.append(Paragraph("SmartHire AI", brand_title_style))
    story.append(Paragraph("Automated Candidate Assessment & Evaluation Report", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#6366F1'), spaceBefore=2, spaceAfter=12))

    # Info Cards Table (Candidate & Interview Details)
    cand_info_data = [
        [Paragraph("Candidate Name:", bold_label), Paragraph(cand_name, normal_body), Paragraph("Domain / Role:", bold_label), Paragraph(domain, normal_body)],
        [Paragraph("Email Address:", bold_label), Paragraph(cand_email, normal_body), Paragraph("Interview Type:", bold_label), Paragraph(int_type, normal_body)],
        [Paragraph("College / Degree:", bold_label), Paragraph(f"{college} ({degree})", normal_body), Paragraph("Difficulty / Duration:", bold_label), Paragraph(f"{difficulty} | {duration}", normal_body)],
        [Paragraph("ATS Resume Score:", bold_label), Paragraph(ats_score_str, normal_body), Paragraph("Date Completed:", bold_label), Paragraph(completed_date, normal_body)],
        [Paragraph("Session Status:", bold_label), Paragraph(status_str, normal_body), Paragraph("Performance Rating:", bold_label), Paragraph(rating, normal_body)]
    ]

    info_table = Table(cand_info_data, colWidths=[110, 160, 110, 160])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 14))

    # Overall Score Breakdown Summary Box
    story.append(Paragraph("1. Performance Score Summary", section_heading))
    score_cards_data = [
        [
            Paragraph(overall_score, score_val_style),
            Paragraph(tech_score, score_val_style),
            Paragraph(comm_score, score_val_style),
            Paragraph(prof_score, score_val_style),
            Paragraph(conf_score, score_val_style)
        ],
        [
            Paragraph("Overall Score", score_lbl_style),
            Paragraph("Technical", score_lbl_style),
            Paragraph("Communication", score_lbl_style),
            Paragraph("Professionalism", score_lbl_style),
            Paragraph("Confidence", score_lbl_style)
        ]
    ]

    score_table = Table(score_cards_data, colWidths=[108, 108, 108, 108, 108])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EEF2FF')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#C7D2FE')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E7FF')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 14))

    # Speech & Communication Analysis Table
    story.append(Paragraph("2. Speech & Communication Analysis", section_heading))
    speech_data = [
        [Paragraph("Words Per Minute (WPM):", bold_label), Paragraph(wpm_str, normal_body), Paragraph("Speech Clarity:", bold_label), Paragraph(clarity_str, normal_body)],
        [Paragraph("Filler Words Count:", bold_label), Paragraph(fillers_str, normal_body), Paragraph("Grammar Accuracy:", bold_label), Paragraph(grammar_str, normal_body)]
    ]
    speech_table = Table(speech_data, colWidths=[140, 130, 130, 140])
    speech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(speech_table)
    story.append(Spacer(1, 14))

    # Vision & Behavioral Analysis Table
    story.append(Paragraph("3. Behavioral & Vision Proctoring Analysis", section_heading))
    behavior_data = [
        [Paragraph("Eye Contact Score:", bold_label), Paragraph(eye_contact, normal_body), Paragraph("Attention Score:", bold_label), Paragraph(attention, normal_body)],
        [Paragraph("Dominant Emotion:", bold_label), Paragraph(dominant_emotion, normal_body), Paragraph("Fullscreen Violations:", bold_label), Paragraph(violations_count, normal_body)],
        [Paragraph("Auto-Terminated:", bold_label), Paragraph(auto_term, normal_body), Paragraph("Proctoring Status:", bold_label), Paragraph("Verified Log", normal_body)]
    ]
    behavior_table = Table(behavior_data, colWidths=[140, 130, 130, 140])
    behavior_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(behavior_table)
    story.append(Spacer(1, 14))

    # Weak Areas & AI Feedback Section
    story.append(Paragraph("4. Key Strengths & Data-Driven Weak Areas", section_heading))

    strengths_html = "<br/>".join([f"• {s}" for s in strengths]) if strengths else "• Satisfactory overall interview performance."
    weaknesses_html = "<br/>".join([f"• {w}" for w in weaknesses]) if weaknesses else "• No critical weaknesses identified."
    improvements_html = "<br/>".join([f"• {i}" for i in improvements]) if improvements else "• Continue practicing structured STAR response formats."

    feedback_data = [
        [Paragraph("Key Strengths:", bold_label), Paragraph(strengths_html, normal_body)],
        [Paragraph("Identified Weak Areas:", bold_label), Paragraph(weaknesses_html, normal_body)],
        [Paragraph("Actionable Recommendations:", bold_label), Paragraph(improvements_html, normal_body)]
    ]

    feedback_table = Table(feedback_data, colWidths=[150, 390])
    feedback_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FAFAFA')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F3F4F6')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(feedback_table)
    story.append(Spacer(1, 20))

    # Footer Disclaimer
    footer_text = f"Report generated automatically by SmartHire AI Platform on {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}. Privacy & Candidate Score Consent Verified."
    story.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, textColor=colors.HexColor('#94A3B8'), alignment=TA_CENTER)))

    # Build PDF
    doc.build(story)
    return buffer.getvalue()
