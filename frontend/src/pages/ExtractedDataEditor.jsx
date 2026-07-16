import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiPlus, FiTrash2, FiUser, FiBriefcase, FiBookOpen, FiCode, FiAward } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const ExtractedDataEditor = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    fetchResumeData();
  }, []);

  const fetchResumeData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/resume/data');
      if (response.data && response.data.success) {
        setData(response.data.resumeData);
      }
    } catch (error) {
      console.error('Error fetching resume data:', error);
      toast.error('Failed to load extracted resume data. Please ensure your resume is uploaded.');
      navigate('/resume/upload');
    } finally {
      setLoading(false);
    }
  };

  // State handlers for personal info
  const handlePersonalInfoChange = (field, value) => {
    setData({
      ...data,
      personalInformation: {
        ...data.personalInformation,
        [field]: value
      }
    });
  };

  // State handlers for arrays of objects (education, experience, projects)
  const handleArrayObjectChange = (section, index, field, value) => {
    const updatedArray = [...data[section]];
    updatedArray[index] = {
      ...updatedArray[index],
      [field]: value
    };
    setData({ ...data, [section]: updatedArray });
  };

  const handleAddArrayItem = (section, defaultObj) => {
    setData({
      ...data,
      [section]: [...data[section], defaultObj]
    });
  };

  const handleRemoveArrayItem = (section, index) => {
    setData({
      ...data,
      [section]: data[section].filter((_, idx) => idx !== index)
    });
  };

  // Tag inputs helper for skills lists
  const handleTagAdd = (section, tagString) => {
    const cleanTags = tagString.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const updatedSection = [...(data[section] || [])];
    
    cleanTags.forEach(tag => {
      if (!updatedSection.includes(tag)) {
        updatedSection.push(tag);
      }
    });

    setData({ ...data, [section]: updatedSection });
  };

  const handleTagRemove = (section, tagToRemove) => {
    setData({
      ...data,
      [section]: (data[section] || []).filter(t => t !== tagToRemove)
    });
  };

  // Submit edits
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await axiosInstance.put('/resume/data', data);
      if (response.data && response.data.success) {
        toast.success('Extracted details saved and synchronized successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save extracted information.');
    } finally {
      setSaving(false);
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

  return (
    <div>
      {/* Header section */}
      <div className="mb-4">
        <h1 className="fw-bold mb-1" style={{ fontSize: '1.85rem' }}>Review Extracted Data</h1>
        <p className="text-muted small mb-0">Confirm and adjust details extracted by the AI parser before finalizing your profile.</p>
      </div>

      <div className="row g-4 text-start">
        {/* Left Side: Navigation Tabs */}
        <div className="col-md-3">
          <div className="glass-panel p-2.5 bg-white mb-4" style={{ border: '1px solid var(--border-grey)' }}>
            <div className="d-flex flex-column gap-1">
              <button 
                onClick={() => setActiveTab('personal')} 
                className={`btn btn-sm text-start py-2.5 px-3 rounded-2 fw-semibold d-flex align-items-center gap-2 ${activeTab === 'personal' ? 'btn-primary-purple' : 'btn-white-custom border-0'}`}
              >
                <FiUser /> Personal Info
              </button>
              <button 
                onClick={() => setActiveTab('education')} 
                className={`btn btn-sm text-start py-2.5 px-3 rounded-2 fw-semibold d-flex align-items-center gap-2 ${activeTab === 'education' ? 'btn-primary-purple' : 'btn-white-custom border-0'}`}
              >
                <FiBookOpen /> Education
              </button>
              <button 
                onClick={() => setActiveTab('experience')} 
                className={`btn btn-sm text-start py-2.5 px-3 rounded-2 fw-semibold d-flex align-items-center gap-2 ${activeTab === 'experience' ? 'btn-primary-purple' : 'btn-white-custom border-0'}`}
              >
                <FiBriefcase /> Experience
              </button>
              <button 
                onClick={() => setActiveTab('projects')} 
                className={`btn btn-sm text-start py-2.5 px-3 rounded-2 fw-semibold d-flex align-items-center gap-2 ${activeTab === 'projects' ? 'btn-primary-purple' : 'btn-white-custom border-0'}`}
              >
                <FiCode /> Projects
              </button>
              <button 
                onClick={() => setActiveTab('skills')} 
                className={`btn btn-sm text-start py-2.5 px-3 rounded-2 fw-semibold d-flex align-items-center gap-2 ${activeTab === 'skills' ? 'btn-primary-purple' : 'btn-white-custom border-0'}`}
              >
                <FiAward /> Tech Stack & Skills
              </button>
              <button 
                onClick={() => setActiveTab('certs')} 
                className={`btn btn-sm text-start py-2.5 px-3 rounded-2 fw-semibold d-flex align-items-center gap-2 ${activeTab === 'certs' ? 'btn-primary-purple' : 'btn-white-custom border-0'}`}
              >
                <FiAward /> Certifications
              </button>
              <button 
                onClick={() => setActiveTab('achievements')} 
                className={`btn btn-sm text-start py-2.5 px-3 rounded-2 fw-semibold d-flex align-items-center gap-2 ${activeTab === 'achievements' ? 'btn-primary-purple' : 'btn-white-custom border-0'}`}
              >
                <FiAward /> Achievements
              </button>
              <button 
                onClick={() => setActiveTab('interests')} 
                className={`btn btn-sm text-start py-2.5 px-3 rounded-2 fw-semibold d-flex align-items-center gap-2 ${activeTab === 'interests' ? 'btn-primary-purple' : 'btn-white-custom border-0'}`}
              >
                <FiAward /> Interests
              </button>
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="btn btn-primary-purple w-100 py-2.5 d-flex align-items-center justify-content-center gap-2 shadow-sm"
          >
            <FiSave /> {saving ? 'Saving...' : 'Save & Sync'}
          </button>
        </div>

        {/* Right Side: Active Editor Form */}
        <div className="col-md-9">
          <div className="glass-panel p-4 bg-white" style={{ border: '1px solid var(--border-grey)' }}>
            
            {/* Tab 1: Personal Info */}
            {activeTab === 'personal' && (
              <div>
                <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Personal Information</h3>
                <div className="mb-3">
                  <label className="form-label-mock">Full Name</label>
                  <input 
                    type="text" 
                    className="input-mock" 
                    value={data.personalInformation?.name || ''} 
                    onChange={(e) => handlePersonalInfoChange('name', e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label-mock">Email Address</label>
                  <input 
                    type="email" 
                    className="input-mock" 
                    value={data.personalInformation?.email || ''} 
                    onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label-mock">Phone Number</label>
                  <input 
                    type="text" 
                    className="input-mock" 
                    value={data.personalInformation?.phone || ''} 
                    onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label-mock">Professional Summary Bio</label>
                  <textarea 
                    rows="4" 
                    className="input-mock" 
                    value={data.personalInformation?.bio || ''} 
                    onChange={(e) => handlePersonalInfoChange('bio', e.target.value)}
                  ></textarea>
                </div>
              </div>
            )}

            {/* Tab 2: Education */}
            {activeTab === 'education' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                  <h3 className="h6 fw-bold mb-0 text-dark">Education History</h3>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-purple py-1 px-3 d-flex align-items-center gap-1"
                    onClick={() => handleAddArrayItem('education', { institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', gpa: '' })}
                  >
                    <FiPlus /> Add Education
                  </button>
                </div>
                
                {data.education.length === 0 ? (
                  <p className="text-muted small">No education entries found. Click add above to write details.</p>
                ) : (
                  data.education.map((edu, idx) => (
                    <div className="card p-3 mb-4 bg-light border border-secondary border-opacity-10 position-relative" key={idx}>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 p-1.5 border-0 rounded-circle"
                        onClick={() => handleRemoveArrayItem('education', idx)}
                      >
                        <FiTrash2 />
                      </button>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label-mock">Institution / University</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            value={edu.institution} 
                            onChange={(e) => handleArrayObjectChange('education', idx, 'institution', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label-mock">Degree</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            value={edu.degree} 
                            onChange={(e) => handleArrayObjectChange('education', idx, 'degree', e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label-mock">Field of Study</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            value={edu.fieldOfStudy} 
                            onChange={(e) => handleArrayObjectChange('education', idx, 'fieldOfStudy', e.target.value)}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label-mock">Start Date/Year</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            placeholder="e.g. 2020"
                            value={edu.startDate} 
                            onChange={(e) => handleArrayObjectChange('education', idx, 'startDate', e.target.value)}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label-mock">End Date/Year</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            placeholder="e.g. 2024"
                            value={edu.endDate} 
                            onChange={(e) => handleArrayObjectChange('education', idx, 'endDate', e.target.value)}
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label-mock">GPA</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            placeholder="e.g. 3.8"
                            value={edu.gpa} 
                            onChange={(e) => handleArrayObjectChange('education', idx, 'gpa', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Experience */}
            {activeTab === 'experience' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                  <h3 className="h6 fw-bold mb-0 text-dark">Work Experience</h3>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-purple py-1 px-3 d-flex align-items-center gap-1"
                    onClick={() => handleAddArrayItem('experience', { company: '', position: '', startDate: '', endDate: '', description: '' })}
                  >
                    <FiPlus /> Add Experience
                  </button>
                </div>

                {data.experience.length === 0 ? (
                  <p className="text-muted small">No experience history found. Click add to configure.</p>
                ) : (
                  data.experience.map((exp, idx) => (
                    <div className="card p-3 mb-4 bg-light border border-secondary border-opacity-10 position-relative" key={idx}>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 p-1.5 border-0 rounded-circle"
                        onClick={() => handleRemoveArrayItem('experience', idx)}
                      >
                        <FiTrash2 />
                      </button>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label-mock">Company Name</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            value={exp.company} 
                            onChange={(e) => handleArrayObjectChange('experience', idx, 'company', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label-mock">Position / Job Title</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            value={exp.position} 
                            onChange={(e) => handleArrayObjectChange('experience', idx, 'position', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label-mock">Start Date</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            placeholder="e.g. June 2022"
                            value={exp.startDate} 
                            onChange={(e) => handleArrayObjectChange('experience', idx, 'startDate', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label-mock">End Date</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            placeholder="e.g. Present"
                            value={exp.endDate} 
                            onChange={(e) => handleArrayObjectChange('experience', idx, 'endDate', e.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label-mock">Role Description</label>
                          <textarea 
                            rows="4" 
                            className="input-mock" 
                            value={exp.description} 
                            onChange={(e) => handleArrayObjectChange('experience', idx, 'description', e.target.value)}
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Projects */}
            {activeTab === 'projects' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                  <h3 className="h6 fw-bold mb-0 text-dark">Projects</h3>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-purple py-1 px-3 d-flex align-items-center gap-1"
                    onClick={() => handleAddArrayItem('projects', { title: '', description: '', technologies: [] })}
                  >
                    <FiPlus /> Add Project
                  </button>
                </div>

                {data.projects.length === 0 ? (
                  <p className="text-muted small">No projects listed. Click add to configure.</p>
                ) : (
                  data.projects.map((proj, idx) => (
                    <div className="card p-3 mb-4 bg-light border border-secondary border-opacity-10 position-relative" key={idx}>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3 p-1.5 border-0 rounded-circle"
                        onClick={() => handleRemoveArrayItem('projects', idx)}
                      >
                        <FiTrash2 />
                      </button>
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label-mock">Project Title</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            value={proj.title} 
                            onChange={(e) => handleArrayObjectChange('projects', idx, 'title', e.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label-mock">Project Description</label>
                          <textarea 
                            rows="3" 
                            className="input-mock" 
                            value={proj.description} 
                            onChange={(e) => handleArrayObjectChange('projects', idx, 'description', e.target.value)}
                          ></textarea>
                        </div>
                        <div className="col-12">
                          <label className="form-label-mock">Technologies Used (comma separated)</label>
                          <input 
                            type="text" 
                            className="input-mock" 
                            placeholder="e.g. React, Node.js, Socket.io"
                            value={proj.technologies?.join(', ') || ''} 
                            onChange={(e) => {
                              const techArray = e.target.value.split(',').map(s => s.trim());
                              handleArrayObjectChange('projects', idx, 'technologies', techArray);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 5: Technical and Soft Skills lists */}
            {activeTab === 'skills' && (
              <div>
                <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Skills Groupings</h3>
                
                {['programmingLanguages', 'frameworks', 'databases', 'tools', 'technicalSkills', 'softSkills'].map((skillType, idx) => {
                  const labelMap = {
                    programmingLanguages: 'Programming Languages',
                    frameworks: 'Frameworks / Libraries',
                    databases: 'Databases',
                    tools: 'Developer Tools & Platforms',
                    technicalSkills: 'Technical Skills',
                    softSkills: 'Soft Skills'
                  };

                  return (
                    <div className="mb-4 p-3 bg-light rounded border" key={idx}>
                      <label className="form-label-mock text-capitalize fw-bold">{labelMap[skillType]}</label>
                      <div className="input-group mb-2">
                        <input 
                          type="text" 
                          placeholder="Type values (comma separated) and click Add"
                          className="input-mock"
                          style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleTagAdd(skillType, e.target.value);
                              e.target.value = '';
                            }
                          }}
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-purple"
                          style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }}
                          onClick={(e) => {
                            const input = e.target.previousSibling;
                            handleTagAdd(skillType, input.value);
                            input.value = '';
                          }}
                        >
                          Add
                        </button>
                      </div>

                      <div className="d-flex flex-wrap gap-1.5 mt-2 min-h-[30px]">
                        {(!data[skillType] || data[skillType]?.length === 0) ? (
                          <span className="text-muted small" style={{ fontSize: '0.78rem' }}>No items added yet.</span>
                        ) : (
                          data[skillType]?.map((tag, tIdx) => (
                            <span key={tIdx} className="skill-tag py-1 px-2.5">
                              {tag}
                              <FiX className="skill-tag-remove" onClick={() => handleTagRemove(skillType, tag)} />
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 6: Certifications */}
            {activeTab === 'certs' && (
              <div>
                <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Certifications</h3>
                <div className="input-group mb-3">
                  <input 
                    type="text" 
                    placeholder="Add Certification (e.g. AWS Certified Developer)"
                    className="input-mock"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTagAdd('certifications', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-purple"
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      handleTagAdd('certifications', input.value);
                      input.value = '';
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-1.5 min-h-[50px]">
                  {(!data.certifications || data.certifications.length === 0) ? (
                    <span className="text-muted small">No certifications added.</span>
                  ) : (
                    data.certifications.map((cert, cIdx) => (
                      <span key={cIdx} className="skill-tag py-1 px-2.5">
                        {cert}
                        <FiX className="skill-tag-remove" onClick={() => handleTagRemove('certifications', cert)} />
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 7: Achievements */}
            {activeTab === 'achievements' && (
              <div>
                <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Achievements</h3>
                <div className="input-group mb-3">
                  <input 
                    type="text" 
                    placeholder="Add Achievement (e.g. First Place in KIET Hackathon)"
                    className="input-mock"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTagAdd('achievements', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-purple"
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      handleTagAdd('achievements', input.value);
                      input.value = '';
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-1.5 min-h-[50px]">
                  {(!data.achievements || data.achievements.length === 0) ? (
                    <span className="text-muted small">No achievements added.</span>
                  ) : (
                    data.achievements.map((ach, aIdx) => (
                      <span key={aIdx} className="skill-tag py-1 px-2.5">
                        {ach}
                        <FiX className="skill-tag-remove" onClick={() => handleTagRemove('achievements', ach)} />
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 8: Interests */}
            {activeTab === 'interests' && (
              <div>
                <h3 className="h6 fw-bold mb-4 text-dark border-bottom pb-2">Interests</h3>
                <div className="input-group mb-3">
                  <input 
                    type="text" 
                    placeholder="Add Interest (e.g. Competitive Programming, Open Source)"
                    className="input-mock"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTagAdd('interests', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-purple"
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      handleTagAdd('interests', input.value);
                      input.value = '';
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-1.5 min-h-[50px]">
                  {(!data.interests || data.interests.length === 0) ? (
                    <span className="text-muted small">No interests added.</span>
                  ) : (
                    data.interests.map((int, iIdx) => (
                      <span key={iIdx} className="skill-tag py-1 px-2.5">
                        {int}
                        <FiX className="skill-tag-remove" onClick={() => handleTagRemove('interests', int)} />
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// Internal mini removal X icon wrapper
const FiX = ({ className, onClick }) => (
  <span 
    className={className} 
    onClick={onClick}
    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: '5px', fontSize: '0.85em' }}
  >
    ✖
  </span>
);

export default ExtractedDataEditor;
