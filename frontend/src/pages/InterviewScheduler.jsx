import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FiCalendar, FiClock, FiPlay, FiPlus, FiEdit2, FiTrash2, FiDownload, 
  FiExternalLink, FiCheckCircle, FiAlertCircle, FiBell, FiLayers, FiCode, 
  FiMic, FiCamera, FiMessageSquare, FiBriefcase, FiFilter, FiCheck, FiX, 
  FiChevronLeft, FiChevronRight, FiRefreshCw, FiInfo, FiZap, FiTarget
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const InterviewScheduler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [stats, setStats] = useState({
    totalScheduled: 0,
    upcomingCount: 0,
    completedCount: 0,
    missedCount: 0,
    cancelledCount: 0,
    commitmentRate: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [nextInterview, setNextInterview] = useState(null);

  // Active View Tab: 'upcoming' | 'calendar' | 'past' | 'tips'
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [startingSessionId, setStartingSessionId] = useState(null);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  // Form State for Create / Reschedule
  const initialFormState = {
    title: '',
    track: 'text',
    interviewType: 'Technical',
    companyName: '',
    role: 'Software Engineer',
    difficulty: 'Medium',
    topics: ['DSA', 'System Design'],
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: 30,
    interviewerPersona: 'Friendly Mentor',
    notes: '',
    reminderPreferences: {
      fifteenMin: true,
      oneHour: true,
      oneDay: true,
      inApp: true,
      emailNotification: true
    }
  };
  const [formData, setFormData] = useState(initialFormState);

  // Curated Topics Pool
  const topicSuggestions = [
    'DSA', 'Algorithms', 'System Design', 'JavaScript', 'React', 'Node.js', 
    'Python', 'Java', 'SQL', 'DBMS', 'Operating Systems', 'OOP', 
    'Microservices', 'STAR Method', 'Behavioral', 'Leadership'
  ];

  // Company list
  const curatedCompanies = [
    'Google', 'Amazon', 'Microsoft', 'Infosys', 'TCS', 'Accenture', 'Meta', 'Netflix', 'Apple'
  ];

  useEffect(() => {
    fetchScheduledData();
    fetchUpcomingAlerts();

    // Auto refresh upcoming alerts every 60 seconds
    const interval = setInterval(() => {
      fetchUpcomingAlerts();
    }, 60000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchScheduledData = async () => {
    setLoading(true);
    try {
      let filterParam = 'all';
      if (activeTab === 'upcoming') filterParam = 'upcoming';
      if (activeTab === 'past') filterParam = 'past';

      const res = await axiosInstance.get('/scheduler', {
        params: { filter: filterParam }
      });

      if (res.data && res.data.success) {
        setInterviews(res.data.interviews || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching scheduled interviews:', error);
      toast.error('Failed to load scheduled interviews.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingAlerts = async () => {
    try {
      const res = await axiosInstance.get('/scheduler/upcoming');
      if (res.data && res.data.success) {
        setAlerts(res.data.alerts || []);
        setNextInterview(res.data.nextInterview || null);
      }
    } catch (error) {
      console.warn('Upcoming alerts check failed:', error);
    }
  };

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateAndTimeToIso = (dateInput, timeInput) => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth();
    let day = new Date().getDate();

    if (dateInput && typeof dateInput === 'string') {
      const clean = dateInput.trim();
      const parts = clean.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = parseInt(parts[2], 10);
        }
      }
    }

    let hours = 10, minutes = 0;
    if (timeInput && typeof timeInput === 'string') {
      const timeParts = timeInput.split(':');
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10) || 0;
        minutes = parseInt(timeParts[1], 10) || 0;
      }
    }

    const localDate = new Date(year, month, day, hours, minutes, 0);
    if (!isNaN(localDate.getTime())) {
      return localDate.toISOString();
    }
    return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  };

  // Open modal for Create
  const handleOpenCreateModal = (presetTrack = 'text') => {
    setEditingId(null);
    const defaultDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const dateStr = getLocalDateString(defaultDate);
    const hours = String(defaultDate.getHours()).padStart(2, '0');
    const mins = String(Math.floor(defaultDate.getMinutes() / 15) * 15).padStart(2, '0');

    setFormData({
      ...initialFormState,
      track: presetTrack,
      scheduledDate: dateStr,
      scheduledTime: `${hours}:${mins}`
    });
    setShowModal(true);
  };

  // Open modal for Edit / Reschedule
  const handleOpenEditModal = (interview) => {
    setEditingId(interview._id);
    const dateObj = new Date(interview.scheduledDate);
    const dateStr = getLocalDateString(dateObj);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const mins = String(dateObj.getMinutes()).padStart(2, '0');

    setFormData({
      title: interview.title || '',
      track: interview.track || 'text',
      interviewType: interview.interviewType || 'Technical',
      companyName: interview.companyName || '',
      role: interview.role || 'Software Engineer',
      difficulty: interview.difficulty || 'Medium',
      topics: interview.topics || [],
      scheduledDate: dateStr,
      scheduledTime: `${hours}:${mins}`,
      durationMinutes: interview.durationMinutes || 30,
      interviewerPersona: interview.interviewerPersona || 'Friendly Mentor',
      notes: interview.notes || '',
      reminderPreferences: interview.reminderPreferences || initialFormState.reminderPreferences
    });
    setShowModal(true);
  };

  // Form submit (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.scheduledDate || !formData.scheduledTime) {
      toast.warning('Please select both a date and time for your interview.');
      return;
    }

    setSubmitting(true);
    try {
      const isoDate = formatDateAndTimeToIso(formData.scheduledDate, formData.scheduledTime);

      const payload = {
        title: formData.title,
        track: formData.track,
        interviewType: formData.interviewType,
        companyName: formData.companyName,
        role: formData.role || 'Software Engineer',
        difficulty: formData.difficulty || 'Medium',
        topics: formData.topics,
        scheduledDate: isoDate,
        durationMinutes: Number(formData.durationMinutes) || 30,
        interviewerPersona: formData.interviewerPersona,
        notes: formData.notes,
        reminderPreferences: formData.reminderPreferences
      };

      if (editingId) {
        const res = await axiosInstance.put(`/scheduler/${editingId}`, payload);
        if (res.data && res.data.success) {
          toast.success('Interview rescheduled successfully!');
        }
      } else {
        const res = await axiosInstance.post('/scheduler', payload);
        if (res.data && res.data.success) {
          toast.success('Mock interview scheduled! Reminders are active.');
        }
      }

      setShowModal(false);
      fetchScheduledData();
      fetchUpcomingAlerts();
    } catch (error) {
      console.error('Error saving scheduled interview:', error);
      const errMsg = error.response?.data?.message || error.message || 'Failed to save scheduled interview';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Launch Session Now
  const handleStartInterview = async (interviewId) => {
    setStartingSessionId(interviewId);
    try {
      const res = await axiosInstance.post(`/scheduler/${interviewId}/start`);
      if (res.data && res.data.success) {
        toast.success('Launching interview simulator...');
        navigate(res.data.launchUrl);
      }
    } catch (error) {
      console.error('Error launching interview session:', error);
      toast.error(error.response?.data?.message || 'Failed to start interview');
    } finally {
      setStartingSessionId(null);
    }
  };

  // Cancel Interview
  const handleCancelInterview = async (interviewId, title) => {
    if (!window.confirm(`Are you sure you want to cancel "${title}"?`)) return;

    try {
      const res = await axiosInstance.delete(`/scheduler/${interviewId}?action=cancel`);
      if (res.data && res.data.success) {
        toast.info('Interview cancelled.');
        fetchScheduledData();
        fetchUpcomingAlerts();
      }
    } catch (error) {
      toast.error('Failed to cancel interview');
    }
  };

  // Delete Interview
  const handleDeleteInterview = async (interviewId) => {
    if (!window.confirm('Delete this scheduled record completely?')) return;

    try {
      const res = await axiosInstance.delete(`/scheduler/${interviewId}?action=delete`);
      if (res.data && res.data.success) {
        toast.info('Record deleted.');
        fetchScheduledData();
        fetchUpcomingAlerts();
      }
    } catch (error) {
      toast.error('Failed to delete interview');
    }
  };

  // Download ICS File
  const handleDownloadIcs = async (interviewId, title) => {
    try {
      const res = await axiosInstance.get(`/scheduler/${interviewId}/ics`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `interviewace-${(title || 'mock-interview').replace(/\s+/g, '-')}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('iCal file downloaded! You can import it into Apple Calendar, Outlook, or Thunderbird.');
    } catch (error) {
      console.error('ICS download error:', error);
      toast.error('Failed to download calendar file');
    }
  };

  // Quick Preset Date Helpers
  const applyPresetTime = (preset) => {
    const now = new Date();
    let target = new Date();

    if (preset === 'today_2h') {
      target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    } else if (preset === 'today_evening') {
      target.setHours(19, 0, 0, 0);
      if (target <= now) target = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (preset === 'tomorrow_10am') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (preset === 'tomorrow_6pm') {
      target.setDate(target.getDate() + 1);
      target.setHours(18, 0, 0, 0);
    } else if (preset === 'weekend') {
      const day = target.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      target.setDate(target.getDate() + daysUntilSaturday);
      target.setHours(11, 0, 0, 0);
    }

    const dateStr = target.toISOString().split('T')[0];
    const hours = String(target.getHours()).padStart(2, '0');
    const mins = String(target.getMinutes()).padStart(2, '0');

    setFormData(prev => ({
      ...prev,
      scheduledDate: dateStr,
      scheduledTime: `${hours}:${mins}`
    }));
  };

  // Toggle Topic in Topic Selector
  const toggleTopic = (topic) => {
    setFormData(prev => {
      const exists = prev.topics.includes(topic);
      if (exists) {
        return { ...prev, topics: prev.topics.filter(t => t !== topic) };
      } else {
        return { ...prev, topics: [...prev.topics, topic] };
      }
    });
  };

  // Track Meta details for Badges & Icons
  const getTrackMeta = (track) => {
    switch (track) {
      case 'coding':
        return { label: 'Live Coding Round', icon: <FiCode />, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
      case 'system_design':
        return { label: 'System Design', icon: <FiLayers />, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
      case 'video':
        return { label: 'Video AI Mock', icon: <FiCamera />, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
      case 'voice':
        return { label: 'Voice AI Mock', icon: <FiMic />, color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
      case 'company_specific':
        return { label: 'Company Track', icon: <FiBriefcase />, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
      case 'text':
      default:
        return { label: 'Interactive AI Mock', icon: <FiMessageSquare />, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' };
    }
  };

  // Relative Time Formatter
  const formatScheduleTime = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    const diffHours = (d - now) / (1000 * 60 * 60);

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    if (diffHours < 0 && diffHours > -1) {
      return { primary: `Happening Now (${timeStr})`, badge: 'Live Now', badgeClass: 'bg-success text-white' };
    } else if (diffHours >= 0 && diffHours < 1) {
      const mins = Math.max(1, Math.round(diffHours * 60));
      return { primary: `In ${mins} mins (${timeStr})`, badge: 'Starts Soon', badgeClass: 'bg-danger text-white' };
    } else if (d.toDateString() === now.toDateString()) {
      return { primary: `Today at ${timeStr}`, badge: 'Today', badgeClass: 'bg-primary text-white' };
    } else {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (d.toDateString() === tomorrow.toDateString()) {
        return { primary: `Tomorrow at ${timeStr}`, badge: 'Tomorrow', badgeClass: 'bg-info text-dark' };
      }
      return { primary: `${dateStr} at ${timeStr}`, badge: dateStr, badgeClass: 'bg-secondary text-white' };
    }
  };

  // Calendar calculations
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const calendarYear = currentMonth.getFullYear();
  const calendarMonthIndex = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonthIndex);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonthIndex);

  // Filter interviews for selected calendar date
  const interviewsForSelectedDate = interviews.filter(item => {
    const itemDate = new Date(item.scheduledDate);
    return (
      itemDate.getFullYear() === selectedCalendarDate.getFullYear() &&
      itemDate.getMonth() === selectedCalendarDate.getMonth() &&
      itemDate.getDate() === selectedCalendarDate.getDate()
    );
  });

  // Filter upcoming sessions by track selector
  const filteredInterviews = interviews.filter(item => {
    if (selectedTrackFilter === 'all') return true;
    return item.track === selectedTrackFilter;
  });

  return (
    <div className="container-fluid px-2 px-md-4 py-3 text-start">
      
      {/* 1. Page Header & Title */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="p-2 rounded-3" style={{ background: '#f5f3ff', color: 'var(--primary-purple)' }}>
              <FiCalendar style={{ fontSize: '1.4rem' }} />
            </span>
            <h1 className="h3 fw-bold text-dark mb-0">Interview Scheduler & Reminders</h1>
          </div>
          <p className="text-muted small mb-0">
            Plan and schedule your mock interviews, sync with Google Calendar / iCal, and never miss a prep session.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button 
            onClick={() => { fetchScheduledData(); fetchUpcomingAlerts(); }}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 rounded-pill px-3 py-2"
            title="Refresh Schedules"
          >
            <FiRefreshCw className={loading ? 'fa-spin' : ''} />
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
          <button 
            onClick={() => handleOpenCreateModal('text')}
            className="btn btn-primary-purple d-flex align-items-center gap-2 rounded-pill px-4 py-2 shadow-sm fw-semibold"
          >
            <FiPlus />
            <span>Schedule Mock Interview</span>
          </button>
        </div>
      </div>

      {/* 2. Top Urgent Reminders Alert Banner */}
      {alerts.length > 0 && (
        <div className="mb-4">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className={`p-3 rounded-3 mb-2 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 shadow-sm border ${
                alert.level === 'urgent' 
                  ? 'bg-danger bg-opacity-10 border-danger border-opacity-25 text-danger' 
                  : alert.level === 'warning' 
                  ? 'bg-warning bg-opacity-15 border-warning border-opacity-30 text-dark' 
                  : 'bg-primary bg-opacity-10 border-primary border-opacity-20 text-primary'
              }`}
            >
              <div className="d-flex align-items-center gap-3">
                <span className="p-2 rounded-circle bg-white shadow-xs">
                  <FiBell style={{ fontSize: '1.2rem', color: alert.level === 'urgent' ? '#dc2626' : '#d97706' }} />
                </span>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <strong className="fw-bold">{alert.message}</strong>
                    <span className="badge bg-white text-dark border px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                      {alert.track.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-muted small" style={{ fontSize: '0.76rem' }}>
                    Scheduled for {new Date(alert.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {alert.role}
                  </span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <a
                  href={alert.interview?.googleCalendarUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-dark bg-white d-flex align-items-center gap-1.5 rounded-pill px-3"
                  style={{ fontSize: '0.78rem' }}
                >
                  <FiExternalLink /> Calendar
                </a>
                <button
                  onClick={() => handleStartInterview(alert.interviewId)}
                  disabled={startingSessionId === alert.interviewId}
                  className="btn btn-sm btn-dark d-flex align-items-center gap-1.5 rounded-pill px-3.5 py-1.5 fw-bold text-white shadow-sm"
                  style={{ fontSize: '0.8rem', background: alert.level === 'urgent' ? '#dc2626' : 'var(--primary-purple)', borderColor: 'transparent' }}
                >
                  <FiPlay />
                  {startingSessionId === alert.interviewId ? 'Launching...' : 'Launch Interview Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Summary Stats Banner */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="glass-panel p-3 bg-white h-100 border d-flex align-items-center gap-3">
            <div className="p-2.5 rounded-3" style={{ background: '#f5f3ff', color: 'var(--primary-purple)' }}>
              <FiCalendar style={{ fontSize: '1.4rem' }} />
            </div>
            <div>
              <span className="text-muted small d-block">Upcoming Sessions</span>
              <strong className="h4 fw-bold text-dark mb-0">{stats.upcomingCount}</strong>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="glass-panel p-3 bg-white h-100 border d-flex align-items-center gap-3">
            <div className="p-2.5 rounded-3" style={{ background: '#ecfdf5', color: '#059669' }}>
              <FiCheckCircle style={{ fontSize: '1.4rem' }} />
            </div>
            <div>
              <span className="text-muted small d-block">Completed</span>
              <strong className="h4 fw-bold text-dark mb-0">{stats.completedCount}</strong>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="glass-panel p-3 bg-white h-100 border d-flex align-items-center gap-3">
            <div className="p-2.5 rounded-3" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <FiClock style={{ fontSize: '1.4rem' }} />
            </div>
            <div>
              <span className="text-muted small d-block">Total Scheduled</span>
              <strong className="h4 fw-bold text-dark mb-0">{stats.totalScheduled}</strong>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="glass-panel p-3 bg-white h-100 border d-flex align-items-center gap-3">
            <div className="p-2.5 rounded-3" style={{ background: '#fffbeb', color: '#d97706' }}>
              <FiTarget style={{ fontSize: '1.4rem' }} />
            </div>
            <div>
              <span className="text-muted small d-block">Commitment Rate</span>
              <strong className="h4 fw-bold text-dark mb-0">{stats.commitmentRate}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tabs Navigation */}
      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-4">
        <div className="d-flex gap-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`btn btn-sm d-flex align-items-center gap-2 px-3.5 py-2 rounded-pill fw-semibold ${
              activeTab === 'upcoming' ? 'btn-primary-purple' : 'btn-light text-muted'
            }`}
          >
            <FiClock />
            <span>Upcoming Sessions ({stats.upcomingCount})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('calendar')}
            className={`btn btn-sm d-flex align-items-center gap-2 px-3.5 py-2 rounded-pill fw-semibold ${
              activeTab === 'calendar' ? 'btn-primary-purple' : 'btn-light text-muted'
            }`}
          >
            <FiCalendar />
            <span>Calendar View</span>
          </button>

          <button
            onClick={() => setActiveTab('past')}
            className={`btn btn-sm d-flex align-items-center gap-2 px-3.5 py-2 rounded-pill fw-semibold ${
              activeTab === 'past' ? 'btn-primary-purple' : 'btn-light text-muted'
            }`}
          >
            <FiCheckCircle />
            <span>History & Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('tips')}
            className={`btn btn-sm d-flex align-items-center gap-2 px-3.5 py-2 rounded-pill fw-semibold ${
              activeTab === 'tips' ? 'btn-primary-purple' : 'btn-light text-muted'
            }`}
          >
            <FiZap />
            <span>Prep Tips & Guides</span>
          </button>
        </div>

        {activeTab === 'upcoming' && (
          <div className="d-none d-md-flex align-items-center gap-2">
            <span className="text-muted small">Filter Track:</span>
            <select
              value={selectedTrackFilter}
              onChange={(e) => setSelectedTrackFilter(e.target.value)}
              className="form-select form-select-sm"
              style={{ width: '160px', fontSize: '0.8rem' }}
            >
              <option value="all">All Tracks</option>
              <option value="text">Interactive AI</option>
              <option value="coding">Coding Round</option>
              <option value="system_design">System Design</option>
              <option value="voice">Voice AI</option>
              <option value="video">Video AI</option>
              <option value="company_specific">Company Specific</option>
            </select>
          </div>
        )}
      </div>

      {/* 5. Tab Content: Upcoming Sessions */}
      {activeTab === 'upcoming' && (
        <div>
          {loading ? (
            <div className="py-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2" role="status" />
              <p className="small">Loading your scheduled interviews...</p>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="glass-panel p-5 bg-white border text-center rounded-3">
              <div className="d-inline-flex p-3 rounded-circle mb-3" style={{ background: '#f5f3ff', color: 'var(--primary-purple)' }}>
                <FiCalendar style={{ fontSize: '2.5rem' }} />
              </div>
              <h3 className="h5 fw-bold text-dark mb-1">No upcoming interviews scheduled</h3>
              <p className="text-muted small mb-4" style={{ maxWidth: '420px', margin: '0 auto' }}>
                Set up a mock interview for later today or this week. We'll send you reminders and help you stay on track!
              </p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <button 
                  onClick={() => handleOpenCreateModal('coding')}
                  className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill px-3 py-1.5 small"
                >
                  <FiCode /> Schedule Coding Round
                </button>
                <button 
                  onClick={() => handleOpenCreateModal('system_design')}
                  className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill px-3 py-1.5 small"
                >
                  <FiLayers /> Schedule System Design
                </button>
                <button 
                  onClick={() => handleOpenCreateModal('company_specific')}
                  className="btn btn-outline-dark d-flex align-items-center gap-2 rounded-pill px-3 py-1.5 small"
                >
                  <FiBriefcase /> Schedule Company Mock
                </button>
                <button 
                  onClick={() => handleOpenCreateModal('text')}
                  className="btn btn-primary-purple d-flex align-items-center gap-2 rounded-pill px-4 py-1.5 small"
                >
                  <FiPlus /> Schedule Any Session
                </button>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {filteredInterviews.map((interview) => {
                const trackMeta = getTrackMeta(interview.track);
                const timeInfo = formatScheduleTime(interview.scheduledDate);
                const isDueNow = interview.isDue || new Date(interview.scheduledDate) <= new Date();

                return (
                  <div key={interview._id} className="col-md-6 col-xl-4">
                    <div 
                      className="glass-panel p-4 bg-white border h-100 d-flex flex-column justify-content-between rounded-3 shadow-xs hover-shadow transition-all"
                      style={{ borderLeft: `4px solid ${trackMeta.color}` }}
                    >
                      <div>
                        {/* Track Header & Status Badge */}
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span 
                            className="badge d-inline-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill"
                            style={{ background: trackMeta.bg, color: trackMeta.color, border: `1px solid ${trackMeta.border}`, fontSize: '0.72rem' }}
                          >
                            {trackMeta.icon}
                            <span>{trackMeta.label}</span>
                          </span>

                          <span className={`badge px-2 py-1 rounded-pill ${timeInfo.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                            {timeInfo.badge}
                          </span>
                        </div>

                        {/* Title & Company */}
                        <h3 className="h6 fw-bold text-dark mb-1 text-truncate" title={interview.title}>
                          {interview.title}
                        </h3>
                        <p className="text-muted small mb-2" style={{ fontSize: '0.78rem' }}>
                          Role: <strong className="text-dark">{interview.role}</strong>
                          {interview.companyName && (
                            <span className="ms-2 badge bg-light text-dark border">🏢 {interview.companyName}</span>
                          )}
                        </p>

                        {/* Date, Time & Duration Info */}
                        <div className="d-flex align-items-center gap-3 text-muted small mb-3" style={{ fontSize: '0.75rem' }}>
                          <span className="d-flex align-items-center gap-1 text-dark fw-semibold">
                            <FiClock className="text-primary" /> {timeInfo.primary}
                          </span>
                          <span>•</span>
                          <span>{interview.durationMinutes} mins</span>
                          <span>•</span>
                          <span className="badge bg-light text-dark border">{interview.difficulty}</span>
                        </div>

                        {/* Topics tags */}
                        {interview.topics && interview.topics.length > 0 && (
                          <div className="d-flex flex-wrap gap-1 mb-3">
                            {interview.topics.slice(0, 3).map((topic, idx) => (
                              <span key={idx} className="badge bg-light text-muted border px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                                {topic}
                              </span>
                            ))}
                            {interview.topics.length > 3 && (
                              <span className="badge bg-light text-muted border px-1.5 py-0.5" style={{ fontSize: '0.68rem' }}>
                                +{interview.topics.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes Preview */}
                        {interview.notes && (
                          <div className="p-2 rounded bg-light bg-opacity-75 text-muted small mb-3" style={{ fontSize: '0.72rem', fontStyle: 'italic' }}>
                            "{interview.notes.length > 80 ? interview.notes.substring(0, 80) + '...' : interview.notes}"
                          </div>
                        )}
                      </div>

                      {/* Action Footer */}
                      <div className="pt-3 border-top d-flex flex-column gap-2">
                        {/* Start Interview CTA */}
                        <button
                          onClick={() => handleStartInterview(interview._id)}
                          disabled={startingSessionId === interview._id}
                          className="btn btn-sm btn-primary-purple w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-pill fw-semibold shadow-sm"
                        >
                          <FiPlay style={{ fill: 'white' }} />
                          <span>{startingSessionId === interview._id ? 'Preparing Simulator...' : isDueNow ? 'Start Interview Now' : 'Launch Session Early'}</span>
                        </button>

                        {/* Calendar & Management buttons */}
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <div className="d-flex align-items-center gap-1">
                            {/* Google Calendar Link */}
                            <a
                              href={interview.googleCalendarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1 rounded-pill px-2.5 py-1"
                              style={{ fontSize: '0.72rem' }}
                              title="Add to Google Calendar"
                            >
                              <FiExternalLink /> Google Cal
                            </a>

                            {/* iCal .ICS Download */}
                            <button
                              onClick={() => handleDownloadIcs(interview._id, interview.title)}
                              className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1 rounded-pill px-2.5 py-1"
                              style={{ fontSize: '0.72rem' }}
                              title="Download iCal (.ics) file"
                            >
                              <FiDownload /> iCal
                            </button>
                          </div>

                          <div className="d-flex align-items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(interview)}
                              className="btn btn-xs btn-outline-dark rounded-circle p-1.5"
                              style={{ width: '28px', height: '28px' }}
                              title="Reschedule / Edit"
                            >
                              <FiEdit2 style={{ fontSize: '0.74rem' }} />
                            </button>
                            <button
                              onClick={() => handleCancelInterview(interview._id, interview.title)}
                              className="btn btn-xs btn-outline-danger rounded-circle p-1.5"
                              style={{ width: '28px', height: '28px' }}
                              title="Cancel Interview"
                            >
                              <FiX style={{ fontSize: '0.74rem' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Tab Content: Interactive Calendar View */}
      {activeTab === 'calendar' && (
        <div className="row g-4">
          {/* Calendar Month Matrix */}
          <div className="col-lg-8">
            <div className="glass-panel p-4 bg-white border rounded-3">
              {/* Month Navigation */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h3 className="h5 fw-bold text-dark mb-0">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="d-flex align-items-center gap-1">
                  <button 
                    onClick={handlePrevMonth} 
                    className="btn btn-sm btn-outline-secondary rounded-circle p-1"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <FiChevronLeft />
                  </button>
                  <button 
                    onClick={() => setCurrentMonth(new Date())} 
                    className="btn btn-sm btn-light border px-2.5 py-1 small"
                  >
                    Today
                  </button>
                  <button 
                    onClick={handleNextMonth} 
                    className="btn btn-sm btn-outline-secondary rounded-circle p-1"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="row g-1 text-center fw-bold text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={idx} className="col">{day}</div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="row g-1 text-center">
                {/* Blank cells for offset */}
                {Array.from({ length: firstDay }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="col p-2 text-muted opacity-25" style={{ minHeight: '65px' }} />
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateForCell = new Date(calendarYear, calendarMonthIndex, dayNum);
                  const isToday = dateForCell.toDateString() === new Date().toDateString();
                  const isSelected = dateForCell.toDateString() === selectedCalendarDate.toDateString();

                  // Find interviews on this day
                  const dayInterviews = interviews.filter(item => {
                    const itemDate = new Date(item.scheduledDate);
                    return (
                      itemDate.getFullYear() === calendarYear &&
                      itemDate.getMonth() === calendarMonthIndex &&
                      itemDate.getDate() === dayNum
                    );
                  });

                  return (
                    <div 
                      key={dayNum} 
                      onClick={() => setSelectedCalendarDate(dateForCell)}
                      className={`col p-1.5 border rounded cursor-pointer transition-all position-relative ${
                        isSelected 
                          ? 'border-primary bg-primary bg-opacity-10 shadow-xs' 
                          : isToday 
                          ? 'bg-light border-secondary border-opacity-25' 
                          : 'bg-white hover-bg-light'
                      }`}
                      style={{ minHeight: '68px', cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className={`small fw-bold ${isToday ? 'text-primary' : 'text-dark'}`} style={{ fontSize: '0.78rem' }}>
                          {dayNum}
                        </span>
                        {dayInterviews.length > 0 && (
                          <span className="badge rounded-pill bg-primary" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                            {dayInterviews.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips */}
                      <div className="d-flex flex-column gap-1 overflow-hidden" style={{ maxHeight: '38px' }}>
                        {dayInterviews.slice(0, 2).map((item) => (
                          <div 
                            key={item._id}
                            className="text-truncate px-1 rounded text-white small"
                            style={{ 
                              fontSize: '0.64rem', 
                              backgroundColor: getTrackMeta(item.track).color,
                              lineHeight: '1.2',
                              padding: '2px 3px'
                            }}
                            title={`${item.title} (${new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                          >
                            {new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {item.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Date Agenda Side Panel */}
          <div className="col-lg-4">
            <div className="glass-panel p-4 bg-white border rounded-3 h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <h3 className="h6 fw-bold text-dark mb-0">
                    Agenda: {selectedCalendarDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <button 
                    onClick={() => {
                      const dateStr = selectedCalendarDate.toISOString().split('T')[0];
                      setFormData({
                        ...initialFormState,
                        scheduledDate: dateStr,
                        scheduledTime: '10:00'
                      });
                      setShowModal(true);
                    }}
                    className="btn btn-xs btn-outline-primary d-flex align-items-center gap-1 rounded-pill px-2.5 py-1"
                    style={{ fontSize: '0.72rem' }}
                  >
                    <FiPlus /> Add Slot
                  </button>
                </div>

                {interviewsForSelectedDate.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <p className="small mb-2">No interviews scheduled for this date.</p>
                    <button 
                      onClick={() => {
                        const dateStr = selectedCalendarDate.toISOString().split('T')[0];
                        setFormData({
                          ...initialFormState,
                          scheduledDate: dateStr,
                          scheduledTime: '10:00'
                        });
                        setShowModal(true);
                      }}
                      className="btn btn-sm btn-outline-dark rounded-pill px-3 py-1 small"
                    >
                      Schedule Interview on this Day
                    </button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {interviewsForSelectedDate.map(item => (
                      <div key={item._id} className="p-3 border rounded-3 bg-light bg-opacity-50">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <strong className="text-dark small">{item.title}</strong>
                          <span className="badge bg-white text-dark border small" style={{ fontSize: '0.68rem' }}>
                            {new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-muted small mb-2" style={{ fontSize: '0.72rem' }}>
                          Track: {item.track.toUpperCase()} • {item.durationMinutes} mins • {item.difficulty}
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <a 
                            href={item.googleCalendarUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary small text-decoration-none"
                            style={{ fontSize: '0.72rem' }}
                          >
                            <FiExternalLink /> Google Cal
                          </a>
                          <button
                            onClick={() => handleStartInterview(item._id)}
                            className="btn btn-xs btn-primary-purple rounded-pill px-2.5 py-1"
                            style={{ fontSize: '0.72rem' }}
                          >
                            <FiPlay /> Launch
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-3 bg-light mt-4" style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                <FiInfo className="me-1 text-primary" />
                Interviews scheduled in your calendar trigger 15-minute sound alerts and in-app countdown notifications.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab Content: Past & Attendance History */}
      {activeTab === 'past' && (
        <div className="glass-panel p-4 bg-white border rounded-3">
          <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
            <h3 className="h6 fw-bold text-dark mb-0">Past Scheduled Interviews Log</h3>
            <span className="text-muted small">Showing historical scheduled records</span>
          </div>

          {interviews.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="small">No past scheduled interviews recorded yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                <thead className="table-light">
                  <tr>
                    <th>Interview Title</th>
                    <th>Track</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map(item => (
                    <tr key={item._id}>
                      <td>
                        <strong className="text-dark d-block">{item.title}</strong>
                        <span className="text-muted small" style={{ fontSize: '0.7rem' }}>{item.role}</span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {item.track.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {new Date(item.scheduledDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                        {new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>{item.durationMinutes} mins</td>
                      <td>
                        {item.status === 'completed' && (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                            Completed
                          </span>
                        )}
                        {item.status === 'scheduled' && (
                          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1">
                            Scheduled
                          </span>
                        )}
                        {item.status === 'in_progress' && (
                          <span className="badge bg-warning bg-opacity-15 text-dark border border-warning border-opacity-25 px-2 py-1">
                            In Progress
                          </span>
                        )}
                        {item.status === 'cancelled' && (
                          <span className="badge bg-secondary bg-opacity-10 text-muted border px-2 py-1">
                            Cancelled
                          </span>
                        )}
                        {item.status === 'missed' && (
                          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1">
                            Missed
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1.5">
                          <button
                            onClick={() => handleStartInterview(item._id)}
                            className="btn btn-xs btn-outline-dark rounded-pill px-2.5 py-1"
                            style={{ fontSize: '0.72rem' }}
                          >
                            <FiPlay /> Launch
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="btn btn-xs btn-light border rounded-circle p-1"
                            title="Reschedule"
                          >
                            <FiEdit2 style={{ fontSize: '0.7rem' }} />
                          </button>
                          <button
                            onClick={() => handleDeleteInterview(item._id)}
                            className="btn btn-xs btn-light border text-danger rounded-circle p-1"
                            title="Delete Record"
                          >
                            <FiTrash2 style={{ fontSize: '0.7rem' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 8. Tab Content: Prep Tips & Reminders Guide */}
      {activeTab === 'tips' && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="glass-panel p-4 bg-white border rounded-3 h-100">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                  <FiBell style={{ fontSize: '1.2rem' }} />
                </span>
                <h3 className="h6 fw-bold text-dark mb-0">Calendar Reminders & Sync</h3>
              </div>
              <ul className="text-muted small d-flex flex-column gap-2.5 ps-3 mb-0" style={{ lineHeight: '1.6' }}>
                <li><strong>Google Calendar 1-Click Sync:</strong> Click the "Google Cal" button on any scheduled session to immediately add the event, meeting link, and preparation notes into your personal calendar.</li>
                <li><strong>Apple / Outlook iCal (.ics) Export:</strong> Download standard .ics calendar files that include automated 15-minute and 1-hour pre-interview alarms.</li>
                <li><strong>In-App Countdown Alarms:</strong> The platform will alert you with live header banners when an interview is starting within 15 minutes.</li>
                <li><strong>Gamification Multiplier:</strong> Attending scheduled interviews protects your daily streak and awards bonus scheduling XP!</li>
              </ul>
            </div>
          </div>

          <div className="col-md-6">
            <div className="glass-panel p-4 bg-white border rounded-3 h-100">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="p-2 rounded-3 bg-success bg-opacity-10 text-success">
                  <FiZap style={{ fontSize: '1.2rem' }} />
                </span>
                <h3 className="h6 fw-bold text-dark mb-0">Pre-Interview Warm-up Checklist</h3>
              </div>
              <ul className="text-muted small d-flex flex-column gap-2.5 ps-3 mb-0" style={{ lineHeight: '1.6' }}>
                <li><strong>Audio & Video Calibration:</strong> For Voice or Video AI interviews, ensure your microphone and webcam permissions are enabled 5 minutes prior to the session.</li>
                <li><strong>Environment Setup:</strong> Use headphones with an external mic to reduce echo and ambient noise.</li>
                <li><strong>Coding Track Practice:</strong> Review core time & space complexities (Big-O) and key data structure primitives (Hash Maps, Heaps, Dynamic Programming).</li>
                <li><strong>STAR Behavioral Framework:</strong> Structure your leadership answers into Situation, Task, Action, and Result with quantifiable metrics.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Schedule New / Reschedule Interview */}
      {showModal && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              {/* Modal Header */}
              <div className="modal-header bg-light border-bottom px-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                    <FiCalendar style={{ fontSize: '1.1rem' }} />
                  </span>
                  <h5 className="modal-title fw-bold text-dark mb-0">
                    {editingId ? 'Reschedule / Edit Interview' : 'Schedule New Mock Interview'}
                  </h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close shadow-none" 
                  onClick={() => setShowModal(false)} 
                />
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitForm}>
                <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  
                  {/* Track Selection Grid */}
                  <div className="mb-4">
                    <label className="form-label fw-bold small text-dark mb-2">Select Interview Track *</label>
                    <div className="row g-2">
                      {[
                        { id: 'text', label: 'Interactive AI', icon: <FiMessageSquare />, desc: 'Text & full loop evaluation' },
                        { id: 'coding', label: 'Coding Round', icon: <FiCode />, desc: 'Live DSA code editor' },
                        { id: 'system_design', label: 'System Design', icon: <FiLayers />, desc: 'Architecture canvas' },
                        { id: 'voice', label: 'Voice AI', icon: <FiMic />, desc: 'Real-time conversational' },
                        { id: 'video', label: 'Video AI', icon: <FiCamera />, desc: 'Facial & emotion analysis' },
                        { id: 'company_specific', label: 'Company Specific', icon: <FiBriefcase />, desc: 'Google, Amazon, TCS, etc.' }
                      ].map(t => (
                        <div key={t.id} className="col-6 col-md-4">
                          <div
                            onClick={() => setFormData({ ...formData, track: t.id })}
                            className={`p-3 border rounded-3 cursor-pointer transition-all h-100 ${
                              formData.track === t.id 
                                ? 'border-primary bg-primary bg-opacity-10 text-primary fw-bold shadow-xs' 
                                : 'bg-white hover-bg-light text-dark'
                            }`}
                            style={{ cursor: 'pointer', border: formData.track === t.id ? '2px solid var(--primary-purple)' : '1px solid #e5e7eb' }}
                          >
                            <div className="d-flex align-items-center gap-2 mb-1">
                              {t.icon}
                              <span className="small">{t.label}</span>
                            </div>
                            <p className="text-muted mb-0" style={{ fontSize: '0.68rem' }}>{t.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Company Track Selector (if company_specific) */}
                  {formData.track === 'company_specific' && (
                    <div className="mb-3 p-3 rounded-3 bg-light border">
                      <label className="form-label fw-bold small text-dark mb-2">Target Company *</label>
                      <div className="d-flex flex-wrap gap-1.5 mb-2">
                        {curatedCompanies.map(comp => (
                          <button
                            key={comp}
                            type="button"
                            onClick={() => setFormData({ ...formData, companyName: comp })}
                            className={`btn btn-xs rounded-pill px-3 py-1 ${
                              formData.companyName === comp ? 'btn-dark fw-bold' : 'btn-outline-secondary bg-white'
                            }`}
                            style={{ fontSize: '0.74rem' }}
                          >
                            🏢 {comp}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Or type custom company name..."
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="form-control form-control-sm"
                      />
                    </div>
                  )}

                  {/* Target Role & Title */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-dark mb-1">Target Role / Job Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Software Engineer, Frontend Architect"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-dark mb-1">Session Title (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Google SDE II Prep Round"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="form-control form-control-sm"
                      />
                    </div>
                  </div>

                  {/* Date & Time with Shortcut Presets */}
                  <div className="mb-3 p-3 rounded-3 bg-light border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label fw-bold small text-dark mb-0">Date & Time *</label>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>Quick presets:</span>
                    </div>

                    {/* Quick Shortcut Buttons */}
                    <div className="d-flex flex-wrap gap-1.5 mb-3">
                      <button 
                        type="button" 
                        onClick={() => applyPresetTime('today_2h')} 
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        Today in 2 Hours
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyPresetTime('today_evening')} 
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        Today at 7:00 PM
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyPresetTime('tomorrow_10am')} 
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        Tomorrow 10:00 AM
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyPresetTime('tomorrow_6pm')} 
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        Tomorrow 6:00 PM
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyPresetTime('weekend')} 
                        className="btn btn-xs btn-outline-secondary bg-white rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        This Weekend
                      </button>
                    </div>

                    <div className="row g-2">
                      <div className="col-md-7">
                        <label className="form-label small text-muted mb-1">Date</label>
                        <input
                          type="date"
                          required
                          value={formData.scheduledDate}
                          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-5">
                        <label className="form-label small text-muted mb-1">Time</label>
                        <input
                          type="time"
                          required
                          value={formData.scheduledTime}
                          onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Difficulty, Duration & Persona */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-bold small text-dark mb-1">Difficulty</label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        className="form-select form-select-sm"
                      >
                        <option value="Easy">Easy (Fundamentals)</option>
                        <option value="Medium">Medium (Industry Standard)</option>
                        <option value="Hard">Hard (FAANG / Staff Level)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-bold small text-dark mb-1">Duration</label>
                      <select
                        value={formData.durationMinutes}
                        onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                        className="form-select form-select-sm"
                      >
                        <option value="15">15 Minutes (Rapid Fire)</option>
                        <option value="30">30 Minutes (Standard)</option>
                        <option value="45">45 Minutes (Full Round)</option>
                        <option value="60">60 Minutes (In-Depth)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-bold small text-dark mb-1">Interviewer Persona</label>
                      <select
                        value={formData.interviewerPersona}
                        onChange={(e) => setFormData({ ...formData, interviewerPersona: e.target.value })}
                        className="form-select form-select-sm"
                      >
                        <option value="Friendly Mentor">Friendly Mentor (Encouraging)</option>
                        <option value="Bar Raiser">Bar Raiser (Rigorous & In-depth)</option>
                        <option value="Speed Challenger">Speed Challenger (Rapid Fire)</option>
                        <option value="HR Specialist">HR Specialist (Behavioral & STAR)</option>
                      </select>
                    </div>
                  </div>

                  {/* Focus Topics Multi-select */}
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-dark mb-1">Focus Topics & Technologies</label>
                    <div className="d-flex flex-wrap gap-1.5 mb-2">
                      {topicSuggestions.map(topic => {
                        const isSelected = formData.topics.includes(topic);
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => toggleTopic(topic)}
                            className={`btn btn-xs rounded-pill px-2.5 py-1 ${
                              isSelected ? 'btn-primary-purple fw-bold' : 'btn-outline-secondary bg-white'
                            }`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {isSelected && '✓ '} {topic}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes & Preparation Goals */}
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-dark mb-1">Preparation Goals & Notes</label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Focus on graph algorithms, explain time complexities clearly, and practice STAR format."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="form-control form-control-sm"
                    />
                  </div>

                  {/* Reminder Preferences Toggles */}
                  <div className="p-3 rounded-3 bg-light border">
                    <label className="form-label fw-bold small text-dark mb-2">Notification & Reminder Preferences</label>
                    <div className="row g-2" style={{ fontSize: '0.76rem' }}>
                      <div className="col-6 col-md-4">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="rem15"
                            checked={formData.reminderPreferences.fifteenMin}
                            onChange={(e) => setFormData({
                              ...formData,
                              reminderPreferences: { ...formData.reminderPreferences, fifteenMin: e.target.checked }
                            })}
                          />
                          <label className="form-check-label text-dark" htmlFor="rem15">15 Mins Before</label>
                        </div>
                      </div>

                      <div className="col-6 col-md-4">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="rem1h"
                            checked={formData.reminderPreferences.oneHour}
                            onChange={(e) => setFormData({
                              ...formData,
                              reminderPreferences: { ...formData.reminderPreferences, oneHour: e.target.checked }
                            })}
                          />
                          <label className="form-check-label text-dark" htmlFor="rem1h">1 Hour Before</label>
                        </div>
                      </div>

                      <div className="col-6 col-md-4">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="rem1d"
                            checked={formData.reminderPreferences.oneDay}
                            onChange={(e) => setFormData({
                              ...formData,
                              reminderPreferences: { ...formData.reminderPreferences, oneDay: e.target.checked }
                            })}
                          />
                          <label className="form-check-label text-dark" htmlFor="rem1d">1 Day Before</label>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-light border-top px-4 py-3">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary rounded-pill px-4" 
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="btn btn-primary-purple d-flex align-items-center gap-2 rounded-pill px-4 fw-semibold shadow-sm"
                  >
                    <FiCheck />
                    <span>{submitting ? 'Saving Schedule...' : editingId ? 'Update Schedule' : 'Confirm Schedule'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InterviewScheduler;
