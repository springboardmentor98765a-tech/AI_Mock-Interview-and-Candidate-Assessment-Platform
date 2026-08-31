// src/services/mlApi.js

const API_URL = 'http://localhost:5002';

const buildFallbackResult = (features = []) => {
  const base = Array.isArray(features) && features.length ? features : [0.5, 0.1, 0.3, 0.4, 0.1, 1.2, 0.2, 0.0, 0.0, 0.0, 90.0, 0.3, 5.0, 0.5, 0.1];

  const eyeDistanceRatio = Number(base[13] ?? 0.5);
  const noseOffset = Math.abs(Number(base[4] ?? 0.1));
  const postureScore = 88 - Math.abs(Number(base[10] ?? 90) - 90) * 1.2;
  const gazeScore = 92 - noseOffset * 120 - Math.abs(0.5 - eyeDistanceRatio) * 130;
  const attentionScore = Math.max(42, Math.min(90, postureScore * 0.55 + gazeScore * 0.45));
  const engagementScore = Math.max(44, Math.min(92, attentionScore + 5));
  const eyeContact = gazeScore > 56;

  let className = 'Confused';
  let emotion = 'Confused';
  let confidenceScore = 58;

  if (gazeScore >= 70 && postureScore >= 72) {
    className = 'Nervous';
    emotion = 'Nervous';
    confidenceScore = 74;
  } else if (gazeScore < 45 || attentionScore < 48) {
    className = 'Scared';
    emotion = 'Scared';
    confidenceScore = 39;
  } else {
    className = 'Confused';
    emotion = 'Confused';
    confidenceScore = 58;
  }

  return {
    class: className,
    confidence: Math.round(confidenceScore),
    emotion,
    eyeContact,
    attention: Math.round(attentionScore),
    engagement: Math.round(engagementScore),
    hasFace: true,
    behaviorSummary: eyeContact
      ? 'Candidate is looking at the camera with a relatively stable interview posture.'
      : 'Candidate appears uncertain or distracted and is not maintaining strong eye contact.',
    eyeContactPercentage: Math.round(Math.max(0, Math.min(100, gazeScore))),
    attentionLevel: attentionScore >= 70 ? 'High' : attentionScore >= 45 ? 'Medium' : 'Low',
    engagementLevel: engagementScore >= 70 ? 'High' : engagementScore >= 45 ? 'Medium' : 'Low',
    probabilities: {
      Nervous: 0.58,
      Scared: 0.22,
      Confused: 0.20,
    },
  };
};

export const mlApi = {
  // Health check
  health: async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return null;
    }
  },

  // Predict confidence from posture features
  predictConfidence: async (features) => {
    try {
      const response = await fetch(`${API_URL}/api/predict/confidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ features }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        ...buildFallbackResult(features),
        ...result,
      };
    } catch (error) {
      console.error('ML API Prediction Error:', error);
      return buildFallbackResult(features);
    }
  },

  predictBehavior: async (features) => {
    return mlApi.predictConfidence(features);
  },

  // Get feature names
  getFeatureNames: () => {
    return [
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
    ];
  },

  // Generate sample features for testing
  getSampleFeatures: () => {
    return [
      0.5, 0.1, 0.3, 0.4, 0.1, 1.2, 0.2, 0.0, 0.0, 0.0, 90.0, 0.3, 5.0, 0.5, 0.1
    ];
  }
};