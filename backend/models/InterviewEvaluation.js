const mongoose = require('mongoose');

const InterviewEvaluationSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  overallScore: {
    type: Number,
    required: true
  },
  technicalScore: {
    type: Number,
    required: true
  },
  hrScore: {
    type: Number,
    required: true
  },
  communicationScore: {
    type: Number,
    required: true
  },
  confidenceScore: {
    type: Number,
    required: true
  },
  strengths: {
    type: [String],
    default: []
  },
  weaknesses: {
    type: [String],
    default: []
  },
  recommendations: {
    type: [String],
    default: []
  },
  learningRoadmap: [{
    priority: { type: String }, // e.g. "Priority 1"
    topic: { type: String },
    reason: { type: String }
  }],
  skillHeatmap: [{
    skill: { type: String },
    stars: { type: Number } // 1 to 5
  }],
  overallFeedback: {
    type: String,
    default: ''
  },
  evaluationEngine: {
    type: String,
    enum: ['Gemini', 'Local'],
    default: 'Gemini'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InterviewEvaluation', InterviewEvaluationSchema);
