import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  FiFileText, FiDownload, FiTrash2, FiRefreshCw, FiCheckCircle, 
  FiEdit, FiPlus, FiSave, FiUser, FiBriefcase, FiBookOpen, 
  FiCode, FiAward, FiArrowRight, FiInfo, FiSliders, FiBell,
  FiUploadCloud
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import defaultAvatar from '../assets/avatar.png';

const Profile = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  
  // Data States
  const [profile, setProfile] = useState(null);
  const [resumeMeta, setResumeMeta] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  
  // Sync backups for unsaved changes tracking
  const [profileBackup, setProfileBackup] = useState(null);
  const [resumeDataBackup, setResumeDataBackup] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit toggles for the cards
  const [editPersonal, setEditPersonal] = useState(false);
  const [editWork, setEditWork] = useState(false);
  const [editEdu, setEditEdu] = useState(false);
  const [editProjects, setEditProjects] = useState(false);
  
  // Skills Category Edit Toggles
  const [editLang, setEditLang] = useState(false);
  const [editFrameworks, setEditFrameworks] = useState(false);
  const [editDatabases, setEditDatabases] = useState(false);
  const [editTools, setEditTools] = useState(false);
  const [editTechSkills, setEditTechSkills] = useState(false);
  const [editSoftSkills, setEditSoftSkills] = useState(false);
  
  // New section cards toggles
  const [editCerts, setEditCerts] = useState(false);
  const [editAchievements, setEditAchievements] = useState(false);
  const [editInterests, setEditInterests] = useState(false);

  // Local inputs for adding tags
  const [newLangInput, setNewLangInput] = useState('');
  const [newFrameworkInput, setNewFrameworkInput] = useState('');
  const [newDatabaseInput, setNewDatabaseInput] = useState('');
  const [newToolInput, setNewToolInput] = useState('');
  const [newTechSkillInput, setNewTechSkillInput] = useState('');
  const [newSoftSkillInput, setNewSoftSkillInput] = useState('');
  const [newCertInput, setNewCertInput] = useState('');
  const [newAchievementInput, setNewAchievementInput] = useState('');
  const [newInterestInput, setNewInterestInput] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // 1. Fetch latest profile
      const profRes = await axiosInstance.get('/users/profile');
      if (profRes.data && profRes.data.success) {
        const userObj = profRes.data.user;
        setProfile(userObj);
        setProfileBackup(JSON.stringify(userObj));
        setUser(userObj);

        // 2. Fetch resume details
        const resRes = await axiosInstance.get('/resume');
        if (resRes.data && resRes.data.success) {
          setResumeMeta(resRes.data.resume);
        } else {
          setResumeMeta(null);
        }

        // 3. Fetch structured resume data
        const dataRes = await axiosInstance.get('/resume/data');
        if (dataRes.data && dataRes.data.success && dataRes.data.resumeData) {
          const rData = dataRes.data.resumeData;
          setResumeData(rData);
          setResumeDataBackup(JSON.stringify(rData));
        } else {
          setResumeData(null);
          setResumeDataBackup(null);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  // Drag-and-drop resume upload handler
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    try {
      const response = await axiosInstance.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      if (response.data && response.data.success) {
        toast.success('Resume uploaded and parsed successfully!');
        
        // Sync states immediately
        setProfile(response.data.user);
        setProfileBackup(JSON.stringify(response.data.user));
        setUser(response.data.user);
        setResumeMeta(response.data.resume);
        
        const rData = response.data.resumeData;
        setResumeData(rData);
        setResumeDataBackup(JSON.stringify(rData));
        
        // Close edit states
        setEditPersonal(false);
        setEditWork(false);
        setEditEdu(false);
        setEditProjects(false);
        setEditLang(false);
        setEditFrameworks(false);
        setEditDatabases(false);
        setEditTools(false);
        setEditTechSkills(false);
        setEditSoftSkills(false);
        setEditCerts(false);
        setEditAchievements(false);
        setEditInterests(false);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Resume upload failed.';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    }
  });

  // Delete resume handler
  const handleDeleteResume = async () => {
    try {
      const response = await axiosInstance.delete('/resume');
      if (response.data && response.data.success) {
        toast.success('Resume deleted successfully. Profile details preserved.');
        setResumeMeta(null);
        // Fetch fresh profile
        const profRes = await axiosInstance.get('/users/profile');
        if (profRes.data && profRes.data.success) {
          setProfile(profRes.data.user);
          setProfileBackup(JSON.stringify(profRes.data.user));
          setUser(profRes.data.user);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete resume.');
    }
  };

  // Re-parse trigger
  const handleReParse = async () => {
    if (!resumeMeta) return;
    toast.info('Re-initiating resume parsing with Gemini...');
    
    setUploading(true);
    try {
      const response = await axiosInstance.post('/resume/reparse');
      if (response.data && response.data.success) {
        toast.success('Resume parsed successfully!');
        setResumeMeta(response.data.resume);
        const rData = response.data.resumeData;
        setResumeData(rData);
        setResumeDataBackup(JSON.stringify(rData));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Re-parsing failed');
    } finally {
      setUploading(false);
    }
  };

  // Generic tag list handlers
  const handleTagAdd = (section, val, clearInputCallback) => {
    const cleanVal = val.trim();
    if (!cleanVal) return;

    const currentList = resumeData?.[section] || [];
    if (currentList.includes(cleanVal)) {
      toast.warning('Item is already listed');
      return;
    }

    const updatedData = {
      ...(resumeData || {}),
      [section]: [...currentList, cleanVal]
    };
    
    setResumeData(updatedData);
    clearInputCallback('');
  };

  const handleTagRemove = (section, tagToRemove) => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      [section]: (resumeData[section] || []).filter(t => t !== tagToRemove)
    });
  };

  // Array handlers for objects (experience, education, projects)
  const handleArrayObjectChange = (section, index, field, value) => {
    const currentList = resumeData?.[section] || [];
    const updatedArray = [...currentList];
    updatedArray[index] = {
      ...updatedArray[index],
      [field]: value
    };
    setResumeData({ ...resumeData, [section]: updatedArray });
  };

  const handleAddArrayItem = (section, defaultObj) => {
    const currentList = resumeData?.[section] || [];
    setResumeData({
      ...(resumeData || {}),
      [section]: [...currentList, defaultObj]
    });
  };

  const handleRemoveArrayItem = (section, index) => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      [section]: (resumeData[section] || []).filter((_, idx) => idx !== index)
    });
  };

  // Save all changes to backend
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // 1. Save general user profile fields
      const profUpdateObj = {
        fullName: profile?.fullName || profile?.name,
        name: profile?.fullName || profile?.name,
        phone: profile?.phone,
        bio: profile?.bio,
        experienceLevel: profile?.experienceLevel,
        targetRole: profile?.targetRole,
        targetCompany: profile?.targetCompany,
        preferredLanguage: profile?.preferredLanguage
      };
      
      const profileResponse = await axiosInstance.put('/users/profile', profUpdateObj);
      if (profileResponse.data && profileResponse.data.success) {
        setProfile(profileResponse.data.user);
        setProfileBackup(JSON.stringify(profileResponse.data.user));
        setUser(profileResponse.data.user);
      }

      // 2. Save structured resume data if available
      if (resumeData) {
        const updatedResumeData = {
          ...resumeData,
          personalInformation: {
            ...resumeData.personalInformation,
            name: profile?.fullName || profile?.name || '',
            phone: profile?.phone || '',
            bio: profile?.bio || ''
          }
        };

        const resumeResponse = await axiosInstance.put('/resume/data', updatedResumeData);
        if (resumeResponse.data && resumeResponse.data.success) {
          const rData = resumeResponse.data.resumeData;
          setResumeData(rData);
          setResumeDataBackup(JSON.stringify(rData));
        }
      }

      setLastSaved(new Date().toLocaleTimeString());
      toast.success('Information saved and synchronized successfully!');
      return true;
    } catch (error) {
      console.error('Error saving profile changes:', error);
      toast.error('Failed to save modifications.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Local card save actions
  const handleLocalCardSave = async (editToggleCallback) => {
    const success = await handleSaveChanges();
    if (success) {
      editToggleCallback(false);
    }
  };

  // Local card cancel action
  const handleLocalCardCancel = async (editToggleCallback) => {
    editToggleCallback(false);
    await fetchUserData(); // Restores values from MongoDB
    toast.info('Changes discarded.');
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

  // Compare backup strings to calculate unsaved modifications status
  const hasUnsavedChanges = 
    (profile && JSON.stringify(profile) !== profileBackup) ||
    (resumeData && JSON.stringify(resumeData) !== resumeDataBackup);

  // Shimmer skeleton loading
  if (loading) {
    const shimmerBoxStyle = {
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s infinite',
      borderRadius: '12px'
    };

    return (
      <div className="container py-4 text-start">
        <style>{`
          @keyframes skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
        <div style={{ ...shimmerBoxStyle, height: '40px', width: '220px', marginBottom: '2rem' }}></div>
        <div className="row g-4 mb-4">
          <div className="col-md-4"><div style={{ ...shimmerBoxStyle, height: '320px' }}></div></div>
          <div className="col-md-4"><div style={{ ...shimmerBoxStyle, height: '320px' }}></div></div>
          <div className="col-md-4"><div style={{ ...shimmerBoxStyle, height: '320px' }}></div></div>
        </div>
        <div style={{ ...shimmerBoxStyle, height: '240px', width: '100%', marginBottom: '2rem' }}></div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Welcome Title */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="fw-bold mb-1" style={{ fontSize: '1.85rem', letterSpacing: '-0.025em' }}>Profile & Resume Settings</h1>
          <p className="text-muted small mb-0">Configure your career parameters and manage your synchronized AI resume database</p>
        </div>
      </div>

      {/* Row 1: Profile checklist, Resume File Manager, Resume Overview Stats */}
      <div className="row g-4 mb-5">
        
        {/* Card 1: Checklist progress */}
        <div className="col-lg-4">
          <div className="mockup-panel-card d-flex flex-column h-100">
            <h3 className="h6 fw-bold mb-3 text-dark">Profile Verification checklist</h3>
            <div className="d-flex align-items-center gap-4 mb-4">
              <svg width="84" height="84" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8.5" fill="none" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="var(--primary-purple)" 
                  strokeWidth="8.5" 
                  fill="none" 
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * completion) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.65s ease-out' }}
                />
                <text x="50" y="55" fill="var(--text-dark)" fontSize="20" fontWeight="700" textAnchor="middle" style={{ transform: 'rotate(90deg) translate(0px, -92px)' }}>
                  {completion}%
                </text>
              </svg>
              <div>
                {completion === 100 ? (
                  <div>
                    <span className="badge bg-success bg-opacity-10 text-success fw-bold mb-1.5 px-2.5 py-1">
                      ✅ Interview Ready
                    </span>
                    <p className="text-muted mb-0" style={{ fontSize: '0.74rem', lineHeight: '1.3' }}>Your profile is fully optimized to launch mock interviews!</p>
                  </div>
                ) : (
                  <div>
                    <span className="badge bg-danger bg-opacity-10 text-danger fw-bold mb-1.5 px-2.5 py-1">
                      ⚠️ Action Required
                    </span>
                    <p className="text-muted mb-0" style={{ fontSize: '0.74rem', lineHeight: '1.3' }}>Complete missing sections to unlock AI mock interviews.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist items list */}
            <div className="d-flex flex-column gap-1.5 flex-grow-1 overflow-y-auto pr-1" style={{ fontSize: '0.74rem', maxHeight: '180px' }}>
              {[
                { label: 'Personal Information', val: isPersonalDone },
                { label: 'Contact Details', val: isContactDone },
                { label: 'Summary Bio', val: isBioDone },
                { label: 'Experience Level', val: isExpLevelDone },
                { label: 'Target Job Role', val: isTargetRoleDone },
                { label: 'Target Company', val: isTargetCompanyDone },
                { label: 'Preferred Language', val: isPrefLangDone },
                { label: 'Resume Uploaded', val: isResumeDone },
                { label: 'Education', val: isEducationDone },
                { label: 'Work Experience', val: isExperienceDone },
                { label: 'Technical Skills', val: isSkillsDone },
                { label: 'Projects', val: isProjectsDone }
              ].map((item, idx) => (
                <div className="d-flex align-items-center justify-content-between border-bottom pb-1" key={idx}>
                  <span className="text-muted">{item.label}</span>
                  <span className={`mockup-check-dot ${item.val ? 'checked' : 'unchecked'}`}></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Resume Manager / Upload area */}
        <div className="col-lg-4">
          <div className="mockup-panel-card d-flex flex-column h-100">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h3 className="h6 fw-bold mb-0 text-dark">Resume Upload</h3>
              {resumeMeta && (
                <span className="badge bg-success bg-opacity-10 text-success fw-semibold px-2 py-1" style={{ fontSize: '0.68rem' }}>Uploaded</span>
              )}
            </div>

            {resumeMeta ? (
              <div className="flex-grow-1 d-flex flex-column justify-content-between">
                <div className="d-flex align-items-center gap-3 border p-2.5 rounded-3 bg-light bg-opacity-50">
                  <div className="pdf-icon-card">
                    <FiFileText className="fs-4" />
                  </div>
                  <div style={{ wordBreak: 'break-all', minWidth: '0', fontSize: '0.72rem' }}>
                    <h4 className="fw-bold mb-0.5 text-truncate" style={{ fontSize: '0.82rem' }}>{resumeMeta.fileName}</h4>
                    <p className="text-muted mb-0">Format: {resumeMeta.fileType?.toUpperCase()}</p>
                    <p className="text-muted mb-0">Uploaded: {new Date(resumeMeta.uploadDate).toLocaleDateString()}</p>
                    <p className="text-muted mb-0">Last Updated: {new Date(resumeMeta.updatedAt || resumeMeta.uploadDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="d-flex gap-2 my-3">
                  <a 
                    href={resumeMeta.fileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-sm btn-white-custom flex-grow-1 py-1.5 px-2 d-flex align-items-center justify-content-center gap-1.5"
                    style={{ fontSize: '0.74rem' }}
                  >
                    View
                  </a>
                  <a 
                    href={resumeMeta.fileUrl} 
                    download={resumeMeta.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-white-custom flex-grow-1 py-1.5 px-2 d-flex align-items-center justify-content-center gap-1.5"
                    style={{ fontSize: '0.74rem' }}
                  >
                    <FiDownload /> Download
                  </a>
                  <button 
                    onClick={handleDeleteResume}
                    className="btn btn-sm btn-outline-danger py-1.5 px-2.5 d-flex align-items-center justify-content-center"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted small flex-grow-1 d-flex align-items-center justify-content-center">
                <span>No resume uploaded yet. Drag a PDF or DOCX file below.</span>
              </div>
            )}

            {/* Dropzone area at bottom */}
            <div 
              {...getRootProps()} 
              className={`border border-dashed rounded-3 p-3 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-primary bg-light' : 'border-secondary-subtle'
              }`}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              ) : (
                <div>
                  <FiUploadCloud className="text-primary mb-1.5" style={{ color: 'var(--primary-purple)', fontSize: '1.25rem' }} />
                  <h4 className="fw-bold mb-0.5 text-dark" style={{ fontSize: '0.8rem' }}>
                    {resumeMeta ? 'Replace Resume File' : 'Upload New Resume'}
                  </h4>
                  <p className="text-muted mb-0" style={{ fontSize: '0.68rem' }}>
                    PDF, DOC, DOCX (Max 5MB)
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Card 3: Expanded Parsed Resume Overview stats */}
        <div className="col-lg-4">
          <div className="mockup-panel-card d-flex flex-column h-100">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h3 className="h6 fw-bold mb-0 text-dark">Parsed Resume Overview</h3>
              {resumeData && (
                <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2 py-1" style={{ fontSize: '0.68rem', backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>Auto Parsed</span>
              )}
            </div>

            <div className="d-flex flex-column gap-2 mb-3 text-muted overflow-y-auto flex-grow-1 pr-1" style={{ fontSize: '0.82rem', maxHeight: '180px' }}>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Personal Information</span>
                <span className="text-success fw-bold">Extracted</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Work Experience</span>
                <span className="text-dark fw-semibold">{resumeData?.experience?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Education</span>
                <span className="text-dark fw-semibold">{resumeData?.education?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Programming Languages</span>
                <span className="text-dark fw-semibold">{resumeData?.programmingLanguages?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Frameworks</span>
                <span className="text-dark fw-semibold">{resumeData?.frameworks?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Databases</span>
                <span className="text-dark fw-semibold">{resumeData?.databases?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Developer Tools</span>
                <span className="text-dark fw-semibold">{resumeData?.tools?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Technical Skills</span>
                <span className="text-dark fw-semibold">{resumeData?.technicalSkills?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Soft Skills</span>
                <span className="text-dark fw-semibold">{resumeData?.softSkills?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Certifications</span>
                <span className="text-dark fw-semibold">{resumeData?.certifications?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Achievements</span>
                <span className="text-dark fw-semibold">{resumeData?.achievements?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                <span>Interests</span>
                <span className="text-dark fw-semibold">{resumeData?.interests?.length || 0} found</span>
              </div>
              <div className="d-flex align-items-center justify-content-between pb-1">
                <span>Projects</span>
                <span className="text-dark fw-semibold">{resumeData?.projects?.length || 0} found</span>
              </div>
            </div>

            {/* Parser statistics metadata */}
            {resumeMeta && (
              <div className="mt-auto border-top pt-2.5" style={{ fontSize: '0.74rem' }}>
                <div className="d-flex justify-content-between mb-0.5">
                  <span className="text-muted">Status:</span>
                  <span className="text-success fw-bold">{resumeMeta.parsingStatus || 'Parsed Successfully'}</span>
                </div>
                <div className="d-flex justify-content-between mb-0.5">
                  <span className="text-muted">Parser Engine:</span>
                  <span className="text-dark fw-semibold">{resumeMeta.parserUsed || 'Gemini AI'}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Processing Time:</span>
                  <span className="text-dark fw-semibold">{(resumeMeta.processingTimeSec || 4.2)}s</span>
                </div>
              </div>
            )}

            <button 
              onClick={handleReParse}
              disabled={!resumeMeta || uploading}
              className="btn btn-white-custom w-100 py-2 mt-3.5 d-flex align-items-center justify-content-center gap-2"
              style={{ fontSize: '0.82rem' }}
            >
              <FiRefreshCw className={uploading ? 'spin' : ''} /> Re-parse Resume
            </button>
          </div>
        </div>

      </div>

      {/* Row 2: Personal Profile Details card */}
      <div className="mockup-panel-card mb-5 text-start">
        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
          <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <FiUser style={{ color: 'var(--primary-purple)' }} />
            <span>Personal Profile Details</span>
          </h4>
          <button 
            type="button" 
            className={`btn p-1.5 border-0 rounded-circle ${editPersonal ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`}
            onClick={() => setEditPersonal(!editPersonal)}
          >
            <FiEdit />
          </button>
        </div>

        {editPersonal ? (
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label-mock">Full Name</label>
              <input 
                type="text" 
                className="input-mock" 
                value={profile?.fullName || profile?.name || ''} 
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value, name: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label-mock">Phone Number</label>
              <input 
                type="text" 
                className="input-mock" 
                value={profile?.phone || ''} 
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label-mock">Experience Level</label>
              <select 
                className="input-mock"
                value={profile?.experienceLevel || 'Beginner'}
                onChange={(e) => setProfile({ ...profile, experienceLevel: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label-mock">Target Job Role</label>
              <input 
                type="text" 
                className="input-mock" 
                value={profile?.targetRole || ''} 
                onChange={(e) => setProfile({ ...profile, targetRole: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label-mock">Target Company</label>
              <input 
                type="text" 
                className="input-mock" 
                value={profile?.targetCompany || ''} 
                onChange={(e) => setProfile({ ...profile, targetCompany: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label-mock">Preferred Language</label>
              <input 
                type="text" 
                className="input-mock" 
                value={profile?.preferredLanguage || ''} 
                onChange={(e) => setProfile({ ...profile, preferredLanguage: e.target.value })}
              />
            </div>
            <div className="col-12">
              <label className="form-label-mock">Short Bio</label>
              <textarea 
                className="input-mock text-start" 
                rows="3" 
                style={{ resize: 'none' }}
                value={profile?.bio || ''} 
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>

            <div className="col-12 d-flex justify-content-end gap-2 mt-3">
              <button 
                type="button" 
                className="btn btn-sm btn-white-custom py-2 px-3"
                onClick={() => handleLocalCardCancel(setEditPersonal)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-primary-purple py-2 px-4"
                onClick={() => handleLocalCardSave(setEditPersonal)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="row g-3 text-start">
            <div className="col-md-4">
              <span className="text-muted small d-block">Full Name</span>
              <strong className="text-dark small">{profile?.fullName || profile?.name || 'Not provided'}</strong>
            </div>
            <div className="col-md-4">
              <span className="text-muted small d-block">Phone Number</span>
              <strong className="text-dark small">{profile?.phone || 'Not provided'}</strong>
            </div>
            <div className="col-md-4">
              <span className="text-muted small d-block">Experience Level</span>
              <strong className="text-dark small">{profile?.experienceLevel || 'Beginner'}</strong>
            </div>
            <div className="col-md-4">
              <span className="text-muted small d-block">Target Job Role</span>
              <strong className="text-dark small">{profile?.targetRole || 'Not provided'}</strong>
            </div>
            <div className="col-md-4">
              <span className="text-muted small d-block">Target Company</span>
              <strong className="text-dark small">{profile?.targetCompany || 'Not provided'}</strong>
            </div>
            <div className="col-md-4">
              <span className="text-muted small d-block">Preferred Language</span>
              <strong className="text-dark small">{profile?.preferredLanguage || 'Not provided'}</strong>
            </div>
            <div className="col-12">
              <span className="text-muted small d-block">Short Bio</span>
              <p className="text-dark mb-0 small lh-base" style={{ whiteSpace: 'pre-wrap' }}>
                {profile?.bio || 'Not provided'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Bottom Extracted Information layout */}
      <div className="mb-5">
        <div id="editor-grid-title" className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2 text-start">
          <div>
            <h2 className="fw-bold mb-1" style={{ fontSize: '1.35rem' }}>Extracted Resume Details</h2>
            <p className="text-muted small mb-0">Modify, add or remove structural parameters synced to your MongoDB profile</p>
          </div>
          <div className="d-flex align-items-center gap-3">
            {hasUnsavedChanges && (
              <span className="badge bg-warning text-dark fw-bold px-2.5 py-1.5 animate-pulse" style={{ fontSize: '0.76rem' }}>
                ⚠️ Unsaved Changes
              </span>
            )}
            {lastSaved && (
              <span className="text-muted small" style={{ fontSize: '0.76rem' }}>
                Last Saved: {lastSaved}
              </span>
            )}
            <button 
              onClick={handleSaveChanges} 
              disabled={saving} 
              className="btn btn-primary-purple py-2 px-4 shadow-sm"
            >
              <FiSave className="me-2" />
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>

        {/* 12-Card Grid Layout with Same Height Cards */}
        <div className="row g-4 row-cols-1 row-cols-md-2 row-cols-xl-3">
          
          {/* Card 1: Work Experience */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiBriefcase className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Work Experience</span>
                  </h4>
                  <button 
                    type="button" 
                    className={`btn p-1 border-0 rounded-circle ${editWork ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`}
                    onClick={() => setEditWork(!editWork)}
                  >
                    <FiEdit />
                  </button>
                </div>

                <div className="d-flex flex-column gap-3 overflow-y-auto pr-1" style={{ maxHeight: '320px' }}>
                  {!resumeData || !resumeData.experience || resumeData.experience.length === 0 ? (
                    <div className="py-4 text-center text-muted small">No Experience Added</div>
                  ) : (
                    resumeData.experience.map((exp, idx) => (
                      <div key={idx} className="position-relative border-bottom pb-2 mb-2">
                        {editWork ? (
                          <div className="card p-2 bg-light border-0">
                            <button 
                              type="button" 
                              className="btn btn-sm text-danger position-absolute top-0 end-0 m-1 border-0"
                              onClick={() => handleRemoveArrayItem('experience', idx)}
                            >
                              <FiTrash2 />
                            </button>
                            <div className="mb-2">
                              <label className="form-label-mock">Job Position</label>
                              <input type="text" className="input-mock" value={exp.position} onChange={(e) => handleArrayObjectChange('experience', idx, 'position', e.target.value)} />
                            </div>
                            <div className="mb-2">
                              <label className="form-label-mock">Company</label>
                              <input type="text" className="input-mock" value={exp.company} onChange={(e) => handleArrayObjectChange('experience', idx, 'company', e.target.value)} />
                            </div>
                            <div className="row g-2 mb-2">
                              <div className="col-6">
                                <label className="form-label-mock">Start</label>
                                <input type="text" className="input-mock" value={exp.startDate} onChange={(e) => handleArrayObjectChange('experience', idx, 'startDate', e.target.value)} />
                              </div>
                              <div className="col-6">
                                <label className="form-label-mock">End</label>
                                <input type="text" className="input-mock" value={exp.endDate} onChange={(e) => handleArrayObjectChange('experience', idx, 'endDate', e.target.value)} />
                              </div>
                            </div>
                            <div>
                              <label className="form-label-mock">Description</label>
                              <textarea rows="2" className="input-mock" value={exp.description} onChange={(e) => handleArrayObjectChange('experience', idx, 'description', e.target.value)}></textarea>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="d-flex justify-content-between align-items-start">
                              <h5 className="fw-bold mb-0.5 text-dark" style={{ fontSize: '0.84rem' }}>{exp.position}</h5>
                              <span className="text-muted" style={{ fontSize: '0.72rem' }}>{exp.startDate} - {exp.endDate}</span>
                            </div>
                            <span className="text-muted d-block mb-1.5" style={{ fontSize: '0.78rem' }}>{exp.company}</span>
                            <p className="text-muted small mb-0 lh-sm" style={{ fontSize: '0.75rem' }}>{exp.description}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {editWork ? (
                <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-auto w-100">
                  <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditWork)}>Cancel</button>
                  <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditWork)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    handleAddArrayItem('experience', { company: 'New Company', position: 'New Position', startDate: 'Date', endDate: 'Date', description: '' });
                    setEditWork(true);
                  }}
                  className="grid-add-action-btn border-top pt-2 mt-auto w-100"
                >
                  <FiPlus /> Add Work Experience
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Education */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiBookOpen className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Education</span>
                  </h4>
                  <button 
                    type="button" 
                    className={`btn p-1 border-0 rounded-circle ${editEdu ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`}
                    onClick={() => setEditEdu(!editEdu)}
                  >
                    <FiEdit />
                  </button>
                </div>

                <div className="d-flex flex-column gap-3 overflow-y-auto pr-1" style={{ maxHeight: '320px' }}>
                  {!resumeData || !resumeData.education || resumeData.education.length === 0 ? (
                    <div className="py-4 text-center text-muted small">No Education Added</div>
                  ) : (
                    resumeData.education.map((edu, idx) => (
                      <div key={idx} className="position-relative border-bottom pb-2 mb-2">
                        {editEdu ? (
                          <div className="card p-2 bg-light border-0">
                            <button 
                              type="button" 
                              className="btn btn-sm text-danger position-absolute top-0 end-0 m-1 border-0"
                              onClick={() => handleRemoveArrayItem('education', idx)}
                            >
                              <FiTrash2 />
                            </button>
                            <div className="mb-2">
                              <label className="form-label-mock">Degree / Course</label>
                              <input type="text" className="input-mock" value={edu.degree || edu.fieldOfStudy} onChange={(e) => handleArrayObjectChange('education', idx, 'degree', e.target.value)} />
                            </div>
                            <div className="mb-2">
                              <label className="form-label-mock">Institution</label>
                              <input type="text" className="input-mock" value={edu.institution} onChange={(e) => handleArrayObjectChange('education', idx, 'institution', e.target.value)} />
                            </div>
                            <div className="row g-2">
                              <div className="col-6">
                                <label className="form-label-mock">Dates</label>
                                <input type="text" className="input-mock" placeholder="Start - End" value={edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : edu.startDate || ''} onChange={(e) => {
                                  const dates = e.target.value.split('-');
                                  handleArrayObjectChange('education', idx, 'startDate', dates[0]?.trim() || '');
                                  handleArrayObjectChange('education', idx, 'endDate', dates[1]?.trim() || '');
                                }} />
                              </div>
                              <div className="col-6">
                                <label className="form-label-mock">Grade/GPA</label>
                                <input type="text" className="input-mock" value={edu.gpa} onChange={(e) => handleArrayObjectChange('education', idx, 'gpa', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h5 className="fw-bold mb-0.5 text-dark" style={{ fontSize: '0.84rem' }}>{edu.degree || edu.fieldOfStudy}</h5>
                            <span className="text-muted d-block small mb-1">{edu.institution}</span>
                            <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.72rem' }}>
                              <span>{edu.startDate} - {edu.endDate}</span>
                              {edu.gpa && <span>GPA: {edu.gpa}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {editEdu ? (
                <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-auto w-100">
                  <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditEdu)}>Cancel</button>
                  <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditEdu)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    handleAddArrayItem('education', { institution: 'New University', degree: 'Degree Details', startDate: '', endDate: '', gpa: '' });
                    setEditEdu(true);
                  }}
                  className="grid-add-action-btn border-top pt-2 mt-auto w-100"
                >
                  <FiPlus /> Add Education
                </button>
              )}
            </div>
          </div>

          {/* Card 3: Projects */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiCode className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Projects</span>
                  </h4>
                  <button 
                    type="button" 
                    className={`btn p-1 border-0 rounded-circle ${editProjects ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`}
                    onClick={() => setEditProjects(!editProjects)}
                  >
                    <FiEdit />
                  </button>
                </div>

                <div className="d-flex flex-column gap-3 overflow-y-auto pr-1" style={{ maxHeight: '320px' }}>
                  {!resumeData || !resumeData.projects || resumeData.projects.length === 0 ? (
                    <div className="py-4 text-center text-muted small">No Projects Added</div>
                  ) : (
                    resumeData.projects.map((proj, idx) => (
                      <div key={idx} className="position-relative border-bottom pb-2 mb-2">
                        {editProjects ? (
                          <div className="card p-2 bg-light border-0">
                            <button 
                              type="button" 
                              className="btn btn-sm text-danger position-absolute top-0 end-0 m-1 border-0"
                              onClick={() => handleRemoveArrayItem('projects', idx)}
                            >
                              <FiTrash2 />
                            </button>
                            <div className="mb-2">
                              <label className="form-label-mock">Title</label>
                              <input type="text" className="input-mock" value={proj.title} onChange={(e) => handleArrayObjectChange('projects', idx, 'title', e.target.value)} />
                            </div>
                            <div className="mb-2">
                              <label className="form-label-mock">Description</label>
                              <textarea rows="2" className="input-mock" value={proj.description} onChange={(e) => handleArrayObjectChange('projects', idx, 'description', e.target.value)}></textarea>
                            </div>
                            <div>
                              <label className="form-label-mock">Tech Used (comma separated)</label>
                              <input type="text" className="input-mock" value={proj.technologies?.join(', ') || ''} onChange={(e) => handleArrayObjectChange('projects', idx, 'technologies', e.target.value.split(',').map(t => t.trim()))} />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h5 className="fw-bold mb-0.5 text-dark" style={{ fontSize: '0.84rem' }}>{proj.title}</h5>
                            <p className="text-muted small mb-1 lh-sm">{proj.description}</p>
                            {proj.technologies?.length > 0 && <span className="small text-primary d-block" style={{ fontSize: '0.7rem' }}>Tech: {proj.technologies.join(', ')}</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {editProjects ? (
                <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-auto w-100">
                  <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditProjects)}>Cancel</button>
                  <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditProjects)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    handleAddArrayItem('projects', { title: 'New Project', description: '', technologies: [] });
                    setEditProjects(true);
                  }}
                  className="grid-add-action-btn border-top pt-2 mt-auto w-100"
                >
                  <FiPlus /> Add Project
                </button>
              )}
            </div>
          </div>

          {/* Card 4: Programming Languages */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Programming Languages</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editLang ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditLang(!editLang)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.programmingLanguages || resumeData.programmingLanguages.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Languages Found</div>
                  ) : (
                    resumeData.programmingLanguages.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editLang && <span className="skill-tag-remove" onClick={() => handleTagRemove('programmingLanguages', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editLang && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('programmingLanguages', newLangInput, setNewLangInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add language..." value={newLangInput} onChange={(e) => setNewLangInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditLang)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditLang)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editLang && <button onClick={() => setEditLang(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Language</button>}
              </div>
            </div>
          </div>

          {/* Card 5: Frameworks */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Frameworks / Libraries</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editFrameworks ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditFrameworks(!editFrameworks)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.frameworks || resumeData.frameworks.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Frameworks Found</div>
                  ) : (
                    resumeData.frameworks.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editFrameworks && <span className="skill-tag-remove" onClick={() => handleTagRemove('frameworks', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editFrameworks && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('frameworks', newFrameworkInput, setNewFrameworkInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add framework..." value={newFrameworkInput} onChange={(e) => setNewFrameworkInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditFrameworks)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditFrameworks)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editFrameworks && <button onClick={() => setEditFrameworks(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Framework</button>}
              </div>
            </div>
          </div>

          {/* Card 6: Databases */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Databases</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editDatabases ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditDatabases(!editDatabases)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.databases || resumeData.databases.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Databases Found</div>
                  ) : (
                    resumeData.databases.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editDatabases && <span className="skill-tag-remove" onClick={() => handleTagRemove('databases', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editDatabases && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('databases', newDatabaseInput, setNewDatabaseInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add database..." value={newDatabaseInput} onChange={(e) => setNewDatabaseInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditDatabases)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditDatabases)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editDatabases && <button onClick={() => setEditDatabases(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Database</button>}
              </div>
            </div>
          </div>

          {/* Card 7: Developer Tools */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Developer Tools & Platforms</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editTools ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditTools(!editTools)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.tools || resumeData.tools.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Developer Tools Found</div>
                  ) : (
                    resumeData.tools.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editTools && <span className="skill-tag-remove" onClick={() => handleTagRemove('tools', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editTools && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('tools', newToolInput, setNewToolInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add developer tool..." value={newToolInput} onChange={(e) => setNewToolInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditTools)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditTools)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editTools && <button onClick={() => setEditTools(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Developer Tool</button>}
              </div>
            </div>
          </div>

          {/* Card 8: General Technical Skills */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Technical Skills</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editTechSkills ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditTechSkills(!editTechSkills)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.technicalSkills || resumeData.technicalSkills.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Technical Skills Found</div>
                  ) : (
                    resumeData.technicalSkills.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editTechSkills && <span className="skill-tag-remove" onClick={() => handleTagRemove('technicalSkills', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editTechSkills && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('technicalSkills', newTechSkillInput, setNewTechSkillInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add skill..." value={newTechSkillInput} onChange={(e) => setNewTechSkillInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditTechSkills)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditTechSkills)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editTechSkills && <button onClick={() => setEditTechSkills(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Technical Skill</button>}
              </div>
            </div>
          </div>

          {/* Card 9: Soft Skills */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Soft Skills</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editSoftSkills ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditSoftSkills(!editSoftSkills)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.softSkills || resumeData.softSkills.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Soft Skills Found</div>
                  ) : (
                    resumeData.softSkills.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editSoftSkills && <span className="skill-tag-remove" onClick={() => handleTagRemove('softSkills', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editSoftSkills && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('softSkills', newSoftSkillInput, setNewSoftSkillInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add soft skill..." value={newSoftSkillInput} onChange={(e) => setNewSoftSkillInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditSoftSkills)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditSoftSkills)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editSoftSkills && <button onClick={() => setEditSoftSkills(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Soft Skill</button>}
              </div>
            </div>
          </div>

          {/* Card 10: Certifications */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Certifications</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editCerts ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditCerts(!editCerts)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.certifications || resumeData.certifications.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Certifications Added</div>
                  ) : (
                    resumeData.certifications.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editCerts && <span className="skill-tag-remove" onClick={() => handleTagRemove('certifications', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editCerts && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('certifications', newCertInput, setNewCertInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add certification..." value={newCertInput} onChange={(e) => setNewCertInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditCerts)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditCerts)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editCerts && <button onClick={() => setEditCerts(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Certification</button>}
              </div>
            </div>
          </div>

          {/* Card 11: Achievements */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Achievements</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editAchievements ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditAchievements(!editAchievements)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.achievements || resumeData.achievements.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Achievements Found</div>
                  ) : (
                    resumeData.achievements.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editAchievements && <span className="skill-tag-remove" onClick={() => handleTagRemove('achievements', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editAchievements && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('achievements', newAchievementInput, setNewAchievementInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add achievement..." value={newAchievementInput} onChange={(e) => setNewAchievementInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditAchievements)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditAchievements)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editAchievements && <button onClick={() => setEditAchievements(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Achievement</button>}
              </div>
            </div>
          </div>

          {/* Card 12: Interests */}
          <div className="col">
            <div className="extracted-grid-column h-100 text-start">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h4 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiAward className="text-primary" style={{ color: 'var(--primary-purple)' }} />
                    <span>Interests</span>
                  </h4>
                  <button type="button" className={`btn p-1 border-0 rounded-circle ${editInterests ? 'bg-primary bg-opacity-10 text-primary' : 'text-muted'}`} onClick={() => setEditInterests(!editInterests)}><FiEdit /></button>
                </div>

                <div className="d-flex flex-wrap gap-1 overflow-y-auto pr-1" style={{ maxHeight: '280px' }}>
                  {!resumeData || !resumeData.interests || resumeData.interests.length === 0 ? (
                    <div className="py-4 text-center text-muted small w-100">No Interests Detected</div>
                  ) : (
                    resumeData.interests.map((tag, idx) => (
                      <span className="skill-tag" key={idx}>
                        {tag}
                        {editInterests && <span className="skill-tag-remove" onClick={() => handleTagRemove('interests', tag)}>✖</span>}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {editInterests && (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTagAdd('interests', newInterestInput, setNewInterestInput); }} className="input-group mb-2 mt-3">
                      <input type="text" className="input-mock py-1.5" style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', fontSize: '0.8rem' }} placeholder="Add interest..." value={newInterestInput} onChange={(e) => setNewInterestInput(e.target.value)} />
                      <button type="submit" className="btn btn-outline-purple btn-sm" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}>Add</button>
                    </form>
                    <div className="d-flex justify-content-end gap-2 border-top pt-2 mt-2">
                      <button type="button" className="btn btn-sm btn-white-custom py-1 px-2.5" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardCancel(setEditInterests)}>Cancel</button>
                      <button type="button" className="btn btn-sm btn-primary-purple py-1 px-3" style={{ fontSize: '0.74rem' }} onClick={() => handleLocalCardSave(setEditInterests)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
                {!editInterests && <button onClick={() => setEditInterests(true)} className="grid-add-action-btn border-top pt-2 w-100"><FiPlus /> Add Interest</button>}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Very Bottom Banner */}
      <div className="glass-panel p-4 bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3.5 text-start" style={{ border: '1px solid var(--border-grey)' }}>
        <div className="d-flex align-items-center gap-3">
          <div className="p-2.5 rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)', width: '38px', height: '38px' }}>
            <FiInfo className="fs-5" />
          </div>
          <div>
            <h4 className="fw-bold mb-0.5 text-dark" style={{ fontSize: '0.9rem' }}>Ready for Phase 3?</h4>
            <p className="text-muted mb-0 small">Verify that all 12 indicators are green to unlock fully configured AI technical interview panels.</p>
          </div>
        </div>

        <div>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-white-custom d-flex align-items-center gap-2"
            style={{ fontSize: '0.86rem' }}
          >
            <span>Go to Dashboard</span>
            <FiArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
