import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiCode, FiArrowLeft, FiPlay, FiClock, FiCpu, FiCheck, FiLayers, FiAward
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const DIFFICULTY_OPTIONS = [
  { 
    id: 'Easy', 
    label: 'Easy', 
    durationMinutes: 20,
    desc: 'Basic data structures, string manipulation, and two-pointer problems.' 
  },
  { 
    id: 'Medium', 
    label: 'Medium', 
    durationMinutes: 30,
    desc: 'Standard algorithmic problems, sliding windows, DP, and hash maps.' 
  },
  { 
    id: 'Hard', 
    label: 'Hard', 
    durationMinutes: 40,
    desc: 'Advanced dynamic programming, graphs, tree traversals, and optimization.' 
  }
];

const TOPIC_OPTIONS = [
  'Arrays',
  'Strings',
  'Binary Search',
  'Linked List',
  'Recursion',
  'Bit Manipulation',
  'Stack',
  'Queue',
  'Sliding Window',
  'Two Pointers',
  'Heap',
  'Greedy',
  'Trees',
  'Graphs',
  'DP'
];

const LANGUAGE_OPTIONS = [
  { id: 'c', label: 'C (GCC)' },
  { id: 'cpp', label: 'C++ (G++)' },
  { id: 'java', label: 'Java 17' },
  { id: 'python', label: 'Python 3' },
  { id: 'javascript', label: 'JavaScript (Node.js)' }
];

const CodingInterviewCreate = () => {
  const navigate = useNavigate();

  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedTopics, setSelectedTopics] = useState(['Arrays']);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);

  // Auto-calculated duration based on difficulty: Easy 20m, Medium 30m, Hard 40m
  const activeDuration = difficulty === 'Easy' ? 20 : difficulty === 'Medium' ? 30 : 40;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axiosInstance.get('/users/profile');
      if (res.data?.success && res.data.user) {
        if (res.data.user.preferredLanguage) {
          const matchedLang = LANGUAGE_OPTIONS.find(l => l.id.toLowerCase() === res.data.user.preferredLanguage.toLowerCase());
          if (matchedLang) setSelectedLanguage(matchedLang.id);
        }
      }
    } catch (e) {}
  };

  const toggleTopic = (t) => {
    if (selectedTopics.includes(t)) {
      if (selectedTopics.length === 1) {
        toast.info('At least one topic must be selected.');
        return;
      }
      setSelectedTopics(selectedTopics.filter(item => item !== t));
    } else {
      setSelectedTopics([...selectedTopics, t]);
    }
  };

  const handleSelectAllTopics = () => {
    setSelectedTopics([...TOPIC_OPTIONS]);
  };

  const handleClearTopics = () => {
    setSelectedTopics([TOPIC_OPTIONS[0]]);
  };

  const handleCreateCodingSession = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const response = await axiosInstance.post('/coding/session/create', {
        role: 'Software Engineer',
        difficulty,
        topics: selectedTopics,
        topic: selectedTopics.join(', '),
        selectedLanguage,
        timeLimitMinutes: activeDuration
      });

      if (response.data && response.data.success) {
        toast.success('Coding Interview session created!');
        navigate(`/coding-interview/session/${response.data.sessionId}`);
      }
    } catch (err) {
      console.error('Error starting coding interview:', err);
      const msg = err.response?.data?.message || 'Failed to create coding interview session.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 text-start animate-fade-in" style={{ maxWidth: '840px' }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
        <Link to="/mock-interviews" className="btn btn-sm btn-outline-secondary rounded-circle p-2">
          <FiArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="fw-bold text-dark mb-0 fs-3">Configure Coding Interview Round</h2>
          <p className="text-muted small mb-0">Select your difficulty (with fixed time duration), algorithmic focus topics, and programming language.</p>
        </div>
      </div>

      {/* Configuration Form Card */}
      <div className="glass-panel p-4 bg-white border shadow-sm rounded-4">
        <form onSubmit={handleCreateCodingSession} className="d-flex flex-column gap-4">

          {/* 1. Difficulty Level (Fixed Time per Difficulty) */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label fw-bold text-dark small mb-0">1. Difficulty Level & Time Limit</label>
              <span className="badge bg-dark text-white fw-semibold px-2.5 py-1">
                <FiClock className="me-1" /> Duration: {activeDuration} Minutes
              </span>
            </div>
            <div className="row g-2.5">
              {DIFFICULTY_OPTIONS.map(diff => (
                <div key={diff.id} className="col-md-4">
                  <div
                    onClick={() => setDifficulty(diff.id)}
                    className={`p-3 rounded-3 border cursor-pointer h-100 transition-all ${difficulty === diff.id ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-light'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className={diff.id === 'Easy' ? 'text-success' : diff.id === 'Medium' ? 'text-warning text-dark' : 'text-danger'}>
                        {diff.label}
                      </strong>
                      <div className="d-flex align-items-center gap-1">
                        <span className="badge bg-secondary bg-opacity-10 text-secondary" style={{ fontSize: '0.72rem' }}>
                          {diff.durationMinutes} mins
                        </span>
                        {difficulty === diff.id && <FiCheck className="text-primary ms-1" />}
                      </div>
                    </div>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.78rem' }}>{diff.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Algorithmic Focus Area (Multi-Select) */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label fw-bold text-dark small mb-0">
                2. Algorithmic Focus Area <span className="badge bg-primary bg-opacity-10 text-primary ms-1">Selected: {selectedTopics.length}/{TOPIC_OPTIONS.length}</span>
              </label>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllTopics}
                  className="btn btn-sm btn-link p-0 text-decoration-none small text-primary"
                  style={{ fontSize: '0.76rem' }}
                >
                  Select All
                </button>
                <span className="text-muted small">•</span>
                <button
                  type="button"
                  onClick={handleClearTopics}
                  className="btn btn-sm btn-link p-0 text-decoration-none small text-secondary"
                  style={{ fontSize: '0.76rem' }}
                >
                  Reset
                </button>
              </div>
            </div>

            <p className="text-muted small mb-2.5" style={{ fontSize: '0.78rem' }}>
              Choose one or more topics to customize the algorithmic problem scope for this technical session.
            </p>

            <div className="d-flex flex-wrap gap-2">
              {TOPIC_OPTIONS.map(top => {
                const isSelected = selectedTopics.includes(top);
                return (
                  <button
                    key={top}
                    type="button"
                    onClick={() => toggleTopic(top)}
                    className={`btn btn-sm py-1.5 px-3 rounded-pill transition-all d-flex align-items-center gap-1.5 ${isSelected ? 'btn-primary-purple text-white shadow-sm' : 'btn-light border text-secondary'}`}
                    style={{ fontSize: '0.8rem', fontWeight: isSelected ? 600 : 400 }}
                  >
                    {isSelected ? <FiCheck size={13} className="text-white" /> : <span className="text-muted" style={{ fontSize: '0.7rem' }}>+</span>}
                    {top}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Programming Language */}
          <div>
            <label className="form-label fw-bold text-dark small mb-2">3. Programming Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="form-select form-select-sm py-2 rounded-2"
              style={{ fontSize: '0.84rem' }}
            >
              {LANGUAGE_OPTIONS.map(lang => (
                <option key={lang.id} value={lang.id}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* Action Bar */}
          <div className="border-top pt-3 d-flex justify-content-between align-items-center mt-2">
            <Link to="/mock-interviews" className="btn btn-outline-secondary px-4 py-2 rounded-pill" style={{ fontSize: '0.84rem' }}>
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary-purple text-white px-5 py-2.5 rounded-pill fw-bold d-flex align-items-center gap-2 shadow"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Generating IDE Workspace...
                </>
              ) : (
                <>
                  <FiPlay /> Launch Coding Interview
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CodingInterviewCreate;
