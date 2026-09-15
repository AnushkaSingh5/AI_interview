const express = require('express');
const {
  uploadResume,
  getResume,
  getResumeData,
  updateResumeData,
  deleteResume,
  previewResume,
  generateResumeReview,
  getLatestResumeReview,
  getResumeReviewHistory,
  quickUploadAndReview,
  syncMissingKeywords,
  applyProjectEnhancement
} = require('../controllers/resumeController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Apply protect middleware to all resume endpoints
router.use(protect);

router.post('/upload', upload.single('resume'), uploadResume);
router.get('/', getResume);
router.delete('/', deleteResume);
router.get('/preview', previewResume);
router.get('/data', getResumeData);
router.put('/data', updateResumeData);

// AI Resume Review Endpoints
router.post('/review', generateResumeReview);
router.get('/review/latest', getLatestResumeReview);
router.get('/review/history', getResumeReviewHistory);
router.post('/review/quick-upload', upload.single('resume'), quickUploadAndReview);
router.post('/review/sync-keywords', syncMissingKeywords);
router.post('/review/apply-project', applyProjectEnhancement);

module.exports = router;
