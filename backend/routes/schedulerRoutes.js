const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getScheduledInterviews,
  getUpcomingAlerts,
  getScheduledInterviewById,
  createScheduledInterview,
  updateScheduledInterview,
  deleteScheduledInterview,
  launchScheduledInterview,
  downloadIcsFile
} = require('../controllers/schedulerController');

const router = express.Router();

// All scheduler routes require authentication
router.use(protect);

router.route('/')
  .get(getScheduledInterviews)
  .post(createScheduledInterview);

router.get('/upcoming', getUpcomingAlerts);

router.route('/:id')
  .get(getScheduledInterviewById)
  .put(updateScheduledInterview)
  .delete(deleteScheduledInterview);

router.post('/:id/start', launchScheduledInterview);
router.get('/:id/ics', downloadIcsFile);

module.exports = router;
