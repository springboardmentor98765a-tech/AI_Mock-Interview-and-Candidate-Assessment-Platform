FROM python:3.12-slim

WORKDIR /app

# g++/gcc needed at runtime for the coding-practice judge (C/C++ submissions);
# openjdk-21-jdk-headless for Java submissions (javac + java, no GUI/X11
# stack — default-jdk pulls in a full desktop Java environment we don't
# need and it roughly doubles build time). Node isn't included here since
# the JS-language coding track is optional — add "nodejs" if you want it.
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    gcc \
    openjdk-21-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
