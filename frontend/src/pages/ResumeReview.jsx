import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  FiFileText, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiXCircle,
  FiTrendingUp, FiLayers, FiCode, FiZap, FiRefreshCw, FiCopy, FiCheck,
  FiUploadCloud, FiSliders, FiArrowRight, FiTarget, FiAward, FiEdit3,
  FiPlus, FiChevronRight, FiBriefcase, FiCpu, FiExternalLink, FiDownload
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const ResumeReview = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  // Data states
  const [review, setReview] = useState(null);
  const [resumeMeta, setResumeMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Customization options
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [targetCompany, setTargetCompany] = useState('General Tech');

  // Action states
  const [syncingKeywords, setSyncingKeywords] = useState(false);
  const [appliedProjects, setAppliedProjects] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Upload modal / quick upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch resume info
      const resRes = await axiosInstance.get('/resume');
      if (resRes.data && resRes.data.success && resRes.data.resume) {
        setResumeMeta(resRes.data.resume);
      }

      // 2. Fetch latest AI review
      const revRes = await axiosInstance.get('/resume/review/latest');
      if (revRes.data && revRes.data.success && revRes.data.review) {
        setReview(revRes.data.review);
        if (revRes.data.review.targetRole) setTargetRole(revRes.data.review.targetRole);
        if (revRes.data.review.targetCompany) setTargetCompany(revRes.data.review.targetCompany);
      } else if (resRes.data?.resume) {
        // If resume exists but no review generated yet, trigger one automatically
        triggerReview(targetRole, targetCompany);
      }
    } catch (error) {
      console.error('Error fetching resume review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerReview = async (role = targetRole, company = targetCompany) => {
    setAnalyzing(true);
    try {
      const response = await axiosInstance.post('/resume/review', {
        targetRole: role,
        targetCompany: company
      });
      if (response.data && response.data.success) {
        setReview(response.data.review);
        toast.success('AI Resume Review generated successfully!');
      }
    } catch (error) {
      console.error('Failed to analyze resume:', error);
      toast.error(error.response?.data?.message || 'Failed to generate AI Resume Review.');
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('targetRole', targetRole);
    formData.append('targetCompany', targetCompany);

    setUploading(true);
    setUploadProgress(20);

    try {
      const response = await axiosInstance.post('/resume/review/quick-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.min(20 + Math.round(percent * 0.6), 85));
        }
      });

      if (response.data && response.data.success) {
        setUploadProgress(100);
        setResumeMeta(response.data.resume);
        setReview(response.data.review);
        toast.success('Resume uploaded and analyzed successfully with AI!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload and analyze resume.');
    } finally {
      setUploading(false);
    }
  }, [targetRole, targetCompany]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const handleSyncKeywords = async () => {
    if (!review?.keywordsAnalysis?.missingKeywords || review.keywordsAnalysis.missingKeywords.length === 0) {
      toast.info('No missing keywords to sync.');
      return;
    }

    const keywordsToAdd = review.keywordsAnalysis.missingKeywords.map(k => k.keyword);
    setSyncingKeywords(true);

    try {
      const response = await axiosInstance.post('/resume/review/sync-keywords', {
        keywords: keywordsToAdd
      });

      if (response.data && response.data.success) {
        toast.success(response.data.message || 'Keywords synced to your profile!');
        if (user) {
          setUser({
            ...user,
            skills: response.data.technicalSkills,
            profileCompletion: response.data.profileCompletion
          });
        }
      }
    } catch (error) {
      toast.error('Failed to sync keywords to profile.');
    } finally {
      setSyncingKeywords(false);
    }
  };

  const handleApplyProject = async (proj, idx) => {
    const combinedBulletDescription = proj.enhancedBullets?.map(b => `• ${b}`).join('\n') || proj.enhancedTitle;
    
    try {
      const response = await axiosInstance.post('/resume/review/apply-project', {
        projectIndex: idx,
        title: proj.enhancedTitle || proj.originalTitle,
        enhancedDescription: combinedBulletDescription,
        technologies: proj.recommendedTech || []
      });

      if (response.data && response.data.success) {
        setAppliedProjects(prev => ({ ...prev, [idx]: true }));
        toast.success(`Project "${proj.enhancedTitle || proj.originalTitle}" updated in your Resume Data!`);
      }
    } catch (error) {
      toast.error('Failed to apply project enhancement.');
    }
  };

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.info('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 65) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary mb-3" style={{ color: 'var(--primary-purple)', width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading Review...</span>
        </div>
        <p className="text-muted small">Loading AI Resume Review...</p>
      </div>
    );
  }

  // If no resume uploaded and no review available, show upload landing card
  if (!resumeMeta && !review) {
    return (
      <div className="resume-review-container">
        <div className="mb-4">
          <h1 className="fw-bold mb-1" style={{ fontSize: '1.85rem' }}>AI Resume Review & ATS Optimizer</h1>
          <p className="text-muted small mb-0">
            Upload your resume to receive instantaneous, deep AI feedback on better wording, missing keywords, ATS compliance, and stronger project descriptions.
          </p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="glass-panel p-5 bg-white text-center" style={{ border: '1px solid var(--border-grey)' }}>
              {!uploading ? (
                <div 
                  {...getRootProps()} 
                  className={`border border-2 border-dashed rounded-3 p-5 text-center cursor-pointer transition-all ${
                    isDragActive ? 'border-primary bg-light' : 'border-secondary-subtle'
                  }`}
                  style={{ minHeight: '260px', cursor: 'pointer' }}
                >
                  <input {...getInputProps()} />
                  <div className="p-3 bg-light rounded-circle mb-3 mx-auto text-primary d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px', backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
                    <FiUploadCloud className="fs-2" style={{ color: 'var(--primary-purple)' }} />
                  </div>
                  <h3 className="h6 fw-bold text-dark mb-1">
                    {isDragActive ? 'Drop your resume file here' : 'Drag & drop your resume to start AI review'}
                  </h3>
                  <p className="text-muted small mb-3">Accepts PDF or DOCX format (Max 5MB)</p>
                  <button type="button" className="btn btn-primary-purple px-4 py-2">
                    Browse File & Start AI Review
                  </button>
                </div>
              ) : (
                <div className="py-5 text-center">
                  <div className="spinner-border text-primary mb-4" role="status" style={{ color: 'var(--primary-purple)', width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Analyzing...</span>
                  </div>
                  <h3 className="h6 fw-bold text-dark mb-2">Analyzing Resume with AI Engine...</h3>
                  <p className="text-muted small mb-4">Evaluating ATS compatibility, matching industry keywords, and generating metric-driven rewrites.</p>
                  <div className="progress w-100 rounded-pill mx-auto" style={{ height: '8px', maxWidth: '360px', backgroundColor: '#f1f5f9' }}>
                    <div 
                      className="progress-bar progress-bar-striped progress-bar-animated rounded-pill" 
                      style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--primary-purple)' }}
                    ></div>
                  </div>
                  <span className="text-muted small mt-2 fw-semibold d-block">{uploadProgress}%</span>
                </div>
              )}

              {/* Feature Highlights Grid */}
              <div className="row g-3 mt-4 pt-4 border-top text-start">
                <div className="col-md-6">
                  <div className="d-flex gap-2">
                    <span className="text-success fs-5"><FiCheckCircle /></span>
                    <div>
                      <strong className="d-block text-dark small">Better Wording & XYZ Formula</strong>
                      <p className="text-muted mb-0" style={{ fontSize: '0.74rem' }}>Converts passive bullets into metric-driven power statements.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex gap-2">
                    <span className="text-primary fs-5"><FiTarget /></span>
                    <div>
                      <strong className="d-block text-dark small">Missing Keywords Detection</strong>
                      <p className="text-muted mb-0" style={{ fontSize: '0.74rem' }}>Identifies high-impact skills gaps for your target job role.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex gap-2">
                    <span className="text-warning fs-5"><FiTrendingUp /></span>
                    <div>
                      <strong className="d-block text-dark small">ATS Scanner Diagnostics</strong>
                      <p className="text-muted mb-0" style={{ fontSize: '0.74rem' }}>Audit formatting to pass Workday, Greenhouse & Lever ATS filters.</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex gap-2">
                    <span className="text-info fs-5"><FiZap /></span>
                    <div>
                      <strong className="d-block text-dark small">Stronger Project Descriptions</strong>
                      <p className="text-muted mb-0" style={{ fontSize: '0.74rem' }}>Deepens architectural explanations and adds quantifiable KPIs.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-review-container">
      {/* 1. Page Header with Re-Analysis Controls */}
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="fw-bold mb-0" style={{ fontSize: '1.85rem', letterSpacing: '-0.02em' }}>AI Resume Review</h1>
            <span className="badge bg-primary-purple-subtle text-primary fw-bold px-2.5 py-1" style={{ fontSize: '0.72rem', backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
              ⚡ Powered by Gemini AI
            </span>
          </div>
          <p className="text-muted small mb-0">
            Comprehensive recruiter-grade audit: Better Wording, Missing Keywords, ATS Scoring, and Project Depth.
          </p>
        </div>

        {/* Controls: Target Role, Company, Re-Analyze */}
        <div className="d-flex align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 bg-white px-3 py-1.5 rounded-3 border" style={{ borderColor: 'var(--border-card)' }}>
            <span className="text-muted small fw-semibold">Role:</span>
            <select 
              className="form-select form-select-sm border-0 bg-transparent text-dark fw-bold p-0 pe-4 shadow-none" 
              style={{ width: 'auto', cursor: 'pointer' }}
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            >
              <option value="Software Engineer">Software Engineer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="AI / ML Engineer">AI / ML Engineer</option>
              <option value="Data Engineer">Data Engineer</option>
              <option value="DevOps / Cloud Engineer">DevOps Engineer</option>
            </select>
          </div>

          <div className="d-flex align-items-center gap-2 bg-white px-3 py-1.5 rounded-3 border" style={{ borderColor: 'var(--border-card)' }}>
            <span className="text-muted small fw-semibold">Target:</span>
            <select 
              className="form-select form-select-sm border-0 bg-transparent text-dark fw-bold p-0 pe-4 shadow-none" 
              style={{ width: 'auto', cursor: 'pointer' }}
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
            >
              <option value="Google">Google (DSA & Scale)</option>
              <option value="Amazon">Amazon (16 LP & LLD)</option>
              <option value="Microsoft">Microsoft (Clean Code)</option>
              <option value="Infosys">Infosys (CS & DBMS)</option>
              <option value="TCS">TCS (Prime / Digital)</option>
              <option value="Accenture">Accenture (Cloud & Modern)</option>
              <option value="General Tech">General Tech</option>
            </select>
          </div>

          <button
            onClick={() => triggerReview(targetRole, targetCompany)}
            disabled={analyzing}
            className="btn btn-primary-purple px-3 py-1.5 d-flex align-items-center gap-2 shadow-sm"
            style={{ fontSize: '0.84rem' }}
          >
            {analyzing ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status"></span>
                <span>Auditing with AI...</span>
              </>
            ) : (
              <>
                <FiRefreshCw />
                <span>Re-Analyze</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Top Score Pillar Cards */}
      <div className="row g-3 mb-4">
        {/* Overall Score Card */}
        <div className="col-xxl-4 col-xl-4 col-lg-12">
          <div className="glass-panel p-3.5 bg-white h-100 d-flex align-items-center justify-content-between gap-3 overflow-hidden" style={{ border: '1px solid var(--border-grey)' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span className="text-muted small fw-semibold d-block mb-1">Overall Resume Score</span>
              <div className="d-flex align-items-baseline gap-2">
                <h2 className="display-6 fw-bold mb-0 text-dark">{review?.overallScore || 0}</h2>
                <span className="text-muted small">/ 100</span>
              </div>
              <div className="mt-2">
                <span className="badge text-wrap text-start px-2.5 py-1 rounded-pill fw-semibold" style={{ backgroundColor: `${getScoreColor(review?.overallScore || 0)}15`, color: getScoreColor(review?.overallScore || 0), fontSize: '0.72rem', maxWidth: '100%', lineHeight: '1.3' }}>
                  {review?.hiringVerdict || 'Ready for Review'}
                </span>
              </div>
            </div>
            {/* SVG Circular Progress Meter */}
            <div className="flex-shrink-0">
              <svg width="72" height="72" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="9" fill="none" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke={getScoreColor(review?.overallScore || 0)} 
                  strokeWidth="9" 
                  fill="none" 
                  strokeDasharray="251"
                  strokeDashoffset={251 - (251 * (review?.overallScore || 0)) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="56" fill="#1f2937" fontSize="22" fontWeight="800" textAnchor="middle">
                  {review?.overallScore || 0}%
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* 4 Score Metric Cards in a nested 8-column sub-grid */}
        <div className="col-xxl-8 col-xl-8 col-lg-12">
          <div className="row g-3 h-100">
            {/* ATS Score Card */}
            <div className="col-md-3 col-6">
              <div className="glass-panel p-3 bg-white h-100 text-start d-flex flex-column justify-content-between" style={{ border: '1px solid var(--border-grey)' }}>
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted small fw-semibold text-truncate" style={{ fontSize: '0.74rem' }}>ATS Match</span>
                    <span className="text-primary fs-6"><FiTarget /></span>
                  </div>
                  <div className="d-flex align-items-baseline gap-1">
                    <h3 className="h4 fw-bold mb-0 text-dark">{review?.atsScore || 0}</h3>
                    <span className="text-muted small" style={{ fontSize: '0.7rem' }}>/ 100</span>
                  </div>
                </div>
                <div>
                  <div className="progress mt-2 rounded-pill" style={{ height: '6px', backgroundColor: '#f1f5f9' }}>
                    <div className="progress-bar rounded-pill" style={{ width: `${review?.atsScore || 0}%`, backgroundColor: getScoreColor(review?.atsScore || 0) }}></div>
                  </div>
                  <span className="text-muted mt-1.5 d-block text-truncate" style={{ fontSize: '0.68rem' }}>
                    Status: <strong className="text-dark">{review?.atsAnalysis?.compatibilityLevel || 'Moderate'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Better Wording Card */}
            <div className="col-md-3 col-6">
              <div className="glass-panel p-3 bg-white h-100 text-start d-flex flex-column justify-content-between" style={{ border: '1px solid var(--border-grey)' }}>
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted small fw-semibold text-truncate" style={{ fontSize: '0.74rem' }}>Wording</span>
                    <span className="text-success fs-6"><FiEdit3 /></span>
                  </div>
                  <div className="d-flex align-items-baseline gap-1">
                    <h3 className="h4 fw-bold mb-0 text-dark">{review?.wordingScore || 0}</h3>
                    <span className="text-muted small" style={{ fontSize: '0.7rem' }}>/ 100</span>
                  </div>
                </div>
                <div>
                  <div className="progress mt-2 rounded-pill" style={{ height: '6px', backgroundColor: '#f1f5f9' }}>
                    <div className="progress-bar rounded-pill" style={{ width: `${review?.wordingScore || 0}%`, backgroundColor: getScoreColor(review?.wordingScore || 0) }}></div>
                  </div>
                  <span className="text-muted mt-1.5 d-block text-truncate" style={{ fontSize: '0.68rem' }}>
                    Google XYZ Formula
                  </span>
                </div>
              </div>
            </div>

            {/* Keywords Match Card */}
            <div className="col-md-3 col-6">
              <div className="glass-panel p-3 bg-white h-100 text-start d-flex flex-column justify-content-between" style={{ border: '1px solid var(--border-grey)' }}>
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted small fw-semibold text-truncate" style={{ fontSize: '0.74rem' }}>Keywords</span>
                    <span className="text-warning fs-6"><FiCode /></span>
                  </div>
                  <div className="d-flex align-items-baseline gap-1">
                    <h3 className="h4 fw-bold mb-0 text-dark">{review?.skillsScore || review?.keywordsAnalysis?.matchPercentage || 0}</h3>
                    <span className="text-muted small" style={{ fontSize: '0.7rem' }}>/ 100</span>
                  </div>
                </div>
                <div>
                  <div className="progress mt-2 rounded-pill" style={{ height: '6px', backgroundColor: '#f1f5f9' }}>
                    <div className="progress-bar rounded-pill" style={{ width: `${review?.skillsScore || 0}%`, backgroundColor: getScoreColor(review?.skillsScore || 0) }}></div>
                  </div>
                  <span className="text-muted mt-1.5 d-block text-truncate" style={{ fontSize: '0.68rem' }}>
                    {review?.keywordsAnalysis?.missingKeywords?.length || 0} Critical Gaps
                  </span>
                </div>
              </div>
            </div>

            {/* Project Quality Card */}
            <div className="col-md-3 col-6">
              <div className="glass-panel p-3 bg-white h-100 text-start d-flex flex-column justify-content-between" style={{ border: '1px solid var(--border-grey)' }}>
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted small fw-semibold text-truncate" style={{ fontSize: '0.74rem' }}>Projects</span>
                    <span className="text-info fs-6"><FiZap /></span>
                  </div>
                  <div className="d-flex align-items-baseline gap-1">
                    <h3 className="h4 fw-bold mb-0 text-dark">{review?.projectScore || 0}</h3>
                    <span className="text-muted small" style={{ fontSize: '0.7rem' }}>/ 100</span>
                  </div>
                </div>
                <div>
                  <div className="progress mt-2 rounded-pill" style={{ height: '6px', backgroundColor: '#f1f5f9' }}>
                    <div className="progress-bar rounded-pill" style={{ width: `${review?.projectScore || 0}%`, backgroundColor: getScoreColor(review?.projectScore || 0) }}></div>
                  </div>
                  <span className="text-muted mt-1.5 d-block text-truncate" style={{ fontSize: '0.68rem' }}>
                    STAR Metrics Depth
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="glass-panel p-1.5 bg-white mb-4 border d-flex gap-1 flex-wrap" style={{ borderColor: 'var(--border-grey)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`btn btn-sm px-3 py-2 rounded-2 fw-semibold transition-all ${
            activeTab === 'overview' ? 'btn-primary-purple text-white' : 'btn-light text-muted border-0'
          }`}
          style={{ fontSize: '0.82rem' }}
        >
          📋 Executive Summary
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ats')}
          className={`btn btn-sm px-3 py-2 rounded-2 fw-semibold transition-all ${
            activeTab === 'ats' ? 'btn-primary-purple text-white' : 'btn-light text-muted border-0'
          }`}
          style={{ fontSize: '0.82rem' }}
        >
          🎯 ATS Improvements ({review?.atsAnalysis?.formattingChecks?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('keywords')}
          className={`btn btn-sm px-3 py-2 rounded-2 fw-semibold transition-all ${
            activeTab === 'keywords' ? 'btn-primary-purple text-white' : 'btn-light text-muted border-0'
          }`}
          style={{ fontSize: '0.82rem' }}
        >
          🔑 Missing Keywords ({review?.keywordsAnalysis?.missingKeywords?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wording')}
          className={`btn btn-sm px-3 py-2 rounded-2 fw-semibold transition-all ${
            activeTab === 'wording' ? 'btn-primary-purple text-white' : 'btn-light text-muted border-0'
          }`}
          style={{ fontSize: '0.82rem' }}
        >
          ✍️ Better Wording ({review?.wordingSuggestions?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`btn btn-sm px-3 py-2 rounded-2 fw-semibold transition-all ${
            activeTab === 'projects' ? 'btn-primary-purple text-white' : 'btn-light text-muted border-0'
          }`}
          style={{ fontSize: '0.82rem' }}
        >
          🚀 Stronger Projects ({review?.projectEnhancements?.length || 0})
        </button>
      </div>

      {/* 4. Tab Content Panels */}
      <div className="tab-content-container">

        {/* TAB 1: EXECUTIVE SUMMARY */}
        {activeTab === 'overview' && (
          <div className="row g-4">
            <div className="col-lg-8">
              {/* Executive Summary Narrative */}
              <div className="glass-panel p-4 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 fw-bold mb-0 text-dark">AI Recruiter Executive Verdict</h3>
                  <span className="badge bg-light text-secondary border px-2.5 py-1" style={{ fontSize: '0.72rem' }}>
                    Engine: {review?.analysisEngine || 'Gemini AI'}
                  </span>
                </div>
                <p className="text-muted mb-0" style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
                  {review?.executiveSummary || 'Your resume demonstrates promising baseline experience. Review the categorized sections to refine ATS parsability and project metrics.'}
                </p>
              </div>

              {/* Priority Quick Wins */}
              <div className="glass-panel p-4 bg-white" style={{ border: '1px solid var(--border-grey)' }}>
                <h3 className="h6 fw-bold mb-3 text-dark d-flex align-items-center gap-2">
                  <FiZap className="text-warning" /> Top High-Impact Fixes for Today
                </h3>
                <div className="d-flex flex-column gap-2.5">
                  {(review?.topQuickWins && review.topQuickWins.length > 0 ? review.topQuickWins : [
                    'Quantify project outcomes with measurable metrics (e.g. latency, scale, queries).',
                    'Integrate missing core skills in technical skills section.',
                    'Replace passive verbs with strong action verbs like Architected and Optimized.'
                  ]).map((win, idx) => (
                    <div key={idx} className="p-3 rounded-3 bg-light bg-opacity-50 border d-flex align-items-start gap-3">
                      <span className="badge bg-white text-primary border rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <p className="text-dark small mb-0 fw-medium" style={{ lineHeight: '1.5' }}>
                        {win}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Document Details & Quick Actions */}
            <div className="col-lg-4">
              <div className="glass-panel p-4 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
                <h3 className="h6 fw-bold mb-3 text-dark">Active Resume File</h3>
                {resumeMeta ? (
                  <div>
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 bg-light border mb-3">
                      <FiFileText className="fs-3 text-primary" style={{ color: 'var(--primary-purple)' }} />
                      <div style={{ overflow: 'hidden' }}>
                        <strong className="d-block text-dark small text-truncate">{resumeMeta.fileName}</strong>
                        <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                          Uploaded {new Date(resumeMeta.uploadDate || resumeMeta.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <Link to="/resume/data" className="btn btn-outline-purple btn-sm py-2 d-flex align-items-center justify-content-center gap-2">
                        <FiSliders /> Edit Extracted Details
                      </Link>
                      <a href={resumeMeta.fileUrl} target="_blank" rel="noreferrer" className="btn btn-white-custom btn-sm py-2 d-flex align-items-center justify-content-center gap-2 border">
                        <FiDownload /> Download File
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No file uploaded.</p>
                )}
              </div>

              {/* Instant Upload Dropzone */}
              <div className="glass-panel p-4 bg-white" style={{ border: '1px solid var(--border-grey)' }}>
                <h3 className="h6 fw-bold mb-2 text-dark">Test New Resume Version</h3>
                <p className="text-muted small mb-3" style={{ fontSize: '0.74rem' }}>
                  Upload an updated PDF/DOCX version to test if your ATS score improved.
                </p>
                <div 
                  {...getRootProps()} 
                  className="border border-2 border-dashed rounded-3 p-3 text-center cursor-pointer bg-light transition-all"
                  style={{ cursor: 'pointer' }}
                >
                  <input {...getInputProps()} />
                  <FiUploadCloud className="fs-4 text-muted mb-1" />
                  <span className="d-block small text-dark fw-semibold">Drop PDF/DOCX or Browse</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATS IMPROVEMENTS & DIAGNOSTICS */}
        {activeTab === 'ats' && (
          <div>
            <div className="glass-panel p-4 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 pb-3 border-bottom">
                <div>
                  <h3 className="h6 fw-bold mb-1 text-dark">ATS Formatting & Parser Diagnostics</h3>
                  <p className="text-muted small mb-0">
                    Audit of your resume structure against Workday, Greenhouse, Lever, and Taleo ATS algorithms.
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">Compatibility Level:</span>
                  <span className={`badge px-2.5 py-1 rounded-pill fw-bold ${
                    review?.atsAnalysis?.compatibilityLevel === 'High' ? 'bg-success text-white' : 'bg-warning text-dark'
                  }`} style={{ fontSize: '0.75rem' }}>
                    {review?.atsAnalysis?.compatibilityLevel || 'Moderate'}
                  </span>
                </div>
              </div>

              {/* Formatting Checks Table/Cards */}
              <div className="d-flex flex-column gap-3 mb-4">
                {(review?.atsAnalysis?.formattingChecks || []).map((check, idx) => (
                  <div key={idx} className="p-3 rounded-3 border bg-light bg-opacity-25 d-flex justify-content-between align-items-start gap-3">
                    <div className="d-flex align-items-start gap-2.5">
                      <span className="fs-5 mt-0.5">
                        {check.status === 'Pass' && <FiCheckCircle className="text-success" />}
                        {check.status === 'Warning' && <FiAlertTriangle className="text-warning" />}
                        {check.status === 'Fail' && <FiXCircle className="text-danger" />}
                      </span>
                      <div>
                        <strong className="d-block text-dark small">{check.item}</strong>
                        <p className="text-muted mb-0 mt-0.5" style={{ fontSize: '0.78rem' }}>{check.tip}</p>
                      </div>
                    </div>
                    <span className={`badge px-2 py-0.5 rounded fw-semibold ${
                      check.status === 'Pass' ? 'bg-success-subtle text-success border border-success' :
                      check.status === 'Warning' ? 'bg-warning-subtle text-warning border border-warning' :
                      'bg-danger-subtle text-danger border border-danger'
                    }`} style={{ fontSize: '0.68rem' }}>
                      {check.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Critical Fixes Alert Box */}
              {review?.atsAnalysis?.criticalFixes && review.atsAnalysis.criticalFixes.length > 0 && (
                <div className="p-3.5 rounded-3 bg-danger bg-opacity-10 border border-danger border-opacity-25">
                  <h4 className="fw-bold text-danger small mb-2 d-flex align-items-center gap-2">
                    <FiAlertCircle /> Critical ATS Adjustments Required
                  </h4>
                  <ul className="mb-0 ps-3 text-dark small" style={{ fontSize: '0.78rem', lineHeight: '1.6' }}>
                    {review.atsAnalysis.criticalFixes.map((fix, i) => (
                      <li key={i}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MISSING KEYWORDS & SKILLS GAP */}
        {activeTab === 'keywords' && (
          <div>
            <div className="glass-panel p-4 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 pb-3 border-bottom">
                <div>
                  <h3 className="h6 fw-bold mb-1 text-dark">Keywords & Skills Gap Analysis</h3>
                  <p className="text-muted small mb-0">
                    Comparing your resume skills against typical job descriptions for <strong className="text-dark">{targetRole}</strong> at <strong className="text-dark">{targetCompany}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncKeywords}
                  disabled={syncingKeywords || !review?.keywordsAnalysis?.missingKeywords?.length}
                  className="btn btn-primary-purple btn-sm px-3 py-1.5 d-flex align-items-center gap-2"
                >
                  {syncingKeywords ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <FiPlus />
                      <span>1-Click Add Missing Keywords to Profile</span>
                    </>
                  )}
                </button>
              </div>

              {/* Missing High-Impact Keywords */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h4 className="fw-bold small text-dark mb-0 d-flex align-items-center gap-1.5">
                    <span className="badge bg-danger text-white rounded-pill px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                      {review?.keywordsAnalysis?.missingKeywords?.length || 0}
                    </span>
                    Missing High-Impact Keywords
                  </h4>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>Adding these boosts search match by ~30%</span>
                </div>

                <div className="row g-2.5 mb-3">
                  {(review?.keywordsAnalysis?.missingKeywords || []).map((item, idx) => (
                    <div className="col-md-6" key={idx}>
                      <div className="p-3 rounded-3 border bg-light bg-opacity-25 h-100 text-start">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="badge bg-white text-dark border fw-bold px-2 py-1" style={{ fontSize: '0.76rem' }}>
                            {item.keyword}
                          </span>
                          <span className="badge bg-warning-subtle text-warning border border-warning px-1.5 py-0.5" style={{ fontSize: '0.64rem' }}>
                            {item.category || item.importance}
                          </span>
                        </div>
                        <p className="text-muted mb-0" style={{ fontSize: '0.74rem', lineHeight: '1.4' }}>
                          {item.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Present / Found Keywords */}
              <div>
                <h4 className="fw-bold small text-dark mb-2 d-flex align-items-center gap-1.5">
                  <span className="badge bg-success text-white rounded-pill px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                    {review?.keywordsAnalysis?.presentKeywords?.length || 0}
                  </span>
                  Found Keywords in Resume
                </h4>
                <div className="d-flex flex-wrap gap-1.5 p-3 rounded-3 bg-light border">
                  {(review?.keywordsAnalysis?.presentKeywords || []).map((kw, idx) => (
                    <span key={idx} className="badge bg-white text-dark border px-2.5 py-1.5 fw-medium d-flex align-items-center gap-1" style={{ fontSize: '0.74rem' }}>
                      <FiCheckCircle className="text-success" /> {kw}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: BETTER WORDING & ACTION VERBS */}
        {activeTab === 'wording' && (
          <div>
            <div className="glass-panel p-4 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
              <div className="mb-4 pb-3 border-bottom">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <h3 className="h6 fw-bold mb-1 text-dark">Better Wording & Google XYZ Transformations</h3>
                    <p className="text-muted small mb-0">
                      Convert weak, passive phrases into high-impact metric statements using the formula: <em>"Accomplished [X], as measured by [Y], by doing [Z]"</em>.
                    </p>
                  </div>
                  <span className="badge bg-primary-purple-subtle text-primary border px-2.5 py-1" style={{ fontSize: '0.72rem', backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
                    XYZ Formula Applied
                  </span>
                </div>
              </div>

              {/* Transformations List */}
              <div className="d-flex flex-column gap-4">
                {(review?.wordingSuggestions || []).map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-3 border bg-light bg-opacity-25 text-start">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-secondary-subtle text-secondary border px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                        {item.category || 'Action Verb & Impact'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.suggestedText, idx)}
                        className="btn btn-sm btn-white-custom py-1 px-2.5 d-flex align-items-center gap-1 border"
                        style={{ fontSize: '0.72rem' }}
                      >
                        {copiedIndex === idx ? <FiCheck className="text-success" /> : <FiCopy />}
                        <span>{copiedIndex === idx ? 'Copied' : 'Copy Rewritten'}</span>
                      </button>
                    </div>

                    <div className="row g-3 mb-2">
                      {/* Original */}
                      <div className="col-md-6">
                        <div className="p-2.5 rounded-2 bg-white border border-danger border-opacity-25 h-100">
                          <span className="text-danger small fw-bold d-block mb-1">❌ Original Phrase (Weak / Passive):</span>
                          <p className="text-muted small mb-0" style={{ fontSize: '0.78rem' }}>{item.originalText}</p>
                        </div>
                      </div>

                      {/* Suggested */}
                      <div className="col-md-6">
                        <div className="p-2.5 rounded-2 bg-white border border-success border-opacity-50 h-100" style={{ backgroundColor: 'rgba(16, 185, 129, 0.03)' }}>
                          <span className="text-success small fw-bold d-block mb-1">✅ AI Enhanced Statement (High Impact):</span>
                          <p className="text-dark small fw-medium mb-0" style={{ fontSize: '0.78rem' }}>{item.suggestedText}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-muted mb-0 mt-2" style={{ fontSize: '0.72rem' }}>
                      <strong>Why this works:</strong> {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STRONGER PROJECT DESCRIPTIONS */}
        {activeTab === 'projects' && (
          <div>
            <div className="glass-panel p-4 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
              <div className="mb-4 pb-3 border-bottom">
                <h3 className="h6 fw-bold mb-1 text-dark">Stronger Project Descriptions & Architecture Depth</h3>
                <p className="text-muted small mb-0">
                  AI rewrites your project sections to demonstrate architectural rigor, performance optimizations, and quantifiable KPIs.
                </p>
              </div>

              {/* Projects List */}
              <div className="d-flex flex-column gap-4">
                {(review?.projectEnhancements || []).map((proj, idx) => (
                  <div key={idx} className="p-4 rounded-3 border bg-light bg-opacity-25 text-start">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 pb-2 border-bottom">
                      <div>
                        <span className="text-muted small">Original Project:</span>
                        <h4 className="h6 fw-bold text-dark mb-0">{proj.originalTitle}</h4>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyText(proj.enhancedBullets?.join('\n'), `proj-${idx}`)}
                          className="btn btn-sm btn-white-custom py-1 px-2.5 d-flex align-items-center gap-1 border"
                          style={{ fontSize: '0.72rem' }}
                        >
                          {copiedIndex === `proj-${idx}` ? <FiCheck className="text-success" /> : <FiCopy />}
                          <span>{copiedIndex === `proj-${idx}` ? 'Copied' : 'Copy Bullets'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyProject(proj, idx)}
                          disabled={appliedProjects[idx]}
                          className="btn btn-sm btn-primary-purple py-1 px-3 d-flex align-items-center gap-1.5"
                          style={{ fontSize: '0.72rem' }}
                        >
                          {appliedProjects[idx] ? <FiCheck /> : <FiEdit3 />}
                          <span>{appliedProjects[idx] ? 'Applied to Resume' : '1-Click Apply to Resume Data'}</span>
                        </button>
                      </div>
                    </div>

                    {/* AI Enhanced Project Bullets */}
                    <div className="p-3 rounded-3 bg-white border border-success border-opacity-50 mb-3" style={{ backgroundColor: 'rgba(16, 185, 129, 0.02)' }}>
                      <strong className="text-success small d-block mb-2">🚀 AI Enhanced Project Bullets (STAR Format):</strong>
                      <ul className="mb-0 ps-3 text-dark small" style={{ fontSize: '0.8rem', lineHeight: '1.6' }}>
                        {(proj.enhancedBullets || []).map((bullet, bIdx) => (
                          <li key={bIdx} className="mb-1.5">{bullet}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Technical Depth Gaps & Recommended Stack */}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="p-2.5 rounded-2 bg-white border h-100">
                          <strong className="text-dark small d-block mb-1">🔍 Missing Technical Depth:</strong>
                          <ul className="mb-0 ps-3 text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>
                            {(proj.missingTechnicalDepth || []).map((depth, dIdx) => (
                              <li key={dIdx}>{depth}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-2.5 rounded-2 bg-white border h-100">
                          <strong className="text-dark small d-block mb-1">💡 Recommended Stack to Highlight:</strong>
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {(proj.recommendedTech || []).map((tech, tIdx) => (
                              <span key={tIdx} className="badge bg-light text-secondary border px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResumeReview;
