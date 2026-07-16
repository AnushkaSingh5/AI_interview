const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    cloudinaryId: {
      type: String
    },
    fileType: {
      type: String,
      required: true
    },
    extractedText: {
      type: String,
      default: ''
    },
    extractedData: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResumeData'
    },
    parserUsed: {
      type: String,
      default: 'Gemini AI'
    },
    parsingStatus: {
      type: String,
      default: 'Success'
    },
    processingTimeSec: {
      type: Number,
      default: 0
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Resume', ResumeSchema);
