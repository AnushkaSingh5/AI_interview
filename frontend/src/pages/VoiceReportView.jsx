import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiMic, FiAward, FiActivity, FiCheckCircle, FiAlertTriangle,
  FiArrowLeft, FiClock, FiFileText, FiVolume2, FiTrendingUp, FiMessageSquare
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const VoiceReportView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchVoiceReport();
  }, [id]);

  const fetchVoiceReport = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/voice/report/${id}`);
      if (response.data && response.data.success) {
        setReport(response.data.report);
      }
    } catch (err) {
      console.error('Error fetching voice report:', err);
      toast.error('Failed to load voice communication report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-4 text-start">
        <div className="skeleton-pulse mb-3" style={{ width: '220px', height: '32px' }} />
        <div className="row g-4 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div className="col-md-3 col-6" key={i}>
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

  return (
    <div className="container py-4 text-start">
      <Link to="/mock-interviews" className="text-muted small text-decoration-none d-flex align-items-center gap-1 mb-3">
        <FiArrowLeft /> Back to Mock Interviews
      </Link>

      {/* Header Banner */}
      <div className="glass-panel p-4 bg-white border shadow-sm rounded-4 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <span className="badge bg-purple bg-opacity-10 text-primary fw-bold mb-2" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
              🎙️ AI Voice & Communication Report
            </span>
            <h2 className="fw-bold text-dark mb-1">{report.sessionTitle}</h2>
            <p className="text-muted small mb-0">Role: <strong>{report.role}</strong> | Difficulty: <strong>{report.difficulty}</strong> | Date: <strong>{new Date(report.createdAt).toLocaleDateString()}</strong></p>
          </div>

          <div className="text-center bg-light p-3 rounded-3 border" style={{ minWidth: '130px' }}>
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Overall Score</span>
            <strong className="display-6 fw-bold text-primary">{report.overallScore}%</strong>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Technical Content</span>
            <strong className="fs-3 fw-bold text-dark">{report.technicalScore}%</strong>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Communication</span>
            <strong className="fs-3 fw-bold text-success">{report.communicationScore}%</strong>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Vocal Confidence</span>
            <strong className="fs-3 fw-bold text-primary">{report.confidenceScore}%</strong>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Fluency & Flow</span>
            <strong className="fs-3 fw-bold text-info">{report.fluencyScore}%</strong>
          </div>
        </div>
      </div>

      {/* Vocal Analytics Dashboard Row */}
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
            <p className="text-muted small mb-0">An optimal speaking pace for professional technical interviews is between 130 and 150 Words Per Minute.</p>
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
            <p className="text-muted small mb-0">Replacing filler words with deliberate 1-second pauses projects authority and improves vocal confidence.</p>
          </div>
        </div>
      </div>

      {/* AI Improvement Suggestions */}
      <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
        <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
          <FiTrendingUp className="text-success" /> AI Vocal Improvement Recommendations
        </h3>
        <ul className="text-muted small mb-0 ps-3">
          {report.improvementSuggestions?.map((sug, i) => (
            <li key={i} className="mb-2">{sug}</li>
          ))}
        </ul>
      </div>

      {/* Question Transcripts Breakdown */}
      <h3 className="h6 fw-bold text-dark mb-3">Spoken Question Transcripts & AI Feedback</h3>
      <div className="d-flex flex-column gap-3">
        {report.questions?.map((q, idx) => (
          <div key={idx} className="glass-panel p-4 bg-white border shadow-sm rounded-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">Question {q.questionNumber}</span>
              <span className="badge bg-success bg-opacity-10 text-success">Score: {q.score}/10</span>
            </div>
            <h4 className="h6 fw-bold text-dark mb-2">{q.questionText}</h4>

            <div className="bg-light p-3 rounded-3 border mb-3">
              <span className="text-muted small fw-semibold d-block mb-1">Spoken Transcript ({q.wordCount} words | {q.speakingSpeedWpm} WPM | {q.fillerWordsCount} Fillers):</span>
              <p className="text-dark small mb-0" style={{ lineHeight: '1.5' }}>"{q.editedTranscriptText || q.transcriptText || 'No transcript recorded.'}"</p>
            </div>

            <div className="alert alert-info border-0 bg-opacity-50 small mb-0">
              <strong>AI Feedback:</strong> {q.feedback}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceReportView;
