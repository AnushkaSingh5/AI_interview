import React from 'react';
import { Link } from 'react-router-dom';
import { FiCpu, FiLinkedin, FiTwitter, FiInstagram, FiYoutube, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Footer = () => {
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    if (email) {
      toast.success('Successfully subscribed to the InterviewAce newsletter!');
      e.target.reset();
    }
  };

  const handleLockedLink = (e, name) => {
    e.preventDefault();
    toast.info(`"${name}" details page is coming in a future update!`);
  };

  return (
    <footer className="landing-footer">
      <div className="landing-footer-grid">
        
        {/* Col 1: Brand & Socials */}
        <div className="landing-footer-col">
          <div className="sidebar-logo d-flex align-items-center gap-2 mb-3">
            <FiCpu style={{ color: 'var(--primary-purple)' }} />
            <span style={{ color: 'var(--text-dark)' }}>InterviewAce</span>
          </div>
          <p className="text-muted small lh-base mb-4" style={{ maxWidth: '280px' }}>
            The premium AI-driven mock interview platform designed to boost your confidence and land your dream job.
          </p>
          <div className="landing-footer-socials">
            <a href="#linkedin" onClick={(e) => handleLockedLink(e, 'LinkedIn')} className="landing-footer-social-icon"><FiLinkedin /></a>
            <a href="#twitter" onClick={(e) => handleLockedLink(e, 'Twitter')} className="landing-footer-social-icon"><FiTwitter /></a>
            <a href="#instagram" onClick={(e) => handleLockedLink(e, 'Instagram')} className="landing-footer-social-icon"><FiInstagram /></a>
            <a href="#youtube" onClick={(e) => handleLockedLink(e, 'YouTube')} className="landing-footer-social-icon"><FiYoutube /></a>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div className="landing-footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><a href="#features" onClick={(e) => handleLockedLink(e, 'Features')}>Features</a></li>
            <li><a href="#how" onClick={(e) => handleLockedLink(e, 'How It Works')}>How It Works</a></li>
            <li><a href="#about" onClick={(e) => handleLockedLink(e, 'About Us')}>About Us</a></li>
            <li><a href="#contact" onClick={(e) => handleLockedLink(e, 'Contact')}>Contact</a></li>
          </ul>
        </div>

        {/* Col 3: Resources */}
        <div className="landing-footer-col">
          <h4>Resources</h4>
          <ul>
            <li><a href="#blog" onClick={(e) => handleLockedLink(e, 'Blog')}>Blog</a></li>
            <li><a href="#faq" onClick={(e) => handleLockedLink(e, 'FAQ')}>FAQ</a></li>
            <li><a href="#privacy" onClick={(e) => handleLockedLink(e, 'Privacy Policy')}>Privacy Policy</a></li>
            <li><a href="#terms" onClick={(e) => handleLockedLink(e, 'Terms of Service')}>Terms of Service</a></li>
          </ul>
        </div>

        {/* Col 4: Newsletter */}
        <div className="landing-footer-col">
          <h4>Stay Updated</h4>
          <p className="text-muted small mb-3">
            Subscribe to our newsletter and get the latest updates and tips.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="d-flex bg-light rounded-2 border border-secondary-subtle">
            <input 
              type="email" 
              name="email"
              placeholder="Enter your email" 
              className="bg-transparent border-0 px-3 py-2 w-100 small" 
              style={{ outline: 'none', fontSize: '0.85rem' }}
              required
            />
            <button type="submit" className="landing-footer-newsletter-btn">
              <FiSend />
            </button>
          </form>
        </div>

      </div>

      {/* Copyright row */}
      <div className="border-top pt-4 mt-4 d-flex flex-column flex-sm-row justify-content-between align-items-center text-muted" style={{ fontSize: '0.78rem' }}>
        <span>&copy; {new Date().getFullYear()} InterviewAce AI. All rights reserved.</span>
        <div className="d-flex gap-4 mt-2 mt-sm-0">
          <a href="#privacy" onClick={(e) => handleLockedLink(e, 'Privacy')} className="text-decoration-none text-muted">Privacy Policy</a>
          <a href="#terms" onClick={(e) => handleLockedLink(e, 'Terms')} className="text-decoration-none text-muted">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
