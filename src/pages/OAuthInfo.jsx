import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import '../styles/infopage.css'

function OAuthInfo() {
  return (
    <div className="info-page">
      <nav className="info-nav">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to Home</Link>
        <div className="info-nav-links">
          <Link to="/jwt-info">JWT Info</Link>
          <Link to="/login">Login</Link>
        </div>
      </nav>

      <div className="info-container">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>Understanding OAuth 2.0</motion.h1>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2>What is OAuth?</h2>
          <p>OAuth 2.0 is an authorization framework that allows third-party applications to access a user's resources without exposing their credentials. Instead of sharing passwords, users grant limited access through tokens. HireAI uses OAuth 2.0 with both Google and GitHub as identity providers.</p>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2>Why is OAuth Used?</h2>
          <ul>
            <li>Users don't have to share their passwords with third-party apps</li>
            <li>Applications get limited access to user data</li>
            <li>Users can revoke access at any time</li>
            <li>It provides a standardized way to handle authorization</li>
            <li>Reduces the risk of credential theft</li>
          </ul>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2>Google OAuth Flow in HireAI</h2>
          <div className="flow-steps">
            <div className="flow-step">
              <span className="step-number">1</span>
              <p>User clicks "Continue with Google" on the login page</p>
            </div>
            <div className="flow-step">
              <span className="step-number">2</span>
              <p>Backend redirects to Google's OAuth consent screen via Passport.js (<code>passport-google-oauth20</code>)</p>
            </div>
            <div className="flow-step">
              <span className="step-number">3</span>
              <p>User logs in to Google and grants permission</p>
            </div>
            <div className="flow-step">
              <span className="step-number">4</span>
              <p>Google returns an authorization code to <code>/api/auth/google/callback</code></p>
            </div>
            <div className="flow-step">
              <span className="step-number">5</span>
              <p>Passport exchanges the code for a profile. HireAI finds or creates the user in PostgreSQL with <code>provider = 'GOOGLE'</code></p>
            </div>
            <div className="flow-step">
              <span className="step-number">6</span>
              <p>A signed JWT (7-day expiry) is generated and passed to the frontend via redirect to <code>/oauth-callback</code></p>
            </div>
            <div className="flow-step">
              <span className="step-number">7</span>
              <p>Frontend stores the JWT, reads the role, and redirects to the correct dashboard</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2>GitHub OAuth Flow in HireAI</h2>
          <div className="flow-steps">
            <div className="flow-step">
              <span className="step-number">1</span>
              <p>User clicks "Continue with GitHub" on the login page</p>
            </div>
            <div className="flow-step">
              <span className="step-number">2</span>
              <p>Backend redirects to GitHub's OAuth authorization page via Passport.js (<code>passport-github2</code>) with scope <code>user:email</code></p>
            </div>
            <div className="flow-step">
              <span className="step-number">3</span>
              <p>User authorizes the HireAI application on GitHub</p>
            </div>
            <div className="flow-step">
              <span className="step-number">4</span>
              <p>GitHub returns an authorization code to <code>/api/auth/github/callback</code></p>
            </div>
            <div className="flow-step">
              <span className="step-number">5</span>
              <p>Passport exchanges the code for a profile. HireAI finds or creates the user in PostgreSQL with <code>provider = 'GITHUB'</code></p>
            </div>
            <div className="flow-step">
              <span className="step-number">6</span>
              <p>A signed JWT (7-day expiry) is generated and passed to the frontend via redirect to <code>/oauth-callback</code></p>
            </div>
            <div className="flow-step">
              <span className="step-number">7</span>
              <p>Frontend stores the JWT, reads the role, and redirects to the correct dashboard</p>
            </div>
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>Note: GitHub requires users to have a public email set in their GitHub account settings for the flow to work.</p>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2>Authorization Code Flow</h2>
          <div className="flow-diagram">
            <div className="flow-box">User</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">HireAI App</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Auth Server</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">JWT Token</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Dashboard</div>
          </div>
          <p>The authorization code flow is the most secure OAuth flow. HireAI never handles provider passwords. The backend exchanges the authorization code server-side for an access token, then immediately issues its own JWT — keeping the session stateless.</p>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h2>Advantages of OAuth in HireAI</h2>
          <ul>
            <li>Enhanced security — no provider password ever reaches HireAI's servers</li>
            <li>Quick sign-in — one click with Google or GitHub, no registration form needed</li>
            <li>Automatic profile population — name, email, and avatar fetched from the provider</li>
            <li>Stateless sessions — OAuth completes and a JWT takes over, no server-side session storage</li>
            <li>Existing accounts linked — signing in with Google or GitHub links to an existing email account automatically</li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

export default OAuthInfo
