const gamificationService = require('../services/gamificationService');

// @desc    Get current user's gamification profile (XP, Level, Streaks, Badges, Rank)
// @route   GET /api/gamification/profile
// @access  Private
exports.getGamificationProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const data = await gamificationService.syncUserGamification(userId);

    // Also get user's leaderboard rank
    const leaderboard = await gamificationService.getLeaderboardData('all-time', userId);

    res.status(200).json({
      success: true,
      profile: {
        totalXp: data.gamification.totalXp,
        level: data.gamification.level,
        levelTitle: data.gamification.levelTitle,
        levelDetails: data.levelDetails,
        currentStreak: data.gamification.currentStreak,
        longestStreak: data.gamification.longestStreak,
        lastActiveDate: data.gamification.lastActiveDate,
        lastDailyClaim: data.gamification.lastDailyClaim,
        unlockedBadges: data.gamification.unlockedBadges,
        badgeProgressList: data.badgeProgressList,
        stats: data.stats,
        rank: leaderboard.currentUserRankInfo ? leaderboard.currentUserRankInfo.rank : 1,
        totalCandidates: leaderboard.totalCandidates,
        allLevels: data.allLevels
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get competitive leaderboard (all-time, streak, weekly)
// @route   GET /api/gamification/leaderboard
// @access  Private
exports.getLeaderboard = async (req, res, next) => {
  try {
    const filter = req.query.filter || 'all-time';
    const userId = req.user._id;

    const leaderboardData = await gamificationService.getLeaderboardData(filter, userId);

    res.status(200).json({
      success: true,
      ...leaderboardData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Claim daily streak bonus XP
// @route   POST /api/gamification/claim-daily
// @access  Private
exports.claimDailyBonus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await gamificationService.claimDailyBonus(userId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
