/* ── Color Constants ── */
const INDIGO = '#6366f1';
const CYAN = '#06b6d4';
const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const ROSE = '#f43f5e';

/* ── Data ── */
const perfData = [
  { week: 'W1', confidence: 52, fluency: 45, technical: 38 },
  { week: 'W2', confidence: 61, fluency: 55, technical: 50 },
  { week: 'W3', confidence: 58, fluency: 62, technical: 57 },
  { week: 'W4', confidence: 70, fluency: 68, technical: 65 },
  { week: 'W5', confidence: 76, fluency: 74, technical: 72 },
  { week: 'W6', confidence: 83, fluency: 80, technical: 79 },
];

const sessions = [
  { title: 'Software Engineer – Technical', date: 'Jul 22, 2025', score: 83, type: 'Technical', status: 'Completed' },
  { title: 'Product Manager – HR Round', date: 'Jul 19, 2025', score: 76, type: 'HR', status: 'Completed' },
  { title: 'Data Analyst – Aptitude', date: 'Jul 14, 2025', score: 91, type: 'Aptitude', status: 'Completed' },
  { title: 'Full Stack – Behavioural', date: 'Jul 10, 2025', score: 68, type: 'Behavioural', status: 'Completed' },
];

const skills = [
  { name: 'Technical Communication', score: 82, color: INDIGO },
  { name: 'Confidence & Presence', score: 76, color: CYAN },
  { name: 'Problem Solving', score: 88, color: EMERALD },
  { name: 'Aptitude & Reasoning', score: 71, color: AMBER },
];

const candidates = [
  { name: 'Aradhya Ray', role: 'Software Engineer', score: 88, sessions: 7, status: 'Top Pick', trend: '+12' },
  { name: 'Ravi Verma', role: 'Product Manager', score: 81, sessions: 5, status: 'Shortlisted', trend: '+6' },
  { name: 'Chandan Kumar', role: 'Data Analyst', score: 74, sessions: 4, status: 'Review', trend: '+9' },
  { name: 'Amina Bello', role: 'UX Designer', score: 91, sessions: 8, status: 'Top Pick', trend: '+15' },
  { name: 'Sai Manoj', role: 'Backend Engineer', score: 67, sessions: 3, status: 'Review', trend: '+3' },
  { name: 'Sai Abhi', role: 'Full Stack Dev', score: 85, sessions: 6, status: 'Shortlisted', trend: '+8' },
];

const funnelData = [
  { stage: 'Applied', count: 148 }, { stage: 'Screened', count: 92 }, { stage: 'Interviewed', count: 54 }, { stage: 'Shortlisted', count: 18 }, { stage: 'Hired', count: 6 },
];

const platformData = [
  { month: 'Feb', users: 820, sessions: 1420, reports: 640 },
  { month: 'Mar', users: 1100, sessions: 1890, reports: 820 },
  { month: 'Apr', users: 1380, sessions: 2240, reports: 1050 },
  { month: 'May', users: 1620, sessions: 2780, reports: 1340 },
  { month: 'Jun', users: 2040, sessions: 3420, reports: 1720 },
  { month: 'Jul', users: 2480, sessions: 4110, reports: 2090 },
];

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
};

let charts = {};
