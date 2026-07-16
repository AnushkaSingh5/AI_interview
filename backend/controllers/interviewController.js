const crypto = require('crypto');
const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
const InterviewAnswer = require('../models/InterviewAnswer');
const ResumeData = require('../models/ResumeData');
const User = require('../models/User');
const { calculateCompletionScore } = require('./profileController');
const { generateInterviewQuestions } = require('../services/ai/questionGenerator');

// Safe helper to find session by ObjectId or custom interviewId without CastError
const findSessionByIdOrCode = async (id) => {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { interviewId: id };
  return await InterviewSession.findOne(query);
};

// @desc    Create a new interview session configuration
// @route   POST /api/interviews/create
// @access  Private
exports.createInterviewSession = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    // 1. Fetch resumeData to accurately verify profile completeness score
    const resumeData = await ResumeData.findOne({ user: user._id });
    const score = calculateCompletionScore(user, resumeData);

    // 2. Validate Profile Completion & Resume Uploaded
    if (score < 100 || !user.resumeId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create interview without a 100% completed profile and uploaded resume.'
      });
    }

    const {
      interviewType,
      role,
      company,
      experienceLevel,
      difficulty,
      duration,
      questionCount,
      preferredLanguage,
      focusAreas,
      interviewMode
    } = req.body;

    // Generate unique short human-readable interview identifier
    const uniqueHash = crypto.randomBytes(3).toString('hex').toUpperCase();
    const interviewId = `INT-${uniqueHash}-${Date.now().toString().slice(-4)}`;

    // Build title (e.g. Technical Interview - Software Engineer)
    const title = `${interviewType} Interview - ${role}`;

    const session = await InterviewSession.create({
      user: user._id,
      interviewId,
      title,
      interviewType,
      role,
      company: company || '',
      experienceLevel,
      difficulty,
      duration,
      questionCount,
      preferredLanguage,
      focusAreas: focusAreas || [],
      interviewMode: interviewMode || 'Text',
      status: 'Created'
    });

    res.status(201).json({
      success: true,
      message: 'Interview session created successfully',
      session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details of a single interview session
// @route   GET /api/interviews/:id
// @access  Private
exports.getInterviewSession = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    // Ensure session owner matches authenticated requester
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this session' });
    }

    res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update configuration or status of an interview session
// @route   PUT /api/interviews/:id
// @access  Private
exports.updateInterviewSession = async (req, res, next) => {
  try {
    let session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fieldsToUpdate = [
      'role',
      'company',
      'experienceLevel',
      'difficulty',
      'duration',
      'questionCount',
      'preferredLanguage',
      'focusAreas',
      'status',
      'currentQuestion',
      'startedAt',
      'submittedAt',
      'timeRemaining'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    if (req.body.role || req.body.interviewType) {
      const type = req.body.interviewType || session.interviewType;
      const jobRole = req.body.role || session.role;
      session.title = `${type} Interview - ${jobRole}`;
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: 'Interview session updated successfully',
      session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an interview session
// @route   DELETE /api/interviews/:id
// @access  Private
exports.deleteInterviewSession = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete associated questions and answers
    await InterviewQuestion.deleteMany({ sessionId: session._id });
    await InterviewAnswer.deleteMany({ sessionId: session._id });

    await session.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Interview session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all interview sessions belonging to the authenticated user
// @route   GET /api/interviews/user
// @access  Private
exports.getUserInterviews = async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI questions for an interview session
// @route   POST /api/interviews/:id/generate
// @access  Private
exports.generateQuestions = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update status to Generating
    session.status = 'Generating';
    await session.save();

    // Fetch user and resumeData contexts
    const user = await User.findById(req.user._id);
    const resumeData = await ResumeData.findOne({ user: req.user._id });

    // Generate questions
    const generatedList = await generateInterviewQuestions(user, resumeData, session);

    // Wipe existing questions
    await InterviewQuestion.deleteMany({ sessionId: session._id });

    // Map and insert questions
    const questionDocs = generatedList.map(q => ({
      sessionId: session._id,
      user: req.user._id,
      questionNumber: q.questionNumber,
      questionType: q.questionType,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.question,
      expectedAnswer: q.expectedAnswer,
      hints: q.hints,
      status: 'pending'
    }));

    await InterviewQuestion.insertMany(questionDocs);

    // Set status to ReadyToStart / Ready
    session.status = 'ReadyToStart';
    await session.save();

    // Strip expectedAnswer and hints from generated response to prevent inspection cheating
    const sanitizedQuestions = questionDocs.map(q => {
      const { expectedAnswer, hints, ...rest } = q;
      return rest;
    });

    res.status(200).json({
      success: true,
      message: 'Questions generated and stored successfully',
      session,
      count: sanitizedQuestions.length,
      questions: sanitizedQuestions
    });
  } catch (error) {
    // Revert status on failure
    try {
      const session = await findSessionByIdOrCode(req.params.id);
      if (session) {
        session.status = 'Created';
        await session.save();
      }
    } catch (_) {}
    next(error);
  }
};

// @desc    Get generated questions list for a session
// @route   GET /api/interviews/:id/questions
// @access  Private
exports.getQuestions = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const isSubmitted = ['Submitted', 'AwaitingEvaluation', 'ReportGenerated', 'Completed'].includes(session.status);
    const query = InterviewQuestion.find({ sessionId: session._id });
    
    // Hide grading key information before candidate finishes
    if (!isSubmitted) {
      query.select('-expectedAnswer -hints');
    }

    const questions = await query.sort({ questionNumber: 1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      questions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate AI questions for an interview session
// @route   POST /api/interviews/:id/regenerate
// @access  Private
exports.regenerateQuestions = async (req, res, next) => {
  // Wiping questions and calling generation behaves exactly like generateQuestions
  return exports.generateQuestions(req, res, next);
};

// @desc    Wipe questions for a session
// @route   DELETE /api/interviews/:id/questions
// @access  Private
exports.deleteQuestions = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await InterviewQuestion.deleteMany({ sessionId: session._id });

    session.status = 'Created';
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Questions deleted successfully, session reset to Created status',
      session
    });
  } catch (error) {
    next(error);
  }
};

// --- PHASE 5 Mock Interview Session Core Endpoints ---

// @desc    Start mock interview session
// @route   POST /api/interviews/:id/start
// @access  Private
exports.startInterview = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Do not allow starting an already submitted or completed session
    if (['Submitted', 'AwaitingEvaluation', 'ReportGenerated', 'Completed'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'This interview has already been submitted and cannot be started.'
      });
    }

    // Set active values if starting for the first time
    if (session.status !== 'InProgress') {
      session.status = 'InProgress';
      session.startedAt = new Date();
      session.totalQuestions = session.questionCount;
      session.timeRemaining = session.duration * 60; // Convert to seconds
      await session.save();
    }

    res.status(200).json({
      success: true,
      message: 'Interview session started',
      session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save or update draft answer response for a question
// @route   POST /api/interviews/:id/answer
// @access  Private
exports.saveAnswer = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (session.status !== 'InProgress') {
      return res.status(400).json({
        success: false,
        message: 'Answers can only be saved for an active session in progress.'
      });
    }

    const { questionId, answer, timeTaken, skipped, currentQuestionIndex } = req.body;

    if (!questionId) {
      return res.status(400).json({ success: false, message: 'Question ID is required.' });
    }

    // Find if answer already exists
    let answerDoc = await InterviewAnswer.findOne({
      sessionId: session._id,
      questionId
    });

    if (answerDoc) {
      // Update existing draft
      answerDoc.answer = answer !== undefined ? answer : answerDoc.answer;
      answerDoc.timeTaken = timeTaken !== undefined ? timeTaken : answerDoc.timeTaken;
      answerDoc.skipped = skipped !== undefined ? skipped : answerDoc.skipped;
      await answerDoc.save();
    } else {
      // Create new draft
      answerDoc = await InterviewAnswer.create({
        sessionId: session._id,
        questionId,
        user: req.user._id,
        answer: answer || '',
        timeTaken: timeTaken || 0,
        skipped: !!skipped
      });
    }

    // Recalculate answeredQuestions count (exclude skipped or empty answers)
    const allAnswers = await InterviewAnswer.find({ sessionId: session._id });
    const answeredCount = allAnswers.filter(a => !a.skipped && a.answer?.trim().length > 0).length;

    session.answeredQuestions = answeredCount;
    session.progress = Math.round((answeredCount / session.totalQuestions) * 100);
    
    if (req.body.timeRemaining !== undefined) {
      session.timeRemaining = req.body.timeRemaining;
    }
    if (currentQuestionIndex !== undefined) {
      session.currentQuestion = currentQuestionIndex;
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: 'Answer saved successfully',
      answer: answerDoc,
      session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all draft answers for an interview session
// @route   GET /api/interviews/:id/answers
// @access  Private
exports.getAnswers = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const answers = await InterviewAnswer.find({ sessionId: session._id });

    res.status(200).json({
      success: true,
      count: answers.length,
      answers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resume active interview session lookup (restores state)
// @route   GET /api/interviews/:id/resume
// @access  Private
exports.resumeInterview = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Block resuming already submitted/completed sessions
    if (['Submitted', 'AwaitingEvaluation', 'ReportGenerated', 'Completed'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'This interview has already been submitted and cannot be resumed.'
      });
    }

    // Ensure session is set to InProgress
    if (session.status !== 'InProgress') {
      session.status = 'InProgress';
      session.startedAt = session.startedAt || new Date();
      session.totalQuestions = session.questionCount;
      session.timeRemaining = session.timeRemaining || session.duration * 60;
      await session.save();
    }

    const isSubmitted = ['Submitted', 'AwaitingEvaluation', 'ReportGenerated', 'Completed'].includes(session.status);
    const query = InterviewQuestion.find({ sessionId: session._id });
    
    // Hide grading key information in resume before submission
    if (!isSubmitted) {
      query.select('-expectedAnswer -hints');
    }

    const questions = await query.sort({ questionNumber: 1 });
    const answers = await InterviewAnswer.find({ sessionId: session._id });

    res.status(200).json({
      success: true,
      session,
      questions,
      answers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit mock interview session
// @route   POST /api/interviews/:id/submit
// @access  Private
exports.submitInterview = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (['Submitted', 'AwaitingEvaluation', 'ReportGenerated', 'Completed'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'This session has already been submitted.'
      });
    }

    session.status = 'AwaitingEvaluation';
    session.submittedAt = new Date();
    session.timeRemaining = 0;
    await session.save();

    // Update all question statuses to answered
    await InterviewQuestion.updateMany(
      { sessionId: session._id },
      { $set: { status: 'answered' } }
    );

    res.status(200).json({
      success: true,
      message: 'Interview session submitted successfully.',
      session
    });
  } catch (error) {
    next(error);
  }
};
