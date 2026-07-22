import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiArrowRight, FiCheck, FiCpu, FiAward, FiClock, 
  FiMessageSquare, FiSettings, FiCheckCircle, FiFileText, FiInfo, FiLayers
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const InterviewCreate = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Wizard Configuration State
  const [formData, setFormData] = useState({
    interviewType: 'ResumeBased', // 'ResumeBased', 'Technical', 'HR', 'Mixed', 'Custom'
    role: '',
    company: '',
    experienceLevel: '0-1 Years',
    difficulty: 'Medium',
    duration: 20,
    questionCount: 10,
    preferredLanguage: 'English',
    focusAreas: [],
    interviewMode: 'Text',
    // Multi-mode configuration extensions
    selectedTopics: [],
    hrTopics: [],
    useResume: false,
    useProjects: false,
    useExperience: false,
    questionDistribution: { technical: 60, hr: 20, resume: 20 }
  });

  const techTopicsPool = [
    'JavaScript', 'React', 'Node.js', 'DBMS', 'SQL', 
    'Operating Systems', 'Computer Networks', 'OOP', 'DSA', 
    'System Design', 'MongoDB', 'Express', 'Next.js'
  ];

  const hrTopicsPool = [
    'Communication', 'Behavioral', 'Leadership', 'Conflict Resolution', 
    'Career Goals', 'Strengths & Weaknesses', 'Adaptability'
  ];

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

        // Pre-fill logic from profile
        const prefilledRole = userObj.targetRole || '';
        const prefilledCompany = userObj.targetCompany || '';
        
        let prefilledExp = '0-1 Years';
        if (userObj.experienceLevel === 'Beginner') prefilledExp = '0-1 Years';
        else if (userObj.experienceLevel === 'Intermediate') prefilledExp = '1-3 Years';
        else if (userObj.experienceLevel === 'Advanced') prefilledExp = '3-5 Years';
        else if (userObj.experienceLevel === 'Expert') prefilledExp = '5+ Years';

        setFormData(prev => ({
          ...prev,
          role: prefilledRole,
          company: prefilledCompany,
          experienceLevel: prefilledExp,
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
    else if (minutes === 20) questions = 10;
    else if (minutes === 30) questions = 15;
    else if (minutes >= 45) questions = 20;

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
                  {createdSession.interviewType === 'ResumeBased' ? 'Resume Based' : createdSession.interviewType}
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
                        { type: 'ResumeBased', title: 'Resume Based', desc: 'AI generates questions from your resume, projects, skills and experience.' },
                        { type: 'Technical', title: 'Technical Interview', desc: 'DSA, JavaScript, React, Node.js, DBMS, OS, Computer Networks, OOP, SQL, etc.' },
                        { type: 'HR', title: 'HR Interview', desc: 'Tell me about yourself, strengths, weaknesses, conflict handling, leadership, behavioural questions.' },
                        { type: 'Mixed', title: 'Mixed Interview', desc: 'Technical + HR + Projects' },
                        { type: 'Custom', title: 'Custom Interview', desc: 'User selects topics manually.' }
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
                            <span className="badge bg-primary bg-opacity-10 text-primary mb-2" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>{card.title}</span>
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
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 2: Job details & Role</h3>
                    <div className="row g-3">
                      <div className="col-md-6 text-start">
                        <label className="form-label-mock">Select target role or type customize position</label>
                        <select 
                          className="input-mock mb-3"
                          value={formData.role}
                          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        >
                          <option value="">-- Choose target role --</option>
                          <option value="Frontend Developer">Frontend Developer</option>
                          <option value="Backend Developer">Backend Developer</option>
                          <option value="Full Stack Developer">Full Stack Developer</option>
                          <option value="Software Engineer">Software Engineer</option>
                          <option value="Data Analyst">Data Analyst</option>
                          <option value="AI Engineer">AI Engineer</option>
                          <option value="DevOps Engineer">DevOps Engineer</option>
                        </select>
                        
                        <label className="form-label-mock">Custom Job Role (if not listed)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. QA Engineer, Product Manager"
                          className="input-mock"
                          value={formData.role}
                          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        />
                      </div>

                      <div className="col-md-6 text-start">
                        <label className="form-label-mock">Target Company (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Google, Microsoft, Amazon"
                          className="input-mock mb-3"
                          value={formData.company}
                          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        />

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
                      </div>

                      <div className="col-md-6 text-start">
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
                    
                    {/* Resume Based Options */}
                    {formData.interviewType === 'ResumeBased' && (
                      <div>
                        <p className="text-muted small mb-4">Select components of your resume for the AI to prioritize.</p>
                        
                        {!profile?.resumeId ? (
                          <div className="p-4 border border-danger border-opacity-25 bg-danger bg-opacity-10 rounded-3 text-center mb-3">
                            <span className="text-danger small fw-bold">⚠️ No Resume Uploaded</span>
                            <p className="text-muted small mb-0 mt-1">Please select another interview mode or go to Profile to upload your resume first.</p>
                          </div>
                        ) : (
                          <div className="row g-3">
                            {[
                              { label: 'Prioritize Resume Work Experience', field: 'useExperience', desc: 'Focuses questions on your professional role descriptions.' },
                              { label: 'Prioritize Resume Projects', field: 'useProjects', desc: 'Focuses questions on listed technical stack and project metrics.' },
                              { label: 'Prioritize Resume Skills & Achievements', field: 'useResume', desc: 'General screening of certifications, tech stack, and achievements.' }
                            ].map((opt, i) => (
                              <div className="col-12" key={i}>
                                <div 
                                  onClick={() => setFormData(prev => ({ ...prev, [opt.field]: !prev[opt.field] }))}
                                  className={`border rounded-3 p-3 cursor-pointer d-flex justify-content-between align-items-center ${
                                    formData[opt.field] ? 'border-primary bg-light bg-opacity-25' : 'border-secondary-subtle'
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div>
                                    <strong className="text-dark small d-block mb-1">{opt.label}</strong>
                                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{opt.desc}</span>
                                  </div>
                                  <div className={`p-1.5 rounded-circle ${formData[opt.field] ? 'bg-primary text-white' : 'bg-light border'}`}>
                                    <FiCheck style={{ fontSize: '0.8rem', opacity: formData[opt.field] ? 1 : 0 }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Technical Topics Selection */}
                    {formData.interviewType === 'Technical' && (
                      <div>
                        <p className="text-muted small mb-3">Select one or more domain topics for your technical questions.</p>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {techTopicsPool.map((topic, idx) => {
                            const isSelected = formData.selectedTopics.includes(topic);
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => toggleTechTopic(topic)}
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

                    {/* HR Topics Selection */}
                    {formData.interviewType === 'HR' && (
                      <div>
                        <p className="text-muted small mb-3">Select behavioral areas for your HR questions.</p>
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

                    {/* Mixed Mode Setup */}
                    {formData.interviewType === 'Mixed' && (
                      <div>
                        <p className="text-muted small mb-4">Configure the distribution of questions across categories.</p>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label-mock">Technical Questions (%)</label>
                            <input 
                              type="number" 
                              min="0" max="100"
                              className="input-mock"
                              value={formData.questionDistribution.technical}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                questionDistribution: { ...prev.questionDistribution, technical: parseInt(e.target.value) || 0 }
                              }))}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label-mock">HR Questions (%)</label>
                            <input 
                              type="number" 
                              min="0" max="100"
                              className="input-mock"
                              value={formData.questionDistribution.hr}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                questionDistribution: { ...prev.questionDistribution, hr: parseInt(e.target.value) || 0 }
                              }))}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label-mock">Resume References (%)</label>
                            <input 
                              type="number" 
                              min="0" max="100"
                              className="input-mock"
                              value={formData.questionDistribution.resume || 20}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                questionDistribution: { ...prev.questionDistribution, resume: parseInt(e.target.value) || 0 }
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Mode Setup */}
                    {formData.interviewType === 'Custom' && (
                      <div>
                        <p className="text-muted small mb-3">Custom Select Technical topics:</p>
                        <div className="d-flex flex-wrap gap-1.5 mb-4">
                          {techTopicsPool.map((topic, idx) => {
                            const isSelected = formData.selectedTopics.includes(topic);
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => toggleTechTopic(topic)}
                                className={`btn btn-xs rounded-pill py-1 px-2 border transition-all ${
                                  isSelected ? 'btn-primary-purple' : 'btn-light'
                                }`}
                                style={{ fontSize: '0.7rem' }}
                              >
                                {topic}
                              </button>
                            );
                          })}
                        </div>

                        <p className="text-muted small mb-3">Custom Select HR topics:</p>
                        <div className="d-flex flex-wrap gap-1.5 mb-4">
                          {hrTopicsPool.map((topic, idx) => {
                            const isSelected = formData.hrTopics.includes(topic);
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => toggleHrTopic(topic)}
                                className={`btn btn-xs rounded-pill py-1 px-2 border transition-all ${
                                  isSelected ? 'btn-primary-purple' : 'btn-light'
                                }`}
                                style={{ fontSize: '0.7rem' }}
                              >
                                {topic}
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-top pt-3">
                          <label className="d-flex align-items-center gap-2 cursor-pointer small text-dark">
                            <input 
                              type="checkbox" 
                              checked={formData.useResume} 
                              onChange={(e) => setFormData(prev => ({ ...prev, useResume: e.target.checked }))}
                            />
                            Include Resume references in Custom Mode
                          </label>
                        </div>
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
                        {[5, 10, 15, 20].map((qCount, idx) => (
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
                          { mode: 'Text', desc: 'Standard interactive text chat console.', active: true },
                          { mode: 'Voice', desc: 'Real-time STT voice & vocal communication analysis.', active: true }
                        ].map((item, idx) => (
                          <div className="col-md-6" key={idx}>
                            <div 
                              onClick={() => setFormData(prev => ({ ...prev, interviewMode: item.mode }))}
                              className={`border rounded-3 p-3 cursor-pointer transition-all ${
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
                            {formData.interviewType === 'ResumeBased' ? 'Resume Based' : formData.interviewType}
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
                          <span className="text-muted d-block">Preferred Language</span>
                          <strong className="text-dark">{formData.preferredLanguage}</strong>
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
