import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiCamera, FiClock, FiCheckCircle, FiAlertCircle, FiArrowLeft,
  FiPlay, FiAward, FiEye, FiDownload, FiInfo, FiActivity, FiUser
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const VideoReportView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);

  const videoPlayerRef = useRef(null);

  useEffect(() => {
    fetchReportDetails();
  }, [id]);

  const fetchReportDetails = async () => {
    try {
      const response = await axiosInstance.get(`/video/report/${id}`);
      if (response.data && response.data.success) {
        setSession(response.data.session);
      }
    } catch (err) {
      console.error('Error fetching report details:', err);
      toast.error('Failed to load video interview report details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimelineClick = (timestamp) => {
    if (videoPlayerRef.current) {
      const parts = timestamp.split(':');
      const seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      videoPlayerRef.current.currentTime = seconds;
      videoPlayerRef.current.play();
      toast.info(`Scrubbing video to ${timestamp}`);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading report...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-5 text-center">
        <FiAlertCircle className="text-danger display-4 mb-3" />
        <h3 className="fw-bold">Report Not Found</h3>
        <p className="text-muted">The requested interview evaluation report could not be found or has been deleted.</p>
        <Link to="/mock-interviews" className="btn btn-primary-purple mt-3">Back to Mock History</Link>
      </div>
    );
  }

  // Build static video playback URL
  const videoUrl = session.videoUrl 
    ? `${axiosInstance.defaults.baseURL.replace('/api', '')}${session.videoUrl}`
    : '';

  const transcript = session.transcript || [];
  const currentQ = transcript[selectedQuestionIdx] || {};

  return (
    <div className="container py-4 text-start">
      {/* Header and Go Back */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <Link to="/mock-interviews" className="btn btn-sm btn-light border">
            <FiArrowLeft /> Back
          </Link>
          <h2 className="fw-bold text-dark mb-0 ms-2">Video Evaluation Report</h2>
        </div>
        <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-1.5" style={{ fontSize: '0.86rem' }}>
          Graded on {new Date(session.completedAt || session.updatedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Top Level Averages Cards Grid */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Overall Score</span>
            <strong className="display-6 fw-bold text-primary" style={{ color: 'var(--primary-purple)' }}>
              {session.overallScore}%
            </strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Answer Quality</span>
            <strong className="display-6 fw-bold text-success">
              {session.overallAnswerQualityScore || session.overallScore}%
            </strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Video Delivery</span>
            <strong className="display-6 fw-bold text-info">
              {session.videoDeliveryScore || session.communicationScore}%
            </strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Proctoring Integrity</span>
            <strong className="display-6 fw-bold text-danger">
              {session.proctoringScore ?? 100}%
            </strong>
          </div>
        </div>
      </div>

      {/* VIDEO & PROCTORING ANALYSIS Panel */}
      <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
        <h3 className="h6 fw-bold text-dark mb-4 border-bottom pb-2">📹 VIDEO & PROCTORING ANALYSIS</h3>
        
        {session.videoMetrics ? (
          <div className="row g-4">
            {/* Key Metrics column */}
            <div className="col-md-4 border-end">
              <strong className="d-block small text-muted text-uppercase mb-3">Key Metrics</strong>
              <div className="d-flex flex-column gap-2.5">
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Eye Contact</span>
                  <strong className="text-info">{session.videoMetrics.eyeContactPercentage}%</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Camera Alignment</span>
                  <strong className="text-success">{session.videoMetrics.centerFacingPercentage}%</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Face Presence</span>
                  <strong className="text-dark">{session.videoMetrics.facePresencePercentage}%</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Looking Away</span>
                  <strong className="text-danger">{session.videoMetrics.lookingAwayPercentage}%</strong>
                </div>
              </div>
            </div>

            {/* Expression Distribution column */}
            <div className="col-md-4 border-end">
              <strong className="d-block small text-muted text-uppercase mb-3">Visible Expression Distribution</strong>
              <div className="d-flex flex-column gap-2.5">
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Neutral</span>
                  <strong className="text-dark">{session.videoMetrics.expressionDistribution?.neutral ?? 0}%</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Smile Signal</span>
                  <strong className="text-success">{session.videoMetrics.expressionDistribution?.smile ?? 0}%</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Frown Signal</span>
                  <strong className="text-danger">{session.videoMetrics.expressionDistribution?.frown ?? 0}%</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Surprise Signal</span>
                  <strong className="text-warning">{session.videoMetrics.expressionDistribution?.surprise ?? 0}%</strong>
                </div>
              </div>
            </div>

            {/* Proctoring Summary column */}
            <div className="col-md-4">
              <strong className="d-block small text-muted text-uppercase mb-3">Proctoring Events Summary</strong>
              <div className="d-flex flex-column gap-2.5">
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">No Face Events</span>
                  <strong className="text-danger">
                    {session.videoMetrics.noFaceEvents || 0} event(s) 
                    {session.videoMetrics.proctoringEvents ? ` / ${((session.videoMetrics.proctoringEvents.filter(e => e.type === 'NO_FACE').reduce((acc, e) => acc + e.durationMs, 0)) / 1000).toFixed(1)} sec` : ''}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Looking Away Events</span>
                  <strong className="text-danger">
                    {session.videoMetrics.lookingAwayEvents || 0} event(s)
                    {session.videoMetrics.proctoringEvents ? ` / ${((session.videoMetrics.proctoringEvents.filter(e => e.type === 'LOOKING_AWAY').reduce((acc, e) => acc + e.durationMs, 0)) / 1000).toFixed(1)} sec` : ''}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Multiple Face Events</span>
                  <strong className="text-danger">
                    {session.videoMetrics.multipleFaceEvents || 0} event(s)
                    {session.videoMetrics.proctoringEvents ? ` / ${((session.videoMetrics.proctoringEvents.filter(e => e.type === 'MULTIPLE_FACES').reduce((acc, e) => acc + e.durationMs, 0)) / 1000).toFixed(1)} sec` : ''}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Tab Hidden Events</span>
                  <strong className="text-danger">
                    {session.videoMetrics.tabVisibilityChanges || 0} event(s)
                    {session.videoMetrics.proctoringEvents ? ` / ${((session.videoMetrics.proctoringEvents.filter(e => e.type === 'TAB_HIDDEN').reduce((acc, e) => acc + e.durationMs, 0)) / 1000).toFixed(1)} sec` : ''}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted small py-3">
            Video & proctoring analysis metrics are Not available for this session.
          </div>
        )}
      </div>

      <div className="row g-4 mb-4">
        {/* Left Column: Replay Monitor & Scrubbing Timeline */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              🎥 Interview Video Recording Replay
            </h3>
            {videoUrl ? (
              <div className="bg-dark rounded-3 overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video 
                  ref={videoPlayerRef} 
                  src={videoUrl} 
                  controls 
                  className="w-100 h-100 object-fit-contain"
                />
              </div>
            ) : (
              <div className="bg-light rounded-3 p-5 text-center text-muted small border">
                No recorded video file was captured during this session.
              </div>
            )}
          </div>

          {/* Timeline scrubbing Event List */}
          <div className="glass-panel p-4 bg-white border shadow-sm h-100">
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              ⏱ Behavioral Events Timeline (Click to scrub)
            </h3>
            <p className="text-muted small mb-4">
              AI scanned the video recording frame-by-frame. Click any marker to jump directly to that timestamp.
            </p>

            <div className="d-flex flex-column gap-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {session.timeline && session.timeline.length > 0 ? (
                session.timeline.map((event, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleTimelineClick(event.timestamp)}
                    className="border rounded-3 p-2.5 bg-light bg-opacity-25 d-flex align-items-center justify-content-between cursor-pointer hover-bg-light transition-all"
                    style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-danger bg-opacity-10 text-danger fw-bold">
                        {event.timestamp}
                      </span>
                      <span className="text-dark fw-semibold ms-1">{event.description}</span>
                    </div>
                    <span className="text-muted small text-uppercase" style={{ fontSize: '0.66rem' }}>
                      {event.eventType}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-muted small">
                  Timeline analyzer successfully finished with zero behavioral anomalies detected.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Technical review details & question score mapping */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h3 className="h6 fw-bold text-dark mb-0">Question Breakdown</h3>
                <span className="text-muted small">Select a question card below</span>
              </div>

              {/* Question list selector pills */}
              <div className="d-flex gap-2 flex-wrap mb-4">
                {transcript.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedQuestionIdx(idx)}
                    className={`btn btn-sm py-1.5 px-3 rounded-3 border fw-semibold ${
                      selectedQuestionIdx === idx 
                        ? 'btn-primary-purple text-white' 
                        : 'btn-light text-dark'
                    }`}
                  >
                    Q{item.questionNumber} ({item.score}%)
                  </button>
                ))}
              </div>

              {/* Individual Question assessment block */}
              {currentQ.questionText && (
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 border rounded-3 bg-light bg-opacity-50">
                    <strong className="d-block small text-muted text-uppercase mb-1">Question</strong>
                    <span className="text-dark fw-bold">{currentQ.questionText}</span>
                  </div>

                  <div className="p-3 border rounded-3 bg-light bg-opacity-50">
                    <strong className="d-block small text-muted text-uppercase mb-1">Your verbal answer</strong>
                    <p className="text-dark small mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {currentQ.transcriptText || 'No answer recorded.'}
                    </p>
                  </div>

                  {/* Visual separation of Answer Quality vs Video/Delivery metrics */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-success bg-opacity-10 h-100">
                        <strong className="d-block small text-success text-uppercase mb-2">🧠 Answer Quality ({currentQ.answer?.answerScore || currentQ.score}%)</strong>
                        <div className="d-flex flex-column gap-2 text-dark small" style={{ fontSize: '0.78rem' }}>
                          <div><strong>Technical Accuracy:</strong> {currentQ.answer?.technicalAccuracy ?? (currentQ.score)}%</div>
                          <div><strong>Expected Concepts:</strong> {currentQ.answer?.expectedConcepts?.join(', ') || 'N/A'}</div>
                          {currentQ.answer?.missingConcepts?.length > 0 && (
                            <div className="text-danger"><strong>Missing:</strong> {currentQ.answer.missingConcepts.join(', ')}</div>
                          )}
                          <div><strong>Strengths:</strong> {currentQ.answer?.strengths?.join('; ') || 'None'}</div>
                          {currentQ.answer?.weaknesses?.length > 0 && (
                            <div className="text-warning"><strong>Gaps:</strong> {currentQ.answer.weaknesses.join('; ')}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-info bg-opacity-10 h-100">
                        <strong className="d-block small text-info text-uppercase mb-2">📊 Video Behavior ({currentQ.video?.videoDeliveryScore || session.communicationScore}%)</strong>
                        <div className="d-flex flex-column gap-2 text-dark small" style={{ fontSize: '0.78rem' }}>
                          <div><strong>Eye Contact:</strong> {currentQ.video?.eyeContactPercentage ?? session.eyeContactScore}%</div>
                          <div><strong>Alignment:</strong> {currentQ.video?.cameraAlignmentPercentage ?? 80}%</div>
                          <div><strong>Pace:</strong> {currentQ.video?.speakingRate ?? (session.speakingSpeed || 120)} WPM</div>
                          <div><strong>Fillers:</strong> {currentQ.video?.fillerWordCount ?? 0} counts</div>
                          <div><strong>Proctoring Score:</strong> <span className={currentQ.proctoring?.proctoringScore < 80 ? "text-danger fw-bold" : "text-dark"}>{currentQ.proctoring?.proctoringScore ?? 100}%</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border rounded-3 bg-light bg-opacity-50">
                    <strong className="d-block small text-muted text-uppercase mb-1 text-primary">Interviewer evaluation</strong>
                    <p className="text-dark small mb-0" style={{ lineHeight: '1.4' }}>
                      {currentQ.feedback || 'Solid conceptual explanation.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Speaking speed telemetry */}
            <div className="row g-2 mt-4 pt-3 border-top" style={{ fontSize: '0.8rem' }}>
              <div className="col-4 text-center border-end">
                <span className="text-muted d-block small">Speaking Pace</span>
                <strong className="text-dark">{session.speakingSpeed || 120} WPM</strong>
              </div>
              <div className="col-4 text-center border-end">
                <span className="text-muted d-block small">Filler Words</span>
                <strong className="text-danger">{session.fillerWords || 0} Count</strong>
              </div>
              <div className="col-4 text-center">
                <span className="text-muted d-block small">Posture Status</span>
                <strong className="text-success">{session.bodyLanguage?.posture || 'Good'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Behavioral Coach & Actions Section */}
      <div className="row g-4 mb-4">
        {/* Left Column: Strengths & Gaps */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100">
            <h3 className="h6 fw-bold text-dark mb-4 border-bottom pb-2">Behavioral Strengths & Focus Gaps</h3>
            
            <div className="mb-4">
              <strong className="d-block text-success small mb-2 text-uppercase">⚡ Key Strengths</strong>
              <ul className="text-muted small ps-3 mb-0 d-flex flex-column gap-1.5">
                {session.report?.strengths?.map((str, idx) => (
                  <li key={idx}>{str}</li>
                )) || <li className="list-unstyled text-center">Awaiting list.</li>}
              </ul>
            </div>

            <div>
              <strong className="d-block text-danger small mb-2 text-uppercase">⚠️ Areas to Refine</strong>
              <ul className="text-muted small ps-3 mb-0 d-flex flex-column gap-1.5">
                {session.report?.focusGaps?.map((gap, idx) => (
                  <li key={idx}>{gap}</li>
                )) || <li className="list-unstyled text-center">Awaiting list.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Priorities Roadmap */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100">
            <h3 className="h6 fw-bold text-dark mb-4 border-bottom pb-2">Actionable Study Priorities</h3>
            
            <div className="d-flex flex-column gap-3">
              {session.report?.learningRoadmap?.map((roadmap, idx) => (
                <div key={idx} className="border rounded-3 p-3 bg-light bg-opacity-25">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className="text-dark small">{roadmap.title}</strong>
                    <span className="badge bg-primary bg-opacity-10 text-primary text-uppercase" style={{ fontSize: '0.68rem', backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
                      {roadmap.priority}
                    </span>
                  </div>
                  <p className="text-muted small mb-0" style={{ fontSize: '0.74rem', lineHeight: '1.3' }}>
                    {roadmap.description}
                  </p>
                </div>
              )) || <div className="py-4 text-center text-muted small">Complete evaluations to compile roadmap cards.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoReportView;
