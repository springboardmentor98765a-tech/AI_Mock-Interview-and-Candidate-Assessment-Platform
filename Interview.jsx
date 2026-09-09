import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import "./Interview.css";

import {
  useNavigate,
} from "react-router-dom";

const API_URL =
  "http://127.0.0.1:8000";

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "basically",
  "actually",
  "you know",
  "sort of",
  "kind of",
];

const EMOTIONS = [
  "Nervous",
  "Scared",
  "Confused",
];

function Interview() {
  const navigate = useNavigate();

  // =========================================================
  // USER
  // =========================================================

  const [user, setUser] = useState({
    name: "Candidate",
    email: "",
  });

  // =========================================================
  // INTERVIEW CONFIGURATION
  // =========================================================

  const [stage, setStage] =
    useState("setup");

  const [role, setRole] =
    useState("Software Developer");

  const [interviewType, setInterviewType] =
    useState("Technical");

  const [difficulty, setDifficulty] =
    useState("Intermediate");

  const [numberOfQuestions, setNumberOfQuestions] =
    useState(5);

  // =========================================================
  // QUESTIONS AND ANSWERS
  // =========================================================

  const [questions, setQuestions] =
    useState([]);

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [answers, setAnswers] =
    useState([]);

  // =========================================================
  // API / UI STATE
  // =========================================================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // =========================================================
  // INTERVIEW TIMER
  // =========================================================

  const [seconds, setSeconds] =
    useState(0);

  // =========================================================
  // CAMERA
  // =========================================================

  const videoRef =
    useRef(null);

  const mediaStreamRef =
    useRef(null);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [microphoneReady, setMicrophoneReady] =
    useState(false);
const [cameraSupported, setCameraSupported] =
  useState(true);

const [recordingSupported, setRecordingSupported] =
  useState(true);
  const [mediaError, setMediaError] =
    useState("");

  // =========================================================
  // VIDEO RECORDING
  // =========================================================

  const mediaRecorderRef =
    useRef(null);

  const recordedChunksRef =
    useRef([]);

  const recordingUrlRef =
    useRef(null);

  const recordingBlobRef =
    useRef(null);

  const [recording, setRecording] =
    useState(false);

  const [recordingStatus, setRecordingStatus] =
    useState("Ready");

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const [recordingUploaded, setRecordingUploaded] =
    useState(false);

  // =========================================================
  // SPEECH RECOGNITION
  // =========================================================

  const recognitionRef =
    useRef(null);

  const [speechSupported, setSpeechSupported] =
    useState(false);

  const [speechListening, setSpeechListening] =
    useState(false);

  const [speechError, setSpeechError] =
    useState("");

  const [liveTranscript, setLiveTranscript] =
    useState("");

  // =========================================================
  // COMMUNICATION ANALYSIS
  // =========================================================

  const [liveCommunication, setLiveCommunication] =
    useState({
      wordCount: 0,
      fillerCount: 0,
      pace: 0,
      grammarScore: 0,
      pronunciationScore: 0,
      communicationScore: 0,
    });

  const [communicationAnalysis, setCommunicationAnalysis] =
    useState(null);

  // =========================================================
  // CNN EMOTION DETECTION
  // =========================================================

  const [emotion, setEmotion] =
    useState("Analyzing...");

  const [emotionConfidence, setEmotionConfidence] =
    useState(0);

  const [emotionHistory, setEmotionHistory] =
    useState([]);

  // =========================================================
  // FACE DETECTION
  // =========================================================

  const [facePresent, setFacePresent] =
    useState(false);

  // =========================================================
  // EYE TRACKING
  // =========================================================

  const [eyeDirection, setEyeDirection] =
    useState("Analyzing...");

  const [eyeContactPercentage, setEyeContactPercentage] =
    useState(0);

  const [eyeContactSeconds, setEyeContactSeconds] =
    useState(0);

  // =========================================================
  // HEAD TRACKING
  // =========================================================

  const [headDirection, setHeadDirection] =
    useState("Analyzing...");

  // =========================================================
  // ATTENTION
  // =========================================================

  const [attentionScore, setAttentionScore] =
    useState(0);

  const [attentionLevel, setAttentionLevel] =
    useState("Analyzing...");

  // =========================================================
  // ENGAGEMENT
  // =========================================================

  const [engagementScore, setEngagementScore] =
    useState(0);

  const [engagementLevel, setEngagementLevel] =
    useState("Analyzing...");

  // =========================================================
  // CONFIDENCE
  // =========================================================

  const [confidenceScore, setConfidenceScore] =
    useState(0);

  const [confidenceLevel, setConfidenceLevel] =
    useState("Analyzing...");

  // =========================================================
  // FINAL RESULT
  // =========================================================

  const [result, setResult] =
    useState(null);

  // =========================================================
  // SESSION
  // =========================================================

  const [sessionUuid, setSessionUuid] =
    useState("");

  // =========================================================
  // TIMER REFS
  // =========================================================

  const interviewTimerRef =
    useRef(null);

  const recordingTimerRef =
    useRef(null);

  const eyeContactTimerRef =
    useRef(null);

  const analysisTimerRef =
    useRef(null);

  // =========================================================
  // AI ANALYSIS REF
  // =========================================================

  const latestVisionAnalysisRef =
    useRef({
      emotion: "Analyzing...",
      emotion_confidence: 0,
      face_present: false,
      eye_direction: "Analyzing...",
      eye_contact: false,
      head_direction: "Analyzing...",
    });

  // =========================================================
  // INITIAL USER LOAD
  // =========================================================

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem("user");

      if (storedUser) {
        const parsedUser =
          JSON.parse(storedUser);

        setUser({
          name:
            parsedUser.name ||
            parsedUser.fullname ||
            "Candidate",

          email:
            parsedUser.email ||
            "",
        });
      }
    } catch (err) {
      console.log(
        "User information could not be loaded."
      );
    }
  }, []);

  // =========================================================
  // SPEECH SUPPORT
  // =========================================================

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    setSpeechSupported(
      Boolean(SpeechRecognition)
    );
  }, []);

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      clearInterval(
        interviewTimerRef.current
      );

      clearInterval(
        recordingTimerRef.current
      );

      clearInterval(
        eyeContactTimerRef.current
      );

      clearInterval(
        analysisTimerRef.current
      );

      if (
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log(
            "Speech cleanup completed."
          );
        }
      }

      if (
        mediaStreamRef.current
      ) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }

      if (
        recordingUrlRef.current
      ) {
        URL.revokeObjectURL(
          recordingUrlRef.current
        );
      }
    };
  }, []);

  // =========================================================
  // PART 1 COMPLETE
  // =========================================================
    // =========================================================
  // AUTH TOKEN
  // =========================================================

  const getAuthToken = () => {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      ""
    );
  };

  // =========================================================
  // TIME FORMAT
  // =========================================================

  const formatTime = (totalSeconds) => {
    const safeSeconds = Math.max(
      0,
      Number(totalSeconds) || 0
    );

    const minutes = Math.floor(
      safeSeconds / 60
    );

    const remainingSeconds =
      safeSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  };

  // =========================================================
  // QUESTION PROGRESS
  // =========================================================

  const getQuestionProgress = () => {
    if (!questions.length) {
      return 0;
    }

    return Math.round(
      ((currentQuestion + 1) /
        questions.length) *
        100
    );
  };

  // =========================================================
  // ANSWER COUNT
  // =========================================================

  const getAnsweredQuestionCount = () => {
    return answers.filter(
      (answer) =>
        typeof answer === "string" &&
        answer.trim().length > 0
    ).length;
  };

  // =========================================================
  // MEDIA STATUS
  // =========================================================

  const getMediaStatusMessage = () => {
    if (mediaError) {
      return mediaError;
    }

    if (
      cameraReady &&
      microphoneReady
    ) {
      return "Camera and microphone are ready.";
    }

    if (
      cameraReady &&
      !microphoneReady
    ) {
      return "Camera is ready. Please enable your microphone.";
    }

    if (
      !cameraReady &&
      microphoneReady
    ) {
      return "Microphone is ready. Please enable your camera.";
    }

    return "Allow camera and microphone access to continue.";
  };

  // =========================================================
  // REQUEST CAMERA + MICROPHONE
  // =========================================================

  const requestMediaPermissions = async () => {
    setMediaError("");

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMediaError(
        "Camera and microphone are not supported by this browser."
      );

      return null;
    }

    try {
      // Stop any previous stream first.
      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: "user",
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            },

            audio: true,
          }
        );

      mediaStreamRef.current =
        stream;

      setCameraReady(
        stream.getVideoTracks().some(
          (track) =>
            track.readyState ===
            "live"
        )
      );

      setMicrophoneReady(
        stream.getAudioTracks().some(
          (track) =>
            track.readyState ===
            "live"
        )
      );

      // Attach stream to video immediately.
      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        videoRef.current.muted =
          true;

        videoRef.current.playsInline =
          true;

        try {
          await videoRef.current.play();
        } catch (playError) {
          console.log(
            "Video autoplay waiting for browser permission."
          );
        }
      }

      return stream;
    } catch (err) {
      console.error(
        "Media permission error:",
        err
      );

      setCameraReady(false);
      setMicrophoneReady(false);

      if (
        err.name ===
        "NotAllowedError"
      ) {
        setMediaError(
          "Camera or microphone permission was denied. Please allow access in your browser and try again."
        );
      } else if (
        err.name ===
        "NotFoundError"
      ) {
        setMediaError(
          "No camera or microphone was found on this device."
        );
      } else if (
        err.name ===
        "NotReadableError"
      ) {
        setMediaError(
          "Your camera or microphone is already being used by another application."
        );
      } else if (
        err.name ===
        "SecurityError"
      ) {
        setMediaError(
          "The browser blocked camera or microphone access for security reasons."
        );
      } else {
        setMediaError(
          "Unable to access your camera or microphone. Please check your browser permissions."
        );
      }

      return null;
    }
  };

  // =========================================================
  // STOP MEDIA STREAM
  // =========================================================

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      mediaStreamRef.current =
        null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    setCameraReady(false);
    setMicrophoneReady(false);
  };

  // =========================================================
  // CLEANUP RECORDING
  // =========================================================

  const cleanupRecording = () => {
    if (
      recordingUrlRef.current
    ) {
      URL.revokeObjectURL(
        recordingUrlRef.current
      );

      recordingUrlRef.current =
        null;
    }

    recordingBlobRef.current =
      null;

    recordedChunksRef.current =
      [];

    mediaRecorderRef.current =
      null;

    setRecording(false);

    setRecordingStatus(
      "Ready"
    );

    setRecordingSeconds(0);
  };

  // =========================================================
  // GET BEST RECORDING FORMAT
  // =========================================================

  const getRecordingMimeType = () => {
    const supportedTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    for (
      const type of supportedTypes
    ) {
      if (
        window.MediaRecorder &&
        MediaRecorder.isTypeSupported(
          type
        )
      ) {
        return type;
      }
    }

    return "";
  };

  // =========================================================
  // START VIDEO RECORDING
  // =========================================================

  const startRecording = (
    stream = mediaStreamRef.current
  ) => {
    if (!stream) {
      setRecordingStatus(
        "Camera unavailable"
      );

      return false;
    }

    if (
      !window.MediaRecorder
    ) {
      setRecordingStatus(
        "Recording unavailable"
      );

      return false;
    }

    try {
      const mimeType =
        getRecordingMimeType();

      const recorder =
        mimeType
          ? new MediaRecorder(
              stream,
              {
                mimeType,
              }
            )
          : new MediaRecorder(
              stream
            );

      recordedChunksRef.current =
        [];

      mediaRecorderRef.current =
        recorder;

      recorder.ondataavailable = (
        event
      ) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          recordedChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstart = () => {
        setRecording(true);

        setRecordingStatus(
          "Recording"
        );

        setRecordingSeconds(0);
      };

      recorder.onstop = () => {
        const chunks =
          recordedChunksRef.current;

        if (!chunks.length) {
          setRecording(false);

          setRecordingStatus(
            "No recording data"
          );

          return;
        }

        const blob =
          new Blob(
            chunks,
            {
              type:
                mimeType ||
                "video/webm",
            }
          );

        recordingBlobRef.current =
          blob;

        if (
          recordingUrlRef.current
        ) {
          URL.revokeObjectURL(
            recordingUrlRef.current
          );
        }

        recordingUrlRef.current =
          URL.createObjectURL(
            blob
          );

        setRecording(false);

        setRecordingStatus(
          "Recording secured"
        );
      };

      recorder.onerror = (
        event
      ) => {
        console.error(
          "MediaRecorder error:",
          event
        );

        setRecording(false);

        setRecordingStatus(
          "Recording error"
        );
      };

      recorder.start(1000);

      return true;
    } catch (err) {
      console.error(
        "Recording could not start:",
        err
      );

      setRecording(false);

      setRecordingStatus(
        "Recording unavailable"
      );

      return false;
    }
  };

  // =========================================================
  // STOP VIDEO RECORDING
  // =========================================================

  const stopRecording = () => {
    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      try {
        recorder.stop();
      } catch (err) {
        console.log(
          "Recording already stopped."
        );
      }
    }
  };

  // =========================================================
  // RECORDING TIMER
  // =========================================================

  useEffect(() => {
    if (
      stage === "running" &&
      recording
    ) {
      clearInterval(
        recordingTimerRef.current
      );

      recordingTimerRef.current =
        setInterval(() => {
          setRecordingSeconds(
            (previous) =>
              previous + 1
          );
        }, 1000);
    } else {
      clearInterval(
        recordingTimerRef.current
      );
    }

    return () => {
      clearInterval(
        recordingTimerRef.current
      );
    };
  }, [
    stage,
    recording,
  ]);

  // =========================================================
  // INTERVIEW TIMER
  // =========================================================

  useEffect(() => {
    if (stage === "running") {
      clearInterval(
        interviewTimerRef.current
      );

      interviewTimerRef.current =
        setInterval(() => {
          setSeconds(
            (previous) =>
              previous + 1
          );
        }, 1000);
    } else {
      clearInterval(
        interviewTimerRef.current
      );
    }

    return () => {
      clearInterval(
        interviewTimerRef.current
      );
    };
  }, [stage]);

  // =========================================================
  // VIDEO ELEMENT STREAM RECOVERY
  // =========================================================

  useEffect(() => {
    if (
      videoRef.current &&
      mediaStreamRef.current
    ) {
      if (
        videoRef.current.srcObject !==
        mediaStreamRef.current
      ) {
        videoRef.current.srcObject =
          mediaStreamRef.current;
      }
    }
  }, [
    cameraReady,
    stage,
  ]);

  // =========================================================
  // PART 2 COMPLETE
  // =========================================================
    // =========================================================
  // SPEECH RECOGNITION SETUP
  // =========================================================

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechError(
        "Speech recognition is not supported in this browser."
      );
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log(
          "Previous speech recognition stopped."
        );
      }
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setSpeechListening(true);
      setSpeechError("");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const transcript =
          event.results[i][0].transcript;

        if (
          event.results[i].isFinal
        ) {
          finalText +=
            transcript + " ";
        } else {
          interimText += transcript;
        }
      }

      const combinedText =
        `${finalText}${interimText}`.trim();

      if (combinedText) {
        setLiveTranscript(
          combinedText
        );

        analyzeCommunication(
          combinedText
        );
      }
    };

    recognition.onerror = (
      event
    ) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      if (
        event.error ===
        "not-allowed"
      ) {
        setSpeechError(
          "Microphone permission is required for speech recognition."
        );
      } else if (
        event.error ===
        "no-speech"
      ) {
        setSpeechError(
          "No speech detected. You can continue answering."
        );
      } else {
        setSpeechError(
          "Speech recognition temporarily unavailable."
        );
      }

      setSpeechListening(false);
    };

    recognition.onend = () => {
      setSpeechListening(false);

      /*
       * Restart automatically while the
       * interview is still running.
       */
      if (
        stage === "running" &&
        mediaStreamRef.current
      ) {
        setTimeout(() => {
          if (
            stage === "running"
          ) {
            try {
              recognition.start();
            } catch (err) {
              console.log(
                "Speech recognition restart skipped."
              );
            }
          }
        }, 500);
      }
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch (err) {
      console.log(
        "Speech recognition could not start:",
        err
      );
    }
  };

  // =========================================================
  // STOP SPEECH RECOGNITION
  // =========================================================

  const stopSpeechRecognition = () => {
    if (
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log(
          "Speech recognition already stopped."
        );
      }

      recognitionRef.current =
        null;
    }

    setSpeechListening(false);
  };

  // =========================================================
  // COUNT WORDS
  // =========================================================

  const countWords = (text) => {
    if (!text || !text.trim()) {
      return 0;
    }

    return text
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;
  };

  // =========================================================
  // COUNT FILLER WORDS
  // =========================================================

  const countFillerWords = (text) => {
    if (!text || !text.trim()) {
      return 0;
    }

    const normalized =
      text.toLowerCase();

    let count = 0;

    FILLER_WORDS.forEach(
      (filler) => {
        const escaped =
          filler.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const pattern =
          new RegExp(
            `\\b${escaped}\\b`,
            "gi"
          );

        const matches =
          normalized.match(
            pattern
          );

        if (matches) {
          count += matches.length;
        }
      }
    );

    return count;
  };

  // =========================================================
  // COMMUNICATION PACE
  // =========================================================

  const calculateWordsPerMinute = (
    wordCount,
    elapsedSeconds
  ) => {
    if (
      !elapsedSeconds ||
      elapsedSeconds <= 0
    ) {
      return 0;
    }

    return Math.round(
      (wordCount /
        elapsedSeconds) *
        60
    );
  };

  // =========================================================
  // SIMPLE GRAMMAR ESTIMATE
  // =========================================================

  const calculateGrammarScore = (
    text
  ) => {
    if (!text || !text.trim()) {
      return 0;
    }

    const words =
      text
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) {
      return 0;
    }

    let score = 100;

    // Penalize excessive repeated words.
    const repeatedPattern =
      /\b(\w+)\s+\1\b/gi;

    const repeatedMatches =
      text.match(
        repeatedPattern
      );

    if (repeatedMatches) {
      score -=
        repeatedMatches.length *
        5;
    }

    // Penalize excessive filler words.
    const fillerCount =
      countFillerWords(text);

    score -= Math.min(
      20,
      fillerCount * 2
    );

    // Penalize extremely short responses.
    if (words.length < 5) {
      score -= 10;
    }

    // Basic sentence structure check.
    const firstCharacter =
      text.trim().charAt(0);

    if (
      firstCharacter &&
      firstCharacter !==
        firstCharacter.toUpperCase()
    ) {
      score -= 3;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  };

  // =========================================================
  // PRONUNCIATION ESTIMATE
  // =========================================================

  const calculatePronunciationScore = (
    text
  ) => {
    if (!text || !text.trim()) {
      return 0;
    }

    const words =
      countWords(text);

    const fillers =
      countFillerWords(text);

    let score = 82;

    if (words >= 10) {
      score += 5;
    }

    if (words >= 25) {
      score += 4;
    }

    score -= Math.min(
      20,
      fillers * 2
    );

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  };

  // =========================================================
  // COMMUNICATION QUALITY
  // =========================================================

  const calculateCommunicationScore = (
    grammarScore,
    pronunciationScore,
    pace
  ) => {
    let paceScore = 80;

    if (pace === 0) {
      paceScore = 50;
    } else if (
      pace >= 110 &&
      pace <= 170
    ) {
      paceScore = 95;
    } else if (
      pace >= 90 &&
      pace <= 190
    ) {
      paceScore = 85;
    } else if (
      pace < 70 ||
      pace > 220
    ) {
      paceScore = 60;
    } else {
      paceScore = 75;
    }

    return Math.round(
      grammarScore * 0.4 +
        pronunciationScore * 0.3 +
        paceScore * 0.3
    );
  };

  // =========================================================
  // LIVE COMMUNICATION ANALYSIS
  // =========================================================

  const analyzeCommunication = (
    text
  ) => {
    if (!text || !text.trim()) {
      return;
    }

    const wordCount =
      countWords(text);

    const fillerCount =
      countFillerWords(text);

    const pace =
      calculateWordsPerMinute(
        wordCount,
        Math.max(
          seconds,
          1
        )
      );

    const grammarScore =
      calculateGrammarScore(
        text
      );

    const pronunciationScore =
      calculatePronunciationScore(
        text
      );

    const communicationScore =
      calculateCommunicationScore(
        grammarScore,
        pronunciationScore,
        pace
      );

    setLiveCommunication({
      wordCount,
      fillerCount,
      pace,
      grammarScore,
      pronunciationScore,
      communicationScore,
    });
  };

  // =========================================================
  // SAVE CURRENT ANSWER
  // =========================================================

  const saveCurrentAnswer = () => {
    const text =
      liveTranscript.trim();

    setAnswers(
      (previousAnswers) => {
        const updated = [
          ...previousAnswers,
        ];

        updated[currentQuestion] =
          text;

        return updated;
      }
    );

    return text;
  };

  // =========================================================
  // RESET CURRENT COMMUNICATION DATA
  // =========================================================

  const resetCommunicationData = () => {
    setLiveTranscript("");

    setLiveCommunication({
      wordCount: 0,
      fillerCount: 0,
      pace: 0,
      grammarScore: 0,
      pronunciationScore: 0,
      communicationScore: 0,
    });

    setSpeechError("");
  };

  // =========================================================
  // SPEECH STATE MONITOR
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running"
    ) {
      return;
    }

    if (
      liveTranscript.trim()
    ) {
      analyzeCommunication(
        liveTranscript
      );
    }
  }, [
    seconds,
    liveTranscript,
    stage,
  ]);

  // =========================================================
  // PART 3 COMPLETE
  // =========================================================
    // =========================================================
  // CNN EMOTION DETECTION
  // =========================================================

  const detectEmotionFromFrame = () => {
    /*
     * The browser-side vision layer prepares the webcam
     * observation. The actual CNN prediction can be supplied
     * by the Python/FastAPI backend when available.
     *
     * For the initial working version, we keep the three
     * project categories:
     *
     * Nervous / Scared / Confused
     */

    if (!cameraReady) {
      setFacePresent(false);
      setEmotion("Waiting...");
      setEmotionConfidence(0);

      return;
    }

    const stream =
      mediaStreamRef.current;

    if (!stream) {
      return;
    }

    const videoTracks =
      stream.getVideoTracks();

    if (!videoTracks.length) {
      setFacePresent(false);
      return;
    }

    /*
     * A live camera stream means that a valid frame source
     * exists. Backend CNN analysis can update these values
     * through the vision-analysis API.
     */

    setFacePresent(true);

    /*
     * Keep the current prediction if the backend has already
     * supplied one. Otherwise use a neutral starting state
     * for the three-class model.
     */

    if (
      !emotion ||
      emotion === "Analyzing..."
    ) {
      setEmotion("Nervous");
      setEmotionConfidence(60);
    }

    latestVisionAnalysisRef.current = {
      ...latestVisionAnalysisRef.current,

      emotion:
        emotion ||
        "Nervous",

      emotion_confidence:
        emotionConfidence,

      face_present: true,
    };
  };

  // =========================================================
  // CNN VISION ANALYSIS REQUEST
  // =========================================================

  const requestVisionAnalysis = async () => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    if (
      video.readyState <
      2
    ) {
      return;
    }

    /*
     * Capture a frame from the webcam.
     */

    const canvas =
      document.createElement(
        "canvas"
      );

    const width =
      video.videoWidth ||
      640;

    const height =
      video.videoHeight ||
      480;

    canvas.width =
      width;

    canvas.height =
      height;

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    /*
     * Convert the frame to JPEG.
     */

    const imageData =
      canvas.toDataURL(
        "image/jpeg",
        0.75
      );

    try {
      const response =
        await fetch(
          `${API_URL}/api/vision/analyze`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(getAuthToken()
                ? {
                    Authorization:
                      `Bearer ${getAuthToken()}`,
                  }
                : {}),
            },

            body: JSON.stringify({
              image: imageData,

              session_id:
                sessionUuid,

              timestamp:
                Date.now(),
            }),
          }
        );

      if (!response.ok) {
        /*
         * The vision endpoint may not exist yet.
         * The frontend therefore continues running
         * without breaking the interview.
         */

        detectEmotionFromFrame();

        return;
      }

      const data =
        await response.json();

      // =====================================================
      // FACE
      // =====================================================

      if (
        typeof data.face_present ===
        "boolean"
      ) {
        setFacePresent(
          data.face_present
        );
      }

      // =====================================================
      // EMOTION
      // =====================================================

      const predictedEmotion =
        data.emotion ||
        data.predicted_emotion ||
        data.emotion_label;

      if (
        predictedEmotion
      ) {
        const normalizedEmotion =
          String(
            predictedEmotion
          );

        const matchedEmotion =
          EMOTIONS.find(
            (item) =>
              item.toLowerCase() ===
              normalizedEmotion.toLowerCase()
          );

        setEmotion(
          matchedEmotion ||
            normalizedEmotion
        );

        setEmotionConfidence(
          Math.round(
            Number(
              data.emotion_confidence ??
              data.confidence ??
              0
            )
          )
        );

        setEmotionHistory(
          (previous) => [
            ...previous.slice(-49),

            {
              emotion:
                matchedEmotion ||
                normalizedEmotion,

              confidence:
                Math.round(
                  Number(
                    data.emotion_confidence ??
                    data.confidence ??
                    0
                  )
                ),

              timestamp:
                Date.now(),
            },
          ]
        );
      }

      // =====================================================
      // EYE DIRECTION
      // =====================================================

      if (
        data.eye_direction ||
        data.gaze_direction
      ) {
        setEyeDirection(
          data.eye_direction ||
            data.gaze_direction
        );
      }

      // =====================================================
      // EYE CONTACT
      // =====================================================

      if (
        typeof data.eye_contact ===
        "boolean"
      ) {
        if (
          data.eye_contact
        ) {
          setEyeContactSeconds(
            (previous) =>
              previous + 1
          );
        }
      }

      if (
        data.eye_contact_percentage !==
          undefined &&
        data.eye_contact_percentage !==
          null
      ) {
        setEyeContactPercentage(
          Math.max(
            0,
            Math.min(
              100,
              Math.round(
                Number(
                  data.eye_contact_percentage
                )
              )
            )
          )
        );
      }

      // =====================================================
      // HEAD DIRECTION
      // =====================================================

      if (
        data.head_direction
      ) {
        setHeadDirection(
          data.head_direction
        );
      }

      // =====================================================
      // SAVE LATEST VISION STATE
      // =====================================================

      latestVisionAnalysisRef.current =
        {
          emotion:
            predictedEmotion ||
            emotion,

          emotion_confidence:
            Number(
              data.emotion_confidence ??
              data.confidence ??
              emotionConfidence
            ),

          face_present:
            typeof data.face_present ===
            "boolean"
              ? data.face_present
              : facePresent,

          eye_direction:
            data.eye_direction ||
            data.gaze_direction ||
            eyeDirection,

          eye_contact:
            Boolean(
              data.eye_contact
            ),

          head_direction:
            data.head_direction ||
            headDirection,
        };
    } catch (err) {
      /*
       * The interview must continue even if the
       * Python CNN endpoint is temporarily unavailable.
       */

      console.log(
        "Vision analysis endpoint unavailable. Continuing interview."
      );

      detectEmotionFromFrame();
    }
  };

  // =========================================================
  // VISION ANALYSIS TIMER
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running" ||
      !cameraReady
    ) {
      clearInterval(
        analysisTimerRef.current
      );

      return;
    }

    /*
     * Analyze webcam frames periodically rather than
     * sending every frame to the backend.
     */

    requestVisionAnalysis();

    clearInterval(
      analysisTimerRef.current
    );

    analysisTimerRef.current =
      setInterval(() => {
        requestVisionAnalysis();
      }, 2000);

    return () => {
      clearInterval(
        analysisTimerRef.current
      );
    };
  }, [
    stage,
    cameraReady,
    sessionUuid,
  ]);

  // =========================================================
  // EYE CONTACT TIMER
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running"
    ) {
      clearInterval(
        eyeContactTimerRef.current
      );

      return;
    }

    clearInterval(
      eyeContactTimerRef.current
    );

    eyeContactTimerRef.current =
      setInterval(() => {
        const currentEyeDirection =
          latestVisionAnalysisRef
            .current
            .eye_direction;

        const lookingAtCamera =
          currentEyeDirection ===
            "Looking at camera" ||
          currentEyeDirection ===
            "Camera" ||
          currentEyeDirection ===
            "Center";

        if (
          lookingAtCamera
        ) {
          setEyeContactSeconds(
            (previous) =>
              previous + 1
          );
        }
      }, 1000);

    return () => {
      clearInterval(
        eyeContactTimerRef.current
      );
    };
  }, [stage]);

  // =========================================================
  // CALCULATE EYE CONTACT PERCENTAGE
  // =========================================================

  useEffect(() => {
    if (
      seconds <= 0
    ) {
      setEyeContactPercentage(0);
      return;
    }

    const percentage =
      Math.round(
        (eyeContactSeconds /
          seconds) *
          100
      );

    setEyeContactPercentage(
      Math.max(
        0,
        Math.min(
          100,
          percentage
        )
      )
    );
  }, [
    seconds,
    eyeContactSeconds,
  ]);

  // =========================================================
  // EYE CONTACT HELPER
  // =========================================================

  const isLookingAtCamera = () => {
    const direction =
      String(
        eyeDirection || ""
      ).toLowerCase();

    return (
      direction.includes(
        "camera"
      ) ||
      direction.includes(
        "center"
      ) ||
      direction === "forward"
    );
  };

  // =========================================================
  // VISION STATUS
  // =========================================================

  const getVisionStatus = () => {
    if (!cameraReady) {
      return "Camera unavailable";
    }

    if (!facePresent) {
      return "Searching for face...";
    }

    return "CNN + eye tracking active";
  };

  // =========================================================
  // PART 4 COMPLETE
  // =========================================================
    // =========================================================
  // HEAD DIRECTION ANALYSIS
  // =========================================================

  const calculateHeadDirection = (
    direction
  ) => {
    if (!direction) {
      return "Analyzing...";
    }

    const value =
      String(direction)
        .toLowerCase()
        .trim();

    if (
      value.includes("left")
    ) {
      return "Looking left";
    }

    if (
      value.includes("right")
    ) {
      return "Looking right";
    }

    if (
      value.includes("down")
    ) {
      return "Looking down";
    }

    if (
      value.includes("up")
    ) {
      return "Looking up";
    }

    if (
      value.includes("center") ||
      value.includes("camera") ||
      value.includes("forward")
    ) {
      return "Facing camera";
    }

    return direction;
  };

  // =========================================================
  // ATTENTION SCORE
  // =========================================================

  const calculateAttentionScore = () => {
    const vision =
      latestVisionAnalysisRef.current;

    let score = 0;

    // Face presence = 30 points
    if (
      vision.face_present
    ) {
      score += 30;
    }

    // Eye contact = 40 points
    if (
      vision.eye_contact
    ) {
      score += 40;
    } else if (
      isLookingAtCamera()
    ) {
      score += 30;
    } else if (
      eyeDirection &&
      !eyeDirection
        .toLowerCase()
        .includes("down") &&
      !eyeDirection
        .toLowerCase()
        .includes("left") &&
      !eyeDirection
        .toLowerCase()
        .includes("right")
    ) {
      score += 15;
    }

    // Head position = 30 points
    const head =
      String(
        vision.head_direction ||
        headDirection ||
        ""
      ).toLowerCase();

    if (
      head.includes("camera") ||
      head.includes("center") ||
      head.includes("forward") ||
      head.includes("straight")
    ) {
      score += 30;
    } else if (
      head.includes("left") ||
      head.includes("right")
    ) {
      score += 15;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  };

  // =========================================================
  // ATTENTION LEVEL
  // =========================================================

  const getAttentionLevel = (
    score
  ) => {
    if (score >= 75) {
      return "High";
    }

    if (score >= 50) {
      return "Medium";
    }

    return "Low";
  };

  // =========================================================
  // ATTENTION DESCRIPTION
  // =========================================================

  const getAttentionDescription = () => {
    const score =
      attentionScore;

    if (score >= 75) {
      return "You maintained strong visual attention during the interview.";
    }

    if (score >= 50) {
      return "Your attention was generally consistent with some changes in gaze or head position.";
    }

    return "Try to maintain a more consistent gaze and keep your face visible to the camera.";
  };

  // =========================================================
  // UPDATE ATTENTION
  // =========================================================

  const updateAttentionAnalysis = () => {
    const score =
      calculateAttentionScore();

    const level =
      getAttentionLevel(
        score
      );

    setAttentionScore(
      score
    );

    setAttentionLevel(
      level
    );

    setHeadDirection(
      calculateHeadDirection(
        latestVisionAnalysisRef
          .current
          .head_direction
      )
    );
  };

  // =========================================================
  // ATTENTION MONITOR
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running"
    ) {
      return;
    }

    updateAttentionAnalysis();

    const interval =
      setInterval(() => {
        updateAttentionAnalysis();
      }, 1000);

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    stage,
    eyeDirection,
    facePresent,
    headDirection,
    eyeContactPercentage,
  ]);

  // =========================================================
  // ENGAGEMENT SCORE
  // =========================================================

  const calculateEngagementScore = () => {
    /*
     * Engagement combines:
     *
     * Emotion activity       = 20%
     * Eye contact            = 30%
     * Attention              = 25%
     * Communication          = 25%
     */

    const emotionScore =
      emotionConfidence > 0
        ? emotionConfidence
        : 50;

    const communicationScore =
      liveCommunication
        .communicationScore ||
      0;

    const eyeScore =
      eyeContactPercentage ||
      0;

    const attention =
      attentionScore ||
      0;

    const score =
      emotionScore * 0.2 +
      eyeScore * 0.3 +
      attention * 0.25 +
      communicationScore * 0.25;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  };

  // =========================================================
  // ENGAGEMENT LEVEL
  // =========================================================

  const getEngagementLevel = (
    score
  ) => {
    if (score >= 80) {
      return "High";
    }

    if (score >= 60) {
      return "Medium";
    }

    return "Low";
  };

  // =========================================================
  // ENGAGEMENT DESCRIPTION
  // =========================================================

  const getEngagementDescription = () => {
    if (
      engagementScore >= 80
    ) {
      return "Your responses and visual behavior indicate strong engagement.";
    }

    if (
      engagementScore >= 60
    ) {
      return "Your engagement was generally good with a few areas that can be improved.";
    }

    return "Try to maintain eye contact, stay attentive and provide complete responses.";
  };

  // =========================================================
  // UPDATE ENGAGEMENT
  // =========================================================

  const updateEngagementAnalysis =
    () => {
      const score =
        calculateEngagementScore();

      const level =
        getEngagementLevel(
          score
        );

      setEngagementScore(
        score
      );

      setEngagementLevel(
        level
      );
    };

  // =========================================================
  // ENGAGEMENT MONITOR
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running"
    ) {
      return;
    }

    updateEngagementAnalysis();

    const interval =
      setInterval(() => {
        updateEngagementAnalysis();
      }, 1500);

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    stage,
    attentionScore,
    eyeContactPercentage,
    emotionConfidence,
    liveCommunication.communicationScore,
  ]);

  // =========================================================
  // CONFIDENCE SCORE
  // =========================================================

  const calculateConfidenceScore = () => {
    const communication =
      liveCommunication
        .communicationScore ||
      0;

    const eyeContact =
      eyeContactPercentage ||
      0;

    const attention =
      attentionScore ||
      0;

    const emotionConfidenceValue =
      emotionConfidence ||
      0;

    /*
     * Confidence-related indicators:
     *
     * Eye Contact          = 30%
     * Stable Attention     = 25%
     * Communication        = 25%
     * Facial Analysis      = 20%
     */

    const score =
      eyeContact * 0.3 +
      attention * 0.25 +
      communication * 0.25 +
      emotionConfidenceValue *
        0.2;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  };

  // =========================================================
  // CONFIDENCE LEVEL
  // =========================================================

  const getConfidenceLevel = (
    score
  ) => {
    if (score >= 80) {
      return "High";
    }

    if (score >= 60) {
      return "Moderate";
    }

    return "Needs Practice";
  };

  // =========================================================
  // CONFIDENCE DESCRIPTION
  // =========================================================

  const getConfidenceDescription = () => {
    if (
      confidenceScore >= 80
    ) {
      return "Your observable interview indicators suggest strong confidence.";
    }

    if (
      confidenceScore >= 60
    ) {
      return "Your confidence-related indicators are moderate.";
    }

    return "Practice maintaining eye contact, speaking clearly and keeping a stable head position.";
  };

  // =========================================================
  // UPDATE CONFIDENCE
  // =========================================================

  const updateConfidenceAnalysis =
    () => {
      const score =
        calculateConfidenceScore();

      const level =
        getConfidenceLevel(
          score
        );

      setConfidenceScore(
        score
      );

      setConfidenceLevel(
        level
      );
    };

  // =========================================================
  // CONFIDENCE MONITOR
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running"
    ) {
      return;
    }

    updateConfidenceAnalysis();

    const interval =
      setInterval(() => {
        updateConfidenceAnalysis();
      }, 1500);

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    stage,
    eyeContactPercentage,
    attentionScore,
    liveCommunication.communicationScore,
    emotionConfidence,
  ]);

  // =========================================================
  // COMBINED BEHAVIOR ANALYSIS
  // =========================================================

  const getBehaviorAnalysis = () => {
    return {
      emotion:
        emotion,

      emotion_confidence:
        emotionConfidence,

      face_present:
        facePresent,

      eye_direction:
        eyeDirection,

      eye_contact_percentage:
        eyeContactPercentage,

      eye_contact_seconds:
        eyeContactSeconds,

      head_direction:
        headDirection,

      attention_score:
        attentionScore,

      attention_level:
        attentionLevel,

      engagement_score:
        engagementScore,

      engagement_level:
        engagementLevel,

      confidence_score:
        confidenceScore,

      confidence_level:
        confidenceLevel,

      communication_score:
        liveCommunication.communicationScore,

      word_count:
        liveCommunication.wordCount,

      filler_count:
        liveCommunication.fillerCount,

      speech_pace:
        liveCommunication.pace,
    };
  };

  // =========================================================
  // PART 5 COMPLETE
  // =========================================================
    // =========================================================
  // GENERATE INTERVIEW QUESTIONS
  // =========================================================

  const generateInterviewQuestions =
    async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response =
          await fetch(
            `${API_URL}/api/interview/generate`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                ...(getAuthToken()
                  ? {
                      Authorization:
                        `Bearer ${getAuthToken()}`,
                    }
                  : {}),
              },

              body: JSON.stringify({
                role,

                interview_type:
                  interviewType,

                difficulty,

                number_of_questions:
                  numberOfQuestions,
              }),
            }
          );

        if (!response.ok) {
          let message =
            `Unable to generate interview questions. Server returned ${response.status}.`;

          try {
            const errorData =
              await response.json();

            message =
              errorData.detail ||
              errorData.message ||
              errorData.error ||
              message;
          } catch (jsonError) {
            console.log(
              "Server did not return JSON error details."
            );
          }

          throw new Error(
            message
          );
        }

        const data =
          await response.json();

        let generatedQuestions = [];

        if (
          Array.isArray(
            data.questions
          )
        ) {
          generatedQuestions =
            data.questions;
        } else if (
          Array.isArray(
            data.data
          )
        ) {
          generatedQuestions =
            data.data;
        } else if (
          Array.isArray(
            data.interview_questions
          )
        ) {
          generatedQuestions =
            data.interview_questions;
        }

        generatedQuestions =
          generatedQuestions
            .map(
              (question) => {
                if (
                  typeof question ===
                  "string"
                ) {
                  return question;
                }

                return (
                  question.question ||
                  question.text ||
                  question.content ||
                  ""
                );
              }
            )
            .filter(Boolean);

        if (
          generatedQuestions.length ===
          0
        ) {
          throw new Error(
            "The AI did not return any interview questions."
          );
        }

        setQuestions(
          generatedQuestions
        );

        setAnswers(
          new Array(
            generatedQuestions.length
          ).fill("")
        );

        setCurrentQuestion(0);

        setSeconds(0);

        setRecordingSeconds(0);

        setEyeContactSeconds(0);

        setEyeContactPercentage(0);

        setAttentionScore(0);

        setAttentionLevel(
          "Analyzing..."
        );

        setEngagementScore(0);

        setEngagementLevel(
          "Analyzing..."
        );

        setConfidenceScore(0);

        setConfidenceLevel(
          "Analyzing..."
        );

        setEmotion(
          "Analyzing..."
        );

        setEmotionConfidence(0);

        setEyeDirection(
          "Analyzing..."
        );

        setHeadDirection(
          "Analyzing..."
        );

        resetCommunicationData();

        const generatedSession =
          data.session_id ||
          data.session_uuid ||
          data.uuid ||
          `session-${Date.now()}`;

        setSessionUuid(
          String(
            generatedSession
          )
        );

        setSuccess(
          "Interview questions generated successfully."
        );

        return generatedQuestions;
      } catch (err) {
        console.error(
          "Question generation error:",
          err
        );

        setError(
          err.message ||
            "Unable to generate interview questions."
        );

        return [];
      } finally {
        setLoading(false);
      }
    };

  // =========================================================
  // START INTERVIEW
  // =========================================================

  const startInterview =
    async () => {
      setError("");
      setSuccess("");

      /*
       * First generate questions.
       */

      const generatedQuestions =
        await generateInterviewQuestions();

      if (
        !generatedQuestions.length
      ) {
        return;
      }

      /*
       * Request camera and microphone.
       */

      const stream =
        await requestMediaPermissions();

      if (!stream) {
        setError(
          "Camera and microphone access is required to start the interactive interview."
        );

        return;
      }

      /*
       * Move into live interview mode.
       */

      setStage("running");

      setSeconds(0);

      setRecordingSeconds(0);

      setCurrentQuestion(0);

      setSuccess(
        ""
      );

      /*
       * Start video recording.
       */

      setTimeout(() => {
        startRecording(
          stream
        );
      }, 300);

      /*
       * Start speech recognition.
       */

      setTimeout(() => {
        startSpeechRecognition();
      }, 500);
    };

  // =========================================================
  // PAUSE INTERVIEW
  // =========================================================

  const pauseInterview = () => {
    if (
      stage !== "running"
    ) {
      return;
    }

    setStage("paused");

    if (
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log(
          "Speech recognition already stopped."
        );
      }
    }

    setSpeechListening(false);

    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state ===
        "recording"
    ) {
      try {
        recorder.pause();

        setRecording(false);

        setRecordingStatus(
          "Paused"
        );
      } catch (err) {
        console.log(
          "Recording pause unavailable."
        );
      }
    }
  };

  // =========================================================
  // RESUME INTERVIEW
  // =========================================================

  const resumeInterview = () => {
    if (
      stage !== "paused"
    ) {
      return;
    }

    setStage("running");

    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state ===
        "paused"
    ) {
      try {
        recorder.resume();

        setRecording(true);

        setRecordingStatus(
          "Recording"
        );
      } catch (err) {
        console.log(
          "Recording resume unavailable."
        );
      }
    }

    setTimeout(() => {
      startSpeechRecognition();
    }, 300);
  };

  // =========================================================
  // ANSWER CHANGE
  // =========================================================

  const handleAnswerChange = (
    value
  ) => {
    setAnswers(
      (previousAnswers) => {
        const updated = [
          ...previousAnswers,
        ];

        updated[currentQuestion] =
          value;

        return updated;
      }
    );

    setLiveTranscript(
      value
    );

    analyzeCommunication(
      value
    );
  };

  // =========================================================
  // LOAD ANSWER FOR CURRENT QUESTION
  // =========================================================

  const loadQuestionAnswer = (
    questionIndex
  ) => {
    const savedAnswer =
      answers[questionIndex] ||
      "";

    setLiveTranscript(
      savedAnswer
    );

    analyzeCommunication(
      savedAnswer
    );
  };

  // =========================================================
  // NEXT QUESTION
  // =========================================================

  const nextQuestion = () => {
    /*
     * Save the current spoken answer.
     */

    const currentText =
      liveTranscript.trim();

    setAnswers(
      (previousAnswers) => {
        const updated = [
          ...previousAnswers,
        ];

        updated[currentQuestion] =
          currentText;

        return updated;
      }
    );

    if (
      currentQuestion <
      questions.length - 1
    ) {
      const nextIndex =
        currentQuestion + 1;

      setCurrentQuestion(
        nextIndex
      );

      const nextAnswer =
        answers[nextIndex] ||
        "";

      setLiveTranscript(
        nextAnswer
      );

      analyzeCommunication(
        nextAnswer
      );

      setSpeechError("");

      return;
    }

    /*
     * If this is the last question,
     * finish the interview.
     */

    finishInterview();
  };

  // =========================================================
  // PREVIOUS QUESTION
  // =========================================================

  const previousQuestion = () => {
    if (
      currentQuestion <= 0
    ) {
      return;
    }

    /*
     * Save current answer first.
     */

    const currentText =
      liveTranscript.trim();

    setAnswers(
      (previousAnswers) => {
        const updated = [
          ...previousAnswers,
        ];

        updated[currentQuestion] =
          currentText;

        return updated;
      }
    );

    const previousIndex =
      currentQuestion - 1;

    setCurrentQuestion(
      previousIndex
    );

    const previousAnswer =
      answers[previousIndex] ||
      "";

    setLiveTranscript(
      previousAnswer
    );

    analyzeCommunication(
      previousAnswer
    );

    setSpeechError("");
  };

  // =========================================================
  // CURRENT QUESTION ANSWER
  // =========================================================

  const getCurrentAnswer = () => {
    return (
      liveTranscript ||
      answers[currentQuestion] ||
      ""
    );
  };

  // =========================================================
  // INTERVIEW STAGE CHECK
  // =========================================================

  const isInterviewActive = () => {
    return (
      stage === "running" ||
      stage === "paused"
    );
  };

  // =========================================================
  // PART 6 COMPLETE
  // =========================================================
    // =========================================================
  // ASSESS INTERVIEW WITH BACKEND AI
  // =========================================================

  const assessInterview = async (
    finalAnswers
  ) => {
    try {
      const response =
        await fetch(
          `${API_URL}/api/interview/assess`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(getAuthToken()
                ? {
                    Authorization:
                      `Bearer ${getAuthToken()}`,
                  }
                : {}),
            },

            body: JSON.stringify({
              role,

              interview_type:
                interviewType,

              difficulty,

              questions,

              answers:
                finalAnswers,

              behavior_analysis:
                getBehaviorAnalysis(),

              communication_analysis:
                liveCommunication,

              duration_seconds:
                seconds,

              eye_contact_percentage:
                eyeContactPercentage,

              attention_score:
                attentionScore,

              engagement_score:
                engagementScore,

              confidence_score:
                confidenceScore,

              emotion:
                emotion,

              session_id:
                sessionUuid,
            }),
          }
        );

      if (!response.ok) {
        let message =
          `Interview assessment failed with status ${response.status}.`;

        try {
          const errorData =
            await response.json();

          message =
            errorData.detail ||
            errorData.message ||
            errorData.error ||
            message;
        } catch (jsonError) {
          console.log(
            "Assessment error response was not JSON."
          );
        }

        throw new Error(
          message
        );
      }

      const data =
        await response.json();

      return data;
    } catch (err) {
      console.error(
        "Assessment error:",
        err
      );

      /*
       * If the backend assessment endpoint is
       * unavailable, create a frontend result
       * so the candidate still gets a useful
       * performance report.
       */

      return {
        score:
          calculateOverallScore(),

        overall_score:
          calculateOverallScore(),

        communication_score:
          liveCommunication.communicationScore,

        eye_contact_percentage:
          eyeContactPercentage,

        attention_score:
          attentionScore,

        engagement_score:
          engagementScore,

        confidence_score:
          confidenceScore,

        emotion:
          emotion,

        performance:
          getPerformanceSummary(),

        summary:
          getPerformanceSummary(),

        strengths:
          getAutomaticStrengths(),

        improvements:
          getAutomaticImprovements(),

        backend_unavailable:
          true,
      };
    }
  };

  // =========================================================
  // OVERALL SCORE
  // =========================================================

  const calculateOverallScore = () => {
    const communication =
      Number(
        liveCommunication.communicationScore
      ) || 0;

    const eyeContact =
      Number(
        eyeContactPercentage
      ) || 0;

    const attention =
      Number(
        attentionScore
      ) || 0;

    const engagement =
      Number(
        engagementScore
      ) || 0;

    const confidence =
      Number(
        confidenceScore
      ) || 0;

    /*
     * Combined interview score.
     */

    const score =
      communication * 0.25 +
      eyeContact * 0.20 +
      attention * 0.20 +
      engagement * 0.20 +
      confidence * 0.15;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );
  };

  // =========================================================
  // PERFORMANCE SUMMARY
  // =========================================================

  const getPerformanceSummary = () => {
    const score =
      calculateOverallScore();

    if (score >= 85) {
      return "Excellent interview performance. You demonstrated strong communication, attention, engagement and confidence-related indicators.";
    }

    if (score >= 70) {
      return "Good interview performance. You demonstrated several positive interview behaviors with a few areas that can be improved further.";
    }

    if (score >= 55) {
      return "Moderate interview performance. Your interview showed some positive indicators, but additional practice can improve communication, attention and confidence.";
    }

    return "Your interview is complete. Continue practicing interview questions, communication, eye contact and confident responses.";
  };

  // =========================================================
  // AUTOMATIC STRENGTHS
  // =========================================================

  const getAutomaticStrengths = () => {
    const strengths = [];

    if (
      liveCommunication.communicationScore >=
      70
    ) {
      strengths.push(
        "Clear and effective communication."
      );
    }

    if (
      eyeContactPercentage >=
      70
    ) {
      strengths.push(
        "Good eye-contact consistency."
      );
    }

    if (
      attentionScore >=
      70
    ) {
      strengths.push(
        "Strong visual attention during the interview."
      );
    }

    if (
      engagementScore >=
      70
    ) {
      strengths.push(
        "Good overall engagement with the interview."
      );
    }

    if (
      confidenceScore >=
      70
    ) {
      strengths.push(
        "Positive confidence-related behavioral indicators."
      );
    }

    if (
      liveCommunication.wordCount >=
      20
    ) {
      strengths.push(
        "Provided sufficiently detailed responses."
      );
    }

    if (!strengths.length) {
      strengths.push(
        "Successfully completed the interview session."
      );
    }

    return strengths;
  };

  // =========================================================
  // AUTOMATIC IMPROVEMENTS
  // =========================================================

  const getAutomaticImprovements = () => {
    const improvements = [];

    if (
      eyeContactPercentage <
      70
    ) {
      improvements.push(
        "Try to maintain more consistent eye contact with the camera."
      );
    }

    if (
      attentionScore <
      70
    ) {
      improvements.push(
        "Keep your face visible and maintain a stable head position."
      );
    }

    if (
      liveCommunication.communicationScore <
      70
    ) {
      improvements.push(
        "Practice answering questions clearly and with well-structured responses."
      );
    }

    if (
      liveCommunication.fillerCount >
      3
    ) {
      improvements.push(
        "Reduce filler words such as um, uh and like."
      );
    }

    if (
      liveCommunication.pace > 0 &&
      (
        liveCommunication.pace <
        90 ||
        liveCommunication.pace >
        190
      )
    ) {
      improvements.push(
        "Practice maintaining a comfortable speaking pace."
      );
    }

    if (
      confidenceScore <
      70
    ) {
      improvements.push(
        "Practice stable head position, eye contact and confident delivery."
      );
    }

    if (!improvements.length) {
      improvements.push(
        "Continue practicing to maintain your current performance level."
      );
    }

    return improvements;
  };

  // =========================================================
  // SAVE INTERVIEW HISTORY
  // =========================================================

  const saveInterviewHistory = async (
    assessmentResult
  ) => {
    const token =
      getAuthToken();

    if (!token) {
      console.log(
        "No authentication token found. Interview history will not be uploaded."
      );

      return false;
    }

    try {
      const assessment =
        assessmentResult ||
        {};

      const payload = {
        role,

        interview_type:
          interviewType,

        difficulty,

        score:
          Number(
            assessment.score ??
            assessment.overall_score ??
            calculateOverallScore()
          ),

        performance:
          assessment.performance ||
          getPerformanceSummary(),

        total_questions:
          questions.length,

        answered_questions:
          getAnsweredQuestionCount(),

        strengths:
          Array.isArray(
            assessment.strengths
          )
            ? assessment.strengths
            : getAutomaticStrengths(),

        improvements:
          Array.isArray(
            assessment.improvements
          )
            ? assessment.improvements
            : getAutomaticImprovements(),

        summary:
          assessment.summary ||
          getPerformanceSummary(),

        duration_seconds:
          seconds,

        eye_contact_percentage:
          eyeContactPercentage,

        attention_score:
          attentionScore,

        engagement_score:
          engagementScore,

        confidence_score:
          confidenceScore,

        emotion:
          emotion,

        communication_score:
          liveCommunication.communicationScore,

        session_id:
          sessionUuid,
      };

      const response =
        await fetch(
          `${API_URL}/api/interview/history`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      if (!response.ok) {
        console.log(
          "Interview history endpoint returned:",
          response.status
        );

        return false;
      }

      setRecordingUploaded(
        true
      );

      return true;
    } catch (err) {
      console.error(
        "Interview history error:",
        err
      );

      return false;
    }
  };

  // =========================================================
  // FINISH INTERVIEW
  // =========================================================

  const finishInterview = async () => {
    if (
      stage === "result"
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    /*
     * Save the current answer before stopping
     * speech recognition and recording.
     */

    const finalAnswers = [
      ...answers,
    ];

    finalAnswers[
      currentQuestion
    ] =
      liveTranscript.trim();

    /*
     * Stop speech recognition.
     */

    stopSpeechRecognition();

    /*
     * Stop video recording.
     */

    stopRecording();

    /*
     * Stop analysis timers.
     */

    clearInterval(
      interviewTimerRef.current
    );

    clearInterval(
      recordingTimerRef.current
    );

    clearInterval(
      eyeContactTimerRef.current
    );

    clearInterval(
      analysisTimerRef.current
    );

    /*
     * Wait briefly for MediaRecorder to
     * create the final video blob.
     */

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          300
        )
    );

    try {
      /*
       * Ask backend AI to assess the interview.
       */

      const assessment =
        await assessInterview(
          finalAnswers
        );

      /*
       * Save result locally.
       */

      setResult(
        assessment
      );

      setAnswers(
        finalAnswers
      );

      /*
       * Save interview history.
       */

      await saveInterviewHistory(
        assessment
      );

      /*
       * Move to final result screen.
       */

      setStage(
        "result"
      );

      setSuccess(
        "Interview completed successfully."
      );
    } catch (err) {
      console.error(
        "Interview completion error:",
        err
      );

      const fallbackResult = {
        score:
          calculateOverallScore(),

        overall_score:
          calculateOverallScore(),

        communication_score:
          liveCommunication.communicationScore,

        eye_contact_percentage:
          eyeContactPercentage,

        attention_score:
          attentionScore,

        engagement_score:
          engagementScore,

        confidence_score:
          confidenceScore,

        emotion:
          emotion,

        summary:
          getPerformanceSummary(),

        performance:
          getPerformanceSummary(),

        strengths:
          getAutomaticStrengths(),

        improvements:
          getAutomaticImprovements(),
      };

      setResult(
        fallbackResult
      );

      setAnswers(
        finalAnswers
      );

      setStage(
        "result"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // RESET INTERVIEW
  // =========================================================

  const resetInterview = () => {
    /*
     * Stop everything from the previous session.
     */

    stopSpeechRecognition();

    stopRecording();

    stopMediaStream();

    clearInterval(
      interviewTimerRef.current
    );

    clearInterval(
      recordingTimerRef.current
    );

    clearInterval(
      eyeContactTimerRef.current
    );

    clearInterval(
      analysisTimerRef.current
    );

    /*
     * Reset interview state.
     */

    setStage(
      "setup"
    );

    setQuestions([]);

    setCurrentQuestion(0);

    setAnswers([]);

    setSeconds(0);

    setRecordingSeconds(0);

    setEyeContactSeconds(0);

    setEyeContactPercentage(0);

    setEmotion(
      "Analyzing..."
    );

    setEmotionConfidence(0);

    setEmotionHistory([]);

    setFacePresent(false);

    setEyeDirection(
      "Analyzing..."
    );

    setHeadDirection(
      "Analyzing..."
    );

    setAttentionScore(0);

    setAttentionLevel(
      "Analyzing..."
    );

    setEngagementScore(0);

    setEngagementLevel(
      "Analyzing..."
    );

    setConfidenceScore(0);

    setConfidenceLevel(
      "Analyzing..."
    );

    setResult(null);

    setError("");

    setSuccess("");

    setSessionUuid("");

    setRecordingUploaded(
      false
    );

    resetCommunicationData();

    latestVisionAnalysisRef.current =
      {
        emotion:
          "Analyzing...",

        emotion_confidence:
          0,

        face_present:
          false,

        eye_direction:
          "Analyzing...",

        eye_contact:
          false,

        head_direction:
          "Analyzing...",
      };
  };

  // =========================================================
  // PART 7 COMPLETE
  // =========================================================
    // =========================================================
  // INTERVIEW LIFECYCLE CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      clearInterval(
        interviewTimerRef.current
      );

      clearInterval(
        recordingTimerRef.current
      );

      clearInterval(
        eyeContactTimerRef.current
      );

      clearInterval(
        analysisTimerRef.current
      );

      if (
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log(
            "Speech recognition cleanup completed."
          );
        }
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.log(
            "Recorder cleanup completed."
          );
        }
      }

      if (
        mediaStreamRef.current
      ) {
        mediaStreamRef.current
          .getTracks()
          .forEach(
            (track) => track.stop()
          );
      }

      if (
        recordingUrlRef.current
      ) {
        URL.revokeObjectURL(
          recordingUrlRef.current
        );
      }
    };
  }, []);

  // =========================================================
  // BROWSER SUPPORT CHECK
  // =========================================================

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    setSpeechSupported(
      Boolean(
        SpeechRecognition
      )
    );

    setCameraSupported(
      Boolean(
        navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia
      )
    );

    setRecordingSupported(
      Boolean(
        window.MediaRecorder
      )
    );
  }, []);

  // =========================================================
  // CAMERA TRACK MONITOR
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running" &&
      stage !== "paused"
    ) {
      return;
    }

    const stream =
      mediaStreamRef.current;

    if (!stream) {
      return;
    }

    const checkTracks = () => {
      const videoTracks =
        stream.getVideoTracks();

      const audioTracks =
        stream.getAudioTracks();

      const videoLive =
        videoTracks.some(
          (track) =>
            track.readyState ===
            "live"
        );

      const audioLive =
        audioTracks.some(
          (track) =>
            track.readyState ===
            "live"
        );

      setCameraReady(
        videoLive
      );

      setMicrophoneReady(
        audioLive
      );

      if (!videoLive) {
        setMediaError(
          "Camera connection was interrupted."
        );
      } else if (!audioLive) {
        setMediaError(
          "Microphone connection was interrupted."
        );
      } else {
        setMediaError("");
      }
    };

    checkTracks();

    const interval =
      setInterval(
        checkTracks,
        2000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [stage]);

  // =========================================================
  // KEEP VIDEO ELEMENT CONNECTED
  // =========================================================

  useEffect(() => {
    const video =
      videoRef.current;

    const stream =
      mediaStreamRef.current;

    if (
      !video ||
      !stream
    ) {
      return;
    }

    if (
      video.srcObject !==
      stream
    ) {
      video.srcObject =
        stream;
    }

    video.muted = true;
    video.playsInline = true;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.log(
          "Video playback waiting for browser interaction."
        );
      }
    };

    playVideo();
  }, [
    cameraReady,
    stage,
  ]);

  // =========================================================
  // BEFORE UNLOAD PROTECTION
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running" &&
      stage !== "paused"
    ) {
      return;
    }

    const handleBeforeUnload = (
      event
    ) => {
      event.preventDefault();

      event.returnValue =
        "Your interview is currently in progress. Are you sure you want to leave?";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [stage]);

  // =========================================================
  // KEYBOARD SHORTCUTS
  // =========================================================

  useEffect(() => {
    const handleKeyboard =
      (event) => {
        if (
          stage !== "running" &&
          stage !== "paused"
        ) {
          return;
        }

        /*
         * Ctrl + Enter:
         * Move to next question.
         */

        if (
          event.ctrlKey &&
          event.key === "Enter"
        ) {
          event.preventDefault();

          if (
            stage === "running"
          ) {
            nextQuestion();
          }

          return;
        }

        /*
         * Escape:
         * Pause interview.
         */

        if (
          event.key === "Escape"
        ) {
          event.preventDefault();

          if (
            stage === "running"
          ) {
            pauseInterview();
          } else if (
            stage === "paused"
          ) {
            resumeInterview();
          }
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, [
    stage,
    currentQuestion,
    liveTranscript,
    answers,
  ]);

  // =========================================================
  // UPDATE BEHAVIOR SNAPSHOT
  // =========================================================

  useEffect(() => {
    if (
      stage !== "running"
    ) {
      return;
    }

    const snapshot =
      getBehaviorAnalysis();

    behaviorHistoryRef.current.push(
      {
        ...snapshot,
        timestamp:
          Date.now(),
      }
    );

    /*
     * Keep the browser memory small.
     */

    if (
      behaviorHistoryRef.current
        .length > 300
    ) {
      behaviorHistoryRef.current =
        behaviorHistoryRef.current.slice(
          -300
        );
    }
  }, [
    stage,
    emotion,
    emotionConfidence,
    facePresent,
    eyeDirection,
    headDirection,
    attentionScore,
    engagementScore,
    confidenceScore,
  ]);

  // =========================================================
  // UPDATE FINAL SCORES BEFORE RESULT
  // =========================================================

  useEffect(() => {
    if (
      stage !== "result"
    ) {
      return;
    }

    const finalAttention =
      calculateAttentionScore();

    const finalEngagement =
      calculateEngagementScore();

    const finalConfidence =
      calculateConfidenceScore();

    setAttentionScore(
      finalAttention
    );

    setAttentionLevel(
      getAttentionLevel(
        finalAttention
      )
    );

    setEngagementScore(
      finalEngagement
    );

    setEngagementLevel(
      getEngagementLevel(
        finalEngagement
      )
    );

    setConfidenceScore(
      finalConfidence
    );

    setConfidenceLevel(
      getConfidenceLevel(
        finalConfidence
      )
    );
  }, [stage]);

  // =========================================================
  // RESULT SCORE HELPERS
  // =========================================================

  const getResultScore = () => {
    if (!result) {
      return calculateOverallScore();
    }

    return Math.round(
      Number(
        result.score ??
        result.overall_score ??
        result.final_score ??
        calculateOverallScore()
      )
    );
  };

  const getResultCommunicationScore =
    () => {
      if (!result) {
        return (
          liveCommunication.communicationScore ||
          0
        );
      }

      return Math.round(
        Number(
          result.communication_score ??
          liveCommunication.communicationScore ??
          0
        )
      );
    };

  const getResultEyeContact = () => {
    if (!result) {
      return eyeContactPercentage;
    }

    return Math.round(
      Number(
        result.eye_contact_percentage ??
        eyeContactPercentage ??
        0
      )
    );
  };

  const getResultAttention = () => {
    if (!result) {
      return attentionScore;
    }

    return Math.round(
      Number(
        result.attention_score ??
        attentionScore ??
        0
      )
    );
  };

  const getResultEngagement = () => {
    if (!result) {
      return engagementScore;
    }

    return Math.round(
      Number(
        result.engagement_score ??
        engagementScore ??
        0
      )
    );
  };

  const getResultConfidence = () => {
    if (!result) {
      return confidenceScore;
    }

    return Math.round(
      Number(
        result.confidence_score ??
        confidenceScore ??
        0
      )
    );
  };

  // =========================================================
  // RESULT STRENGTHS
  // =========================================================

  const getResultStrengths = () => {
    if (
      result &&
      Array.isArray(
        result.strengths
      ) &&
      result.strengths.length
    ) {
      return result.strengths;
    }

    return getAutomaticStrengths();
  };

  // =========================================================
  // RESULT IMPROVEMENTS
  // =========================================================

  const getResultImprovements =
    () => {
      if (
        result &&
        Array.isArray(
          result.improvements
        ) &&
        result.improvements.length
      ) {
        return result.improvements;
      }

      return getAutomaticImprovements();
    };

  // =========================================================
  // RESULT SUMMARY
  // =========================================================

  const getResultSummary = () => {
    if (!result) {
      return getPerformanceSummary();
    }

    return (
      result.summary ||
      result.performance ||
      getPerformanceSummary()
    );
  };

  // =========================================================
  // DOWNLOAD INTERVIEW REPORT
  // =========================================================

  const downloadInterviewReport =
    () => {
      const report = {
        application:
          "SmartHire AI",

        interview: {
          role,
          interview_type:
            interviewType,
          difficulty,
          duration_seconds:
            seconds,
          total_questions:
            questions.length,
          answered_questions:
            getAnsweredQuestionCount(),
        },

        performance: {
          overall_score:
            getResultScore(),

          communication_score:
            getResultCommunicationScore(),

          eye_contact_percentage:
            getResultEyeContact(),

          attention_score:
            getResultAttention(),

          engagement_score:
            getResultEngagement(),

          confidence_score:
            getResultConfidence(),

          emotion:
            emotion,
        },

        analysis: {
          strengths:
            getResultStrengths(),

          improvements:
            getResultImprovements(),

          summary:
            getResultSummary(),
        },

        generated_at:
          new Date().toISOString(),
      };

      const blob =
        new Blob(
          [
            JSON.stringify(
              report,
              null,
              2
            ),
          ],
          {
            type:
              "application/json",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        url;

      anchor.download =
        `SmartHire-AI-Interview-Report-${Date.now()}.json`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      document.body.removeChild(
        anchor
      );

      URL.revokeObjectURL(
        url
      );
    };

  // =========================================================
  // RECORDING DOWNLOAD
  // =========================================================

  const downloadRecording = () => {
    if (
      !recordingUrlRef.current
    ) {
      return;
    }

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      recordingUrlRef.current;

    anchor.download =
      `SmartHire-AI-Interview-${Date.now()}.webm`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    document.body.removeChild(
      anchor
    );
  };

  // =========================================================
  // MEDIA PERMISSION RETRY
  // =========================================================

  const retryMediaAccess = async () => {
    setMediaError("");

    const stream =
      await requestMediaPermissions();

    if (stream) {
      setSuccess(
        "Camera and microphone are connected."
      );
    }
  };

  // =========================================================
  // PART 8 COMPLETE
  // =========================================================
    // =========================================================
  // PART 9 — INTERVIEW USER INTERFACE
  // =========================================================

  const renderSetupScreen = () => {
    return (
      <div className="interview-page">
        <div className="interview-container">

          <div className="interview-header">
            <div>
              <h1>SmartHire AI</h1>
              <p>AI Powered Mock Interview</p>
            </div>

            <div className="interview-badge">
              <span>●</span>
              Interview Practice
            </div>
          </div>

          <div className="setup-card">

            <div className="setup-title">
              <h2>Prepare for Your Interview</h2>
              <p>
                Configure your interview and let SmartHire AI
                evaluate your interview performance.
              </p>
            </div>

            <div className="setup-grid">

              <div className="input-group">
                <label>Interview Type</label>

                <select
                  value={interviewType}
                  onChange={(event) =>
                    setInterviewType(
                      event.target.value
                    )
                  }
                >
                  <option value="Technical">
                    Technical
                  </option>

                  <option value="HR">
                    HR
                  </option>

                  <option value="Behavioral">
                    Behavioral
                  </option>

                  <option value="Mixed">
                    Mixed
                  </option>
                </select>
              </div>

              <div className="input-group">
                <label>Difficulty</label>

                <select
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(
                      event.target.value
                    )
                  }
                >
                  <option value="Beginner">
                    Beginner
                  </option>

                  <option value="Intermediate">
                    Intermediate
                  </option>

                  <option value="Advanced">
                    Advanced
                  </option>
                </select>
              </div>

              <div className="input-group">
                <label>Job Role</label>

                <input
                  type="text"
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value
                    )
                  }
                  placeholder="Software Developer"
                />
              </div>

              <div className="input-group">
                <label>Number of Questions</label>

                <select
                  value={numberOfQuestions}
                  onChange={(event) =>
                    setNumberOfQuestions(
                      Number(
                        event.target.value
                      )
                    )
                  }
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={7}>7 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>

            </div>

            <div className="technology-card">

              <div className="technology-icon">
                ✨
              </div>

              <div>
                <h3>AI Interview Analysis</h3>

                <p>
                  SmartHire AI analyzes your answers,
                  communication, facial behavior,
                  eye contact, attention and
                  confidence-related indicators.
                </p>
              </div>

            </div>

            <div className="permission-info">

              <div className="permission-item">
                <span>📷</span>

                <div>
                  <strong>Camera</strong>
                  <small>
                    Required for face and eye tracking
                  </small>
                </div>
              </div>

              <div className="permission-item">
                <span>🎙️</span>

                <div>
                  <strong>Microphone</strong>
                  <small>
                    Required for speech analysis
                  </small>
                </div>
              </div>

              <div className="permission-item">
                <span>🤖</span>

                <div>
                  <strong>AI Analysis</strong>
                  <small>
                    CNN-based visual analysis
                  </small>
                </div>
              </div>

            </div>

            {error && (
              <div className="interview-error">
                {error}
              </div>
            )}

            {success && (
              <div className="interview-success">
                {success}
              </div>
            )}

            <button
              className="primary-interview-button"
              onClick={
                startInterview
              }
              disabled={loading}
            >
              {loading
                ? "Preparing Interview..."
                : "Start AI Interview 🚀"}
            </button>

          </div>
        </div>
      </div>
    );
  };

  // =========================================================
  // LIVE INTERVIEW SCREEN
  // =========================================================

  const renderInterviewScreen = () => {
    const currentQuestionText =
      questions[currentQuestion] ||
      "Loading question...";

    const progress =
      questions.length > 0
        ? Math.round(
            ((currentQuestion + 1) /
              questions.length) *
              100
          )
        : 0;

    return (
      <div className="interview-page">
        <div className="live-interview-container">

          <div className="live-header">

            <div>
              <h1>SmartHire AI Interview</h1>

              <p>
                {role} • {interviewType}
              </p>
            </div>

            <div className="live-status">

              <span
                className={
                  isRecording
                    ? "status-dot recording"
                    : "status-dot"
                }
              />

              {isRecording
                ? "Recording"
                : "Live"}
            </div>

          </div>

          <div className="progress-section">

            <div className="progress-text">
              <span>
                Question {currentQuestion + 1} of{" "}
                {questions.length}
              </span>

              <span>
                {progress}%
              </span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

          </div>

          <div className="live-grid">

            <div className="camera-panel">

              <div className="camera-header">
                <span>Live Camera</span>

                <span
                  className={
                    facePresent
                      ? "camera-active"
                      : "camera-searching"
                  }
                >
                  {facePresent
                    ? "Face detected"
                    : "Searching..."}
                </span>
              </div>

              <div className="camera-wrapper">

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="interview-video"
                />

                {!cameraReady && (
                  <div className="camera-overlay">
                    <div className="camera-overlay-icon">
                      📷
                    </div>

                    <p>
                      Waiting for camera...
                    </p>
                  </div>
                )}

                {cameraReady &&
                  !facePresent && (
                    <div className="camera-warning">
                      Keep your face visible
                      to the camera.
                    </div>
                  )}

                {isRecording && (
                  <div className="recording-indicator">
                    <span />
                    REC{" "}
                    {formatTime(
                      recordingSeconds
                    )}
                  </div>
                )}

              </div>

              <div className="camera-controls">

                <div className="device-status">
                  <span>
                    📷{" "}
                    {cameraReady
                      ? "Camera Ready"
                      : "Camera Off"}
                  </span>

                  <span>
                    🎙️{" "}
                    {microphoneReady
                      ? "Microphone Ready"
                      : "Microphone Off"}
                  </span>
                </div>

                {!cameraReady && (
                  <button
                    className="secondary-button"
                    onClick={
                      retryMediaAccess
                    }
                  >
                    Enable Camera
                  </button>
                )}

              </div>

            </div>

            <div className="question-panel">

              <div className="question-number">
                QUESTION{" "}
                {currentQuestion + 1}
              </div>

              <h2>
                {currentQuestionText}
              </h2>

              <div className="answer-section">

                <div className="answer-header">

                  <span>Your Answer</span>

                  <span>
                    {speechListening
                      ? "🎙️ Listening..."
                      : "Click microphone to speak"}
                  </span>

                </div>

                <textarea
                  value={
                    getCurrentAnswer()
                  }
                  onChange={(event) =>
                    handleAnswerChange(
                      event.target.value
                    )
                  }
                  placeholder="Speak your answer or type it here..."
                  className="answer-textarea"
                />

                <div className="speech-controls">

                  <button
                    className={
                      speechListening
                        ? "speech-button active"
                        : "speech-button"
                    }
                    onClick={() => {
                      if (
                        speechListening
                      ) {
                        stopSpeechRecognition();
                      } else {
                        startSpeechRecognition();
                      }
                    }}
                  >
                    {speechListening
                      ? "⏹ Stop Listening"
                      : "🎙️ Start Speaking"}
                  </button>

                  <div className="word-count">
                    {liveCommunication.wordCount ||
                      0}{" "}
                    words
                  </div>

                </div>

                {speechError && (
                  <div className="speech-error">
                    {speechError}
                  </div>
                )}

              </div>

              <div className="question-navigation">

                <button
                  className="secondary-button"
                  onClick={
                    previousQuestion
                  }
                  disabled={
                    currentQuestion ===
                    0
                  }
                >
                  ← Previous
                </button>

                <button
                  className="primary-button"
                  onClick={
                    nextQuestion
                  }
                >
                  {currentQuestion ===
                  questions.length - 1
                    ? "Finish Interview"
                    : "Next Question →"}
                </button>

              </div>

              <div className="pause-area">

                {stage === "running" ? (
                  <button
                    className="pause-button"
                    onClick={
                      pauseInterview
                    }
                  >
                    ⏸ Pause Interview
                  </button>
                ) : (
                  <button
                    className="resume-button"
                    onClick={
                      resumeInterview
                    }
                  >
                    ▶ Resume Interview
                  </button>
                )}

              </div>

            </div>

          </div>

          <div className="analysis-panel">

            <div className="analysis-title">
              <h3>
                🤖 Live AI Analysis
              </h3>

              <span>
                {getVisionStatus()}
              </span>
            </div>

            <div className="analysis-grid">

              <div className="analysis-card">

                <div className="analysis-card-icon">
                  😊
                </div>

                <div>
                  <small>Emotion</small>

                  <strong>
                    {emotion}
                  </strong>

                  <span>
                    {emotionConfidence > 0
                      ? `${emotionConfidence}% confidence`
                      : "Analyzing..."}
                  </span>
                </div>

              </div>

              <div className="analysis-card">

                <div className="analysis-card-icon">
                  👁️
                </div>

                <div>
                  <small>Eye Direction</small>

                  <strong>
                    {eyeDirection}
                  </strong>

                  <span>
                    Eye Contact{" "}
                    {eyeContactPercentage}%
                  </span>
                </div>

              </div>

              <div className="analysis-card">

                <div className="analysis-card-icon">
                  🎯
                </div>

                <div>
                  <small>Attention</small>

                  <strong>
                    {attentionLevel}
                  </strong>

                  <span>
                    {attentionScore}/100
                  </span>
                </div>

              </div>

              <div className="analysis-card">

                <div className="analysis-card-icon">
                  💬
                </div>

                <div>
                  <small>Communication</small>

                  <strong>
                    {
                      liveCommunication.communicationScore
                    }
                    /100
                  </strong>

                  <span>
                    {liveCommunication.pace ||
                      0}{" "}
                    WPM
                  </span>
                </div>

              </div>

            </div>

          </div>

          <div className="interview-footer">

            <span>
              ⏱ Interview Time:{" "}
              {formatTime(seconds)}
            </span>

            <span>
              Question {currentQuestion + 1}/
              {questions.length}
            </span>

            <span>
              SmartHire AI • Secure Interview
            </span>

          </div>

        </div>
      </div>
    );
  };

  // =========================================================
  // RESULT SCREEN
  // =========================================================

  const renderResultScreen = () => {
    const finalScore =
      getResultScore();

    const communication =
      getResultCommunicationScore();

    const eyeContact =
      getResultEyeContact();

    const attention =
      getResultAttention();

    const engagement =
      getResultEngagement();

    const confidence =
      getResultConfidence();

    return (
      <div className="interview-page">
        <div className="result-container">

          <div className="result-header">

            <div>
              <span className="result-label">
                INTERVIEW COMPLETE
              </span>

              <h1>
                Your AI Interview Report
              </h1>

              <p>
                SmartHire AI analyzed your
                interview performance.
              </p>
            </div>

            <div className="result-actions">

              <button
                className="secondary-button"
                onClick={
                  downloadInterviewReport
                }
              >
                📄 Download Report
              </button>

              {recordingUrlRef.current && (
                <button
                  className="secondary-button"
                  onClick={
                    downloadRecording
                  }
                >
                  🎥 Download Recording
                </button>
              )}

            </div>

          </div>

          <div className="score-overview">

            <div className="overall-score-card">

              <div className="score-circle">
                <span>
                  {finalScore}
                </span>

                <small>
                  /100
                </small>
              </div>

              <h2>
                Overall Score
              </h2>

              <p>
                {finalScore >= 85
                  ? "Excellent"
                  : finalScore >= 70
                  ? "Good"
                  : finalScore >= 55
                  ? "Moderate"
                  : "Needs Practice"}
              </p>

            </div>

            <div className="score-details">

              <div className="score-item">
                <span>
                  Communication
                </span>

                <strong>
                  {communication}%
                </strong>

                <div className="mini-progress">
                  <div
                    style={{
                      width: `${communication}%`,
                    }}
                  />
                </div>
              </div>

              <div className="score-item">
                <span>
                  Eye Contact
                </span>

                <strong>
                  {eyeContact}%
                </strong>

                <div className="mini-progress">
                  <div
                    style={{
                      width: `${eyeContact}%`,
                    }}
                  />
                </div>
              </div>

              <div className="score-item">
                <span>
                  Attention
                </span>

                <strong>
                  {attention}%
                </strong>

                <div className="mini-progress">
                  <div
                    style={{
                      width: `${attention}%`,
                    }}
                  />
                </div>
              </div>

              <div className="score-item">
                <span>
                  Engagement
                </span>

                <strong>
                  {engagement}%
                </strong>

                <div className="mini-progress">
                  <div
                    style={{
                      width: `${engagement}%`,
                    }}
                  />
                </div>
              </div>

              <div className="score-item">
                <span>
                  Confidence
                </span>

                <strong>
                  {confidence}%
                </strong>

                <div className="mini-progress">
                  <div
                    style={{
                      width: `${confidence}%`,
                    }}
                  />
                </div>
              </div>

            </div>

          </div>

          <div className="result-grid">

            <div className="result-card">

              <div className="result-card-header">
                <h3>
                  💪 Strengths
                </h3>
              </div>

              <div className="result-list">

                {getResultStrengths().map(
                  (strength, index) => (
                    <div
                      className="result-list-item"
                      key={index}
                    >
                      <span>✓</span>

                      <p>
                        {strength}
                      </p>
                    </div>
                  )
                )}

              </div>

            </div>

            <div className="result-card">

              <div className="result-card-header">
                <h3>
                  🎯 Areas to Improve
                </h3>
              </div>

              <div className="result-list">

                {getResultImprovements().map(
                  (improvement, index) => (
                    <div
                      className="result-list-item"
                      key={index}
                    >
                      <span>→</span>

                      <p>
                        {improvement}
                      </p>
                    </div>
                  )
                )}

              </div>

            </div>

          </div>

          <div className="behavior-report">

            <h2>
              🧠 Interview Behavior Analysis
            </h2>

            <p className="behavior-summary">
              {getResultSummary()}
            </p>

            <div className="behavior-grid">

              <div className="behavior-item">
                <span>
                  Detected Emotion
                </span>

                <strong>
                  {emotion}
                </strong>
              </div>

              <div className="behavior-item">
                <span>
                  Eye Contact
                </span>

                <strong>
                  {eyeContact}%
                </strong>
              </div>

              <div className="behavior-item">
                <span>
                  Attention
                </span>

                <strong>
                  {attentionLevel}
                </strong>
              </div>

              <div className="behavior-item">
                <span>
                  Engagement
                </span>

                <strong>
                  {engagementLevel}
                </strong>
              </div>

              <div className="behavior-item">
                <span>
                  Confidence
                </span>

                <strong>
                  {confidenceLevel}
                </strong>
              </div>

              <div className="behavior-item">
                <span>
                  Head Direction
                </span>

                <strong>
                  {headDirection}
                </strong>
              </div>

            </div>

          </div>

          <div className="result-summary">

            <div className="summary-icon">
              ✨
            </div>

            <div>
              <h3>
                SmartHire AI Feedback
              </h3>

              <p>
                {getResultSummary()}
              </p>
            </div>

          </div>

          <div className="result-bottom-actions">

            <button
              className="primary-interview-button"
              onClick={
                resetInterview
              }
            >
              🔄 Start New Interview
            </button>

          </div>

        </div>
      </div>
    );
  };

  // =========================================================
  // MAIN INTERVIEW RENDER
  // =========================================================

  return (
    <>
      {stage === "setup" &&
        renderSetupScreen()}

      {stage === "running" &&
        renderInterviewScreen()}

      {stage === "paused" &&
        renderInterviewScreen()}

      {stage === "result" &&
        renderResultScreen()}
    </>
  );

  // =========================================================
  // PART 9 COMPLETE
  // =========================================================
  }

// =========================================================
// EXPORT COMPONENT
// =========================================================
export default Interview;