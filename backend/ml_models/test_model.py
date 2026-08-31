import joblib
import numpy as np

print("Testing Confidence Model...")

# Load the model
model = joblib.load('models/confidence_model.pkl')
scaler = joblib.load('models/confidence_scaler.pkl')
label_encoder = joblib.load('models/confidence_label_encoder.pkl')

# Sample features (neutral posture)
sample_features = np.array([[
    0.5,   # eye_shoulder_y_ratio
    0.1,   # shoulder_y_diff
    0.3,   # wrist_distance_x
    0.4,   # wrist_shoulder_ratio
    0.1,   # nose_eye_center_offset_x
    1.2,   # shoulder_span
    0.2,   # hip_shoulder_y_diff
    0.0,   # body_lean_x
    0.0,   # shoulder_center_x
    0.0,   # hip_center_x
    90.0,  # spine_angle
    0.3,   # eye_distance
    5.0,   # head_tilt_angle
    0.5,   # eye_distance_ratio
    0.1    # shoulder_slope
]])

# Scale and predict
scaled = scaler.transform(sample_features)
prediction = model.predict(scaled)[0]
confidence = model.predict_proba(scaled)[0]

class_names = label_encoder.classes_
predicted_class = class_names[prediction]
confidence_score = max(confidence) * 100

print(f"\n📊 Sample Prediction:")
print(f"   Class: {predicted_class}")
print(f"   Confidence: {confidence_score:.1f}%")
print(f"   All probabilities: {dict(zip(class_names, confidence))}")

print("\n✅ Model test complete!")