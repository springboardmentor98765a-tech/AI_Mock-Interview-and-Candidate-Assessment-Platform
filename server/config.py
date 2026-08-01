import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "8000"))
JWT_SECRET = os.getenv("JWT_SECRET", "smarthire-default-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_IN_MINUTES = int(os.getenv("JWT_EXPIRES_IN_MINUTES", "10080"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
DB_PATH = os.path.join(os.path.dirname(__file__), os.getenv("DB_PATH", "data/smarthire.db"))
