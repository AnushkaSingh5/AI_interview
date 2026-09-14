import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiAward, FiCheckCircle, FiXCircle, FiClock, FiLayers, FiCpu,
  FiArrowLeft, FiRefreshCw, FiCheck, FiAlertTriangle, FiBookOpen,
  FiZap, FiDownload, FiServer, FiDatabase, FiRadio, FiActivity, FiShield
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import ArchitectureCanvas from '../components/ArchitectureCanvas';

const SystemDesignReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/system-design/report/${id}`);
      if (response.data && response.data.success) {
        setSession(response.data.session);
      }
    } catch (err) {
      console.error('Error fetching system design report:', err);
      toast.error('Failed to load system design evaluation report.');
      navigate('/mock-interviews');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading system design report...</span>
        </div>
      </div>
    );
  }

  const aiReview = session?.aiReview || {};
  const overallScore = session?.overallScore !== null && session?.overallScore !== undefined ? session.overallScore : (aiReview.overallScore || 0);
  const verdict = aiReview.interviewerVerdict || (overallScore >= 80 ? 'Strong Hire' : overallScore >= 65 ? 'Hire' : overallScore >= 45 ? 'Leaning Hire' : 'No Hire');

  const verdictBadgeColor = 
    verdict === 'Strong Hire' ? 'bg-success' :
    verdict === 'Hire' ? 'bg-primary' :
    verdict === 'Leaning Hire' ? 'bg-warning text-dark' : 'bg-danger';

  const pillarScores = [
    {
      title: 'Scalability & High Availability',
      score: aiReview.scalabilityScore ?? (aiReview.scalability?.score ?? 75),
      feedback: aiReview.scalability?.feedback || aiReview.summaryFeedback || 'Evaluated horizontal scaling, load distribution, and throughput capacity.',
      strengths: aiReview.strengths?.slice(0, 1) || [],
      icon: 'FiActivity',
      color: '#10b981'
    },
    {
      title: 'API & Communication Design',
      score: aiReview.apiDesignScore ?? (aiReview.apiDesign?.score ?? 75),
      feedback: aiReview.apiDesign?.feedback || 'Evaluated endpoint contracts, protocols (REST/gRPC/WebSocket), and idempotency.',
      strengths: aiReview.strengths?.slice(1, 2) || [],
      icon: 'FiServer',
      color: '#6366f1'
    },
    {
      title: 'Data Modeling & Databases',
      score: aiReview.dataModelingScore ?? (aiReview.dataModeling?.score ?? 75),
      feedback: aiReview.dataModeling?.feedback || 'Evaluated SQL vs NoSQL selection, sharding keys, indexing, and replication.',
      strengths: aiReview.strengths?.slice(2, 3) || [],
      icon: 'FiDatabase',
      color: '#2563eb'
    },
    {
      title: 'Caching & Performance',
      score: aiReview.cachingScore ?? (aiReview.caching?.score ?? 75),
      feedback: aiReview.caching?.feedback || 'Evaluated cache-aside patterns, Redis sizing, eviction policies, and edge CDN hits.',
      strengths: [],
      icon: 'FiZap',
      color: '#ef4444'
    },
    {
      title: 'Reliability & Fault Tolerance',
      score: aiReview.reliabilityScore ?? (aiReview.reliability?.score ?? 75),
      feedback: aiReview.reliability?.feedback || 'Evaluated single points of failure, redundancy, circuit breakers, and fallback mechanisms.',
      strengths: [],
      icon: 'FiShield',
      color: '#f59e0b'
    },
    {
      title: 'Trade-off Justifications',
      score: aiReview.tradeoffsScore ?? (aiReview.tradeOffAnalysis?.score ?? 75),
      feedback: aiReview.tradeOffAnalysis?.feedback || 'Evaluated CAP theorem choices, latency vs cost, and architecture compromises.',
      strengths: [],
      icon: 'FiCpu',
      color: '#8b5cf6'
    }
  ];

  const candidateNodes = session?.diagramNodes || session?.submission?.architectureDiagram?.nodes || [];
  const candidateConnections = session?.diagramConnections || session?.submission?.architectureDiagram?.connections || [];
  const bottlenecks = aiReview.bottlenecksAndRisks || aiReview.criticalBottlenecks || [];
  const tradeoffList = aiReview.tradeoffAnalysis || aiReview.tradeOffMatrix || [];
  const blueprint = aiReview.optimalArchitectureBlueprint || aiReview.recommendedBlueprint || {};

  return (
    <div className="container py-4 text-start">
      {/* Header Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/mock-interviews" className="btn btn-sm btn-outline-secondary rounded-circle p-1.5" title="Back to Mock Interviews">
              <FiArrowLeft size={14} />
            </Link>
            <h2 className="fw-bold text-dark mb-0 fs-4">System Design Assessment Report</h2>
            <span className={`badge ${verdictBadgeColor} fw-bold px-3 py-1.5 ms-2`}>
              Verdict: {verdict}
            </span>
          </div>
          <p className="text-muted small mb-0 ms-4 ps-2">
            {session?.title} • Evaluated across 6 Distributed Architecture Pillars on {session?.completedAt ? new Date(session.completedAt).toLocaleDateString() : 'Today'}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link to="/system-design/create" className="btn btn-sm btn-primary-purple text-white px-3 py-2 rounded-pill shadow-sm d-flex align-items-center gap-1.5">
            <FiRefreshCw /> Retake / New Challenge
          </Link>
          <button type="button" onClick={() => window.print()} className="btn btn-sm btn-outline-secondary px-3 py-2 rounded-pill d-flex align-items-center gap-1.5">
            <FiDownload /> Print Report
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metric Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3.5 bg-white border shadow-sm text-center h-100 rounded-3">
            <span className="text-muted small d-block mb-1 fw-semibold">Overall Architecture Score</span>
            <div className={`fs-2 fw-bold ${overallScore >= 80 ? 'text-success' : overallScore >= 55 ? 'text-primary' : 'text-danger'}`}>
              {overallScore}%
            </div>
            <span className="badge bg-light text-muted small">{verdict}</span>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="glass-panel p-3.5 bg-white border shadow-sm text-center h-100 rounded-3">
            <span className="text-muted small d-block mb-1 fw-semibold">Difficulty Level</span>
            <div className="fs-3 fw-bold text-dark mt-1">
              {session?.difficulty || 'Medium'}
            </div>
            <span className="text-muted small">{session?.durationMinutes || session?.timeLimitMinutes || 35} mins round</span>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="glass-panel p-3.5 bg-white border shadow-sm text-center h-100 rounded-3">
            <span className="text-muted small d-block mb-1 fw-semibold">Visual Diagram Size</span>
            <div className="fs-3 fw-bold text-primary mt-1">
              {candidateNodes.length} Nodes
            </div>
            <span className="text-muted small">{candidateConnections.length} Connected Flows</span>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="glass-panel p-3.5 bg-white border shadow-sm text-center h-100 rounded-3">
            <span className="text-muted small d-block mb-1 fw-semibold">Interviewer Verdict</span>
            <div className={`fs-4 fw-bold mt-1.5 ${overallScore >= 70 ? 'text-success' : overallScore >= 45 ? 'text-warning text-dark' : 'text-danger'}`}>
              {verdict}
            </div>
            <span className="text-muted small">Gemini AI Evaluation</span>
          </div>
        </div>
      </div>

      {/* AI Summary Feedback Banner */}
      {aiReview.summaryFeedback && (
        <div className="p-3.5 bg-white rounded-3 border shadow-sm mb-4" style={{ borderColor: '#e2e8f0', borderLeft: '4px solid var(--primary-purple)' }}>
          <strong className="text-dark d-block small mb-1">Architectural Review Summary:</strong>
          <p className="text-muted small mb-0" style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>
            {aiReview.summaryFeedback}
          </p>
        </div>
      )}

      {/* 6-Pillar Deep Dive Grid */}
      <h5 className="fw-bold text-dark mb-3">6-Pillar Architecture Breakdown</h5>
      <div className="row g-3 mb-4">
        {pillarScores.map((p, idx) => {
          const score = p.score;
          return (
            <div key={idx} className="col-md-4 col-12">
              <div className="glass-panel p-3 bg-white border shadow-sm rounded-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong className="text-dark small d-flex align-items-center gap-1.5">
                      <span className="p-1 rounded-circle text-white" style={{ backgroundColor: p.color }}>
                        <FiCpu size={12} />
                      </span>
                      {p.title}
                    </strong>
                    <span className={`badge ${score >= 80 ? 'bg-success' : score >= 60 ? 'bg-primary' : 'bg-warning text-dark'}`}>
                      {score}/100
                    </span>
                  </div>

                  <div className="progress mb-2" style={{ height: '6px' }}>
                    <div 
                      className="progress-bar" 
                      role="progressbar" 
                      style={{ width: `${score}%`, backgroundColor: p.color }} 
                    />
                  </div>

                  <p className="text-muted small mb-2" style={{ fontSize: '0.74rem', lineHeight: '1.4' }}>
                    {p.feedback}
                  </p>
                </div>

                {p.strengths && p.strengths.length > 0 && (
                  <div className="pt-2 border-top">
                    <span className="text-success fw-bold d-block" style={{ fontSize: '0.68rem' }}>Strengths:</span>
                    <ul className="list-unstyled mb-0 text-muted" style={{ fontSize: '0.7rem' }}>
                      {p.strengths.map((s, si) => (
                        <li key={si} className="d-flex align-items-start gap-1">
                          <FiCheck className="text-success mt-0.5 flex-shrink-0" />
                          <span className="text-truncate">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Candidate Architecture Diagram (Read-Only) */}
      <div className="glass-panel p-4 bg-white border shadow-sm rounded-3 mb-4">
        <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
          <FiLayers className="text-primary" /> Submitted Visual Architecture Diagram
        </h5>
        <p className="text-muted small mb-3">
          Interactive read-only snapshot of the candidate's components, microservices, databases, and protocol connections.
        </p>

        <ArchitectureCanvas
          initialNodes={candidateNodes}
          initialConnections={candidateConnections}
          readOnly={true}
          height="380px"
        />
      </div>

      {/* AI Optimal Blueprint & Key Improvements */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm rounded-3 h-100">
            <h6 className="fw-bold text-dark mb-2.5 d-flex align-items-center gap-2">
              <FiCheckCircle className="text-success" /> AI Recommended Optimal Blueprint
            </h6>
            <p className="text-muted small mb-3" style={{ fontSize: '0.8rem' }}>
              {blueprint.overview || blueprint.description || 'Optimal reference architecture designed for high availability, sub-10ms response times, and multi-region resilience.'}
            </p>
            {blueprint.components && (
              <ul className="list-unstyled mb-0 d-flex flex-column gap-1.5 text-muted small" style={{ fontSize: '0.78rem' }}>
                {blueprint.components.map((c, ci) => (
                  <li key={ci} className="d-flex align-items-start gap-2">
                    <FiServer className="text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>{c.name}:</strong> {c.role} {c.technologyChoice ? `(${c.technologyChoice})` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm rounded-3 h-100">
            <h6 className="fw-bold text-dark mb-2.5 d-flex align-items-center gap-2">
              <FiAlertTriangle className="text-warning" /> Critical Bottlenecks & Architecture Tips
            </h6>
            <div className="d-flex flex-column gap-2">
              {bottlenecks && bottlenecks.length > 0 ? (
                bottlenecks.map((b, bi) => (
                  <div key={bi} className="p-2.5 rounded-2 bg-light border" style={{ fontSize: '0.76rem' }}>
                    <strong className="text-danger d-block mb-0.5">⚠️ {typeof b === 'object' ? (b.area || 'Identified Risk') : 'Identified Risk'}</strong>
                    <span className="text-muted">{typeof b === 'object' ? (b.recommendation || b.risk || JSON.stringify(b)) : b}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted small">No critical single-points-of-failure detected. Architecture adheres to scalable practices.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trade-off Matrix */}
      {tradeoffList && tradeoffList.length > 0 && (
        <div className="glass-panel p-4 bg-white border shadow-sm rounded-3 mb-4">
          <h6 className="fw-bold text-dark mb-3">Architectural Trade-Off Analysis</h6>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.8rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Decision / Choice</th>
                  <th>Trade-off / Impact</th>
                  <th>AI Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {tradeoffList.map((t, ti) => (
                  <tr key={ti}>
                    <td className="fw-semibold text-dark">{t.decision}</td>
                    <td className="text-muted">{t.tradeOff || t.cons || t.pros || 'Evaluated'}</td>
                    <td className="text-primary">{t.recommendation || t.verdict || 'Justified'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="d-flex justify-content-between align-items-center pt-3 border-top">
        <Link to="/mock-interviews" className="btn btn-outline-secondary px-4 py-2 rounded-pill small">
          Back to Mock Interviews History
        </Link>
        <Link to="/system-design/create" className="btn btn-primary-purple text-white px-4 py-2 rounded-pill shadow-sm">
          Practice Another Architecture
        </Link>
      </div>

    </div>
  );
};

export default SystemDesignReport;
