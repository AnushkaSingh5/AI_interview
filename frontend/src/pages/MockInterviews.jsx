import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FiPlay, FiClock, FiActivity, FiAward, FiBookOpen, FiUserCheck, FiSliders, FiArrowLeft, FiPlus
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const MockInterviews = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [profile, setProfile] = useState(null);
  const [resumeMeta, setResumeMeta] = useState(null);
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    fetchPageData();
  }, []);

  const fetchPageData = async () => {
    setLoading(true);
    try {
      // Load user profile context
      const response = await axiosInstance.get('/profile/me');
      if (response.data && response.data.success) {
        setProfile(response.data.user);
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
      console.error('Error fetching mock interviews:', error);
      toast.error('Failed to load page data');
    } finally {
      setLoading(false);
    }
  };

  // Eligibility score calculation (similar to Dashboard)
  const isPersonalDone = !!(profile?.fullName && profile?.email);
  const isContactDone = !!(profile?.contact?.phone || profile?.contact?.location);
  const isBioDone = !!profile?.bio;
  const isExpLevelDone = !!profile?.experienceLevel;
  const isTargetRoleDone = !!profile?.targetRole;
  const isTargetCompanyDone = !!profile?.targetCompany;
  const isPrefLangDone = !!profile?.preferredLanguage;
  const isResumeDone = !!resumeMeta;
  const isEducationDone = !!(resumeData?.education && resumeData.education.length > 0);
  const isExperienceDone = !!(resumeData?.workHistory && resumeData.workHistory.length > 0);
  const isSkillsDone = !!(
    (resumeData?.technicalSkills && resumeData.technicalSkills.length > 0) ||
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
  const isEligibleForInterview = completion === 100 && isResumeDone;

  const handleStartInterview = () => {
    if (!isEligibleForInterview) {
      toast.warning('Complete your profile and upload your resume to start interviews.');
      return;
    }
    navigate('/interview/create');
  };

  // Compute metrics
  const completedInterviews = interviews.filter(item => item.status === 'Completed');
  const avgScore = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) / completedInterviews.length)
    : null;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status" style={{ color: 'var(--primary-purple)' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 text-start">
      {/* Page Title Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">AI Mock Interviews</h2>
          <p className="text-muted small mb-0">Review past reports or launch a new customized interactive AI mock interview.</p>
        </div>
        <button
          onClick={handleStartInterview}
          disabled={!isEligibleForInterview}
          className={`btn btn-primary-purple d-flex align-items-center gap-2 py-2 px-4 shadow-sm ${!isEligibleForInterview ? 'opacity-50' : ''}`}
          style={{ cursor: !isEligibleForInterview ? 'not-allowed' : 'pointer' }}
        >
          <FiPlay style={{ fill: !isEligibleForInterview ? 'transparent' : 'white' }} /> Start Mock Interview
        </button>
      </div>

      {/* Stats Summary Grid Cards */}
      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="glass-panel p-4 bg-white shadow-sm d-flex align-items-center gap-3 h-100" style={{ border: '1px solid var(--border-grey)' }}>
            <div className="p-3 rounded-circle bg-light" style={{ color: 'var(--primary-purple)', backgroundColor: 'var(--primary-purple-light)' }}>
              <FiBookOpen className="fs-4" />
            </div>
            <div>
              <span className="d-block text-muted small fw-semibold">Interviews Taken</span>
              <strong className="fs-4 text-dark">{interviews.length}</strong>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="glass-panel p-4 bg-white shadow-sm d-flex align-items-center gap-3 h-100" style={{ border: '1px solid var(--border-grey)' }}>
            <div className="p-3 rounded-circle bg-light" style={{ color: 'var(--primary-purple)', backgroundColor: 'var(--primary-purple-light)' }}>
              <FiAward className="fs-4" />
            </div>
            <div>
              <span className="d-block text-muted small fw-semibold">Average Performance</span>
              <strong className="fs-4 text-dark">{avgScore !== null ? `${avgScore}%` : 'N/A'}</strong>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="glass-panel p-4 bg-white shadow-sm d-flex align-items-center gap-3 h-100" style={{ border: '1px solid var(--border-grey)' }}>
            <div className="p-3 rounded-circle bg-light" style={{ color: 'var(--primary-purple)', backgroundColor: 'var(--primary-purple-light)' }}>
              <FiUserCheck className="fs-4" />
            </div>
            <div>
              <span className="d-block text-muted small fw-semibold">Profile Completion</span>
              <strong className="fs-4 text-dark">{completion}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Mock Interviews Listing Table */}
      <div className="glass-panel p-4 bg-white shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
        <h3 className="h6 fw-bold text-dark mb-4 border-bottom pb-2">Interview History</h3>

        {interviews.length === 0 ? (
          <div className="py-5 text-center text-muted">
            <FiClock className="display-4 mb-3 text-muted opacity-50" />
            <p className="small mb-4">No mock interviews created yet.</p>
            <button 
              onClick={handleStartInterview} 
              disabled={!isEligibleForInterview}
              className="btn btn-sm btn-primary-purple px-4 py-2"
            >
              Start New Mock Interview
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
              <thead>
                <tr className="table-light">
                  <th scope="col" className="text-muted ps-3">Role / Title</th>
                  <th scope="col" className="text-muted">Difficulty</th>
                  <th scope="col" className="text-muted">Question Count</th>
                  <th scope="col" className="text-muted">Status</th>
                  <th scope="col" className="text-muted">Score</th>
                  <th scope="col" className="text-muted text-end pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((item, idx) => {
                  let statusLabel = 'Ready';
                  let statusBadge = 'bg-success text-success bg-opacity-10';
                  let actionText = 'Start';
                  let actionUrl = `/interview/${item.interviewId}/active`;

                  if (item.status === 'Created') {
                    statusLabel = 'Created';
                    statusBadge = 'bg-secondary text-secondary bg-opacity-10';
                    actionText = 'Setup';
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
                    actionUrl = `/interview/${item.interviewId}/active`;
                  } else if (['Submitted', 'AwaitingEvaluation'].includes(item.status)) {
                    statusLabel = 'Awaiting Eval';
                    statusBadge = 'bg-info text-info bg-opacity-10';
                    actionText = 'View Report';
                    actionUrl = `/interview/${item.interviewId}/report`;
                  } else if (item.status === 'Completed') {
                    statusLabel = 'Graded';
                    statusBadge = 'bg-success text-success bg-opacity-10';
                    actionText = 'View Report';
                    actionUrl = `/interview/${item.interviewId}/report`;
                  }

                  const scoreText = item.status === 'Completed' ? `${item.overallScore || 0}%` : 'N/A';

                  return (
                    <tr key={idx}>
                      <td className="ps-3">
                        <strong className="text-dark d-block mb-0.5">{item.role}</strong>
                        <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                          {item.title} • {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary">{item.difficulty}</span>
                      </td>
                      <td>{item.questionCount || 5} Questions</td>
                      <td>
                        <span className={`badge ${statusBadge}`} style={{ fontSize: '0.7rem' }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>{scoreText}</td>
                      <td className="text-end pe-3">
                        {item.status === 'Generating' ? (
                          <button disabled className="btn btn-sm btn-white-custom py-1 px-3 opacity-75 cursor-not-allowed">
                            Processing
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate(actionUrl)} 
                            className={`btn btn-sm py-1 px-3 ${
                              item.status === 'InProgress' 
                                ? 'btn-success text-white' 
                                : item.status === 'Completed' 
                                  ? 'btn-white-custom border' 
                                  : 'btn-primary-purple'
                            }`}
                            style={{ fontSize: '0.78rem' }}
                          >
                            {actionText}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockInterviews;
