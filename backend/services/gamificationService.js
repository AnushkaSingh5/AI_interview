const mongoose = require('mongoose');
const User = require('../models/User');
const UserGamification = require('../models/UserGamification');
const InterviewSession = require('../models/InterviewSession');
const InterviewEvaluation = require('../models/InterviewEvaluation');
const InterviewAnswer = require('../models/InterviewAnswer');
const QuestionEvaluation = require('../models/QuestionEvaluation');
const PracticeSession = require('../models/PracticeSession');
const PracticeQuestion = require('../models/PracticeQuestion');
const LearningRoadmap = require('../models/LearningRoadmap');

// 1. Skill Levels Configuration (Levels 1 to 8)
const SKILL_LEVELS = [
  { level: 1, title: 'Novice Apprentice', minXp: 0, maxXp: 250, icon: '🌱', color: '#6c757d' },
  { level: 2, title: 'Junior Developer', minXp: 251, maxXp: 600, icon: '💻', color: '#0d6efd' },
  { level: 3, title: 'Skilled Practitioner', minXp: 601, maxXp: 1200, icon: '⚡', color: '#198754' },
  { level: 4, title: 'Senior Specialist', minXp: 1201, maxXp: 2200, icon: '🛡️', color: '#0dcaf0' },
  { level: 5, title: 'Tech Lead', minXp: 2201, maxXp: 3800, icon: '👑', color: '#ffc107' },
  { level: 6, title: 'Staff Architect', minXp: 3801, maxXp: 6000, icon: '🚀', color: '#fd7e14' },
  { level: 7, title: 'Principal Engineer', minXp: 6001, maxXp: 9500, icon: '💎', color: '#6f42c1' },
  { level: 8, title: 'Distinguished Legend', minXp: 9501, maxXp: null, icon: '🌟', color: '#d63384' }
];

// 2. Comprehensive Badges Catalog (12 Tiered Achievements)
const BADGE_CATALOG = [
  {
    badgeId: 'first_flight',
    name: 'First Flight',
    category: 'Interviews',
    description: 'Completed your very first mock interview!',
    icon: '🚀',
    tier: 'Bronze',
    xpBonus: 100,
    target: 1,
    metric: 'totalInterviewsCompleted'
  },
  {
    badgeId: 'interview_veteran',
    name: 'Interview Veteran',
    category: 'Interviews',
    description: 'Completed 5 mock interviews across any track.',
    icon: '🎖️',
    tier: 'Silver',
    xpBonus: 250,
    target: 5,
    metric: 'totalInterviewsCompleted'
  },
  {
    badgeId: 'interview_maestro',
    name: 'Interview Maestro',
    category: 'Interviews',
    description: 'Completed 10+ mock interviews with seasoned expertise.',
    icon: '👑',
    tier: 'Gold',
    xpBonus: 500,
    target: 10,
    metric: 'totalInterviewsCompleted'
  },
  {
    badgeId: 'precision_ace',
    name: 'Precision Ace',
    category: 'Mastery',
    description: 'Scored 85% or higher in a full mock interview evaluation.',
    icon: '🌟',
    tier: 'Silver',
    xpBonus: 150,
    target: 85,
    metric: 'highestInterviewScore'
  },
  {
    badgeId: 'century_club',
    name: 'Century Club',
    category: 'Mastery',
    description: 'Achieved an elite 95%+ score in a technical interview.',
    icon: '💯',
    tier: 'Diamond',
    xpBonus: 300,
    target: 95,
    metric: 'highestInterviewScore'
  },
  {
    badgeId: 'spark_starter',
    name: 'Spark Starter',
    category: 'Streaks',
    description: 'Maintained a 3-day active interview/practice streak.',
    icon: '🔥',
    tier: 'Bronze',
    xpBonus: 150,
    target: 3,
    metric: 'currentStreak'
  },
  {
    badgeId: 'unstoppable_streak',
    name: 'Unstoppable',
    category: 'Streaks',
    description: 'Maintained a 7-day active daily interview streak!',
    icon: '⚡',
    tier: 'Silver',
    xpBonus: 350,
    target: 7,
    metric: 'currentStreak'
  },
  {
    badgeId: 'consistency_titan',
    name: 'Consistency Titan',
    category: 'Streaks',
    description: 'Maintained an incredible 14-day interview streak.',
    icon: '🏆',
    tier: 'Gold',
    xpBonus: 700,
    target: 14,
    metric: 'currentStreak'
  },
  {
    badgeId: 'daily_gladiator',
    name: 'Daily Gladiator',
    category: 'Practice',
    description: 'Conquered 3 Daily Practice Challenges.',
    icon: '⚔️',
    tier: 'Bronze',
    xpBonus: 150,
    target: 3,
    metric: 'dailyChallengesCompleted'
  },
  {
    badgeId: 'practice_champion',
    name: 'Question Crusher',
    category: 'Practice',
    description: 'Answered over 25 practice questions with AI feedback.',
    icon: '🎯',
    tier: 'Silver',
    xpBonus: 200,
    target: 25,
    metric: 'totalPracticeAnswered'
  },
  {
    badgeId: 'roadmap_scholar',
    name: 'Roadmap Scholar',
    category: 'Learning',
    description: 'Completed a full week in your Personalized Learning Plan.',
    icon: '📖',
    tier: 'Gold',
    xpBonus: 250,
    target: 1,
    metric: 'roadmapWeeksCompleted'
  },
  {
    badgeId: 'perfect_precision',
    name: 'Flawless Execution',
    category: 'Mastery',
    description: 'Scored 100% on at least 3 individual interview questions.',
    icon: '💎',
    tier: 'Diamond',
    xpBonus: 300,
    target: 3,
    metric: 'perfectScoresCount'
  }
];

// Helper: Calculate skill level from Total XP
const calculateLevel = (xp) => {
  const safeXp = Math.max(0, xp || 0);
  for (let i = SKILL_LEVELS.length - 1; i >= 0; i--) {
    if (safeXp >= SKILL_LEVELS[i].minXp) {
      const current = SKILL_LEVELS[i];
      const nextLevel = SKILL_LEVELS[i + 1] || null;
      const xpInCurrentLevel = safeXp - current.minXp;
      const totalXpInLevel = nextLevel ? nextLevel.minXp - current.minXp : 2000;
      const progressPercent = nextLevel
        ? Math.min(100, Math.round((xpInCurrentLevel / totalXpInLevel) * 100))
        : 100;

      return {
        level: current.level,
        levelTitle: current.title,
        icon: current.icon,
        color: current.color,
        currentXp: safeXp,
        minXp: current.minXp,
        maxXp: current.maxXp,
        xpToNextLevel: nextLevel ? Math.max(0, nextLevel.minXp - safeXp) : 0,
        progressPercent,
        nextLevelTitle: nextLevel ? nextLevel.title : 'Max Level Reached'
      };
    }
  }
  return {
    level: 1,
    levelTitle: SKILL_LEVELS[0].title,
    icon: SKILL_LEVELS[0].icon,
    color: SKILL_LEVELS[0].color,
    currentXp: safeXp,
    minXp: 0,
    maxXp: 250,
    xpToNextLevel: 250 - safeXp,
    progressPercent: Math.min(100, Math.round((safeXp / 250) * 100)),
    nextLevelTitle: SKILL_LEVELS[1].title
  };
};

// Helper: Calculate streak dynamically across all interview & practice activities
const calculateStreak = async (userId) => {
  try {
    const VoiceInterview = mongoose.model('VoiceInterview');
    const VideoInterview = mongoose.model('VideoInterview');
    const CodingInterview = mongoose.model('CodingInterview');
    const SystemDesignInterview = mongoose.model('SystemDesignInterview');

    const [sessions, video, voice, coding, sysDesign, practice] = await Promise.all([
      InterviewSession.find({ user: userId, status: 'Completed' }).select('completedAt updatedAt createdAt').catch(() => []),
      VideoInterview ? VideoInterview.find({ user: userId, status: 'Completed' }).select('completedAt updatedAt createdAt').catch(() => []) : [],
      VoiceInterview ? VoiceInterview.find({ user: userId, status: 'Completed' }).select('completedAt updatedAt createdAt').catch(() => []) : [],
      CodingInterview ? CodingInterview.find({ user: userId, status: 'Completed' }).select('completedAt updatedAt createdAt').catch(() => []) : [],
      SystemDesignInterview ? SystemDesignInterview.find({ user: userId, status: 'Completed' }).select('completedAt updatedAt createdAt').catch(() => []) : [],
      PracticeSession.find({ user: userId }).select('completedAt updatedAt createdAt').catch(() => [])
    ]);

    const allDates = [...sessions, ...video, ...voice, ...coding, ...sysDesign, ...practice]
      .map(s => s.completedAt || s.updatedAt || s.createdAt)
      .filter(d => d && !isNaN(new Date(d).getTime()))
      .map(d => new Date(d).toISOString().split('T')[0]);

    const uniqueDates = [...new Set(allDates)].sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length === 0) return { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = 0;
    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      let expectedDate = new Date(uniqueDates[0]);
      for (const dStr of uniqueDates) {
        const currentDate = new Date(dStr);
        const diffDays = Math.round((expectedDate - currentDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
          currentStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    const ascendingDates = [...uniqueDates].sort();
    for (const dStr of ascendingDates) {
      const curDate = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diff = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = curDate;
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActiveDate: uniqueDates[0] || ''
    };
  } catch (err) {
    console.warn('[Gamification] calculateStreak error:', err.message);
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };
  }
};

/**
 * Main function: Sync & Calculate full Gamification Profile
 */
exports.syncUserGamification = async (userId) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Gather all activity stats
    const [
      textCount,
      voiceCount,
      videoCount,
      codingCount,
      sysDesignCount,
      practiceAnswersCount,
      dailyChallengesCount,
      evaluations,
      questionEvals,
      roadmap,
      streakData
    ] = await Promise.all([
      InterviewSession.countDocuments({ user: userObjectId, status: 'Completed' }).catch(() => 0),
      mongoose.model('VoiceInterview').countDocuments({ user: userObjectId, status: 'Completed' }).catch(() => 0),
      mongoose.model('VideoInterview').countDocuments({ user: userObjectId, status: 'Completed' }).catch(() => 0),
      mongoose.model('CodingInterview').countDocuments({ user: userObjectId, status: 'Completed' }).catch(() => 0),
      mongoose.model('SystemDesignInterview').countDocuments({ user: userObjectId, status: 'Completed' }).catch(() => 0),
      PracticeQuestion.countDocuments({ user: userObjectId, userAnswer: { $ne: '' } }).catch(() => 0),
      PracticeSession.countDocuments({ user: userObjectId, mode: 'Daily' }).catch(() => 0),
      InterviewEvaluation.find({ user: userObjectId }).select('overallScore').catch(() => []),
      QuestionEvaluation.find({ user: userObjectId }).select('score').catch(() => []),
      LearningRoadmap.findOne({ user: userObjectId }).catch(() => null),
      calculateStreak(userObjectId)
    ]);

    const totalInterviews = textCount + voiceCount + videoCount + codingCount + sysDesignCount;
    const scores = evaluations.map(e => e.overallScore || 0);
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const perfectScoresCount = questionEvals.filter(q => q.score >= 9.5).length;
    const completedRoadmapWeeks = roadmap?.weeks ? roadmap.weeks.filter(w => w.completed).length : 0;

    const stats = {
      totalInterviewsCompleted: totalInterviews,
      totalPracticeAnswered: practiceAnswersCount,
      dailyChallengesCompleted: dailyChallengesCount,
      highestInterviewScore: highestScore,
      roadmapWeeksCompleted: completedRoadmapWeeks,
      perfectScoresCount: perfectScoresCount
    };

    // 2. Evaluate Badges
    const unlockedBadges = [];
    const badgeProgressList = [];

    BADGE_CATALOG.forEach(badge => {
      let currentValue = 0;
      if (badge.metric === 'currentStreak') currentValue = streakData.longestStreak;
      else if (stats[badge.metric] !== undefined) currentValue = stats[badge.metric];

      const isUnlocked = currentValue >= badge.target;
      const percent = Math.min(100, Math.round((currentValue / badge.target) * 100));

      if (isUnlocked) {
        unlockedBadges.push({
          badgeId: badge.badgeId,
          name: badge.name,
          category: badge.category,
          description: badge.description,
          icon: badge.icon,
          tier: badge.tier,
          xpBonus: badge.xpBonus,
          unlockedAt: new Date()
        });
      }

      badgeProgressList.push({
        ...badge,
        currentValue,
        isUnlocked,
        progressPercent: percent
      });
    });

    // 3. Calculate Total Base XP
    let calculatedXp = (totalInterviews * 120) + // 120 XP per completed mock interview
      (practiceAnswersCount * 15) + // 15 XP per answered practice question
      (dailyChallengesCount * 60) + // 60 XP per daily challenge solved
      (completedRoadmapWeeks * 150) + // 150 XP per completed roadmap week
      (streakData.currentStreak * 25) + // 25 XP per current streak day
      (perfectScoresCount * 40); // 40 XP per perfect answer

    // Add badge bonus XP
    unlockedBadges.forEach(b => {
      calculatedXp += (b.xpBonus || 0);
    });

    // Ensure XP is at least 50 for welcome bonus if registered
    if (calculatedXp === 0) calculatedXp = 50;

    const levelDetails = calculateLevel(calculatedXp);

    // 4. Upsert UserGamification record atomically
    const gamification = await UserGamification.findOneAndUpdate(
      { user: userObjectId },
      {
        $set: {
          totalXp: calculatedXp,
          level: levelDetails.level,
          levelTitle: levelDetails.levelTitle,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          lastActiveDate: streakData.lastActiveDate,
          unlockedBadges,
          stats
        }
      },
      { upsert: true, new: true }
    );

    return {
      gamification,
      levelDetails,
      badgeProgressList,
      stats,
      allLevels: SKILL_LEVELS
    };
  } catch (err) {
    console.error('[Gamification Service] sync error:', err.message);
    throw err;
  }
};

/**
 * Get Leaderboard rankings (All-time, Weekly, Streak)
 */
exports.getLeaderboardData = async (filter = 'all-time', currentUserId) => {
  try {
    // 1. Ensure all users with interviews have gamification profiles
    const users = await User.find({}).select('name email role avatar targetRole').lean();

    // Fetch all gamification profiles
    const gamifications = await UserGamification.find({}).populate('user', 'name email avatar targetRole role').lean();
    const gamificationMap = new Map();
    gamifications.forEach(g => {
      if (g.user && g.user._id) {
        gamificationMap.set(g.user._id.toString(), g);
      }
    });

    // Build unified candidate list
    const candidateList = [];
    for (const u of users) {
      const uId = u._id.toString();
      let g = gamificationMap.get(uId);

      if (!g) {
        // Compute dynamically if missing
        try {
          const syncRes = await exports.syncUserGamification(u._id);
          g = syncRes.gamification;
        } catch (e) {
          g = { totalXp: 50, level: 1, levelTitle: 'Novice Apprentice', currentStreak: 0, unlockedBadges: [] };
        }
      }

      const levelDetails = calculateLevel(g.totalXp || 0);

      candidateList.push({
        userId: uId,
        name: u.name || u.email?.split('@')[0] || 'Anonymous Candidate',
        email: u.email,
        targetRole: u.targetRole || u.role || 'Software Engineer',
        avatar: u.avatar || '',
        totalXp: g.totalXp || 0,
        level: levelDetails.level,
        levelTitle: levelDetails.levelTitle,
        levelIcon: levelDetails.icon,
        levelColor: levelDetails.color,
        currentStreak: g.currentStreak || 0,
        longestStreak: g.longestStreak || 0,
        badgesCount: g.unlockedBadges ? g.unlockedBadges.length : 0,
        interviewsCompleted: g.stats ? g.stats.totalInterviewsCompleted : 0,
        isCurrentUser: currentUserId && uId === currentUserId.toString()
      });
    }

    // 2. Sort by filter
    if (filter === 'streak') {
      candidateList.sort((a, b) => b.currentStreak - a.currentStreak || b.totalXp - a.totalXp);
    } else if (filter === 'interviews') {
      candidateList.sort((a, b) => b.interviewsCompleted - a.interviewsCompleted || b.totalXp - a.totalXp);
    } else {
      // Default: all-time XP
      candidateList.sort((a, b) => b.totalXp - a.totalXp || b.currentStreak - a.currentStreak);
    }

    // Assign rank positions
    const rankedList = candidateList.map((c, idx) => ({
      ...c,
      rank: idx + 1
    }));

    // Find current user's rank
    const currentUserRankInfo = rankedList.find(c => c.isCurrentUser) || null;

    // Podium Top 3
    const topThree = rankedList.slice(0, 3);

    return {
      filter,
      totalCandidates: rankedList.length,
      topThree,
      rankedList,
      currentUserRankInfo
    };
  } catch (err) {
    console.error('[Gamification Service] Leaderboard error:', err.message);
    throw err;
  }
};

/**
 * Claim daily streak XP bonus
 */
exports.claimDailyBonus = async (userId) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    let gamification = await UserGamification.findOne({ user: userObjectId });

    if (!gamification) {
      await exports.syncUserGamification(userId);
      gamification = await UserGamification.findOne({ user: userObjectId });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const lastClaimStr = gamification.lastDailyClaim ? new Date(gamification.lastDailyClaim).toISOString().split('T')[0] : '';

    if (lastClaimStr === todayStr) {
      return {
        success: false,
        alreadyClaimed: true,
        message: 'Daily bonus already claimed for today! Return tomorrow to keep your streak going.'
      };
    }

    // Calculate streak bonus: 25 base XP + (5 * currentStreak)
    const streakBonus = Math.min(100, 25 + ((gamification.currentStreak || 1) * 5));
    gamification.totalXp += streakBonus;
    gamification.lastDailyClaim = new Date();
    
    // Add to activity history
    gamification.activityHistory.unshift({
      action: `Daily Login & Streak Bonus (${gamification.currentStreak || 1} day streak)`,
      xpEarned: streakBonus,
      createdAt: new Date()
    });

    // Keep activity history capped at 30 items
    if (gamification.activityHistory.length > 30) {
      gamification.activityHistory = gamification.activityHistory.slice(0, 30);
    }

    const levelDetails = calculateLevel(gamification.totalXp);
    gamification.level = levelDetails.level;
    gamification.levelTitle = levelDetails.levelTitle;

    await gamification.save();

    return {
      success: true,
      alreadyClaimed: false,
      xpEarned: streakBonus,
      totalXp: gamification.totalXp,
      levelDetails,
      message: `🎉 Claimed +${streakBonus} XP Daily Bonus!`
    };
  } catch (err) {
    console.error('[Gamification Service] Daily claim error:', err.message);
    throw err;
  }
};

module.exports = {
  SKILL_LEVELS,
  BADGE_CATALOG,
  calculateLevel,
  calculateStreak,
  syncUserGamification: exports.syncUserGamification,
  getLeaderboardData: exports.getLeaderboardData,
  claimDailyBonus: exports.claimDailyBonus
};
