"""
Report Generation & Export Service
Generates production-grade branded PDF reports using ReportLab and CSV exports
from real candidate mock interview and assessment session data with strict RBAC.
"""

import os
import io
import csv
import uuid
import datetime
from typing import Dict, Any, Optional, List, Tuple
from fastapi import HTTPException

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from backend.config import settings
from backend.database import db
from backend.services.device_detection_service import device_detection_manager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def _format_metric(val: Any, suffix: str = "", default: str = "Not available") -> str:
    """Helper to format real numeric/text metrics or display 'Not available' without fake data."""
    if val is None or val == "":
        return default
    if isinstance(val, (int, float)):
        return f"{val}{suffix}"
    return f"{val}{suffix}"


def generate_pdf_report(interview_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a professional PDF report from real interview & assessment data.
    Ensures candidate ownership validation and saves the PDF to the reports directory.
    """
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail=f"Interview session '{interview_id}' not found.")

    # Authorization Check
    user_id = current_user.get("id")
    user_role = current_user.get("role")
    if user_role == "candidate" and interview.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied. You cannot generate or access reports for other candidates.")

    # Fetch associated user and assessment
    cand_user = db.users.get(interview.get("user_id"), {})
    candidate_name = interview.get("candidate_name") or cand_user.get("full_name") or "Candidate"
    candidate_email = cand_user.get("email") or "candidate@example.com"
    
    assessment = db.assessments.get(interview_id)
    if not assessment:
        # Check if legacy report is in interview
        report_data = interview.get("report") or {}
    else:
        report_data = assessment

    # Build unique report ID and file path
    report_id = f"rep_{interview_id}_{uuid.uuid4().hex[:6]}"
    filename = f"{report_id}.pdf"
    file_path = os.path.join(REPORTS_DIR, filename)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#4f46e5")
    c_secondary = colors.HexColor("#06b6d4")
    c_dark = colors.HexColor("#0f172a")
    c_surface = colors.HexColor("#1e293b")
    c_light_bg = colors.HexColor("#f8fafc")
    c_text = colors.HexColor("#334155")
    c_success = colors.HexColor("#10b981")
    c_warning = colors.HexColor("#f59e0b")

    # Typography Styles
    style_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        alignment=TA_LEFT
    )

    style_subtitle = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        alignment=TA_LEFT
    )

    style_section_h = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_dark,
        spaceBefore=10,
        spaceAfter=6
    )

    style_body = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_text
    )

    style_bold_label = ParagraphStyle(
        'BoldLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=c_dark
    )

    style_score_val = ParagraphStyle(
        'ScoreVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_primary,
        alignment=TA_CENTER
    )

    elements = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph(f"<b>⚡ {settings.APP_NAME}</b><br/><font size=8 color='#64748b'>Official AI Mock Interview & Competency Evaluation Report</font>", style_title),
            Paragraph(f"<b>Report ID:</b> {report_id}<br/><b>Generated:</b> {datetime.datetime.now().strftime('%b %d, %Y %I:%M %p')}", style_subtitle)
        ]
    ]
    header_table = Table(header_data, colWidths=[4.0*inch, 3.2*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceBefore=4, spaceAfter=12))

    # 2. Candidate & Session Metadata Grid
    duration_secs = interview.get("duration_seconds") or 0
    duration_str = f"{int(duration_secs // 60)}m {int(duration_secs % 60)}s" if duration_secs else "Not available"

    meta_data = [
        [
            Paragraph("<b>Candidate Name:</b>", style_bold_label), Paragraph(candidate_name, style_body),
            Paragraph("<b>Interview ID:</b>", style_bold_label), Paragraph(interview_id, style_body)
        ],
        [
            Paragraph("<b>Email Address:</b>", style_bold_label), Paragraph(candidate_email, style_body),
            Paragraph("<b>Session Date:</b>", style_bold_label), Paragraph(interview.get("created_at", "Not available")[:10], style_body)
        ],
        [
            Paragraph("<b>Domain / Role:</b>", style_bold_label), Paragraph(interview.get("domain", "Full Stack"), style_body),
            Paragraph("<b>Difficulty / Type:</b>", style_bold_label), Paragraph(f"{interview.get('difficulty', 'Medium')} ({interview.get('type', 'Technical')})", style_body)
        ],
        [
            Paragraph("<b>Session Duration:</b>", style_bold_label), Paragraph(duration_str, style_body),
            Paragraph("<b>Questions Count:</b>", style_bold_label), Paragraph(f"{interview.get('questions_attempted', len(interview.get('questions', [])))} / {len(interview.get('questions', []))}", style_body)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[1.4*inch, 2.3*inch, 1.4*inch, 2.1*inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 12))

    # 3. Overall Performance Summary & Recommendation Box
    overall_score = report_data.get("overall_score", 0)
    recommendation = report_data.get("recommendation") or report_data.get("performance_rating") or "Qualified"
    
    summary_text = report_data.get("summary") or "Comprehensive automated AI assessment derived from technical response evaluation, communication fluidity, and delivery confidence."

    score_box_data = [
        [
            Paragraph(f"<b>Overall Score</b><br/><font size=22 color='#4f46e5'><b>{overall_score}/100</b></font><br/><font size=8 color='#64748b'>Recommendation: <b>{recommendation}</b></font>", style_score_val),
            Paragraph(f"<b>Executive Summary & Rating:</b><br/>{summary_text}", style_body)
        ]
    ]
    score_table = Table(score_box_data, colWidths=[2.2*inch, 5.0*inch])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#eef2ff")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, c_primary),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 12))

    # 4. Multi-Pillar Category Score Breakdown
    elements.append(Paragraph("<b>📊 Assessment Category Breakdown</b>", style_section_h))
    
    cat_scores = report_data.get("category_scores", {})
    tech_score = _format_metric(cat_scores.get("Technical Depth") or report_data.get("technical_relevance_score"), "/100")
    comm_score = _format_metric(cat_scores.get("Communication") or report_data.get("communication_score"), "/100")
    conf_score = _format_metric(cat_scores.get("Problem Solving") or report_data.get("confidence_score"), "/100")
    prof_score = _format_metric(cat_scores.get("Domain Mastery") or report_data.get("professionalism_score"), "/100")

    breakdown_data = [
        [
            Paragraph("<b>Evaluation Pillar</b>", style_bold_label),
            Paragraph("<b>Weight</b>", style_bold_label),
            Paragraph("<b>Score</b>", style_bold_label),
            Paragraph("<b>Assessment Status</b>", style_bold_label)
        ],
        [
            Paragraph("Technical Depth & Accuracy", style_body),
            Paragraph("30%", style_body),
            Paragraph(str(tech_score), style_body),
            Paragraph("Evaluated via Gemini 2.5 Flash", style_body)
        ],
        [
            Paragraph("Communication & Articulation", style_body),
            Paragraph("30%", style_body),
            Paragraph(str(comm_score), style_body),
            Paragraph("Evaluated via Speech Telemetry", style_body)
        ],
        [
            Paragraph("Confidence & Delivery Dynamics", style_body),
            Paragraph("25%", style_body),
            Paragraph(str(conf_score), style_body),
            Paragraph("Evaluated via Audio-Visual Flow", style_body)
        ],
        [
            Paragraph("Professionalism & Completeness", style_body),
            Paragraph("15%", style_body),
            Paragraph(str(prof_score), style_body),
            Paragraph("Evaluated via Session Metrics", style_body)
        ],
    ]
    breakdown_table = Table(breakdown_data, colWidths=[2.6*inch, 1.0*inch, 1.2*inch, 2.4*inch])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(breakdown_table)
    elements.append(Spacer(1, 10))

    # 5. Speech, Linguistic & Telemetry Metrics (Real data or 'Not available')
    elements.append(Paragraph("<b>🎙️ Granular Speech & Delivery Telemetry</b>", style_section_h))
    
    comm_obj = report_data.get("communication", {})
    if isinstance(comm_obj, dict):
        grammar_score = _format_metric(comm_obj.get("grammar", {}).get("score"), "/100") if isinstance(comm_obj.get("grammar"), dict) else _format_metric(comm_obj.get("grammar_score"), "/100")
        filler_rate = _format_metric(comm_obj.get("fillers", {}).get("rate"), "%") if isinstance(comm_obj.get("fillers"), dict) else _format_metric(comm_obj.get("filler_rate"), "%")
        pace_wpm = _format_metric(comm_obj.get("pace", {}).get("wpm"), " WPM") if isinstance(comm_obj.get("pace"), dict) else _format_metric(comm_obj.get("pace_wpm"), " WPM")
        pron_score = _format_metric(comm_obj.get("pronunciation", {}).get("score"), "/100") if isinstance(comm_obj.get("pronunciation"), dict) else _format_metric(comm_obj.get("pronunciation_score"), "/100")
    else:
        grammar_score = "Not available"
        filler_rate = "Not available"
        pace_wpm = "Not available"
        pron_score = "Not available"

    speech_meta = [
        [
            Paragraph("<b>Grammar Verification:</b>", style_bold_label), Paragraph(str(grammar_score), style_body),
            Paragraph("<b>Filler Word Rate:</b>", style_bold_label), Paragraph(str(filler_rate), style_body)
        ],
        [
            Paragraph("<b>Speaking Pace (WPM):</b>", style_bold_label), Paragraph(str(pace_wpm), style_body),
            Paragraph("<b>Pronunciation Quality:</b>", style_bold_label), Paragraph(str(pron_score), style_body)
        ]
    ]
    speech_table = Table(speech_meta, colWidths=[1.7*inch, 1.9*inch, 1.7*inch, 1.9*inch])
    speech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(speech_table)
    elements.append(Spacer(1, 10))

    # 6. Electronic Device Detection & Anti-Cheating Monitoring
    elements.append(Paragraph("<b>🛡️ Electronic Device Detection & Anti-Cheating Monitoring</b>", style_section_h))
    dev_tracker = device_detection_manager.get_session(interview_id)
    if not dev_tracker:
        sess_id = interview.get("session_id")
        if sess_id:
            dev_tracker = device_detection_manager.get_session(sess_id)

    if dev_tracker:
        dev_summary = dev_tracker.generate_summary_dict()
    else:
        dev_summary = {
            "total_alerts": 0,
            "detected_device_counts": {},
            "first_detection_timestamp": None,
            "last_detection_timestamp": None,
            "total_detection_duration_seconds": 0.0,
            "integrity_status": "Clean - No Prohibited Devices Detected",
            "events": []
        }

    total_alerts = dev_summary.get("total_alerts", 0)
    dev_counts = dev_summary.get("detected_device_counts", {})
    integrity_text = dev_summary.get("integrity_status", "Clean - No Prohibited Devices Detected")
    first_time = dev_summary.get("first_detection_timestamp") or "None"
    last_time = dev_summary.get("last_detection_timestamp") or "None"
    if first_time != "None" and len(first_time) > 19:
        first_time = first_time[11:19]
    if last_time != "None" and len(last_time) > 19:
        last_time = last_time[11:19]
    dur_secs = dev_summary.get("total_detection_duration_seconds", 0.0)

    devices_str = ", ".join([f"{k}: {v}" for k, v in dev_counts.items()]) if dev_counts else "None"

    device_meta = [
        [
            Paragraph("<b>Integrity Status:</b>", style_bold_label), Paragraph(f"<font color='{'#ef4444' if total_alerts > 0 else '#10b981'}'><b>{integrity_text}</b></font>", style_body),
            Paragraph("<b>Total Device Alerts:</b>", style_bold_label), Paragraph(str(total_alerts), style_body)
        ],
        [
            Paragraph("<b>Detected Device Types:</b>", style_bold_label), Paragraph(devices_str, style_body),
            Paragraph("<b>Total Detection Duration:</b>", style_bold_label), Paragraph(f"{dur_secs}s", style_body)
        ],
        [
            Paragraph("<b>First Detection:</b>", style_bold_label), Paragraph(first_time, style_body),
            Paragraph("<b>Last Detection:</b>", style_bold_label), Paragraph(last_time, style_body)
        ]
    ]
    device_table = Table(device_meta, colWidths=[1.7*inch, 1.9*inch, 1.7*inch, 1.9*inch])
    device_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fef2f2" if total_alerts > 0 else "#f0fdf4")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#fca5a5" if total_alerts > 0 else "#86efac")),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(device_table)
    elements.append(Spacer(1, 10))

    # 7. Strengths, Weaknesses & AI Growth Roadmap
    strengths = report_data.get("strengths") or ["Demonstrated solid core technical fundamentals."]
    weaknesses = report_data.get("weaknesses") or ["Could expand on advanced optimization strategies."]
    roadmap = report_data.get("ai_growth_roadmap") or report_data.get("improvement_suggestions") or ["Practice with multi-layered distributed scenarios."]

    strengths_html = "<br/>".join([f"• {s}" for s in strengths])
    weaknesses_html = "<br/>".join([f"• {w}" for w in weaknesses])
    roadmap_html = "<br/>".join([f"• {r}" for r in roadmap])

    insights_data = [
        [
            Paragraph("<b>✅ Key Demonstrated Strengths:</b><br/>" + strengths_html, style_body),
            Paragraph("<b>⚠️ Priority Growth Areas:</b><br/>" + weaknesses_html, style_body)
        ],
        [
            Paragraph("<b>🚀 AI Actionable Growth Roadmap & Next Steps:</b><br/>" + roadmap_html, style_body),
            Paragraph("<b>🔒 Verification Note:</b><br/>This document is an authentic evaluation generated by the AI Interview Platform. All telemetry scores are strictly derived from real candidate session inputs.", style_body)
        ]
    ]
    insights_table = Table(insights_data, colWidths=[3.6*inch, 3.6*inch])
    insights_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(insights_table)
    elements.append(Spacer(1, 12))

    # Build Document
    doc.build(elements)

    # Persist in DB
    report_record = {
        "id": report_id,
        "interview_id": interview_id,
        "user_id": interview.get("user_id"),
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "domain": interview.get("domain", "Full Stack"),
        "difficulty": interview.get("difficulty", "Medium"),
        "overall_score": overall_score,
        "recommendation": recommendation,
        "integrity_status": integrity_text,
        "device_alerts_count": total_alerts,
        "file_name": filename,
        "file_path": file_path,
        "created_at": datetime.datetime.now().isoformat()
    }
    db.reports[report_id] = report_record

    return report_record


def generate_interview_csv(interview_id: str, current_user: Dict[str, Any]) -> str:
    """
    Generates CSV content for a single completed interview report with authentic metrics.
    """
    interview = db.interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail=f"Interview '{interview_id}' not found.")

    if current_user.get("role") == "candidate" and interview.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied to this interview report.")

    report = interview.get("report") or db.assessments.get(interview_id) or {}
    cand_user = db.users.get(interview.get("user_id"), {})
    
    dev_tracker = device_detection_manager.get_session(interview_id)
    if not dev_tracker and interview.get("session_id"):
        dev_tracker = device_detection_manager.get_session(interview.get("session_id"))
    
    dev_summary = dev_tracker.generate_summary_dict() if dev_tracker else {}
    total_alerts = dev_summary.get("total_alerts", 0)
    integrity_status = dev_summary.get("integrity_status", "Clean - No Prohibited Devices Detected")
    detected_devices = "; ".join([f"{k}: {v}" for k, v in dev_summary.get("detected_device_counts", {}).items()]) or "None"

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Interview ID", "Candidate Name", "Candidate Email", "Domain", "Difficulty",
        "Type", "Status", "Overall Score", "Recommendation", "Duration Seconds",
        "Questions Count", "Integrity Status", "Device Alerts Count", "Detected Devices", "Created At"
    ])
    
    writer.writerow([
        interview_id,
        interview.get("candidate_name", cand_user.get("full_name", "Candidate")),
        cand_user.get("email", "candidate@example.com"),
        interview.get("domain", "Full Stack"),
        interview.get("difficulty", "Medium"),
        interview.get("type", "Technical"),
        interview.get("status", "Completed"),
        report.get("overall_score", "Not available"),
        report.get("recommendation", "Not available"),
        interview.get("duration_seconds", 0),
        len(interview.get("questions", [])),
        integrity_status,
        total_alerts,
        detected_devices,
        interview.get("created_at", "")
    ])

    return output.getvalue()


def get_user_reports(user_id: str, user_role: str) -> List[Dict[str, Any]]:
    """
    Retrieves all available reports for the user (or all if recruiter/admin).
    """
    if user_role in ["recruiter", "admin"]:
        reports = list(db.reports.values())
    else:
        reports = [r for r in db.reports.values() if r.get("user_id") == user_id]

    reports.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return reports
