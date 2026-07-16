import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiMessageSquare, FiTarget, FiActivity, FiBriefcase, 
  FiArrowRight, FiUsers, FiCheckCircle, FiStar, FiTrendingUp, FiPlay,
  FiMic
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import heroImg from '../assets/hero.png';

const Landing = () => {
  const { user } = useAuth();

  const stats = [
    { 
      icon: <FiUsers style={{ color: 'var(--primary-purple)' }} />, 
      val: '10,000+', 
      lbl: 'Active Users',
      bg: 'var(--primary-purple-light)'
    },
    { 
      icon: <FiCheckCircle style={{ color: '#10b981' }} />, 
      val: '50,000+', 
      lbl: 'Mock Interviews Taken',
      bg: '#ecfdf5'
    },
    { 
      icon: <FiStar style={{ color: '#f59e0b' }} />, 
      val: '4.8/5', 
      lbl: 'User Rating',
      bg: '#fffbeb'
    },
    { 
      icon: <FiTrendingUp style={{ color: '#3b82f6' }} />, 
      val: '95%', 
      lbl: 'Users Recommend Us',
      bg: '#eff6ff'
    }
  ];

  const features = [
    {
      icon: <FiMessageSquare style={{ color: 'var(--primary-purple)' }} />,
      bg: 'var(--primary-purple-light)',
      title: 'AI Mock Interviews',
      desc: 'Realistic role-based mock interviews tailored to your industry and experience.'
    },
    {
      icon: <FiTarget style={{ color: '#10b981' }} />,
      bg: '#ecfdf5',
      title: 'Smart Feedback',
      desc: 'Get instant AI feedback on your answers with actionable suggestions.'
    },
    {
      icon: <FiActivity style={{ color: '#3b82f6' }} />,
      bg: '#eff6ff',
      title: 'Track Progress',
      desc: 'Visualize your progress over time and identify areas to improve.'
    },
    {
      icon: <FiBriefcase style={{ color: '#f59e0b' }} />,
      bg: '#fffbeb',
      title: 'Boost Confidence',
      desc: 'Practice more, improve constantly, and walk into interviews with confidence.'
    }
  ];

  const handleLockedItem = (e, name) => {
    e.preventDefault();
    toast.info(`"${name}" details page is coming in a future update!`);
  };

  return (
    <div>
      {/* 1. Hero Split Section */}
      <section className="landing-hero-container">
        <div className="landing-hero-split">
          
          {/* Left Text details */}
          <div className="text-start">
            <div className="landing-hero-badge">
              <span>✨ AI-POWERED INTERVIEW PRACTICE</span>
            </div>
            
            <h1 className="landing-hero-heading">
              Ace Your Interviews <br />
              With <span className="landing-hero-heading-accent">Confidence</span>
            </h1>
            
            <p className="landing-hero-para">
              Realistic AI mock interviews, smart feedback, and performance insights to help you land your dream job.
            </p>

            <div className="landing-hero-buttons">
              <Link 
                to={user ? "/dashboard" : "/signup"} 
                className="btn btn-primary-purple py-3 px-4.5 d-flex align-items-center gap-2 shadow"
                style={{ fontSize: '0.92rem' }}
              >
                <span>Get Started Now</span>
                <FiArrowRight />
              </Link>

              <a 
                href="#features" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn btn-white-custom py-3 px-4.5 d-flex align-items-center gap-2"
                style={{ fontSize: '0.92rem' }}
              >
                <span>Explore Features</span>
                <FiPlay style={{ fill: '#374151', fontSize: '0.8em' }} />
              </a>
            </div>

            {/* Overlapping Candidate Avatars */}
            <div className="landing-hero-avatars-group">
              <div className="landing-hero-avatars-row">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
                  alt="Candidate 1" 
                  className="landing-hero-avatar-circle"
                />
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" 
                  alt="Candidate 2" 
                  className="landing-hero-avatar-circle"
                />
                <img 
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" 
                  alt="Candidate 3" 
                  className="landing-hero-avatar-circle"
                />
                <div className="landing-hero-avatars-row-count">10K+</div>
              </div>
              <span className="landing-hero-avatar-text">
                Join <span>10,000+</span> users who are improving every day!
              </span>
            </div>
          </div>

          {/* Right illustration image with interactive overlays */}
          <div className="text-center">
            <div className="hero-image-wrapper">
              
              {/* Decorative Connections & Sparkles */}
              <svg className="position-absolute w-100 h-100" style={{ top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }} viewBox="0 0 500 500">
                {/* Connection 1: Mock Interview (top-left) to head area */}
                <path d="M 120 120 Q 200 120 240 180" stroke="var(--primary-purple)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.45" />
                {/* Connection 2: Strengths (bottom-left) to laptop */}
                <path d="M 110 280 Q 180 280 220 270" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.45" />
                {/* Connection 3: Overall Score (top-right) to center screen */}
                <path d="M 380 90 Q 320 90 280 140" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.45" />
                {/* Connection 4: Improvement Areas (bottom-right) to laptop */}
                <path d="M 370 310 Q 320 310 290 280" stroke="var(--primary-purple)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.45" />
              </svg>

              {/* Sparkle 1: Top-center */}
              <svg className="position-absolute" style={{ top: '6%', left: '42%', width: '12px', height: '12px', fill: 'var(--primary-purple)', opacity: 0.7, zIndex: 1 }} viewBox="0 0 24 24">
                <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
              </svg>

              {/* Sparkle 2: Near Overall Score */}
              <svg className="position-absolute" style={{ top: '15%', right: '12%', width: '10px', height: '10px', fill: 'var(--primary-purple)', opacity: 0.7, zIndex: 1 }} viewBox="0 0 24 24">
                <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
              </svg>

              {/* Sparkle 3: Left-center */}
              <svg className="position-absolute" style={{ top: '35%', left: '10%', width: '10px', height: '10px', fill: 'var(--primary-purple)', opacity: 0.7, zIndex: 1 }} viewBox="0 0 24 24">
                <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
              </svg>

              {/* Card 1: Mock Interview wave indicator */}
              <div className="hero-floater-card floater-mock-interview">
                <div className="d-flex align-items-center gap-1.5 mb-1.5">
                  <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '20px', height: '20px', color: 'var(--primary-purple)', backgroundColor: 'var(--primary-purple-light)' }}>
                    <FiMic style={{ fontSize: '0.7rem' }} />
                  </div>
                  <span className="fw-bold text-dark" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-header)' }}>Mock Interview</span>
                </div>
                {/* Equalizer lines */}
                <div className="d-flex align-items-center gap-1 mb-1.5" style={{ height: '24px' }}>
                  <span className="rounded-pill" style={{ width: '3px', height: '14px', backgroundColor: 'var(--primary-purple)' }}></span>
                  <span className="rounded-pill" style={{ width: '3px', height: '22px', backgroundColor: 'var(--primary-purple)' }}></span>
                  <span className="rounded-pill" style={{ width: '3px', height: '10px', backgroundColor: 'var(--primary-purple)' }}></span>
                  <span className="rounded-pill" style={{ width: '3px', height: '18px', backgroundColor: 'var(--primary-purple)' }}></span>
                  <span className="rounded-pill" style={{ width: '3px', height: '12px', backgroundColor: 'var(--primary-purple)' }}></span>
                  <span className="rounded-pill" style={{ width: '3px', height: '20px', backgroundColor: 'var(--primary-purple)' }}></span>
                  <span className="rounded-pill" style={{ width: '3px', height: '8px', backgroundColor: 'var(--primary-purple)' }}></span>
                </div>
                <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.58rem' }}>
                  <span>In progress...</span>
                  <span>12:45</span>
                </div>
              </div>

              {/* Card 2: Strengths progress stats */}
              <div className="hero-floater-card floater-strengths">
                <span className="floater-card-title">Strengths</span>
                
                <div className="floater-progress-item">
                  <div className="d-flex align-items-center gap-1 mb-1">
                    <span className="rounded-circle" style={{ width: '5px', height: '5px', backgroundColor: 'var(--primary-purple)', display: 'inline-block' }}></span>
                    <span className="floater-progress-lbl m-0">Communication</span>
                  </div>
                  <div className="floater-progress-bar-container">
                    <div className="floater-progress-fill" style={{ width: '75%', backgroundColor: 'var(--primary-purple)' }}></div>
                  </div>
                </div>
                
                <div className="floater-progress-item">
                  <div className="d-flex align-items-center gap-1 mb-1">
                    <span className="rounded-circle" style={{ width: '5px', height: '5px', backgroundColor: '#3b82f6', display: 'inline-block' }}></span>
                    <span className="floater-progress-lbl m-0">Problem Solving</span>
                  </div>
                  <div className="floater-progress-bar-container">
                    <div className="floater-progress-fill" style={{ width: '85%', backgroundColor: '#3b82f6' }}></div>
                  </div>
                </div>
                
                <div className="floater-progress-item">
                  <div className="d-flex align-items-center gap-1 mb-1">
                    <span className="rounded-circle" style={{ width: '5px', height: '5px', backgroundColor: 'var(--primary-purple)', display: 'inline-block' }}></span>
                    <span className="floater-progress-lbl m-0">Confidence</span>
                  </div>
                  <div className="floater-progress-bar-container">
                    <div className="floater-progress-fill" style={{ width: '90%', backgroundColor: 'var(--primary-purple)' }}></div>
                  </div>
                </div>
              </div>

              {/* Card 3: Overall Score circular ring */}
              <div className="hero-floater-card floater-overall-score">
                <span className="floater-card-title" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Overall Score</span>
                <div className="position-relative d-inline-block mb-1" style={{ width: '42px', height: '42px' }}>
                  <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      stroke="var(--primary-purple)" 
                      strokeWidth="12" 
                      fill="none" 
                      strokeDasharray="264"
                      strokeDashoffset={264 - (264 * 85) / 100}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="58" fill="var(--text-dark)" fontSize="26" fontWeight="800" textAnchor="middle">
                      85
                    </text>
                  </svg>
                </div>
                <span className="fw-bold" style={{ fontSize: '0.55rem', color: 'var(--primary-purple)' }}>Great Performance!</span>
              </div>

              {/* Card 4: Improvement Areas */}
              <div className="hero-floater-card floater-improvement">
                <span className="floater-card-title">Improvement Areas</span>
                
                <div className="floater-progress-item">
                  <div className="d-flex align-items-center gap-1 mb-1">
                    <span className="rounded-circle" style={{ width: '5px', height: '5px', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
                    <span className="floater-progress-lbl m-0">Technical Depth</span>
                  </div>
                  <div className="floater-progress-bar-container">
                    <div className="floater-progress-fill" style={{ width: '60%', backgroundColor: '#f59e0b' }}></div>
                  </div>
                </div>

                <div className="floater-progress-item">
                  <div className="d-flex align-items-center gap-1 mb-1">
                    <span className="rounded-circle" style={{ width: '5px', height: '5px', backgroundColor: '#a78bfa', display: 'inline-block' }}></span>
                    <span className="floater-progress-lbl m-0">Answer Structure</span>
                  </div>
                  <div className="floater-progress-bar-container">
                    <div className="floater-progress-fill" style={{ width: '70%', backgroundColor: '#3b82f6' }}></div>
                  </div>
                </div>
              </div>

              {/* Base Developer Girl Illustration */}
              <img 
                src={heroImg} 
                alt="InterviewAce Workspace Mockup Illustration" 
                className="hero-base-image shadow-sm"
              />
            </div>
          </div>

        </div>
      </section>

      {/* 2. Overlapping Stats Bar */}
      <section className="position-relative" style={{ zIndex: '10' }}>
        <div className="landing-stats-overlap-bar">
          {stats.map((stat, idx) => (
            <div className="landing-stat-column" key={idx}>
              <div className="landing-stat-icon-wrapper" style={{ backgroundColor: stat.bg }}>
                {stat.icon}
              </div>
              <div className="text-start">
                <div className="landing-stat-val">{stat.val}</div>
                <div className="landing-stat-lbl">{stat.lbl}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="landing-features-section">
        <div className="landing-features-badge">
          <span>WHY INTERVIEWACE?</span>
        </div>
        <h2 className="landing-features-title">
          Everything You Need to <span>Succeed</span>
        </h2>

        <div className="landing-features-grid">
          {features.map((feat, idx) => (
            <div className="landing-feature-card-mock" key={idx}>
              <div>
                <div className="landing-feature-card-icon" style={{ backgroundColor: feat.bg }}>
                  {feat.icon}
                </div>
                <h4 className="fw-bold text-dark mb-2" style={{ fontSize: '1rem', fontFamily: 'var(--font-header)' }}>
                  {feat.title}
                </h4>
                <p className="text-muted small mb-0 lh-base" style={{ fontSize: '0.8rem' }}>
                  {feat.desc}
                </p>
              </div>

              <a 
                href="#details" 
                onClick={(e) => handleLockedItem(e, feat.title)}
                className="landing-feature-card-arrow"
              >
                <FiArrowRight />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CTA Rocket Banner */}
      <section className="container">
        <div className="landing-rocket-banner">
          {/* Custom SVG Rocket Vector Overlay */}
          <svg 
            className="landing-rocket-vector" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ color: 'rgba(255, 255, 255, 0.15)', transform: 'rotate(45deg)', width: '80px', height: '80px' }}
          >
            <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5M12 2C6.5 2 2 6.5 2 12c0 2 .5 3.5 1 4.5L12 8l8.5 8.5c1-1 1.5-2.5 1.5-4.5 0-5.5-4.5-10-10-10z" />
            <path d="M9 15l-3 3M15 9l3-3M12 12l4 4" />
          </svg>

          <div className="landing-rocket-banner-text">
            <h3 className="fw-bold mb-1.5" style={{ fontSize: '1.45rem', letterSpacing: '-0.01em' }}>
              Start Your Journey to Success Today!
            </h3>
            <p className="mb-0 text-white text-opacity-80 small">
              Join thousands of job seekers who are one step ahead.
            </p>
          </div>

          <Link 
            to={user ? "/dashboard" : "/signup"} 
            className="landing-rocket-banner-btn"
          >
            <span>Get Started for Free</span>
            <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
