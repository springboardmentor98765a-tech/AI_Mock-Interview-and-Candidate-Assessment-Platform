FROM python:3.11-slim

WORKDIR /app

# System deps needed by psycopg2 (Postgres driver) and pypdf/python-docx.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Recordings + any other uploaded media live here - mount a volume onto
# this path in docker-compose.yml so they survive container restarts.
RUN mkdir -p /app/media/recordings

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
