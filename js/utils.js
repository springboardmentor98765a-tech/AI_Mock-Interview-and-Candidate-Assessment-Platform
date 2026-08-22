/* ── Helpers ── */
function icon(name, size) {
  let svg = ICONS[name] || '';
  if (size) {
    svg = svg.replace(/width="\d+"/, 'width="' + size + '"').replace(/height="\d+"/, 'height="' + size + '"');
  }
  return svg;
}

function statCard(ic, label, value, delta, color) {
  color = color || INDIGO;
  const positive = delta && delta.startsWith('+');
  return `<div class="stat-card">
    <div class="flex items-center justify-between">
      <div class="stat-icon" style="background:${color}22"><span style="color:${color}">${ic}</span></div>
      ${delta ? `<span class="delta ${positive ? 'positive' : 'negative'}">${positive ? icon('arrowUpRight') : icon('arrowDownRight')} ${delta}</span>` : ''}
    </div>
    <div>
      <p class="stat-value">${value}</p>
      <p class="stat-label">${label}</p>
    </div>
  </div>`;
}

function badge(text, color) {
  color = color || 'indigo';
  return `<span class="badge badge-${color}">${text}</span>`;
}

function sidebarLink(ic, label, key, active) {
  return `<button data-section="${key}" class="sidebar-link ${active ? 'active' : ''}">
    <span class="sidebar-link-icon ${active ? 'active' : ''}">${ic}</span>${label}
  </button>`;
}

function progressBar(value, color) {
  color = color || INDIGO;
  return `<div class="progress-bar"><div class="progress-bar-fill" style="width:${value}%;background:${color}"></div></div>`;
}

function icSize(name, size) {
  return icon(name, size);
}

/* ── Chart drawing ── */
function destroyCharts() {
  Object.values(charts).forEach(function(c) { if (c && c.destroy) c.destroy(); });
  charts = {};
}

function drawAreaChart(canvasId, datasets, labels) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets.map(function(ds) {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color + '33',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: ds.color,
        };
      }),
    },
    options: chartOpts(),
  });
}

function drawBarChart(canvasId, data, labels, colors) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: chartOpts(),
  });
}

function drawGroupedBarChart(canvasId, datasets, labels) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets.map(function(ds) {
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.color,
          borderRadius: 4,
          borderSkipped: false,
        };
      }),
    },
    options: chartOpts(true),
  });
}

function drawLineChart(canvasId, datasets, labels) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets.map(function(ds) {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: ds.color,
        };
      }),
    },
    options: chartOpts(),
  });
}

function drawHorizontalBarChart(canvasId, data, labels, color) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: data.map(function(_, i) {
          var opacity = 1 - i * 0.15;
          return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
        }),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: chartOpts(false, true),
  });
}

function drawPieChart(canvasId, data, labels, colors) {
  var el = document.getElementById(canvasId);
  if (!el) return;
  var ctx = el.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d0f1e',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#6b7094',
          bodyColor: '#e8eaf2',
          padding: 8,
          cornerRadius: 8,
        },
      },
    },
  });
}

function chartOpts(legend, horizontal) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: !!legend, labels: { color: '#6b7094', font: { size: 11 }, boxWidth: 12, padding: 16 } },
      tooltip: {
        backgroundColor: '#0d0f1e',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: '#6b7094',
        bodyColor: '#e8eaf2',
        padding: 8,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: { color: '#6b7094', font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: { color: '#6b7094', font: { size: 11 } },
        border: { display: false },
        min: 0,
        max: horizontal ? undefined : 100,
      },
    },
  };
}

/* ── Shared Layout ── */
function renderDashboardLayout(navItems, content, username, avatar) {
  var roleColor = state.role === 'candidate' ? INDIGO : state.role === 'recruiter' ? CYAN : EMERALD;
  var badgeColor = state.role === 'candidate' ? 'indigo' : state.role === 'recruiter' ? 'cyan' : 'emerald';
  var unreadCount = state.unreadNotifCount || 0;

  return `<div class="flex h-screen overflow-hidden" style="font-family:'Inter',sans-serif;background:#06070f">
    <div class="sidebar flex flex-col border-r border-white/6" style="background:#09091a">
      <div class="p-5 border-b border-white/6">
        <div class="flex items-center gap-2">
          <div class="sidebar-logo">${icon('brain', 16)}</div>
          <div><p class="logo-text-sm">SmartHire AI</p>${badge(state.role, badgeColor)}</div>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto" id="sidebar-nav">
        ${navItems.map(function(item) { return sidebarLink(item.icon, item.label, item.key, state.section === item.key); }).join('')}
      </nav>
      <div class="p-3 border-t border-white/6">
        <div class="flex items-center gap-2 p-2 rounded-lg mb-2" style="background:#141627">
          <div class="user-avatar-sm" style="background:${roleColor}">${avatar}</div>
          <div class="flex-1 min-w-0"><p class="text-white text-xs font-medium truncate">${username}</p><p class="text-white/40 text-xs truncate capitalize">${state.role}</p></div>
        </div>
        <button id="btn-logout" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 transition-all">${icon('logOut')} Log out</button>
      </div>
    </div>
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="topbar shrink-0 flex items-center justify-between px-6 border-b border-white/6 relative" style="background:#09091a;z-index:90;">
        <div class="search-input-wrap">${icon('search', 14)}<input id="inp-search" value="${state.search}" placeholder="Search..." class="search-input" /></div>
        <div class="flex items-center gap-3">
          <!-- Notification Bell & Flyout Dropdown -->
          <div class="relative notif-wrapper" id="notif-wrapper">
            <button id="btn-notif-bell" class="notif-btn relative ${state.isNotifDropdownOpen ? 'active' : ''}" aria-label="Notifications" title="Notifications">
              ${icon('bell')}
              ${unreadCount > 0 ? `<span class="notif-badge-pill" id="notif-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
            </button>
            ${state.isNotifDropdownOpen ? renderNotificationDropdown() : ''}
          </div>
          <div class="user-avatar-sm" style="background:${roleColor}">${avatar}</div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-6" id="main-content">${content}</div>
    </div>
  </div>`;
}

/* ── Notification Dropdown Renderer ── */
function renderNotificationDropdown() {
  var notifs = state.notificationsData || [];
  var unreadCount = state.unreadNotifCount || 0;
  var currentTab = state.notifActiveTab || 'all';

  var filtered = notifs.filter(function(n) {
    if (currentTab === 'unread') return !n.is_read;
    if (currentTab === 'reports') return n.type === 'report_ready';
    if (currentTab === 'reminders') return n.type === 'interview_reminder';
    if (currentTab === 'alerts') return n.type === 'session_alert' || n.type === 'performance_summary';
    return true;
  });

  var tabs = [
    { key: 'all', label: 'All', count: notifs.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'reports', label: 'Reports', count: notifs.filter(function(n){ return n.type === 'report_ready'; }).length },
    { key: 'reminders', label: 'Reminders', count: notifs.filter(function(n){ return n.type === 'interview_reminder'; }).length },
    { key: 'alerts', label: 'Alerts', count: notifs.filter(function(n){ return n.type === 'session_alert' || n.type === 'performance_summary'; }).length },
  ];

  return `
    <div class="sh-notif-dropdown shadow-2xl" id="sh-notif-dropdown" onclick="event.stopPropagation()">
      <!-- Dropdown Header -->
      <div class="sh-notif-header">
        <div class="flex items-center gap-2">
          <div class="sh-notif-bell-icon">${icon('bell', 16)}</div>
          <div>
            <h4 class="sh-notif-title">Notifications</h4>
            <p class="sh-notif-subtext">${unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          ${unreadCount > 0 ? `<button id="btn-notif-mark-all" class="sh-notif-tool-btn" title="Mark all as read">${icon('check', 13)} Mark all read</button>` : ''}
          ${notifs.length > 0 ? `<button id="btn-notif-clear-all" class="sh-notif-tool-btn danger" title="Clear all notifications">${icon('trash', 13)} Clear</button>` : ''}
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="sh-notif-tabs">
        ${tabs.map(function(t) {
          var activeClass = currentTab === t.key ? 'active' : '';
          return `<button class="sh-notif-tab ${activeClass}" data-tab="${t.key}">
            ${t.label}
            ${t.count > 0 ? `<span class="sh-notif-tab-count">${t.count}</span>` : ''}
          </button>`;
        }).join('')}
      </div>

      <!-- Notification List -->
      <div class="sh-notif-list custom-scrollbar">
        ${state.notifLoading ? `
          <div class="sh-notif-empty">
            <div class="sh-notif-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ` : filtered.length === 0 ? `
          <div class="sh-notif-empty">
            <div class="sh-notif-empty-icon">${icon('bell', 28)}</div>
            <p class="font-medium text-white/70 text-sm">No ${currentTab === 'all' ? '' : currentTab} notifications</p>
            <p class="text-xs text-white/40 max-w-xs mt-1">You're all caught up! Session alerts, reminders, and report updates will appear here.</p>
          </div>
        ` : filtered.map(function(n) {
          var typeInfo = getNotificationTypeInfo(n.type);
          var unreadClass = n.is_read ? 'read' : 'unread';
          var timeAgo = formatTimeAgo(n.created_at);

          return `
            <div class="sh-notif-card ${unreadClass}" data-id="${n.id}">
              <div class="sh-notif-card-main">
                <div class="sh-notif-icon-box ${typeInfo.colorClass}">
                  ${typeInfo.iconHtml}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="sh-notif-tag ${typeInfo.colorClass}">${typeInfo.label}</span>
                    <div class="flex items-center gap-1.5">
                      <span class="sh-notif-time">${timeAgo}</span>
                      ${!n.is_read ? `<span class="sh-notif-unread-dot" title="Unread"></span>` : ''}
                      <button class="sh-notif-dismiss-btn" data-id="${n.id}" title="Dismiss">&times;</button>
                    </div>
                  </div>
                  <h5 class="sh-notif-card-title">${n.title}</h5>
                  <p class="sh-notif-card-desc">${n.message}</p>
                  
                  <!-- Dynamic Notification Actions -->
                  ${renderNotificationActions(n)}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Dropdown Footer -->
      <div class="sh-notif-footer">
        <div class="flex items-center justify-between text-xs text-white/40">
          <span>SmartHire AI Live Updates</span>
          <button id="btn-notif-test-reminder" class="sh-notif-test-link hover:text-indigo-400 transition-colors">+ Send Practice Reminder</button>
        </div>
      </div>
    </div>
  `;
}

function getNotificationTypeInfo(type) {
  switch (type) {
    case 'report_ready':
      return {
        label: 'Report Ready',
        colorClass: 'indigo',
        iconHtml: icon('fileText', 16)
      };
    case 'interview_reminder':
      return {
        label: 'Practice Reminder',
        colorClass: 'amber',
        iconHtml: icon('clock', 16)
      };
    case 'session_alert':
      return {
        label: 'Session Alert',
        colorClass: 'cyan',
        iconHtml: icon('monitorPlay', 16)
      };
    case 'performance_summary':
      return {
        label: 'Performance Summary',
        colorClass: 'emerald',
        iconHtml: icon('barChart2', 16)
      };
    default:
      return {
        label: 'Notification',
        colorClass: 'slate',
        iconHtml: icon('bell', 16)
      };
  }
}

function renderNotificationActions(n) {
  var data = n.data || {};
  var html = '<div class="sh-notif-actions">';

  if (n.type === 'report_ready' && data.session_id) {
    html += `
      <button class="sh-notif-btn primary btn-notif-action-view-report" data-session-id="${data.session_id}">
        ${icon('barChart2', 12)} View AI Report
      </button>
      <button class="sh-notif-btn secondary btn-notif-action-download" data-session-id="${data.session_id}" data-domain="${data.domain || 'Interview'}">
        ${icon('downloadLg', 12)} Download PDF
      </button>
    `;
  } else if (n.type === 'interview_reminder') {
    html += `
      <button class="sh-notif-btn primary btn-notif-action-practice" data-domain="${data.domain || 'Software Engineering'}">
        ${icon('play', 12)} Start Practice
      </button>
    `;
  } else if (n.type === 'performance_summary') {
    html += `
      <button class="sh-notif-btn primary btn-notif-action-analytics">
        ${icon('barChart2', 12)} View Metrics
      </button>
    `;
  } else if (n.type === 'session_alert') {
    html += `
      <button class="sh-notif-btn secondary btn-notif-action-sessions">
        ${icon('monitorPlay', 12)} View History
      </button>
    `;
  }

  html += '</div>';
  return html;
}

function placeholderSection(title, desc, ic) {
  return `<div class="flex flex-col items-center justify-center h-80 text-center">
    <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white/20" style="background:#141627">${ic}</div>
    <h2 class="text-xl font-semibold text-white mb-2" style="font-family:'Outfit',sans-serif">${title}</h2>
    <p class="text-white/35 text-sm max-w-sm leading-relaxed">${desc}</p>
  </div>`;
}

/* ── Date/Time Parsing and Local Time Formatting Helpers ── */
function parseUTCDate(dateStr) {
  if (!dateStr) return null;
  var str = String(dateStr).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(str)) {
    str = str + 'Z';
  }
  var d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  var d = parseUTCDate(dateStr);
  if (!d) return 'Just now';
  var diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
  if (diffSec < 604800) return Math.floor(diffSec / 86400) + 'd ago';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  var d = parseUTCDate(dateStr);
  if (!d) return dateStr || 'Recently';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  var d = parseUTCDate(dateStr);
  if (!d) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  var d = parseUTCDate(dateStr);
  if (!d) return dateStr || 'Recently';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' +
         d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/* ── PDF Report Generator & Exporter ── */
function downloadReportAsPDF(report) {
  if (!report) return;

  var comm = report.communication_score !== null && report.communication_score !== undefined ? report.communication_score : (report.total_score || 0);
  var conf = report.confidence_score !== null && report.confidence_score !== undefined ? report.confidence_score : (report.total_score || 0);
  var tech = report.technical_score !== null && report.technical_score !== undefined ? report.technical_score : (report.total_score || 0);
  var prof = report.professionalism_score !== null && report.professionalism_score !== undefined ? report.professionalism_score : (report.total_score || 0);
  var overall = report.overall_score !== null && report.overall_score !== undefined ? report.overall_score : (report.total_score || 0);
  var rating = report.performance_rating || (overall >= 90 ? 'Excellent' : overall >= 75 ? 'Good' : overall >= 60 ? 'Average' : overall >= 40 ? 'Needs Improvement' : 'Poor');

  var candidateName = (state.user && state.user.name) ? state.user.name : (report.candidate_name || 'Candidate');
  var domain = report.domain || 'Software Engineering';
  var itype = report.interview_type || 'Technical Interview';
  var diff = report.difficulty ? report.difficulty.charAt(0).toUpperCase() + report.difficulty.slice(1) : 'Medium';
  var dateStr = formatDateTime(report.completed_at || report.created_at);
  var sessionId = report.interview_id || report.id || 'N/A';

  var params = report.detailed_parameters || {};

  /* ── Module 6: measured vision analytics override placeholders ── */
  var visionMetrics = report.vision_metrics || null;
  var visionEye = visionMetrics && visionMetrics.eye ? visionMetrics.eye : null;
  if (visionEye && typeof visionEye.contact_pct === 'number') {
    params.eye_contact_consistency = Math.round(visionEye.contact_pct);
    if (typeof params.attention_level !== 'number') params.attention_level = Math.round(visionEye.contact_pct);
  }
  function fmtVisionSecs(s) {
    if (!s) return '0s';
    var m = Math.floor(s / 60);
    var r = Math.round(s % 60);
    return m > 0 ? m + 'm ' + r + 's' : r + 's';
  }
  var visionBoxHtml = (visionEye && typeof visionEye.contact_pct === 'number') ? `
    <div class="box" style="margin-bottom:18px;">
      ${(visionMetrics.engagement && visionMetrics.engagement.score !== null && visionMetrics.engagement.score !== undefined) ? (() => {
        var en = visionMetrics.engagement;
        var enNames = { attention: 'Attention', eye_contact: 'Eye Contact', face_presence: 'Face Presence', head_orientation: 'Head Orientation', facial_activity: 'Facial Activity', interaction_continuity: 'Continuity' };
        var compRows = Object.keys(en.components).filter(function (k) { return typeof en.components[k] === 'number'; }).map(function (k) {
          return `<span style="display:inline-block;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:5px;padding:2px 8px;margin:0 4px 4px 0;font-size:10px;color:#3730a3;"><strong>${enNames[k] || k}:</strong> ${en.components[k].toFixed(0)}</span>`;
        }).join('');
        return `<div style="border:1px solid #c4b5fd;background:#f5f3ff;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <p style="font-size:11px;font-weight:800;color:#4c1d95;text-transform:uppercase;letter-spacing:0.4px;">Engagement Score</p>
              <p style="font-size:11px;font-weight:700;color:#6d28d9;">${en.level || ''}</p>
            </div>
            <p style="font-size:24px;font-weight:800;color:#0f172a;line-height:1.1;margin:2px 0 6px 0;">${en.score.toFixed(0)} <span style="font-size:11px;font-weight:600;color:#64748b;">/ 100</span></p>
            <div>${compRows}</div>
          </div>`;
      })() : ''}
      ${(visionMetrics.confidence_indicator && visionMetrics.confidence_indicator.score !== null && visionMetrics.confidence_indicator.score !== undefined) ? (() => {
        var ci = visionMetrics.confidence_indicator;
        var compNames = { eye_contact: 'Eye Contact', head_stability: 'Head Stability', face_visibility: 'Face Visibility', attention: 'Attention', expression_stability: 'Expression Stability' };
        var compRows = Object.keys(ci.components).filter(function (k) { return typeof ci.components[k] === 'number'; }).map(function (k) {
          return `<span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;padding:2px 8px;margin:0 4px 4px 0;font-size:10px;color:#334155;"><strong>${compNames[k] || k}:</strong> ${ci.components[k].toFixed(0)}</span>`;
        }).join('');
        return `<div style="border:1px solid #c7d2fe;background:#eef2ff;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <p style="font-size:11px;font-weight:800;color:#3730a3;text-transform:uppercase;letter-spacing:0.4px;">Confidence Indicator</p>
              <p style="font-size:11px;font-weight:700;color:#4f46e5;">${ci.band || ''}</p>
            </div>
            <p style="font-size:24px;font-weight:800;color:#0f172a;line-height:1.1;margin:2px 0 6px 0;">${ci.score.toFixed(0)} <span style="font-size:11px;font-weight:600;color:#64748b;">/ 100</span></p>
            <div>${compRows}</div>
            <p style="font-size:8.5px;color:#94a3b8;margin-top:4px;">Behavioral indicator from measurable signals &mdash; not a claim of actual confidence.</p>
          </div>`;
      })() : ''}
      <div class="box-title" style="color:#0891b2;">&#9678; Vision &amp; Camera Focus Analysis</div>
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:8px;">
        <div style="min-width:110px;">
          <p style="font-size:26px;font-weight:800;color:#0f172a;line-height:1;">${Math.round(visionEye.contact_pct)}%</p>
          <p style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">Eye Contact (${visionEye.focus_label})</p>
        </div>
        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:6px;padding:6px 10px;">
            <p style="font-size:9px;color:#155e75;text-transform:uppercase;font-weight:700;">Time Toward Camera</p>
            <p style="font-size:12px;font-weight:800;color:#0f172a;">${fmtVisionSecs(visionEye.seconds_contact)}</p>
          </div>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:6px 10px;">
            <p style="font-size:9px;color:#9a3412;text-transform:uppercase;font-weight:700;">Time Looking Away</p>
            <p style="font-size:12px;font-weight:800;color:#0f172a;">${fmtVisionSecs(visionEye.seconds_away)}</p>
          </div>
        </div>
      </div>
      ${(visionMetrics.orientation_counts && Object.keys(visionMetrics.orientation_counts).length) ? (() => {
        var entries = Object.keys(visionMetrics.orientation_counts).map(function (k) {
          return k + ': ' + Math.round(visionMetrics.orientation_counts[k] / (visionMetrics.pose_frames || 1) * 100) + '%';
        });
        return `<p style="font-size:10px;color:#4b5563;"><strong>Head orientation mix:</strong> ${entries.join(' &middot; ')}</p>`;
      })() : ''}
      ${(visionMetrics.emotion && visionMetrics.emotion.dominant_distribution) ? (() => {
        var emoNames = { happy: 'Happy', neutral: 'Neutral', sad: 'Sad', angry: 'Angry', fear: 'Fear', surprise: 'Surprise', disgust: 'Disgust' };
        var entries = Object.keys(visionMetrics.emotion.dominant_distribution).slice(0, 4).map(function (k) {
          return (emoNames[k] || k) + ': ' + visionMetrics.emotion.dominant_distribution[k].toFixed(0) + '%';
        });
        return `<p style="font-size:10px;color:#4b5563;"><strong>Facial emotion mix:</strong> ${entries.join(' &middot; ')}${visionMetrics.emotion.session_dominant ? ' &mdash; dominant: ' + (emoNames[visionMetrics.emotion.session_dominant] || visionMetrics.emotion.session_dominant) : ''}</p>`;
      })() : ''}
    </div>` : '';

  var strengths = report.strengths || [];
  var weaknesses = report.weaknesses || [];
  var improvements = report.improvements || [];
  var recommendations = report.recommendations || [];
  var resources = report.resources || [];
  var questions = report.questions || [];

  var grammar = report.grammar_analysis || (report.communication_analysis && report.communication_analysis.grammar_analysis) || {};
  var filler = report.filler_analysis || (report.communication_analysis && report.communication_analysis.filler_analysis) || {};
  var pace = report.pace_analysis || (report.communication_analysis && report.communication_analysis.pace_analysis) || {};

  var ratingColor = rating === 'Excellent' ? '#10b981' : rating === 'Good' ? '#6366f1' : rating === 'Average' ? '#f59e0b' : rating === 'Needs Improvement' ? '#f43f5e' : '#e11d48';

  var behaviorBoxHtml = (visionMetrics && visionMetrics.behavior) ? (() => {
    var b = visionMetrics.behavior; var m = b.metrics || {};
    var metricLine = function (label, val) {
      return `<tr><td style="padding:4px 8px;border-bottom:1px solid #eef2f7;color:#374151;">${label}</td><td style="padding:4px 8px;border-bottom:1px solid #eef2f7;text-align:right;font-weight:700;color:#111827;">${val}</td></tr>`;
    };
    var segRows = (b.segments || []).slice(0, 6).map(function (s) {
      return `<li style="margin-bottom:3px;"><span style="font-family:'JetBrains Mono',monospace;font-size:9.5px;color:#4f46e5;font-weight:600;">${s.from} - ${s.to}</span> &nbsp; ${s.label}</li>`;
    }).join('');
    var pointRows = (b.summary_points || []).map(function (p) {
      return `<li style="margin-bottom:3px;color:${p.kind === 'good' ? '#065f46' : '#92400e'};">${p.kind === 'good' ? '&#10003;' : '&#9888;'} ${p.text}</li>`;
    }).join('');
    var emoDist = m.dominant_expression_distribution || {};
    var emoText = Object.keys(emoDist).slice(0, 4).map(function (k) {
      return (visionMetrics.emotion && { happy: 'Happy', neutral: 'Neutral', sad: 'Sad', angry: 'Angry', fear: 'Fear', surprise: 'Surprise', disgust: 'Disgust' }[k] || k) + ' ' + emoDist[k].toFixed(0) + '%';
    }).join(' &middot; ');
    return `<div class="box" style="margin-bottom:18px;">
      <div class="box-title" style="color:#4f46e5;">&#9678; Interview Behavior Analysis</div>
      <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:8px;">
        ${metricLine('Eye Contact', m.eye_contact_pct != null ? m.eye_contact_pct.toFixed(0) + '%' : '—')}
        ${metricLine('Attention', m.attention_pct != null ? m.attention_pct.toFixed(0) + '%' : '—')}
        ${metricLine('Face Visibility', m.face_visibility_pct != null ? m.face_visibility_pct.toFixed(0) + '%' : '—')}
        ${metricLine('Avg Head Movement', m.avg_head_movement_deg_per_min != null ? m.avg_head_movement_deg_per_min.toFixed(1) + '&deg;/min' : '—')}
        ${metricLine('Longest Attention Break', m.longest_attention_break_s != null ? m.longest_attention_break_s.toFixed(0) + 's' : '—')}
        ${metricLine('Significant Attention Breaks', String(m.significant_attention_breaks ?? 0))}
        ${metricLine('Confidence Indicator', m.confidence_indicator != null ? m.confidence_indicator.toFixed(0) : '—')}
        ${metricLine('Engagement Score', (function () { var en = visionMetrics.engagement; return en && en.score != null ? en.score.toFixed(0) + ' (' + (en.level || '') + ')' : '—'; })())}
      </table>
      ${emoText ? `<p style="font-size:10px;color:#4b5563;margin-bottom:6px;"><strong>Expression distribution:</strong> ${emoText}</p>` : ''}
      ${(b.segments && b.segments.length) ? `<p style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;margin-bottom:3px;">Session Timeline</p><ul style="list-style:none;padding:0;margin:0 0 6px 0;font-size:10px;">${segRows}</ul>` : ''}
      ${(b.summary_points && b.summary_points.length) ? `<p style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;margin-bottom:3px;">Behavior Summary</p><ul style="list-style:none;padding:0;margin:0;">${pointRows}</ul>` : ''}
    </div>`;
  })() : '';

  var printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SmartHire AI Evaluation Report - Session #${sessionId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #111827;
      line-height: 1.5;
      font-size: 13px;
      padding: 30px;
    }
    @media print {
      body { padding: 0; }
      @page { size: A4; margin: 12mm 14mm; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .logo-badge {
      display: inline-block;
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: -0.5px;
    }
    .tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 6px;
      background: #eef2ff;
      color: #4f46e5;
      margin-top: 4px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .meta-item p { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-bottom: 2px; }
    .meta-item span { font-size: 12px; font-weight: 700; color: #1f2937; }
    
    .score-banner {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .overall-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .overall-score {
      font-family: 'Outfit', sans-serif;
      font-size: 38px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
      margin-bottom: 6px;
    }
    .rating-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #ffffff;
      background: ${ratingColor};
    }
    .category-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .cat-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .cat-header {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      font-size: 12px;
      color: #374151;
      margin-bottom: 6px;
    }
    .cat-score {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }
    .progress-bar-bg {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 6px;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
    }
    
    .section-title {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin: 20px 0 12px 0;
    }
    .params-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 18px;
    }
    .params-table th {
      background: #f3f4f6;
      text-align: left;
      padding: 8px 10px;
      color: #374151;
      font-weight: 700;
      border: 1px solid #e5e7eb;
    }
    .params-table td {
      padding: 7px 10px;
      border: 1px solid #e5e7eb;
      color: #4b5563;
    }
    .params-table td.score-cell {
      font-weight: 700;
      color: #111827;
      text-align: right;
    }
    
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }
    .box {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 14px;
      background: #f9fafb;
    }
    .box-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .box-title.green { color: #059669; }
    .box-title.amber { color: #d97706; }
    .box ul { list-style: none; padding: 0; }
    .box li { font-size: 11px; color: #4b5563; margin-bottom: 6px; position: relative; padding-left: 14px; line-height: 1.4; }
    .box li::before { content: "•"; position: absolute; left: 0; color: #6b7280; font-weight: bold; }
    
    .question-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      background: #ffffff;
    }
    .q-header {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 12px;
      color: #111827;
      margin-bottom: 6px;
    }
    .q-answer {
      background: #f8fafc;
      border-left: 3px solid #6366f1;
      padding: 8px 10px;
      font-size: 11px;
      color: #334155;
      margin-top: 6px;
      border-radius: 0 6px 6px 0;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      color: #9ca3af;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-badge">SmartHire AI</div>
      <div class="tag">AI Evaluation Diagnostic Report</div>
      <h1 style="font-size:18px;font-weight:800;color:#111827;margin-top:6px;">${itype} Assessment &bull; ${domain}</h1>
    </div>
    <div style="text-align:right;">
      <p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700;">Report ID</p>
      <p style="font-size:12px;font-weight:800;color:#111827;">#SH-SESS-${sessionId}</p>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><p>Candidate Name</p><span>${candidateName}</span></div>
    <div class="meta-item"><p>Interview Domain</p><span>${domain}</span></div>
    <div class="meta-item"><p>Difficulty Level</p><span>${diff}</span></div>
    <div class="meta-item"><p>Completed Date</p><span>${dateStr}</span></div>
  </div>

  <div class="score-banner">
    <div class="overall-card">
      <p style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:4px;">Overall Score</p>
      <div class="overall-score">${overall.toFixed(1)}%</div>
      <div class="rating-badge">${rating}</div>
    </div>
    <div class="category-grid">
      <div class="cat-card">
        <div class="cat-header"><span>Communication (30%)</span><span class="cat-score">${comm.toFixed(0)}%</span></div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${comm}%;background:#6366f1;"></div></div>
      </div>
      <div class="cat-card">
        <div class="cat-header"><span>Confidence (25%)</span><span class="cat-score">${conf.toFixed(0)}%</span></div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${conf}%;background:#06b6d4;"></div></div>
      </div>
      <div class="cat-card">
        <div class="cat-header"><span>Technical Relevance (30%)</span><span class="cat-score">${tech.toFixed(0)}%</span></div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${tech}%;background:#10b981;"></div></div>
      </div>
      <div class="cat-card">
        <div class="cat-header"><span>Professionalism (15%)</span><span class="cat-score">${prof.toFixed(0)}%</span></div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${prof}%;background:#f59e0b;"></div></div>
      </div>
    </div>
  </div>

  <!-- 19 Parameters Grid -->
  <h2 class="section-title">AI Feedback &amp; Scoring Breakdown</h2>
  <p style="font-size:10px;color:#6b7280;margin:-6px 0 10px 0;">Overall = Communication &times;30% + Confidence &times;25% + Technical &times;30% + Professionalism &times;15%</p>
  ${visionBoxHtml}
  ${behaviorBoxHtml}
  <table class="params-table">
    <thead>
      <tr>
        <th style="width:30%;">Dimension</th>
        <th style="width:55%;">Evaluated Metric</th>
        <th style="width:15%;text-align:right;">Score</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Communication</td><td>Speech Clarity &amp; Enunciation</td><td class="score-cell">${(params.speech_clarity !== undefined ? params.speech_clarity : comm).toFixed(0)}%</td></tr>
      <tr><td>Communication</td><td>Grammar Quality &amp; Syntax</td><td class="score-cell">${(params.grammar_quality !== undefined ? params.grammar_quality : comm).toFixed(0)}%</td></tr>
      <tr><td>Communication</td><td>Speaking Pace &amp; Cadence</td><td class="score-cell">${(params.speaking_pace !== undefined ? params.speaking_pace : comm).toFixed(0)}%</td></tr>
      <tr><td>Communication</td><td>Response Completeness</td><td class="score-cell">${(params.response_completeness !== undefined ? params.response_completeness : comm).toFixed(0)}%</td></tr>
      
      <tr><td>Confidence</td><td>Eye Contact Consistency</td><td class="score-cell">${(params.eye_contact_consistency !== undefined ? params.eye_contact_consistency : conf).toFixed(0)}%</td></tr>
      <tr><td>Confidence</td><td>Facial Engagement &amp; Calmness</td><td class="score-cell">${(params.facial_engagement !== undefined ? params.facial_engagement : conf).toFixed(0)}%</td></tr>
      <tr><td>Confidence</td><td>Speaking Confidence &amp; Poise</td><td class="score-cell">${(params.speaking_confidence !== undefined ? params.speaking_confidence : conf).toFixed(0)}%</td></tr>
      <tr><td>Confidence</td><td>Attention &amp; Focus Level</td><td class="score-cell">${(params.attention_level !== undefined ? params.attention_level : conf).toFixed(0)}%</td></tr>
      
      <tr><td>Technical</td><td>Technical Accuracy &amp; Depth</td><td class="score-cell">${(params.technical_accuracy !== undefined ? params.technical_accuracy : tech).toFixed(0)}%</td></tr>
      <tr><td>Technical</td><td>Keyword &amp; Domain Term Relevance</td><td class="score-cell">${(params.keyword_relevance !== undefined ? params.keyword_relevance : tech).toFixed(0)}%</td></tr>
      <tr><td>Technical</td><td>Problem Solving &amp; Logic</td><td class="score-cell">${(params.problem_solving_ability !== undefined ? params.problem_solving_ability : tech).toFixed(0)}%</td></tr>
      <tr><td>Technical</td><td>Domain Knowledge Mastery</td><td class="score-cell">${(params.domain_knowledge !== undefined ? params.domain_knowledge : tech).toFixed(0)}%</td></tr>
      
      <tr><td>Professionalism</td><td>Time Management &amp; Pacing</td><td class="score-cell">${(params.time_management !== undefined ? params.time_management : prof).toFixed(0)}%</td></tr>
      <tr><td>Professionalism</td><td>Response Organization (STAR)</td><td class="score-cell">${(params.response_organization !== undefined ? params.response_organization : prof).toFixed(0)}%</td></tr>
      <tr><td>Professionalism</td><td>Professional Communication</td><td class="score-cell">${(params.professional_communication !== undefined ? params.professional_communication : prof).toFixed(0)}%</td></tr>
      <tr><td>Professionalism</td><td>Interview Etiquette</td><td class="score-cell">${(params.interview_etiquette !== undefined ? params.interview_etiquette : prof).toFixed(0)}%</td></tr>
    </tbody>
  </table>

  <!-- Strengths & Gaps -->
  <div class="two-col">
    <div class="box">
      <div class="box-title green">&check; Verified Strengths</div>
      <ul>
        ${strengths.length ? strengths.map(function(s){ return `<li>${s}</li>`; }).join('') : '<li>Demonstrated clear adherence to structured response guidelines.</li>'}
      </ul>
    </div>
    <div class="box">
      <div class="box-title amber">&#9888; Identified Areas for Improvement</div>
      <ul>
        ${weaknesses.length ? weaknesses.map(function(w){ return `<li>${w}</li>`; }).join('') : '<li>Continue practicing technical depth and concrete examples.</li>'}
      </ul>
    </div>
  </div>

  <!-- Questions Review -->
  ${questions.length ? `
    <div class="page-break"></div>
    <h2 class="section-title">Question-by-Question Evaluation</h2>
    ${questions.map(function(q, idx) {
      var qScore = q.score || 0;
      var qRating = qScore >= 75 ? 'Good' : qScore >= 50 ? 'Average' : 'Needs Practice';
      return `
        <div class="question-card">
          <div class="q-header">
            <span>Q${idx + 1}: ${q.question_text}</span>
            <span style="color:#4f46e5;">Score: ${qScore.toFixed(0)}% (${qRating})</span>
          </div>
          <p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;">Category: ${q.category || 'Technical'}</p>
          <div class="q-answer">
            <strong>Candidate Response:</strong><br/>
            ${q.answer_text ? q.answer_text : '<em>No response recorded.</em>'}
          </div>
        </div>
      `;
    }).join('')}
  ` : ''}

  <div class="footer">
    <span>SmartHire AI &bull; Automated Technical &amp; Behavioral Evaluation Platform</span>
    <span>Generated on ${dateStr}</span>
  </div>
</body>
</html>`;

  var printWindow = window.open('', '_blank', 'width=950,height=800');
  if (!printWindow) {
    window.alert('Please allow pop-ups to open and print the PDF report.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(function() {
    printWindow.print();
  }, 600);
}
