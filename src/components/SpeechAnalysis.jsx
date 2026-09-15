import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SpeechAnalysis.css";

/*
=========================================================
 SMART HIRE AI
 Speech-to-Text & Communication Analysis
=========================================================

Features:
- Real-time browser speech recognition
- Live transcript
- Filler word detection
- Speech pace / WPM
- Basic grammar checks
- Recognition confidence
- Communication quality score
- Parent component callback support

No paid API or API key required.
=========================================================
*/

const FILLER_WORDS = [
  "um",
  "uh",
  "erm",
  "hmm",
  "like",
  "actually",
  "basically",
  "literally",
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "well",
  "so yeah",
];

const COMMON_GRAMMAR_PATTERNS = [
  {
    pattern: /\bi is\b/gi,
    replacement: "I am",
    message: 'Use "I am" instead of "I is".',
  },
  {
    pattern: /\bhe are\b/gi,
    replacement: "he is",
    message: 'Use "he is" instead of "he are".',
  },
  {
    pattern: /\bshe are\b/gi,
    replacement: "she is",
    message: 'Use "she is" instead of "she are".',
  },
  {
    pattern: /\bthey is\b/gi,
    replacement: "they are",
    message: 'Use "they are" instead of "they is".',
  },
  {
    pattern: /\bwe was\b/gi,
    replacement: "we were",
    message: 'Use "we were" instead of "we was".',
  },
  {
    pattern: /\byou was\b/gi,
    replacement: "you were",
    message: 'Use "you were" instead of "you was".',
  },
  {
    pattern: /\bdidn't went\b/gi,
    replacement: "didn't go",
    message: 'After "didn\'t", use the base verb.',
  },
  {
    pattern: /\bdid not went\b/gi,
    replacement: "did not go",
    message: 'After "did not", use the base verb.',
  },
];

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).filter(Boolean).length;
}

function calculateFillerWords(text) {
  const normalized = normalizeText(text).toLowerCase();

  if (!normalized) {
    return [];
  }

  const words = [];

  FILLER_WORDS.forEach((filler) => {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(
      `(^|\\s)${escaped}(?=\\s|[,.!?;:]|$)`,
      "gi"
    );

    const matches = normalized.match(regex);

    if (matches) {
      for (let i = 0; i < matches.length; i += 1) {
        words.push(filler);
      }
    }
  });

  return words;
}

function calculateGrammarIssues(text) {
  const issues = [];

  if (!normalizeText(text)) {
    return issues;
  }

  COMMON_GRAMMAR_PATTERNS.forEach((item) => {
    const matches = text.match(item.pattern);

    if (matches) {
      issues.push({
        message: item.message,
        count: matches.length,
        replacement: item.replacement,
      });
    }
  });

  /*
    Additional basic checks.
  */

  if (/\s+[,.!?]/.test(text)) {
    issues.push({
      message: "Remove spaces before punctuation marks.",
      count: 1,
      replacement: "Check punctuation spacing.",
    });
  }

  if (/[a-z]\.[A-Z]/.test(text)) {
    issues.push({
      message: "Add a space after the period.",
      count: 1,
      replacement: "Add spacing after punctuation.",
    });
  }

  return issues;
}

function calculateWPM(wordCount, elapsedSeconds) {
  if (!wordCount || elapsedSeconds <= 0) {
    return 0;
  }

  const minutes = elapsedSeconds / 60;

  return Math.round(wordCount / minutes);
}

function getPaceLabel(wpm) {
  if (wpm === 0) {
    return "Waiting";
  }

  if (wpm < 90) {
    return "Slow";
  }

  if (wpm <= 150) {
    return "Good";
  }

  if (wpm <= 180) {
    return "Fast";
  }

  return "Very fast";
}

function getPaceMessage(wpm) {
  if (wpm === 0) {
    return "Start speaking to measure your pace.";
  }

  if (wpm < 90) {
    return "Your speaking pace is slower than typical interview speech.";
  }

  if (wpm <= 150) {
    return "Your speaking pace is comfortable and interview-friendly.";
  }

  if (wpm <= 180) {
    return "Your speech is slightly fast. Try adding short pauses.";
  }

  return "Your speech is quite fast. Slow down and pause between ideas.";
}

function calculateCommunicationScore({
  wpm,
  fillerCount,
  grammarCount,
  confidence,
  wordCount,
}) {
  if (!wordCount) {
    return 0;
  }

  let score = 100;

  /*
    Pace score.
  */
  if (wpm > 0 && wpm < 80) {
    score -= 12;
  } else if (wpm > 180) {
    score -= 15;
  } else if (wpm > 150) {
    score -= 5;
  }

  /*
    Filler penalty.
  */
  score -= Math.min(fillerCount * 2, 20);

  /*
    Grammar penalty.
  */
  score -= Math.min(grammarCount * 4, 20);

  /*
    Recognition confidence.
  */
  if (confidence > 0) {
    if (confidence >= 0.85) {
      score += 0;
    } else if (confidence >= 0.7) {
      score -= 4;
    } else if (confidence >= 0.5) {
      score -= 8;
    } else {
      score -= 12;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getScoreLabel(score) {
  if (score >= 85) {
    return "Excellent";
  }

  if (score >= 70) {
    return "Good";
  }

  if (score >= 55) {
    return "Needs improvement";
  }

  return "Keep practicing";
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function SpeechAnalysis({
  isActive = false,
  onAnalysisChange = null,
  questionNumber = null,
}) {
  const recognitionRef = useRef(null);

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [confidence, setConfidence] = useState(0);

  const [error, setError] = useState("");

  const [permissionMessage, setPermissionMessage] = useState("");

  const startedAtRef = useRef(null);

  /*
  =========================================================
  CHECK BROWSER SUPPORT
  =========================================================
  */

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    setSupported(true);
  }, []);

  /*
  =========================================================
  CREATE SPEECH RECOGNITION
  =========================================================
  */

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return undefined;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.lang = "en-IN";

    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setListening(true);
      setError("");
      setPermissionMessage("");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      let confidenceValues = [];

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        const result = event.results[i];

        const text = result[0]?.transcript || "";

        if (result.isFinal) {
          finalText += `${text} `;

          if (
            typeof result[0]?.confidence === "number" &&
            result[0].confidence > 0
          ) {
            confidenceValues.push(result[0].confidence);
          }
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        setTranscript((previous) =>
          normalizeText(`${previous} ${finalText}`)
        );
      }

      setInterimTranscript(normalizeText(interimText));

      if (confidenceValues.length > 0) {
        const average =
          confidenceValues.reduce(
            (sum, value) => sum + value,
            0
          ) / confidenceValues.length;

        setConfidence(average);
      }
    };

    recognition.onerror = (event) => {
      const errorCode = event?.error || "";

      if (errorCode === "not-allowed") {
        setPermissionMessage(
          "Microphone permission was denied. Please allow microphone access in your browser."
        );
      } else if (errorCode === "audio-capture") {
        setPermissionMessage(
          "No working microphone was detected."
        );
      } else if (errorCode === "no-speech") {
        setError(
          "No speech detected. Continue speaking naturally."
        );
      } else {
        setError(
          `Speech recognition error: ${errorCode || "unknown error"}`
        );
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);

      /*
        Automatically restart while interview is active.
        This is necessary because some browsers stop recognition
        periodically even when continuous=true.
      */

      if (isActive && startedAtRef.current) {
        try {
          recognition.start();
        } catch {
          // Browser may already be restarting.
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        // Ignore cleanup errors.
      }

      recognitionRef.current = null;
    };
  }, [isActive]);

  /*
  =========================================================
  TIMER
  =========================================================
  */

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    if (!startedAtRef.current) {
      startedAtRef.current = Date.now();
    }

    const interval = window.setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startedAtRef.current) / 1000
      );

      setElapsedSeconds(elapsed);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isActive]);

  /*
  =========================================================
  START / STOP RECOGNITION
  =========================================================
  */

  useEffect(() => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    if (isActive) {
      if (!startedAtRef.current) {
        startedAtRef.current = Date.now();
      }

      try {
        recognition.start();
      } catch {
        // Already running.
      }
    } else {
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }

      setListening(false);
    }
  }, [isActive]);

  /*
  =========================================================
  ANALYSIS
  =========================================================
  */

  const analysis = useMemo(() => {
    const combinedTranscript = normalizeText(
      `${transcript} ${interimTranscript}`
    );

    const wordCount = countWords(combinedTranscript);

    const fillerWords = calculateFillerWords(
      combinedTranscript
    );

    const grammarIssues =
      calculateGrammarIssues(combinedTranscript);

    const wpm = calculateWPM(
      wordCount,
      elapsedSeconds
    );

    const communicationScore =
      calculateCommunicationScore({
        wpm,
        fillerCount: fillerWords.length,
        grammarCount: grammarIssues.length,
        confidence,
        wordCount,
      });

    return {
      transcript,
      interimTranscript,
      combinedTranscript,

      wordCount,

      fillerWords,
      fillerCount: fillerWords.length,

      grammarIssues,
      grammarCount: grammarIssues.length,

      wpm,

      paceLabel: getPaceLabel(wpm),

      paceMessage: getPaceMessage(wpm),

      confidence,

      confidencePercentage:
        confidence > 0
          ? Math.round(confidence * 100)
          : 0,

      communicationScore,

      communicationLabel:
        getScoreLabel(communicationScore),

      elapsedSeconds,

      duration: formatTime(elapsedSeconds),

      questionNumber,
    };
  }, [
    transcript,
    interimTranscript,
    elapsedSeconds,
    confidence,
    questionNumber,
  ]);

  /*
  =========================================================
  SEND ANALYSIS TO PARENT
  =========================================================
  */

  useEffect(() => {
    if (typeof onAnalysisChange === "function") {
      onAnalysisChange(analysis);
    }
  }, [analysis, onAnalysisChange]);

  /*
  =========================================================
  CLEAR TRANSCRIPT
  =========================================================
  */

  const clearTranscript = () => {
    setTranscript("");
    setInterimTranscript("");
    setConfidence(0);
    setElapsedSeconds(0);
    setError("");

    startedAtRef.current = isActive
      ? Date.now()
      : null;
  };

  /*
  =========================================================
  BROWSER NOT SUPPORTED
  =========================================================
  */

  if (!supported) {
    return (
      <section className="speech-analysis-card">
        <div className="speech-analysis-header">
          <div>
            <span className="speech-eyebrow">
              COMMUNICATION ANALYSIS
            </span>

            <h2>Speech-to-Text</h2>
          </div>

          <div className="speech-icon-large">
            🎙️
          </div>
        </div>

        <div className="speech-unsupported">
          <div className="unsupported-icon">
            🎙
          </div>

          <h3>Speech recognition unavailable</h3>

          <p>
            Your current browser does not support the Web
            Speech API. Please use a supported browser such as
            Microsoft Edge or Google Chrome for live
            transcription.
          </p>
        </div>
      </section>
    );
  }

  /*
  =========================================================
  MAIN UI
  =========================================================
  */

  return (
    <section className="speech-analysis-card">
      {/* HEADER */}

      <div className="speech-analysis-header">
        <div>
          <span className="speech-eyebrow">
            SMART ANALYSIS
          </span>

          <h2>Speech & Communication</h2>

          <p>
            Real-time analysis of your interview response
          </p>
        </div>

        <div
          className={`speech-live-badge ${
            listening ? "active" : ""
          }`}
        >
          <span className="speech-live-dot"></span>

          {listening ? "Listening" : "Standby"}
        </div>
      </div>

      {/* LIVE TRANSCRIPT */}

      <div className="transcript-section">
        <div className="section-heading-row">
          <div>
            <span>LIVE TRANSCRIPT</span>

            <strong>
              {analysis.wordCount} words
            </strong>
          </div>

          <button
            type="button"
            className="clear-transcript-btn"
            onClick={clearTranscript}
          >
            Clear
          </button>
        </div>

        <div
          className={`transcript-box ${
            listening ? "listening" : ""
          }`}
        >
          {analysis.combinedTranscript ? (
            <>
              <span className="final-transcript">
                {analysis.transcript}
              </span>

              {analysis.interimTranscript && (
                <span className="interim-transcript">
                  {" "}
                  {analysis.interimTranscript}
                </span>
              )}
            </>
          ) : (
            <div className="transcript-placeholder">
              <span>🎙️</span>

              <div>
                <strong>
                  {isActive
                    ? "Listening for your answer..."
                    : "Speech recognition ready"}
                </strong>

                <p>
                  {isActive
                    ? "Speak naturally. Your response will appear here in real time."
                    : "Start the interview to begin speech recognition."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ERRORS */}

      {permissionMessage && (
        <div className="speech-alert permission">
          <span>⚠️</span>

          <div>
            <strong>Microphone permission</strong>

            <p>{permissionMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="speech-alert">
          <span>ℹ️</span>

          <p>{error}</p>
        </div>
      )}

      {/* METRICS */}

      <div className="speech-metrics-grid">
        {/* WPM */}

        <div className="speech-metric">
          <div className="metric-icon">⏱️</div>

          <div className="metric-content">
            <span>Speech Pace</span>

            <strong>
              {analysis.wpm > 0
                ? `${analysis.wpm} WPM`
                : "--"}
            </strong>

            <small>
              {analysis.paceLabel}
            </small>
          </div>
        </div>

        {/* FILLERS */}

        <div className="speech-metric">
          <div className="metric-icon">🔤</div>

          <div className="metric-content">
            <span>Filler Words</span>

            <strong>
              {analysis.fillerCount}
            </strong>

            <small>
              {analysis.fillerCount === 0
                ? "Excellent"
                : analysis.fillerCount <= 3
                ? "Low"
                : "Reduce fillers"}
            </small>
          </div>
        </div>

        {/* CONFIDENCE */}

        <div className="speech-metric">
          <div className="metric-icon">🎯</div>

          <div className="metric-content">
            <span>Recognition</span>

            <strong>
              {analysis.confidencePercentage > 0
                ? `${analysis.confidencePercentage}%`
                : "--"}
            </strong>

            <small>
              {analysis.confidencePercentage >= 80
                ? "Clear"
                : analysis.confidencePercentage >= 60
                ? "Fair"
                : "Waiting"}
            </small>
          </div>
        </div>

        {/* TIME */}

        <div className="speech-metric">
          <div className="metric-icon">🕐</div>

          <div className="metric-content">
            <span>Speaking Time</span>

            <strong>
              {analysis.duration}
            </strong>

            <small>
              Live measurement
            </small>
          </div>
        </div>
      </div>

      {/* COMMUNICATION SCORE */}

      <div className="communication-score-section">
        <div className="score-heading">
          <div>
            <span>COMMUNICATION QUALITY</span>

            <h3>
              Overall Communication
            </h3>
          </div>

          <div className="score-number">
            {analysis.communicationScore}
            <small>/100</small>
          </div>
        </div>

        <div className="score-progress">
          <div
            className="score-progress-fill"
            style={{
              width: `${analysis.communicationScore}%`,
            }}
          />
        </div>

        <div className="score-footer">
          <span>
            {analysis.communicationLabel}
          </span>

          <span>
            {analysis.paceMessage}
          </span>
        </div>
      </div>

      {/* ANALYSIS DETAILS */}

      <div className="analysis-details-grid">
        {/* GRAMMAR */}

        <div className="analysis-detail-card">
          <div className="detail-card-header">
            <div className="detail-icon">
              ✍️
            </div>

            <div>
              <span>GRAMMAR</span>

              <strong>
                {analysis.grammarCount === 0
                  ? "Good"
                  : `${analysis.grammarCount} issue${
                      analysis.grammarCount > 1
                        ? "s"
                        : ""
                    }`}
              </strong>
            </div>
          </div>

          {analysis.grammarIssues.length > 0 ? (
            <div className="detail-list">
              {analysis.grammarIssues
                .slice(0, 3)
                .map((issue, index) => (
                  <div
                    className="detail-list-item"
                    key={`${issue.message}-${index}`}
                  >
                    <span>•</span>

                    <p>{issue.message}</p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="detail-empty">
              No basic grammar issues detected.
            </p>
          )}
        </div>

        {/* FILLERS */}

        <div className="analysis-detail-card">
          <div className="detail-card-header">
            <div className="detail-icon">
              🔤
            </div>

            <div>
              <span>FILLER WORDS</span>

              <strong>
                {analysis.fillerCount === 0
                  ? "None detected"
                  : `${analysis.fillerCount} detected`}
              </strong>
            </div>
          </div>

          {analysis.fillerWords.length > 0 ? (
            <div className="filler-tags">
              {[
                ...new Set(
                  analysis.fillerWords
                ),
              ]
                .slice(0, 8)
                .map((word) => (
                  <span key={word}>
                    {word}
                  </span>
                ))}
            </div>
          ) : (
            <p className="detail-empty">
              Great! Your response contains very few
              common filler words.
            </p>
          )}
        </div>
      </div>

      {/* SPEECH QUALITY */}

      <div className="speech-quality-row">
        <div className="quality-icon">
          🗣️
        </div>

        <div className="quality-content">
          <strong>
            Speech Quality
          </strong>

          <p>
            {analysis.confidencePercentage >= 80
              ? "Your speech is being recognized clearly. Continue maintaining a natural speaking style."
              : analysis.confidencePercentage >= 60
              ? "Your speech is moderately clear. Try speaking a little more clearly and at a steady pace."
              : "Keep speaking naturally. More speech data is needed to evaluate clarity."}
          </p>
        </div>

        <div className="quality-score">
          {analysis.confidencePercentage > 0
            ? `${analysis.confidencePercentage}%`
            : "--"}
        </div>
      </div>

      {/* FOOTER NOTE */}

      <div className="speech-analysis-note">
        <span>✨</span>

        <p>
          Communication metrics are automated signals
          intended to support interview practice. They are
          not a psychological or professional diagnosis.
        </p>
      </div>
    </section>
  );
}

export default SpeechAnalysis;