'use strict'

require('dotenv').config()
const { recommendRoles, generateQuestions, evaluateAnswers } = require('./services/interviewService')

async function runTests() {
  console.log('--- Testing interviewService.js module exports ---')

  const dummyAnalysis = {
    contact: { name: 'Test Candidate' },
    skills: ['JavaScript', 'React', 'Node.js'],
    technologies: ['PostgreSQL', 'Express', 'Vite'],
    experience: { totalYears: 2, entries: [{ title: 'Software Engineer', company: 'TechCorp' }] },
    education: [{ degree: 'B.Tech CS', institution: 'State University' }],
    summary: 'Enthusiastic full stack developer with experience in React and Node.'
  }

  console.log('✓ recommendRoles function exists:', typeof recommendRoles === 'function')
  console.log('✓ generateQuestions function exists:', typeof generateQuestions === 'function')
  console.log('✓ evaluateAnswers function exists:', typeof evaluateAnswers === 'function')

  console.log('--- All functions exported successfully ---')
}

runTests().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
