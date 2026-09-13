const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createSession,
  getSession,
  runCode,
  submitSolution,
  getReport,
  terminateSession
} = require('../controllers/codingController');

const router = express.Router();

// All coding interview routes require authentication
router.use(protect);

// Create session
router.post('/session/create', createSession);

// Get session details
router.get('/session/:id', getSession);

// Run code against test cases
router.post('/run', runCode);

// Submit code and get AI review
router.post('/submit', submitSolution);

// Get completed report
router.get('/report/:id', getReport);

// Terminate session
router.post('/terminate', terminateSession);

module.exports = router;
