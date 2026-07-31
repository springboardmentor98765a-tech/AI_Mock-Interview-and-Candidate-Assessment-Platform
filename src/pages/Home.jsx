import { Link } from 'react-router-dom'
import { Brain, Shield, BarChart3, Smartphone, Zap, Users, GraduationCap, Briefcase, ArrowRight, Key, Ticket } from 'lucide-react'
import { motion } from 'framer-motion'
import '../styles/home.css'

function Home() {
  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="nav-logo">
          <Brain size={24} />
          <span>HireAI</span>
        </div>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/oauth-info">OAuth</Link>
          <Link to="/jwt-info">JWT</Link>
          <Link to="/login" className="nav-login-btn">Login</Link>
        </div>
      </nav>

      <section className="hero-section">
        <motion.div className="hero-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="hero-badge">AI-Powered Recruitment Platform</span>
          <h1>Smart Hiring Starts with <span className="gradient-text">HireAI</span></h1>
          <p className="hero-subtitle">An intelligent recruitment platform with AI mock interviews, candidate ranking, resume analysis, and role-based dashboards for modern hiring teams.</p>
          <div className="hero-buttons">
            <Link to="/login" className="hero-btn primary">Get Started <ArrowRight size={18} /></Link>
            <Link to="/oauth-info" className="hero-btn secondary">Learn More</Link>
          </div>
        </motion.div>
      </section>

      <section className="features-section">
        <h2>Platform Features</h2>
        <p className="section-subtitle">Everything you need for intelligent hiring</p>
        <div className="features-grid">
          <motion.div className="feature-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="feature-icon-wrapper purple"><Shield size={24} /></div>
            <h3>Role-Based Access</h3>
            <p>Separate dashboards for Admin, Recruiter, and Candidate with protected routes.</p>
          </motion.div>
          <motion.div className="feature-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <div className="feature-icon-wrapper blue"><BarChart3 size={24} /></div>
            <h3>AI Analytics</h3>
            <p>Intelligent candidate scoring, ranking algorithms, and performance insights.</p>
          </motion.div>
          <motion.div className="feature-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <div className="feature-icon-wrapper green"><Smartphone size={24} /></div>
            <h3>Responsive Design</h3>
            <p>Works seamlessly across desktop, tablet, and mobile devices.</p>
          </motion.div>
          <motion.div className="feature-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <div className="feature-icon-wrapper orange"><Zap size={24} /></div>
            <h3>Mock Interviews</h3>
            <p>AI-powered mock interviews with real-time feedback and integrity analysis.</p>
          </motion.div>
        </div>
      </section>

      <section className="roles-section">
        <h2>Available Roles</h2>
        <p className="section-subtitle">Three dashboards tailored for different users</p>
        <div className="roles-grid">
          <motion.div className="role-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="role-icon-wrapper"><Users size={32} /></div>
            <h3>Admin</h3>
            <p>Manage users, monitor system health, configure AI settings, and view platform analytics.</p>
            <Link to="/login" className="role-btn">Login as Admin <ArrowRight size={16} /></Link>
          </motion.div>
          <motion.div className="role-card featured" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <div className="role-icon-wrapper"><Briefcase size={32} /></div>
            <h3>Recruiter</h3>
            <p>Rank candidates, schedule interviews, generate reports, and use AI assessment tools.</p>
            <Link to="/login" className="role-btn">Login as Recruiter <ArrowRight size={16} /></Link>
          </motion.div>
          <motion.div className="role-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <div className="role-icon-wrapper"><GraduationCap size={32} /></div>
            <h3>Candidate</h3>
            <p>Take mock interviews, view AI feedback, track performance, and manage your resume.</p>
            <Link to="/login" className="role-btn">Login as Candidate <ArrowRight size={16} /></Link>
          </motion.div>
        </div>
      </section>

      <section className="future-auth-section">
        <h2>Secure Authentication</h2>
        <p className="section-subtitle">Enterprise-grade authentication fully integrated into the platform</p>
        <div className="auth-methods">
          <div className="auth-method">
            <div className="auth-icon"><Key size={24} /></div>
            <h4>OAuth 2.0 with Google</h4>
            <p>Sign in with your Google account. Your profile, avatar, and email are securely fetched and stored automatically.</p>
            <Link to="/oauth-info" className="learn-more-link">Learn More <ArrowRight size={14} /></Link>
          </div>
          <div className="auth-method">
            <div className="auth-icon"><Ticket size={24} /></div>
            <h4>JWT Authentication</h4>
            <p>Every session is secured with a signed JWT token containing your ID, email, and role — valid for 7 days.</p>
            <Link to="/jwt-info" className="learn-more-link">Learn More <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-brand">
          <Brain size={20} />
          <span>HireAI</span>
        </div>
        <p>Role-Based Dashboard System - An Internship Project by Hemanth M &copy; 2026</p>
        <div className="footer-links">
          <Link to="/oauth-info">OAuth</Link>
          <Link to="/jwt-info">JWT</Link>
          <Link to="/login">Login</Link>
        </div>
      </footer>
    </div>
  )
}

export default Home
