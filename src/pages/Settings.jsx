import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Bell, Palette, Globe, Shield, Save, Moon, Sun, Monitor } from 'lucide-react'
import { motion } from 'framer-motion'
import '../styles/settings.css'

function SettingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')
  const role = localStorage.getItem('role') || 'student'

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'language', label: 'Language', icon: <Globe size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  ]

  return (
    <div className="settings-page">
      <nav className="settings-nav">
        <button className="settings-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>Settings</h1>
        <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
      </nav>

      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Profile Information</h2>
                <div className="settings-form">
                  <div className="form-row">
                    <div className="form-field">
                      <label>Full Name</label>
                      <input type="text" defaultValue={role === 'admin' ? 'Admin User' : role === 'recruiter' ? 'HR Manager' : 'Hemanth M'} />
                    </div>
                    <div className="form-field">
                      <label>Email</label>
                      <input type="email" defaultValue={role === 'admin' ? 'admin@hireai.com' : role === 'recruiter' ? 'hr@company.com' : 'hemanth@university.edu'} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Role</label>
                      <input type="text" value={role.charAt(0).toUpperCase() + role.slice(1)} readOnly />
                    </div>
                    <div className="form-field">
                      <label>Phone</label>
                      <input type="tel" defaultValue="+91 98765 43210" />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Bio</label>
                    <textarea rows={3} defaultValue="Passionate about technology and building great products."></textarea>
                  </div>
                  <button className="btn btn-primary"><Save size={16} /> Save Changes</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Notification Preferences</h2>
                <div className="toggle-list">
                  <div className="toggle-item">
                    <div>
                      <h4>Email Notifications</h4>
                      <p>Receive updates via email</p>
                    </div>
                    <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                  </div>
                  <div className="toggle-item">
                    <div>
                      <h4>Interview Reminders</h4>
                      <p>Get notified before scheduled interviews</p>
                    </div>
                    <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                  </div>
                  <div className="toggle-item">
                    <div>
                      <h4>Report Notifications</h4>
                      <p>Notify when reports are ready</p>
                    </div>
                    <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="toggle-slider"></span></label>
                  </div>
                  <div className="toggle-item">
                    <div>
                      <h4>Marketing Emails</h4>
                      <p>Receive promotional updates</p>
                    </div>
                    <label className="toggle-switch"><input type="checkbox" /><span className="toggle-slider"></span></label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Appearance</h2>
                <div className="theme-options">
                  <button className="theme-option active">
                    <Sun size={24} />
                    <span>Light</span>
                  </button>
                  <button className="theme-option">
                    <Moon size={24} />
                    <span>Dark</span>
                  </button>
                  <button className="theme-option">
                    <Monitor size={24} />
                    <span>System</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'language' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Language & Region</h2>
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

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="settings-section">
                <h2>Security</h2>
                <div className="settings-form">
                  <div className="form-field">
                    <label>Current Password</label>
                    <input type="password" placeholder="Enter current password" />
                  </div>
                  <div className="form-field">
                    <label>New Password</label>
                    <input type="password" placeholder="Enter new password" />
                  </div>
                  <div className="form-field">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Confirm new password" />
                  </div>
                  <button className="btn btn-primary"><Save size={16} /> Update Password</button>
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
