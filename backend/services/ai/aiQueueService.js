const mongoose = require('mongoose');

const queue = [];
let processing = false;

// Delay helper to enforce 2-second rate limiting delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let processingJob = null;

const recentlyCompletedJobs = new Set();

// Add job to sequential queue with strict deduplication
exports.addToQueue = (job) => {
  if (!job || !job.type || !job.sessionId) return;

  const jobKey = `${job.type}:${job.sessionId.toString()}`;

  // 1. Check waiting queue
  const inWaiting = queue.some(j => `${j.type}:${j.sessionId.toString()}` === jobKey);

  // 2. Check active processing job
  const inActive = processingJob && `${processingJob.type}:${processingJob.sessionId.toString()}` === jobKey;

  // 3. Check completed recently
  const inCompleted = recentlyCompletedJobs.has(jobKey);

  if (inWaiting || inActive || inCompleted) {
    console.log(`[AI Queue] Ignored duplicate queue request: ${jobKey}`);
    return;
  }

  if (job.priority === 'high') {
    queue.unshift(job);
    console.log(`[AI Queue] Added HIGH PRIORITY job: ${job.type} for session: ${job.sessionId}. Queue length: ${queue.length}`);
  } else {
    queue.push(job);
    console.log(`[AI Queue] Added job: ${job.type} for session: ${job.sessionId}. Queue length: ${queue.length}`);
  }
  triggerProcessor();
};

const triggerProcessor = async () => {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    processingJob = job;
    const jobKey = `${job.type}:${job.sessionId.toString()}`;
    console.log(`[AI Queue] Processing job: ${job.type} for session: ${job.sessionId}. Remaining queue: ${queue.length}`);
    
    try {
      if (job.type === 'generate_questions') {
        await executeQuestionGenerationJob(job);
      } else if (job.type === 'evaluate_session') {
        await executeEvaluationJob(job);
      }
      recentlyCompletedJobs.add(jobKey);
      if (recentlyCompletedJobs.size > 1000) {
        const firstKey = recentlyCompletedJobs.values().next().value;
        recentlyCompletedJobs.delete(firstKey);
      }
    } catch (err) {
      console.error(`[AI Queue] Job failed: ${job.type} for session: ${job.sessionId}. Error:`, err);
    }
    
    processingJob = null;
    // Rate Limiter: wait 2 seconds before the next job
    await delay(2000);
  }

  processing = false;
};

// 1. Asynchronous question generator task
const executeQuestionGenerationJob = async (job) => {
  const { sessionId, user, resumeData } = job;
  const InterviewSession = require('../../models/InterviewSession');
  const InterviewQuestion = require('../../models/InterviewQuestion');
  const { generateInterviewQuestions } = require('./questionGenerator');

  const session = await InterviewSession.findById(sessionId);
  if (!session) return;

  const existingQCount = await InterviewQuestion.countDocuments({ sessionId: session._id });
  if (existingQCount > 0 && session.status !== 'Creating' && session.status !== 'Generating') {
    console.log(`[AI Queue] [Session ${session.interviewId}] Questions already generated (${existingQCount} questions). Skipping duplicate job.`);
    return;
  }

  // Set status to Generating Questions
  session.status = 'Generating';
  await session.save();

  console.log(`[AI Queue] [Session ${session.interviewId}] Starting AI Question Generation...`);
  
  try {
    const generatedList = await generateInterviewQuestions(user, resumeData, session);

    // Delete existing questions
    await InterviewQuestion.deleteMany({ sessionId: session._id });

    // Store newly generated questions
    const questionDocs = generatedList.map(q => ({
      sessionId: session._id,
      user: user._id,
      questionNumber: q.questionNumber,
      questionType: q.questionType,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.question,
      expectedAnswer: q.expectedAnswer,
      hints: q.hints,
      status: 'pending'
    }));

    await InterviewQuestion.insertMany(questionDocs);

    // Mark questions as ready
    session.status = 'ReadyToStart';
    await session.save();
    console.log(`[AI Queue] [Session ${session.interviewId}] AI Question Generation completed successfully.`);
  } catch (err) {
    console.error(`[AI Queue] [Session ${session.interviewId}] Question Generation Failed:`, err);
    session.status = 'Created'; // revert
    await session.save();
    throw err;
  }
};

// 2. Asynchronous evaluation pipeline task
const executeEvaluationJob = async (job) => {
  const { sessionId } = job;
  const InterviewSession = require('../../models/InterviewSession');
  const InterviewQuestion = require('../../models/InterviewQuestion');
  const InterviewAnswer = require('../../models/InterviewAnswer');
  const QuestionEvaluation = require('../../models/QuestionEvaluation');
  const InterviewEvaluation = require('../../models/InterviewEvaluation');
  const { evaluateAnswer, compileOverallReport } = require('./evaluator');

  const session = await InterviewSession.findById(sessionId);
  if (!session) return;

  // Set status to Evaluating
  session.status = 'AwaitingEvaluation'; // or "Evaluating" state
  await session.save();

  console.log(`[AI Queue] [Session ${session.interviewId}] Starting AI Evaluation...`);

  try {
    const questions = await InterviewQuestion.find({ sessionId: session._id }).sort({ questionNumber: 1 });
    const answers = await InterviewAnswer.find({ sessionId: session._id });

    const evaluatedQuestions = [];

    // Clear any previous evaluations to avoid E11000 duplicate keys
    await QuestionEvaluation.deleteMany({ sessionId: session._id });
    await InterviewEvaluation.deleteMany({ sessionId: session._id });

    let useLocalFallback = false;

    // Evaluate each question sequentially
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = answers.find(a => a.questionId.toString() === q._id.toString());
      const answerText = ans ? ans.answer : '';

      console.log(`[AI Queue] [Session ${session.interviewId}] Evaluating question ${i + 1}/${questions.length}`);

      // Rate limiter: wait 2 seconds between each Gemini question request (skip if local fallback active)
      if (i > 0 && !useLocalFallback) {
        await delay(2000);
      }

      const wordCount = answerText ? answerText.trim().split(/\s+/).filter(Boolean).length : 0;
      const questionBehavior = {
        timeTaken: ans ? ans.timeTaken : 0,
        skipped: ans ? ans.skipped : false,
        wordCount
      };

      const evalData = await evaluateAnswer(q, answerText, session, { 
        forceLocal: useLocalFallback,
        behavior: questionBehavior
      });

      if (evalData.isQuotaExhausted) {
        if (!useLocalFallback) {
          console.log(`[AI Queue] [Session ${session.interviewId}] Gemini quota exhausted or rate limit error encountered. Switching to local fallback evaluations for the remainder of this session.`);
        }
        useLocalFallback = true;
      }

      const questionEval = await QuestionEvaluation.create({
        sessionId: session._id,
        questionId: q._id,
        answerId: ans ? ans._id : new mongoose.Types.ObjectId(),
        score: evalData.score,
        accuracy: evalData.accuracy,
        completeness: evalData.completeness,
        technicalDepth: evalData.technicalDepth,
        communication: evalData.communication,
        confidence: evalData.confidence,
        feedback: evalData.feedback,
        expectedAnswer: q.expectedAnswer || evalData.expectedAnswer || '',
        missingPoints: evalData.missingPoints || [],
        improvementSuggestions: evalData.improvementSuggestions || [],
        idealAnswer: evalData.idealAnswer || '',
        evaluationEngine: evalData.evaluationEngine || (useLocalFallback ? 'Local' : 'Gemini')
      });

      evaluatedQuestions.push({
        question: q,
        evaluation: questionEval
      });
    }

    // Rate limiter: wait 2 seconds before compiling final report
    await delay(2000);
    console.log(`[AI Queue] [Session ${session.interviewId}] Compiling overall report...`);

    // Calculate overall interview behavior metrics
    const totalTimeSeconds = answers.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0);
    const avgTimePerQuestion = questions.length > 0 ? totalTimeSeconds / questions.length : 0;
    const skippedCount = answers.filter(a => a.skipped).length;
    const completionRate = questions.length > 0 ? ((questions.length - skippedCount) / questions.length) * 100 : 0;
    
    const wordCounts = answers.map(a => a.answer ? a.answer.trim().split(/\s+/).filter(Boolean).length : 0);
    const avgWordCount = wordCounts.length > 0 ? wordCounts.reduce((acc, curr) => acc + curr, 0) / wordCounts.length : 0;

    const overallBehavior = {
      totalTimeSeconds,
      avgTimePerQuestion,
      skippedCount,
      completionRate,
      avgWordCount
    };

    const overallReport = await compileOverallReport(evaluatedQuestions, session, { behavior: overallBehavior });

    // Save overall report
    await InterviewEvaluation.create({
      sessionId: session._id,
      user: session.user,
      overallScore: overallReport.overallScore,
      technicalScore: overallReport.technicalScore,
      hrScore: overallReport.hrScore,
      communicationScore: overallReport.communicationScore,
      confidenceScore: overallReport.confidenceScore,
      strengths: overallReport.strengths || [],
      weaknesses: overallReport.weaknesses || [],
      recommendations: overallReport.recommendations || [],
      learningRoadmap: overallReport.learningRoadmap || [],
      skillHeatmap: overallReport.skillHeatmap || [],
      overallFeedback: overallReport.overallFeedback || '',
      evaluationEngine: overallReport.evaluationEngine || (useLocalFallback ? 'Local' : 'Gemini')
    });

    // Mark session as complete
    session.status = 'Completed';
    await session.save();
    console.log(`[AI Queue] [Session ${session.interviewId}] AI Evaluation completed successfully.`);
  } catch (err) {
    console.error(`[AI Queue] [Session ${session.interviewId}] Evaluation Failed:`, err);
    session.status = 'AwaitingEvaluation'; // Revert back
    await session.save();
    throw err;
  }
};

// Recover and enqueue any stuck jobs on server start
exports.resumePendingJobs = async () => {
  const InterviewSession = require('../../models/InterviewSession');
  const User = require('../../models/User');
  const ResumeData = require('../../models/ResumeData');

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 1. Recover recently active question generations
    const activeGenerations = await InterviewSession.find({
      status: 'Generating',
      updatedAt: { $gte: fiveMinutesAgo }
    });
    for (const sess of activeGenerations) {
      console.log(`[AI Queue Startup] Resuming active question generation for session: ${sess._id}`);
      const user = await User.findById(sess.user);
      const resumeData = await ResumeData.findOne({ user: sess.user });
      exports.addToQueue({
        type: 'generate_questions',
        sessionId: sess._id,
        user,
        resumeData,
        priority: 'high'
      });
    }

    // 2. Recover recently active evaluations
    const activeEvaluations = await InterviewSession.find({
      status: 'AwaitingEvaluation',
      updatedAt: { $gte: fiveMinutesAgo }
    });
    for (const sess of activeEvaluations) {
      console.log(`[AI Queue Startup] Resuming active evaluation for session: ${sess._id}`);
      exports.addToQueue({
        type: 'evaluate_session',
        sessionId: sess._id,
        priority: 'high'
      });
    }

    // 3. Pause old/abandoned generations
    const oldGenerations = await InterviewSession.find({
      status: 'Generating',
      updatedAt: { $lt: fiveMinutesAgo }
    });
    for (const sess of oldGenerations) {
      sess.status = 'Paused';
      await sess.save();
      console.log(`[AI Queue Startup] Paused abandoned question generation for session: ${sess._id}`);
    }

    // 4. Pause old/abandoned evaluations
    const oldEvaluations = await InterviewSession.find({
      status: 'AwaitingEvaluation',
      updatedAt: { $lt: fiveMinutesAgo }
    });
    for (const sess of oldEvaluations) {
      sess.status = 'Paused';
      await sess.save();
      console.log(`[AI Queue Startup] Paused abandoned evaluation for session: ${sess._id}`);
    }

    const pausedCount = await InterviewSession.countDocuments({ status: 'Paused' });
    console.log(`[AI Queue Startup] Found ${pausedCount} paused sessions. Waiting for manual resume.`);
  } catch (err) {
    console.error('[AI Queue Startup] Failed to resume pending jobs:', err);
  }
};

exports.getQueueLength = () => queue.length;
exports.getProcessingJob = () => processingJob;
