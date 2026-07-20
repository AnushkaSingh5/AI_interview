const mongoose = require('mongoose');

const LearningRoadmapSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  weeks: [{
    weekNumber: { type: Number, required: true },
    topic: { type: String, required: true },
    focusArea: { type: String, required: true },
    reason: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }],
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LearningRoadmap', LearningRoadmapSchema);
