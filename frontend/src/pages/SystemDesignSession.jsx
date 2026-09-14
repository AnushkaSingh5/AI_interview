import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiClock, FiAlertTriangle, FiCheckCircle, FiSend, FiMaximize,
  FiMinimize, FiLayers, FiFileText, FiCpu, FiServer, FiDatabase,
  FiZap, FiActivity, FiX, FiCheck, FiInfo, FiHelpCircle, FiShield,
  FiAlertCircle
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import ArchitectureCanvas from '../components/ArchitectureCanvas';

const SystemDesignSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' or 'doc'
  const [timeLeft, setTimeLeft] = useState(1800);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);

  // Fullscreen Lockdown State Machine
  const [interviewState, setInterviewState] = useState(document.fullscreenElement ? 'INTERVIEW_ACTIVE' : 'INTERVIEW_PAUSED');
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [lockdownReason, setLockdownReason] = useState(document.fullscreenElement ? '' : 'Fullscreen mode is strictly required during the live system design architecture round.');
  const [tabSwitchStrikes, setTabSwitchStrikes] = useState(0);

  // Diagram state
  const [diagramNodes, setDiagramNodes] = useState([]);
  const [diagramConnections, setDiagramConnections] = useState([]);

  // Design Document state
  const [designDoc, setDesignDoc] = useState({
    systemOverview: '',
    apiEndpoints: '',
    dataModels: '',
    cachingStrategy: '',
    faultTolerance: '',
    tradeOffs: ''
  });

  const timerRef = useRef(null);
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
        setLockdownReason('Fullscreen mode was exited. Fullscreen is strictly required during the system design interview.');
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
        setLockdownReason(`⚠️ Tab Switch detected (Warning ${tabSwitchStrikesRef.current}/3). Leaving the system design studio is prohibited.`);
        toast.warn(`Proctoring Alert: Tab switch detected (${tabSwitchStrikesRef.current}/3)`);
      }
    };

    const handleWindowBlur = () => {
      if (isSubmittingRef.current) return;
      if (interviewStateRef.current === 'INTERVIEW_ACTIVE') {
        tabSwitchStrikesRef.current += 1;
        setTabSwitchStrikes(tabSwitchStrikesRef.current);
        setInterviewState('INTERVIEW_PAUSED');
        setLockdownReason(`⚠️ Window focus lost (Warning ${tabSwitchStrikesRef.current}/3). Please remain focused on the system design interview.`);
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

  useEffect(() => {
    fetchSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const fetchSession = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/system-design/session/${id}`);
      if (response.data && response.data.success) {
        const s = response.data.session;
        setSession(s);

        if (s.status === 'Completed') {
          navigate(`/system-design/report/${id}`);
          return;
        }

        if (s.diagramNodes && s.diagramNodes.length > 0) {
          setDiagramNodes(s.diagramNodes);
        } else if (s.scenario?.starterComponents && s.scenario.starterComponents.length > 0) {
          setDiagramNodes(s.scenario.starterComponents);
        }

        if (s.diagramConnections && s.diagramConnections.length > 0) {
          setDiagramConnections(s.diagramConnections);
        }

        if (s.designDocument) {
          setDesignDoc({
            systemOverview: s.designDocument.systemOverview || '',
            apiEndpoints: s.designDocument.apiEndpoints || '',
            dataModels: s.designDocument.dataModels || '',
            cachingStrategy: s.designDocument.cachingStrategy || '',
            faultTolerance: s.designDocument.faultTolerance || '',
            tradeOffs: s.designDocument.tradeOffs || ''
          });
        }

        const durationSec = (s.durationMinutes || s.timeLimitMinutes || 35) * 60;
        const elapsedSec = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 1000);
        const remaining = Math.max(0, durationSec - elapsedSec);
        setTimeLeft(remaining);

        startTimer(remaining);
      }
    } catch (error) {
      console.error('Error loading system design session:', error);
      toast.error(error.response?.data?.message || 'Failed to load session.');
      navigate('/mock-interviews');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (initialSec) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let sec = initialSec;
    timerRef.current = setInterval(() => {
      sec -= 1;
      setTimeLeft(sec);
      if (sec <= 0) {
        clearInterval(timerRef.current);
        handleAutoSubmit();
      }
    }, 1000);
  };

  const handleAutoSubmit = () => {
    toast.warning('Time limit expired! Automatically evaluating your architecture...');
    handleSubmitFinal();
  };

  const handleCanvasChange = ({ nodes, connections }) => {
    setDiagramNodes(nodes);
    setDiagramConnections(connections);
  };

  const handleDocChange = (field, value) => {
    setDesignDoc(prev => ({ ...prev, [field]: value }));
  };

  const handleResumeFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setInterviewState('INTERVIEW_ACTIVE');
      setLockdownReason('');
      toast.success('Fullscreen restored! Resuming system design round.');
    } catch (err) {
      console.error('Error entering fullscreen:', err);
      setInterviewState('INTERVIEW_ACTIVE');
    }
  };

  const toggleFullscreenManually = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
      setInterviewState('INTERVIEW_ACTIVE');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const handleSubmitFinal = async () => {
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      const payload = {
        diagramNodes,
        diagramConnections,
        designDocument: designDoc,
        timeSpentSeconds: ((session?.durationMinutes || 35) * 60) - timeLeft
      };

      const response = await axiosInstance.post(`/system-design/session/${id}/submit`, payload);
      if (response.data && response.data.success) {
        toast.success('Architecture evaluated successfully!');
        if (document.fullscreenElement && document.exitFullscreen) {
          try { await document.exitFullscreen(); } catch (e) {}
        }
        navigate(`/system-design/report/${id}`);
      } else {
        toast.error(response.data?.message || 'Evaluation failed.');
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    } catch (error) {
      console.error('Error submitting system design:', error);
      toast.error(error.response?.data?.message || 'Failed to submit architecture for AI evaluation.');
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleTerminate = async () => {
    try {
      await axiosInstance.post(`/system-design/session/${id}/terminate`);
      if (document.fullscreenElement && document.exitFullscreen) {
        try { await document.exitFullscreen(); } catch (e) {}
      }
      toast.info('Interview session terminated.');
      navigate('/mock-interviews');
    } catch (error) {
      navigate('/mock-interviews');
    }
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.max(0, totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <h6 className="fw-bold text-dark">Initializing System Design Studio...</h6>
        </div>
      </div>
    );
  }

  // Fullscreen Evaluating Screen while Gemini AI assesses architecture
  if (isSubmitting) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 p-4 text-center" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: '3.8rem', height: '3.8rem', color: 'var(--primary-purple)' }} role="status">
          <span className="visually-hidden">Evaluating Architecture...</span>
        </div>
        <h3 className="fw-bold text-dark mb-2">Analyzing Distributed Architecture & Scale...</h3>
        <p className="text-muted small mb-4" style={{ maxWidth: '600px', lineHeight: '1.6' }}>
          Gemini AI is evaluating your visual topology ({diagramNodes.length} components, {diagramConnections.length} flows) and technical design doc across 6 architectural pillars: Scalability, API Design, Data Modeling, Caching, Fault Tolerance, and CAP Trade-offs.
        </p>

        <div className="progress w-100 mb-4" style={{ maxWidth: '520px', height: '8px' }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated bg-success" style={{ width: '100%' }} />
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-2" style={{ maxWidth: '680px' }}>
          <span className="badge bg-light text-secondary border px-3 py-1.5 small">🔍 Component Topology</span>
          <span className="badge bg-light text-secondary border px-3 py-1.5 small">⚡ Throughput & Caching</span>
          <span className="badge bg-light text-secondary border px-3 py-1.5 small">🗄️ Database Sharding</span>
          <span className="badge bg-light text-secondary border px-3 py-1.5 small">🛡️ Fault Tolerance & Failover</span>
          <span className="badge bg-light text-secondary border px-3 py-1.5 small">📊 6-Pillar Scorecard</span>
        </div>
      </div>
    );
  }

  const scenario = session?.scenario || {};
  const isTimeCritical = timeLeft < 300;

  return (
    <div className="d-flex flex-column vh-100 bg-light text-dark overflow-hidden position-relative" style={{ userSelect: 'none' }}>
      
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
          <div className="p-4 p-md-5 rounded-4 text-center shadow-lg border" style={{ backgroundColor: '#ffffff', maxWidth: '520px', width: '100%', borderColor: '#e2e8f0' }}>
            <div className="badge bg-danger bg-opacity-10 text-danger p-3 rounded-circle mb-3 fs-3">
              <FiShield size={38} />
            </div>
            <h4 className="fw-bold text-dark mb-2">Fullscreen Mode Required</h4>
            <p className="text-muted small mb-4" style={{ lineHeight: '1.6' }}>
              {lockdownReason || 'To ensure assessment integrity, this System Design interview requires fullscreen mode. Sidebar navigation and window switching are locked during the active session.'}
            </p>

            <button
              onClick={handleResumeFullscreen}
              className="btn btn-primary-purple text-white px-4 py-2.5 rounded-pill fw-bold w-100 d-flex align-items-center justify-content-center gap-2 shadow"
            >
              <FiMaximize /> Enter Fullscreen & Begin Architecture Round
            </button>
          </div>
        </div>
      )}

      {/* Top Session Header Bar */}
      <header className="d-flex justify-content-between align-items-center px-3 px-md-4 py-2 bg-white border-bottom shadow-xs select-none" style={{ borderColor: '#e2e8f0', minHeight: '56px', zIndex: 100 }}>
        
        {/* Left: Challenge Title & Mode */}
        <div className="d-flex align-items-center gap-2.5 overflow-hidden me-2" style={{ maxWidth: '42%' }}>
          <div className="p-2 rounded-3 text-white flex-shrink-0" style={{ backgroundColor: '#8b5cf6' }}>
            <FiLayers size={17} />
          </div>
          <div className="overflow-hidden">
            <div className="d-flex align-items-center gap-1.5">
              <h6 className="fw-bold text-dark mb-0 text-truncate" style={{ fontSize: '0.9rem' }} title={session?.title}>
                {session?.title || 'System Design Challenge'}
              </h6>
              <span className={'badge flex-shrink-0 ' + (session?.difficulty === 'Easy' ? 'bg-success' : session?.difficulty === 'Medium' ? 'bg-warning text-dark' : 'bg-danger')} style={{ fontSize: '0.68rem' }}>
                {session?.difficulty}
              </span>
            </div>
            <span className="text-muted small d-block text-truncate" style={{ fontSize: '0.7rem' }}>
              {session?.interviewId || session?.sessionId} • Live Architecture Round
            </span>
          </div>
        </div>

        {/* Center: Fixed Countdown Timer */}
        <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-light border flex-shrink-0" style={{ borderColor: isTimeCritical ? '#ef4444' : '#cbd5e1' }}>
          <FiClock className={isTimeCritical ? 'text-danger animate-pulse' : 'text-primary'} size={14} />
          <strong className={'fs-6 font-monospace ' + (isTimeCritical ? 'text-danger fw-bold' : 'text-dark')}>
            {formatTime(timeLeft)}
          </strong>
        </div>

        {/* Right: Action Buttons (Always Visible & Never Hidden) */}
        <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
          <button
            type="button"
            onClick={toggleFullscreenManually}
            className="btn btn-sm btn-outline-secondary py-1 px-2.5 rounded-pill d-flex align-items-center gap-1"
            style={{ fontSize: '0.76rem' }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <FiMinimize size={13} /> : <FiMaximize size={13} />}
            <span className="d-none d-md-inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTerminateModal(true)}
            className="btn btn-sm btn-outline-danger py-1 px-3 rounded-pill fw-semibold"
            style={{ fontSize: '0.76rem' }}
          >
            Quit / Terminate
          </button>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
            className="btn btn-sm btn-primary-purple text-white py-1 px-3.5 rounded-pill fw-bold shadow-sm d-flex align-items-center gap-1.5"
            style={{ fontSize: '0.78rem' }}
          >
            <FiSend size={13} />
            <span>Submit Architecture</span>
          </button>
        </div>

      </header>

      {/* Main Split Layout */}
      <div className="d-flex flex-grow-1 overflow-hidden">
        
        {/* Left Panel: Problem Statement & Requirements */}
        <div 
          className="d-flex flex-column bg-white border-end overflow-auto text-start"
          style={{ width: '38%', minWidth: '340px', maxWidth: '460px', borderColor: '#e2e8f0' }}
        >
          {/* AI Avatar Persona Widget */}
          <div className="p-3 bg-light border-bottom d-flex align-items-center gap-2.5" style={{ borderColor: '#e2e8f0' }}>
            <div className="rounded-circle p-2 bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
              <FiCpu size={18} />
            </div>
            <div>
              <strong className="text-dark d-block small">Alex • Principal System Architect (AI)</strong>
              <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                Evaluating scalability, failure modes, APIs & data partitioning.
              </span>
            </div>
          </div>

          <div className="p-3.5 d-flex flex-column gap-3">
            
            {/* Overview Section */}
            <div>
              <h6 className="fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <FiInfo className="text-primary" /> Challenge Overview
              </h6>
              <p className="text-muted small mb-0" style={{ fontSize: '0.82rem', lineHeight: '1.45' }}>
                {scenario?.overview || scenario?.description || session?.description}
              </p>
            </div>

            {/* Functional Requirements */}
            {scenario?.functionalRequirements && scenario.functionalRequirements.length > 0 && (
              <div className="p-2.5 rounded-3 bg-light border" style={{ borderColor: '#e2e8f0' }}>
                <span className="fw-bold text-dark d-block small mb-1.5">Functional Requirements</span>
                <ul className="list-unstyled mb-0 d-flex flex-column gap-1 text-muted small" style={{ fontSize: '0.78rem' }}>
                  {scenario.functionalRequirements.map((req, i) => (
                    <li key={i} className="d-flex align-items-start gap-1.5">
                      <FiCheck className="text-success mt-0.5 flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Non-Functional Requirements */}
            {scenario?.nonFunctionalRequirements && scenario.nonFunctionalRequirements.length > 0 && (
              <div className="p-2.5 rounded-3 bg-light border" style={{ borderColor: '#e2e8f0' }}>
                <span className="fw-bold text-dark d-block small mb-1.5">Non-Functional SLAs & Constraints</span>
                <ul className="list-unstyled mb-0 d-flex flex-column gap-1 text-muted small" style={{ fontSize: '0.78rem' }}>
                  {scenario.nonFunctionalRequirements.map((req, i) => (
                    <li key={i} className="d-flex align-items-start gap-1.5">
                      <FiActivity className="text-primary mt-0.5 flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Scale & Capacity Estimation Numbers */}
            {scenario?.scaleEstimations && (
              <div className="p-2.5 rounded-3 bg-white border shadow-xs" style={{ borderColor: '#e2e8f0' }}>
                <span className="fw-bold text-dark d-block small mb-2 d-flex align-items-center gap-1.5">
                  <FiServer className="text-warning" /> Capacity & Traffic Estimates
                </span>
                <div className="row g-2 text-center" style={{ fontSize: '0.74rem' }}>
                  {scenario.scaleEstimations.dailyActiveUsers && (
                    <div className="col-6">
                      <div className="p-1.5 bg-light rounded">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Daily Active Users</span>
                        <strong className="text-dark">{scenario.scaleEstimations.dailyActiveUsers}</strong>
                      </div>
                    </div>
                  )}
                  {scenario.scaleEstimations.readWriteRatio && (
                    <div className="col-6">
                      <div className="p-1.5 bg-light rounded">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Read/Write Ratio</span>
                        <strong className="text-dark">{scenario.scaleEstimations.readWriteRatio}</strong>
                      </div>
                    </div>
                  )}
                  {scenario.scaleEstimations.storagePerYear && (
                    <div className="col-6">
                      <div className="p-1.5 bg-light rounded">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Storage Growth</span>
                        <strong className="text-dark">{scenario.scaleEstimations.storagePerYear}</strong>
                      </div>
                    </div>
                  )}
                  {scenario.scaleEstimations.bandwidth && (
                    <div className="col-6">
                      <div className="p-1.5 bg-light rounded">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>Peak Bandwidth</span>
                        <strong className="text-dark">{scenario.scaleEstimations.bandwidth}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Panel: Architecture Studio & Design Document Workspace */}
        <div className="d-flex flex-column flex-grow-1 overflow-hidden bg-white text-start">
          
          {/* Workspace Tabs */}
          <div className="d-flex justify-content-between align-items-center px-3 border-bottom bg-light select-none" style={{ borderColor: '#e2e8f0' }}>
            <div className="d-flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('canvas')}
                className={'btn btn-sm py-2 px-3 fw-semibold border-bottom-0 rounded-top-2 d-flex align-items-center gap-1.5 ' + (activeTab === 'canvas' ? 'bg-white text-primary border' : 'text-muted')}
                style={{ fontSize: '0.8rem', borderBottomColor: activeTab === 'canvas' ? '#ffffff' : 'transparent' }}
              >
                <FiLayers /> 1. Visual Architecture Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('doc')}
                className={'btn btn-sm py-2 px-3 fw-semibold border-bottom-0 rounded-top-2 d-flex align-items-center gap-1.5 ' + (activeTab === 'doc' ? 'bg-white text-primary border' : 'text-muted')}
                style={{ fontSize: '0.8rem', borderBottomColor: activeTab === 'doc' ? '#ffffff' : 'transparent' }}
              >
                <FiFileText /> 2. Technical Design Document
              </button>
            </div>

            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
              Auto-saved locally
            </span>
          </div>

          {/* Workspace Content */}
          <div className="flex-grow-1 overflow-auto p-3 bg-light">
            
            {activeTab === 'canvas' ? (
              <ArchitectureCanvas
                initialNodes={diagramNodes}
                initialConnections={diagramConnections}
                onChange={handleCanvasChange}
                readOnly={false}
                height="100%"
              />
            ) : (
              <div className="bg-white p-4 rounded-3 border shadow-sm d-flex flex-column gap-3.5" style={{ borderColor: '#e2e8f0' }}>
                
                <div>
                  <label className="form-label fw-bold text-dark small mb-1">
                    1. System Overview & Core High-Level Architecture
                  </label>
                  <textarea
                    rows="3"
                    value={designDoc.systemOverview}
                    onChange={(e) => handleDocChange('systemOverview', e.target.value)}
                    placeholder="Describe client traffic flow, API gateway ingress, microservices decomposition, and message flow..."
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label className="form-label fw-bold text-dark small mb-1">
                    2. API Interface Specifications (REST / gRPC Endpoints)
                  </label>
                  <textarea
                    rows="3"
                    value={designDoc.apiEndpoints}
                    onChange={(e) => handleDocChange('apiEndpoints', e.target.value)}
                    placeholder="e.g., POST /api/v1/shorten { url, customAlias } -> { shortCode, expiresAt }"
                    className="form-control form-control-sm font-monospace"
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label className="form-label fw-bold text-dark small mb-1">
                    3. Data Models & Database Storage Strategy (SQL vs NoSQL, Sharding)
                  </label>
                  <textarea
                    rows="3"
                    value={designDoc.dataModels}
                    onChange={(e) => handleDocChange('dataModels', e.target.value)}
                    placeholder="Schema designs, primary keys, indexing strategy, horizontal partitioning/sharding key choices..."
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label className="form-label fw-bold text-dark small mb-1">
                    4. Caching Strategy & Horizontal Scaling
                  </label>
                  <textarea
                    rows="3"
                    value={designDoc.cachingStrategy}
                    onChange={(e) => handleDocChange('cachingStrategy', e.target.value)}
                    placeholder="Redis cluster sizing, cache-aside pattern, TTL policies, write-through vs write-back..."
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label className="form-label fw-bold text-dark small mb-1">
                    5. Fault Tolerance, Redundancy & CAP Trade-offs
                  </label>
                  <textarea
                    rows="3"
                    value={designDoc.faultTolerance}
                    onChange={(e) => handleDocChange('faultTolerance', e.target.value)}
                    placeholder="Single points of failure mitigation, circuit breakers, multi-region failover, consistency vs availability choices..."
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999 }}>
          <div className="p-4 bg-white rounded-4 shadow-lg border text-start" style={{ maxWidth: '480px', width: '100%', borderColor: '#e2e8f0' }}>
            <h5 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
              <FiCheckCircle className="text-success" /> Submit Architecture for Evaluation?
            </h5>
            <p className="text-muted small mb-3" style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>
              Gemini AI will evaluate your visual diagram (<strong>{diagramNodes.length} components</strong>, <strong>{diagramConnections.length} flows</strong>) and technical design document across 6 architectural pillars.
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" onClick={() => setShowSubmitModal(false)} className="btn btn-sm btn-light border px-3">
                Continue Editing
              </button>
              <button type="button" onClick={handleSubmitFinal} className="btn btn-sm btn-primary-purple text-white px-3.5 fw-semibold">
                Submit & Evaluate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999 }}>
          <div className="p-4 bg-white rounded-4 shadow-lg border text-start" style={{ maxWidth: '420px', width: '100%', borderColor: '#e2e8f0' }}>
            <h5 className="fw-bold text-danger mb-2">Terminate Interview?</h5>
            <p className="text-muted small mb-3" style={{ fontSize: '0.82rem' }}>
              This will end your session and mark it as terminated. You can resume this session only once from the mock interviews history.
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" onClick={() => setShowTerminateModal(false)} className="btn btn-sm btn-light border px-3">
                Cancel
              </button>
              <button type="button" onClick={handleTerminate} className="btn btn-sm btn-danger px-3.5">
                Yes, Terminate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SystemDesignSession;
