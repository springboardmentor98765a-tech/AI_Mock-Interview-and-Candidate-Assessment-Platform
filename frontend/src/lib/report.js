/**
 * Client-side report download.
 *
 * Built from the same real data the page is showing — interview counts,
 * statuses and timestamps that came from the API. Where a figure does not
 * exist (anything score-based), the report says so in words rather than
 * printing a zero that would read as a real result.
 */
export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function line(label, value) {
  return `${String(label).padEnd(26)}${value}`;
}

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export function buildActivityReport({ candidate, email, stats, interviews, resume }) {
  const rows = [
    'SMARTHIRE AI - ACTIVITY SUMMARY',
    '='.repeat(58),
    '',
    line('Candidate', candidate),
    line('Email', email ?? '—'),
    line('Generated', new Date().toLocaleString()),
    '',
    'ACTIVITY',
    '-'.repeat(58),
    line('Interviews generated', stats.interviews_total),
    line('Completed', stats.interviews_by_status?.COMPLETED ?? 0),
    line('In progress', stats.interviews_by_status?.IN_PROGRESS ?? 0),
    line('Questions answered', `${stats.questions_answered} of ${stats.questions_total}`),
    line('Last interview', when(stats.last_interview_at)),
    '',
  ];

  if (resume?.extracted) {
    rows.push(
      'RESUME',
      '-'.repeat(58),
      line('File', resume.filename),
      line('Parsed', when(resume.parsed_at)),
      line('Experience', `${resume.extracted.total_experience_years} years`),
      line('Skills', resume.extracted.skills.join(', ') || '—'),
      line('Technologies', resume.extracted.technologies.join(', ') || '—'),
      ''
    );
  } else {
    rows.push('RESUME', '-'.repeat(58), 'No parsed resume on file.', '');
  }

  if (interviews?.length) {
    rows.push('INTERVIEW HISTORY', '-'.repeat(58));
    interviews.forEach((row) => {
      rows.push(
        `${row.interview_type} / ${row.difficulty} / ${row.domain}`,
        `    ${row.question_count} questions · ${row.status} · created ${when(row.created_at)}`
      );
    });
    rows.push('');
  }

  rows.push(
    'SCORING',
    '-'.repeat(58),
    'Not available. This platform records spoken answers as audio, but does not',
    'transcribe or score them, so this report deliberately contains no scores,',
    'skill ratings or performance percentages.',
    ''
  );

  return rows.join('\n');
}
