require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const path = require('path');
const interviewRoutes = require('./routes/interviewRoutes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize AI service early to enforce GEMINI_API_KEY presence validation on boot
const aiService = require('./services/aiService');
const aiRoutes = require('./routes/aiRoutes');

// Connect to Database
connectDB().then(() => {
  const { resumePendingJobs } = require('./services/ai/aiQueueService');
  resumePendingJobs();
});

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Rate Limiting
app.use('/api', apiLimiter);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// Base Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'InterviewAce AI Backend API is healthy and running'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users/profile', profileRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// Centralized Error Handler Middleware (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
