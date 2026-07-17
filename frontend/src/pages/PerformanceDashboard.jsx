import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiActivity, FiAward, FiClock, FiCheckSquare, FiAlertCircle,
  FiTrendingUp, FiCheck, FiSliders, FiArrowRight, FiInfo, FiZap, FiDownload
} from 'react-icons/fi';
import {
  LineChart, Line, BarChart, Bar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const PerformanceDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [skills, setSkills] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [strongSkills, setStrongSkills] = useState([]);
  const [streakData, setStreakData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, analRes, skillRes, streakRes, recRes] = await Promise.all([
        axiosInstance.get('/dashboard/summary'),
        axiosInstance.get('/dashboard/analytics'),
        axiosInstance.get('/dashboard/skills'),
        axiosInstance.get('/dashboard/streak'),
        axiosInstance.get('/dashboard/recommendations')
      ]);

      if (sumRes.data.success) setSummary(sumRes.data.summary);
      if (analRes.data.success) setAnalytics(analRes.data);
      if (skillRes.data.success) {
        setSkills(skillRes.data.skills);
        setWeakTopics(skillRes.data.weakTopics);
        setStrongSkills(skillRes.data.strongSkills);
      }
      if (streakRes.data.success) setStreakData(streakRes.data);
      if (recRes.data.success) setRecommendations(recRes.data.recommendations);

    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      toast.error('Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-4 text-start">
        {/* Title skeleton */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <div className="skeleton-pulse mb-2" style={{ width: '180px', height: '32px' }} />
            <div className="skeleton-pulse" style={{ width: '260px', height: '18px' }} />
          </div>
          <div className="skeleton-pulse" style={{ width: '160px', height: '38px' }} />
        </div>

        {/* Top summary stats skeletons */}
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div className="col-6 col-md-3" key={i}>
              <div className="glass-panel p-4 skeleton-pulse" style={{ height: '90px', border: '1px solid var(--border-grey)' }} />
            </div>
          ))}
        </div>

        {/* Charts & panels grid skeletons */}
        <div className="row g-4 mb-4">
          <div className="col-md-8">
            <div className="glass-panel p-4 mb-4 skeleton-pulse" style={{ height: '340px', border: '1px solid var(--border-grey)' }} />
            <div className="glass-panel p-4 skeleton-pulse" style={{ height: '320px', border: '1px solid var(--border-grey)' }} />
          </div>
          <div className="col-md-4">
            <div className="glass-panel p-4 mb-4 skeleton-pulse" style={{ height: '280px', border: '1px solid var(--border-grey)' }} />
            <div className="glass-panel p-4 skeleton-pulse" style={{ height: '260px', border: '1px solid var(--border-grey)' }} />
          </div>
        </div>
      </div>
    );
  }

  // Formatting Line Chart data (Score Trends over time)
  const lineChartData = analytics?.trends?.map((t, idx) => ({
    name: `Int ${idx + 1}`,
    Score: t.overallScore,
    date: new Date(t.createdAt).toLocaleDateString()
  })) || [];

  // Formatting Bar Chart data (Category Averages)
  const barChartData = [
    { name: 'Technical', Score: analytics?.categoryAverages?.technical || 0 },
    { name: 'HR/Behavioral', Score: analytics?.categoryAverages?.hr || 0 },
    { name: 'Communication', Score: analytics?.categoryAverages?.communication || 0 },
    { name: 'Confidence', Score: analytics?.categoryAverages?.confidence || 0 }
  ];

  // Formatting Radar Chart data (Skills)
  const radarChartData = skills.map(s => ({
    subject: s.skill,
    A: s.avgScore,
    fullMark: 100
  })).slice(0, 7);

  // Fallback radar if not enough interviews taken
  const finalRadarData = radarChartData.length >= 3 ? radarChartData : [
    { subject: 'Technical', A: summary?.avgTechnicalScore || 60, fullMark: 100 },
    { subject: 'HR/Behavioral', A: summary?.avgHRScore || 60, fullMark: 100 },
    { subject: 'Communication', A: summary?.avgCommunicationScore || 60, fullMark: 100 },
    { subject: 'Confidence', A: summary?.avgConfidenceScore || 60, fullMark: 100 }
  ];

  // Pie chart colors
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f0e'];

  const handleRetakeRecommend = async (rec) => {
    try {
      setLoading(true);
      const response = await axiosInstance.post('/interviews/create', {
        interviewType: rec.topic === 'Behavioral' ? 'HR' : 'Technical',
        role: rec.role,
        company: 'Practice Company',
        experienceLevel: '1-3 Years',
        difficulty: rec.difficulty || 'Medium',
        duration: 20,
        questionCount: 5,
        preferredLanguage: 'English',
        focusAreas: [rec.topic],
        interviewMode: 'Text'
      });

      if (response.data.success) {
        toast.success('Interview setup created successfully');
        navigate(`/interview/${response.data.session.interviewId}/questions`);
      }
    } catch (error) {
      console.error('Error starting recommended interview:', error);
      toast.error('Failed to start mock session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 text-start">
      {/* Title Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Performance Dashboard</h2>
          <p className="text-muted small mb-0">Track your interview preparation statistics, skill growth, and achievements.</p>
        </div>
        <Link to="/interviews/history" className="btn btn-primary-purple d-flex align-items-center gap-1.5 py-2 px-3 shadow-sm">
          View Interview History <FiArrowRight />
        </Link>
      </div>

      {/* Notifications banner */}
      {streakData?.notifications?.map((notif, idx) => (
        <div key={idx} className="alert alert-info border-0 shadow-sm mb-4 d-flex align-items-center gap-2" role="alert" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
          <FiInfo className="fs-5 flex-shrink-0" />
          <span className="small fw-semibold">{notif.text}</span>
        </div>
      ))}

      {/* Top Level Summary Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Average Score</span>
            <strong className="display-6 fw-bold text-primary" style={{ color: 'var(--primary-purple)' }}>
              {summary?.overallAverageScore || 0}%
            </strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Completed</span>
            <strong className="display-6 fw-bold text-dark">{summary?.interviewsCompleted || 0}</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Current Streak</span>
            <strong className="display-6 fw-bold text-success">{summary?.currentStreak || 0} Days</strong>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="glass-panel p-3 bg-white border shadow-sm text-center h-100">
            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">Practice Hours</span>
            <strong className="display-6 fw-bold text-info">{summary?.hoursPracticed || 0} hrs</strong>
          </div>
        </div>
      </div>

      {/* Detailed Stat Stats Grid */}
      <div className="row g-4 mb-4">
        <div className="col-md-8">
          {/* Performance Trend Chart */}
          <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5">
              <FiTrendingUp className="text-primary" /> Performance Score Trend
            </h3>
            <div style={{ width: '100%', height: '280px' }}>
              {lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Score" stroke="var(--primary-purple)" strokeWidth={2.5} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex justify-content-center align-items-center h-100 text-muted small">
                  Complete more mock interviews to visualize performance trends over time.
                </div>
              )}
            </div>
          </div>

          {/* Bar Chart Categories comparison */}
          <div className="glass-panel p-4 bg-white border shadow-sm">
            <h3 className="h6 fw-bold text-dark mb-3">Interview Categories performance</h3>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="Score" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar Radar and Type pie charts */}
        <div className="col-md-4">
          {/* Radar Chart */}
          <div className="glass-panel p-4 bg-white border shadow-sm mb-4 text-center">
            <h3 className="h6 fw-bold text-dark mb-3 text-start">Skill Map Analysis</h3>
            <div style={{ width: '100%', height: '220px' }} className="d-flex justify-content-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" radius="70%" data={finalRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                  <Radar name="Candidate" dataKey="A" stroke="var(--primary-purple)" fill="var(--primary-purple)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="glass-panel p-4 bg-white border shadow-sm text-center">
            <h3 className="h6 fw-bold text-dark mb-3 text-start">Interview types Distribution</h3>
            <div style={{ width: '100%', height: '200px' }} className="d-flex justify-content-center">
              {analytics?.typeDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.typeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {analytics.typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex justify-content-center align-items-center h-100 text-muted small">
                  No distribution details recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Weak Areas & Dynamic recommendations */}
      <div className="row g-4 mb-4">
        {/* Weak Areas List */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100">
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5 text-danger">
              <FiAlertCircle /> Priority Weak Areas
            </h3>
            {weakTopics.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {weakTopics.map((topic, idx) => (
                  <div key={idx} className="border rounded-3 p-3 bg-light bg-opacity-25 d-flex justify-content-between align-items-center">
                    <div>
                      <strong className="d-block text-dark small">{topic.topic}</strong>
                      <span className="text-muted small">Asked {topic.timesAsked} times &bull; Score: <strong className="text-danger">{topic.averageScore}%</strong></span>
                    </div>
                    <button
                      onClick={() => handleRetakeRecommend(topic)}
                      className="btn btn-sm btn-outline-danger px-3 py-1.5"
                      style={{ fontSize: '0.74rem' }}
                    >
                      Practice Topic
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted small">
                No weak areas identified. Excellent technical accuracy!
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="col-md-6">
          <div className="glass-panel p-4 bg-white border shadow-sm h-100">
            <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-1.5 text-primary">
              <FiZap /> Recommended next sessions
            </h3>
            {recommendations.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="border rounded-3 p-3 bg-light bg-opacity-25 d-flex justify-content-between align-items-center">
                    <div>
                      <strong className="d-block text-dark small">{rec.title}</strong>
                      <p className="text-muted mb-0" style={{ fontSize: '0.74rem' }}>{rec.reason}</p>
                    </div>
                    <button
                      onClick={() => handleRetakeRecommend(rec)}
                      className="btn btn-sm btn-primary-purple px-3 py-1.5 text-white flex-shrink-0"
                      style={{ fontSize: '0.74rem' }}
                    >
                      Launch
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted small">
                Complete a mock session first to generate recommendations.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Streak & Achievements Grid Card */}
      <div className="glass-panel p-4 bg-white border shadow-sm mb-4">
        <h3 className="h6 fw-bold text-dark mb-4 border-bottom pb-2">Unlocked Achievements</h3>
        {streakData?.achievements?.length > 0 ? (
          <div className="row g-3">
            {streakData.achievements.map((ach, idx) => (
              <div className="col-md-4" key={idx}>
                <div className="border rounded-3 p-3 bg-light bg-opacity-50 d-flex align-items-center gap-3">
                  <div className="p-2.5 rounded-circle bg-warning bg-opacity-10 text-warning">
                    <FiAward className="fs-4" />
                  </div>
                  <div>
                    <strong className="d-block text-dark small">{ach.name}</strong>
                    <span className="text-muted small" style={{ fontSize: '0.72rem' }}>{ach.description}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-muted small">
            No achievements unlocked yet. Take more interviews to earn badges!
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
