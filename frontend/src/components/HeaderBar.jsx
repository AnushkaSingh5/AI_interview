import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiSearch, FiMenu } from 'react-icons/fi';
import defaultAvatar from '../assets/avatar.png';

const HeaderBar = () => {
  const { user } = useAuth();

  return (
    <header className="top-header-bar-container">
      {/* Left side: Hamburger toggle and search box */}
      <div className="d-flex align-items-center gap-3">
        <button 
          className="btn p-0 border-0 fs-5 d-flex align-items-center" 
          style={{ color: '#4b5563', outline: 'none' }}
          onClick={() => alert('Sidebar toggle locked in sandbox.')}
        >
          <FiMenu />
        </button>
        <div className="d-flex align-items-center bg-light rounded-2 px-3 py-2 border border-secondary border-opacity-10" style={{ width: '320px' }}>
          <FiSearch className="text-muted me-2" />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="bg-transparent border-0 w-100 small text-dark" 
            style={{ outline: 'none', fontSize: '0.85rem' }}
            disabled
          />
        </div>
      </div>

      {/* Right side: Notification and user avatar with details */}
      <div className="top-header-icons">
        {/* Notification Bell with red count badge 3 */}
        <button 
          className="header-icon-btn d-flex align-items-center justify-content-center p-2 rounded-circle hover-bg-light"
          style={{ width: '38px', height: '38px' }}
          onClick={() => alert('Notifications coming in later phases.')}
        >
          <FiBell style={{ color: '#4b5563' }} />
          <span 
            className="position-absolute top-0 start-50 translate-middle-y badge rounded-pill bg-danger border border-light"
            style={{ fontSize: '0.62rem', padding: '2px 5px', transform: 'translate(4px, 4px)' }}
          >
            3
          </span>
        </button>

        {/* User profile avatar, name, and email details */}
        <div className="header-user-avatar-group border-start ps-3 border-secondary border-opacity-15">
          <img 
            src={defaultAvatar} 
            alt={user?.fullName || 'User Avatar'} 
            className="header-avatar"
            style={{ width: '36px', height: '36px' }}
          />
          <div className="d-flex flex-column text-start" style={{ lineHeight: '1.2' }}>
            <span className="header-username" style={{ fontSize: '0.86rem', color: '#1f2937' }}>
              {user?.fullName || user?.name || 'Anushka Singh'}
            </span>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
              {user?.email || 'anushka@example.com'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
