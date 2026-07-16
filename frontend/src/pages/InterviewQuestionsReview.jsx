import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, FiPlay, FiBookOpen, FiClock, FiLayers, 
  FiAward, FiSettings, FiCheckCircle, FiGlobe 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const InterviewQuestionsReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Status message rotation for loader
  const [loaderMessageIdx, setLoaderMessageIdx] = useState(0);
  const loaderMessages = [
    'Analyzing Resume details...',
    'Understanding candidates technical skills...',
    'Building personalized mock interview panels...',
    'Preparing structured questions...',
    'Synchronizing database configurations...'
  ];

  useEffect(() => {
    fetchSessionDetails();
  }, [id]);

  // Message rotation effect
  useEffect(() => {
    let interval;
    if (generating) {
      interval = setInterval(() => {
        setLoaderMessageIdx(prev => (prev + 1) % loaderMessages.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [generating]);

  const [pollTrigger, setPollTrigger] = useState(0);
  const [serverError, setServerError] = useState(false);

  // Polling effect for background question generation (polls status endpoint only)
  useEffect(() => {
    let timer;
    let isMounted = true;

    if (session && session.status === 'Generating') {
      setGenerating(true);
      timer = setTimeout(async () => {
        try {
          const response = await axiosInstance.get(`/interviews/${id}/status`);
          if (!isMounted) return;
          setServerError(false);

          if (response.data && response.data.success) {
            const currentStatus = response.data.status;
            if (currentStatus === 'ReadyToStart') {
              // Generation completed, pull full details once
              const fullDetailsRes = await axiosInstance.get(`/interviews/${id}`);
              if (isMounted && fullDetailsRes.data && fullDetailsRes.data.success) {
                setSession(fullDetailsRes.data.session);
                setGenerating(false);
                toast.success('AI Interview questions generated successfully!');
              }
            } else if (currentStatus !== 'Generating') {
              // Generation failed or state changed
              setGenerating(false);
              const fullDetailsRes = await axiosInstance.get(`/interviews/${id}`);
              if (isMounted && fullDetailsRes.data && fullDetailsRes.data.success) {
                setSession(fullDetailsRes.data.session);
              }
            } else {
              // Still generating, poll again
              setPollTrigger(prev => prev + 1);
            }
          }
        } catch (err) {
          if (!isMounted) return;
          console.error('Error polling session status:', err);
          setServerError(true);
          // Wait 5 seconds before retrying on connection failure to avoid flooding
          timer = setTimeout(() => {
            if (isMounted) setPollTrigger(prev => prev + 1);
          }, 5000);
        }
      }, 3000);
    }
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [session, id, pollTrigger]);

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/interviews/${id}`);
      if (response.data && response.data.success) {
        const sess = response.data.session;
        setSession(sess);

        // If session status is 'Created', trigger generation immediately
        if (sess.status === 'Created') {
          await handleTriggerGeneration(sess._id);
        } else if (sess.status === 'Generating') {
          setGenerating(true);
        } else if (['InProgress', 'Submitted', 'AwaitingEvaluation', 'Completed'].includes(sess.status)) {
          // Redirect to active console if already in progress or complete
          navigate(`/interview/${sess.interviewId}/active`);
        }
      }
    } catch (err) {
      toast.error('Failed to load interview summary detail.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerGeneration = async (sessionId) => {
    setGenerating(true);
    setLoaderMessageIdx(0);
    try {
      const response = await axiosInstance.post(`/interviews/${sessionId}/generate`);
      if (response.data && response.data.success) {
        setSession(response.data.session);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI question generation failed.');
      navigate('/dashboard');
      setGenerating(false);
    }
  };

  const handleBeginInterview = async () => {
    setStarting(true);
    try {
      const response = await axiosInstance.post(`/interviews/${session._id}/start`);
      if (response.data && response.data.success) {
        toast.success('Interview started successfully! The timer has begun.');
        navigate(`/interview/${session.interviewId}/active`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initialize active interview session.');
    } finally {
      setStarting(false);
    }
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

  // Question generation loading screen
  if (generating) {
    return (
      <div className="d-flex justify-content-center align-items-center text-start" style={{ minHeight: '60vh' }}>
        <div className="glass-panel p-5 bg-white shadow-sm text-center" style={{ maxWidth: '480px', border: '1px solid var(--border-grey)' }}>
          <div className="mb-4">
            <FiSettings className="text-primary display-4 spin" style={{ color: 'var(--primary-purple)', animationDuration: '3s' }} />
          </div>
          <h3 className="h5 fw-bold text-dark mb-2">Generating Interview Questions...</h3>
          <p className="text-muted small mb-4">Gemini AI is parsing your resume and preparing customized mock interview questions.</p>
          
          <div className="progress mb-3" style={{ height: '8px', borderRadius: '4px' }}>
            <motion.div 
              className="progress-bar progress-bar-striped progress-bar-animated"
              role="progressbar" 
              style={{ width: '100%', backgroundColor: 'var(--primary-purple)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.p 
              key={loaderMessageIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="text-primary small fw-semibold mb-0"
              style={{ color: 'var(--primary-purple)' }}
            >
              {loaderMessages[loaderMessageIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-5 text-center">
        <div className="glass-panel p-5 bg-white mx-auto shadow-sm" style={{ maxWidth: '480px', border: '1px solid var(--border-grey)' }}>
          <h3 className="h5 fw-bold text-danger mb-3">Session Not Found</h3>
          <p className="text-muted small mb-4">We could not load this mock interview session. It may have been deleted or the code is invalid.</p>
          <Link to="/dashboard" className="btn btn-primary-purple px-4 py-2 text-decoration-none text-white">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 text-start">
      {/* Back to Dashboard */}
      <Link to="/dashboard" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-3">
        <FiArrowLeft /> Back to Dashboard
      </Link>

      <div className="glass-panel p-5 bg-white mx-auto shadow-sm" style={{ maxWidth: '720px', border: '1px solid var(--border-grey)' }}>
        
        {serverError && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
            <FiAlertTriangle className="fs-5 text-danger flex-shrink-0" />
            <div className="small text-start">
              <strong>Server temporarily unavailable:</strong> We are having trouble connecting to the interview engine. Attempting to reconnect...
            </div>
          </div>
        )}
        {/* Header Title */}
        <div className="text-center mb-4">
          <FiBookOpen className="text-primary display-4 mb-2" style={{ color: 'var(--primary-purple)' }} />
          <h2 className="fw-bold text-dark">{session.title}</h2>
          <p className="text-muted small">Your personalized mock interview parameters are ready. Review instructions below to begin.</p>
        </div>

        {/* Configuration summary grid */}
        <div className="border rounded-3 p-4 mb-4 bg-light bg-opacity-50">
          <h3 className="h6 fw-bold mb-3 border-bottom pb-2 text-dark">Interview Parameters</h3>
          <div className="row g-3" style={{ fontSize: '0.86rem' }}>
            <div className="col-md-6">
              <span className="text-muted d-block">Target Role</span>
              <strong className="text-dark">{session.role}</strong>
            </div>
            <div className="col-md-6">
              <span className="text-muted d-block">Difficulty</span>
              <strong className="text-dark">{session.difficulty}</strong>
            </div>
            <div className="col-md-6">
              <span className="text-muted d-block">Duration / Timer Limit</span>
              <strong className="text-dark">{session.duration} Minutes</strong>
            </div>
            <div className="col-md-6">
              <span className="text-muted d-block">Number of Questions</span>
              <strong className="text-dark">{session.questionCount} Questions</strong>
            </div>
            <div className="col-md-6">
              <span className="text-muted d-block">Preferred Language</span>
              <strong className="text-dark">{session.preferredLanguage}</strong>
            </div>
            <div className="col-md-6">
              <span className="text-muted d-block">Target Company</span>
              <strong className="text-dark">{session.company || 'General Tech Company'}</strong>
            </div>
            <div className="col-12">
              <span className="text-muted d-block">Focus Areas</span>
              <div className="d-flex flex-wrap gap-1 mt-1">
                {session.focusAreas?.map((tag, idx) => (
                  <span key={idx} className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold px-2 py-0.5" style={{ fontSize: '0.72rem' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rules & Guidelines Instructions */}
        <div className="mb-4">
          <h3 className="h6 fw-bold text-dark mb-2">Rules & Guidelines</h3>
          <ul className="small text-muted ps-3 d-flex flex-column gap-1.5" style={{ fontSize: '0.84rem' }}>
            <li><strong>Single Question View</strong>: Questions will appear one at a time. You cannot see upcoming questions.</li>
            <li><strong>Cheating Prevention</strong>: Expected answers and evaluation criteria are hidden and will only be revealed after final grading.</li>
            <li><strong>Auto-Saving Drafts</strong>: Your answers are saved automatically every 10 seconds and upon slide transitions.</li>
            <li><strong>Timer Starts on Begin</strong>: The countdown timer will start immediately after clicking the button below.</li>
            <li><strong>Revisit Skipper</strong>: You can use the numbers palette during the interview to skip and return to unanswered sections.</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="d-flex justify-content-between gap-3">
          <button 
            type="button" 
            onClick={() => navigate('/dashboard')}
            className="btn btn-white-custom py-2.5 px-4"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleBeginInterview}
            disabled={starting || generating}
            className="btn btn-primary-purple py-2.5 px-5 shadow-sm"
          >
            {starting ? 'Initializing...' : 'Begin Interview'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default InterviewQuestionsReview;
