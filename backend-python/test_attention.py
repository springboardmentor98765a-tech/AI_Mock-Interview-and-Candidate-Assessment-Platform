from app.main import calculate_attention_score

# Test Case 1: Perfect Attention
case_perfect = {
    "monitoring_checks": 100,
    "face_visible_checks": 100,
    "eye_contact_checks": 100,
    "gaze_left_checks": 0,
    "gaze_right_checks": 0,
    "gaze_down_checks": 0,
    "eyes_closed_checks": 0
}
res_perfect = calculate_attention_score(case_perfect)
print("Perfect Attention:")
print(res_perfect)
assert res_perfect["attention_score"] == 100
assert res_perfect["attention_level"] == "High"

# Test Case 2: Zero Checks (Edge Case)
case_zero = {
    "monitoring_checks": 0
}
res_zero = calculate_attention_score(case_zero)
print("\nZero Checks:")
print(res_zero)
assert res_zero["attention_score"] is None
assert res_zero["attention_level"] == "Not available"

# Test Case 3: Empty Dictionary (Edge Case)
res_empty = calculate_attention_score({})
print("\nEmpty Dict:")
print(res_empty)
assert res_empty["attention_score"] is None

# Test Case 4: No Gaze Samples (Safely handles division by zero)
case_no_gaze = {
    "monitoring_checks": 100,
    "face_visible_checks": 100,
    "eye_contact_checks": 0,
    "gaze_left_checks": 0,
    "gaze_right_checks": 0,
    "gaze_down_checks": 0,
    "eyes_closed_checks": 0
}
res_no_gaze = calculate_attention_score(case_no_gaze)
print("\nNo Gaze Samples:")
print(res_no_gaze)
assert res_no_gaze["components"]["gaze_focus_percentage"] == 100

# Test Case 5: Low Attention
case_low = {
    "monitoring_checks": 100,
    "face_visible_checks": 30,      # Face visible only 30% of the time (penalized by 20%)
    "eye_contact_checks": 10,       # Eye contact only 10% of the time (penalized by 60%)
    "gaze_left_checks": 30,         # Looking left 30 checks
    "gaze_right_checks": 40,        # Looking right 40 checks
    "gaze_down_checks": 20,         # Looking down 20 checks
    "eyes_closed_checks": 40        # Eyes closed 40% of the time (penalized by 10%)
}
res_low = calculate_attention_score(case_low)
print("\nLow Attention:")
print(res_low)
assert res_low["attention_level"] == "Low"

print("\nALL BACKEND ATTENTION UNIT TESTS PASSED!")
