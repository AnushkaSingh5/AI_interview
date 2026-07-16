const crypto = require('crypto');
const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
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
      'startedAt',
      'completedAt'
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

    // Delete associated questions first
    await InterviewQuestion.deleteMany({ sessionId: session._id });

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

    // Set status to Questions Ready / Ready To Start
    session.status = 'ReadyToStart';
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Questions generated and stored successfully',
      session,
      count: questionDocs.length,
      questions: questionDocs
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

    const questions = await InterviewQuestion.find({ sessionId: session._id })
      .sort({ questionNumber: 1 });

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
