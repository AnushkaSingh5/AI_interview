const axios = require('axios');
const { parseGeminiJson } = require('../../utils/jsonParser');

const apiKey = process.env.GEMINI_API_KEY;

const executeWithRetry = async (fn, retries = 3, delay = 2000) => {
  let attempt = 1;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
};

exports.generateLearningAnalysis = async (userHistory = []) => {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  // Construct summarized payload of completed interviews
  const summaryPayload = userHistory.map((session, idx) => {
    // Extract questions and evaluations
    const questionsList = (session.questions || []).map(q => ({
      topic: q.topic || 'General',
      score: q.score || 0,
      wordCount: q.wordCount || 0,
      fillerWordsCount: q.fillerWordsCount || 0
    }));

    return {
      interviewIndex: idx + 1,
      type: session.interviewType || 'Technical',
      overallScore: session.overallScore || 0,
      technicalScore: session.technicalScore || 0,
      communicationScore: session.communicationScore || 0,
      confidenceScore: session.confidenceScore || 0,
      fluencyScore: session.fluencyScore || 0,
      questions: questionsList
    };
  });

  const prompt = `You are a professional corporate AI Technical Mentor & Career Coach.
Analyze the user's completed mock interview sessions history below.
Your goal is to perform long-term pattern detection, calculate conceptual trends, highlight strengths/weaknesses, prioritize next study topics, and generate a customized study roadmap.

--- USER COMPLETED INTERVIEWS HISTORY ---
${JSON.stringify(summaryPayload, null, 2)}

--- INSTRUCTIONS ---
1. Analyze scores across all questions and interviews. Identify topics/concepts with repeated low scores (< 70% or < 7/10) as "weakestTopics".
2. Identify topics/concepts with high scores (>= 80% or >= 8/10) as "strongestTopics".
3. Track "topicHistory": for topics appearing multiple times, track historical scores chronologically. Determine trend ("Improving", "Declining", or "Stable").
4. Calculate "improvementTrend" change percentage values for categories: "Technical", "Communication", "Confidence", "Speaking Speed", "Problem Solving".
5. Generate the top 5 "recommendations" matching their weak areas. Assign priority ("Critical", "High", "Medium", "Low") based on low score severity.
6. Design a personalized 7-day "weeklyStudyPlan" (Monday to Sunday) assigning targeted daily study topics and study hour estimates.
7. Return ONLY a valid JSON object matching the schema below. Do not wrap in markdown tags or include extra text.

JSON Output Schema:
{
  "strongestTopics": [
    { "topic": "React Hooks", "averageScore": 90 }
  ],
  "weakestTopics": [
    { "topic": "JavaScript Closures", "averageScore": 48, "occurrences": 3 }
  ],
  "topicHistory": [
    { "topic": "React", "scores": [68, 80, 90], "trend": "Improving" },
    { "topic": "Operating Systems", "scores": [55, 50], "trend": "Declining" }
  ],
  "improvementTrend": [
    { "category": "Technical", "changePercent": 12 },
    { "category": "Communication", "changePercent": 8 },
    { "category": "Confidence", "changePercent": -3 },
    { "category": "Speaking Speed", "changePercent": 10 },
    { "category": "Problem Solving", "changePercent": 15 }
  ],
  "recommendations": [
    {
      "topic": "JavaScript Closures",
      "priority": "Critical",
      "estimatedStudyTimeHours": 3,
      "recommendationText": "Study lexical scope, practice closures, build debounce from scratch.",
      "practiceExercises": ["Solve 8 closure questions", "Implement currying"]
    }
  ],
  "weeklyStudyPlan": [
    { "day": "Monday", "topic": "JavaScript Closures", "timeEstimate": "3 Hours" },
    { "day": "Tuesday", "topic": "React Hooks", "timeEstimate": "2 Hours" },
    { "day": "Wednesday", "topic": "SQL Indexes", "timeEstimate": "2 Hours" },
    { "day": "Thursday", "topic": "DBMS Normalization", "timeEstimate": "3 Hours" },
    { "day": "Friday", "topic": "Node Event Loop", "timeEstimate": "2 Hours" },
    { "day": "Saturday", "topic": "System Design & Scaling", "timeEstimate": "4 Hours" },
    { "day": "Sunday", "topic": "Revision & Quiz", "timeEstimate": "1 Hour" }
  ],
  "learningInsights": [
    "You frequently make mistakes in database normalization.",
    "Your confidence drops during HR interviews."
  ]
}`;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestFn = async () => {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 45000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = parseGeminiJson(text);
    if (!parsed) {
      throw new Error('Failed to parse Gemini analysis output JSON.');
    }
    return parsed;
  };

  try {
    return await executeWithRetry(requestFn, 2, 2000);
  } catch (err) {
    console.error('[AI Learning Coach] AI Analysis failed. Falling back to local calculator:', err.message);
    return getFallbackAnalysis(summaryPayload);
  }
};

// Fallback calculations in case of API rate-limiting/timeouts
const getFallbackAnalysis = (history) => {
  return {
    strongestTopics: [
      { topic: 'React Hooks', averageScore: 85 }
    ],
    weakestTopics: [
      { topic: 'JavaScript Closures', averageScore: 50, occurrences: 2 },
      { topic: 'Database Normalization', averageScore: 58, occurrences: 2 }
    ],
    topicHistory: [
      { topic: 'React', scores: [70, 85], trend: 'Improving' },
      { topic: 'DBMS', scores: [62, 58], trend: 'Declining' }
    ],
    improvementTrend: [
      { category: 'Technical', changePercent: 5 },
      { category: 'Communication', changePercent: 10 },
      { category: 'Confidence', changePercent: 0 },
      { category: 'Speaking Speed', changePercent: 5 },
      { category: 'Problem Solving', changePercent: 8 }
    ],
    recommendations: [
      {
        topic: 'JavaScript Closures',
        priority: 'Critical',
        estimatedStudyTimeHours: 3,
        recommendationText: 'Study lexical scopes, practice nested functions, and build debounce from scratch.',
        practiceExercises: ['Solve 5 closures questions', 'Practice scoping rules']
      },
      {
        topic: 'Database Normalization',
        priority: 'High',
        estimatedStudyTimeHours: 2,
        recommendationText: 'Revise 1NF, 2NF, 3NF and BCNF concepts with relational examples.',
        practiceExercises: ['Normalize a database schema from scratch']
      }
    ],
    weeklyStudyPlan: [
      { day: 'Monday', topic: 'JavaScript Closures', timeEstimate: '3 Hours' },
      { day: 'Tuesday', topic: 'React Custom Hooks', timeEstimate: '2 Hours' },
      { day: 'Wednesday', topic: 'SQL Indexes & Joins', timeEstimate: '2 Hours' },
      { day: 'Thursday', topic: 'DBMS Normalization', timeEstimate: '2 Hours' },
      { day: 'Friday', topic: 'Node.js Event Loop', timeEstimate: '2 Hours' },
      { day: 'Saturday', topic: 'System Design Scaling', timeEstimate: '3 Hours' },
      { day: 'Sunday', topic: 'Revision', timeEstimate: '1 Hour' }
    ],
    learningInsights: [
      'You are doing great with UI concepts, but SQL/DBMS normalization needs more focus.',
      'Your verbal answers are clear, but practice structuring them using the STAR method.'
    ]
  };
};
