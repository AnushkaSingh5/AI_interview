const mongoose = require('mongoose');

const SystemDesignInterviewSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  interviewId: {
    type: String,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  interviewMode: {
    type: String,
    default: 'SystemDesign'
  },
  interviewType: {
    type: String,
    default: 'SystemDesign'
  },
  title: {
    type: String,
    required: true,
    default: 'System Design Technical Interview'
  },
  role: {
    type: String,
    required: true,
    default: 'Senior Software Engineer / System Architect'
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  domain: {
    type: String,
    default: 'Distributed Systems'
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'Terminated in between', 'Terminated'],
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
    default: 35
  },
  durationMinutes: {
    type: Number,
    default: 35
  },
  timeSpentSeconds: {
    type: Number,
    default: 0
  },
  scenario: {
    problemId: { type: String },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    domain: { type: String, default: 'Distributed Systems' },
    description: { type: String, required: true },
    overview: { type: String },
    functionalRequirements: [{ type: String }],
    nonFunctionalRequirements: [{ type: String }],
    scaleEstimates: [{ type: String }],
    scaleEstimations: {
      dailyActiveUsers: String,
      readWriteRatio: String,
      storagePerYear: String,
      bandwidth: String
    },
    keyArchitectureFocus: [{ type: String }],
    starterComponents: [
      {
        id: String,
        type: { type: String },
        label: String,
        subLabel: String,
        category: String,
        x: Number,
        y: Number,
        color: String
      }
    ]
  },
  diagramNodes: [
    {
      id: String,
      type: { type: String },
      label: String,
      subLabel: String,
      category: String,
      x: Number,
      y: Number,
      color: String
    }
  ],
  diagramConnections: [
    {
      id: String,
      from: String,
      to: String,
      protocol: String,
      label: String
    }
  ],
  designDocument: {
    systemOverview: { type: String, default: '' },
    apiEndpoints: { type: String, default: '' },
    dataModels: { type: String, default: '' },
    cachingStrategy: { type: String, default: '' },
    faultTolerance: { type: String, default: '' },
    tradeOffs: { type: String, default: '' }
  },
  submission: {
    architectureDiagram: {
      nodes: [mongoose.Schema.Types.Mixed],
      connections: [mongoose.Schema.Types.Mixed],
      freehandPaths: [mongoose.Schema.Types.Mixed],
      diagramSnapshotUrl: { type: String, default: '' }
    },
    designDoc: {
      overview: { type: String, default: '' },
      apiDesign: { type: String, default: '' },
      dataModel: { type: String, default: '' },
      scalabilityAndCaching: { type: String, default: '' },
      faultToleranceAndTradeoffs: { type: String, default: '' }
    }
  },
  overallScore: {
    type: Number,
    default: null
  },
  aiReview: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

SystemDesignInterviewSchema.pre('save', function (next) {
  if (!this.interviewId && this.sessionId) {
    this.interviewId = this.sessionId;
  }
  if (!this.durationMinutes && this.timeLimitMinutes) {
    this.durationMinutes = this.timeLimitMinutes;
  }
  next();
});

module.exports = mongoose.model('SystemDesignInterview', SystemDesignInterviewSchema);
