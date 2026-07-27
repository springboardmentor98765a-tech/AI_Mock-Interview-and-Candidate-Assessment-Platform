/**
 * Client-side report download. No backend involved: the report text is built
 * from data already on the page and handed to the browser as a file.
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
  return `${label.padEnd(22)}${value}`;
}

export function buildSessionReport({ candidate, session, breakdown, notes = [] }) {
  return [
    'SMARTHIRE AI - INTERVIEW REPORT',
    '='.repeat(46),
    '',
    line('Candidate', candidate),
    line('Session', session.type),
    line('Date', session.date),
    line('Duration', session.duration ?? '-'),
    line('Overall score', session.score),
    '',
    'SCORE BREAKDOWN',
    '-'.repeat(46),
    ...breakdown.map(([label, value, weight]) => line(`${label} (${weight})`, `${value}%`)),
    '',
    ...(notes.length ? ['NOTES', '-'.repeat(46), ...notes.map((note) => `- ${note}`), ''] : []),
    `Generated ${new Date().toISOString().slice(0, 10)}`,
  ].join('\n');
}

export function buildSummaryReport({ candidate, stats, skills }) {
  return [
    'SMARTHIRE AI - PERFORMANCE SUMMARY',
    '='.repeat(46),
    '',
    line('Candidate', candidate),
    '',
    'HEADLINE FIGURES',
    '-'.repeat(46),
    ...stats.map(([value, label]) => line(label, value)),
    '',
    'SKILL BREAKDOWN',
    '-'.repeat(46),
    ...skills.map(([label, value]) => line(label, `${value}%`)),
    '',
    `Generated ${new Date().toISOString().slice(0, 10)}`,
  ].join('\n');
}
