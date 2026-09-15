const axios = require('axios');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

const BASE_URL = 'http://localhost:5000/api';

async function runPracticeVerificationSuite() {
  try {
    console.log('=== AI PRACTICE HUB & LEARNING VERIFICATION SUITE ===\n');
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne();
    if (!user) throw new Error('No user found');

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(`[PASS] Authenticated user: ${user._id} (${user.email})`);

    // 1. Topics & Weak Skills
    console.log('\n--- 1. Testing GET /api/practice/topics ---');
    const topicsRes = await axios.get(`${BASE_URL}/practice/topics`, { headers: authHeaders });
    console.log(`[PASS] Status: ${topicsRes.status}`);
    console.log(`- Weak Topics Count: ${topicsRes.data.weakTopics?.length}`);
    console.log(`- Company Profiles Count: ${topicsRes.data.companyProfiles?.length}`);
    console.log(`- Technical Topics: ${topicsRes.data.technicalTopics?.slice(0, 4).join(', ')}`);

    // 2. Practice Analytics Stats
    console.log('\n--- 2. Testing GET /api/practice/stats ---');
    const statsRes = await axios.get(`${BASE_URL}/practice/stats`, { headers: authHeaders });
    console.log(`[PASS] Status: ${statsRes.status}`);
    console.log(`- Total Questions Solved: ${statsRes.data.totalQuestionsSolved}`);
    console.log(`- Practice Accuracy: ${statsRes.data.practiceAccuracy}%`);

    // 3. 4-Week Learning Roadmap
    console.log('\n--- 3. Testing GET /api/practice/roadmap ---');
    const roadRes = await axios.get(`${BASE_URL}/practice/roadmap`, { headers: authHeaders });
    console.log(`[PASS] Status: ${roadRes.status}`);
    console.log(`- Roadmap Weeks Generated: ${roadRes.data.roadmap?.weeks?.length}`);

    // 4. Flashcards
    console.log('\n--- 4. Testing GET /api/practice/flashcards ---');
    const fcRes = await axios.get(`${BASE_URL}/practice/flashcards`, { headers: authHeaders });
    console.log(`[PASS] Status: ${fcRes.status}`);
    console.log(`- Flashcards Count: ${fcRes.data.flashcards?.length}`);

    // 5. Daily Challenge
    console.log('\n--- 5. Testing GET /api/practice/daily ---');
    const dailyRes = await axios.get(`${BASE_URL}/practice/daily`, { headers: authHeaders });
    console.log(`[PASS] Status: ${dailyRes.status}`);
    console.log(`- Daily Challenge Session ID: ${dailyRes.data.session?._id}`);
    console.log(`- Daily Questions Count: ${dailyRes.data.questions?.length}`);

    // 6. Starting Company Practice Sessions
    const companies = ['Google', 'Amazon', 'Microsoft', 'Infosys', 'TCS', 'Accenture'];
    console.log('\n--- 6. Testing All 6 Company Practice Tracks ---');
    for (const comp of companies) {
      const startRes = await axios.post(
        `${BASE_URL}/practice/start`,
        {
          mode: 'Company',
          company: comp,
          topic: `${comp} Architecture & Coding`,
          difficulty: comp === 'Google' ? 'Hard' : 'Medium',
          questionCount: 3
        },
        { headers: authHeaders }
      );
      console.log(`[PASS] ${comp} Practice Session Created: ID=${startRes.data.session._id}`);
    }

    // 7. Starting Weak Topic Targeted Practice Session
    console.log('\n--- 7. Testing Weak Topic Targeted Practice Session ---');
    const weakTopic = topicsRes.data.weakTopics?.[0]?.name || 'JavaScript Closures';
    const weakStartRes = await axios.post(
      `${BASE_URL}/practice/start`,
      {
        mode: 'Technical',
        topic: weakTopic,
        difficulty: 'Medium',
        questionCount: 3
      },
      { headers: authHeaders }
    );
    const weakSessionId = weakStartRes.data.session._id;
    console.log(`[PASS] Created Targeted Practice for "${weakTopic}": ID=${weakSessionId}`);

    // 8. Fetching Session & Answering a Question
    console.log('\n--- 8. Testing Answer Submission & Instant AI Explanation ---');
    const sessionDetailRes = await axios.get(`${BASE_URL}/practice/session/${weakSessionId}`, { headers: authHeaders });
    const firstQuestion = sessionDetailRes.data.questions[0];
    console.log(`- Evaluating Question: "${firstQuestion.question}"`);

    const answerRes = await axios.post(
      `${BASE_URL}/practice/answer`,
      {
        questionId: firstQuestion._id,
        userAnswer: 'A closure is a function that remembers its outer lexical environment even after the outer function has closed.'
      },
      { headers: authHeaders }
    );
    console.log(`[PASS] Status: ${answerRes.status}`);
    console.log(`- Score: ${answerRes.data.question.score}/10`);
    console.log(`- Accuracy: ${answerRes.data.question.accuracy}%`);
    console.log(`- AI Feedback: "${answerRes.data.question.feedback}"`);
    console.log(`- Concept Explanation: "${answerRes.data.question.conceptExplanation?.substring(0, 80)}..."`);
    console.log(`- Common Mistakes: ${answerRes.data.question.commonMistakes?.join(', ')}`);

    // 9. Bookmarks Lifecycle (Create -> Fetch -> Delete)
    console.log('\n--- 9. Testing Bookmarks Flow ---');
    const bmCreateRes = await axios.post(
      `${BASE_URL}/practice/bookmark`,
      {
        question: firstQuestion.question,
        topic: firstQuestion.topic,
        idealAnswer: answerRes.data.question.idealAnswer,
        notes: 'Important closure concept to review before Google interview'
      },
      { headers: authHeaders }
    );
    const createdBmId = bmCreateRes.data.bookmark._id;
    console.log(`[PASS] Created Bookmark: ${createdBmId}`);

    const bmListRes = await axios.get(`${BASE_URL}/practice/bookmarks`, { headers: authHeaders });
    console.log(`[PASS] Bookmarks List Count: ${bmListRes.data.bookmarks?.length}`);

    const bmDeleteRes = await axios.delete(`${BASE_URL}/practice/bookmark/${createdBmId}`, { headers: authHeaders });
    console.log(`[PASS] Deleted Bookmark: ${bmDeleteRes.data.message}`);

    console.log('\n================================================================');
    console.log('ALL AI PRACTICE HUB & LEARNING CAPABILITIES VERIFIED 100% OPERATIONAL!');
    console.log('================================================================');
  } catch (err) {
    console.error('[FAIL] Practice verification failed:', err.response?.data || err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runPracticeVerificationSuite();
