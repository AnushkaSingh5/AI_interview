import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FiArrowLeft, FiArrowRight, FiCheck, FiCpu, FiAward, FiClock, 
  FiMessageSquare, FiSettings, FiCheckCircle, FiFileText, FiInfo, FiLayers, FiCode, FiZap
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const InterviewCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Wizard Configuration State
  const [formData, setFormData] = useState({
    interviewType: 'FullLoop', // 'FullLoop', 'ResumeBased', 'Technical', 'HR', 'Mixed', 'Custom'
    role: '',
    company: '',
    experienceLevel: '0-1 Years',
    difficulty: 'Medium',
    duration: 30,
    questionCount: 10,
    preferredLanguage: 'English',
    focusAreas: [],
    interviewMode: 'Text',
    // Multi-mode configuration extensions
    selectedTopics: ['DSA', 'System Design'],
    hrTopics: [],
    useResume: false,
    useProjects: false,
    useExperience: false,
    questionDistribution: { technical: 50, hr: 20, resume: 30 }
  });

  const techTopicsPool = [
    'DSA', 'Algorithms', 'System Design', 'JavaScript', 'React', 'Node.js', 
    'Python', 'Java', 'C++', 'DBMS', 'SQL', 'Operating Systems', 
    'Computer Networks', 'OOP', 'MongoDB', 'Express', 'Next.js', 'Low-Level Design'
  ];

  const hrTopicsPool = [
    'Communication', 'Behavioral', 'Leadership', 'Conflict Resolution', 
    'Career Goals', 'Strengths & Weaknesses', 'Adaptability'
  ];

  const curatedCompanies = [
    {
      name: 'Google',
      tagline: 'Algorithmic Excellence & Large-Scale Systems',
      badgeColor: '#4285F4',
      badgeBg: 'rgba(66, 133, 244, 0.1)',
      recommendedDifficulty: 'Hard',
      defaultRole: 'Software Engineer',
      defaultTopics: ['DSA', 'Algorithms', 'System Design', 'Low-Level Design'],
      defaultHr: ['Behavioral', 'Leadership'],
      highlights: ['Hard Dynamic Programming & Graphs', 'High Scale System Design', 'Googleyness & Ambiguity']
    },
    {
      name: 'Amazon',
      tagline: '16 Leadership Principles & Bar Raiser Standards',
      badgeColor: '#FF9900',
      badgeBg: 'rgba(255, 153, 0, 0.12)',
      recommendedDifficulty: 'Medium',
      defaultRole: 'Software Development Engineer (SDE)',
      defaultTopics: ['DSA', 'System Design', 'Low-Level Design', 'OOP'],
      defaultHr: ['Leadership', 'Behavioral', 'Conflict Resolution'],
      highlights: ['16 Amazon Leadership Principles', 'STAR Format with Metrics', 'LLD & Microservices']
    },
    {
      name: 'Microsoft',
      tagline: 'Practical Engineering & Growth Mindset',
      badgeColor: '#00A4EF',
      badgeBg: 'rgba(0, 164, 239, 0.1)',
      recommendedDifficulty: 'Medium',
      defaultRole: 'Software Engineer',
      defaultTopics: ['DSA', 'Algorithms', 'System Design', 'OOP'],
      defaultHr: ['Communication', 'Behavioral', 'Adaptability'],
      highlights: ['Clean Code & Defensive Programming', 'Azure Cloud Resilience', 'Growth Mindset']
    },
    {
      name: 'Infosys',
      tagline: 'Core CS Fundamentals & Enterprise Software',
      badgeColor: '#007CC3',
      badgeBg: 'rgba(0, 124, 195, 0.1)',
      recommendedDifficulty: 'Medium',
      defaultRole: 'Specialist Programmer / Systems Engineer',
      defaultTopics: ['OOP', 'DBMS', 'SQL', 'Operating Systems', 'Computer Networks'],
      defaultHr: ['Communication', 'Career Goals', 'Adaptability'],
      highlights: ['OOPs in Java/C++', 'Complex SQL Queries & Joins', 'SDLC & Client Consulting']
    },
    {
      name: 'TCS',
      tagline: 'Ninja, Digital & Prime Assessment',
      badgeColor: '#E82127',
      badgeBg: 'rgba(232, 33, 39, 0.1)',
      recommendedDifficulty: 'Medium',
      defaultRole: 'System Engineer (Digital / Prime Track)',
      defaultTopics: ['DSA', 'OOP', 'DBMS', 'SQL', 'C++', 'Java'],
      defaultHr: ['Communication', 'Behavioral', 'Adaptability'],
      highlights: ['C/Java/Python Logic & Recursion', 'SQL Joins & Normalization', 'Agile Methodologies']
    },
    {
      name: 'Accenture',
      tagline: 'Enterprise Cloud & Consulting Innovation',
      badgeColor: '#A100FF',
      badgeBg: 'rgba(161, 0, 255, 0.1)',
      recommendedDifficulty: 'Medium',
      defaultRole: 'Associate Software Engineer',
      defaultTopics: ['React', 'Node.js', 'System Design', 'MongoDB', 'SQL'],
      defaultHr: ['Communication', 'Leadership', 'Conflict Resolution'],
      highlights: ['Full-Stack & Cloud Modernization', 'REST API Architecture', 'Consulting & Situational Scenarios']
    }
  ];

  const handleSelectCompany = (comp) => {
    setFormData(prev => ({
      ...prev,
      company: comp.name,
      role: prev.role || comp.defaultRole,
      difficulty: comp.recommendedDifficulty || prev.difficulty,
      selectedTopics: Array.from(new Set([...prev.selectedTopics, ...(comp.defaultTopics || [])])),
      hrTopics: Array.from(new Set([...prev.hrTopics, ...(comp.defaultHr || [])]))
    }));
  };

  useEffect(() => {
    fetchWizardContext();
  }, []);

  const fetchWizardContext = async () => {
    setLoading(true);
    try {
      const profRes = await axiosInstance.get('/users/profile');
      if (profRes.data && profRes.data.success) {
        const userObj = profRes.data.user;
        setProfile(userObj);

        // Fetch resume structured data
        const dataRes = await axiosInstance.get('/resume/data');
        let rData = null;
        if (dataRes.data && dataRes.data.success) {
          rData = dataRes.data.resumeData;
          setResumeData(rData);
        }

        // Pre-fill logic from profile or router location state
        const targetPassedCompany = location.state?.prefillCompany;
        const prefilledRole = userObj.targetRole || '';
        const prefilledCompany = targetPassedCompany || userObj.targetCompany || '';
        
        let prefilledExp = '0-1 Years';
        if (userObj.experienceLevel === 'Beginner') prefilledExp = '0-1 Years';
        else if (userObj.experienceLevel === 'Intermediate') prefilledExp = '1-3 Years';
        else if (userObj.experienceLevel === 'Advanced') prefilledExp = '3-5 Years';
        else if (userObj.experienceLevel === 'Expert') prefilledExp = '5+ Years';

        const matchedComp = curatedCompanies.find(c => c.name.toLowerCase() === prefilledCompany.toLowerCase());

        setFormData(prev => ({
          ...prev,
          interviewType: targetPassedCompany ? 'CompanySpecific' : prev.interviewType,
          role: prefilledRole || matchedComp?.defaultRole || '',
          company: prefilledCompany,
          experienceLevel: prefilledExp,
          difficulty: matchedComp?.recommendedDifficulty || prev.difficulty,
          selectedTopics: matchedComp ? Array.from(new Set([...prev.selectedTopics, ...(matchedComp.defaultTopics || [])])) : prev.selectedTopics,
          hrTopics: matchedComp ? Array.from(new Set([...prev.hrTopics, ...(matchedComp.defaultHr || [])])) : prev.hrTopics,
          // Set initial defaults
          useResume: !!userObj.resumeId,
          useProjects: !!userObj.resumeId,
          useExperience: !!userObj.resumeId
        }));
      }
    } catch (err) {
      toast.error('Failed to load profile context for setup wizard.');
    } finally {
      setLoading(false);
    }
  };

  // Recommendations mapping (duration -> questionCount)
  const handleDurationChange = (minutes) => {
    let questions = 10;
    if (minutes === 10) questions = 5;
    else if (minutes === 20) questions = 8;
    else if (minutes === 30) questions = 10;
    else if (minutes >= 45) questions = 15;

    setFormData(prev => ({
      ...prev,
      duration: minutes,
      questionCount: questions
    }));
  };

  const toggleTechTopic = (topic) => {
    const current = [...formData.selectedTopics];
    if (current.includes(topic)) {
      setFormData(prev => ({ ...prev, selectedTopics: current.filter(t => t !== topic) }));
    } else {
      setFormData(prev => ({ ...prev, selectedTopics: [...current, topic] }));
    }
  };

  const toggleHrTopic = (topic) => {
    const current = [...formData.hrTopics];
    if (current.includes(topic)) {
      setFormData(prev => ({ ...prev, hrTopics: current.filter(t => t !== topic) }));
    } else {
      setFormData(prev => ({ ...prev, hrTopics: [...current, topic] }));
    }
  };

  const handleNextStep = () => {
    if (currentStep === 2 && !formData.role.trim()) {
      toast.warning('Please select or specify a target job role.');
      return;
    }
    if (currentStep === 3) {
      if (formData.interviewType === 'Technical' && formData.selectedTopics.length === 0) {
        toast.warning('Please select at least one technical topic.');
        return;
      }
      if (formData.interviewType === 'HR' && formData.hrTopics.length === 0) {
        toast.warning('Please select at least one HR topic.');
        return;
      }
      if (formData.interviewType === 'ResumeBased' && !profile?.resumeId) {
        toast.warning('ResumeBased mode requires a resume to be uploaded. Please choose another mode or upload your resume.');
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateInterview = async () => {
    setCreating(true);
    try {
      const response = await axiosInstance.post('/interviews/create', formData);
      if (response.data && response.data.success) {
        toast.success('Interview session configured and created!');
        setCreatedSession(response.data.session);
        setCurrentStep(6); // Redirects to final Success View
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create interview session.');
    } finally {
      setCreating(false);
    }
  };

  const hasCodingTopic = formData.selectedTopics.some(t => ['DSA', 'Algorithms', 'Python', 'Java', 'C++', 'JavaScript'].includes(t)) || formData.interviewType === 'FullLoop';
  const hasSystemDesignTopic = formData.selectedTopics.some(t => ['System Design', 'Low-Level Design'].includes(t)) || formData.interviewType === 'FullLoop';
  const selectedCompanyTrack = curatedCompanies.find(c => c.name.toLowerCase() === formData.company?.trim().toLowerCase());

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Success screen
  if (currentStep === 6 && createdSession) {
    return (
      <div className="container py-5 text-start">
        <div className="glass-panel p-5 bg-white mx-auto shadow-sm" style={{ maxWidth: '640px', border: '1px solid var(--border-grey)' }}>
          <div className="text-center mb-4">
            <FiCheckCircle className="text-success display-3 mb-3" />
            <h2 className="fw-bold text-dark">Interview Created Successfully!</h2>
            <p className="text-muted">Your customized mock interview parameters are synced and locked.</p>
          </div>

          <div className="border rounded-3 p-4 mb-4 bg-light bg-opacity-50">
            <h3 className="h6 fw-bold mb-3 border-bottom pb-2 text-dark">Interview Session Configuration</h3>
            <div className="row g-3" style={{ fontSize: '0.86rem' }}>
              <div className="col-6">
                <span className="text-muted d-block">Interview ID</span>
                <strong className="text-dark">{createdSession.interviewId}</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Interview Type</span>
                <strong className="text-dark">
                  {createdSession.interviewType === 'CompanySpecific'
                    ? `Company Track: ${createdSession.company || 'Custom'}`
                    : createdSession.interviewType === 'FullLoop'
                    ? 'Full-Loop FAANG Onsite (3 Rounds)'
                    : createdSession.interviewType === 'ResumeBased'
                    ? 'Resume Based'
                    : createdSession.interviewType}
                </strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Target Role</span>
                <strong className="text-dark">{createdSession.role}</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Difficulty</span>
                <strong className="text-dark">{createdSession.difficulty}</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Duration</span>
                <strong className="text-dark">{createdSession.duration} Minutes</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Questions Count</span>
                <strong className="text-dark">{createdSession.questionCount} Questions</strong>
              </div>
            </div>

            {createdSession.interviewType === 'FullLoop' && (
              <div className="mt-3 p-2 rounded bg-white border border-primary-subtle d-flex align-items-center gap-2">
                <FiZap className="text-primary flex-shrink-0" />
                <span className="small text-primary fw-semibold" style={{ fontSize: '0.78rem' }}>
                  Includes Round 1 (Screening) + Round 2 (Monaco Live Coding) + Round 3 (Visual System Design Studio)
                </span>
              </div>
            )}
          </div>

          <div className="d-flex flex-column gap-2">
            <button 
              onClick={() => navigate(`/interview/${createdSession.interviewId}/questions`)} 
              className="btn btn-primary-purple w-100 py-2.5 d-flex align-items-center justify-content-center gap-1.5"
            >
              Generate Questions
            </button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn btn-white-custom w-100 py-2.5"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 text-start">
      <div className="mb-4">
        <h1 className="fw-bold mb-1" style={{ fontSize: '1.85rem' }}>Configure Mock Interview</h1>
        <p className="text-muted small">Configure step-by-step career details to align the AI interviewer parameters.</p>
      </div>

      <div className="row g-4">
        {/* Left Side: Wizard progress indicator checklist */}
        <div className="col-md-3">
          <div className="glass-panel p-3 bg-white mb-4 shadow-sm" style={{ border: '1px solid var(--border-grey)' }}>
            <span className="fw-bold text-dark d-block mb-3" style={{ fontSize: '0.8rem' }}>Wizard Setup Progress</span>
            <div className="d-flex flex-column gap-2" style={{ fontSize: '0.76rem' }}>
              {[
                { step: 1, label: 'Interview Type' },
                { step: 2, label: 'Job Details & Role' },
                { step: 3, label: 'Topics & Source' },
                { step: 4, label: 'Duration & Mode' },
                { step: 5, label: 'Summary Review' }
              ].map((s, idx) => (
                <div 
                  key={idx} 
                  className={`d-flex align-items-center gap-2 pb-1 ${
                    currentStep === s.step ? 'text-primary fw-bold' : currentStep > s.step ? 'text-success' : 'text-muted'
                  }`}
                  style={{ color: currentStep === s.step ? 'var(--primary-purple)' : '' }}
                >
                  <span className="badge rounded-circle p-1 d-flex align-items-center justify-content-center" style={{ 
                    width: '18px', 
                    height: '18px', 
                    fontSize: '0.62rem',
                    backgroundColor: currentStep > s.step ? '#25c2a0' : currentStep === s.step ? 'var(--primary-purple)' : '#e2e8f0',
                    color: currentStep >= s.step ? '#ffffff' : '#475569'
                  }}>
                    {currentStep > s.step ? '✔' : s.step}
                  </span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Dynamic Interactive Capabilities Box */}
            <div className="mt-4 pt-3 border-top">
              <span className="text-muted d-block mb-2 fw-semibold" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Active Interactive Modules</span>
              <div className="d-flex flex-column gap-1.5" style={{ fontSize: '0.72rem' }}>
                <div className={`p-1.5 rounded border d-flex align-items-center gap-1.5 ${hasCodingTopic ? 'bg-primary bg-opacity-10 border-primary text-primary fw-semibold' : 'bg-light text-muted'}`}>
                  <FiCode /> Live Monaco Code Editor
                </div>
                <div className={`p-1.5 rounded border d-flex align-items-center gap-1.5 ${hasSystemDesignTopic ? 'bg-primary bg-opacity-10 border-primary text-primary fw-semibold' : 'bg-light text-muted'}`}>
                  <FiLayers /> Visual Architecture Studio
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Active Wizard Panel Card */}
        <div className="col-md-9">
          <div className="glass-panel p-4 bg-white d-flex flex-column justify-content-between shadow-sm" style={{ border: '1px solid var(--border-grey)', minHeight: '450px' }}>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-grow-1"
              >
                {/* Step 1: Choose Interview Type */}
                {currentStep === 1 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 1: Choose Interview Type</h3>
                    <div className="row g-3">
                      {[
                        { 
                          type: 'CompanySpecific', 
                          title: 'Company Specific', 
                          badge: '🏢 Top Tier',
                          desc: 'Targeted interview sets customized for Google, Amazon, Microsoft, Infosys, TCS, or Accenture interview styles.' 
                        },
                        { 
                          type: 'FullLoop', 
                          title: 'Full-Loop FAANG Onsite', 
                          badge: '⭐ Recommended',
                          desc: 'Complete 3-round simulation: Round 1 (Technical & Behavioral) -> Round 2 (Monaco Live Coding) -> Round 3 (Visual System Design Studio).' 
                        },
                        { 
                          type: 'ResumeBased', 
                          title: 'Resume Based', 
                          desc: 'AI generates questions directly from your resume, projects, skills, and past experience.' 
                        },
                        { 
                          type: 'Technical', 
                          title: 'Technical Interview', 
                          desc: 'DSA, Coding Challenges, System Design, JavaScript, React, DBMS, OS, Networks, OOP, etc.' 
                        },
                        { 
                          type: 'HR', 
                          title: 'HR Interview', 
                          desc: 'Tell me about yourself, behavioral questions, conflict resolution, leadership, and culture fit.' 
                        },
                        { 
                          type: 'Mixed', 
                          title: 'Mixed Interview', 
                          desc: 'Balanced combination of Technical concepts, HR questions, and Resume project deep-dives.' 
                        },
                        { 
                          type: 'Custom', 
                          title: 'Custom Interview', 
                          desc: 'Fine-tune every technical topic, HR domain, and resume weight manually.' 
                        }
                      ].map((card, idx) => (
                        <div className="col-md-4 col-sm-6" key={idx}>
                          <div 
                            onClick={() => setFormData(prev => ({ ...prev, interviewType: card.type }))}
                            className={`border rounded-3 p-3 h-100 cursor-pointer text-start transition-all ${
                              formData.interviewType === card.type ? 'border-primary bg-light bg-opacity-25' : 'border-secondary-subtle'
                            }`}
                            style={{ 
                              cursor: 'pointer', 
                              borderWidth: formData.interviewType === card.type ? '2px' : '1px',
                              borderColor: formData.interviewType === card.type ? 'var(--primary-purple)' : ''
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <span className="badge bg-primary bg-opacity-10 text-primary" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
                                {card.title}
                              </span>
                              {card.badge && (
                                <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '0.65rem' }}>
                                  {card.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-muted small mb-0 mt-2" style={{ fontSize: '0.74rem', lineHeight: '1.4' }}>{card.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Job Details & Role */}
                {currentStep === 2 && (
                  <div>
                    <h3 className="h6 fw-bold mb-3 text-dark border-bottom pb-2">Step 2: Job Details & Role Configuration</h3>

                    {/* If company is already selected, show locked confirmation card. Otherwise show selection grid. */}
                    {selectedCompanyTrack ? (
                      <div className="mb-4 p-3 rounded-3 bg-light bg-opacity-50 border text-start d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-3">
                          <span className="badge px-3 py-1.5 rounded fw-bold" style={{ backgroundColor: selectedCompanyTrack.badgeBg, color: selectedCompanyTrack.badgeColor, fontSize: '0.82rem' }}>
                            🏢 {selectedCompanyTrack.name} Track Active
                          </span>
                          <div>
                            <strong className="d-block text-dark small">{selectedCompanyTrack.tagline}</strong>
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {selectedCompanyTrack.highlights.map((h, i) => (
                                <span key={i} className="badge bg-white text-secondary border px-1.5 py-0.5" style={{ fontSize: '0.64rem' }}>
                                  {h}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, company: '', interviewType: prev.interviewType === 'CompanySpecific' ? 'Technical' : prev.interviewType }))}
                          className="btn btn-sm btn-outline-secondary py-1 px-2.5"
                          style={{ fontSize: '0.72rem' }}
                        >
                          Change Company
                        </button>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <label className="form-label-mock d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold">Select Target Company Track (Optional)</span>
                          <span className="text-muted small">Auto-tunes questions & rubrics</span>
                        </label>
                        <div className="row g-2 mb-3">
                          {curatedCompanies.map((c, idx) => (
                            <div className="col-md-4 col-sm-6" key={idx}>
                              <div
                                onClick={() => handleSelectCompany(c)}
                                className="border rounded-3 p-2.5 h-100 cursor-pointer text-start transition-all border-secondary-subtle bg-white"
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="badge px-2 py-1 rounded fw-bold" style={{ backgroundColor: c.badgeBg, color: c.badgeColor, fontSize: '0.72rem' }}>
                                    {c.name}
                                  </span>
                                  <span className="text-primary small fw-semibold" style={{ fontSize: '0.68rem' }}>Select</span>
                                </div>
                                <p className="text-muted mb-1.5" style={{ fontSize: '0.68rem', lineHeight: '1.3' }}>{c.tagline}</p>
                                <div className="d-flex flex-wrap gap-1">
                                  {c.highlights.slice(0, 2).map((h, i) => (
                                    <span key={i} className="badge bg-light text-secondary border px-1.5 py-0.5" style={{ fontSize: '0.62rem' }}>
                                      {h}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="row g-3">
                      <div className="col-md-6 text-start">
                        <label className="form-label-mock">Target Role</label>
                        <select 
                          className="input-mock mb-3"
                          value={formData.role}
                          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        >
                          <option value="">-- Choose target role --</option>
                          <option value="Software Engineer">Software Engineer</option>
                          <option value="Software Development Engineer (SDE)">Software Development Engineer (SDE)</option>
                          <option value="Specialist Programmer / Systems Engineer">Specialist Programmer / Systems Engineer</option>
                          <option value="System Engineer (Digital / Prime Track)">System Engineer (Digital / Prime Track)</option>
                          <option value="Associate Software Engineer">Associate Software Engineer</option>
                          <option value="Frontend Developer">Frontend Developer</option>
                          <option value="Backend Developer">Backend Developer</option>
                          <option value="Full Stack Developer">Full Stack Developer</option>
                          <option value="Data Analyst">Data Analyst</option>
                          <option value="AI Engineer">AI Engineer</option>
                          <option value="DevOps Engineer">DevOps Engineer</option>
                        </select>
                        
                        <label className="form-label-mock">Custom Job Role (if different)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Distributed Systems Engineer, QA Architect"
                          className="input-mock"
                          value={formData.role}
                          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        />
                      </div>

                      <div className="col-md-6 text-start">
                        {!selectedCompanyTrack && (
                          <div className="mb-3">
                            <label className="form-label-mock">Target Company</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Google, Amazon, Microsoft, Infosys, TCS, Accenture"
                              className="input-mock"
                              value={formData.company}
                              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                            />
                          </div>
                        )}

                        <label className="form-label-mock">Experience Level</label>
                        <select 
                          className="input-mock mb-3"
                          value={formData.experienceLevel}
                          onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
                        >
                          <option value="Fresher">Fresher</option>
                          <option value="0-1 Years">0-1 Years</option>
                          <option value="1-3 Years">1-3 Years</option>
                          <option value="3-5 Years">3-5 Years</option>
                          <option value="5+ Years">5+ Years</option>
                        </select>

                        <label className="form-label-mock">Difficulty</label>
                        <select 
                          className="input-mock"
                          value={formData.difficulty}
                          onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                          <option value="Adaptive">Adaptive</option>
                        </select>
                      </div>

                      <div className="col-md-6 text-start">
                        <label className="form-label-mock">Preferred Language</label>
                        <select 
                          className="input-mock"
                          value={formData.preferredLanguage}
                          onChange={(e) => setFormData(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                        >
                          <option value="English">English</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Mixed">Mixed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Topics & Source Configuration (Dynamic Panels) */}
                {currentStep === 3 && (
                  <div>
                    <h3 className="h6 fw-bold mb-3 text-dark border-bottom pb-2">Step 3: Topics & Source Setup</h3>
                    
                    {/* Full Loop / Company Specific / Technical / Custom Topics Selection */}
                    {(formData.interviewType === 'FullLoop' || formData.interviewType === 'CompanySpecific' || formData.interviewType === 'Technical' || formData.interviewType === 'Custom' || formData.interviewType === 'Mixed') && (
                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <p className="text-muted small mb-0">
                            {formData.company ? `Select technical topics tailored for ${formData.company}:` : 'Select technical topics and interactive challenge domains.'}
                          </p>
                          <span className="text-primary small fw-bold" style={{ fontSize: '0.72rem' }}>
                            {formData.selectedTopics.length} Selected
                          </span>
                        </div>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {techTopicsPool.map((topic, idx) => {
                            const isSelected = formData.selectedTopics.includes(topic);
                            const isInteractive = ['DSA', 'Algorithms', 'System Design', 'Low-Level Design'].includes(topic);
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => toggleTechTopic(topic)}
                                className={`btn btn-sm rounded-pill py-2 px-3 transition-all d-flex align-items-center gap-1.5 ${
                                  isSelected ? 'btn-primary-purple' : 'btn-white-custom border'
                                }`}
                                style={{ fontSize: '0.76rem' }}
                              >
                                {isInteractive && <FiZap className="text-warning" />}
                                {topic}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* HR Topics Selection */}
                    {(formData.interviewType === 'FullLoop' || formData.interviewType === 'CompanySpecific' || formData.interviewType === 'HR' || formData.interviewType === 'Custom' || formData.interviewType === 'Mixed') && (
                      <div className="mb-4">
                        <p className="text-muted small mb-2">
                          {formData.company === 'Amazon' ? 'Amazon Leadership Principles & Behavioral domains:' : formData.company ? `${formData.company} Culture & Behavioral domains:` : 'Select behavioral and communication topics for HR rounds:'}
                        </p>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {hrTopicsPool.map((topic, idx) => {
                            const isSelected = formData.hrTopics.includes(topic);
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => toggleHrTopic(topic)}
                                className={`btn btn-sm rounded-pill py-2 px-3 transition-all ${
                                  isSelected ? 'btn-primary-purple' : 'btn-white-custom border'
                                }`}
                                style={{ fontSize: '0.76rem' }}
                              >
                                {topic}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Resume Based Options */}
                    {(formData.interviewType === 'ResumeBased' || formData.interviewType === 'Mixed' || formData.interviewType === 'Custom') && (
                      <div className="border-top pt-3">
                        <p className="text-muted small mb-3">Resume prioritization options:</p>
                        {!profile?.resumeId ? (
                          <div className="p-3 border border-warning border-opacity-25 bg-warning bg-opacity-10 rounded-3 text-start mb-2">
                            <span className="text-warning-emphasis small fw-bold">⚠️ No resume attached</span>
                            <p className="text-muted small mb-0 mt-1">AI will rely primarily on selected role, tech topics, and standard job questions.</p>
                          </div>
                        ) : (
                          <div className="row g-2">
                            {[
                              { label: 'Prioritize Past Experience', field: 'useExperience', desc: 'Questions about work history and past company roles.' },
                              { label: 'Prioritize Resume Projects', field: 'useProjects', desc: 'Deep dive into portfolio tech stacks and architecture.' },
                              { label: 'Prioritize Listed Skills', field: 'useResume', desc: 'Questions on skills and tools listed in resume.' }
                            ].map((opt, i) => (
                              <div className="col-12" key={i}>
                                <div 
                                  onClick={() => setFormData(prev => ({ ...prev, [opt.field]: !prev[opt.field] }))}
                                  className={`border rounded-3 p-2.5 cursor-pointer d-flex justify-content-between align-items-center ${
                                    formData[opt.field] ? 'border-primary bg-light bg-opacity-25' : 'border-secondary-subtle'
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div>
                                    <strong className="text-dark small d-block">{opt.label}</strong>
                                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{opt.desc}</span>
                                  </div>
                                  <div className={`p-1 rounded-circle ${formData[opt.field] ? 'bg-primary text-white' : 'bg-light border'}`}>
                                    <FiCheck style={{ fontSize: '0.75rem', opacity: formData[opt.field] ? 1 : 0 }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}

                {/* Step 4: Duration & Mode */}
                {currentStep === 4 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 4: Duration & Format</h3>
                    
                    <div className="mb-4">
                      <label className="form-label-mock">Duration</label>
                      <div className="row g-2">
                        {[10, 20, 30, 45, 60].map((mins, idx) => (
                          <div className="col" key={idx}>
                            <div 
                              onClick={() => handleDurationChange(mins)}
                              className={`border rounded-3 p-3 text-center cursor-pointer transition-all ${
                                formData.duration === mins ? 'border-primary bg-light' : 'border-secondary-subtle'
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <strong className="text-dark d-block mb-1">{mins}</strong>
                              <span className="text-muted small" style={{ fontSize: '0.7rem' }}>Mins</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label-mock">Questions count</label>
                      <div className="row g-2">
                        {[5, 8, 10, 15, 20].map((qCount, idx) => (
                          <div className="col" key={idx}>
                            <div 
                              onClick={() => setFormData(prev => ({ ...prev, questionCount: qCount }))}
                              className={`border rounded-3 p-3 text-center cursor-pointer transition-all ${
                                formData.questionCount === qCount ? 'border-primary bg-light' : 'border-secondary-subtle'
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <strong className="text-dark d-block mb-1">{qCount}</strong>
                              <span className="text-muted small" style={{ fontSize: '0.7rem' }}>Questions</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="form-label-mock">Select Interview Mode</label>
                      <div className="row g-3">
                        {[
                          { mode: 'Text', desc: 'Interactive console with embedded live code compiler & architecture canvas.', active: true },
                          { mode: 'Voice', desc: 'Real-time vocal speech analysis + interactive code/architecture studio.', active: true },
                          { mode: 'Video', desc: 'Webcam video interview with live non-verbal, vocal & technical IDE grading.', active: true }
                        ].map((item, idx) => (
                          <div className="col-md-4" key={idx}>
                            <div 
                              onClick={() => setFormData(prev => ({ ...prev, interviewMode: item.mode }))}
                              className={`border rounded-3 p-3 cursor-pointer h-100 transition-all ${
                                formData.interviewMode === item.mode ? 'border-primary bg-light bg-opacity-25' : 'border-secondary-subtle'
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '0.86rem' }}>{item.mode} Interview</h4>
                              <p className="text-muted small mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Summary Review */}
                {currentStep === 5 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Summary Review</h3>
                    <div className="border rounded-3 p-3 bg-light bg-opacity-50 mb-3" style={{ fontSize: '0.84rem' }}>
                      <div className="row g-3 text-start">
                        <div className="col-md-6">
                          <span className="text-muted d-block">Interview Type</span>
                          <strong className="text-dark">
                            {formData.interviewType === 'CompanySpecific'
                              ? `Company Track: ${formData.company || 'Custom'}`
                              : formData.interviewType === 'FullLoop'
                              ? 'Full-Loop FAANG Onsite (3 Rounds)'
                              : formData.interviewType === 'ResumeBased'
                              ? 'Resume Based'
                              : formData.interviewType}
                          </strong>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted d-block">Target Job Role</span>
                          <strong className="text-dark">{formData.role}</strong>
                        </div>
                        {formData.company && (
                          <div className="col-md-6">
                            <span className="text-muted d-block">Target Employer</span>
                            <strong className="text-dark">{formData.company}</strong>
                          </div>
                        )}
                        <div className="col-md-6">
                          <span className="text-muted d-block">Experience Level</span>
                          <strong className="text-dark">{formData.experienceLevel}</strong>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted d-block">Difficulty</span>
                          <strong className="text-dark">{formData.difficulty}</strong>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted d-block">Duration</span>
                          <strong className="text-dark">{formData.duration} Minutes</strong>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted d-block">Questions Count</span>
                          <strong className="text-dark">{formData.questionCount} Questions</strong>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted d-block">Interview Mode</span>
                          <strong className="text-dark">{formData.interviewMode} ({formData.preferredLanguage})</strong>
                        </div>
                        
                        {formData.selectedTopics.length > 0 && (
                          <div className="col-12">
                            <span className="text-muted d-block">Selected Tech Topics</span>
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {formData.selectedTopics.map((topic, idx) => (
                                <span key={idx} className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2 py-1" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)', fontSize: '0.72rem' }}>{topic}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {formData.hrTopics.length > 0 && (
                          <div className="col-12">
                            <span className="text-muted d-block">Selected HR Topics</span>
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {formData.hrTopics.map((topic, idx) => (
                                <span key={idx} className="badge bg-success bg-opacity-10 text-success fw-semibold px-2 py-1" style={{ fontSize: '0.72rem' }}>{topic}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="col-12 border-top pt-2">
                          <span className="text-muted d-block mb-1">Interactive Features Enabled:</span>
                          <div className="d-flex flex-wrap gap-2">
                            {hasCodingTopic && (
                              <span className="badge bg-info bg-opacity-10 text-info px-2 py-1" style={{ fontSize: '0.72rem' }}>
                                💻 Embedded Monaco Live Code Editor (5 Languages)
                              </span>
                            )}
                            {hasSystemDesignTopic && (
                              <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1" style={{ fontSize: '0.72rem' }}>
                                🎨 Drag & Drop Visual Architecture Studio
                              </span>
                            )}
                            <span className="badge bg-success bg-opacity-10 text-success px-2 py-1" style={{ fontSize: '0.72rem' }}>
                              🔒 Proctoring Lockdown & Fullscreen Enforcer
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Bottom Wizard Controls Bar */}
            <div className="border-top pt-3 d-flex justify-content-between align-items-center mt-4">
              {currentStep > 1 ? (
                <button 
                  type="button" 
                  onClick={handlePrevStep}
                  className="btn btn-sm btn-white-custom py-2 px-3 d-flex align-items-center gap-1.5"
                >
                  <FiArrowLeft /> Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <button 
                  type="button" 
                  onClick={handleNextStep}
                  className="btn btn-sm btn-primary-purple py-2 px-3.5 d-flex align-items-center gap-1.5"
                >
                  Next <FiArrowRight />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleCreateInterview}
                  disabled={creating}
                  className="btn btn-sm btn-primary-purple py-2 px-4 shadow-sm"
                >
                  {creating ? 'Creating...' : 'Create Interview'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewCreate;
