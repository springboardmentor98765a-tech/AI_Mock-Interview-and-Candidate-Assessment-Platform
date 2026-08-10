// ============================================================
//  UserManagement.jsx — Admin User CRUD Management
// ============================================================
import { useState, useEffect } from 'react';
import { UserPlus, Search, Shield, UserCheck, UserX, Trash2, Edit2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ROLE_COLOR = {
  admin: 'var(--accent-rose)',
  recruiter: 'var(--accent-teal)',
  candidate: 'var(--accent-primary)',
};

export default function UserManagement() {
  const [userList, setUserList]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState('All');
  
  const [showCreate, setShowCreate]     = useState(false);
  const [createName, setCreateName]     = useState('');
  const [createEmail, setCreateEmail]   = useState('');
  const [createPassword, setCreatePassword] = useState('Password123!');
  const [createRole, setCreateRole]     = useState('candidate');
  
  const [editingUser, setEditingUser]   = useState(null);
  const [editName, setEditName]         = useState('');
  const [editRole, setEditRole]         = useState('candidate');

  const [statusMsg, setStatusMsg]       = useState('');
  const [errorMsg, setErrorMsg]         = useState('');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/admin/users`);
      if (roleFilter !== 'All') url.searchParams.append('role_filter', roleFilter.toLowerCase());
      if (search.trim()) url.searchParams.append('search', search.trim());

      const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUserList(data);
      }
    } catch (_err) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          role: createRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create user');
      }

      setStatusMsg('User created successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
      setShowCreate(false);
      setCreateName('');
      setCreateEmail('');
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (res.ok) {
        setStatusMsg(`Status updated for ${user.name}`);
        setTimeout(() => setStatusMsg(''), 3000);
        fetchUsers();
      }
    } catch (_err) {
      /* ignore */
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setStatusMsg('User deleted successfully.');
        setTimeout(() => setStatusMsg(''), 3000);
        fetchUsers();
      }
    } catch (_err) {
      /* ignore */
    }
  };

  const handleStartEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName, role: editRole }),
      });
      if (res.ok) {
        setStatusMsg('User updated successfully.');
        setTimeout(() => setStatusMsg(''), 3000);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (_err) {
      /* ignore */
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 700 }}>
            User Management
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Full administrative user search, creation, editing, activation/deactivation &amp; deletion
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(v => !v)}>
          <UserPlus size={16} />
          Create New User
        </button>
      </div>

      {statusMsg && (
        <div style={{ background: 'hsla(142,70%,55%,0.1)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, color: 'var(--accent-green)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'hsla(350,90%,65%,0.1)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, color: 'var(--accent-rose)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Create User Form */}
      {showCreate && (
        <form onSubmit={handleCreateUser} className="card" style={{ marginBottom: 24, padding: 24, border: '1px solid var(--border-accent)', background: 'var(--bg-card)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-heading)' }}>
            Create New User Account
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <input className="input" placeholder="Full Name *" value={createName} onChange={e => setCreateName(e.target.value)} required style={{ background: 'var(--bg-input)' }} />
            <input className="input" type="email" placeholder="Email Address *" value={createEmail} onChange={e => setCreateEmail(e.target.value)} required style={{ background: 'var(--bg-input)' }} />
            <input className="input" type="password" placeholder="Password *" value={createPassword} onChange={e => setCreatePassword(e.target.value)} required style={{ background: 'var(--bg-input)' }} />
            <select className="input" value={createRole} onChange={e => setCreateRole(e.target.value)} style={{ background: 'var(--bg-input)' }}>
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save &amp; Create User</button>
          </div>
        </form>
      )}

      {/* Search & Role Filter Bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 36, background: 'var(--bg-input)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Candidate', 'Recruiter', 'Admin'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 500, border: roleFilter === r ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)', background: roleFilter === r ? 'hsla(252,100%,68%,0.15)' : 'var(--bg-card)', color: roleFilter === r ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="card" style={{ padding: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 18px' }}>User</th>
              <th style={{ padding: '14px 18px' }}>Role</th>
              <th style={{ padding: '14px 18px' }}>Status</th>
              <th style={{ padding: '14px 18px' }}>Joined Date</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.map(u => {
              const isEditing = editingUser?.id === u.id;
              const roleKey = u.role?.toLowerCase();
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    {!isEditing ? (
                      <>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </>
                    ) : (
                      <input className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '4px 8px', background: 'var(--bg-input)' }} />
                    )}
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    {!isEditing ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)', color: ROLE_COLOR[roleKey] || 'var(--text-primary)', border: `1px solid ${ROLE_COLOR[roleKey]}40` }}>
                        {u.role?.toUpperCase()}
                      </span>
                    ) : (
                      <select className="input" value={editRole} onChange={e => setEditRole(e.target.value)} style={{ padding: '4px 8px', background: 'var(--bg-input)' }}>
                        <option value="candidate">candidate</option>
                        <option value="recruiter">recruiter</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: u.is_active ? 'var(--accent-green)' : 'var(--accent-rose)' }}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(u.created_at || Date.now()).toLocaleDateString()}
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    {!isEditing ? (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => handleToggleStatus(u)} title={u.is_active ? 'Deactivate user' : 'Activate user'} style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: u.is_active ? 'var(--accent-amber)' : 'var(--accent-green)', cursor: 'pointer', fontSize: '0.78rem' }}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>

                        <button onClick={() => handleStartEdit(u)} title="Edit user" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
                          <Edit2 size={16} />
                        </button>

                        <button onClick={() => handleDeleteUser(u)} title="Delete user" style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: 4 }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={handleSaveEdit} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>Save</button>
                        <button onClick={() => setEditingUser(null)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
