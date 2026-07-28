import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import '../styles/infopage.css'

function JWTInfo() {
  return (
    <div className="info-page">
      <nav className="info-nav">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to Home</Link>
        <div className="info-nav-links">
          <Link to="/oauth-info">OAuth Info</Link>
          <Link to="/login">Login</Link>
        </div>
      </nav>

      <div className="info-container">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>Understanding JWT (JSON Web Tokens)</motion.h1>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2>What is JWT?</h2>
          <p>JWT (JSON Web Token) is a compact, URL-safe token format used for securely transmitting information between parties as a JSON object. It is commonly used for authentication and authorization in web applications.</p>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2>Structure of JWT</h2>
          <p>A JWT consists of three parts separated by dots (.)</p>
          <div className="jwt-structure">
            <div className="jwt-part jwt-header">
              <h4>Header</h4>
              <p>Contains the token type (JWT) and the signing algorithm (e.g., HS256, RS256).</p>
              <div className="jwt-example">{`{"alg": "HS256", "typ": "JWT"}`}</div>
            </div>
            <div className="jwt-dot">.</div>
            <div className="jwt-part jwt-payload">
              <h4>Payload</h4>
              <p>Contains claims - statements about the user and additional metadata.</p>
              <div className="jwt-example">{`{"sub": "1234", "name": "John", "role": "admin"}`}</div>
            </div>
            <div className="jwt-dot">.</div>
            <div className="jwt-part jwt-signature">
              <h4>Signature</h4>
              <p>Created by encoding the header and payload, then signing with a secret key.</p>
              <div className="jwt-example">HMACSHA256(base64(header) + "." + base64(payload), secret)</div>
            </div>
          </div>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
              <p>If valid, the server generates a JWT token with user data</p>
            </div>
            <div className="flow-step">
              <span className="step-number">4</span>
              <p>Token is sent back to the client and stored (localStorage or cookie)</p>
            </div>
            <div className="flow-step">
              <span className="step-number">5</span>
              <p>Client includes the token in the Authorization header for subsequent requests</p>
            </div>
            <div className="flow-step">
              <span className="step-number">6</span>
              <p>Server validates the token and grants access to protected resources</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2>Where to Store JWT?</h2>
          <div className="storage-options">
            <div className="storage-option">
              <h4>localStorage</h4>
              <p>Easy to use but vulnerable to XSS attacks. Data persists across browser sessions.</p>
            </div>
            <div className="storage-option">
              <h4>sessionStorage</h4>
              <p>Similar to localStorage but data is cleared when the browser tab closes.</p>
            </div>
            <div className="storage-option">
              <h4>HTTP-Only Cookies</h4>
              <p>Most secure option. Not accessible via JavaScript, protecting against XSS.</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="info-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2>Advantages of JWT</h2>
          <ul>
            <li>Stateless - no server-side session storage needed</li>
            <li>Self-contained - carries all necessary user information</li>
            <li>Compact - small size makes it efficient for transmission</li>
            <li>Secure - digitally signed to prevent tampering</li>
            <li>Cross-domain - works across different domains and services</li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

export default JWTInfo
