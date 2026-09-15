const mongoose = require('mongoose');

const CoverLetterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Cover letter title is required'],
      trim: true
    },
    companyName: {
      type: String,
      default: '',
      trim: true
    },
    jobTitle: {
      type: String,
      default: '',
      trim: true
    },
    jobDescription: {
      type: String,
      default: '',
      trim: true
    },
    hiringManager: {
      type: String,
      default: 'Hiring Manager',
      trim: true
    },
    tone: {
      type: String,
      enum: ['Professional', 'Confident', 'Enthusiastic', 'Technical', 'Creative'],
      default: 'Professional'
    },
    length: {
      type: String,
      enum: ['Short', 'Standard', 'Detailed'],
      default: 'Standard'
    },
    content: {
      type: String,
      required: [true, 'Cover letter content cannot be empty']
    },
    matchScore: {
      type: Number,
      default: 85,
      min: 0,
      max: 100
    },
    matchedKeywords: {
      type: [String],
      default: []
    },
    missingKeywords: {
      type: [String],
      default: []
    },
    keyStrengths: {
      type: [String],
      default: []
    },
    customNotes: {
      type: String,
      default: '',
      trim: true
    },
    isFavorite: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CoverLetter', CoverLetterSchema);
