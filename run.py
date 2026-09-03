import os
import sys

# Ensure backend module is discoverable
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if __name__ == "__main__":
    import importlib
    import uvicorn

    # Set working directory to backend for clean relative path resolution
    os.chdir(BACKEND_DIR)

    try:
        config_mod = importlib.import_module("config")
        port = int(getattr(config_mod, "PORT", 8080))
    except Exception:
        port = 8080

    print(f"SmartHire AI running at: http://localhost:{port}")
    print(f"Interactive API Docs:   http://localhost:{port}/docs")

    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)
