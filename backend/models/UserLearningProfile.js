const mongoose = require('mongoose');

const UserLearningProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalInterviews: {
    type: Number,
    default: 0
  },
  strongestTopics: [{
    topic: { type: String, required: true },
    averageScore: { type: Number, required: true }
  }],
  weakestTopics: [{
    topic: { type: String, required: true },
    averageScore: { type: Number, required: true },
    occurrences: { type: Number, default: 1 }
  }],
  topicHistory: [{
    topic: { type: String, required: true },
    scores: [{ type: Number }],
    trend: { type: String, enum: ['Improving', 'Declining', 'Stable'], default: 'Stable' }
  }],
  improvementTrend: [{
    category: { type: String, required: true }, // e.g. Technical, Communication, Confidence, Flow, Problem Solving
    changePercent: { type: Number, default: 0 }
  }],
  recommendations: [{
    topic: { type: String, required: true },
    priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
    estimatedStudyTimeHours: { type: Number, default: 2 },
    recommendationText: { type: String, required: true },
    practiceExercises: [{ type: String }]
  }],
  weeklyStudyPlan: [{
    day: { type: String, required: true }, // e.g. Monday, Tuesday
    topic: { type: String, required: true },
    timeEstimate: { type: String, required: true }
  }],
  learningInsights: [{ type: String }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserLearningProfile', UserLearningProfileSchema);
