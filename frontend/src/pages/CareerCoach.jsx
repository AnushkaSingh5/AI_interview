import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCompass, FiSend, FiPlus, FiTrash2, FiCopy, FiCheck, FiBookmark, 
  FiUser, FiBriefcase, FiLayers, FiCode, FiZap, FiHelpCircle,
  FiRefreshCw, FiChevronRight, FiSearch, FiSliders, FiCheckCircle,
  FiCornerDownRight, FiStar, FiMessageSquare, FiTrendingUp
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

/**
 * Minimalist, safe Markdown Renderer for AI responses
 */
const FormattedMarkdown = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const renderedElements = [];
  let inCodeBlock = false;
  let codeBlockBuffer = [];

  const parseInline = (text) => {
    // Split by inline code `...`
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-xs border border-purple-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      // Bold **...**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, j) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          return <strong key={`${i}-${j}`} className="fw-semibold text-dark">{bPart.slice(2, -2)}</strong>;
        }
        return bPart;
      });
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Code block toggles
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        renderedElements.push(
          <div key={`code-${index}`} className="my-2 p-3 bg-dark text-white rounded font-monospace small overflow-x-auto" style={{ fontSize: '0.85rem' }}>
            <pre className="m-0">{codeBlockBuffer.join('\n')}</pre>
          </div>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    if (!trimmed) {
      renderedElements.push(<div key={`empty-${index}`} className="my-1.5" />);
      return;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4 key={`h3-${index}`} className="fw-bold mt-3 mb-2 text-dark" style={{ fontSize: '1.05rem', color: '#1f2937' }}>
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('#### ')) {
      renderedElements.push(
        <h5 key={`h4-${index}`} className="fw-semibold mt-2.5 mb-1.5" style={{ fontSize: '0.95rem', color: '#4b5563' }}>
          {parseInline(trimmed.slice(5))}
        </h5>
      );
      return;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      renderedElements.push(
        <div key={`bullet-${index}`} className="d-flex align-items-start my-1 ms-2" style={{ fontSize: '0.9rem', lineHeight: '1.55' }}>
          <span className="me-2 text-primary fw-bold" style={{ color: '#6366f1' }}>•</span>
          <div className="text-secondary">{parseInline(trimmed.slice(2))}</div>
        </div>
      );
      return;
    }

    // Numbered lists
    const matchNum = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (matchNum) {
      renderedElements.push(
        <div key={`num-${index}`} className="d-flex align-items-start my-1 ms-2" style={{ fontSize: '0.9rem', lineHeight: '1.55' }}>
          <span className="badge rounded-pill bg-light text-primary me-2 border border-primary-subtle" style={{ fontSize: '0.75rem' }}>
            {matchNum[1]}
          </span>
          <div className="text-secondary">{parseInline(matchNum[2])}</div>
        </div>
      );
      return;
    }

    // Regular paragraph
    renderedElements.push(
      <p key={`p-${index}`} className="mb-2 text-secondary" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
        {parseInline(trimmed)}
      </p>
    );
  });

  return <div className="formatted-markdown-container">{renderedElements}</div>;
};

const CareerCoach = () => {
  const navigate = useNavigate();

  // Profile & Candidate Context
  const [profile, setProfile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);

  // Threads & Conversations
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Interactive Chat State
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Category tags with icons and descriptions
  const categoriesList = [
    { id: 'all', label: 'All Topics', icon: <FiCompass /> },
    { id: 'interview_prep', label: 'SDE Prep', icon: <FiCode /> },
    { id: 'resume_advice', label: 'Resume Projects', icon: <FiBriefcase /> },
    { id: 'roadmap', label: 'Study Roadmaps', icon: <FiLayers /> },
    { id: 'behavioral', label: 'Behavioral STAR', icon: <FiStar /> },
    { id: 'negotiation', label: 'Offer Negotiation', icon: <FiTrendingUp /> }
  ];

  // 1-Click Starter Cards
  const starterCards = [
    {
      title: 'SDE Interview Preparation',
      subtitle: 'Targeted coding patterns, DSA strategy & time management',
      prompt: 'How should I prepare for an SDE interview?',
      category: 'interview_prep',
      icon: '🎯',
      badge: 'Most Popular'
    },
    {
      title: 'Resume & Project Recommendations',
      subtitle: 'Standout architecture & high-scale project ideas',
      prompt: 'Which projects should I add to my resume?',
      category: 'resume_advice',
      icon: '💼',
      badge: 'Portfolio'
    },
    {
      title: 'Backend Development Roadmap',
      subtitle: 'Modern backend stack, databases, microservices & caching',
      prompt: 'What should I study for backend development?',
      category: 'roadmap',
      icon: '💻',
      badge: 'Curriculum'
    },
    {
      title: 'STAR Method Behavioral Answers',
      subtitle: 'Structure leadership & conflict resolution stories',
      prompt: 'How do I answer behavioral questions using the STAR framework?',
      category: 'behavioral',
      icon: '⚡',
      badge: 'Leadership'
    },
    {
      title: 'System Design Strategy',
      subtitle: 'Framework to tackle scalability, trade-offs and HLD rounds',
      prompt: 'What is the best framework to approach System Design interviews?',
      category: 'interview_prep',
      icon: '📐',
      badge: 'Architecture'
    },
    {
      title: 'Tech Salary Negotiation',
      subtitle: 'Tactics for counteroffers, equity evaluation, and recruiter talk',
      prompt: 'How do I negotiate my tech salary and compensation package?',
      category: 'negotiation',
      icon: '💰',
      badge: 'Compensation'
    }
  ];

  useEffect(() => {
    fetchCandidateContext();
    fetchThreads();
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      loadThreadMessages(activeThreadId);
    } else {
      setActiveThread(null);
      setMessages([]);
    }
  }, [activeThreadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCandidateContext = async () => {
    setLoadingContext(true);
    try {
      const profRes = await axiosInstance.get('/users/profile');
      if (profRes.data?.success) {
        setProfile(profRes.data.user);
      }
      const resDataRes = await axiosInstance.get('/resume/data');
      if (resDataRes.data?.success && resDataRes.data.resumeData) {
        setResumeData(resDataRes.data.resumeData);
      }
    } catch (e) {
      console.warn('Profile context fetch failed:', e.message);
    } finally {
      setLoadingContext(false);
    }
  };

  const fetchThreads = async () => {
    setLoadingThreads(true);
    try {
      const res = await axiosInstance.get('/career-coach/threads');
      if (res.data?.success) {
        const fetchedThreads = res.data.threads || [];
        setThreads(fetchedThreads);
        if (fetchedThreads.length > 0 && !activeThreadId) {
          setActiveThreadId(fetchedThreads[0]._id);
        }
      }
    } catch (e) {
      console.warn('Fetch threads failed:', e.message);
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadThreadMessages = async (threadId) => {
    setLoadingMessages(true);
    try {
      const res = await axiosInstance.get(`/career-coach/threads/${threadId}`);
      if (res.data?.success && res.data.thread) {
        setActiveThread(res.data.thread);
        setMessages(res.data.thread.messages || []);
      }
    } catch (e) {
      toast.error('Failed to load conversation history.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateNewThread = () => {
    setActiveThreadId(null);
    setActiveThread(null);
    setMessages([]);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSendMessage = async (customText = null, overrideCategory = null) => {
    const textToSend = (customText || inputValue).trim();
    if (!textToSend || sending) return;

    setSending(true);
    const tempUserMsg = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    // Optimistically update UI
    setMessages(prev => [...prev, tempUserMsg]);
    setInputValue('');

    try {
      const payload = {
        threadId: activeThreadId || undefined,
        message: textToSend,
        category: overrideCategory || selectedCategory !== 'all' ? selectedCategory : undefined
      };

      const res = await axiosInstance.post('/career-coach/message', payload);

      if (res.data?.success) {
        const updatedThread = res.data.thread;
        setActiveThread(updatedThread);
        setActiveThreadId(updatedThread._id);
        setMessages(updatedThread.messages || []);

        // Refresh threads list to update latest activity & title
        fetchThreads();
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error(error.response?.data?.message || 'Failed to get career advice. Please try again.');
      // Rollback optimistic user message if failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteThread = async (e, threadId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation thread?')) return;

    try {
      const res = await axiosInstance.delete(`/career-coach/threads/${threadId}`);
      if (res.data?.success) {
        toast.success('Conversation deleted.');
        const remaining = threads.filter(t => t._id !== threadId);
        setThreads(remaining);
        if (activeThreadId === threadId) {
          if (remaining.length > 0) {
            setActiveThreadId(remaining[0]._id);
          } else {
            handleCreateNewThread();
          }
        }
      }
    } catch (error) {
      toast.error('Failed to delete conversation.');
    }
  };

  const handleTogglePin = async (e, thread) => {
    e.stopPropagation();
    try {
      const res = await axiosInstance.put(`/career-coach/threads/${thread._id}`, {
        isPinned: !thread.isPinned
      });
      if (res.data?.success) {
        fetchThreads();
      }
    } catch (error) {
      toast.error('Failed to pin conversation.');
    }
  };

  const handleClearMessages = async () => {
    if (!activeThreadId) return;
    if (!window.confirm('Clear all messages in this conversation?')) return;

    try {
      const res = await axiosInstance.delete(`/career-coach/threads/${activeThreadId}/messages`);
      if (res.data?.success) {
        toast.success('Messages cleared.');
        setMessages([]);
        if (activeThread) {
          setActiveThread({ ...activeThread, messages: [] });
        }
      }
    } catch (error) {
      toast.error('Failed to clear messages.');
    }
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Copied advice to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filtered threads for sidebar
  const filteredThreads = threads.filter(t => {
    const matchesSearch = (t.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const skillsList = [
    ...(resumeData?.technicalSkills || []),
    ...(resumeData?.programmingLanguages || []),
    ...(profile?.skills || [])
  ].slice(0, 6);

  return (
    <div className="career-coach-page-wrapper container-fluid p-3 p-md-4">
      {/* Top Banner Header */}
      <div className="card shadow-sm border-0 mb-4 bg-white" style={{ borderRadius: '16px' }}>
        <div className="card-body p-3 p-md-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div 
              className="p-3 rounded-4 d-flex align-items-center justify-content-center text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', width: '56px', height: '56px' }}
            >
              <FiCompass className="fs-3" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h3 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.4rem' }}>AI Career Coach</h3>
                <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1">
                  FAANG Expert Advisory
                </span>
              </div>
              <p className="text-secondary mb-0 small mt-0.5">
                Personalized guidance on SDE interview prep, resume projects, backend engineering roadmaps & salary negotiation.
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              onClick={handleCreateNewThread}
              className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm"
              style={{ borderRadius: '10px', backgroundColor: '#6366f1', borderColor: '#6366f1' }}
            >
              <FiPlus />
              <span>New Conversation</span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="btn btn-outline-secondary d-flex align-items-center gap-1.5 px-3 py-2 fw-medium"
              style={{ borderRadius: '10px' }}
              title="Edit Profile & Skills Context"
            >
              <FiUser />
              <span className="d-none d-sm-inline">Profile Context</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="row g-3">
        {/* Left Column: Sidebar Threads & Candidate Profile Box */}
        <div className="col-12 col-lg-4 col-xl-3">
          {/* Candidate Context Card */}
          <div className="card shadow-sm border-0 mb-3 bg-white" style={{ borderRadius: '14px' }}>
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  Candidate Context
                </span>
                <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.7rem' }}>
                  Connected
                </span>
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                {profile?.fullName || profile?.name || 'Software Candidate'}
              </div>
              <div className="text-secondary small mb-2">
                🎯 <strong>{profile?.targetRole || 'Software Development Engineer'}</strong>
                {profile?.targetCompany && <span> at {profile.targetCompany}</span>}
              </div>

              {skillsList.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {skillsList.map((skill, i) => (
                    <span 
                      key={i} 
                      className="badge bg-light text-dark border"
                      style={{ fontSize: '0.68rem', fontWeight: 500 }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conversation Threads Manager Card */}
          <div className="card shadow-sm border-0 bg-white" style={{ borderRadius: '14px', minHeight: '520px' }}>
            <div className="card-header bg-white border-bottom p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>Chat History</span>
                <span className="badge bg-light text-secondary border">{threads.length}</span>
              </div>

              {/* Search Threads */}
              <div className="position-relative">
                <FiSearch className="position-absolute text-muted" style={{ top: '10px', left: '10px' }} />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control form-control-sm ps-4 border-light-subtle"
                  style={{ borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#f9fafb' }}
                />
              </div>

              {/* Category Filter Pills */}
              <div className="d-flex gap-1 overflow-x-auto py-2 mt-1" style={{ scrollbarWidth: 'none' }}>
                {categoriesList.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`btn btn-xs px-2 py-1 rounded-pill text-nowrap d-flex align-items-center gap-1 border ${
                      selectedCategory === cat.id 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-light text-secondary border-light-subtle'
                    }`}
                    style={{ fontSize: '0.72rem', fontWeight: 500 }}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Threads List */}
            <div className="card-body p-2" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {loadingThreads ? (
                <div className="text-center py-4 text-muted small">
                  <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
                  <div>Loading conversations...</div>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-4 text-muted px-2">
                  <FiMessageSquare className="fs-3 text-secondary mb-2 opacity-50" />
                  <p className="small mb-1">No chats found</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Start a new conversation or ask a question from the starter cards!
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-1.5">
                  {filteredThreads.map((thread) => {
                    const isActive = activeThreadId === thread._id;
                    return (
                      <div
                        key={thread._id}
                        onClick={() => setActiveThreadId(thread._id)}
                        className={`p-2.5 rounded-3 d-flex align-items-center justify-content-between cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-primary-subtle border border-primary-subtle' 
                            : 'bg-white hover-bg-light border border-transparent'
                        }`}
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden me-1">
                          <FiMessageSquare className={`flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted'}`} style={{ fontSize: '0.88rem' }} />
                          <div className="overflow-hidden">
                            <div className={`text-truncate fw-medium ${isActive ? 'text-primary' : 'text-dark'}`} style={{ fontSize: '0.84rem' }}>
                              {thread.title || 'Career Discussion'}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {thread.messages?.length || 0} messages • {new Date(thread.lastActiveAt || thread.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-1 flex-shrink-0">
                          {thread.isPinned && (
                            <FiBookmark className="text-warning" style={{ fontSize: '0.8rem' }} />
                          )}
                          <button
                            onClick={(e) => handleDeleteThread(e, thread._id)}
                            className="btn btn-link text-muted p-1 hover-text-danger"
                            title="Delete Conversation"
                            style={{ fontSize: '0.8rem' }}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Conversation Canvas */}
        <div className="col-12 col-lg-8 col-xl-9">
          <div className="card shadow-sm border-0 bg-white d-flex flex-column" style={{ borderRadius: '16px', minHeight: '660px', height: '100%' }}>
            {/* Chat Canvas Top Header */}
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center text-white"
                  style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
                >
                  <FiCompass />
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '1rem' }}>
                    {activeThread?.title || 'Interactive Career Advisory'}
                  </h5>
                  <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                    {messages.length > 0 ? `${messages.length} messages in thread` : 'Ready to help you succeed'}
                  </span>
                </div>
              </div>

              {messages.length > 0 && (
                <div className="d-flex align-items-center gap-2">
                  <button
                    onClick={handleClearMessages}
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    style={{ borderRadius: '8px', fontSize: '0.78rem' }}
                  >
                    <FiTrash2 />
                    <span>Clear Messages</span>
                  </button>
                </div>
              )}
            </div>

            {/* Chat Messages Body Area */}
            <div 
              className="card-body p-3 p-md-4 flex-grow-1 overflow-y-auto"
              style={{ maxHeight: '520px', minHeight: '400px', backgroundColor: '#fcfcfd' }}
            >
              {loadingMessages ? (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted">
                  <div className="spinner-border text-primary mb-3" role="status" />
                  <p className="small">Loading conversation history...</p>
                </div>
              ) : messages.length === 0 ? (
                /* Empty Chat: Show Welcome & Starter Questions Grid */
                <div className="py-2">
                  <div className="text-center max-w-lg mx-auto mb-4">
                    <div 
                      className="d-inline-flex p-3 rounded-circle text-white mb-2 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                    >
                      <FiZap className="fs-3" />
                    </div>
                    <h4 className="fw-bold text-dark mb-1">What would you like to explore today?</h4>
                    <p className="text-secondary small mb-0" style={{ maxWidth: '480px', margin: '0 auto' }}>
                      Ask any question regarding your tech career, or pick one of the recommended starter queries below:
                    </p>
                  </div>

                  {/* Starter Cards Grid */}
                  <div className="row g-2.5">
                    {starterCards.map((card, idx) => (
                      <div key={idx} className="col-12 col-md-6">
                        <div
                          onClick={() => handleSendMessage(card.prompt, card.category)}
                          className="p-3 rounded-3 border bg-white h-100 d-flex flex-column justify-content-between shadow-2xs hover-shadow-sm cursor-pointer"
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            borderColor: '#e5e7eb'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#6366f1';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="fs-5">{card.icon}</span>
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.68rem' }}>
                                {card.badge}
                              </span>
                            </div>
                            <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '0.92rem' }}>
                              {card.title}
                            </h6>
                            <p className="text-secondary small mb-2" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                              {card.subtitle}
                            </p>
                          </div>
                          <div className="d-flex align-items-center text-primary fw-semibold small mt-1" style={{ fontSize: '0.78rem' }}>
                            <span>"{card.prompt}"</span>
                            <FiChevronRight className="ms-auto" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Render Messages Sequence */
                <div className="d-flex flex-column gap-3.5">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    const isLatestAssistant = !isUser && index === messages.length - 1;

                    return (
                      <div
                        key={index}
                        className={`d-flex flex-column ${isUser ? 'align-items-end' : 'align-items-start'}`}
                      >
                        {/* Role Header Badge */}
                        <div className="d-flex align-items-center gap-1.5 mb-1 px-1">
                          <span className="fw-semibold text-muted" style={{ fontSize: '0.74rem' }}>
                            {isUser ? 'You' : 'AI Career Coach'}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                            • {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`p-3 p-md-3.5 rounded-4 shadow-2xs position-relative ${
                            isUser
                              ? 'bg-primary text-white'
                              : 'bg-white text-dark border border-light-subtle'
                          }`}
                          style={{
                            maxWidth: isUser ? '85%' : '94%',
                            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            backgroundColor: isUser ? '#4f46e5' : '#ffffff'
                          }}
                        >
                          {isUser ? (
                            <div className="text-white" style={{ fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>
                              {msg.content}
                            </div>
                          ) : (
                            <div>
                              <FormattedMarkdown content={msg.content} />

                              {/* Copy Response Action Button */}
                              <div className="d-flex align-items-center justify-content-end mt-2 pt-2 border-top border-light-subtle">
                                <button
                                  onClick={() => handleCopyMessage(msg.content, index)}
                                  className="btn btn-xs btn-light text-secondary d-flex align-items-center gap-1 py-1 px-2 border"
                                  style={{ fontSize: '0.72rem', borderRadius: '6px' }}
                                >
                                  {copiedIndex === index ? (
                                    <>
                                      <FiCheck className="text-success" />
                                      <span className="text-success">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <FiCopy />
                                      <span>Copy Advice</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Suggested Follow-up Prompts Chips (for latest assistant response) */}
                        {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                          <div className="mt-2.5 ms-1">
                            <div className="d-flex align-items-center gap-1 text-muted mb-1.5" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                              <FiCornerDownRight />
                              <span>SUGGESTED NEXT QUESTIONS:</span>
                            </div>
                            <div className="d-flex flex-wrap gap-1.5">
                              {msg.suggestedFollowUps.map((promptText, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={() => handleSendMessage(promptText)}
                                  disabled={sending}
                                  className="btn btn-sm btn-outline-primary bg-white text-primary border-primary-subtle text-start d-flex align-items-center gap-1.5 px-2.5 py-1.5 shadow-2xs hover-bg-primary-subtle"
                                  style={{ borderRadius: '8px', fontSize: '0.78rem', transition: 'all 0.15s ease' }}
                                >
                                  <FiZap style={{ fontSize: '0.75rem', flexShrink: 0 }} />
                                  <span>{promptText}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* AI Thinking Animation */}
                  {sending && (
                    <div className="d-flex flex-column align-items-start">
                      <div className="d-flex align-items-center gap-1.5 mb-1 px-1">
                        <span className="fw-semibold text-muted" style={{ fontSize: '0.74rem' }}>
                          AI Career Coach
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.68rem' }}>• thinking...</span>
                      </div>
                      <div 
                        className="p-3 rounded-4 bg-white border border-light-subtle d-flex align-items-center gap-2 shadow-2xs"
                        style={{ borderRadius: '16px 16px 16px 4px' }}
                      >
                        <div className="spinner-grow spinner-grow-sm text-primary" role="status" style={{ width: '0.6rem', height: '0.6rem' }} />
                        <div className="spinner-grow spinner-grow-sm text-purple" role="status" style={{ width: '0.6rem', height: '0.6rem', animationDelay: '0.2s' }} />
                        <div className="spinner-grow spinner-grow-sm text-indigo" role="status" style={{ width: '0.6rem', height: '0.6rem', animationDelay: '0.4s' }} />
                        <span className="text-secondary small ms-1" style={{ fontSize: '0.8rem' }}>Synthesizing personalized career advice...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Composer Box */}
            <div className="card-footer bg-white border-top p-3">
              {/* Quick Prompt Chips */}
              <div className="d-flex gap-1.5 overflow-x-auto pb-2 mb-1" style={{ scrollbarWidth: 'none' }}>
                <span className="text-muted small align-self-center me-1" style={{ fontSize: '0.72rem' }}>Quick:</span>
                <button
                  onClick={() => setInputValue('How should I prepare for an SDE interview?')}
                  className="btn btn-xs btn-light border text-secondary px-2 py-0.5 rounded-pill text-nowrap"
                  style={{ fontSize: '0.72rem' }}
                >
                  🎯 SDE Interview Prep
                </button>
                <button
                  onClick={() => setInputValue('Which projects should I add to my resume?')}
                  className="btn btn-xs btn-light border text-secondary px-2 py-0.5 rounded-pill text-nowrap"
                  style={{ fontSize: '0.72rem' }}
                >
                  💼 Resume Projects
                </button>
                <button
                  onClick={() => setInputValue('What should I study for backend development?')}
                  className="btn btn-xs btn-light border text-secondary px-2 py-0.5 rounded-pill text-nowrap"
                  style={{ fontSize: '0.72rem' }}
                >
                  💻 Backend Roadmap
                </button>
              </div>

              <div className="position-relative d-flex align-items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your career, interview prep, resume, or technologies... (Enter to send, Shift+Enter for new line)"
                  className="form-control border-light-subtle shadow-none py-2 px-3 flex-grow-1"
                  style={{
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    resize: 'none',
                    backgroundColor: '#f9fafb'
                  }}
                  disabled={sending}
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={sending || !inputValue.trim()}
                  className="btn btn-primary d-flex align-items-center justify-content-center shadow-sm"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: sending || !inputValue.trim() ? '#cbd5e1' : '#6366f1',
                    borderColor: 'transparent',
                    flexShrink: 0
                  }}
                >
                  <FiSend className="fs-5" />
                </button>
              </div>

              <div className="d-flex align-items-center justify-content-between mt-1.5 px-1">
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                  AI Career Coach integrates your profile and resume data to generate tailored advice.
                </span>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                  Press <strong>Enter ↵</strong> to send
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerCoach;
