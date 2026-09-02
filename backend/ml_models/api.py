from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
from scoring_engine import ScoringEngine, evaluate_interview_session

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

# Initialize scoring engine
scoring_engine = ScoringEngine()

FEATURE_NAMES = [
    'eye_shoulder_y_ratio',
    'shoulder_y_diff',
    'wrist_distance_x',
    'wrist_shoulder_ratio',
    'nose_eye_center_offset_x',
    'shoulder_span',
    'hip_shoulder_y_diff',
    'body_lean_x',
    'shoulder_center_x',
    'hip_center_x',
    'spine_angle',
    'eye_distance',
    'head_tilt_angle',
    'eye_distance_ratio',
    'shoulder_slope'
]

INTERVIEW_EMOTIONS = ['Nervous', 'Scared', 'Confused']

# Load models
model = joblib.load(os.path.join(MODEL_DIR, 'confidence_model.pkl'))
scaler = joblib.load(os.path.join(MODEL_DIR, 'confidence_scaler.pkl'))
label_encoder = joblib.load(os.path.join(MODEL_DIR, 'confidence_label_encoder.pkl'))


def normalize_features(raw_features):
    arr = np.asarray(raw_features, dtype=float).reshape(1, -1)
    if arr.shape[1] < len(FEATURE_NAMES):
        padding = np.zeros((1, len(FEATURE_NAMES) - arr.shape[1]))
        arr = np.hstack([arr, padding])
    if arr.shape[1] > len(FEATURE_NAMES):
        arr = arr[:, :len(FEATURE_NAMES)]
    return arr


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def compute_behavior_scores(features):
    arr = np.asarray(features, dtype=float)
    eye_distance_ratio = float(arr[13]) if len(arr) > 13 else 0.5
    eye_distance = float(arr[11]) if len(arr) > 11 else 0.3
    nose_offset = abs(float(arr[4])) if len(arr) > 4 else 0.0
    shoulder_span = float(arr[5]) if len(arr) > 5 else 1.0
    spine_angle = float(arr[10]) if len(arr) > 10 else 90.0

    gaze_error = abs(0.5 - eye_distance_ratio)
    posture_quality = 100.0 - abs(spine_angle - 90.0) * 1.6
    eye_contact_percentage = 100.0 - (gaze_error * 180.0 + nose_offset * 140.0)
    eye_contact_percentage = clamp(eye_contact_percentage, 0.0, 100.0)

    attention_score = 0.55 * eye_contact_percentage + 0.35 * posture_quality + 0.10 * (100.0 if shoulder_span > 0 else 0)
    attention_score = clamp(attention_score, 0.0, 100.0)

    engagement_score = 0.60 * attention_score + 0.25 * eye_contact_percentage + 0.15 * posture_quality
    engagement_score = clamp(engagement_score, 0.0, 100.0)

    if eye_contact_percentage >= 70 and posture_quality >= 68:
        emotion = 'Nervous'
        confidence_score = 70.0 + (attention_score - 60.0) * 0.45
        summary = 'Candidate is looking at the camera with a fairly stable interview posture.'
    elif eye_contact_percentage < 40 or attention_score < 45:
        emotion = 'Scared'
        confidence_score = 35.0 + (attention_score * 0.25)
        summary = 'Candidate looks uncertain or visibly stressed; eye gaze and attention are inconsistent.'
    else:
        emotion = 'Confused'
        confidence_score = 50.0 + (attention_score - 50.0) * 0.6
        summary = 'Candidate is attentive but shows hesitation and unclear focus during the response.'

    confidence_score = clamp(confidence_score, 15.0, 92.0)
    eye_contact_label = eye_contact_percentage >= 45.0

    return {
        'class': emotion,
        'emotion': emotion,
        'confidence': round(float(confidence_score), 2),
        'eyeContact': bool(eye_contact_label),
        'attention': round(float(attention_score), 2),
        'engagement': round(float(engagement_score), 2),
        'hasFace': True,
        'behaviorSummary': summary,
        'eyeContactPercentage': round(float(eye_contact_percentage), 2),
        'attentionLevel': 'High' if attention_score >= 70 else 'Medium' if attention_score >= 45 else 'Low',
        'engagementLevel': 'High' if engagement_score >= 70 else 'Medium' if engagement_score >= 45 else 'Low'
    }


@app.route('/api/predict/confidence', methods=['POST'])
def predict_confidence():
    try:
        data = request.json or {}
        features = data.get('features', [])

        if not features:
            return jsonify({'error': 'No features provided'}), 400

        features_array = normalize_features(features)
        scaled = scaler.transform(features_array)

        prediction = model.predict(scaled)[0]
        probabilities = model.predict_proba(scaled)[0]
        class_names = label_encoder.classes_
        predicted_class = class_names[prediction]
        confidence_score = float(max(probabilities) * 100)

        behavior = compute_behavior_scores(features)
        behavior['class'] = predicted_class if confidence_score >= 20 else behavior['class']
        behavior['confidence'] = round(float(max(confidence_score, behavior['confidence'])), 2)

        return jsonify({
            'class': behavior['class'],
            'confidence': behavior['confidence'],
            'emotion': behavior['emotion'],
            'eyeContact': behavior['eyeContact'],
            'attention': behavior['attention'],
            'engagement': behavior['engagement'],
            'hasFace': behavior['hasFace'],
            'behaviorSummary': behavior['behaviorSummary'],
            'probabilities': dict(zip(class_names, probabilities.tolist()))
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'ML API is running'})


# =============================================
# SCORING ENDPOINTS
# =============================================

@app.route('/api/score/comprehensive', methods=['POST'])
def score_comprehensive():
    """
    Comprehensive evaluation of a single Q&A pair
    
    Request body:
    {
        "question": "What is machine learning?",
        "answer": "Machine learning is...",
        "domain": "ai_ml",
        "behavioral_data": {...},
        "expected_keywords": [...]
    }
    """
    try:
        data = request.json or {}
        question = data.get('question', '')
        answer = data.get('answer', '')
        domain = data.get('domain', 'general')
        behavioral_data = data.get('behavioral_data', None)
        expected_keywords = data.get('expected_keywords', None)
        
        if not question or not answer:
            return jsonify({'error': 'question and answer are required'}), 400
        
        result = scoring_engine.evaluate_comprehensive(
            question=question,
            answer=answer,
            domain=domain,
            behavioral_data=behavioral_data,
            expected_keywords=expected_keywords
        )
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/score/communication', methods=['POST'])
def score_communication():
    """
    Score communication dimensions
    
    Request body:
    {
        "answer": "The candidate's response...",
        "audio_data": {...}  # optional
    }
    """
    try:
        data = request.json or {}
        answer = data.get('answer', '')
        audio_data = data.get('audio_data', None)
        
        if not answer:
            return jsonify({'error': 'answer is required'}), 400
        
        result = scoring_engine.calculate_communication_score(answer, audio_data)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/score/confidence', methods=['POST'])
def score_confidence():
    """
    Score confidence dimensions (requires behavioral data from video)
    
    Request body:
    {
        "answer": "The candidate's response...",
        "behavioral_data": {
            "eyeContactPercentage": 75,
            "engagement": 80,
            "attention": 85
        }
    }
    """
    try:
        data = request.json or {}
        answer = data.get('answer', '')
        behavioral_data = data.get('behavioral_data', None)
        
        if not answer:
            return jsonify({'error': 'answer is required'}), 400
        
        result = scoring_engine.calculate_confidence_score(answer, behavioral_data)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/score/technical', methods=['POST'])
def score_technical():
    """
    Score technical relevance dimensions
    
    Request body:
    {
        "question": "What is a neural network?",
        "answer": "A neural network is...",
        "domain": "ai_ml",
        "expected_keywords": ["neurons", "layers", "training"]
    }
    """
    try:
        data = request.json or {}
        question = data.get('question', '')
        answer = data.get('answer', '')
        domain = data.get('domain', 'general')
        expected_keywords = data.get('expected_keywords', None)
        
        if not question or not answer:
            return jsonify({'error': 'question and answer are required'}), 400
        
        result = scoring_engine.calculate_technical_relevance_score(
            question, answer, domain, expected_keywords
        )
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/score/professionalism', methods=['POST'])
def score_professionalism():
    """
    Score professionalism dimensions
    
    Request body:
    {
        "answer": "The candidate's response..."
    }
    """
    try:
        data = request.json or {}
        answer = data.get('answer', '')
        
        if not answer:
            return jsonify({'error': 'answer is required'}), 400
        
        result = scoring_engine.calculate_professionalism_score(answer)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/score/overall', methods=['POST'])
def score_overall():
    """
    Calculate overall score from individual dimension scores
    
    Request body:
    {
        "communication_score": 85,
        "confidence_score": 80,
        "technical_score": 75,
        "professionalism_score": 90
    }
    """
    try:
        data = request.json or {}
        comm = data.get('communication_score', 0)
        conf = data.get('confidence_score', 0)
        tech = data.get('technical_score', 0)
        prof = data.get('professionalism_score', 0)
        
        result = scoring_engine.calculate_overall_score(comm, conf, tech, prof)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/score/session', methods=['POST'])
def score_session():
    """
    Evaluate entire interview session with multiple Q&A pairs
    
    Request body:
    {
        "qa_pairs": [
            {
                "question": "What is AI?",
                "answer": "AI is...",
                "expected_keywords": [...]
            },
            ...
        ],
        "domain": "ai_ml",
        "behavioral_data": [...] # optional, per Q&A
    }
    """
    try:
        data = request.json or {}
        
        result = evaluate_interview_session(data)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)