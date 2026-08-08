/**
 * Optional — run after db/seed.js to populate the platform with
 * realistic demo data so every dashboard has something to show:
 *   node db/seedDemo.js
 *
 * Creates a few candidate/recruiter/coach accounts (all password:
 * demo123), a spread of completed + scheduled interviews, a couple
 * of job openings, and some notifications. Safe to re-run — it
 * skips any demo user that already exists.
 */
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateAssessment } = require('../utils/aiEngine');

const DEMO_PASSWORD = 'demo123';

const DEMO_USERS = [
  { fullName: 'Rahul Sharma', email: 'rahul@gmail.com', role: 'candidate' },
  { fullName: 'Neha Verma', email: 'neha@gmail.com', role: 'candidate' },
  { fullName: 'Amit Kumar', email: 'amit@gmail.com', role: 'candidate' },
  { fullName: 'Priya Singh', email: 'priya@gmail.com', role: 'recruiter' },
  { fullName: 'Sanjay Rao', email: 'sanjay.coach@gmail.com', role: 'coach' },
];

const INTERVIEW_TYPES = ['Java Developer', 'Python Developer', 'Frontend Developer', 'HR Interview', 'Data Analyst'];

async function ensureUser({ fullName, email, role }) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password, role, auth_provider)
     VALUES ($1, $2, $3, $4, 'local') RETURNING id`,
    [fullName, email, hashed, role]
  );
  return result.rows[0].id;
}

async function seedInterviewsFor(candidateId) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM interviews WHERE candidate_id = $1', [candidateId]);
  if (Number(rows[0].count) > 0) return; // already seeded

  // A few completed interviews spread over the last two weeks.
  for (let i = 0; i < 3; i += 1) {
    const type = INTERVIEW_TYPES[Math.floor(Math.random() * INTERVIEW_TYPES.length)];
    const a = generateAssessment();
    const daysAgo = (i + 1) * 4;
    await pool.query(
      `INSERT INTO interviews
         (candidate_id, interview_type, mode, status, score,
          skill_communication, skill_technical, skill_confidence, skill_problem_solving,
          ai_feedback, scheduled_at, completed_at)
       VALUES ($1, $2, 'online', 'completed', $3, $4, $5, $6, $7, $8,
               NOW() - ($9 || ' days')::interval, NOW() - ($9 || ' days')::interval)`,
      [
        candidateId,
        type,
        a.score,
        a.skillCommunication,
        a.skillTechnical,
        a.skillConfidence,
        a.skillProblemSolving,
        a.aiFeedback,
        daysAgo,
      ]
    );
  }

  // One upcoming scheduled session, today, so it shows up on
  // coach/recruiter "today's schedule" tables.
  const type = INTERVIEW_TYPES[Math.floor(Math.random() * INTERVIEW_TYPES.length)];
  await pool.query(
    `INSERT INTO interviews (candidate_id, interview_type, mode, status, scheduled_at)
     VALUES ($1, $2, 'online', 'scheduled', CURRENT_DATE + interval '3 hours')`,
    [candidateId, type]
  );
}

async function seedJobs(recruiterId) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM job_openings');
  if (Number(rows[0].count) > 0) return;

  const jobs = [
    ['Java Backend Developer', 'Engineering', 3],
    ['Frontend Engineer (React)', 'Engineering', 2],
    ['Data Analyst', 'Data', 1],
  ];
  for (const [title, department, positions] of jobs) {
    await pool.query(
      `INSERT INTO job_openings (title, department, positions, created_by)
       VALUES ($1, $2, $3, $4)`,
      [title, department, positions, recruiterId]
    );
  }
}

async function seedNotifications() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM notifications');
  if (Number(rows[0].count) > 0) return;

  await pool.query(
    `INSERT INTO notifications (role, title, message) VALUES
       ('admin', 'Database Backup', 'Daily backup completed successfully at 02:00 AM.'),
       ('admin', 'System Status', 'All platform services are running normally.'),
       ('recruiter', 'Hiring Report Generated', 'Monthly hiring report is ready for download.'),
       ('coach', 'New Candidates Assigned', 'New candidates have been assigned to you.')`
  );
}

async function seedDemo() {
  const ids = {};
  for (const u of DEMO_USERS) {
    ids[u.email] = await ensureUser(u);
  }

  const candidateEmails = DEMO_USERS.filter((u) => u.role === 'candidate').map((u) => u.email);
  for (const email of candidateEmails) {
    await seedInterviewsFor(ids[email]);
  }

  const recruiterEmail = DEMO_USERS.find((u) => u.role === 'recruiter').email;
  await seedJobs(ids[recruiterEmail]);
  await seedNotifications();

  console.log('Demo data seeded. Demo accounts use password:', DEMO_PASSWORD);
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
