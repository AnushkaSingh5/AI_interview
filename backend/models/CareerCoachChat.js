const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    suggestedFollowUps: {
      type: [String],
      default: []
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const CareerCoachChatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      default: 'New Career Conversation',
      trim: true
    },
    category: {
      type: String,
      enum: ['general', 'interview_prep', 'resume_advice', 'roadmap', 'negotiation', 'behavioral'],
      default: 'general'
    },
    messages: {
      type: [ChatMessageSchema],
      default: []
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual for message count
CareerCoachChatSchema.virtual('messageCount').get(function () {
  return this.messages ? this.messages.length : 0;
});

CareerCoachChatSchema.set('toJSON', { virtuals: true });
CareerCoachChatSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CareerCoachChat', CareerCoachChatSchema);
