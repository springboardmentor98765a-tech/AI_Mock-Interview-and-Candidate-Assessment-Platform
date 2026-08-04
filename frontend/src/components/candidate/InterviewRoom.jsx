import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ChevronRight, Brain } from 'lucide-react';
import { interviewQuestions } from '../../data/mockData';

const QUESTIONS = interviewQuestions;
const SPEECH_SNIPPETS = [
  "In JavaScript, a closure is a function that retains access to its...",
  "The key here is that the inner function captures the outer scope...",
  "For example, we can use closures for data privacy and...",
  "This pattern is also commonly used in module design where...",
  "The main advantage is encapsulation without using classes...",
];

function WaveformBar({ delay, isActive }) {
  const [height, setHeight] = useState(4);
  useEffect(() => {
    if (!isActive) { setHeight(4); return; }
    const interval = setInterval(() => {
      setHeight(Math.floor(8 + Math.random() * 36));
    }, 120 + delay * 30);
    return () => clearInterval(interval);
  }, [isActive, delay]);
  return (
    <div style={{
      width: 4, height, borderRadius: 99, minHeight: 4, maxHeight: 44,
      background: 'linear-gradient(180deg, hsl(252,100%,68%), hsl(280,90%,65%))',
      transition: 'height 0.12s ease',
    }} />
  );
}

function SvgGauge({ value, label, color = 'hsl(252,100%,68%)' }) {
  const r = 36, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={88} height={88}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-medium)" strokeWidth={7} />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transformOrigin: '44px 44px', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text-primary)" fontSize="15" fontFamily="var(--font-heading)" fontWeight="700">
          {value}
        </text>
      </svg>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}

function FaceMeshOverlay() {
  // Simulate face mesh dots on a face-shaped area
  const dots = [
    [44,28],[40,32],[48,32],[44,38],[38,42],[50,42],[36,50],[52,50],[44,58],[40,64],[48,64],[44,72],
    [34,44],[54,44],[32,38],[56,38],[44,20],[38,24],[50,24],
  ];
  return (
    <>
      {dots.map(([x, y], i) => (
        <div key={i} className="face-mesh-dot" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
      {/* Face outline */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="44" cy="48" rx="22" ry="28" stroke="hsl(174,80%,55%)" strokeWidth="0.5" fill="none" />
      </svg>
    </>
  );
}

export default function InterviewRoom() {
  const [started, setStarted] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [speechIdx, setSpeechIdx] = useState(0);
  const [timer, setTimer] = useState(0);
  const [confidence, setConfidence] = useState(78);
  const [pace, setPace] = useState(82);
  const [emotion, setEmotion] = useState(71);
  const [ended, setEnded] = useState(false);
  const timerRef = useRef(null);
  const speakRef = useRef(null);
  const metricsRef = useRef(null);

  useEffect(() => {
    if (started && !ended) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      metricsRef.current = setInterval(() => {
        setConfidence(v => Math.min(98, Math.max(50, v + (Math.random() - 0.45) * 4)));
        setPace(v => Math.min(98, Math.max(40, v + (Math.random() - 0.48) * 3)));
        setEmotion(v => Math.min(95, Math.max(45, v + (Math.random() - 0.47) * 3)));
      }, 1800);
    }
    return () => { clearInterval(timerRef.current); clearInterval(metricsRef.current); };
  }, [started, ended]);

  const toggleSpeaking = () => {
    if (speaking) {
      setSpeaking(false);
      clearInterval(speakRef.current);
      setSpeechText('');
    } else {
      setSpeaking(true);
      const snippet = SPEECH_SNIPPETS[speechIdx % SPEECH_SNIPPETS.length];
      setSpeechIdx(i => i + 1);
      let charIdx = 0;
      setSpeechText('');
      speakRef.current = setInterval(() => {
        charIdx++;
        setSpeechText(snippet.slice(0, charIdx));
        if (charIdx >= snippet.length) clearInterval(speakRef.current);
      }, 38);
    }
  };

  const nextQuestion = () => {
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(i => i + 1);
      setSpeaking(false);
      clearInterval(speakRef.current);
      setSpeechText('');
    } else {
      setEnded(true);
      clearInterval(timerRef.current);
      clearInterval(metricsRef.current);
    }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const q = QUESTIONS[qIndex];

  if (ended) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 'var(--space-6)' }}>
        <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: 'var(--shadow-glow)' }}>🎉</div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>Interview Complete!</h2>
          <p>Great job, Aisha! Your session has been recorded and analyzed.</p>
        </div>
        <div className="grid-3" style={{ gap: 'var(--space-4)' }}>
          <SvgGauge value={Math.round(confidence)} label="Confidence" />
          <SvgGauge value={Math.round(pace)} label="Speech Pace" color="hsl(174,80%,55%)" />
          <SvgGauge value={Math.round(emotion)} label="Positivity" color="hsl(38,95%,60%)" />
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => { setStarted(false); setEnded(false); setQIndex(0); setTimer(0); }}>
          Start New Session
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 'var(--space-8)' }}>
        <div className="animate-float" style={{ width: 100, height: 100, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
          <Brain size={44} color="white" />
        </div>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <h1 style={{ marginBottom: 'var(--space-3)' }}>AI Interview Room</h1>
          <p>You'll be asked {QUESTIONS.length} questions by your AI interviewer. Your video, audio, and metrics will be analyzed in real-time.</p>
        </div>
        <div className="grid-3" style={{ gap: 'var(--space-4)' }}>
          {[{ icon: '🎥', label: 'Webcam Active', sub: 'Face mesh detection' },
            { icon: '🎙️', label: 'Audio Analyzer', sub: 'Real-time speech analysis' },
            { icon: '🧠', label: 'AI Interviewer', sub: 'Gemini 2.0 powered' }].map(f => (
            <div key={f.label} className="card" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>{f.icon}</div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: 4 }}>{f.label}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.sub}</p>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setStarted(true)} id="start-interview-btn">
          <Video size={18} />
          Begin Interview Session
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="interview-room">
        {/* Webcam / Main Panel */}
        <div>
          <div className="webcam-container" style={{ height: '100%', minHeight: 420 }}>
            {/* Simulated webcam feed */}
            <div style={{
              width: '100%', height: '100%', minHeight: 420,
              background: 'radial-gradient(ellipse at 44% 40%, hsl(228,40%,14%) 0%, hsl(222,50%,6%) 100%)',
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {/* Avatar placeholder */}
              <div style={{ position: 'relative' }}>
                <div style={{ width: 140, height: 140, background: 'linear-gradient(135deg, hsl(252,60%,30%), hsl(280,60%,25%))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', userSelect: 'none' }}>
                  👩‍💼
                </div>
                {camOn && <FaceMeshOverlay />}
              </div>

              {/* Webcam Overlay Controls */}
              <div className="webcam-overlay">
                {/* Top Row */}
                <div className="flex justify-between items-center">
                  <span className="live-badge">
                    <span className="live-dot" />
                    LIVE
                  </span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'white', background: 'hsla(0,0%,0%,0.4)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                      {fmt(timer)}
                    </span>
                    <span className="badge badge-primary">Q {qIndex + 1}/{QUESTIONS.length}</span>
                  </div>
                </div>

                {/* Question Banner */}
                <div style={{ marginTop: 'auto' }}>
                  <div className="question-banner">
                    <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-2)' }}>
                      <Brain size={14} color="var(--accent-primary)" />
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Interviewer</span>
                      <span className={`badge badge-${q.difficulty === 'Hard' ? 'danger' : q.difficulty === 'Medium' ? 'warning' : 'success'} badge-sm`} style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
                        {q.difficulty}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 500 }}>{q.text}</p>

                    {/* Speech ticker */}
                    {speaking && (
                      <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'hsla(252,100%,68%,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)' }}>
                        <p style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                          ▶ {speechText}<span style={{ animation: 'blink 0.7s step-end infinite', fontWeight: 700 }}>|</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4" style={{ marginTop: 'var(--space-5)' }}>
            <button className={`btn ${micOn ? 'btn-secondary' : 'btn-danger'}`} onClick={() => setMicOn(v => !v)} id="mic-toggle-btn">
              {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              {micOn ? 'Mic On' : 'Mic Off'}
            </button>
            <button className="btn btn-primary" onClick={toggleSpeaking} id="speak-btn">
              {speaking ? '■ Stop Speaking' : '● Start Speaking'}
            </button>
            <button className={`btn ${camOn ? 'btn-secondary' : 'btn-danger'}`} onClick={() => setCamOn(v => !v)}>
              {camOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
            <button className="btn btn-secondary" onClick={nextQuestion} id="next-question-btn">
              {qIndex < QUESTIONS.length - 1 ? <><ChevronRight size={16} /> Next</> : 'Finish'}
            </button>
            <button className="btn btn-danger" onClick={() => { setEnded(true); clearInterval(timerRef.current); }}>
              <PhoneOff size={16} />
              End
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
          {/* Live Metrics */}
          <div className="card">
            <h4 className="section-title" style={{ marginBottom: 'var(--space-5)' }}>Live Metrics</h4>
            <div className="flex justify-between">
              <SvgGauge value={Math.round(confidence)} label="Confidence" />
              <SvgGauge value={Math.round(pace)} label="Speech Pace" color="hsl(174,80%,55%)" />
              <SvgGauge value={Math.round(emotion)} label="Positivity" color="hsl(38,95%,60%)" />
            </div>
          </div>

          {/* Voice Waveform */}
          <div className="card">
            <h4 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>
              <Mic size={14} color="var(--accent-primary)" />
              Voice Analyzer
            </h4>
            <div className="waveform" style={{ height: 56 }}>
              {Array.from({ length: 24 }, (_, i) => (
                <WaveformBar key={i} delay={i} isActive={speaking && micOn} />
              ))}
            </div>
            <div className="flex justify-between mt-4" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Words/min: <strong style={{ color: 'var(--text-primary)' }}>134</strong></span>
              <span>Filler words: <strong style={{ color: 'var(--accent-amber)' }}>3</strong></span>
              <span>Clarity: <strong style={{ color: 'var(--accent-green)' }}>91%</strong></span>
            </div>
          </div>

          {/* Question List */}
          <div className="card" style={{ flex: 1 }}>
            <h4 className="section-title">Questions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {QUESTIONS.map((ques, i) => (
                <div key={ques.id} style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${i === qIndex ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                  background: i === qIndex ? 'hsla(252,100%,68%,0.06)' : 'transparent',
                  opacity: i > qIndex ? 0.4 : 1,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }} onClick={() => i <= qIndex && setQIndex(i)}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: i < qIndex ? 'var(--accent-green)' : i === qIndex ? 'var(--accent-primary)' : 'var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {i < qIndex ? '✓' : i + 1}
                    </span>
                    <span className={`badge badge-${ques.difficulty === 'Hard' ? 'danger' : ques.difficulty === 'Medium' ? 'warning' : 'success'}`} style={{ fontSize: '0.65rem' }}>
                      {ques.difficulty}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{ques.category}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {ques.text.length > 70 ? ques.text.slice(0, 70) + '...' : ques.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
