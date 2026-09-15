const mongoose = require('mongoose');

const UserGamificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalXp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  levelTitle: {
    type: String,
    default: 'Novice Apprentice'
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastActiveDate: {
    type: String,
    default: ''
  },
  lastDailyClaim: {
    type: Date,
    default: null
  },
  unlockedBadges: [{
    badgeId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Diamond'], default: 'Bronze' },
    xpBonus: { type: Number, default: 0 },
    unlockedAt: { type: Date, default: Date.now }
  }],
  activityHistory: [{
    action: { type: String, required: true },
    xpEarned: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  stats: {
    totalInterviewsCompleted: { type: Number, default: 0 },
    totalPracticeAnswered: { type: Number, default: 0 },
    dailyChallengesCompleted: { type: Number, default: 0 },
    highestInterviewScore: { type: Number, default: 0 },
    roadmapWeeksCompleted: { type: Number, default: 0 },
    perfectScoresCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Index for high-performance leaderboard queries
UserGamificationSchema.index({ totalXp: -1 });
UserGamificationSchema.index({ currentStreak: -1 });

module.exports = mongoose.model('UserGamification', UserGamificationSchema);
