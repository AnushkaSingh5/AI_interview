const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Helper middleware to handle express-validator validation results
const validateFields = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Register endpoint
router.post(
  '/register',
  authLimiter,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 50 })
      .withMessage('Name cannot exceed 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please include a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  validateFields,
  register
);

// Login endpoint
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please include a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validateFields,
  login
);

// Logout endpoint
router.post('/logout', protect, logout);

// Get current user profile
router.get('/me', protect, getMe);

// Update profile details
router.put(
  '/profile',
  protect,
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 50 })
      .withMessage('Name cannot exceed 50 characters'),
    body('phone')
      .optional()
      .trim(),
    body('bio')
      .optional()
      .trim(),
    body('experienceLevel')
      .optional()
      .isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert'])
      .withMessage('Experience level must be Beginner, Intermediate, Advanced, or Expert'),
    body('targetRole')
      .optional()
      .trim(),
    body('targetCompany')
      .optional()
      .trim(),
    body('preferredLanguage')
      .optional()
      .trim(),
    body('skills')
      .optional()
      .isArray()
      .withMessage('Skills must be an array of strings')
  ],
  validateFields,
  updateProfile
);

module.exports = router;
