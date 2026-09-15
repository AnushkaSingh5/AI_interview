const CareerCoachChat = require('../models/CareerCoachChat');
const ResumeData = require('../models/ResumeData');
const User = require('../models/User');
const { chatWithCareerCoach } = require('../services/ai/careerCoachService');

/**
 * @route   POST /api/career-coach/message
 * @desc    Send a message to AI Career Coach and get advice
 * @access  Private
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { threadId, message, category } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.'
      });
    }

    const [user, resumeData] = await Promise.all([
      User.findById(userId),
      ResumeData.findOne({ user: userId })
    ]);

    let thread;
    let isNewThread = false;

    if (threadId) {
      thread = await CareerCoachChat.findOne({ _id: threadId, user: userId });
    }

    if (!thread) {
      isNewThread = true;
      thread = new CareerCoachChat({
        user: userId,
        title: message.trim().slice(0, 45) || 'New Conversation',
        category: category || 'general',
        messages: []
      });
    }

    // Append user message
    const userMsg = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };
    thread.messages.push(userMsg);

    // Call Career Coach AI Engine
    const aiResponse = await chatWithCareerCoach({
      user,
      resumeData,
      conversationHistory: thread.messages,
      message: message.trim(),
      currentTopic: thread.category || category
    });

    // Format assistant message
    const assistantMsg = {
      role: 'assistant',
      content: aiResponse.reply || 'Here is my advice for your career journey.',
      suggestedFollowUps: Array.isArray(aiResponse.suggestedFollowUps) ? aiResponse.suggestedFollowUps : [],
      timestamp: new Date()
    };

    thread.messages.push(assistantMsg);
    thread.lastActiveAt = new Date();

    if (isNewThread && aiResponse.threadTitle) {
      thread.title = aiResponse.threadTitle;
    }
    if (aiResponse.category && thread.category === 'general') {
      thread.category = aiResponse.category;
    }

    await thread.save();

    return res.status(200).json({
      success: true,
      message: 'Advice generated successfully!',
      thread,
      reply: assistantMsg.content,
      suggestedFollowUps: assistantMsg.suggestedFollowUps
    });
  } catch (error) {
    console.error('[CareerCoachController] Message error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process career coach message.',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/career-coach/threads
 * @desc    Get all conversation threads for current user
 * @access  Private
 */
exports.getThreads = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const threads = await CareerCoachChat.find({ user: userId })
      .sort({ isPinned: -1, lastActiveAt: -1 })
      .select('title category isPinned lastActiveAt messages createdAt updatedAt');

    return res.status(200).json({
      success: true,
      count: threads.length,
      threads
    });
  } catch (error) {
    console.error('[CareerCoachController] Fetch threads error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation threads.',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/career-coach/threads/:id
 * @desc    Get single conversation thread by ID
 * @access  Private
 */
exports.getThreadById = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const thread = await CareerCoachChat.findOne({ _id: req.params.id, user: userId });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Conversation thread not found.'
      });
    }

    return res.status(200).json({
      success: true,
      thread
    });
  } catch (error) {
    console.error('[CareerCoachController] Fetch thread error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation thread.',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/career-coach/threads
 * @desc    Create a new conversation thread
 * @access  Private
 */
exports.createThread = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { title, category } = req.body;

    const thread = new CareerCoachChat({
      user: userId,
      title: (title || 'New Conversation').trim(),
      category: category || 'general',
      messages: []
    });

    await thread.save();

    return res.status(201).json({
      success: true,
      message: 'New thread created.',
      thread
    });
  } catch (error) {
    console.error('[CareerCoachController] Create thread error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create conversation thread.',
      error: error.message
    });
  }
};

/**
 * @route   PUT /api/career-coach/threads/:id
 * @desc    Update thread details (pin, rename, category)
 * @access  Private
 */
exports.updateThread = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const thread = await CareerCoachChat.findOne({ _id: req.params.id, user: userId });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Conversation thread not found.'
      });
    }

    const { title, isPinned, category } = req.body;

    if (title !== undefined) thread.title = title.trim();
    if (isPinned !== undefined) thread.isPinned = Boolean(isPinned);
    if (category !== undefined) thread.category = category;

    await thread.save();

    return res.status(200).json({
      success: true,
      message: 'Thread updated successfully.',
      thread
    });
  } catch (error) {
    console.error('[CareerCoachController] Update thread error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update thread.',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/career-coach/threads/:id
 * @desc    Delete a conversation thread
 * @access  Private
 */
exports.deleteThread = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await CareerCoachChat.findOneAndDelete({ _id: req.params.id, user: userId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Conversation thread not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.'
    });
  } catch (error) {
    console.error('[CareerCoachController] Delete thread error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete thread.',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/career-coach/threads/:id/messages
 * @desc    Clear messages in a conversation thread
 * @access  Private
 */
exports.clearThreadMessages = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const thread = await CareerCoachChat.findOne({ _id: req.params.id, user: userId });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Conversation thread not found.'
      });
    }

    thread.messages = [];
    thread.lastActiveAt = new Date();
    await thread.save();

    return res.status(200).json({
      success: true,
      message: 'Messages cleared.',
      thread
    });
  } catch (error) {
    console.error('[CareerCoachController] Clear messages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear conversation messages.',
      error: error.message
    });
  }
};
