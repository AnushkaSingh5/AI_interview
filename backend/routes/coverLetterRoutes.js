const express = require('express');
const { protect } = require('../middleware/auth');
const {
  generate,
  refine,
  getCoverLetters,
  getCoverLetterById,
  createCoverLetter,
  updateCoverLetter,
  deleteCoverLetter
} = require('../controllers/coverLetterController');

const router = express.Router();

// All cover letter endpoints require user authentication
router.use(protect);

router.post('/generate', generate);
router.post('/refine', refine);

router.route('/')
  .get(getCoverLetters)
  .post(createCoverLetter);

router.route('/:id')
  .get(getCoverLetterById)
  .put(updateCoverLetter)
  .delete(deleteCoverLetter);

module.exports = router;
