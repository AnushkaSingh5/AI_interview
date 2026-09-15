const mongoose = require('mongoose');
const crypto = require('crypto');

const ScheduledInterviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Interview title is required'],
      trim: true
    },
    track: {
      type: String,
      enum: ['text', 'voice', 'video', 'coding', 'system_design', 'company_specific'],
      default: 'text',
      required: true
    },
    interviewType: {
      type: String,
      default: 'Technical'
    },
    companyName: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: 'Software Engineer',
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium'
    },
    topics: {
      type: [String],
      default: []
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date and time is required'],
      index: true
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 15,
      max: 120
    },
    interviewerPersona: {
      type: String,
      default: 'Friendly Mentor'
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    reminderPreferences: {
      fifteenMin: { type: Boolean, default: true },
      oneHour: { type: Boolean, default: true },
      oneDay: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      emailNotification: { type: Boolean, default: true }
    },
    remindersSent: {
      fifteenMinSent: { type: Boolean, default: false },
      oneHourSent: { type: Boolean, default: false },
      oneDaySent: { type: Boolean, default: false }
    },
    associatedSessionId: {
      type: String,
      default: null
    },
    associatedSessionType: {
      type: String,
      default: null
    },
    sessionResult: {
      score: { type: Number, default: null },
      feedback: { type: String, default: null },
      completedAt: { type: Date, default: null }
    },
    calendarUid: {
      type: String,
      default: () => crypto.randomUUID()
    }
  },
  {
    timestamps: true
  }
);

// Virtual for checking if the interview is due or starting now
ScheduledInterviewSchema.virtual('isDue').get(function () {
  const now = new Date();
  return this.scheduledDate <= now && this.status === 'scheduled';
});

// Configure toJSON to include virtuals
ScheduledInterviewSchema.set('toJSON', { virtuals: true });
ScheduledInterviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ScheduledInterview', ScheduledInterviewSchema);
