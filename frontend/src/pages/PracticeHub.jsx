import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiBookOpen, FiZap, FiAward, FiBookmark, FiLayers, FiPlay, FiRefreshCw,
  FiCheckCircle, FiClock, FiStar, FiTrash2, FiChevronRight, FiSliders, FiFileText, FiTarget
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const PracticeHub = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [topicsData, setTopicsData] = useState(null);
  const [stats, setStats] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
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

  useEffect(() => {
    fetchHubData();
  }, []);

  const fetchHubData = async () => {
    setLoading(true);
    try {
      const [topRes, statRes, roadRes, fcRes, bmRes] = await Promise.all([
        axiosInstance.get('/practice/topics'),
        axiosInstance.get('/practice/stats'),
        axiosInstance.get('/practice/roadmap'),
        axiosInstance.get('/practice/flashcards'),
        axiosInstance.get('/practice/bookmarks')
      ]);

      if (topRes.data.success) setTopicsData(topRes.data);
      if (statRes.data.success) setStats(statRes.data);
      if (roadRes.data.success) setRoadmap(roadRes.data.roadmap);
      if (fcRes.data.success) setFlashcards(fcRes.data.flashcards || []);
      if (bmRes.data.success) setBookmarks(bmRes.data.bookmarks || []);
    } catch (error) {
      console.error('Error fetching Practice Hub data:', error);
      toast.error('Failed to load practice hub data');
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
            <h4 className="h6 fw-bold text-dark mb-3">Your Tailored 4-Week Learning Plan</h4>
            {roadmap?.weeks?.length > 0 ? (
              <div className="row g-3">
                {roadmap.weeks.map((w, idx) => (
                  <div key={idx} className="col-md-6 col-lg-3">
                    <div className="border rounded-3 p-3 bg-light bg-opacity-50 h-100 d-flex flex-column justify-content-between">
                      <div>
                        <span className="badge bg-primary bg-opacity-10 text-primary mb-2">Week {w.weekNumber}</span>
                        <strong className="d-block text-dark mb-1">{w.topic}</strong>
                        <span className="d-block text-muted small mb-2">Focus: {w.focusArea}</span>
                        <p className="text-muted mb-0" style={{ fontSize: '0.74rem', lineHeight: '1.4' }}>{w.reason}</p>
                      </div>
                      <button
                        onClick={() => handleStartCustomPractice('Technical', w.topic)}
                        className="btn btn-sm btn-primary-purple text-white w-100 mt-3 py-1.5"
                        style={{ fontSize: '0.74rem' }}
                      >
                        Start Week {w.weekNumber}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted small">Roadmap generating...</div>
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
