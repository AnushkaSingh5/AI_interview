const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getProfile,
  getRecommendations,
  getTrends,
  getWeakTopics,
  getStudyPlan,
  forceUpdateProfile
} = require('../controllers/learningController');

const router = express.Router();

// Require authentication for all learning engine endpoints
router.use(protect);

router.get('/profile', getProfile);
router.get('/recommendations', getRecommendations);
router.get('/trends', getTrends);
router.get('/weak-topics', getWeakTopics);
router.get('/study-plan', getStudyPlan);
router.post('/update', forceUpdateProfile);

module.exports = router;
