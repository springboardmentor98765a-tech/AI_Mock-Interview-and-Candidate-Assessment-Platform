# Installation Guide

## Prerequisites
- Java 21
- Maven 3.9+
- PostgreSQL 14+
- Modern Chromium-based browser

## Backend Setup
1. Open `smarthire-backend/smarthire-backend/src/main/resources/application.properties`.
2. Update database credentials and Gemini key.
3. Run:
   - `cd smarthire-backend/smarthire-backend`
   - `mvn clean package`
   - `mvn spring-boot:run`

## Frontend Setup
1. Open the project root in a static server (recommended) or VS Code Live Server.
2. Ensure backend runs on port `8080`.
3. Open `index.html` and authenticate.

## Docker Setup
1. Copy `.env.example` to `.env` and update values.
2. Run `docker compose up --build`.
3. Frontend: `http://localhost:5173`
4. Backend: `http://localhost:8080`
