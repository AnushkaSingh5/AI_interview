import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, FiDownload, FiCheckCircle, FiAlertTriangle, FiBookOpen, 
  FiMap, FiTrendingUp, FiActivity, FiStar, FiChevronDown, FiChevronUp, FiSettings
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ChartTooltip, Legend as ChartLegend 
} from 'recharts';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const InterviewReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  // Collapsed states for individual questions details
  const [collapsedMap, setCollapsedMap] = useState({});

  // Rotating loader messages
  const [loaderMessageIdx, setLoaderMessageIdx] = useState(0);
  const loaderMessages = [
    'Analyzing Your Interview answers...',
    'Evaluating Technical Knowledge depth...',
    'Checking Communication skills and syntax...',
    'Identifying missing key concepts...',
    'Generating suggestions & learning roadmap...',
    'Compiling final performance report card...'
  ];

  useEffect(() => {
    fetchReportContext();
  }, [id]);

  useEffect(() => {
    let interval;
    if (evaluating) {
      interval = setInterval(() => {
        setLoaderMessageIdx(prev => (prev + 1) % loaderMessages.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [evaluating]);

  const [pollTrigger, setPollTrigger] = useState(0);
  const [serverError, setServerError] = useState(false);

  // Polling effect for background evaluations (polls status endpoint only)
  useEffect(() => {
    let timer;
    let isMounted = true;

    if (evaluating && !reportData) {
      timer = setTimeout(async () => {
        try {
          const response = await axiosInstance.get(`/interviews/${id}/status`);
          if (!isMounted) return;
          setServerError(false);

          if (response.data && response.data.success) {
            const currentStatus = response.data.status;
            if (currentStatus === 'Completed' || currentStatus === 'ReportReady') {
              // Evaluation complete, fetch the full report card once
              const reportRes = await axiosInstance.get(`/interviews/${id}/report`);
              if (isMounted && reportRes.data && reportRes.data.success) {
                setReportData(reportRes.data);
                setEvaluating(false);
                toast.success('AI Evaluation completed successfully!');
              }
            } else {
              // Still processing, poll again
              setPollTrigger(prev => prev + 1);
            }
          }
        } catch (err) {
          if (!isMounted) return;
          console.error('Error polling evaluation status:', err);
          setServerError(true);
          // Wait 5 seconds before retrying on connection failure to avoid flooding
          timer = setTimeout(() => {
            if (isMounted) setPollTrigger(prev => prev + 1);
          }, 5000);
        }
      }, 3000);
    }
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [evaluating, reportData, id, pollTrigger]);

  const fetchReportContext = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/interviews/${id}/status`);
      if (response.data && response.data.success) {
        const currentStatus = response.data.status;
        if (currentStatus === 'Completed' || currentStatus === 'ReportReady') {
          const reportRes = await axiosInstance.get(`/interviews/${id}/report`);
          if (reportRes.data && reportRes.data.success) {
            setReportData(reportRes.data);
            setEvaluating(false);
          }
        } else {
          setEvaluating(true);
          await triggerAIEvaluation();
        }
      }
    } catch (err) {
      toast.error('Failed to load interview report details.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const triggerAIEvaluation = async () => {
    setEvaluating(true);
    setLoaderMessageIdx(0);
    try {
      await axiosInstance.post(`/interviews/${id}/evaluate`);
    } catch (err) {
      console.warn('Queue evaluation trigger warning:', err.response?.data?.message || err.message);
    }
  };

  const toggleCollapse = (qId) => {
    setCollapsedMap(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const handleDownloadPdf = () => {
    if (!reportData?.session?.interviewId) return;
    const token = localStorage.getItem('token');
    
    // Open print page in a new window containing JWT auth token
    const pdfUrl = `${axiosInstance.defaults.baseURL}/interviews/${reportData.session.interviewId}/report/pdf?token=${token}`;
    window.open(pdfUrl, '_blank');
  };

  if (loading || evaluating) {
    return (
      <div className="d-flex justify-content-center align-items-center text-start" style={{ minHeight: '60vh' }}>
        <div className="glass-panel p-5 bg-white shadow-sm text-center" style={{ maxWidth: '500px', border: '1px solid var(--border-grey)' }}>
          
          {serverError && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
              <FiAlertTriangle className="fs-5 text-danger flex-shrink-0" />
              <div className="small text-start">
                <strong>Server temporarily unavailable:</strong> We are having trouble connecting to the interview engine. Attempting to reconnect...
              </div>
            </div>
          )}

          <div className="mb-4">
            <FiSettings className="text-primary display-4 spin" style={{ color: 'var(--primary-purple)', animationDuration: '3s' }} />
          </div>
          <h3 className="h5 fw-bold text-dark mb-2">Compiling AI Evaluation...</h3>
          <p className="text-muted small mb-4">Gemini AI is currently analyzing your answers individually. This may take up to a minute depending on question counts.</p>
          
          <div className="progress mb-3" style={{ height: '8px', borderRadius: '4px' }}>
            <motion.div 
              className="progress-bar progress-bar-striped progress-bar-animated"
              role="progressbar" 
              style={{ width: '100%', backgroundColor: 'var(--primary-purple)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.p 
              key={loaderMessageIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="text-primary small fw-semibold mb-0"
              style={{ color: 'var(--primary-purple)' }}
            >
              {loaderMessages[loaderMessageIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="container py-5 text-center">
        <div className="glass-panel p-5 bg-white mx-auto shadow-sm" style={{ maxWidth: '480px', border: '1px solid var(--border-grey)' }}>
          <h3 className="h5 fw-bold text-danger mb-3">Report Not Found</h3>
          <p className="text-muted small mb-4">We could not retrieve the report cards for this session.</p>
          <Link to="/dashboard" className="btn btn-primary-purple px-4 py-2 text-decoration-none text-white">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { session: sess, evaluation: ev, questionEvaluations: qEvals, questions, answers } = reportData;

  // Formatting chart data
  const radarData = [
    { subject: 'Technical', A: ev.technicalScore, fullMark: 100 },
    { subject: 'HR/Behavioral', A: ev.hrScore, fullMark: 100 },
    { subject: 'Communication', A: ev.communicationScore, fullMark: 100 },
    { subject: 'Confidence', A: ev.confidenceScore, fullMark: 100 }
  ];

  const barData = questions.map((q) => {
    const matchedEval = qEvals.find(e => e.questionId === q._id);
    return {
      name: `Q${q.questionNumber}`,
      Score: (matchedEval?.score || 0) * 10
    };
  });

  // Calculate stats
  const totalQuestions = questions.length;
  const answeredCount = answers.filter(a => !a.skipped && a.answer?.trim().length > 0).length;
  const skippedCount = totalQuestions - answeredCount;
  const completionRate = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="container py-4 text-start">
      
      {/* Top Navigation */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link to="/dashboard" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1">
          <FiArrowLeft /> Back to Dashboard
        </Link>
        <button 
          onClick={handleDownloadPdf}
          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5 border border-primary-subtle text-primary bg-transparent"
        >
          <FiDownload /> Export PDF Report
        </button>
      </div>

      {/* Report Summary Header Card */}
      <div className="glass-panel p-4 bg-white mb-4 shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
        <div className="row align-items-center g-3">
          <div className="col-md-8">
            <span className="badge bg-success text-success bg-opacity-10 fw-bold mb-2">Mock Interview Completed</span>
            <h1 className="fw-bold text-dark h3 mb-1">{sess.title}</h1>
            <p className="text-muted small mb-0">Role: <strong>{sess.role}</strong> &bull; Experience: <strong>{sess.experienceLevel}</strong> &bull; Company: <strong>{sess.company || 'General Tech Company'}</strong></p>
          </div>
          <div className="col-md-4 text-center text-md-end border-start-md">
            <div className="d-inline-block text-center bg-light bg-opacity-50 p-3 rounded-3 border">
              <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Overall Score</span>
              <strong className="display-5 fw-bold text-primary mb-0" style={{ color: 'var(--primary-purple)' }}>{ev.overallScore}%</strong>
              <span className="badge bg-success text-success bg-opacity-10 d-block mt-1.5 fw-bold text-uppercase" style={{ fontSize: '0.64rem' }}>
                {ev.overallScore >= 80 ? 'Excellent' : ev.overallScore >= 70 ? 'Very Good' : ev.overallScore >= 60 ? 'Satisfactory' : 'Needs Practice'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* score summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Technical Core', val: ev.technicalScore, color: 'primary' },
          { label: 'HR & Behavioral', val: ev.hrScore, color: 'info' },
          { label: 'Communication', val: ev.communicationScore, color: 'success' },
          { label: 'Confidence Metrix', val: ev.confidenceScore, color: 'warning' },
          { label: 'Completion Rate', val: completionRate, color: 'secondary' }
        ].map((item, idx) => (
          <div className="col-6 col-md-4 col-lg-2.4" key={idx} style={{ flexBasis: '20%', minWidth: '150px' }}>
            <div className="glass-panel p-3 bg-white text-center h-100" style={{ border: '1px solid var(--border-grey)' }}>
              <span className="text-muted small fw-semibold d-block mb-1 text-truncate">{item.label}</span>
              <strong className={`h4 fw-bold text-${item.color}`}>{item.val}%</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Analytics Charts */}
      <div className="row g-4 mb-4">
        {/* Radar Performance Chart */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white h-100" style={{ border: '1px solid var(--border-grey)' }}>
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
          <div className="glass-panel p-4 bg-white h-100" style={{ border: '1px solid var(--border-grey)' }}>
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
        
        {/* Left Column: Strengths & Suggestions */}
        <div className="col-lg-7 text-start">
          <div className="glass-panel p-4 bg-white h-100" style={{ border: '1px solid var(--border-grey)' }}>
            
            <div className="mb-4">
              <h3 className="h6 fw-bold text-dark mb-2">Overall Feedback Summary</h3>
              <p className="text-muted small mb-0" style={{ lineHeight: '1.6' }}>{ev.overallFeedback}</p>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <h4 className="h6 fw-bold text-success mb-2">Top Strengths</h4>
                <ul className="small text-muted ps-3 mb-0 d-flex flex-column gap-1.5">
                  {ev.strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
              </div>
              <div className="col-md-6">
                <h4 className="h6 fw-bold text-danger mb-2">Focus Gaps</h4>
                <ul className="small text-muted ps-3 mb-0 d-flex flex-column gap-1.5">
                  {ev.weaknesses.map((weak, idx) => (
                    <li key={idx}>{weak}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-top mt-4 pt-3">
              <h4 className="h6 fw-bold text-dark mb-2">Actionable Grading Recommendations</h4>
              <ul className="small text-muted ps-3 mb-0 d-flex flex-column gap-1.5">
                {ev.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Right Column: Roadmap & Heatmaps */}
        <div className="col-lg-5 text-start">
          <div className="glass-panel p-4 bg-white h-100" style={{ border: '1px solid var(--border-grey)' }}>
            
            {/* Learning Roadmap priorities */}
            <div className="mb-4">
              <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5">
                <FiMap className="text-primary" /> learning Roadmap Priorities
              </h3>
              <div className="d-flex flex-column gap-2">
                {ev.learningRoadmap?.map((road, idx) => (
                  <div key={idx} className="border rounded p-2 bg-light bg-opacity-25 d-flex gap-2 align-items-start">
                    <span className="badge bg-primary text-uppercase px-2 py-1" style={{ fontSize: '0.64rem', minWidth: '70px', color: 'white' }}>
                      {road.priority}
                    </span>
                    <div>
                      <strong className="text-dark small d-block">{road.topic}</strong>
                      <span className="text-muted small" style={{ fontSize: '0.74rem' }}>{road.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skill Heatmap */}
            <div>
              <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5">
                <FiStar className="text-primary" /> Skill Heatmap Stars
              </h3>
              <div className="d-flex flex-column gap-2">
                {ev.skillHeatmap?.map((skillItem, idx) => (
                  <div key={idx} className="d-flex justify-content-between align-items-center border-bottom pb-2">
                    <span className="small text-dark fw-semibold">{skillItem.skill}</span>
                    <div className="d-flex gap-0.5 text-warning">
                      {Array.from({ length: 5 }).map((_, starIdx) => (
                        <FiStar 
                          key={starIdx} 
                          style={{ 
                            fill: starIdx < skillItem.stars ? 'var(--primary-purple)' : 'transparent',
                            stroke: starIdx < skillItem.stars ? 'var(--primary-purple)' : '#cbd5e1'
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Question Breakdown List Details */}
      <h3 className="h5 fw-bold text-dark mb-3 text-start">Detailed Question breakdown</h3>
      <div className="d-flex flex-column gap-3">
        {questions.map((q, idx) => {
          const evalItem = qEvals.find(e => e.questionId === q._id);
          const ansItem = answers.find(a => a.questionId === q._id);
          const isCollapsed = !collapsedMap[q._id];

          return (
            <div key={idx} className="glass-panel bg-white overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
              
              {/* Question summary trigger bar */}
              <div 
                onClick={() => toggleCollapse(q._id)}
                className="p-3 bg-light bg-opacity-25 d-flex justify-content-between align-items-center cursor-pointer border-bottom-0"
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-secondary bg-opacity-10 text-secondary fw-bold" style={{ fontSize: '0.74rem' }}>
                    Q{q.questionNumber}
                  </span>
                  <strong className="text-dark small text-truncate" style={{ maxWidth: '500px' }}>
                    {q.question}
                  </strong>
                </div>
                
                <div className="d-flex align-items-center gap-3">
                  <span className="badge bg-primary text-white" style={{ fontSize: '0.72rem' }}>
                    Score: {evalItem ? evalItem.score : 0}/10
                  </span>
                  {isCollapsed ? <FiChevronDown /> : <FiChevronUp />}
                </div>
              </div>

              {/* Collapsed breakdown sections */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-top overflow-hidden"
                  >
                    <div className="p-4 text-start" style={{ fontSize: '0.84rem' }}>
                      <div className="mb-3">
                        <strong className="text-muted d-block mb-1">Your response:</strong>
                        <p className="border rounded p-2.5 bg-light bg-opacity-50 text-dark font-monospace mb-0">
                          {ansItem?.answer || '[No answer response provided for this question]'}
                        </p>
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <strong className="text-muted d-block mb-1">Ideal Expected Answer:</strong>
                          <p className="mb-0 text-muted">{evalItem?.expectedAnswer || q.expectedAnswer || 'N/A'}</p>
                        </div>
                        <div className="col-md-6">
                          <strong className="text-muted d-block mb-1">AI Ideal Answer Example:</strong>
                          <p className="mb-0 text-muted">{evalItem?.idealAnswer || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="border-top pt-3 mb-3">
                        <strong className="text-muted d-block mb-1">AI Evaluation Analysis:</strong>
                        <p className="mb-0 text-dark">{evalItem?.feedback || 'N/A'}</p>
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <strong className="text-danger d-block mb-1">Missing Points Identified:</strong>
                          <ul className="small text-danger-emphasis ps-3 mb-0">
                            {evalItem?.missingPoints?.map((p, pIdx) => (
                              <li key={pIdx}>{p}</li>
                            )) || <li>None</li>}
                            {(!evalItem?.missingPoints || evalItem.missingPoints.length === 0) && <li>None</li>}
                          </ul>
                        </div>
                        <div className="col-md-6">
                          <strong className="text-success d-block mb-1">Suggestions for Improvement:</strong>
                          <ul className="small text-success-emphasis ps-3 mb-0">
                            {evalItem?.improvementSuggestions?.map((s, sIdx) => (
                              <li key={sIdx}>{s}</li>
                            )) || <li>None</li>}
                            {(!evalItem?.improvementSuggestions || evalItem.improvementSuggestions.length === 0) && <li>None</li>}
                          </ul>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default InterviewReport;
