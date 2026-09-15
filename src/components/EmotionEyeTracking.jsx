import React, { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

import "./EmotionEyeTracking.css";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function EmotionEyeTracking({
  videoRef,
  isActive = false,
  questionNumber = null,
  onAnalysisChange = null,
}) {
  const faceLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  const samplesRef = useRef([]);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const [metrics, setMetrics] = useState({
    facePresence: 0,
    eyeContact: 0,
    attention: 0,
    engagement: 0,
    confidence: 0,
    expression: "Neutral",
    behaviorScore: 0,
  });

  // =========================================================
  // INITIALIZE MEDIAPIPE
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function initializeFaceLandmarker() {
      try {
        setError("");

        const vision = await FilesetResolver.forVisionTasks(WASM_URL);

        const landmarker = await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: "GPU",
            },

            runningMode: "VIDEO",

            numFaces: 1,

            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,

            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          }
        );

        if (cancelled) {
          landmarker.close();
          return;
        }

        faceLandmarkerRef.current = landmarker;
        setReady(true);
      } catch (err) {
        console.error("Face Landmarker initialization error:", err);

        if (!cancelled) {
          setError(
            "Computer vision could not be initialized. Please check your internet connection and browser."
          );
        }
      }
    }

    initializeFaceLandmarker();

    return () => {
      cancelled = true;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  // =========================================================
  // RESET WHEN QUESTION CHANGES
  // =========================================================

  useEffect(() => {
    samplesRef.current = [];

    setMetrics({
      facePresence: 0,
      eyeContact: 0,
      attention: 0,
      engagement: 0,
      confidence: 0,
      expression: "Neutral",
      behaviorScore: 0,
    });
  }, [questionNumber]);

  // =========================================================
  // CALCULATE EYE CONTACT
  // =========================================================

  function calculateEyeContact(landmarks) {
    if (!landmarks || landmarks.length < 1) {
      return 0;
    }

    const leftEyeOuter = landmarks[33];
    const leftEyeInner = landmarks[133];

    const rightEyeInner = landmarks[362];
    const rightEyeOuter = landmarks[263];

    const nose = landmarks[1];

    if (
      !leftEyeOuter ||
      !leftEyeInner ||
      !rightEyeInner ||
      !rightEyeOuter ||
      !nose
    ) {
      return 50;
    }

    const leftEyeCenterX =
      (leftEyeOuter.x + leftEyeInner.x) / 2;

    const rightEyeCenterX =
      (rightEyeInner.x + rightEyeOuter.x) / 2;

    const eyeCenterX =
      (leftEyeCenterX + rightEyeCenterX) / 2;

    const horizontalOffset = Math.abs(
      nose.x - eyeCenterX
    );

    const score = 100 - horizontalOffset * 900;

    return clamp(score, 0, 100);
  }

  // =========================================================
  // CALCULATE ATTENTION
  // =========================================================

  function calculateAttention(landmarks, eyeContact) {
    if (!landmarks || !landmarks.length) {
      return 0;
    }

    const nose = landmarks[1];

    if (!nose) {
      return eyeContact;
    }

    const verticalOffset = Math.abs(nose.y - 0.5);

    const headPositionScore = clamp(
      100 - verticalOffset * 150,
      0,
      100
    );

    return clamp(
      eyeContact * 0.65 +
        headPositionScore * 0.35
    );
  }

  // =========================================================
  // CALCULATE EXPRESSION SIGNAL
  // =========================================================

  function calculateExpression(blendshapes) {
    if (!blendshapes || !blendshapes.length) {
      return "Neutral";
    }

    const categories = blendshapes[0].categories || [];

    const getScore = (name) => {
      const item = categories.find(
        (category) => category.categoryName === name
      );

      return item ? item.score : 0;
    };

    const smile =
      (getScore("mouthSmileLeft") +
        getScore("mouthSmileRight")) /
      2;

    const brow =
      (getScore("browInnerUp") +
        getScore("browOuterUpLeft") +
        getScore("browOuterUpRight")) /
      3;

    const frown =
      (getScore("mouthFrownLeft") +
        getScore("mouthFrownRight")) /
      2;

    if (smile > 0.35) {
      return "Positive";
    }

    if (frown > 0.35) {
      return "Serious";
    }

    if (brow > 0.35) {
      return "Attentive";
    }

    return "Neutral";
  }

  // =========================================================
  // CALCULATE ENGAGEMENT
  // =========================================================

  function calculateEngagement(
    facePresence,
    eyeContact,
    attention
  ) {
    return clamp(
      facePresence * 0.35 +
        eyeContact * 0.35 +
        attention * 0.30
    );
  }

  // =========================================================
  // CALCULATE CONFIDENCE SIGNAL
  // =========================================================

  function calculateConfidence(
    eyeContact,
    attention,
    engagement
  ) {
    return clamp(
      eyeContact * 0.35 +
        attention * 0.30 +
        engagement * 0.35
    );
  }

  // =========================================================
  // CALCULATE BEHAVIOR SCORE
  // =========================================================

  function calculateBehaviorScore(
    eyeContact,
    attention,
    engagement,
    confidence
  ) {
    return clamp(
      eyeContact * 0.25 +
        attention * 0.25 +
        engagement * 0.25 +
        confidence * 0.25
    );
  }

  // =========================================================
  // SEND ANALYSIS TO PARENT
  // =========================================================

  function sendAnalysis(nextMetrics) {
    if (typeof onAnalysisChange !== "function") {
      return;
    }

    const samples = samplesRef.current;

    const summary = {
      ...nextMetrics,

      sampleCount: samples.length,

      averageFacePresence: average(
        samples.map((item) => item.facePresence)
      ),

      averageEyeContact: average(
        samples.map((item) => item.eyeContact)
      ),

      averageAttention: average(
        samples.map((item) => item.attention)
      ),

      averageEngagement: average(
        samples.map((item) => item.engagement)
      ),

      averageConfidence: average(
        samples.map((item) => item.confidence)
      ),

      averageBehaviorScore: average(
        samples.map((item) => item.behaviorScore)
      ),

      analysisMethod:
        "MediaPipe observable visual-signal heuristic",
    };

    onAnalysisChange(summary);
  }

  // =========================================================
  // DETECTION LOOP
  // =========================================================

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    if (!ready) {
      return;
    }

    const video = videoRef?.current;

    if (!video) {
      return;
    }

    let stopped = false;

    const detect = () => {
      if (stopped) {
        return;
      }

      const landmarker = faceLandmarkerRef.current;

      if (!landmarker) {
        animationFrameRef.current =
          requestAnimationFrame(detect);

        return;
      }

      if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        animationFrameRef.current =
          requestAnimationFrame(detect);

        return;
      }

      if (video.currentTime === lastVideoTimeRef.current) {
        animationFrameRef.current =
          requestAnimationFrame(detect);

        return;
      }

      lastVideoTimeRef.current = video.currentTime;

      try {
        const result = landmarker.detectForVideo(
          video,
          performance.now()
        );

        const hasFace =
          result.faceLandmarks &&
          result.faceLandmarks.length > 0;

        const facePresence = hasFace ? 100 : 0;

        if (!hasFace) {
          const nextMetrics = {
            facePresence: 0,
            eyeContact: 0,
            attention: 0,
            engagement: 0,
            confidence: 0,
            expression: "No face detected",
            behaviorScore: 0,
          };

          setMetrics(nextMetrics);

          samplesRef.current.push(nextMetrics);

          if (samplesRef.current.length > 300) {
            samplesRef.current.shift();
          }

          sendAnalysis(nextMetrics);

          animationFrameRef.current =
            requestAnimationFrame(detect);

          return;
        }

        const landmarks = result.faceLandmarks[0];

        const eyeContact =
          calculateEyeContact(landmarks);

        const attention =
          calculateAttention(
            landmarks,
            eyeContact
          );

        const expression =
          calculateExpression(
            result.faceBlendshapes
          );

        const engagement =
          calculateEngagement(
            facePresence,
            eyeContact,
            attention
          );

        const confidence =
          calculateConfidence(
            eyeContact,
            attention,
            engagement
          );

        const behaviorScore =
          calculateBehaviorScore(
            eyeContact,
            attention,
            engagement,
            confidence
          );

        const nextMetrics = {
          facePresence,
          eyeContact,
          attention,
          engagement,
          confidence,
          expression,
          behaviorScore,
        };

        setMetrics(nextMetrics);

        samplesRef.current.push(nextMetrics);

        if (samplesRef.current.length > 300) {
          samplesRef.current.shift();
        }

        sendAnalysis(nextMetrics);
      } catch (err) {
        console.error(
          "Face detection error:",
          err
        );
      }

      animationFrameRef.current =
        requestAnimationFrame(detect);
    };

    detect();

    return () => {
      stopped = true;

      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current = null;
      }
    };
  }, [
    isActive,
    ready,
    videoRef,
    questionNumber,
  ]);

  // =========================================================
  // FORMAT SCORE
  // =========================================================

  const scoreClass = (score) => {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "average";
    return "low";
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="emotion-eye-container">
      <div className="emotion-eye-header">
        <div>
          <h3>AI Visual Analysis</h3>

          <p>
            Camera-based attention and interview
            behavior signals
          </p>
        </div>

        <div
          className={`vision-status ${
            ready ? "ready" : "loading"
          }`}
        >
          <span className="status-dot"></span>

          {ready ? "Vision Ready" : "Initializing"}
        </div>
      </div>

      {error && (
        <div className="vision-error">
          {error}
        </div>
      )}

      <div className="vision-metrics">

        {/* FACE PRESENCE */}

        <div className="vision-metric">
          <div className="metric-icon">👤</div>

          <div className="metric-content">
            <span>Face Presence</span>

            <strong>
              {Math.round(metrics.facePresence)}%
            </strong>

            <div className="metric-bar">
              <div
                style={{
                  width: `${metrics.facePresence}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* EYE CONTACT */}

        <div className="vision-metric">
          <div className="metric-icon">👁️</div>

          <div className="metric-content">
            <span>Eye Contact</span>

            <strong
              className={scoreClass(
                metrics.eyeContact
              )}
            >
              {Math.round(metrics.eyeContact)}%
            </strong>

            <div className="metric-bar">
              <div
                style={{
                  width: `${metrics.eyeContact}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ATTENTION */}

        <div className="vision-metric">
          <div className="metric-icon">🎯</div>

          <div className="metric-content">
            <span>Attention</span>

            <strong
              className={scoreClass(
                metrics.attention
              )}
            >
              {Math.round(metrics.attention)}%
            </strong>

            <div className="metric-bar">
              <div
                style={{
                  width: `${metrics.attention}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ENGAGEMENT */}

        <div className="vision-metric">
          <div className="metric-icon">⚡</div>

          <div className="metric-content">
            <span>Engagement</span>

            <strong
              className={scoreClass(
                metrics.engagement
              )}
            >
              {Math.round(metrics.engagement)}%
            </strong>

            <div className="metric-bar">
              <div
                style={{
                  width: `${metrics.engagement}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* CONFIDENCE */}

        <div className="vision-metric">
          <div className="metric-icon">💪</div>

          <div className="metric-content">
            <span>Confidence Signal</span>

            <strong
              className={scoreClass(
                metrics.confidence
              )}
            >
              {Math.round(metrics.confidence)}%
            </strong>

            <div className="metric-bar">
              <div
                style={{
                  width: `${metrics.confidence}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* BEHAVIOR */}

        <div className="vision-metric">
          <div className="metric-icon">📊</div>

          <div className="metric-content">
            <span>Interview Behavior</span>

            <strong
              className={scoreClass(
                metrics.behaviorScore
              )}
            >
              {Math.round(
                metrics.behaviorScore
              )}%
            </strong>

            <div className="metric-bar">
              <div
                style={{
                  width: `${metrics.behaviorScore}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="expression-box">
        <span>Observable Expression</span>

        <strong>{metrics.expression}</strong>
      </div>

      <div className="vision-note">
        These metrics are observable computer-vision
        signals. They should not be treated as a
        psychological diagnosis or a definitive measure
        of a person's emotions or personality.
      </div>
    </div>
  );
}

export default EmotionEyeTracking;