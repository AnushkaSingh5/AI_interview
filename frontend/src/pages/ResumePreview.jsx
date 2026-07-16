import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiFileText, FiDownload, FiExternalLink, FiRefreshCw, FiTrash2, FiAlertTriangle, FiSliders, FiCheckCircle } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const ResumePreview = () => {
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchResume();
  }, []);

  const fetchResume = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/resume');
      if (response.data && response.data.success) {
        setResume(response.data.resume);
      }
    } catch (error) {
      console.error('Error fetching resume metadata:', error);
      toast.error('Failed to load resume details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm('Are you sure you want to delete your resume? This will also remove all extracted profile preferences.');
    if (!confirm) return;

    setDeleting(true);
    try {
      const response = await axiosInstance.delete('/resume');
      if (response.data && response.data.success) {
        toast.success('Resume deleted successfully.');
        setResume(null);
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete resume.');
    } finally {
      setDeleting(false);
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

  // Guest view if no resume uploaded
  if (!resume) {
    return (
      <div>
        <div className="mb-5">
          <h1 className="fw-bold mb-1" style={{ fontSize: '1.85rem' }}>Resume Manager</h1>
          <p className="text-muted small mb-0">Review and configure your uploaded documents.</p>
        </div>

        <div className="glass-panel p-5 text-center bg-white" style={{ border: '1px solid var(--border-grey)' }}>
          <div className="mb-4 text-muted fs-1 animate-pulse">
            <FiFileText />
          </div>
          <h3 className="h5 fw-bold mb-2">No Resume Uploaded</h3>
          <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '380px' }}>
            Configure your target roles and upload your resume to build a 100% complete profile for AI mock interviews.
          </p>
          <Link to="/resume/upload" className="btn btn-primary-purple px-4 py-2">
            Upload Resume
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header section */}
      <div className="mb-5">
        <h1 className="fw-bold mb-1" style={{ fontSize: '1.85rem' }}>Resume Preview</h1>
        <p className="text-muted small mb-0">Manage details, download resources, or refresh your resume contents.</p>
      </div>

      <div className="row g-4">
        {/* Left Side: Document Card details */}
        <div className="col-lg-5">
          <div className="glass-panel p-4 bg-white" style={{ border: '1px solid var(--border-grey)' }}>
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="p-2.5 rounded-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)', width: '46px', height: '46px' }}>
                <FiFileText className="fs-4" />
              </div>
              <div style={{ wordBreak: 'break-all' }}>
                <h3 className="h6 fw-bold mb-0 text-dark">{resume.fileName}</h3>
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>File Type: {resume.fileType?.toUpperCase()}</span>
              </div>
            </div>

            <div className="border-top pt-3.5 mb-4 text-muted" style={{ fontSize: '0.84rem' }}>
              <div className="d-flex justify-content-between mb-2">
                <span>Upload Date:</span>
                <span className="fw-semibold text-dark">{new Date(resume.uploadDate).toLocaleDateString()}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Parsing Status:</span>
                <span className="text-success fw-semibold d-flex align-items-center gap-1">
                  <FiCheckCircle /> Structured
                </span>
              </div>
            </div>

            <div className="d-flex flex-column gap-2">
              <a 
                href={resume.fileUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-primary-purple w-100 py-2 d-flex align-items-center justify-content-center gap-2"
              >
                <FiDownload /> Download Resume
              </a>
              
              <Link 
                to="/resume/data" 
                className="btn btn-outline-purple w-100 py-2 d-flex align-items-center justify-content-center gap-2"
              >
                <FiSliders /> Edit Extracted Details
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Options & Clean Preview details */}
        <div className="col-lg-7">
          <div className="glass-panel p-4 bg-white d-flex flex-column justify-content-between h-100" style={{ border: '1px solid var(--border-grey)', minHeight: '260px' }}>
            <div>
              <h3 className="h6 fw-bold mb-3 text-dark">Options & Actions</h3>
              <p className="text-muted small mb-4">
                You can replace your resume with a newer document at any time. Doing so will re-run the AI structured text parsing.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-3 mt-4 pt-4 border-top border-secondary-subtle">
              <Link 
                to="/resume/upload" 
                className="btn btn-white-custom py-2 px-4 d-flex align-items-center gap-2"
              >
                <FiRefreshCw /> Replace Resume
              </Link>

              <button 
                onClick={handleDelete} 
                disabled={deleting}
                className="btn btn-outline-danger py-2 px-4 d-flex align-items-center gap-2 ms-sm-auto"
              >
                <FiTrash2 /> {deleting ? 'Deleting...' : 'Delete Resume'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
