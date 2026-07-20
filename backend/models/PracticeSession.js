const mongoose = require('mongoose');

const PracticeSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['Technical', 'HR', 'Behavioral', 'Resume', 'Company', 'Daily', 'Revision']
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
    required: true,
    enum: ['Easy', 'Medium', 'Hard']
  },
  questionCount: {
    type: Number,
    required: true,
    default: 5
  },
  answeredCount: {
    type: Number,
    default: 0
  },
  overallScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['InProgress', 'Completed'],
    default: 'InProgress'
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PracticeSession', PracticeSessionSchema);
