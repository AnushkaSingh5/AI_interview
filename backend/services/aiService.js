const axios = require('axios');
const questionGenerator = require('./ai/questionGenerator');
const evaluator = require('./ai/evaluator');
const resumeReviewer = require('./ai/resumeReviewer');
const { parseGeminiJson } = require('../utils/parseGeminiJson');
const { executeWithRetry } = require('../utils/geminiRetry');
const { logAiEvent } = require('../utils/logger');

// Ensure GEMINI_API_KEY is present on load
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('\n========================================================================');
  console.error('CRITICAL CONFIGURATION ERROR: GEMINI_API_KEY is missing in backend/.env!');
  console.error('The server cannot start without a valid Gemini API key.');
  console.error('========================================================================\n');
  throw new Error('GEMINI_API_KEY is not defined in environment variables.');
}

const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '***';
console.log(`[AI Service] Initialize: API Key successfully loaded (${maskedKey})`);

/**
 * Core raw Gemini HTTP request function
 */
const rawGeminiRequest = async (prompt, options = {}) => {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  };

  const timeout = options.timeout || 45000;

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout
    });

    const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Empty text candidate returned by Gemini API');
    }
    return candidateText;
  } catch (error) {
    const status = error.response?.status || 'TIMEOUT/NETWORK';
    const message = error.response?.data?.error?.message || error.message;
    console.error(`[AI Service Gemini Request Error] Status: ${status}, Message: ${message}`);
    throw new Error(`Gemini API Request Failed (${status}): ${message}`);
  }
};

/**
 * Health Check API
 */
const checkHealth = async () => {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const startTime = Date.now();

  try {
    const response = await axios.post(
      url,
      { contents: [{ parts: [{ text: 'Hello' }] }] },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const duration = Date.now() - startTime;
    if (response.data && response.data.candidates) {
      return { success: true, model, responseTimeMs: duration };
    }
    throw new Error('Invalid health check response structure');
  } catch (error) {
    const duration = Date.now() - startTime;
    const status = error.response?.status || 'TIMEOUT/NETWORK';
    throw { success: false, model, responseTimeMs: duration, errorStatus: status, errorMessage: error.message };
  }
};

/**
 * 1. Resume Parsing
 */
const parseResume = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Resume text extraction is empty or invalid');
  }

  const maxSafeChars = 12000;
  const trimmedText = text.length > maxSafeChars ? text.substring(0, maxSafeChars) : text;

  const prompt = `
You are an expert resume parser. Analyze the raw resume text below and extract it into a structured JSON object matching this schema:
{
  "personalInformation": { "name": "", "email": "", "phone": "", "bio": "" },
  "education": [{ "institution": "", "degree": "", "fieldOfStudy": "", "startDate": "", "endDate": "", "gpa": "" }],
  "experience": [{ "company": "", "position": "", "startDate": "", "endDate": "", "description": "" }],
  "projects": [{ "title": "", "description": "", "technologies": [] }],
  "certifications": [],
  "achievements": [],
  "technicalSkills": [],
  "softSkills": [],
  "programmingLanguages": [],
  "frameworks": [],
  "databases": [],
  "tools": [],
  "interests": []
}

Resume Raw Text:
${trimmedText}
`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Resume Parsing'
  );
};

/**
 * 2. Interview Question Generation
 */
const generateInterviewQuestions = async (user, resumeData, session) => {
  return await questionGenerator.generateInterviewQuestions(user, resumeData, session);
};

/**
 * 3. Question Answer Evaluation
 */
const evaluateAnswer = async (questionData, answerText, session, options = {}) => {
  return await evaluator.evaluateAnswer(questionData, answerText, session, options);
};

/**
 * 4. Overall Interview Report Compilation
 */
const compileInterviewReport = async (session, evaluations) => {
  return await evaluator.evaluateOverallReport(session, evaluations);
};

/**
 * 5. Practice Hub Question Generation
 */
const generatePracticeQuestions = async ({ mode = 'Technical', topic = 'General', company = '', difficulty = 'Medium', questionCount = 5 }) => {
  const prompt = `Generate ${questionCount} ${difficulty} level interview practice questions for a candidate in mode "${mode}", topic "${topic}", company "${company || 'General'}".
Return strictly a JSON array of objects with the schema:
[
  {
    "question": "Question text here...",
    "expectedAnswer": "Brief expected key concepts..."
  }
]`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Practice Questions'
  );
};

/**
 * 6. Daily Challenge Generation
 */
const generateDailyChallenge = async () => {
  const prompt = `Generate 5 mixed daily interview challenge questions covering JavaScript, React, DBMS, System Design, and Behavioral HR fit.
Return strictly a JSON array of 5 objects matching:
[
  {
    "topic": "Topic Name",
    "question": "Question Text",
    "expectedAnswer": "Key Answer Concepts"
  }
]`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Daily Challenge'
  );
};

/**
 * 7. Personalized Learning Roadmap Generation
 */
const generateLearningRoadmap = async (user, weakTopics = [], interviewCount = 0) => {
  const weakTopicsStr = weakTopics.length > 0 ? weakTopics.join(', ') : 'JavaScript Closures, React Hooks, SQL Joins, Node.js Authentication';
  
  const prompt = `You are a Principal Software Engineering Mentor and Technical Interview Coach.
Generate a comprehensive, highly targeted 4-Week Personalized Interview Preparation Study Roadmap for a candidate targeting the role: "${user?.targetRole || 'Software Engineer'}".
Completed mock interviews analyzed: ${interviewCount}.
Identified priority weak technical areas from evaluations: ${weakTopicsStr}.

Structure a progressive 4-week curriculum covering the candidate's biggest improvement opportunities (e.g., Week 1: JavaScript Closures & Lexical Scope, Week 2: React Hooks & State Management, Week 3: SQL Joins & Query Optimization, Week 4: Node.js Authentication & Security Architecture).

Return strictly a valid JSON object with the following schema:
{
  "summary": "2-3 sentences synthesizing candidate performance patterns, highlighting what to focus on first and expected outcome after 4 weeks.",
  "weeks": [
    {
      "weekNumber": 1,
      "title": "Week 1: Topic Name & Core Angle (e.g. Week 1: JavaScript Closures & Lexical Scope)",
      "topic": "JavaScript Closures",
      "focusArea": "Lexical Scope, Function Factories, Data Encapsulation, Memory Profiling",
      "reason": "Detailed explanation of why this topic is prioritized based on interview analysis.",
      "keyConcepts": [
        "Lexical Environment & Scope Chain",
        "Function Factories & Currying Patterns",
        "Memory Leaks & Garbage Collection Pitfalls",
        "Debouncing & Throttling Scratch Implementation"
      ],
      "estimatedHours": 4,
      "practiceQuestionsCount": 5,
      "completed": false,
      "subtasksCompleted": []
    },
    {
      "weekNumber": 2,
      "title": "Week 2: React Hooks & Component Architecture",
      "topic": "React Hooks",
      "focusArea": "State Lifecycle, Custom Hooks, Dependency Arrays, Render Optimization",
      "reason": "Reinforce frontend architecture and avoid common re-rendering pitfalls.",
      "keyConcepts": [
        "Hook Execution Order & Rules",
        "useCallback vs useMemo Performance Benchmarks",
        "Custom Reusable State Hooks",
        "Context API vs State Management Libraries"
      ],
      "estimatedHours": 4,
      "practiceQuestionsCount": 5,
      "completed": false,
      "subtasksCompleted": []
    },
    {
      "weekNumber": 3,
      "title": "Week 3: SQL Joins, Indexing & Database Internals",
      "topic": "SQL Joins",
      "focusArea": "Relational Modeling, Index Types, Transaction Isolation, Query Plans",
      "reason": "Strengthen backend data modeling and query performance skills.",
      "keyConcepts": [
        "INNER, LEFT, RIGHT & FULL OUTER Joins",
        "B-Tree Indexes & EXPLAIN Query Analysis",
        "ACID Properties & Concurrency Control",
        "Database Normalization (1NF to BCNF)"
      ],
      "estimatedHours": 5,
      "practiceQuestionsCount": 5,
      "completed": false,
      "subtasksCompleted": []
    },
    {
      "weekNumber": 4,
      "title": "Week 4: Node.js Authentication & Security Architecture",
      "topic": "Node.js Authentication",
      "focusArea": "JWT Security, OAuth2 Flows, Password Hashing, Middleware Pipelines",
      "reason": "Master production-grade backend security and authentication design.",
      "keyConcepts": [
        "JWT vs Session Token Trade-offs",
        "Bcrypt Hashing with Salts & Pepper",
        "CORS, Helmet & OWASP Top 10 Protections",
        "Role-Based Access Control (RBAC) Implementation"
      ],
      "estimatedHours": 4,
      "practiceQuestionsCount": 5,
      "completed": false,
      "subtasksCompleted": []
    }
  ]
}`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Learning Roadmap'
  );
};

/**
 * 8. Practice Answer Concept Explanation
 */
const explainConcept = async (topicOrObj, questionParam, userAnswerParam) => {
  let topic = topicOrObj;
  let question = questionParam;
  let userAnswer = userAnswerParam;

  if (typeof topicOrObj === 'object' && topicOrObj !== null) {
    topic = topicOrObj.topic;
    question = topicOrObj.question;
    userAnswer = topicOrObj.userAnswer;
  }

  const prompt = `You are an expert interview coach evaluating a practice answer.
Question: "${question}"
Topic: "${topic}"
Candidate Answer: "${userAnswer}"

Evaluate the candidate answer and provide a JSON response with:
{
  "score": 8, // Integer 0 to 10
  "feedback": "Concise feedback on accuracy...",
  "idealAnswer": "Comprehensive model answer...",
  "conceptExplanation": "Deep-dive explanation of the underlying concepts...",
  "commonMistakes": ["Mistake 1", "Mistake 2"],
  "interviewTips": ["Tip 1", "Tip 2"],
  "relatedTopics": ["Topic 1", "Topic 2"]
}`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Concept Explanation'
  );
};

/**
 * 9. Voice Response Evaluation (Technical + Vocal Communication)
 */
const evaluateVoiceAnswer = async ({ questionText, topic, transcriptText, wordCount = 0, wpm = 0, fillerCount = 0 }) => {
  if (!transcriptText || transcriptText.trim().length === 0 || wordCount === 0) {
    return {
      score: 0,
      technicalScore: 0,
      communicationScore: 0,
      fluencyScore: 0,
      confidenceScore: 0,
      feedback: 'No verbal answer was recorded for this question.',
      idealAnswer: 'Provide a comprehensive answer addressing the question criteria.',
      communicationTips: ['Speak clearly into the microphone.']
    };
  }

  const prompt = `You are a corporate executive interviewer evaluating a verbal voice response.
Question: "${questionText}"
Topic: "${topic}"
Candidate Spoken Transcript: "${transcriptText}"
Word Count: ${wordCount}, Speaking Speed: ${wpm} WPM, Filler Words Detected: ${fillerCount}.

Evaluate both TECHNICAL CONTENT and VOCAL COMMUNICATION QUALITY.
Return strictly a JSON object matching this schema:
{
  "score": 8, // Overall response score 0-10
  "technicalScore": 85, // 0-100 technical correctness
  "communicationScore": 90, // 0-100 communication clarity
  "fluencyScore": 88, // 0-100 fluency & speech flow
  "confidenceScore": 82, // 0-100 vocal confidence
  "feedback": "Detailed feedback on both technical response and vocal delivery style...",
  "idealAnswer": "Comprehensive ideal answer breakdown...",
  "communicationTips": ["Vocal tip 1", "Pacing tip 2"]
}`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Voice Answer Evaluation'
  );
};

/**
 * 10. Voice Interview Overall Report Compilation
 */
const compileVoiceReport = async (role, difficulty, calculatedScores = {}, evaluatedQuestions = []) => {
  const summaryList = evaluatedQuestions.map((q, idx) => ({
    qNum: idx + 1,
    question: q.questionText,
    transcript: q.editedTranscriptText || q.transcriptText || 'No verbal answer provided',
    score: q.score || 0,
    feedback: q.feedback || 'Unanswered / Low score'
  }));

  const prompt = `You are a senior technical interviewer summarizing a completed Voice & Communication Interview Session.
Target Role: "${role}"
Difficulty: "${difficulty}"

Candidate's Pre-Calculated Session Performance Metrics:
- Overall Score: ${calculatedScores.overallScore || 0}%
- Technical Score: ${calculatedScores.technicalScore || 0}%
- Communication Score: ${calculatedScores.communicationScore || 0}%
- Confidence Score: ${calculatedScores.confidenceScore || 0}%
- Fluency Score: ${calculatedScores.fluencyScore || 0}%
- Average WPM: ${calculatedScores.averageWpm || 0} WPM

Question-by-Question Evaluations:
${JSON.stringify(summaryList, null, 2)}

Instructions:
1. DO NOT GENERATE OR MODIFY THE NUMERICAL SCORES. The scores above are mathematical facts calculated directly from the individual question evaluations.
2. If the scores are very low (e.g., candidate gave minimal answers, skipped questions, or scored poorly on questions), your narrative observations and suggestions MUST accurately reflect their weak verbal performance. Do NOT praise a candidate who scored poorly or did not answer questions.
3. Return ONLY a valid JSON object matching this schema:
{
  "overallFeedback": "A comprehensive 2-3 sentence summary paragraph evaluating technical depth, articulation, and vocal delivery...",
  "strengths": ["Top Strength 1", "Top Strength 2"],
  "focusGaps": ["Focus Gap 1", "Focus Gap 2"],
  "recommendations": ["Actionable Recommendation 1", "Actionable Recommendation 2"],
  "grammarObservations": ["Vocal Observation 1", "Vocal Observation 2"],
  "improvementSuggestions": ["Vocal Suggestion 1", "Vocal Suggestion 2"],
  "learningRoadmap": [
    { "priority": "PRIORITY 1", "title": "Key Skill/Topic 1", "description": "Actionable learning strategy..." },
    { "priority": "PRIORITY 2", "title": "Key Skill/Topic 2", "description": "Actionable learning strategy..." },
    { "priority": "PRIORITY 3", "title": "Key Skill/Topic 3", "description": "Actionable learning strategy..." }
  ],
  "skillHeatmap": [
    { "skill": "Technical Core", "stars": 4 },
    { "skill": "Vocal Delivery & Pace", "stars": 3 },
    { "skill": "System Architecture", "stars": 4 },
    { "skill": "Problem Solving & Clarity", "stars": 3 }
  ]
}`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Voice Report Compilation'
  );
};

/**
 * 11. AI Resume Review (Better Wording, Missing Keywords, ATS Improvements, Stronger Project Descriptions)
 */
const reviewResume = async ({ rawText, resumeData, targetRole, targetCompany }) => {
  return await resumeReviewer.reviewResumeWithAI({
    rawText,
    resumeData,
    targetRole,
    targetCompany,
    rawGeminiRequest
  });
};

module.exports = {
  checkHealth,
  parseResume,
  parseResumeWithAI: parseResume, // Backward compatibility alias
  generateInterviewQuestions,
  generateQuestions: generateInterviewQuestions, // Alias
  evaluateAnswer,
  compileInterviewReport,
  evaluateOverallReport: compileInterviewReport, // Alias
  generatePracticeQuestions,
  generateDailyChallenge,
  generateLearningRoadmap,
  explainConcept,
  evaluatePracticeAnswer: explainConcept, // Alias
  evaluateVoiceAnswer,
  compileVoiceReport,
  reviewResume,
  reviewResumeWithAI: reviewResume
};
