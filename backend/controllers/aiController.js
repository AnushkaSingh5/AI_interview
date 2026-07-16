const aiService = require('../services/aiService');

/**
 * Controller endpoint to verify and inspect Gemini API key & model health status (Step 9)
 * GET /api/ai/health
 */
exports.getAIHealth = async (req, res, next) => {
  try {
    const healthStatus = await aiService.checkHealth();
    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gemini AI service health check failed.',
      error: error
    });
  }
};
