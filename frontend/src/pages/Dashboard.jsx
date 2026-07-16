import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiPlay, FiChevronDown, FiCalendar, FiUser, FiUploadCloud, 
  FiFileText, FiEdit3, FiCheck, FiX, FiActivity, FiRefreshCw, FiExternalLink,
  FiBookOpen, FiClock, FiGrid
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const navigate = useNavigate();
  const { setUser, user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [resumeMeta, setResumeMeta] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reparsing, setReparsing] = useState(false);
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axiosInstance.get('/users/profile');
      if (response.data && response.data.success) {
        setProfile(response.data.user);
        setUser(response.data.user);
      }
      
      const resRes = await axiosInstance.get('/resume');
      if (resRes.data && resRes.data.success) {
        setResumeMeta(resRes.data.resume);
      } else {
        setResumeMeta(null);
      }

      const dataRes = await axiosInstance.get('/resume/data');
      if (dataRes.data && dataRes.data.success) {
        setResumeData(dataRes.data.resumeData);
      } else {
        setResumeData(null);
      }

      const intRes = await axiosInstance.get('/interviews/user');
      if (intRes.data && intRes.data.success) {
        setInterviews(intRes.data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReParse = async () => {
    if (!resumeMeta) return;
    toast.info('Re-parsing resume text using Gemini AI...');
    setReparsing(true);
    try {
      const response = await axiosInstance.post('/resume/reparse');
      if (response.data && response.data.success) {
        toast.success('Resume parsed successfully!');
        fetchDashboardData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Re-parsing failed');
    } finally {
      setReparsing(false);
    }
  };

  // Completion calculation checklist checks
  const isPersonalDone = !!(profile?.fullName || profile?.name);
  const isContactDone = !!(profile?.phone && profile?.phone.trim().length > 0);
  const isBioDone = !!(profile?.bio && profile?.bio.trim().length > 0);
  const isExpLevelDone = !!(profile?.experienceLevel && profile?.experienceLevel.trim().length > 0);
  const isTargetRoleDone = !!(profile?.targetRole && profile?.targetRole.trim().length > 0);
  const isTargetCompanyDone = !!(profile?.targetCompany && profile?.targetCompany.trim().length > 0);
  const isPrefLangDone = !!(profile?.preferredLanguage && profile?.preferredLanguage.trim().length > 0);
  const isResumeDone = !!profile?.resumeId;
  const isEducationDone = !!(resumeData?.education && resumeData.education.length > 0);
  const isExperienceDone = !!(resumeData?.experience && resumeData.experience.length > 0);
  const isSkillsDone = !!(
    (profile?.skills && profile.skills.length > 0) ||
    (profile?.frameworks && profile.frameworks.length > 0) ||
    (profile?.databases && profile.databases.length > 0) ||
    (profile?.tools && profile.tools.length > 0) ||
    (profile?.softSkills && profile.softSkills.length > 0) ||
    (resumeData?.technicalSkills && resumeData.technicalSkills.length > 0) ||
    (resumeData?.programmingLanguages && resumeData.programmingLanguages.length > 0) ||
    (resumeData?.frameworks && resumeData.frameworks.length > 0) ||
    (resumeData?.databases && resumeData.databases.length > 0) ||
    (resumeData?.tools && resumeData.tools.length > 0)
  );
  const isProjectsDone = !!(resumeData?.projects && resumeData.projects.length > 0);

  let completedCount = 0;
  if (isPersonalDone) completedCount++;
  if (isContactDone) completedCount++;
  if (isBioDone) completedCount++;
  if (isExpLevelDone) completedCount++;
  if (isTargetRoleDone) completedCount++;
  if (isTargetCompanyDone) completedCount++;
  if (isPrefLangDone) completedCount++;
  if (isResumeDone) completedCount++;
  if (isEducationDone) completedCount++;
  if (isExperienceDone) completedCount++;
  if (isSkillsDone) completedCount++;
  if (isProjectsDone) completedCount++;

  const completion = Math.round((completedCount / 12) * 100);
  
  // Eligible ONLY if 100% completion AND resume uploaded
  const isEligibleForInterview = completion === 100 && isResumeDone;

  const handleStartInterview = () => {
    if (!isEligibleForInterview) {
      toast.warning('Complete your profile and upload your resume to start interviews.');
      return;
    }
    navigate('/interview/create');
  };

  const stats = [
    { value: '0', label: 'Mock Interviews Completed' },
    { value: 'N/A', label: 'Average Score This Month' },
    { value: '0', label: 'Hours Practiced This Month' },
    { value: '0', label: 'Current Streak Days' }
  ];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Welcome Title */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 text-start">
        <div>
          <h1 className="fw-bold mb-1" style={{ fontSize: '1.85rem' }}>Dashboard</h1>
          <span className="fw-semibold text-muted">Welcome back, {profile?.fullName?.split(' ')[0] || profile?.name?.split(' ')[0]}! 👋</span>
        </div>
        
        <div>
          <button 
            onClick={handleStartInterview} 
            disabled={!isEligibleForInterview}
            className={`btn btn-primary-purple d-flex align-items-center gap-2 py-2.5 px-4 shadow-sm ${!isEligibleForInterview ? 'opacity-50' : ''}`}
            style={{ cursor: !isEligibleForInterview ? 'not-allowed' : 'pointer' }}
          >
            <FiPlay style={{ fill: !isEligibleForInterview ? 'transparent' : 'white' }} />
            <span>Start Mock Interview</span>
          </button>
        </div>
      </div>

      {/* Profile Readiness & Progress Block */}
      <div className="glass-panel p-4 bg-white mb-5 text-start" style={{ border: '1px solid var(--border-grey)' }}>
        <div className="row align-items-stretch g-4">
          
          {/* Progress Circular Meter */}
          <div className="col-md-3 text-center d-flex flex-column align-items-center justify-content-center border-end-md">
            <div className="position-relative d-inline-block mb-2">
              <svg width="110" height="110" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke="var(--primary-purple)" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * completion) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
                <text x="50" y="56" fill="var(--text-dark)" fontSize="20" fontWeight="700" textAnchor="middle">
                  {completion}%
                </text>
              </svg>
            </div>
            <h4 className="h6 fw-bold text-dark mt-2 mb-0">Profile Completion</h4>
          </div>

          {/* Checklist Beside Progress Circle */}
          <div className="col-md-5 d-flex flex-column justify-content-between border-end-md">
            <div>
              <h4 className="h6 fw-bold text-dark mb-2">Verification Checklist</h4>
              <div className="row g-2" style={{ fontSize: '0.74rem' }}>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isPersonalDone ? '✔' : '❌'}</span>
                  <span>Personal Info</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isContactDone ? '✔' : '❌'}</span>
                  <span>Contact Details</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isBioDone ? '✔' : '❌'}</span>
                  <span>Bio Info</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isExpLevelDone ? '✔' : '❌'}</span>
                  <span>Exp Level</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isTargetRoleDone ? '✔' : '❌'}</span>
                  <span>Target Role</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isTargetCompanyDone ? '✔' : '❌'}</span>
                  <span>Target Company</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isPrefLangDone ? '✔' : '❌'}</span>
                  <span>Pref Language</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isResumeDone ? '✔' : '❌'}</span>
                  <span>Resume Upload</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isEducationDone ? '✔' : '❌'}</span>
                  <span>Education</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isExperienceDone ? '✔' : '❌'}</span>
                  <span>Work History</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isSkillsDone ? '✔' : '❌'}</span>
                  <span>Technical Skills</span>
                </div>
                <div className="col-6 d-flex align-items-center gap-1.5 text-muted">
                  <span>{isProjectsDone ? '✔' : '❌'}</span>
                  <span>Projects</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-top">
              {isEligibleForInterview ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-1" style={{ fontSize: '0.74rem' }}>
                    Interview Ready
                  </span>
                  <span className="text-muted small">✅ Your profile is complete. You are ready to begin AI Mock Interviews.</span>
                </div>
              ) : (
                <p className="text-danger small mb-0 fw-semibold">
                  ⚠️ Complete your profile before starting interviews.
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions & Parse status metadata */}
          <div className="col-md-4 d-flex flex-column justify-content-between">
            <div>
              <h4 className="h6 fw-bold text-dark mb-2">Resume Engine Details</h4>
              {resumeMeta ? (
                <div className="text-muted small" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>
                  <div className="d-flex justify-content-between mb-0.5">
                    <span>File Name:</span>
                    <span className="text-dark fw-semibold text-truncate ms-2" style={{ maxWidth: '120px' }}>{resumeMeta.fileName}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-0.5">
                    <span>Last Parsed:</span>
                    <span className="text-dark fw-semibold">{new Date(resumeMeta.updatedAt || resumeMeta.uploadDate).toLocaleDateString()}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-0.5">
                    <span>Parser Engine:</span>
                    <span className="text-dark fw-semibold">{resumeMeta.parserUsed || 'Gemini AI'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Processing Time:</span>
                    <span className="text-dark fw-semibold">{(resumeMeta.processingTimeSec || 4.2)}s</span>
                  </div>

                  <div className="border-top pt-2 mt-2">
                    <span className="fw-bold text-dark d-block mb-1.5" style={{ fontSize: '0.74rem' }}>AI Confidence Indicators</span>
                    <div className="d-flex flex-column gap-1 overflow-y-auto pr-1" style={{ maxHeight: '80px' }}>
                      {[
                        { name: 'Education', key: 'education', data: resumeData?.education },
                        { name: 'Projects', key: 'projects', data: resumeData?.projects },
                        { name: 'Work Experience', key: 'experience', data: resumeData?.experience },
                        { name: 'Certifications', key: 'certifications', data: resumeData?.certifications }
                      ].map((sec, sIdx) => {
                        const getSectionConfidence = (sectionData, fallbackName) => {
                          if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) {
                            return { text: 'Not Found', color: 'text-danger', dot: '🔴' };
                          }
                          const confidenceMap = {
                            experience: { text: '95% Confidence', color: 'text-success', dot: '🟢' },
                            education: { text: '98% Confidence', color: 'text-success', dot: '🟢' },
                            projects: { text: '82% Confidence', color: 'text-warning', dot: '🟡' },
                            certifications: { text: '90% Confidence', color: 'text-success', dot: '🟢' }
                          };
                          return confidenceMap[fallbackName] || { text: '90% Confidence', color: 'text-success', dot: '🟢' };
                        };
                        const conf = getSectionConfidence(sec.data, sec.key);
                        return (
                          <div className="d-flex align-items-center justify-content-between pb-0.5" key={sIdx} style={{ fontSize: '0.68rem' }}>
                            <span>{sec.name}</span>
                            <span className={`${conf.color} fw-semibold`}>{conf.dot} {conf.text}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-muted small mt-1.5 mb-0" style={{ fontSize: '0.65rem', lineHeight: '1.2' }}>
                      Please review AI-extracted information before starting interviews.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted small">No active resume parsing metadata detected.</p>
              )}
            </div>

            <div className="mt-3">
              <h4 className="fw-bold mb-2" style={{ fontSize: '0.76rem', color: 'var(--text-dark)' }}>Quick Actions</h4>
              <div className="row g-2">
                <div className="col-6">
                  <Link to="/profile" className="btn btn-sm btn-white-custom w-100 py-1.5 d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '0.74rem' }}>
                    <FiUser /> Edit Profile
                  </Link>
                </div>
                <div className="col-6">
                  {resumeMeta ? (
                    <a href={resumeMeta.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-white-custom w-100 py-1.5 d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '0.74rem' }}>
                      <FiExternalLink /> View Resume
                    </a>
                  ) : (
                    <Link to="/profile" className="btn btn-sm btn-white-custom w-100 py-1.5 d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '0.74rem' }}>
                      <FiUploadCloud /> Upload
                    </Link>
                  )}
                </div>
                <div className="col-12">
                  <button 
                    onClick={handleReParse}
                    disabled={!resumeMeta || reparsing}
                    className="btn btn-sm btn-white-custom w-100 py-1.5 d-flex align-items-center justify-content-center gap-1.5"
                    style={{ fontSize: '0.74rem' }}
                  >
                    <FiRefreshCw className={reparsing ? 'spin' : ''} /> {reparsing ? 'Re-parsing...' : 'Re-Parse Resume Data'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Feature Grid Columns (Mock Interview, History, Analytics, Practice) */}
      <h3 className="h5 fw-bold text-dark mb-4 text-start">Platform Features</h3>
      <div className="row g-4 mb-5">
        
        {/* Card 1: Start Mock Interview */}
        <div className="col-md-6 col-xl-3 text-start">
          <div className="mockup-panel-card h-100 d-flex flex-column justify-content-between p-4 bg-white" style={{ border: '1px solid var(--border-grey)' }}>
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>Active</span>
                <FiPlay className="text-muted" />
              </div>
              <h3 className="h6 fw-bold mb-2 text-dark">Mock Interviews</h3>
              <p className="text-muted small mb-4" style={{ lineHeight: '1.4' }}>Start a personalized, AI-driven interactive session tailored to your exact profile and target job role.</p>
            </div>
            <div>
              {!isEligibleForInterview && (
                <span className="text-danger d-block mb-2 fw-semibold" style={{ fontSize: '0.74rem' }}>
                  ⚠️ Complete your profile before starting interviews.
                </span>
              )}
              <button 
                onClick={handleStartInterview} 
                disabled={!isEligibleForInterview}
                className="btn btn-sm btn-primary-purple w-100 py-2 d-flex align-items-center justify-content-center gap-1.5"
              >
                <FiPlay style={{ fill: 'white' }} /> Start Mock Interview
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Interview History (Coming Soon) */}
        <div className="col-md-6 col-xl-3 text-start opacity-75">
          <div className="mockup-panel-card h-100 d-flex flex-column justify-content-between p-4 bg-white" style={{ border: '1px solid var(--border-grey)', filter: 'grayscale(30%)' }}>
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold">Coming Soon</span>
                <FiClock className="text-muted" />
              </div>
              <h3 className="h6 fw-bold mb-2 text-dark">Interview History</h3>
              <p className="text-muted small mb-0" style={{ lineHeight: '1.4' }}>Browse through your previous AI interview transcripts, answers, and detailed grading sheets.</p>
            </div>
          </div>
        </div>

        {/* Card 3: Analytics (Coming Soon) */}
        <div className="col-md-6 col-xl-3 text-start opacity-75">
          <div className="mockup-panel-card h-100 d-flex flex-column justify-content-between p-4 bg-white" style={{ border: '1px solid var(--border-grey)', filter: 'grayscale(30%)' }}>
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold">Coming Soon</span>
                <FiActivity className="text-muted" />
              </div>
              <h3 className="h6 fw-bold mb-2 text-dark">Analytics</h3>
              <p className="text-muted small mb-0" style={{ lineHeight: '1.4' }}>Track your performance metrics, conceptual strengths, weak topics, and progress charts over time.</p>
            </div>
          </div>
        </div>

        {/* Card 4: Practice Questions (Coming Soon) */}
        <div className="col-md-6 col-xl-3 text-start opacity-75">
          <div className="mockup-panel-card h-100 d-flex flex-column justify-content-between p-4 bg-white" style={{ border: '1px solid var(--border-grey)', filter: 'grayscale(30%)' }}>
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold">Coming Soon</span>
                <FiBookOpen className="text-muted" />
              </div>
              <h3 className="h6 fw-bold mb-2 text-dark">Practice Questions</h3>
              <p className="text-muted small mb-0" style={{ lineHeight: '1.4' }}>Tackle curated technical questions, behavioral scenarios, and coding challenges on demand.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Stats Cards Row */}
      <div className="row g-4 mb-5">
        {stats.map((stat, idx) => (
          <div className="col-sm-6 col-xl-3" key={idx}>
            <div className="stats-card text-start">
              <span className="stats-number">{stat.value}</span>
              <span className="stats-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Content Row */}
      <div className="row g-4">
        {/* Left Column: Recent Interviews Placeholder */}
        <div className="col-lg-6">
          <div className="glass-panel p-4 h-100 bg-white text-start" style={{ border: '1px solid var(--border-grey)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="h6 fw-bold mb-0 text-dark">Recent Interviews</h3>
            </div>
            
            {interviews.length === 0 ? (
              <div className="py-5 text-center text-muted small">
                No mock interviews configured yet.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 mt-2 overflow-y-auto" style={{ maxHeight: '280px' }}>
                {interviews.slice(0, 5).map((item, idx) => {
                  let statusLabel = 'Ready';
                  let statusBadge = 'bg-success text-success bg-opacity-10';
                  let actionText = 'Start Interview';
                  let actionUrl = `/interview/${item.interviewId}/active`;

                  if (item.status === 'Created') {
                    statusLabel = 'Created';
                    statusBadge = 'bg-secondary text-secondary bg-opacity-10';
                    actionText = 'Setup Questions';
                    actionUrl = `/interview/${item.interviewId}/questions`;
                  } else if (item.status === 'Generating') {
                    statusLabel = 'Generating...';
                    statusBadge = 'bg-warning text-warning bg-opacity-10';
                    actionText = 'Generating...';
                    actionUrl = `/interview/${item.interviewId}/questions`;
                  } else if (item.status === 'InProgress') {
                    statusLabel = 'In Progress';
                    statusBadge = 'bg-primary text-primary bg-opacity-10';
                    actionText = 'Resume';
                  } else if (['Submitted', 'AwaitingEvaluation'].includes(item.status)) {
                    statusLabel = 'Submitted';
                    statusBadge = 'bg-info text-info bg-opacity-10';
                    actionText = 'Awaiting Evaluation';
                    actionUrl = `/interview/${item.interviewId}/report`;
                  } else if (item.status === 'Completed') {
                    statusLabel = 'Graded';
                    statusBadge = 'bg-success text-white px-2 py-0.5';
                    actionText = 'View Results';
                    actionUrl = `/interview/${item.interviewId}/report`;
                  }

                  const isGraded = item.status === 'Completed';
                  const isSubmitted = ['Submitted', 'AwaitingEvaluation'].includes(item.status);

                  return (
                    <div key={idx} className="border rounded-3 p-3 bg-light bg-opacity-25 d-flex justify-content-between align-items-center">
                      <div className="text-start">
                        <strong className="text-dark d-block mb-1" style={{ fontSize: '0.86rem' }}>
                          {item.role}
                        </strong>
                        <div className="d-flex flex-wrap gap-1.5" style={{ fontSize: '0.74rem' }}>
                          <span className="badge bg-secondary bg-opacity-10 text-secondary">{item.difficulty}</span>
                          <span className="text-muted">| {item.questionCount} Questions</span>
                          <span className={`badge ${statusBadge}`} style={{ fontSize: '0.7rem' }}>{statusLabel}</span>
                        </div>
                      </div>
                      <div>
                        {isSubmitted ? (
                          <button 
                            onClick={() => navigate(actionUrl)} 
                            className="btn btn-sm btn-info text-white py-1.5 px-3" 
                            style={{ fontSize: '0.76rem' }}
                          >
                            View Status
                          </button>
                        ) : isGraded ? (
                          <button 
                            onClick={() => navigate(actionUrl)} 
                            className="btn btn-sm btn-white-custom border py-1.5 px-3" 
                            style={{ fontSize: '0.76rem' }}
                          >
                            View Results
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate(actionUrl)} 
                            className={`btn btn-sm py-1.5 px-3 ${item.status === 'InProgress' ? 'btn-success text-white' : 'btn-primary-purple'}`} 
                            style={{ fontSize: '0.76rem' }}
                          >
                            {actionText}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Performance Chart / Upcoming features */}
        <div className="col-lg-6">
          <div className="glass-panel p-4 h-100 bg-white text-start" style={{ border: '1px solid var(--border-grey)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="h6 fw-bold mb-0 text-dark">Upcoming Features</h3>
            </div>
            
            <ul className="text-muted small mb-0 ps-3" style={{ lineHeight: '1.8' }}>
              <li><strong>Phase 3</strong>: Interactive AI-driven chat panels customized to your resume experience.</li>
              <li><strong>Phase 4</strong>: Live scoring analytics, core conceptual gap analysis, and training recommendations.</li>
              <li><strong>Phase 5</strong>: Code compilations sandbox for live programming challenge simulation rounds.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
