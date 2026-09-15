const mongoose = require('mongoose');
const PracticeSession = require('../models/PracticeSession');
const PracticeQuestion = require('../models/PracticeQuestion');
const PracticeBookmark = require('../models/PracticeBookmark');
const LearningRoadmap = require('../models/LearningRoadmap');
const QuestionEvaluation = require('../models/QuestionEvaluation');
const User = require('../models/User');
const aiService = require('../services/aiService');
const { parseGeminiJson } = require('../utils/parseGeminiJson');

const { getAllCompanyProfiles, getCompanyStyle } = require('../config/companyStyles');

// @desc    Get available practice topics & weak skills
// @route   GET /api/practice/topics
// @access  Private
exports.getTopics = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Get candidate weak topics from past interview evaluations
    const topicStats = await QuestionEvaluation.aggregate([
      {
        $lookup: {
          from: 'interviewquestions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'questionDetails'
        }
      },
      { $unwind: "$questionDetails" },
      { $match: { "questionDetails.user": userId } },
      {
        $group: {
          _id: "$questionDetails.topic",
          avgScore: { $avg: "$score" }
        }
      },
      { $sort: { avgScore: 1 } }
    ]);

    const weakTopics = topicStats.filter(t => t.avgScore < 7).map(t => ({
      name: t._id,
      avgScore: Math.round(t.avgScore * 10)
    }));

    const standardTechnical = ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'DBMS', 'Operating Systems', 'Computer Networks', 'System Design', 'Data Structures'];
    const standardSoft = ['Tell Me About Yourself', 'Strengths & Weaknesses', 'Conflict Resolution', 'Leadership', 'Handling Pressure', 'STAR Method Teamwork'];
    const standardCompanies = ['Google', 'Amazon', 'Microsoft', 'Infosys', 'TCS', 'Accenture'];
    const companyProfiles = getAllCompanyProfiles();

    res.status(200).json({
      success: true,
      weakTopics,
      technicalTopics: standardTechnical,
      softTopics: standardSoft,
      companies: standardCompanies,
      companyProfiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start a new practice session (generates practice questions)
// @route   POST /api/practice/start
// @access  Private
exports.startPracticeSession = async (req, res, next) => {
  try {
    const { mode = 'Technical', topic = 'General', company = '', difficulty = 'Medium', questionCount = 5 } = req.body;
    const userId = req.user._id;

    const sessionTitle = company ? `${company} - ${topic} Practice` : `${topic} (${mode}) Practice`;

    const practiceSession = await PracticeSession.create({
      user: userId,
      title: sessionTitle,
      mode,
      topic,
      company,
      difficulty,
      questionCount
    });

    // Generate questions using Gemini AI or template generator
    let generatedQuestions = [];
    try {
      generatedQuestions = await aiService.generatePracticeQuestions({
        mode,
        topic,
        company,
        difficulty,
        questionCount
      });
    } catch (err) {
      console.warn('[Practice AI] Falling back to template question generator. Gemini Error:', err.message);
    }

    // Fallback template questions if AI fails
    if (!generatedQuestions || generatedQuestions.length === 0) {
      const companyStyle = getCompanyStyle(company);
      if (companyStyle && companyStyle.curatedQuestions && companyStyle.curatedQuestions.length > 0) {
        for (let i = 0; i < questionCount; i++) {
          const item = companyStyle.curatedQuestions[i % companyStyle.curatedQuestions.length];
          generatedQuestions.push({
            question: item.question,
            expectedAnswer: item.expectedAnswer
          });
        }
      } else {
        for (let i = 1; i <= questionCount; i++) {
          generatedQuestions.push({
            question: `Explain core concept #${i} regarding ${topic} in the context of ${company || mode} interview preparation.`,
            expectedAnswer: `Expected key principles, architectural patterns, and practical trade-offs of ${topic}.`
          });
        }
      }
    }

    // Insert PracticeQuestion documents into database
    const questionsToInsert = generatedQuestions.map((q, idx) => ({
      sessionId: practiceSession._id,
      user: userId,
      questionNumber: idx + 1,
      topic,
      company,
      difficulty,
      question: q.question,
      expectedAnswer: q.expectedAnswer || ''
    }));

    await PracticeQuestion.insertMany(questionsToInsert);

    res.status(201).json({
      success: true,
      session: practiceSession
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Evaluate single practice answer with instant AI Explanation
// @route   POST /api/practice/answer
// @access  Private
exports.evaluatePracticeAnswer = async (req, res, next) => {
  try {
    const { questionId, userAnswer } = req.body;

    const questionDoc = await PracticeQuestion.findById(questionId);
    if (!questionDoc) {
      return res.status(404).json({ success: false, message: 'Practice question not found' });
    }

    // Prompt Gemini for comprehensive AI explanation
    let evaluationData = null;
    try {
      evaluationData = await aiService.evaluatePracticeAnswer({
        question: questionDoc.question,
        topic: questionDoc.topic,
        userAnswer
      });
    } catch (err) {
      console.warn('[Practice AI] Evaluation error from Gemini:', err.message);
    }

    // Fallback heuristic evaluation
    if (!evaluationData) {
      const wordCount = userAnswer.trim().split(/\s+/).length;
      const score = Math.min(10, Math.max(4, Math.floor(wordCount / 12) + 4));
      evaluationData = {
        score,
        feedback: wordCount > 15 ? 'Solid explanation provided. Consider mentioning practical edge cases.' : 'Short answer. Elaborate further to demonstrate deeper conceptual understanding.',
        idealAnswer: `An ideal response for "${questionDoc.question}" clearly defines the primary concept, explains architectural mechanisms, and cites practical real-world scenarios.`,
        conceptExplanation: `Mastering ${questionDoc.topic} requires understanding trade-offs, performance characteristics, and standard implementation patterns.`,
        commonMistakes: ['Providing overly vague definitions', 'Omitting edge case handling', 'Failing to give concrete examples'],
        interviewTips: ['Structure your response using the STAR method for behavioral questions or standard architecture diagrams for technical questions.', 'Be concise and highlight key terminology.'],
        relatedTopics: [questionDoc.topic, 'System Architecture', 'Best Practices']
      };
    }

    questionDoc.userAnswer = userAnswer;
    questionDoc.isAnswered = true;
    questionDoc.score = evaluationData.score;
    questionDoc.accuracy = evaluationData.score * 10;
    questionDoc.feedback = evaluationData.feedback;
    questionDoc.idealAnswer = evaluationData.idealAnswer;
    questionDoc.conceptExplanation = evaluationData.conceptExplanation;
    questionDoc.commonMistakes = evaluationData.commonMistakes || [];
    questionDoc.interviewTips = evaluationData.interviewTips || [];
    questionDoc.relatedTopics = evaluationData.relatedTopics || [];
    questionDoc.answeredAt = new Date();
    await questionDoc.save();

    // Update PracticeSession statistics
    const session = await PracticeSession.findById(questionDoc.sessionId);
    if (session) {
      const answeredQuestions = await PracticeQuestion.find({ sessionId: session._id, isAnswered: true });
      session.answeredCount = answeredQuestions.length;

      const totalScoreSum = answeredQuestions.reduce((acc, q) => acc + (q.score || 0), 0);
      session.overallScore = answeredQuestions.length > 0 ? Math.round((totalScoreSum / answeredQuestions.length) * 10) : 0;

      if (session.answeredCount >= session.questionCount) {
        session.status = 'Completed';
        session.completedAt = new Date();
      }
      await session.save();
    }

    res.status(200).json({
      success: true,
      question: questionDoc
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get practice session details & questions
// @route   GET /api/practice/session/:id
// @access  Private
exports.getPracticeSession = async (req, res, next) => {
  try {
    const session = await PracticeSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Practice session not found' });
    }

    const questions = await PracticeQuestion.find({ sessionId: session._id }).sort({ questionNumber: 1 });

    res.status(200).json({
      success: true,
      session,
      questions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create Daily Practice Challenge
// @route   GET /api/practice/daily
// @access  Private
exports.getDailyChallenge = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let dailySession = await PracticeSession.findOne({
      user: userId,
      mode: 'Daily',
      createdAt: { $gte: startOfToday }
    });

    if (!dailySession) {
      dailySession = await PracticeSession.create({
        user: userId,
        title: `Daily Practice Challenge (${new Date().toLocaleDateString()})`,
        mode: 'Daily',
        topic: 'Mixed Practice',
        difficulty: 'Medium',
        questionCount: 5
      });

      let sampleQuestions = null;
      try {
        sampleQuestions = await aiService.generateDailyChallenge();
      } catch (err) {
        console.warn('[Practice AI] Daily Challenge generation fallback. Gemini Error:', err.message);
      }

      if (!sampleQuestions || !Array.isArray(sampleQuestions) || sampleQuestions.length === 0) {
        sampleQuestions = [
          { topic: 'JavaScript', question: 'Explain closure in JavaScript and describe a practical use case.', expectedAnswer: 'Functions retaining access to outer lexical scope.' },
          { topic: 'React', question: 'What are the main differences between useEffect and useLayoutEffect?', expectedAnswer: 'Timing of execution relative to DOM paint.' },
          { topic: 'DBMS', question: 'Explain ACID properties in database transaction management.', expectedAnswer: 'Atomicity, Consistency, Isolation, Durability.' },
          { topic: 'System Design', question: 'How do load balancers distribute traffic across server instances?', expectedAnswer: 'Algorithms like Round Robin, Least Connections, and IP Hashing.' },
          { topic: 'HR', question: 'Describe a situation where you had to adapt quickly to a major change in project requirements.', expectedAnswer: 'STAR response showcasing adaptability and clear communication.' }
        ];
      }

      const docs = sampleQuestions.map((q, idx) => ({
        sessionId: dailySession._id,
        user: userId,
        questionNumber: idx + 1,
        topic: q.topic || 'General',
        question: q.question,
        expectedAnswer: q.expectedAnswer || 'Core concepts summary'
      }));

      await PracticeQuestion.insertMany(docs);
    }

    const questions = await PracticeQuestion.find({ sessionId: dailySession._id }).sort({ questionNumber: 1 });

    res.status(200).json({
      success: true,
      session: dailySession,
      questions
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Build or recalculate personalized 4-week learning roadmap
const buildRoadmapData = async (userId, user) => {
  // Count completed interviews across all modes
  const [textCount, voiceCount, videoCount] = await Promise.all([
    mongoose.model('InterviewSession').countDocuments({ user: userId, status: 'Completed' }).catch(() => 0),
    mongoose.model('VoiceInterview').countDocuments({ user: userId, status: 'Completed' }).catch(() => 0),
    mongoose.model('VideoInterview').countDocuments({ user: userId, status: 'Completed' }).catch(() => 0)
  ]);
  const totalInterviews = textCount + voiceCount + videoCount;

  // Aggregate question evaluations to isolate weak topics
  const topicStats = await QuestionEvaluation.aggregate([
    {
      $lookup: {
        from: 'interviewquestions',
        localField: 'questionId',
        foreignField: '_id',
        as: 'questionDetails'
      }
    },
    { $unwind: "$questionDetails" },
    { $match: { "questionDetails.user": userId } },
    {
      $group: {
        _id: "$questionDetails.topic",
        avgScore: { $avg: "$score" },
        count: { $sum: 1 }
      }
    },
    { $sort: { avgScore: 1 } }
  ]);

  const weakList = topicStats.filter(t => t.avgScore < 7.5).map(t => t._id);

  let aiRes = null;
  try {
    aiRes = await aiService.generateLearningRoadmap(user, weakList, totalInterviews);
  } catch (err) {
    console.warn('[Practice AI] Roadmap generation fallback. Gemini Error:', err.message);
  }

  let weeksData = [];
  let summaryText = 'Personalized 4-week study plan generated by AI based on mock interview performance.';

  if (aiRes && typeof aiRes === 'object') {
    if (Array.isArray(aiRes.weeks) && aiRes.weeks.length > 0) {
      weeksData = aiRes.weeks;
      if (aiRes.summary) summaryText = aiRes.summary;
    } else if (Array.isArray(aiRes) && aiRes.length > 0) {
      weeksData = aiRes;
    }
  }

  if (!weeksData || !Array.isArray(weeksData) || weeksData.length === 0) {
    const w1 = weakList[0] || 'JavaScript Closures';
    const w2 = weakList[1] || 'React Hooks';
    const w3 = weakList[2] || 'SQL Joins';
    const w4 = weakList[3] || 'Node.js Authentication';

    weeksData = [
      {
        weekNumber: 1,
        title: `Week 1: ${w1} & Scope Fundamentals`,
        topic: w1,
        focusArea: 'Lexical Scopes, Execution Contexts, Memory Closures, Factory Functions',
        reason: totalInterviews > 0
          ? `Identified as a critical focus area with lower accuracy during recent mock interviews.`
          : `Core architectural pillar for ${user?.targetRole || 'Software Engineering'} interviews.`,
        keyConcepts: [
          'Lexical Environment & Scope Chain',
          'Function Factories & Currying Patterns',
          'Memory Management & Garbage Collection Pitfalls',
          'Debouncing & Throttling Scratch Implementation'
        ],
        estimatedHours: 4,
        practiceQuestionsCount: 5,
        completed: false,
        subtasksCompleted: []
      },
      {
        weekNumber: 2,
        title: `Week 2: ${w2} & Component Architecture`,
        topic: w2,
        focusArea: 'State Management, Lifecycle Hooks, Render Optimization, Custom Hook Patterns',
        reason: 'Essential for modern frontend development and high-scoring technical rounds.',
        keyConcepts: [
          'Hook Execution Order & Pure Functions',
          'useCallback vs useMemo Performance Benchmarks',
          'Custom Reusable Business Logic Hooks',
          'Context API vs Global State Tradeoffs'
        ],
        estimatedHours: 4,
        practiceQuestionsCount: 5,
        completed: false,
        subtasksCompleted: []
      },
      {
        weekNumber: 3,
        title: `Week 3: ${w3} & Database Optimization`,
        topic: w3,
        focusArea: 'Complex Relational Queries, Index Strategies, ACID Transactions, Schema Design',
        reason: 'Addresses query performance bottlenecks and database design questions.',
        keyConcepts: [
          'INNER, LEFT, RIGHT & FULL OUTER Joins',
          'B-Tree Indexes & EXPLAIN Query Execution Plans',
          'ACID Isolation Levels & Locking Semantics',
          'Database Normalization (1NF to BCNF)'
        ],
        estimatedHours: 5,
        practiceQuestionsCount: 5,
        completed: false,
        subtasksCompleted: []
      },
      {
        weekNumber: 4,
        title: `Week 4: ${w4} & Production Security`,
        topic: w4,
        focusArea: 'JWT Authentication, OAuth2 Workflows, Password Hashing, Security Middleware',
        reason: 'Critical for system design depth and backend security evaluation.',
        keyConcepts: [
          'JWT vs Session Cookies & Refresh Token Rotation',
          'Bcrypt Salt Rounds & Password Security',
          'CORS, Helmet & OWASP Vulnerability Prevention',
          'Role-Based Access Control (RBAC) Architecture'
        ],
        estimatedHours: 4,
        practiceQuestionsCount: 5,
        completed: false,
        subtasksCompleted: []
      }
    ];
  }

  // Ensure all weeks have valid fields
  const formattedWeeks = weeksData.map((w, idx) => ({
    weekNumber: w.weekNumber || idx + 1,
    title: w.title || `Week ${idx + 1}: ${w.topic || 'Interview Topic'}`,
    topic: w.topic || (idx === 0 ? 'JavaScript Closures' : idx === 1 ? 'React Hooks' : idx === 2 ? 'SQL Joins' : 'Node.js Authentication'),
    focusArea: w.focusArea || 'Core concepts and implementation',
    reason: w.reason || 'Priority focus area based on interview analysis.',
    keyConcepts: Array.isArray(w.keyConcepts) && w.keyConcepts.length > 0 ? w.keyConcepts : [
      'Core Concept Foundations',
      'Common Edge Cases & Gotchas',
      'Real-world Architecture Implementation',
      'Optimizations & Performance Trade-offs'
    ],
    estimatedHours: w.estimatedHours || 4,
    practiceQuestionsCount: w.practiceQuestionsCount || 5,
    completed: Boolean(w.completed),
    subtasksCompleted: Array.isArray(w.subtasksCompleted) ? w.subtasksCompleted : []
  }));

  return {
    user: userId,
    targetRole: user?.targetRole || 'Software Engineer',
    summary: summaryText,
    overallProgress: 0,
    weeks: formattedWeeks,
    generatedAt: new Date()
  };
};

// Helper: Calculate overall progress percentage
const calculateOverallProgress = (weeks) => {
  if (!weeks || weeks.length === 0) return 0;
  
  let totalTasks = 0;
  let completedTasks = 0;

  weeks.forEach(w => {
    const conceptCount = (w.keyConcepts && w.keyConcepts.length > 0) ? w.keyConcepts.length : 4;
    totalTasks += conceptCount;
    
    if (w.completed) {
      completedTasks += conceptCount;
    } else if (Array.isArray(w.subtasksCompleted)) {
      completedTasks += w.subtasksCompleted.length;
    }
  });

  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
};

// @desc    Get personalized 4-week learning roadmap
// @route   GET /api/practice/roadmap
// @access  Private
exports.getLearningRoadmap = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let roadmap = await LearningRoadmap.findOne({ user: userId });

    // Check if roadmap is missing or in legacy format (without title or keyConcepts)
    const isLegacy = roadmap && roadmap.weeks && roadmap.weeks.some(w => !w.title || !w.keyConcepts || w.keyConcepts.length === 0);

    if (!roadmap || isLegacy) {
      const user = await User.findById(userId);
      const newRoadmapData = await buildRoadmapData(userId, user);

      if (roadmap) {
        roadmap.weeks = newRoadmapData.weeks;
        roadmap.summary = newRoadmapData.summary;
        roadmap.targetRole = newRoadmapData.targetRole;
        roadmap.overallProgress = calculateOverallProgress(newRoadmapData.weeks);
        roadmap.generatedAt = new Date();
        await roadmap.save();
      } else {
        roadmap = await LearningRoadmap.create(newRoadmapData);
      }
    }

    res.status(200).json({
      success: true,
      roadmap
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate personalized 4-week learning roadmap with AI
// @route   POST /api/practice/roadmap/regenerate
// @access  Private
exports.regenerateLearningRoadmap = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const newRoadmapData = await buildRoadmapData(userId, user);

    const roadmap = await LearningRoadmap.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          targetRole: newRoadmapData.targetRole,
          summary: newRoadmapData.summary,
          overallProgress: 0,
          weeks: newRoadmapData.weeks,
          generatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Learning roadmap successfully regenerated with AI.',
      roadmap
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle week completion status in learning roadmap
// @route   PATCH /api/practice/roadmap/toggle-week/:weekNumber
// @access  Private
exports.toggleRoadmapWeek = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const weekNumber = parseInt(req.params.weekNumber, 10);

    const roadmap = await LearningRoadmap.findOne({ user: userId });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Roadmap not found.' });
    }

    const weekIndex = roadmap.weeks.findIndex(w => w.weekNumber === weekNumber);
    if (weekIndex === -1) {
      return res.status(404).json({ success: false, message: `Week ${weekNumber} not found in roadmap.` });
    }

    const currentStatus = roadmap.weeks[weekIndex].completed;
    roadmap.weeks[weekIndex].completed = !currentStatus;

    if (roadmap.weeks[weekIndex].completed) {
      // Mark all subtasks as completed
      roadmap.weeks[weekIndex].subtasksCompleted = [...(roadmap.weeks[weekIndex].keyConcepts || [])];
    } else {
      roadmap.weeks[weekIndex].subtasksCompleted = [];
    }

    roadmap.overallProgress = calculateOverallProgress(roadmap.weeks);
    await roadmap.save();

    res.status(200).json({
      success: true,
      message: `Week ${weekNumber} marked as ${roadmap.weeks[weekIndex].completed ? 'completed' : 'incomplete'}.`,
      roadmap
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle individual sub-concept / subtask in learning roadmap
// @route   PATCH /api/practice/roadmap/toggle-subtask
// @access  Private
exports.toggleRoadmapSubtask = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { weekNumber, concept } = req.body;

    if (!weekNumber || !concept) {
      return res.status(400).json({ success: false, message: 'weekNumber and concept are required.' });
    }

    const roadmap = await LearningRoadmap.findOne({ user: userId });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Roadmap not found.' });
    }

    const weekIndex = roadmap.weeks.findIndex(w => w.weekNumber === parseInt(weekNumber, 10));
    if (weekIndex === -1) {
      return res.status(404).json({ success: false, message: `Week ${weekNumber} not found in roadmap.` });
    }

    const week = roadmap.weeks[weekIndex];
    if (!Array.isArray(week.subtasksCompleted)) {
      week.subtasksCompleted = [];
    }

    const existsIndex = week.subtasksCompleted.indexOf(concept);
    if (existsIndex > -1) {
      week.subtasksCompleted.splice(existsIndex, 1);
    } else {
      week.subtasksCompleted.push(concept);
    }

    // If all concepts in the week are completed, mark the week completed
    const allConcepts = week.keyConcepts || [];
    if (allConcepts.length > 0 && allConcepts.every(c => week.subtasksCompleted.includes(c))) {
      week.completed = true;
    } else {
      week.completed = false;
    }

    roadmap.overallProgress = calculateOverallProgress(roadmap.weeks);
    await roadmap.save();

    res.status(200).json({
      success: true,
      roadmap
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get flashcards for quick revision
// @route   GET /api/practice/flashcards
// @access  Private
exports.getFlashcards = async (req, res, next) => {
  try {
    const flashcards = [
      { id: 'fc_1', topic: 'DBMS', question: 'What is Database Normalization?', answer: 'The process of organizing database tables to reduce data redundancy and improve data integrity (1NF, 2NF, 3NF, BCNF).' },
      { id: 'fc_2', topic: 'React', question: 'What is the Virtual DOM and how does reconciliation work?', answer: 'A lightweight in-memory copy of the real DOM. React diffs the virtual DOM tree against previous states to batch minimum real DOM updates.' },
      { id: 'fc_3', topic: 'Node.js', question: 'Explain the Node.js Event Loop phases.', answer: 'Timers -> Pending Callbacks -> Idle/Prepare -> Poll -> Check (setImmediate) -> Close Callbacks.' },
      { id: 'fc_4', topic: 'OS', question: 'Difference between Process and Thread?', answer: 'A process is an independent executing program with its own memory address space. A thread is an execution unit within a process sharing memory.' },
      { id: 'fc_5', topic: 'System Design', question: 'What is the CAP Theorem?', answer: 'A distributed system can guarantee at most 2 out of 3 properties: Consistency, Availability, and Partition Tolerance.' }
    ];

    res.status(200).json({
      success: true,
      flashcards
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user bookmarks
// @route   GET /api/practice/bookmarks
// @access  Private
exports.getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await PracticeBookmark.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      bookmarks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bookmark a question with notes
// @route   POST /api/practice/bookmark
// @access  Private
exports.addBookmark = async (req, res, next) => {
  try {
    const { question, topic, idealAnswer, notes } = req.body;

    const bookmark = await PracticeBookmark.create({
      user: req.user._id,
      question,
      topic: topic || 'General',
      idealAnswer: idealAnswer || '',
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      bookmark
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a bookmark
// @route   DELETE /api/practice/bookmark/:id
// @access  Private
exports.deleteBookmark = async (req, res, next) => {
  try {
    const bookmark = await PracticeBookmark.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!bookmark) {
      return res.status(404).json({ success: false, message: 'Bookmark not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overall practice analytics stats
// @route   GET /api/practice/stats
// @access  Private
exports.getPracticeStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const totalSolved = await PracticeQuestion.countDocuments({ user: userId, isAnswered: true });
    const answeredDocs = await PracticeQuestion.find({ user: userId, isAnswered: true }).select('score');

    const totalScoreSum = answeredDocs.reduce((acc, q) => acc + (q.score || 0), 0);
    const avgAccuracy = answeredDocs.length > 0 ? Math.round((totalScoreSum / (answeredDocs.length * 10)) * 100) : 0;

    const recentSessions = await PracticeSession.find({ user: userId }).sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      totalQuestionsSolved: totalSolved,
      practiceAccuracy: avgAccuracy,
      recentSessions
    });
  } catch (error) {
    next(error);
  }
};
