const axios = require('axios');
const questionGenerator = require('./ai/questionGenerator');
const evaluator = require('./ai/evaluator');
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
const generateLearningRoadmap = async (user, weakTopics = []) => {
  const prompt = `Create a 4-week personalized interview preparation roadmap for a candidate targeting the role "${user?.targetRole || 'Software Engineer'}".
Weak areas identified: ${weakTopics.join(', ') || 'DBMS, System Design, React'}.

Return strictly a JSON array of 4 objects with this schema:
[
  {
    "weekNumber": 1,
    "topic": "Topic Name",
    "focusArea": "Key Focus Area",
    "reason": "Why this topic is prioritized"
  }
]`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Learning Roadmap'
  );
};

/**
 * 8. Practice Answer Concept Explanation
 */
const explainConcept = async (topic, question, userAnswer) => {
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
const compileVoiceReport = async (role, difficulty, evaluatedQuestions = []) => {
  const prompt = `You are a senior interview analytics engine compiling a final Voice & Communication Report.
Target Role: "${role}"
Difficulty: "${difficulty}"
Questions & Candidate Transcripts: ${JSON.stringify(evaluatedQuestions.map(q => ({ question: q.questionText, score: q.score, wpm: q.speakingSpeedWpm, fillers: q.fillerWordsCount })))}

Return strictly a JSON object with overall metrics:
{
  "overallScore": 84,
  "technicalScore": 85,
  "communicationScore": 88,
  "confidenceScore": 82,
  "fluencyScore": 86,
  "averageWpm": 135,
  "speakingPace": "Optimal", // 'Slow', 'Optimal', 'Fast'
  "grammarObservations": ["Observation 1", "Observation 2"],
  "improvementSuggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}`;

  return await executeWithRetry(
    (p) => rawGeminiRequest(p),
    prompt,
    'Voice Report Compilation'
  );
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
  compileVoiceReport
};
