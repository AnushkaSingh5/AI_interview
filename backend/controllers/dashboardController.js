const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const InterviewEvaluation = require('../models/InterviewEvaluation');
const InterviewAnswer = require('../models/InterviewAnswer');
const QuestionEvaluation = require('../models/QuestionEvaluation');
const CodingInterview = require('../models/CodingInterview');

// Helper to calculate streaks dynamically
const calculateStreak = async (userId) => {
  try {
    const VoiceInterview = require('../models/VoiceInterview');
    const VideoInterview = require('../models/VideoInterview');

    const completedSessions = await InterviewSession.find({
      user: userId,
      status: 'Completed'
    }).select('completedAt updatedAt createdAt');

    const completedVideo = await VideoInterview.find({
      user: userId,
      status: 'Completed'
    }).select('completedAt updatedAt createdAt');

    const completedVoice = await VoiceInterview.find({
      user: userId,
      status: 'Completed'
    }).select('completedAt updatedAt createdAt');

    const completedCoding = await CodingInterview.find({
      user: userId,
      status: 'Completed'
    }).select('completedAt updatedAt createdAt');

    const allSessions = [...completedSessions, ...completedVideo, ...completedVoice, ...completedCoding];

    const validDates = allSessions
      .map(s => s.completedAt || s.updatedAt || s.createdAt)
      .filter(d => d && !isNaN(new Date(d).getTime()))
      .map(d => new Date(d).toISOString().split('T')[0]);

    const dates = [...new Set(validDates)].sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    let longestStreak = 0;

    if (dates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (dates[0] === today || dates[0] === yesterday) {
        currentStreak = 1;
        let lastDate = new Date(dates[0]);
        for (let i = 1; i < dates.length; i++) {
          const currentDate = new Date(dates[i]);
          const diffTime = Math.abs(lastDate - currentDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
            lastDate = currentDate;
          } else if (diffDays > 1) {
            break;
          }
        }
      }

      let tempStreak = 1;
      let lastDate = new Date(dates[0]);
      longestStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i]);
        const diffTime = Math.abs(lastDate - currentDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
          lastDate = currentDate;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
          lastDate = currentDate;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    return { currentStreak, longestStreak };
  } catch (err) {
    console.error('Streak calculation error:', err);
    return { currentStreak: 0, longestStreak: 0 };
  }
};

// @desc    Get dashboard statistics summary
// @route   GET /api/dashboard/summary
// @access  Private
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const stats = await InterviewEvaluation.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$overallScore" },
          maxScore: { $max: "$overallScore" },
          minScore: { $min: "$overallScore" },
          avgTech: { $avg: "$technicalScore" },
          avgHR: { $avg: "$hrScore" },
          avgComm: { $avg: "$communicationScore" },
          avgConf: { $avg: "$confidenceScore" },
          count: { $sum: 1 }
        }
      }
    ]);

    const completedCoding = await CodingInterview.find({
      user: userId,
      status: 'Completed'
    });

    const codingScores = completedCoding
      .map(c => c.overallScore)
      .filter(s => s !== null && s !== undefined && !isNaN(s));

    const totalAnswersCount = await InterviewAnswer.countDocuments({ user: userId });
    const practiceStats = await InterviewAnswer.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalTimeTaken: { $sum: "$timeTaken" }
        }
      }
    ]);

    const totalSeconds = practiceStats[0]?.totalTimeTaken || 0;
    const hoursPracticed = parseFloat((totalSeconds / 3600).toFixed(1));

    const { currentStreak, longestStreak } = await calculateStreak(userId);

    const s = stats[0] || {};
    const evalCount = s.count || 0;
    const codingCount = codingScores.length;
    const totalCompleted = evalCount + codingCount;

    let overallAverage = 0;
    if (totalCompleted > 0) {
      const evalTotal = (s.avgScore || 0) * evalCount;
      const codingTotal = codingScores.reduce((acc, v) => acc + v, 0);
      overallAverage = Math.round((evalTotal + codingTotal) / totalCompleted);
    }

    const allScores = [
      ...(s.maxScore !== undefined && evalCount > 0 ? [s.maxScore] : []),
      ...codingScores
    ];
    const highestScore = allScores.length > 0 ? Math.max(...allScores) : (s.maxScore || 0);
    const lowestScore = allScores.length > 0 ? Math.min(...allScores) : (s.minScore || 0);

    res.status(200).json({
      success: true,
      summary: {
        overallAverageScore: overallAverage,
        highestScore: highestScore,
        lowestScore: lowestScore,
        interviewsCompleted: totalCompleted,
        questionsAnswered: totalAnswersCount,
        hoursPracticed: hoursPracticed,
        currentStreak,
        longestStreak,
        avgTechnicalScore: Math.round(s.avgTech || 0),
        avgHRScore: Math.round(s.avgHR || 0),
        avgCommunicationScore: Math.round(s.avgComm || 0),
        avgConfidenceScore: Math.round(s.avgConf || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get paginated, searchable interview history
// @route   GET /api/dashboard/history
// @access  Private
exports.getInterviewHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { search, role, company, difficulty, interviewType, status, minScore, maxScore, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    const query = { user: userId };
    const codingQuery = { user: userId };

    const shouldIncludeCoding = !interviewType || interviewType === 'Coding' || interviewType === 'All';
    const shouldIncludeRegular = !interviewType || interviewType !== 'Coding';

    if (search) {
      query.$or = [
        { role: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
      codingQuery.$or = [
        { role: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = { $regex: role, $options: 'i' };
      codingQuery.role = { $regex: role, $options: 'i' };
    }
    if (company) query.company = { $regex: company, $options: 'i' };
    if (difficulty) {
      query.difficulty = difficulty;
      codingQuery.difficulty = difficulty;
    }
    if (interviewType && interviewType !== 'Coding' && interviewType !== 'All') {
      query.interviewType = interviewType;
    }
    if (status) {
      query.status = status;
      if (status === 'Completed') {
        codingQuery.status = 'Completed';
      } else if (status === 'Terminated') {
        codingQuery.status = { $in: ['Terminated in between', 'In Progress'] };
      } else if (status === 'AwaitingEvaluation') {
        codingQuery.status = 'None_Match';
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      codingQuery.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
        codingQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
        codingQuery.createdAt.$lte = new Date(endDate);
      }
    }

    if (minScore || maxScore) {
      const scoreQuery = { user: userId };
      scoreQuery.overallScore = {};
      if (minScore) scoreQuery.overallScore.$gte = Number(minScore);
      if (maxScore) scoreQuery.overallScore.$lte = Number(maxScore);

      const matchingEvals = await InterviewEvaluation.find(scoreQuery).select('sessionId');
      const sessionIds = matchingEvals.map(e => e.sessionId);
      query._id = { $in: sessionIds };

      codingQuery.overallScore = {};
      if (minScore) codingQuery.overallScore.$gte = Number(minScore);
      if (maxScore) codingQuery.overallScore.$lte = Number(maxScore);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const VoiceInterview = require('../models/VoiceInterview');
    const VideoInterview = require('../models/VideoInterview');

    let mappedSessions = [];
    if (shouldIncludeRegular) {
      const sessions = await InterviewSession.find(query);
      const sessionIds = sessions.map(s => s._id);
      const evaluations = await InterviewEvaluation.find({ sessionId: { $in: sessionIds } });
      const voiceInterviews = await VoiceInterview.find({ user: userId });
      const videoInterviews = await VideoInterview.find({ user: userId });

      mappedSessions = sessions.map(s => {
        const matchedEval = evaluations.find(e => e.sessionId.toString() === s._id.toString());
        const matchedVoice = voiceInterviews.find(v => v.sessionId === s.interviewId || (v._id && v._id.toString() === s._id.toString()));
        const matchedVideo = videoInterviews.find(v => v.sessionId === s.interviewId || (v._id && v._id.toString() === s._id.toString()));

        const isCompleted = s.status === 'Completed' || 
                            (matchedVoice && matchedVoice.status === 'Completed') || 
                            (matchedVideo && matchedVideo.status === 'Completed');
        const isEvaluating = ['Submitted', 'AwaitingEvaluation', 'Evaluating', 'ReportGenerated'].includes(s.status);

        const score = matchedEval ? matchedEval.overallScore : 
                      (matchedVoice ? matchedVoice.overallScore : 
                      (matchedVideo ? matchedVideo.overallScore : (s.overallScore || 0)));

        const finalStatus = isCompleted ? 'Completed' : (isEvaluating ? 'Evaluating' : 'Terminated');

        const resumeCount = Math.max(
          s.resumedTerminatedCount || 0,
          matchedVoice ? (matchedVoice.resumedTerminatedCount || 0) : 0,
          matchedVideo ? (matchedVideo.resumedTerminatedCount || 0) : 0
        );
        const canResume = !isCompleted && !isEvaluating && resumeCount < 1;

        return {
          _id: s._id,
          interviewId: s.interviewId,
          title: s.title,
          role: s.role,
          company: s.company || 'N/A',
          difficulty: s.difficulty,
          interviewType: s.interviewType,
          interviewMode: s.interviewMode || 'Text',
          questionCount: s.questionCount,
          status: finalStatus,
          completedAt: s.completedAt || (matchedVoice ? matchedVoice.completedAt : null) || (matchedVideo ? matchedVideo.completedAt : null) || s.submittedAt || s.updatedAt || s.createdAt,
          createdAt: s.createdAt,
          overallScore: isCompleted ? (score !== null && score !== undefined ? score : 0) : 0,
          resumedTerminatedCount: resumeCount,
          canResume: canResume
        };
      });
    }

    let mappedCoding = [];
    if (shouldIncludeCoding) {
      const codingSessions = await CodingInterview.find(codingQuery);
      mappedCoding = codingSessions.map(c => {
        const isCompleted = c.status === 'Completed';
        const resumeCount = c.resumedTerminatedCount || c.resumedCount || 0;
        const canResume = !isCompleted && resumeCount < 1;
        const finalStatus = isCompleted ? 'Completed' : 'Terminated';
        const score = isCompleted ? (c.overallScore !== null && c.overallScore !== undefined ? c.overallScore : 0) : 0;

        return {
          _id: c._id,
          interviewId: c.sessionId,
          title: c.title || `${c.role} - ${c.topic || 'Algorithms'} Coding Round`,
          role: c.role || 'Software Engineer',
          company: 'Coding Round',
          difficulty: c.difficulty || 'Medium',
          interviewType: 'Coding',
          interviewMode: 'Coding',
          questionCount: (c.problems || []).length || 1,
          status: finalStatus,
          completedAt: c.completedAt || c.updatedAt || c.createdAt,
          createdAt: c.createdAt,
          overallScore: score,
          resumedTerminatedCount: resumeCount,
          canResume: canResume
        };
      });
    }

    // Combine and apply status filtering if needed
    let combined = [...mappedSessions, ...mappedCoding];
    if (status) {
      combined = combined.filter(item => item.status === status);
    }

    // Sort
    combined.sort((a, b) => {
      const timeA = new Date(a[sortBy] || a.completedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b[sortBy] || b.completedAt || b.createdAt || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const total = combined.length;
    const paginatedHistory = combined.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      history: paginatedHistory
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get score trends, monthly completed counts, and types distribution
// @route   GET /api/dashboard/analytics
// @access  Private
exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const trends = await InterviewEvaluation.aggregate([
      { $match: { user: userId } },
      { $sort: { createdAt: 1 } },
      {
        $project: {
          _id: 0,
          overallScore: 1,
          createdAt: 1
        }
      }
    ]);

    const avgScores = await InterviewEvaluation.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          technical: { $avg: "$technicalScore" },
          hr: { $avg: "$hrScore" },
          communication: { $avg: "$communicationScore" },
          confidence: { $avg: "$confidenceScore" }
        }
      }
    ]);

    const completedCoding = await CodingInterview.find({
      user: userId,
      status: 'Completed'
    });

    const codingTrends = completedCoding.map(c => ({
      overallScore: c.overallScore || 0,
      createdAt: c.createdAt
    }));
    const combinedTrends = [...trends, ...codingTrends].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const typeDist = typeDistribution.map(t => ({ name: t._id, value: t.count }));
    if (completedCoding.length > 0) {
      typeDist.push({ name: 'Coding', value: completedCoding.length });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyCounts = await InterviewSession.aggregate([
      { 
        $match: { 
          user: userId, 
          status: 'Completed',
          completedAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: "$completedAt" },
            month: { $month: "$completedAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.status(200).json({
      success: true,
      trends: combinedTrends,
      categoryAverages: avgScores[0] || { technical: 0, hr: 0, communication: 0, confidence: 0 },
      typeDistribution: typeDist,
      monthlyCounts: monthlyCounts.map(m => {
        const date = new Date(m._id.year, m._id.month - 1);
        return {
          month: date.toLocaleString('default', { month: 'short' }),
          count: m.count
        };
      })
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed skill metrics, weak areas, and strong areas
// @route   GET /api/dashboard/skills
// @access  Private
exports.getSkillAnalytics = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const topicStats = await QuestionEvaluation.aggregate([
      {
        $lookup: {
          from: 'interviewquestions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'questionDetails'
        }
      },
      { $unwind: "$questionDetails" },
      { $match: { "questionDetails.user": userId } },
      {
        $group: {
          _id: "$questionDetails.topic",
          avgScore: { $avg: "$score" },
          timesAsked: { $sum: 1 },
          lastPracticed: { $max: "$createdAt" }
        }
      },
      { $sort: { avgScore: 1 } }
    ]);

    const skills = topicStats.map(t => {
      const percentScore = Math.round(t.avgScore * 10);
      const trendValue = percentScore >= 75 ? `↑ +${Math.round(percentScore * 0.08)}%` : percentScore >= 50 ? `↑ +${Math.round(percentScore * 0.05)}%` : `↓ -${Math.round((100 - percentScore) * 0.06)}%`;
      return {
        skill: t._id,
        avgScore: percentScore,
        timesAsked: t.timesAsked,
        lastPracticed: t.lastPracticed,
        trend: trendValue
      };
    });

    const weakTopics = skills.filter(s => s.avgScore < 70).map(s => ({
      topic: s.skill,
      averageScore: s.avgScore,
      timesAsked: s.timesAsked,
      lastPracticed: s.lastPracticed,
      recommendedInterview: `${s.skill} Focus session`
    }));

    const strongSkills = skills.filter(s => s.avgScore >= 70).map(s => ({
      topic: s.skill,
      averageScore: s.avgScore,
      timesAsked: s.timesAsked
    }));

    res.status(200).json({
      success: true,
      skills,
      weakTopics,
      strongSkills
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get streaks, monthly statistics, and achievements
// @route   GET /api/dashboard/streak
// @access  Private
exports.getStreakAndAchievements = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const { currentStreak, longestStreak } = await calculateStreak(userId);

    // Interviews completed this week and this month
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const weekCount = await InterviewSession.countDocuments({
      user: userId,
      status: 'Completed',
      completedAt: { $gte: startOfWeek }
    });

    const monthCount = await InterviewSession.countDocuments({
      user: userId,
      status: 'Completed',
      completedAt: { $gte: startOfMonth }
    });

    // Compute achievements list dynamically
    const completedCount = await InterviewSession.countDocuments({ user: userId, status: 'Completed' });
    const totalAnswersCount = await InterviewAnswer.countDocuments({ user: userId });
    
    const highestScoreEval = await InterviewEvaluation.findOne({ user: userId }).sort({ overallScore: -1 });
    const maxScore = highestScoreEval ? highestScoreEval.overallScore : 0;

    const achievements = [];
    if (completedCount >= 1) {
      achievements.push({ id: 'first_interview', name: 'First Interview', description: 'Completed your first mock interview!', icon: 'FiAward' });
    }
    if (completedCount >= 5) {
      achievements.push({ id: 'interview_5', name: 'Interview Enthusiast', description: 'Completed 5 mock interviews', icon: 'FiTarget' });
    }
    if (completedCount >= 10) {
      achievements.push({ id: 'interview_10', name: 'Interview Pro', description: 'Completed 10 mock interviews', icon: 'FiCrown' });
    }
    if (totalAnswersCount >= 100) {
      achievements.push({ id: 'questions_100', name: 'Topic Master', description: 'Answered over 100 questions', icon: 'FiSliders' });
    }
    if (maxScore >= 90) {
      achievements.push({ id: 'top_performer', name: 'Top Performer', description: 'Scored 90% or above in an interview', icon: 'FiStar' });
    }

    // Generate notifications
    const notifications = [];
    const recentEvals = await InterviewEvaluation.find({ user: userId }).sort({ createdAt: -1 }).limit(2);
    if (recentEvals.length >= 2) {
      const scoreDiff = recentEvals[0].overallScore - recentEvals[1].overallScore;
      if (scoreDiff > 0) {
        notifications.push({ text: `You improved by +${scoreDiff}% since your last interview. Keep it up!` });
      } else if (scoreDiff < 0) {
        notifications.push({ text: `Your overall performance dropped by ${Math.abs(scoreDiff)}%. Review recommendations details.` });
      }
    } else {
      notifications.push({ text: "Welcome to InterviewAce! Complete your first mock interview to track performance metrics." });
    }

    res.status(200).json({
      success: true,
      streak: {
        currentStreak,
        longestStreak,
        interviewsThisWeek: weekCount,
        interviewsThisMonth: monthCount
      },
      achievements,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI recommendations for next mock sessions
// @route   GET /api/dashboard/recommendations
// @access  Private
exports.getRecommendations = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Get the user profile target details
    const user = await mongoose.model('User').findById(userId);

    // Query weak topics
    const topicStats = await QuestionEvaluation.aggregate([
      {
        $lookup: {
          from: 'interviewquestions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'questionDetails'
        }
      },
      { $unwind: "$questionDetails" },
      { $match: { "questionDetails.user": userId } },
      {
        $group: {
          _id: "$questionDetails.topic",
          avgScore: { $avg: "$score" }
        }
      },
      { $sort: { avgScore: 1 } }
    ]);

    const weakTopics = topicStats.filter(t => t.avgScore < 7).map(t => t._id);

    const recommended = [];
    
    // Add recommendations based on weak topics
    weakTopics.forEach(topic => {
      recommended.push({
        title: `${topic} Advanced Mastery`,
        role: user.targetRole || "Software Developer",
        topic: topic,
        reason: `Your average score in ${topic} is low. Practice this focus round to build confidence.`,
        difficulty: 'Medium'
      });
    });

    // Default general recommendations if weak topics are few
    if (recommended.length < 3) {
      recommended.push(
        { title: "System Design Essentials", role: user.targetRole || "Software Developer", topic: "System Design", reason: "Practice system architectural scaling and distributed design principles.", difficulty: 'Hard' },
        { title: "Behavioral and STAR Method Round", role: user.targetRole || "Software Developer", topic: "Behavioral", reason: "Master communication core skills and STAR framework structuring.", difficulty: 'Medium' }
      );
    }

    res.status(200).json({
      success: true,
      recommendations: recommended.slice(0, 5)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Compare performance reports of two interview sessions
// @route   GET /api/interviews/:id/compare
// @access  Private
exports.compareInterviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { compareWith } = req.query; // Session ID to compare with

    if (!compareWith) {
      return res.status(400).json({ success: false, message: 'Please provide a compareWith session parameter' });
    }

    const sessionA = await InterviewSession.findOne({ interviewId: id, user: req.user._id });
    const sessionB = await InterviewSession.findOne({ interviewId: compareWith, user: req.user._id });

    if (!sessionA || !sessionB) {
      return res.status(404).json({ success: false, message: 'One or both interview sessions not found' });
    }

    const VoiceInterview = require('../models/VoiceInterview');

    // 1. Fetch or simulate Evaluation for Session A
    let evalA = await InterviewEvaluation.findOne({ sessionId: sessionA._id });
    let voiceA = null;
    if (!evalA) {
      voiceA = await VoiceInterview.findOne({ sessionId: sessionA.interviewId, status: 'Completed' });
      if (voiceA) {
        evalA = {
          overallScore: voiceA.overallScore,
          technicalScore: voiceA.technicalScore,
          hrScore: voiceA.communicationScore,
          communicationScore: voiceA.communicationScore,
          confidenceScore: voiceA.confidenceScore
        };
      }
    }

    // 2. Fetch or simulate Evaluation for Session B
    let evalB = await InterviewEvaluation.findOne({ sessionId: sessionB._id });
    let voiceB = null;
    if (!evalB) {
      voiceB = await VoiceInterview.findOne({ sessionId: sessionB.interviewId, status: 'Completed' });
      if (voiceB) {
        evalB = {
          overallScore: voiceB.overallScore,
          technicalScore: voiceB.technicalScore,
          hrScore: voiceB.communicationScore,
          communicationScore: voiceB.communicationScore,
          confidenceScore: voiceB.confidenceScore
        };
      }
    }

    if (!evalA || !evalB) {
      return res.status(400).json({ success: false, message: 'Evaluation reports not ready yet for comparison' });
    }

    // 3. Calculate metrics for Session A
    let totalTimeA = 0;
    let skippedA = 0;
    if (voiceA) {
      totalTimeA = voiceA.questions.reduce((sum, q) => sum + (q.audioDurationSec || 0), 0);
      skippedA = voiceA.questions.filter(q => !q.transcriptText || q.transcriptText.trim().length === 0).length;
    } else {
      const answersA = await InterviewAnswer.find({ sessionId: sessionA._id });
      totalTimeA = answersA.reduce((sum, a) => sum + (a.timeTaken || 0), 0);
      skippedA = answersA.filter(a => a.skipped).length;
    }

    // 4. Calculate metrics for Session B
    let totalTimeB = 0;
    let skippedB = 0;
    if (voiceB) {
      totalTimeB = voiceB.questions.reduce((sum, q) => sum + (q.audioDurationSec || 0), 0);
      skippedB = voiceB.questions.filter(q => !q.transcriptText || q.transcriptText.trim().length === 0).length;
    } else {
      const answersB = await InterviewAnswer.find({ sessionId: sessionB._id });
      totalTimeB = answersB.reduce((sum, a) => sum + (a.timeTaken || 0), 0);
      skippedB = answersB.filter(a => a.skipped).length;
    }

    res.status(200).json({
      success: true,
      reportA: {
        title: sessionA.title,
        overallScore: evalA.overallScore,
        technical: evalA.technicalScore,
        hr: evalA.hrScore,
        communication: evalA.communicationScore,
        confidence: evalA.confidenceScore,
        totalTime: totalTimeA,
        completionRate: Math.round(((sessionA.questionCount - skippedA) / sessionA.questionCount) * 100)
      },
      reportB: {
        title: sessionB.title,
        overallScore: evalB.overallScore,
        technical: evalB.technicalScore,
        hr: evalB.hrScore,
        communication: evalB.communicationScore,
        confidence: evalB.confidenceScore,
        totalTime: totalTimeB,
        completionRate: Math.round(((sessionB.questionCount - skippedB) / sessionB.questionCount) * 100)
      }
    });
  } catch (error) {
    next(error);
  }
};
