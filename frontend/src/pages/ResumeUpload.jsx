import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiFileText, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const ResumeUpload = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState('');

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    setFileError('');

    // Handle rejection reasons
    if (rejectedFiles && rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        setFileError('File is too large. Maximum allowed size is 5MB.');
        toast.error('File size exceeds the 5MB limit.');
      } else if (error.code === 'file-invalid-type') {
        setFileError('Invalid file type. Only PDF and DOCX documents are accepted.');
        toast.error('Only PDF and DOCX documents are allowed.');
      } else {
        setFileError(error.message);
        toast.error(error.message);
      }
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    setProgress(15); // Initial upload progress

    try {
      const response = await axiosInstance.post('/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Clamp upload progress up to 80%, reserving 80-100% for backend parsing step
          setProgress(Math.min(15 + Math.round(percentCompleted * 0.65), 80));
        }
      });

      if (response.data && response.data.success) {
        setProgress(100);
        toast.success('Resume uploaded and parsed successfully!');
        
        // Redirect to structured reviewer editor
        navigate('/resume/data');
      } else {
        toast.error(response.data?.message || 'Resume upload failed');
        setUploading(false);
      }
    } catch (error) {
      setUploading(false);
      const message = error.response?.data?.message || 'An error occurred during resume uploading.';
      setFileError(message);
      toast.error(message);
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    }
  });

  return (
    <div>
      {/* Header section */}
      <div className="mb-5">
        <h1 className="fw-bold mb-1" style={{ fontSize: '1.85rem', letterSpacing: '-0.02em' }}>Upload Resume</h1>
        <p className="text-muted small mb-0">Drag and drop your professional resume to configure your profile details.</p>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="glass-panel p-4 p-md-5 bg-white" style={{ border: '1px solid var(--border-grey)' }}>
            
            {/* Upload Area */}
            {!uploading ? (
              <div 
                {...getRootProps()} 
                className={`d-flex flex-column align-items-center justify-content-center border border-2 border-dashed rounded-3 p-5 text-center cursor-pointer transition-all ${
                  isDragActive ? 'border-primary bg-light' : 'border-secondary-subtle'
                }`}
                style={{ minHeight: '280px', cursor: 'pointer', outline: 'none' }}
              >
                <input {...getInputProps()} />
                
                <div className="p-3 bg-light rounded-circle mb-3 text-primary d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px', backgroundColor: 'var(--primary-purple-light)', color: 'var(--primary-purple)' }}>
                  <FiUploadCloud className="fs-2" style={{ color: 'var(--primary-purple)' }} />
                </div>
                
                <h3 className="h6 fw-bold text-dark mb-1">
                  {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume here'}
                </h3>
                <p className="text-muted small mb-3">or click to browse your local files</p>
                
                <div className="d-flex align-items-center gap-4 text-muted" style={{ fontSize: '0.78rem' }}>
                  <span>Supported: PDF, DOCX</span>
                  <span>•</span>
                  <span>Max size: 5MB</span>
                </div>
              </div>
            ) : (
              /* Processing upload view */
              <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center">
                <div className="spinner-border text-primary mb-4" role="status" style={{ color: 'var(--primary-purple)', width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Parsing...</span>
                </div>
                
                <h3 className="h6 fw-bold text-dark mb-2">
                  {progress < 80 ? 'Uploading document...' : 'Parsing details with AI...'}
                </h3>
                <p className="text-muted small mb-4" style={{ maxWidth: '320px' }}>
                  {progress < 80 
                    ? 'Transferring file to cloud storage...' 
                    : 'Extracting skills, experience, and projects. Please do not close this window.'
                  }
                </p>
                
                {/* Progress bar container */}
                <div className="progress w-100 rounded-pill" style={{ height: '8px', maxWidth: '380px', backgroundColor: '#f1f5f9' }}>
                  <div 
                    className="progress-bar progress-bar-striped progress-bar-animated rounded-pill" 
                    role="progressbar" 
                    style={{ width: `${progress}%`, backgroundColor: 'var(--primary-purple)' }}
                    aria-valuenow={progress} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  ></div>
                </div>
                <span className="text-muted small mt-2 fw-semibold">{progress}%</span>
              </div>
            )}

            {/* Error notifications */}
            {fileError && (
              <div className="alert alert-danger bg-opacity-10 border-danger text-danger mt-4 d-flex align-items-center gap-2" role="alert">
                <FiAlertCircle className="fs-5" />
                <span className="small fw-semibold">{fileError}</span>
              </div>
            )}

            {/* Parsing instructions tip */}
            {!uploading && (
              <div className="mt-4 pt-4 border-top border-secondary-subtle">
                <h4 className="h6 fw-bold mb-2 text-dark">Why upload a resume?</h4>
                <ul className="text-muted small mb-0 ps-3" style={{ lineHeight: '1.6' }}>
                  <li>Automatically fills out your profile settings, including career and tech stack filters.</li>
                  <li>Extracts programming skills, frameworks, databases, and tools.</li>
                  <li>Seeds future AI interview rounds with realistic, personalized questions mapped to your true experience level.</li>
                </ul>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;
