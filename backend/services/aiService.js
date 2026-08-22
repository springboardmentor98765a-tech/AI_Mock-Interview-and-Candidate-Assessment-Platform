// =============================================
// RULE-BASED AI SERVICE (No API Key Required)
// =============================================

// =============================================
// 1. GENERATE INTERVIEW QUESTIONS
// =============================================
// =============================================
// 1. GENERATE INTERVIEW QUESTIONS - WITH FALLBACK
// =============================================
const generateQuestions = async (interviewType, domain, difficulty, count = 5) => {
  // Domain-specific question banks
  const questionBank = {
    // Technical Round (TR) - Domain Specific
    tr: {
      ai_ml: {
        easy: [
          'What is Artificial Intelligence and how does it work?',
          'Explain the difference between AI, ML, and Deep Learning.',
          'What is supervised learning vs unsupervised learning?',
          'What is a neural network and how does it work?',
          'Explain the concept of overfitting in machine learning.',
          'What is Natural Language Processing (NLP)?',
          'What is the difference between classification and regression?',
          'Explain the concept of training and testing data split.'
        ],
        medium: [
          'Explain the architecture of a CNN (Convolutional Neural Network).',
          'What is the difference between LSTM and RNN?',
          'Explain the concept of transfer learning in deep learning.',
          'What is the purpose of activation functions in neural networks?',
          'Explain the bias-variance tradeoff in machine learning.',
          'What is regularization and why is it important?',
          'Explain the concept of gradient descent and its variants.',
          'What is feature engineering and why is it important?'
        ],
        hard: [
          'Explain the transformer architecture and its advantages over RNNs.',
          'What is the difference between batch normalization and layer normalization?',
          'Explain the concept of reinforcement learning and its applications.',
          'What are attention mechanisms in deep learning?',
          'Explain the concept of Generative Adversarial Networks (GANs).',
          'What is the difference between Bagging and Boosting?',
          'Explain the concept of hyperparameter tuning and its methods.',
          'What is the purpose of the Softmax function in deep learning?'
        ]
      },
      sde: {
        easy: [
          'What is the difference between let, const, and var in JavaScript?',
          'Explain what is a closure in JavaScript.',
          'What is the purpose of a constructor in OOP?',
          'Explain the difference between stack and queue data structures.',
          'What is the time complexity of binary search?',
          'Explain the difference between SQL and NoSQL databases.',
          'What is the purpose of Git in software development?',
          'Explain the concept of inheritance in OOP.'
        ],
        medium: [
          'Explain the event loop in JavaScript and how it works.',
          'What is the difference between == and === in JavaScript?',
          'Explain the concept of promises and async/await in JavaScript.',
          'What is the purpose of REST APIs and how do they work?',
          'Explain the difference between authentication and authorization.',
          'What is the concept of middleware in Express.js?',
          'Explain the purpose of indexes in databases.',
          'What is the difference between process.nextTick and setImmediate in Node.js?'
        ],
        hard: [
          'Explain the concept of microservices architecture and its benefits.',
          'What is the difference between horizontal and vertical scaling?',
          'Explain the CAP theorem and its implications for distributed systems.',
          'What is the purpose of load balancing and how does it work?',
          'Explain the concept of eventual consistency in distributed systems.',
          'What is the difference between sharding and replication in databases?',
          'Explain the concept of circuit breaker pattern in microservices.',
          'What is the purpose of message queues in distributed systems?'
        ]
      },
      fullstack: {
        easy: [
          'Explain the MVC architecture pattern.',
          'What is the difference between frontend and backend development?',
          'Explain what is a REST API and how does it work?',
          'What is the purpose of HTTP methods like GET, POST, PUT, DELETE?',
          'Explain the difference between SQL and NoSQL databases.',
          'What is the purpose of CSS and why is it important?',
          'Explain what is a web server and how does it work?',
          'What is the difference between cookies and sessions?'
        ],
        medium: [
          'Explain the concept of JWT (JSON Web Tokens) and how they work.',
          'What is the difference between server-side and client-side rendering?',
          'Explain the concept of authentication and authorization in web apps.',
          'What is the purpose of environment variables in development?',
          'Explain the concept of middleware in Express.js.',
          'What is the difference between a relational and non-relational database?',
          'Explain the concept of WebSockets and their use cases.',
          'What is the purpose of a load balancer in web applications?'
        ],
        hard: [
          'Explain the concept of microservices architecture in web development.',
          'What is the difference between horizontal and vertical scaling?',
          'Explain the concept of CI/CD in software development.',
          'What is the purpose of Docker and containerization?',
          'Explain the concept of GraphQL and how it differs from REST.',
          'What is the difference between SQL and NoSQL for large-scale applications?',
          'Explain the concept of serverless architecture.',
          'What is the purpose of monitoring and logging in production?'
        ]
      },
      frontend: {
        easy: [
          'What is the difference between HTML and CSS?',
          'Explain the box model in CSS.',
          'What is the purpose of JavaScript in web development?',
          'Explain the difference between class and ID selectors in CSS.',
          'What is the purpose of responsive web design?',
          'Explain what is a DOM and how does it work?',
          'What is the difference between inline and block elements?',
          'Explain the concept of CSS Flexbox.'
        ],
        medium: [
          'Explain the concept of React components and props.',
          'What is the difference between state and props in React?',
          'Explain the concept of React hooks and why they were introduced.',
          'What is the purpose of Redux in React applications?',
          'Explain the difference between controlled and uncontrolled components.',
          'What is the concept of virtual DOM in React?',
          'Explain the purpose of useEffect hook in React.',
          'What is the difference between React.memo and useMemo?'
        ],
        hard: [
          'Explain the React fiber architecture and reconciliation process.',
          'What is the difference between server-side rendering and client-side rendering in React?',
          'Explain the concept of React portals and their use cases.',
          'What is the purpose of React Suspense and lazy loading?',
          'Explain the concept of React Context API and when to use it.',
          'What is the difference between React functional and class components?',
          'Explain the concept of custom hooks in React.',
          'What is the purpose of React.dev and its new features?'
        ]
      },
      backend: {
        easy: [
          'What is Node.js and why is it used?',
          'Explain what is an API and how does it work?',
          'What is the difference between HTTP and HTTPS?',
          'Explain the purpose of environment variables in backend development.',
          'What is the difference between PUT and PATCH HTTP methods?',
          'Explain what is a database and why is it needed?',
          'What is the purpose of error handling in backend applications?',
          'Explain the concept of middleware in Express.js.'
        ],
        medium: [
          'Explain the event loop in Node.js and how it handles asynchronous operations.',
          'What is the difference between SQL and NoSQL databases for backend?',
          'Explain the concept of JWT authentication and how it works.',
          'What is the purpose of ORM (Object-Relational Mapping) in Node.js?',
          'Explain the concept of rate limiting and why it is important.',
          'What is the difference between clustering and forking in Node.js?',
          'Explain the concept of websockets and their use cases.',
          'What is the purpose of Express.js middleware and how does it work?'
        ],
        hard: [
          'Explain the concept of microservices architecture and its benefits.',
          'What is the difference between horizontal and vertical scaling?',
          'Explain the CAP theorem and its implications for distributed databases.',
          'What is the purpose of load balancing in backend applications?',
          'Explain the concept of eventual consistency in distributed systems.',
          'What is the difference between sharding and replication in databases?',
          'Explain the concept of circuit breaker pattern in microservices.',
          'What is the purpose of message queues in distributed systems?'
        ]
      }
    },
    // Managerial Round (MR)
    mr: {
      easy: [
        'Tell me about a time you led a team successfully.',
        'How do you prioritize tasks in a project?',
        'What is your leadership style?',
        'How do you handle conflicts within a team?',
        'Describe your approach to team management.',
        'How do you motivate team members?',
        'What is the role of a manager in a project?',
        'How do you delegate tasks effectively?'
      ],
      medium: [
        'Describe a challenging team conflict and how you resolved it.',
        'How do you handle underperforming team members?',
        'Explain your approach to project planning and execution.',
        'How do you manage stakeholders and their expectations?',
        'Describe a time you had to make a difficult decision.',
        'How do you ensure your team meets project deadlines?',
        'Explain your process for risk assessment in projects.',
        'How do you measure team performance and success?'
      ],
      hard: [
        'Describe a time you had to handle a project crisis.',
        'How do you manage team burnout and maintain morale?',
        'Explain your strategy for managing multiple projects simultaneously.',
        'How do you handle senior stakeholder conflicts?',
        'Describe your experience with organizational change management.',
        'How do you build a high-performing team culture?',
        'Explain your approach to strategic planning and execution.',
        'How do you handle failure and learn from it?'
      ]
    },
    // HR Round (HR)
    hr: {
      easy: [
        'Tell me about yourself.',
        'What are your strengths and weaknesses?',
        'Why do you want to work with us?',
        'How do you handle stress and pressure?',
        'What are your career goals?',
        'Describe your communication style.',
        'How do you work in a team environment?',
        'What motivates you to perform well?'
      ],
      medium: [
        'Describe a situation where you failed and what you learned.',
        'How do you handle criticism and feedback?',
        'Explain a time you went beyond your role to help others.',
        'How do you manage work-life balance?',
        'Describe a time you had to work with a difficult colleague.',
        'How do you adapt to changing environments and priorities?',
        'Explain your approach to continuous learning and development.',
        'How do you handle ambiguity and uncertainty?'
      ],
      hard: [
        'Describe a time you had to make an ethical decision at work.',
        'How do you handle a situation where your values conflict with company policy?',
        'Explain a time you challenged authority for a good cause.',
        'How do you maintain professional integrity in challenging situations?',
        'Describe your experience with organizational politics.',
        'How do you build trust and credibility within a team?',
        'Explain your approach to giving and receiving feedback.',
        'How do you handle high-pressure situations with professionalism?'
      ]
    }
  };

  // =============================================
  // SAFELY GET QUESTIONS WITH FALLBACK
  // =============================================
  
  // 1. Get questions for the type, domain, difficulty
  let selectedQuestions = [];
  
  // Try to get questions from the specific combination
  try {
    const typeQuestions = questionBank[interviewType] || questionBank.tr;
    const domainQuestions = typeQuestions[domain];
    
    if (domainQuestions) {
      // Domain exists for this type
      const questions = domainQuestions[difficulty] || domainQuestions.medium;
      selectedQuestions = questions || [];
    } else {
      // Domain doesn't exist for this type - use general fallback
      console.log(`⚠️ Domain "${domain}" not found for type "${interviewType}". Using fallback.`);
      
      // For TR, use SDE domain
      if (interviewType === 'tr') {
        const fallbackDomain = questionBank.tr.sde || questionBank.tr.fullstack;
        const questions = fallbackDomain[difficulty] || fallbackDomain.medium;
        selectedQuestions = questions || [];
      } 
      // For MR, use first available domain
      else if (interviewType === 'mr') {
        const firstDomain = Object.keys(questionBank.mr)[0];
        const questions = questionBank.mr[firstDomain][difficulty] || questionBank.mr[firstDomain].medium;
        selectedQuestions = questions || [];
      }
      // For HR, use first available domain
      else if (interviewType === 'hr') {
        const firstDomain = Object.keys(questionBank.hr)[0];
        const questions = questionBank.hr[firstDomain][difficulty] || questionBank.hr[firstDomain].medium;
        selectedQuestions = questions || [];
      }
    }
  } catch (error) {
    console.error('❌ Error getting questions:', error);
  }
  
  // 2. If still no questions, use ULTIMATE FALLBACK
  if (!selectedQuestions || selectedQuestions.length === 0) {
    console.log('⚠️ Using ultimate fallback questions');
    selectedQuestions = [
      'Tell me about yourself and your experience.',
      'What is your greatest strength and how does it help you in this role?',
      'Describe a challenging project you worked on and how you handled it.',
      'Why are you interested in this role and our company?',
      'Where do you see yourself in 5 years?'
    ];
  }

  // 3. Shuffle and select random questions
  const shuffled = [...selectedQuestions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  const questionCount = count || Math.min(5, shuffled.length);
  const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  console.log(`✅ Generated ${selected.length} questions for ${interviewType}/${domain}/${difficulty}`);

  return selected.map((q, index) => ({
    id: index + 1,
    question: q,
    category: interviewType === 'tr' ? 'Technical' : interviewType === 'mr' ? 'Managerial' : 'HR',
    difficulty: difficulty || 'medium',
    expected_skills: interviewType === 'tr' ? ['Technical Knowledge', 'Problem Solving'] : 
                     interviewType === 'mr' ? ['Leadership', 'Team Management'] : 
                     ['Communication', 'Behavioral'],
    follow_up: []
  }));
};

// =============================================
// 2. ANALYZE USER ANSWER - IMPROVED SCORING
// =============================================
const analyzeAnswer = async (question, answer, expectedSkills = []) => {
  console.log('📝 Analyzing answer for:', question.substring(0, 50) + '...');
  
  // Check if answer exists
  if (!answer || answer.trim().length === 0) {
    return {
      score: 0,
      technical_accuracy: 0,
      communication_clarity: 0,
      confidence: 0,
      strengths: ['No answer provided'],
      weaknesses: ['Question not answered'],
      improvements: ['Please provide a complete answer'],
      summary: 'No answer was given for this question.'
    };
  }

  const wordCount = answer.split(' ').length;
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;

  // If answer is too short (less than 5 words), score low
  if (wordCount < 5) {
    return {
      score: 10,
      technical_accuracy: 10,
      communication_clarity: 15,
      confidence: 10,
      strengths: ['Attempted to answer'],
      weaknesses: ['Answer too short', 'Lacks substance'],
      improvements: ['Provide more detailed responses'],
      summary: 'Answer was too brief. Please elaborate more.'
    };
  }

  // Calculate base score from length
  let score = 0;
  if (wordCount > 100) score = 85;
  else if (wordCount > 70) score = 75;
  else if (wordCount > 40) score = 65;
  else if (wordCount > 20) score = 50;
  else if (wordCount > 10) score = 35;
  else if (wordCount > 5) score = 25;
  else score = 15;

  // Check for structure (multiple sentences)
  if (sentenceCount >= 4) score += 10;
  else if (sentenceCount >= 2) score += 5;

  // Check for question relevance (keyword matching)
  const questionWords = question.toLowerCase().replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
  const answerWords = answer.toLowerCase().split(' ');
  const commonWords = questionWords.filter(word => 
    answerWords.includes(word) && word.length > 3
  );
  const relevanceScore = Math.min((commonWords.length / 5) * 10, 10);
  score += relevanceScore;

  // Check for confidence indicators
  const confidenceIndicators = ['i think', 'i believe', 'in my experience', 'i would', 'i will', 'definitely', 'certainly'];
  const hasConfidence = confidenceIndicators.some(ind => answer.toLowerCase().includes(ind));
  const confidenceScore = hasConfidence ? 15 : 5;

  // Check for specific examples
  const hasExample = answer.includes('example') || answer.includes('instance') || answer.includes('e.g.') || answer.includes('such as');
  const exampleScore = hasExample ? 10 : 0;

  // Calculate final scores - ensure no negative values
  const finalScore = Math.min(Math.max(score + confidenceScore + exampleScore, 10), 95);
  const techAccuracy = Math.min(finalScore + 5, 95);
  const commClarity = Math.min(finalScore + 10, 95);
  const confidence = Math.min(finalScore - 5, 90);

  // Generate strengths and weaknesses
  const strengths = [];
  const weaknesses = [];
  
  if (wordCount > 40) strengths.push('Good length and detail');
  if (sentenceCount >= 3) strengths.push('Well-structured answer');
  if (hasExample) strengths.push('Used relevant examples');
  if (commonWords.length > 3) strengths.push('Addressed the question directly');
  if (hasConfidence) strengths.push('Showed confidence in the answer');
  
  if (wordCount < 20) weaknesses.push('Answer is too brief');
  if (sentenceCount < 2) weaknesses.push('Need more structure');
  if (!hasExample) weaknesses.push('Consider adding specific examples');
  if (commonWords.length < 2) weaknesses.push('Could address the question more directly');
  
  // Ensure we have at least one strength and weakness
  if (strengths.length === 0) strengths.push('Attempted to answer');
  if (weaknesses.length === 0) weaknesses.push('Could provide more detail');

  return {
    score: finalScore,
    technical_accuracy: techAccuracy,
    communication_clarity: commClarity,
    confidence: confidence,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    improvements: [
      'Practice structuring your answers with clear beginning, middle, and end',
      'Include specific examples from your experience',
      'Use the STAR method for behavioral questions'
    ],
    summary: `Answer length: ${wordCount} words. ${finalScore >= 70 ? 'Good response!' : finalScore >= 50 ? 'Average response, could improve.' : 'Response needs more detail and structure.'}`
  };
};

// =============================================
// 3. GENERATE OVERALL FEEDBACK - WITH PENALTY FOR UNANSWERED
// =============================================
const generateOverallFeedback = async (questions, answers, analyses) => {
  const totalQuestions = questions.length;
  const answeredCount = answers.filter(a => a && a.trim() !== '').length;
  const unansweredCount = totalQuestions - answeredCount;
  
  // Calculate average score from answered questions only
  const answeredScores = analyses
    .filter(a => a && a.score !== undefined)
    .map(a => a.score);
  
  const avgAnsweredScore = answeredScores.length > 0 
    ? Math.round(answeredScores.reduce((sum, s) => sum + s, 0) / answeredScores.length) 
    : 0;
  
  // Apply penalty for unanswered questions
  // Each unanswered question reduces score by 15-20 points
  const penaltyPerUnanswered = 15;
  const totalPenalty = unansweredCount * penaltyPerUnanswered;
  
  // Final score = average answered score - penalty
  let finalScore = Math.max(avgAnsweredScore - totalPenalty, 0);
  
  // If no questions answered, score is 0
  if (answeredCount === 0) {
    finalScore = 0;
  }
  
  // If all questions answered, no penalty
  if (unansweredCount === 0) {
    finalScore = avgAnsweredScore;
  }

  console.log('📊 Final Score Calculation:');
  console.log('  - Answered:', answeredCount, '/', totalQuestions);
  console.log('  - Avg Score:', avgAnsweredScore);
  console.log('  - Unanswered:', unansweredCount);
  console.log('  - Penalty:', totalPenalty);
  console.log('  - Final Score:', finalScore);

  // Generate strengths and improvements
  const totalStrengths = [];
  const totalImprovements = [];
  
  analyses.forEach(a => {
    if (a && a.strengths) totalStrengths.push(...a.strengths);
    if (a && a.weaknesses) totalImprovements.push(...a.weaknesses);
  });

  const uniqueStrengths = [...new Set(totalStrengths)].slice(0, 5);
  const uniqueImprovements = [...new Set(totalImprovements)].slice(0, 5);

  // Generate verdict based on final score
  let finalVerdict = '';
  if (finalScore >= 85 && answeredCount === totalQuestions) {
    finalVerdict = 'Excellent performance! You demonstrated strong knowledge and communication skills. Keep up the great work!';
  } else if (finalScore >= 70 && answeredCount === totalQuestions) {
    finalVerdict = 'Good performance! You have solid knowledge but could improve in some areas. Continue practicing to refine your skills.';
  } else if (finalScore >= 50) {
    finalVerdict = `Average performance. You answered ${answeredCount}/${totalQuestions} questions. Focus on strengthening your technical knowledge and communication.`;
  } else if (finalScore > 0) {
    finalVerdict = `Below average. You only answered ${answeredCount}/${totalQuestions} questions. Need significant improvement in both knowledge and communication.`;
  } else {
    finalVerdict = 'No answers provided. Please attempt to answer the questions to get meaningful feedback.';
  }

  return {
    overall_score: finalScore,
    technical_summary: finalScore >= 70 ? 'Good technical understanding demonstrated.' : finalScore >= 50 ? 'Technical knowledge needs improvement.' : 'Technical knowledge is lacking.',
    communication_summary: finalScore >= 70 ? 'Clear communication with good articulation.' : finalScore >= 50 ? 'Communication could be clearer and more structured.' : 'Communication needs significant improvement.',
    strengths: uniqueStrengths.length > 0 ? uniqueStrengths : ['Attempted the interview'],
    improvements: uniqueImprovements.length > 0 ? uniqueImprovements : ['Answer all questions', 'Provide more detailed responses'],
    recommendations: [
      'Practice with mock interviews regularly',
      'Review technical concepts thoroughly',
      'Prepare specific examples from your experience',
      'Use the STAR method for structured answers',
      'Answer all questions to get a complete evaluation'
    ],
    final_verdict: finalVerdict,
    answered_questions: answeredCount,
    total_questions: totalQuestions,
    unanswered_count: unansweredCount
  };
};

module.exports = {
  generateQuestions,
  analyzeAnswer,
  generateOverallFeedback
};