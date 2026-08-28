const UserLearningProfile = require('../models/UserLearningProfile');
const InterviewSession = require('../models/InterviewSession');
const VoiceInterview = require('../models/VoiceInterview');
const learningEngine = require('../services/ai/learningEngine');

/**
 * Recalculates and updates the learning profile based on all historical sessions.
 */
exports.updateProfile = async (userId) => {
  try {
    // 1. Fetch completed text interview sessions
    const textSessions = await InterviewSession.find({
      user: userId,
      status: 'Completed'
    }).populate('user');

    // 2. Fetch completed voice interview sessions
    const voiceSessions = await VoiceInterview.find({
      user: userId,
      status: 'Completed'
    }).populate('user');

    const totalCount = textSessions.length + voiceSessions.length;
    if (totalCount === 0) {
      console.log(`[Learning Controller] No completed mock interviews found for user: ${userId}. Skipping update.`);
      return null;
    }

    // Combine sessions into a unified list sorted by completion date
    const allSessions = [];
    textSessions.forEach(s => {
      allSessions.push({
        ...s.toObject(),
        createdAt: s.completedAt || s.updatedAt
      });
    });
    voiceSessions.forEach(v => {
      allSessions.push({
        ...v.toObject(),
        createdAt: v.completedAt || v.updatedAt
      });
    });
    allSessions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // 3. Request Gemini AI pattern detection & analysis
    const analysis = await learningEngine.generateLearningAnalysis(allSessions);

    // 4. Save/Update Profile atomically
    const profile = await UserLearningProfile.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          totalInterviews: totalCount,
          strongestTopics: analysis.strongestTopics || [],
          weakestTopics: analysis.weakestTopics || [],
          topicHistory: analysis.topicHistory || [],
          improvementTrend: analysis.improvementTrend || [],
          recommendations: analysis.recommendations || [],
          weeklyStudyPlan: analysis.weeklyStudyPlan || [],
          learningInsights: analysis.learningInsights || [],
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    console.log(`[Learning Controller] Learning profile successfully updated for user: ${userId}`);
    return profile;
  } catch (err) {
    console.error('[Learning Controller] Update profile error:', err.message);
    return null;
  }
};

/**
 * GET /api/learning/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    let profile = await UserLearningProfile.findOne({ user: req.user._id });
    
    // Auto-initialize if it does not exist yet
    if (!profile) {
      // Trigger background update to populate it
      profile = await exports.updateProfile(req.user._id);
      
      if (!profile) {
        // Return default empty profile structure
        return res.status(200).json({
          success: true,
          profile: {
            totalInterviews: 0,
            strongestTopics: [],
            weakestTopics: [],
            topicHistory: [],
            improvementTrend: [],
            recommendations: [],
            weeklyStudyPlan: [],
            learningInsights: []
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/learning/recommendations
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const profile = await UserLearningProfile.findOne({ user: req.user._id });
    res.status(200).json({
      success: true,
      recommendations: profile?.recommendations || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/learning/trends
 */
exports.getTrends = async (req, res, next) => {
  try {
    const profile = await UserLearningProfile.findOne({ user: req.user._id });
    res.status(200).json({
      success: true,
      trends: profile?.improvementTrend || [],
      insights: profile?.learningInsights || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/learning/weak-topics
 */
exports.getWeakTopics = async (req, res, next) => {
  try {
    const profile = await UserLearningProfile.findOne({ user: req.user._id });
    res.status(200).json({
      success: true,
      weakestTopics: profile?.weakestTopics || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/learning/study-plan
 */
exports.getStudyPlan = async (req, res, next) => {
  try {
    const profile = await UserLearningProfile.findOne({ user: req.user._id });
    res.status(200).json({
      success: true,
      studyPlan: profile?.weeklyStudyPlan || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/learning/update
 */
exports.forceUpdateProfile = async (req, res, next) => {
  try {
    const profile = await exports.updateProfile(req.user._id);
    res.status(200).json({
      success: true,
      message: 'Learning profile successfully recalculated and updated.',
      profile
    });
  } catch (error) {
    next(error);
  }
};
