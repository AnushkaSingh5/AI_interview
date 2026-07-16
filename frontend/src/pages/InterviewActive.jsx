import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiClock, FiCheckSquare, FiAlertCircle, FiHelpCircle, FiChevronLeft, 
  FiChevronRight, FiCheck, FiSave, FiAlertTriangle, FiBookOpen, FiCornerDownRight,
  FiCheckCircle, FiPlay
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const InterviewActive = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Wizard Steps: 'active' | 'review' | 'success'
  const [activeStep, setActiveStep] = useState('active');
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // Current active question index (0-indexed locally)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState({}); // questionId -> { answer, skipped, timeTaken }
  
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Timer state (seconds remaining)
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerIntervalRef = useRef(null);

  // Auto-save interval ref
  const autoSaveIntervalRef = useRef(null);

  useEffect(() => {
    fetchSessionContext();
    return () => {
      clearInterval(timerIntervalRef.current);
      clearInterval(autoSaveIntervalRef.current);
    };
  }, [id]);

  // Handle ticking timer
  useEffect(() => {
    if (activeStep === 'active' && timeRemaining > 0) {
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
  }, [activeStep, timeRemaining]);

  // Handle auto-save timer (every 10 seconds)
  useEffect(() => {
    if (activeStep === 'active') {
      autoSaveIntervalRef.current = setInterval(() => {
        triggerAutoSave();
      }, 10000);
    } else {
      clearInterval(autoSaveIntervalRef.current);
    }
    return () => clearInterval(autoSaveIntervalRef.current);
  }, [activeStep, currentIndex, answersMap]);

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

        // If interview is already submitted, redirect to dashboard
        if (['Submitted', 'AwaitingEvaluation', 'ReportGenerated', 'Completed'].includes(sess.status)) {
          toast.info('This interview has already been submitted.');
          navigate('/dashboard');
          return;
        }

        setSession(sess);
        setQuestions(qList);
        setTimeRemaining(sess.timeRemaining || sess.duration * 60);

        // Pre-fill local answers map
        const initialMap = {};
        qList.forEach(q => {
          const match = aList.find(a => a.questionId === q._id);
          initialMap[q._id] = {
            answer: match?.answer || '',
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
      toast.error('Failed to load mock interview workspace.');
      navigate('/dashboard');
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
        skipped: false // Reset skipped status
      }
    }));
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

    // Trigger immediate backend sync for skip
    await saveAnswerDraft(activeQ._id, updatedData);
    toast.info('Question marked as skipped.');

    // Auto-advance
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
    try {
      // Sync last draft first
      await triggerAutoSave();

      const response = await axiosInstance.post(`/interviews/${session._id}/submit`);
      if (response.data && response.data.success) {
        setSession(response.data.session);
        setActiveStep('success');
      }
    } catch (err) {
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
            <p className="text-muted">Your mock interview answers are locked and sent to the grading queue.</p>
          </div>

          <div className="border rounded-3 p-4 mb-4 bg-light bg-opacity-50 text-center">
            <FiAlertTriangle className="text-warning fs-3 mb-2" />
            <h4 className="fw-bold h6 text-dark mb-1">Awaiting AI Evaluation (Phase 6)</h4>
            <p className="text-muted mb-0" style={{ fontSize: '0.78rem' }}>
              Gemini model grading and feedback generation is locked during Phase 5. Results will unlock once evaluation models are integrated.
            </p>
          </div>

          <div className="d-flex flex-column gap-2">
            <button 
              disabled 
              className="btn btn-primary-purple w-100 py-2.5 opacity-50 cursor-not-allowed"
              style={{ cursor: 'not-allowed' }}
            >
              View Evaluation Results (Phase 6 Locked)
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
        <div className="glass-panel p-4 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
          <h2 className="fw-bold text-dark mb-1" style={{ fontSize: '1.45rem' }}>Review Answers</h2>
          <p className="text-muted small">Please review your draft responses before final submission. You can click on any question to modify it.</p>
          
          <div className="table-responsive border rounded-3 mt-3">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.86rem' }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '80px' }}>No.</th>
                  <th>Question</th>
                  <th style={{ width: '120px' }}>Type</th>
                  <th style={{ width: '140px' }}>Status</th>
                  <th style={{ width: '100px' }} className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => {
                  const ansData = answersMap[q._id];
                  const hasAnswer = ansData && ansData.answer?.trim().length > 0;
                  const isSkipped = ansData && ansData.skipped;

                  let statusText = 'Unanswered';
                  let statusBadge = 'bg-secondary text-secondary bg-opacity-10';
                  
                  if (hasAnswer) {
                    statusText = 'Answered';
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
                      </td>
                      <td>
                        <span className="badge bg-primary bg-opacity-10 text-primary" style={{ textTransform: 'capitalize' }}>
                          {q.questionType}
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
  const currentAnswerText = answersMap[activeQuestion._id]?.answer || '';
  
  // Calculate counts for side stats
  const answeredCount = Object.values(answersMap).filter(a => !a.skipped && a.answer?.trim().length > 0).length;
  const skippedCount = Object.values(answersMap).filter(a => a.skipped).length;

  return (
    <div className="container py-4 text-start">
      {/* Top dashboard info header */}
      <div className="glass-panel p-3 bg-white mb-4 d-flex justify-content-between align-items-center" style={{ border: '1px solid var(--border-grey)', fontSize: '0.84rem' }}>
        <div className="d-flex align-items-center gap-3 flex-grow-1 me-4">
          <strong className="text-dark flex-shrink-0">Progress:</strong>
          <div className="progress flex-grow-1" style={{ height: '8px', borderRadius: '4px', maxWidth: '300px' }}>
            <div 
              className="progress-bar" 
              role="progressbar" 
              style={{ width: `${session.progress || 0}%`, backgroundColor: 'var(--primary-purple)' }}
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
        {/* Left Side: Question Palette (Circles only, no titles/hints exposed) */}
        <div className="col-md-3">
          <div className="glass-panel p-3 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
            <span className="fw-bold text-dark d-block mb-3" style={{ fontSize: '0.8rem' }}>Question Palette</span>
            
            <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {questions.map((q, idx) => {
                const ansData = answersMap[q._id];
                const hasAnswer = ansData && ansData.answer?.trim().length > 0;
                const isSkipped = ansData && ansData.skipped;
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-secondary bg-opacity-10 text-secondary border-0'; // Unanswered
                if (isCurrent) {
                  btnClass = 'btn-outline-primary border-primary fw-bold text-primary'; // Current
                } else if (hasAnswer) {
                  btnClass = 'bg-success text-success bg-opacity-10 border-0 fw-bold'; // Answered
                } else if (isSkipped) {
                  btnClass = 'bg-danger text-danger bg-opacity-10 border-0 fw-bold'; // Skipped
                }

                return (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`btn rounded-3 p-2 d-flex align-items-center justify-content-center transition-all ${btnClass}`}
                    style={{ 
                      fontSize: '0.8rem',
                      aspectRatio: '1',
                      borderWidth: isCurrent ? '2px' : '0px',
                      borderColor: isCurrent ? 'var(--primary-purple)' : '',
                      color: isCurrent ? 'var(--primary-purple)' : ''
                    }}
                  >
                    {idx + 1}
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
          <div className="glass-panel p-4 bg-white d-flex flex-column justify-content-between" style={{ border: '1px solid var(--border-grey)', minHeight: '460px' }}>
            
            <div>
              {/* Question metadata indicators */}
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <span className="text-muted small fw-semibold">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <div className="d-flex gap-1.5" style={{ fontSize: '0.7rem' }}>
                  <span className="badge bg-primary bg-opacity-10 text-primary capitalize px-2.5 py-1">
                    {activeQuestion.questionType}
                  </span>
                  <span className="badge bg-secondary bg-opacity-10 text-secondary px-2.5 py-1">
                    {activeQuestion.topic}
                  </span>
                  <span className="badge bg-success bg-opacity-10 text-success px-2.5 py-1">
                    {activeQuestion.difficulty}
                  </span>
                </div>
              </div>

              {/* Question card text */}
              <div className="mb-3">
                <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                  {activeQuestion.question}
                </h4>
              </div>

              {/* Answer input area */}
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
            </div>

            {/* Navigation buttons container */}
            <div className="border-top pt-3 d-flex justify-content-between align-items-center mt-3">
              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className="btn btn-sm btn-white-custom py-2 px-3 d-flex align-items-center gap-1"
                >
                  <FiChevronLeft /> Previous
                </button>
                <button 
                  type="button" 
                  onClick={handleSkipQuestion}
                  className="btn btn-sm btn-outline-danger py-2 px-3 d-flex align-items-center gap-1 border border-danger-subtle text-danger bg-transparent"
                >
                  Skip
                </button>
              </div>

              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  onClick={handleSaveManualDraft}
                  disabled={savingDraft}
                  className="btn btn-sm btn-white-custom py-2 px-3 d-flex align-items-center gap-1.5"
                >
                  <FiSave /> {savingDraft ? 'Saving...' : 'Save Draft'}
                </button>
                <button 
                  type="button" 
                  onClick={handleNext}
                  className="btn btn-sm btn-primary-purple py-2 px-3.5 d-flex align-items-center gap-1"
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
