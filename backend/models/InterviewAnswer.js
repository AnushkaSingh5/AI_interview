const mongoose = require('mongoose');

const InterviewAnswerSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewQuestion',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answer: {
    type: String,
    default: ''
  },
  timeTaken: {
    type: Number,
    default: 0 // in seconds
  },
  skipped: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InterviewAnswer', InterviewAnswerSchema);
