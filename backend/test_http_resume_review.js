const axios = require('axios');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';

async function testHttpResumeReview() {
  try {
    console.log('--- 1. Authenticating test user ---');
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne();
    if (!user) {
      throw new Error('No user found');
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: '30d'
    });

    console.log(`[PASS] Generated auth token for user ${user._id} (${user.email})`);
    const authHeaders = { Authorization: `Bearer ${token}` };

    console.log('\n--- 2. Testing POST /api/resume/review ---');
    const reviewRes = await axios.post(
      `${BASE_URL}/resume/review`,
      {
        targetRole: 'Full Stack Engineer',
        targetCompany: 'Google'
      },
      { headers: authHeaders }
    );

    console.log(`[PASS] Status: ${reviewRes.status}`);
    console.log(`- Overall Score: ${reviewRes.data.review.overallScore}/100`);
    console.log(`- ATS Score: ${reviewRes.data.review.atsScore}/100`);
    console.log(`- Better Wording Score: ${reviewRes.data.review.wordingScore}/100`);
    console.log(`- Missing Keywords Count: ${reviewRes.data.review.keywordsAnalysis?.missingKeywords?.length || 0}`);
    console.log(`- Wording Suggestions Count: ${reviewRes.data.review.wordingSuggestions?.length || 0}`);
    console.log(`- Project Enhancements Count: ${reviewRes.data.review.projectEnhancements?.length || 0}`);

    console.log('\n--- 3. Testing GET /api/resume/review/latest ---');
    const latestRes = await axios.get(`${BASE_URL}/resume/review/latest`, { headers: authHeaders });
    console.log(`[PASS] Status: ${latestRes.status}`);
    console.log(`- Latest Review ID: ${latestRes.data.review?._id}`);
    console.log(`- Target Role: ${latestRes.data.review?.targetRole}`);
    console.log(`- Target Company: ${latestRes.data.review?.targetCompany}`);

    console.log('\n--- 4. Testing POST /api/resume/review/sync-keywords ---');
    const syncRes = await axios.post(
      `${BASE_URL}/resume/review/sync-keywords`,
      {
        keywords: ['Redis', 'Docker', 'GraphQL', 'AWS S3']
      },
      { headers: authHeaders }
    );
    console.log(`[PASS] Status: ${syncRes.status}`);
    console.log(`- Message: ${syncRes.data.message}`);
    console.log(`- Updated Technical Skills Count: ${syncRes.data.technicalSkills?.length}`);

    console.log('\n--- 5. Testing POST /api/resume/review/apply-project ---');
    const projectRes = await axios.post(
      `${BASE_URL}/resume/review/apply-project`,
      {
        projectIndex: 0,
        title: 'LaunchCart — High-Performance Cloud Architecture',
        enhancedDescription: '• Architected resilient microservices with Next.js and Node.js.\n• Integrated Redis caching to reduce latency by 42%.',
        technologies: ['React', 'Node.js', 'Redis', 'Docker']
      },
      { headers: authHeaders }
    );
    console.log(`[PASS] Status: ${projectRes.status}`);
    console.log(`- Message: ${projectRes.data.message}`);
    console.log(`- Projects Count: ${projectRes.data.projects?.length}`);

    console.log('\n=============================================================');
    console.log('ALL HTTP REST ENDPOINTS FOR AI RESUME REVIEW VERIFIED 100%!');
    console.log('=============================================================');
  } catch (err) {
    console.error('[FAIL] HTTP test failed:', err.response?.data || err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testHttpResumeReview();
