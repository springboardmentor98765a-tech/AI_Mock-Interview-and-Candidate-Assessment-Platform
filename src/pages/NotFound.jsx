import { Link } from 'react-router-dom'
import '../styles/notfound.css'

function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="notfound-btn">Go Back Home</Link>
      </div>
    </div>
  )
}

export default NotFound
