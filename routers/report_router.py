"""
Report & Performance Summary Router
Endpoints for dynamic ReportLab PDF generation, CSV exports,
and real-data user performance summaries and trends with strict RBAC.
"""

import os
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel

from backend.auth import get_current_user, require_role
from backend.database import db
from backend.services.report_service import (
    generate_pdf_report,
    generate_interview_csv,
    get_user_reports
)
from backend.services.performance_service import (
    compute_user_performance_summary,
    compute_user_performance_trends,
    compute_user_skills_breakdown
)
from backend.services.notification_service import create_in_app_notification
from backend.services.email_service import send_email_notification

router = APIRouter(tags=["Downloadable Reports & Performance Summaries"])


class GenerateReportRequest(BaseModel):
    interview_id: str


# ==============================================================================
# 1. Downloadable Reports Endpoints
# ==============================================================================

@router.get("/api/reports")
def list_reports(
    current_user: dict = Depends(get_current_user)
):
    """
    Lists all generated performance reports for the authenticated user.
    """
    reports = get_user_reports(current_user["id"], current_user["role"])
    return {
        "reports": reports,
        "count": len(reports)
    }


@router.post("/api/reports/generate")
def create_report(
    req: GenerateReportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generates a branded PDF report from actual completed interview telemetry.
    """
    report_record = generate_pdf_report(req.interview_id, current_user)
    
    # Notify user that official report is available
    create_in_app_notification(
        user_id=report_record["user_id"],
        title="Performance Report Generated",
        message=f"Official PDF Report for {report_record.get('domain')} mock interview is ready for download.",
        notification_type="report",
        related_id=report_record["id"],
        action_url=f"/api/reports/{report_record['id']}/download"
    )

    send_email_notification(
        user_id=report_record["user_id"],
        recipient_email=report_record.get("candidate_email", current_user.get("email", "candidate@example.com")),
        user_name=report_record.get("candidate_name", current_user.get("full_name", "Candidate")),
        notification_type="report_generated",
        details={
            "report_id": report_record["id"],
            "domain": report_record.get("domain", "Full Stack")
        }
    )

    return {
        "message": "Report generated successfully",
        "report": report_record
    }


@router.get("/api/reports/{report_id}")
def get_report_metadata(
    report_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves metadata for a specific report with ownership verification.
    """
    report = db.reports.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if current_user["role"] == "candidate" and report.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this report.")

    return report


@router.get("/api/reports/{report_id}/download")
def download_pdf_report(
    report_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Downloads the dynamically generated ReportLab PDF file with verified ownership.
    """
    report = db.reports.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if current_user["role"] == "candidate" and report.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this report.")

    file_path = report.get("file_path")
    if not file_path or not os.path.exists(file_path):
        # Regenerate if file is missing
        interview_id = report.get("interview_id")
        regenerated = generate_pdf_report(interview_id, current_user)
        file_path = regenerated.get("file_path")

    filename = report.get("file_name", f"{report_id}.pdf")
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/api/reports/{report_id}/csv")
def download_report_csv(
    report_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Exports CSV formatted performance data for a completed interview.
    """
    report = db.reports.get(report_id)
    if not report:
        # Check if report_id was actually an interview_id
        interview = db.interviews.get(report_id)
        if interview:
            interview_id = report_id
        else:
            raise HTTPException(status_code=404, detail="Report or interview not found.")
    else:
        interview_id = report.get("interview_id")

    csv_data = generate_interview_csv(interview_id, current_user)
    return PlainTextResponse(
        csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="assessment_{interview_id}.csv"'}
    )


# ==============================================================================
# 2. Performance Summaries & Trends Endpoints (Zero Dummy Data)
# ==============================================================================

@router.get("/api/performance/summary")
def get_performance_summary(
    candidate_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns aggregated KPI summary calculated from actual completed interview records.
    """
    target_user_id = current_user["id"]
    if current_user["role"] in ["recruiter", "admin"] and candidate_id:
        target_user_id = candidate_id

    summary = compute_user_performance_summary(target_user_id)
    return summary


@router.get("/api/performance/trends")
def get_performance_trends(
    candidate_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns chronological score trend data points for chart rendering.
    """
    target_user_id = current_user["id"]
    if current_user["role"] in ["recruiter", "admin"] and candidate_id:
        target_user_id = candidate_id

    trends = compute_user_performance_trends(target_user_id)
    return {
        "trends": trends,
        "count": len(trends)
    }


@router.get("/api/performance/skills")
def get_performance_skills(
    candidate_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns skill-wise performance analytics from real question answers.
    """
    target_user_id = current_user["id"]
    if current_user["role"] in ["recruiter", "admin"] and candidate_id:
        target_user_id = candidate_id

    skills = compute_user_skills_breakdown(target_user_id)
    return {
        "skills": skills,
        "count": len(skills)
    }
