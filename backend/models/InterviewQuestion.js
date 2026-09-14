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
  stageNumber: {
    type: Number,
    default: 1
  },
  stageName: {
    type: String,
    default: 'Technical Assessment'
  },
  questionType: {
    type: String,
    required: true,
    enum: ['technical', 'behavioral', 'hr', 'project', 'coding', 'system_design', 'conceptual']
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
  // Dynamic Coding Challenge Details
  codingDetails: {
    problemId: String,
    category: String,
    functionName: String,
    starterTemplates: {
      c: String,
      cpp: String,
      java: String,
      python: String,
      javascript: String
    },
    sampleTestCases: [
      {
        input: String,
        expectedOutput: String,
        explanation: String
      }
    ],
    hiddenTestCases: [
      {
        input: String,
        expectedOutput: String
      }
    ],
    constraints: [String],
    selectedLanguage: { type: String, default: 'javascript' },
    userCode: { type: String, default: '' },
    executionResults: [mongoose.Schema.Types.Mixed]
  },
  // Dynamic System Design Challenge Details
  systemDesignDetails: {
    problemId: String,
    domain: String,
    overview: String,
    functionalRequirements: [String],
    nonFunctionalRequirements: [String],
    scaleEstimates: [String],
    starterComponents: [mongoose.Schema.Types.Mixed],
    diagramNodes: [mongoose.Schema.Types.Mixed],
    diagramConnections: [mongoose.Schema.Types.Mixed],
    designDoc: {
      systemOverview: String,
      apiEndpoints: String,
      dataModels: String,
      cachingStrategy: String,
      faultTolerance: String,
      tradeOffs: String
    }
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
