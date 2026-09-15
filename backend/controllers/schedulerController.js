const ScheduledInterview = require('../models/ScheduledInterview');
const schedulerService = require('../services/schedulerService');

/**
 * @route   GET /api/scheduler
 * @desc    Get user's scheduled interviews with filtering & stats
 * @access  Private
 */
exports.getScheduledInterviews = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { filter = 'all', track, status } = req.query;
    const now = new Date();

    const query = { user: userId };

    if (track) {
      query.track = track;
    }

    if (status) {
      query.status = status;
    } else if (filter === 'upcoming') {
      query.status = { $in: ['scheduled', 'in_progress'] };
      query.scheduledDate = { $gte: new Date(now.getTime() - 30 * 60 * 1000) }; // Include sessions starting in the last 30 mins
    } else if (filter === 'past') {
      query.$or = [
        { status: { $in: ['completed', 'missed', 'cancelled'] } },
        { scheduledDate: { $lt: new Date(now.getTime() - 30 * 60 * 1000) } }
      ];
    } else if (filter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      query.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const interviews = await ScheduledInterview.find(query).sort({ scheduledDate: filter === 'past' ? -1 : 1 });

    // Calculate aggregated user scheduling statistics
    const allUserInterviews = await ScheduledInterview.find({ user: userId });
    const totalScheduled = allUserInterviews.length;
    const completedCount = allUserInterviews.filter(i => i.status === 'completed').length;
    const cancelledCount = allUserInterviews.filter(i => i.status === 'cancelled').length;
    const missedCount = allUserInterviews.filter(i => i.status === 'missed').length;
    const upcomingCount = allUserInterviews.filter(i => 
      ['scheduled', 'in_progress'].includes(i.status) && new Date(i.scheduledDate) >= new Date(now.getTime() - 30 * 60 * 1000)
    ).length;

    const finishedTotal = completedCount + missedCount;
    const commitmentRate = finishedTotal > 0 ? Math.round((completedCount / finishedTotal) * 100) : 0;

    // Attach Google Calendar URL to each returned item
    const formattedInterviews = interviews.map(item => {
      const obj = item.toObject();
      obj.googleCalendarUrl = schedulerService.generateGoogleCalendarUrl(item);
      return obj;
    });

    return res.status(200).json({
      success: true,
      interviews: formattedInterviews,
      stats: {
        totalScheduled,
        upcomingCount,
        completedCount,
        missedCount,
        cancelledCount,
        commitmentRate
      }
    });
  } catch (error) {
    console.error('[SchedulerController] Error fetching scheduled interviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scheduled interviews',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/scheduler/upcoming
 * @desc    Get active upcoming alerts and countdowns
 * @access  Private
 */
exports.getUpcomingAlerts = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const reminderData = await schedulerService.checkUpcomingReminders(userId);

    return res.status(200).json({
      success: true,
      ...reminderData
    });
  } catch (error) {
    console.error('[SchedulerController] Error getting upcoming alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get upcoming alerts',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/scheduler/:id
 * @desc    Get a single scheduled interview
 * @access  Private
 */
exports.getScheduledInterviewById = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const interview = await ScheduledInterview.findOne({ _id: req.params.id, user: userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled interview not found'
      });
    }

    const obj = interview.toObject();
    obj.googleCalendarUrl = schedulerService.generateGoogleCalendarUrl(interview);

    return res.status(200).json({
      success: true,
      interview: obj
    });
  } catch (error) {
    console.error('[SchedulerController] Error fetching interview by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch interview',
      error: error.message
    });
  }
};

const parseIncomingDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal;
  
  if (typeof dateVal === 'string') {
    const directDate = new Date(dateVal);
    if (!isNaN(directDate.getTime())) return directDate;

    const clean = dateVal.trim();
    const parts = clean.split(/[\sT]+/);
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';

    if (datePart && datePart.includes('-')) {
      const dParts = datePart.split('-');
      let year, month, day;
      if (dParts[0].length === 4) {
        year = parseInt(dParts[0], 10);
        month = parseInt(dParts[1], 10) - 1;
        day = parseInt(dParts[2], 10);
      } else if (dParts[2].length === 4) {
        day = parseInt(dParts[0], 10);
        month = parseInt(dParts[1], 10) - 1;
        year = parseInt(dParts[2], 10);
      }
      
      const tParts = timePart.split(':');
      const hours = parseInt(tParts[0], 10) || 0;
      const mins = parseInt(tParts[1], 10) || 0;
      const parsed = new Date(year, month, day, hours, mins, 0);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
};

/**
 * @route   POST /api/scheduler
 * @desc    Create a new scheduled interview
 * @access  Private
 */
exports.createScheduledInterview = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      title,
      track = 'text',
      interviewType = 'Technical',
      companyName = '',
      role = 'Software Engineer',
      difficulty = 'Medium',
      topics = [],
      scheduledDate,
      durationMinutes = 30,
      interviewerPersona = 'Friendly Mentor',
      notes = '',
      reminderPreferences
    } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date and time is required'
      });
    }

    const dateObj = parseIncomingDate(scheduledDate);
    if (!dateObj || isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduled date format. Please select a valid date and time.'
      });
    }

    // Generate intelligent title if not supplied
    let finalTitle = title;
    if (!finalTitle || !finalTitle.trim()) {
      if (track === 'company_specific' && companyName) {
        finalTitle = `${companyName} Mock Interview (${role})`;
      } else if (track === 'coding') {
        finalTitle = `${role} Live Coding Round`;
      } else if (track === 'system_design') {
        finalTitle = `${role} System Design Architecture`;
      } else if (track === 'voice') {
        finalTitle = `${role} Voice AI Interview`;
      } else if (track === 'video') {
        finalTitle = `${role} Video AI Assessment`;
      } else {
        finalTitle = `${role} ${interviewType} Mock Interview`;
      }
    }

    const newScheduled = new ScheduledInterview({
      user: userId,
      title: finalTitle.trim(),
      track,
      interviewType,
      companyName: companyName ? companyName.trim() : '',
      role: role.trim(),
      difficulty,
      topics: Array.isArray(topics) ? topics : (typeof topics === 'string' ? topics.split(',').map(t => t.trim()).filter(Boolean) : []),
      scheduledDate: dateObj,
      durationMinutes: Number(durationMinutes) || 30,
      interviewerPersona: interviewerPersona.trim(),
      notes: notes.trim(),
      reminderPreferences: reminderPreferences || {
        fifteenMin: true,
        oneHour: true,
        oneDay: true,
        inApp: true,
        emailNotification: true
      }
    });

    await newScheduled.save();

    const result = newScheduled.toObject();
    result.googleCalendarUrl = schedulerService.generateGoogleCalendarUrl(newScheduled);

    return res.status(201).json({
      success: true,
      message: 'Interview successfully scheduled!',
      interview: result
    });
  } catch (error) {
    console.error('[SchedulerController] Error creating scheduled interview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule interview',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/scheduler/:id
 * @desc    Update/Reschedule an interview
 * @access  Private
 */
exports.updateScheduledInterview = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const interview = await ScheduledInterview.findOne({ _id: req.params.id, user: userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled interview not found'
      });
    }

    const {
      title,
      scheduledDate,
      durationMinutes,
      role,
      companyName,
      difficulty,
      topics,
      interviewerPersona,
      notes,
      reminderPreferences,
      status
    } = req.body;

    if (title) interview.title = title.trim();
    if (scheduledDate) {
      const dateObj = parseIncomingDate(scheduledDate);
      if (!dateObj || isNaN(dateObj.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid scheduled date' });
      }
      interview.scheduledDate = dateObj;
      // Reset reminder sent flags on reschedule
      interview.remindersSent = {
        fifteenMinSent: false,
        oneHourSent: false,
        oneDaySent: false
      };
      if (interview.status === 'missed' || interview.status === 'cancelled') {
        interview.status = 'scheduled';
      }
    }

    if (durationMinutes) interview.durationMinutes = Number(durationMinutes);
    if (role) interview.role = role.trim();
    if (companyName !== undefined) interview.companyName = companyName.trim();
    if (difficulty) interview.difficulty = difficulty;
    if (topics) interview.topics = Array.isArray(topics) ? topics : topics.split(',').map(t => t.trim());
    if (interviewerPersona) interview.interviewerPersona = interviewerPersona.trim();
    if (notes !== undefined) interview.notes = notes.trim();
    if (reminderPreferences) interview.reminderPreferences = { ...interview.reminderPreferences, ...reminderPreferences };
    if (status) interview.status = status;

    await interview.save();

    const obj = interview.toObject();
    obj.googleCalendarUrl = schedulerService.generateGoogleCalendarUrl(interview);

    return res.status(200).json({
      success: true,
      message: 'Scheduled interview updated successfully',
      interview: obj
    });
  } catch (error) {
    console.error('[SchedulerController] Error updating scheduled interview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update scheduled interview',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/scheduler/:id
 * @desc    Cancel or delete a scheduled interview
 * @access  Private
 */
exports.deleteScheduledInterview = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { action = 'cancel' } = req.query; // 'cancel' or 'delete'

    const interview = await ScheduledInterview.findOne({ _id: req.params.id, user: userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled interview not found'
      });
    }

    if (action === 'delete') {
      await ScheduledInterview.deleteOne({ _id: req.params.id });
      return res.status(200).json({
        success: true,
        message: 'Scheduled interview permanently deleted'
      });
    } else {
      interview.status = 'cancelled';
      await interview.save();
      return res.status(200).json({
        success: true,
        message: 'Scheduled interview marked as cancelled',
        interview
      });
    }
  } catch (error) {
    console.error('[SchedulerController] Error deleting/cancelling interview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel scheduled interview',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/scheduler/:id/start
 * @desc    Directly launch and provision session for a scheduled interview
 * @access  Private
 */
exports.launchScheduledInterview = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const launchData = await schedulerService.launchScheduledSession(req.params.id, userId);

    return res.status(200).json({
      success: true,
      message: 'Interview session launched successfully',
      ...launchData
    });
  } catch (error) {
    console.error('[SchedulerController] Error launching scheduled interview:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to start scheduled interview',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/scheduler/:id/ics
 * @desc    Generate and download RFC 5545 iCalendar .ics file
 * @access  Private
 */
exports.downloadIcsFile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const interview = await ScheduledInterview.findOne({ _id: req.params.id, user: userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled interview not found'
      });
    }

    const icsContent = schedulerService.generateIcsFile(interview);
    const sanitizedTitle = (interview.title || 'interview').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="interviewace-${sanitizedTitle}.ics"`);

    return res.status(200).send(icsContent);
  } catch (error) {
    console.error('[SchedulerController] Error generating ICS file:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate iCalendar file',
      error: error.message
    });
  }
};
