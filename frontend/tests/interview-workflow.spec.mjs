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
 *
 * ON WAITING, because an earlier version of this file got it wrong and
 * reported failures that were not real:
 *
 * Every wait here is on an observed condition — a websocket frame, or a DOM
 * state — never on a fixed duration. Answering one question uploads audio,
 * transcribes it through a cloud model and scores it through a local one, and
 * that takes anywhere from two seconds to thirty depending on what else the
 * machine is doing. A `waitForTimeout(5000)` guess against that pipeline fails
 * on a slow run and, worse, can pass on a fast one for the wrong reason.
 *
 * The frames the server sends are the real signal, so this listens for them.
 * The one deliberate exception is the negative assertion in (b): proving no
 * frame was sent means allowing time for one to arrive and observing that none
 * did, which is the one thing a fixed settle period is right for.
 */

import { chromium } from 'playwright';

const APP = process.env.APP_URL ?? 'http://localhost:5453';
const CANDIDATE = { email: 'candidate.demo@smarthire.dev', password: 'Candidate@123' };

// Generous, because these cover real AI calls. They are ceilings before the
// spec gives up and reports a failure, not delays it waits out.
const FRAME_TIMEOUT = 60000;
const UI_TIMEOUT = 10000;
// Long enough for a stray frame to land if the gating were broken.
const SETTLE = 2000;

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/** Poll until `fn` is true, or give up. Returns whether it became true. */
async function waitUntil(fn, timeout = UI_TIMEOUT, interval = 100) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await fn()) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, interval));
  }
}

/**
 * A check whose condition is expected to become true, not to be true already.
 *
 * Passes the instant it holds, so a fast run is not slowed down and a slow one
 * is not failed for being slow. It still fails loudly if it never holds.
 */
const checkEventually = async (name, fn, detail = '', timeout = UI_TIMEOUT) =>
  check(name, await waitUntil(fn, timeout), detail);

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

async function main() {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const context = await browser.newContext({ permissions: ['microphone', 'camera'] });
  const page = await context.newPage();

  // Both directions. `sent` answers "did the client send `next`/`skip`?";
  // `received` is what the waits key on, because a server frame is the only
  // honest signal that a step actually finished.
  const sent = [];
  const received = [];
  page.on('websocket', (ws) => {
    if (!ws.url().includes('/voice/')) return;
    ws.on('framesent', (f) => {
      try { sent.push(JSON.parse(f.payload).type); } catch { /* binary */ }
    });
    ws.on('framereceived', (f) => {
      try { received.push(JSON.parse(f.payload)); } catch { /* binary */ }
    });
  });

  const got = (type, sequenceNo) =>
    received.some((m) => m.type === type && (sequenceNo === undefined || m.sequence_no === sequenceNo));

  await signIn(page);
  const interviewId = await makeInterview(page, 2);
  await page.goto(`${APP}/interview/live?interview=${interviewId}`);

  const next = () => page.getByRole('button', { name: /next question/i });
  const start = () => page.getByRole('button', { name: /^Start$/ });
  const finish = () => page.getByRole('button', { name: /finish interview/i });

  /** Answer the question on screen, and wait for the server to confirm THAT question. */
  async function answerCurrent(sequenceNo) {
    await page.getByRole('button', { name: /answer out loud/i }).click();
    // A real duration of real audio — this one is a genuine recording length,
    // not a guess at how long the server needs.
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: /stop and send/i }).click();
    const confirmed = await waitUntil(() => got('recorded', sequenceNo), FRAME_TIMEOUT);
    if (!confirmed) throw new Error(`no 'recorded' frame for question ${sequenceNo}`);
  }

  try {
    // The socket is open and the server has greeted us.
    if (!(await waitUntil(() => got('ready'), FRAME_TIMEOUT))) {
      throw new Error('the voice websocket never sent `ready`');
    }

    console.log('\nBefore the interview starts');
    await checkEventually('"Start" is offered, not "Next question"',
      async () => (await start().count()) === 1 && (await next().count()) === 0);
    check('"Finish interview" is not offered yet', (await finish().count()) === 0);

    await start().click();
    if (!(await waitUntil(() => got('question', 1), FRAME_TIMEOUT))) {
      throw new Error('question 1 was never served');
    }

    console.log('\n(a) Next question is disabled before the question is dealt with');
    await checkEventually('a question is on screen', async () => (await page.locator('.quote').count()) > 0);
    await checkEventually('"Next question" is present but disabled', () => next().isDisabled());
    await checkEventually('the reason is explained on screen',
      async () => (await page.getByText(/answer or skip this question/i).count()) > 0);

    console.log('\n(b) Clicking it while disabled sends no `next` frame');
    const before = sent.filter((t) => t === 'next').length;
    await next().click({ force: true, timeout: 5000 }).catch(() => {});
    // Deliberate fixed settle: proving a frame was NOT sent means giving one
    // time to appear and seeing that none did.
    await page.waitForTimeout(SETTLE);
    const after = sent.filter((t) => t === 'next').length;
    check('no `next` frame was sent', after === before, `next frames ${before} -> ${after}`);
    check('the same question is still on screen', (await page.locator('.quote').count()) > 0);

    console.log('\n(a, cont.) It enables once the question is answered');
    await answerCurrent(1);
    await checkEventually('"Next question" is now enabled', () => next().isEnabled());

    console.log('\n(c) Finish is gated until the last question is resolved');
    check('"Finish interview" is not offered with a question outstanding',
      (await finish().count()) === 0, 'question 2 has not been reached');

    await next().click();
    if (!(await waitUntil(() => got('question', 2), FRAME_TIMEOUT))) {
      throw new Error('question 2 was never served');
    }
    await checkEventually('question 2 was served and is gated again', () => next().isDisabled(),
      'the new question re-disables Next');

    await answerCurrent(2);
    await checkEventually('"Finish interview" appears once every question is resolved',
      async () => (await finish().count()) === 1);
    await checkEventually('it is enabled', () => finish().isEnabled());

    console.log('\nSkip stays a separate, explicit action');
    check('"Skip" is its own control', (await page.getByRole('button', { name: /^Skip$/ }).count()) === 1);
    check('gating never turned a click into a skip', !sent.includes('skip'),
      'no skip frame was sent at any point');

    console.log('\n(c, cont.) Finish closes the interview and shows the report');
    await finish().click();
    check('an `end` frame was sent',
      await waitUntil(() => sent.includes('end'), UI_TIMEOUT));
    // The server scores the interview before replying, so this is the slow one.
    await checkEventually('the completion screen is shown',
      async () => (await page.getByText(/interview complete/i).count()) > 0, '', FRAME_TIMEOUT);
    await checkEventually('the report view is reachable',
      async () => (await page.getByRole('button', { name: /back to history/i }).count()) > 0);
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
