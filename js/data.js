/* ── Color Constants ── */
const INDIGO = '#6366f1';
const CYAN = '#06b6d4';
const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const ROSE = '#f43f5e';

/* ── State ── */
const state = {
  page: 'login',
  authMode: 'login',
  role: 'candidate',
  section: 'overview',
  email: '',
  password: '',
  name: '',
  org: '',
  search: '',
  temp: 0.7,
  authError: '',
  authMessage: '',
  resetToken: '',
  resetPasswordConfirmation: '',
  showPassword: false,
  user: null,
  token: null,
  currentInterview: null,
  currentQuestionIndex: 0,
  sessionMessage: '',
  interviewStream: null,
  voiceCapture: null,
  interviewerAudio: null,
};

let charts = {};
