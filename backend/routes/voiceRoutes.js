const express = require('express');
const { protect } = require('../middleware/auth');
const {
  startVoiceSession,
  evaluateVoiceQuestion,
  compileVoiceReport,
  getVoiceReport,
  getVoiceHistory,
  saveVoiceTranscript
} = require('../controllers/voiceController');

const router = express.Router();

router.post('/start', protect, startVoiceSession);
router.post('/save-transcript', protect, saveVoiceTranscript);
router.post('/evaluate', protect, evaluateVoiceQuestion);
router.post('/compile-report', protect, compileVoiceReport);
router.get('/report/:id', protect, getVoiceReport);
router.get('/history', protect, getVoiceHistory);

module.exports = router;
