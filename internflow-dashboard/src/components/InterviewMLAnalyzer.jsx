import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { mlApi } from '../services/mlapi';

const MODEL_URL = '/models';
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.35,
});

const getEyeDistance = (landmarks) => {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const leftCenter = leftEye.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  const rightCenter = rightEye.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });

  const leftMid = { x: leftCenter.x / leftEye.length, y: leftCenter.y / leftEye.length };
  const rightMid = { x: rightCenter.x / rightEye.length, y: rightCenter.y / rightEye.length };
  return Math.hypot(leftMid.x - rightMid.x, leftMid.y - rightMid.y);
};

const getNoseOffset = (landmarks) => {
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const eyeCenter = leftEye.concat(rightEye).reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  const center = { x: eyeCenter.x / (leftEye.length + rightEye.length), y: eyeCenter.y / (leftEye.length + rightEye.length) };
  const noseTip = nose[nose.length - 1];
  return Math.abs(noseTip.x - center.x);
};

const getHeadPose = (landmarks) => {
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const mouth = landmarks.getMouth();

  const eyeCenter = leftEye.concat(rightEye).reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  const eyeMid = {
    x: eyeCenter.x / (leftEye.length + rightEye.length),
    y: eyeCenter.y / (leftEye.length + rightEye.length)
  };

  const noseTip = nose[nose.length - 1];
  const mouthCenter = mouth.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  const mouthMid = { x: mouthCenter.x / mouth.length, y: mouthCenter.y / mouth.length };

  const horizontalShift = noseTip.x - eyeMid.x;
  const verticalShift = noseTip.y - mouthMid.y;
  const eyeDistance = Math.max(1, Math.hypot(
    leftEye[0].x - rightEye[0].x,
    leftEye[0].y - rightEye[0].y
  ));
  const facePoints = [...leftEye, ...rightEye, ...nose, ...mouth];
  const faceHeight = Math.max(1,
    Math.max(...facePoints.map((point) => point.y)) - Math.min(...facePoints.map((point) => point.y))
  );
  const horizontalRatio = horizontalShift / eyeDistance;
  const verticalRatio = verticalShift / faceHeight;

  const absHorizontal = Math.abs(horizontalRatio);
  const absVertical = Math.abs(verticalRatio);

  if (absHorizontal < 0.28 && absVertical < 0.22) {
    return { direction: 'center', horizontalRatio, verticalRatio };
  }

  if (absHorizontal >= absVertical * 1.2 && absHorizontal >= 0.42) {
    return {
      direction: horizontalRatio > 0 ? 'right' : 'left',
      horizontalRatio,
      verticalRatio
    };
  }

  if (absVertical >= 0.36) {
    return {
      direction: verticalRatio > 0 ? 'down' : 'up',
      horizontalRatio,
      verticalRatio
    };
  }

  return { direction: 'center', horizontalRatio, verticalRatio };
};

const extractFeatures = (videoRef, detection) => {
  if (!videoRef.current || !videoRef.current.videoWidth) {
    return null;
  }

  if (!detection) {
    return null;
  }

  const { landmarks } = detection;
  const eyeDistance = getEyeDistance(landmarks);
  const noseOffset = getNoseOffset(landmarks);
  const faceWidth = detection.detection.box.width;
  const faceHeight = detection.detection.box.height;

  return [
    0.5 + (faceHeight / 300) * 0.2,
    0.1 + Math.min(0.2, (faceHeight - 80) / 1000),
    faceWidth * 0.15,
    0.4 + (faceWidth / 300) * 0.2,
    noseOffset / 100,
    faceWidth / 100,
    0.2 + (faceHeight / 400),
    0.0,
    0.0,
    0.0,
    90.0 + (landmarks.getNose()[0].x - 0.5) * 20,
    eyeDistance / 120,
    Math.abs((landmarks.getNose()[0].y - 0.5) * 30),
    Math.max(0.3, Math.min(0.9, eyeDistance / 80)),
    0.1 + Math.max(0, 0.2 - noseOffset / 120),
  ];
};

const InterviewMLAnalyzer = ({ isActive, onAnalysisResult, onHeadTurnWarning, onAutoTerminate }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const warningCountRef = useRef(0);
  const previousHeadDirectionRef = useRef('center');
  const awayStreakRef = useRef(0);
  const noFaceStreakRef = useRef(0);
  const lastWarningDirectionRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const startCamera = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (error) {
        console.error('Camera setup error:', error);
        setCameraReady(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  const runAnalysis = async () => {
    if (!isActive || !videoRef.current) return;

    setIsAnalyzing(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, DETECTOR_OPTIONS)
        .withFaceLandmarks();

      const features = extractFeatures(videoRef, detection);
      if (!features || !detection) {
        noFaceStreakRef.current += 1;
        const noFaceResult = {
          class: 'Camera check',
          confidence: 0,
          emotion: 'Camera check',
          eyeContact: false,
          attention: 0,
          engagement: 0,
          hasFace: false,
          behaviorSummary: 'Your face is not clearly visible. Move closer and keep your face inside the camera frame.'
        };

        if (noFaceStreakRef.current >= 2 && lastWarningDirectionRef.current !== 'camera') {
          warningCountRef.current += 1;
          lastWarningDirectionRef.current = 'camera';
          const warningMessage = `Camera visibility warning: keep your face visible in the frame. (${warningCountRef.current}/3)`;
          if (onHeadTurnWarning) onHeadTurnWarning('away from the camera', warningCountRef.current, warningMessage);
        }

        setAnalysis(noFaceResult);
        if (onAnalysisResult) onAnalysisResult(noFaceResult);
        return;
      }

      noFaceStreakRef.current = 0;
      if (lastWarningDirectionRef.current === 'camera') {
        lastWarningDirectionRef.current = null;
      }

      const result = await mlApi.predictConfidence(features);
      const headPose = getHeadPose(detection.landmarks);
      const { direction: headDirection, horizontalRatio, verticalRatio } = headPose;
      const nose = detection.landmarks.getNose();
      const leftEye = detection.landmarks.getLeftEye();
      const rightEye = detection.landmarks.getRightEye();
      const mouth = detection.landmarks.getMouth();

      const eyeCenter = leftEye.concat(rightEye).reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
      const eyeMid = {
        x: eyeCenter.x / (leftEye.length + rightEye.length),
        y: eyeCenter.y / (leftEye.length + rightEye.length)
      };

      const mouthCenter = mouth.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
      const mouthMid = { x: mouthCenter.x / mouth.length, y: mouthCenter.y / mouth.length };
      const noseTip = nose[nose.length - 1];

      const isReadingScreen = Math.abs(horizontalRatio) < 0.34 && Math.abs(verticalRatio) < 0.28;
      const isMajorAwayFromScreen = headDirection !== 'center' && !isReadingScreen;

      if (isMajorAwayFromScreen) {
        awayStreakRef.current += 1;
      } else {
        awayStreakRef.current = 0;
        previousHeadDirectionRef.current = 'center';
        lastWarningDirectionRef.current = null;
      }

      const shouldWarn = headDirection !== 'center' && awayStreakRef.current >= 2 && lastWarningDirectionRef.current !== headDirection;

      if (shouldWarn) {
        warningCountRef.current += 1;
        lastWarningDirectionRef.current = headDirection;
        previousHeadDirectionRef.current = headDirection;

        const warningMessage = `⚠️ Head turned ${headDirection}. Keep your face centered. (${warningCountRef.current}/3)`;
        if (onHeadTurnWarning) {
          onHeadTurnWarning(headDirection, warningCountRef.current, warningMessage);
        } else {
          alert(warningMessage);
        }
      }

      const poseEyeContact = Math.max(0, Math.min(100,
        100 - Math.abs(horizontalRatio) * 85 - Math.abs(verticalRatio) * 75
      ));
      const poseAttention = Math.max(0, Math.min(100, poseEyeContact * 0.75 + 25));
      const poseEngagement = Math.max(0, Math.min(100, poseAttention * 0.85 + 10));
      const adjustedConfidence = Math.round(Math.max(0, Math.min(100,
        Number(result.confidence || 0) * 0.35 + poseAttention * 0.65
      )));
      const adjustedAttention = Math.round(poseAttention);
      const adjustedEngagement = Math.round(poseEngagement);
      const liveState = isMajorAwayFromScreen
        ? 'Looking away'
        : adjustedConfidence >= 72 ? 'Composed' : adjustedConfidence >= 52 ? 'Steady' : 'Needs focus';

      const mergedResult = {
        ...result,
        class: liveState,
        emotion: liveState,
        hasFace: true,
        confidence: adjustedConfidence,
        eyeContact: headDirection === 'center' && !isMajorAwayFromScreen && (result.eyeContact !== false),
        eyeContactPercentage: Math.round(poseEyeContact),
        attention: adjustedAttention,
        engagement: adjustedEngagement,
        headDirection,
        warningCount: warningCountRef.current,
      };

      setAnalysis(mergedResult);
      if (onAnalysisResult) onAnalysisResult(mergedResult);
      console.log('ML Analysis Result:', mergedResult);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!isActive || !cameraReady) return;

    const interval = setInterval(runAnalysis, 2000);
    return () => clearInterval(interval);
  }, [isActive, cameraReady]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '12px 16px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      zIndex: 999,
      maxWidth: '270px'
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
        🎯 Interview Analysis
      </h4>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          maxHeight: '120px',
          objectFit: 'cover',
          borderRadius: '10px',
          display: cameraReady ? 'block' : 'none',
          marginBottom: '8px',
          background: '#111827',
        }}
      />

      {isAnalyzing ? (
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          Analyzing...
        </div>
      ) : analysis ? (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>
            Confidence: <span style={{ color: analysis.class === 'Confident' ? '#22c55e' : analysis.class === 'Neutral' ? '#f59e0b' : '#ef4444' }}>
              {analysis.class || 'Neutral'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Score: {analysis.confidence ?? 0}%
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Eye: {analysis.eyeContact ? 'On Camera' : 'Away'} · Focus: {analysis.attention ?? 0}%
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          Waiting for analysis...
        </div>
      )}
    </div>
  );
};

export default InterviewMLAnalyzer;