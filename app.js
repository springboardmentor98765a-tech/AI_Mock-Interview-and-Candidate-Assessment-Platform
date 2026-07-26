const ICONS = {
  brain: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>`,
  mic: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  video: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
  trendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
  logOut: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  award: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>`,
  target: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  upload: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
  play: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  barChart2: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  messageSquare: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  alertCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  activity: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>`,
  cpu: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  briefcase: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  filter: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  moreVertical: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  arrowUpRight: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>`,
  arrowDownRight: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 7 17 17"/></svg>`,
  layout: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
  plusCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  building: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
  layers: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>`,
  refreshCw: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
  monitorPlay: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7.75a.75.75 0 0 1 1.142-.638l3.664 2.249a.75.75 0 0 1 0 1.278l-3.664 2.25a.75.75 0 0 1-1.142-.64z"/><path d="M7 21h10"/><rect width="20" height="14" x="2" y="3" rx="2"/></svg>`,
  edit2: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>`,
  downloadLg: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  userCheck: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
};

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

/* ── Helpers ── */
function icon(name, size) {
  let svg = ICONS[name] || '';
  if (size) {
    svg = svg.replace(/width="\d+"/, 'width="' + size + '"').replace(/height="\d+"/, 'height="' + size + '"');
  }
  return svg;
}

function statCard(ic, label, value, delta, color) {
  color = color || INDIGO;
  const positive = delta && delta.startsWith('+');
  return `<div class="stat-card">
    <div class="flex items-center justify-between">
      <div class="stat-icon" style="background:${color}22"><span style="color:${color}">${ic}</span></div>
      ${delta ? `<span class="delta ${positive ? 'positive' : 'negative'}">${positive ? icon('arrowUpRight') : icon('arrowDownRight')} ${delta}</span>` : ''}
    </div>
    <div>
      <p class="stat-value">${value}</p>
      <p class="stat-label">${label}</p>
    </div>
  </div>`;
}

function badge(text, color) {
  color = color || 'indigo';
  return `<span class="badge badge-${color}">${text}</span>`;
}

function sidebarLink(ic, label, key, active) {
  return `<button data-section="${key}" class="sidebar-link ${active ? 'active' : ''}">
    <span class="sidebar-link-icon ${active ? 'active' : ''}">${ic}</span>${label}
  </button>`;
}

function progressBar(value, color) {
  color = color || INDIGO;
  return `<div class="progress-bar"><div class="progress-bar-fill" style="width:${value}%;background:${color}"></div></div>`;
}

function icSize(name, size) {
  return icon(name, size);
}

/* ── Chart drawing ── */
function destroyCharts() {
  Object.values(charts).forEach(function(c) { if (c && c.destroy) c.destroy(); });
  charts = {};
}

function drawAreaChart(canvasId, datasets, labels) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets.map(function(ds) {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color + '33',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: ds.color,
        };
      }),
    },
    options: chartOpts(),
  });
}

function drawBarChart(canvasId, data, labels, colors) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: chartOpts(),
  });
}

function drawGroupedBarChart(canvasId, datasets, labels) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets.map(function(ds) {
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.color,
          borderRadius: 4,
          borderSkipped: false,
        };
      }),
    },
    options: chartOpts(true),
  });
}

function drawLineChart(canvasId, datasets, labels) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets.map(function(ds) {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: ds.color,
        };
      }),
    },
    options: chartOpts(),
  });
}

function drawHorizontalBarChart(canvasId, data, labels, color) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: data.map(function(_, i) {
          var opacity = 1 - i * 0.15;
          return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
        }),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: chartOpts(false, true),
  });
}

function drawPieChart(canvasId, data, labels, colors) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d0f1e',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#6b7094',
          bodyColor: '#e8eaf2',
          padding: 8,
          cornerRadius: 8,
        },
      },
    },
  });
}

function chartOpts(legend, horizontal) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: !!legend, labels: { color: '#6b7094', font: { size: 11 }, boxWidth: 12, padding: 16 } },
      tooltip: {
        backgroundColor: '#0d0f1e',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: '#6b7094',
        bodyColor: '#e8eaf2',
        padding: 8,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: { color: '#6b7094', font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: { color: '#6b7094', font: { size: 11 } },
        border: { display: false },
        min: 0,
        max: horizontal ? undefined : 100,
      },
    },
  };
}

/* ══════════════════════════════════════════════════
   RENDER FUNCTIONS
   ══════════════════════════════════════════════════ */

function renderLoginPage() {
  var roles = [
    { key: 'candidate', label: 'Candidate', desc: 'Practice & get assessed', icon: icon('user', 18), color: INDIGO },
    { key: 'recruiter', label: 'Recruiter', desc: 'Evaluate & compare talent', icon: icon('briefcase', 18), color: CYAN },
    { key: 'admin', label: 'Admin', desc: 'Manage the platform', icon: icon('shield', 18), color: EMERALD },
  ];

  return `<div class="flex min-h-screen" style="background:#06070f">
    <div class="login-left hidden lg:flex flex-col justify-between p-12 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20" style="background:${INDIGO}"></div>
        <div class="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-15" style="background:${CYAN}"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-10" style="background:${EMERALD}"></div>
      </div>
      <div class="relative">
        <div class="flex items-center gap-2 mb-2">
          <div class="logo-icon">${icon('brain', 18)}</div>
          <span class="logo-text">SmartHire AI</span>
        </div>
      </div>
      <div class="relative space-y-8">
        <div>
          <h1 class="login-title">Ace Every<br><span style="color:${INDIGO}">Interview</span><br>With AI</h1>
          <p class="login-subtitle">AI-powered mock interviews, real-time speech analysis, and personalized feedback to accelerate your career.</p>
        </div>
        <div class="grid grid-cols-3 gap-4">
          ${[{ v: '94%', l: 'Placement Rate' }, { v: '12K+', l: 'Candidates' }, { v: '4.9★', l: 'Avg Rating' }].map(function(s) {
            return `<div class="login-stat"><p class="login-stat-value">${s.v}</p><p class="login-stat-label">${s.l}</p></div>`;
          }).join('')}
        </div>
        <div class="login-feature">
          <div class="login-feature-icon">${icon('mic', 16)}</div>
          <div>
            <p class="text-white/80 text-sm font-medium">AI Speech Analysis</p>
            <p class="text-white/40 text-xs mt-0.5">Real-time confidence scoring, filler word detection, and pacing feedback during your interview.</p>
          </div>
        </div>
      </div>
      <p class="relative text-white/20 text-xs">&copy; 2025 SmartHire AI. All rights reserved.</p>
    </div>
    <div class="flex-1 flex items-center justify-center p-8" style="background:#09091a">
      <div class="w-full max-w-md">
        <div class="flex items-center gap-2 mb-8 lg:hidden">
          ${icon('brain', 20)}
          <span class="logo-text">SmartHire AI</span>
        </div>
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-white mb-1" style="font-family:'Outfit',sans-serif">${state.authMode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p class="text-white/40 text-sm">${state.authMode === 'login' ? 'Sign in to your account to continue' : 'Get started with AI-powered interviews'}</p>
        </div>
        <div class="auth-toggle flex rounded-lg p-1 mb-6" style="background:#141627">
          <button class="auth-toggle-btn flex-1 py-2 rounded-md text-sm font-medium transition-all ${state.authMode === 'login' ? 'active' : ''}" data-mode="login" style="${state.authMode === 'login' ? 'background:' + INDIGO + ';color:#fff' : 'color:rgba(255,255,255,0.4)'}">Sign In</button>
          <button class="auth-toggle-btn flex-1 py-2 rounded-md text-sm font-medium transition-all ${state.authMode === 'signup' ? 'active' : ''}" data-mode="signup" style="${state.authMode === 'signup' ? 'background:' + INDIGO + ';color:#fff' : 'color:rgba(255,255,255,0.4)'}">Sign Up</button>
        </div>
        <div class="mb-5">
          <p class="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">Continue as</p>
          <div class="grid grid-cols-3 gap-2">
            ${roles.map(function(r) {
              var sel = state.role === r.key;
              return `<button class="role-btn p-3 rounded-xl border text-left transition-all" data-role="${r.key}" style="${sel ? 'background:' + r.color + '18;border-color:' + r.color + '60' : 'background:#141627;border-color:rgba(255,255,255,0.07)'}">
                <span style="color:${sel ? r.color : 'rgba(255,255,255,0.3)'}">${r.icon}</span>
                <p class="text-xs font-semibold mt-1.5 ${sel ? 'text-white' : 'text-white/50'}">${r.label}</p>
                <p class="text-xs text-white/30 mt-0.5 leading-tight">${r.desc}</p>
              </button>`;
            }).join('')}
          </div>
        </div>
        <div class="space-y-3 mb-5">
          ${state.authMode === 'signup' ? `<div>
            <label class="block text-xs text-white/40 mb-1.5 font-medium">Full Name</label>
            <div class="input-wrap">${icon('user', 15)}<input id="inp-name" value="${state.name}" placeholder="Aradhya Ray" class="form-input" /></div>
          </div>` : ''}
          ${state.authMode === 'signup' && state.role !== 'candidate' ? `<div>
            <label class="block text-xs text-white/40 mb-1.5 font-medium">Organization</label>
            <div class="input-wrap">${icon('building', 15)}<input id="inp-org" value="${state.org}" placeholder="Company / Institution" class="form-input" /></div>
          </div>` : ''}
          <div>
            <label class="block text-xs text-white/40 mb-1.5 font-medium">Email</label>
            <div class="input-wrap">${icon('mail', 15)}<input id="inp-email" value="${state.email}" placeholder="you@example.com" class="form-input" /></div>
          </div>
          <div>
            <label class="block text-xs text-white/40 mb-1.5 font-medium">Password</label>
            <div class="input-wrap">${icon('lock', 15)}<input id="inp-pass" type="password" value="${state.password}" placeholder="••••••••" class="form-input" /></div>
          </div>
        </div>
        ${state.authMode === 'login' ? `<div class="flex justify-end mb-4"><button class="text-xs font-medium" style="color:${INDIGO}">Forgot password?</button></div>` : ''}
        <button id="btn-auth" class="auth-btn w-full py-3 rounded-lg text-white text-sm font-semibold mb-4">${state.authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
        <div class="relative flex items-center gap-3 mb-4"><div class="flex-1 h-px" style="background:rgba(255,255,255,0.08)"></div><span class="text-xs text-white/30">or continue with</span><div class="flex-1 h-px" style="background:rgba(255,255,255,0.08)"></div></div>
        <div class="grid grid-cols-2 gap-3 mb-6">
          <button class="oauth-btn py-2.5 rounded-lg border text-sm font-medium">Google</button>
          <button class="oauth-btn py-2.5 rounded-lg border text-sm font-medium">GitHub</button>
        </div>
        <p class="text-center text-xs text-white/30">
          ${state.authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button id="toggle-auth" class="font-semibold" style="color:${INDIGO}">${state.authMode === 'login' ? 'Sign up' : 'Sign in'}</button>
        </p>
      </div>
    </div>
  </div>`;
}

function renderDashboardLayout(navItems, content, username, avatar) {
  var roleColor = state.role === 'candidate' ? INDIGO : state.role === 'recruiter' ? CYAN : EMERALD;
  var badgeColor = state.role === 'candidate' ? 'indigo' : state.role === 'recruiter' ? 'cyan' : 'emerald';
  return `<div class="flex h-screen overflow-hidden" style="font-family:'Inter',sans-serif;background:#06070f">
    <div class="sidebar flex flex-col border-r border-white/6" style="background:#09091a">
      <div class="p-5 border-b border-white/6">
        <div class="flex items-center gap-2">
          <div class="sidebar-logo">${icon('brain', 16)}</div>
          <div><p class="logo-text-sm">SmartHire AI</p>${badge(state.role, badgeColor)}</div>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto" id="sidebar-nav">
        ${navItems.map(function(item) { return sidebarLink(item.icon, item.label, item.key, state.section === item.key); }).join('')}
      </nav>
      <div class="p-3 border-t border-white/6">
        <div class="flex items-center gap-2 p-2 rounded-lg mb-2" style="background:#141627">
          <div class="user-avatar-sm" style="background:${roleColor}">${avatar}</div>
          <div class="flex-1 min-w-0"><p class="text-white text-xs font-medium truncate">${username}</p><p class="text-white/40 text-xs truncate capitalize">${state.role}</p></div>
        </div>
        <button id="btn-logout" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 transition-all">${icon('logOut')} Log out</button>
      </div>
    </div>
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="topbar shrink-0 flex items-center justify-between px-6 border-b border-white/6" style="background:#09091a">
        <div class="search-input-wrap">${icon('search', 14)}<input id="inp-search" value="${state.search}" placeholder="Search..." class="search-input" /></div>
        <div class="flex items-center gap-3">
          <button class="notif-btn relative">${icon('bell')}<span class="notif-dot"></span></button>
          <div class="user-avatar-sm" style="background:${roleColor}">${avatar}</div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-6" id="main-content">${content}</div>
    </div>
  </div>`;
}

/* ── Candidate Sections ── */
function candidateOverview() {
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Good morning, Adaeze 👋</h1><p class="text-white/40 text-sm mt-1">You have 2 recommended interviews scheduled today.</p></div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${statCard(icon('play', 18), 'Sessions Completed', '24', '+3 this week', INDIGO)}
      ${statCard(icon('star', 18), 'Avg. Score', '79%', '+4.2%', CYAN)}
      ${statCard(icon('trendingUp', 18), 'Improvement', '+31pts', '+8.7%', EMERALD)}
      ${statCard(icon('award', 18), 'Top Skill', 'Aptitude', null, AMBER)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-5">
          <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Performance Trend</p><p class="text-white/35 text-xs mt-0.5">Last 6 weeks</p></div>
          <div class="flex items-center gap-4 text-xs text-white/40">
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${INDIGO}"></span>Confidence</span>
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${CYAN}"></span>Fluency</span>
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${EMERALD}"></span>Technical</span>
          </div>
        </div>
        <div class="chart-container" style="height:180px"><canvas id="chart-perf-area"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Skill Scores</p>
        <div class="space-y-4">
          ${skills.map(function(s) { return `<div><div class="flex justify-between text-xs mb-1.5"><span class="text-white/60">${s.name}</span><span class="text-white font-mono font-medium">${s.score}%</span></div>${progressBar(s.score, s.color)}</div>`; }).join('')}
        </div>
        <div class="mt-5 pt-4 border-t border-white/7">
          <p class="text-xs text-white/35 mb-1">AI Recommendation</p>
          <p class="text-xs text-white/60 leading-relaxed">Focus on <span style="color:${AMBER}">Aptitude &amp; Reasoning</span> to push your overall score above 80.</p>
        </div>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <div class="flex items-center justify-between mb-4">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Recent Sessions</p>
        <button class="text-xs font-medium flex items-center gap-1" style="color:${INDIGO}">View all ${icon('chevronRight')}</button>
      </div>
      <div class="space-y-2">
        ${sessions.map(function(s) {
          var bc = s.type === 'Technical' ? 'indigo' : s.type === 'HR' ? 'cyan' : s.type === 'Aptitude' ? 'emerald' : 'amber';
          return `<div class="session-row flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all">
            <div class="session-icon">${icon('monitorPlay', 15)}</div>
            <div class="flex-1 min-w-0"><p class="text-white text-xs font-medium truncate">${s.title}</p><p class="text-white/35 text-xs">${s.date}</p></div>
            ${badge(s.type, bc)}
            <div class="text-right"><p class="text-white font-mono text-sm font-semibold">${s.score}%</p></div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function candidateInterviews() {
  var types = [
    { title: 'Technical Interview', desc: 'Data structures, algorithms, system design', icon: icon('cpu', 20), color: INDIGO, duration: '45 min', difficulty: 'Hard' },
    { title: 'HR Round', desc: 'Culture fit, career goals, soft skills', icon: icon('messageSquare', 20), color: CYAN, duration: '30 min', difficulty: 'Medium' },
    { title: 'Behavioural', desc: 'STAR-method situational questions', icon: icon('brain', 20), color: EMERALD, duration: '30 min', difficulty: 'Medium' },
    { title: 'Aptitude Test', desc: 'Logical reasoning, quantitative analysis', icon: icon('target', 20), color: AMBER, duration: '25 min', difficulty: 'Medium' },
  ];
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Mock Interviews</h1><p class="text-white/40 text-sm mt-1">Choose an interview type to begin your AI-powered session.</p></div>
    <div class="grid grid-cols-2 gap-4">
      ${types.map(function(t) {
        return `<div class="interview-card rounded-xl border border-white/7 p-6 hover:border-white/15 transition-all group cursor-pointer" style="background:#0d0f1e">
          <div class="flex items-start justify-between mb-4">
            <div class="interview-icon" style="background:${t.color}20"><span style="color:${t.color}">${t.icon}</span></div>
            <div class="flex gap-2">${badge(t.duration, 'slate')}${badge(t.difficulty, t.difficulty === 'Hard' ? 'rose' : 'amber')}</div>
          </div>
          <h3 class="text-white font-semibold mb-1" style="font-family:'Outfit',sans-serif">${t.title}</h3>
          <p class="text-white/40 text-xs leading-relaxed mb-5">${t.desc}</p>
          <button class="w-full py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90" style="background:${t.color}">${icon('play', 14)} Start Session</button>
        </div>`;
      }).join('')}
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:rgba(99,102,241,0.15)">${icon('video', 18)}</div>
        <div><p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Webcam &amp; Microphone Setup</p><p class="text-white/40 text-xs">Ensure camera and mic are enabled for full AI analysis</p></div>
        <button class="ml-auto px-4 py-2 rounded-lg text-xs font-medium text-white" style="background:${INDIGO}">Test Devices</button>
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${[{ label: 'Eye Contact Tracking', icon: icon('eye', 14) }, { label: 'Speech Recognition', icon: icon('mic', 14) }, { label: 'Confidence Analysis', icon: icon('activity', 14) }].map(function(f) {
          return `<div class="flex items-center gap-2 p-3 rounded-lg border border-white/6" style="background:#141627"><span class="text-emerald-400">${f.icon}</span><div><p class="text-white text-xs font-medium">${f.label}</p><p class="text-emerald-400 text-xs">Ready</p></div></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function candidateAnalytics() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Performance Analytics</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Score by Category</p>
        <div class="chart-container" style="height:220px"><canvas id="chart-cat-bar"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Weekly Progress</p>
        <div class="chart-container" style="height:220px"><canvas id="chart-weekly-line"></canvas></div>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">AI-Generated Feedback</p>
      <div class="space-y-3">
        ${[
          { text: 'Excellent use of the STAR method in behavioural responses. Your structured answers stand out.', icon: icon('checkCircle', 14), color: EMERALD },
          { text: 'Reduce filler words (um, uh) — detected 12 instances in your last session. Practice deliberate pauses.', icon: icon('alertCircle', 14), color: AMBER },
          { text: 'Eye contact dipped during system design questions. Look directly at the camera when explaining diagrams.', icon: icon('eye', 14), color: ROSE },
          { text: 'Your technical vocabulary score is in the top 15% of candidates at your level.', icon: icon('star', 14), color: INDIGO },
        ].map(function(f) {
          return `<div class="flex items-start gap-3 p-3 rounded-lg border border-white/6"><span style="color:${f.color}" class="mt-0.5">${f.icon}</span><p class="text-white/60 text-xs leading-relaxed">${f.text}</p></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function candidateResume() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Resume &amp; Skills</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Upload Resume</p>
        <div class="upload-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer group">
          <div class="upload-icon-wrap">${icon('upload', 20)}</div>
          <p class="text-white/60 text-sm font-medium mb-1">Drag &amp; drop your resume</p>
          <p class="text-white/30 text-xs">PDF, DOCX — up to 5 MB</p>
          <button class="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-white/70 border border-white/10 hover:border-white/20 transition-colors">Browse Files</button>
        </div>
        <div class="mt-4 flex items-center gap-3 p-3 rounded-lg" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2)">
          ${icon('checkCircle', 15)}
          <div><p class="text-white text-xs font-medium">Adaeze_Okonkwo_Resume.pdf</p><p class="text-emerald-400 text-xs">Uploaded &bull; Jul 20, 2025</p></div>
        </div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-1" style="font-family:'Outfit',sans-serif">AI-Extracted Skills</p>
        <p class="text-white/35 text-xs mb-4">Automatically detected from your resume</p>
        <div class="flex flex-wrap gap-2">
          ${['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Python', 'REST APIs', 'System Design', 'Agile', 'CI/CD', 'GraphQL'].map(function(s) {
            return `<span class="skill-tag">${s}</span>`;
          }).join('')}
        </div>
        <div class="mt-4 pt-4 border-t border-white/7">
          <p class="text-xs text-white/35 mb-2">Missing Skills Detected</p>
          <div class="flex flex-wrap gap-2">
            ${['Kubernetes', 'Redis', 'Kafka'].map(function(s) {
              return `<span class="skill-tag-missing">${s}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function candidateHistory() {
  var rows = [
    { title: 'Software Engineer – Technical', type: 'Technical', date: 'Jul 22, 2025', dur: '43 min', score: 83 },
    { title: 'Product Manager – HR Round', type: 'HR', date: 'Jul 19, 2025', dur: '28 min', score: 76 },
    { title: 'Data Analyst – Aptitude', type: 'Aptitude', date: 'Jul 14, 2025', dur: '22 min', score: 91 },
    { title: 'Full Stack – Behavioural', type: 'Behavioural', date: 'Jul 10, 2025', dur: '31 min', score: 68 },
    { title: 'Backend Engineer – Technical', type: 'Technical', date: 'Jul 5, 2025', dur: '47 min', score: 75 },
    { title: 'UX Designer – HR Round', type: 'HR', date: 'Jul 1, 2025', dur: '29 min', score: 80 },
  ];
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview History</h1>
      <div class="flex gap-2"><button class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/50 border border-white/7 hover:border-white/15 transition-all" style="background:#141627">${icon('filter', 12)} Filter</button></div>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['Session', 'Type', 'Date', 'Duration', 'Score', 'Report'].map(function(h) { return `<th class="px-5 py-3.5 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      ${rows.map(function(r) {
        var bc = r.type === 'Technical' ? 'indigo' : r.type === 'HR' ? 'cyan' : r.type === 'Aptitude' ? 'emerald' : 'amber';
        var sc = r.score >= 80 ? 'text-emerald-400' : r.score >= 70 ? 'text-amber-400' : 'text-rose-400';
        return `<tr class="border-b border-white/4 hover:bg-white/2 transition-colors">
          <td class="px-5 py-3.5 text-white/80">${r.title}</td>
          <td class="px-5 py-3.5">${badge(r.type, bc)}</td>
          <td class="px-5 py-3.5 text-white/40">${r.date}</td>
          <td class="px-5 py-3.5 text-white/40 font-mono">${r.dur}</td>
          <td class="px-5 py-3.5"><span class="font-mono font-semibold ${sc}">${r.score}%</span></td>
          <td class="px-5 py-3.5"><button class="flex items-center gap-1 text-white/40 hover:text-indigo-400 transition-colors">${icon('downloadLg', 13)} Download</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>
  </div>`;
}

function candidateReports() {
  var reports = [
    { title: 'Full Performance Report', desc: 'Complete assessment including all interview rounds', size: '2.4 MB', date: 'Jul 22, 2025', color: INDIGO },
    { title: 'Technical Skills Report', desc: 'In-depth analysis of your coding and system design answers', size: '1.1 MB', date: 'Jul 22, 2025', color: CYAN },
    { title: 'Communication Analysis', desc: 'Speech patterns, filler words, pacing, and clarity score', size: '0.8 MB', date: 'Jul 19, 2025', color: EMERALD },
    { title: 'Improvement Roadmap', desc: 'AI-personalized 30-day practice plan and milestones', size: '0.5 MB', date: 'Jul 22, 2025', color: AMBER },
  ];
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Reports</h1>
    <div class="grid grid-cols-2 gap-4">
      ${reports.map(function(r) {
        return `<div class="report-card rounded-xl border border-white/7 p-5 flex items-start gap-4 hover:border-white/15 transition-all" style="background:#0d0f1e">
          <div class="report-icon" style="background:${r.color}20"><span style="color:${r.color}">${icon('fileText', 18)}</span></div>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-semibold" style="font-family:'Outfit',sans-serif">${r.title}</p>
            <p class="text-white/35 text-xs mt-0.5 mb-3">${r.desc}</p>
            <div class="flex items-center justify-between">
              <span class="text-white/25 text-xs font-mono">${r.size} &middot; ${r.date}</span>
              <button class="report-dl-btn flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style="background:${r.color}">${icon('downloadLg', 11)} Download</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ── Recruiter Sections ── */
function recruiterOverview() {
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Recruiter Dashboard</h1><p class="text-white/40 text-sm mt-1">Q3 2025 hiring pipeline overview</p></div>
    <div class="grid grid-cols-4 gap-4">
      ${statCard(icon('users', 18), 'Total Candidates', '148', '+23', CYAN)}
      ${statCard(icon('checkCircle', 18), 'Shortlisted', '18', '+4', EMERALD)}
      ${statCard(icon('monitorPlay', 18), 'Active Sessions', '7', null, AMBER)}
      ${statCard(icon('award', 18), 'Avg. Score', '76%', '+3.1%', INDIGO)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Hiring Funnel</p>
        <div class="chart-container" style="height:200px"><canvas id="chart-funnel"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Top Candidates</p>
        <div class="space-y-3">
          ${candidates.filter(function(c) { return c.status === 'Top Pick' || c.status === 'Shortlisted'; }).slice(0, 5).map(function(c) {
            return `<div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style="background:${CYAN}">${c.name[0]}</div>
              <div class="flex-1 min-w-0"><p class="text-white text-xs font-medium truncate">${c.name}</p><p class="text-white/35 text-xs truncate">${c.role}</p></div>
              <span class="text-white font-mono text-sm font-semibold">${c.score}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function recruiterCandidates() {
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Candidates</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background:${CYAN}">${icon('filter', 14)} Filter</button>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['Candidate', 'Role', 'Score', 'Sessions', 'Trend', 'Status', 'Action'].map(function(h) { return `<th class="px-5 py-4 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      ${candidates.map(function(c) {
        var sc = c.score >= 85 ? 'text-emerald-400' : c.score >= 75 ? 'text-amber-400' : 'text-white/60';
        var bc = c.status === 'Top Pick' ? 'emerald' : c.status === 'Shortlisted' ? 'cyan' : 'amber';
        return `<tr class="border-b border-white/4 hover:bg-white/2 transition-colors">
          <td class="px-5 py-3.5"><div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style="background:${CYAN}">${c.name[0]}</div><span class="text-white/80 font-medium">${c.name}</span></div></td>
          <td class="px-5 py-3.5 text-white/50">${c.role}</td>
          <td class="px-5 py-3.5"><span class="font-mono font-semibold ${sc}">${c.score}%</span></td>
          <td class="px-5 py-3.5 text-white/50 font-mono">${c.sessions}</td>
          <td class="px-5 py-3.5 text-emerald-400 font-mono text-xs">${c.trend}pts</td>
          <td class="px-5 py-3.5">${badge(c.status, bc)}</td>
          <td class="px-5 py-3.5"><button class="text-white/40 hover:text-cyan-400 transition-colors text-xs flex items-center gap-1">${icon('eye', 12)} View</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>
  </div>`;
}

function recruiterCompare() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Candidate Comparison</h1>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Top 3 Candidates &middot; Radar Comparison</p>
      <div class="chart-container" style="height:280px"><canvas id="chart-compare"></canvas></div>
      <div class="flex gap-6 mt-4 justify-center text-xs text-white/40">
        <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${CYAN}"></span>Aradhya Ray</span>
        <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${EMERALD}"></span>Amina Bello</span>
        <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${INDIGO}"></span>Ngozi Eze</span>
      </div>
    </div>
  </div>`;
}

function recruiterTemplates() {
  var templates = [
    { title: 'Senior Software Engineer', rounds: 4, questions: 32, type: 'Technical', color: INDIGO },
    { title: 'Product Manager', rounds: 3, questions: 24, type: 'HR + Behavioural', color: CYAN },
    { title: 'Data Science Intern', rounds: 2, questions: 18, type: 'Aptitude', color: EMERALD },
    { title: 'UX/UI Designer', rounds: 3, questions: 20, type: 'Portfolio + HR', color: AMBER },
  ];
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Interview Templates</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background:${CYAN}">${icon('plusCircle', 14)} New Template</button>
    </div>
    <div class="grid grid-cols-2 gap-4">
      ${templates.map(function(t) {
        var bc = t.type === 'Technical' ? 'indigo' : t.type.includes('HR') ? 'cyan' : t.type === 'Aptitude' ? 'emerald' : 'amber';
        return `<div class="rounded-xl border border-white/7 p-5 hover:border-white/15 transition-all" style="background:#0d0f1e">
          <div class="flex items-start justify-between mb-3"><h3 class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">${t.title}</h3><button class="text-white/30 hover:text-white/60 transition-colors">${icon('moreVertical')}</button></div>
          <div class="flex gap-2 mb-4">${badge(t.type, bc)}</div>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-2.5 rounded-lg" style="background:#141627"><p class="text-white/35">Rounds</p><p class="text-white font-mono font-semibold mt-0.5">${t.rounds}</p></div>
            <div class="p-2.5 rounded-lg" style="background:#141627"><p class="text-white/35">Questions</p><p class="text-white font-mono font-semibold mt-0.5">${t.questions}</p></div>
          </div>
          <div class="mt-3 flex gap-2">
            <button class="flex-1 py-2 rounded-lg text-xs font-medium text-white/60 border border-white/8 hover:border-white/20 hover:text-white/80 transition-all flex items-center justify-center gap-1.5">${icon('edit2', 11)} Edit</button>
            <button class="flex-1 py-2 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5" style="background:${CYAN}">${icon('play', 11)} Use</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function recruiterSessions() {
  var live = [
    { candidate: 'Sai Abhi', role: 'Data Analyst', elapsed: '18:34', status: 'Live', score: 71 },
    { candidate: 'Kalyan Rai', role: 'Backend Engineer', elapsed: '07:12', status: 'Live', score: 64 },
    { candidate: 'Raju Verma', role: 'Product Manager', elapsed: '34:55', status: 'Reviewing', score: 80 },
  ];
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Live Sessions</h1>
    <div class="grid grid-cols-3 gap-4">
      ${live.map(function(s) {
        return `<div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-2 h-2 rounded-full ${s.status === 'Live' ? 'animate-pulse' : ''}" style="background:${s.status === 'Live' ? ROSE : AMBER}"></span>
            <span class="text-xs font-medium" style="color:${s.status === 'Live' ? ROSE : AMBER}">${s.status}</span>
          </div>
          <p class="text-white font-semibold mb-0.5" style="font-family:'Outfit',sans-serif">${s.candidate}</p>
          <p class="text-white/40 text-xs mb-4">${s.role}</p>
          <div class="grid grid-cols-2 gap-2 text-xs mb-4">
            <div class="p-2 rounded-lg" style="background:#141627"><p class="text-white/30">Elapsed</p><p class="text-white font-mono mt-0.5">${s.elapsed}</p></div>
            <div class="p-2 rounded-lg" style="background:#141627"><p class="text-white/30">Live Score</p><p class="text-white font-mono mt-0.5">${s.score}%</p></div>
          </div>
          <button class="w-full py-2 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5" style="background:${CYAN}">${icon('eye', 12)} Monitor</button>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ── Admin Sections ── */
function adminOverview() {
  return `<div class="space-y-6">
    <div><h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Admin Overview</h1><p class="text-white/40 text-sm mt-1">Platform-wide metrics &middot; July 2025</p></div>
    <div class="grid grid-cols-4 gap-4">
      ${statCard(icon('users', 18), 'Total Users', '2,481', '+148', EMERALD)}
      ${statCard(icon('briefcase', 18), 'Recruiters', '84', '+12', CYAN)}
      ${statCard(icon('monitorPlay', 18), 'Sessions This Month', '4,110', '+23%', INDIGO)}
      ${statCard(icon('globe', 18), 'System Uptime', '99.97%', null, EMERALD)}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2 rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <div class="flex items-center justify-between mb-4">
          <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Platform Growth</p>
          <div class="flex gap-4 text-xs text-white/40">
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${EMERALD}"></span>Users</span>
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${INDIGO}"></span>Sessions</span>
            <span class="flex items-center gap-1.5"><span class="legend-dot" style="background:${CYAN}"></span>Reports</span>
          </div>
        </div>
        <div class="chart-container" style="height:200px"><canvas id="chart-growth"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">System Health</p>
        <div class="space-y-3">
          ${[
            { label: 'API Response', value: '142ms', status: 'Healthy', color: EMERALD },
            { label: 'AI Model Latency', value: '380ms', status: 'Healthy', color: EMERALD },
            { label: 'Database Load', value: '34%', status: 'Healthy', color: EMERALD },
            { label: 'Storage Used', value: '61%', status: 'Warning', color: AMBER },
            { label: 'Active Connections', value: '1,247', status: 'Healthy', color: EMERALD },
          ].map(function(s) {
            return `<div class="flex items-center justify-between"><div><p class="text-white/60 text-xs">${s.label}</p><p class="text-white font-mono text-sm font-medium">${s.value}</p></div>${badge(s.status, s.status === 'Healthy' ? 'emerald' : 'amber')}</div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function adminUsers() {
  var users = [
    { name: 'Aradhya Ray', email: 'aradhya@example.com', role: 'Candidate', joined: 'Jun 3, 2025', status: 'Active', sessions: 7 },
    { name: 'Ravi Verma', email: 'ravi@corp.com', role: 'Recruiter', joined: 'May 15, 2025', status: 'Active', sessions: 0 },
    { name: 'Raju Verma', email: 'raju@example.com', role: 'Candidate', joined: 'Jul 1, 2025', status: 'Active', sessions: 8 },
    { name: 'Sai Abhi', email: 'abhi@example.com', role: 'Candidate', joined: 'Jun 28, 2025', status: 'Suspended', sessions: 4 },
    { name: 'Tech Recruits Ltd', email: 'hr@techrecruit.ng', role: 'Recruiter', joined: 'Apr 10, 2025', status: 'Active', sessions: 0 },
    { name: 'Arman Malik', email: 'arman@example.com', role: 'Candidate', joined: 'Jul 15, 2025', status: 'Active', sessions: 6 },
  ];
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">User Management</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style="background:${EMERALD}">${icon('plusCircle', 14)} Add User</button>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <table class="w-full text-xs"><thead><tr class="border-b border-white/6">
        ${['User', 'Email', 'Role', 'Joined', 'Sessions', 'Status', 'Actions'].map(function(h) { return `<th class="px-5 py-4 text-left text-white/35 font-medium">${h}</th>`; }).join('')}
      </tr></thead><tbody>
      ${users.map(function(u) {
        return `<tr class="border-b border-white/4 hover:bg-white/2 transition-colors">
          <td class="px-5 py-3.5"><div class="flex items-center gap-2.5"><div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style="background:${u.role === 'Recruiter' ? CYAN : EMERALD}">${u.name[0]}</div><span class="text-white/80 font-medium">${u.name}</span></div></td>
          <td class="px-5 py-3.5 text-white/40 font-mono">${u.email}</td>
          <td class="px-5 py-3.5">${badge(u.role, u.role === 'Recruiter' ? 'cyan' : 'emerald')}</td>
          <td class="px-5 py-3.5 text-white/40">${u.joined}</td>
          <td class="px-5 py-3.5 text-white/50 font-mono">${u.sessions || '—'}</td>
          <td class="px-5 py-3.5">${badge(u.status, u.status === 'Active' ? 'emerald' : 'rose')}</td>
          <td class="px-5 py-3.5"><div class="flex gap-2"><button class="text-white/30 hover:text-cyan-400 transition-colors">${icon('edit2', 13)}</button><button class="text-white/30 hover:text-rose-400 transition-colors">${icon('alertCircle', 13)}</button></div></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>
  </div>`;
}

function adminAnalytics() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Platform Analytics</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Monthly Sessions</p>
        <div class="chart-container" style="height:200px"><canvas id="chart-monthly-sessions"></canvas></div>
      </div>
      <div class="rounded-xl border border-white/7 p-5 flex flex-col" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">User Distribution</p>
        <div class="flex items-center gap-6 flex-1">
          <div style="width:140px;height:140px"><canvas id="chart-pie" width="140" height="140"></canvas></div>
          <div class="space-y-3">
            ${[{ name: 'Candidates', value: '2,340', color: EMERALD }, { name: 'Recruiters', value: '84', color: CYAN }, { name: 'Admins', value: '12', color: INDIGO }].map(function(d) {
              return `<div class="flex items-center gap-2"><span class="legend-dot" style="background:${d.color}"></span><div><p class="text-white/60 text-xs">${d.name}</p><p class="text-white font-mono text-sm font-semibold">${d.value}</p></div></div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function adminAI() {
  return `<div class="space-y-6">
    <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">AI Configuration</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/7 p-5 space-y-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Model Settings</p>
        ${[
          { label: 'Interview Model', val: 'GPT-4o Fine-tuned' },
          { label: 'Speech Engine', val: 'Whisper v3' },
          { label: 'Vision Model', val: 'MediaPipe Holistic' },
          { label: 'Scoring Engine', val: 'SmartHire-Score-v2' },
        ].map(function(s) {
          return `<div class="flex items-center justify-between"><p class="text-white/50 text-xs">${s.label}</p><span class="ai-model-tag">${s.val}</span></div>`;
        }).join('')}
      </div>
      <div class="rounded-xl border border-white/7 p-5 space-y-5" style="background:#0d0f1e">
        <p class="text-white font-semibold text-sm" style="font-family:'Outfit',sans-serif">Generation Parameters</p>
        <div>
          <div class="flex justify-between text-xs mb-2"><span class="text-white/50">Temperature</span><span class="text-white font-mono" id="temp-val">${state.temp.toFixed(1)}</span></div>
          <input type="range" id="temp-slider" min="0" max="1" step="0.1" value="${state.temp}" class="w-full accent-emerald-400" />
          <div class="flex justify-between text-xs text-white/25 mt-1"><span>Creative</span><span>Precise</span></div>
        </div>
        ${[
          { label: 'Max Questions / Session', val: '15' },
          { label: 'Session Timeout', val: '60 min' },
          { label: 'Confidence Threshold', val: '0.75' },
        ].map(function(s) {
          return `<div class="flex items-center justify-between"><p class="text-white/50 text-xs">${s.label}</p><input value="${s.val}" class="ai-input" /></div>`;
        }).join('')}
        <button class="w-full py-2 rounded-lg text-xs font-medium text-white" style="background:${EMERALD}">Save Configuration</button>
      </div>
    </div>
    <div class="rounded-xl border border-white/7 p-5" style="background:#0d0f1e">
      <p class="text-white font-semibold text-sm mb-4" style="font-family:'Outfit',sans-serif">Active AI Modules</p>
      <div class="grid grid-cols-3 gap-3">
        ${[
          { name: 'Question Generation', desc: 'Dynamically creates interview questions', status: true },
          { name: 'Speech-to-Text', desc: 'Real-time transcription via Whisper', status: true },
          { name: 'Eye Contact Monitor', desc: 'Webcam-based gaze detection', status: true },
          { name: 'Confidence Scorer', desc: 'Voice + visual confidence analysis', status: true },
          { name: 'Skill Extractor', desc: 'NLP-based resume parsing', status: true },
          { name: 'Filler Word Detector', desc: 'Identifies um, uh, like patterns', status: false },
        ].map(function(m) {
          return `<div class="p-3 rounded-lg border border-white/6 flex items-start gap-3" style="background:#141627"><div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style="background:${m.status ? EMERALD : AMBER}"></div><div><p class="text-white/80 text-xs font-medium">${m.name}</p><p class="text-white/30 text-xs mt-0.5">${m.desc}</p></div></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function adminActivity() {
  var logs = [
    { time: '14:32:07', user: 'Aradhya Ray', action: 'Completed Technical Interview Session', type: 'session', ip: '105.112.80.4' },
    { time: '14:28:51', user: 'Ravi Verma', action: 'Created new interview template: Senior SWE', type: 'template', ip: '197.210.76.22' },
    { time: '14:15:20', user: 'Sai Abhi', action: 'Uploaded resume PDF', type: 'upload', ip: '41.58.134.9' },
    { time: '14:02:44', user: 'System', action: 'AI model health check passed', type: 'system', ip: '—' },
    { time: '13:55:18', user: 'Shankar Trivedi', action: 'Login attempt failed (invalid credentials)', type: 'security', ip: '105.112.81.7' },
    { time: '13:44:09', user: 'Kanoj Bhat', action: 'Downloaded Full Performance Report', type: 'report', ip: '197.210.66.30' },
    { time: '13:31:55', user: 'System', action: 'Daily database backup completed', type: 'system', ip: '—' },
    { time: '13:20:37', user: 'Kalyan Rai', action: 'Updated AI model temperature to 0.7', type: 'config', ip: '192.168.1.1' },
  ];
  function typeColor(t) { return t === 'session' ? 'indigo' : t === 'security' ? 'rose' : t === 'system' ? 'emerald' : t === 'config' ? 'amber' : 'slate'; }
  return `<div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white" style="font-family:'Outfit',sans-serif">Activity Log</h1>
      <button class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/50 border border-white/7 hover:border-white/15 transition-all" style="background:#141627">${icon('refreshCw', 12)} Refresh</button>
    </div>
    <div class="rounded-xl border border-white/7 overflow-hidden" style="background:#0d0f1e">
      <div class="px-5 py-3 border-b border-white/6 flex items-center gap-2">${icon('activity', 14)}<span class="text-white/50 text-xs">Live audit trail &middot; ${logs.length} events today</span></div>
      <div class="divide-y divide-white/4">
        ${logs.map(function(l) {
          return `<div class="flex items-center gap-4 px-5 py-3 hover:bg-white/2 transition-colors">
            <span class="text-white/25 font-mono text-xs w-16 shrink-0">${l.time}</span>
            ${badge(l.type, typeColor(l.type))}
            <span class="text-white/60 text-xs font-medium w-32 shrink-0 truncate">${l.user}</span>
            <span class="text-white/40 text-xs flex-1">${l.action}</span>
            <span class="text-white/20 font-mono text-xs w-28 text-right shrink-0">${l.ip}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function placeholderSection(title, desc, ic) {
  return `<div class="flex flex-col items-center justify-center h-80 text-center">
    <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white/20" style="background:#141627">${ic}</div>
    <h2 class="text-xl font-semibold text-white mb-2" style="font-family:'Outfit',sans-serif">${title}</h2>
    <p class="text-white/35 text-sm max-w-sm leading-relaxed">${desc}</p>
  </div>`;
}

/* ══════════════════════════════════════════════════
   MAIN RENDER & EVENT BINDING
   ══════════════════════════════════════════════════ */

function render() {
  destroyCharts();
  var app = document.getElementById('app');

  if (state.page === 'login') {
    app.innerHTML = renderLoginPage();
    bindLoginEvents();
    return;
  }

  var navItems, content, username, avatar;

  if (state.page === 'candidate') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'interviews', label: 'Mock Interviews', icon: icon('monitorPlay') },
      { key: 'analytics', label: 'Analytics', icon: icon('barChart2') },
      { key: 'resume', label: 'Resume & Skills', icon: icon('fileText') },
      { key: 'history', label: 'Interview History', icon: icon('clock') },
      { key: 'reports', label: 'Reports', icon: icon('downloadLg') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var sections = {
      overview: candidateOverview,
      interviews: candidateInterviews,
      analytics: candidateAnalytics,
      resume: candidateResume,
      history: candidateHistory,
      reports: candidateReports,
      settings: function() { return placeholderSection('Settings', 'Manage your account preferences, notifications, and privacy settings.', icon('settings', 32)); },
    };
    content = (sections[state.section] || sections.overview)();
    username = 'Aradhya Ray';
    avatar = 'AO';
  } else if (state.page === 'recruiter') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'candidates', label: 'Candidates', icon: icon('users') },
      { key: 'compare', label: 'Compare', icon: icon('barChart2') },
      { key: 'templates', label: 'Templates', icon: icon('layers') },
      { key: 'sessions', label: 'Sessions', icon: icon('monitorPlay') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var rSections = {
      overview: recruiterOverview,
      candidates: recruiterCandidates,
      compare: recruiterCompare,
      templates: recruiterTemplates,
      sessions: recruiterSessions,
      settings: function() { return placeholderSection('Settings', 'Configure your recruiter preferences and notification settings.', icon('settings', 32)); },
    };
    content = (rSections[state.section] || rSections.overview)();
    username = 'Ravi Verma';
    avatar = 'BU';
  } else if (state.page === 'admin') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'users', label: 'Users', icon: icon('users') },
      { key: 'analytics', label: 'Platform Analytics', icon: icon('barChart2') },
      { key: 'ai', label: 'AI Config', icon: icon('brain') },
      { key: 'activity', label: 'Activity Log', icon: icon('activity') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var aSections = {
      overview: adminOverview,
      users: adminUsers,
      analytics: adminAnalytics,
      ai: adminAI,
      activity: adminActivity,
      settings: function() { return placeholderSection('Platform Settings', 'Configure global platform behaviour, integrations, and security policies.', icon('settings', 32)); },
    };
    content = (aSections[state.section] || aSections.overview)();
    username = 'Kalyan Rai';
    avatar = 'KE';
  }

  app.innerHTML = renderDashboardLayout(navItems, content, username, avatar);
  bindDashboardEvents();
  drawCharts();
}

/* ── Event binding: Login ── */
function bindLoginEvents() {
  document.querySelectorAll('.auth-toggle-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.authMode = this.dataset.mode;
      render();
    });
  });
  document.querySelectorAll('.role-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.role = this.dataset.role;
      render();
    });
  });
  var toggleAuth = document.getElementById('toggle-auth');
  if (toggleAuth) {
    toggleAuth.addEventListener('click', function() {
      state.authMode = state.authMode === 'login' ? 'signup' : 'login';
      render();
    });
  }
  var btnAuth = document.getElementById('btn-auth');
  if (btnAuth) {
    btnAuth.addEventListener('click', function() {
      state.page = state.role;
      state.section = 'overview';
      render();
    });
  }
  var inpEmail = document.getElementById('inp-email');
  if (inpEmail) inpEmail.addEventListener('input', function() { state.email = this.value; });
  var inpPass = document.getElementById('inp-pass');
  if (inpPass) inpPass.addEventListener('input', function() { state.password = this.value; });
  var inpName = document.getElementById('inp-name');
  if (inpName) inpName.addEventListener('input', function() { state.name = this.value; });
  var inpOrg = document.getElementById('inp-org');
  if (inpOrg) inpOrg.addEventListener('input', function() { state.org = this.value; });
}

/* ── Event binding: Dashboard ── */
function bindDashboardEvents() {
  document.querySelectorAll('.sidebar-link').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.section = this.dataset.section;
      render();
    });
  });
  var logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      state.page = 'login';
      state.section = 'overview';
      render();
    });
  }
  var searchInput = document.getElementById('inp-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() { state.search = this.value; });
  }
  var tempSlider = document.getElementById('temp-slider');
  if (tempSlider) {
    tempSlider.addEventListener('input', function() {
      state.temp = parseFloat(this.value);
      var tempVal = document.getElementById('temp-val');
      if (tempVal) tempVal.textContent = state.temp.toFixed(1);
    });
  }
}

/* ── Chart drawing after render ── */
function drawCharts() {
  var labels = perfData.map(function(d) { return d.week; });

  if (document.getElementById('chart-perf-area')) {
    drawAreaChart('chart-perf-area', [
      { label: 'Confidence', data: perfData.map(function(d) { return d.confidence; }), color: INDIGO },
      { label: 'Fluency', data: perfData.map(function(d) { return d.fluency; }), color: CYAN },
      { label: 'Technical', data: perfData.map(function(d) { return d.technical; }), color: EMERALD },
    ], labels);
  }

  if (document.getElementById('chart-cat-bar')) {
    var scoreData = [
      { name: 'Technical', score: 79 }, { name: 'HR', score: 84 }, { name: 'Behavioural', score: 72 }, { name: 'Aptitude', score: 91 },
    ];
    drawBarChart('chart-cat-bar', scoreData.map(function(d) { return d.score; }), scoreData.map(function(d) { return d.name; }), [INDIGO, CYAN, EMERALD, AMBER]);
  }

  if (document.getElementById('chart-weekly-line')) {
    drawLineChart('chart-weekly-line', [
      { label: 'Confidence', data: perfData.map(function(d) { return d.confidence; }), color: INDIGO },
      { label: 'Fluency', data: perfData.map(function(d) { return d.fluency; }), color: CYAN },
    ], labels);
  }

  if (document.getElementById('chart-funnel')) {
    drawHorizontalBarChart('chart-funnel', funnelData.map(function(d) { return d.count; }), funnelData.map(function(d) { return d.stage; }), CYAN);
  }

  if (document.getElementById('chart-compare')) {
    var compareData = [
      { metric: 'Technical', Emeka: 88, Amina: 82, Ngozi: 79 },
      { metric: 'Communication', Emeka: 75, Amina: 91, Ngozi: 83 },
      { metric: 'Confidence', Emeka: 80, Amina: 88, Ngozi: 76 },
      { metric: 'Aptitude', Emeka: 85, Amina: 78, Ngozi: 90 },
      { metric: 'Behavioural', Emeka: 72, Amina: 94, Ngozi: 81 },
    ];
    drawGroupedBarChart('chart-compare', [
      { label: 'Emeka', data: compareData.map(function(d) { return d.Emeka; }), color: CYAN },
      { label: 'Amina', data: compareData.map(function(d) { return d.Amina; }), color: EMERALD },
      { label: 'Ngozi', data: compareData.map(function(d) { return d.Ngozi; }), color: INDIGO },
    ], compareData.map(function(d) { return d.metric; }));
  }

  if (document.getElementById('chart-growth')) {
    drawAreaChart('chart-growth', [
      { label: 'Users', data: platformData.map(function(d) { return d.users; }), color: EMERALD },
      { label: 'Sessions', data: platformData.map(function(d) { return d.sessions; }), color: INDIGO },
      { label: 'Reports', data: platformData.map(function(d) { return d.reports; }), color: CYAN },
    ], platformData.map(function(d) { return d.month; }));
  }

  if (document.getElementById('chart-monthly-sessions')) {
    drawBarChart('chart-monthly-sessions', platformData.map(function(d) { return d.sessions; }), platformData.map(function(d) { return d.month; }), [INDIGO]);
  }

  if (document.getElementById('chart-pie')) {
    drawPieChart('chart-pie', [2340, 84, 12], ['Candidates', 'Recruiters', 'Admins'], [EMERALD, CYAN, INDIGO]);
  }
}

/* ── Initialize ── */
render();
