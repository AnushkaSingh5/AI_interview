const express = require('express');
const { protect } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const {
  startSession,
  uploadVideoFile,
  evaluateSession,
  getReport,
  getHistory,
  terminateSession
} = require('../controllers/videoController');

const router = express.Router();

// Ensure uploads/videos directory exists
const videoDir = path.join(__dirname, '../uploads/videos');
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoDir);
  },
  filename: (req, file, cb) => {
    cb(null, `video-${Date.now()}-${Math.round(Math.random() * 1e9)}.webm`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Protect all routes
router.use(protect);

router.post('/start', startSession);
router.post('/upload', upload.single('video'), uploadVideoFile);
router.post('/evaluate', evaluateSession);
router.post('/terminate', terminateSession);
router.get('/report/:id', getReport);
router.get('/history', getHistory);

module.exports = router;
