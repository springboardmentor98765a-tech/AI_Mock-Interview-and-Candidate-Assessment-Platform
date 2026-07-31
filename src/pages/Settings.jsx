import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Bell, Palette, Globe, Shield, Save, Moon, Sun, Monitor, Camera, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import '../styles/settings.css'

function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateProfile, changePassword, logout } = useAuth()

  const [activeTab, setActiveTab]     = useState('profile')
  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  const [passForm, setPassForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [profileMsg, setProfileMsg]   = useState({ text: '', ok: true })
  const [passMsg, setPassMsg]         = useState({ text: '', ok: true })
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (user) setProfileForm({ name: user.name || '', email: user.email || '' })
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileMsg({ text: '', ok: true })
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      return setProfileMsg({ text: 'Name and email are required.', ok: false })
    }
    setSaving(true)
    try {
      await updateProfile(profileForm.name.trim(), profileForm.email.trim())
      setProfileMsg({ text: 'Profile updated successfully.', ok: true })
    } catch (err) {
      setProfileMsg({ text: err.message || 'Failed to update profile.', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPassMsg({ text: '', ok: true })
    if (!passForm.currentPassword || !passForm.newPassword) {
      return setPassMsg({ text: 'All password fields are required.', ok: false })
    }
    if (passForm.newPassword.length < 6) {
      return setPassMsg({ text: 'New password must be at least 6 characters.', ok: false })
    }
    if (passForm.newPassword !== passForm.confirm) {
      return setPassMsg({ text: 'New passwords do not match.', ok: false })
    }
    setSaving(true)
    try {
      await changePassword(passForm.currentPassword, passForm.newPassword)
      setPassMsg({ text: 'Password updated successfully.', ok: true })
      setPassForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setPassMsg({ text: err.message || 'Failed to update password.', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const roleLabel = user?.role === 'USER' ? 'Candidate' : user?.role === 'RECRUITER' ? 'Recruiter' : user?.role === 'ADMIN' ? 'Admin' : '—'
  const initials  = (user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const tabs = [
    { id: 'profile',       label: 'Profile',       icon: <User size={18} />    },
    { id: 'security',      label: 'Security',      icon: <Shield size={18} />  },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />    },
    { id: 'appearance',    label: 'Appearance',    icon: <Palette size={18} /> },
    { id: 'language',      label: 'Language',      icon: <Globe size={18} />   },
  ]

  return (
    <div className="settings-page">
      <nav className="settings-nav">
        <button className="settings-back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Settings</h1>
        <button className="btn btn-outline" onClick={handleLogout}><LogOut size={16} /> Logout</button>
      </nav>

      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">

          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Profile Information</h2>

                <div className="profile-avatar-section">
                  <div className="profile-avatar-large">
                    {user?.avatar
                      ? <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : <span>{initials}</span>
                    }
                  </div>
                  <div className="profile-avatar-info">
                    <h3>{user?.name || '—'}</h3>
                    <p>{user?.email || '—'}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span className="badge purple">{roleLabel}</span>
                      <span className="badge gray">{user?.provider === 'GOOGLE' ? '🔵 Google' : user?.provider === 'GITHUB' ? '⚫ GitHub' : '🔑 Local'}</span>
                      <span className="badge gray">Joined {joinedDate}</span>
                    </div>
                  </div>
                </div>

                {profileMsg.text && (
                  <div className={profileMsg.ok ? 'success-message' : 'error-message'}>{profileMsg.text}</div>
                )}

                <form className="settings-form" onSubmit={handleSaveProfile}>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Full Name</label>
                      <input type="text" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-field">
                      <label>Email</label>
                      <input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Role</label>
                      <input type="text" value={roleLabel} readOnly />
                    </div>
                    <div className="form-field">
                      <label>Login Provider</label>
                      <input type="text" value={user?.provider === 'GOOGLE' ? 'Google' : user?.provider === 'GITHUB' ? 'GitHub' : 'Local'} readOnly />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Change Password</h2>
                {(user?.provider === 'GOOGLE' || user?.provider === 'GITHUB') && (
                  <div className="error-message" style={{ marginBottom: 16 }}>
                    Password change is not available for social login accounts.
                  </div>
                )}
                {passMsg.text && (
                  <div className={passMsg.ok ? 'success-message' : 'error-message'}>{passMsg.text}</div>
                )}
                <form className="settings-form" onSubmit={handleChangePassword}>
                  <div className="form-field">
                    <label>Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={passForm.currentPassword}
                      onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))}
                      disabled={user?.provider === 'GOOGLE' || user?.provider === 'GITHUB'}
                    />
                  </div>
                  <div className="form-field">
                    <label>New Password</label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={passForm.newPassword}
                      onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))}
                      disabled={user?.provider === 'GOOGLE' || user?.provider === 'GITHUB'}
                    />
                  </div>
                  <div className="form-field">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Repeat new password"
                      value={passForm.confirm}
                      onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
                      disabled={user?.provider === 'GOOGLE' || user?.provider === 'GITHUB'}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving || user?.provider === 'GOOGLE' || user?.provider === 'GITHUB'}>
                    <Save size={16} /> {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Notification Preferences</h2>
                <div className="toggle-list">
                  {[
                    { label: 'Email Notifications',  sub: 'Receive updates via email',             def: true  },
                    { label: 'Interview Reminders',   sub: 'Get notified before scheduled interviews', def: true  },
                    { label: 'Report Notifications',  sub: 'Notify when reports are ready',        def: true  },
                    { label: 'Marketing Emails',      sub: 'Receive promotional updates',          def: false },
                  ].map((item, i) => (
                    <div key={i} className="toggle-item">
                      <div>
                        <h4>{item.label}</h4>
                        <p>{item.sub}</p>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" defaultChecked={item.def} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Appearance</h2>
                <div className="theme-options">
                  <button className="theme-option active"><Sun size={24} /><span>Light</span></button>
                  <button className="theme-option"><Moon size={24} /><span>Dark</span></button>
                  <button className="theme-option"><Monitor size={24} /><span>System</span></button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'language' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Language &amp; Region</h2>
                <div className="settings-form">
                  <div className="form-field">
                    <label>Language</label>
                    <select defaultValue="en">
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Timezone</label>
                    <select defaultValue="ist">
                      <option value="ist">IST (UTC +5:30)</option>
                      <option value="est">EST (UTC -5:00)</option>
                      <option value="pst">PST (UTC -8:00)</option>
                    </select>
                  </div>
                  <button className="btn btn-primary"><Save size={16} /> Save</button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}

export default SettingsPage
