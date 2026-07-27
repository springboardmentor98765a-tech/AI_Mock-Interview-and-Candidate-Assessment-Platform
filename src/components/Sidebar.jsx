import '../styles/sidebar.css'

function Sidebar({ title, links, onLogout, isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>{title}</h2>
          <button className="sidebar-close" onClick={onClose}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {links.map((link, index) => (
            <a key={index} className="sidebar-link" href="#">
              <span className="sidebar-icon">{link.icon}</span>
              <span>{link.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
