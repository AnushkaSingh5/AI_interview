const mongoose = require('mongoose');

const PracticeBookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    default: 'General'
  },
  idealAnswer: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PracticeBookmark', PracticeBookmarkSchema);
