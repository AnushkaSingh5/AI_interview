const VideoInterview = require('../models/VideoInterview');
const User = require('../models/User');
const Resume = require('../models/Resume');
const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
const mongoose = require('mongoose');
const aiService = require('../services/aiService');
const { parseGeminiJson } = require('../utils/jsonParser');
const axios = require('axios');
const crypto = require('crypto');

const apiKey = process.env.GEMINI_API_KEY;

// Helper to sanitize and verify whether an answer is valid and non-empty
const sanitizeAndCheckAnswer = (transcriptText, questionText) => {
  if (!transcriptText || typeof transcriptText !== 'string') {
    return { answered: false, cleanText: '', reason: 'EMPTY' };
  }
  const clean = transcriptText.trim();
  const lower = clean.toLowerCase();

  // Known empty/placeholder patterns
  if (
    lower === '' ||
    lower === 'no verbal answer recorded.' ||
    lower === 'no verbal answer recorded' ||
    lower === 'speech-to-text failed.' ||
    lower === 'speech-to-text failed' ||
    lower === 'no answer provided.' ||
    lower === 'no answer provided' ||
    lower === 'no response recorded.' ||
    lower === 'no response recorded'
  ) {
    return { answered: false, cleanText: '', reason: 'EMPTY' };
  }

  // Question echo check (interviewer speech captured by mistake)
  if (questionText && typeof questionText === 'string') {
    const cleanQ = questionText.trim().toLowerCase().replace(/[.,?!]/g, '');
    const cleanA = lower.replace(/[.,?!]/g, '');
    if (cleanA === cleanQ) {
      return { answered: false, cleanText: '', reason: 'QUESTION_ECHO' };
    }
  }

  // Word count check - at least 3 words to be considered an attempted answer
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return { answered: false, cleanText: clean, reason: 'TOO_SHORT' };
  }

  return { answered: true, cleanText: clean, reason: 'VALID' };
};

// Backward-compatible wrapper
const isAnswerEmpty = (text) => {
  return !sanitizeAndCheckAnswer(text).answered;
};

// Deterministic Score Calculator for the whole session
const calculateInterviewScore = ({
  evaluatedQuestions,
  videoMetrics,
  timeline,
  speakingSpeed,
  fillerWords
}) => {
  const totalQuestions = evaluatedQuestions.length;
  const answeredQuestions = evaluatedQuestions.filter(q => q.answer && q.answer.answered === true).length;
  const answerCoverage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // 1. Technical Quality & Technical Score
  const answeredList = evaluatedQuestions.filter(q => q.answer && q.answer.answered === true);
  const technicalQuality = answeredList.length > 0
    ? Math.round(answeredList.reduce((sum, q) => sum + (q.answer.answerScore || 0), 0) / answeredList.length)
    : 0;
  
  // Technical score scaled strictly by answer coverage
  const technicalScore = Math.round(technicalQuality * (answerCoverage / 100));

  // 2. Video Delivery Score (Layer 2)
  const overallEyePct = videoMetrics ? (videoMetrics.eyeContactPercentage || 0) : 80;
  const overallCenterPct = videoMetrics ? (videoMetrics.centerFacingPercentage || 0) : 80;
  const overallFacePct = videoMetrics ? (videoMetrics.facePresencePercentage || 0) : 95;
  const overallExprPct = videoMetrics && videoMetrics.expressionDistribution
    ? Math.min(100, (videoMetrics.expressionDistribution.neutral || 0) + (videoMetrics.expressionDistribution.smile || 0))
    : 90;

  // 3. Proctoring Score
  let proctoringScore = 100;
  (timeline || []).forEach(evt => {
    const typeUpper = (evt.eventType || '').toUpperCase();
    if (typeUpper === 'LOOKING_AWAY' || typeUpper === 'LOOK-AWAY') proctoringScore -= 10;
    if (typeUpper === 'NO_FACE' || typeUpper === 'NO-FACE') proctoringScore -= 20;
    if (typeUpper === 'TAB_HIDDEN' || typeUpper === 'TAB-HIDDEN') proctoringScore -= 25;
    if (typeUpper === 'WINDOW_BLUR' || typeUpper === 'WINDOW-BLUR') proctoringScore -= 15;
  });
  proctoringScore = Math.max(0, proctoringScore);

  const videoDeliveryScore = Math.round(
    (overallEyePct * 0.40) +
    (overallCenterPct * 0.25) +
    (overallExprPct * 0.20) +
    (overallFacePct * 0.15)
  );

  // 4. Communication & Voice Scores
  let communicationScore = 0;
  let voiceScore = 0;

  if (answeredQuestions > 0) {
    const commAvg = Math.round(
      answeredList.reduce((sum, q) => sum + ((q.answer.clarity || 70) * 0.5 + (q.answer.relevance || 70) * 0.5), 0) / answeredList.length
    );
    communicationScore = Math.round(commAvg * (answerCoverage / 100));

    let paceScore = 80;
    const pace = speakingSpeed || 120;
    if (pace >= 110 && pace <= 160) paceScore = 95;
    else if (pace >= 80 && pace < 110) paceScore = 75;
    else if (pace > 160 && pace <= 200) paceScore = 75;
    else paceScore = 50;

    let fillerScore = Math.max(40, 100 - (fillerWords || 0) * 5);
    voiceScore = Math.round((paceScore * 0.6 + fillerScore * 0.4) * (answerCoverage / 100));
  } else {
    communicationScore = 0;
    voiceScore = 0;
  }

  // 5. Final Overall Score Aggregation
  let overallScore = 0;

  // RULE 1: Hard Zero if 0 questions answered
  if (answeredQuestions === 0) {
    overallScore = 0;
  } else {
    // RULE 2: Weighted Formula (Technical 60%, Comm 15%, Voice 5%, Video 10%, Proctoring 10%)
    const rawOverall = (
      (technicalScore * 0.60) +
      (communicationScore * 0.15) +
      (voiceScore * 0.05) +
      (videoDeliveryScore * 0.10) +
      (proctoringScore * 0.10)
    );

    let finalScore = Math.round(rawOverall);

    // RULE 3: Hard Caps for Low Coverage / Low Technical Correctness
    if (answerCoverage <= 20) {
      finalScore = Math.min(25, finalScore);
    } else if (answerCoverage <= 40) {
      finalScore = Math.min(45, finalScore);
    }

    if (technicalScore < 30) {
      finalScore = Math.min(40, finalScore);
    }
    if (technicalScore < 15) {
      finalScore = Math.min(20, finalScore);
    }

    overallScore = Math.max(0, Math.min(100, finalScore));
  }

  return {
    totalQuestions,
    answeredQuestions,
    answerCoverage,
    technicalQuality,
    technicalScore,
    communicationScore,
    voiceScore,
    videoDeliveryScore,
    proctoringScore,
    overallScore,
    overallEyePct,
    overallCenterPct,
    overallFacePct,
    overallExprPct,
    confidenceScore: Math.round((overallCenterPct + overallEyePct) / 2)
  };
};

// Helper to query Gemini AI for behavioral and technical grading
const generateAICoachVideoGrading = async (session, answers, behavioralMetrics) => {
  const answerChecks = answers.map(a => ({
    ...a,
    check: sanitizeAndCheckAnswer(a.transcriptText, a.questionText)
  }));

  const answeredCount = answerChecks.filter(a => a.check.answered).length;

  // If NO questions were answered verbally, skip Gemini and return deterministic 0s
  if (answeredCount === 0) {
    return {
      questionEvaluations: answers.map(a => ({
        questionNumber: a.questionNumber,
        answered: false,
        answerStatus: "NO_ANSWER",
        technicalAccuracy: 0,
        completeness: 0,
        relevance: 0,
        reasoning: 0,
        clarity: 0,
        answerScore: 0,
        expectedConcepts: [],
        coveredConcepts: [],
        missingConcepts: ["No verbal answer was provided"],
        incorrectClaims: [],
        strengths: [],
        weaknesses: ["No verbal answer was spoken or recorded for this question."],
        feedback: "No verbal answer recorded for this question."
      })),
      overallAnswerQualityScore: 0,
      overallFeedback: "No verbal answers were detected during this video interview session. Spoken answers are required to receive a technical evaluation.",
      strengths: [],
      focusGaps: ["Candidate did not provide verbal answers to the interview questions."],
      recommendations: ["Ensure your microphone is enabled and clearly speak your answers during each question time window."],
      learningRoadmap: []
    };
  }

  if (!apiKey) {
    console.warn('[Video AI] GEMINI_API_KEY missing. Falling back to local scoring.');
    return getFallbackGrading(session, answers, behavioralMetrics);
  }

  const prompt = `You are a Lead Technical and Communication Interviewer evaluating a candidate's video mock interview.

INTERVIEW PARAMETERS:
- Title: ${session.title}
- Target Role: ${session.role}
- Target Difficulty: ${session.difficulty}

CANDIDATE QUESTIONS & TRANSCRIPTS:
${JSON.stringify(answerChecks.map(a => ({
  questionNumber: a.questionNumber,
  questionText: a.questionText || '',
  transcriptText: a.check.answered ? a.check.cleanText : '',
  isAnswered: a.check.answered
})), null, 2)}

INSTRUCTIONS:
1. Grade the technical correctness of each answer independently. Do NOT perform simple keyword matching. Determine expected concepts and check semantic equivalence.
2. If "isAnswered" is false or the transcript is empty/silent:
   - "answered": false
   - "answerStatus": "NO_ANSWER"
   - technicalAccuracy: 0, completeness: 0, relevance: 0, reasoning: 0, clarity: 0, answerScore: 0
   - coveredConcepts: []
   - missingConcepts: ["No verbal answer was provided"]
   - incorrectClaims: []
   - strengths: []
   - weaknesses: ["No verbal answer was spoken or recorded for this question."]
   - feedback: "No verbal answer recorded for this question."
3. If "isAnswered" is true:
   - "answered": true
   - "answerStatus": Choose one: "ANSWERED", "PARTIALLY_ANSWERED", "IRRELEVANT", "UNINTELLIGIBLE"
   - "technicalAccuracy": 0 to 100. Must be strictly evaluated. If candidate provides incorrect explanations, score < 40.
   - "completeness": 0 to 100 (how much of the expected solution was covered).
   - "relevance": 0 to 100 (whether it directly addresses the question).
   - "reasoning": 0 to 100 (depth of logic, trade-offs, architecture).
   - "clarity": 0 to 100 (structure and communication clarity).
   - "answerScore": Math.round(technicalAccuracy * 0.40 + completeness * 0.25 + relevance * 0.15 + reasoning * 0.10 + clarity * 0.10)
   - "expectedConcepts": Array of key technical concepts expected for this question
   - "coveredConcepts": Array of concepts the candidate accurately demonstrated
   - "missingConcepts": Array of concepts the candidate missed
   - "incorrectClaims": Array of false or incorrect technical claims made by candidate (if any)
   - "strengths": Array of genuine technical strengths demonstrated (empty if none)
   - "weaknesses": Array of genuine technical gaps or errors
   - "feedback": Concise constructive feedback
4. overallAnswerQualityScore: Average of answerScore across answered questions (0 if none answered).
5. overallFeedback: Overall summary of technical performance.
6. Return ONLY valid JSON matching this schema with no markdown fences.

Schema:
{
  "questionEvaluations": [
    {
      "questionNumber": 1,
      "answered": true,
      "answerStatus": "ANSWERED",
      "technicalAccuracy": 85,
      "completeness": 80,
      "relevance": 90,
      "reasoning": 80,
      "clarity": 85,
      "answerScore": 84,
      "expectedConcepts": ["database transactions", "atomic updates"],
      "coveredConcepts": ["database transactions"],
      "missingConcepts": ["atomic updates"],
      "incorrectClaims": [],
      "strengths": ["Clear explanation of transaction boundaries"],
      "weaknesses": ["Missed discussing atomic isolation levels"],
      "feedback": "Strong response with clear structure."
    }
  ],
  "overallAnswerQualityScore": 84,
  "overallFeedback": "Solid technical performance with good foundational clarity.",
  "strengths": ["Clear conceptual definitions"],
  "focusGaps": ["Review concurrency edge cases"],
  "recommendations": ["Practice designing distributed architectures under load"],
  "learningRoadmap": [
    { "priority": "Priority 1", "title": "Concurrency Models", "description": "Study optimistic locking and isolation levels." }
  ]
}`;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 45000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = parseGeminiJson(text);
    if (!parsed) throw new Error('Gemini JSON parsing failed');
    return parsed;
  } catch (error) {
    console.error('[Video AI] AI Evaluation failed, using local fallback:', error.message);
    return getFallbackGrading(session, answers, behavioralMetrics);
  }
};

const getFallbackGrading = (session, answers, metrics) => {
  const questionEvaluations = answers.map(a => {
    const check = sanitizeAndCheckAnswer(a.transcriptText, a.questionText);
    if (!check.answered) {
      return {
        questionNumber: a.questionNumber,
        answered: false,
        answerStatus: "NO_ANSWER",
        technicalAccuracy: 0,
        completeness: 0,
        relevance: 0,
        reasoning: 0,
        clarity: 0,
        answerScore: 0,
        expectedConcepts: [],
        coveredConcepts: [],
        missingConcepts: ["No verbal answer was provided"],
        incorrectClaims: [],
        strengths: [],
        weaknesses: ["No verbal answer was spoken or recorded for this question."],
        feedback: "No verbal answer recorded for this question."
      };
    }

    const words = check.cleanText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    let techAcc = 60;
    let comp = 50;
    let rel = 70;
    let reas = 50;
    let clar = 65;
    let status = "PARTIALLY_ANSWERED";

    if (wordCount > 40) {
      techAcc = 80;
      comp = 75;
      rel = 85;
      reas = 75;
      clar = 80;
      status = "ANSWERED";
    } else if (wordCount > 15) {
      techAcc = 65;
      comp = 60;
      rel = 75;
      reas = 60;
      clar = 70;
      status = "PARTIALLY_ANSWERED";
    }

    const score = Math.round(techAcc * 0.40 + comp * 0.25 + rel * 0.15 + reas * 0.10 + clar * 0.10);

    return {
      questionNumber: a.questionNumber,
      answered: true,
      answerStatus: status,
      technicalAccuracy: techAcc,
      completeness: comp,
      relevance: rel,
      reasoning: reas,
      clarity: clar,
      answerScore: score,
      expectedConcepts: ["Relevant core engineering concepts", "Standard design patterns"],
      coveredConcepts: wordCount > 30 ? ["Relevant core engineering concepts"] : [],
      missingConcepts: wordCount <= 30 ? ["Standard design patterns"] : [],
      incorrectClaims: [],
      strengths: wordCount > 30 ? ["Provided structured verbal explanation"] : [],
      weaknesses: wordCount <= 30 ? ["Response was concise; deeper technical explanation recommended"] : [],
      feedback: wordCount > 30 ? "Good conceptual overview provided." : "Core points touched briefly."
    };
  });

  const answeredList = questionEvaluations.filter(q => q.answered && q.answerScore > 0);
  const overallAnswerQualityScore = answeredList.length > 0
    ? Math.round(answeredList.reduce((sum, q) => sum + q.answerScore, 0) / answeredList.length)
    : 0;

  return {
    questionEvaluations,
    overallAnswerQualityScore,
    overallFeedback: overallAnswerQualityScore > 0
      ? 'Completed the video mock interview session. Evaluated based on transcript content and proctoring metrics.'
      : 'No verbal answers were detected during this video interview session.',
    strengths: overallAnswerQualityScore > 0 ? ['Spoke responses with clear flow'] : [],
    focusGaps: overallAnswerQualityScore > 0 ? ['Technical response depth can be expanded further'] : ['Candidate did not provide verbal answers.'],
    recommendations: ['Practice structuring engineering design answers using standard patterns'],
    learningRoadmap: [
      {
        priority: 'Priority 1',
        title: 'Response Structuring',
        description: 'Practice visual representation and transaction flows.'
      }
    ]
  };
};

// 1. Start a new video interview session
exports.startSession = async (req, res, next) => {
  try {
    const { role, difficulty, questionCount, title } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const resumeData = await Resume.findOne({ user: userId });

    const sessionCode = `VID-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newVideoSession = await VideoInterview.create({
      user: userId,
      sessionId: sessionCode,
      title: title || `Video Interview - ${role}`,
      role: role || 'Software Developer',
      difficulty: difficulty || 'Medium',
      transcript: []
    });

    let generatedQuestions = [];
    try {
      generatedQuestions = await aiService.generateInterviewQuestions(
        user,
        resumeData,
        { role: role || 'Software Developer', company: 'General', difficulty: difficulty || 'Medium', questionCount: questionCount || 3, interviewType: 'Technical' }
      );
    } catch (err) {
      console.warn('[Video AI] Question generation fallback:', err.message);
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      generatedQuestions = [
        { question: 'Describe your experience working with modern JavaScript frameworks and standard libraries.', topic: 'Technical' },
        { question: 'How do you design scalable APIs and manage states across client applications?', topic: 'System Design' },
        { question: 'Tell me about a time you had to optimize performance for a slow application feature.', topic: 'Optimization' }
      ];
    }

    const formattedQuestions = generatedQuestions.map((q, idx) => ({
      questionNumber: idx + 1,
      topic: q.topic || 'General',
      questionText: q.question || q.questionText,
      transcriptText: '',
      score: 0,
      feedback: ''
    }));

    newVideoSession.transcript = formattedQuestions;
    await newVideoSession.save();

    res.status(201).json({
      success: true,
      session: newVideoSession
    });
  } catch (error) {
    next(error);
  }
};

// Helper to find video and parent session with any ID format (Custom ID or Mongo ID)
const findVideoSessionFlexibly = async (sessionCode, userId) => {
  if (!sessionCode) return { parentSession: null, videoSession: null };
  const isMongoId = mongoose.Types.ObjectId.isValid(sessionCode) && String(new mongoose.Types.ObjectId(sessionCode)) === String(sessionCode);

  const parentSession = await InterviewSession.findOne({
    $or: [
      { interviewId: sessionCode },
      ...(isMongoId ? [{ _id: sessionCode }] : [])
    ],
    user: userId
  });

  let videoSession = await VideoInterview.findOne({
    $or: [
      { sessionId: sessionCode },
      ...(parentSession ? [{ sessionId: parentSession.interviewId }, { sessionId: parentSession._id.toString() }] : []),
      ...(isMongoId ? [{ _id: sessionCode }] : [])
    ],
    user: userId
  });

  return { parentSession, videoSession };
};

// 2. Upload video recording file
exports.uploadVideoFile = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const { videoSession: session } = await findVideoSessionFlexibly(sessionId, req.user._id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Video session not found' });
    }

    // Save relative public path
    const relativePath = `/uploads/videos/${req.file.filename}`;
    session.videoUrl = relativePath;
    await session.save();

    res.status(200).json({
      success: true,
      videoUrl: relativePath
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions for word metrics
const countFillerWords = (text) => {
  if (!text) return 0;
  const matches = text.toLowerCase().match(/\b(um|uh|like|you know|actually|basically)\b/g);
  return matches ? matches.length : 0;
};

const calculateSpeakingRate = (text, startTime, endTime) => {
  if (!text || !startTime || !endTime) return 120;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const durationMin = (endTime - startTime) / 60000;
  return durationMin > 0.05 ? Math.round(wordCount / durationMin) : 120;
};

// 3. Complete and evaluate session
exports.evaluateSession = async (req, res, next) => {
  try {
    const {
      sessionId,
      answers, // array of { questionNumber, startTime, endTime, questionMetrics, transcriptText }
      eyeContactScore,
      facialConfidence,
      confidenceScore,
      communicationScore,
      fillerWords,
      bodyLanguage, // { posture, headMovement, smileFrequency }
      speakingSpeed,
      emotions, // { happy, neutral, surprised, nervous }
      timeline, // array of { timestamp, eventType, description }
      videoMetrics
    } = req.body;

    const { videoSession: session, parentSession } = await findVideoSessionFlexibly(sessionId, req.user._id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Video session not found' });
    }

    // Merge answers into session transcripts
    const updatedTranscripts = session.transcript.map(t => {
      const match = (answers || []).find(a => a.questionNumber === t.questionNumber);
      return {
        ...t.toObject(),
        startTime: match ? match.startTime : null,
        endTime: match ? match.endTime : null,
        questionMetrics: match ? match.questionMetrics : null,
        transcriptText: match ? (match.transcriptText || '') : ''
      };
    });

    const aiAnalysis = await generateAICoachVideoGrading(session, updatedTranscripts, {
      eyeContactScore: videoMetrics ? videoMetrics.eyeContactPercentage : (eyeContactScore || 80),
      speakingSpeed: speakingSpeed || 120,
      fillerWords: fillerWords || 0,
      emotions: emotions || { happy: 10, neutral: 80, surprised: 0, nervous: 10 },
      bodyLanguage: bodyLanguage || { posture: 'Good', headMovement: 'Normal', smileFrequency: 'Normal' },
      facialConfidence: facialConfidence || 80
    });

    // Populate question-level evaluations
    const evaluatedQuestions = updatedTranscripts.map(ans => {
      const qEvents = (timeline || []).filter(evt => {
        let evtTime = new Date(evt.timestamp).getTime();
        if (isNaN(evtTime) && typeof evt.timestamp === 'string' && evt.timestamp.includes(':')) {
          const parts = evt.timestamp.split(':');
          const offsetSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          const baseTime = session.createdAt ? new Date(session.createdAt).getTime() : (ans.startTime - 5000);
          evtTime = baseTime + offsetSec * 1000;
        }
        return evtTime >= ans.startTime && evtTime <= ans.endTime;
      });

      let qProcScore = 100;
      qEvents.forEach(evt => {
        const typeUpper = (evt.eventType || '').toUpperCase();
        if (typeUpper === 'LOOKING_AWAY' || typeUpper === 'LOOK-AWAY') qProcScore -= 10;
        if (typeUpper === 'NO_FACE' || typeUpper === 'NO-FACE') qProcScore -= 20;
        if (typeUpper === 'TAB_HIDDEN' || typeUpper === 'TAB-HIDDEN') qProcScore -= 25;
        if (typeUpper === 'WINDOW_BLUR' || typeUpper === 'WINDOW-BLUR') qProcScore -= 15;
      });
      qProcScore = Math.max(0, qProcScore);

      const qMetrics = ans.questionMetrics || {
        eyeContactPercentage: 80,
        centerFacingPercentage: 80,
        facePresencePercentage: 95,
        expressionDistribution: { neutral: 80, smile: 10, frown: 5, surprise: 5 }
      };

      const qEye = qMetrics.eyeContactPercentage || 80;
      const qCenter = qMetrics.centerFacingPercentage || 80;
      const qFace = qMetrics.facePresencePercentage || 95;
      const qExpr = Math.min(100, (qMetrics.expressionDistribution?.neutral || 0) + (qMetrics.expressionDistribution?.smile || 0));
      
      const qVideoScore = Math.round(
        (qEye * 0.40) +
        (qCenter * 0.25) +
        (qExpr * 0.20) +
        (qFace * 0.15)
      );

      const ansCheck = sanitizeAndCheckAnswer(ans.transcriptText, ans.questionText);
      const match = (aiAnalysis.questionEvaluations || []).find(e => e.questionNumber === ans.questionNumber);

      if (!ansCheck.answered) {
        // Question was not answered verbally
        return {
          questionNumber: ans.questionNumber,
          topic: ans.topic || 'General',
          questionText: ans.questionText,
          transcriptText: '',
          startTime: ans.startTime,
          endTime: ans.endTime,
          score: 0,
          feedback: 'No verbal answer recorded for this question.',
          answer: {
            transcript: '',
            transcriptConfidence: 0,
            answered: false,
            answerStatus: 'NO_ANSWER',
            answerScore: 0,
            technicalAccuracy: 0,
            completeness: 0,
            relevance: 0,
            reasoning: 0,
            clarity: 0,
            expectedConcepts: match ? (match.expectedConcepts || []) : [],
            coveredConcepts: [],
            missingConcepts: ['No verbal answer provided'],
            strengths: [],
            weaknesses: ['No verbal answer was spoken or recorded for this question.']
          },
          video: {
            facePresencePercentage: qFace,
            cameraAlignmentPercentage: qCenter,
            eyeContactPercentage: qEye,
            expressionDistribution: qMetrics.expressionDistribution || { neutral: 80, smile: 10, frown: 5, surprise: 5 },
            headPoseDistribution: { neutral: qCenter, active: 100 - qCenter },
            fillerWordCount: 0,
            speakingRate: 0,
            videoDeliveryScore: qVideoScore
          },
          proctoring: {
            events: qEvents.map(e => ({
              timestamp: e.timestamp,
              eventType: e.eventType,
              description: e.description,
              durationMs: e.durationMs || 2000
            })),
            proctoringScore: qProcScore
          },
          finalQuestionScore: 0
        };
      }

      // Question was answered verbally
      const ansScore = match && typeof match.answerScore === 'number' ? match.answerScore : 60;
      let finalQScore = Math.round((ansScore * 0.70) + (qVideoScore * 0.20) + (qProcScore * 0.10));
      if (ansScore < 40) finalQScore = Math.min(50, finalQScore);
      if (ansScore < 25) finalQScore = Math.min(30, finalQScore);

      return {
        questionNumber: ans.questionNumber,
        topic: ans.topic || 'General',
        questionText: ans.questionText,
        transcriptText: ans.transcriptText,
        startTime: ans.startTime,
        endTime: ans.endTime,
        score: finalQScore,
        feedback: match?.feedback || 'Solid response.',
        answer: {
          transcript: ans.transcriptText,
          transcriptConfidence: ans.transcriptConfidence || 90,
          answered: true,
          answerStatus: match?.answerStatus || 'ANSWERED',
          answerScore: ansScore,
          technicalAccuracy: match && typeof match.technicalAccuracy === 'number' ? match.technicalAccuracy : ansScore,
          completeness: match && typeof match.completeness === 'number' ? match.completeness : ansScore,
          relevance: match && typeof match.relevance === 'number' ? match.relevance : ansScore,
          reasoning: match && typeof match.reasoning === 'number' ? match.reasoning : ansScore,
          clarity: match && typeof match.clarity === 'number' ? match.clarity : ansScore,
          expectedConcepts: match ? (match.expectedConcepts || []) : [],
          coveredConcepts: match ? (match.coveredConcepts || []) : [],
          missingConcepts: match ? (match.missingConcepts || []) : [],
          strengths: match ? (match.strengths || []) : [],
          weaknesses: match ? (match.weaknesses || []) : []
        },
        video: {
          facePresencePercentage: qFace,
          cameraAlignmentPercentage: qCenter,
          eyeContactPercentage: qEye,
          expressionDistribution: qMetrics.expressionDistribution || { neutral: 80, smile: 10, frown: 5, surprise: 5 },
          headPoseDistribution: { neutral: qCenter, active: 100 - qCenter },
          fillerWordCount: countFillerWords(ans.transcriptText),
          speakingRate: calculateSpeakingRate(ans.transcriptText, ans.startTime, ans.endTime),
          videoDeliveryScore: qVideoScore
        },
        proctoring: {
          events: qEvents.map(e => ({
            timestamp: e.timestamp,
            eventType: e.eventType,
            description: e.description,
            durationMs: e.durationMs || 2000
          })),
          proctoringScore: qProcScore
        },
        finalQuestionScore: finalQScore
      };
    });

    // Run deterministic interview score aggregation
    const scoreResult = calculateInterviewScore({
      evaluatedQuestions,
      videoMetrics,
      timeline,
      speakingSpeed,
      fillerWords
    });

    session.transcript = evaluatedQuestions;
    session.timeline = timeline || [];
    if (videoMetrics) {
      session.videoMetrics = videoMetrics;
    }

    session.totalQuestions = scoreResult.totalQuestions;
    session.answeredQuestions = scoreResult.answeredQuestions;
    session.answerCoverage = scoreResult.answerCoverage;
    session.technicalScore = scoreResult.technicalScore;
    session.overallAnswerQualityScore = scoreResult.technicalQuality;
    session.videoDeliveryScore = scoreResult.videoDeliveryScore;
    session.proctoringScore = scoreResult.proctoringScore;
    session.overallScore = scoreResult.overallScore;
    session.eyeContactScore = scoreResult.overallEyePct;
    session.facialConfidence = scoreResult.videoDeliveryScore;
    session.communicationScore = scoreResult.communicationScore;
    session.voiceScore = scoreResult.voiceScore;
    session.confidenceScore = scoreResult.confidenceScore;
    session.fillerWords = scoreResult.answeredQuestions > 0 ? (fillerWords || countFillerWords(answers.map(a => a.transcriptText).join(' '))) : 0;
    session.speakingSpeed = scoreResult.answeredQuestions > 0 ? (speakingSpeed || 120) : 0;

    session.bodyLanguage = {
      posture: scoreResult.overallCenterPct > 75 ? 'Good Posture' : 'Leaning / Asymmetric',
      headMovement: videoMetrics && Math.abs(videoMetrics.averageYaw) > 10 ? 'High' : 'Normal',
      smileFrequency: videoMetrics && videoMetrics.expressionDistribution && videoMetrics.expressionDistribution.smile > 20 ? 'High' : 'Normal'
    };

    session.emotions = emotions || {
      happy: videoMetrics && videoMetrics.expressionDistribution ? videoMetrics.expressionDistribution.smile : 10,
      neutral: videoMetrics && videoMetrics.expressionDistribution ? videoMetrics.expressionDistribution.neutral : 80,
      surprised: videoMetrics && videoMetrics.expressionDistribution ? videoMetrics.expressionDistribution.surprise : 5,
      nervous: videoMetrics && videoMetrics.expressionDistribution ? videoMetrics.expressionDistribution.frown : 5
    };

    session.report = {
      overallFeedback: aiAnalysis.overallFeedback,
      strengths: scoreResult.answeredQuestions > 0 ? (aiAnalysis.strengths || []) : [],
      focusGaps: aiAnalysis.focusGaps || [],
      recommendations: aiAnalysis.recommendations || [],
      learningRoadmap: scoreResult.answeredQuestions > 0 ? (aiAnalysis.learningRoadmap || []) : []
    };

    session.status = 'Completed';
    session.completedAt = new Date();

    await session.save();

    console.log(`[Evaluation] Session ID: ${session.sessionId}`);
    console.log(`[Evaluation] Questions: Total = ${scoreResult.totalQuestions}, Answered = ${scoreResult.answeredQuestions}, Coverage = ${scoreResult.answerCoverage}%`);
    console.log(`[Evaluation] Technical Quality: ${scoreResult.technicalQuality}%, Technical Score (Scaled): ${scoreResult.technicalScore}%`);
    console.log(`[Evaluation] Video Delivery: ${scoreResult.videoDeliveryScore}%, Proctoring: ${scoreResult.proctoringScore}%, Comm: ${scoreResult.communicationScore}%, Voice: ${scoreResult.voiceScore}%`);
    console.log(`[Evaluation] Final Overall Score: ${scoreResult.overallScore}%`);

    // Sync parent InterviewSession status and overallScore to Completed
    const isMongoId = mongoose.Types.ObjectId.isValid(sessionId) && String(new mongoose.Types.ObjectId(sessionId)) === String(sessionId);
    await InterviewSession.updateOne(
      {
        $or: [
          { interviewId: sessionId },
          { interviewId: session.sessionId },
          ...(isMongoId ? [{ _id: sessionId }] : [])
        ],
        user: req.user._id
      },
      {
        $set: {
          status: 'Completed',
          progress: 100,
          overallScore: scoreResult.overallScore,
          completedAt: new Date()
        }
      }
    );

    // Trigger update to the general UserLearningProfile in the background
    try {
      const learningController = require('./learningController');
      await learningController.updateProfile(req.user._id);
    } catch (e) {
      console.warn('[Video AI] Could not update UserLearningProfile:', e.message);
    }

    res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('[Backend Evaluation Error] evaluateSession failed:', {
      message: error.message,
      stack: error.stack,
      sessionId: req.body ? req.body.sessionId : 'N/A'
    });
    next(error);
  }
};

const syncVideoSessionQuestions = async (sessionCode, userId) => {
  const isMongoId = mongoose.Types.ObjectId.isValid(sessionCode) && String(new mongoose.Types.ObjectId(sessionCode)) === String(sessionCode);

  const parentSession = await InterviewSession.findOne({
    $or: [
      { interviewId: sessionCode },
      ...(isMongoId ? [{ _id: sessionCode }] : [])
    ],
    user: userId
  });

  let videoSession = await VideoInterview.findOne({
    $or: [
      { sessionId: sessionCode },
      ...(parentSession ? [{ sessionId: parentSession.interviewId }, { sessionId: parentSession._id.toString() }] : []),
      ...(isMongoId ? [{ _id: sessionCode }] : [])
    ],
    user: userId
  });

  if (parentSession) {
    const questions = await InterviewQuestion.find({ sessionId: parentSession._id }).sort({ questionNumber: 1 });

    if (!videoSession) {
      try {
        videoSession = await VideoInterview.create({
          user: userId,
          sessionId: parentSession.interviewId,
          title: parentSession.title || `AI Video Interview - ${parentSession.role}`,
          role: parentSession.role,
          difficulty: parentSession.difficulty,
          transcript: []
        });
        console.log(`[Video Sync] VideoInterview created & loaded: ${videoSession._id}`);
      } catch (createErr) {
        videoSession = await VideoInterview.findOne({
          sessionId: parentSession.interviewId,
          user: userId
        });
      }
    }

    if (videoSession && questions.length > 0 && (!videoSession.transcript || videoSession.transcript.length === 0)) {
      const formattedQuestions = questions.map((q, idx) => ({
        questionNumber: idx + 1,
        topic: q.topic || 'General',
        questionText: q.question,
        transcriptText: '',
        score: 0,
        feedback: ''
      }));

      await VideoInterview.updateOne(
        { _id: videoSession._id },
        { $set: { transcript: formattedQuestions } }
      );
      // Reload session
      videoSession = await VideoInterview.findById(videoSession._id);
      console.log(`[Video Sync] Questions copied: ${questions.length}`);
    }

    return { parentSession, videoSession, questionsCount: (videoSession && videoSession.transcript ? videoSession.transcript.length : 0) || questions.length };
  }

  if (videoSession) {
    return { parentSession: null, videoSession, questionsCount: videoSession.transcript ? videoSession.transcript.length : 0 };
  }

  return { parentSession: null, videoSession: null, questionsCount: 0 };
};

// 4. Get session evaluation report
exports.getReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { parentSession, videoSession, questionsCount } = await syncVideoSessionQuestions(id, req.user._id);

    const isMongoId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    if (videoSession && videoSession.status === 'Completed') {
      console.log(`[Report] Received ID: ${id}`);
      console.log(`[Report] Resolved session: ${videoSession.sessionId}`);
    } else {
      console.log(`[Resume] Received ID: ${id}`);
      console.log(`[Resume] ID type: ${isMongoId ? 'MongoDB ObjectId' : 'Custom sessionId'}`);
      console.log(`[Resume] Resolved InterviewSession: ${parentSession ? parentSession.interviewId : 'null'}`);
      console.log(`[Resume] Resolved VideoInterview: ${videoSession ? videoSession.sessionId : 'null'}`);
    }

    if (!videoSession) {
      return res.status(404).json({ success: false, message: 'Video interview session not found' });
    }

    if (questionsCount === 0 && parentSession && (parentSession.status === 'Creating' || parentSession.status === 'Generating')) {
      return res.status(200).json({
        success: true,
        session: videoSession,
        status: 'generating',
        message: 'Preparing AI questions...'
      });
    }

    res.status(200).json({
      success: true,
      session: videoSession,
      status: 'completed'
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get all video interview histories
exports.getHistory = async (req, res, next) => {
  try {
    const history = await VideoInterview.find({ user: req.user._id, status: 'Completed' }).sort({ completedAt: -1 });
    res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    next(error);
  }
};

// 6. Terminate interview session in between
exports.terminateSession = async (req, res, next) => {
  try {
    const { sessionId, reason } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    const VideoInterview = require('../models/VideoInterview');
    const InterviewSession = require('../models/InterviewSession');

    // 1. Update VideoInterview
    let videoSession = await VideoInterview.findOne({ sessionId });
    if (!videoSession && mongoose.Types.ObjectId.isValid(sessionId)) {
      videoSession = await VideoInterview.findById(sessionId);
    }
    if (videoSession) {
      videoSession.status = 'Terminated';
      await videoSession.save();
    }

    // 2. Update parent InterviewSession
    let parentSession = await InterviewSession.findOne({ interviewId: sessionId });
    if (!parentSession && mongoose.Types.ObjectId.isValid(sessionId)) {
      parentSession = await InterviewSession.findById(sessionId);
    }
    if (parentSession) {
      parentSession.status = 'Terminated';
      await parentSession.save();
    }

    console.log(`[Video Controller] Session ${sessionId} marked as Terminated (Reason: ${reason || 'User cancelled'})`);

    res.status(200).json({
      success: true,
      message: 'Interview session terminated successfully'
    });
  } catch (error) {
    next(error);
  }
};
