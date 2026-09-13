import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiAward, FiCheckCircle, FiXCircle, FiClock, FiCode, FiCpu,
  FiArrowLeft, FiRefreshCw, FiCheck, FiAlertTriangle, FiBookOpen,
  FiZap, FiDownload, FiTerminal
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import CodeEditor from '../components/CodeEditor';

const CodingReportView = () => {
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
      const response = await axiosInstance.get(`/coding/report/${id}`);
      if (response.data && response.data.success) {
        setSession(response.data.session);
      }
    } catch (err) {
      console.error('Error fetching coding report:', err);
      toast.error('Failed to load coding evaluation report.');
      navigate('/mock-interviews');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading coding assessment report...</span>
        </div>
      </div>
    );
  }

  const problem = session?.problems?.[0] || {};
  const aiReview = problem.aiReview || {};
  const executionResults = problem.executionResults || [];

  const overallScore = session?.overallScore !== null && session?.overallScore !== undefined ? session.overallScore : (aiReview.overallScore || 0);
  const verdict = aiReview.interviewerVerdict || (overallScore >= 80 ? 'Strong Hire' : overallScore >= 60 ? 'Hire' : overallScore >= 40 ? 'Leaning Hire' : 'No Hire');

  const verdictBadgeColor = 
    verdict === 'Strong Hire' ? 'bg-success' :
    verdict === 'Hire' ? 'bg-primary' :
    verdict === 'Leaning Hire' ? 'bg-warning text-dark' : 'bg-danger';

  return (
    <div className="container py-4 text-start">
      {/* Header Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/mock-interviews" className="btn btn-sm btn-outline-secondary rounded-circle p-1.5" title="Back to Mock Interviews">
              <FiArrowLeft size={14} />
            </Link>
            <h2 className="fw-bold text-dark mb-0 fs-4">Coding Assessment Report</h2>
            <span className={`badge ${verdictBadgeColor} fw-bold px-3 py-1.5 ms-2`}>
              Verdict: {verdict}
            </span>
          </div>
          <p className="text-muted small mb-0 ms-4 ps-2">
            {session?.title} • Evaluated by Gemini AI on {session?.completedAt ? new Date(session.completedAt).toLocaleDateString() : 'Today'}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link to="/coding-interview/create" className="btn btn-sm btn-primary-purple text-white px-3 py-2 rounded-pill shadow-sm d-flex align-items-center gap-1.5">
            <FiRefreshCw /> Retake / New Challenge
          </Link>
          <button onClick={() => window.print()} className="btn btn-sm btn-outline-secondary px-3 py-2 rounded-pill d-flex align-items-center gap-1.5">
            <FiDownload /> Print Report
          </button>
        </div>
      </div>

      {/* Top 4 Metric KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Overall Score */}
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3.5 bg-white border shadow-sm text-center h-100 rounded-3">
            <span className="text-muted small d-block mb-1 fw-semibold">Overall Score</span>
            <div className={`fs-2 fw-bold ${overallScore >= 80 ? 'text-success' : overallScore >= 50 ? 'text-primary' : 'text-danger'}`}>
              {overallScore}%
            </div>
            <span className="badge bg-light text-muted small">{problem.testCasesPassed || 0}/{problem.totalTestCases || 0} Tests Passed</span>
          </div>
        </div>

        {/* Correctness Score */}
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3.5 bg-white border shadow-sm text-center h-100 rounded-3">
            <span className="text-muted small d-block mb-1 fw-semibold">Correctness</span>
            <div className="fs-2 fw-bold text-info">
              {aiReview.correctnessScore || overallScore}%
            </div>
            <span className="badge bg-light text-muted small">Algorithmic Accuracy</span>
          </div>
        </div>

        {/* Code Quality */}
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3.5 bg-white border shadow-sm text-center h-100 rounded-3">
            <span className="text-muted small d-block mb-1 fw-semibold">Code Quality</span>
            <div className="fs-2 fw-bold text-success">
              {aiReview.codeQualityScore || 80}%
            </div>
            <span className="badge bg-light text-muted small">Clean Code Practices</span>
          </div>
        </div>

        {/* Efficiency & Complexity */}
        <div className="col-md-3 col-6">
          <div className="glass-panel p-3.5 bg-white border shadow-sm text-center h-100 rounded-3">
            <span className="text-muted small d-block mb-1 fw-semibold">Complexity Grade</span>
            <div className="fs-3 fw-bold text-purple font-monospace mt-1">
              {aiReview.timeComplexity || 'O(N)'}
            </div>
            <span className="badge bg-light text-muted small">Space: {aiReview.spaceComplexity || 'O(1)'}</span>
          </div>
        </div>
      </div>

      {/* Main Report Body Grid */}
      <div className="row g-4">
        
        {/* Left Column: AI Review, Complexity, & Test Matrix */}
        <div className="col-lg-7 d-flex flex-column gap-4">
          
          {/* Detailed Gemini AI Review Card */}
          <div className="glass-panel p-4 bg-white border shadow-sm rounded-3">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              🤖 Gemini AI Code Review & Feedback
            </h5>

            <div className="p-3 bg-light rounded-3 border mb-3" style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
              <p className="mb-0 text-dark">
                {aiReview.detailedFeedback || 'The candidate successfully implemented the solution with sound algorithmic logic and clean syntax.'}
              </p>
            </div>

            {/* Time & Space Complexity Comparison Matrix */}
            <div className="row g-3 mb-3">
              <div className="col-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block mb-1">Time Complexity</span>
                  <div className="d-flex align-items-center justify-content-between font-monospace">
                    <span>Your Code: <strong className="text-primary">{aiReview.timeComplexity || 'O(N)'}</strong></span>
                    <span className="text-success small">Optimal: {aiReview.timeComplexityOptimal || 'O(N)'}</span>
                  </div>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block mb-1">Space Complexity</span>
                  <div className="d-flex align-items-center justify-content-between font-monospace">
                    <span>Your Code: <strong className="text-primary">{aiReview.spaceComplexity || 'O(1)'}</strong></span>
                    <span className="text-success small">Optimal: {aiReview.spaceComplexityOptimal || 'O(1)'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Code Practices */}
            {aiReview.cleanCodePractices && aiReview.cleanCodePractices.length > 0 && (
              <div className="mb-3">
                <strong className="d-block small text-dark mb-2">✨ Clean Code Practices Followed:</strong>
                <div className="d-flex flex-wrap gap-1.5">
                  {aiReview.cleanCodePractices.map((prac, idx) => (
                    <span key={idx} className="badge bg-success bg-opacity-10 text-success fw-normal px-2.5 py-1.5 border border-success border-opacity-25" style={{ fontSize: '0.78rem' }}>
                      <FiCheck className="me-1" /> {prac}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Areas for Improvement */}
            <div className="row g-3">
              <div className="col-md-6">
                <strong className="d-block small text-success mb-2">💪 Key Strengths:</strong>
                <ul className="small text-muted ps-3 mb-0" style={{ fontSize: '0.82rem' }}>
                  {(aiReview.strengths || ['Optimal algorithmic approach', 'Readable variable names']).map((s, idx) => (
                    <li key={idx} className="mb-1">{s}</li>
                  ))}
                </ul>
              </div>

              <div className="col-md-6">
                <strong className="d-block small text-warning text-dark mb-2">💡 Optimization Opportunities:</strong>
                <ul className="small text-muted ps-3 mb-0" style={{ fontSize: '0.82rem' }}>
                  {(aiReview.areasForImprovement || ['Consider edge cases with boundary limits', 'Refactor auxiliary data structures']).map((a, idx) => (
                    <li key={idx} className="mb-1">{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggested Optimizations */}
            {aiReview.suggestedOptimizations && (
              <div className="mt-3 pt-3 border-top small text-muted">
                <strong>Optimization Note:</strong> {aiReview.suggestedOptimizations}
              </div>
            )}
          </div>

          {/* Test Case Execution Matrix */}
          <div className="glass-panel p-4 bg-white border shadow-sm rounded-3">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center justify-content-between">
              <span><FiTerminal className="me-1 text-primary" /> Test Case Execution Matrix</span>
              <span className="badge bg-light text-dark font-monospace small">
                {problem.testCasesPassed || 0}/{problem.totalTestCases || 0} Passed
              </span>
            </h5>

            <div className="d-flex flex-column gap-2">
              {executionResults.map((tc, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-3 border font-monospace ${tc.passed ? 'bg-success bg-opacity-10 border-success' : 'bg-danger bg-opacity-10 border-danger'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className={tc.passed ? 'text-success' : 'text-danger'}>
                      {tc.passed ? '✅ Test Case ' + (tc.testCaseIndex || idx + 1) + ' Passed' : '❌ Test Case ' + (tc.testCaseIndex || idx + 1) + ' Failed'}
                    </strong>
                    <span className="badge bg-dark bg-opacity-70 text-white" style={{ fontSize: '0.7rem' }}>
                      ⏱️ {tc.executionTimeMs} ms
                    </span>
                  </div>

                  <div className="text-muted">Input: <span className="text-dark">{tc.input}</span></div>
                  <div className="text-muted">Expected: <span className="text-success">{tc.expectedOutput}</span></div>
                  <div className="text-muted">Actual: <span className={tc.passed ? 'text-success' : 'text-danger fw-bold'}>{tc.actualOutput}</span></div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Candidate's Submitted Code & Optimal Solution */}
        <div className="col-lg-5 d-flex flex-column gap-4">
          
          {/* Submitted Code Card */}
          <div className="glass-panel p-4 bg-white border shadow-sm rounded-3">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <FiCode className="text-primary" /> Your Submitted Code
            </h5>
            <CodeEditor
              code={problem.userCode || '// No code submitted'}
              language={problem.selectedLanguage || 'javascript'}
              readOnly={true}
              height="340px"
              style={{ borderRadius: '12px' }}
            />
          </div>

          {/* Optimal Solution Reference Card */}
          {aiReview.optimalSolutionCode && (
            <div className="glass-panel p-4 bg-white border shadow-sm rounded-3">
              <h5 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                <FiZap className="text-warning" /> Optimal Reference Solution
              </h5>
              <p className="text-muted small mb-3">Compare your approach with the optimal time & space complexity implementation.</p>
              <CodeEditor
                code={aiReview.optimalSolutionCode}
                language={problem.selectedLanguage || 'javascript'}
                readOnly={true}
                height="320px"
                style={{ borderRadius: '12px' }}
              />
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default CodingReportView;
