const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  interviewId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  interviewType: {
    type: String,
    required: true,
    enum: ['Technical', 'HR', 'Mixed', 'ResumeBased', 'Custom']
  },
  role: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: ''
  },
  experienceLevel: {
    type: String,
    required: true,
    enum: ['Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5+ Years']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Easy', 'Medium', 'Hard', 'Adaptive']
  },
  duration: {
    type: Number,
    required: true,
    enum: [10, 20, 30, 45, 60]
  },
  questionCount: {
    type: Number,
    required: true,
    min: 5,
    max: 20
  },
  preferredLanguage: {
    type: String,
    required: true,
    enum: ['English', 'Hindi', 'Mixed']
  },
  focusAreas: {
    type: [String],
    default: []
  },
  selectedTopics: {
    type: [String],
    default: []
  },
  hrTopics: {
    type: [String],
    default: []
  },
  useResume: {
    type: Boolean,
    default: false
  },
  useProjects: {
    type: Boolean,
    default: false
  },
  useExperience: {
    type: Boolean,
    default: false
  },
  questionDistribution: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  interviewMode: {
    type: String,
    required: true,
    enum: ['Text', 'Voice', 'Video'],
    default: 'Text'
  },
  status: {
    type: String,
    required: true,
    enum: [
      'Created', 'Generating', 'ReadyToStart', 'Ready', 
      'InstructionsViewed', 'InProgress', 'Submitted', 
      'AwaitingEvaluation', 'ReportGenerated', 'Completed'
    ],
    default: 'Created'
  },
  currentQuestion: {
    type: Number,
    default: 1
  },
  startedAt: {
    type: Date
  },
  submittedAt: {
    type: Date
  },
  totalQuestions: {
    type: Number
  },
  answeredQuestions: {
    type: Number,
    default: 0
  },
  progress: {
    type: Number,
    default: 0
  },
  timeRemaining: {
    type: Number
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
