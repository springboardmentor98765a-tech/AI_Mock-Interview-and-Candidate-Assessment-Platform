'use strict'

require('dotenv').config()
const { generateQuestions } = require('./services/interviewService')

async function testMetadataGeneration() {
  console.log('===========================================================')
  console.log('    STRUCTURED QUESTION METADATA BACKEND TEST SUITE       ')
  console.log('===========================================================\n')

  try {
    const mockQuestions = await generateQuestions({
      role: 'Full Stack Engineer',
      interviewType: 'Technical',
      difficulty: 'Medium',
      questionCount: 3,
      resumeContext: {
        skills: ['React.js', 'Node.js', 'PostgreSQL'],
        technologies: ['JavaScript', 'Python', 'Docker'],
        experience: { totalYears: 3 },
        education: [{ degree: 'B.Tech Computer Science' }]
      }
    })

    console.log('Generated Questions Output:\n', JSON.stringify(mockQuestions, null, 2))

    let valid = true
    mockQuestions.forEach((q, idx) => {
      if (!q.questionType) {
        console.error(`❌ Question #${idx + 1} missing questionType`)
        valid = false
      }
      if (q.questionType === 'coding' && !q.expectedLanguage) {
        console.error(`❌ Question #${idx + 1} is coding but expectedLanguage is null`)
        valid = false
      }
      if (q.questionType !== 'coding' && q.expectedLanguage !== null) {
        console.error(`❌ Question #${idx + 1} is not coding but expectedLanguage is non-null (${q.expectedLanguage})`)
        valid = false
      }
    })

    if (valid) {
      console.log('\n===========================================================')
      console.log('✅ ALL QUESTION METADATA VALIDATION CHECKS PASSED!')
      console.log('===========================================================')
    } else {
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ Test failed with error:', err.message)
    process.exit(1)
  }
}

testMetadataGeneration()
