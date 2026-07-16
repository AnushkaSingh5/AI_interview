import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiCpu } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleLockedLink = (e, name) => {
    e.preventDefault();
    toast.info(`"${name}" page section is coming in a future update!`);
  };

  return (
    <nav className="landing-navbar">
      {/* Brand logo */}
      <Link to="/" className="sidebar-logo d-flex align-items-center gap-2 text-decoration-none">
        <FiCpu className="fs-4" style={{ color: 'var(--primary-purple)' }} />
        <span style={{ color: 'var(--text-dark)' }}>InterviewAce</span>
      </Link>

      {/* Nav links (middle) */}
      <ul className="landing-nav-links">
        <li>
          <Link to="/" className={`landing-nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Home
          </Link>
        </li>
        <li>
          <a href="#features" onClick={(e) => handleLockedLink(e, 'Features')} className="landing-nav-link">
            Features
          </a>
        </li>
        <li>
          <a href="#how" onClick={(e) => handleLockedLink(e, 'How It Works')} className="landing-nav-link">
            How It Works
          </a>
        </li>
        <li>
          <a href="#about" onClick={(e) => handleLockedLink(e, 'About Us')} className="landing-nav-link">
            About Us
          </a>
        </li>
        <li>
          <a href="#contact" onClick={(e) => handleLockedLink(e, 'Contact')} className="landing-nav-link">
            Contact
          </a>
        </li>
      </ul>

      {/* Nav CTA actions (right) */}
      <div className="d-flex align-items-center gap-3">
        {user ? (
          <>
            <Link to="/dashboard" className="btn btn-sm btn-white-custom py-2 px-3">
              Dashboard
            </Link>
            <button 
              onClick={handleLogout} 
              className="btn btn-sm btn-outline-danger py-2 px-3 border border-secondary-subtle rounded-3"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-decoration-none fw-semibold px-2 py-2" style={{ color: '#4b5563', fontSize: '0.9rem' }}>
              Login
            </Link>
            <Link to="/signup" className="btn btn-primary-purple btn-sm py-2 px-4 shadow-sm">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
