import React, { useEffect, useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function Interview() {
  // ==============================
  // USER
  // ==============================
  const storedUser = localStorage.getItem("user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : {
        name: "Candidate",
        email: "",
      };

  const token = localStorage.getItem("access_token");

  // ==============================
  // INTERVIEW STATE
  // ==============================
  const [stage, setStage] = useState("setup");

  const [interviewType, setInterviewType] = useState("Technical");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [role, setRole] = useState("Software Developer");

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

  // ==============================
  // INTERVIEW TIMER
  // ==============================
  const [seconds, setSeconds] = useState(0);

  // ==============================
  // RECORDING TIMER
  // ==============================
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // ==============================
  // CAMERA + MICROPHONE
  // ==============================
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // ==============================
  // MEDIA RECORDER
  // ==============================
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const recordingBlobRef = useRef(null);
  const recordingUrlRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingReady, setRecordingReady] = useState(false);

  // ==============================
  // GENERAL REFS
  // ==============================
  const mountedRef = useRef(true);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px",
        background:
          "linear-gradient(135deg, #f8ecff 0%, #fff0f7 50%, #f5eaff 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#4b315f",
            marginBottom: "30px",
          }}
        >
          SmartHire AI Interview
        </h1>