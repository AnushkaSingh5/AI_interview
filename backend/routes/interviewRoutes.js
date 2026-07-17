const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  createInterviewSession,
  getInterviewSession,
  updateInterviewSession,
  deleteInterviewSession,
  getUserInterviews,
  generateQuestions,
  getQuestions,
  regenerateQuestions,
  deleteQuestions,
  startInterview,
  saveAnswer,
  getAnswers,
  resumeInterview,
  submitInterview,
  evaluateSession,
  getStatus,
  getQueueStatus,
  resumeEvaluation,
  getReport,
  getQuestionFeedback,
  downloadReportPdf,
  retakeInterview
} = require('../controllers/interviewController');

const router = express.Router();

// Helper middleware to handle express-validator results
const validateFields = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// All routes require user authentication
router.use(protect);

// @route   POST /api/interviews/create
router.post(
  '/create',
  [
    body('interviewType')
      .isIn(['Technical', 'HR', 'Mixed'])
      .withMessage('Interview type must be Technical, HR, or Mixed'),
    body('role')
      .notEmpty()
      .withMessage('Job role cannot be empty')
      .trim(),
    body('experienceLevel')
      .isIn(['Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5+ Years'])
      .withMessage('Invalid experience level specified'),
    body('difficulty')
      .isIn(['Easy', 'Medium', 'Hard', 'Adaptive'])
      .withMessage('Difficulty must be Easy, Medium, Hard, or Adaptive'),
    body('duration')
      .isInt({ min: 10, max: 60 })
      .withMessage('Duration must be between 10 and 60 minutes'),
    body('questionCount')
      .isInt({ min: 5, max: 20 })
      .withMessage('Question count must be between 5 and 20'),
    body('preferredLanguage')
      .isIn(['English', 'Hindi', 'Mixed'])
      .withMessage('Preferred language must be English, Hindi, or Mixed'),
    body('interviewMode')
      .optional()
      .isIn(['Text', 'Voice', 'Video'])
      .withMessage('Interview mode must be Text, Voice, or Video'),
    body('focusAreas')
      .optional()
      .isArray()
      .withMessage('Focus areas must be a list of strings')
  ],
  validateFields,
  createInterviewSession
);

// @route   GET /api/interviews/user
router.get('/user', getUserInterviews);

// @route   GET /api/interviews/:id
router.get('/:id', getInterviewSession);

// @route   PUT /api/interviews/:id
router.put('/:id', updateInterviewSession);

// @route   DELETE /api/interviews/:id
router.delete('/:id', deleteInterviewSession);

// --- AI Question Generation endpoints ---
router.post('/:id/generate', generateQuestions);
router.get('/:id/questions', getQuestions);
router.post('/:id/regenerate', regenerateQuestions);
router.delete('/:id/questions', deleteQuestions);

// --- Mock Interview Session Endpoints ---

// @route   POST /api/interviews/:id/start
router.post('/:id/start', startInterview);

// @route   POST /api/interviews/:id/answer
router.post('/:id/answer', saveAnswer);

// @route   GET /api/interviews/:id/answers
router.get('/:id/answers', getAnswers);

// @route   GET /api/interviews/:id/resume
router.get('/:id/resume', resumeInterview);

// @route   POST /api/interviews/:id/submit
router.post('/:id/submit', submitInterview);

// --- AI Evaluation & Reporting Endpoints ---

// @route   GET /api/interviews/queue/status
router.get('/queue/status', getQueueStatus);

// @route   POST /api/interviews/:id/evaluate
router.post('/:id/evaluate', evaluateSession);

// @route   POST /api/interviews/:id/resume-eval
router.post('/:id/resume-eval', resumeEvaluation);

// @route   GET /api/interviews/:id/status
router.get('/:id/status', getStatus);

// @route   GET /api/interviews/:id/report
router.get('/:id/report', getReport);

// @route   GET /api/interviews/:id/question-feedback
router.get('/:id/question-feedback', getQuestionFeedback);

// @route   GET /api/interviews/:id/report/pdf
router.get('/:id/report/pdf', downloadReportPdf);

// @route   POST /api/interviews/:id/retake
router.post('/:id/retake', protect, retakeInterview);

module.exports = router;
