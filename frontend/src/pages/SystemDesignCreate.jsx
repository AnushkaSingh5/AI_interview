import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiLayers, FiArrowLeft, FiPlay, FiClock, FiCpu, FiCheck, FiServer, FiDatabase,
  FiZap, FiActivity, FiShield, FiTag, FiSearch
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const DIFFICULTY_OPTIONS = [
  { 
    id: 'Easy', 
    label: 'Easy', 
    durationMinutes: 25,
    desc: 'Foundational architectures: 3-tier services, caching layers, and REST APIs.' 
  },
  { 
    id: 'Medium', 
    label: 'Medium', 
    durationMinutes: 35,
    desc: 'High-throughput distributed systems: horizontal scaling, partitioning, and message queues.' 
  },
  { 
    id: 'Hard', 
    label: 'Hard', 
    durationMinutes: 45,
    desc: 'Ultra-scale global systems: multi-region replication, CAP trade-offs, and microsecond latencies.' 
  }
];

const CURATED_SCENARIOS = [
  {
    id: 'tinyurl',
    title: 'Design a High-Scale URL Shortener (TinyURL)',
    category: 'Storage & Hashing',
    difficulty: 'Easy',
    summary: 'Design a distributed URL shortening service handling 100M daily writes and 1B daily reads with sub-10ms redirects.',
    tags: ['Base62', 'Redis Cache', 'NoSQL', 'Write Heavy']
  },
  {
    id: 'video_streaming',
    title: 'Design a Video Streaming Platform (Netflix / YouTube)',
    category: 'Streaming & CDN',
    difficulty: 'Medium',
    summary: 'Design a global video ingestion, adaptive bitrate transcoding, and multi-CDN distribution architecture.',
    tags: ['HLS/DASH', 'CDN Edge', 'Blob S3', 'Transcoder Queue']
  },
  {
    id: 'chat_system',
    title: 'Design a Real-Time Chat & Messaging Platform (Slack / WhatsApp)',
    category: 'Real-Time & WebSockets',
    difficulty: 'Medium',
    summary: 'Design a persistent bidirectional messaging service supporting 50M concurrent connections and group channels.',
    tags: ['WebSockets', 'Kafka', 'Cassandra', 'Presence Server']
  },
  {
    id: 'flash_sale',
    title: 'Design a Flash Sale E-Commerce Inventory System',
    category: 'High Concurrency & Transactions',
    difficulty: 'Hard',
    summary: 'Design a high-concurrency ticket/item checkout system preventing overselling under 500,000 requests/sec bursts.',
    tags: ['Redis Lua', 'Optimistic Locking', 'Kafka Buffering', 'Idempotency']
  },
  {
    id: 'social_newsfeed',
    title: 'Design a Social Media Newsfeed (Twitter / Instagram Feed)',
    category: 'Fan-Out & Aggregation',
    difficulty: 'Hard',
    summary: 'Design a dynamic timeline feed with hybrid fan-out on write for regular users and fan-out on read for celebrities.',
    tags: ['Fan-Out', 'Redis Timeline', 'Graph DB', 'Ranking Engine']
  },
  {
    id: 'distributed_cache',
    title: 'Design a Distributed In-Memory Key-Value Cache',
    category: 'Distributed Systems',
    difficulty: 'Hard',
    summary: 'Design an in-memory cache supporting consistent hashing, virtual nodes, LRU eviction, and active replication.',
    tags: ['Consistent Hashing', 'LRU Eviction', 'Gossip Protocol', 'WAL']
  },
  {
    id: 'ride_sharing',
    title: 'Design a Ride-Hailing Driver Dispatch System (Uber / Lyft)',
    category: 'Geo-Spatial & Real-Time',
    difficulty: 'Medium',
    summary: 'Design a geospatial location indexing and nearest-driver dispatch engine handling millions of live GPS streams.',
    tags: ['H3 / GeoHash', 'QuadTree', 'WebSocket', 'Matching Engine']
  },
  {
    id: 'rate_limiter',
    title: 'Design a Distributed API Rate Limiter',
    category: 'Security & Ingress',
    difficulty: 'Easy',
    summary: 'Design an API Gateway token bucket rate limiter tracking user quotas across global edge servers.',
    tags: ['Sliding Window Log', 'Token Bucket', 'Redis Atomic', 'Envoy Filter']
  }
];

const DOMAIN_TAGS = ['All', 'Storage & Hashing', 'Streaming & CDN', 'Real-Time & WebSockets', 'High Concurrency & Transactions', 'Distributed Systems', 'Geo-Spatial & Real-Time', 'Security & Ingress'];

const SystemDesignCreate = () => {
  const navigate = useNavigate();

  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('video_streaming');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeDuration = difficulty === 'Easy' ? 25 : difficulty === 'Medium' ? 35 : 45;

  const filteredScenarios = CURATED_SCENARIOS.filter(s => {
    const matchesTag = selectedTag === 'All' || s.category === selectedTag;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const handleStartSession = async () => {
    setLoading(true);
    try {
      let scenarioData = {};
      if (useCustom) {
        if (!customPrompt.trim()) {
          toast.warning('Please enter a description for your custom system design challenge.');
          setLoading(false);
          return;
        }
        scenarioData = {
          title: 'Custom System Architecture Challenge',
          scenarioType: 'Custom',
          description: customPrompt.trim(),
          customScenarioPrompt: customPrompt.trim()
        };
      } else {
        const picked = CURATED_SCENARIOS.find(s => s.id === selectedScenarioId) || CURATED_SCENARIOS[0];
        scenarioData = {
          title: picked.title,
          scenarioType: picked.id,
          description: picked.summary
        };
      }

      const payload = {
        title: scenarioData.title,
        difficulty,
        scenarioType: scenarioData.scenarioType,
        customScenarioPrompt: scenarioData.customScenarioPrompt || undefined,
        durationMinutes: activeDuration
      };

      const response = await axiosInstance.post('/system-design/create', payload);

      if (response.data && response.data.success && response.data.session) {
        toast.success('System Design Studio ready! Entering proctored live session...');
        navigate(`/system-design/session/${response.data.session.interviewId}`);
      } else {
        toast.error(response.data?.message || 'Failed to initialize system design session.');
      }
    } catch (error) {
      console.error('Error starting system design session:', error);
      toast.error(error.response?.data?.message || 'Failed to start system design session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 text-start">
      {/* Header Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/mock-interviews" className="btn btn-sm btn-outline-secondary rounded-circle p-1.5" title="Back to Mock Interviews">
              <FiArrowLeft size={14} />
            </Link>
            <h2 className="fw-bold text-dark mb-0 fs-4">AI System Design Interview</h2>
            <span className="badge bg-purple text-white fw-bold px-2.5 py-1 ms-2" style={{ backgroundColor: '#8b5cf6' }}>
              Architecture Round
            </span>
          </div>
          <p className="text-muted small mb-0 ms-4 ps-2">
            Draw distributed architectures, write technical design docs, and receive 6-pillar AI evaluation on scalability, APIs, databases, caching, and trade-offs.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Configuration Settings */}
        <div className="col-lg-8">
          
          {/* Step 1: Select Difficulty (Fixed Duration) */}
          <div className="glass-panel p-4 bg-white shadow-sm rounded-4 mb-4 border" style={{ borderColor: '#e2e8f0' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <FiClock className="text-primary" /> 1. Select Difficulty & Duration
              </h5>
              <span className="badge bg-light text-dark border px-3 py-1.5 fw-semibold" style={{ fontSize: '0.8rem' }}>
                Allocated Time: <strong>{activeDuration} Minutes</strong>
              </span>
            </div>

            <div className="row g-3">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = difficulty === opt.id;
                return (
                  <div key={opt.id} className="col-md-4">
                    <div 
                      onClick={() => setDifficulty(opt.id)}
                      className={'p-3.5 rounded-3 border cursor-pointer h-100 transition-all select-none ' + (isSelected ? 'border-primary bg-light' : 'bg-white')}
                      style={{
                        borderColor: isSelected ? 'var(--primary-purple)' : '#e2e8f0',
                        boxShadow: isSelected ? '0 0 0 2px rgba(139, 92, 246, 0.2)' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1.5">
                        <strong className="text-dark fs-6">{opt.label}</strong>
                        <span className={'badge ' + (opt.id === 'Easy' ? 'bg-success' : opt.id === 'Medium' ? 'bg-warning text-dark' : 'bg-danger')}>
                          {opt.durationMinutes} mins
                        </span>
                      </div>
                      <p className="text-muted small mb-0" style={{ fontSize: '0.74rem', lineHeight: '1.35' }}>
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Choose Architectural Challenge */}
          <div className="glass-panel p-4 bg-white shadow-sm rounded-4 mb-4 border" style={{ borderColor: '#e2e8f0' }}>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <FiLayers className="text-primary" /> 2. Choose Architecture Scenario
              </h5>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseCustom(false)}
                  className={'btn btn-sm px-3 rounded-pill fw-semibold ' + (!useCustom ? 'btn-primary-purple text-white' : 'btn-light border')}
                >
                  Curated Challenges
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className={'btn btn-sm px-3 rounded-pill fw-semibold ' + (useCustom ? 'btn-primary-purple text-white' : 'btn-light border')}
                >
                  Custom Challenge
                </button>
              </div>
            </div>

            {!useCustom ? (
              <>
                {/* Search & Domain Filter Pills */}
                <div className="d-flex flex-wrap gap-1.5 mb-3">
                  {DOMAIN_TAGS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTag(t)}
                      className={'btn btn-sm py-1 px-2.5 rounded-pill ' + (selectedTag === t ? 'btn-dark text-white' : 'btn-light border text-muted')}
                      style={{ fontSize: '0.73rem' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Scenario Selection Grid */}
                <div className="d-flex flex-column gap-2.5" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {filteredScenarios.map(sc => {
                    const isSelected = selectedScenarioId === sc.id;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => setSelectedScenarioId(sc.id)}
                        className={'p-3 rounded-3 border transition-all select-none ' + (isSelected ? 'border-primary bg-light' : 'bg-white')}
                        style={{
                          borderColor: isSelected ? 'var(--primary-purple)' : '#e2e8f0',
                          boxShadow: isSelected ? '0 2px 8px rgba(139, 92, 246, 0.15)' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <strong className="text-dark fs-6">{sc.title}</strong>
                          <span className="badge bg-light text-secondary border small">{sc.category}</span>
                        </div>
                        <p className="text-muted small mb-2" style={{ fontSize: '0.78rem' }}>
                          {sc.summary}
                        </p>
                        <div className="d-flex flex-wrap gap-1.5">
                          {sc.tags.map((tg, idx) => (
                            <span key={idx} className="badge bg-white text-dark border px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                              #{tg}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div>
                <label className="form-label small fw-semibold text-muted">
                  Custom System Architecture Prompt / Requirements:
                </label>
                <textarea
                  rows="6"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Design a real-time collaborative document editor like Google Docs with operational transformation/CRDTs, handling 10,000 concurrent edits per document..."
                  className="form-control"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Session Summary Card & Launch */}
        <div className="col-lg-4">
          <div className="glass-panel p-4 bg-white shadow-sm rounded-4 border sticky-top" style={{ borderColor: '#e2e8f0', top: '20px' }}>
            <h5 className="fw-bold text-dark mb-3">Interview Summary</h5>

            <div className="d-flex flex-column gap-3 mb-4">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                <span className="text-muted small">Interview Type</span>
                <span className="badge bg-purple text-white fw-bold" style={{ backgroundColor: '#8b5cf6' }}>System Design</span>
              </div>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                <span className="text-muted small">Difficulty</span>
                <span className="fw-bold text-dark">{difficulty}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                <span className="text-muted small">Duration</span>
                <span className="fw-bold text-primary">{activeDuration} Minutes</span>
              </div>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                <span className="text-muted small">Mode</span>
                <span className="text-dark fw-semibold small">Visual Studio + Design Doc</span>
              </div>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                <span className="text-muted small">AI Evaluator</span>
                <span className="badge bg-success-subtle text-success border border-success small">6-Pillar Gemini AI</span>
              </div>
            </div>

            {/* AI Evaluation Pillars Checklist */}
            <div className="p-3 rounded-3 bg-light border mb-4" style={{ borderColor: '#e2e8f0' }}>
              <span className="text-dark fw-bold d-block small mb-2">Evaluated Criteria:</span>
              <ul className="list-unstyled mb-0 d-flex flex-column gap-1 text-muted small" style={{ fontSize: '0.74rem' }}>
                <li className="d-flex align-items-center gap-1.5"><FiCheck className="text-success" /> Scalability & High Availability</li>
                <li className="d-flex align-items-center gap-1.5"><FiCheck className="text-success" /> API & Interface Specifications</li>
                <li className="d-flex align-items-center gap-1.5"><FiCheck className="text-success" /> Data Modeling & Sharding Strategy</li>
                <li className="d-flex align-items-center gap-1.5"><FiCheck className="text-success" /> Caching & Invalidation Performance</li>
                <li className="d-flex align-items-center gap-1.5"><FiCheck className="text-success" /> Fault Tolerance & Redundancy</li>
                <li className="d-flex align-items-center gap-1.5"><FiCheck className="text-success" /> Technical Trade-off Justifications</li>
              </ul>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="btn btn-primary-purple w-100 py-2.5 text-white fw-semibold rounded-pill shadow-sm d-flex align-items-center justify-content-center gap-2"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Preparing Studio...</span>
                </>
              ) : (
                <>
                  <FiPlay />
                  <span>Start System Design Round</span>
                </>
              )}
            </button>

            <p className="text-muted small text-center mt-2 mb-0" style={{ fontSize: '0.72rem' }}>
              <FiShield className="text-warning me-1" /> Single-resume protection enabled in live mode.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemDesignCreate;
