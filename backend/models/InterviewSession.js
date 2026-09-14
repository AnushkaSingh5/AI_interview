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
    enum: ['Technical', 'HR', 'Mixed', 'ResumeBased', 'Custom', 'FullLoop']
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
    required: true
  },
  questionCount: {
    type: Number,
    required: true,
    min: 1,
    max: 25
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
  currentStage: {
    type: Number,
    default: 1
  },
  stagesSummary: [
    {
      stageNumber: Number,
      stageName: String,
      status: String,
      score: Number
    }
  ],
  interviewMode: {
    type: String,
    required: true,
    enum: ['Text', 'Voice', 'Video', 'Hybrid'],
    default: 'Text'
  },
  status: {
    type: String,
    required: true,
    enum: [
      'Created', 'Generating', 'ReadyToStart', 'Ready', 
      'InstructionsViewed', 'InProgress', 'Submitted', 
      'AwaitingEvaluation', 'ReportGenerated', 'Completed', 'Terminated'
    ],
    default: 'Created'
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  instructionsViewedAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  resumedCount: {
    type: Number,
    default: 0
  },
  resumedTerminatedCount: {
    type: Number,
    default: 0
  },
  overallScore: {
    type: Number,
    default: null
  },
  evaluationReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewEvaluation'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
