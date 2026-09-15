import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiBookOpen, FiZap, FiAward, FiBookmark, FiLayers, FiPlay, FiRefreshCw,
  FiCheckCircle, FiClock, FiStar, FiTrash2, FiChevronRight, FiSliders, FiFileText, FiTarget,
  FiCheckSquare, FiSquare
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const PracticeHub = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [topicsData, setTopicsData] = useState(null);
  const [stats, setStats] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [regeneratingRoadmap, setRegeneratingRoadmap] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  // Active Tab for bottom section
  const [activeTab, setActiveTab] = useState('weak'); // 'weak', 'roadmap', 'flashcards', 'bookmarks'

  // Flashcards flip state
  const [currentFcIndex, setCurrentFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Custom Practice Modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configMode, setConfigMode] = useState('Technical');
  const [configTopic, setConfigTopic] = useState('JavaScript');
  const [configCompany, setConfigCompany] = useState('');
  const [configDifficulty, setConfigDifficulty] = useState('Medium');
  const [configCount, setConfigCount] = useState(5);
  const [startingSession, setStartingSession] = useState(false);
  const [learningProfile, setLearningProfile] = useState(null);

  const companyTracks = [
    {
      name: 'Google',
      tagline: 'Algorithmic Excellence & System Scale',
      color: '#4285F4',
      bg: 'rgba(66, 133, 244, 0.1)',
      defaultTopic: 'Algorithms & Distributed Systems',
      recommendedDifficulty: 'Hard',
      highlights: ['Hard DSA & DP', 'Global Scalability', 'Googleyness']
    },
    {
      name: 'Amazon',
      tagline: '16 Leadership Principles & Bar Raiser',
      color: '#FF9900',
      bg: 'rgba(255, 153, 0, 0.12)',
      defaultTopic: 'Amazon LP & Microservices',
      recommendedDifficulty: 'Medium',
      highlights: ['Customer Obsession', 'STAR Format', 'Low-Level Design']
    },
    {
      name: 'Microsoft',
      tagline: 'Practical Engineering & Growth Mindset',
      color: '#00A4EF',
      bg: 'rgba(0, 164, 239, 0.1)',
      defaultTopic: 'Clean Code & Cloud Resilience',
      recommendedDifficulty: 'Medium',
      highlights: ['Data Structures', 'Azure Cloud', 'Growth Mindset']
    },
    {
      name: 'Infosys',
      tagline: 'Core CS Fundamentals & DBMS',
      color: '#007CC3',
      bg: 'rgba(0, 124, 195, 0.1)',
      defaultTopic: 'OOPs & Database Queries',
      recommendedDifficulty: 'Medium',
      highlights: ['OOPs in Java/C++', 'SQL Joins & Indexing', 'SDLC']
    },
    {
      name: 'TCS',
      tagline: 'Ninja, Digital & Prime Tracks',
      color: '#E82127',
      bg: 'rgba(232, 33, 39, 0.1)',
      defaultTopic: 'Programming Logic & SQL',
      recommendedDifficulty: 'Medium',
      highlights: ['C/Java/Python Logic', 'Database Integrity', 'Agile']
    },
    {
      name: 'Accenture',
      tagline: 'Enterprise Cloud & Consulting',
      color: '#A100FF',
      bg: 'rgba(161, 0, 255, 0.1)',
      defaultTopic: 'Enterprise Microservices & Cloud',
      recommendedDifficulty: 'Medium',
      highlights: ['Full-Stack Modernization', 'REST APIs', 'Consulting Scenarios']
    }
  ];

  useEffect(() => {
    fetchHubData();
  }, []);

  const fetchHubData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        axiosInstance.get('/practice/topics'),
        axiosInstance.get('/practice/stats'),
        axiosInstance.get('/practice/roadmap'),
        axiosInstance.get('/practice/flashcards'),
        axiosInstance.get('/practice/bookmarks'),
        axiosInstance.get('/learning/profile')
      ]);

      const [topRes, statRes, roadRes, fcRes, bmRes, learnRes] = results;

      if (topRes.status === 'fulfilled' && topRes.value?.data?.success) {
        setTopicsData(topRes.value.data);
      } else {
        // Fallback standard topics if offline / cold start
        setTopicsData({
          weakTopics: [],
          technicalTopics: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'DBMS', 'Operating Systems', 'Computer Networks', 'System Design', 'Data Structures'],
          softTopics: ['Tell Me About Yourself', 'Strengths & Weaknesses', 'Conflict Resolution', 'Leadership', 'Handling Pressure', 'STAR Method Teamwork'],
          companies: ['Google', 'Amazon', 'Microsoft', 'Adobe', 'Infosys', 'TCS', 'Accenture', 'Flipkart']
        });
      }

      if (statRes.status === 'fulfilled' && statRes.value?.data?.success) {
        setStats(statRes.value.data);
      }

      if (roadRes.status === 'fulfilled' && roadRes.value?.data?.success) {
        setRoadmap(roadRes.value.data.roadmap);
      }

      if (fcRes.status === 'fulfilled' && fcRes.value?.data?.success) {
        setFlashcards(fcRes.value.data.flashcards || []);
      }

      if (bmRes.status === 'fulfilled' && bmRes.value?.data?.success) {
        setBookmarks(bmRes.value.data.bookmarks || []);
      }

      if (learnRes.status === 'fulfilled' && learnRes.value?.data?.success) {
        setLearningProfile(learnRes.value.data.profile);
      }
    } catch (error) {
      console.error('Error fetching Practice Hub data:', error);
      toast.error('Failed to load some practice hub data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCustomPractice = async (mode, topic = 'General', company = '') => {
    setStartingSession(true);
    try {
      const response = await axiosInstance.post('/practice/start', {
        mode,
        topic,
        company,
        difficulty: configDifficulty,
        questionCount: configCount
      });

      if (response.data.success) {
        toast.success(`Practice session started: ${topic}`);
        navigate(`/practice/session/${response.data.session._id}`);
      }
    } catch (error) {
      console.error('Error starting practice session:', error);
      toast.error('Failed to start practice session');
    } finally {
      setStartingSession(false);
      setShowConfigModal(false);
    }
  };

  const handleStartDailyChallenge = async () => {
    setStartingSession(true);
    try {
      const response = await axiosInstance.get('/practice/daily');
      if (response.data.success) {
        toast.info("Daily Challenge loaded! Let's practice.");
        navigate(`/practice/session/${response.data.session._id}`);
      }
    } catch (error) {
      console.error('Error launching Daily Challenge:', error);
      toast.error('Failed to start daily challenge');
    } finally {
      setStartingSession(false);
    }
  };

  const handleDeleteBookmark = async (id) => {
    try {
      const response = await axiosInstance.delete(`/practice/bookmark/${id}`);
      if (response.data.success) {
        toast.success('Bookmark removed');
        setBookmarks(prev => prev.filter(b => b._id !== id));
      }
    } catch (error) {
      toast.error('Failed to remove bookmark');
    }
  };

  const handleRegenerateRoadmap = async () => {
    setRegeneratingRoadmap(true);
    try {
      const response = await axiosInstance.post('/practice/roadmap/regenerate');
      if (response.data.success) {
        setRoadmap(response.data.roadmap);
        toast.success('Roadmap successfully regenerated based on latest interview performance!');
      }
    } catch (error) {
      console.error('Error regenerating roadmap:', error);
      toast.error('Failed to regenerate roadmap');
    } finally {
      setRegeneratingRoadmap(false);
    }
  };

  const handleToggleRoadmapWeek = async (weekNumber) => {
    try {
      const response = await axiosInstance.patch(`/practice/roadmap/toggle-week/${weekNumber}`);
      if (response.data.success) {
        setRoadmap(response.data.roadmap);
        toast.info(response.data.message || `Week ${weekNumber} status updated`);
      }
    } catch (error) {
      console.error('Error toggling week completion:', error);
      toast.error('Failed to update week status');
    }
  };

  const handleToggleRoadmapSubtask = async (weekNumber, concept) => {
    try {
      const response = await axiosInstance.patch('/practice/roadmap/toggle-subtask', {
        weekNumber,
        concept
      });
      if (response.data.success) {
        setRoadmap(response.data.roadmap);
      }
    } catch (error) {
      console.error('Error toggling concept subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  if (loading) {
    return (
      <div className="container py-4 text-start">
        <div className="mb-4">
          <div className="skeleton-pulse mb-2" style={{ width: '200px', height: '32px' }} />
          <div className="skeleton-pulse" style={{ width: '300px', height: '18px' }} />
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div className="col-6 col-md-3" key={i}>
              <div className="glass-panel p-4 skeleton-pulse" style={{ height: '90px' }} />
            </div>
          ))}
        </div>
        <div className="glass-panel p-4 mb-4 skeleton-pulse" style={{ height: '140px' }} />
        <div className="row g-4">
          <div className="col-md-6"><div className="glass-panel p-4 skeleton-pulse" style={{ height: '280px' }} /></div>
          <div className="col-md-6"><div className="glass-panel p-4 skeleton-pulse" style={{ height: '280px' }} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 text-start">
      {/* Title & Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">AI Practice Hub & Learning</h2>
          <p className="text-muted small mb-0">Learn, revise weak skills, solve company questions, and practice at your own pace without pressure.</p>
        </div>
        <button
          onClick={handleStartDailyChallenge}
          disabled={startingSession}
          className="btn btn-primary-purple d-flex align-items-center gap-2 py-2 px-4 shadow-sm text-white"
        >
          <FiZap style={{ fill: 'white' }} />
          <span>Launch Daily Challenge (5 Qs)</span>
        </button>
      </div>

      {/* Top Practice Analytics Stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Questions Solved</span>
            <strong className="display-6 fw-bold text-dark">{stats?.totalQuestionsSolved || 0}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Practice Accuracy</span>
            <strong className="display-6 fw-bold text-success">{stats?.practiceAccuracy || 0}%</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Weak Topics</span>
            <strong className="display-6 fw-bold text-danger">{topicsData?.weakTopics?.length || 0}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Bookmarks Saved</span>
            <strong className="display-6 fw-bold text-primary">{bookmarks.length}</strong>
          </div>
        </div>
      </div>

      {/* Today's Practice Recommendation Card */}
      {learningProfile && learningProfile.weakestTopics && learningProfile.weakestTopics.length > 0 && (
        <div className="glass-panel p-4 bg-white mb-4 text-start animate-fade-in" style={{ border: '1px solid var(--border-grey)' }}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="p-2.5 bg-primary bg-opacity-10 text-primary rounded-circle" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
                <FiTarget style={{ fontSize: '1.4rem' }} />
              </span>
              <div>
                <span className="badge bg-danger bg-opacity-10 text-danger fw-bold px-2 py-0.5 mb-1" style={{ fontSize: '0.68rem' }}>TODAY'S TARGETED PRACTICE</span>
                <h3 className="h5 fw-bold text-dark mb-1">
                  Today's Recommended Practice: {learningProfile.weakestTopics[0].topic}
                </h3>
                <p className="text-muted small mb-0">
                  Focus on your most recurring weak area to eliminate coding gaps. Generates **10 custom practice questions** at a **Medium** difficulty level.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleStartCustomPractice('Technical', learningProfile.weakestTopics[0].topic)}
              disabled={startingSession}
              className="btn btn-primary-purple d-flex align-items-center gap-2 py-2.5 px-4 shadow-sm text-white"
            >
              <FiPlay style={{ fill: 'white' }} />
              <span>Start Targeted Practice</span>
            </button>
          </div>
        </div>
      )}

      {/* Company-Specific Interview Tracks Grid */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 className="h6 fw-bold text-dark mb-0">🏢 Company-Specific Interview Tracks</h3>
            <p className="text-muted small mb-0">Practice question sets custom-tailored to the real interview styles of top tech companies.</p>
          </div>
          <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">6 Curated Companies</span>
        </div>

        <div className="row g-3">
          {companyTracks.map((c, idx) => (
            <div className="col-md-4 col-sm-6" key={idx}>
              <div className="glass-panel p-3 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between" style={{ borderTop: `3px solid ${c.color}` }}>
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge px-2 py-1 rounded fw-bold" style={{ backgroundColor: c.bg, color: c.color, fontSize: '0.74rem' }}>
                      {c.name}
                    </span>
                    <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                      {c.recommendedDifficulty}
                    </span>
                  </div>
                  <strong className="d-block text-dark small mb-1" style={{ fontSize: '0.82rem' }}>{c.tagline}</strong>
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {c.highlights.map((h, i) => (
                      <span key={i} className="badge bg-light text-secondary border px-1.5 py-0.5" style={{ fontSize: '0.64rem' }}>
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button
                    onClick={() => handleStartCustomPractice('Company', c.defaultTopic, c.name)}
                    disabled={startingSession}
                    className="btn btn-sm btn-outline-dark flex-grow-1 py-1.5"
                    style={{ fontSize: '0.74rem', borderColor: c.color, color: c.color }}
                  >
                    Start {c.name} Set
                  </button>
                  <button
                    onClick={() => {
                      setConfigMode('Company');
                      setConfigCompany(c.name);
                      setConfigTopic(c.defaultTopic);
                      setConfigDifficulty(c.recommendedDifficulty);
                      setShowConfigModal(true);
                    }}
                    className="btn btn-sm btn-light border py-1.5 px-2.5 text-muted"
                    style={{ fontSize: '0.74rem' }}
                    title="Customize count and difficulty"
                  >
                    <FiSliders />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Practice Categories Cards Grid */}
      <h3 className="h6 fw-bold text-dark mb-3">Practice Categories</h3>
      <div className="row g-3 mb-4">
        {/* Technical */}
        <div className="col-md-4 col-sm-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">Technical Core</span>
                <FiSliders className="text-muted" />
              </div>
              <h4 className="h6 fw-bold text-dark mb-2">Technical Practice</h4>
              <p className="text-muted small mb-3">React, Node.js, DBMS, OS, Computer Networks, System Design.</p>
            </div>
            <button
              onClick={() => {
                setConfigMode('Technical');
                setConfigTopic('React');
                setShowConfigModal(true);
              }}
              className="btn btn-sm btn-outline-primary w-100 py-2"
            >
              Configure Technical Practice
            </button>
          </div>
        </div>

        {/* HR & Soft Skills */}
        <div className="col-md-4 col-sm-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-success bg-opacity-10 text-success fw-bold">HR & Behavioral</span>
                <FiBookOpen className="text-muted" />
              </div>
              <h4 className="h6 fw-bold text-dark mb-2">HR & Behavioral</h4>
              <p className="text-muted small mb-3">STAR method, leadership, conflict resolution, strengths & goals.</p>
            </div>
            <button
              onClick={() => handleStartCustomPractice('HR', 'HR & Behavioral Questions')}
              className="btn btn-sm btn-outline-success w-100 py-2"
            >
              Start HR Practice
            </button>
          </div>
        </div>

        {/* Resume-Based */}
        <div className="col-md-4 col-sm-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-warning bg-opacity-10 text-warning fw-bold">Personalized</span>
                <FiFileText className="text-muted" />
              </div>
              <h4 className="h6 fw-bold text-dark mb-2">Resume-Based Practice</h4>
              <p className="text-muted small mb-3">Questions generated directly from your uploaded projects & history.</p>
            </div>
            <button
              onClick={() => handleStartCustomPractice('Resume', 'Resume Projects & Work History')}
              className="btn btn-sm btn-outline-warning text-dark w-100 py-2"
            >
              Start Resume Practice
            </button>
          </div>
        </div>

        {/* Company Specific */}
        <div className="col-md-4 col-sm-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-info bg-opacity-10 text-info fw-bold">Top Companies</span>
                <FiTarget className="text-muted" />
              </div>
              <h4 className="h6 fw-bold text-dark mb-2">Company-Specific</h4>
              <p className="text-muted small mb-3">Practice questions tailored to Google, Amazon, Microsoft, Infosys, etc.</p>
            </div>
            <button
              onClick={() => {
                setConfigMode('Company');
                setConfigCompany('Google');
                setConfigTopic('System Architecture');
                setShowConfigModal(true);
              }}
              className="btn btn-sm btn-outline-info w-100 py-2"
            >
              Choose Target Company
            </button>
          </div>
        </div>

        {/* Revision Mode */}
        <div className="col-md-4 col-sm-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-danger bg-opacity-10 text-danger fw-bold">Revision Mode</span>
                <FiRefreshCw className="text-muted" />
              </div>
              <h4 className="h6 fw-bold text-dark mb-2">Weak Topic Revision</h4>
              <p className="text-muted small mb-3">Focus strictly on your lowest-scoring skills from past mock interviews.</p>
            </div>
            <button
              onClick={() => handleStartCustomPractice('Revision', topicsData?.weakTopics?.[0]?.name || 'DBMS')}
              className="btn btn-sm btn-outline-danger w-100 py-2"
            >
              Revise Weak Topics
            </button>
          </div>
        </div>

        {/* Daily Challenge */}
        <div className="col-md-4 col-sm-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-purple bg-opacity-10 text-primary fw-bold" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>Daily Feature</span>
                <FiZap className="text-primary" />
              </div>
              <h4 className="h6 fw-bold text-dark mb-2">Daily Challenge</h4>
              <p className="text-muted small mb-3">5 mixed questions everyday to keep your interview skills sharp.</p>
            </div>
            <button
              onClick={handleStartDailyChallenge}
              className="btn btn-sm btn-primary-purple text-white w-100 py-2"
            >
              Take Daily Challenge
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Row for Learning Roadmap, Weak Topics, Flashcards, Bookmarks */}
      <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
        <ul className="nav nav-pills border-bottom pb-3 mb-4 gap-2">
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'weak' ? 'active bg-primary-purple text-white' : 'text-dark border'}`}
              onClick={() => setActiveTab('weak')}
            >
              Priority Weak Topics ({topicsData?.weakTopics?.length || 0})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'roadmap' ? 'active bg-primary-purple text-white' : 'text-dark border'}`}
              onClick={() => setActiveTab('roadmap')}
            >
              4-Week Personalized Roadmap
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'flashcards' ? 'active bg-primary-purple text-white' : 'text-dark border'}`}
              onClick={() => setActiveTab('flashcards')}
            >
              Interactive Flashcards ({flashcards.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'bookmarks' ? 'active bg-primary-purple text-white' : 'text-dark border'}`}
              onClick={() => setActiveTab('bookmarks')}
            >
              Saved Bookmarks & Notes ({bookmarks.length})
            </button>
          </li>
        </ul>

        {/* Tab 1: Weak Topics */}
        {activeTab === 'weak' && (
          <div>
            <h4 className="h6 fw-bold text-dark mb-3">Target Weak Areas</h4>
            {topicsData?.weakTopics?.length > 0 ? (
              <div className="row g-3">
                {topicsData.weakTopics.map((item, idx) => (
                  <div key={idx} className="col-md-6">
                    <div className="border rounded-3 p-3 bg-light bg-opacity-25 d-flex justify-content-between align-items-center">
                      <div>
                        <strong className="d-block text-dark small">{item.name}</strong>
                        <span className="text-muted small">Average Score: <strong className="text-danger">{item.avgScore}%</strong></span>
                      </div>
                      <button
                        onClick={() => handleStartCustomPractice('Technical', item.name)}
                        className="btn btn-sm btn-outline-danger px-3 py-1.5"
                        style={{ fontSize: '0.74rem' }}
                      >
                        Practice Topic
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted small">
                No weak topics recorded yet. Take mock interviews or practice sessions to identify areas for improvement!
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Personalized 4-Week Roadmap */}
        {activeTab === 'roadmap' && (
          <div>
            {/* Roadmap Header & Controls */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
              <div>
                <h4 className="h5 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <FiLayers className="text-primary" /> Personalized 4-Week AI Study Roadmap
                </h4>
                <p className="text-muted small mb-0">
                  Targeted study plan synthesized by AI after analyzing recurring weaknesses and accuracy in your past mock interviews.
                </p>
              </div>
              <button
                onClick={handleRegenerateRoadmap}
                disabled={regeneratingRoadmap}
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-sm bg-white"
              >
                <FiRefreshCw className={regeneratingRoadmap ? 'spin-icon' : ''} />
                <span>{regeneratingRoadmap ? 'Analyzing Interviews & Updating...' : 'Regenerate Plan with AI'}</span>
              </button>
            </div>

            {/* Overall Progress & Summary Banner */}
            <div className="card border-0 bg-primary bg-opacity-10 rounded-4 p-4 mb-4 shadow-sm">
              <div className="row g-3 align-items-center">
                <div className="col-md-7">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-primary text-white px-2.5 py-1">Role: {roadmap?.targetRole || 'Software Engineer'}</span>
                    <span className="text-muted small fw-semibold">
                      {roadmap?.weeks?.filter(w => w.completed).length || 0} of 4 Weeks Completed
                    </span>
                  </div>
                  <p className="text-dark small mb-3 fw-medium" style={{ lineHeight: '1.5' }}>
                    {roadmap?.summary || 'Follow this progressive curriculum to eliminate weak spots in technical interviews.'}
                  </p>
                  <div>
                    <div className="d-flex justify-content-between text-muted small fw-semibold mb-1">
                      <span>Curriculum Completion</span>
                      <strong className="text-primary">{roadmap?.overallProgress || 0}%</strong>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div
                        className="progress-bar bg-primary-purple"
                        role="progressbar"
                        style={{ width: `${roadmap?.overallProgress || 0}%`, transition: 'width 0.5s ease' }}
                        aria-valuenow={roadmap?.overallProgress || 0}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-md-5 border-start-md ps-md-4">
                  <div className="row g-2 text-center">
                    <div className="col-6">
                      <div className="p-2.5 bg-white rounded-3 shadow-xs border">
                        <span className="text-muted small d-block mb-1" style={{ fontSize: '0.72rem' }}>EST. STUDY TIME</span>
                        <strong className="h6 fw-bold text-dark mb-0">
                          {roadmap?.weeks?.reduce((acc, w) => acc + (w.estimatedHours || 4), 0) || 16} Hours
                        </strong>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-2.5 bg-white rounded-3 shadow-xs border">
                        <span className="text-muted small d-block mb-1" style={{ fontSize: '0.72rem' }}>PRACTICE DRILLS</span>
                        <strong className="h6 fw-bold text-dark mb-0">
                          {roadmap?.weeks?.reduce((acc, w) => acc + (w.practiceQuestionsCount || 5), 0) || 20} Questions
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Weekly Timeline Cards */}
            {roadmap?.weeks?.length > 0 ? (
              <div className="row g-4">
                {roadmap.weeks.map((w, idx) => {
                  const isCompleted = Boolean(w.completed);
                  const subtasks = w.keyConcepts || [];
                  const completedSubtasks = w.subtasksCompleted || [];

                  return (
                    <div key={idx} className="col-md-6">
                      <div
                        className={`card h-100 border rounded-4 p-4 shadow-sm transition-all ${
                          isCompleted ? 'bg-light bg-opacity-50 border-success' : 'bg-white border-light-subtle'
                        }`}
                        style={{ borderLeft: isCompleted ? '5px solid #198754' : '5px solid var(--primary-purple)' }}
                      >
                        {/* Week Card Header */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className={`badge ${isCompleted ? 'bg-success' : 'bg-primary-purple'} text-white px-2.5 py-1`}>
                              Week {w.weekNumber}
                            </span>
                            {isCompleted ? (
                              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 d-flex align-items-center gap-1">
                                <FiCheckCircle /> Completed
                              </span>
                            ) : (
                              <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
                                In Progress
                              </span>
                            )}
                          </div>
                          <div className="d-flex align-items-center gap-2 text-muted small">
                            <span className="badge bg-light border text-muted" style={{ fontSize: '0.72rem' }}>
                              <FiClock className="me-1" /> {w.estimatedHours || 4}h
                            </span>
                            <span className="badge bg-light border text-muted" style={{ fontSize: '0.72rem' }}>
                              <FiZap className="me-1 text-warning" /> {w.practiceQuestionsCount || 5} Qs
                            </span>
                          </div>
                        </div>

                        {/* Title & Topic */}
                        <h5 className="fw-bold text-dark mb-1 mt-1">{w.title || `Week ${w.weekNumber}: ${w.topic}`}</h5>
                        <div className="mb-3">
                          <span className="badge bg-secondary bg-opacity-10 text-dark fw-semibold" style={{ fontSize: '0.75rem' }}>
                            Core Skill: {w.topic}
                          </span>
                        </div>

                        {/* Focus & AI Rationale */}
                        <div className="p-2.5 bg-light rounded-3 mb-3" style={{ fontSize: '0.78rem' }}>
                          <div className="mb-1">
                            <strong className="text-dark">Focus Area: </strong>
                            <span className="text-muted">{w.focusArea}</span>
                          </div>
                          <div>
                            <strong className="text-primary">AI Rationale: </strong>
                            <span className="text-muted">{w.reason}</span>
                          </div>
                        </div>

                        {/* Key Concepts Checklist */}
                        <div className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                              Key Study Concepts ({completedSubtasks.length}/{subtasks.length})
                            </span>
                          </div>
                          <div className="d-flex flex-column gap-1.5">
                            {subtasks.map((concept, cIdx) => {
                              const checked = completedSubtasks.includes(concept) || isCompleted;
                              return (
                                <div
                                  key={cIdx}
                                  onClick={() => handleToggleRoadmapSubtask(w.weekNumber, concept)}
                                  className={`d-flex align-items-center gap-2 p-2 rounded-2 cursor-pointer transition-all ${
                                    checked ? 'bg-success bg-opacity-10 text-success' : 'bg-light text-dark hover-bg-light'
                                  }`}
                                  style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  {checked ? (
                                    <FiCheckSquare className="text-success flex-shrink-0" />
                                  ) : (
                                    <FiSquare className="text-muted flex-shrink-0" />
                                  )}
                                  <span className={checked ? 'text-decoration-line-through text-muted' : 'fw-medium'}>
                                    {concept}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-auto pt-2 d-flex gap-2">
                          <button
                            onClick={() => handleStartCustomPractice('Technical', w.topic)}
                            disabled={startingSession}
                            className="btn btn-primary-purple text-white btn-sm flex-grow-1 py-2 d-flex align-items-center justify-content-center gap-2 shadow-xs"
                            style={{ fontSize: '0.8rem' }}
                          >
                            <FiPlay style={{ fill: 'white' }} />
                            <span>Start Week {w.weekNumber} Practice</span>
                          </button>
                          <button
                            onClick={() => handleToggleRoadmapWeek(w.weekNumber)}
                            className={`btn btn-sm px-3 py-2 border d-flex align-items-center justify-content-center gap-1.5 ${
                              isCompleted ? 'btn-outline-secondary' : 'btn-outline-success bg-white'
                            }`}
                            style={{ fontSize: '0.8rem' }}
                            title={isCompleted ? 'Mark as Incomplete' : 'Mark Week Complete'}
                          >
                            <FiCheckCircle className={isCompleted ? 'text-muted' : 'text-success'} />
                            <span>{isCompleted ? 'Undo' : 'Complete'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-5 text-center text-muted">
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <p className="mb-0">Loading your personalized learning roadmap...</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Interactive Flashcards */}
        {activeTab === 'flashcards' && (
          <div>
            <h4 className="h6 fw-bold text-dark mb-3">Quick Memory Flashcards</h4>
            {flashcards.length > 0 ? (
              <div className="d-flex flex-column align-items-center py-3">
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="glass-panel p-5 bg-white border shadow-sm text-center cursor-pointer mb-3"
                  style={{ maxWidth: '540px', width: '100%', minHeight: '220px', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  <span className="badge bg-info bg-opacity-10 text-info mb-3">
                    {flashcards[currentFcIndex]?.topic} (Click card to reveal answer)
                  </span>
                  {!isFlipped ? (
                    <div>
                      <h3 className="h5 fw-bold text-dark mb-2">{flashcards[currentFcIndex]?.question}</h3>
                      <span className="text-muted small">💡 Click to reveal ideal answer</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-success small fw-semibold d-block mb-2">Answer & Explanation:</span>
                      <p className="text-dark small mb-0" style={{ lineHeight: '1.6' }}>{flashcards[currentFcIndex]?.answer}</p>
                    </div>
                  )}
                </div>

                <div className="d-flex gap-3">
                  <button
                    disabled={currentFcIndex === 0}
                    onClick={() => { setCurrentFcIndex(prev => prev - 1); setIsFlipped(false); }}
                    className="btn btn-sm btn-outline-secondary px-4"
                  >
                    Previous
                  </button>
                  <span className="align-self-center text-muted small">Card {currentFcIndex + 1} of {flashcards.length}</span>
                  <button
                    disabled={currentFcIndex === flashcards.length - 1}
                    onClick={() => { setCurrentFcIndex(prev => prev + 1); setIsFlipped(false); }}
                    className="btn btn-sm btn-primary-purple text-white px-4"
                  >
                    Next Card
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-muted small">No flashcards available right now.</div>
            )}
          </div>
        )}

        {/* Tab 4: Bookmarks */}
        {activeTab === 'bookmarks' && (
          <div>
            <h4 className="h6 fw-bold text-dark mb-3">Saved Questions & Personal Notes</h4>
            {bookmarks.length > 0 ? (
              <div className="table-responsive">
                <table className="table align-middle" style={{ fontSize: '0.86rem' }}>
                  <thead className="table-light">
                    <tr>
                      <th>Question</th>
                      <th>Topic</th>
                      <th>Notes</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookmarks.map((bm, i) => (
                      <tr key={i}>
                        <td className="fw-semibold text-dark">{bm.question}</td>
                        <td><span className="badge bg-secondary bg-opacity-10 text-secondary">{bm.topic}</span></td>
                        <td className="text-muted small">{bm.notes || 'No notes added.'}</td>
                        <td className="text-end">
                          <button
                            onClick={() => handleDeleteBookmark(bm._id)}
                            className="btn btn-sm btn-light p-1.5 rounded-circle border text-danger"
                            title="Remove Bookmark"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-4 text-center text-muted small">
                No saved bookmarks yet. Bookmark difficult questions during practice sessions to review them later!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Practice Setup Config Modal */}
      {showConfigModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg text-start">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark">Configure Practice Session</h5>
                <button type="button" onClick={() => setShowConfigModal(false)} className="btn-close shadow-none border-0 bg-transparent"></button>
              </div>
              <div className="modal-body py-4">
                {configMode === 'Company' ? (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Target Company</label>
                    <select value={configCompany} onChange={(e) => setConfigCompany(e.target.value)} className="form-select form-select-sm">
                      {topicsData?.companies?.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Topic</label>
                    <select value={configTopic} onChange={(e) => setConfigTopic(e.target.value)} className="form-select form-select-sm">
                      {topicsData?.technicalTopics?.map((t, i) => <option key={i} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Difficulty Level</label>
                  <select value={configDifficulty} onChange={(e) => setConfigDifficulty(e.target.value)} className="form-select form-select-sm">
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Number of Questions</label>
                  <select value={configCount} onChange={(e) => setConfigCount(Number(e.target.value))} className="form-select form-select-sm">
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>

                <button
                  onClick={() => handleStartCustomPractice(configMode, configTopic, configCompany)}
                  disabled={startingSession}
                  className="btn btn-primary-purple text-white w-100 py-2 mt-2"
                >
                  {startingSession ? 'Generating questions...' : 'Start Practice Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeHub;
