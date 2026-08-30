import json
from urllib.request import urlopen
from urllib.error import HTTPError, URLError

from app.emotion_analysis import analyze_video_emotions
from app.main import calculate_engagement_score


# ============================================================
# EXISTING INTERVIEW VIDEO
# ============================================================

video_path = r"D:\projects\springboot\smarthire-frontend\backend-python\private_recordings\interview-33-8ec2673fdfa5455081a9a6aca396fbd9.webm"


# IMPORTANT:
# Replace this with the actual interview ID if different.
INTERVIEW_ID = "33-8ec2673fdfa5455081a9a6aca396fbd9"


# ============================================================
# 1. EMOTION ANALYSIS FROM SAVED VIDEO
# ============================================================

emotion_result = analyze_video_emotions(
    video_path,
    sample_every_seconds=1
)

print("\n=== EMOTION ANALYSIS ===")

print("Status:", emotion_result.get("status"))
print("Dominant emotion:", emotion_result.get("dominant_emotion"))

print("\nEmotion distribution:")

for emotion, probability in emotion_result.get(
    "emotion_distribution", {}
).items():
    print(
        f"{emotion:10s}: "
        f"{probability * 100:.2f}%"
    )

print(
    "\nFrames sampled:",
    emotion_result.get("frames_sampled", 0)
)

print(
    "Frames with face:",
    emotion_result.get("frames_with_face", 0)
)

print(
    "Frames processed:",
    emotion_result.get("frames_processed", 0)
)


# ============================================================
# 2. GET SAVED INTERVIEW DATA
# ============================================================

print("\n=== SAVED INTERVIEW DATA ===")

API_URL = (
    f"http://127.0.0.1:8000/api/interviews/{INTERVIEW_ID}"
)

try:

    with urlopen(API_URL, timeout=10) as response:

        data = response.read().decode("utf-8")

        interview = json.loads(data)

    monitoring_summary = interview.get(
        "monitoring_summary",
        {}
    )

    print(
        "Monitoring summary found:",
        bool(monitoring_summary)
    )

except HTTPError as e:

    print(
        f"HTTP Error {e.code}: {e.reason}"
    )

    print(
        "Check the INTERVIEW_ID and API endpoint."
    )

    raise SystemExit

except URLError as e:

    print(
        "Could not connect to the backend:"
    )

    print(e)

    print(
        "Make sure FastAPI is running."
    )

    raise SystemExit

except Exception as e:

    print(
        "Could not retrieve interview data:"
    )

    print(e)

    raise SystemExit


# ============================================================
# 3. DISPLAY EXISTING MONITORING DATA
# ============================================================

print("\n=== EXISTING MONITORING DATA ===")

for key, value in monitoring_summary.items():

    print(f"{key}: {value}")


# ============================================================
# 4. UPDATE EMOTION DATA FOR THIS TEST
# ============================================================

monitoring_summary["emotion_analysis"] = emotion_result


# ============================================================
# 5. ATTENTION ANALYSIS
# ============================================================

print("\n=== ATTENTION ANALYSIS ===")

attention_analysis = monitoring_summary.get(
    "attention_analysis"
)

if attention_analysis:

    print(
        "Attention score:",
        attention_analysis.get("attention_score")
    )

    print(
        "Attention level:",
        attention_analysis.get("attention_level")
    )

else:

    print(
        "No saved attention_analysis found."
    )


# ============================================================
# 6. ENGAGEMENT ANALYSIS
# ============================================================

print("\n=== ENGAGEMENT ANALYSIS ===")

engagement_result = calculate_engagement_score(
    monitoring_summary
)

print(
    "Status:",
    engagement_result.get("status")
)

print(
    "Engagement score:",
    engagement_result.get("engagement_score")
)

print(
    "Engagement level:",
    engagement_result.get("engagement_level")
)

print("\nComponents:")

components = engagement_result.get(
    "components",
    {}
)

for name, value in components.items():

    print(
        f"{name}: {value}"
    )


# ============================================================
# 7. FINAL TEST RESULT
# ============================================================

print("\n===================================")
print("FEATURE 5 TEST RESULT")
print("===================================")

if engagement_result.get("status") == "success":

    print(
        "Feature 5 Engagement Estimation: WORKING"
    )

else:

    print(
        "Feature 5 Engagement Estimation:"
        " NOT AVAILABLE / CHECK IMPLEMENTATION"
    )