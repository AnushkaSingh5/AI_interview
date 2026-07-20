import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiCheckCircle, FiAward, FiAlertCircle, FiHelpCircle,
  FiBookmark, FiChevronRight, FiRefreshCw, FiBookOpen, FiX, FiCheck
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const PracticeSessionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answerInput, setAnswerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bookmark modal state
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [savingBookmark, setSavingBookmark] = useState(false);

  useEffect(() => {
    fetchSessionData();
  }, [id]);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/practice/session/${id}`);
      if (response.data && response.data.success) {
        setSession(response.data.session);
        const qList = response.data.questions || [];
        setQuestions(qList);

        // Position at first unanswered question if returning to session
        const firstUnanswered = qList.findIndex(q => !q.isAnswered);
        if (firstUnanswered !== -1) {
          setCurrentIndex(firstUnanswered);
          setAnswerInput(qList[firstUnanswered].userAnswer || '');
        } else if (qList.length > 0) {
          setCurrentIndex(0);
          setAnswerInput(qList[0].userAnswer || '');
        }
      }
    } catch (error) {
      console.error('Error fetching practice session:', error);
      toast.error('Failed to load practice session.');
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentIndex];

  const handleSubmitAnswer = async (e) => {
    if (e) e.preventDefault();
    if (!answerInput.trim()) {
      toast.warning('Please enter your response before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosInstance.post('/practice/answer', {
        questionId: currentQ._id,
        userAnswer: answerInput.trim()
      });

      if (response.data && response.data.success) {
        toast.success('Answer evaluated by AI!');
        const updatedQ = response.data.question;

        // Update local state with returned AI explanation
        setQuestions(prev => prev.map(q => q._id === updatedQ._id ? updatedQ : q));
      }
    } catch (error) {
      console.error('Error submitting practice answer:', error);
      toast.error('Failed to evaluate answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setAnswerInput(questions[nextIdx].userAnswer || '');
    } else {
      toast.success('Practice session completed!');
      navigate('/practice');
    }
  };

  const handleSaveBookmark = async () => {
    setSavingBookmark(true);
    try {
      const response = await axiosInstance.post('/practice/bookmark', {
        question: currentQ.question,
        topic: currentQ.topic,
        idealAnswer: currentQ.idealAnswer || '',
        notes: bookmarkNote.trim()
      });

      if (response.data.success) {
        toast.success('Question bookmarked successfully!');
        setShowBookmarkModal(false);
        setBookmarkNote('');
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      toast.error('Failed to bookmark question.');
    } finally {
      setSavingBookmark(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-4 text-start">
        <div className="skeleton-pulse mb-3" style={{ width: '140px', height: '28px' }} />
        <div className="glass-panel p-4 mb-4 skeleton-pulse" style={{ height: '180px' }} />
        <div className="glass-panel p-4 skeleton-pulse" style={{ height: '300px' }} />
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">No questions found in this practice session.</p>
        <Link to="/practice" className="btn btn-primary-purple text-white">Return to Practice Hub</Link>
      </div>
    );
  }

  return (
    <div className="container py-4 text-start">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/practice" className="text-muted small text-decoration-none d-flex align-items-center gap-1 mb-1">
            <FiArrowLeft /> Back to Practice Hub
          </Link>
          <h2 className="fw-bold text-dark mb-0">{session?.title}</h2>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary bg-opacity-10 text-primary fw-bold px-3 py-2">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="badge bg-info bg-opacity-10 text-info fw-semibold">{currentQ.topic}</span>
          <span className="badge bg-secondary bg-opacity-10 text-secondary">{currentQ.difficulty}</span>
        </div>
        <h3 className="h5 fw-bold text-dark mb-3" style={{ lineHeight: '1.5' }}>{currentQ.question}</h3>
        {currentQ.expectedAnswer && (
          <p className="text-muted small mb-0 bg-light p-2.5 rounded-3 border">
            💡 <strong>Target Concept:</strong> {currentQ.expectedAnswer}
          </p>
        )}
      </div>

      {/* Answer Form or AI Explanation Card */}
      {!currentQ.isAnswered ? (
        <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
          <form onSubmit={handleSubmitAnswer}>
            <label className="form-label small fw-semibold text-muted">Your Answer (Unlimited time to practice & learn)</label>
            <textarea
              rows={6}
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Type your response here..."
              className="form-control mb-3"
            />
            <div className="d-flex justify-content-between align-items-center">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary-purple text-white py-2 px-4 shadow-sm"
              >
                {submitting ? 'Evaluating with AI...' : 'Submit Answer for Instant AI Explanation'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Instant AI Explanation Breakdown Card */
        <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3 mb-4">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success bg-opacity-10 text-success p-2 rounded-circle">
                <FiCheckCircle className="fs-5" />
              </span>
              <div>
                <strong className="d-block text-dark">AI Answer Analysis</strong>
                <span className="text-muted small">Score: <strong className="text-primary fs-6">{currentQ.score}/10</strong> ({currentQ.accuracy}%)</span>
              </div>
            </div>
            <button
              onClick={() => setShowBookmarkModal(true)}
              className="btn btn-sm btn-outline-warning text-dark d-flex align-items-center gap-1.5"
            >
              <FiBookmark /> Bookmark Question & Note
            </button>
          </div>

          {/* AI Feedback */}
          <div className="alert alert-info border-0 bg-light mb-4">
            <strong className="d-block text-dark small mb-1">Feedback:</strong>
            <p className="text-muted small mb-0">{currentQ.feedback}</p>
          </div>

          {/* Ideal Answer */}
          <div className="mb-4">
            <h4 className="h6 fw-bold text-dark mb-2 d-flex align-items-center gap-1.5">
              <FiCheckCircle className="text-success" /> Ideal Answer
            </h4>
            <div className="bg-light p-3 rounded-3 border text-dark small" style={{ lineHeight: '1.6' }}>
              {currentQ.idealAnswer}
            </div>
          </div>

          {/* Concept Explanation */}
          <div className="mb-4">
            <h4 className="h6 fw-bold text-dark mb-2 d-flex align-items-center gap-1.5">
              <FiHelpCircle className="text-warning" /> Concept Explanation
            </h4>
            <p className="text-muted small mb-0" style={{ lineHeight: '1.6' }}>
              {currentQ.conceptExplanation}
            </p>
          </div>

          {/* Common Mistakes & Tips Grid */}
          <div className="row g-3 mb-4">
            {currentQ.commonMistakes?.length > 0 && (
              <div className="col-md-6">
                <div className="border rounded-3 p-3 bg-danger bg-opacity-10 h-100">
                  <strong className="d-block text-danger small mb-2">Common Mistakes:</strong>
                  <ul className="text-muted small mb-0 ps-3">
                    {currentQ.commonMistakes.map((m, idx) => <li key={idx}>{m}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {currentQ.interviewTips?.length > 0 && (
              <div className="col-md-6">
                <div className="border rounded-3 p-3 bg-success bg-opacity-10 h-100">
                  <strong className="d-block text-success small mb-2">Pro Interview Tips:</strong>
                  <ul className="text-muted small mb-0 ps-3">
                    {currentQ.interviewTips.map((t, idx) => <li key={idx}>{t}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Bar */}
          <div className="d-flex justify-content-between align-items-center border-top pt-3">
            <button
              disabled={currentIndex === 0}
              onClick={() => { setCurrentIndex(prev => prev - 1); setAnswerInput(questions[currentIndex - 1].userAnswer || ''); }}
              className="btn btn-sm btn-outline-secondary border bg-transparent"
            >
              Previous Question
            </button>

            <button
              onClick={handleNextQuestion}
              className="btn btn-sm btn-primary-purple text-white px-4 py-2"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Practice Session'}
            </button>
          </div>
        </div>
      )}

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg text-start">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark">Save Bookmark & Notes</h5>
                <button type="button" onClick={() => setShowBookmarkModal(false)} className="btn-close shadow-none border-0 bg-transparent"></button>
              </div>
              <div className="modal-body py-4">
                <p className="text-dark small fw-semibold mb-3">"{currentQ.question}"</p>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Personal Notes or Key Takeaways</label>
                  <textarea
                    rows={4}
                    value={bookmarkNote}
                    onChange={(e) => setBookmarkNote(e.target.value)}
                    placeholder="Write key concepts to remember for interviews..."
                    className="form-control"
                  />
                </div>
                <button
                  onClick={handleSaveBookmark}
                  disabled={savingBookmark}
                  className="btn btn-primary-purple text-white w-100 py-2"
                >
                  {savingBookmark ? 'Saving...' : 'Save Bookmark'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeSessionView;
