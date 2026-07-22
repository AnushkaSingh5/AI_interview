import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiSearch, FiMenu, FiSun, FiMoon } from 'react-icons/fi';
import defaultAvatar from '../assets/avatar.png';

const HeaderBar = () => {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [notificationsList, setNotificationsList] = useState([
    { id: 1, type: 'grade', text: 'Mixed Interview - SDE graded successfully.', score: '83%', time: '10 mins ago', read: false },
    { id: 2, type: 'mic', text: 'Voice hardware calibrated successfully.', time: '2 hours ago', read: false },
    { id: 3, type: 'practice', text: 'New Daily Challenge "Implement LRU Cache" is live.', time: '5 hours ago', read: false }
  ]);

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Click outside listener to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    document.body.classList.toggle('sidebar-collapsed');
  };

  const handleMarkAllRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClearNotification = (e, notifId) => {
    e.stopPropagation();
    setNotificationsList(prev => prev.filter(n => n.id !== notifId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <header className="top-header-bar-container">
      {/* Left side: Hamburger toggle and search box */}
      <div className="d-flex align-items-center gap-3">
        <button 
          className="btn p-0 border-0 fs-5 d-flex align-items-center" 
          style={{ color: '#4b5563', outline: 'none' }}
          onClick={toggleSidebar}
          title="Toggle Sidebar"
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
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          className="header-icon-btn d-flex align-items-center justify-content-center p-2 rounded-circle hover-bg-light"
          style={{ width: '38px', height: '38px', border: 'none', background: 'transparent' }}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? <FiSun style={{ color: '#fbbf24', fontSize: '1.2rem' }} /> : <FiMoon style={{ color: '#4b5563', fontSize: '1.2rem' }} />}
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="position-relative" ref={dropdownRef}>
          <button 
            className="header-icon-btn d-flex align-items-center justify-content-center p-2 rounded-circle hover-bg-light position-relative"
            style={{ width: '38px', height: '38px', border: 'none', background: 'transparent' }}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <FiBell style={{ color: '#4b5563', fontSize: '1.2rem' }} />
            {unreadCount > 0 && (
              <span 
                className="position-absolute top-0 start-50 translate-middle-y badge rounded-pill bg-danger border border-light"
                style={{ fontSize: '0.62rem', padding: '2px 5px', transform: 'translate(4px, 4px)' }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div 
              className="glass-panel position-absolute end-0 mt-2 bg-white border shadow-lg rounded-3 p-3 text-start"
              style={{ width: '320px', zIndex: 1050, border: '1px solid var(--border-grey)' }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <strong className="text-dark small">Notifications</strong>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead} 
                    className="btn btn-link p-0 text-primary fw-bold text-decoration-none" 
                    style={{ fontSize: '0.72rem' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              {notificationsList.length === 0 ? (
                <div className="py-4 text-center text-muted small">
                  No new notifications.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {notificationsList.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-2.5 rounded-3 border d-flex justify-content-between align-items-start gap-2 ${notif.read ? 'bg-light opacity-75' : 'bg-white'}`}
                      style={{ fontSize: '0.76rem' }}
                    >
                      <div>
                        <p className="text-dark mb-0.5" style={{ lineHeight: '1.4' }}>
                          {notif.type === 'grade' && '📝 '}
                          {notif.type === 'mic' && '🎙️ '}
                          {notif.type === 'practice' && '🚀 '}
                          {notif.text}
                          {notif.score && <strong className="text-primary ms-1">{notif.score}</strong>}
                        </p>
                        <span className="text-muted" style={{ fontSize: '0.66rem' }}>{notif.time}</span>
                      </div>
                      <button 
                        onClick={(e) => handleClearNotification(e, notif.id)} 
                        className="btn-close shadow-none p-1 bg-transparent border-0 ms-1" 
                        style={{ fontSize: '0.62rem' }}
                        title="Dismiss"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
