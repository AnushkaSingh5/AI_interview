const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getGamificationProfile,
  getLeaderboard,
  claimDailyBonus
} = require('../controllers/gamificationController');

const router = express.Router();

router.get('/profile', protect, getGamificationProfile);
router.get('/leaderboard', protect, getLeaderboard);
router.post('/claim-daily', protect, claimDailyBonus);

module.exports = router;
