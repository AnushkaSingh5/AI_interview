const mongoose = require('mongoose');
const VoiceInterview = require('../models/VoiceInterview');
const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
const User = require('../models/User');
const ResumeData = require('../models/ResumeData');
const aiService = require('../services/aiService');

// Filler words list for verbal communication detection
const FILLER_WORDS_LIST = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'so', 'right', 'i mean', 'sort of', 'kind of'];

// Helper to detect filler words
const detectFillerWords = (text) => {
  if (!text) return { count: 0, detected: [] };
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const detected = [];

  words.forEach(w => {
    const cleanW = w.replace(/[^a-z]/g, '');
    if (FILLER_WORDS_LIST.includes(cleanW)) {
      detected.push(cleanW);
    }
  });

  return {
    count: detected.length,
    detected
  };
};

/**
 * Sequential execution queue per session to serialize concurrent HTTP requests per session
 */
const sessionLocks = new Map();

const withSessionLock = async (sessionId, asyncFn) => {
  const key = String(sessionId);
  const previousPromise = sessionLocks.get(key) || Promise.resolve();

  const currentPromise = (async () => {
    try {
      await previousPromise;
    } catch (e) {}
    return await asyncFn();
  })();

  sessionLocks.set(key, currentPromise);

  try {
    return await currentPromise;
  } finally {
    if (sessionLocks.get(key) === currentPromise) {
      sessionLocks.delete(key);
    }
  }
};

/**
 * Safe Helper to find VoiceInterview session by either Mongo _id OR string sessionId (e.g. INT-EF7116-6618).
 * Prevents CastError when Mongoose tries to cast string codes into Mongo ObjectId.
 */
const findVoiceSession = async (idOrSessionId, userId) => {
  if (!idOrSessionId) return null;
  const strVal = String(idOrSessionId).trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(strVal) && String(new mongoose.Types.ObjectId(strVal)) === strVal;

  if (isMongoId) {
    return await VoiceInterview.findOne({
      $or: [{ _id: strVal }, { sessionId: strVal }],
      user: userId
    });
  } else {
    return await VoiceInterview.findOne({
      sessionId: strVal,
      user: userId
    });
  }
};

/**
 * Syncs questions from parent InterviewSession / InterviewQuestion into VoiceInterview document.
 * Adds explicit logging as required.
 */
const syncVoiceSessionQuestions = async (sessionCode, userId) => {
  const isMongoId = mongoose.Types.ObjectId.isValid(sessionCode) && String(new mongoose.Types.ObjectId(sessionCode)) === String(sessionCode);

  const parentSession = await InterviewSession.findOne({
    $or: [
      { interviewId: sessionCode },
      ...(isMongoId ? [{ _id: sessionCode }] : [])
    ],
    user: userId
  });

  let voiceSession = await VoiceInterview.findOne({
    $or: [
      { sessionId: sessionCode },
      ...(isMongoId ? [{ _id: sessionCode }] : [])
    ],
    user: userId
  });

  if (parentSession) {
    const questions = await InterviewQuestion.find({ sessionId: parentSession._id }).sort({ questionNumber: 1 });

    if (!voiceSession) {
      voiceSession = await VoiceInterview.create({
        user: userId,
        sessionId: parentSession.interviewId,
        sessionTitle: parentSession.title || `AI Voice Interview - ${parentSession.role}`,
        role: parentSession.role,
        difficulty: parentSession.difficulty,
        questionCount: parentSession.questionCount || questions.length || 5
      });
      console.log(`[Voice Sync] VoiceInterview created & loaded: ${voiceSession._id}`);
    }

    if (questions.length > 0 && voiceSession.questions.length === 0) {
      const formattedQuestions = questions.map((q, idx) => ({
        questionNumber: idx + 1,
        topic: q.topic || 'General',
        questionText: q.question,
        expectedAnswer: q.expectedAnswer || 'Clear technical explanation and articulate communication.'
      }));

      await VoiceInterview.updateOne(
        { _id: voiceSession._id },
        { $set: { questions: formattedQuestions } }
      );
      console.log(`[Voice Sync] Questions copied: ${questions.length}`);
    }

    console.log(`[Voice Sync] Voice session loaded: ${parentSession.interviewId} (${voiceSession.questions.length || questions.length} questions)`);
    return { parentSession, voiceSession, questionsCount: voiceSession.questions.length || questions.length };
  }

  if (voiceSession) {
    console.log(`[Voice Sync] Voice session loaded: ${voiceSession.sessionId} (${voiceSession.questions.length} questions)`);
    return { parentSession: null, voiceSession, questionsCount: voiceSession.questions.length };
  }

  return { parentSession: null, voiceSession: null, questionsCount: 0 };
};

// @desc    Start or sync Voice Interview session
// @route   POST /api/voice/start
// @access  Private
exports.startVoiceSession = async (req, res, next) => {
  try {
    const { sessionId, interviewId, role = 'Software Engineer', difficulty = 'Medium', questionCount = 5, sessionTitle } = req.body;
    const userId = req.user._id;

    const sessionCode = sessionId || interviewId || `INT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { parentSession, voiceSession: syncedVoiceSession, questionsCount } = await syncVoiceSessionQuestions(sessionCode, userId);

    if (syncedVoiceSession) {
      if (questionsCount === 0 && parentSession && (parentSession.status === 'Creating' || parentSession.status === 'Generating')) {
        return res.status(200).json({
          success: true,
          session: syncedVoiceSession,
          status: 'generating',
          message: 'Preparing AI questions...'
        });
      }

      return res.status(200).json({
        success: true,
        session: syncedVoiceSession,
        status: 'completed'
      });
    }

    const user = await User.findById(userId);
    const resumeData = await ResumeData.findOne({ user: userId });

    const title = sessionTitle || `AI Voice Interview - ${role}`;

    const newVoiceSession = await VoiceInterview.create({
      user: userId,
      sessionId: sessionCode,
      sessionTitle: title,
      role,
      difficulty,
      questionCount
    });
    console.log(`[Voice Sync] VoiceInterview found: ${newVoiceSession._id}`);

    let generatedQuestions = [];
    try {
      generatedQuestions = await aiService.generateInterviewQuestions(
        user,
        resumeData,
        { role, company: 'General', difficulty, questionCount, interviewType: 'Technical' }
      );
    } catch (err) {
      console.warn('[Voice AI] Question generation fallback:', err.message);
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      generatedQuestions = [
        { question: 'Tell me about yourself and your background in software development.', topic: 'Introduction' },
        { question: `Explain core technical principles of ${role} architecture and state management.`, topic: 'Technical' },
        { question: 'How do you approach debugging complex production issues under time constraints?', topic: 'Problem Solving' },
        { question: 'Describe a challenging project you built and the engineering trade-offs made.', topic: 'Projects' },
        { question: 'Where do you see your technical skills progressing over the next few years?', topic: 'Career Goals' }
      ];
    }

    const formattedQuestions = generatedQuestions.map((q, idx) => ({
      questionNumber: idx + 1,
      topic: q.topic || 'General',
      questionText: q.question || q.questionText,
      expectedAnswer: q.expectedAnswer || 'Clear technical explanation and articulate communication.'
    }));

    await VoiceInterview.updateOne(
      { _id: newVoiceSession._id },
      { $set: { questions: formattedQuestions } }
    );
    console.log(`[Voice Sync] Questions copied: ${formattedQuestions.length}`);
    console.log(`[Voice Sync] Voice session loaded: ${newVoiceSession._id}`);

    const finalSession = await VoiceInterview.findById(newVoiceSession._id);

    res.status(201).json({
      success: true,
      session: finalSession,
      status: 'completed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Evaluate single verbal answer (transcription + communication metrics) - Atomic MongoDB Update
// @route   POST /api/voice/evaluate
// @access  Private
exports.evaluateVoiceQuestion = async (req, res, next) => {
  try {
    const { sessionId, questionIndex, transcriptText, editedTranscriptText, audioDurationSec = 30 } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required for answer evaluation' });
    }

    return await withSessionLock(sessionId, async () => {
      const voiceSession = await findVoiceSession(sessionId, req.user._id);
      if (!voiceSession) {
        return res.status(404).json({ success: false, message: 'Voice interview session not found' });
      }

      const questionItem = voiceSession.questions[questionIndex];
      if (!questionItem) {
        return res.status(404).json({ success: false, message: 'Question index not found in session' });
      }

      const targetQuestionNumber = questionItem.questionNumber || questionIndex + 1;
      const finalTranscript = editedTranscriptText || transcriptText || '';
      const wordCount = finalTranscript.trim().split(/\s+/).filter(Boolean).length;

      const validDuration = Math.max(5, audioDurationSec);
      const speakingSpeedWpm = Math.round((wordCount / validDuration) * 60);

      const fillerData = detectFillerWords(finalTranscript);

      let evalResult = null;
      try {
        evalResult = await aiService.evaluateVoiceAnswer({
          questionText: questionItem.questionText,
          topic: questionItem.topic,
          transcriptText: finalTranscript,
          wordCount,
          wpm: speakingSpeedWpm,
          fillerCount: fillerData.count
        });
      } catch (err) {
        console.warn('[Voice AI] Answer evaluation fallback:', err.message);
      }

      if (!evalResult) {
        const baseScore = Math.min(10, Math.max(4, Math.floor(wordCount / 10) + 4));
        evalResult = {
          score: baseScore,
          technicalScore: baseScore * 10,
          communicationScore: fillerData.count < 3 ? 90 : 70,
          fluencyScore: speakingSpeedWpm >= 110 && speakingSpeedWpm <= 160 ? 88 : 75,
          confidenceScore: wordCount > 20 ? 85 : 65,
          feedback: wordCount > 15
            ? 'Good verbal answer provided. Keep your speaking speed steady and minimize filler words.'
            : 'Short verbal answer. Elaborate further on core technical concepts to boost confidence score.',
          idealAnswer: `An ideal response for "${questionItem.questionText}" clearly presents key architectural concepts and uses confident vocal delivery.`,
          communicationTips: ['Pace your words steadily around 130-150 WPM.', 'Pause silently instead of using filler words like "um" or "like".']
        };
      }

      // ATOMIC UPDATE: Replace document.save() with findOneAndUpdate and $set positional operator
      const updatedSession = await VoiceInterview.findOneAndUpdate(
        {
          _id: voiceSession._id,
          "questions.questionNumber": targetQuestionNumber
        },
        {
          $set: {
            "questions.$.transcriptText": transcriptText,
            "questions.$.editedTranscriptText": finalTranscript,
            "questions.$.audioDurationSec": validDuration,
            "questions.$.wordCount": wordCount,
            "questions.$.speakingSpeedWpm": speakingSpeedWpm,
            "questions.$.fillerWordsCount": fillerData.count,
            "questions.$.fillerWordsDetected": fillerData.detected,
            "questions.$.score": evalResult.score,
            "questions.$.technicalScore": evalResult.technicalScore || evalResult.score * 10,
            "questions.$.communicationScore": evalResult.communicationScore || 80,
            "questions.$.fluencyScore": evalResult.fluencyScore || 80,
            "questions.$.confidenceScore": evalResult.confidenceScore || 80,
            "questions.$.feedback": evalResult.feedback,
            "questions.$.idealAnswer": evalResult.idealAnswer,
            "questions.$.communicationTips": evalResult.communicationTips || []
          }
        },
        { new: true }
      );

      const updatedQuestion = updatedSession?.questions?.find(q => q.questionNumber === targetQuestionNumber) || questionItem;

      res.status(200).json({
        success: true,
        question: updatedQuestion
      });
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Compile overall Voice Communication Report - Atomic MongoDB Update
// @route   POST /api/voice/compile-report
// @access  Private
exports.compileVoiceReport = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required to compile voice report' });
    }

    return await withSessionLock(sessionId, async () => {
      const voiceSession = await findVoiceSession(sessionId, req.user._id);
      if (!voiceSession) {
        return res.status(404).json({ success: false, message: 'Voice session not found' });
      }

      const questions = voiceSession.questions;
      const totalQuestionsCount = Math.max(1, questions.length);

      // Compute strict mathematical scores across ALL questions in session (denominator = total session questions count)
      const sumTech = questions.reduce((acc, q) => acc + (q.technicalScore !== undefined && q.technicalScore !== null ? q.technicalScore : (q.score ? q.score * 10 : 0)), 0);
      const sumComm = questions.reduce((acc, q) => acc + (q.communicationScore !== undefined && q.communicationScore !== null ? q.communicationScore : (q.score ? q.score * 10 : 0)), 0);
      const sumConf = questions.reduce((acc, q) => acc + (q.confidenceScore !== undefined && q.confidenceScore !== null ? q.confidenceScore : (q.score ? q.score * 10 : 0)), 0);
      const sumFlu  = questions.reduce((acc, q) => acc + (q.fluencyScore !== undefined && q.fluencyScore !== null ? q.fluencyScore : (q.score ? q.score * 10 : 0)), 0);

      const calculatedTechScore = Math.round(sumTech / totalQuestionsCount);
      const calculatedCommScore = Math.round(sumComm / totalQuestionsCount);
      const calculatedConfScore = Math.round(sumConf / totalQuestionsCount);
      const calculatedFluScore  = Math.round(sumFlu / totalQuestionsCount);
      const calculatedOverallScore = Math.round((calculatedTechScore * 0.5) + (calculatedCommScore * 0.5));

      const answered = questions.filter(q => q.wordCount > 0);
      const totalWordCount = answered.reduce((acc, q) => acc + q.wordCount, 0);
      const totalDurationSec = answered.reduce((acc, q) => acc + q.audioDurationSec, 0);
      const avgWpm = totalDurationSec > 0 ? Math.round((totalWordCount / totalDurationSec) * 60) : (totalWordCount > 0 ? 120 : 0);
      const totalFillers = answered.reduce((acc, q) => acc + q.fillerWordsCount, 0);

      let speakingPace = 'Optimal';
      if (avgWpm === 0) speakingPace = 'Silent';
      else if (avgWpm < 100) speakingPace = 'Slow';
      else if (avgWpm > 160) speakingPace = 'Fast';

      const calculatedScores = {
        overallScore: calculatedOverallScore,
        technicalScore: calculatedTechScore,
        communicationScore: calculatedCommScore,
        confidenceScore: calculatedConfScore,
        fluencyScore: calculatedFluScore,
        averageWpm: avgWpm
      };

      let reportAi = null;
      try {
        reportAi = await aiService.compileVoiceReport(voiceSession.role, voiceSession.difficulty, calculatedScores, questions);
      } catch (err) {
        console.warn('[Voice AI] Report compilation fallback:', err.message);
      }

      let defaultObservations = ['Maintained clear spoken communication'];
      let defaultSuggestions = [
        'Pause for 1-2 seconds instead of using filler words.',
        'Pace your verbal answers between 130-150 words per minute.',
        'Elaborate technical answers with concrete examples.'
      ];

      if (calculatedOverallScore < 40) {
        defaultObservations = ['Candidate provided very brief or incomplete verbal answers across questions.'];
        defaultSuggestions = [
          'Elaborate technical concepts thoroughly instead of providing short answers.',
          'Practice structuring responses using the STAR method (Situation, Task, Action, Result).',
          'Speak continuously into the microphone to build verbal fluency.'
        ];
      }

      // ATOMIC UPDATE: Enforce exact mathematical scores in MongoDB
      const updatedSession = await VoiceInterview.findOneAndUpdate(
        { _id: voiceSession._id },
        {
          $set: {
            overallScore: calculatedOverallScore,
            technicalScore: calculatedTechScore,
            communicationScore: calculatedCommScore,
            confidenceScore: calculatedConfScore,
            fluencyScore: calculatedFluScore,
            averageWpm: avgWpm,
            totalFillerWords: totalFillers,
            speakingPace,
            grammarObservations: reportAi?.grammarObservations || defaultObservations,
            improvementSuggestions: reportAi?.improvementSuggestions || defaultSuggestions,
            overallFeedback: reportAi?.overallFeedback || `Candidate demonstrated ${calculatedOverallScore >= 70 ? 'strong' : 'developing'} verbal responses across technical topics.`,
            strengths: reportAi?.strengths || ['Clear vocal delivery', 'Direct answer attempt'],
            focusGaps: reportAi?.focusGaps || ['Depth of technical explanation', 'Elaborating architectural trade-offs'],
            recommendations: reportAi?.recommendations || ['Adopt STAR framework for structured verbal answers', 'Pause silently instead of using filler words'],
            learningRoadmap: reportAi?.learningRoadmap || [
              { priority: 'PRIORITY 1', title: 'System Architecture & Design Patterns', description: 'Practice describing end-to-end component flows and data trade-offs.' },
              { priority: 'PRIORITY 2', title: 'Verbal Delivery & Pacing', description: 'Maintain a steady speaking speed of 130-150 WPM.' }
            ],
            skillHeatmap: reportAi?.skillHeatmap || [
              { skill: 'Technical Core', stars: Math.max(1, Math.min(5, Math.round(calculatedTechScore / 20))) },
              { skill: 'Vocal Delivery', stars: Math.max(1, Math.min(5, Math.round(calculatedCommScore / 20))) },
              { skill: 'Confidence & Flow', stars: Math.max(1, Math.min(5, Math.round(calculatedConfScore / 20))) }
            ],
            status: 'Completed',
            completedAt: new Date()
          }
        },
        { new: true }
      );

      // Sync parent InterviewSession status and overallScore to Completed
      const isMongoId = mongoose.Types.ObjectId.isValid(sessionId) && String(new mongoose.Types.ObjectId(sessionId)) === String(sessionId);
      await InterviewSession.updateOne(
        {
          $or: [
            { interviewId: sessionId },
            { interviewId: voiceSession.sessionId },
            ...(isMongoId ? [{ _id: sessionId }] : [])
          ],
          user: req.user._id
        },
        {
          $set: {
            status: 'Completed',
            progress: 100,
            overallScore: calculatedOverallScore,
            completedAt: new Date()
          }
        }
      );

      res.status(200).json({
        success: true,
        report: updatedSession
      });
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Voice Report / Session details
// @route   GET /api/voice/report/:id
// @access  Private
exports.getVoiceReport = async (req, res, next) => {
  try {
    const sessionParam = req.params.id;
    if (!sessionParam) {
      return res.status(400).json({ success: false, message: 'Session ID parameter is required' });
    }

    const { parentSession, voiceSession, questionsCount } = await syncVoiceSessionQuestions(sessionParam, req.user._id);

    if (!voiceSession) {
      return res.status(404).json({ success: false, message: 'Voice interview session not found' });
    }

    if (questionsCount === 0 && parentSession && (parentSession.status === 'Creating' || parentSession.status === 'Generating')) {
      return res.status(200).json({
        success: true,
        report: voiceSession,
        status: 'generating',
        message: 'Preparing AI questions...'
      });
    }

    res.status(200).json({
      success: true,
      report: voiceSession,
      status: 'completed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Voice Interview history
// @route   GET /api/voice/history
// @access  Private
exports.getVoiceHistory = async (req, res, next) => {
  try {
    const voiceInterviews = await VoiceInterview.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      voiceInterviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auto-save live voice transcript for question - Atomic MongoDB Update
// @route   POST /api/voice/save-transcript
// @access  Private
exports.saveVoiceTranscript = async (req, res, next) => {
  try {
    const { sessionId, questionIndex, transcriptText, editedTranscriptText, audioDurationSec = 0 } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    return await withSessionLock(sessionId, async () => {
      const voiceSession = await findVoiceSession(sessionId, req.user._id);
      if (!voiceSession) {
        return res.status(404).json({ success: false, message: 'Voice session not found' });
      }

      const questionItem = voiceSession.questions[questionIndex];
      if (!questionItem) {
        return res.status(404).json({ success: false, message: 'Question index not found' });
      }

      const targetQuestionNumber = questionItem.questionNumber || questionIndex + 1;
      const finalTranscript = editedTranscriptText || transcriptText || '';
      const wordCount = finalTranscript.trim().split(/\s+/).filter(Boolean).length;
      const validDuration = Math.max(1, audioDurationSec);
      const speakingSpeedWpm = validDuration > 3 ? Math.round((wordCount / validDuration) * 60) : 0;
      const fillerData = detectFillerWords(finalTranscript);

      // ATOMIC UPDATE: Replace document.save() with findOneAndUpdate and $set positional operator
      const updatedSession = await VoiceInterview.findOneAndUpdate(
        {
          _id: voiceSession._id,
          "questions.questionNumber": targetQuestionNumber
        },
        {
          $set: {
            "questions.$.transcriptText": transcriptText,
            "questions.$.editedTranscriptText": finalTranscript,
            "questions.$.audioDurationSec": validDuration,
            "questions.$.wordCount": wordCount,
            "questions.$.speakingSpeedWpm": speakingSpeedWpm,
            "questions.$.fillerWordsCount": fillerData.count,
            "questions.$.fillerWordsDetected": fillerData.detected
          }
        },
        { new: true }
      );

      const updatedQuestion = updatedSession?.questions?.find(q => q.questionNumber === targetQuestionNumber) || questionItem;

      console.log(`\n=================== [Voice Backend] ===================`);
      console.log(`Voice Transcript Received (Atomic $set)`);
      console.log(`Question ${targetQuestionNumber}`);
      console.log(`Transcript:\n"${finalTranscript}"`);
      console.log(`=======================================================\n`);

      res.status(200).json({
        success: true,
        message: 'Transcript saved atomically',
        question: updatedQuestion
      });
    });
  } catch (error) {
    next(error);
  }
};
