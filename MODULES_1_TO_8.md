# SmartHire AI — Modules 1 to 8 Edition

This package is based on the supplied SmartHire AI repository and the supplied project specification.

## Included project scope

1. User Authentication & Role-Based Access
2. Resume Upload & Skill Extraction
3. AI Interview Generation
4. Interview Session Management
5. Speech-to-Text & Communication Analysis
6. Emotion Detection & Eye Tracking
7. AI Feedback & Scoring
8. Dashboard & Analytics

The specification describes these modules as the first eight modules of the platform. The later notification/report module and final deployment module are not exposed through the main frontend navigation in this edition.

### Important dependency note
Some backend models, services, and shared recruiter/admin code support multiple workflows at once. They are retained where removing them would break modules 1–8 or the existing database schema. This is a functional scope reduction, not a claim that every source file is exclusively owned by one module.

## What the frontend exposes

- Candidate login/signup
- Candidate dashboard and performance tracking
- Resume analyzer
- AI interview configuration/lobby/live interview/processing/results
- Practice/assessment workflow
- Reports and analytics needed by modules 7–8
- Candidate profile/settings
- Recruiter dashboard/assessment and candidate analytics workflows
- Admin dashboard

## What is outside the main Module 1–8 navigation

- Job browsing/application workflow
- Offer workflow
- Standalone posted-jobs page
- Notification-focused UI

These files may still exist where they are needed by shared backend/frontend dependencies. Do not assume a file is module-exclusive merely from its filename.

## Source attribution

The supplied repository README states that the project is distributed under the MIT License and identifies the original repository as the source project. Review the repository's licensing/attribution requirements before submitting or redistributing the code.
