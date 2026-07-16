const axios = require('axios');
const { buildQuestionPrompt } = require('./promptBuilder');
const { validateAIResponse } = require('./responseValidator');
const { executeWithRetry } = require('./retryHandler');

const apiKey = process.env.GEMINI_API_KEY;

// Fail-safe rich fallback template questions generator
const getFallbackQuestions = (session) => {
  const role = session.role || 'Software Engineer';
  const count = session.questionCount || 5;
  const difficulty = session.difficulty || 'Medium';
  const interviewType = session.interviewType || 'Technical';
  const focusAreas = session.focusAreas || [];

  console.warn(`[AI Service] Triggering fail-safe local template fallback questions for target role: "${role}"`);

  const frontendPool = [
    { question: 'Explain the difference between state and props in React.', topic: 'React', expected: 'State represents internal component memory; props are parameters passed in.', hints: ['Internal vs External', 'Read-only vs Mutable'] },
    { question: 'What is the Event Loop in JavaScript and how does it handle async operations?', topic: 'JavaScript', expected: 'Event Loop handles concurrency by polling callback queue and pushing to stack.', hints: ['Call Stack', 'Callback Queue'] },
    { question: 'How do you optimize page load performance of a modern React app?', topic: 'Performance', expected: 'Code splitting, lazy loading, image optimization, memoization.', hints: ['Code Splitting', 'Lazy Loading'] },
    { question: 'Explain CSS specificity and how the cascade rules apply.', topic: 'CSS', expected: 'Inline styles, IDs, classes, elements in order of specificity weight.', hints: ['Selector Weight', 'Cascade order'] },
    { question: 'What is semantic HTML and why is it important for SEO and accessibility?', topic: 'Accessibility', expected: 'Using elements like article, header, nav to give meaning to structure.', hints: ['HTML5 Tags', 'Screen Readers'] }
  ];

  const backendPool = [
    { question: 'Explain database normalization and difference between 1NF, 2NF, and 3NF.', topic: 'Databases', expected: 'Structuring columns/tables to reduce redundancy and dependencies.', hints: ['Redundancy', 'Dependencies'] },
    { question: 'How does JWT authentication work and how do you store tokens securely?', topic: 'Security', expected: 'Stateless JSON token signed by server. Stored in HttpOnly cookies.', hints: ['Stateless', 'HttpOnly Cookie'] },
    { question: 'Explain REST API design best practices and HTTP status codes.', topic: 'APIs', expected: 'Singular/plural nouns, HTTP verbs, statelessness, clear status codes.', hints: ['Nouns vs Verbs', 'Status Codes'] },
    { question: 'What is database indexing and how does it improve query performance?', topic: 'Databases', expected: 'B-Tree data structures pointing to rows to avoid full table scans.', hints: ['Data Structure', 'Table Scan'] },
    { question: 'How do you handle concurrency and race conditions in a distributed system?', topic: 'System Design', expected: 'Optimistic locking, pessimistic locking, distributed locks like Redis.', hints: ['Locking', 'Redis Locks'] }
  ];

  const hrQuestions = [
    { question: 'Tell me about yourself and your professional journey.', topic: 'Behavioral', expected: 'Clear summary of background, skills, and interest in target role.', hints: ['Keep it professional', 'Highlight key achievements'] },
    { question: 'Describe a time when you faced a strict deadline and how you handled it.', topic: 'Behavioral', expected: 'Priority setting, task delegation, and communication of risks.', hints: ['STAR Method', 'Prioritization'] },
    { question: 'How do you handle disagreements or conflicts within a development team?', topic: 'Behavioral', expected: 'Empathetic listening, open discussion, and focus on compromise.', hints: ['Communication', 'Collaboration'] },
    { question: 'Why are you interested in joining our company and how do you align with our culture fit?', topic: 'Culture Fit', expected: 'Research on company mission and alignment of values.', hints: ['Company mission', 'Values match'] },
    { question: 'Where do you see yourself in the next five years and what are your career goals?', topic: 'Career Path', expected: 'Ambitions showing desire to learn and take ownership.', hints: ['Growth mindset', 'Long term commitment'] }
  ];

  const category = (role?.toLowerCase()?.includes('front') || role?.toLowerCase()?.includes('ui') || role?.toLowerCase()?.includes('ux')) 
    ? 'frontend' 
    : 'backend';
    
  let baseTechPool = category === 'frontend' ? frontendPool : backendPool;

  // Dynamically insert custom tech focus area questions
  if (focusAreas && focusAreas.length > 0) {
    const customTechQuestions = focusAreas.map(area => ({
      question: `Explain core features of ${area}, how it integrates into the architecture of a ${role} application, and best practices.`,
      topic: area,
      expected: `Accurate architectural explanation and optimization techniques for using ${area} in a ${role} app.`,
      hints: [`${area} best practices`, `${area} core components`, `Integration details`]
    }));
    baseTechPool = [...customTechQuestions, ...baseTechPool];
  }

  // Construct target question pool based on interviewType option
  let questionPool = [];
  if (interviewType === 'Technical') {
    const projectQuestion = {
      question: `In your recent projects, what was the biggest technical challenge you faced and how did you resolve it?`,
      topic: 'Projects',
      expected: 'Specific problem statement, engineering approach, and numerical impact.',
      hints: ['Pick one clear challenge', 'Focus on impact metrics']
    };
    
    for (let i = 0; i < count; i++) {
      if (i === 1 || i === 4) {
        questionPool.push({ ...projectQuestion, typeVal: 'project' });
      } else {
        const qRaw = baseTechPool[i % baseTechPool.length];
        questionPool.push({ ...qRaw, typeVal: 'technical' });
      }
    }
  } else if (interviewType === 'HR') {
    for (let i = 0; i < count; i++) {
      const qRaw = hrQuestions[i % hrQuestions.length];
      questionPool.push({ ...qRaw, typeVal: 'hr' });
    }
  } else {
    // Mixed: tech, project, and hr questions
    for (let i = 0; i < count; i++) {
      if (i % 3 === 0) {
        const qRaw = baseTechPool[Math.floor(i / 3) % baseTechPool.length];
        questionPool.push({ ...qRaw, typeVal: 'technical' });
      } else if (i % 3 === 1) {
        const qRaw = hrQuestions[Math.floor(i / 3) % hrQuestions.length];
        questionPool.push({ ...qRaw, typeVal: 'hr' });
      } else {
        questionPool.push({
          question: `In your recent projects, what was the biggest technical challenge you faced and how did you resolve it?`,
          topic: 'Projects',
          expected: 'Specific problem statement, engineering approach, and numerical impact.',
          hints: ['Pick one clear challenge', 'Focus on impact metrics'],
          typeVal: 'project'
        });
      }
    }
  }

  const list = [];
  for (let i = 0; i < count; i++) {
    const rawQ = questionPool[i % questionPool.length];
    list.push({
      questionNumber: i + 1,
      questionType: rawQ.typeVal,
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
    return getFallbackQuestions(session);
  }
};
