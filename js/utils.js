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
      <div class="topbar shrink-0 flex items-center justify-between px-6 border-b border-white/6" style="background:#09091a">
        <div class="search-input-wrap">${icon('search', 14)}<input id="inp-search" value="${state.search}" placeholder="Search..." class="search-input" /></div>
        <div class="flex items-center gap-3">
          <button class="notif-btn relative">${icon('bell')}<span class="notif-dot"></span></button>
          <div class="user-avatar-sm" style="background:${roleColor}">${avatar}</div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-6" id="main-content">${content}</div>
    </div>
  </div>`;
}

function placeholderSection(title, desc, ic) {
  return `<div class="flex flex-col items-center justify-center h-80 text-center">
    <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white/20" style="background:#141627">${ic}</div>
    <h2 class="text-xl font-semibold text-white mb-2" style="font-family:'Outfit',sans-serif">${title}</h2>
    <p class="text-white/35 text-sm max-w-sm leading-relaxed">${desc}</p>
  </div>`;
}
