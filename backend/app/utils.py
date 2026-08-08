"""
utils.py
=========
Small reusable helper functions. Currently holds the bcrypt
password hashing / verification helpers.
"""

from passlib.context import CryptContext

# bcrypt is configured explicitly per the project requirements
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt. Never store plain text."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain-text password against its stored bcrypt hash."""
    return pwd_context.verify(plain_password, password_hash)
