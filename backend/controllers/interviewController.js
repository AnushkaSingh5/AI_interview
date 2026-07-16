const crypto = require('crypto');
const InterviewSession = require('../models/InterviewSession');
const ResumeData = require('../models/ResumeData');
const User = require('../models/User');
const { calculateCompletionScore } = require('./profileController');

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
    const session = await InterviewSession.findOne({
      $or: [
        { _id: req.params.id },
        { interviewId: req.params.id }
      ]
    });

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
    let session = await InterviewSession.findOne({
      $or: [
        { _id: req.params.id },
        { interviewId: req.params.id }
      ]
    });

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
    const session = await InterviewSession.findOne({
      $or: [
        { _id: req.params.id },
        { interviewId: req.params.id }
      ]
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

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
