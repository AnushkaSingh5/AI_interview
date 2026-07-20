const mongoose = require('mongoose');

const PracticeQuestionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PracticeSession',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: ''
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  question: {
    type: String,
    required: true
  },
  expectedAnswer: {
    type: String,
    default: ''
  },
  userAnswer: {
    type: String,
    default: ''
  },
  isAnswered: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: null
  },
  accuracy: {
    type: Number,
    default: null
  },
  feedback: {
    type: String,
    default: ''
  },
  idealAnswer: {
    type: String,
    default: ''
  },
  conceptExplanation: {
    type: String,
    default: ''
  },
  commonMistakes: {
    type: [String],
    default: []
  },
  interviewTips: {
    type: [String],
    default: []
  },
  relatedTopics: {
    type: [String],
    default: []
  },
  answeredAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PracticeQuestion', PracticeQuestionSchema);
