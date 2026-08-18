import jwt
import datetime

SECRET_KEY = "YOUR_SUPER_SECRET_KEY"  # .env file mein rakhein

def generate_jwt(user_id, email):
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24) # 1 day validity
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_jwt(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return {"error": "Token expire ho gaya hai"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid Token"}