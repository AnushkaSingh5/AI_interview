const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getDashboardSummary,
  getInterviewHistory,
  getAnalytics,
  getSkillAnalytics,
  getStreakAndAchievements,
  getRecommendations,
  compareInterviews
} = require('../controllers/dashboardController');

const router = express.Router();

router.get('/summary', protect, getDashboardSummary);
router.get('/history', protect, getInterviewHistory);
router.get('/analytics', protect, getAnalytics);
router.get('/skills', protect, getSkillAnalytics);
router.get('/streak', protect, getStreakAndAchievements);
router.get('/recommendations', protect, getRecommendations);
router.get('/compare/:id', protect, compareInterviews);

module.exports = router;
