# SmartHire AI Platform

Production-ready AI Mock Interview and Candidate Assessment platform with integrated candidate, recruiter, and admin workflows.

## Core Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Spring Boot, Spring Security, JPA
- Database: PostgreSQL
- AI: Gemini integration for interview flows and career roadmap

## Implemented Modules
- Authentication and role routing
- Resume upload, extraction, AI analysis, report download
- AI mock interview generation and evaluation
- Live interview preview, recording, transcript, report architecture
- Emotion and eye-contact architecture (simulation-ready provider model)
- Speech analytics insights
- Candidate enhancement center:
	- Career roadmap
	- Coding test dashboard
	- Aptitude test dashboard
	- Notifications
	- Profile completion
	- Dark mode persistence
- Recruiter candidate management and detail workflows
- Admin dashboard analytics and activity view

## Production Integration Highlights
- Shared frontend API client with:
	- environment-aware API base URL
	- auth header propagation
	- retry for transient failures
	- unauthorized auto-handling
- Backend CORS configuration and exception handling
- Performance improvement in interview history retrieval
- Dockerized frontend + backend + PostgreSQL
- GitHub Actions CI for build, test, and package

## Run Locally
1. Configure backend in `smarthire-backend/smarthire-backend/src/main/resources/application.properties`.
2. Start backend:
	 - `cd smarthire-backend/smarthire-backend`
	 - `mvn clean package`
	 - `mvn spring-boot:run`
3. Serve frontend root and open `index.html`.

## Docker
- `docker compose up --build`
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

## Additional Documentation
- `INSTALLATION.md`
- `API_DOCUMENTATION.md`
- `PROJECT_STRUCTURE.md`
- `DEPLOYMENT.md`