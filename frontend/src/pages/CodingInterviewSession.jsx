import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiPlay, FiCheckCircle, FiClock, FiAlertCircle, FiCode,
  FiTerminal, FiMaximize, FiMinimize, FiCpu, FiRotateCcw, FiLayers,
  FiShield, FiAlertTriangle
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import CodeEditor from '../components/CodeEditor';
import AIAvatarInterviewer from '../components/AIAvatarInterviewer';
import TypewriterQuestion from '../components/TypewriterQuestion';

const CodingInterviewSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);

  // Fullscreen Lockdown State Machine
  const [interviewState, setInterviewState] = useState(document.fullscreenElement ? 'INTERVIEW_ACTIVE' : 'INTERVIEW_PAUSED');
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [lockdownReason, setLockdownReason] = useState(document.fullscreenElement ? '' : 'Fullscreen mode is strictly required during your coding technical interview.');
  const [tabSwitchStrikes, setTabSwitchStrikes] = useState(0);

  // Code state
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [userCode, setUserCode] = useState('');

  // Execution & Console states
  const [runningCode, setRunningCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [executionResults, setExecutionResults] = useState([]);
  const [executionSummary, setExecutionSummary] = useState(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcases'); // 'testcases' | 'custom' | 'results'
  const [customInput, setCustomInput] = useState('');
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);

  // Timer state
  const [timeLeftSec, setTimeLeftSec] = useState(45 * 60);
  const timerIntervalRef = useRef(null);

  // Single Terminate Protection State
  const [isTerminating, setIsTerminating] = useState(false);
  const isTerminatingRef = useRef(false);

  // Avatar Voice state
  const [showAvatar, setShowAvatar] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const interviewStateRef = useRef(interviewState);
  useEffect(() => {
    interviewStateRef.current = interviewState;
  }, [interviewState]);

  const isSubmittingRef = useRef(false);
  const tabSwitchStrikesRef = useRef(0);

  // Fullscreen Enforcement & Proctoring Listeners
  useEffect(() => {
    document.body.classList.add('interview-lockdown-active');

    const requestFullscreenSafe = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
          setInterviewState('INTERVIEW_ACTIVE');
        }
      } catch (err) {
        console.warn('Fullscreen request waiting for user click:', err);
      }
    };

    requestFullscreenSafe();

    const handleFullscreenChange = () => {
      if (isSubmittingRef.current) return;
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      if (!isNowFullscreen && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason('Fullscreen mode was exited. Fullscreen is strictly required during the coding interview.');
      } else if (isNowFullscreen && interviewStateRef.current === 'INTERVIEW_PAUSED') {
        setInterviewState('INTERVIEW_ACTIVE');
        setLockdownReason('');
      }
    };

    const handleVisibilityChange = () => {
      if (isSubmittingRef.current) return;
      if (document.hidden && interviewStateRef.current === 'INTERVIEW_ACTIVE') {
        tabSwitchStrikesRef.current += 1;
        setTabSwitchStrikes(tabSwitchStrikesRef.current);
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason(`⚠️ Tab Switch detected (Warning ${tabSwitchStrikesRef.current}/3). Leaving the coding IDE window is prohibited.`);
        toast.warn(`Proctoring Alert: Tab switch detected (${tabSwitchStrikesRef.current}/3)`);
      }
    };

    const handleWindowBlur = () => {
      if (isSubmittingRef.current) return;
      if (interviewStateRef.current === 'INTERVIEW_ACTIVE') {
        tabSwitchStrikesRef.current += 1;
        setTabSwitchStrikes(tabSwitchStrikesRef.current);
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason(`⚠️ Window focus lost (Warning ${tabSwitchStrikesRef.current}/3). Please remain focused on the coding interview.`);
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
          setLockdownReason('Fullscreen exit intercepted. Please stay in fullscreen mode.');
        }
        return false;
      }
      // Intercept F11
      if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.classList.remove('interview-lockdown-active');
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const handleResumeFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setInterviewState('INTERVIEW_ACTIVE');
      setLockdownReason('');
      toast.success('Fullscreen restored! Resuming coding session.');
    } catch (err) {
      console.error('Error entering fullscreen:', err);
      // Fallback activate
      setInterviewState('INTERVIEW_ACTIVE');
      setLockdownReason('');
    }
  };

  const toggleFullscreenManually = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Toggle fullscreen failed:', e);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  const fetchSession = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/coding/session/${id}`);
      if (response.data && response.data.success) {
        const sess = response.data.session;
        setSession(sess);

        const lang = sess.selectedLanguage || 'javascript';
        setSelectedLanguage(lang);

        const currentProb = sess.problems[0] || {};
        const initialCode = currentProb.userCode || 
          (currentProb.starterCode && currentProb.starterCode[lang]) || 
          (currentProb.starterCode && currentProb.starterCode.javascript) || 
          (currentProb.starterCode && currentProb.starterCode.c) || '';
        setUserCode(initialCode);

        // Pre-fill custom test case input
        if (currentProb.testCases && currentProb.testCases.length > 0) {
          setCustomInput(currentProb.testCases[0].input);
        }

        // Initialize Timer
        const totalMinutes = sess.timeLimitMinutes || 45;
        const timeSpent = sess.timeSpentSeconds || 0;
        const remaining = Math.max(0, (totalMinutes * 60) - timeSpent);
        setTimeLeftSec(remaining);
      }
    } catch (err) {
      console.error('Error fetching coding session:', err);
      toast.error('Failed to load coding interview session.');
      navigate('/mock-interviews');
    } finally {
      setLoading(false);
    }
  };

  // Countdown Timer
  useEffect(() => {
    if (loading || submitting || session?.status === 'Completed' || interviewState === 'INTERVIEW_PAUSED') return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeftSec(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          toast.warning('Time limit reached for this coding interview!');
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [loading, submitting, session, interviewState]);

  const currentProblem = session?.problems?.[currentProblemIndex] || {};

  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    const starter = currentProblem.starterCode?.[newLang] || '';
    if (!userCode || userCode === currentProblem.starterCode?.[selectedLanguage] || !userCode.trim()) {
      setUserCode(starter);
    }
  };

  const handleResetCode = () => {
    const starter = currentProblem.starterCode?.[selectedLanguage] || 
                    currentProblem.starterCode?.javascript || 
                    currentProblem.starterCode?.c || '';
    setUserCode(starter);
    toast.info('Code reset to default starter template.');
  };

  const handleRunCode = async () => {
    if (!userCode.trim()) {
      toast.warning('Please write your solution before running code.');
      return;
    }

    setRunningCode(true);
    setActiveConsoleTab('results');

    try {
      let customCases = [];
      if (activeConsoleTab === 'custom' && customInput.trim()) {
        customCases.push({ input: customInput.trim(), expectedOutput: 'Custom Run' });
      }

      const response = await axiosInstance.post('/coding/run', {
        sessionId: session.sessionId,
        problemIndex: currentProblemIndex,
        code: userCode,
        language: selectedLanguage,
        customTestCases: customCases
      });

      if (response.data && response.data.success) {
        setExecutionResults(response.data.results || []);
        setExecutionSummary(response.data.summary || null);

        if (response.data.summary?.allPassed) {
          toast.success('All sample test cases passed!');
        } else {
          toast.warn(`${response.data.summary?.passed || 0}/${response.data.summary?.total || 0} test cases passed.`);
        }
      }
    } catch (err) {
      console.error('Error running code:', err);
      toast.error('Failed to execute code. Please check your syntax.');
    } finally {
      setRunningCode(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!userCode.trim()) {
      toast.warning('Please write code before submitting your solution.');
      return;
    }

    const confirmSubmit = window.confirm(
      'Are you ready to submit your solution? Your code will be evaluated against all test cases and graded for quality by Gemini AI.'
    );
    if (!confirmSubmit) return;

    await executeSubmit();
  };

  const handleAutoSubmit = async () => {
    await executeSubmit();
  };

  const executeSubmit = async () => {
    isSubmittingRef.current = true;
    setSubmitting(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    try {
      const timeSpent = (session?.timeLimitMinutes * 60) - timeLeftSec;

      toast.info('Analyzing code quality, complexity, and running all test cases...');
      const response = await axiosInstance.post('/coding/submit', {
        sessionId: session.sessionId,
        problemIndex: currentProblemIndex,
        code: userCode,
        language: selectedLanguage,
        timeSpentSeconds: Math.max(10, timeSpent)
      });

      if (response.data && response.data.success) {
        toast.success('Coding interview evaluated successfully!');
        if (document.fullscreenElement && document.exitFullscreen) {
          try { await document.exitFullscreen(); } catch (e) {}
        }
        navigate(`/coding-interview/report/${session.sessionId}`);
      }
    } catch (err) {
      console.error('Error submitting solution:', err);
      toast.error('Failed to submit coding solution.');
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleTerminateInterview = async () => {
    if (isTerminatingRef.current) return;
    const confirmTerm = window.confirm(
      'Are you sure you want to terminate this coding interview? Your progress will be marked as "Terminated in between" and score will be 0.'
    );
    if (!confirmTerm) return;

    isTerminatingRef.current = true;
    setIsTerminating(true);

    try {
      toast.info('Terminating coding session...');
      await axiosInstance.post('/coding/terminate', {
        sessionId: session.sessionId,
        reason: 'User terminated coding round'
      });
      if (document.fullscreenElement && document.exitFullscreen) {
        try { await document.exitFullscreen(); } catch (e) {}
      }
      toast.warning('Coding interview terminated.');
      navigate('/mock-interviews');
    } catch (err) {
      console.error('Error terminating:', err);
      navigate('/mock-interviews');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading coding IDE...</span>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 p-4 text-center animate-fade-in" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: '3.5rem', height: '3.5rem', color: 'var(--primary-purple)' }} role="status">
          <span className="visually-hidden">Analyzing...</span>
        </div>
        <h3 className="fw-bold text-dark mb-2">Analyzing Code Quality & Algorithmic Performance...</h3>
        <p className="text-muted small mb-4" style={{ maxWidth: '550px' }}>Gemini AI is evaluating your time complexity, space complexity, edge case coverage, and clean code practices.</p>
        <div className="progress w-100 mb-3" style={{ maxWidth: '480px', height: '8px' }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated bg-success" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  const minutesLeft = Math.floor(timeLeftSec / 60);
  const secondsLeft = timeLeftSec % 60;
  const sampleTestCases = (currentProblem.testCases || []).filter(tc => !tc.isHidden);

  return (
    <div className="coding-fullscreen-workspace position-relative d-flex flex-column min-vh-100 text-start" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
      
      {/* Fullscreen Lockdown Modal Overlay */}
      {interviewState === 'INTERVIEW_PAUSED' && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            zIndex: 999999,
            padding: '2rem'
          }}
        >
          <div className="p-4 p-md-5 rounded-4 text-center shadow-lg border" style={{ backgroundColor: '#ffffff', maxWidth: '500px', width: '100%', borderColor: '#e2e8f0' }}>
            <div className="badge bg-danger bg-opacity-10 text-danger p-3 rounded-circle mb-3 fs-3">
              <FiShield size={36} />
            </div>
            <h4 className="fw-bold text-dark mb-2">Fullscreen Mode Required</h4>
            <p className="text-muted small mb-4" style={{ lineHeight: '1.6' }}>
              {lockdownReason || 'To ensure assessment integrity, this coding technical interview requires fullscreen mode. Sidebar navigation and tab switching are locked during the active session.'}
            </p>

            <button
              onClick={handleResumeFullscreen}
              className="btn btn-primary-purple text-white px-4 py-2.5 rounded-pill fw-bold w-100 d-flex align-items-center justify-content-center gap-2 shadow"
            >
              <FiMaximize /> Enter Fullscreen & Resume Session
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar Header */}
      <div 
        className="d-flex flex-wrap justify-content-between align-items-center gap-3 px-3 py-2.5 border-bottom select-none bg-white shadow-sm"
        style={{ borderColor: '#e2e8f0' }}
      >
        {/* Left: Problem info badges */}
        <div className="d-flex align-items-center gap-2.5 flex-wrap">
          <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2.5 py-1.5 rounded-pill" style={{ fontSize: '0.78rem' }}>
            💻 {currentProblem.category || 'Algorithms'}
          </span>
          <h5 className="fw-bold text-dark mb-0 fs-6">
            {currentProblem.title}
          </h5>
          <span className={`badge ${currentProblem.difficulty === 'Easy' ? 'bg-success' : currentProblem.difficulty === 'Medium' ? 'bg-warning text-dark' : 'bg-danger'} fw-bold px-2 py-1`} style={{ fontSize: '0.72rem' }}>
            {currentProblem.difficulty}
          </span>
        </div>

        {/* Right: Timer, Avatar toggle, Fullscreen toggle, Terminate */}
        <div className="d-flex align-items-center gap-2.5">
          <div className={`badge ${timeLeftSec <= 300 ? 'bg-danger text-white animate-pulse' : 'bg-light text-dark border border-secondary border-opacity-25'} px-3 py-2 font-monospace fs-6 shadow-sm d-flex align-items-center gap-1.5`}>
            <FiClock /> {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
          </div>

          <button
            onClick={() => setShowAvatar(!showAvatar)}
            className={`btn btn-sm ${showAvatar ? 'btn-primary-purple text-white' : 'btn-outline-secondary'} py-1 px-2.5 rounded-pill`}
            style={{ fontSize: '0.76rem' }}
            title="Toggle AI Interviewer Avatar"
          >
            🤖 {showAvatar ? 'Hide AI' : 'Show AI'}
          </button>

          <button
            onClick={toggleFullscreenManually}
            className="btn btn-sm btn-outline-secondary py-1 px-2.5 rounded-pill d-flex align-items-center gap-1"
            style={{ fontSize: '0.76rem' }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <FiMinimize size={13} /> : <FiMaximize size={13} />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>

          <button
            onClick={handleTerminateInterview}
            disabled={isTerminating}
            className="btn btn-sm btn-outline-danger py-1 px-3 rounded-pill fw-semibold d-flex align-items-center gap-1"
            style={{ fontSize: '0.76rem' }}
          >
            <FiAlertCircle /> {isTerminating ? 'Terminating...' : 'Terminate'}
          </button>
        </div>
      </div>

      {/* Main Split Workspace Canvas */}
      <div className="flex-grow-1 p-3">
        <div className="row g-3 h-100">
          
          {/* Left Column: AI Avatar & Problem Statement Card */}
          <div className="col-lg-5 d-flex flex-column gap-3">
            
            {/* AI Avatar Card */}
            {showAvatar && (
              <div 
                className="p-0 border overflow-hidden shadow-sm flex-shrink-0 bg-white" 
                style={{ 
                  height: '280px', 
                  borderColor: '#e2e8f0', 
                  borderRadius: '14px' 
                }}
              >
                <AIAvatarInterviewer
                  questionText={`Welcome to your coding interview! Today we are working on ${currentProblem.title}. Please review the problem statement, constraints, and test cases carefully before coding.`}
                  questionNumber={1}
                  totalQuestions={1}
                  isRecording={false}
                  isEvaluating={submitting}
                  mode="compact"
                  showControls={true}
                  showSubtitles={true}
                  onSpeechStart={() => setIsAiSpeaking(true)}
                  onSpeechEnd={() => setIsAiSpeaking(false)}
                  style={{ height: '100%', minHeight: '280px' }}
                />
              </div>
            )}

            {/* Problem Statement Card */}
            <div 
              className="p-4 border shadow-sm flex-grow-1 overflow-auto bg-white rounded-3" 
              style={{ 
                borderColor: '#e2e8f0', 
                maxHeight: showAvatar ? '540px' : '820px',
                borderRadius: '14px'
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: '#e2e8f0' }}>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <FiCode className="text-primary" /> Problem Description
                </h5>
                <span className="text-muted small">Language: <strong className="text-dark">{selectedLanguage.toUpperCase()}</strong></span>
              </div>

              {/* Problem Description */}
              <div className="text-secondary mb-4" style={{ fontSize: '0.88rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                <TypewriterQuestion text={currentProblem.description || ''} isSpeaking={isAiSpeaking} />
              </div>

              {/* Examples */}
              {currentProblem.examples && currentProblem.examples.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-2.5 small">Examples:</h6>
                  <div className="d-flex flex-column gap-2.5">
                    {currentProblem.examples.map((ex, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-3 font-monospace border bg-light" 
                        style={{ borderColor: '#e2e8f0', fontSize: '0.8rem' }}
                      >
                        <div className="text-dark mb-1"><strong>Example {idx + 1}:</strong></div>
                        <div className="text-secondary"><strong className="text-dark">Input:</strong> {ex.input}</div>
                        <div className="text-success"><strong className="text-success">Output:</strong> {ex.output}</div>
                        {ex.explanation && (
                          <div className="text-muted mt-1 small font-sans-serif" style={{ fontFamily: 'inherit' }}>
                            <em>Explanation: {ex.explanation}</em>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Constraints */}
              {currentProblem.constraints && currentProblem.constraints.length > 0 && (
                <div>
                  <h6 className="fw-bold text-dark mb-2 small">Constraints:</h6>
                  <ul className="text-secondary small mb-0 ps-3 font-monospace" style={{ fontSize: '0.78rem' }}>
                    {currentProblem.constraints.map((c, idx) => (
                      <li key={idx} className="mb-1">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Code Editor & Execution Console */}
          <div className="col-lg-7 d-flex flex-column gap-3">
            
            {/* Monaco Code Editor */}
            <div className="flex-grow-1">
              <CodeEditor
                code={userCode}
                onChange={(newCode) => setUserCode(newCode)}
                language={selectedLanguage}
                onLanguageChange={handleLanguageChange}
                onResetCode={handleResetCode}
                height="480px"
                initialTheme="light"
                style={{ borderRadius: '14px' }}
              />
            </div>

            {/* Test Cases & Console Panel */}
            <div 
              className="p-3 border shadow-sm rounded-3 bg-white" 
              style={{ borderColor: '#e2e8f0', borderRadius: '14px', minHeight: '260px' }}
            >
              {/* Console Header Tabs */}
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom" style={{ borderColor: '#e2e8f0' }}>
                <div className="d-flex align-items-center gap-1.5">
                  <button
                    onClick={() => setActiveConsoleTab('testcases')}
                    className={`btn btn-sm py-1 px-3 rounded-pill fw-semibold ${activeConsoleTab === 'testcases' ? 'btn-primary-purple text-white' : 'btn-light border text-secondary'}`}
                    style={{ fontSize: '0.76rem' }}
                  >
                    Sample Cases ({sampleTestCases.length})
                  </button>
                  <button
                    onClick={() => setActiveConsoleTab('custom')}
                    className={`btn btn-sm py-1 px-3 rounded-pill fw-semibold ${activeConsoleTab === 'custom' ? 'btn-primary-purple text-white' : 'btn-light border text-secondary'}`}
                    style={{ fontSize: '0.76rem' }}
                  >
                    Custom Test
                  </button>
                  <button
                    onClick={() => setActiveConsoleTab('results')}
                    className={`btn btn-sm py-1 px-3 rounded-pill fw-semibold ${activeConsoleTab === 'results' ? 'btn-primary-purple text-white' : 'btn-light border text-secondary'}`}
                    style={{ fontSize: '0.76rem' }}
                  >
                    <FiTerminal className="me-1" /> Execution Results
                    {executionSummary && (
                      <span className={`badge ms-1.5 ${executionSummary.allPassed ? 'bg-success' : 'bg-danger'}`}>
                        {executionSummary.passed}/{executionSummary.total}
                      </span>
                    )}
                  </button>
                </div>

                {/* Actions: Run & Submit */}
                <div className="d-flex align-items-center gap-2">
                  <button
                    onClick={handleRunCode}
                    disabled={runningCode || submitting}
                    className="btn btn-sm btn-outline-primary px-3 py-1.5 rounded-pill fw-bold d-flex align-items-center gap-1.5 shadow-sm"
                    style={{ fontSize: '0.8rem' }}
                  >
                    {runningCode ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Running...
                      </>
                    ) : (
                      <>
                        <FiPlay /> Run Code
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSubmitSolution}
                    disabled={submitting || runningCode}
                    className="btn btn-sm btn-success text-white px-4 py-1.5 rounded-pill fw-bold d-flex align-items-center gap-1.5 shadow"
                    style={{ fontSize: '0.8rem' }}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle /> Submit Solution
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab 1: Sample Test Cases */}
              {activeConsoleTab === 'testcases' && (
                <div>
                  <div className="d-flex gap-2 mb-3">
                    {sampleTestCases.map((tc, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedTestCaseIdx(idx)}
                        className={`btn btn-sm py-1 px-2.5 rounded-2 font-monospace ${selectedTestCaseIdx === idx ? 'btn-primary-purple text-white' : 'btn-light text-secondary border'}`}
                        style={{ fontSize: '0.76rem' }}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {sampleTestCases[selectedTestCaseIdx] && (
                    <div className="p-3 rounded-3 border font-monospace bg-light" style={{ borderColor: '#e2e8f0', fontSize: '0.82rem' }}>
                      <div className="mb-2">
                        <span className="text-muted d-block small">Input:</span>
                        <div className="p-2 rounded mt-1 text-dark border bg-white" style={{ borderColor: '#e2e8f0' }}>
                          {sampleTestCases[selectedTestCaseIdx].input}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted d-block small">Expected Output:</span>
                        <div className="p-2 rounded mt-1 text-success fw-bold border bg-white" style={{ borderColor: '#e2e8f0' }}>
                          {sampleTestCases[selectedTestCaseIdx].expectedOutput}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Custom Test Case Input */}
              {activeConsoleTab === 'custom' && (
                <div>
                  <label className="form-label small fw-semibold text-dark">Enter Custom Input Arguments:</label>
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder='e.g., [2, 7, 11, 15], 9 or "race a car"'
                    className="form-control form-control-sm font-monospace mb-2 bg-white text-dark border"
                    style={{ fontSize: '0.82rem' }}
                  />
                  <span className="text-muted small">Click <strong>Run Code</strong> to execute your solution against this custom input.</span>
                </div>
              )}

              {/* Tab 3: Execution Results & Console Logs */}
              {activeConsoleTab === 'results' && (
                <div>
                  {runningCode ? (
                    <div className="text-center py-4 text-muted small">
                      <span className="spinner-border spinner-border-sm me-2 text-primary" role="status" />
                      Executing test cases against sandbox VM...
                    </div>
                  ) : executionResults.length === 0 ? (
                    <div className="text-center py-4 text-muted small">
                      Click <strong>Run Code</strong> to execute your solution and view timings, stdout logs, and test results.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2.5">
                      {executionResults.map((res, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-3 border ${res.passed ? 'bg-success bg-opacity-10 border-success' : 'bg-danger bg-opacity-10 border-danger'}`}
                          style={{ fontSize: '0.82rem' }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1.5">
                            <strong className={res.passed ? 'text-success' : 'text-danger'}>
                              {res.passed ? '✅ Test Case ' + res.testCaseIndex + ' Passed' : '❌ Test Case ' + res.testCaseIndex + ' Failed'}
                            </strong>
                            <span className="badge bg-light text-dark font-monospace border" style={{ fontSize: '0.7rem' }}>
                              ⏱️ {res.executionTimeMs} ms
                            </span>
                          </div>

                          <div className="font-monospace mb-1">
                            <span className="text-muted">Input:</span> <span className="text-dark">{res.input}</span>
                          </div>
                          <div className="font-monospace mb-1">
                            <span className="text-muted">Expected Output:</span> <span className="text-success fw-semibold">{res.expectedOutput}</span>
                          </div>
                          <div className="font-monospace">
                            <span className="text-muted">Your Output:</span> <span className={res.passed ? 'text-success' : 'text-danger fw-bold'}>{res.actualOutput}</span>
                          </div>

                          {res.stdout && (
                            <div className="mt-2 pt-1 border-top border-secondary border-opacity-25 font-monospace text-secondary small">
                              <strong>Stdout:</strong>
                              <pre className="mb-0 p-1.5 bg-light text-dark rounded mt-1 border" style={{ fontSize: '0.75rem', borderColor: '#e2e8f0' }}>{res.stdout}</pre>
                            </div>
                          )}
                          {res.error && (
                            <div className="mt-2 pt-1 border-top border-danger border-opacity-25 font-monospace text-danger small">
                              <strong>Runtime Error:</strong> {res.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>
      </div>

    </div>
  );
};

export default CodingInterviewSession;
