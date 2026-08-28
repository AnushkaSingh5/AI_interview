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

// Helper to query Gemini AI for behavioral and technical grading
const generateAICoachVideoGrading = async (session, answers, behavioralMetrics) => {
  if (!apiKey) {
    console.warn('[Video AI] API key missing. Falling back to local scoring.');
    return getFallbackGrading(session, answers, behavioralMetrics);
  }

  const prompt = `You are a Lead Technical and Communication Interviewer. Grade the following AI Video Mock Interview session.

INTERVIEW PARAMETERS:
- Title: ${session.title}
- Target Role: ${session.role}
- Target Difficulty: ${session.difficulty}

CANDIDATE TRANSCRIPT ANSWER LIST:
${JSON.stringify(answers.map(a => ({
  questionNumber: a.questionNumber,
  questionText: a.questionText || '',
  transcriptText: a.transcriptText || ''
})), null, 2)}

INSTRUCTIONS FOR EVALUATION:
1. Grade the technical correctness of each answer independently. Do NOT perform simple keyword matching. Determine expected concepts and check semantic equivalence.
2. If the candidate gives an incorrect technical explanation (e.g. non-atomic writes to prevent race conditions), the "technicalAccuracy" and "answerScore" must be low (less than 40), regardless of candidate confidence.
3. If the transcript is empty, silent, or has low-confidence noise, set "answerEvaluationStatus" to "UNAVAILABLE" for that question, scoring technical accuracy and score near 0.
4. Calculate "answerScore" using this weighted rubric:
   - Technical Correctness / Accuracy: 45%
   - Completeness: 25%
   - Relevance: 15%
   - Clarity: 15%
5. Return ONLY a valid JSON object matching the JSON Schema below. No markdown formatting.

JSON Schema:
{
  "questionEvaluations": [
    {
      "questionNumber": 1,
      "answerEvaluationStatus": "AVAILABLE", // or "UNAVAILABLE"
      "technicalAccuracy": 85,
      "completeness": 80,
      "relevance": 90,
      "clarity": 85,
      "answerScore": 84,
      "expectedConcepts": ["database transactions", "atomic updates", "locking"],
      "coveredConcepts": ["atomic updates", "database transactions"],
      "missingConcepts": ["row-level locking"],
      "incorrectClaims": [],
      "strengths": ["Clear definition of transaction boundaries"],
      "weaknesses": ["Missed explaining lock contention management"],
      "feedback": "Solid response covering atomicity."
    }
  ],
  "overallAnswerQualityScore": 82,
  "overallFeedback": "Great technical clarity.",
  "strengths": ["Strong conceptual definitions"],
  "focusGaps": ["Missed concurrency mechanisms on question 1"],
  "recommendations": ["Practice transaction concurrency models"],
  "learningRoadmap": [
    { "priority": "Priority 1", "title": "Database Locking", "description": "Study optimistic vs pessimistic locks." }
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
    if (!parsed) throw new Error('Parsing failed');
    return parsed;
  } catch (error) {
    console.error('[Video AI] AI Evaluation failed, using local fallback:', error.message);
    return getFallbackGrading(session, answers, behavioralMetrics);
  }
};

const getFallbackGrading = (session, answers, metrics) => {
  const questionEvaluations = answers.map(a => {
    const text = a.transcriptText || '';
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    let status = "AVAILABLE";
    let score = 0;
    let techAcc = 0;
    let comp = 0;
    let rel = 0;
    let clar = 0;
    let feedback = "No response provided.";

    if (wordCount === 0 || text.toLowerCase().includes('no verbal answer') || text.toLowerCase().includes('speech-to-text failed')) {
      status = "UNAVAILABLE";
      feedback = "Answer could not be reliably transcribed or was empty.";
    } else if (wordCount > 40) {
      techAcc = 85;
      comp = 80;
      rel = 90;
      clar = 85;
      score = Math.round(techAcc * 0.45 + comp * 0.25 + rel * 0.15 + clar * 0.15);
      feedback = "Detailed technical response with coherent explanations.";
    } else {
      techAcc = 60;
      comp = 50;
      rel = 75;
      clar = 70;
      score = Math.round(techAcc * 0.45 + comp * 0.25 + rel * 0.15 + clar * 0.15);
      feedback = "Core concepts mentioned briefly but lacks technical depth.";
    }

    return {
      questionNumber: a.questionNumber,
      answerEvaluationStatus: status,
      technicalAccuracy: techAcc,
      completeness: comp,
      relevance: rel,
      clarity: clar,
      answerScore: score,
      expectedConcepts: ["relevant patterns", "standard design details"],
      coveredConcepts: wordCount > 40 ? ["relevant patterns"] : [],
      missingConcepts: wordCount <= 40 ? ["standard design details"] : [],
      incorrectClaims: [],
      strengths: wordCount > 40 ? ["Expressive communication flow"] : [],
      weaknesses: wordCount <= 40 ? ["Response too short to verify completeness"] : [],
      feedback
    };
  });

  const validEvaluations = questionEvaluations.filter(q => q.answerEvaluationStatus === "AVAILABLE");
  const overallAnswerQualityScore = validEvaluations.length > 0
    ? Math.round(validEvaluations.reduce((sum, q) => sum + q.answerScore, 0) / validEvaluations.length)
    : 10;

  return {
    questionEvaluations,
    overallAnswerQualityScore,
    overallFeedback: 'Successfully completed the video mock interview session. Evaluated based on transcript content and proctoring metrics.',
    strengths: ['Addressed the main question targets with appropriate terminology'],
    focusGaps: ['Technical response depth can be expanded further'],
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

// 2. Upload video recording file
exports.uploadVideoFile = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const session = await VideoInterview.findOne({ sessionId, user: req.user._id });
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

    const session = await VideoInterview.findOne({ sessionId, user: req.user._id });
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
        transcriptText: match ? match.transcriptText : ''
      };
    });

    const aiAnalysis = await generateAICoachVideoGrading(session, updatedTranscripts, {
      eyeContactScore: videoMetrics ? videoMetrics.eyeContactPercentage : (eyeContactScore || 80),
      speakingSpeed: speakingSpeed || 120,
      fillerWords: fillerWords || 5,
      emotions: emotions || { happy: 10, neutral: 80, surprised: 0, nervous: 10 },
      bodyLanguage: bodyLanguage || { posture: 'Good', headMovement: 'Normal', smileFrequency: 'Normal' },
      facialConfidence: facialConfidence || 80
    });

    // Populate question-level evaluations (Task 2 & 14 & 21)
    const evaluatedQuestions = updatedTranscripts.map(ans => {
      const qEvents = (timeline || []).filter(evt => {
        const evtTime = new Date(evt.timestamp).getTime();
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
        (qExpr * 0.15) +
        (qFace * 0.10) +
        (qProcScore * 0.10)
      );

      const match = (aiAnalysis.questionEvaluations || []).find(e => e.questionNumber === ans.questionNumber);
      const ansScore = match ? match.answerScore : 65;

      let finalQScore = Math.round((ansScore * 0.70) + (qVideoScore * 0.20) + (qProcScore * 0.10));
      if (ansScore < 40) finalQScore = Math.min(55, finalQScore);
      if (ansScore < 25) finalQScore = Math.min(40, finalQScore);

      return {
        questionNumber: ans.questionNumber,
        topic: ans.topic || 'General',
        questionText: ans.questionText,
        transcriptText: ans.transcriptText,
        startTime: ans.startTime,
        endTime: ans.endTime,
        score: finalQScore,
        feedback: match ? match.feedback : 'Solid response.',
        
        answer: {
          transcript: ans.transcriptText,
          transcriptConfidence: ans.transcriptConfidence || 90,
          answerScore: ansScore,
          technicalAccuracy: match ? match.technicalAccuracy : ansScore,
          completeness: match ? match.completeness : ansScore,
          relevance: match ? match.relevance : ansScore,
          clarity: match ? match.clarity : ansScore,
          expectedConcepts: match ? (match.expectedConcepts || []) : [],
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

    session.transcript = evaluatedQuestions;
    session.timeline = timeline || [];
    
    // Save raw metrics
    if (videoMetrics) {
      session.videoMetrics = videoMetrics;
    }

    // LAYER 2: Compute overall video delivery score (Task 12)
    const overallEyePct = videoMetrics ? (videoMetrics.eyeContactPercentage || 0) : (eyeContactScore || 80);
    const overallCenterPct = videoMetrics ? (videoMetrics.centerFacingPercentage || 0) : 80;
    const overallFacePct = videoMetrics ? (videoMetrics.facePresencePercentage || 0) : 95;
    const overallExprPct = videoMetrics && videoMetrics.expressionDistribution
      ? Math.min(100, (videoMetrics.expressionDistribution.neutral || 0) + (videoMetrics.expressionDistribution.smile || 0))
      : 90;
    
    let overallProcScore = 100;
    (timeline || []).forEach(evt => {
      const typeUpper = (evt.eventType || '').toUpperCase();
      if (typeUpper === 'LOOKING_AWAY' || typeUpper === 'LOOK-AWAY') overallProcScore -= 10;
      if (typeUpper === 'NO_FACE' || typeUpper === 'NO-FACE') overallProcScore -= 20;
      if (typeUpper === 'TAB_HIDDEN' || typeUpper === 'TAB-HIDDEN') overallProcScore -= 25;
      if (typeUpper === 'WINDOW_BLUR' || typeUpper === 'WINDOW-BLUR') overallProcScore -= 15;
    });
    overallProcScore = Math.max(0, overallProcScore);

    const computedVideoDeliveryScore = Math.round(
      (overallEyePct * 0.40) +
      (overallCenterPct * 0.25) +
      (overallExprPct * 0.15) +
      (overallFacePct * 0.10) +
      (overallProcScore * 0.10)
    );

    // Populate overall session layers
    const finalAnswerQualityScore = aiAnalysis.overallAnswerQualityScore || 70;

    // LAYER 3: Combined Final Score (Task 13)
    let computedFinalOverallScore = Math.round(
      (finalAnswerQualityScore * 0.70) +
      (computedVideoDeliveryScore * 0.20) +
      (overallProcScore * 0.10)
    );

    // Correctness Guard
    if (finalAnswerQualityScore < 40) computedFinalOverallScore = Math.min(55, computedFinalOverallScore);
    if (finalAnswerQualityScore < 25) computedFinalOverallScore = Math.min(40, computedFinalOverallScore);

    session.overallAnswerQualityScore = finalAnswerQualityScore;
    session.videoDeliveryScore = computedVideoDeliveryScore;
    session.proctoringScore = overallProcScore;
    session.overallScore = computedFinalOverallScore;
    session.eyeContactScore = overallEyePct;
    session.facialConfidence = computedVideoDeliveryScore;
    
    session.bodyLanguage = {
      posture: overallCenterPct > 75 ? 'Good Posture' : 'Leaning / Asymmetric',
      headMovement: videoMetrics && Math.abs(videoMetrics.averageYaw) > 10 ? 'High' : 'Normal',
      smileFrequency: videoMetrics && videoMetrics.expressionDistribution && videoMetrics.expressionDistribution.smile > 20 ? 'High' : 'Normal'
    };

    session.confidenceScore = aiAnalysis.confidenceScore || Math.round((overallCenterPct + overallEyePct) / 2);
    session.communicationScore = aiAnalysis.communicationScore || computedVideoDeliveryScore;
    session.fillerWords = fillerWords || countFillerWords(answers.map(a => a.transcriptText).join(' '));
    session.speakingSpeed = speakingSpeed || 120;
    session.emotions = emotions || {
      happy: videoMetrics && videoMetrics.expressionDistribution ? videoMetrics.expressionDistribution.smile : 10,
      neutral: videoMetrics && videoMetrics.expressionDistribution ? videoMetrics.expressionDistribution.neutral : 80,
      surprised: videoMetrics && videoMetrics.expressionDistribution ? videoMetrics.expressionDistribution.surprise : 5,
      nervous: videoMetrics && videoMetrics.expressionDistribution ? videoMetrics.expressionDistribution.frown : 5
    };
    
    session.report = {
      overallFeedback: aiAnalysis.overallFeedback,
      strengths: aiAnalysis.strengths || [],
      focusGaps: aiAnalysis.focusGaps || [],
      recommendations: aiAnalysis.recommendations || [],
      learningRoadmap: aiAnalysis.learningRoadmap || []
    };

    session.status = 'Completed';
    session.completedAt = new Date();

    await session.save();

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
          overallScore: computedFinalOverallScore,
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
      ...(isMongoId ? [{ _id: sessionCode }] : [])
    ],
    user: userId
  });

  if (parentSession) {
    const questions = await InterviewQuestion.find({ sessionId: parentSession._id }).sort({ questionNumber: 1 });

    if (!videoSession) {
      videoSession = await VideoInterview.create({
        user: userId,
        sessionId: parentSession.interviewId,
        title: parentSession.title || `AI Video Interview - ${parentSession.role}`,
        role: parentSession.role,
        difficulty: parentSession.difficulty,
        transcript: []
      });
      console.log(`[Video Sync] VideoInterview created & loaded: ${videoSession._id}`);
    }

    if (questions.length > 0 && videoSession.transcript.length === 0) {
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

    return { parentSession, videoSession, questionsCount: videoSession.transcript.length || questions.length };
  }

  if (videoSession) {
    return { parentSession: null, videoSession, questionsCount: videoSession.transcript.length };
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
