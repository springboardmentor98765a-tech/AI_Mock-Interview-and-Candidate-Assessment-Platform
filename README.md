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
1. Configure backend in `smarthire-backend/src/main/resources/application.properties`.
2. Start backend:
	 - `cd smarthire-backend`
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
## Final implementation notes

- The implemented application stack in this repository is **Spring Boot + vanilla HTML/CSS/JavaScript** with PostgreSQL. The project specification mentions Python/Django/FastAPI + React as an alternative stack; the functional requirements are implemented in the existing Spring Boot architecture rather than rewritten into a different stack.
- Docker, Docker Compose, and a Render deployment manifest are included. Actual cloud deployment and third-party credentials must be configured in the target environment.
- Real DeepFace, MediaPipe, and Whisper providers are enabled by default in the local configuration, with deterministic/browser fallbacks when those services are unavailable.
- Pronunciation is represented by a speech-clarity/pronunciation proxy using speech-recognition confidence and transcript clarity; it is not a phoneme-level pronunciation benchmark.



## Section 6 Proctoring
SmartHire includes DeepFace emotion monitoring, MediaPipe eye tracking, attention/engagement aggregation, browser proctoring, persistent violations, 3-warning auto-submission, and an optional YOLO object-detection service for camera-visible prohibited objects. See `MANUAL-TEST-SECTION6-PROCTORING.md`.


## Module 6 Custom CNN Emotion Engine

The interview monitoring stack now includes a dedicated 3-class CNN inference/training path for the assignment classes **Nervous, Scared, Confused**. The model architecture is explicitly Conv2D → ReLU → Pooling → Conv2D → ReLU → Pooling → Conv2D → ReLU → Pooling → Flatten → Dense → Softmax.

The repository includes a consent-based dataset collector and training script. No facial dataset images are redistributed in the repository. Use genuinely annotated images only.

Official/reference sources include the McGill Face Database (complex mental-state facial expressions) and the CVPR 2023 MovieGraphs/EmoTx work, which documents labels including nervous, scared, and confused. See `ai-services/emotion-cnn-service/README.md` for provenance and limitations.


### Local Module 6 launcher
Use `START-MODULE6-LOCAL.ps1` to sync the previously trained real CNN model and start CNN, MediaPipe, object detection, backend, and frontend in separate PowerShell windows. Use `CHECK-MODULE6-LOCAL.ps1` to verify service health.
