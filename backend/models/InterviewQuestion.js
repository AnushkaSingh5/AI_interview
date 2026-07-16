const mongoose = require('mongoose');

const InterviewQuestionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  questionType: {
    type: String,
    required: true,
    enum: ['technical', 'behavioral']
  },
  question: {
    type: String,
    required: true
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
