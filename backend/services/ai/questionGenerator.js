const axios = require('axios');
const { buildQuestionPrompt } = require('./promptBuilder');
const { validateAIResponse } = require('./responseValidator');
const { executeWithRetry } = require('./retryHandler');
const { getProblemForInterview, CURATED_PROBLEMS } = require('../codingProblemService');
const { getScenarioForInterview, CURATED_SCENARIOS } = require('../systemDesignScenarioService');

const apiKey = process.env.GEMINI_API_KEY;

// Fail-safe rich fallback template questions generator
const getFallbackQuestions = (session) => {
  const role = session.role || 'Software Engineer';
  const count = session.questionCount || 5;
  const difficulty = session.difficulty || 'Medium';
  const interviewType = session.interviewType || 'Technical';
  const focusAreas = session.focusAreas || session.selectedTopics || [];
  const focusAreasLower = focusAreas.map(f => f.toLowerCase());

  const isFullLoop = interviewType === 'FullLoop';
  const wantsCoding = isFullLoop || focusAreasLower.some(f => 
    f.includes('dsa') || f.includes('coding') || f.includes('array') || f.includes('tree') || 
    f.includes('graph') || f.includes('dp') || f.includes('algorithm') || f.includes('binary')
  );
  const wantsSystemDesign = isFullLoop || focusAreasLower.some(f => 
    f.includes('system design') || f.includes('distributed') || f.includes('caching') || 
    f.includes('microservice') || f.includes('scale')
  );

  const list = [];
  let codingProblem = getProblemForInterview({ topics: focusAreas, difficulty });
  let systemDesignScenario = CURATED_SCENARIOS[0];

  for (let i = 0; i < count; i++) {
    const qNum = i + 1;

    // In FullLoop or when topics matched, inject Coding & System Design
    if (isFullLoop) {
      if (qNum === count - 1 || (count <= 3 && qNum === 2)) {
        // Coding Round
        list.push({
          questionNumber: qNum,
          stageNumber: 2,
          stageName: 'Live Algorithmic Coding Challenge',
          questionType: 'coding',
          topic: codingProblem.category || 'Algorithms & Data Structures',
          difficulty: codingProblem.difficulty || difficulty,
          question: codingProblem.title + ': ' + codingProblem.description,
          expectedAnswer: 'Optimal solution with clean time and space complexity adhering to constraints.',
          hints: codingProblem.constraints || ['Consider hash map for O(N) lookup', 'Handle boundary edge cases'],
          codingDetails: {
            problemId: codingProblem.problemId,
            category: codingProblem.category,
            functionName: 'solution',
            starterTemplates: codingProblem.starterCode || {},
            sampleTestCases: (codingProblem.examples || []).map(ex => ({ input: ex.input, expectedOutput: ex.output, explanation: ex.explanation })),
            hiddenTestCases: (codingProblem.testCases || []).map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
            constraints: codingProblem.constraints || [],
            selectedLanguage: 'javascript',
            userCode: codingProblem.starterCode?.javascript || ''
          }
        });
        continue;
      } else if (qNum === count || (count <= 3 && qNum === 3)) {
        // System Design Round
        list.push({
          questionNumber: qNum,
          stageNumber: 3,
          stageName: 'Distributed System Design Studio',
          questionType: 'system_design',
          topic: systemDesignScenario.domain || 'Distributed Architecture',
          difficulty: systemDesignScenario.difficulty || difficulty,
          question: systemDesignScenario.title + ': ' + systemDesignScenario.description,
          expectedAnswer: 'High-availability distributed architecture with clear microservices, caching, and data modeling.',
          hints: systemDesignScenario.keyArchitectureFocus || ['Design API endpoints', 'Implement multi-tier cache', 'Address failover'],
          systemDesignDetails: {
            problemId: systemDesignScenario.problemId,
            domain: systemDesignScenario.domain,
            overview: systemDesignScenario.description,
            functionalRequirements: systemDesignScenario.functionalRequirements || [],
            nonFunctionalRequirements: systemDesignScenario.nonFunctionalRequirements || [],
            scaleEstimates: systemDesignScenario.scaleEstimates || [],
            starterComponents: systemDesignScenario.starterComponents || [],
            diagramNodes: systemDesignScenario.starterComponents || [],
            diagramConnections: []
          }
        });
        continue;
      }
    } else {
      // Dynamic Question Embedding if topics requested
      if (wantsCoding && qNum === 2) {
        list.push({
          questionNumber: qNum,
          stageNumber: 1,
          stageName: 'Technical Coding Round',
          questionType: 'coding',
          topic: codingProblem.category || 'Algorithms',
          difficulty: codingProblem.difficulty || difficulty,
          question: codingProblem.title + ': ' + codingProblem.description,
          expectedAnswer: 'Optimal solution with clean time and space complexity.',
          hints: codingProblem.constraints || ['Check boundary conditions'],
          codingDetails: {
            problemId: codingProblem.problemId,
            category: codingProblem.category,
            functionName: 'solution',
            starterTemplates: codingProblem.starterCode || {},
            sampleTestCases: (codingProblem.examples || []).map(ex => ({ input: ex.input, expectedOutput: ex.output })),
            hiddenTestCases: (codingProblem.testCases || []).map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
            constraints: codingProblem.constraints || [],
            selectedLanguage: 'javascript',
            userCode: codingProblem.starterCode?.javascript || ''
          }
        });
        continue;
      }

      if (wantsSystemDesign && qNum === Math.min(count, 3)) {
        list.push({
          questionNumber: qNum,
          stageNumber: 1,
          stageName: 'System Architecture Round',
          questionType: 'system_design',
          topic: systemDesignScenario.domain || 'System Design',
          difficulty: systemDesignScenario.difficulty || difficulty,
          question: systemDesignScenario.title + ': ' + systemDesignScenario.description,
          expectedAnswer: 'Scalable architecture addressing SLAs and database models.',
          hints: systemDesignScenario.keyArchitectureFocus || ['Define caching strategy'],
          systemDesignDetails: {
            problemId: systemDesignScenario.problemId,
            domain: systemDesignScenario.domain,
            overview: systemDesignScenario.description,
            functionalRequirements: systemDesignScenario.functionalRequirements || [],
            nonFunctionalRequirements: systemDesignScenario.nonFunctionalRequirements || [],
            scaleEstimates: systemDesignScenario.scaleEstimates || [],
            starterComponents: systemDesignScenario.starterComponents || [],
            diagramNodes: systemDesignScenario.starterComponents || [],
            diagramConnections: []
          }
        });
        continue;
      }
    }

    // Standard Technical / Behavioral Question
    list.push({
      questionNumber: qNum,
      stageNumber: 1,
      stageName: 'Technical & Behavioral Screening',
      questionType: i % 2 === 0 ? 'technical' : 'behavioral',
      topic: focusAreas[i % Math.max(1, focusAreas.length)] || (i % 2 === 0 ? 'System Architecture' : 'Behavioral & Culture'),
      difficulty: difficulty,
      question: i % 2 === 0
        ? `Explain the architectural design and scaling considerations of using ${focusAreas[0] || 'asynchronous queues and caching'} in a ${role} production application.`
        : `Describe a challenging situation in your engineering projects where you had to make a difficult trade-off under strict deadlines.`,
      expectedAnswer: 'Thorough explanation covering performance, reliability, and structured decision-making.',
      hints: ['Structure using STAR or technical breakdown', 'Discuss trade-offs']
    });
  }

  return list;
};

exports.generateInterviewQuestions = async (user, resumeData, session) => {
  const currentApiKey = process.env.GEMINI_API_KEY || apiKey;
  const prompt = buildQuestionPrompt(user, resumeData, session);

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentApiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 3500,
        responseMimeType: 'application/json'
      }
    };

    const response = await executeWithRetry(async () => {
      return await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      });
    }, 2, 1000);

    const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Empty response received from Gemini AI model');
    }

    let parsedQuestions = JSON.parse(candidateText.trim());
    if (!Array.isArray(parsedQuestions)) {
      if (parsedQuestions.questions && Array.isArray(parsedQuestions.questions)) {
        parsedQuestions = parsedQuestions.questions;
      } else {
        throw new Error('Response JSON is not an array of questions');
      }
    }

    // Hydrate interactive coding and system design details if missing
    const enrichedQuestions = parsedQuestions.map((q, idx) => {
      const qNum = idx + 1;
      const qType = (q.questionType || 'technical').toLowerCase();

      let stageNumber = 1;
      let stageName = 'Technical & Behavioral Screening';
      if (session.interviewType === 'FullLoop') {
        if (qType === 'coding') {
          stageNumber = 2;
          stageName = 'Live Algorithmic Coding Challenge';
        } else if (qType === 'system_design') {
          stageNumber = 3;
          stageName = 'Distributed System Design Studio';
        }
      }

      const enriched = {
        questionNumber: qNum,
        stageNumber,
        stageName,
        questionType: qType,
        topic: q.topic || 'Engineering',
        difficulty: q.difficulty || session.difficulty || 'Medium',
        question: q.question,
        expectedAnswer: q.expectedAnswer || 'Clear technical answer required.',
        hints: q.hints || []
      };

      if (qType === 'coding') {
        const prob = getProblemForInterview({ topics: [q.topic], difficulty: q.difficulty || session.difficulty });
        enriched.codingDetails = {
          problemId: prob.problemId,
          category: prob.category || q.topic,
          functionName: 'solution',
          starterTemplates: prob.starterCode || {},
          sampleTestCases: (prob.examples || []).map(ex => ({ input: ex.input, expectedOutput: ex.output, explanation: ex.explanation })),
          hiddenTestCases: (prob.testCases || []).map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
          constraints: prob.constraints || q.hints || [],
          selectedLanguage: 'javascript',
          userCode: prob.starterCode?.javascript || ''
        };
      }

      if (qType === 'system_design') {
        const scn = CURATED_SCENARIOS[0];
        enriched.systemDesignDetails = {
          problemId: scn.problemId,
          domain: scn.domain || q.topic,
          overview: q.question || scn.description,
          functionalRequirements: q.systemDesignDetails?.functionalRequirements || scn.functionalRequirements || [],
          nonFunctionalRequirements: q.systemDesignDetails?.nonFunctionalRequirements || scn.nonFunctionalRequirements || [],
          scaleEstimates: q.systemDesignDetails?.scaleEstimates || scn.scaleEstimates || [],
          starterComponents: scn.starterComponents || [],
          diagramNodes: scn.starterComponents || [],
          diagramConnections: []
        };
      }

      return enriched;
    });

    return enrichedQuestions;
  } catch (error) {
    console.warn('[AI Service] Gemini question generation failed, using rich local fallback generator:', error.message);
    return getFallbackQuestions(session);
  }
};
