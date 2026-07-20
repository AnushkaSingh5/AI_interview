const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getTopics,
  startPracticeSession,
  evaluatePracticeAnswer,
  getPracticeSession,
  getDailyChallenge,
  getLearningRoadmap,
  getFlashcards,
  getBookmarks,
  addBookmark,
  deleteBookmark,
  getPracticeStats
} = require('../controllers/practiceController');

const router = express.Router();

router.get('/topics', protect, getTopics);
router.post('/start', protect, startPracticeSession);
router.post('/answer', protect, evaluatePracticeAnswer);
router.get('/session/:id', protect, getPracticeSession);
router.get('/daily', protect, getDailyChallenge);
router.get('/roadmap', protect, getLearningRoadmap);
router.get('/flashcards', protect, getFlashcards);
router.get('/bookmarks', protect, getBookmarks);
router.post('/bookmark', protect, addBookmark);
router.delete('/bookmark/:id', protect, deleteBookmark);
router.get('/stats', protect, getPracticeStats);

module.exports = router;
