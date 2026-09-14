const SystemDesignInterview = require('../models/SystemDesignInterview');
const { getScenarioForInterview, CURATED_SCENARIOS } = require('../services/systemDesignScenarioService');
const { evaluateSystemDesign } = require('../services/ai/systemDesignEvaluator');

/**
 * Gets list of curated system design challenges
 */
exports.getScenarios = async (req, res) => {
  try {
    return res.json({
      success: true,
      scenarios: CURATED_SCENARIOS
    });
  } catch (error) {
    console.error('[SystemDesignController] Error getting scenarios:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch scenarios' });
  }
};

/**
 * Creates a new System Design Interview Session
 */
exports.createSession = async (req, res) => {
  try {
    const {
      role = 'Senior Software Engineer / System Architect',
      difficulty = 'Medium',
      domain = 'Distributed Systems',
      problemId,
      scenarioType,
      title,
      customScenarioPrompt
    } = req.body;

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - user not authenticated' });
    }

    let scenario;
    if (scenarioType === 'Custom' || customScenarioPrompt) {
      scenario = {
        problemId: 'custom-' + Date.now(),
        title: title || 'Custom System Architecture Challenge',
        difficulty,
        domain: 'Custom Architecture',
        description: customScenarioPrompt || 'Custom system design challenge provided by candidate.',
        overview: customScenarioPrompt || 'Custom system design challenge.',
        functionalRequirements: [
          'Design end-to-end components to fulfill user custom scenario.',
          'Provide clear API interface specifications and payload contracts.',
          'Define database models, primary keys, and data storage partitions.'
        ],
        nonFunctionalRequirements: [
          'High availability (99.99%) with redundancy.',
          'Sub-50ms latency for critical user read/write paths.',
          'Horizontal scalability supporting elastic peak loads.'
        ],
        scaleEstimates: [
          'Estimated 10M+ Daily Active Users',
          '80:20 Read to Write traffic ratio',
          'Multi-TB storage growth per year'
        ],
        scaleEstimations: {
          dailyActiveUsers: '10 Million',
          readWriteRatio: '80:20',
          storagePerYear: '25 TB',
          bandwidth: '500 MB/s'
        },
        keyArchitectureFocus: ['Scalability', 'Fault Tolerance', 'Data Modeling', 'Caching'],
        starterComponents: [
          { id: 'c1', type: 'client', label: 'Client App', subLabel: 'Mobile / Web', category: 'client', x: 80, y: 180, color: '#3b82f6' },
          { id: 'c2', type: 'edge', label: 'API Gateway', subLabel: 'Ingress & Auth', category: 'edge', x: 280, y: 180, color: '#6366f1' },
          { id: 'c3', type: 'service', label: 'App Service', subLabel: 'Core Business Logic', category: 'compute', x: 480, y: 180, color: '#10b981' },
          { id: 'c4', type: 'db_sql', label: 'Primary Database', subLabel: 'Data Store', category: 'db', x: 680, y: 180, color: '#2563eb' }
        ]
      };
    } else {
      scenario = await getScenarioForInterview({ problemId: problemId || scenarioType, domain, difficulty });
    }

    // Fixed duration based on difficulty: Easy 25m, Medium 35m, Hard 45m
    const durationMinutes = difficulty === 'Easy' ? 25 : difficulty === 'Medium' ? 35 : 45;
    const sessionId = "sys-session-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    const newSystemDesignInterview = new SystemDesignInterview({
      sessionId,
      interviewId: sessionId,
      user: userId,
      interviewMode: 'SystemDesign',
      interviewType: 'SystemDesign',
      title: scenario.title || title || 'System Design Technical Interview',
      role,
      difficulty,
      domain: scenario.domain || domain,
      timeLimitMinutes: durationMinutes,
      durationMinutes,
      status: 'In Progress',
      scenario: {
        problemId: scenario.problemId,
        title: scenario.title,
        difficulty: scenario.difficulty || difficulty,
        domain: scenario.domain || domain,
        description: scenario.description,
        overview: scenario.description,
        functionalRequirements: scenario.functionalRequirements || [],
        nonFunctionalRequirements: scenario.nonFunctionalRequirements || [],
        scaleEstimates: scenario.scaleEstimates || [],
        scaleEstimations: {
          dailyActiveUsers: scenario.scaleEstimates?.[0] ? scenario.scaleEstimates[0].split(':')[1]?.trim() : '10M DAU',
          readWriteRatio: scenario.scaleEstimates?.[1] ? scenario.scaleEstimates[1].split(':')[1]?.trim() : '100:1',
          storagePerYear: scenario.scaleEstimates?.[2] ? scenario.scaleEstimates[2].split(':')[1]?.trim() : '15 TB',
          bandwidth: scenario.scaleEstimates?.[3] ? scenario.scaleEstimates[3].split(':')[1]?.trim() : '200 MB/s'
        },
        keyArchitectureFocus: scenario.keyArchitectureFocus || [],
        starterComponents: scenario.starterComponents || []
      },
      diagramNodes: scenario.starterComponents || [],
      diagramConnections: [],
      designDocument: {
        systemOverview: '',
        apiEndpoints: '',
        dataModels: '',
        cachingStrategy: '',
        faultTolerance: '',
        tradeOffs: ''
      },
      submission: {
        architectureDiagram: {
          nodes: scenario.starterComponents || [],
          connections: [],
          freehandPaths: [],
          diagramSnapshotUrl: ''
        },
        designDoc: {
          overview: '',
          apiDesign: '',
          dataModel: '',
          scalabilityAndCaching: '',
          faultToleranceAndTradeoffs: ''
        }
      }
    });

    await newSystemDesignInterview.save();

    const sessionObj = newSystemDesignInterview.toObject();
    sessionObj.interviewId = sessionId;

    return res.status(201).json({
      success: true,
      sessionId,
      session: sessionObj
    });
  } catch (error) {
    console.error('[SystemDesignController] Error creating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create system design interview session',
      error: error.message
    });
  }
};

/**
 * Gets System Design Session by ID
 */
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await SystemDesignInterview.findOne({
      $or: [{ sessionId: id }, { interviewId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).populate('user', 'fullName name email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'System design interview session not found'
      });
    }

    // Check if session was terminated in between
    if (session.status === 'Terminated in between' || session.status === 'Terminated') {
      const resumeCount = session.resumedTerminatedCount || session.resumedCount || 0;
      if (resumeCount >= 1) {
        return res.status(400).json({
          success: false,
          status: 'terminated_limit_reached',
          canResume: false,
          message: 'This system design interview was terminated and has already used its one-time resume limit. Please start a new interview.'
        });
      }

      // Allow 1-time resume
      session.resumedTerminatedCount = 1;
      session.resumedCount = 1;
      session.status = 'In Progress';
      await session.save();
    }

    const sessionObj = session.toObject();
    sessionObj.interviewId = session.sessionId || session.interviewId;

    return res.json({
      success: true,
      session: sessionObj
    });
  } catch (error) {
    console.error('[SystemDesignController] Error getting session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system design session',
      error: error.message
    });
  }
};

/**
 * Submits System Design Solution & Triggers Gemini AI Evaluation
 */
exports.submitDesign = async (req, res) => {
  try {
    const sessionId = req.params.id || req.body.sessionId || req.body.interviewId;
    const {
      diagramNodes,
      diagramConnections,
      architectureDiagram = {},
      designDocument,
      designDoc = {},
      timeSpentSeconds = 0
    } = req.body;

    const session = await SystemDesignInterview.findOne({
      $or: [{ sessionId }, { interviewId: sessionId }, { _id: sessionId?.match(/^[0-9a-fA-F]{24}$/) ? sessionId : null }]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'System design session not found'
      });
    }

    const finalNodes = diagramNodes || architectureDiagram.nodes || session.diagramNodes || [];
    const finalConnections = diagramConnections || architectureDiagram.connections || session.diagramConnections || [];
    const finalDoc = designDocument || {
      systemOverview: designDoc.overview || '',
      apiEndpoints: designDoc.apiDesign || '',
      dataModels: designDoc.dataModel || '',
      cachingStrategy: designDoc.scalabilityAndCaching || '',
      faultTolerance: designDoc.faultToleranceAndTradeoffs || '',
      tradeOffs: ''
    };

    // Evaluate using Gemini AI
    const aiReview = await evaluateSystemDesign({
      scenarioTitle: session.scenario?.title || session.title,
      scenarioDescription: session.scenario?.description || session.scenario?.overview,
      functionalRequirements: session.scenario?.functionalRequirements || [],
      nonFunctionalRequirements: session.scenario?.nonFunctionalRequirements || [],
      scaleEstimates: session.scenario?.scaleEstimates || [],
      difficulty: session.difficulty,
      diagramNodes: finalNodes,
      diagramConnections: finalConnections,
      designDoc: {
        overview: finalDoc.systemOverview,
        apiDesign: finalDoc.apiEndpoints,
        dataModel: finalDoc.dataModels,
        scalabilityAndCaching: finalDoc.cachingStrategy,
        faultToleranceAndTradeoffs: finalDoc.faultTolerance
      }
    });

    session.diagramNodes = finalNodes;
    session.diagramConnections = finalConnections;
    session.designDocument = finalDoc;

    session.submission = {
      architectureDiagram: {
        nodes: finalNodes,
        connections: finalConnections,
        freehandPaths: architectureDiagram.freehandPaths || [],
        diagramSnapshotUrl: architectureDiagram.diagramSnapshotUrl || ''
      },
      designDoc: {
        overview: finalDoc.systemOverview,
        apiDesign: finalDoc.apiEndpoints,
        dataModel: finalDoc.dataModels,
        scalabilityAndCaching: finalDoc.cachingStrategy,
        faultToleranceAndTradeoffs: finalDoc.faultTolerance
      }
    };

    session.aiReview = aiReview;
    session.overallScore = aiReview.overallScore || 75;
    session.status = 'Completed';
    session.completedAt = new Date();
    session.timeSpentSeconds = timeSpentSeconds;

    await session.save();

    const sessionObj = session.toObject();
    sessionObj.interviewId = session.sessionId || session.interviewId;

    return res.json({
      success: true,
      message: 'System design evaluation completed successfully!',
      session: sessionObj,
      aiReview
    });
  } catch (error) {
    console.error('[SystemDesignController] Error submitting design:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate system design solution',
      error: error.message
    });
  }
};

/**
 * Gets System Design Assessment Report
 */
exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await SystemDesignInterview.findOne({
      $or: [{ sessionId: id }, { interviewId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).populate('user', 'fullName name email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'System design report not found'
      });
    }

    const sessionObj = session.toObject();
    sessionObj.interviewId = session.sessionId || session.interviewId;

    return res.json({
      success: true,
      session: sessionObj,
      aiReview: sessionObj.aiReview
    });
  } catch (error) {
    console.error('[SystemDesignController] Error getting report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system design report',
      error: error.message
    });
  }
};

/**
 * Terminates System Design Session
 */
exports.terminateSession = async (req, res) => {
  try {
    const sessionId = req.params.id || req.body.sessionId || req.body.interviewId;
    const session = await SystemDesignInterview.findOne({
      $or: [{ sessionId }, { interviewId: sessionId }, { _id: sessionId?.match(/^[0-9a-fA-F]{24}$/) ? sessionId : null }]
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.status = 'Terminated in between';
    session.overallScore = 0;
    session.completedAt = new Date();
    await session.save();

    return res.json({
      success: true,
      message: 'System design interview terminated successfully'
    });
  } catch (error) {
    console.error('[SystemDesignController] Error terminating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to terminate system design interview',
      error: error.message
    });
  }
};
