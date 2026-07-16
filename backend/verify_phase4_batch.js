const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../New folder/backend/.env') });

const InterviewSession = require('../../../New folder/backend/models/InterviewSession');
const User = require('../../../New folder/backend/models/User');
const ResumeData = require('../../../New folder/backend/models/ResumeData');
const { generateInterviewQuestions } = require('../../../New folder/backend/services/ai/questionGenerator');

async function testPhase4Batch() {
  console.log('--- STARTING PHASE 4 BATCH VERIFICATION TEST ---');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected successfully.');

    // Fetch test user
    const user = await User.findOne();
    if (!user) {
      console.log('[Test Skip] No user found. Create a user first.');
      await mongoose.disconnect();
      return;
    }
    console.log(`Using Test User: ${user.email} (ID: ${user._id})`);

    const resumeData = await ResumeData.findOne({ user: user._id });
    console.log(`Using ResumeData details: ${resumeData ? 'Found' : 'Not Found'}`);

    // Create a temporary configuration session (Mixed, 5 questions: 3 Tech, 1 HR, 1 Behavioral)
    const session = new InterviewSession({
      user: user._id,
      interviewId: `INT-TB4-${Date.now().toString().slice(-4)}`,
      title: 'Mixed Interview - Full Stack Developer',
      interviewType: 'Mixed',
      role: 'Full Stack Developer',
      company: 'Netflix',
      experienceLevel: '1-3 Years',
      difficulty: 'Medium',
      duration: 10,
      questionCount: 5,
      preferredLanguage: 'English',
      focusAreas: ['React', 'Node.js', 'MongoDB'],
      interviewMode: 'Text',
      status: 'Created'
    });

    console.log('Testing generateInterviewQuestions category-based batch wrapper...');
    const questions = await generateInterviewQuestions(user, resumeData, session);

    console.log(`[Success] Generated ${questions.length} total merged questions successfully!`);
    
    questions.forEach(q => {
      console.log(`  - #${q.questionNumber}: Type="${q.questionType}", Topic="${q.topic}", Q="${q.question.slice(0, 50)}..."`);
    });

    const isValidCount = questions.length > 0;
    const isSequential = questions.every((q, idx) => q.questionNumber === idx + 1);
    console.log(`[Success] Questions count valid: ${isValidCount}`);
    console.log(`[Success] Re-indexing sequential check: ${isSequential ? 'PASSED' : 'FAILED'}`);

  } catch (err) {
    console.error('[Error] Verification failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    console.log('--- PHASE 4 BATCH VERIFICATION COMPLETED ---');
  }
}

testPhase4Batch();
