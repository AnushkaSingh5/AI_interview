const axios = require('axios');

const apiKey = process.env.GEMINI_API_KEY;

const extractAndParseJSON = (rawText) => {
  if (!rawText) return null;
  console.log(`[AI Evaluator] Raw Response to parse:\n${rawText}`);

  let trimmed = rawText.trim();
  
  // Remove markdown JSON code blocks if present
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  }

  // Find first { and last } to extract pure JSON block
  const startIdx = trimmed.indexOf('{');
  const endIdx = trimmed.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    trimmed = trimmed.substring(startIdx, endIdx + 1);
  }

  try {
    const parsed = JSON.parse(trimmed);
    console.log(`[AI Evaluator] Successfully parsed JSON structure.`);
    return parsed;
  } catch (err) {
    console.error(`[AI Evaluator] JSON Parsing Error: ${err.message}. Raw segment was:\n${trimmed}`);
    throw err;
  }
};

// Utility to execute requests with custom backoff retry delays
const executeWithRetry = async (fn, retries = 4, baseDelays = [2000, 5000, 10000, 20000], isRetryable = () => true) => {
  let attempt = 1;
  while (attempt <= retries) {
    try {
      return await fn(attempt);
    } catch (error) {
      console.warn(`[AI Evaluator] Retry Attempt ${attempt}/${retries} failed. Error: ${error.message}`);
      if (attempt === retries || !isRetryable(error)) {
        throw error;
      }
      const delayMs = baseDelays[attempt - 1] || 2000;
      console.log(`[AI Evaluator] Rate-limit (429/503) warning. Waiting ${delayMs}ms before retrying...`);
      await new Promise(res => setTimeout(res, delayMs));
      attempt++;
    }
  }
};

// 1. Evaluate single answer
exports.evaluateAnswer = async (questionData, answerText, session, options = {}) => {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `
You are a highly experienced professional corporate interviewer. 
Evaluate the candidate's response to the following interview question.

--- MOCK SESSION INFO ---
Target Role: ${session.role}
Candidate Experience: ${session.experienceLevel}
Interview Type: ${session.interviewType}
Difficulty: ${session.difficulty}

--- QUESTION PARAMETERS ---
Topic: ${questionData.topic}
Question Type: ${questionData.questionType}
Question: ${questionData.question}
Expected Answer Guide: ${questionData.expectedAnswer || 'N/A'}

--- CANDIDATE RESPONSE ---
"${answerText || '[No answer response provided]'}"

--- EVALUATION GUIDELINES ---
1. Score the answer from 0 to 10 based on Accuracy, Technical Depth, Completeness, Communication, and Confidence.
2. If no answer is provided, set all score fields to 0, feedback to "No response provided", and empty array for missingPoints.
3. Identify crucial missing concepts that were expected but not mentioned.
4. Give actionable suggestions on how to improve the response.
5. Write the ideal response they should have given.
6. Return ONLY a valid JSON object. Do not include markdown code block fences (like \`\`\`json) or any conversational text.
7. CRITICAL: Do NOT wrap the JSON inside markdown fences (like \`\`\`json ... \`\`\`). Do NOT include any intro or outro text. Return a clean JSON block starting with { and ending with }.

JSON Schema Output:
{
  "score": 8,
  "accuracy": 9,
  "completeness": 8,
  "communication": 8,
  "technicalDepth": 7,
  "confidence": 8,
  "feedback": "Feedback details...",
  "missingPoints": ["Point A", "Point B"],
  "improvementSuggestions": ["Suggestion A", "Suggestion B"],
  "idealAnswer": "Ideal answer text..."
}
`;

  const requestFn = async (attempt) => {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const data = extractAndParseJSON(textResponse);
    if (!data) {
      throw new Error('Gemini returned empty or invalid JSON text response.');
    }

    // Validate critical fields
    if (data.score === undefined || data.feedback === undefined) {
      console.warn(`[AI Evaluator] Critical fields missing in Gemini response. raw score: ${data.score}`);
      throw new Error('Missing critical evaluation properties: score or feedback.');
    }

    // Safe schema numerical properties alignment (defaults to score or 5)
    const numFields = ['score', 'accuracy', 'completeness', 'communication', 'technicalDepth', 'confidence'];
    numFields.forEach(field => {
      if (data[field] === undefined || typeof data[field] !== 'number' || isNaN(data[field])) {
        data[field] = typeof data.score === 'number' ? data.score : 5;
      }
    });

    // Handle 0-100 score format scaling if Gemini outputs it
    if (data.score > 10) {
      data.score = Math.round(data.score / 10);
    }

    // Ensure array structure safety
    if (!Array.isArray(data.missingPoints)) data.missingPoints = [];
    if (!Array.isArray(data.improvementSuggestions)) data.improvementSuggestions = [];
    if (typeof data.idealAnswer !== 'string') data.idealAnswer = '';

    return {
      ...data,
      evaluationEngine: 'Gemini'
    };
  };

  const isRetryableError = (error) => {
    const status = error.response?.status;
    return !status || [429, 500, 502, 503, 504].includes(status) || error instanceof SyntaxError;
  };

  try {
    if (options.forceLocal) {
      throw new Error('Short-circuiting due to Gemini rate limits');
    }
    return await executeWithRetry(requestFn, 1, [], isRetryableError);
  } catch (err) {
    console.error(`[AI Evaluator] Failed to evaluate answer. Falling back to local scoring: ${err.message}`);
    
    const isSkipped = !answerText || answerText.trim().length === 0 || (options.behavior && options.behavior.skipped);
    
    if (isSkipped) {
      return {
        score: 0,
        accuracy: 0,
        completeness: 0,
        communication: 0,
        technicalDepth: 0,
        confidence: 0,
        feedback: "No response was recorded for this question. It was skipped by the candidate.",
        missingPoints: ["Entire implementation details", "Technical responses"],
        improvementSuggestions: ["Do not skip questions during the live interview.", "Provide at least a partial response or state your general approach."],
        idealAnswer: questionData.expectedAnswer || "Provide a comprehensive answer addressing the question criteria.",
        isQuotaExhausted: true,
        evaluationEngine: 'Local'
      };
    }

    const text = answerText.trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // 1. Keyword Overlap Heuristic
    const targetKeywords = [];
    if (questionData.question) {
      const words = questionData.question.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
      const filtered = words.filter(w => w.length > 4 && !['about', 'after', 'their', 'there', 'would', 'should', 'could', 'which', 'other', 'under', 'explain'].includes(w));
      targetKeywords.push(...filtered);
    }
    if (questionData.expectedAnswer) {
      const words = questionData.expectedAnswer.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
      const filtered = words.filter(w => w.length > 4 && !['about', 'after', 'their', 'there', 'would', 'should', 'could', 'which', 'other', 'under'].includes(w));
      targetKeywords.push(...filtered);
    }
    const uniqueKeywords = [...new Set(targetKeywords)].filter(w => w.length > 2);
    
    let matchCount = 0;
    const lowerText = text.toLowerCase();
    uniqueKeywords.forEach(kw => {
      if (lowerText.includes(kw)) matchCount++;
    });

    const keywordRatio = uniqueKeywords.length > 0 ? matchCount / uniqueKeywords.length : 0.5;

    // 2. Technical Vocabulary Density
    const techWords = ['architecture', 'optimization', 'performance', 'latency', 'scaling', 'asynchronous', 'concurrency', 'state', 'component', 'props', 'context', 'hook', 'middleware', 'database', 'schema', 'query', 'index', 'normalization', 'transaction', 'security', 'encryption', 'rest', 'api', 'http', 'websocket', 'multithreading', 'garbage', 'collection', 'memory', 'leak', 'cache', 'redis', 'kafka', 'docker', 'kubernetes', 'cloud', 'aws', 'design', 'solid', 'oop', 'functional'];
    let techWordCount = 0;
    techWords.forEach(w => {
      const reg = new RegExp(`\\b${w}\\b`, 'gi');
      const matches = text.match(reg);
      if (matches) techWordCount += matches.length;
    });
    const techDensity = Math.min(1.0, techWordCount / 5);

    // 3. Length Scaling
    const lengthScore = Math.min(10, Math.ceil(wordCount / 12));

    // 4. Response Time Speed Penalties
    let speedPenalty = 0;
    if (options.behavior && options.behavior.timeTaken) {
      const seconds = options.behavior.timeTaken;
      if (seconds < 5 && wordCount > 5) {
        speedPenalty = 3;
      } else if (seconds > 300) {
        speedPenalty = 1;
      }
    }

    // Calculate individual scores
    let accuracy = Math.min(10, Math.max(1, Math.round(keywordRatio * 8 + lengthScore * 0.2)));
    let completeness = Math.min(10, Math.max(1, Math.round(lengthScore * 0.8 + keywordRatio * 2)));
    let technicalDepth = Math.min(10, Math.max(1, Math.round(techDensity * 7 + keywordRatio * 3)));
    let communication = Math.min(10, Math.max(1, Math.round(lengthScore * 0.6 + 4)));
    let confidence = Math.min(10, Math.max(1, Math.round(speedPenalty > 0 ? 5 : 8)));

    if (speedPenalty > 0) {
      accuracy = Math.max(1, accuracy - speedPenalty);
      completeness = Math.max(1, completeness - speedPenalty);
      technicalDepth = Math.max(1, technicalDepth - speedPenalty);
      confidence = Math.max(1, confidence - speedPenalty);
    }

    const averageScore = Math.round((accuracy + completeness + technicalDepth + communication + confidence) / 5);

    let feedback = '';
    const suggestions = [];
    const missing = [];

    if (averageScore >= 8) {
      feedback = "Excellent response. You showed a very strong grasp of the concept, explained the architecture clearly, and used highly relevant technical terms.";
      suggestions.push("Focus on demonstrating how you applied this in a production environment.", "Discuss scale limitations or trade-offs.");
      missing.push("High-level trade-offs", "Production scaling limitations");
    } else if (averageScore >= 6) {
      feedback = "Good response, but needs more depth. You identified the core concept but missed secondary details, architectural principles, or code implementation details.";
      suggestions.push("Describe the internal workings of the framework/mechanism.", "Use more specific keywords such as optimization and scaling.");
      missing.push("Internal architectural internals", "Concrete syntax examples");
    } else {
      feedback = "Weak response. The answer is too brief, missing technical vocabulary, or didn't address the core question parameters.";
      suggestions.push("Write a longer answer explaining the background concepts first.", "Use relevant industry terminology and technical keywords.");
      missing.push("Core conceptual definition", "Fundamental framework mechanisms");
    }

    return {
      score: averageScore,
      accuracy,
      completeness,
      communication,
      technicalDepth,
      confidence,
      feedback,
      missingPoints: missing,
      improvementSuggestions: suggestions,
      idealAnswer: questionData.expectedAnswer || "Provide a comprehensive answer addressing the question criteria.",
      isQuotaExhausted: true,
      evaluationEngine: 'Local'
    };
  }
};

// 2. Compile overall interview report summary
exports.compileOverallReport = async (evaluatedQuestions, session, options = {}) => {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 1. Locally calculate aggregate scores
  const scores = evaluatedQuestions.map(q => q.evaluation.score);
  const totalQuestionsCount = scores.length || 1;
  const computedOverall = Math.round((scores.reduce((a, b) => a + b, 0) / (totalQuestionsCount * 10)) * 100);

  const techQuestions = evaluatedQuestions.filter(q => q.question.questionType === 'technical');
  const computedTech = techQuestions.length > 0
    ? Math.round((techQuestions.map(q => q.evaluation.score).reduce((a, b) => a + b, 0) / (techQuestions.length * 10)) * 100)
    : computedOverall;

  const hrQuestions = evaluatedQuestions.filter(q => q.question.questionType === 'behavioral' || q.question.questionType === 'hr');
  const computedHR = hrQuestions.length > 0
    ? Math.round((hrQuestions.map(q => q.evaluation.score).reduce((a, b) => a + b, 0) / (hrQuestions.length * 10)) * 100)
    : computedOverall;

  const communicationScores = evaluatedQuestions.map(q => q.evaluation.communication || q.evaluation.score);
  const computedComm = communicationScores.length > 0
    ? Math.round((communicationScores.reduce((a, b) => a + b, 0) / (communicationScores.length * 10)) * 100)
    : computedOverall;

  const confidenceScores = evaluatedQuestions.map(q => q.evaluation.confidence || q.evaluation.score);
  const computedConf = confidenceScores.length > 0
    ? Math.round((confidenceScores.reduce((a, b) => a + b, 0) / (confidenceScores.length * 10)) * 100)
    : computedOverall;

  // 2. Map summaries to keep tokens small
  const summaryList = evaluatedQuestions.map(q => ({
    questionNumber: q.question.questionNumber,
    question: q.question.question,
    type: q.question.questionType,
    score: q.evaluation.score,
    feedback: q.evaluation.feedback
  }));

  let behaviorContext = '';
  if (options.behavior) {
    const { totalTimeSeconds, avgTimePerQuestion, skippedCount, completionRate, avgWordCount } = options.behavior;
    behaviorContext = `
--- CANDIDATE INTERVIEW BEHAVIOR METRICS ---
Total Session Duration: ${totalTimeSeconds} seconds
Average Time per Question: ${avgTimePerQuestion?.toFixed(1) || 0} seconds
Questions Skipped initially: ${skippedCount || 0}
Overall Completion Rate: ${completionRate?.toFixed(1) || 0}%
Average Response Word Count: ${avgWordCount?.toFixed(1) || 0} words
`;
  }

  const prompt = `
You are a senior hiring manager compiling a final interview review card.
Analyze the following list of evaluated questions to construct an overall performance report.

--- MOCK INTERVIEW CONTEXT ---
Role: ${session.role}
Difficulty: ${session.difficulty}
Experience Level: ${session.experienceLevel}
Focus Areas: ${session.focusAreas?.join(', ') || 'N/A'}
${behaviorContext}

--- QUESTIONS EVALUATION SUMMARIES ---
${JSON.stringify(summaryList, null, 2)}

--- REPORT GENERATION GUIDELINES ---
1. Generate strengths: 3 items outlining technical or communication capabilities demonstrated.
2. Generate weaknesses: 3 items outlining key conceptual gaps or improvement needs.
3. Generate recommendations: 3 specific learning actions.
4. Create a learning roadmap listing priorities (Priority 1 to 5) with specific topics and reasons.
5. Create a skill heatmap containing 3-5 relevant skills and rating stars (1 to 5).
6. Return ONLY a valid JSON object matching the JSON Schema below.
7. CRITICAL: Do NOT wrap the JSON inside markdown fences (like \`\`\`json ... \`\`\`). Do NOT include any intro or outro text. Return a clean JSON block starting with { and ending with }.

JSON Schema Output:
{
  "strengths": ["Strength A", "Strength B", "Strength C"],
  "weaknesses": ["Weakness A", "Weakness B", "Weakness C"],
  "recommendations": ["Rec A", "Rec B"],
  "learningRoadmap": [
    { "priority": "Priority 1", "topic": "React Hooks", "reason": "Reason details..." },
    { "priority": "Priority 2", "topic": "SQL Joins", "reason": "Reason details..." }
  ],
  "skillHeatmap": [
    { "skill": "React", "stars": 5 },
    { "skill": "Node.js", "stars": 4 },
    { "skill": "DBMS", "stars": 2 }
  ],
  "overallFeedback": "Overall summarized report feedback..."
}
`;

  const requestFn = async (attempt) => {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 35000
      }
    );

    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const data = extractAndParseJSON(textResponse);
    if (!data) {
      throw new Error('Gemini returned empty or invalid JSON text response during overall report compilation.');
    }
    
    // Inject locally computed scores
    return {
      overallScore: computedOverall,
      technicalScore: computedTech,
      hrScore: computedHR,
      communicationScore: computedComm,
      confidenceScore: computedConf,
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      learningRoadmap: Array.isArray(data.learningRoadmap) ? data.learningRoadmap : [],
      skillHeatmap: Array.isArray(data.skillHeatmap) ? data.skillHeatmap : [],
      overallFeedback: typeof data.overallFeedback === 'string' ? data.overallFeedback : ''
    };
  };

  const isRetryableError = (error) => {
    const status = error.response?.status;
    return !status || [429, 500, 502, 503, 504].includes(status) || error instanceof SyntaxError;
  };

  try {
    return await executeWithRetry(requestFn, 1, [], isRetryableError);
  } catch (err) {
    console.error(`[AI Evaluator] Failed to compile overall report. Falling back to local computations: ${err.message}`);
    
    const strengthsList = [];
    const weaknessesList = [];
    const recommendationsList = [];
    const roadmapList = [];
    const heatmapList = [];

    // Analyze individual scores
    evaluatedQuestions.forEach((q, index) => {
      const topic = q.question.topic || "Core Concepts";
      const score = q.evaluation.score; // 0-10

      if (score >= 8) {
        strengthsList.push(`Demonstrated mastery in ${topic}`);
        heatmapList.push({ skill: topic, stars: 5 });
      } else if (score >= 6) {
        strengthsList.push(`Good foundation in ${topic}`);
        heatmapList.push({ skill: topic, stars: 4 });
        recommendationsList.push(`Deepen technical depth in ${topic} by reviewing advanced architectures.`);
      } else {
        weaknessesList.push(`Significant conceptual gaps in ${topic}`);
        heatmapList.push({ skill: topic, stars: 2 });
        recommendationsList.push(`Revise core principles of ${topic} to avoid basic implementation mistakes.`);
        
        const priorityNum = roadmapList.length + 1;
        if (priorityNum <= 5) {
          roadmapList.push({
            priority: `Priority ${priorityNum}`,
            topic: topic,
            reason: `Question score was ${score * 10}% which shows a clear need for revisions.`
          });
        }
      }
    });

    // Safeguard empty arrays with default fillers
    if (strengthsList.length === 0) {
      strengthsList.push("Broad conceptual familiarity", "Basic communication structure");
    }
    if (weaknessesList.length === 0) {
      weaknessesList.push("Advanced optimization criteria", "Edge case handling");
    }
    if (recommendationsList.length === 0) {
      recommendationsList.push("Practice mock coding challenges under live exam pressure.", "Outline solutions structurally before starting.");
    }
    
    // Build learning roadmap if it's empty
    if (roadmapList.length === 0) {
      roadmapList.push(
        { priority: "Priority 1", topic: "Advanced Optimizations", reason: "Optimize performance metrics." },
        { priority: "Priority 2", topic: "Edge Cases", reason: "Prevent runtime exceptions." }
      );
    }

    // Build skill heatmap if it's empty
    if (heatmapList.length === 0) {
      heatmapList.push(
        { skill: session.role || "General", stars: 4 },
        { skill: "Communication", stars: 4 }
      );
    }

    // Limit array sizes to keep layout clean
    const finalStrengths = [...new Set(strengthsList)].slice(0, 3);
    const finalWeaknesses = [...new Set(weaknessesList)].slice(0, 3);
    const finalRecommendations = [...new Set(recommendationsList)].slice(0, 3);

    // Limit heatmap to unique skills
    const uniqueSkillsMap = {};
    heatmapList.forEach(item => {
      uniqueSkillsMap[item.skill] = Math.max(uniqueSkillsMap[item.skill] || 0, item.stars);
    });
    const finalHeatmap = Object.keys(uniqueSkillsMap).map(skill => ({
      skill,
      stars: uniqueSkillsMap[skill]
    })).slice(0, 5);

    let overallFeedback = "";
    if (computedOverall >= 85) {
      overallFeedback = `Excellent performance. You displayed clear senior-level domain expertise for the ${session.role} role. Minor structural tuning on edge cases is recommended.`;
    } else if (computedOverall >= 70) {
      overallFeedback = `Strong, well-structured performance. You have a solid grasp of core technical workflows but need to enrich your answers with production scaling details.`;
    } else if (computedOverall >= 50) {
      overallFeedback = `Satisfactory attempt. You successfully answered baseline concepts but showed gaps in advanced topics. Revise target focus areas.`;
    } else {
      overallFeedback = `Needs revision. Significant gaps were observed across most questions. Focus on the learning roadmap topics to establish a solid baseline.`;
    }

    return {
      overallScore: computedOverall,
      technicalScore: computedTech,
      hrScore: computedHR,
      communicationScore: computedComm,
      confidenceScore: computedConf,
      strengths: finalStrengths,
      weaknesses: finalWeaknesses,
      recommendations: finalRecommendations,
      learningRoadmap: roadmapList.slice(0, 5),
      skillHeatmap: finalHeatmap,
      overallFeedback,
      evaluationEngine: 'Local'
    };
  }
};
