# Deployment Guide

## Option 1: Docker Compose
1. Configure `.env` from `.env.example`.
2. Run `docker compose up --build -d`.
3. Verify:
   - Frontend: `http://localhost:5173`
   - Backend health via API endpoints.

## Option 2: Backend JAR + Static Hosting
1. Build backend JAR with `mvn clean package`.
2. Deploy JAR to VM/container with Java 21.
3. Host frontend assets on Nginx/Apache/S3 static hosting.
4. Set `SMART_HIRE_API_BASE` globally if backend host differs.

## Production Considerations
- Restrict CORS to trusted domains.
- Store secrets in environment variables.
- Use managed PostgreSQL and backups.
- Enable HTTPS via reverse proxy.
- Monitor logs and JVM memory.
