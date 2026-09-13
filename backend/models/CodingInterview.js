const mongoose = require('mongoose');

const CodingInterviewSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'Coding Technical Interview'
  },
  role: {
    type: String,
    required: true,
    default: 'Software Engineer'
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  topic: {
    type: String,
    default: 'Algorithms & Data Structures'
  },
  topics: [{
    type: String
  }],
  selectedLanguage: {
    type: String,
    default: 'javascript'
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'Terminated in between'],
    default: 'In Progress'
  },
  resumedCount: {
    type: Number,
    default: 0
  },
  resumedTerminatedCount: {
    type: Number,
    default: 0
  },
  timeLimitMinutes: {
    type: Number,
    default: 45
  },
  timeSpentSeconds: {
    type: Number,
    default: 0
  },
  problems: [{
    problemId: { type: String, required: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    category: { type: String, default: 'Algorithms' },
    description: { type: String, required: true },
    constraints: [{ type: String }],
    examples: [{
      input: { type: String, required: true },
      output: { type: String, required: true },
      explanation: { type: String, default: '' }
    }],
    starterCode: {
      c: { type: String, default: '' },
      cpp: { type: String, default: '' },
      java: { type: String, default: '' },
      python: { type: String, default: '' },
      javascript: { type: String, default: '' }
    },
    testCases: [{
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true },
      isHidden: { type: Boolean, default: false },
      explanation: { type: String, default: '' }
    }],
    userCode: { type: String, default: '' },
    selectedLanguage: { type: String, default: 'javascript' },
    executionResults: [{
      testCaseIndex: { type: Number },
      input: { type: String },
      expectedOutput: { type: String },
      actualOutput: { type: String },
      passed: { type: Boolean, default: false },
      executionTimeMs: { type: Number, default: 0 },
      stdout: { type: String, default: '' },
      error: { type: String, default: '' }
    }],
    testCasesPassed: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    aiReview: {
      overallScore: { type: Number, default: 0 },
      correctnessScore: { type: Number, default: 0 },
      codeQualityScore: { type: Number, default: 0 },
      efficiencyScore: { type: Number, default: 0 },
      timeComplexity: { type: String, default: 'O(N)' },
      spaceComplexity: { type: String, default: 'O(1)' },
      timeComplexityOptimal: { type: String, default: 'O(N)' },
      spaceComplexityOptimal: { type: String, default: 'O(1)' },
      codeElegance: { type: String, default: 'Good structure and readability.' },
      cleanCodePractices: [{ type: String }],
      edgeCasesHandled: [{ type: String }],
      missedEdgeCases: [{ type: String }],
      strengths: [{ type: String }],
      areasForImprovement: [{ type: String }],
      suggestedOptimizations: { type: String, default: '' },
      optimalSolutionCode: { type: String, default: '' },
      interviewerVerdict: {
        type: String,
        enum: ['Strong Hire', 'Hire', 'Leaning Hire', 'Leaning No Hire', 'No Hire'],
        default: 'Hire'
      },
      detailedFeedback: { type: String, default: '' }
    }
  }],
  overallScore: {
    type: Number,
    default: null
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CodingInterview', CodingInterviewSchema);
