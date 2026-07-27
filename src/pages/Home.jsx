import { Link } from 'react-router-dom'
import '../styles/home.css'

function Home() {
  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="nav-logo">Role-Based Dashboard System</div>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/oauth-info">OAuth</Link>
          <Link to="/jwt-info">JWT</Link>
          <Link to="/login" className="nav-login-btn">Login</Link>
        </div>
      </nav>

      <section className="hero-section">
        <h1>Role-Based Dashboard System</h1>
        <p className="hero-subtitle">A modern dashboard platform with role-based access control for Admin, Student, and Recruiter users.</p>
        <Link to="/login" className="hero-btn">Get Started</Link>
      </section>

      <section className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Role-Based Access</h3>
            <p>Different dashboards for different user roles with protected routes and access control.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Interactive Dashboards</h3>
            <p>Each role gets a unique dashboard with relevant statistics, charts, and data views.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Responsive Design</h3>
            <p>Works seamlessly across desktop, tablet, and mobile devices.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Fast & Lightweight</h3>
            <p>Built with React and Vite for blazing fast performance and smooth navigation.</p>
          </div>
        </div>
      </section>

      <section className="roles-section">
        <h2>Available Roles</h2>
        <div className="roles-grid">
          <div className="role-card">
            <div className="role-icon">👨‍💼</div>
            <h3>Admin</h3>
            <p>Manage users, view revenue, handle pending requests, and monitor system activity.</p>
            <Link to="/login" className="role-btn">Login as Admin</Link>
          </div>
          <div className="role-card">
            <div className="role-icon">🎓</div>
            <h3>Student</h3>
            <p>Track courses, assignments, attendance, grades, and upcoming deadlines.</p>
            <Link to="/login" className="role-btn">Login as Student</Link>
          </div>
          <div className="role-card">
            <div className="role-icon">💼</div>
            <h3>Recruiter</h3>
            <p>View candidates, manage job postings, schedule interviews, and track applications.</p>
            <Link to="/login" className="role-btn">Login as Recruiter</Link>
          </div>
        </div>
      </section>

      <section className="future-auth-section">
        <h2>Future Authentication</h2>
        <div className="future-auth-content">
          <p>This project currently uses a dummy login system because backend implementation is outside the scope of this assignment. In a real-world application, the following authentication methods would be integrated:</p>
          <div className="auth-methods">
            <div className="auth-method">
              <h4>🔑 OAuth 2.0</h4>
              <p>Social login with Google, GitHub, and other providers for seamless user authentication.</p>
              <Link to="/oauth-info" className="learn-more-link">Learn More →</Link>
            </div>
            <div className="auth-method">
              <h4>🎫 JWT (JSON Web Tokens)</h4>
              <p>Secure token-based authentication for stateless API communication with the backend.</p>
              <Link to="/jwt-info" className="learn-more-link">Learn More →</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>Internship Project by Hemanth M &copy; 2026</p>
        <div className="footer-links">
          <Link to="/oauth-info">OAuth Info</Link>
          <Link to="/jwt-info">JWT Info</Link>
          <Link to="/login">Login</Link>
        </div>
      </footer>
    </div>
  )
}

export default Home
