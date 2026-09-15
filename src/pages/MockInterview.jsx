import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MockInterview.css";
import EmotionEyeTracking from "../components/EmotionEyeTracking";

const API_URL = "http://127.0.0.1:8000";
const QUESTION_TIME = 60;

function MockInterview() {
  const navigate = useNavigate();

  // =========================================================
  // USER / INTERVIEW
  // =========================================================

  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [interviewInfo, setInterviewInfo] = useState(null);

  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);

  const [sessionStatus, setSessionStatus] = useState("READY");
  const sessionStatusRef = useRef("READY");

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const currentQuestionRef = useRef(0);

  const [timeRemaining, setTimeRemaining] =
    useState(QUESTION_TIME);

  const [questionsCompleted, setQuestionsCompleted] =
    useState(0);
const [visualAnalysis, setVisualAnalysis] = useState({
  facePresence: 0,
  eyeContact: 0,
  attention: 0,
  engagement: 0,
  confidence: 0,
  expression: "Neutral",
  behaviorScore: 0,
});

  // =========================================================
  // MEDIA
  // =========================================================

  const [mediaStream, setMediaStream] = useState(null);
  const mediaStreamRef = useRef(null);

  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const videoRef = useRef(null);

  // =========================================================
  // RECORDING
  // =========================================================

  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const recordingTimerRef = useRef(null);
  const sessionStartTimeRef = useRef(null);

  // =========================================================
  // ANSWERS
  // =========================================================

  const [answers, setAnswers] = useState([]);
  const answersRef = useRef([]);

  const [answerText, setAnswerText] = useState("");
  const answerTextRef = useRef("");

  const questionStartedAtRef = useRef(Date.now());

  // =========================================================
  // SPEECH RECOGNITION
  // =========================================================

  const [speechSupported, setSpeechSupported] =
    useState(false);

  const [speechListening, setSpeechListening] =
    useState(false);

  const speechRecognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const speechRestartTimerRef = useRef(null);

  const transcriptFinalRef = useRef("");
  const transcriptInterimRef = useRef("");

  // =========================================================
  // VISUAL ATTENTION
  // =========================================================

  const faceStatsRef = useRef({
    checks: 0,
    detected: 0,
  });

  const faceDetectionBusyRef = useRef(false);

  // =========================================================
  // FLOW CONTROL
  // =========================================================

  const movingToNextRef = useRef(false);
  const finishStartedRef = useRef(false);

  // =========================================================
  // KEEP REFS IN SYNC
  // =========================================================

  useEffect(() => {
    sessionStatusRef.current = sessionStatus;
  }, [sessionStatus]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // =========================================================
  // LOAD INTERVIEW DATA
  // =========================================================

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }

    const savedQuestions = localStorage.getItem(
      "smarthire_generated_questions"
    );

    const savedInterviewInfo = localStorage.getItem(
      "smarthire_interview_info"
    );

    if (!savedQuestions) {
      navigate("/candidate/interview-generation");
      return;
    }

    try {
      const parsedQuestions = JSON.parse(savedQuestions);

      if (
        !Array.isArray(parsedQuestions) ||
        parsedQuestions.length === 0
      ) {
        navigate("/candidate/interview-generation");
        return;
      }

      setQuestions(parsedQuestions);
    } catch {
      navigate("/candidate/interview-generation");
      return;
    }

    if (savedInterviewInfo) {
      try {
        setInterviewInfo(
          JSON.parse(savedInterviewInfo)
        );
      } catch {
        setInterviewInfo(null);
      }
    }
  }, [navigate]);

  // =========================================================
  // DETECT SPEECH SUPPORT
  // =========================================================

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    setSpeechSupported(Boolean(SpeechRecognition));
  }, []);

  // =========================================================
  // ATTACH CAMERA
  // =========================================================

  useEffect(() => {
    if (!videoRef.current) return;

    if (mediaStream) {
      videoRef.current.srcObject = mediaStream;

      videoRef.current
        .play()
        .catch(() => {});
    } else {
      videoRef.current.srcObject = null;
    }
  }, [mediaStream]);

  // =========================================================
  // CAMERA + MICROPHONE
  // =========================================================

  const requestMediaPermissions = async () => {
    setMediaError("");

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setMediaError(
          "Camera and microphone are not supported by this browser."
        );

        return null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });

      mediaStreamRef.current = stream;

      setMediaStream(stream);
      setMediaReady(true);

      return stream;
    } catch (error) {
      console.error(
        "Camera / microphone error:",
        error
      );

      setMediaReady(false);

      if (error.name === "NotAllowedError") {
        setMediaError(
          "Camera and microphone permission was denied. Please allow access in your browser."
        );
      } else if (
        error.name === "NotFoundError"
      ) {
        setMediaError(
          "No camera or microphone was found on this device."
        );
      } else if (
        error.name === "NotReadableError"
      ) {
        setMediaError(
          "Your camera or microphone is already being used by another application."
        );
      } else {
        setMediaError(
          "Unable to access your camera and microphone."
        );
      }

      return null;
    }
  };

  // =========================================================
  // CREATE BACKEND SESSION
  // =========================================================

  const createBackendSession = async () => {
    try {
      const candidateId =
        user?.id ||
        user?.user_id ||
        user?.email ||
        "guest";

      const response = await fetch(
        `${API_URL}/api/interview/session/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate_id: String(candidateId),
            interview_id: null,
            interview_type:
              interviewInfo?.type ||
              interviewInfo?.interview_type ||
              "Technical",
            difficulty:
              interviewInfo?.difficulty ||
              "Medium",
            domain:
              interviewInfo?.domain ||
              "Full Stack Development",
            total_questions: questions.length,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to create interview session."
        );
      }

      const data = await response.json();

      if (!data.success || !data.session) {
        throw new Error(
          "Invalid session response."
        );
      }

      const newSessionId =
        data.session.session_id;

      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;

      setSessionStatus(
        data.session.session_status
      );

      localStorage.setItem(
        "smarthire_active_session",
        JSON.stringify(data.session)
      );

      return data.session;
    } catch (error) {
      console.error(
        "Create session error:",
        error
      );

      alert(
        "Unable to connect to SmartHire AI backend. Please make sure FastAPI is running."
      );

      return null;
    }
  };

  // =========================================================
  // START BACKEND SESSION
  // =========================================================

  const startBackendSession = async (id) => {
    try {
      const response = await fetch(
        `${API_URL}/api/interview/session/${id}/start`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to start session."
        );
      }

      const data = await response.json();

      if (data.success && data.session) {
        setSessionStatus(
          data.session.session_status
        );

        localStorage.setItem(
          "smarthire_active_session",
          JSON.stringify(data.session)
        );
      }

      return data;
    } catch (error) {
      console.error(
        "Start session error:",
        error
      );

      alert(
        "Unable to start the interview session."
      );

      return null;
    }
  };

  // =========================================================
  // START VIDEO RECORDING
  // =========================================================

  const startRecording = (stream) => {
    if (!stream) {
      setMediaError(
        "Camera and microphone are not ready."
      );

      return false;
    }

    try {
      videoChunksRef.current = [];

      let mimeType = "";

      if (
        MediaRecorder.isTypeSupported(
          "video/webm;codecs=vp9,opus"
        )
      ) {
        mimeType =
          "video/webm;codecs=vp9,opus";
      } else if (
        MediaRecorder.isTypeSupported(
          "video/webm;codecs=vp8,opus"
        )
      ) {
        mimeType =
          "video/webm;codecs=vp8,opus";
      } else if (
        MediaRecorder.isTypeSupported(
          "video/webm"
        )
      ) {
        mimeType = "video/webm";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
          })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          videoChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onerror = (event) => {
        console.error(
          "MediaRecorder error:",
          event
        );

        setMediaError(
          "A recording error occurred."
        );
      };

      recorder.start(1000);

      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) {
        clearInterval(
          recordingTimerRef.current
        );
      }

      recordingTimerRef.current =
        setInterval(() => {
          setRecordingSeconds(
            (previous) => previous + 1
          );
        }, 1000);

      return true;
    } catch (error) {
      console.error(
        "Recording start error:",
        error
      );

      setMediaError(
        "Unable to start video recording."
      );

      return false;
    }
  };

  // =========================================================
  // STOP VIDEO RECORDING
  // =========================================================

  const stopRecording = () => {
    return new Promise((resolve) => {
      const recorder =
        mediaRecorderRef.current;

      if (
        !recorder ||
        recorder.state === "inactive"
      ) {
        setIsRecording(false);

        if (recordingTimerRef.current) {
          clearInterval(
            recordingTimerRef.current
          );

          recordingTimerRef.current = null;
        }

        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const recordedBlob = new Blob(
          videoChunksRef.current,
          {
            type:
              recorder.mimeType ||
              "video/webm",
          }
        );

        setIsRecording(false);

        if (recordingTimerRef.current) {
          clearInterval(
            recordingTimerRef.current
          );

          recordingTimerRef.current = null;
        }

        resolve(recordedBlob);
      };

      try {
        recorder.stop();
      } catch (error) {
        console.error(
          "Stop recording error:",
          error
        );

        setIsRecording(false);

        resolve(null);
      }
    });
  };

  // =========================================================
  // UPLOAD VIDEO
  // =========================================================

  const uploadVideo = async (id, blob) => {
    if (!blob || blob.size === 0) {
      return false;
    }

    try {
      const formData = new FormData();

      formData.append(
        "video",
        blob,
        `${id}_interview.webm`
      );

      const response = await fetch(
        `${API_URL}/api/interview/session/${id}/upload-video`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          "Video upload failed."
        );
      }

      const data = await response.json();

      console.log(
        "Video uploaded successfully:",
        data
      );

      return true;
    } catch (error) {
      console.error(
        "Video upload error:",
        error
      );

      return false;
    }
  };

  // =========================================================
  // UPDATE BACKEND SESSION
  // =========================================================

  const updateBackendSession = async (
    id,
    attempted,
    duration
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/api/interview/session/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            questions_attempted: attempted,
            duration_seconds: duration,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Session update failed."
        );
      }

      const data = await response.json();

      if (data.success && data.session) {
        localStorage.setItem(
          "smarthire_active_session",
          JSON.stringify(data.session)
        );
      }

      return data;
    } catch (error) {
      console.error(
        "Session update error:",
        error
      );

      return null;
    }
  };

  // =========================================================
  // SPEECH ANALYSIS ENGINE
  // =========================================================

  const clamp = (
    value,
    minimum = 0,
    maximum = 100
  ) => {
    return Math.max(
      minimum,
      Math.min(maximum, value)
    );
  };

  const countOccurrences = (
    text,
    pattern
  ) => {
    const matches =
      text.match(pattern);

    return matches ? matches.length : 0;
  };

  const analyzeSpeech = (
    text,
    durationSeconds
  ) => {
    const cleanText = String(
      text || ""
    ).trim();

    const words =
      cleanText.match(
        /[A-Za-z0-9']+/g
      ) || [];

    const wordCount = words.length;

    const duration = Math.max(
      1,
      Number(durationSeconds) || 1
    );

    const speakingMinutes =
      duration / 60;

    const wpm =
      speakingMinutes > 0
        ? wordCount /
          speakingMinutes
        : 0;

    const lower =
      cleanText.toLowerCase();

    const fillerPattern =
      /\b(um|uh|like|basically|actually|literally|right|okay|you know|sort of|kind of|i mean)\b/gi;

    const fillerCount =
      countOccurrences(
        lower,
        fillerPattern
      );

    const fillerRate =
      wordCount > 0
        ? (fillerCount /
            wordCount) *
          100
        : 0;

    const sentenceMatches =
      cleanText.match(
        /[^.!?]+[.!?]+/g
      ) || [];

    const sentenceCount =
      sentenceMatches.length ||
      (cleanText ? 1 : 0);

    const averageWordsPerSentence =
      sentenceCount > 0
        ? wordCount /
          sentenceCount
        : 0;

    const paceScore = clamp(
      100 -
        Math.abs(wpm - 135) *
          0.42,
      45,
      100
    );

    const clarityScore = clamp(
      100 -
        fillerRate * 10,
      40,
      100
    );

    const structureScore =
      sentenceCount >= 3
        ? 100
        : sentenceCount === 2
        ? 90
        : sentenceCount === 1
        ? 75
        : 50;

    const communicationScore =
      Math.round(
        paceScore * 0.35 +
          clarityScore * 0.4 +
          structureScore * 0.25
      );

    const confidenceScore =
      Math.round(
        paceScore * 0.6 +
          clarityScore * 0.4
      );

    let speakingPace =
      "No speech detected";

    if (wpm > 0 && wpm < 100) {
      speakingPace = "Slow";
    } else if (
      wpm >= 100 &&
      wpm <= 160
    ) {
      speakingPace = "Balanced";
    } else if (wpm > 160) {
      speakingPace = "Fast";
    }

    return {
      word_count: wordCount,
      speaking_time_seconds:
        Math.round(duration),
      average_wpm: Math.round(wpm),
      filler_words: fillerCount,
      filler_rate:
        Math.round(
          fillerRate * 10
        ) / 10,
      sentence_count:
        sentenceCount,
      average_words_per_sentence:
        Math.round(
          averageWordsPerSentence * 10
        ) / 10,
      speaking_pace: speakingPace,
      communication_score:
        communicationScore,
      confidence_score:
        confidenceScore,
      method:
        "speech_signal_heuristic",
    };
  };

  // =========================================================
  // SPEECH RECOGNITION
  // =========================================================

  const stopSpeechRecognition = () => {
    shouldListenRef.current = false;

    if (speechRestartTimerRef.current) {
      clearTimeout(
        speechRestartTimerRef.current
      );

      speechRestartTimerRef.current =
        null;
    }

    const recognition =
      speechRecognitionRef.current;

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
    }

    setSpeechListening(false);
  };

  const startSpeechRecognition = () => {
    if (!speechSupported) {
      return;
    }

    if (
      sessionStatusRef.current !==
      "RUNNING"
    ) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    try {
      const recognition =
        new SpeechRecognition();

      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      transcriptInterimRef.current = "";

      recognition.onstart = () => {
        setSpeechListening(true);
      };

      recognition.onresult = (event) => {
        let finalParts = [];
        let interimParts = [];

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          const result =
            event.results[i];

          const text =
            result[0]?.transcript || "";

          if (result.isFinal) {
            finalParts.push(text);
          } else {
            interimParts.push(text);
          }
        }

        if (finalParts.length > 0) {
          transcriptFinalRef.current +=
            finalParts.join(" ") + " ";
        }

        transcriptInterimRef.current =
          interimParts.join(" ");

        const combined =
          `${transcriptFinalRef.current} ${transcriptInterimRef.current}`
            .trim();

        answerTextRef.current =
          combined;

        setAnswerText(combined);
      };

      recognition.onerror = (event) => {
        console.warn(
          "Speech recognition:",
          event.error
        );

        if (
          event.error ===
            "not-allowed" ||
          event.error ===
            "service-not-allowed"
        ) {
          shouldListenRef.current =
            false;

          setSpeechListening(false);

          setMediaError(
            "Speech recognition permission was denied. You can type your answer instead."
          );
        }
      };

      recognition.onend = () => {
        setSpeechListening(false);

        speechRecognitionRef.current =
          null;

        if (
          shouldListenRef.current &&
          sessionStatusRef.current ===
            "RUNNING"
        ) {
          speechRestartTimerRef.current =
            setTimeout(() => {
              startSpeechRecognition();
            }, 250);
        }
      };

      speechRecognitionRef.current =
        recognition;

      recognition.start();
    } catch (error) {
      console.warn(
        "Speech recognition start error:",
        error
      );

      setSpeechListening(false);
    }
  };

  // =========================================================
  // START / STOP SPEECH BASED ON INTERVIEW STATE
  // =========================================================

  useEffect(() => {
    if (
      sessionStatus === "RUNNING" &&
      speechSupported
    ) {
      shouldListenRef.current =
        true;

      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
    }

    return () => {
      if (
        speechRestartTimerRef.current
      ) {
        clearTimeout(
          speechRestartTimerRef.current
        );

        speechRestartTimerRef.current =
          null;
      }
    };
  }, [
    sessionStatus,
    currentQuestion,
    speechSupported,
  ]);

  // =========================================================
  // VISUAL ATTENTION / FACE PRESENCE
  // =========================================================

  useEffect(() => {
    if (
      sessionStatus !== "RUNNING" ||
      !mediaStream ||
      !videoRef.current
    ) {
      return;
    }

    const FaceDetectorAPI =
      window.FaceDetector;

    if (!FaceDetectorAPI) {
      return;
    }

    const detector =
      new FaceDetectorAPI({
        fastMode: true,
        maxDetectedFaces: 1,
      });

    const checkFace = async () => {
      const video =
        videoRef.current;

      if (
        !video ||
        video.readyState < 2 ||
        faceDetectionBusyRef.current
      ) {
        return;
      }

      faceDetectionBusyRef.current =
        true;

      try {
        const faces =
          await detector.detect(
            video
          );

        faceStatsRef.current.checks +=
          1;

        if (faces.length > 0) {
          faceStatsRef.current.detected +=
            1;
        }
      } catch {
        // Browser may not support detection fully.
      } finally {
        faceDetectionBusyRef.current =
          false;
      }
    };

    const interval = setInterval(
      checkFace,
      1500
    );

    return () => {
      clearInterval(interval);
    };
  }, [
    sessionStatus,
    mediaStream,
  ]);

  // =========================================================
  // RESET CURRENT ANSWER
  // =========================================================

  const resetCurrentAnswer = () => {
    transcriptFinalRef.current = "";
    transcriptInterimRef.current = "";

    answerTextRef.current = "";

    setAnswerText("");

    questionStartedAtRef.current =
      Date.now();
  };

  // =========================================================
  // UPDATE TEXT ANSWER
  // =========================================================

  const handleAnswerChange = (event) => {
    const value =
      event.target.value;

    answerTextRef.current = value;

    setAnswerText(value);
  };

  // =========================================================
  // SAVE CURRENT ANSWER
  // =========================================================

  const finalizeCurrentAnswer = () => {
    if (!questions.length) {
      return null;
    }

    const index =
      currentQuestionRef.current;

    const question =
      questions[index];

    if (!question) {
      return null;
    }

    const text =
      answerTextRef.current.trim();

    const durationSeconds = Math.max(
      1,
      (Date.now() -
        questionStartedAtRef.current) /
        1000
    );

    const speechAnalysis =
      analyzeSpeech(
        text,
        durationSeconds
      );

    const answerRecord = {
      question_index: index,
      question:
        String(question),
      answer: text,
      duration_seconds:
        Math.round(durationSeconds),
      ...speechAnalysis,
    };

    const existing =
      answersRef.current.filter(
        (item) =>
          item.question_index !==
          index
      );

    const updated = [
      ...existing,
      answerRecord,
    ].sort(
      (a, b) =>
        a.question_index -
        b.question_index
    );

    answersRef.current = updated;

    setAnswers(updated);

    return answerRecord;
  };

  // =========================================================
  // COMMUNICATION SUMMARY
  // =========================================================

  const buildCommunicationAnalysis =
    () => {
      const records =
        answersRef.current;

      if (records.length === 0) {
        return {
          speech_to_text_available:
            speechSupported,
          communication_score: 0,
          confidence_score: 0,
          average_wpm: 0,
          filler_words: 0,
          filler_rate: 0,
          speaking_pace:
            "No speech detected",
          visual_attention_available:
            false,
          face_presence_percent:
            null,
        };
      }

      const totalWords =
        records.reduce(
          (sum, item) =>
            sum +
            Number(
              item.word_count || 0
            ),
          0
        );

      const totalDuration =
        records.reduce(
          (sum, item) =>
            sum +
            Number(
              item.duration_seconds ||
                0
            ),
          0
        );

      const totalFillers =
        records.reduce(
          (sum, item) =>
            sum +
            Number(
              item.filler_words || 0
            ),
          0
        );

      const communicationAverage =
        records.reduce(
          (sum, item) =>
            sum +
            Number(
              item.communication_score ||
                0
            ),
          0
        ) / records.length;

      const confidenceAverage =
        records.reduce(
          (sum, item) =>
            sum +
            Number(
              item.confidence_score ||
                0
            ),
          0
        ) / records.length;

      const overallWpm =
        totalDuration > 0
          ? totalWords /
            (totalDuration / 60)
          : 0;

      const fillerRate =
        totalWords > 0
          ? (totalFillers /
              totalWords) *
            100
          : 0;

      let speakingPace =
        "No speech detected";

      if (
        overallWpm > 0 &&
        overallWpm < 100
      ) {
        speakingPace = "Slow";
      } else if (
        overallWpm >= 100 &&
        overallWpm <= 160
      ) {
        speakingPace = "Balanced";
      } else if (overallWpm > 160) {
        speakingPace = "Fast";
      }

      const faceChecks =
        faceStatsRef.current.checks;

      const faceDetected =
        faceStatsRef.current.detected;

      const visualAvailable =
        faceChecks > 0;

      const facePresencePercent =
        visualAvailable
          ? Math.round(
              (faceDetected /
                faceChecks) *
                100
            )
          : null;

      return {
        speech_to_text_available:
          speechSupported,

        communication_score:
          Math.round(
            communicationAverage
          ),

        confidence_score:
          Math.round(
            confidenceAverage
          ),

        average_wpm:
          Math.round(overallWpm),

        filler_words:
          totalFillers,

        filler_rate:
          Math.round(
            fillerRate * 10
          ) / 10,

        speaking_pace:
          speakingPace,

        speaking_time_seconds:
          Math.round(totalDuration),

        visual_attention_available:
          visualAvailable,

        face_presence_percent:
          facePresencePercent,

        eye_contact:
          visualAvailable
            ? `${facePresencePercent}% face presence`
            : "Visual attention unavailable",

        note:
          "Communication and confidence are estimated from speech signals such as pace, filler words and answer structure. They are not psychological or medical measurements.",
      };
    };

  // =========================================================
  // START INTERVIEW
  // =========================================================

  const startInterview = async () => {
    if (!questions.length) {
      alert(
        "No interview questions found."
      );

      return;
    }

    finishStartedRef.current = false;
    movingToNextRef.current = false;

    answersRef.current = [];
    setAnswers([]);

    faceStatsRef.current = {
      checks: 0,
      detected: 0,
    };

    const stream =
      await requestMediaPermissions();

    if (!stream) {
      return;
    }

    const session =
      await createBackendSession();

    if (!session) {
      stream
        .getTracks()
        .forEach((track) =>
          track.stop()
        );

      mediaStreamRef.current = null;
      setMediaStream(null);

      return;
    }

    const started =
      await startBackendSession(
        session.session_id
      );

    if (!started) {
      stream
        .getTracks()
        .forEach((track) =>
          track.stop()
        );

      mediaStreamRef.current = null;
      setMediaStream(null);

      return;
    }

    const recordingStarted =
      startRecording(stream);

    if (!recordingStarted) {
      stream
        .getTracks()
        .forEach((track) =>
          track.stop()
        );

      mediaStreamRef.current = null;
      setMediaStream(null);

      return;
    }

    sessionStartTimeRef.current =
      Date.now();

    setSessionId(
      session.session_id
    );

    sessionIdRef.current =
      session.session_id;

    setSessionStatus("RUNNING");

    setCurrentQuestion(0);
    currentQuestionRef.current = 0;

    setQuestionsCompleted(0);

    setTimeRemaining(
      QUESTION_TIME
    );

    resetCurrentAnswer();

    setMediaError("");
  };

  // =========================================================
  // PAUSE
  // =========================================================

  const pauseInterview = async () => {
    const id =
      sessionIdRef.current;

    if (!id) return;

    try {
      const response = await fetch(
        `${API_URL}/api/interview/session/${id}/pause`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Pause failed."
        );
      }

      const data =
        await response.json();

      if (data.success) {
        setSessionStatus("PAUSED");
      }
    } catch (error) {
      console.error(
        "Pause error:",
        error
      );
    }
  };

  // =========================================================
  // RESUME
  // =========================================================

  const resumeInterview = async () => {
    const id =
      sessionIdRef.current;

    if (!id) return;

    try {
      const response = await fetch(
        `${API_URL}/api/interview/session/${id}/resume`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Resume failed."
        );
      }

      const data =
        await response.json();

      if (data.success) {
        setSessionStatus("RUNNING");
      }
    } catch (error) {
      console.error(
        "Resume error:",
        error
      );
    }
  };

  // =========================================================
  // TIMER
  // =========================================================

  useEffect(() => {
    if (
      sessionStatus !== "RUNNING" ||
      !questions.length
    ) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(
        (previous) =>
          previous <= 1
            ? 0
            : previous - 1
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    sessionStatus,
    currentQuestion,
    questions.length,
  ]);

  // =========================================================
  // AUTO NEXT QUESTION
  // =========================================================

  useEffect(() => {
    if (
      sessionStatus !== "RUNNING" ||
      timeRemaining !== 0 ||
      movingToNextRef.current
    ) {
      return;
    }

    movingToNextRef.current = true;

    nextQuestion();

    setTimeout(() => {
      movingToNextRef.current =
        false;
    }, 700);
  }, [
    timeRemaining,
    sessionStatus,
  ]);

  // =========================================================
  // NEXT QUESTION
  // =========================================================

  const nextQuestion = async () => {
    if (!questions.length) {
      return;
    }

    stopSpeechRecognition();

    finalizeCurrentAnswer();

    const completedCount =
      currentQuestion + 1;

    setQuestionsCompleted(
      completedCount
    );

    if (
      currentQuestion >=
      questions.length - 1
    ) {
      await finishInterview(
        completedCount
      );

      return;
    }

    const nextIndex =
      currentQuestion + 1;

    setCurrentQuestion(
      nextIndex
    );

    currentQuestionRef.current =
      nextIndex;

    setTimeRemaining(
      QUESTION_TIME
    );

    resetCurrentAnswer();
  };

  // =========================================================
  // BACKEND ASSESSMENT
  // =========================================================

  const sendAssessmentToBackend =
    async (
      id,
      communicationAnalysis
    ) => {
      const answerList =
        answersRef.current;

      const questionList =
        questions.map((question) =>
          String(question)
        );

      const answerTexts =
        questions.map(
          (_, index) => {
            const record =
              answerList.find(
                (item) =>
                  item.question_index ===
                  index
              );

            return (
              record?.answer || ""
            );
          }
        );

      try {
        const response = await fetch(
          `${API_URL}/api/interview/assess`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              session_id: id,

              candidate_id:
                String(
                  user?.id ||
                    user?.user_id ||
                    user?.email ||
                    "guest"
                ),

              interview_type:
                interviewInfo?.type ||
                interviewInfo?.interview_type ||
                "Technical",

              difficulty:
                interviewInfo?.difficulty ||
                "Medium",

              domain:
                interviewInfo?.domain ||
                "Full Stack Development",

              questions:
                questionList,

              answers:
                answerTexts,

              question_metrics:
                answerList,

              communication_analysis:
                communicationAnalysis,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Assessment request failed."
          );
        }

        const data =
          await response.json();

        if (
          data.success &&
          data.assessment
        ) {
          return data.assessment;
        }

        if (data.assessment) {
          return data.assessment;
        }

        return data;
      } catch (error) {
        console.error(
          "Assessment error:",
          error
        );

        return null;
      }
    };

  // =========================================================
  // LOCAL FALLBACK ASSESSMENT
  // =========================================================

  const buildFallbackAssessment =
    (
      communicationAnalysis
    ) => {
      const records =
        answersRef.current;

      const communication =
        Number(
          communicationAnalysis.communication_score ||
            0
        );

      const confidence =
        Number(
          communicationAnalysis.confidence_score ||
            0
        );

      const answeredCount =
        records.filter(
          (item) =>
            item.answer &&
            item.answer.trim()
        ).length;

      const relevance =
        answeredCount > 0
          ? Math.round(
              (answeredCount /
                questions.length) *
                100
            )
          : 0;

      const overallScore =
        Math.round(
          communication * 0.35 +
            confidence * 0.25 +
            relevance * 0.4
        );

      let performanceLevel =
        "Needs Improvement";

      if (overallScore >= 80) {
        performanceLevel =
          "Excellent";
      } else if (overallScore >= 60) {
        performanceLevel = "Good";
      } else if (
        overallScore >= 40
      ) {
        performanceLevel = "Average";
      }

      const strengths = [];

      if (answeredCount === questions.length) {
        strengths.push(
          "You attempted every interview question."
        );
      }

      if (communication >= 70) {
        strengths.push(
          "Your communication signals were consistent."
        );
      }

      if (confidence >= 70) {
        strengths.push(
          "Your speaking pattern showed good confidence signals."
        );
      }

      if (strengths.length === 0) {
        strengths.push(
          "You completed the interview and gained useful practice."
        );
      }

      const improvements = [];

      if (
        communication < 70
      ) {
        improvements.push(
          "Practice speaking clearly with a steady pace."
        );
      }

      if (
        communicationAnalysis.filler_words >
        3
      ) {
        improvements.push(
          "Reduce filler words such as um, uh, like and basically."
        );
      }

      if (
        confidence < 70
      ) {
        improvements.push(
          "Practice answering common interview questions aloud."
        );
      }

      if (
        answeredCount <
        questions.length
      ) {
        improvements.push(
          "Try to provide an answer for every question."
        );
      }

      if (improvements.length === 0) {
        improvements.push(
          "Continue practicing to make your answers even stronger."
        );
      }

      const questionResults =
        questions.map(
          (question, index) => {
            const record =
              records.find(
                (item) =>
                  item.question_index ===
                  index
              );

            const score =
              record?.answer
                ? Math.round(
                    record.communication_score *
                      0.5 +
                      50
                  )
                : 0;

            return {
              question:
                String(question),

              answer:
                record?.answer || "",

              score: Math.min(
                100,
                score
              ),

              feedback:
                record?.answer
                  ? "Answer recorded successfully. Continue practicing concise and structured responses."
                  : "No answer was recorded for this question.",
            };
          }
        );

      return {
        success: true,

        session_id:
          sessionIdRef.current,

        overall_score:
          overallScore,

        performance_level:
          performanceLevel,

        answer_quality_score:
          communication,

        communication_score:
          communication,

        confidence_score:
          confidence,

        relevance_score:
          relevance,

        strengths,

        improvements,

        summary:
          "Your interview has been analyzed using your recorded answers and speech communication signals. Use the feedback to improve your next interview attempt.",

        communication_analysis:
          communicationAnalysis,

        question_results:
          questionResults,

        generated_by:
          "SmartHire AI local assessment fallback",
      };
    };

  // =========================================================
  // FINISH INTERVIEW
  // =========================================================

  const finishInterview = async (
    completedCount = questionsCompleted
  ) => {
    if (
      finishStartedRef.current
    ) {
      return;
    }

    finishStartedRef.current =
      true;

    const id =
      sessionIdRef.current;

    if (!id) {
      navigate(
        "/candidate/interview-complete"
      );

      return;
    }

    setSessionStatus(
      "COMPLETING"
    );

    sessionStatusRef.current =
      "COMPLETING";

    stopSpeechRecognition();

    // Make sure current answer exists.
    const currentIndex =
      currentQuestionRef.current;

    const currentAlreadySaved =
      answersRef.current.some(
        (item) =>
          item.question_index ===
          currentIndex
      );

    if (!currentAlreadySaved) {
      finalizeCurrentAnswer();
    }

    const communicationAnalysis =
      buildCommunicationAnalysis();

    const duration =
      sessionStartTimeRef.current
        ? Math.floor(
            (Date.now() -
              sessionStartTimeRef.current) /
              1000
          )
        : recordingSeconds;

    const recordedBlob =
      await stopRecording();

    await updateBackendSession(
      id,
      Math.min(
        completedCount,
        questions.length
      ),
      duration
    );

    if (recordedBlob) {
      await uploadVideo(
        id,
        recordedBlob
      );
    }

    // =====================================================
    // COMPLETE SESSION
    // =====================================================

    try {
      const response =
        await fetch(
          `${API_URL}/api/interview/session/${id}/complete`,
          {
            method: "POST",
          }
        );

      if (response.ok) {
        const data =
          await response.json();

        if (
          data.success &&
          data.session
        ) {
          localStorage.setItem(
            "smarthire_active_session",
            JSON.stringify(
              data.session
            )
          );

          setSession(
            data.session
          );
        }
      }
    } catch (error) {
      console.error(
        "Complete session error:",
        error
      );
    }

    // =====================================================
    // AI ASSESSMENT
    // =====================================================

    let finalAssessment =
      await sendAssessmentToBackend(
        id,
        communicationAnalysis
      );

    // If backend assessment fails,
    // use local fallback so the report
    // still appears.
    if (!finalAssessment) {
      finalAssessment =
        buildFallbackAssessment(
          communicationAnalysis
        );
    }

    const assessmentPackage = {
      success: true,

      session_id: id,

      assessment:
        finalAssessment,

      communication_analysis:
        communicationAnalysis,

      answers:
        answersRef.current,

      interview_info:
        interviewInfo,

      completed_at:
        new Date().toISOString(),
    };

    localStorage.setItem(
      "smarthire_interview_assessment",
      JSON.stringify(
        assessmentPackage
      )
    );

    localStorage.setItem(
      "smarthire_last_completed_session",
      JSON.stringify({
        session_id: id,
        completed_at:
          new Date().toISOString(),
      })
    );

    // =====================================================
    // STOP CAMERA
    // =====================================================

    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop()
        );
    }

    mediaStreamRef.current = null;

    setMediaStream(null);
    setMediaReady(false);

    setSessionStatus(
      "COMPLETED"
    );

    // =====================================================
    // GO TO REPORT
    // =====================================================

    setTimeout(() => {
      navigate(
        "/candidate/interview-complete"
      );
    }, 500);
  };

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      stopSpeechRecognition();

      if (
        recordingTimerRef.current
      ) {
        clearInterval(
          recordingTimerRef.current
        );
      }

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !== "inactive"
      ) {
        try {
          recorder.stop();
        } catch {
          // Ignore
        }
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (seconds) => {
    const safeSeconds =
      Math.max(
        0,
        Number(seconds) || 0
      );

    const minutes = Math.floor(
      safeSeconds / 60
    );

    const remainingSeconds =
      safeSeconds % 60;

    return `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      remainingSeconds
    ).padStart(
      2,
      "0"
    )}`;
  };

  // =========================================================
  // EXIT
  // =========================================================

  const exitInterview = () => {
    navigate("/candidate");
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (!questions.length) {
    return (
      <div className="mock-loading">
        <div className="mock-loading-card">
          <div className="mock-loading-icon">
            ✨
          </div>

          <h2>
            Loading Interview...
          </h2>

          <p>
            Preparing your AI interview.
          </p>
        </div>
      </div>
    );
  }

  const currentQuestionText =
    questions[currentQuestion];

  const isReady =
    sessionStatus === "READY";

  const isRunning =
    sessionStatus === "RUNNING";

  const isPaused =
    sessionStatus === "PAUSED";

  const isCompleting =
    sessionStatus === "COMPLETING";

  const progress =
    ((currentQuestion + 1) /
      questions.length) *
    100;

  const faceChecks =
    faceStatsRef.current.checks;

  const faceDetected =
    faceStatsRef.current.detected;

  const facePresence =
    faceChecks > 0
      ? Math.round(
          (faceDetected /
            faceChecks) *
            100
        )
      : null;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="mock-interview-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="mock-header">

        <button
          className="mock-brand"
          onClick={exitInterview}
        >
          <div className="mock-brand-logo">
            S
          </div>

          <div>
            <strong>
              SmartHire
              <span> AI</span>
            </strong>

            <small>
              AI Interview Studio
            </small>
          </div>
        </button>

        <div className="mock-header-center">
          <span>
            {interviewInfo?.type ||
              "AI Mock Interview"}
          </span>

          <span className="header-dot">
            •
          </span>

          <span>
            {interviewInfo?.difficulty ||
              "Medium"}
          </span>
        </div>

        <button
          className="mock-exit-btn"
          onClick={exitInterview}
        >
          Exit
        </button>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mock-main">

        {/* ===================================================
            TOP INFO
        =================================================== */}

        <div className="mock-top-info">

          <div>
            <span className="mock-label">
              INTERVIEW SESSION
            </span>

            <h1>
              AI-Powered Mock Interview
            </h1>

            <p>
              Answer naturally. SmartHire AI
              will analyze your responses and
              communication.
            </p>
          </div>

          <div className="session-status-box">

            <span
              className={`status-dot ${sessionStatus.toLowerCase()}`}
            />

            <span>
              {sessionStatus}
            </span>

          </div>

        </div>

        {/* ===================================================
            PROGRESS
        =================================================== */}

        <div className="question-progress">

          <div className="progress-info">

            <span>
              Question{" "}
              {currentQuestion + 1}
              {" "}of{" "}
              {questions.length}
            </span>

            <strong>
              {Math.round(progress)}%
            </strong>

          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

        </div>

        {/* ===================================================
            INTERVIEW GRID
        =================================================== */}

        <div className="mock-grid">

          {/* =================================================
              VIDEO
          ================================================= */}

          <section className="video-card">

            <div className="video-card-header">

              <div>
                <span>
                  CAMERA
                </span>

                <strong>
                  Interview Camera
                </strong>
              </div>

              <div
                className={`recording-status ${
                  isRecording
                    ? "recording"
                    : ""
                }`}
              >
                <span />
                {isRecording
                  ? "Recording"
                  : "Standby"}
              </div>

            </div>

            <div className="video-wrapper">

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
              />

              {!mediaReady && (
                <div className="video-placeholder">

                  <div className="camera-placeholder-icon">
                    📷
                  </div>

                  <h3>
                    Camera Preview
                  </h3>

                  <p>
                    Your camera preview will
                    appear here after you
                    start the interview.
                  </p>

                </div>
              )}

              {isRecording && (
                <div className="recording-overlay">

                  <span className="live-dot" />

                  LIVE

                  <span>
                    {formatTime(
                      recordingSeconds
                    )}
                  </span>

                </div>
              )}

            </div>

            {/* MEDIA ERROR */}

            {mediaError && (
              <div className="media-error">
                ⚠️ {mediaError}
              </div>
            )}

            {/* CAMERA STATS */}

            <div className="media-stats">

              <div>
                <span>
                  🎥 Camera
                </span>

                <strong>
                  {mediaReady
                    ? "Connected"
                    : "Not Ready"}
                </strong>
              </div>

              <div>
                <span>
                  🎙️ Microphone
                </span>

                <strong>
                  {mediaReady
                    ? "Connected"
                    : "Not Ready"}
                </strong>
              </div>

              <div>
                <span>
                  👁️ Attention
                </span>

                <strong>
                  {facePresence !==
                  null
                    ? `${facePresence}%`
                    : "Monitoring"}
                </strong>
              </div>

            </div>

          </section>

          {/* =================================================
              QUESTION / ANSWER
          ================================================= */}

          <section className="question-card">

            <div className="question-card-top">

              <div className="question-number">
                {String(
                  currentQuestion + 1
                ).padStart(2, "0")}
              </div>

              <div>
                <span className="question-type">
                  INTERVIEW QUESTION
                </span>

                <h2>
                  Question{" "}
                  {currentQuestion + 1}
                </h2>
              </div>

            </div>

            <div className="question-text">
              {currentQuestionText}
            </div>

            {/* TIMER */}

            <div
              className={`question-timer ${
                timeRemaining <= 10
                  ? "timer-warning"
                  : ""
              }`}
            >
              <div>
                <span>
                  TIME REMAINING
                </span>

                <strong>
                  {formatTime(
                    timeRemaining
                  )}
                </strong>
              </div>

              <div className="timer-progress">
                <div
                  style={{
                    width: `${
                      (timeRemaining /
                        QUESTION_TIME) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* SPEECH STATUS */}

            <div className="speech-status">

              <div className="speech-status-icon">
                🎙️
              </div>

              <div className="speech-status-text">

                <strong>
                  {speechListening
                    ? "Listening to your answer..."
                    : speechSupported
                    ? "Speech recognition ready"
                    : "Speech recognition unavailable"}
                </strong>

                <span>
                  {speechSupported
                    ? "Speak naturally. Your answer is converted to text for assessment."
                    : "You can type your answer in the box below."}
                </span>

              </div>

              <div
                className={`speech-indicator ${
                  speechListening
                    ? "active"
                    : ""
                }`}
              >
                <span />
              </div>

            </div>

            {/* ANSWER */}

            <div className="answer-area">

              <div className="answer-header">

                <label>
                  Your Answer
                </label>

                <span>
                  {answerText
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .length}{" "}
                  words
                </span>

              </div>

              <textarea
                value={answerText}
                onChange={
                  handleAnswerChange
                }
                placeholder={
                  speechSupported
                    ? "Start speaking... your answer will appear here automatically."
                    : "Type your answer here..."
                }
                disabled={
                  isReady ||
                  isCompleting
                }
              />

            </div>

            {/* CONTROLS */}

            <div className="question-controls">

              {isReady && (
                <button
                  className="start-interview-btn"
                  onClick={
                    startInterview
                  }
                >
                  <span>
                    ▶
                  </span>

                  Start Interview
                </button>
              )}

              {isRunning && (
                <>
                  <button
                    className="pause-btn"
                    onClick={
                      pauseInterview
                    }
                  >
                    ⏸ Pause
                  </button>

                  <button
                    className="next-btn"
                    onClick={
                      nextQuestion
                    }
                  >
                    {currentQuestion ===
                    questions.length - 1
                      ? "Finish Interview"
                      : "Next Question →"}
                  </button>
                </>
              )}

              {isPaused && (
                <>
                  <button
                    className="resume-btn"
                    onClick={
                      resumeInterview
                    }
                  >
                    ▶ Resume
                  </button>

                  <button
                    className="next-btn"
                    onClick={
                      nextQuestion
                    }
                  >
                    Continue →
                  </button>
                </>
              )}

              {isCompleting && (
                <div className="completing-message">
                  <span className="small-spinner" />
                  Generating your AI assessment...
                </div>
              )}

            </div>

          </section>

        </div>

        {/* ===================================================
            ANALYSIS CARDS
        =================================================== */}

        <section className="analysis-preview">

          <div className="analysis-title">

            <div>
              <span>
                SMART ANALYSIS
              </span>

              <h2>
                What SmartHire AI is analyzing
              </h2>
            </div>

            <div className="ai-badge">
              ✨ AI
            </div>

          </div>

          <div className="analysis-grid">

            <div className="analysis-item">

              <div className="analysis-icon">
                🗣️
              </div>

              <div>
                <strong>
                  Communication
                </strong>

                <p>
                  Speaking pace, clarity and
                  filler words
                </p>
              </div>

            </div>

            <div className="analysis-item">

              <div className="analysis-icon">
                💪
              </div>

              <div>
                <strong>
                  Confidence Signal
                </strong>

                <p>
                  Speech patterns and answer
                  consistency
                </p>
              </div>

            </div>

            <div className="analysis-item">

              <div className="analysis-icon">
                🎯
              </div>

              <div>
                <strong>
                  Answer Relevance
                </strong>

                <p>
                  How effectively your answer
                  addresses the question
                </p>
              </div>

            </div>

            <div className="analysis-item">

              <div className="analysis-icon">
                👁️
              </div>

              <div>
                <strong>
                  Visual Attention
                </strong>

                <p>
                  Basic face-presence signal
                  from the interview camera
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            SESSION SUMMARY
        =================================================== */}

        <div className="bottom-summary">

          <div>
            <span>
              QUESTIONS COMPLETED
            </span>

            <strong>
              {questionsCompleted}
              {" / "}
              {questions.length}
            </strong>
          </div>

          <div>
            <span>
              RECORDING
            </span>

            <strong>
              {isRecording
                ? "Active"
                : "Standby"}
            </strong>
          </div>

          <div>
            <span>
              SPEECH AI
            </span>

            <strong>
              {speechSupported
                ? "Available"
                : "Typing Mode"}
            </strong>
          </div>

          <div>
            <span>
              SESSION
            </span>

            <strong>
              {sessionId
                ? sessionId.slice(
                    0,
                    12
                  ) + "..."
                : "Not Started"}
            </strong>
          </div>

        </div>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="mock-footer">
        <span>
          SmartHire AI
        </span>

        <span>
          •
        </span>

        <span>
          AI-Powered Mock Interview
        </span>

        <span>
          •
        </span>

        <span>
          Your performance matters
        </span>
      </footer>

    </div>
  );
}

export default MockInterview;