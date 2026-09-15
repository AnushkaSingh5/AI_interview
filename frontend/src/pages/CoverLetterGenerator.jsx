import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiFileText, FiZap, FiCopy, FiPrinter, FiDownload, FiCheck, 
  FiRefreshCw, FiSliders, FiBookmark, FiTrash2, FiEdit3, FiArrowRight, 
  FiCheckCircle, FiAlertCircle, FiInfo, FiBriefcase, FiLayers,
  FiExternalLink, FiShare2, FiHelpCircle, FiChevronRight, FiUser
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const CoverLetterGenerator = () => {
  const navigate = useNavigate();

  // Profile & Resume Data
  const [profile, setProfile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);

  // Form Configuration State
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Standard');
  const [selectedFocusPoints, setSelectedFocusPoints] = useState([]);
  const [customInstructions, setCustomInstructions] = useState('');

  // Generation & Output State
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [editableContent, setEditableContent] = useState('');
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'saved'

  // Saved Library State
  const [savedLetters, setSavedLetters] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [currentLetterId, setCurrentLetterId] = useState(null);
  const [copied, setCopied] = useState(false);

  const printAreaRef = useRef(null);

  // Tones Catalog
  const tonesList = [
    { id: 'Professional', label: 'Professional & Polished', icon: '👔', desc: 'Corporate, structured, and formal' },
    { id: 'Confident', label: 'Confident & Impactful', icon: '⚡', desc: 'Results, metrics & leadership driven' },
    { id: 'Enthusiastic', label: 'Enthusiastic & Friendly', icon: '🚀', desc: 'High energy & startup culture fit' },
    { id: 'Technical', label: 'Technical & Quantitative', icon: '💻', desc: 'Deep architecture, stack & scale' },
    { id: 'Creative', label: 'Creative & Storytelling', icon: '🎨', desc: 'Compelling narrative & vision' }
  ];

  // Length Options
  const lengthOptions = [
    { id: 'Short', label: 'Concise (~250 words)', desc: 'Quick intro & key highlights' },
    { id: 'Standard', label: 'Standard (~400 words)', desc: 'Balanced 3-4 paragraphs' },
    { id: 'Detailed', label: 'Comprehensive (~600 words)', desc: 'In-depth senior experience' }
  ];

  // Sample Companies
  const suggestedCompanies = ['Google', 'Amazon', 'Microsoft', 'Stripe', 'Meta', 'Netflix', 'Infosys', 'TCS', 'Accenture'];

  useEffect(() => {
    fetchInitialContext();
    fetchSavedCoverLetters();
  }, []);

  const fetchInitialContext = async () => {
    setLoadingContext(true);
    try {
      const profRes = await axiosInstance.get('/users/profile');
      if (profRes.data && profRes.data.success) {
        setProfile(profRes.data.user);
        if (profRes.data.user?.targetCompany && !companyName) {
          setCompanyName(profRes.data.user.targetCompany);
        }
        if (profRes.data.user?.targetRole && !jobTitle) {
          setJobTitle(profRes.data.user.targetRole);
        }
      }

      const resDataRes = await axiosInstance.get('/resume/data');
      if (resDataRes.data && resDataRes.data.success && resDataRes.data.resumeData) {
        setResumeData(resDataRes.data.resumeData);
      }
    } catch (e) {
      console.warn('Initial context load failed:', e.message);
    } finally {
      setLoadingContext(false);
    }
  };

  const fetchSavedCoverLetters = async () => {
    setLoadingSaved(true);
    try {
      const res = await axiosInstance.get('/cover-letter');
      if (res.data && res.data.success) {
        setSavedLetters(res.data.coverLetters || []);
      }
    } catch (e) {
      console.warn('Saved letters fetch failed:', e.message);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Toggle Focus Point
  const toggleFocusPoint = (point) => {
    setSelectedFocusPoints(prev => 
      prev.includes(point) ? prev.filter(p => p !== point) : [...prev, point]
    );
  };

  // Load Sample Demo Job Description
  const handleLoadSampleJD = () => {
    setCompanyName('Stripe');
    setJobTitle('Senior Software Engineer');
    setHiringManager('Engineering Hiring Team');
    setJobDescription(`We are seeking a Senior Software Engineer to design, build, and scale our core payment infrastructure and developer APIs.
Key Responsibilities:
- Architect reliable, low-latency microservices handling millions of daily transactions.
- Build clean, intuitive web applications using modern JavaScript/TypeScript and React.
- Collaborate with product managers, designers, and engineering leaders to launch critical fintech features.
- Uphold high standards for code quality, automated unit testing, CI/CD pipelines, and security compliance.
Requirements:
- 3+ years experience building web applications and REST/GraphQL APIs with Node.js, React, and Python/Java.
- Deep understanding of relational databases (PostgreSQL/MySQL), distributed caching, and cloud deployments.
- Strong communication skills and an empathetic, ownership-oriented mindset.`);
    toast.info('Sample Job Description loaded!');
  };

  // Generate Cover Letter
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!companyName.trim() || !jobTitle.trim()) {
      toast.warning('Please enter both a Target Company and Job Title.');
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        hiringManager: hiringManager.trim() || 'Hiring Manager',
        jobDescription: jobDescription.trim(),
        tone,
        length,
        focusPoints: selectedFocusPoints,
        customInstructions: customInstructions.trim()
      };

      const res = await axiosInstance.post('/cover-letter/generate', payload);
      if (res.data && res.data.success) {
        setGeneratedLetter(res.data.data);
        setEditableContent(res.data.data.letterContent || '');
        setCurrentLetterId(null);
        toast.success('✨ Cover letter generated successfully!');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(err.response?.data?.message || 'Failed to generate cover letter');
    } finally {
      setGenerating(false);
    }
  };

  // Refine Cover Letter
  const handleRefine = async (customInst) => {
    const instructionToUse = customInst || refineInstruction;
    if (!instructionToUse || !instructionToUse.trim()) {
      toast.warning('Please provide a refinement instruction.');
      return;
    }

    setRefining(true);
    try {
      const res = await axiosInstance.post('/cover-letter/refine', {
        existingContent: editableContent,
        instruction: instructionToUse.trim(),
        tone
      });

      if (res.data && res.data.success) {
        setEditableContent(res.data.refinedContent);
        setRefineInstruction('');
        toast.success(`Refined: ${res.data.changeSummary || 'Letter updated'}`);
      }
    } catch (err) {
      console.error('Refine error:', err);
      toast.error(err.response?.data?.message || 'Failed to refine cover letter');
    } finally {
      setRefining(false);
    }
  };

  // Copy to Clipboard
  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    toast.success('Copied cover letter to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Print / Save as PDF
  const handlePrint = () => {
    window.print();
  };

  // Save to Library
  const handleSaveToLibrary = async () => {
    if (!editableContent.trim()) {
      toast.warning('No cover letter content to save.');
      return;
    }

    setSavingCurrent(true);
    try {
      const payload = {
        title: `${companyName || 'Custom'} - ${jobTitle || 'Application'}`,
        companyName,
        jobTitle,
        jobDescription,
        hiringManager,
        tone,
        length,
        content: editableContent,
        matchScore: generatedLetter?.matchScore || 85,
        matchedKeywords: generatedLetter?.matchedKeywords || [],
        missingKeywords: generatedLetter?.missingKeywords || [],
        keyStrengths: generatedLetter?.keyStrengths || [],
        customNotes: customInstructions
      };

      if (currentLetterId) {
        await axiosInstance.put(`/cover-letter/${currentLetterId}`, payload);
        toast.success('Cover letter updated in library!');
      } else {
        const res = await axiosInstance.post('/cover-letter', payload);
        if (res.data && res.data.coverLetter) {
          setCurrentLetterId(res.data.coverLetter._id);
        }
        toast.success('Cover letter saved to your library!');
      }

      fetchSavedCoverLetters();
    } catch (err) {
      toast.error('Failed to save cover letter');
    } finally {
      setSavingCurrent(false);
    }
  };

  // Open Saved Letter into Editor
  const handleOpenSavedLetter = (letter) => {
    setCurrentLetterId(letter._id);
    setCompanyName(letter.companyName || '');
    setJobTitle(letter.jobTitle || '');
    setHiringManager(letter.hiringManager || '');
    setJobDescription(letter.jobDescription || '');
    setTone(letter.tone || 'Professional');
    setLength(letter.length || 'Standard');
    setEditableContent(letter.content || '');
    setGeneratedLetter({
      letterContent: letter.content,
      matchScore: letter.matchScore || 85,
      matchedKeywords: letter.matchedKeywords || [],
      missingKeywords: letter.missingKeywords || [],
      keyStrengths: letter.keyStrengths || []
    });
    setActiveTab('generator');
    toast.info(`Loaded "${letter.title}"`);
  };

  // Delete Saved Letter
  const handleDeleteSavedLetter = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved cover letter?')) return;

    try {
      await axiosInstance.delete(`/cover-letter/${id}`);
      toast.info('Cover letter deleted.');
      if (currentLetterId === id) {
        setCurrentLetterId(null);
      }
      fetchSavedCoverLetters();
    } catch (err) {
      toast.error('Failed to delete letter');
    }
  };

  const safeArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  // Extracted skills & projects from user's resume
  const candidateSkills = [
    ...safeArray(resumeData?.technicalSkills),
    ...safeArray(resumeData?.programmingLanguages),
    ...safeArray(resumeData?.frameworks),
    ...safeArray(profile?.skills)
  ];
  const uniqueCandidateSkills = Array.from(new Set(candidateSkills)).slice(0, 15);
  const candidateProjects = safeArray(resumeData?.projects).slice(0, 4);

  return (
    <div className="container-fluid px-2 px-md-4 py-3 text-start">
      
      {/* 1. Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="p-2 rounded-3" style={{ background: '#f5f3ff', color: 'var(--primary-purple)' }}>
              <FiFileText style={{ fontSize: '1.4rem' }} />
            </span>
            <h1 className="h3 fw-bold text-dark mb-0">AI Cover Letter Generator</h1>
          </div>
          <p className="text-muted small mb-0">
            Generate highly customized, ATS-optimized cover letters by matching your resume with any job description.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'generator' ? 'saved' : 'generator')}
            className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3.5 py-2 fw-semibold ${
              activeTab === 'saved' ? 'btn-dark text-white' : 'btn-outline-dark bg-white shadow-xs'
            }`}
          >
            <FiBookmark />
            <span>Saved Letters ({savedLetters.length})</span>
          </button>
          
          <button
            onClick={() => {
              setCompanyName('');
              setJobTitle('');
              setJobDescription('');
              setGeneratedLetter(null);
              setEditableContent('');
              setCurrentLetterId(null);
              setActiveTab('generator');
            }}
            className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-2"
          >
            + New Letter
          </button>
        </div>
      </div>

      {/* 2. Main Studio Grid (Generator Tab) */}
      {activeTab === 'generator' && (
        <div className="row g-4">
          
          {/* Left Column: Job & Parameters Configuration */}
          <div className="col-lg-5">
            <div className="glass-panel p-4 bg-white border rounded-4 shadow-xs">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h3 className="h6 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <FiBriefcase className="text-primary" /> Target Job Details
                </h3>
                <button
                  type="button"
                  onClick={handleLoadSampleJD}
                  className="btn btn-xs btn-link text-primary text-decoration-none p-0 fw-semibold"
                  style={{ fontSize: '0.74rem' }}
                >
                  ⚡ Load Sample Job
                </button>
              </div>

              <form onSubmit={handleGenerate}>
                
                {/* Company Name & Job Title */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark mb-1">Target Company *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stripe, Google"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="form-control form-control-sm"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-dark mb-1">Target Role / Job Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="form-control form-control-sm"
                    />
                  </div>
                </div>

                {/* Quick Company Suggestions */}
                <div className="d-flex flex-wrap gap-1 mb-3">
                  {suggestedCompanies.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCompanyName(c)}
                      className={`btn btn-xs rounded-pill px-2 py-0.5 ${
                        companyName === c ? 'btn-dark text-white fw-bold' : 'btn-light border text-muted'
                      }`}
                      style={{ fontSize: '0.68rem' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Hiring Manager / Addressee */}
                <div className="mb-3">
                  <label className="form-label small text-muted mb-1">Addressed To (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Hiring Manager, Jane Doe, Engineering Lead"
                    value={hiringManager}
                    onChange={(e) => setHiringManager(e.target.value)}
                    className="form-control form-control-sm"
                  />
                </div>

                {/* Job Description Textarea */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-bold small text-dark mb-0">Paste Job Description (JD) *</label>
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {jobDescription.length} characters ({jobDescription.split(/\s+/).filter(Boolean).length} words)
                    </span>
                  </div>
                  <textarea
                    rows="5"
                    required
                    placeholder="Paste the job description, key responsibilities, and required qualifications here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.8rem', lineHeight: '1.4' }}
                  />
                </div>

                {/* Tone of Voice Selection */}
                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark mb-1.5">Writing Tone & Style</label>
                  <div className="d-flex flex-wrap gap-1.5">
                    {tonesList.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id)}
                        className={`btn btn-xs rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5 transition-all ${
                          tone === t.id 
                            ? 'btn-primary-purple fw-bold shadow-xs' 
                            : 'btn-outline-secondary bg-white text-muted'
                        }`}
                        style={{ fontSize: '0.74rem' }}
                        title={t.desc}
                      >
                        <span>{t.icon}</span>
                        <span>{t.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Letter Length */}
                <div className="mb-3">
                  <label className="form-label fw-bold small text-dark mb-1.5">Letter Length</label>
                  <div className="row g-2">
                    {lengthOptions.map(l => (
                      <div key={l.id} className="col-4">
                        <div
                          onClick={() => setLength(l.id)}
                          className={`p-2 border rounded-3 text-center cursor-pointer transition-all ${
                            length === l.id 
                              ? 'border-primary bg-primary bg-opacity-10 text-primary fw-bold shadow-xs' 
                              : 'bg-white text-muted hover-bg-light'
                          }`}
                          style={{ cursor: 'pointer', fontSize: '0.72rem' }}
                        >
                          <span className="d-block fw-semibold">{l.id}</span>
                          <span style={{ fontSize: '0.64rem' }}>{l.label.split('(')[1]?.replace(')', '')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Candidate Resume Highlights to Emphasize */}
                {uniqueCandidateSkills.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label small text-muted mb-1">Emphasize Resume Highlights</label>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {uniqueCandidateSkills.map(skill => {
                        const isSelected = selectedFocusPoints.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleFocusPoint(skill)}
                            className={`btn btn-xs rounded-pill px-2 py-0.5 ${
                              isSelected ? 'btn-dark text-white fw-bold' : 'btn-light border text-muted'
                            }`}
                            style={{ fontSize: '0.68rem' }}
                          >
                            {isSelected && '✓ '} {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Instructions */}
                <div className="mb-4">
                  <label className="form-label small text-muted mb-1">Custom Instructions (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Mention my open-source contributions or startup scaling experience"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.78rem' }}
                  />
                </div>

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={generating}
                  className="btn btn-primary-purple w-100 py-2.5 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                >
                  <FiZap />
                  <span>{generating ? 'Synthesizing with Gemini AI...' : 'Generate Custom Cover Letter'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Live Editor, ATS Match Score & AI Refine */}
          <div className="col-lg-7">
            {generating ? (
              <div className="glass-panel p-5 bg-white border rounded-4 text-center d-flex flex-column align-items-center justify-content-center h-100" style={{ minHeight: '480px' }}>
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status" />
                <h4 className="h5 fw-bold text-dark mb-1">Crafting Your Customized Cover Letter...</h4>
                <p className="text-muted small mb-0" style={{ maxWidth: '380px' }}>
                  Analyzing your verified resume skills and synthesizing evidence to match {companyName || 'target company'}'s job description.
                </p>
              </div>
            ) : !editableContent ? (
              <div className="glass-panel p-5 bg-white border rounded-4 text-center d-flex flex-column align-items-center justify-content-center h-100" style={{ minHeight: '480px' }}>
                <div className="p-3 rounded-circle mb-3" style={{ background: '#f5f3ff', color: 'var(--primary-purple)' }}>
                  <FiFileText style={{ fontSize: '3rem' }} />
                </div>
                <h3 className="h5 fw-bold text-dark mb-1">Your AI Cover Letter Studio</h3>
                <p className="text-muted small mb-4" style={{ maxWidth: '420px' }}>
                  Fill in the company name, role, and job description on the left, then click <strong>Generate</strong> to create a personalized cover letter.
                </p>
                <button
                  onClick={handleLoadSampleJD}
                  className="btn btn-outline-dark rounded-pill px-4 py-2 small fw-semibold"
                >
                  ⚡ Try with Sample Job Description
                </button>
              </div>
            ) : (
              <div className="glass-panel p-4 bg-white border rounded-4 shadow-xs d-flex flex-column justify-content-between h-100">
                <div>
                  
                  {/* ATS Match Score & Header Insights */}
                  {generatedLetter && (
                    <div className="p-3 rounded-3 mb-3 border bg-light bg-opacity-50">
                      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge rounded-pill bg-success px-3 py-1.5 fw-bold" style={{ fontSize: '0.8rem' }}>
                            🎯 {generatedLetter.matchScore || 88}% ATS Match Score
                          </span>
                          <span className="text-muted small" style={{ fontSize: '0.74rem' }}>
                            Alignment with {companyName} {jobTitle}
                          </span>
                        </div>

                        <div className="d-flex align-items-center gap-1.5">
                          <button
                            onClick={handleCopyClipboard}
                            className="btn btn-xs btn-outline-dark bg-white d-flex align-items-center gap-1 rounded-pill px-3 py-1"
                            style={{ fontSize: '0.74rem' }}
                          >
                            {copied ? <FiCheck className="text-success" /> : <FiCopy />}
                            <span>{copied ? 'Copied!' : 'Copy'}</span>
                          </button>
                          
                          <button
                            onClick={handlePrint}
                            className="btn btn-xs btn-outline-dark bg-white d-flex align-items-center gap-1 rounded-pill px-3 py-1"
                            style={{ fontSize: '0.74rem' }}
                          >
                            <FiPrinter /> Print / PDF
                          </button>

                          <button
                            onClick={handleSaveToLibrary}
                            disabled={savingCurrent}
                            className="btn btn-xs btn-primary-purple d-flex align-items-center gap-1 rounded-pill px-3 py-1"
                            style={{ fontSize: '0.74rem' }}
                          >
                            <FiBookmark /> {savingCurrent ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>

                      {/* Keywords Badges */}
                      <div className="d-flex flex-wrap gap-1">
                        {(generatedLetter.matchedKeywords || []).map(kw => (
                          <span key={kw} className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                            ✓ {kw}
                          </span>
                        ))}
                        {(generatedLetter.missingKeywords || []).map(kw => (
                          <span key={kw} className="badge bg-warning bg-opacity-15 text-dark border border-warning border-opacity-30 px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                            + {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Editable Letter Canvas */}
                  <div className="mb-3" ref={printAreaRef}>
                    <label className="form-label fw-bold small text-dark d-flex justify-content-between align-items-center mb-1">
                      <span>Cover Letter Body (Editable)</span>
                      <span className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}>
                        {editableContent.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </label>
                    <textarea
                      rows="14"
                      value={editableContent}
                      onChange={(e) => setEditableContent(e.target.value)}
                      className="form-control p-3 bg-white border"
                      style={{ 
                        fontSize: '0.86rem', 
                        lineHeight: '1.65', 
                        fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
                        whiteSpace: 'pre-wrap',
                        color: '#1f2937'
                      }}
                    />
                  </div>

                  {/* AI Refinement Tools Bar */}
                  <div className="p-3 rounded-3 bg-light border mb-2">
                    <label className="form-label fw-bold small text-dark mb-1.5 d-flex align-items-center gap-1.5">
                      <FiZap className="text-primary" /> Quick AI Refine & Polish
                    </label>

                    {/* Preset Action Buttons */}
                    <div className="d-flex flex-wrap gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => handleRefine('Make it more concise and tight')}
                        disabled={refining}
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.72rem' }}
                      >
                        ✂️ Make More Concise
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefine('Make it sound more confident, assertive, and metric-focused')}
                        disabled={refining}
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.72rem' }}
                      >
                        ⚡ Boost Confidence & Impact
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefine('Emphasize technical architecture, system scalability, and code quality')}
                        disabled={refining}
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.72rem' }}
                      >
                        💻 Add Technical Depth
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefine('Strengthen the opening hook and call to action for an interview')}
                        disabled={refining}
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.72rem' }}
                      >
                        🎯 Stronger Hook & CTA
                      </button>
                    </div>

                    {/* Custom Refine Prompt Input */}
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        placeholder="Or type custom prompt (e.g. 'Add a sentence about my experience mentoring junior engineers')..."
                        value={refineInstruction}
                        onChange={(e) => setRefineInstruction(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRefine(); } }}
                        className="form-control"
                        style={{ fontSize: '0.78rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRefine()}
                        disabled={refining || !refineInstruction.trim()}
                        className="btn btn-dark fw-semibold"
                        style={{ fontSize: '0.78rem' }}
                      >
                        {refining ? 'Polishing...' : 'Refine'}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Footer Save & Export Actions */}
                <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-3">
                  <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                    💡 Pro Tip: Edit the text directly on the canvas before downloading or saving.
                  </span>
                  
                  <div className="d-flex align-items-center gap-2">
                    <button
                      onClick={handleCopyClipboard}
                      className="btn btn-sm btn-outline-dark rounded-pill px-3 py-1.5"
                    >
                      <FiCopy className="me-1" /> Copy Letter
                    </button>
                    <button
                      onClick={handlePrint}
                      className="btn btn-sm btn-outline-dark rounded-pill px-3 py-1.5"
                    >
                      <FiPrinter className="me-1" /> Print / PDF
                    </button>
                    <button
                      onClick={handleSaveToLibrary}
                      disabled={savingCurrent}
                      className="btn btn-sm btn-primary-purple rounded-pill px-4 py-1.5 shadow-sm fw-semibold"
                    >
                      <FiBookmark className="me-1" /> {savingCurrent ? 'Saving...' : 'Save Letter'}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. Saved Cover Letters Library Tab */}
      {activeTab === 'saved' && (
        <div className="glass-panel p-4 bg-white border rounded-4 shadow-xs">
          <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom">
            <div>
              <h3 className="h6 fw-bold text-dark mb-0.5">My Saved Cover Letters</h3>
              <p className="text-muted small mb-0">Access and manage cover letters tailored for past job applications.</p>
            </div>
            <button
              onClick={() => setActiveTab('generator')}
              className="btn btn-sm btn-primary-purple rounded-pill px-3.5 py-1.5"
            >
              + Create New Letter
            </button>
          </div>

          {loadingSaved ? (
            <div className="py-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2" role="status" />
              <p className="small">Loading your saved cover letters...</p>
            </div>
          ) : savedLetters.length === 0 ? (
            <div className="py-5 text-center text-muted">
              <FiBookmark style={{ fontSize: '2.5rem', color: '#9ca3af' }} className="mb-2" />
              <h4 className="h6 fw-bold text-dark">No saved cover letters yet</h4>
              <p className="small mb-3">Generate a cover letter and click "Save Letter" to access it here anytime.</p>
              <button
                onClick={() => setActiveTab('generator')}
                className="btn btn-sm btn-outline-dark rounded-pill px-4"
              >
                Go to Generator
              </button>
            </div>
          ) : (
            <div className="row g-3">
              {savedLetters.map(letter => (
                <div key={letter._id} className="col-md-6 col-xl-4">
                  <div 
                    onClick={() => handleOpenSavedLetter(letter)}
                    className="p-3.5 border rounded-3 bg-light bg-opacity-40 h-100 d-flex flex-column justify-content-between cursor-pointer hover-shadow transition-all"
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="badge bg-white text-dark border small" style={{ fontSize: '0.7rem' }}>
                          🏢 {letter.companyName || 'Company'}
                        </span>
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 small" style={{ fontSize: '0.68rem' }}>
                          {letter.matchScore || 85}% Match
                        </span>
                      </div>

                      <strong className="text-dark d-block mb-1 text-truncate" style={{ fontSize: '0.88rem' }}>
                        {letter.title}
                      </strong>
                      <span className="text-muted small d-block mb-2" style={{ fontSize: '0.74rem' }}>
                        {letter.jobTitle || 'Software Engineer'} • {letter.tone} tone
                      </span>

                      <p className="text-muted small mb-3" style={{ fontSize: '0.74rem', lineHeight: '1.4', maxHeight: '55px', overflow: 'hidden' }}>
                        "{letter.content.substring(0, 110)}..."
                      </p>
                    </div>

                    <div className="pt-2 border-top d-flex justify-content-between align-items-center">
                      <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                        {new Date(letter.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div className="d-flex align-items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(letter.content);
                            toast.success('Copied to clipboard!');
                          }}
                          className="btn btn-xs btn-light border rounded-circle p-1"
                          title="Copy Text"
                        >
                          <FiCopy style={{ fontSize: '0.72rem' }} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSavedLetter(letter._id, e)}
                          className="btn btn-xs btn-light border text-danger rounded-circle p-1"
                          title="Delete Letter"
                        >
                          <FiTrash2 style={{ fontSize: '0.72rem' }} />
                        </button>
                        <button
                          onClick={() => handleOpenSavedLetter(letter)}
                          className="btn btn-xs btn-primary-purple rounded-pill px-2.5 py-0.5 ms-1"
                          style={{ fontSize: '0.7rem' }}
                        >
                          Open →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default CoverLetterGenerator;
