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
  // Structured Code Answer details
  codeDetails: {
    language: String,
    code: String,
    testCasesPassed: Number,
    totalTestCases: Number,
    executionResults: [mongoose.Schema.Types.Mixed]
  },
  // Structured System Design details
  systemDesignDetails: {
    diagramNodes: [mongoose.Schema.Types.Mixed],
    diagramConnections: [mongoose.Schema.Types.Mixed],
    designDoc: mongoose.Schema.Types.Mixed
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
