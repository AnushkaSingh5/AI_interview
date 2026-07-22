import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiMic, FiAward, FiActivity, FiCheckCircle, FiAlertTriangle,
  FiArrowLeft, FiClock, FiFileText, FiVolume2, FiTrendingUp, FiMessageSquare,
  FiDownload, FiStar, FiChevronDown, FiChevronUp, FiBookOpen, FiMap
} from 'react-icons/fi';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip
} from 'recharts';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const VoiceReportView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [collapsedMap, setCollapsedMap] = useState({});
  const isFetchingRef = useRef(false);
  const fetchedIdRef = useRef(null);

  useEffect(() => {
    if (fetchedIdRef.current === id) return;
    fetchVoiceReport();
  }, [id]);

  const fetchVoiceReport = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/voice/report/${id}`);
      if (response.data && response.data.success) {
        setReport(response.data.report);
        fetchedIdRef.current = id;
      }
    } catch (err) {
      console.error('Error fetching voice report:', err);
      toast.error('Failed to load voice communication report');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const toggleCollapse = (idx) => {
    setCollapsedMap(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleDownloadPdf = () => {
    if (!report?.sessionId && !report?._id) return;
    const token = localStorage.getItem('token');
    const sessionKey = report.sessionId || report._id;
    const pdfUrl = `${axiosInstance.defaults.baseURL}/interviews/${sessionKey}/report/pdf?token=${token}`;
    window.open(pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="container py-4 text-start">
        <div className="skeleton-pulse mb-3" style={{ width: '220px', height: '32px' }} />
        <div className="row g-4 mb-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div className="col-md-2.4 col-6" key={i}>
              <div className="glass-panel p-4 skeleton-pulse" style={{ height: '100px' }} />
            </div>
          ))}
        </div>
        <div className="glass-panel p-4 skeleton-pulse" style={{ height: '300px' }} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">Voice report not found.</p>
        <Link to="/mock-interviews" className="btn btn-primary-purple text-white">Return to Mock Interviews</Link>
      </div>
    );
  }

  const questions = report.questions || [];
  const answeredCount = questions.filter(q => q.wordCount > 0).length;
  const completionRate = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 100;

  // Formatting chart data for Recharts
  const radarData = [
    { subject: 'Technical', A: report.technicalScore || 0, fullMark: 100 },
    { subject: 'Communication', A: report.communicationScore || 0, fullMark: 100 },
    { subject: 'Vocal Confidence', A: report.confidenceScore || 0, fullMark: 100 },
    { subject: 'Fluency & Flow', A: report.fluencyScore || 0, fullMark: 100 },
    { subject: 'Completion', A: completionRate, fullMark: 100 }
  ];

  const barData = questions.map((q, idx) => ({
    name: `Q${idx + 1}`,
    Score: (q.score || 0) * 10
  }));

  const strengths = report.strengths && report.strengths.length > 0 ? report.strengths : [
    'Clear vocal delivery and articulate speaking tone.',
    'Direct answers provided for key technical questions.'
  ];

  const focusGaps = report.focusGaps && report.focusGaps.length > 0 ? report.focusGaps : [
    'Elaborate technical architecture and system trade-offs further.',
    'Reduce filler words (um, uh, like) during technical explanations.'
  ];

  const recommendations = report.recommendations && report.recommendations.length > 0 ? report.recommendations : [
    'Use the STAR method (Situation, Task, Action, Result) for structured verbal responses.',
    'Pause silently for 1-2 seconds instead of using filler words.',
    'Maintain a steady speaking pace between 130 and 150 words per minute.'
  ];

  const learningRoadmap = report.learningRoadmap && report.learningRoadmap.length > 0 ? report.learningRoadmap : [
    { priority: 'PRIORITY 1', title: 'System Architecture & Design Patterns', description: 'Essential for articulating component trade-offs, caching, and DB scaling in interviews.' },
    { priority: 'PRIORITY 2', title: 'Verbal Articulation & STAR Method', description: 'Structure responses clearly to demonstrate technical leadership.' },
    { priority: 'PRIORITY 3', title: 'Code Performance & Debugging Trade-offs', description: 'Deepen technical justifications for memory limits and runtime bottlenecks.' }
  ];

  const skillHeatmap = report.skillHeatmap && report.skillHeatmap.length > 0 ? report.skillHeatmap : [
    { skill: 'Technical Core Analysis', stars: Math.max(1, Math.min(5, Math.round((report.technicalScore || 70) / 20))) },
    { skill: 'Verbal Delivery & Articulation', stars: Math.max(1, Math.min(5, Math.round((report.communicationScore || 80) / 20))) },
    { skill: 'Vocal Confidence & Flow', stars: Math.max(1, Math.min(5, Math.round((report.confidenceScore || 80) / 20))) },
    { skill: 'Problem Solving & Structure', stars: Math.max(1, Math.min(5, Math.round((report.overallScore || 75) / 20))) }
  ];

  return (
    <div className="container py-4 text-start">
      {/* Top Navigation */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link to="/mock-interviews" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1">
          <FiArrowLeft /> Back to Mock Interviews
        </Link>
        <button
          onClick={handleDownloadPdf}
          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5 border border-primary-subtle text-primary bg-transparent"
        >
          <FiDownload /> Export PDF Report
        </button>
      </div>

      {/* Report Summary Header Card */}
      <div className="glass-panel p-4 bg-white mb-4 shadow-sm rounded-4" style={{ border: '1px solid var(--border-grey)' }}>
        <div className="row align-items-center g-3">
          <div className="col-md-8">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <span className="badge bg-purple bg-opacity-10 text-primary fw-bold" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
                🎙️ AI Voice & Communication Report
              </span>
              <span className="badge bg-success text-success bg-opacity-10 fw-bold">Mock Interview Completed</span>
            </div>
            <h1 className="fw-bold text-dark h3 mb-1">{report.sessionTitle}</h1>
            <p className="text-muted small mb-0">Role: <strong>{report.role}</strong> &bull; Difficulty: <strong>{report.difficulty}</strong> &bull; Date: <strong>{new Date(report.createdAt).toLocaleDateString()}</strong></p>
          </div>
          <div className="col-md-4 text-center text-md-end border-start-md">
            <div className="d-inline-block text-center bg-light bg-opacity-50 p-3 rounded-3 border">
              <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Overall Score</span>
              <strong className="display-5 fw-bold text-primary mb-0" style={{ color: 'var(--primary-purple)' }}>{report.overallScore}%</strong>
              <span className="badge bg-success text-success bg-opacity-10 d-block mt-1.5 fw-bold text-uppercase" style={{ fontSize: '0.64rem' }}>
                {report.overallScore >= 80 ? 'EXCELLENT' : report.overallScore >= 70 ? 'VERY GOOD' : report.overallScore >= 60 ? 'SATISFACTORY' : 'NEEDS PRACTICE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Score Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Technical Core', val: report.technicalScore, color: 'primary' },
          { label: 'Communication', val: report.communicationScore, color: 'success' },
          { label: 'Vocal Confidence', val: report.confidenceScore, color: 'warning' },
          { label: 'Fluency & Flow', val: report.fluencyScore, color: 'info' },
          { label: 'Completion Rate', val: completionRate, color: 'secondary' }
        ].map((item, idx) => (
          <div className="col-6 col-md-4 col-lg-2.4" key={idx} style={{ flexBasis: '20%', minWidth: '150px' }}>
            <div className="glass-panel p-3 bg-white text-center h-100 shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
              <span className="text-muted small fw-semibold d-block mb-1 text-truncate">{item.label}</span>
              <strong className={`h4 fw-bold text-${item.color}`}>{item.val}%</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Vocal Analytics Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100">
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <FiVolume2 className="text-primary" /> Vocal Speed & Pacing
            </h3>
            <div className="d-flex align-items-center justify-content-around bg-light p-3 rounded-3 border mb-3">
              <div className="text-center">
                <span className="text-muted small d-block mb-1">Average Speed</span>
                <strong className="fs-4 text-dark">{report.averageWpm} <span className="fs-6 fw-normal text-muted">WPM</span></strong>
              </div>
              <div className="text-center border-start ps-4">
                <span className="text-muted small d-block mb-1">Speaking Pace</span>
                <span className={`badge ${report.speakingPace === 'Optimal' ? 'bg-success' : report.speakingPace === 'Fast' ? 'bg-warning text-dark' : 'bg-info'} fs-6`}>
                  {report.speakingPace}
                </span>
              </div>
            </div>
            <p className="text-muted small mb-0">An optimal speaking pace for technical interviews is between 130 and 150 Words Per Minute.</p>
          </div>
        </div>

        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100">
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <FiMessageSquare className="text-warning" /> Filler Words & Hesitations
            </h3>
            <div className="d-flex align-items-center justify-content-between bg-light p-3 rounded-3 border mb-3">
              <div>
                <span className="text-muted small d-block mb-1">Total Filler Words Detected</span>
                <strong className={`fs-4 ${report.totalFillerWords > 5 ? 'text-danger' : 'text-success'}`}>{report.totalFillerWords}</strong>
              </div>
              <span className="text-muted small" style={{ fontSize: '0.74rem' }}>"um", "uh", "like", "basically", "so"</span>
            </div>
            <p className="text-muted small mb-0">Replacing filler words with 1-second silent pauses projects authority and improves vocal confidence.</p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="row g-4 mb-4">
        {/* Radar Performance Chart */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white h-100 shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5">
              <FiActivity className="text-primary" /> Performance Radar Analysis
            </h3>
            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Candidate" dataKey="A" stroke="var(--primary-purple)" fill="var(--primary-purple)" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bar Question-by-Question Chart */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white h-100 shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5">
              <FiTrendingUp className="text-primary" /> Question Score Analytics
            </h3>
            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <ChartTooltip />
                  <Bar dataKey="Score" fill="var(--primary-purple)" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary Feedback & Learning Roadmap */}
      <div className="row g-4 mb-4">
        {/* Left Column: Feedback, Strengths, Focus Gaps & Recommendations */}
        <div className="col-lg-7 text-start">
          <div className="glass-panel p-4 bg-white h-100 shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
            <div className="mb-4">
              <h3 className="h6 fw-bold text-dark mb-2">Overall Feedback Summary</h3>
              <p className="text-muted small mb-0" style={{ lineHeight: '1.6' }}>
                {report.overallFeedback || `The candidate demonstrated ${report.overallScore >= 70 ? 'strong' : 'developing'} verbal responses across technical topics. Articulation was generally steady with clear communication.`}
              </p>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <h4 className="h6 fw-bold text-success mb-2">Top Strengths</h4>
                <ul className="list-unstyled mb-0">
                  {strengths.map((st, i) => (
                    <li key={i} className="small text-muted mb-2 d-flex align-items-start gap-2">
                      <span className="text-success mt-0.5">&bull;</span>
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="col-md-6">
                <h4 className="h6 fw-bold text-danger mb-2">Focus Gaps</h4>
                <ul className="list-unstyled mb-0">
                  {focusGaps.map((fg, i) => (
                    <li key={i} className="small text-muted mb-2 d-flex align-items-start gap-2">
                      <span className="text-danger mt-0.5">&bull;</span>
                      <span>{fg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="h6 fw-bold text-dark mb-2">Actionable Grading Recommendations</h4>
              <ul className="list-unstyled mb-0">
                {recommendations.map((rec, i) => (
                  <li key={i} className="small text-muted mb-2 d-flex align-items-start gap-2">
                    <span className="text-primary mt-0.5">&bull;</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Learning Roadmap Priorities & Skill Heatmap */}
        <div className="col-lg-5 text-start">
          <div className="glass-panel p-4 bg-white h-100 shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5">
              <FiMap className="text-primary" /> Learning Roadmap Priorities
            </h3>

            <div className="mb-4">
              {learningRoadmap.map((item, i) => (
                <div key={i} className="mb-3 p-2.5 rounded-3 bg-light border">
                  <span className="badge bg-primary text-white fw-bold me-2" style={{ fontSize: '0.68rem' }}>
                    {item.priority || `PRIORITY ${i + 1}`}
                  </span>
                  <strong className="small text-dark d-block mt-1 mb-1">{item.title}</strong>
                  <p className="text-muted mb-0" style={{ fontSize: '0.74rem', lineHeight: '1.4' }}>{item.description}</p>
                </div>
              ))}
            </div>

            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5">
              <FiStar className="text-warning" /> Skill Heatmap Stars
            </h3>

            <div className="d-flex flex-column gap-2">
              {skillHeatmap.map((sk, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center py-1.5 border-bottom">
                  <span className="small text-dark fw-semibold">{sk.skill}</span>
                  <div className="d-flex gap-1 text-warning">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} style={{ opacity: star <= sk.stars ? 1 : 0.25, fontSize: '0.9rem' }}>★</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Question breakdown (Expandable Accordion) */}
      <div className="mb-4">
        <h3 className="fw-bold text-dark h5 mb-3">Detailed Question breakdown</h3>

        <div className="d-flex flex-column gap-3">
          {questions.map((q, idx) => {
            const isCollapsed = !!collapsedMap[idx];
            const qScore = q.score || 0;
            const transcript = q.editedTranscriptText || q.transcriptText || '';

            return (
              <div key={idx} className="glass-panel bg-white border shadow-sm rounded-3 overflow-hidden">
                <div
                  onClick={() => toggleCollapse(idx)}
                  className="p-3 bg-white d-flex align-items-center justify-content-between cursor-pointer border-bottom"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center gap-2.5 text-start me-3">
                    <span className="badge bg-light text-dark border font-monospace fw-bold">Q{idx + 1}</span>
                    <span className="fw-semibold text-dark small mb-0">{q.questionText}</span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${qScore >= 8 ? 'bg-success' : qScore >= 6 ? 'bg-warning text-dark' : 'bg-danger'} text-white fw-bold px-2.5 py-1`}>
                      Score: {qScore}/10
                    </span>
                    <button className="btn btn-sm btn-light p-1 border rounded-circle text-muted">
                      {isCollapsed ? <FiChevronDown /> : <FiChevronUp />}
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-4 text-start bg-light bg-opacity-25">
                    {/* Spoken Transcript Box */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small fw-bold">Candidate Spoken Transcript</span>
                        <div className="d-flex gap-2">
                          <span className="badge bg-secondary bg-opacity-10 text-secondary">{q.wordCount || 0} words</span>
                          <span className="badge bg-info bg-opacity-10 text-info">{q.speakingSpeedWpm || 0} WPM</span>
                          <span className="badge bg-warning bg-opacity-10 text-dark">{q.fillerWordsCount || 0} Fillers</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white border rounded-3 text-secondary small" style={{ lineHeight: '1.6' }}>
                        {transcript ? `"${transcript}"` : <span className="text-muted italic">No verbal answer detected for this question.</span>}
                      </div>
                    </div>

                    {/* AI Feedback */}
                    <div className="mb-3 p-3 bg-info bg-opacity-10 border border-info border-opacity-25 rounded-3">
                      <span className="fw-bold text-info small d-block mb-1">AI Evaluation Feedback:</span>
                      <p className="text-dark small mb-0">{q.feedback || 'Answer evaluated based on verbal accuracy and technical completeness.'}</p>
                    </div>

                    {/* Ideal Verbal Answer */}
                    {q.idealAnswer && (
                      <div className="p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 mb-2">
                        <span className="fw-bold text-success small d-block mb-1">Ideal Model Answer:</span>
                        <p className="text-dark small mb-0" style={{ lineHeight: '1.5' }}>{q.idealAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VoiceReportView;
