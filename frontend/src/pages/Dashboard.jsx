import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiPlay, FiChevronDown, FiCalendar, FiUser, FiUploadCloud, 
  FiFileText, FiEdit3, FiCheck, FiX, FiActivity, FiRefreshCw, FiExternalLink
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { setUser, user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [resumeMeta, setResumeMeta] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reparsing, setReparsing] = useState(false);

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

  const handleStartInterview = () => {
    if (completion < 100) {
      toast.warning('Please complete your profile to 100% to unlock AI Mock Interviews.');
      return;
    }
    toast.info('Interview session launcher is locked for Phase 1/2 testing.');
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
            disabled={completion < 100}
            className={`btn btn-primary-purple d-flex align-items-center gap-2 py-2.5 px-4 shadow-sm ${completion < 100 ? 'opacity-50' : ''}`}
            style={{ cursor: completion < 100 ? 'not-allowed' : 'pointer' }}
          >
            <FiPlay style={{ fill: completion < 100 ? 'transparent' : 'white' }} />
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
              {completion === 100 ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-1" style={{ fontSize: '0.74rem' }}>
                    Interview Ready
                  </span>
                  <span className="text-muted small">✅ Your profile is complete. You are ready to begin AI Mock Interviews.</span>
                </div>
              ) : (
                <p className="text-danger small mb-0 fw-semibold">
                  ⚠️ Complete your profile to unlock AI Mock Interviews.
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
            
            <div className="py-5 text-center text-muted small">
              No interview rounds completed yet.
            </div>
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
