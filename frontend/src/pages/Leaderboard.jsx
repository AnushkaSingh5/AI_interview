import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAward, FiZap, FiStar, FiCheckCircle, FiClock,
  FiTrendingUp, FiShield, FiTarget, FiLayers, FiRefreshCw,
  FiInfo, FiArrowRight, FiLock, FiUnlock, FiActivity
} from 'react-icons/fi';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const Leaderboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard', 'streak', 'badges', 'levels'
  const [badgeFilter, setBadgeFilter] = useState('all'); // 'all', 'unlocked', 'locked'
  const [claimingDaily, setClaimingDaily] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [profRes, lbRes] = await Promise.all([
        axiosInstance.get('/gamification/profile'),
        axiosInstance.get('/gamification/leaderboard?filter=all-time')
      ]);

      if (profRes.data.success) {
        setProfile(profRes.data.profile);
      }
      if (lbRes.data.success) {
        setLeaderboard(lbRes.data);
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFilterChange = async (filter) => {
    try {
      const lbRes = await axiosInstance.get(`/gamification/leaderboard?filter=${filter}`);
      if (lbRes.data.success) {
        setLeaderboard(lbRes.data);
      }
    } catch (error) {
      toast.error('Failed to update leaderboard filter');
    }
  };

  const handleClaimDailyBonus = async () => {
    setClaimingDaily(true);
    try {
      const res = await axiosInstance.post('/gamification/claim-daily');
      if (res.data.success) {
        toast.success(res.data.message || 'Daily bonus claimed successfully!');
        fetchData(true);
      } else if (res.data.alreadyClaimed) {
        toast.info(res.data.message);
      }
    } catch (error) {
      toast.error('Failed to claim daily bonus');
    } finally {
      setClaimingDaily(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-start">
        <div className="skeleton-pulse mb-3" style={{ width: '220px', height: '32px' }} />
        <div className="skeleton-pulse mb-4" style={{ width: '380px', height: '18px' }} />
        <div className="glass-panel p-4 mb-4 skeleton-pulse" style={{ height: '180px' }} />
        <div className="row g-4">
          <div className="col-md-4"><div className="glass-panel p-4 skeleton-pulse" style={{ height: '300px' }} /></div>
          <div className="col-md-8"><div className="glass-panel p-4 skeleton-pulse" style={{ height: '300px' }} /></div>
        </div>
      </div>
    );
  }

  const levelDetails = profile?.levelDetails || {};
  const unlockedBadgesCount = profile?.unlockedBadges?.length || 0;
  const totalBadgesCount = profile?.badgeProgressList?.length || 12;

  const formatXpRange = (lvl) => {
    if (!lvl) return '';
    if (!lvl.maxXp || lvl.maxXp === Infinity || lvl.maxXp === null || (lvl.minXp && lvl.minXp >= 9501)) {
      return `${(lvl.minXp || 9501).toLocaleString()}+ XP`;
    }
    return `${(lvl.minXp || 0).toLocaleString()} - ${(lvl.maxXp || 0).toLocaleString()} XP`;
  };

  const filteredBadges = (profile?.badgeProgressList || []).filter(b => {
    if (badgeFilter === 'unlocked') return b.isUnlocked;
    if (badgeFilter === 'locked') return !b.isUnlocked;
    return true;
  });

  return (
    <div className="container py-4 text-start">
      {/* Title & Actions */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <FiAward style={{ color: 'var(--primary-purple)' }} /> Leaderboard & Achievements
          </h2>
          <p className="text-muted small mb-0">
            Gamify your interview preparation. Earn XP, maintain daily streaks, unlock badges, and level up your career rank!
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 px-3 py-2 rounded-3 bg-white shadow-sm"
          >
            <FiRefreshCw className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync XP'}</span>
          </button>
          <button
            onClick={handleClaimDailyBonus}
            disabled={claimingDaily}
            className="btn btn-primary-purple btn-sm text-white d-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-sm"
          >
            <FiZap style={{ fill: 'white' }} />
            <span>{claimingDaily ? 'Claiming...' : 'Claim Daily Bonus XP'}</span>
          </button>
        </div>
      </div>

      {/* Gamification Profile Hero Banner */}
      <div className="card border-0 bg-dark text-white rounded-4 p-4 mb-4 shadow-lg position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1f1a3a 0%, #302058 50%, #151128 100%)' }}>
        <div className="row g-4 align-items-center">
          {/* Level & XP Progression */}
          <div className="col-lg-5">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle border border-2 border-warning shadow-sm"
                style={{ width: '64px', height: '64px', fontSize: '2rem', backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                {levelDetails.icon || '🌱'}
              </div>
              <div>
                <span className="badge bg-warning text-dark fw-bold px-2.5 py-1 mb-1">
                  Level {levelDetails.level || 1}
                </span>
                <h4 className="fw-bold mb-0 text-white">{levelDetails.levelTitle || 'Novice Apprentice'}</h4>
                <span className="text-white-50 small">Target: {profile?.targetRole || 'Software Engineer'}</span>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="mt-3">
              <div className="d-flex justify-content-between text-white-50 small mb-1" style={{ fontSize: '0.78rem' }}>
                <span>XP: <strong className="text-white">{profile?.totalXp || 0} XP</strong></span>
                <span>{levelDetails.xpToNextLevel > 0 ? `${levelDetails.xpToNextLevel} XP to ${levelDetails.nextLevelTitle}` : 'Max Rank Achieved'}</span>
              </div>
              <div className="progress bg-white bg-opacity-10" style={{ height: '10px', borderRadius: '6px' }}>
                <div
                  className="progress-bar bg-warning"
                  role="progressbar"
                  style={{ width: `${levelDetails.progressPercent || 0}%`, transition: 'width 0.6s ease' }}
                  aria-valuenow={levelDetails.progressPercent || 0}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="col-lg-7">
            <div className="row g-3 text-center">
              {/* Metric 1: Current Streak */}
              <div className="col-6 col-sm-3">
                <div className="p-3 rounded-3 bg-white bg-opacity-10 border border-white border-opacity-10 h-100">
                  <div className="d-flex align-items-center justify-content-center gap-1 text-warning mb-1">
                    <span className="fs-5">🔥</span>
                    <strong className="h5 fw-bold mb-0">{profile?.currentStreak || 0}d</strong>
                  </div>
                  <span className="text-white-50 small d-block" style={{ fontSize: '0.72rem' }}>ACTIVE STREAK</span>
                  <span className="text-white-50" style={{ fontSize: '0.65rem' }}>Best: {profile?.longestStreak || 0}d</span>
                </div>
              </div>

              {/* Metric 2: Global Rank */}
              <div className="col-6 col-sm-3">
                <div className="p-3 rounded-3 bg-white bg-opacity-10 border border-white border-opacity-10 h-100">
                  <div className="d-flex align-items-center justify-content-center gap-1 text-info mb-1">
                    <FiTrendingUp className="fs-5" />
                    <strong className="h5 fw-bold mb-0">#{profile?.rank || 1}</strong>
                  </div>
                  <span className="text-white-50 small d-block" style={{ fontSize: '0.72rem' }}>GLOBAL RANK</span>
                  <span className="text-white-50" style={{ fontSize: '0.65rem' }}>Top {Math.max(1, Math.round(((profile?.rank || 1) / (profile?.totalCandidates || 1)) * 100))}%</span>
                </div>
              </div>

              {/* Metric 3: Badges Unlocked */}
              <div className="col-6 col-sm-3">
                <div className="p-3 rounded-3 bg-white bg-opacity-10 border border-white border-opacity-10 h-100">
                  <div className="d-flex align-items-center justify-content-center gap-1 text-success mb-1">
                    <FiAward className="fs-5" />
                    <strong className="h5 fw-bold mb-0">{unlockedBadgesCount}/{totalBadgesCount}</strong>
                  </div>
                  <span className="text-white-50 small d-block" style={{ fontSize: '0.72rem' }}>ACHIEVEMENTS</span>
                  <span className="text-white-50" style={{ fontSize: '0.65rem' }}>{Math.round((unlockedBadgesCount / totalBadgesCount) * 100)}% Unlocked</span>
                </div>
              </div>

              {/* Metric 4: Mock Interviews */}
              <div className="col-6 col-sm-3">
                <div className="p-3 rounded-3 bg-white bg-opacity-10 border border-white border-opacity-10 h-100">
                  <div className="d-flex align-items-center justify-content-center gap-1 text-primary mb-1">
                    <FiTarget className="fs-5 text-white" />
                    <strong className="h5 fw-bold mb-0 text-white">{profile?.stats?.totalInterviewsCompleted || 0}</strong>
                  </div>
                  <span className="text-white-50 small d-block" style={{ fontSize: '0.72rem' }}>INTERVIEWS</span>
                  <span className="text-white-50" style={{ fontSize: '0.65rem' }}>Best Score: {profile?.stats?.highestInterviewScore || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <ul className="nav nav-pills gap-2 mb-4 border-bottom pb-3">
        <li className="nav-item">
          <button
            className={`nav-link btn-sm d-flex align-items-center gap-1.5 ${
              activeTab === 'leaderboard' ? 'active bg-primary-purple text-white' : 'text-dark border bg-white'
            }`}
            onClick={() => { setActiveTab('leaderboard'); handleFilterChange('all-time'); }}
          >
            <FiAward />
            <span>Global XP Leaderboard</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm d-flex align-items-center gap-1.5 ${
              activeTab === 'streak' ? 'active bg-primary-purple text-white' : 'text-dark border bg-white'
            }`}
            onClick={() => { setActiveTab('streak'); handleFilterChange('streak'); }}
          >
            <span style={{ fontSize: '0.9rem' }}>🔥</span>
            <span>Streak Masters</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm d-flex align-items-center gap-1.5 ${
              activeTab === 'badges' ? 'active bg-primary-purple text-white' : 'text-dark border bg-white'
            }`}
            onClick={() => setActiveTab('badges')}
          >
            <FiAward />
            <span>Badges & Achievements ({unlockedBadgesCount}/{totalBadgesCount})</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm d-flex align-items-center gap-1.5 ${
              activeTab === 'levels' ? 'active bg-primary-purple text-white' : 'text-dark border bg-white'
            }`}
            onClick={() => setActiveTab('levels')}
          >
            <FiShield />
            <span>Skill Levels & XP Guide</span>
          </button>
        </li>
      </ul>

      {/* TAB 1 & TAB 2: Leaderboards (XP & Streak) */}
      {(activeTab === 'leaderboard' || activeTab === 'streak') && (
        <div>
          {/* Top 3 Podium (If at least 2 candidates) */}
          {leaderboard?.topThree && leaderboard.topThree.length >= 2 && (
            <div className="row g-3 mb-4 justify-content-center text-center">
              {/* 2nd Place Silver */}
              {leaderboard.topThree[1] && (
                <div className="col-4 col-md-3 order-1 order-md-1 d-flex flex-column justify-content-end">
                  <div className="card border-0 bg-light rounded-4 p-3 shadow-xs h-100 d-flex flex-column justify-content-end align-items-center" style={{ borderTop: '4px solid #adb5bd' }}>
                    <div className="position-relative mb-2">
                      <div className="rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center text-dark fw-bold fs-4" style={{ width: '56px', height: '56px' }}>
                        {leaderboard.topThree[1].avatar ? <img src={leaderboard.topThree[1].avatar} alt="" className="w-100 h-100 rounded-circle" /> : leaderboard.topThree[1].name[0]?.toUpperCase()}
                      </div>
                      <span className="position-absolute bottom-0 end-0 badge rounded-pill bg-secondary text-white" style={{ fontSize: '0.65rem' }}>
                        🥈 2nd
                      </span>
                    </div>
                    <strong className="d-block text-dark small text-truncate w-100 mb-1">{leaderboard.topThree[1].name}</strong>
                    <span className="badge bg-secondary bg-opacity-10 text-secondary mb-2" style={{ fontSize: '0.68rem' }}>
                      {leaderboard.topThree[1].levelTitle}
                    </span>
                    <strong className="text-primary small" style={{ color: 'var(--primary-purple)' }}>
                      {activeTab === 'streak' ? `${leaderboard.topThree[1].currentStreak}d Streak` : `${leaderboard.topThree[1].totalXp} XP`}
                    </strong>
                  </div>
                </div>
              )}

              {/* 1st Place Gold */}
              {leaderboard.topThree[0] && (
                <div className="col-4 col-md-3 order-0 order-md-2 d-flex flex-column justify-content-end">
                  <div className="card border-0 bg-warning bg-opacity-10 rounded-4 p-4 shadow-sm h-100 d-flex flex-column justify-content-end align-items-center" style={{ borderTop: '5px solid #ffc107' }}>
                    <div className="position-relative mb-2">
                      <div className="rounded-circle bg-warning bg-opacity-25 d-flex align-items-center justify-content-center text-dark fw-bold fs-3 border border-2 border-warning" style={{ width: '68px', height: '68px' }}>
                        {leaderboard.topThree[0].avatar ? <img src={leaderboard.topThree[0].avatar} alt="" className="w-100 h-100 rounded-circle" /> : leaderboard.topThree[0].name[0]?.toUpperCase()}
                      </div>
                      <span className="position-absolute bottom-0 end-0 badge rounded-pill bg-warning text-dark fw-bold" style={{ fontSize: '0.72rem' }}>
                        🥇 1st
                      </span>
                    </div>
                    <strong className="d-block text-dark mb-1 text-truncate w-100">{leaderboard.topThree[0].name}</strong>
                    <span className="badge bg-warning bg-opacity-25 text-dark mb-2" style={{ fontSize: '0.72rem' }}>
                      👑 {leaderboard.topThree[0].levelTitle}
                    </span>
                    <strong className="text-dark h6 fw-bold mb-0">
                      {activeTab === 'streak' ? `🔥 ${leaderboard.topThree[0].currentStreak} Days Streak` : `⚡ ${leaderboard.topThree[0].totalXp} XP`}
                    </strong>
                  </div>
                </div>
              )}

              {/* 3rd Place Bronze */}
              {leaderboard.topThree[2] && (
                <div className="col-4 col-md-3 order-2 order-md-3 d-flex flex-column justify-content-end">
                  <div className="card border-0 bg-light rounded-4 p-3 shadow-xs h-100 d-flex flex-column justify-content-end align-items-center" style={{ borderTop: '4px solid #cd7f32' }}>
                    <div className="position-relative mb-2">
                      <div className="rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center text-dark fw-bold fs-4" style={{ width: '56px', height: '56px' }}>
                        {leaderboard.topThree[2].avatar ? <img src={leaderboard.topThree[2].avatar} alt="" className="w-100 h-100 rounded-circle" /> : leaderboard.topThree[2].name[0]?.toUpperCase()}
                      </div>
                      <span className="position-absolute bottom-0 end-0 badge rounded-pill bg-dark text-white" style={{ fontSize: '0.65rem' }}>
                        🥉 3rd
                      </span>
                    </div>
                    <strong className="d-block text-dark small text-truncate w-100 mb-1">{leaderboard.topThree[2].name}</strong>
                    <span className="badge bg-secondary bg-opacity-10 text-secondary mb-2" style={{ fontSize: '0.68rem' }}>
                      {leaderboard.topThree[2].levelTitle}
                    </span>
                    <strong className="text-primary small" style={{ color: 'var(--primary-purple)' }}>
                      {activeTab === 'streak' ? `${leaderboard.topThree[2].currentStreak}d Streak` : `${leaderboard.topThree[2].totalXp} XP`}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Ranked Table */}
          <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-4" style={{ width: '80px' }}>Rank</th>
                    <th>Candidate</th>
                    <th>Target Role</th>
                    <th>Skill Level</th>
                    <th>Streak</th>
                    <th className="text-end pe-4">Total XP</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard?.rankedList?.map((c, idx) => {
                    const isMe = c.isCurrentUser;
                    const rankMedals = { 1: '🥇', 2: '🥈', 3: '🥉' };

                    return (
                      <tr
                        key={idx}
                        className={isMe ? 'table-primary bg-primary bg-opacity-10' : ''}
                        style={{ fontWeight: isMe ? '600' : 'normal' }}
                      >
                        <td className="ps-4">
                          <span className="d-inline-flex align-items-center gap-1">
                            {rankMedals[c.rank] && <span className="fs-5">{rankMedals[c.rank]}</span>}
                            <strong className="text-dark">#{c.rank}</strong>
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-light border d-flex align-items-center justify-content-center fw-bold text-dark"
                              style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}
                            >
                              {c.avatar ? <img src={c.avatar} alt="" className="w-100 h-100 rounded-circle" /> : c.name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <span className="text-dark d-block">
                                {c.name} {isMe && <span className="badge bg-primary-purple text-white ms-1" style={{ fontSize: '0.65rem' }}>YOU</span>}
                              </span>
                              <span className="text-muted" style={{ fontSize: '0.72rem' }}>{c.badgesCount} badges unlocked</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted small">{c.targetRole}</td>
                        <td>
                          <span className="badge bg-light border text-dark d-inline-flex align-items-center gap-1 py-1.5 px-2">
                            <span>{c.levelIcon}</span>
                            <span>Level {c.level}: {c.levelTitle}</span>
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${c.currentStreak > 0 ? 'bg-warning bg-opacity-25 text-dark' : 'bg-light border text-muted'} py-1 px-2`}>
                            🔥 {c.currentStreak} Days
                          </span>
                        </td>
                        <td className="text-end pe-4">
                          <strong className="text-dark h6 fw-bold mb-0">{c.totalXp} XP</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Badges & Achievements Gallery */}
      {activeTab === 'badges' && (
        <div>
          {/* Badge Filters Header */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
            <div>
              <h4 className="h5 fw-bold text-dark mb-1">Interview Achievements & Milestone Badges</h4>
              <p className="text-muted small mb-0">Unlock tiered badges by maintaining streaks, acing mock interviews, and completing practice sessions.</p>
            </div>
            <div className="btn-group btn-group-sm">
              <button
                className={`btn ${badgeFilter === 'all' ? 'btn-primary-purple text-white' : 'btn-outline-secondary bg-white'}`}
                onClick={() => setBadgeFilter('all')}
              >
                All Badges ({totalBadgesCount})
              </button>
              <button
                className={`btn ${badgeFilter === 'unlocked' ? 'btn-primary-purple text-white' : 'btn-outline-secondary bg-white'}`}
                onClick={() => setBadgeFilter('unlocked')}
              >
                Unlocked ({unlockedBadgesCount})
              </button>
              <button
                className={`btn ${badgeFilter === 'locked' ? 'btn-primary-purple text-white' : 'btn-outline-secondary bg-white'}`}
                onClick={() => setBadgeFilter('locked')}
              >
                In Progress ({totalBadgesCount - unlockedBadgesCount})
              </button>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="row g-3">
            {filteredBadges.map((badge, idx) => {
              const tierGradients = {
                Bronze: 'border-secondary',
                Silver: 'border-info',
                Gold: 'border-warning',
                Diamond: 'border-primary'
              };
              const tierBadgeColor = {
                Bronze: 'bg-secondary',
                Silver: 'bg-info text-dark',
                Gold: 'bg-warning text-dark',
                Diamond: 'bg-primary text-white'
              };

              return (
                <div key={idx} className="col-md-6 col-lg-4">
                  <div
                    className={`card h-100 rounded-4 p-3.5 shadow-sm transition-all ${
                      badge.isUnlocked ? 'bg-white border-2' : 'bg-light bg-opacity-50 border-dashed opacity-75'
                    } ${tierGradients[badge.tier] || 'border-light'}`}
                    style={{ borderLeftWidth: '5px' }}
                  >
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2.5">
                        <div
                          className={`rounded-circle d-flex align-items-center justify-content-center fs-3 ${
                            badge.isUnlocked ? 'bg-warning bg-opacity-10 border border-warning' : 'bg-light border text-muted'
                          }`}
                          style={{ width: '48px', height: '48px' }}
                        >
                          {badge.icon}
                        </div>
                        <div>
                          <strong className="text-dark d-block mb-0.5">{badge.name}</strong>
                          <span className={`badge ${tierBadgeColor[badge.tier]} py-0.5 px-2`} style={{ fontSize: '0.65rem' }}>
                            {badge.tier} Tier
                          </span>
                        </div>
                      </div>
                      <span className="badge bg-success bg-opacity-10 text-success fw-bold" style={{ fontSize: '0.72rem' }}>
                        +{badge.xpBonus} XP
                      </span>
                    </div>

                    <p className="text-muted small mb-3" style={{ fontSize: '0.76rem', lineHeight: '1.4' }}>
                      {badge.description}
                    </p>

                    {/* Progress Bar / Status */}
                    <div className="mt-auto">
                      <div className="d-flex justify-content-between text-muted small mb-1" style={{ fontSize: '0.7rem' }}>
                        <span>Progress: {badge.currentValue} / {badge.target}</span>
                        <strong>{badge.isUnlocked ? '✅ Unlocked' : `${badge.progressPercent}%`}</strong>
                      </div>
                      <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                        <div
                          className={`progress-bar ${badge.isUnlocked ? 'bg-success' : 'bg-primary-purple'}`}
                          role="progressbar"
                          style={{ width: `${badge.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Skill Levels & XP Rules Guide */}
      {activeTab === 'levels' && (
        <div>
          <div className="mb-4">
            <h4 className="h5 fw-bold text-dark mb-1">Developer Skill Ranks & XP Earning Rules</h4>
            <p className="text-muted small mb-0">Advance your engineering career rank by practicing consistently and conquering mock rounds.</p>
          </div>

          <div className="row g-4 mb-4">
            {/* Left: 8 Career Ranks */}
            <div className="col-lg-7">
              <h5 className="h6 fw-bold text-dark mb-3">8 Engineering Skill Levels</h5>
              <div className="d-flex flex-column gap-2">
                {profile?.allLevels?.map((lvl, idx) => {
                  const isCurrentLevel = profile?.level === lvl.level;

                  return (
                    <div
                      key={idx}
                      className={`card border rounded-3 p-3 transition-all ${
                        isCurrentLevel ? 'bg-primary bg-opacity-10 border-primary border-2 shadow-sm' : 'bg-white'
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                          <span className="fs-3">{lvl.icon}</span>
                          <div>
                            <strong className="text-dark d-block">
                              Level {lvl.level}: {lvl.title}
                              {isCurrentLevel && <span className="badge bg-primary text-white ms-2">Current Rank</span>}
                            </strong>
                            <span className="text-muted small">
                              {formatXpRange(lvl)}
                            </span>
                          </div>
                        </div>
                        <span className="badge bg-light border text-muted" style={{ fontSize: '0.72rem' }}>
                          Tier {lvl.level}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: How to Earn XP */}
            <div className="col-lg-5">
              <h5 className="h6 fw-bold text-dark mb-3">How to Earn XP Points</h5>
              <div className="card border-0 rounded-4 p-4 bg-light shadow-sm">
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center justify-content-between pb-2 border-bottom">
                    <span className="text-dark small fw-medium">🎯 Complete Mock Interview</span>
                    <span className="badge bg-primary text-white">+120 XP</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between pb-2 border-bottom">
                    <span className="text-dark small fw-medium">⚡ Answer Practice Question</span>
                    <span className="badge bg-primary text-white">+15 XP</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between pb-2 border-bottom">
                    <span className="text-dark small fw-medium">⚔️ Daily Practice Challenge</span>
                    <span className="badge bg-primary text-white">+60 XP</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between pb-2 border-bottom">
                    <span className="text-dark small fw-medium">📖 Complete Roadmap Week</span>
                    <span className="badge bg-primary text-white">+150 XP</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between pb-2 border-bottom">
                    <span className="text-dark small fw-medium">🔥 Active Streak Day</span>
                    <span className="badge bg-warning text-dark">+25 XP / day</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between pb-2 border-bottom">
                    <span className="text-dark small fw-medium">💯 Perfect 10/10 Question Score</span>
                    <span className="badge bg-success text-white">+40 XP</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-dark small fw-medium">🎖️ Milestone Badge Bonus</span>
                    <span className="badge bg-danger text-white">+100 to +700 XP</span>
                  </div>
                </div>

                <div className="mt-4 pt-2">
                  <Link to="/mock-interviews" className="btn btn-primary-purple text-white w-100 py-2 btn-sm d-flex align-items-center justify-content-center gap-2">
                    <span>Start an Interview to Earn XP</span>
                    <FiArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
