/**
 * Live-interview workflow controls.
 *
 * Written from three confirmed bugs, each reproduced against the real
 * /voice/ websocket before being fixed:
 *
 *   1. "Next question" silently re-served the current question. The server
 *      sends the lowest question not yet answered or skipped, so asking for
 *      "next" before dealing with the current one returned that same question.
 *      The screen redrew with identical text and looked frozen.
 *
 *   2. There was no way to finish. The only terminal control was "End
 *      session", which reads as abandoning rather than completing.
 *
 *   3. "Next question" and "Skip" must stay separate — they mean different
 *      things for scoring (answered-then-advance vs chose-not-to-answer), so
 *      the gating must never quietly turn one into the other.
 *
 * Run with a dev server and API already up:
 *   node tests/interview-workflow.spec.mjs
 *
 * Not wired into a runner: this repo has no frontend test harness, and this
 * needs a real browser, a real websocket and a real database. It is written to
 * be run by hand and to fail loudly.
 */

import { chromium } from 'playwright';

const APP = process.env.APP_URL ?? 'http://localhost:5453';
const CANDIDATE = { email: 'candidate.demo@smarthire.dev', password: 'Candidate@123' };

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

async function signIn(page) {
  await page.goto(`${APP}/login`);
  await page.waitForSelector('#email');
  await page.fill('#email', CANDIDATE.email);
  await page.fill('#password', CANDIDATE.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/candidate**', { timeout: 20000 });
}

const makeInterview = (page, questionCount) =>
  page.evaluate(async (count) => {
    const { api } = await import('/src/lib/api.js');
    const iv = await api.generateInterview({
      interview_type: 'HR', domain: 'workflow spec', difficulty: 'EASY', question_count: count,
    });
    return iv.id;
  }, questionCount);

const removeInterview = (page, id) =>
  page.evaluate(async (i) => {
    const { api } = await import('/src/lib/api.js');
    await api.deleteInterview(i);
  }, id);

/** Answer the question on screen, and wait for the server to confirm it. */
async function answerCurrent(page) {
  await page.getByRole('button', { name: /answer out loud/i }).click();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: /stop and send/i }).click();
  await page.waitForTimeout(5000);
}

async function main() {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const context = await browser.newContext({ permissions: ['microphone', 'camera'] });
  const page = await context.newPage();

  // Every frame the client sends, so "did it send `next`?" is answerable.
  const sent = [];
  page.on('websocket', (ws) => {
    if (!ws.url().includes('/voice/')) return;
    ws.on('framesent', (f) => {
      try { sent.push(JSON.parse(f.payload).type); } catch { /* binary */ }
    });
  });

  await signIn(page);
  const interviewId = await makeInterview(page, 2);
  await page.goto(`${APP}/interview/live?interview=${interviewId}`);
  await page.waitForTimeout(6000);

  const next = () => page.getByRole('button', { name: /next question/i });
  const start = () => page.getByRole('button', { name: /^Start$/ });
  const finish = () => page.getByRole('button', { name: /finish interview/i });

  try {
    console.log('\nBefore the interview starts');
    check('"Start" is offered, not "Next question"',
      (await start().count()) === 1 && (await next().count()) === 0);
    check('"Finish interview" is not offered yet', (await finish().count()) === 0);

    await start().click();
    await page.waitForTimeout(3500);

    console.log('\n(a) Next question is disabled before the question is dealt with');
    check('a question is on screen', (await page.locator('.quote').count()) > 0);
    check('"Next question" is present but disabled', await next().isDisabled());
    check('the reason is explained on screen',
      (await page.getByText(/answer or skip this question/i).count()) > 0);

    console.log('\n(b) Clicking it while disabled sends no `next` frame');
    const before = sent.filter((t) => t === 'next').length;
    await next().click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const after = sent.filter((t) => t === 'next').length;
    check('no `next` frame was sent', after === before, `next frames ${before} -> ${after}`);
    check('the same question is still on screen', (await page.locator('.quote').count()) > 0);

    console.log('\n(a, cont.) It enables once the question is answered');
    await answerCurrent(page);
    check('"Next question" is now enabled', await next().isEnabled());

    console.log('\n(c) Finish is gated until the last question is resolved');
    check('"Finish interview" is not offered with a question outstanding',
      (await finish().count()) === 0, 'question 2 has not been reached');

    await next().click();
    await page.waitForTimeout(3500);
    check('question 2 was served', await next().isDisabled(), 'gated again on the new question');

    await answerCurrent(page);
    check('"Finish interview" appears once every question is resolved',
      (await finish().count()) === 1);
    check('it is enabled', await finish().isEnabled());

    console.log('\nSkip stays a separate, explicit action');
    check('"Skip" is its own control', (await page.getByRole('button', { name: /^Skip$/ }).count()) === 1);
    check('gating never turned a click into a skip', !sent.includes('skip'),
      'no skip frame was sent at any point');

    console.log('\n(c, cont.) Finish closes the interview and shows the report');
    await finish().click();
    await page.waitForTimeout(6000);
    check('the completion screen is shown',
      (await page.getByText(/interview complete/i).count()) > 0);
    check('an `end` frame was sent', sent.includes('end'));
    check('the report view is reachable',
      (await page.getByRole('button', { name: /back to history/i }).count()) > 0);
  } finally {
    await removeInterview(page, interviewId).catch(() => {});
    await browser.close();
  }

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('spec crashed:', err.message);
  process.exit(1);
});
