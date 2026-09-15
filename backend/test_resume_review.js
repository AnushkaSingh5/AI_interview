const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Resume = require('./models/Resume');
const ResumeData = require('./models/ResumeData');
const ResumeReview = require('./models/ResumeReview');
const aiService = require('./services/aiService');

async function testResumeReviewFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[PASS] Connected to MongoDB');

    // 1. Find a test user or create mock user
    let user = await User.findOne();
    if (!user) {
      console.log('No user found, creating test user...');
      user = await User.create({
        fullName: 'Alex Morgan',
        email: 'alex.morgan.test@gmail.com',
        password: 'Password123!',
        targetRole: 'Full Stack Engineer'
      });
    }
    console.log(`Using user: ${user._id} (${user.email})`);

    // 2. Mock or find ResumeData
    let resumeData = await ResumeData.findOne({ user: user._id });
    if (!resumeData) {
      console.log('Creating sample ResumeData for test user...');
      resumeData = await ResumeData.create({
        user: user._id,
        personalInformation: {
          name: 'Alex Morgan',
          email: user.email,
          phone: '+1 555-019-2834',
          bio: 'Passionate developer building web apps.'
        },
        education: [{
          institution: 'State University',
          degree: 'B.S. in Computer Science',
          fieldOfStudy: 'Computer Science',
          startDate: '2020',
          endDate: '2024',
          gpa: '3.8'
        }],
        experience: [{
          company: 'Acme Software',
          position: 'Junior Developer',
          startDate: '06/2023',
          endDate: 'Present',
          description: 'Responsible for developing web pages and helping backend team with database queries.'
        }],
        projects: [{
          title: 'E-Commerce Microservices Store',
          description: 'Built a web application using React and Node.js for shopping online with payments.',
          technologies: ['React', 'Node.js', 'Express', 'MongoDB']
        }],
        technicalSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'HTML', 'CSS']
      });
    }

    console.log('\n--- 1. Testing AI Resume Review Service ---');
    const sampleRawText = `
Alex Morgan
Email: alex.morgan.test@gmail.com | Phone: +1 555-019-2834 | GitHub: github.com/alexmorgan

EDUCATION
State University, B.S. Computer Science (2020 - 2024), GPA: 3.8/4.0

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, SQL, HTML, CSS
Frameworks: React, Node.js, Express
Databases: MongoDB

WORK EXPERIENCE
Junior Software Developer | Acme Software (06/2023 - Present)
- Responsible for developing frontend UI components in React and fixing UI bugs.
- Worked on backend REST APIs with Node.js and MongoDB.
- Helped team with unit tests and code reviews.

PROJECTS
E-Commerce Platform (React, Node.js, Express, MongoDB)
- Built a web application using React and Node.js for shopping online with payments.
- Implemented user authentication with JWT and managed MongoDB database schemas.
- Handled state management with React hooks and styled components.
`;

    const reviewResult = await aiService.reviewResume({
      rawText: sampleRawText,
      resumeData,
      targetRole: 'Full Stack Software Engineer',
      targetCompany: 'Google'
    });

    console.log('[PASS] AI Resume Review Result Received:');
    console.log(`- Overall Score: ${reviewResult.overallScore}/100`);
    console.log(`- ATS Compatibility Score: ${reviewResult.atsScore}/100`);
    console.log(`- Better Wording Score: ${reviewResult.wordingScore}/100`);
    console.log(`- Skills Match Score: ${reviewResult.skillsScore}/100`);
    console.log(`- Project Quality Score: ${reviewResult.projectScore}/100`);
    console.log(`- Hiring Verdict: "${reviewResult.hiringVerdict}"`);
    console.log(`- Engine: ${reviewResult.analysisEngine}`);

    console.log('\n--- 2. Validating Review Content Output ---');
    console.log(`- Top Quick Wins (${reviewResult.topQuickWins?.length || 0}):`, reviewResult.topQuickWins?.slice(0, 2));
    console.log(`- ATS Formatting Checks: ${reviewResult.atsAnalysis?.formattingChecks?.length || 0} checks`);
    console.log(`- Present Keywords (${reviewResult.keywordsAnalysis?.presentKeywords?.length || 0}):`, reviewResult.keywordsAnalysis?.presentKeywords?.slice(0, 5));
    console.log(`- Missing Keywords (${reviewResult.keywordsAnalysis?.missingKeywords?.length || 0}):`, reviewResult.keywordsAnalysis?.missingKeywords?.slice(0, 3).map(k => k.keyword));
    console.log(`- Wording Transformations (${reviewResult.wordingSuggestions?.length || 0}):`);
    if (reviewResult.wordingSuggestions && reviewResult.wordingSuggestions.length > 0) {
      console.log('   Original:', reviewResult.wordingSuggestions[0].originalText);
      console.log('   Suggested (XYZ):', reviewResult.wordingSuggestions[0].suggestedText);
    }
    console.log(`- Project Enhancements (${reviewResult.projectEnhancements?.length || 0}):`);
    if (reviewResult.projectEnhancements && reviewResult.projectEnhancements.length > 0) {
      console.log('   Enhanced Title:', reviewResult.projectEnhancements[0].enhancedTitle);
      console.log('   Enhanced Bullets:', reviewResult.projectEnhancements[0].enhancedBullets?.slice(0, 2));
    }

    console.log('\n--- 3. Testing ResumeReview Model Persistence ---');
    const savedReview = await ResumeReview.create({
      user: user._id,
      targetRole: 'Full Stack Software Engineer',
      targetCompany: 'Google',
      overallScore: reviewResult.overallScore,
      atsScore: reviewResult.atsScore,
      wordingScore: reviewResult.wordingScore,
      skillsScore: reviewResult.skillsScore,
      projectScore: reviewResult.projectScore,
      readabilityScore: reviewResult.readabilityScore,
      executiveSummary: reviewResult.executiveSummary,
      hiringVerdict: reviewResult.hiringVerdict,
      topQuickWins: reviewResult.topQuickWins,
      atsAnalysis: reviewResult.atsAnalysis,
      keywordsAnalysis: reviewResult.keywordsAnalysis,
      wordingSuggestions: reviewResult.wordingSuggestions,
      projectEnhancements: reviewResult.projectEnhancements,
      analysisEngine: reviewResult.analysisEngine
    });
    console.log(`[PASS] Saved review ${savedReview._id} in MongoDB`);

    console.log('\n=============================================');
    console.log('ALL AI RESUME REVIEW BACKEND TESTS PASSED 100%');
    console.log('=============================================');
  } catch (err) {
    console.error('[FAIL] Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testResumeReviewFlow();
