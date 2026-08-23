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

  // Scores come from the interview rows themselves, so this section reports
  // exactly what is stored — and stays silent where nothing is. An interview
  // that was never scored prints "not scored" rather than a zero, because a
  // zero here would read as a result the candidate actually earned.
  const scored = (interviews ?? []).filter((i) => i.overall_score !== null
                                              && i.overall_score !== undefined);

  rows.push('SCORING', '-'.repeat(58));

  if (scored.length === 0) {
    rows.push(
      'No interview in this account has been scored yet. Scores are produced',
      'from answered questions, so an interview with no answers has none.',
      ''
    );
  } else {
    const mean = scored.reduce((sum, i) => sum + i.overall_score, 0) / scored.length;
    rows.push(
      line('Scored interviews', `${scored.length} of ${(interviews ?? []).length}`),
      line('Average score', `${mean.toFixed(1)} / 100`),
      ''
    );
    scored.forEach((i) => {
      rows.push(`  #${i.id}  ${i.interview_type} · ${i.domain}`);
      rows.push(`      ${i.overall_score.toFixed(1)} / 100 · ${i.score_rating ?? ''}`);
    });
    rows.push(
      '',
      'Scores are an AI assessment against a fixed rubric (communication 30%,',
      'confidence 25%, technical relevance 30%, professionalism 15%), not a',
      'measurement. They are not a hiring decision.',
      ''
    );
  }

  return rows.join('\n');
}
