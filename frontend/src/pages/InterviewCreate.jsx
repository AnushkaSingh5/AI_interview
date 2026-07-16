import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiArrowRight, FiCheck, FiCpu, FiAward, FiClock, 
  FiMessageSquare, FiSettings, FiCheckCircle, FiFileText, FiInfo 
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
    interviewType: 'Technical',
    role: '',
    company: '',
    experienceLevel: '0-1 Years',
    difficulty: 'Medium',
    duration: 20,
    questionCount: 10,
    preferredLanguage: 'English',
    focusAreas: [],
    interviewMode: 'Text'
  });

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

        // Pre-select Focus Areas from parsed resume
        const detectedFocus = detectPreSelectedFocusAreas(userObj, rData);

        setFormData(prev => ({
          ...prev,
          role: prefilledRole,
          company: prefilledCompany,
          experienceLevel: prefilledExp,
          focusAreas: detectedFocus
        }));
      }
    } catch (err) {
      toast.error('Failed to load profile context for setup wizard.');
    } finally {
      setLoading(false);
    }
  };

  const detectPreSelectedFocusAreas = (userProfile, resData) => {
    const allTopics = [
      'JavaScript', 'React', 'Node.js', 'MongoDB', 'DBMS', 'OOP', 
      'Operating Systems', 'Computer Networks', 'System Design', 'SQL', 
      'Projects', 'Behavioral Questions', 'Leadership'
    ];
    
    if (!resData) return ['Projects'];

    const resumeTexts = [
      ...(resData.programmingLanguages || []),
      ...(resData.frameworks || []),
      ...(resData.databases || []),
      ...(resData.tools || []),
      ...(resData.technicalSkills || []),
      ...(resData.softSkills || [])
    ].map(t => t.toLowerCase());

    const preselected = [];
    allTopics.forEach(topic => {
      const lower = topic.toLowerCase();
      if (resumeTexts.some(rt => rt.includes(lower) || lower.includes(rt))) {
        preselected.push(topic);
      }
    });

    if (preselected.length === 0) {
      preselected.push('Projects');
    }
    return preselected;
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

  // Multi-select focus area list handler
  const toggleFocusArea = (topic) => {
    const current = [...formData.focusAreas];
    if (current.includes(topic)) {
      setFormData(prev => ({
        ...prev,
        focusAreas: current.filter(t => t !== topic)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        focusAreas: [...current, topic]
      }));
    }
  };

  const handleNextStep = () => {
    if (currentStep === 2 && !formData.role.trim()) {
      toast.warning('Please select or specify a target job role.');
      return;
    }
    if (currentStep === 9 && formData.focusAreas.length === 0) {
      toast.warning('Please select at least one focus area topic.');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Submit configuration
  const handleCreateInterview = async () => {
    setCreating(true);
    try {
      const response = await axiosInstance.post('/api/interviews/create', formData);
      if (response.data && response.data.success) {
        toast.success('Interview session configured and created!');
        setCreatedSession(response.data.session);
        setCurrentStep(12); // Redirects to final Success View
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

  // Final Success screen
  if (currentStep === 12 && createdSession) {
    return (
      <div className="container py-5 text-start">
        <div className="glass-panel p-5 bg-white mx-auto shadow-sm" style={{ maxWidth: '640px', border: '1px solid var(--border-grey)' }}>
          <div className="text-center mb-4">
            <FiCheckCircle className="text-success display-3 mb-3" />
            <h2 className="fw-bold text-dark">Interview Created Successfully!</h2>
            <p className="text-muted">Your personalized mock interview parameters are synced and locked.</p>
          </div>

          <div className="border rounded-3 p-4 mb-4 bg-light bg-opacity-50">
            <h3 className="h6 fw-bold mb-3 border-bottom pb-2 text-dark">Interview Session Configuration</h3>
            <div className="row g-3" style={{ fontSize: '0.86rem' }}>
              <div className="col-6">
                <span className="text-muted d-block">Interview ID</span>
                <strong className="text-dark">{createdSession.interviewId}</strong>
              </div>
              <div className="col-6">
                <span className="text-muted d-block">Status</span>
                <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-0.5" style={{ fontSize: '0.76rem' }}>
                  {createdSession.status || 'Ready'}
                </span>
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
                <span className="text-muted d-block">Number of Questions</span>
                <strong className="text-dark">{createdSession.questionCount} Questions</strong>
              </div>
              <div className="col-12">
                <span className="text-muted d-block">Focus Areas</span>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {createdSession.focusAreas?.map((tag, idx) => (
                    <span key={idx} className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold px-2 py-1" style={{ fontSize: '0.72rem' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex flex-column gap-2">
            <button 
              disabled 
              className="btn btn-primary-purple w-100 py-2.5 opacity-50 cursor-not-allowed"
              style={{ cursor: 'not-allowed' }}
            >
              Generate Questions (Phase 4 Locked)
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
        {/* Left Side: Wizard step indicator checklist */}
        <div className="col-md-3">
          <div className="glass-panel p-3 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
            <span className="fw-bold text-dark d-block mb-3" style={{ fontSize: '0.8rem' }}>Wizard Setup Progress</span>
            <div className="d-flex flex-column gap-2" style={{ fontSize: '0.76rem' }}>
              {[
                { step: 1, label: 'Interview Type' },
                { step: 2, label: 'Job Role' },
                { step: 3, label: 'Target Company' },
                { step: 4, label: 'Experience Level' },
                { step: 5, label: 'Difficulty' },
                { step: 6, label: 'Duration' },
                { step: 7, label: 'Question Count' },
                { step: 8, label: 'Language' },
                { step: 9, label: 'Focus Areas' },
                { step: 10, label: 'Interview Mode' },
                { step: 11, label: 'Summary Review' }
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
          <div className="glass-panel p-4 bg-white d-flex flex-column justify-content-between" style={{ border: '1px solid var(--border-grey)', minHeight: '420px' }}>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-grow-1"
              >
                {/* Step 1: Interview Type */}
                {currentStep === 1 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 1: Choose Interview Type</h3>
                    <div className="row g-3">
                      {[
                        { type: 'Technical', desc: 'Programming & Computer Science', details: 'Core questions testing language internals, data structures, databases, OOP, and frameworks.' },
                        { type: 'HR', desc: 'Behavioral & Personality', details: 'Evaluates team communication, situational response, work ethic, and culture fit.' },
                        { type: 'Mixed', desc: 'Technical + HR Combined', details: 'Full-spectrum review balancing technical problem solving alongside behavioral scenarios.' }
                      ].map((card, idx) => (
                        <div className="col-md-4" key={idx}>
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
                            <span className="badge bg-primary bg-opacity-10 text-primary mb-2" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>{card.type}</span>
                            <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '0.86rem' }}>{card.desc}</h4>
                            <p className="text-muted small mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>{card.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Job Role */}
                {currentStep === 2 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 2: Target Job Role</h3>
                    <div className="mb-3">
                      <label className="form-label-mock">Select target role or type customized position</label>
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
                        <option value="UI/UX Developer">UI/UX Developer</option>
                      </select>
                      
                      <label className="form-label-mock">Custom Job Role (if not listed)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Solution Architect, QA Engineer"
                        className="input-mock"
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Company */}
                {currentStep === 3 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 3: Target Company (Optional)</h3>
                    <div className="mb-3">
                      <label className="form-label-mock">Select target employer or type customize one</label>
                      <select 
                        className="input-mock mb-3"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      >
                        <option value="">-- Optional (e.g. none) --</option>
                        <option value="Google">Google</option>
                        <option value="Microsoft">Microsoft</option>
                        <option value="Amazon">Amazon</option>
                        <option value="Infosys">Infosys</option>
                        <option value="TCS">TCS</option>
                        <option value="Wipro">Wipro</option>
                        <option value="Accenture">Accenture</option>
                        <option value="Capgemini">Capgemini</option>
                        <option value="Other">Other</option>
                      </select>

                      <label className="form-label-mock">Custom Company Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Netflix, Local Startup"
                        className="input-mock"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Experience Level */}
                {currentStep === 4 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 4: Experience Level</h3>
                    <div className="row g-2">
                      {['Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5+ Years'].map((exp, idx) => (
                        <div className="col-12" key={idx}>
                          <div 
                            onClick={() => setFormData(prev => ({ ...prev, experienceLevel: exp }))}
                            className={`border rounded-2 p-2.5 cursor-pointer text-start d-flex align-items-center justify-content-between ${
                              formData.experienceLevel === exp ? 'border-primary bg-light' : 'border-secondary-subtle'
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="fw-semibold text-dark small">{exp}</span>
                            {formData.experienceLevel === exp && <FiCheck className="text-primary" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 5: Difficulty */}
                {currentStep === 5 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 5: Select Difficulty</h3>
                    <div className="row g-3">
                      {[
                        { level: 'Easy', desc: 'Foundational syntax and concepts.' },
                        { level: 'Medium', desc: 'Industry standards, algorithms and architecture.' },
                        { level: 'Hard', desc: 'Deep dive scaling internals, edge cases and logic.' },
                        { level: 'Adaptive', desc: 'AI dynamically shifts difficulty based on your answers.' }
                      ].map((item, idx) => (
                        <div className="col-md-6" key={idx}>
                          <div 
                            onClick={() => setFormData(prev => ({ ...prev, difficulty: item.level }))}
                            className={`border rounded-3 p-3 h-100 cursor-pointer text-start transition-all ${
                              formData.difficulty === item.level ? 'border-primary bg-light' : 'border-secondary-subtle'
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="fw-bold text-dark d-block mb-1" style={{ fontSize: '0.86rem' }}>{item.level}</span>
                            <p className="text-muted small mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 6: Duration */}
                {currentStep === 6 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 6: Interview Duration</h3>
                    <div className="row g-3">
                      {[10, 20, 30, 45, 60].map((mins, idx) => (
                        <div className="col" key={idx}>
                          <div 
                            onClick={() => handleDurationChange(mins)}
                            className={`border rounded-3 p-3 text-center cursor-pointer transition-all ${
                              formData.duration === mins ? 'border-primary bg-light' : 'border-secondary-subtle'
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '1.1rem' }}>{mins}</h4>
                            <span className="text-muted small">Minutes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 7: Number of Questions */}
                {currentStep === 7 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 7: Number of Questions</h3>
                    <div className="row g-3 mb-4">
                      {[5, 10, 15, 20].map((qCount, idx) => (
                        <div className="col" key={idx}>
                          <div 
                            onClick={() => setFormData(prev => ({ ...prev, questionCount: qCount }))}
                            className={`border rounded-3 p-3 text-center cursor-pointer transition-all ${
                              formData.questionCount === qCount ? 'border-primary bg-light' : 'border-secondary-subtle'
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '1.1rem' }}>{qCount}</h4>
                            <span className="text-muted small">Questions</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="d-flex align-items-center gap-2 bg-light p-3 rounded border">
                      <FiInfo className="text-primary flex-shrink-0" />
                      <span className="small text-muted">
                        AI Recommended: **{formData.duration} mins** is paired with **{formData.duration === 10 ? 5 : formData.duration === 20 ? 10 : formData.duration === 30 ? 15 : 20} questions** to allow high quality evaluation.
                      </span>
                    </div>
                  </div>
                )}

                {/* Step 8: Preferred Language */}
                {currentStep === 8 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 8: Interview Language</h3>
                    <div className="row g-3">
                      {[
                        { lang: 'English', desc: 'Standard business and technical English conversation.' },
                        { lang: 'Hindi', desc: 'Questions presented in Hindi or Hinglish dialect.' },
                        { lang: 'Mixed', desc: 'Flexible bilingual mix of technical terminology and local slang.' }
                      ].map((item, idx) => (
                        <div className="col-md-4" key={idx}>
                          <div 
                            onClick={() => setFormData(prev => ({ ...prev, preferredLanguage: item.lang }))}
                            className={`border rounded-3 p-3 h-100 cursor-pointer text-start transition-all ${
                              formData.preferredLanguage === item.lang ? 'border-primary bg-light bg-opacity-25' : 'border-secondary-subtle'
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '0.86rem' }}>{item.lang}</h4>
                            <p className="text-muted small mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 9: Focus Areas */}
                {currentStep === 9 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 9: Choose Focus Areas</h3>
                    <p className="text-muted small mb-3">Pre-selected tags are automatically detected from your uploaded resume data.</p>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {[
                        'JavaScript', 'React', 'Node.js', 'MongoDB', 'DBMS', 'OOP', 
                        'Operating Systems', 'Computer Networks', 'System Design', 'SQL', 
                        'Projects', 'Behavioral Questions', 'Leadership'
                      ].map((topic, idx) => {
                        const isSelected = formData.focusAreas.includes(topic);
                        return (
                          <button 
                            type="button" 
                            key={idx}
                            onClick={() => toggleFocusArea(topic)}
                            className={`btn btn-sm rounded-pill py-1.5 px-3 transition-all ${
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

                {/* Step 10: Interview Mode */}
                {currentStep === 10 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Step 10: Select Interview Mode</h3>
                    <div className="row g-3">
                      {[
                        { mode: 'Text', desc: 'Standard interactive text chat console.', active: true },
                        { mode: 'Voice', desc: 'Voice communication feedback. (Coming Soon)', active: false },
                        { mode: 'Video', desc: 'Face recognition and vocal grading. (Coming Soon)', active: false }
                      ].map((item, idx) => (
                        <div className="col-md-4" key={idx}>
                          <div 
                            onClick={() => { if (item.active) setFormData(prev => ({ ...prev, interviewMode: item.mode })); }}
                            className={`border rounded-3 p-3 h-100 transition-all ${
                              !item.active ? 'opacity-50 cursor-not-allowed bg-light' : 'cursor-pointer'
                            } ${formData.interviewMode === item.mode && item.active ? 'border-primary bg-light bg-opacity-25' : 'border-secondary-subtle'}`}
                            style={{ 
                              cursor: item.active ? 'pointer' : 'not-allowed',
                              borderWidth: (formData.interviewMode === item.mode && item.active) ? '2px' : '1px',
                              borderColor: (formData.interviewMode === item.mode && item.active) ? 'var(--primary-purple)' : ''
                            }}
                          >
                            <span className="badge bg-secondary bg-opacity-10 text-secondary mb-2" style={{ fontSize: '0.66rem' }}>
                              {item.active ? 'Selectable' : 'Coming Soon'}
                            </span>
                            <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: '0.86rem' }}>{item.mode} Interview</h4>
                            <p className="text-muted small mb-0" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 11: Summary Review */}
                {currentStep === 11 && (
                  <div>
                    <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Summary Review</h3>
                    <div className="border rounded-3 p-3 bg-light bg-opacity-50 mb-3" style={{ fontSize: '0.84rem' }}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <span className="text-muted d-block">Interview Type</span>
                          <strong className="text-dark">{formData.interviewType}</strong>
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
                        <div className="col-12">
                          <span className="text-muted d-block">Selected Focus Areas</span>
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {formData.focusAreas.map((topic, idx) => (
                              <span key={idx} className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2.5 py-1" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)', fontSize: '0.72rem' }}>{topic}</span>
                            ))}
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

              {currentStep < 11 ? (
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
