const CodingInterview = require('../models/CodingInterview');
const { getProblemForInterview, CURATED_PROBLEMS } = require('../services/codingProblemService');
const { runCode } = require('../services/codeExecutionService');
const { reviewCodeQuality } = require('../services/ai/codeReviewer');

/**
 * Creates a new Coding Interview Session
 */
exports.createSession = async (req, res) => {
  try {
    const {
      role = 'Software Engineer',
      difficulty = 'Medium',
      topic = 'Algorithms & Data Structures',
      topics = [],
      selectedLanguage = 'javascript',
      timeLimitMinutes = 45
    } = req.body;

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - user not authenticated' });
    }

    // Normalize topics
    let finalTopics = [];
    if (Array.isArray(topics) && topics.length > 0) {
      finalTopics = topics;
    } else if (typeof topic === 'string' && topic.includes(',')) {
      finalTopics = topic.split(',').map(t => t.trim()).filter(Boolean);
    } else if (topic) {
      finalTopics = [topic];
    } else {
      finalTopics = ['Arrays'];
    }

    const finalTopicStr = finalTopics.join(', ');
    const normalizedLang = (selectedLanguage || 'javascript').toLowerCase();

    const sessionId = `code-session-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const problem = await getProblemForInterview({
      difficulty,
      topic: finalTopicStr,
      topics: finalTopics,
      role
    });

    const starterCodeForLang = 
      problem.starterCode?.[normalizedLang] || 
      problem.starterCode?.javascript || 
      problem.starterCode?.c || 
      problem.starterCode?.cpp || '';

    const newCodingInterview = new CodingInterview({
      sessionId,
      user: userId,
      title: `${role} - ${finalTopicStr} Coding Round`,
      role,
      difficulty,
      topic: finalTopicStr,
      topics: finalTopics,
      selectedLanguage: normalizedLang,
      timeLimitMinutes: Number(timeLimitMinutes) || 45,
      status: 'In Progress',
      problems: [
        {
          problemId: problem.problemId,
          title: problem.title,
          difficulty: problem.difficulty || difficulty,
          category: problem.category || finalTopicStr,
          description: problem.description,
          constraints: problem.constraints || [],
          examples: problem.examples || [],
          starterCode: problem.starterCode || {},
          testCases: problem.testCases || [],
          userCode: starterCodeForLang,
          selectedLanguage: normalizedLang,
          executionResults: [],
          testCasesPassed: 0,
          totalTestCases: (problem.testCases || []).length,
          score: 0
        }
      ]
    });

    await newCodingInterview.save();

    return res.status(201).json({
      success: true,
      sessionId,
      session: newCodingInterview
    });
  } catch (error) {
    console.error('[CodingController] Error creating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create coding interview session',
      error: error.message
    });
  }
};

/**
 * Gets Coding Interview Session by ID
 */
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await CodingInterview.findOne({
      $or: [{ sessionId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).populate('user', 'fullName name email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Coding interview session not found'
      });
    }

    // Check if session was terminated in between
    if (session.status === 'Terminated in between' || session.status === 'Terminated') {
      const resumeCount = session.resumedTerminatedCount || session.resumedCount || 0;
      if (resumeCount >= 1) {
        return res.status(400).json({
          success: false,
          status: 'terminated_limit_reached',
          canResume: false,
          message: 'This coding interview was terminated and has already used its one-time resume limit. Please start a new coding interview.'
        });
      }

      // Allow 1-time resume
      session.resumedTerminatedCount = 1;
      session.resumedCount = 1;
      session.status = 'In Progress';
      await session.save();
    }

    return res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('[CodingController] Error getting session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve coding interview session',
      error: error.message
    });
  }
};

/**
 * Runs Candidate Code against Sample and Custom Test Cases
 */
exports.runCode = async (req, res) => {
  try {
    const {
      sessionId,
      problemIndex = 0,
      code,
      language = 'javascript',
      customTestCases = []
    } = req.body;

    let testCasesToRun = [];

    if (sessionId) {
      const session = await CodingInterview.findOne({ sessionId });
      if (session && session.problems && session.problems[problemIndex]) {
        // Run only non-hidden test cases for "Run Code"
        testCasesToRun = session.problems[problemIndex].testCases.filter(tc => !tc.isHidden);
      }
    }

    // Append custom test cases if provided
    if (customTestCases && Array.isArray(customTestCases) && customTestCases.length > 0) {
      testCasesToRun = [...testCasesToRun, ...customTestCases];
    }

    // Fallback if no test cases found
    if (testCasesToRun.length === 0) {
      testCasesToRun = [
        { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' }
      ];
    }

    const results = await runCode(code, language, testCasesToRun);
    const passedCount = results.filter(r => r.passed).length;

    return res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
        allPassed: passedCount === results.length
      }
    });
  } catch (error) {
    console.error('[CodingController] Error running code:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute code',
      error: error.message
    });
  }
};

/**
 * Submits Code Solution & Triggers Gemini AI Code Quality Review
 */
exports.submitSolution = async (req, res) => {
  try {
    const {
      sessionId,
      problemIndex = 0,
      code,
      language = 'javascript',
      timeSpentSeconds = 0
    } = req.body;

    const session = await CodingInterview.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Coding interview session not found'
      });
    }

    const problem = session.problems[problemIndex] || session.problems[0];
    if (!problem) {
      return res.status(400).json({
        success: false,
        message: 'Problem not found in session'
      });
    }

    // Run against ALL test cases (both visible and hidden)
    const allTestCases = problem.testCases || [];
    const executionResults = await runCode(code, language, allTestCases);
    const passedCount = executionResults.filter(r => r.passed).length;
    const totalCount = executionResults.length;

    // Call Gemini AI Code Quality Evaluator
    const aiReview = await reviewCodeQuality({
      problemTitle: problem.title,
      problemDescription: problem.description,
      difficulty: problem.difficulty,
      language,
      userCode: code,
      testCasesPassed: passedCount,
      totalTestCases: totalCount,
      executionResults
    });

    // Update Problem subdocument
    problem.userCode = code;
    problem.selectedLanguage = language;
    problem.executionResults = executionResults;
    problem.testCasesPassed = passedCount;
    problem.totalTestCases = totalCount;
    problem.score = aiReview.overallScore || Math.round((passedCount / (totalCount || 1)) * 100);
    problem.aiReview = aiReview;

    // Finalize session document
    session.overallScore = problem.score;
    session.status = 'Completed';
    session.completedAt = new Date();
    session.timeSpentSeconds = timeSpentSeconds;

    await session.save();

    return res.json({
      success: true,
      message: 'Solution submitted and evaluated successfully!',
      session,
      aiReview,
      executionResults
    });
  } catch (error) {
    console.error('[CodingController] Error submitting solution:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate and submit coding solution',
      error: error.message
    });
  }
};

/**
 * Gets Coding Assessment Report
 */
exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await CodingInterview.findOne({
      $or: [{ sessionId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).populate('user', 'fullName name email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Coding interview report not found'
      });
    }

    return res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('[CodingController] Error getting report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve coding report',
      error: error.message
    });
  }
};

/**
 * Terminates Coding Interview Session
 */
exports.terminateSession = async (req, res) => {
  try {
    const { sessionId, reason = 'User terminated coding interview' } = req.body;
    const session = await CodingInterview.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.status = 'Terminated in between';
    session.overallScore = 0;
    session.completedAt = new Date();
    await session.save();

    return res.json({
      success: true,
      message: 'Coding interview terminated successfully'
    });
  } catch (error) {
    console.error('[CodingController] Error terminating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to terminate coding interview',
      error: error.message
    });
  }
};
