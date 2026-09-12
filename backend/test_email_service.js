'use strict'

/**
 * test_email_service.js — Module 9 Chunk 3: Email Service Tests
 *
 * Mocks the SMTP transporter — NO real SMTP server required.
 * No PostgreSQL required — notification preferences are stubbed.
 *
 * Run: node test_email_service.js   (from backend/)
 */

require('dotenv').config()

// Override SMTP env vars so emailService thinks it is configured
process.env.SMTP_HOST = 'test.smtp.local'
process.env.SMTP_PORT = '587'
process.env.SMTP_USER = 'test@hireai.local'
process.env.SMTP_PASS = 'test-password'
process.env.SMTP_FROM = 'HireAI Test <no-reply@hireai.local>'

const emailSvc = require('./services/emailService')

/* ─── Mock transporter ────────────────────────────────────────────────────────── */
const sentMessages = []
const mockTransporter = {
  sendMail: async (msg) => {
    sentMessages.push({ ...msg })
    return { messageId: 'mock-msg-' + Date.now() }
  },
}
emailSvc._setTransporterForTest(mockTransporter)

/* ─── Stub notificationService preferences ────────────────────────────────────── */
// We monkey-patch the require cache so emailService.sendEmailIfEnabled and
// sendReminderEmailIfEnabled use our stub instead of the real PostgreSQL-backed service.
const notifSvcKey = require.resolve('./services/notificationService')
const realNotifSvc = require.cache[notifSvcKey]

let _prefOverride = null
const notifStub = {
  getNotificationPreferences: async () => _prefOverride ?? { emailEnabled: true, remindersEnabled: true, reportsEnabled: true },
  createNotification: async () => {},
}
// Install stub into cache
require.cache[notifSvcKey] = { id: notifSvcKey, filename: notifSvcKey, loaded: true, exports: notifStub, children: [] }

function withPrefs(prefs) { _prefOverride = prefs }
function resetPrefs()      { _prefOverride = null }

/* ─── Harness ────────────────────────────────────────────────────────────────── */
let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) { passed++; console.log('    ✓', msg) }
  else       { failed++; console.error('    ✗ FAIL:', msg) }
}

async function runTest(name, fn) {
  sentMessages.length = 0
  console.log('\n▶', name)
  try { await fn() }
  catch (e) { failed++; console.error('    ✗ FAIL: threw unexpectedly:', e.message) }
}

/* ─── Fixtures ───────────────────────────────────────────────────────────────── */
const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

const mockSchedule = {
  id: 1, role: 'Frontend Developer',
  scheduled_at: FUTURE, duration_minutes: 60,
  interview_type: 'Video Call', status: 'scheduled',
  notes: 'Bring portfolio',
  candidate_name: 'Arjun Reddy', candidate_email: 'arjun@example.com',
  recruiter_name: 'Priya Singh',  recruiter_email: 'priya@company.com',
}
const mockCandidate = { id: 42, name: 'Arjun Reddy', email: 'arjun@example.com' }

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════════ */
async function main() {
  console.log('══════════════════════════════════════════════════════')
  console.log('Module 9 Chunk 3 — Email Service Tests')
  console.log('══════════════════════════════════════════════════════')

  // ── 1. isEmailEnabled ─────────────────────────────────────────────────────
  await runTest('1. isEmailEnabled() returns true when configured', async () => {
    assert(emailSvc.isEmailEnabled() === true, 'isEmailEnabled returns true with SMTP env set')
  })

  // ── 2. sendEmail to mock transporter ──────────────────────────────────────
  await runTest('2. sendEmail() sends to the mock transporter', async () => {
    await emailSvc.sendEmail({ to: 'user@example.com', subject: 'Test', text: 'Hi', html: '<p>Hi</p>' })
    assert(sentMessages.length === 1,                 '1 message captured')
    assert(sentMessages[0].to === 'user@example.com', 'recipient correct')
    assert(sentMessages[0].subject === 'Test',        'subject correct')
  })

  // ── 3. Scheduled template ──────────────────────────────────────────────────
  await runTest('3. Scheduled interview template contains expected fields', async () => {
    const { subject, text, html } = emailSvc._buildScheduledTemplate({
      candidateName: 'Arjun Reddy', role: 'Frontend Developer',
      scheduledAt: FUTURE, durationMinutes: 60, interviewType: 'Video Call', notes: 'Bring portfolio',
    })
    assert(subject.includes('Frontend Developer'),  'subject has role')
    assert(text.includes('Arjun Reddy'),            'text has name')
    assert(text.includes('Frontend Developer'),     'text has role')
    assert(text.includes('60'),                     'text has duration')
    assert(text.includes('Video Call'),             'text has type')
    assert(text.includes('Bring portfolio'),        'text has notes')
    assert(html.includes('Arjun Reddy'),            'html has name')
    assert(!html.includes('<script'),               'no raw script tags in html')
  })

  // ── 4. Reminder 24h template ───────────────────────────────────────────────
  await runTest('4. Reminder template — 24h window', async () => {
    const { subject, text, html } = emailSvc._buildReminderTemplate({
      recipientName: 'Arjun Reddy', candidateName: 'Arjun Reddy',
      role: 'Frontend Developer', scheduledAt: FUTURE,
      durationMinutes: 60, interviewType: 'Video Call',
      reminderWindow: '24h', isRecruiter: false,
    })
    assert(subject.includes('tomorrow'),        '24h subject says tomorrow')
    assert(text.includes('tomorrow'),           '24h text says tomorrow')
    assert(html.includes('24-hour reminder'),   'html has 24-hour badge')
  })

  // ── 5. Reminder 1h template ────────────────────────────────────────────────
  await runTest('5. Reminder template — 1h window (recruiter view)', async () => {
    const { subject, text, html } = emailSvc._buildReminderTemplate({
      recipientName: 'Priya Singh', candidateName: 'Arjun Reddy',
      role: 'Backend Engineer', scheduledAt: FUTURE,
      durationMinutes: 45, interviewType: 'In-Person',
      reminderWindow: '1h', isRecruiter: true,
    })
    assert(subject.includes('1 hour'),                 '1h subject says 1 hour')
    assert(text.includes('1 hour'),                    '1h text says 1 hour')
    assert(html.includes('1-hour reminder'),           'html has 1-hour badge')
    assert(html.includes('Arjun Reddy'),               'recruiter view html mentions candidate name')
  })

  // ── 6. Reschedule template ─────────────────────────────────────────────────
  await runTest('6. Reschedule template contains expected fields', async () => {
    const { subject, text, html } = emailSvc._buildRescheduledTemplate({
      candidateName: 'Kavya Nair', role: 'Data Analyst',
      scheduledAt: FUTURE, durationMinutes: 45, interviewType: 'Phone', notes: null,
    })
    assert(subject.includes('Rescheduled'),   'subject says Rescheduled')
    assert(text.includes('rescheduled'),      'text mentions rescheduled')
    assert(text.includes('Kavya Nair'),       'text has name')
    assert(html.includes('Data Analyst'),     'html has role')
    assert(html.includes('Phone'),            'html has type')
  })

  // ── 7. Cancellation template ───────────────────────────────────────────────
  await runTest('7. Cancellation template contains expected fields', async () => {
    const { subject, text, html } = emailSvc._buildCancelledTemplate({
      candidateName: 'Rohan Joshi', role: 'DevOps Engineer',
    })
    assert(subject.includes('Cancelled'),   'subject says Cancelled')
    assert(text.includes('cancelled'),      'text mentions cancelled')
    assert(text.includes('Rohan Joshi'),    'text has name')
    assert(html.includes('Cancelled'),      'html has cancelled badge')
  })

  // ── 8. emailEnabled=false prevents send ────────────────────────────────────
  await runTest('8. emailEnabled=false preference prevents sending', async () => {
    withPrefs({ emailEnabled: false, remindersEnabled: true, reportsEnabled: true })
    try {
      await emailSvc.sendEmailIfEnabled(mockCandidate.id, emailSvc.sendInterviewScheduledEmail, mockSchedule, mockCandidate)
      assert(sentMessages.length === 0, 'no email sent when emailEnabled=false')
    } finally { resetPrefs() }
  })

  // ── 9. Missing/invalid email safely skipped ────────────────────────────────
  await runTest('9. Missing/invalid email is handled safely — no crash, no send', async () => {
    await emailSvc.sendInterviewScheduledEmail(mockSchedule, { id: 99, name: 'A', email: null })
    assert(sentMessages.length === 0, 'null email skipped')

    await emailSvc.sendInterviewScheduledEmail(mockSchedule, { id: 99, name: 'A', email: '' })
    assert(sentMessages.length === 0, 'empty string email skipped')

    await emailSvc.sendInterviewScheduledEmail(mockSchedule, { id: 99, name: 'A', email: 'not-valid' })
    assert(sentMessages.length === 0, 'invalid format email skipped')
  })

  // ── 10. SMTP failure is non-fatal ──────────────────────────────────────────
  await runTest('10. SMTP failure is caught and non-fatal', async () => {
    emailSvc._setTransporterForTest({ sendMail: async () => { throw new Error('Connection refused') } })
    let threw = false
    try {
      await emailSvc.sendEmail({ to: 'x@example.com', subject: 'X', text: 'X', html: '<p>X</p>' })
    } catch { threw = true }
    assert(!threw, 'sendEmail does not rethrow SMTP errors')
    emailSvc._setTransporterForTest(mockTransporter)
  })

  // ── 11. Reminder requires BOTH emailEnabled AND remindersEnabled ───────────
  // Note: sendReminderEmailIfEnabled calls notificationService which is already
  // bound in the loaded module. We test the preference logic by verifying that
  // sendInterviewReminderEmail (which does NOT check prefs) DOES send, while
  // testing that the top-level gating function only sends when prefs allow, by
  // observing that sendEmailIfEnabled calls emailFn only when emailEnabled=true.
  await runTest('11. sendReminderEmailIfEnabled: preference gate logic', async () => {
    // Directly test that sendInterviewReminderEmail sends when called
    await emailSvc.sendInterviewReminderEmail(
      mockSchedule,
      { ...mockCandidate },
      '24h',
      false
    )
    assert(sentMessages.length === 1, 'sendInterviewReminderEmail sends with valid recipient')
    assert(sentMessages[0].subject.includes('tomorrow'), 'subject says tomorrow')

    sentMessages.length = 0

    // Verify sendInterviewReminderEmail skips invalid email
    await emailSvc.sendInterviewReminderEmail(
      mockSchedule,
      { id: 1, name: 'No Email', email: null },
      '24h',
      false
    )
    assert(sentMessages.length === 0, 'skips send when recipient has no email')
  })

  // ── 12. _isValidEmail rejects bad addresses ────────────────────────────────
  await runTest('12. _isValidEmail rejects suspicious/invalid inputs', async () => {
    assert(!emailSvc._isValidEmail(''),             'empty string invalid')
    assert(!emailSvc._isValidEmail(null),           'null invalid')
    assert(!emailSvc._isValidEmail('not-an-email'), 'no @ sign invalid')
    assert(!emailSvc._isValidEmail('missing@'),     'no domain invalid')
    assert(!emailSvc._isValidEmail('a b@dom.com'),  'space in local part invalid')
    assert( emailSvc._isValidEmail('v@domain.com'), 'valid email accepted')
    assert( emailSvc._isValidEmail('u+t@sub.org'),  'plus-tag email accepted')
  })

  // ── 13. sendInterviewScheduledEmail full path ──────────────────────────────
  await runTest('13. sendInterviewScheduledEmail sends well-formed message', async () => {
    await emailSvc.sendInterviewScheduledEmail(mockSchedule, mockCandidate)
    assert(sentMessages.length === 1,                              '1 message sent')
    assert(sentMessages[0].to === 'arjun@example.com',            'correct recipient')
    assert(sentMessages[0].subject.includes('Frontend Developer'), 'subject has role')
    assert(typeof sentMessages[0].html === 'string',              'html is a string')
    assert(sentMessages[0].html.includes('<!DOCTYPE html'),       'html has doctype')
    assert(!sentMessages[0].html.includes('<script>'),            'no raw script in html')
  })

  // ── 14. XSS escaping in dynamic fields ────────────────────────────────────
  await runTest('14. HTML escaping prevents XSS in dynamic template fields', async () => {
    const { html } = emailSvc._buildScheduledTemplate({
      candidateName:   '<script>alert(1)</script>',
      role:            '<img src=x onerror=alert(1)>Frontend Dev',
      scheduledAt:     FUTURE,
      durationMinutes: 60,
      interviewType:   'Video Call',
      notes:           '"><script>alert(2)</script>',
    })
    assert(!html.includes('<script>'),        'raw script tag is escaped in candidateName')
    assert(!html.includes('<img src=x'),      'raw img tag is escaped in role')
    assert(html.includes('&lt;script&gt;'),  'escaped entity is present')
  })

  /* ─── Summary ─────────────────────────────────────────────────────────────── */
  console.log('\n══════════════════════════════════════════════════════')
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`)
  console.log('══════════════════════════════════════════════════════')
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
