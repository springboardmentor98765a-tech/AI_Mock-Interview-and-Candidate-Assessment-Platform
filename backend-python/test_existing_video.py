from app.emotion_analysis import analyze_video_emotions
from app.main import calculate_engagement_score


# ============================================================
# EXISTING INTERVIEW VIDEO
# ============================================================

video_path = r"D:\projects\springboot\smarthire-frontend\backend-python\private_recordings\interview-33-8ec2673fdfa5455081a9a6aca396fbd9.webm"


# ============================================================
# 1. EMOTION ANALYSIS
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
# 2. GET EXISTING EMOTION STABILITY
# ============================================================

emotion_distribution = emotion_result.get(
    "emotion_distribution",
    {}
)

valid_probabilities = [
    value
    for value in emotion_distribution.values()
    if isinstance(value, (int, float))
]

if valid_probabilities:

    emotion_stability_percentage = round(
        max(valid_probabilities) * 100
    )

else:

    emotion_stability_percentage = None


# ============================================================
# 3. EXISTING INTERVIEW MONITORING VALUES
# ============================================================
#
# IMPORTANT:
# Replace these four values with the ACTUAL values
# from this saved interview's monitoring_summary/report.
#
# Do NOT use these example values as your final test.
#

eye_contact_percentage = 85
attention_score = 85
facial_activity_percentage = 75


# ============================================================
# 4. BUILD MONITORING SUMMARY
# ============================================================

monitoring_summary = {

    "attention_analysis": {

        "attention_score": attention_score,

        "components": {

            "eye_contact_percentage":
                eye_contact_percentage
        }
    },

    "emotion_analysis": emotion_result,

    "face_visible_checks": 0,

    "eyes_closed_checks": 0,

    "monitoring_checks": 0
}


# ============================================================
# 5. ENGAGEMENT ANALYSIS
# ============================================================

print("\n=== ENGAGEMENT ANALYSIS ===")

# Use the actual emotion stability calculated from
# the existing video.

# Add it temporarily for the engagement test.
monitoring_summary[
    "emotion_stability_percentage"
] = emotion_stability_percentage

monitoring_summary[
    "facial_activity_percentage"
] = facial_activity_percentage


engagement_result = calculate_engagement_score(
    monitoring_summary
)


print(
    "Status:",
    engagement_result.get("status")
)

print(
    "Engagement score:",
    engagement_result.get(
        "engagement_score"
    )
)

print(
    "Engagement level:",
    engagement_result.get(
        "engagement_level"
    )
)

print("\nComponents:")

for name, value in engagement_result.get(
    "components",
    {}
).items():

    print(
        f"{name}: {value}"
    )


# ============================================================
# 6. FINAL RESULT
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
        " NOT AVAILABLE / CHECK DATA"
    )