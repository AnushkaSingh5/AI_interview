const express = require('express');
const {
  uploadResume,
  getResume,
  getResumeData,
  updateResumeData,
  deleteResume,
  previewResume
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

module.exports = router;
