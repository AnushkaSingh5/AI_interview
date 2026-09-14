const express = require('express');
const router = express.Router();
const systemDesignController = require('../controllers/systemDesignController');
const { protect } = require('../middleware/auth');

router.get('/scenarios', protect, systemDesignController.getScenarios);
router.post('/create', protect, systemDesignController.createSession);
router.post('/session/create', protect, systemDesignController.createSession);
router.get('/session/:id', protect, systemDesignController.getSession);
router.post('/session/:id/submit', protect, systemDesignController.submitDesign);
router.post('/submit', protect, systemDesignController.submitDesign);
router.post('/session/:id/terminate', protect, systemDesignController.terminateSession);
router.post('/terminate', protect, systemDesignController.terminateSession);
router.get('/report/:id', protect, systemDesignController.getReport);

module.exports = router;
