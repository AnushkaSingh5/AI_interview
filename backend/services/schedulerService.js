const ScheduledInterview = require('../models/ScheduledInterview');
const CodingInterview = require('../models/CodingInterview');
const SystemDesignInterview = require('../models/SystemDesignInterview');
const InterviewSession = require('../models/InterviewSession');
const { getProblemForInterview } = require('./codingProblemService');
const { getScenarioForInterview } = require('./systemDesignScenarioService');

// Helper to format Date into iCal UTC format (YYYYMMDDTHHmmssZ)
const formatIcsDate = (date) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

// Helper to check if two dates fall on the same calendar day (local or UTC)
const isSameDay = (d1, d2) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Generates an RFC 5545 compliant .ics iCalendar file content
 */
const generateIcsFile = (interview) => {
  const startDate = new Date(interview.scheduledDate);
  const durationMs = (interview.durationMinutes || 30) * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(startDate);
  const dtEnd = formatIcsDate(endDate);

  const cleanDescription = `InterviewAce AI Mock Interview Session\\n` +
    `Track: ${interview.track.toUpperCase()}\\n` +
    `Role: ${interview.role}\\n` +
    `Difficulty: ${interview.difficulty}\\n` +
    `${interview.companyName ? `Target Company: ${interview.companyName}\\n` : ''}` +
    `Interviewer Persona: ${interview.interviewerPersona || 'Mentor'}\\n` +
    `${interview.topics && interview.topics.length ? `Topics: ${interview.topics.join(', ')}\\n` : ''}` +
    `${interview.notes ? `Preparation Notes: ${interview.notes.replace(/\n/g, '\\n')}\\n` : ''}` +
    `\\nLaunch Simulator: http://localhost:5173/scheduler`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InterviewAce AI//Interview Scheduler v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${interview.calendarUid || interview._id}@interviewace.ai`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:InterviewAce: ${interview.title} (${interview.track.toUpperCase()})`,
    `DESCRIPTION:${cleanDescription}`,
    'LOCATION:InterviewAce AI Simulator (https://interviewace.ai)',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: Your ${interview.title} mock interview starts in 15 minutes!`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: Upcoming ${interview.title} in 1 hour.`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return icsLines.join('\r\n');
};

/**
 * Generates a direct Google Calendar Web Link with pre-filled event parameters
 */
const generateGoogleCalendarUrl = (interview) => {
  const startDate = new Date(interview.scheduledDate);
  const durationMs = (interview.durationMinutes || 30) * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  const startStr = formatIcsDate(startDate);
  const endStr = formatIcsDate(endDate);

  const title = `InterviewAce: ${interview.title} (${interview.track.toUpperCase()})`;
  const details = `InterviewAce AI Mock Interview Session\n` +
    `Track: ${interview.track.toUpperCase()}\n` +
    `Role: ${interview.role}\n` +
    `Difficulty: ${interview.difficulty}\n` +
    `${interview.companyName ? `Target Company: ${interview.companyName}\n` : ''}` +
    `Interviewer Persona: ${interview.interviewerPersona || 'Mentor'}\n` +
    `${interview.topics && interview.topics.length ? `Topics: ${interview.topics.join(', ')}\n` : ''}` +
    `${interview.notes ? `Preparation Notes: ${interview.notes}\n` : ''}\n` +
    `Launch Simulator: http://localhost:5173/scheduler`;

  const location = 'InterviewAce AI Simulator (https://interviewace.ai)';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
    details: details,
    location: location
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Checks for upcoming reminders for a user and categorizes them
 */
const checkUpcomingReminders = async (userId) => {
  const now = new Date();
  
  // Look for scheduled interviews within the past 1 hour up to next 7 days
  const scheduledInterviews = await ScheduledInterview.find({
    user: userId,
    status: { $in: ['scheduled', 'in_progress'] }
  }).sort({ scheduledDate: 1 });

  const alerts = [];
  const todaySessions = [];

  for (const interview of scheduledInterviews) {
    const interviewDate = new Date(interview.scheduledDate);
    const diffMs = interviewDate.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (60 * 1000));

    // Check if it's today
    if (isSameDay(interviewDate, now)) {
      todaySessions.push(interview);
    }

    // Categorize urgency
    if (diffMinutes <= 0 && diffMinutes >= -60) {
      alerts.push({
        id: interview._id,
        interviewId: interview._id,
        level: 'urgent',
        type: 'starting_now',
        title: interview.title,
        track: interview.track,
        role: interview.role,
        diffMinutes,
        message: `Your "${interview.title}" is ready to start now!`,
        scheduledDate: interview.scheduledDate,
        interview
      });
    } else if (diffMinutes > 0 && diffMinutes <= 15) {
      alerts.push({
        id: interview._id,
        interviewId: interview._id,
        level: 'warning',
        type: 'starts_in_15m',
        title: interview.title,
        track: interview.track,
        role: interview.role,
        diffMinutes,
        message: `Starts in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} (${interview.title})`,
        scheduledDate: interview.scheduledDate,
        interview
      });
    } else if (diffMinutes > 15 && diffMinutes <= 60) {
      alerts.push({
        id: interview._id,
        interviewId: interview._id,
        level: 'info',
        type: 'starts_in_1h',
        title: interview.title,
        track: interview.track,
        role: interview.role,
        diffMinutes,
        message: `Upcoming interview in ${diffMinutes} minutes: ${interview.title}`,
        scheduledDate: interview.scheduledDate,
        interview
      });
    } else if (isSameDay(interviewDate, now) && diffMinutes > 60) {
      alerts.push({
        id: interview._id,
        interviewId: interview._id,
        level: 'today',
        type: 'scheduled_today',
        title: interview.title,
        track: interview.track,
        role: interview.role,
        diffMinutes,
        message: `Interview scheduled today at ${interviewDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        scheduledDate: interview.scheduledDate,
        interview
      });
    }
  }

  // Find next immediate session
  const nextInterview = scheduledInterviews.find(i => new Date(i.scheduledDate) >= new Date(now.getTime() - 15 * 60 * 1000));

  return {
    alerts,
    todayCount: todaySessions.length,
    nextInterview: nextInterview || null,
    totalUpcoming: scheduledInterviews.length
  };
};

/**
 * Initializes and provisions the live session for a scheduled interview
 */
const launchScheduledSession = async (interviewId, userId) => {
  const interview = await ScheduledInterview.findOne({ _id: interviewId, user: userId });
  if (!interview) {
    throw new Error('Scheduled interview not found');
  }

  // Update status to in_progress
  interview.status = 'in_progress';

  let launchUrl = '/mock-interviews';
  let createdSessionId = null;

  switch (interview.track) {
    case 'coding': {
      // Create a coding interview session
      const sessionId = `code-session-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const topicStr = (interview.topics && interview.topics.length) ? interview.topics.join(', ') : 'Algorithms & Data Structures';
      
      const problem = await getProblemForInterview({
        difficulty: interview.difficulty || 'Medium',
        topic: topicStr,
        topics: interview.topics || [],
        role: interview.role || 'Software Engineer'
      });

      const newCodingInterview = new CodingInterview({
        sessionId,
        user: userId,
        title: interview.title || `${interview.role} - Coding Round`,
        role: interview.role || 'Software Engineer',
        difficulty: interview.difficulty || 'Medium',
        topic: topicStr,
        problem: {
          id: problem.id || 'p-1',
          title: problem.title || 'Two Sum',
          difficulty: problem.difficulty || interview.difficulty || 'Medium',
          description: problem.description || 'Solve the problem efficiently.',
          examples: problem.examples || [],
          constraints: problem.constraints || [],
          starterCode: problem.starterCode || {},
          testCases: problem.testCases || []
        },
        timeLimitMinutes: interview.durationMinutes || 45,
        status: 'In Progress'
      });

      await newCodingInterview.save();
      createdSessionId = sessionId;
      interview.associatedSessionId = sessionId;
      interview.associatedSessionType = 'CodingInterview';
      launchUrl = `/coding-interview/session/${sessionId}`;
      break;
    }

    case 'system_design': {
      // Create a system design session
      const sessionId = `sys-session-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const scenario = await getScenarioForInterview({
        difficulty: interview.difficulty || 'Medium',
        domain: (interview.topics && interview.topics[0]) || 'Distributed Systems',
        role: interview.role || 'Senior Software Engineer / System Architect'
      });

      const newSysInterview = new SystemDesignInterview({
        sessionId,
        user: userId,
        title: interview.title || `${interview.role} - System Design Round`,
        role: interview.role || 'Senior Software Engineer',
        difficulty: interview.difficulty || 'Medium',
        domain: (interview.topics && interview.topics[0]) || 'Distributed Systems',
        scenario: {
          id: scenario.id || 'sys-1',
          title: scenario.title || 'Design Rate Limiter',
          difficulty: scenario.difficulty || interview.difficulty || 'Medium',
          description: scenario.description || 'Design a scalable rate limiter.',
          functionalRequirements: scenario.functionalRequirements || [],
          nonFunctionalRequirements: scenario.nonFunctionalRequirements || [],
          trafficEstimates: scenario.trafficEstimates || {},
          keyComponents: scenario.keyComponents || [],
          tradeoffsToConsider: scenario.tradeoffsToConsider || []
        },
        timeLimitMinutes: interview.durationMinutes || 45,
        status: 'In Progress'
      });

      await newSysInterview.save();
      createdSessionId = sessionId;
      interview.associatedSessionId = sessionId;
      interview.associatedSessionType = 'SystemDesignInterview';
      launchUrl = `/system-design/session/${sessionId}`;
      break;
    }

    case 'voice': {
      // Redirect to voice setup/session
      launchUrl = `/voice-interview/check?role=${encodeURIComponent(interview.role)}&difficulty=${encodeURIComponent(interview.difficulty)}&company=${encodeURIComponent(interview.companyName || '')}`;
      break;
    }

    case 'video': {
      // Redirect to video setup/session
      launchUrl = `/video-interview/check?role=${encodeURIComponent(interview.role)}&difficulty=${encodeURIComponent(interview.difficulty)}&company=${encodeURIComponent(interview.companyName || '')}`;
      break;
    }

    case 'company_specific':
    case 'text':
    default: {
      // Create interactive interview session
      const session = new InterviewSession({
        userId: userId,
        role: interview.role || 'Software Engineer',
        company: interview.companyName || '',
        experienceLevel: '1-3 Years',
        difficulty: interview.difficulty || 'Medium',
        duration: interview.durationMinutes || 30,
        questionCount: 8,
        preferredLanguage: 'English',
        focusAreas: interview.topics || [],
        interviewType: interview.track === 'company_specific' ? 'CompanySpecific' : (interview.interviewType || 'Technical'),
        status: 'InProgress'
      });

      await session.save();
      createdSessionId = session._id.toString();
      interview.associatedSessionId = createdSessionId;
      interview.associatedSessionType = 'InterviewSession';
      launchUrl = `/interview/${session._id}/active`;
      break;
    }
  }

  await interview.save();

  return {
    success: true,
    launchUrl,
    sessionId: createdSessionId,
    track: interview.track,
    interview
  };
};

module.exports = {
  generateIcsFile,
  generateGoogleCalendarUrl,
  checkUpcomingReminders,
  launchScheduledSession,
  formatIcsDate,
  isSameDay
};
