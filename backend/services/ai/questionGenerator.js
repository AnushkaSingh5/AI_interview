const axios = require('axios');
const { buildQuestionPrompt } = require('./promptBuilder');
const { validateAIResponse } = require('./responseValidator');
const { executeWithRetry } = require('./retryHandler');

const apiKey = process.env.GEMINI_API_KEY;

// Fail-safe rich fallback template questions generator
const getFallbackQuestions = (role, count, difficulty) => {
  console.warn(`[AI Service] Triggering fail-safe local template fallback questions for target role: "${role}"`);
  
  const techQuestionsMap = {
    frontend: [
      { question: 'Explain the difference between state and props in React.', topic: 'React', expected: 'State represents internal component memory; props are parameters passed in.', hints: ['Internal vs External', 'Read-only vs Mutable'] },
      { question: 'What is the Event Loop in JavaScript and how does it handle async operations?', topic: 'JavaScript', expected: 'Event Loop handles concurrency by polling callback queue and pushing to stack.', hints: ['Call Stack', 'Callback Queue'] },
      { question: 'How do you optimize page load performance of a modern React app?', topic: 'Performance', expected: 'Code splitting, lazy loading, image optimization, memoization.', hints: ['Code Splitting', 'Lazy Loading'] },
      { question: 'Explain CSS specificity and how the cascade rules apply.', topic: 'CSS', expected: 'Inline styles, IDs, classes, elements in order of specificity weight.', hints: ['Selector Weight', 'Cascade order'] },
      { question: 'What is semantic HTML and why is it important for SEO and accessibility?', topic: 'Accessibility', expected: 'Using elements like article, header, nav to give meaning to structure.', hints: ['HTML5 Tags', 'Screen Readers'] }
    ],
    backend: [
      { question: 'Explain database normalization and difference between 1NF, 2NF, and 3NF.', topic: 'Databases', expected: 'Structuring columns/tables to reduce redundancy and dependencies.', hints: ['Redundancy', 'Dependencies'] },
      { question: 'How does JWT authentication work and how do you store tokens securely?', topic: 'Security', expected: 'Stateless JSON token signed by server. Stored in HttpOnly cookies.', hints: ['Stateless', 'HttpOnly Cookie'] },
      { question: 'Explain REST API design best practices and HTTP status codes.', topic: 'APIs', expected: 'Singular/plural nouns, HTTP verbs, statelessness, clear status codes.', hints: ['Nouns vs Verbs', 'Status Codes'] },
      { question: 'What is database indexing and how does it improve query performance?', topic: 'Databases', expected: 'B-Tree data structures pointing to rows to avoid full table scans.', hints: ['Data Structure', 'Table Scan'] },
      { question: 'How do you handle concurrency and race conditions in a distributed system?', topic: 'System Design', expected: 'Optimistic locking, pessimistic locking, distributed locks like Redis.', hints: ['Locking', 'Redis Locks'] }
    ]
  };

  const hrQuestions = [
    { question: 'Tell me about yourself and your professional journey.', topic: 'Behavioral', expected: 'Clear summary of background, skills, and interest in target role.', hints: ['Keep it professional', 'Highlight key achievements'] },
    { question: 'Describe a time when you faced a strict deadline and how you handled it.', topic: 'Behavioral', expected: 'Priority setting, task delegation, and communication of risks.', hints: ['STAR Method', 'Prioritization'] },
    { question: 'How do you handle disagreements or conflicts within a development team?', topic: 'Behavioral', expected: 'Empathetic listening, open discussion, and focus on compromise.', hints: ['Communication', 'Collaboration'] }
  ];

  const category = (role?.toLowerCase()?.includes('front') || role?.toLowerCase()?.includes('ui') || role?.toLowerCase()?.includes('ux')) 
    ? 'frontend' 
    : 'backend';
    
  const techPool = techQuestionsMap[category];
  const list = [];

  for (let i = 0; i < count; i++) {
    // Alternate between Tech, Project (mocked), and HR
    let rawQ;
    let typeVal = 'technical';

    if (i % 3 === 0) {
      rawQ = techPool[Math.floor(i / 3) % techPool.length];
      typeVal = 'technical';
    } else if (i % 3 === 1) {
      rawQ = hrQuestions[Math.floor(i / 3) % hrQuestions.length];
      typeVal = 'hr';
    } else {
      // Mock Project-Based question
      rawQ = {
        question: `In your recent projects, what was the biggest technical challenge you faced and how did you resolve it?`,
        topic: 'Projects',
        expected: 'Specific problem statement, engineering approach, and numerical impact.',
        hints: ['Pick one clear challenge', 'Focus on impact metrics']
      };
      typeVal = 'project';
    }

    list.push({
      questionNumber: i + 1,
      questionType: typeVal,
      topic: rawQ.topic,
      difficulty: difficulty || 'Medium',
      question: rawQ.question,
      expectedAnswer: rawQ.expected,
      hints: rawQ.hints
    });
  }

  return list;
};

exports.generateInterviewQuestions = async (user, resumeData, session) => {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 1. Build prompt
  const prompt = buildQuestionPrompt(user, resumeData, session);

  const requestFn = async (attempt) => {
    console.log(`[AI Service] Generating questions. Attempt ${attempt}...`);
    
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000 // 45s timeout per request
      }
    );

    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('Gemini returned an empty candidates text body.');
    }

    // 2. Validate response JSON
    const validation = validateAIResponse(textResponse, session.questionCount, session.difficulty);
    if (!validation.isValid) {
      console.warn(`[AI Service] Validation failed:`, validation.errors.join(', '));
      throw new Error('AI response failed validation checks.');
    }

    return validation.questions;
  };

  const isRetryableError = (error) => {
    // Retry on validation errors, timeout, or rate-limiting/server errors
    const status = error.response?.status;
    return !status || [429, 500, 502, 503, 504].includes(status) || error.message.includes('validation');
  };

  try {
    // Execute AI request with retry wrapping
    const questions = await executeWithRetry(requestFn, 3, 1000, isRetryableError);
    console.log(`[AI Service] Questions successfully generated and validated by AI.`);
    return questions;
  } catch (err) {
    console.error(`[AI Service] AI generation failed after all retries. Error: ${err.message}`);
    // Load local template questions so the setup wizard never crashes
    return getFallbackQuestions(session.role, session.questionCount, session.difficulty);
  }
};
