const mongoose = require('mongoose');

const InterviewQuestionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
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
  questionType: {
    type: String,
    required: true,
    enum: ['technical', 'behavioral', 'hr', 'project']
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Easy', 'Medium', 'Hard', 'Adaptive']
  },
  question: {
    type: String,
    required: true
  },
  expectedAnswer: {
    type: String,
    required: true
  },
  hints: {
    type: [String],
    default: []
  },
  answer: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    default: null
  },
  feedback: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'answered', 'graded'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InterviewQuestion', InterviewQuestionSchema);
