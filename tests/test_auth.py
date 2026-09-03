import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from core.auth import hash_password, verify_password, create_token, decode_token


def test_password_hashing_and_verification():
    raw_password = "SecretPassword123!"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_token_generation_and_decoding():
    payload = {
        "id": 42,
        "email": "candidate@smarthire.ai",
        "role": "candidate",
        "name": "Candidate User"
    }
    token = create_token(payload)
    assert isinstance(token, str)
    assert len(token) > 20

    decoded = decode_token(token)
    assert decoded["id"] == 42
    assert decoded["email"] == "candidate@smarthire.ai"
    assert decoded["role"] == "candidate"
