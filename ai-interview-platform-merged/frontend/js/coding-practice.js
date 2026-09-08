// ============================================================
// Coding Practice — standalone from the scored live-interview flow.
// Talks to the Python Module 3 service's /api/coding/* endpoints
// (apiFetchPy, from script.js).
//
// Flow: pick a role (locks the language) + difficulty -> POST /generate
// asks Gemini for one fresh, original problem (validated server-side
// against its own answer key before it's ever returned — see
// ai_providers.generate_coding_question_llm) -> candidate writes code
// in the editor -> POST /submit runs it against the server-held test
// cases via judge.py and returns an exact pass/fail score. Nothing
// here does any AI-based grading; only the QUESTION is AI-written.
// ============================================================

let codingRoles = [];         // [{ role, language }]
let currentQuestion = null;   // the question object currently loaded in the editor
let selectedRole = '';

async function initCodingPractice() {
  await loadRoles();
  await loadSubmissionHistory();
}

// ---------------------------------------------------------------
// Roles + language lock
// ---------------------------------------------------------------
async function loadRoles() {
  const select = document.getElementById('roleSelect');
  try {
    codingRoles = await apiFetchPy('/coding/roles');
  } catch (err) {
    select.innerHTML = '<option value="">Could not load roles</option>';
    showToast(err.message || 'Could not load coding roles.', 'error');
    return;
  }

  select.innerHTML =
    '<option value="">Select a role…</option>' +
    codingRoles.map((r) => `<option value="${escapeHtml(r.role)}">${escapeHtml(r.role)}</option>`).join('');
}

function onRoleChanged() {
  const select = document.getElementById('roleSelect');
  selectedRole = select.value;

  const roleEntry = codingRoles.find((r) => r.role === selectedRole);
  document.getElementById('languageBadgeLabel').textContent = roleEntry
    ? languageDisplayName(roleEntry.language)
    : '—';

  document.getElementById('generateBtn').disabled = !selectedRole;
  hideEditor();
  document.getElementById('problemListEmpty').textContent = selectedRole
    ? 'Click "Generate Question" for a fresh AI-written problem.'
    : 'Select a role, then click "Generate Question" for a fresh AI-written problem.';
}

// ---------------------------------------------------------------
// Generate a fresh question
// ---------------------------------------------------------------
async function generateQuestion() {
  if (!selectedRole) {
    showToast('Pick a role first.', 'info');
    return;
  }
  const difficulty = document.getElementById('difficultySelect').value;
  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';
  document.getElementById('problemListEmpty').textContent = 'Asking AI for a fresh problem — this can take a few seconds…';
  hideEditor();

  try {
    const question = await apiFetchPy('/coding/generate', {
      method: 'POST',
      body: JSON.stringify({ role: selectedRole, difficulty }),
    });
    currentQuestion = question;
    renderQuestion(question);
  } catch (err) {
    showToast(err.message || 'Could not generate a question right now.', 'error');
    document.getElementById('problemListEmpty').textContent = 'Could not generate a question — try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = '🎲 Generate Question';
  }
}

function renderQuestion(question) {
  document.getElementById('problemListEmpty').textContent = 'Click "Generate Question" for another fresh problem any time.';

  document.getElementById('problemTitle').textContent = `2. Write your solution — ${question.title}`;
  document.getElementById('problemPrompt').textContent = question.prompt;
  document.getElementById('codeEditor').value = question.starter_code || '';
  document.getElementById('resultBox').style.display = 'none';

  const sourceBadge = document.getElementById('sourceBadge');
  if (question.source === 'ai') {
    sourceBadge.textContent = '✨ AI-generated';
    sourceBadge.className = 'badge badge-success';
  } else {
    sourceBadge.textContent = '📚 From question bank (AI unavailable right now)';
    sourceBadge.className = 'badge badge-warning';
  }

  document.getElementById('editorCard').style.display = 'block';
  document.getElementById('editorCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetStarterCode() {
  if (!currentQuestion) return;
  document.getElementById('codeEditor').value = currentQuestion.starter_code || '';
}

function hideEditor() {
  document.getElementById('editorCard').style.display = 'none';
  currentQuestion = null;
}

// ---------------------------------------------------------------
// Submit + grade
// ---------------------------------------------------------------
async function submitCode() {
  if (!currentQuestion || !selectedRole) {
    showToast('Generate a question first.', 'info');
    return;
  }
  const code = document.getElementById('codeEditor').value;
  if (!code.trim()) {
    showToast('Write some code before submitting.', 'info');
    return;
  }

  const btn = document.getElementById('submitCodeBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Running…';

  try {
    const result = await apiFetchPy('/coding/submit', {
      method: 'POST',
      body: JSON.stringify({ role: selectedRole, questionId: currentQuestion.id, code }),
    });
    renderResult(result);
    await loadSubmissionHistory();
  } catch (err) {
    showToast(err.message || 'Could not grade this submission.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Run & Score';
  }
}

function renderResult(result) {
  const box = document.getElementById('resultBox');
  const summary = document.getElementById('resultSummary');
  const tbody = document.getElementById('resultTableBody');

  if (!result.compiled) {
    summary.innerHTML = `<span class="badge badge-danger">Compile error</span>`;
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(result.compileError || 'Could not compile submission.')}</td></tr>`;
    box.style.display = 'block';
    return;
  }

  const scoreClass = result.scorePercent === 100 ? 'badge-success' : result.scorePercent > 0 ? 'badge-warning' : 'badge-danger';
  summary.innerHTML = `
    <span class="badge ${scoreClass}">Score: ${result.scorePercent}%</span>
    <span class="coding-result-passed">${result.passedCount} / ${result.totalCount} test cases passed</span>
  `;

  tbody.innerHTML = result.results
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><code>${escapeHtml(r.input.trim())}</code></td>
        <td><code>${escapeHtml(r.expected_output)}</code></td>
        <td><code>${escapeHtml(r.error ? r.error : r.actual_output)}</code></td>
        <td>${r.passed ? '<span class="badge badge-success">Pass</span>' : '<span class="badge badge-danger">Fail</span>'}</td>
      </tr>`
    )
    .join('');

  box.style.display = 'block';
}

// ---------------------------------------------------------------
// Submission history + export
// ---------------------------------------------------------------
async function loadSubmissionHistory() {
  const tbody = document.getElementById('submissionHistoryBody');
  try {
    const rows = await apiFetchPy('/coding/submissions/me');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td class="table-loading" colspan="5">No submissions yet — generate a problem above to get started.</td></tr>';
      return;
    }
    tbody.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td>${new Date(r.createdAt).toLocaleString()}</td>
          <td>${escapeHtml(r.title)}</td>
          <td>${escapeHtml(r.role)}</td>
          <td>${languageDisplayName(r.language)}</td>
          <td><span class="badge ${r.scorePercent === 100 ? 'badge-success' : r.scorePercent > 0 ? 'badge-warning' : 'badge-danger'}">${r.scorePercent}% (${r.passedCount}/${r.totalCount})</span></td>
        </tr>`
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td class="table-loading" colspan="5">${escapeHtml(err.message || 'Could not load submission history.')}</td></tr>`;
  }
}

// Binary file download (PDF/XLSX) — apiFetchPy always parses JSON, so this
// talks to fetch() directly with the same auth header, same pattern as
// playCurrentQuestionAudio() in interview-session.js.
async function downloadExport(format) {
  try {
    const token = getToken();
    const res = await fetch(`${PY_API_BASE_URL}/coding/submissions/export?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Could not generate the export file.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'xlsx' ? 'coding_practice_scores.xlsx' : 'coding_practice_scores.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast(err.message || 'Could not download the export.', 'error');
  }
}

// ---------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------
function languageDisplayName(language) {
  const map = { python: 'Python', javascript: 'JavaScript (Node.js)', java: 'Java', cpp: 'C++', c: 'C' };
  return map[language] || language;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
