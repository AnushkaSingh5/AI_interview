const express = require('express');
const router = express.Router();
const { getAIHealth } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// GET /api/ai/health (Step 9)
router.get('/health', protect, getAIHealth);

module.exports = router;
