import { Link } from 'react-router-dom'
import '../styles/infopage.css'

function JWTInfo() {
  return (
    <div className="info-page">
      <nav className="info-nav">
        <Link to="/" className="back-link">← Back to Home</Link>
        <div className="info-nav-links">
          <Link to="/oauth-info">OAuth Info</Link>
          <Link to="/login">Login</Link>
        </div>
      </nav>

      <div className="info-container">
        <h1>Understanding JWT (JSON Web Tokens)</h1>

        <div className="info-card">
          <h2>What is JWT?</h2>
          <p>JWT (JSON Web Token) is a compact, URL-safe token format used for securely transmitting information between parties as a JSON object. It is commonly used for authentication and authorization in web applications.</p>
        </div>

        <div className="info-card">
          <h2>Structure of JWT</h2>
          <p>A JWT consists of three parts separated by dots (.)</p>
          <div className="jwt-structure">
            <div className="jwt-part jwt-header">
              <h4>Header</h4>
              <p>Contains the token type (JWT) and the signing algorithm (e.g., HS256, RS256).</p>
              <div className="jwt-example">{'{"alg": "HS256", "typ": "JWT"}'}</div>
            </div>
            <div className="jwt-dot">.</div>
            <div className="jwt-part jwt-payload">
              <h4>Payload</h4>
              <p>Contains claims - statements about the user and additional metadata.</p>
              <div className="jwt-example">{'{"sub": "1234", "name": "John", "role": "admin"}'}</div>
            </div>
            <div className="jwt-dot">.</div>
            <div className="jwt-part jwt-signature">
              <h4>Signature</h4>
              <p>Created by encoding the header and payload, then signing with a secret key.</p>
              <div className="jwt-example">HMACSHA256(base64(header) + "." + base64(payload), secret)</div>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h2>Authentication Flow with JWT</h2>
          <div className="flow-steps">
            <div className="flow-step">
              <span className="step-number">1</span>
              <p>User sends login credentials (email and password) to the server</p>
            </div>
            <div className="flow-step">
              <span className="step-number">2</span>
              <p>Server verifies the credentials against the database</p>
            </div>
            <div className="flow-step">
              <span className="step-number">3</span>
              <p>If valid, the server generates a JWT and sends it back to the client</p>
            </div>
            <div className="flow-step">
              <span className="step-number">4</span>
              <p>Client stores the JWT (in localStorage, sessionStorage, or cookies)</p>
            </div>
            <div className="flow-step">
              <span className="step-number">5</span>
              <p>For subsequent requests, the client sends the JWT in the Authorization header</p>
            </div>
            <div className="flow-step">
              <span className="step-number">6</span>
              <p>Server verifies the JWT signature and grants access if valid</p>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h2>Advantages of JWT</h2>
          <ul>
            <li>Stateless - the server doesn't need to store session data</li>
            <li>Compact - small token size, easy to transmit</li>
            <li>Self-contained - all necessary user info is in the token</li>
            <li>Cross-domain support - works well with microservices</li>
            <li>Scalable - no server-side session storage needed</li>
          </ul>
        </div>

        <div className="info-card">
          <h2>Storage Options</h2>
          <div className="storage-options">
            <div className="storage-option">
              <h4>localStorage</h4>
              <p>Persistent storage. Data survives page refreshes and browser restarts. Vulnerable to XSS attacks.</p>
            </div>
            <div className="storage-option">
              <h4>sessionStorage</h4>
              <p>Temporary storage. Data is cleared when the tab is closed. Also vulnerable to XSS.</p>
            </div>
            <div className="storage-option">
              <h4>HTTP-Only Cookies</h4>
              <p>Most secure option. Not accessible via JavaScript. Protected from XSS. Recommended for production.</p>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h2>Where JWT Would Be Used in This Project</h2>
          <p>In a production version of this dashboard system, JWT would be used to:</p>
          <ul>
            <li>Authenticate users after login by issuing a signed token</li>
            <li>Store the user's role in the token payload for authorization checks</li>
            <li>Protect API endpoints by verifying the token on each request</li>
            <li>Implement token expiration and refresh mechanisms</li>
            <li>Replace the current localStorage-based dummy authentication</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default JWTInfo
