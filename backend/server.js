require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const errorHandler = require('./middleware/errorHandler');
const dashboardRoutes = require('./routes/dashboardRoutes');
const practiceRoutes = require('./routes/practiceRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const learningRoutes = require('./routes/learningRoutes');
const videoRoutes = require('./routes/videoRoutes');
const codingRoutes = require('./routes/codingRoutes');
const systemDesignRoutes = require('./routes/systemDesignRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const coverLetterRoutes = require('./routes/coverLetterRoutes');
const careerCoachRoutes = require('./routes/careerCoachRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize AI service early to enforce GEMINI_API_KEY presence validation on boot
const aiService = require('./services/aiService');
const aiRoutes = require('./routes/aiRoutes');

// Connect to Database asynchronously on boot
connectDB()
  .then(() => {
    try {
      const { resumePendingJobs } = require('./services/ai/aiQueueService');
      resumePendingJobs();
    } catch (e) {
      console.warn('[AI Queue] resumePendingJobs warning:', e.message);
    }
  })
  .catch((err) => {
    console.warn('[Boot] MongoDB initial connection deferred to request-time:', err.message);
  });

const app = express();

// Enable Trust Proxy for Vercel and reverse proxies (essential for cookies and rate limiter)
app.set('trust proxy', 1);

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Dynamic CORS configuration allowing custom CLIENT_URL, Vercel deployments, and local dev
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://ai-interview-d3ea.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
]
  .filter(Boolean)
  .map(url => url.trim().replace(/\/+$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const normalized = origin.trim().replace(/\/+$/, '');
      try {
        const hostname = new URL(origin).hostname;
        if (
          allowedOrigins.includes(normalized) ||
          hostname.endsWith('.vercel.app') ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1'
        ) {
          return callback(null, true);
        }
      } catch (e) {
        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);

// Rate Limiting
app.use('/api', apiLimiter);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// Serverless DB Connection Guarantee Middleware (ensures DB is active before handling routes)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB Middleware Error]:', err.message);
    res.status(503).json({
      success: false,
      message: 'Database connection temporarily unavailable. Please retry momentarily.'
    });
  }
});

// Root API Landing Check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'InterviewAce AI Backend API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
    timestamp: new Date().toISOString()
  });
});

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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/coding', codingRoutes);
app.use('/coding', codingRoutes);
app.use('/api/system-design', systemDesignRoutes);
app.use('/system-design', systemDesignRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/cover-letter', coverLetterRoutes);
app.use('/api/career-coach', careerCoachRoutes);

// Uploads Static File Serving
const uploadDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
}
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadDir));

// Centralized Error Handler Middleware (must be after routes)
app.use(errorHandler);

// Export app for Vercel Serverless Function runtime
module.exports = app;

// Listen only when running directly (e.g. `node server.js` in local dev or standalone container)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}
