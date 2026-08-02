import React, { useState } from 'react';

export default function AdminPortal() {
  const [synchronized, setSynchronized] = useState(false);

  return (
    <div style={{ color: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2>⚙️ Administrative Global Console</h2>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>Monitor infrastructure latency delay parameters and configurations.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
        <div style={{ padding: '24px', background: 'white', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
          <h3>42 ms</h3><small style={{ color: '#64748B' }}>API Inference Gateway Delay</small>
        </div>
        <div style={{ padding: '24px', background: 'white', borderRadius: '12px', borderLeft: '4px solid #3B82F6' }}>
          <h3>8 / 8 Active</h3><small style={{ color: '#64748B' }}>GPU Cluster Health Status</small>
        </div>
        <div style={{ padding: '24px', background: 'white', borderRadius: '12px', borderLeft: '4px solid #F59E0B' }}>
          <h3>1,420 pkts/s</h3><small style={{ color: '#64748B' }}>Media Stream Handshakes</small>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px' }}>
        <div style={{ padding: '28px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <h4>🧠 Core ML Architecture Settings</h4>
          <button type="button" onClick={() => setSynchronized(true)} className="btn-gradient" style={{ marginTop: '15px' }}>Synchronize Variable Maps</button>
          {synchronized && <p style={{ color: '#10B981', fontSize: '13px', marginTop: '10px' }}>✓ Settings successfully deployed.</p>}
        </div>

        <div style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <h4>📜 Live Security Log Terminal</h4>
          <div style={{ background: '#0F172A', color: '#38BDF8', padding: '15px', borderRadius: '10px', fontFamily: 'monospace', fontSize: '12px', height: '140px', overflowY: 'auto' }}>
            <div>[AUTH OK] Dispatched token via secure JWT account node layer.</div>
            <div style={{ color: '#34D399' }}>[PIPELINE] End-to-end testing validation status: 100% Passed.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
