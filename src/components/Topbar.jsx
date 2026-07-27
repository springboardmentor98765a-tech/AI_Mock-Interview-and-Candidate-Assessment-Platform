import { Bell, Search, User } from 'lucide-react'

export default function Topbar({ title, subtitle, userInitials = 'JD', userName = 'Jane Doe', roleBadge }) {
  return (
    <div className="topbar">
      <div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 700, color: '#f0f0ff' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '0.8rem', color: '#a0a0c0', marginTop: 2 }}>{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '8px 14px', minWidth: 180
        }}>
          <Search size={14} color="#606080" />
          <input
            placeholder="Search..."
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#a0a0c0', fontSize: '0.82rem', width: '100%' }}
          />
        </div>

        {/* Notification */}
        <div style={{ position: 'relative' }}>
          <button style={{
            width: 38, height: 38, borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>
            <Bell size={16} color="#a0a0c0" />
          </button>
          <span className="notif-dot" />
        </div>

        {/* User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div
            className="avatar avatar-md"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', fontSize: '0.82rem', fontFamily: 'Outfit' }}
          >
            {userInitials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f0f0ff' }}>{userName}</span>
            {roleBadge && <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{roleBadge}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
