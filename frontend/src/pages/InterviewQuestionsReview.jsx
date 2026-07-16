import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiCpu, FiCheckCircle, FiRefreshCw, FiArrowLeft, FiPlay, 
  FiFileText, FiAward, FiHelpCircle, FiLock, FiChevronRight 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const InterviewQuestionsReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
    fetchSessionAndQuestions();
  }, [id]);

  // Handle message rotation when generating
  useEffect(() => {
    let interval;
    if (generating || regenerating) {
      interval = setInterval(() => {
        setLoaderMessageIdx(prev => (prev + 1) % loaderMessages.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [generating, regenerating]);

  const fetchSessionAndQuestions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/interviews/${id}`);
      if (response.data && response.data.success) {
        const sess = response.data.session;
        setSession(sess);

        // If status is 'Created', trigger generation immediately
        if (sess.status === 'Created') {
          await handleTriggerGeneration(sess._id);
        } else {
          // Fetch existing questions
          const qRes = await axiosInstance.get(`/interviews/${sess._id}/questions`);
          if (qRes.data && qRes.data.success) {
            setQuestions(qRes.data.questions);
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load interview session detail.');
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
        setQuestions(response.data.questions);
        toast.success('AI Question generation completed successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI question generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setLoaderMessageIdx(0);
    try {
      const response = await axiosInstance.post(`/interviews/${session._id}/regenerate`);
      if (response.data && response.data.success) {
        setSession(response.data.session);
        setQuestions(response.data.questions);
        toast.success('AI Interview questions regenerated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Regeneration failed.');
    } finally {
      setRegenerating(false);
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

  // AI question generation loader overlay
  if (generating || regenerating) {
    return (
      <div className="d-flex justify-content-center align-items-center text-start" style={{ minHeight: '60vh' }}>
        <div className="glass-panel p-5 bg-white shadow-sm text-center" style={{ maxWidth: '480px', border: '1px solid var(--border-grey)' }}>
          <div className="mb-4">
            <FiCpu className="text-primary display-4 spin" style={{ color: 'var(--primary-purple)', animationDuration: '3s' }} />
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

  return (
    <div className="container py-4 text-start">
      {/* Back link */}
      <Link to="/dashboard" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-3">
        <FiArrowLeft /> Back to Dashboard
      </Link>

      {/* Success banner */}
      <div className="glass-panel p-4 bg-white mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4" style={{ border: '1px solid var(--border-grey)' }}>
        <div className="d-flex align-items-center gap-3">
          <FiCheckCircle className="text-success fs-2" />
          <div>
            <h2 className="fw-bold mb-1" style={{ fontSize: '1.35rem' }}>AI Questions Ready!</h2>
            <p className="text-muted small mb-0">
              Successfully generated **{questions.length} personalized questions** for your **{session.interviewType} Interview** session.
            </p>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button 
            type="button" 
            onClick={handleRegenerate}
            className="btn btn-white-custom py-2 px-3 d-flex align-items-center gap-1.5"
            style={{ fontSize: '0.86rem' }}
          >
            <FiRefreshCw /> Regenerate
          </button>
          
          {/* Phase 5 start button (disabled) */}
          <button 
            disabled
            className="btn btn-primary-purple py-2 px-4 d-flex align-items-center gap-1.5 opacity-50 cursor-not-allowed"
            style={{ fontSize: '0.86rem', cursor: 'not-allowed' }}
          >
            <FiPlay style={{ fill: 'transparent' }} /> Start Interview (Phase 5)
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Side: Session config overview */}
        <div className="col-lg-4">
          <div className="glass-panel p-4 bg-white h-100" style={{ border: '1px solid var(--border-grey)' }}>
            <h3 className="h6 fw-bold mb-3 text-dark border-bottom pb-2">Session Parameters</h3>
            <div className="d-flex flex-column gap-3" style={{ fontSize: '0.82rem' }}>
              <div>
                <span className="text-muted d-block">Interview Title</span>
                <strong className="text-dark">{session.title}</strong>
              </div>
              <div>
                <span className="text-muted d-block">Difficulty</span>
                <strong className="text-dark">{session.difficulty}</strong>
              </div>
              <div>
                <span className="text-muted d-block">Experience Level</span>
                <strong className="text-dark">{session.experienceLevel}</strong>
              </div>
              <div>
                <span className="text-muted d-block">Target Company</span>
                <strong className="text-dark">{session.company || 'General Tech Company'}</strong>
              </div>
              <div>
                <span className="text-muted d-block">Preferred Language</span>
                <strong className="text-dark">{session.preferredLanguage}</strong>
              </div>
              <div>
                <span className="text-muted d-block">Questions Count</span>
                <strong className="text-dark">{session.questionCount} Questions</strong>
              </div>
              <div>
                <span className="text-muted d-block">Focus Areas</span>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {session.focusAreas?.map((tag, idx) => (
                    <span key={idx} className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold px-2 py-0.5" style={{ fontSize: '0.7rem' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Questions Review List */}
        <div className="col-lg-8">
          <div className="glass-panel p-4 bg-white h-100" style={{ border: '1px solid var(--border-grey)' }}>
            <h3 className="h6 fw-bold mb-3 text-dark border-bottom pb-2">Generated Question List</h3>
            
            <div className="d-flex flex-column gap-3 overflow-y-auto pr-1" style={{ maxHeight: '480px' }}>
              {questions.map((q, idx) => {
                // Colored type tags mapping
                const tagColorMap = {
                  technical: 'bg-primary text-primary bg-opacity-10',
                  behavioral: 'bg-warning text-warning bg-opacity-10',
                  hr: 'bg-info text-info bg-opacity-10',
                  project: 'bg-success text-success bg-opacity-10'
                };
                const tagClass = tagColorMap[q.questionType] || 'bg-secondary text-secondary bg-opacity-10';

                return (
                  <div key={idx} className="card p-3 bg-light border border-secondary border-opacity-10 text-start">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="fw-bold text-dark" style={{ fontSize: '0.84rem' }}>
                        Question {q.questionNumber}
                      </span>
                      <div className="d-flex gap-1.5">
                        <span className={`badge px-2 py-0.5 fw-bold ${tagClass}`} style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                          {q.questionType}
                        </span>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                          {q.topic}
                        </span>
                      </div>
                    </div>

                    <p className="text-dark small mb-3 fw-semibold">{q.question}</p>

                    {/* Reveal expected answer helper block */}
                    <div className="accordion-expected-answer border-top pt-2">
                      <details style={{ outline: 'none' }}>
                        <summary className="text-primary small cursor-pointer fw-bold d-flex align-items-center gap-1" style={{ cursor: 'pointer', color: 'var(--primary-purple)', outline: 'none' }}>
                          <FiHelpCircle /> Review Expected Answer & Hints
                        </summary>
                        <div className="mt-2 text-muted small bg-white p-2.5 rounded border border-light" style={{ fontSize: '0.74rem' }}>
                          <span className="fw-bold text-dark d-block mb-1">Expected Concepts:</span>
                          <p className="mb-2">{q.expectedAnswer}</p>
                          
                          {q.hints?.length > 0 && (
                            <div>
                              <span className="fw-bold text-dark d-block mb-1">Hints:</span>
                              <ul className="mb-0 ps-3">
                                {q.hints.map((h, hIdx) => (
                                  <li key={hIdx}>{h}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewQuestionsReview;
