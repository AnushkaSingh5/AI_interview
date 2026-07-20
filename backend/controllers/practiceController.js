const mongoose = require('mongoose');
const PracticeSession = require('../models/PracticeSession');
const PracticeQuestion = require('../models/PracticeQuestion');
const PracticeBookmark = require('../models/PracticeBookmark');
const LearningRoadmap = require('../models/LearningRoadmap');
const QuestionEvaluation = require('../models/QuestionEvaluation');
const User = require('../models/User');
const aiService = require('../services/aiService');
const { parseGeminiJson } = require('../utils/parseGeminiJson');

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
    const standardCompanies = ['Google', 'Amazon', 'Microsoft', 'Adobe', 'Infosys', 'TCS', 'Accenture', 'Flipkart'];

    res.status(200).json({
      success: true,
      weakTopics,
      technicalTopics: standardTechnical,
      softTopics: standardSoft,
      companies: standardCompanies
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
      for (let i = 1; i <= questionCount; i++) {
        generatedQuestions.push({
          question: `Explain core concept #${i} regarding ${topic} in the context of ${mode} interview preparation.`,
          expectedAnswer: `Expected key principles, architectural patterns, and practical trade-offs of ${topic}.`
        });
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

// @desc    Get personalized 4-week learning roadmap
// @route   GET /api/practice/roadmap
// @access  Private
exports.getLearningRoadmap = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let roadmap = await LearningRoadmap.findOne({ user: userId });

    if (!roadmap) {
      const user = await User.findById(userId);

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

      const weakList = topicStats.map(t => t._id);

      let weeksData = null;
      try {
        weeksData = await aiService.generateLearningRoadmap(user, weakList);
      } catch (err) {
        console.warn('[Practice AI] Roadmap generation fallback. Gemini Error:', err.message);
      }

      if (!weeksData || !Array.isArray(weeksData) || weeksData.length === 0) {
        const week1 = weakList[0] || 'Database Management Systems';
        const week2 = weakList[1] || 'System Architecture & Scaling';
        const week3 = weakList[2] || 'React & Modern Frontend Patterns';
        const week4 = 'Behavioral Communication & STAR Method';

        weeksData = [
          { weekNumber: 1, topic: week1, focusArea: 'Core Concepts & Queries', reason: `Identified as priority area for ${user?.targetRole || 'Software Engineering'}.` },
          { weekNumber: 2, topic: week2, focusArea: 'Scalability & Trade-offs', reason: 'Essential for technical depth in tech interviews.' },
          { weekNumber: 3, topic: week3, focusArea: 'Component Optimization & State', reason: 'Strengthen core implementation skills.' },
          { weekNumber: 4, topic: week4, focusArea: 'Conflict Resolution & Leadership', reason: 'Refine high-scoring behavioral responses.' }
        ];
      }

      roadmap = await LearningRoadmap.create({
        user: userId,
        weeks: weeksData
      });
    }

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
