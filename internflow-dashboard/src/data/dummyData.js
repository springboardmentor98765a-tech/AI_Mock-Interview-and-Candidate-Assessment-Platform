export const CANDIDATE_DATA = {
  name: 'Alex Morgan',
  role: 'Senior Frontend Developer',
  resumeScore: 88,
  interviewScore: 92,
  completedInterviews: 14,
  improvement: 24,
  atsScore: 94,
  formattingScore: 88,
  weeklyGrowth: 18,
  topPercentile: 5,
  
  recentSessions: [
    { date: 'Oct 24, 2026 - 14:30', role: 'Senior Frontend Engineer', type: 'Technical & React', duration: '45 mins', score: 94, status: 'Completed' },
    { date: 'Oct 21, 2026 - 10:15', role: 'Fullstack Engineer', type: 'System Design', duration: '30 mins', score: 88, status: 'Completed' },
    { date: 'Oct 18, 2026 - 16:00', role: 'Engineering Lead', type: 'Behavioral & Culture', duration: '35 mins', score: 91, status: 'Completed' },
  ],
  
  progressMetrics: [
    { skill: 'System Architecture', score: 78 },
    { skill: 'Algorithms & Data Struct.', score: 91 },
    { skill: 'React & Frontend', score: 94 },
    { skill: 'System Design', score: 86 },
    { skill: 'Behavioral Skills', score: 89 },
  ],
  
  reports: [
    { name: 'AI_Evaluation_Report.pdf', time: '2 hours ago', size: '2.4 MB' }
  ]
};

export const RECRUITER_DATA = {
  totalCandidates: 1480,
  newThisWeek: 120,
  totalInterviews: 642,
  aiCompleted: 45,
  shortlisted: 128,
  conversionRate: 8.6,
  rejected: 45,
  
  templates: [
    { name: 'Senior React/Node Developer', questions: 12 },
    { name: 'DevOps & Cloud Architect', questions: 15 },
    { name: 'Fullstack Engineer', questions: 10 },
    { name: 'Data Scientist', questions: 14 },
  ],
  
  candidates: [
    { name: 'Sarah Johnson', role: 'Senior Frontend Engineer', resumeScore: 88, interviewScore: 94, status: 'Shortlisted' },
    { name: 'Michael Chen', role: 'Fullstack Node Developer', resumeScore: 92, interviewScore: 89, status: 'Shortlisted' },
    { name: 'Emily Rodriguez', role: 'DevOps & Cloud Engineer', resumeScore: 84, interviewScore: 86, status: 'Under Review' },
    { name: 'James Thompson', role: 'UI/UX Product Designer', resumeScore: 76, interviewScore: 81, status: 'Scheduled' },
    { name: 'Priya Sharma', role: 'AI / ML Engineer', resumeScore: 96, interviewScore: 95, status: 'Hired' },
    { name: 'David Kim', role: 'Backend Developer', resumeScore: 82, interviewScore: 78, status: 'Under Review' },
    { name: 'Lisa Wang', role: 'Data Analyst', resumeScore: 90, interviewScore: 87, status: 'Shortlisted' },
    { name: 'Robert Miller', role: 'Security Engineer', resumeScore: 79, interviewScore: 83, status: 'Scheduled' },
  ],
  
  liveSessions: [
    { name: 'Marcus Vance', role: 'Lead Backend Engineer', duration: '18m / 45m' }
  ]
};

export const ADMIN_DATA = {
  totalUsers: 3850,
  activeGlobally: 'Active',
  recruiters: 310,
  verifiedOrgs: 'Verified',
  candidates: 3540,
  registeredJobseekers: 'Registered',
  totalInterviews: 12400,
  aiSessions: 'Total AI',
  uptime: 99.98,
  apiLatency: 42,
  cpuLoad: 18,
  
  systemLogs: [
    { timestamp: 'Oct 25, 2026 - 09:42:10', actor: 'admin@smarthire.ai', action: 'Updated AI Technical Question Prompt Weights', ip: '192.168.1.45', status: 'Success' },
    { timestamp: 'Oct 25, 2026 - 08:15:33', actor: 'sarah@nexusinc.com', action: 'Recruiter Account Created & Verified', ip: '104.28.14.90', status: 'Success' },
    { timestamp: 'Oct 24, 2026 - 22:04:19', actor: 'alex.morgan@dev.io', action: 'Submitted Resume for ATS Parsing', ip: '172.56.21.11', status: 'Success' },
    { timestamp: 'Oct 24, 2026 - 19:30:05', actor: 'System Task', action: 'Automated AI Evaluation Index Refresh', ip: '127.0.0.1', status: 'Completed' },
    { timestamp: 'Oct 24, 2026 - 15:11:42', actor: 'david.chen@test.com', action: 'Mock Interview Completed (Score: 89%)', ip: '198.51.100.8', status: 'Success' },
  ]
};