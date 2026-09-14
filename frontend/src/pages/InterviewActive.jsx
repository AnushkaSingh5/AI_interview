import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiClock, FiCheckSquare, FiAlertCircle, FiHelpCircle, FiChevronLeft, 
  FiChevronRight, FiCheck, FiSave, FiAlertTriangle, FiBookOpen, FiCornerDownRight,
  FiCheckCircle, FiPlay, FiCode, FiLayers, FiRefreshCw, FiZap, FiFileText, FiTerminal
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import AIAvatarInterviewer from '../components/AIAvatarInterviewer';
import TypewriterQuestion from '../components/TypewriterQuestion';
import CodeEditor from '../components/CodeEditor';
import ArchitectureCanvas from '../components/ArchitectureCanvas';

const DEFAULT_STARTERS = {
  javascript: `// Write your solution here
function solution(input) {
  // Your code here
  return input;
}`,
  python: `# Write your solution here
def solution(input):
    # Your code here
    return input
`,
  java: `public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
  c: `#include <stdio.h>

int main() {
    // Your code here
    return 0;
}`
};

const InterviewActive = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Wizard Steps: 'active' | 'review' | 'success'
  const [activeStep, setActiveStep] = useState('active');
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // Current active question index (0-indexed locally)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState({}); // questionId -> { answer, codeDetails, systemDesignDetails, skipped, timeTaken }
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAvatar, setShowAvatar] = useState(true);

  // Coding execution states
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [executionOutput, setExecutionOutput] = useState(null);
  const [activeCodingTab, setActiveCodingTab] = useState('editor'); // 'editor' | 'testcases' | 'console'

  // System design states
  const [activeSdTab, setActiveSdTab] = useState('canvas'); // 'canvas' | 'doc'

  // Strict Lockdown & Proctoring states
  const [interviewState, setInterviewState] = useState(document.fullscreenElement ? 'INTERVIEW_ACTIVE' : 'INTERVIEW_PAUSED');
  const [lockdownReason, setLockdownReason] = useState(document.fullscreenElement ? '' : 'Fullscreen mode is required to participate in this mock interview.');
  const [tabSwitchStrikes, setTabSwitchStrikes] = useState(0);
  const [isTerminating, setIsTerminating] = useState(false);
  const isTerminatingRef = useRef(false);
  const interviewStateRef = useRef('INTERVIEW_ACTIVE');
  const tabSwitchStrikesRef = useRef(0);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    interviewStateRef.current = interviewState;
  }, [interviewState]);

  useEffect(() => {
    tabSwitchStrikesRef.current = tabSwitchStrikes;
  }, [tabSwitchStrikes]);

  // Timer state (seconds remaining)
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerIntervalRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);

  // Strict Interview Lockdown & Fullscreen Enforcer
  useEffect(() => {
    document.body.classList.add('interview-lockdown-active');

    const requestFullscreenSafe = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen request deferred until user interaction:', err);
      }
    };

    requestFullscreenSafe();

    const handleFullscreenChange = () => {
      if (isSubmittingRef.current) return;
      if (!document.fullscreenElement && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason('Fullscreen mode was exited. Fullscreen is strictly required during mock interviews.');
      }
    };

    const handleVisibilityChange = () => {
      if (isSubmittingRef.current) return;
      if (document.hidden) {
        tabSwitchStrikesRef.current += 1;
        const currentStrikes = tabSwitchStrikesRef.current;
        setTabSwitchStrikes(currentStrikes);
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason(`⚠️ Tab Switch / Window Blur detected (Strike ${currentStrikes}/3). Switching tabs or minimizing the window is prohibited.`);
        toast.warn(`Proctoring Strike ${currentStrikes}/3: Tab switched or minimized!`);
      }
    };

    const handleWindowBlur = () => {
      if (isSubmittingRef.current) return;
      if (interviewStateRef.current === 'INTERVIEW_ACTIVE') {
        tabSwitchStrikesRef.current += 1;
        const currentStrikes = tabSwitchStrikesRef.current;
        setTabSwitchStrikes(currentStrikes);
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason(`⚠️ Window focus lost (Strike ${currentStrikes}/3). You must remain focused on the interview window.`);
      }
    };

    const handleKeyDown = (e) => {
      if (isSubmittingRef.current) return;
      // Intercept ESC
      if (e.key === 'Escape' || e.code === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        if (interviewStateRef.current === 'INTERVIEW_ACTIVE') {
          setInterviewState('INTERVIEW_PAUSED');
          setLockdownReason('Fullscreen exit intercepted. Please stay in fullscreen to complete your interview.');
        }
        return false;
      }

      // Block F11, F12, Ctrl+Shift+I, Alt+Tab / Win
      if (
        e.key === 'F11' || 
        e.key === 'F12' || 
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R' || e.key === 'w' || e.key === 'W'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.body.classList.remove('interview-lockdown-active');
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen();
        } catch (e) {}
      }
    };
  }, []);

  const handleReturnToInterview = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setInterviewState('INTERVIEW_ACTIVE');
      setLockdownReason('');
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
      setInterviewState('INTERVIEW_ACTIVE');
      setLockdownReason('');
    }
  };

  const handleTerminateInterview = async () => {
    if (isTerminatingRef.current) return;
    if (!window.confirm('Are you sure you want to terminate this interview? The session will be marked as Terminated.')) {
      return;
    }
    isTerminatingRef.current = true;
    setIsTerminating(true);
    isSubmittingRef.current = true;
    try {
      await axiosInstance.post(`/interviews/${session?._id || id}/terminate`);
      toast.info('Interview has been terminated.');
    } catch (e) {
      console.warn('Termination API notice:', e.message);
    } finally {
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (e) {}
      }
      document.body.classList.remove('interview-lockdown-active');
      navigate('/mock-interviews');
    }
  };

  useEffect(() => {
    fetchSessionContext();
    return () => {
      clearInterval(timerIntervalRef.current);
      clearInterval(autoSaveIntervalRef.current);
    };
  }, [id]);

  // Handle ticking timer
  useEffect(() => {
    if (activeStep === 'active' && timeRemaining > 0 && interviewState === 'INTERVIEW_ACTIVE') {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [activeStep, timeRemaining, interviewState]);

  // Handle auto-save timer (every 10 seconds)
  useEffect(() => {
    if (activeStep === 'active' && interviewState === 'INTERVIEW_ACTIVE') {
      autoSaveIntervalRef.current = setInterval(() => {
        triggerAutoSave();
      }, 10000);
    } else {
      clearInterval(autoSaveIntervalRef.current);
    }
    return () => clearInterval(autoSaveIntervalRef.current);
  }, [activeStep, currentIndex, answersMap, interviewState]);

  const fetchSessionContext = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/interviews/${id}/resume`);
      if (response.data && response.data.success) {
        const { session: sess, questions: qList, answers: aList } = response.data;
        
        // Safety check: redirect back to summary/instructions page if session hasn't started
        if (sess.status === 'ReadyToStart') {
          navigate(`/interview/${sess.interviewId}/questions`);
          return;
        }

        // If interview is already submitted, redirect to report or dashboard
        if (['Submitted', 'AwaitingEvaluation', 'ReportGenerated', 'Completed'].includes(sess.status)) {
          toast.info('This interview has already been submitted.');
          navigate(`/interview/${sess.interviewId}/report`);
          return;
        }

        setSession(sess);
        setQuestions(qList);
        setTimeRemaining(sess.timeRemaining || sess.duration * 60);

        // Pre-fill local answers map
        const initialMap = {};
        qList.forEach(q => {
          const match = aList.find(a => a.questionId === q._id);
          
          // Initial coding setup
          const defaultLang = match?.codeDetails?.language || 'javascript';
          const defaultCode = match?.codeDetails?.code || 
            q.codingDetails?.starterTemplates?.[defaultLang] || 
            q.codingDetails?.starterCode || 
            DEFAULT_STARTERS[defaultLang] || '';

          // Initial system design setup
          const defaultDiagramNodes = match?.systemDesignDetails?.diagramNodes || q.systemDesignDetails?.starterComponents || [];
          const defaultConnections = match?.systemDesignDetails?.connections || [];
          const defaultDesignDoc = match?.systemDesignDetails?.designDoc || '';

          initialMap[q._id] = {
            answer: match?.answer || (q.questionType === 'coding' ? defaultCode : ''),
            codeDetails: {
              language: defaultLang,
              code: defaultCode,
              executionResults: match?.codeDetails?.executionResults || null,
              passedCount: match?.codeDetails?.passedCount || 0,
              totalCount: match?.codeDetails?.totalCount || (q.codingDetails?.testCases?.length || 0)
            },
            systemDesignDetails: {
              diagramNodes: defaultDiagramNodes,
              connections: defaultConnections,
              designDoc: defaultDesignDoc
            },
            skipped: match?.skipped || false,
            timeTaken: match?.timeTaken || 0
          };
        });
        setAnswersMap(initialMap);

        // Load correct active question index
        const lastIdx = (sess.currentQuestion || 1) - 1;
        setCurrentIndex(lastIdx >= 0 && lastIdx < qList.length ? lastIdx : 0);
        setActiveStep('active');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load mock interview workspace.');
      navigate('/mock-interviews');
    } finally {
      setLoading(false);
    }
  };

  // Safe wrapper to save answers
  const saveAnswerDraft = async (qId, dataToSave) => {
    try {
      const payload = {
        questionId: qId,
        answer: dataToSave.answer,
        codeDetails: dataToSave.codeDetails,
        systemDesignDetails: dataToSave.systemDesignDetails,
        skipped: dataToSave.skipped,
        timeTaken: dataToSave.timeTaken,
        timeRemaining,
        currentQuestionIndex: currentIndex + 1
      };
      
      const response = await axiosInstance.post(`/interviews/${session._id}/answer`, payload);
      if (response.data && response.data.success) {
        setSession(response.data.session);
      }
    } catch (err) {
      console.error('[AutoSave] Failed to sync answer draft to database.', err);
    }
  };

  const triggerAutoSave = async () => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;
    const currentData = answersMap[activeQ._id];
    if (currentData) {
      await saveAnswerDraft(activeQ._id, currentData);
    }
  };

  const handleLocalAnswerChange = (text) => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;
    
    setAnswersMap(prev => ({
      ...prev,
      [activeQ._id]: {
        ...prev[activeQ._id],
        answer: text,
        skipped: false
      }
    }));
  };

  // Coding updates
  const handleCodeChange = (newCode) => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    setAnswersMap(prev => {
      const existing = prev[activeQ._id] || {};
      const currentCodeDetails = existing.codeDetails || {};
      return {
        ...prev,
        [activeQ._id]: {
          ...existing,
          answer: newCode,
          codeDetails: {
            ...currentCodeDetails,
            code: newCode
          },
          skipped: false
        }
      };
    });
  };

  const handleCodeLanguageChange = (newLang) => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    const templateCode = activeQ.codingDetails?.starterTemplates?.[newLang] || DEFAULT_STARTERS[newLang] || '';

    setAnswersMap(prev => {
      const existing = prev[activeQ._id] || {};
      const currentCodeDetails = existing.codeDetails || {};
      return {
        ...prev,
        [activeQ._id]: {
          ...existing,
          answer: templateCode,
          codeDetails: {
            ...currentCodeDetails,
            language: newLang,
            code: templateCode
          },
          skipped: false
        }
      };
    });
  };

  const handleResetCode = () => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;
    const currentLang = answersMap[activeQ._id]?.codeDetails?.language || 'javascript';
    const starter = activeQ.codingDetails?.starterTemplates?.[currentLang] || DEFAULT_STARTERS[currentLang] || '';
    handleCodeChange(starter);
    toast.info('Code reset to default starter template.');
  };

  const handleRunCode = async () => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    const currentCode = answersMap[activeQ._id]?.codeDetails?.code || '';
    const currentLang = answersMap[activeQ._id]?.codeDetails?.language || 'javascript';
    const testCases = activeQ.codingDetails?.testCases || [];

    if (!currentCode.trim()) {
      toast.warning('Please write some code before running tests.');
      return;
    }

    setIsRunningCode(true);
    setActiveCodingTab('console');
    try {
      const payload = {
        language: currentLang,
        code: currentCode,
        problemId: activeQ.codingDetails?.problemId,
        testCases: testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput || tc.output
        }))
      };

      const response = await axiosInstance.post('/coding/execute', payload);
      if (response.data && response.data.success) {
        const result = response.data.result;
        setExecutionOutput(result);

        const passedCount = result.passedCount || 0;
        const totalCount = result.totalCount || testCases.length || 0;

        setAnswersMap(prev => {
          const existing = prev[activeQ._id] || {};
          return {
            ...prev,
            [activeQ._id]: {
              ...existing,
              codeDetails: {
                ...existing.codeDetails,
                executionResults: result,
                passedCount,
                totalCount
              }
            }
          };
        });

        if (result.allPassed) {
          toast.success(`All ${passedCount}/${totalCount} test cases passed!`);
        } else {
          toast.info(`${passedCount}/${totalCount} test cases passed.`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to execute code runner.');
    } finally {
      setIsRunningCode(false);
    }
  };

  // System Design updates
  const handleArchitectureCanvasChange = (nodes, connections) => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    setAnswersMap(prev => {
      const existing = prev[activeQ._id] || {};
      const sdDetails = existing.systemDesignDetails || {};
      return {
        ...prev,
        [activeQ._id]: {
          ...existing,
          systemDesignDetails: {
            ...sdDetails,
            diagramNodes: nodes,
            connections: connections
          },
          skipped: false
        }
      };
    });
  };

  const handleSystemDesignDocChange = (docText) => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    setAnswersMap(prev => {
      const existing = prev[activeQ._id] || {};
      const sdDetails = existing.systemDesignDetails || {};
      return {
        ...prev,
        [activeQ._id]: {
          ...existing,
          answer: docText,
          systemDesignDetails: {
            ...sdDetails,
            designDoc: docText
          },
          skipped: false
        }
      };
    });
  };

  const handleSkipQuestion = async () => {
    const activeQ = questions[currentIndex];
    if (!activeQ) return;

    const updatedData = {
      ...answersMap[activeQ._id],
      skipped: true
    };

    setAnswersMap(prev => ({
      ...prev,
      [activeQ._id]: updatedData
    }));

    await saveAnswerDraft(activeQ._id, updatedData);
    toast.info('Question marked as skipped.');

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setActiveStep('review');
    }
  };

  const handleSaveManualDraft = async () => {
    setSavingDraft(true);
    try {
      await triggerAutoSave();
      toast.success('Draft response saved successfully.');
    } catch (err) {
      toast.error('Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  // Navigations
  const handleNext = async () => {
    await triggerAutoSave();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setActiveStep('review');
    }
  };

  const handlePrev = async () => {
    await triggerAutoSave();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleJumpToQuestion = async (idx) => {
    await triggerAutoSave();
    setCurrentIndex(idx);
    setActiveStep('active');
  };

  const handleAutoSubmitOnTimeout = async () => {
    toast.warning('Timer expired! Submitting your mock interview automatically...');
    await executeSubmission();
  };

  const handleManualSubmit = async () => {
    if (window.confirm('Are you sure you want to submit? You cannot edit your answers after submission.')) {
      await executeSubmission();
    }
  };

  const executeSubmission = async () => {
    setSubmitting(true);
    isSubmittingRef.current = true;
    try {
      await triggerAutoSave();

      const response = await axiosInstance.post(`/interviews/${session._id}/submit`);
      if (response.data && response.data.success) {
        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch (e) {}
        }
        document.body.classList.remove('interview-lockdown-active');
        setSession(response.data.session);
        setActiveStep('success');
      }
    } catch (err) {
      isSubmittingRef.current = false;
      toast.error('Failed to submit interview session.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format seconds into MM:SS
  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="glass-panel p-5 bg-white mx-auto shadow-sm" style={{ maxWidth: '480px', border: '1px solid var(--border-grey)' }}>
          <h3 className="h5 fw-bold text-danger mb-3">No Questions Loaded</h3>
          <p className="text-muted small mb-4">We could not load any questions for this mock interview. Please try generating questions again from the dashboard.</p>
          <Link to="/dashboard" className="btn btn-primary-purple px-4 py-2 text-decoration-none text-white">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 1. SUCCESS STEP
  if (activeStep === 'success') {
    return (
      <div className="container py-5 text-start">
        <div className="glass-panel p-5 bg-white mx-auto shadow-sm" style={{ maxWidth: '600px', border: '1px solid var(--border-grey)' }}>
          <div className="text-center mb-4">
            <FiCheckCircle className="text-success display-3 mb-3" />
            <h2 className="fw-bold text-dark">Interview Submitted Successfully!</h2>
            <p className="text-muted">Your mock interview answers, code submissions, and system architectures are locked.</p>
          </div>

          <div className="border rounded-3 p-4 mb-4 bg-light bg-opacity-50 text-center">
            <FiCheckCircle className="text-success fs-3 mb-2" />
            <h4 className="fw-bold h6 text-dark mb-1">AI Evaluation Pipeline Ready</h4>
            <p className="text-muted mb-0" style={{ fontSize: '0.78rem' }}>
              Your responses will be evaluated across technical correctness, code efficiency, architectural scalability, and communication clarity.
            </p>
          </div>

          <div className="d-flex flex-column gap-2">
            <button 
              onClick={() => navigate(`/interview/${session.interviewId}/report`)} 
              className="btn btn-primary-purple w-100 py-2.5"
            >
              View Evaluation & Report
            </button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn btn-white-custom w-100 py-2.5"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. REVIEW ANSWERS SUMMARY STEP
  if (activeStep === 'review') {
    return (
      <div className="container py-4 text-start">
        {/* Strict Lockdown Paused Overlay */}
        {interviewState === 'INTERVIEW_PAUSED' && (
          <div className="lockdown-paused-overlay">
            <div className="lockdown-card text-white">
              <FiAlertCircle className="text-warning display-3 mb-3 animate-pulse" />
              <h4 className="fw-bold mb-2">Resume Mock Interview</h4>
              <p className="text-muted small mb-4">
                {lockdownReason || 'Fullscreen mode is required to continue your interview.'}
              </p>
              <div className="d-flex flex-column gap-2">
                <button 
                  onClick={handleReturnToInterview}
                  className="btn btn-info w-100 fw-bold py-2 rounded-3 text-white"
                >
                  Resume Interview (Enter Fullscreen)
                </button>
                <button 
                  onClick={handleTerminateInterview}
                  disabled={isTerminating}
                  className="btn btn-outline-danger w-100 fw-bold py-2 rounded-3"
                >
                  {isTerminating ? 'Terminating...' : 'Terminate Interview'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2 bg-dark px-3 py-1.5 rounded-pill border border-secondary border-opacity-40 shadow-sm" style={{ width: 'fit-content', fontSize: '0.75rem', backgroundColor: '#111827' }}>
            <span className="text-danger fw-bold d-flex align-items-center gap-1"><span className="rounded-circle bg-danger animate-pulse" style={{ width: '6px', height: '6px' }} /> LIVE</span>
            <span className="text-white-50 border-start border-secondary border-opacity-40 ps-2">🔒 Interview Locked</span>
            <span className="text-success fw-semibold border-start border-secondary border-opacity-40 ps-2 d-flex align-items-center gap-1"><span className="rounded-circle bg-success" style={{ width: '6px', height: '6px' }} /> Fullscreen Active</span>
            {tabSwitchStrikes > 0 && (
              <span className="text-warning fw-semibold border-start border-secondary border-opacity-40 ps-2">⚠️ Strikes: {tabSwitchStrikes}/3</span>
            )}
          </div>
          <button
            onClick={handleTerminateInterview}
            disabled={isTerminating}
            className="btn btn-sm btn-danger px-3 py-1.5 rounded-3 fw-bold d-flex align-items-center gap-1.5 shadow"
            style={{ fontSize: '0.8rem' }}
          >
            <FiAlertCircle /> {isTerminating ? 'Terminating...' : 'Terminate Interview'}
          </button>
        </div>

        <div className="glass-panel p-4 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
          <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.45rem' }}>Review Answers & Submissions</h2>
          <p className="text-muted small">Please review your draft responses, code solutions, and architecture diagrams before final submission.</p>
          
          <div className="table-responsive border rounded-3 mt-3">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.86rem' }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '80px' }}>No.</th>
                  <th>Question / Challenge</th>
                  <th style={{ width: '130px' }}>Type</th>
                  <th style={{ width: '140px' }}>Status</th>
                  <th style={{ width: '100px' }} className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => {
                  const ansData = answersMap[q._id];
                  const hasAnswer = (ansData?.answer?.trim()?.length > 0) || (ansData?.codeDetails?.code?.trim()?.length > 0) || (ansData?.systemDesignDetails?.diagramNodes?.length > 0);
                  const isSkipped = ansData && ansData.skipped;

                  let statusText = 'Unanswered';
                  let statusBadge = 'bg-secondary text-secondary bg-opacity-10';
                  
                  if (hasAnswer) {
                    statusText = q.questionType === 'coding' ? 'Code Submitted' : q.questionType === 'system_design' ? 'Diagram Created' : 'Answered';
                    statusBadge = 'bg-success text-success bg-opacity-10';
                  } else if (isSkipped) {
                    statusText = 'Skipped';
                    statusBadge = 'bg-danger text-danger bg-opacity-10';
                  }

                  return (
                    <tr key={idx}>
                      <td><strong className="text-muted">Q{q.questionNumber}</strong></td>
                      <td>
                        <span className="text-dark fw-semibold d-block text-truncate" style={{ maxWidth: '380px' }}>
                          {q.question}
                        </span>
                        {q.stageName && (
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>{q.stageName}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          q.questionType === 'coding' ? 'bg-info bg-opacity-10 text-info' : 
                          q.questionType === 'system_design' ? 'bg-primary bg-opacity-10 text-primary' : 
                          'bg-secondary bg-opacity-10 text-secondary'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {q.questionType === 'system_design' ? 'System Design' : q.questionType}
                        </span>
                      </td>
                      <td>
                        <span className={`badge px-2 py-1 fw-bold ${statusBadge}`} style={{ fontSize: '0.74rem' }}>
                          {statusText}
                        </span>
                      </td>
                      <td className="text-end">
                        <button 
                          onClick={() => handleJumpToQuestion(idx)} 
                          className="btn btn-sm btn-white-custom py-1 px-2.5"
                          style={{ fontSize: '0.74rem' }}
                        >
                          Jump
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-4">
            <button 
              type="button" 
              onClick={() => { setActiveStep('active'); setCurrentIndex(questions.length - 1); }}
              className="btn btn-white-custom py-2 px-3.5 d-flex align-items-center gap-1.5"
            >
              <FiChevronLeft /> Back to Interview
            </button>
            <button 
              type="button" 
              onClick={handleManualSubmit}
              disabled={submitting}
              className="btn btn-primary-purple py-2 px-4 shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Interview'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. ACTIVE INTERVIEW PANEL
  const activeQuestion = questions[currentIndex];
  const activeAns = answersMap[activeQuestion._id] || {};
  const currentAnswerText = activeAns.answer || '';
  const isCodingQuestion = activeQuestion.questionType === 'coding' || !!activeQuestion.codingDetails;
  const isSystemDesignQuestion = activeQuestion.questionType === 'system_design' || !!activeQuestion.systemDesignDetails;
  
  // Calculate counts for side stats
  const answeredCount = Object.values(answersMap).filter(a => !a.skipped && (a.answer?.trim()?.length > 0 || a.codeDetails?.code?.trim()?.length > 0 || a.systemDesignDetails?.diagramNodes?.length > 0)).length;

  return (
    <div className="container py-4 text-start">
      {/* Strict Lockdown Paused Overlay */}
      {interviewState === 'INTERVIEW_PAUSED' && (
        <div className="lockdown-paused-overlay">
          <div className="lockdown-card text-white">
            <FiAlertCircle className="text-warning display-3 mb-3 animate-pulse" />
            <h4 className="fw-bold mb-2">Resume Mock Interview</h4>
            <p className="text-muted small mb-4">
              {lockdownReason || 'Fullscreen mode is required to continue your interview.'}
            </p>
            <div className="d-flex flex-column gap-2">
              <button 
                onClick={handleReturnToInterview}
                className="btn btn-info w-100 fw-bold py-2 rounded-3 text-white"
              >
                Resume Interview (Enter Fullscreen)
              </button>
              <button 
                onClick={handleTerminateInterview}
                disabled={isTerminating}
                className="btn btn-outline-danger w-100 fw-bold py-2 rounded-3"
              >
                {isTerminating ? 'Terminating...' : 'Terminate Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar with Indicators and Terminate Button */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2 bg-dark px-3 py-1.5 rounded-pill border border-secondary border-opacity-40 shadow-sm" style={{ width: 'fit-content', fontSize: '0.75rem', backgroundColor: '#111827' }}>
          <span className="text-danger fw-bold d-flex align-items-center gap-1"><span className="rounded-circle bg-danger animate-pulse" style={{ width: '6px', height: '6px' }} /> LIVE</span>
          <span className="text-white-50 border-start border-secondary border-opacity-40 ps-2">🔒 Interview Locked</span>
          <span className="text-success fw-semibold border-start border-secondary border-opacity-40 ps-2 d-flex align-items-center gap-1"><span className="rounded-circle bg-success" style={{ width: '6px', height: '6px' }} /> Fullscreen Active</span>
          {tabSwitchStrikes > 0 && (
            <span className="text-warning fw-semibold border-start border-secondary border-opacity-40 ps-2">⚠️ Strikes: {tabSwitchStrikes}/3</span>
          )}
        </div>
        <button
          onClick={handleTerminateInterview}
          disabled={isTerminating}
          className="btn btn-sm btn-danger px-3 py-1.5 rounded-3 fw-bold d-flex align-items-center gap-1.5 shadow"
          style={{ fontSize: '0.8rem' }}
          title="Terminate and exit mock interview"
        >
          <FiAlertCircle /> {isTerminating ? 'Terminating...' : 'Terminate Interview'}
        </button>
      </div>

      {/* FAANG Multi-Round Simulation Stages Bar (for FullLoop) */}
      {session.interviewType === 'FullLoop' && (
        <div className="glass-panel p-2.5 bg-white mb-3 shadow-sm d-flex align-items-center justify-content-between" style={{ border: '1px solid var(--border-grey)' }}>
          <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.78rem' }}>
            <span className="fw-bold text-dark me-2">FAANG Simulation Rounds:</span>
            {[
              { round: 1, label: 'Round 1: Screening & Fundamentals', active: activeQuestion.stageNumber === 1 || (!activeQuestion.stageNumber && !isCodingQuestion && !isSystemDesignQuestion) },
              { round: 2, label: 'Round 2: Live DSA Coding Challenge', active: activeQuestion.stageNumber === 2 || isCodingQuestion },
              { round: 3, label: 'Round 3: Visual System Design Studio', active: activeQuestion.stageNumber === 3 || isSystemDesignQuestion }
            ].map((stg, sIdx) => (
              <span 
                key={sIdx} 
                className={`badge px-2.5 py-1.5 rounded-pill ${stg.active ? 'bg-primary text-white shadow-sm' : 'bg-light text-muted border'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {stg.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top dashboard info header */}
      <div className="glass-panel p-3 bg-white mb-4 d-flex justify-content-between align-items-center shadow-sm" style={{ border: '1px solid var(--border-grey)', fontSize: '0.84rem' }}>
        <div className="d-flex align-items-center gap-3 flex-grow-1 me-4">
          <strong className="text-dark flex-shrink-0">Progress:</strong>
          <div className="progress flex-grow-1" style={{ height: '8px', borderRadius: '4px', maxWidth: '300px' }}>
            <div 
              className="progress-bar" 
              role="progressbar" 
              style={{ width: `${session.progress || Math.round((answeredCount / questions.length) * 100)}%`, backgroundColor: 'var(--primary-purple)' }}
            />
          </div>
          <span className="text-muted small fw-semibold flex-shrink-0">{answeredCount} of {questions.length} Answered</span>
        </div>

        <div className="d-flex align-items-center gap-2 border-start ps-3 flex-shrink-0">
          <FiClock className="text-danger fs-5" />
          <strong className="text-danger" style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{formatTime(timeRemaining)}</strong>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Side: Question Palette */}
        <div className="col-md-3">
          <div className="glass-panel p-3 bg-white mb-4 shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
            <span className="fw-bold text-dark d-block mb-3" style={{ fontSize: '0.8rem' }}>Question Palette</span>
            
            <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {questions.map((q, idx) => {
                const ansData = answersMap[q._id];
                const hasAnswer = (ansData?.answer?.trim()?.length > 0) || (ansData?.codeDetails?.code?.trim()?.length > 0) || (ansData?.systemDesignDetails?.diagramNodes?.length > 0);
                const isSkipped = ansData && ansData.skipped;
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-secondary bg-opacity-10 text-secondary border-0';
                if (isCurrent) {
                  btnClass = 'btn-outline-primary border-primary fw-bold text-primary';
                } else if (hasAnswer) {
                  btnClass = 'bg-success text-success bg-opacity-10 border-0 fw-bold';
                } else if (isSkipped) {
                  btnClass = 'bg-danger text-danger bg-opacity-10 border-0 fw-bold';
                }

                return (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`btn rounded-3 p-2 d-flex flex-column align-items-center justify-content-center transition-all ${btnClass}`}
                    style={{ 
                      fontSize: '0.8rem',
                      aspectRatio: '1',
                      borderWidth: isCurrent ? '2px' : '0px',
                      borderColor: isCurrent ? 'var(--primary-purple)' : '',
                      color: isCurrent ? 'var(--primary-purple)' : ''
                    }}
                  >
                    <span>{idx + 1}</span>
                    {q.questionType === 'coding' && <FiCode style={{ fontSize: '0.62rem' }} />}
                    {q.questionType === 'system_design' && <FiLayers style={{ fontSize: '0.62rem' }} />}
                  </button>
                );
              })}
            </div>

            {/* Legends */}
            <div className="border-top mt-3 pt-3" style={{ fontSize: '0.72rem' }}>
              <span className="fw-semibold text-muted d-block mb-2">Palette Legends</span>
              <div className="d-flex flex-wrap gap-2">
                <span className="d-inline-flex align-items-center gap-1"><span className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: '#e2e8f0' }}/> Unvisited</span>
                <span className="d-inline-flex align-items-center gap-1"><span className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: '#25c2a0' }}/> Answered</span>
                <span className="d-inline-flex align-items-center gap-1"><span className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: '#ef4444' }}/> Skipped</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Active Question Console Box */}
        <div className="col-md-9">
          <div className="glass-panel p-4 bg-white d-flex flex-column justify-content-between shadow-sm" style={{ border: '1px solid var(--border-grey)', minHeight: '520px' }}>
            
            <div>
              {/* Question metadata indicators */}
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small fw-semibold">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  {!isCodingQuestion && !isSystemDesignQuestion && (
                    <button
                      type="button"
                      onClick={() => setShowAvatar(!showAvatar)}
                      className={`btn btn-sm py-0.5 px-2 rounded-pill ${showAvatar ? 'btn-primary-purple text-white' : 'btn-outline-secondary'}`}
                      style={{ fontSize: '0.68rem' }}
                    >
                      🤖 {showAvatar ? 'Hide Avatar' : 'Show AI Avatar'}
                    </button>
                  )}
                </div>
                <div className="d-flex gap-1.5" style={{ fontSize: '0.7rem' }}>
                  <span className="badge bg-primary bg-opacity-10 text-primary capitalize px-2.5 py-1">
                    {activeQuestion.questionType === 'system_design' ? 'System Design' : activeQuestion.questionType}
                  </span>
                  <span className="badge bg-secondary bg-opacity-10 text-secondary px-2.5 py-1">
                    {activeQuestion.topic}
                  </span>
                  <span className="badge bg-success bg-opacity-10 text-success px-2.5 py-1">
                    {activeQuestion.difficulty}
                  </span>
                </div>
              </div>

              {/* Animated AI Interviewer Avatar Companion (for non-coding/design) */}
              {!isCodingQuestion && !isSystemDesignQuestion && showAvatar && (
                <div className="mb-3">
                  <AIAvatarInterviewer
                    questionText={activeQuestion.question || ''}
                    questionNumber={currentIndex + 1}
                    totalQuestions={questions.length}
                    mode="compact"
                    showControls={true}
                    showSubtitles={true}
                    onSpeechStart={() => setIsSpeakingQuestion(true)}
                    onSpeechEnd={() => setIsSpeakingQuestion(false)}
                    style={{ minHeight: '300px', maxHeight: '340px' }}
                  />
                </div>
              )}

              {/* Question card text */}
              <div className="mb-3">
                <div className="fw-bold text-dark mb-2" style={{ fontSize: '1.05rem', lineHeight: '1.5' }}>
                  <TypewriterQuestion
                    text={activeQuestion.question || ''}
                    isSpeaking={isSpeakingQuestion}
                  />
                </div>

                {/* Additional context for coding / system design */}
                {isCodingQuestion && activeQuestion.codingDetails && (
                  <div className="p-3 bg-light rounded-3 mb-3 border border-secondary-subtle" style={{ fontSize: '0.82rem' }}>
                    {activeQuestion.codingDetails.constraints?.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-dark d-block">Constraints:</strong>
                        <ul className="mb-0 text-muted ps-3">
                          {activeQuestion.codingDetails.constraints.map((c, ci) => (
                            <li key={ci}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeQuestion.codingDetails.testCases?.length > 0 && (
                      <div>
                        <strong className="text-dark d-block mb-1">Sample Test Case:</strong>
                        <div className="font-monospace p-2 bg-white rounded border text-muted" style={{ fontSize: '0.78rem' }}>
                          <div><strong>Input:</strong> {activeQuestion.codingDetails.testCases[0].input}</div>
                          <div><strong>Expected Output:</strong> {activeQuestion.codingDetails.testCases[0].expectedOutput || activeQuestion.codingDetails.testCases[0].output}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isSystemDesignQuestion && activeQuestion.systemDesignDetails && (
                  <div className="p-3 bg-light rounded-3 mb-3 border border-secondary-subtle" style={{ fontSize: '0.82rem' }}>
                    {activeQuestion.systemDesignDetails.requirements?.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-dark d-block">Key System Requirements:</strong>
                        <ul className="mb-0 text-muted ps-3">
                          {activeQuestion.systemDesignDetails.requirements.map((r, ri) => (
                            <li key={ri}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeQuestion.systemDesignDetails.scaleEstimates && (
                      <div>
                        <strong className="text-dark d-block">Scale Estimates:</strong>
                        <span className="text-muted">{activeQuestion.systemDesignDetails.scaleEstimates}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DYNAMIC ANSWER INTERFACE */}

              {/* 1. CODING INTERFACE */}
              {isCodingQuestion ? (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveCodingTab('editor')}
                        className={`btn btn-sm py-1 px-3 rounded-pill ${activeCodingTab === 'editor' ? 'btn-primary-purple text-white' : 'btn-light border'}`}
                        style={{ fontSize: '0.78rem' }}
                      >
                        <FiCode /> Code Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCodingTab('console')}
                        className={`btn btn-sm py-1 px-3 rounded-pill ${activeCodingTab === 'console' ? 'btn-primary-purple text-white' : 'btn-light border'}`}
                        style={{ fontSize: '0.78rem' }}
                      >
                        <FiTerminal /> Test Execution & Output
                      </button>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={handleRunCode}
                        disabled={isRunningCode}
                        className="btn btn-sm btn-success px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 shadow-sm"
                        style={{ fontSize: '0.8rem' }}
                      >
                        {isRunningCode ? <FiRefreshCw className="spin" /> : <FiPlay />}
                        {isRunningCode ? 'Running...' : 'Run Test Cases'}
                      </button>
                    </div>
                  </div>

                  {activeCodingTab === 'editor' ? (
                    <CodeEditor
                      code={activeAns.codeDetails?.code || ''}
                      onChange={handleCodeChange}
                      language={activeAns.codeDetails?.language || 'javascript'}
                      onLanguageChange={handleCodeLanguageChange}
                      onResetCode={handleResetCode}
                      height="440px"
                      initialTheme="vs-dark"
                    />
                  ) : (
                    <div className="border rounded-3 p-3 bg-dark text-white font-monospace" style={{ minHeight: '380px', fontSize: '0.82rem' }}>
                      <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2 mb-3">
                        <span className="text-info fw-bold d-flex align-items-center gap-1">
                          <FiTerminal /> Execution Console
                        </span>
                        {activeAns.codeDetails?.passedCount !== undefined && (
                          <span className={`badge ${activeAns.codeDetails.passedCount === activeAns.codeDetails.totalCount ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {activeAns.codeDetails.passedCount} / {activeAns.codeDetails.totalCount} Passed
                          </span>
                        )}
                      </div>

                      {executionOutput ? (
                        <div>
                          {executionOutput.compileError && (
                            <div className="alert alert-danger p-2 font-monospace mb-3" style={{ fontSize: '0.78rem' }}>
                              <strong>Compilation Error:</strong>
                              <pre className="mb-0 mt-1">{executionOutput.compileError}</pre>
                            </div>
                          )}

                          <div className="d-flex flex-column gap-2">
                            {(executionOutput.testCaseResults || []).map((tc, idx) => (
                              <div key={idx} className={`p-2.5 rounded border ${tc.passed ? 'border-success bg-success bg-opacity-10' : 'border-danger bg-danger bg-opacity-10'}`}>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="fw-bold">Test Case {idx + 1}</span>
                                  <span className={`badge ${tc.passed ? 'bg-success' : 'bg-danger'}`}>
                                    {tc.passed ? 'PASSED' : 'FAILED'}
                                  </span>
                                </div>
                                <div className="text-white-50 small">Input: <span className="text-white">{tc.input}</span></div>
                                <div className="text-white-50 small">Expected: <span className="text-success">{tc.expectedOutput}</span></div>
                                <div className="text-white-50 small">Actual: <span className={tc.passed ? 'text-success' : 'text-danger'}>{tc.actualOutput || 'None'}</span></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-white-50 text-center py-5">
                          Click "Run Test Cases" to execute your solution against live test cases.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : isSystemDesignQuestion ? (
                /* 2. SYSTEM DESIGN INTERFACE */
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSdTab('canvas')}
                        className={`btn btn-sm py-1 px-3 rounded-pill ${activeSdTab === 'canvas' ? 'btn-primary-purple text-white' : 'btn-light border'}`}
                        style={{ fontSize: '0.78rem' }}
                      >
                        <FiLayers /> Architecture Canvas
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSdTab('doc')}
                        className={`btn btn-sm py-1 px-3 rounded-pill ${activeSdTab === 'doc' ? 'btn-primary-purple text-white' : 'btn-light border'}`}
                        style={{ fontSize: '0.78rem' }}
                      >
                        <FiFileText /> Design Spec Document
                      </button>
                    </div>
                  </div>

                  {activeSdTab === 'canvas' ? (
                    <ArchitectureCanvas
                      initialNodes={activeAns.systemDesignDetails?.diagramNodes || []}
                      initialConnections={activeAns.systemDesignDetails?.connections || []}
                      onChange={handleArchitectureCanvasChange}
                      height="500px"
                    />
                  ) : (
                    <div>
                      <label className="form-label-mock">System Architecture Specification & Rationale</label>
                      <textarea
                        rows="12"
                        className="input-mock font-monospace"
                        style={{ fontSize: '0.84rem', resize: 'vertical' }}
                        placeholder="Explain your database schema, caching strategy, messaging queues, load balancing, and failure recovery trade-offs here..."
                        value={activeAns.systemDesignDetails?.designDoc || ''}
                        onChange={(e) => handleSystemDesignDocChange(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* 3. STANDARD CONCEPTUAL / BEHAVIORAL TEXTAREA */
                <div className="mb-3">
                  <label className="form-label-mock">Your Answer Response</label>
                  <textarea
                    rows="8"
                    className="input-mock font-monospace"
                    style={{ fontSize: '0.84rem', resize: 'vertical' }}
                    placeholder="Type your response draft here..."
                    value={currentAnswerText}
                    onChange={(e) => handleLocalAnswerChange(e.target.value)}
                  />
                </div>
              )}

            </div>

            {/* Navigation buttons container */}
            <div className="border-top pt-3 d-flex justify-content-between align-items-center mt-3">
              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  disabled={currentIndex === 0 || isSpeakingQuestion}
                  onClick={() => {
                    setIsSpeakingQuestion(true);
                    handlePrev();
                  }}
                  className="btn btn-sm btn-white-custom py-2 px-3 d-flex align-items-center gap-1"
                  style={{ opacity: (currentIndex === 0 || isSpeakingQuestion) ? 0.4 : 1 }}
                >
                  <FiChevronLeft /> Previous
                </button>
                <button 
                  type="button" 
                  disabled={isSpeakingQuestion}
                  onClick={handleSkipQuestion}
                  className="btn btn-sm btn-outline-danger py-2 px-3 d-flex align-items-center gap-1 border border-danger-subtle text-danger bg-transparent"
                  style={{ opacity: isSpeakingQuestion ? 0.4 : 1 }}
                >
                  Skip
                </button>
              </div>

              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  onClick={handleSaveManualDraft}
                  disabled={savingDraft || isSpeakingQuestion}
                  className="btn btn-sm btn-white-custom py-2 px-3 d-flex align-items-center gap-1.5"
                  style={{ opacity: (savingDraft || isSpeakingQuestion) ? 0.5 : 1 }}
                >
                  <FiSave /> {savingDraft ? 'Saving...' : 'Save Draft'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsSpeakingQuestion(true);
                    handleNext();
                  }}
                  disabled={isSpeakingQuestion}
                  className="btn btn-sm btn-primary-purple py-2 px-3.5 d-flex align-items-center gap-1"
                  style={{ opacity: isSpeakingQuestion ? 0.5 : 1, cursor: isSpeakingQuestion ? 'not-allowed' : 'pointer' }}
                >
                  {currentIndex === questions.length - 1 ? 'Review Summary' : 'Next'} <FiChevronRight />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewActive;
