const mongoose = require('mongoose');

const QuestionEvaluationSchema = new mongoose.Schema({
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
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewAnswer',
    required: true
  },
  score: {
    type: Number,
    required: true
  }, // 0 to 10
  accuracy: {
    type: Number,
    required: true
  },
  completeness: {
    type: Number,
    required: true
  },
  technicalDepth: {
    type: Number,
    required: true
  },
  communication: {
    type: Number,
    required: true
  },
  confidence: {
    type: Number,
    required: true
  },
  feedback: {
    type: String,
    required: true
  },
  expectedAnswer: {
    type: String,
    default: ''
  },
  missingPoints: {
    type: [String],
    default: []
  },
  improvementSuggestions: {
    type: [String],
    default: []
  },
  idealAnswer: {
    type: String,
    default: ''
  },
  evaluationEngine: {
    type: String,
    enum: ['Gemini', 'Local'],
    default: 'Gemini'
  },
  evaluatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuestionEvaluation', QuestionEvaluationSchema);
