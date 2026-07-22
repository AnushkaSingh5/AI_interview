const mongoose = require('mongoose');

const VoiceInterviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  sessionTitle: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  questionCount: {
    type: Number,
    default: 5
  },
  questions: [{
    questionNumber: { type: Number, required: true },
    topic: { type: String, default: 'General' },
    questionText: { type: String, required: true },
    expectedAnswer: { type: String, default: '' },
    transcriptText: { type: String, default: '' },
    editedTranscriptText: { type: String, default: '' },
    audioDurationSec: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    speakingSpeedWpm: { type: Number, default: 0 },
    fillerWordsCount: { type: Number, default: 0 },
    fillerWordsDetected: [{ type: String }],
    score: { type: Number, default: 0 },
    technicalScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    fluencyScore: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    idealAnswer: { type: String, default: '' },
    communicationTips: [{ type: String }]
  }],
  overallScore: {
    type: Number,
    default: 0
  },
  technicalScore: {
    type: Number,
    default: 0
  },
  communicationScore: {
    type: Number,
    default: 0
  },
  confidenceScore: {
    type: Number,
    default: 0
  },
  fluencyScore: {
    type: Number,
    default: 0
  },
  averageWpm: {
    type: Number,
    default: 0
  },
  totalFillerWords: {
    type: Number,
    default: 0
  },
  speakingPace: {
    type: String,
    enum: ['Slow', 'Optimal', 'Fast'],
    default: 'Optimal'
  },
  grammarObservations: [{ type: String }],
  improvementSuggestions: [{ type: String }],
  overallFeedback: { type: String, default: '' },
  strengths: [{ type: String }],
  focusGaps: [{ type: String }],
  recommendations: [{ type: String }],
  learningRoadmap: [{
    priority: { type: String },
    title: { type: String },
    description: { type: String }
  }],
  skillHeatmap: [{
    skill: { type: String },
    stars: { type: Number, default: 4 }
  }],
  status: {
    type: String,
    enum: ['InProgress', 'Completed'],
    default: 'InProgress'
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VoiceInterview', VoiceInterviewSchema);
