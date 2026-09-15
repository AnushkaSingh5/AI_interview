const express = require('express');
const { protect } = require('../middleware/auth');
const {
  sendMessage,
  getThreads,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
  clearThreadMessages
} = require('../controllers/careerCoachController');

const router = express.Router();

// All career coach endpoints require authentication
router.use(protect);

router.post('/message', sendMessage);

router.route('/threads')
  .get(getThreads)
  .post(createThread);

router.route('/threads/:id')
  .get(getThreadById)
  .put(updateThread)
  .delete(deleteThread);

router.delete('/threads/:id/messages', clearThreadMessages);

module.exports = router;
