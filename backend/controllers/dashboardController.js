const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const InterviewEvaluation = require('../models/InterviewEvaluation');
const InterviewAnswer = require('../models/InterviewAnswer');
const QuestionEvaluation = require('../models/QuestionEvaluation');

// Helper to calculate streaks dynamically
const calculateStreak = async (userId) => {
  const completedSessions = await InterviewSession.find({
    user: userId,
    status: 'Completed',
    completedAt: { $ne: null }
  }).sort({ completedAt: -1 }).select('completedAt');

  let currentStreak = 0;
  let longestStreak = 0;

  if (completedSessions.length > 0) {
    const dates = [...new Set(completedSessions.map(s => s.completedAt.toISOString().split('T')[0]))];
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
    res.status(200).json({
      success: true,
      summary: {
        overallAverageScore: Math.round(s.avgScore || 0),
        highestScore: s.maxScore || 0,
        lowestScore: s.minScore || 0,
        interviewsCompleted: s.count || 0,
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

    if (search) {
      query.$or = [
        { role: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = { $regex: role, $options: 'i' };
    if (company) query.company = { $regex: company, $options: 'i' };
    if (difficulty) query.difficulty = difficulty;
    if (interviewType) query.interviewType = interviewType;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (minScore || maxScore) {
      const scoreQuery = { user: userId };
      scoreQuery.overallScore = {};
      if (minScore) scoreQuery.overallScore.$gte = Number(minScore);
      if (maxScore) scoreQuery.overallScore.$lte = Number(maxScore);

      const matchingEvals = await InterviewEvaluation.find(scoreQuery).select('sessionId');
      const sessionIds = matchingEvals.map(e => e.sessionId);
      query._id = { $in: sessionIds };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await InterviewSession.countDocuments(query);
    const sessions = await InterviewSession.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    const sessionIds = sessions.map(s => s._id);
    const evaluations = await InterviewEvaluation.find({ sessionId: { $in: sessionIds } });

    const history = sessions.map(s => {
      const matchedEval = evaluations.find(e => e.sessionId.toString() === s._id.toString());
      return {
        _id: s._id,
        interviewId: s.interviewId,
        title: s.title,
        role: s.role,
        company: s.company,
        difficulty: s.difficulty,
        interviewType: s.interviewType,
        questionCount: s.questionCount,
        status: s.status,
        completedAt: s.completedAt || s.submittedAt || s.updatedAt,
        overallScore: matchedEval ? matchedEval.overallScore : null
      };
    });

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      history
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

    const typeDistribution = await InterviewSession.aggregate([
      { $match: { user: userId, status: 'Completed' } },
      {
        $group: {
          _id: "$interviewType",
          count: { $sum: 1 }
        }
      }
    ]);

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
      trends,
      categoryAverages: avgScores[0] || { technical: 0, hr: 0, communication: 0, confidence: 0 },
      typeDistribution: typeDistribution.map(t => ({ name: t._id, value: t.count })),
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

    const evalA = await InterviewEvaluation.findOne({ sessionId: sessionA._id });
    const evalB = await InterviewEvaluation.findOne({ sessionId: sessionB._id });

    if (!evalA || !evalB) {
      return res.status(400).json({ success: false, message: 'Evaluation reports not ready yet for comparison' });
    }

    const answersA = await InterviewAnswer.find({ sessionId: sessionA._id });
    const answersB = await InterviewAnswer.find({ sessionId: sessionB._id });

    const totalTimeA = answersA.reduce((sum, a) => sum + (a.timeTaken || 0), 0);
    const totalTimeB = answersB.reduce((sum, a) => sum + (a.timeTaken || 0), 0);

    const skippedA = answersA.filter(a => a.skipped).length;
    const skippedB = answersB.filter(a => a.skipped).length;

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
