import { Link } from 'react-router-dom'
import '../styles/infopage.css'

function OAuthInfo() {
  return (
    <div className="info-page">
      <nav className="info-nav">
        <Link to="/" className="back-link">← Back to Home</Link>
        <div className="info-nav-links">
          <Link to="/jwt-info">JWT Info</Link>
          <Link to="/login">Login</Link>
        </div>
      </nav>

      <div className="info-container">
        <h1>Understanding OAuth 2.0</h1>

        <div className="info-card">
          <h2>What is OAuth?</h2>
          <p>OAuth 2.0 is an authorization framework that allows third-party applications to access a user's resources without exposing their credentials. Instead of sharing passwords, users can grant limited access to their data through tokens.</p>
        </div>

        <div className="info-card">
          <h2>Why is OAuth Used?</h2>
          <ul>
            <li>Users don't have to share their passwords with third-party apps</li>
            <li>Applications get limited access to user data</li>
            <li>Users can revoke access at any time</li>
            <li>It provides a standardized way to handle authorization</li>
            <li>Reduces the risk of credential theft</li>
          </ul>
        </div>

        <div className="info-card">
          <h2>Google Login Flow</h2>
          <div className="flow-steps">
            <div className="flow-step">
              <span className="step-number">1</span>
              <p>User clicks "Login with Google" on the application</p>
            </div>
            <div className="flow-step">
              <span className="step-number">2</span>
              <p>Application redirects the user to Google's authorization server</p>
            </div>
            <div className="flow-step">
              <span className="step-number">3</span>
              <p>User logs in to Google and grants permission</p>
            </div>
            <div className="flow-step">
              <span className="step-number">4</span>
              <p>Google redirects back to the application with an authorization code</p>
            </div>
            <div className="flow-step">
              <span className="step-number">5</span>
              <p>Application exchanges the code for an access token</p>
            </div>
            <div className="flow-step">
              <span className="step-number">6</span>
              <p>Application uses the access token to fetch user data from Google</p>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h2>GitHub Login Flow</h2>
          <p>GitHub OAuth follows the same pattern as Google OAuth. The application registers with GitHub, gets a client ID and secret, and follows the authorization code flow to authenticate users.</p>
          <div className="flow-steps">
            <div className="flow-step">
              <span className="step-number">1</span>
              <p>Register your app on GitHub Developer Settings</p>
            </div>
            <div className="flow-step">
              <span className="step-number">2</span>
              <p>Redirect users to GitHub's OAuth authorize URL</p>
            </div>
            <div className="flow-step">
              <span className="step-number">3</span>
              <p>User authorizes the application</p>
            </div>
            <div className="flow-step">
              <span className="step-number">4</span>
              <p>Exchange the returned code for an access token</p>
            </div>
            <div className="flow-step">
              <span className="step-number">5</span>
              <p>Use the token to access GitHub API endpoints</p>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h2>Authorization Code Flow</h2>
          <div className="flow-diagram">
            <div className="flow-box">User</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">App</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Auth Server</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Access Token</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box">Resource Server</div>
          </div>
          <p>The authorization code flow is the most secure OAuth flow. The app never directly handles user credentials. Instead, it receives an authorization code which is exchanged server-side for tokens.</p>
        </div>

        <div className="info-card">
          <h2>Advantages of OAuth</h2>
          <ul>
            <li>Enhanced security - no password sharing</li>
            <li>Better user experience - quick social logins</li>
            <li>Granular access control - apps only get necessary permissions</li>
            <li>Widely adopted - supported by Google, GitHub, Facebook, etc.</li>
            <li>Token-based - easy to manage and revoke access</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default OAuthInfo
