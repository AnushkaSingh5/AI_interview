import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiSliders, FiMic, FiCheckSquare, FiActivity, FiUser, FiFile, FiSettings, FiLogOut, FiCpu } from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const Sidebar = () => {
  const { logout, user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profileCompletion = authUser?.profileCompletion || 0;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleLockedItem = (e, name) => {
    e.preventDefault();
    toast.info(`"${name}" is locked. Coming soon in future mock interview stages!`);
  };

  return (
    <aside className="sidebar-container">
      {/* Brand Title Header */}
      <div>
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo">
            <FiCpu className="fs-4" style={{ color: 'var(--primary-purple)' }} />
            <span>InterviewAce</span>
          </NavLink>
        </div>

        {/* 1. Main Section */}
        <div className="sidebar-menu-section-header">Main</div>
        <ul className="sidebar-menu">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'sidebar-item-link active' : 'sidebar-item-link'}>
              <FiSliders />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/mock-interviews" className={({ isActive }) => isActive ? 'sidebar-item-link active' : 'sidebar-item-link'}>
              <FiMic />
              <span>Mock Interviews</span>
            </NavLink>
          </li>
          <li>
            <a href="#questions" onClick={(e) => handleLockedItem(e, 'Practice Questions')} className="sidebar-item-link">
              <FiCheckSquare />
              <span>Practice Questions</span>
            </a>
          </li>
          <li>
            <NavLink to="/performance" className={({ isActive }) => isActive ? 'sidebar-item-link active' : 'sidebar-item-link'}>
              <FiActivity />
              <span>My Performance</span>
            </NavLink>
          </li>
        </ul>

        {/* 2. Profile Section */}
        <div className="sidebar-menu-section-header">Profile</div>
        <ul className="sidebar-menu">
          <li>
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'sidebar-item-link active' : 'sidebar-item-link'}>
              <FiUser />
              <span>Profile & Resume</span>
            </NavLink>
          </li>
          <li>
            <a href="#documents" onClick={(e) => handleLockedItem(e, 'Documents')} className="sidebar-item-link">
              <FiFile />
              <span>Documents</span>
            </a>
          </li>
        </ul>

        {/* 3. Account Section */}
        <div className="sidebar-menu-section-header">Account</div>
        <ul className="sidebar-menu">
          <li>
            <a href="#settings" onClick={(e) => handleLockedItem(e, 'Settings')} className="sidebar-item-link">
              <FiSettings />
              <span>Settings</span>
            </a>
          </li>
          <li>
            <button onClick={handleLogout} className="sidebar-logout-btn">
              <FiLogOut />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </div>

      {/* 4. Sidebar Progress Footer Widget Card */}
      {profileCompletion < 100 && (
        <div className="sidebar-footer-widget-card">
          <h4 className="fw-bold text-white mb-1" style={{ fontSize: '0.82rem' }}>Complete your profile</h4>
          <p className="text-muted mb-3" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>
            Complete your profile to get better AI interview experience
          </p>

          <div className="position-relative d-inline-block mb-1">
            <svg width="60" height="60" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none" />
              <circle 
                cx="50" 
                cy="50" 
                r="40" 
                stroke="var(--primary-purple)" 
                strokeWidth="10" 
                fill="none" 
                strokeDasharray="251"
                strokeDashoffset={251 - (251 * profileCompletion) / 100}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="56" fill="#ffffff" fontSize="20" fontWeight="700" textAnchor="middle">
                {profileCompletion}%
              </text>
            </svg>
          </div>

          <button 
            onClick={() => navigate('/profile')} 
            className="sidebar-footer-widget-btn"
          >
            Complete Now
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
