# API Documentation

## Authentication
- POST `/api/auth/register`
- POST `/api/auth/login`

## Resume
- POST `/api/resume/upload`
- POST `/api/resume/extract`
- POST `/api/resume/analyze`
- GET `/api/resume/report/{id}`

## Interview Core
- POST `/api/interviews/start`
- POST `/api/interviews/evaluate`
- POST `/api/interviews/followup`
- POST `/api/interviews/{interviewId}/session`
- GET `/api/interviews/{interviewId}/report`
- GET `/api/interviews/{interviewId}/report/email-preview`
- GET `/api/interviews/history/{userId}`
- GET `/api/interviews/history/{userId}/{interviewId}`

## Candidate Enhancements
- POST `/api/interviews/candidate/{userId}/career-roadmap/generate`
- GET `/api/interviews/candidate/{userId}/enhancements`
- POST `/api/interviews/candidate/{userId}/assessments`
- POST `/api/interviews/candidate/{userId}/profile-completion`
- POST `/api/interviews/candidate/{userId}/notifications`

## Recruiter
- GET `/api/recruiter/candidates`
- GET `/api/recruiter/candidates/{candidateId}`
- POST `/api/recruiter/candidates/{candidateId}/{actionType}`

## Admin
- GET `/api/admin/dashboard`
