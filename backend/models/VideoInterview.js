const mongoose = require('mongoose');

const VideoInterviewSchema = new mongoose.Schema({
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
    required: true
  },
  role: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  videoUrl: {
    type: String,
    default: ''
  },
  transcript: [{
    questionNumber: { type: Number, required: true },
    topic: { type: String, default: 'General' },
    questionText: { type: String, required: true },
    transcriptText: { type: String, default: '' },
    score: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    startTime: { type: Number },
    endTime: { type: Number },
    answer: {
      transcript: { type: String, default: '' },
      transcriptConfidence: { type: Number, default: 90 },
      answerScore: { type: Number, default: 0 },
      technicalAccuracy: { type: Number, default: 0 },
      completeness: { type: Number, default: 0 },
      relevance: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      expectedConcepts: [{ type: String }],
      missingConcepts: [{ type: String }],
      strengths: [{ type: String }],
      weaknesses: [{ type: String }]
    },
    video: {
      facePresencePercentage: { type: Number, default: 0 },
      cameraAlignmentPercentage: { type: Number, default: 0 },
      eyeContactPercentage: { type: Number, default: 0 },
      expressionDistribution: {
        neutral: { type: Number, default: 0 },
        smile: { type: Number, default: 0 },
        frown: { type: Number, default: 0 },
        surprise: { type: Number, default: 0 }
      },
      headPoseDistribution: {
        neutral: { type: Number, default: 80 },
        active: { type: Number, default: 20 }
      },
      fillerWordCount: { type: Number, default: 0 },
      speakingRate: { type: Number, default: 120 },
      videoDeliveryScore: { type: Number, default: 0 }
    },
    proctoring: {
      events: [{
        timestamp: { type: String },
        eventType: { type: String },
        description: { type: String },
        durationMs: { type: Number }
      }],
      proctoringScore: { type: Number, default: 100 }
    },
    finalQuestionScore: { type: Number, default: 0 }
  }],
  eyeContactScore: {
    type: Number,
    default: 0
  },
  facialConfidence: {
    type: Number,
    default: 0
  },
  confidenceScore: {
    type: Number,
    default: 0
  },
  communicationScore: {
    type: Number,
    default: 0
  },
  fillerWords: {
    type: Number,
    default: 0
  },
  speakingSpeed: {
    type: Number,
    default: 0
  },
  emotions: {
    happy: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    surprised: { type: Number, default: 0 },
    nervous: { type: Number, default: 0 }
  },
  bodyLanguage: {
    posture: { type: String, default: 'Good' },
    headMovement: { type: String, default: 'Normal' },
    smileFrequency: { type: String, default: 'Normal' }
  },
  timeline: [{
    timestamp: { type: String, required: true },
    eventType: { type: String, required: true }, // 'look-away', 'pause', 'filler', 'emotion', 'posture'
    description: { type: String, required: true }
  }],
  videoMetrics: {
    analyzedFrames: { type: Number, default: 0 },
    facePresencePercentage: { type: Number, default: 0 },
    eyeContactPercentage: { type: Number, default: 0 },
    lookingAwayPercentage: { type: Number, default: 0 },
    centerFacingPercentage: { type: Number, default: 0 },
    averageYaw: { type: Number, default: 0 },
    averagePitch: { type: Number, default: 0 },
    averageRoll: { type: Number, default: 0 },
    expressionDistribution: {
      neutral: { type: Number, default: 0 },
      smile: { type: Number, default: 0 },
      frown: { type: Number, default: 0 },
      surprise: { type: Number, default: 0 }
    },
    noFaceEvents: { type: Number, default: 0 },
    multipleFaceEvents: { type: Number, default: 0 },
    lookingAwayEvents: { type: Number, default: 0 },
    tabVisibilityChanges: { type: Number, default: 0 },
    windowBlurEvents: { type: Number, default: 0 },
    proctoringEvents: [{
      type: { type: String, required: true },
      startedAt: { type: Date, required: true },
      durationMs: { type: Number, required: true }
    }]
  },
  report: {
    overallFeedback: { type: String, default: '' },
    strengths: [{ type: String }],
    focusGaps: [{ type: String }],
    recommendations: [{ type: String }],
    learningRoadmap: [{
      priority: { type: String },
      title: { type: String },
      description: { type: String }
    }]
  },
  overallAnswerQualityScore: {
    type: Number,
    default: 0
  },
  videoDeliveryScore: {
    type: Number,
    default: 0
  },
  proctoringScore: {
    type: Number,
    default: 0
  },
  overallScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['InProgress', 'Completed'],
    default: 'InProgress'
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VideoInterview', VideoInterviewSchema);
