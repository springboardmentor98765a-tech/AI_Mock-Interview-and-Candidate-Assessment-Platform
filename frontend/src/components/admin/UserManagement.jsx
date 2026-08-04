import { useState } from 'react';
import { UserPlus, Search, MoreHorizontal, Shield, UserCheck, UserX } from 'lucide-react';
import { users } from '../../data/mockData';

const ROLE_BADGE = { Admin: 'badge-danger', Recruiter: 'badge-teal', Candidate: 'badge-primary' };
const ROLE_COLOR = { Admin: 'var(--accent-rose)', Recruiter: 'var(--accent-teal)', Candidate: 'var(--accent-primary)' };

function Avatar({ name, role, size = 36 }) {
  const initials = name.split(' ').map(n => n[0]).join('');
  const c = role === 'Admin' ? 'hsl(350,80%,50%)' : role === 'Recruiter' ? 'hsl(174,70%,40%)' : 'hsl(252,80%,55%)';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${c}, ${c}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: size * 0.33 + 'px', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function UserManagement() {
  const [userList, setUserList] = useState(users);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Candidate');
  const [inviteSent, setInviteSent] = useState(false);

  const filtered = userList.filter(u =>
    (roleFilter === 'All' || u.role === roleFilter) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleStatus = (id) => {
    setUserList(u => u.map(x => x.id === id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x));
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    setInviteSent(true);
    setTimeout(() => { setInviteSent(false); setShowInvite(false); setInviteEmail(''); }, 2000);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1>User Management</h1>
            <p>Manage platform users, assign roles, and control account access</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvite(v => !v)} id="invite-user-btn">
            <UserPlus size={16} />
            Invite User
          </button>
        </div>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--border-accent)', background: 'hsla(252,100%,68%,0.04)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Invite New User</h4>
          <div className="flex gap-3 flex-wrap">
            <input
              id="invite-email-input"
              className="form-control"
              placeholder="Email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ flex: 2, minWidth: 220 }}
            />
            <select className="form-control" value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ flex: 1, minWidth: 140 }}>
              <option>Candidate</option>
              <option>Recruiter</option>
              <option>Admin</option>
            </select>
            <button className="btn btn-primary" onClick={handleInvite} id="send-invite-btn">
              {inviteSent ? '✓ Sent!' : 'Send Invite'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Role Summary */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        {['Candidate', 'Recruiter', 'Admin'].map(role => {
          const count = userList.filter(u => u.role === role).length;
          const active = userList.filter(u => u.role === role && u.status === 'active').length;
          return (
            <div key={role} className="stat-card" style={{ padding: 'var(--space-4)' }}>
              <div className="flex items-center gap-3">
                <Shield size={18} color={ROLE_COLOR[role]} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: ROLE_COLOR[role] }}>{role}s</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="stat-value" style={{ fontSize: '1.5rem' }}>{count}</span>
                <span style={{ color: 'var(--accent-green)', fontSize: '0.75rem', paddingBottom: 4 }}>{active} active</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search className="search-bar-icon" />
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} id="user-search" />
        </div>
        <div className="flex gap-2">
          {['All', 'Candidate', 'Recruiter', 'Admin'].map(r => (
            <button key={r} className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRoleFilter(r)}>{r}</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filtered.length} users</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Interviews</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} role={u.role} />
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td><span className="text-secondary text-sm font-mono">{u.email}</span></td>
                <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                <td>
                  <div className="toggle-wrap" onClick={() => toggleStatus(u.id)} style={{ gap: 8, cursor: 'pointer' }}>
                    <div className={`toggle-switch ${u.status === 'active' ? 'on' : ''}`} style={{ width: 36, height: 20 }}>
                      <div style={{ content: '', position: 'absolute', width: 14, height: 14, background: 'white', borderRadius: '50%', top: 3, left: u.status === 'active' ? 19 : 3, transition: 'left 0.25s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: u.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td><span className="text-muted text-xs">{u.joined}</span></td>
                <td>
                  <span style={{ fontWeight: 600, color: u.interviews > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {u.interviews > 0 ? u.interviews : '—'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="Activate">
                      <UserCheck size={14} color="var(--accent-green)" />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="Deactivate">
                      <UserX size={14} color="var(--accent-rose)" />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
