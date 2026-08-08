from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

model = os.getenv("GEMINI_MODEL")
print("Using model:", model)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

response = client.models.generate_content(
    model=model,
    contents="Introduce yourself as an AI interviewer in one sentence."
)

print(response.text)