import React from 'react';

export default function Navbar({ role, userEmail, onLogout }) {
  return (
    <div style={{
      height: '70px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>🤖</span>
        <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '18px', letterSpacing: '-0.5px' }}>SmartHire AI</span>
        <span style={{ 
          marginLeft: '12px', padding: '4px 12px', background: '#EFF6FF', 
          color: '#0284C7', borderRadius: '6px', fontSize: '12px', fontWeight: '700' 
        }}>
          {role} Workspace Active
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{userEmail || 'user@smarthire.ai'}</div>
          <small style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Active Token</small>
        </div>
        <button 
          type="button" 
          onClick={onLogout} 
          style={{
            background: '#F1F5F9', color: '#0F172A', border: 'none', 
            padding: '8px 16px', borderRadius: '6px', fontWeight: '700', 
            fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
