const crypto = require('crypto');
const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
const InterviewAnswer = require('../models/InterviewAnswer');
const InterviewEvaluation = require('../models/InterviewEvaluation');
const QuestionEvaluation = require('../models/QuestionEvaluation');
const ResumeData = require('../models/ResumeData');
const User = require('../models/User');
const { calculateCompletionScore } = require('./profileController');
const { generateInterviewQuestions } = require('../services/ai/questionGenerator');
const { evaluateAnswer, compileOverallReport } = require('../services/ai/evaluator');

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

    // Delete associated questions, answers, and evaluations
    await InterviewQuestion.deleteMany({ sessionId: session._id });
    await InterviewAnswer.deleteMany({ sessionId: session._id });
    await InterviewEvaluation.deleteMany({ sessionId: session._id });
    await QuestionEvaluation.deleteMany({ sessionId: session._id });

    await session.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Interview session and evaluation reports deleted successfully'
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

    // Cache check: if status is already ReadyToStart, return cached result immediately
    if (session.status === 'ReadyToStart') {
      return res.status(200).json({
        success: true,
        message: 'Questions already generated (retrieved existing)',
        session
      });
    }

    if (session.status === 'Generating') {
      const user = await User.findById(req.user._id);
      const resumeData = await ResumeData.findOne({ user: req.user._id });
      const { addToQueue } = require('../services/ai/aiQueueService');
      addToQueue({
        type: 'generate_questions',
        sessionId: session._id,
        user,
        resumeData
      });

      return res.status(200).json({
        success: true,
        message: 'AI Question Generation is already processing in the background.',
        session
      });
    }

    // Set status to Generating
    session.status = 'Generating';
    await session.save();

    // Fetch contexts
    const user = await User.findById(req.user._id);
    const resumeData = await ResumeData.findOne({ user: req.user._id });

    // Queue the background generator job
    const { addToQueue } = require('../services/ai/aiQueueService');
    addToQueue({
      type: 'generate_questions',
      sessionId: session._id,
      user,
      resumeData
    });

    res.status(202).json({
      success: true,
      message: 'AI Question Generation has been queued in the background.',
      session
    });
  } catch (error) {
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

    if (['Completed', 'ReportReady'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'Answers cannot be modified for a completed interview.'
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
    const totalQ = session.totalQuestions || session.questionCount || 5;
    session.progress = Math.round((answeredCount / totalQ) * 100);
    
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

// @desc    Evaluate a submitted mock interview session
// @route   POST /api/interviews/:id/evaluate
// @access  Private
exports.evaluateSession = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if session has already been evaluated
    const existingEvaluation = await InterviewEvaluation.findOne({ sessionId: session._id });
    if (existingEvaluation) {
      session.status = 'Completed';
      await session.save();
      return res.status(200).json({
        success: true,
        message: 'Interview session evaluation completed (retrieved existing)',
        session,
        evaluation: existingEvaluation
      });
    }

    if (['AwaitingEvaluation', 'Evaluating'].includes(session.status)) {
      const { addToQueue } = require('../services/ai/aiQueueService');
      addToQueue({
        type: 'evaluate_session',
        sessionId: session._id
      });

      return res.status(202).json({
        success: true,
        message: 'AI Evaluation is already processing in the background.',
        session
      });
    }

    // Set state to Evaluating
    session.status = 'AwaitingEvaluation';
    await session.save();

    // Queue the background evaluator job
    const { addToQueue } = require('../services/ai/aiQueueService');
    addToQueue({
      type: 'evaluate_session',
      sessionId: session._id
    });

    res.status(202).json({
      success: true,
      message: 'AI Evaluation has been queued in the background.',
      session
    });
  } catch (error) {
    try {
      const session = await findSessionByIdOrCode(req.params.id);
      if (session) {
        session.status = 'AwaitingEvaluation';
        await session.save();
      }
    } catch (_) {}
    next(error);
  }
};

// @desc    Get status details of an interview session
// @route   GET /api/interviews/:id/status
// @access  Private
exports.getStatus = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({
      success: true,
      status: session.status,
      progress: session.progress || 0,
      currentQuestion: session.currentQuestion || 0,
      totalQuestions: session.totalQuestions || session.questionCount || 5
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live queue status details for admin/debug
// @route   GET /api/queue/status
// @access  Private
exports.getQueueStatus = async (req, res, next) => {
  try {
    const InterviewSession = require('../models/InterviewSession');
    const pausedCount = await InterviewSession.countDocuments({ status: 'Paused' });
    const { getQueueLength, getProcessingJob } = require('../services/ai/aiQueueService');

    res.status(200).json({
      success: true,
      queueLength: getQueueLength ? getQueueLength() : 0,
      processingJob: getProcessingJob ? getProcessingJob() : null,
      pausedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually resume a paused mock interview session
// @route   POST /api/interviews/:id/resume-eval
// @access  Private
exports.resumeEvaluation = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Set status back to AwaitingEvaluation
    session.status = 'AwaitingEvaluation';
    await session.save();

    // Queue the background evaluator job (high priority because it's manually triggered)
    const { addToQueue } = require('../services/ai/aiQueueService');
    addToQueue({
      type: 'evaluate_session',
      sessionId: session._id,
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'AI Evaluation has been successfully resumed in the background.',
      session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get compiled interview report details
// @route   GET /api/interviews/:id/report
// @access  Private
exports.getReport = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const evaluation = await InterviewEvaluation.findOne({ sessionId: session._id });
    if (!evaluation) {
      return res.status(202).json({
        success: true,
        status: 'processing',
        message: 'AI evaluation is currently processing. Please poll again shortly.'
      });
    }

    const questionEvaluations = await QuestionEvaluation.find({ sessionId: session._id });
    const questions = await InterviewQuestion.find({ sessionId: session._id }).sort({ questionNumber: 1 });
    const answers = await InterviewAnswer.find({ sessionId: session._id });

    res.status(200).json({
      success: true,
      session,
      evaluation,
      questionEvaluations,
      questions,
      answers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback for each question in a session
// @route   GET /api/interviews/:id/question-feedback
// @access  Private
exports.getQuestionFeedback = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const questionEvaluations = await QuestionEvaluation.find({ sessionId: session._id });

    res.status(200).json({
      success: true,
      count: questionEvaluations.length,
      questionEvaluations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download mock PDF report
// @route   GET /api/interviews/:id/report/pdf
// @access  Private
exports.downloadReportPdf = async (req, res, next) => {
  try {
    const session = await findSessionByIdOrCode(req.params.id);
    if (!session) {
      return res.status(404).send('Interview session not found');
    }

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).send('Access denied');
    }

    const evaluation = await InterviewEvaluation.findOne({ sessionId: session._id });
    if (!evaluation) {
      return res.status(404).send('Evaluation report has not been compiled yet.');
    }

    const questionEvaluations = await QuestionEvaluation.find({ sessionId: session._id });
    const questions = await InterviewQuestion.find({ sessionId: session._id }).sort({ questionNumber: 1 });
    const answers = await InterviewAnswer.find({ sessionId: session._id });

    // Render print-friendly HTML template that auto-prompts browser print window
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>InterviewAce AI Report - ${session.title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #4f46e5; margin: 0; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
        .meta-item { font-size: 14px; }
        .meta-label { color: #64748b; font-weight: 600; }
        .score-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px; }
        .score-val { font-size: 48px; font-weight: 800; color: #4f46e5; }
        .section-title { font-size: 18px; font-weight: bold; color: #0f172a; border-left: 4px solid #4f46e5; padding-left: 10px; margin: 30px 0 15px 0; }
        .bullet-list { margin: 0; padding-left: 20px; }
        .bullet-list li { margin-bottom: 8px; }
        .question-block { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
        .q-num { font-weight: bold; color: #4f46e5; }
        .score-badge { display: inline-block; background: #ecfdf5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #4f46e5; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
          Print / Save PDF
        </button>
      </div>

      <div class="header">
        <div class="title">InterviewAce AI Evaluation Report</div>
        <div style="font-size: 14px; color: #64748b; margin-top: 5px;">Generated on ${new Date(evaluation.createdAt).toLocaleDateString()}</div>
      </div>

      <div class="score-box">
        <div style="font-size: 14px; font-weight: bold; color: #64748b; text-transform: uppercase;">Overall score</div>
        <div class="score-val">${evaluation.overallScore}%</div>
        <div style="font-weight: 600; color: #0f172a; margin-top: 5px;">
          Performance: ${evaluation.overallScore >= 80 ? 'Excellent' : evaluation.overallScore >= 70 ? 'Very Good' : evaluation.overallScore >= 60 ? 'Satisfactory' : 'Needs Practice'}
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Target Role:</span> ${session.role}</div>
        <div class="meta-item"><span class="meta-label">Experience Level:</span> ${session.experienceLevel}</div>
        <div class="meta-item"><span class="meta-label">Technical Score:</span> ${evaluation.technicalScore}%</div>
        <div class="meta-item"><span class="meta-label">Communication Score:</span> ${evaluation.communicationScore}%</div>
        <div class="meta-item"><span class="meta-label">HR/Behavioral Score:</span> ${evaluation.hrScore}%</div>
        <div class="meta-item"><span class="meta-label">Confidence Score:</span> ${evaluation.confidenceScore}%</div>
      </div>

      <div class="section-title">Overall Feedback</div>
      <p>${evaluation.overallFeedback}</p>

      <div class="section-title">Key Strengths</div>
      <ul class="bullet-list">
        ${evaluation.strengths.map(s => `<li>${s}</li>`).join('')}
      </ul>

      <div class="section-title">Development Opportunities</div>
      <ul class="bullet-list">
        ${evaluation.weaknesses.map(w => `<li>${w}</li>`).join('')}
      </ul>

      <div class="section-title">Actionable Suggestions</div>
      <ul class="bullet-list">
        ${evaluation.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>

      <div class="section-title">Detailed Question breakdown</div>
      ${questions.map((q, idx) => {
        const qEval = questionEvaluations.find(e => e.questionId.toString() === q._id.toString());
        const ans = answers.find(a => a.questionId.toString() === q._id.toString());
        const missingPointsHtml = (qEval && qEval.missingPoints?.length > 0)
          ? `<div style="font-size: 12px; margin-top: 8px; color: #991b1b;"><strong style="color: #475569;">Missing Concepts:</strong> ${qEval.missingPoints.join(', ')}</div>`
          : '';
        
        return `
        <div class="question-block">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span class="q-num">Question ${q.questionNumber} (${q.topic})</span>
            <span class="score-badge">Score: ${qEval ? qEval.score : 0}/10</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 10px;">${q.question}</div>
          <div style="font-size: 13px; margin-bottom: 8px;"><strong style="color: #475569;">Candidate Response:</strong> "${ans ? ans.answer : '[No answer provided]'}"</div>
          <div style="font-size: 13px; margin-bottom: 8px;"><strong style="color: #475569;">AI Feedback:</strong> ${qEval ? qEval.feedback : 'N/A'}</div>
          ${missingPointsHtml}
        </div>
        `;
      }).join('')}

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 800);
        };
      </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename=InterviewAce_Report_\${session.interviewId}.html`);
    res.send(htmlContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Retake an interview by cloning its configuration
// @route   POST /api/interviews/:id/retake
// @access  Private
exports.retakeInterview = async (req, res, next) => {
  try {
    const originalSession = await findSessionByIdOrCode(req.params.id);

    if (!originalSession) {
      return res.status(404).json({ success: false, message: 'Original interview session not found' });
    }

    if (originalSession.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Generate unique code for the new interview session
    const uniqueId = crypto.randomBytes(3).toString('hex').toUpperCase();
    const newInterviewId = `INT-${uniqueId}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSession = await InterviewSession.create({
      user: req.user._id,
      interviewId: newInterviewId,
      title: `${originalSession.role} Retake`,
      interviewType: originalSession.interviewType,
      role: originalSession.role,
      company: originalSession.company,
      experienceLevel: originalSession.experienceLevel,
      difficulty: originalSession.difficulty,
      duration: originalSession.duration,
      questionCount: originalSession.questionCount,
      preferredLanguage: originalSession.preferredLanguage,
      focusAreas: originalSession.focusAreas,
      interviewMode: originalSession.interviewMode,
      status: 'Created',
      currentQuestion: 1,
      answeredQuestions: 0,
      progress: 0
    });

    res.status(201).json({
      success: true,
      message: 'New retake interview session initialized successfully',
      session: newSession
    });
  } catch (error) {
    next(error);
  }
};
