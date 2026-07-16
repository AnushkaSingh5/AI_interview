import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiAlertTriangle } from 'react-icons/fi';

const NotFound = () => {
  return (
    <div className="container min-vh-100 d-flex flex-column justify-content-center align-items-center text-center">
      <div className="glass-panel p-5 max-w-lg mx-auto">
        <div className="text-warning fs-1 mb-4">
          <FiAlertTriangle className="animate-bounce" />
        </div>
        <h1 className="display-3 fw-bold mb-3">404</h1>
        <h2 className="h4 mb-3">Oops! Page Not Found</h2>
        <p className="text-muted mb-4 small px-md-3">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. Let's get you back on track.
        </p>
        <Link to="/" className="btn btn-primary-custom d-inline-flex align-items-center gap-2">
          <FiHome /> Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
