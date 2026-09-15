const mongoose = require('mongoose');

const FormattingCheckSchema = new mongoose.Schema({
  item: { type: String, required: true },
  status: { type: String, enum: ['Pass', 'Warning', 'Fail'], default: 'Pass' },
  tip: { type: String, default: '' }
}, { _id: false });

const MissingKeywordSchema = new mongoose.Schema({
  keyword: { type: String, required: true },
  category: { type: String, default: 'General' }, // 'Languages', 'Frameworks', 'Cloud & DevOps', 'Databases', 'Architecture & Tools'
  importance: { type: String, enum: ['Critical', 'High', 'Medium', 'Nice-to-have'], default: 'High' },
  recommendation: { type: String, default: '' }
}, { _id: false });

const WordingSuggestionSchema = new mongoose.Schema({
  originalText: { type: String, required: true },
  suggestedText: { type: String, required: true },
  category: { type: String, default: 'Action Verb & Impact' }, // 'Impact / Metrics', 'Action Verb', 'Brevity / Clarity'
  reason: { type: String, default: '' }
}, { _id: false });

const ProjectEnhancementSchema = new mongoose.Schema({
  originalTitle: { type: String, required: true },
  originalDescription: { type: String, default: '' },
  enhancedTitle: { type: String, default: '' },
  enhancedBullets: { type: [String], default: [] },
  missingTechnicalDepth: { type: [String], default: [] },
  recommendedTech: { type: [String], default: [] },
  metricsToHighlight: { type: [String], default: [] }
}, { _id: false });

const ResumeReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    },
    targetRole: {
      type: String,
      default: 'Software Engineer'
    },
    targetCompany: {
      type: String,
      default: 'General Tech'
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    atsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    wordingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    skillsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    projectScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    readabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 80
    },
    executiveSummary: {
      type: String,
      default: ''
    },
    hiringVerdict: {
      type: String,
      default: 'Good Foundation - Needs Targeted Polish'
    },
    topQuickWins: {
      type: [String],
      default: []
    },
    atsAnalysis: {
      compatibilityLevel: { type: String, enum: ['High', 'Moderate', 'Needs Work'], default: 'Moderate' },
      readabilityGrade: { type: String, default: 'College Level' },
      formattingChecks: { type: [FormattingCheckSchema], default: [] },
      criticalFixes: { type: [String], default: [] }
    },
    keywordsAnalysis: {
      matchPercentage: { type: Number, default: 70 },
      presentKeywords: { type: [String], default: [] },
      missingKeywords: { type: [MissingKeywordSchema], default: [] }
    },
    wordingSuggestions: {
      type: [WordingSuggestionSchema],
      default: []
    },
    projectEnhancements: {
      type: [ProjectEnhancementSchema],
      default: []
    },
    analysisEngine: {
      type: String,
      default: 'Gemini AI'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ResumeReview', ResumeReviewSchema);
