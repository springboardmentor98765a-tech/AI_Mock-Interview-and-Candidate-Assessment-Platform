const {
  analyzeEducation,
  parseExperience,
  extractSkills,
} = require('../utils/resumeEngine');

describe('analyzeEducation', () => {
  test('detects MCA correctly instead of the unrelated M.Sc pattern', () => {
    const text = 'EDUCATION\nMaster of Computer Applications (MCA), Information Systems specialization\nABC University, 2024\n';
    const result = analyzeEducation(text);
    const labels = result.map((r) => r.degree);
    expect(labels).toContain('MCA');
    expect(labels).not.toContain('M.Sc / M.S.');
  });

  test('does not false-positive on "Adobe" as B.E.', () => {
    const result = analyzeEducation('EDUCATION\nProficient in Adobe Photoshop.\n2022');
    expect(result.map((r) => r.degree)).not.toContain('B.E.');
  });

  test('does not false-positive on "jobs" as B.Sc', () => {
    const result = analyzeEducation('EDUCATION\nHandled multiple client jobs.\n2021');
    expect(result.map((r) => r.degree)).not.toContain('B.Sc / B.S.');
  });

  test('still detects a real B.Tech degree', () => {
    const result = analyzeEducation('EDUCATION\nB.Tech in Computer Science, 2019');
    expect(result.map((r) => r.degree)).toContain('B.Tech');
  });
});

describe('parseExperience', () => {
  test('computes partial-year (month-aware) duration correctly', () => {
    const text = 'EXPERIENCE\nSoftware Intern\nInfosys Springboard\nJun 2023 - Dec 2023\n';
    const result = parseExperience(text);
    expect(result.years).toBe(0.5);
  });

  test('does not count education date ranges as work experience', () => {
    const text = 'EDUCATION\nB.Tech, ABC University, 2019 - 2023\n';
    const result = parseExperience(text);
    expect(result.years).toBeNull();
    expect(result.entries.length).toBe(0);
  });

  test('prefers an explicit "X years of experience" phrase when present', () => {
    const text = 'SUMMARY\n5 years of experience as a backend engineer.\n';
    const result = parseExperience(text);
    expect(result.years).toBe(5);
  });
});

describe('extractSkills', () => {
  test('extracts known technologies without duplicates', () => {
    const skills = extractSkills('Built with JavaScript, Node.js and MongoDB. Also used javascript for scripting.');
    expect(skills).toContain('JavaScript');
    expect(skills).toContain('Node.js');
    expect(skills).toContain('MongoDB');
    expect(skills.filter((s) => s === 'JavaScript').length).toBe(1);
  });
});
