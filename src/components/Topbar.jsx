import { useRef, useState } from 'react'
import { Bell, Camera, LogOut, Search, UserRound, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { authApi } from '../auth/api'

export default function Topbar({ title, subtitle, userInitials = 'JD', userName = 'Jane Doe', roleBadge }) {
  const { user, saveSession, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [image, setImage] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)
  const displayName = user?.name || userName
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || userInitials
  const imageSource = image ?? user?.profile_image

  const openProfile = () => { setName(displayName); setImage(null); setError(''); setOpen(true) }
  const changeImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 1_000_000) { setError('Choose an image smaller than 1 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result))
    reader.readAsDataURL(file)
  }
  const saveProfile = async (event) => {
    event.preventDefault(); setSaving(true); setError('')
    try { saveSession(await authApi.updateProfile({ name, profile_image: image ?? user?.profile_image ?? null })); setOpen(false) } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  const signOut = () => { logout(); window.location.assign('/login') }

  return <div className="topbar">
    <div><h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 700, color: '#f0f0ff' }}>{title}</h1>{subtitle && <p style={{ fontSize: '0.8rem', color: '#a0a0c0', marginTop: 2 }}>{subtitle}</p>}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="topbar-search" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', minWidth: 180 }}><Search size={14} color="#606080" /><input placeholder="Search..." style={{ background: 'transparent', border: 'none', outline: 'none', color: '#a0a0c0', fontSize: '0.82rem', width: '100%' }} /></div>
      <div style={{ position: 'relative' }}><button aria-label="Notifications" style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0a0c0' }}><Bell size={16} /></button><span className="notif-dot" /></div>
      <button onClick={openProfile} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'inherit', background: 'transparent', textAlign: 'left' }}><div className="avatar avatar-md" style={{ background: imageSource ? '#151522' : 'linear-gradient(135deg, #6366f1, #a855f7)', fontSize: '0.82rem', fontFamily: 'Outfit', overflow: 'hidden' }}>{imageSource ? <img src={imageSource} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}</div><div className="topbar-user" style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f0f0ff' }}>{displayName}</span>{roleBadge && <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{roleBadge}</span>}</div></button>
    </div>
    {open && <div className="profile-backdrop" onClick={() => setOpen(false)}><form onSubmit={saveProfile} onClick={(event) => event.stopPropagation()} className="profile-panel"><div className="profile-panel-header"><div><h2>Your profile</h2><p>{user?.email}</p></div><button type="button" onClick={() => setOpen(false)} className="profile-close" aria-label="Close profile"><X size={20} /></button></div><div className="profile-avatar-wrap"><button type="button" onClick={() => inputRef.current?.click()} className="avatar avatar-xl profile-avatar" style={{ background: imageSource ? '#151522' : 'linear-gradient(135deg,#6366f1,#a855f7)' }}>{imageSource ? <img src={imageSource} alt="Profile preview" /> : initials}<span className="profile-camera"><Camera size={13} /></span></button><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={changeImage} /></div><button type="button" onClick={() => inputRef.current?.click()} className="profile-picture-button">{imageSource ? 'Change profile picture' : 'Add profile picture'}</button><label className="form-group"><span className="form-label">Name</span><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} required /></label><div className="profile-role"><UserRound size={15} />{roleBadge || user?.role}</div>{error && <p className="profile-error">{error}</p>}<button className="btn btn-primary profile-save" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button><button type="button" onClick={signOut} className="profile-signout"><LogOut size={15} />Sign out</button></form></div>}
  </div>
}
