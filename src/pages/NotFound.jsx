import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import '../styles/notfound.css'

function NotFound() {
  return (
    <div className="notfound-page">
      <motion.div className="notfound-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="notfound-btn"><Home size={18} /> Go Back Home</Link>
      </motion.div>
    </div>
  )
}

export default NotFound
