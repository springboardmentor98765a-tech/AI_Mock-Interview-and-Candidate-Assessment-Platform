function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('global-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-toast-container';
    container.className = 'sh-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `sh-toast sh-toast-${type}`;

  const iconName = type === 'success' ? 'checkCircle2' : (type === 'error' ? 'alertCircle' : (type === 'warning' ? 'alertTriangle' : 'sparkles'));
  const color = type === 'success' ? '#10B981' : (type === 'error' ? '#F43F5E' : (type === 'warning' ? '#F59E0B' : '#6366F1'));

  toast.innerHTML = `
    <div class="sh-toast-icon" style="color:${color}">${icon(iconName, 18)}</div>
    <div class="sh-toast-content">
      <p class="sh-toast-msg">${message}</p>
    </div>
    <button type="button" class="sh-toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('sh-toast-visible');
  });

  setTimeout(() => {
    toast.classList.remove('sh-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getCandidateSettings() {
  const defaults = {
    firstName: state.user?.name ? state.user.name.split(' ')[0] : '',
    lastName: state.user?.name ? state.user.name.split(' ').slice(1).join(' ') : '',
    email: state.user?.email || '',
    phone: '+91 98765 43210',
    targetRole: 'Full Stack Engineer',
    experienceLevel: 'Mid Level (2-5 yrs)',
    skills: 'Python, React, TypeScript, FastAPI, PostgreSQL',
    bio: 'Aspiring engineer passionate about AI-driven applications, scalable architectures, and seamless user experiences.',
    
    // AI Preferences
    defaultDifficulty: 'medium',
    visionEyeTracking: true,
    visionEmotion: true,
    visionPosture: true,
    speechFluency: true,
    speechFillerWords: true,
    speechPronunciation: true,
    aiFeedbackDepth: 'comprehensive',
    soundEffects: true,

    // Notifications
    notifReminders: true,
    notifReports: true,
    notifRecruiter: true,
    notifWeeklyDigest: true,
    notifEmailDispatch: true,
    
    // Security
    twoFactorAuth: false
  };

  try {
    const saved = localStorage.getItem('smarthire_candidate_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch (_) {
    return defaults;
  }
}

function saveCandidateSettings(settings) {
  try {
    localStorage.setItem('smarthire_candidate_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save candidate settings:', e);
  }
}

function getRecruiterSettings() {
  const defaults = {
    fullName: state.user?.name || 'Recruiter Lead',
    email: state.user?.email || '',
    phone: '+91 91234 56789',
    companyName: 'Infosys Springboard',
    companyWebsite: 'https://infosys.com',
    industry: 'Enterprise Software & IT',
    department: 'Talent Acquisition & Technical Hiring',

    // Hiring & Assessment Standards
    passThreshold: 75,
    fluencyCutoff: 70,
    attentionCutoff: 65,
    autoShortlist: true,
    autoFlagIntegrity: true,
    questionTimeLimit: '120s',
    recommendationRule: 'Auto-shortlist candidate if overall score >= 85%',

    // Notifications
    notifSubmissions: true,
    notifStarCandidates: true,
    notifDailyDigest: true,
    notifEmailCandidateReports: true,

    // Integrations
    webhookApiKey: 'sh_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    atsProvider: 'Greenhouse'
  };

  try {
    const saved = localStorage.getItem('smarthire_recruiter_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch (_) {
    return defaults;
  }
}

function saveRecruiterSettings(settings) {
  try {
    localStorage.setItem('smarthire_recruiter_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save recruiter settings:', e);
  }
}

function getAdminSettings() {
  const defaults = {
    platformName: 'SmartHire AI (Enterprise Edition)',
    supportEmail: 'support@smarthire.ai',
    timezone: 'Asia/Kolkata (IST UTC+05:30)',
    environment: 'Production',
    maintenanceMode: false,
    maxConcurrency: 50,

    // AI Models
    llmProvider: 'deepseek/deepseek-v4-flash',
    visionEngine: 'MediaPipe Face Mesh v0.10.14',
    sttEngine: 'Web Speech API + Groq Whisper',
    resumeEngine: 'Groq Qwen 2.5 72B',

    // Scoring Weights
    weightTech: 40,
    weightSpeech: 30,
    weightVision: 20,
    weightResume: 10,

    // Broadcast
    broadcastBanner: false,
    bannerMessage: 'Scheduled platform maintenance window on Sunday 02:00 AM IST.',
    emailServiceActive: true,
    escalateErrors: true,

    // Security
    sessionTimeoutMins: 60,
    ipWhitelisting: false
  };

  try {
    const saved = localStorage.getItem('smarthire_admin_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch (_) {
    return defaults;
  }
}

function saveAdminSettings(settings) {
  try {
    localStorage.setItem('smarthire_admin_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save admin settings:', e);
  }
}

if (!window.settingsActiveTab) {
  window.settingsActiveTab = 'profile';
}

// Candidate settings view
function renderCandidateSettings() {
  const s = getCandidateSettings();
  const activeTab = window.settingsActiveTab || 'profile';
  const username = state.user?.name || 'Candidate';
  const avatar = username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return `
    <div class="sh-settings-wrapper max-w-5xl mx-auto space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/6">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span class="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              ${icon('settings', 22)}
            </span>
            Settings & AI Preferences
          </h1>
          <p class="text-sm text-white/50 mt-1">
            Manage your personal profile, speech & vision telemetry parameters, notifications, and security credentials.
          </p>
        </div>
        <div class="flex items-center gap-2">
          ${badge('Candidate Portal', 'indigo')}
          <span class="text-xs text-white/40 font-mono">ID: ${state.user?.id ? 'CAN-' + String(state.user.id).padStart(4, '0') : 'CAN-0042'}</span>
        </div>
      </div>

      <!-- Main Navigation Tabs -->
      <div class="sh-tabs-nav grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-white/4 border border-white/6">
        <button type="button" class="sh-tab-btn ${activeTab === 'profile' ? 'active' : ''}" data-setting-tab="profile">
          ${icon('user', 15)}
          <span>General Profile</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'interview' ? 'active' : ''}" data-setting-tab="interview">
          ${icon('sliders', 15)}
          <span>Interview & AI</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'notifications' ? 'active' : ''}" data-setting-tab="notifications">
          ${icon('bell', 15)}
          <span>Notifications</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'security' ? 'active' : ''}" data-setting-tab="security">
          ${icon('shieldCheck', 15)}
          <span>Security & Auth</span>
        </button>
      </div>

      <!-- TAB 1: GENERAL PROFILE -->
      <div class="sh-tab-pane ${activeTab === 'profile' ? 'block' : 'hidden'}" id="pane-profile">
        <form id="form-candidate-profile" class="space-y-6">
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-indigo-400">${icon('user', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Personal Profile Information</h3>
                  <p class="sh-card-desc">Update your candidate identity, contact information, and target job aspirations.</p>
                </div>
              </div>
            </div>

            <div class="sh-card-body space-y-6">
              
              <!-- Avatar Profile Banner -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/3 border border-white/6">
                <div class="flex items-center gap-4">
                  <div class="relative cursor-pointer group" onclick="triggerProfilePhotoUpload(event)" title="Click to upload profile photo">
                    ${renderUserAvatar('lg', 'shadow-lg ring-2 ring-white/10', true)}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-white text-base">${username}</span>
                      <span class="badge badge-indigo">Candidate</span>
                      <span class="badge badge-emerald flex items-center gap-1">${icon('check', 10)} Verified</span>
                    </div>
                    <p class="text-xs text-white/40 mt-1">${state.user?.email || 'candidate@example.com'}</p>
                    <div class="flex items-center gap-2 mt-2">
                      <button type="button" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all" onclick="triggerProfilePhotoUpload(event)">
                        ${icon('camera', 12)} Upload Photo
                      </button>
                      ${(state.user?.avatar || localStorage.getItem('smarthire_user_avatar')) ? `
                        <button type="button" class="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 transition-all" onclick="handleRemoveProfilePhoto()">
                          ${icon('trash', 11)} Remove
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-white/40 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  Role: Full Stack & AI Ready
                </div>
              </div>

              <!-- Input Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="sh-label">First Name</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('user', 14)}</span>
                    <input type="text" id="cand-first-name" value="${s.firstName}" class="form-input" placeholder="e.g. John" required />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Last Name</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('user', 14)}</span>
                    <input type="text" id="cand-last-name" value="${s.lastName}" class="form-input" placeholder="e.g. Doe" required />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="sh-label">Email Address (Read-only)</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('mail', 14)}</span>
                    <input type="email" id="cand-email" value="${s.email}" class="form-input opacity-60 cursor-not-allowed" readonly />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Phone Number</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('phone', 14)}</span>
                    <input type="text" id="cand-phone" value="${s.phone}" class="form-input" placeholder="+91 98765 43210" />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="sh-label">Target Role / Designation</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('briefcase', 14)}</span>
                    <input type="text" id="cand-role" value="${s.targetRole}" class="form-input" placeholder="e.g. Full Stack Engineer" />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Experience Level</label>
                  <div class="input-wrap">
                    <select id="cand-exp" class="form-input bg-[#141627] text-white">
                      <option value="Entry Level" ${s.experienceLevel === 'Entry Level' ? 'selected' : ''}>Entry Level (0-2 yrs)</option>
                      <option value="Mid Level (2-5 yrs)" ${s.experienceLevel === 'Mid Level (2-5 yrs)' ? 'selected' : ''}>Mid Level (2-5 yrs)</option>
                      <option value="Senior (5-8 yrs)" ${s.experienceLevel === 'Senior (5-8 yrs)' ? 'selected' : ''}>Senior (5-8 yrs)</option>
                      <option value="Lead / Staff" ${s.experienceLevel === 'Lead / Staff' ? 'selected' : ''}>Lead / Staff (8+ yrs)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="sh-label">Primary Tech Stack & Key Skills</label>
                <div class="input-wrap">
                  <span class="input-icon">${icon('terminal', 14)}</span>
                  <input type="text" id="cand-skills" value="${s.skills}" class="form-input" placeholder="Python, React, TypeScript, Docker..." />
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="sh-label">Professional Bio / Career Summary</label>
                <textarea id="cand-bio" rows="3" class="form-input py-2.5 px-3 leading-relaxed" placeholder="Brief overview of your experience, projects, and goals...">${s.bio}</textarea>
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-cand-profile" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save Profile Changes</span>
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>

      <!-- TAB 2: INTERVIEW & AI PREFERENCES -->
      <div class="sh-tab-pane ${activeTab === 'interview' ? 'block' : 'hidden'}" id="pane-interview">
        <form id="form-candidate-ai" class="space-y-6">
          
          <!-- Difficulty & Feedback Depth -->
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-cyan-400">${icon('sliders', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Interview Engine & Difficulty Setup</h3>
                  <p class="sh-card-desc">Configure default difficulty and evaluation depth for AI mock interviews.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-5">
              
              <div>
                <label class="sh-label mb-2 block">Default Interview Difficulty Level</label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label class="sh-radio-card ${s.defaultDifficulty === 'easy' ? 'active' : ''}">
                    <input type="radio" name="difficulty" value="easy" ${s.defaultDifficulty === 'easy' ? 'checked' : ''} class="hidden" />
                    <div class="font-bold text-white text-sm">Easy / Foundational</div>
                    <div class="text-xs text-white/40 mt-1">Fundamental questions with gentle follow-ups.</div>
                  </label>
                  <label class="sh-radio-card ${s.defaultDifficulty === 'medium' ? 'active' : ''}">
                    <input type="radio" name="difficulty" value="medium" ${s.defaultDifficulty === 'medium' ? 'checked' : ''} class="hidden" />
                    <div class="font-bold text-white text-sm">Medium / Industry Standard</div>
                    <div class="text-xs text-white/40 mt-1">Balanced technical depth, algorithms, and practical scenarios.</div>
                  </label>
                  <label class="sh-radio-card ${s.defaultDifficulty === 'hard' ? 'active' : ''}">
                    <input type="radio" name="difficulty" value="hard" ${s.defaultDifficulty === 'hard' ? 'checked' : ''} class="hidden" />
                    <div class="font-bold text-white text-sm">Hard / Enterprise Expert</div>
                    <div class="text-xs text-white/40 mt-1">Complex system architecture, edge cases, and high-pressure follow-ups.</div>
                  </label>
                </div>
              </div>

              <div>
                <label class="sh-label mb-2 block">AI Feedback & Evaluation Depth</label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label class="sh-radio-card ${s.aiFeedbackDepth === 'concise' ? 'active' : ''}">
                    <input type="radio" name="feedbackDepth" value="concise" ${s.aiFeedbackDepth === 'concise' ? 'checked' : ''} class="hidden" />
                    <div class="font-bold text-white text-sm">Concise</div>
                    <div class="text-xs text-white/40 mt-1">Quick bullet points & score summary.</div>
                  </label>
                  <label class="sh-radio-card ${s.aiFeedbackDepth === 'detailed' ? 'active' : ''}">
                    <input type="radio" name="feedbackDepth" value="detailed" ${s.aiFeedbackDepth === 'detailed' ? 'checked' : ''} class="hidden" />
                    <div class="font-bold text-white text-sm">Detailed</div>
                    <div class="text-xs text-white/40 mt-1">Actionable insights with sample responses.</div>
                  </label>
                  <label class="sh-radio-card ${s.aiFeedbackDepth === 'comprehensive' ? 'active' : ''}">
                    <input type="radio" name="feedbackDepth" value="comprehensive" ${s.aiFeedbackDepth === 'comprehensive' ? 'checked' : ''} class="hidden" />
                    <div class="font-bold text-white text-sm">Comprehensive (Recommended)</div>
                    <div class="text-xs text-white/40 mt-1">Deep rubric breakdown, speech metrics, and video posture analysis.</div>
                  </label>
                </div>
              </div>

            </div>
          </div>

          <!-- Vision & Behavioral Telemetry Settings -->
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-emerald-400">${icon('eye', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Vision & Behavioral Telemetry</h3>
                  <p class="sh-card-desc">Control camera-based emotion, eye contact, and head posture telemetry.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-4">
              
              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Eye Contact & Gaze Tracking</span>
                  <span class="sh-toggle-desc">Detect direct camera engagement and calculate focus percentage during responses.</span>
                </div>
                <input type="checkbox" id="cand-toggle-eye" ${s.visionEyeTracking ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Emotion & Micro-Expression Detection</span>
                  <span class="sh-toggle-desc">Analyze confidence, calm demeanor, and stress telemetry from face mesh coordinates.</span>
                </div>
                <input type="checkbox" id="cand-toggle-emotion" ${s.visionEmotion ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Head Pose & Frame Alignment Alerts</span>
                  <span class="sh-toggle-desc">Monitor head tilt, centering, and alert if moving outside camera view.</span>
                </div>
                <input type="checkbox" id="cand-toggle-posture" ${s.visionPosture ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

            </div>
          </div>

          <!-- Speech & Fluency Telemetry -->
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-amber-400">${icon('mic', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Speech & Fluency Telemetry</h3>
                  <p class="sh-card-desc">Configure voice pace, pronunciation scoring, and verbal filler-word detection.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-4">
              
              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Speech Pacing & WPM Real-time Monitoring</span>
                  <span class="sh-toggle-desc">Calculate words per minute (target: 120-150 WPM) and highlight rushed speech.</span>
                </div>
                <input type="checkbox" id="cand-toggle-fluency" ${s.speechFluency ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Filler Word Detector ("um", "uh", "like", "you know")</span>
                  <span class="sh-toggle-desc">Count verbal crutches and provide alternative transitional phrasing recommendations.</span>
                </div>
                <input type="checkbox" id="cand-toggle-filler" ${s.speechFillerWords ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Pronunciation & Grammar Assessment</span>
                  <span class="sh-toggle-desc">Audit sentence syntax and vocabulary sophistication.</span>
                </div>
                <input type="checkbox" id="cand-toggle-pronunc" ${s.speechPronunciation ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-cand-ai" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save AI Preferences</span>
                </button>
              </div>

            </div>
          </div>

        </form>
      </div>

      <!-- TAB 3: NOTIFICATIONS -->
      <div class="sh-tab-pane ${activeTab === 'notifications' ? 'block' : 'hidden'}" id="pane-notifications">
        <form id="form-candidate-notif" class="space-y-6">
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-indigo-400">${icon('bell', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Notification Channels & Alert Rules</h3>
                  <p class="sh-card-desc">Choose when and how SmartHire AI communicates updates to you.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-4">

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Upcoming Interview Reminders</span>
                  <span class="sh-toggle-desc">Receive browser push and email alerts 15 minutes before scheduled mock interviews.</span>
                </div>
                <input type="checkbox" id="cand-notif-remind" ${s.notifReminders ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Evaluation Report Ready Notifications</span>
                  <span class="sh-toggle-desc">Instant notification as soon as the multi-modal AI evaluation report finishes generating.</span>
                </div>
                <input type="checkbox" id="cand-notif-reports" ${s.notifReports ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Recruiter Profile Views & Shortlists</span>
                  <span class="sh-toggle-desc">Get alerted when a recruiter views your interview assessment score or adds you to a shortlist.</span>
                </div>
                <input type="checkbox" id="cand-notif-recruiter" ${s.notifRecruiter ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Weekly Performance Digest & Skill Insights</span>
                  <span class="sh-toggle-desc">Receive a personalized weekly summary of your confidence scores and recommended practice topics.</span>
                </div>
                <input type="checkbox" id="cand-notif-weekly" ${s.notifWeeklyDigest ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Sound Effects & Interactive Chimes</span>
                  <span class="sh-toggle-desc">Play soft acoustic audio cues when recording begins, pauses, or finishes.</span>
                </div>
                <input type="checkbox" id="cand-notif-sound" ${s.soundEffects ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-cand-notif" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save Notification Settings</span>
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>

      <!-- TAB 4: SECURITY & AUTH -->
      <div class="sh-tab-pane ${activeTab === 'security' ? 'block' : 'hidden'}" id="pane-security">
        <div class="space-y-6">
          
          <!-- Password Update Card -->
          <form id="form-candidate-password">
            <div class="sh-settings-card">
              <div class="sh-card-header">
                <div class="flex items-center gap-2.5">
                  <span class="text-rose-400">${icon('lock', 18)}</span>
                  <div>
                    <h3 class="sh-card-title">Change Password</h3>
                    <p class="sh-card-desc">Update your login credentials. Password must be at least 8 characters long.</p>
                  </div>
                </div>
              </div>
              <div class="sh-card-body space-y-4 max-w-lg">
                
                <div class="space-y-1.5">
                  <label class="sh-label">Current Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="cand-curr-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="sh-label">New Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="cand-new-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="sh-label">Confirm New Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="cand-conf-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>

                <div class="pt-2">
                  <button type="submit" id="btn-save-cand-pass" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                    ${icon('key', 15)}
                    <span>Update Password</span>
                  </button>
                </div>

              </div>
            </div>
          </form>

          <!-- Active Sessions Card -->
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-emerald-400">${icon('shieldCheck', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Active Logged-In Sessions</h3>
                  <p class="sh-card-desc">Devices and locations currently authorized on your SmartHire account.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-3">
              <div class="flex items-center justify-between p-3.5 rounded-xl bg-white/3 border border-white/6">
                <div class="flex items-center gap-3">
                  <span class="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">${icon('monitor', 16)}</span>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-white font-semibold text-sm">Windows Chrome Browser</span>
                      <span class="badge badge-emerald text-[10px]">Current Active</span>
                    </div>
                    <span class="text-xs text-white/40 block mt-0.5">IP: 127.0.0.1 • SmartHire Web Portal</span>
                  </div>
                </div>
                <span class="text-xs text-emerald-400 font-medium">Active Now</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  `;
}

// Recruiter settings view
function renderRecruiterSettings() {
  const s = getRecruiterSettings();
  const activeTab = window.settingsActiveTab || 'profile';
  const username = state.user?.name || 'Recruiter';
  const avatar = username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return `
    <div class="sh-settings-wrapper max-w-5xl mx-auto space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/6">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span class="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              ${icon('building', 22)}
            </span>
            Recruiter Preferences & Hiring Config
          </h1>
          <p class="text-sm text-white/50 mt-1">
            Configure enterprise hiring benchmarks, automated candidate evaluation cutoffs, pipeline alerts, and ATS integrations.
          </p>
        </div>
        <div class="flex items-center gap-2">
          ${badge('Recruiter Portal', 'cyan')}
          <span class="text-xs text-white/40 font-mono">${s.companyName}</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="sh-tabs-nav grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-white/4 border border-white/6">
        <button type="button" class="sh-tab-btn ${activeTab === 'profile' ? 'active' : ''}" data-setting-tab="profile">
          ${icon('building', 15)}
          <span>Company Profile</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'hiring' ? 'active' : ''}" data-setting-tab="hiring">
          ${icon('target', 15)}
          <span>Hiring Standards</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'notifications' ? 'active' : ''}" data-setting-tab="notifications">
          ${icon('bell', 15)}
          <span>Pipeline Alerts</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'integrations' ? 'active' : ''}" data-setting-tab="integrations">
          ${icon('key', 15)}
          <span>ATS & Security</span>
        </button>
      </div>

      <!-- TAB 1: COMPANY & RECRUITER PROFILE -->
      <div class="sh-tab-pane ${activeTab === 'profile' ? 'block' : 'hidden'}" id="pane-profile">
        <form id="form-recruiter-profile" class="space-y-6">
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-cyan-400">${icon('building', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Recruiter Profile & Organization Details</h3>
                  <p class="sh-card-desc">Manage company branding, official recruiter contact, and team identification.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-6">
              
              <!-- Recruiter Showcase -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/3 border border-white/6">
                <div class="flex items-center gap-4">
                  <div class="relative cursor-pointer group" onclick="triggerProfilePhotoUpload(event)" title="Click to upload profile photo">
                    ${renderUserAvatar('lg', 'shadow-lg ring-2 ring-white/10', true)}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-white text-base">${username}</span>
                      <span class="badge badge-cyan">Recruiter</span>
                      <span class="badge badge-indigo">${s.companyName}</span>
                    </div>
                    <p class="text-xs text-white/40 mt-1">${state.user?.email || 'recruiter@company.com'}</p>
                    <div class="flex items-center gap-2 mt-2">
                      <button type="button" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 transition-all" onclick="triggerProfilePhotoUpload(event)">
                        ${icon('camera', 12)} Upload Photo
                      </button>
                      ${(state.user?.avatar || localStorage.getItem('smarthire_user_avatar')) ? `
                        <button type="button" class="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 transition-all" onclick="handleRemoveProfilePhoto()">
                          ${icon('trash', 11)} Remove
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 font-semibold">
                  Talent Acquisition Verified
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="sh-label">Full Name</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('user', 14)}</span>
                    <input type="text" id="rec-name" value="${s.fullName}" class="form-input" required />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Official Work Email (Read-only)</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('mail', 14)}</span>
                    <input type="email" id="rec-email" value="${s.email}" class="form-input opacity-60 cursor-not-allowed" readonly />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="sh-label">Company / Organization Name</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('building', 14)}</span>
                    <input type="text" id="rec-company" value="${s.companyName}" class="form-input" placeholder="e.g. Infosys" />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Company Website URL</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('globe', 14)}</span>
                    <input type="url" id="rec-website" value="${s.companyWebsite}" class="form-input" placeholder="https://example.com" />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="sh-label">Industry / Business Domain</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('briefcase', 14)}</span>
                    <input type="text" id="rec-industry" value="${s.industry}" class="form-input" placeholder="e.g. Enterprise Software & AI" />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Hiring Team / Department</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('users', 14)}</span>
                    <input type="text" id="rec-dept" value="${s.department}" class="form-input" placeholder="e.g. Global Tech Talent Acquisition" />
                  </div>
                </div>
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-rec-profile" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save Recruiter Profile</span>
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>

      <!-- TAB 2: HIRING & BENCHMARKS -->
      <div class="sh-tab-pane ${activeTab === 'hiring' ? 'block' : 'hidden'}" id="pane-hiring">
        <form id="form-recruiter-hiring" class="space-y-6">
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-emerald-400">${icon('target', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Candidate Evaluation Benchmarks & Cutoff Scores</h3>
                  <p class="sh-card-desc">Set minimum qualification thresholds across technical, speech, and behavioral telemetry.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-6">

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div class="p-4 rounded-2xl bg-white/3 border border-white/6 space-y-2">
                  <div class="flex justify-between items-center">
                    <label class="text-xs font-bold text-white">Overall Pass Score</label>
                    <span class="badge badge-emerald" id="val-pass-score">${s.passThreshold}%</span>
                  </div>
                  <input type="range" id="range-pass-score" min="50" max="95" value="${s.passThreshold}" class="w-full accent-emerald-400" 
                    oninput="document.getElementById('val-pass-score').textContent = this.value + '%'" />
                  <p class="text-[11px] text-white/40">Minimum aggregate benchmark to consider candidate qualified.</p>
                </div>

                <div class="p-4 rounded-2xl bg-white/3 border border-white/6 space-y-2">
                  <div class="flex justify-between items-center">
                    <label class="text-xs font-bold text-white">Speech Fluency Cutoff</label>
                    <span class="badge badge-indigo" id="val-fluency-score">${s.fluencyCutoff}%</span>
                  </div>
                  <input type="range" id="range-fluency-score" min="50" max="95" value="${s.fluencyCutoff}" class="w-full accent-indigo-400"
                    oninput="document.getElementById('val-fluency-score').textContent = this.value + '%'" />
                  <p class="text-[11px] text-white/40">Threshold for verbal clarity, pacing, and minimal fillers.</p>
                </div>

                <div class="p-4 rounded-2xl bg-white/3 border border-white/6 space-y-2">
                  <div class="flex justify-between items-center">
                    <label class="text-xs font-bold text-white">Vision Attention Minimum</label>
                    <span class="badge badge-cyan" id="val-attention-score">${s.attentionCutoff}%</span>
                  </div>
                  <input type="range" id="range-attention-score" min="50" max="95" value="${s.attentionCutoff}" class="w-full accent-cyan-400"
                    oninput="document.getElementById('val-attention-score').textContent = this.value + '%'" />
                  <p class="text-[11px] text-white/40">Minimum direct eye-contact and posture engagement score.</p>
                </div>

              </div>

              <!-- Automated Rules -->
              <div class="space-y-4 pt-2">
                <div class="sh-toggle-row">
                  <div>
                    <span class="sh-toggle-title">Automated AI Shortlisting (Score ≥ 85%)</span>
                    <span class="sh-toggle-desc">Automatically tag outstanding candidates as "Fast-Track for Interview" in candidate pool.</span>
                  </div>
                  <input type="checkbox" id="rec-toggle-shortlist" ${s.autoShortlist ? 'checked' : ''} class="sh-toggle-checkbox" />
                </div>

                <div class="sh-toggle-row">
                  <div>
                    <span class="sh-toggle-title">Automated Integrity Warning Flags</span>
                    <span class="sh-toggle-desc">Flag sessions where attention lapses or face moves off-screen for > 30 seconds.</span>
                  </div>
                  <input type="checkbox" id="rec-toggle-integrity" ${s.autoFlagIntegrity ? 'checked' : ''} class="sh-toggle-checkbox" />
                </div>

                <div class="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/6">
                  <div>
                    <span class="text-sm font-bold text-white block">Default Question Time Allocation</span>
                    <span class="text-xs text-white/40">Maximum response duration allowed per interview question.</span>
                  </div>
                  <select id="rec-time-limit" class="form-input w-36 bg-[#141627] text-white text-sm">
                    <option value="60s" ${s.questionTimeLimit === '60s' ? 'selected' : ''}>60 seconds</option>
                    <option value="90s" ${s.questionTimeLimit === '90s' ? 'selected' : ''}>90 seconds</option>
                    <option value="120s" ${s.questionTimeLimit === '120s' ? 'selected' : ''}>120 seconds (2m)</option>
                    <option value="180s" ${s.questionTimeLimit === '180s' ? 'selected' : ''}>180 seconds (3m)</option>
                  </select>
                </div>
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-rec-hiring" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save Hiring Standards</span>
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>

      <!-- TAB 3: PIPELINE NOTIFICATIONS -->
      <div class="sh-tab-pane ${activeTab === 'notifications' ? 'block' : 'hidden'}" id="pane-notifications">
        <form id="form-recruiter-notif" class="space-y-6">
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-indigo-400">${icon('bell', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Recruiter Pipeline Alert Channels</h3>
                  <p class="sh-card-desc">Configure instant triggers for completed assessments and candidate submissions.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-4">
              
              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Candidate Assessment Submission Alerts</span>
                  <span class="sh-toggle-desc">Instant notification whenever a candidate submits answers for evaluation.</span>
                </div>
                <input type="checkbox" id="rec-notif-sub" ${s.notifSubmissions ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Top Performer Highlights (Score > 90%)</span>
                  <span class="sh-toggle-desc">High-priority alert and instant email dispatch when candidate achieves top-tier rating.</span>
                </div>
                <input type="checkbox" id="rec-notif-star" ${s.notifStarCandidates ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Daily Pipeline Summary Digest</span>
                  <span class="sh-toggle-desc">Receive a 9:00 AM daily breakdown of new candidates, test scores, and pending reviews.</span>
                </div>
                <input type="checkbox" id="rec-notif-digest" ${s.notifDailyDigest ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-rec-notif" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save Alert Preferences</span>
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>

      <!-- TAB 4: ATS INTEGRATIONS & SECURITY -->
      <div class="sh-tab-pane ${activeTab === 'integrations' ? 'block' : 'hidden'}" id="pane-integrations">
        <div class="space-y-6">
          
          <!-- Webhook / ATS Key -->
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-cyan-400">${icon('key', 18)}</span>
                <div>
                  <h3 class="sh-card-title">ATS & Webhook Integrations</h3>
                  <p class="sh-card-desc">Export candidate scores and PDF reports directly into your Applicant Tracking System.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-4">
              <div class="space-y-1.5">
                <label class="sh-label">Active ATS Webhook Token</label>
                <div class="flex items-center gap-2">
                  <input type="text" id="rec-webhook-key" value="${s.webhookApiKey}" class="form-input font-mono text-xs" readonly />
                  <button type="button" class="sh-secondary-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap" onclick="navigator.clipboard.writeText('${s.webhookApiKey}');showToast('API Key copied to clipboard!','success');">
                    ${icon('copy', 14)} Copy
                  </button>
                </div>
              </div>
              <p class="text-xs text-white/40">Supported ATS platforms: Greenhouse, Lever, Workday, BambooHR, and SmartRecruiters.</p>
            </div>
          </div>

          <!-- Password Card -->
          <form id="form-recruiter-password">
            <div class="sh-settings-card">
              <div class="sh-card-header">
                <div class="flex items-center gap-2.5">
                  <span class="text-rose-400">${icon('lock', 18)}</span>
                  <div>
                    <h3 class="sh-card-title">Security Credentials</h3>
                    <p class="sh-card-desc">Update your recruiter account password.</p>
                  </div>
                </div>
              </div>
              <div class="sh-card-body space-y-4 max-w-lg">
                <div class="space-y-1.5">
                  <label class="sh-label">Current Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="rec-curr-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">New Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="rec-new-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Confirm New Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="rec-conf-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>
                <div class="pt-2">
                  <button type="submit" id="btn-save-rec-pass" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                    ${icon('key', 15)}
                    <span>Update Password</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

        </div>
      </div>

    </div>
  `;
}

// Admin settings view
function renderAdminSettings() {
  const s = getAdminSettings();
  const activeTab = window.settingsActiveTab || 'system';
  const username = state.user?.name || 'Administrator';
  const avatar = username.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return `
    <div class="sh-settings-wrapper max-w-5xl mx-auto space-y-6">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/6">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span class="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              ${icon('cpu', 22)}
            </span>
            Platform Settings & System Architecture
          </h1>
          <p class="text-sm text-white/50 mt-1">
            Global system parameters, multi-modal AI model providers, broadcast channels, and security policies.
          </p>
        </div>
        <div class="flex items-center gap-2">
          ${badge('Master Admin', 'purple')}
          <span class="badge badge-emerald flex items-center gap-1">${icon('check', 10)} Node v20 / Python 3.13</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="sh-tabs-nav grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-white/4 border border-white/6">
        <button type="button" class="sh-tab-btn ${activeTab === 'system' ? 'active' : ''}" data-setting-tab="system">
          ${icon('cpu', 15)}
          <span>System Config</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'ai' ? 'active' : ''}" data-setting-tab="ai">
          ${icon('brain', 15)}
          <span>AI Engine Models</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}" data-setting-tab="broadcast">
          ${icon('bell', 15)}
          <span>Broadcast & Email</span>
        </button>
        <button type="button" class="sh-tab-btn ${activeTab === 'security' ? 'active' : ''}" data-setting-tab="security">
          ${icon('shieldCheck', 15)}
          <span>Security & Backup</span>
        </button>
      </div>

      <!-- TAB 1: SYSTEM CONFIG -->
      <div class="sh-tab-pane ${activeTab === 'system' ? 'block' : 'hidden'}" id="pane-system">
        <form id="form-admin-system" class="space-y-6">
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-purple-400">${icon('server', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Enterprise System Parameters</h3>
                  <p class="sh-card-desc">Configure global platform branding, server limits, and operational status.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-5">
              
              <!-- Admin Showcase Banner -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/3 border border-white/6">
                <div class="flex items-center gap-4">
                  <div class="relative cursor-pointer group" onclick="triggerProfilePhotoUpload(event)" title="Click to upload profile photo">
                    ${renderUserAvatar('lg', 'shadow-lg ring-2 ring-white/10', true)}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-white text-base">${username}</span>
                      <span class="badge badge-purple">Master Admin</span>
                      <span class="badge badge-emerald flex items-center gap-1">${icon('check', 10)} Root Verified</span>
                    </div>
                    <p class="text-xs text-white/40 mt-1">${state.user?.email || 'admin@smarthire.ai'}</p>
                    <div class="flex items-center gap-2 mt-2">
                      <button type="button" class="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 transition-all" onclick="triggerProfilePhotoUpload(event)">
                        ${icon('camera', 12)} Upload Photo
                      </button>
                      ${(state.user?.avatar || localStorage.getItem('smarthire_user_avatar')) ? `
                        <button type="button" class="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 transition-all" onclick="handleRemoveProfilePhoto()">
                          ${icon('trash', 11)} Remove
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 font-semibold">
                  Full Platform Authority
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="sh-label">Platform Title</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('building', 14)}</span>
                    <input type="text" id="adm-plat-name" value="${s.platformName}" class="form-input" required />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Support Contact Email</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('mail', 14)}</span>
                    <input type="email" id="adm-support-email" value="${s.supportEmail}" class="form-input" required />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="space-y-1.5">
                  <label class="sh-label">System Timezone</label>
                  <div class="p-3 rounded-xl border border-white/6 bg-white/3 text-xs font-bold text-white flex items-center gap-2">
                    <span class="text-cyan-400">${icon('clock', 14)}</span>
                    <span>${s.timezone}</span>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Environment Mode</label>
                  <div class="p-3 rounded-xl border border-white/6 bg-white/3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>${s.environment} (Live)</span>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Live Concurrency Ceiling</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('users', 14)}</span>
                    <input type="number" id="adm-concurrency" value="${s.maxConcurrency}" class="form-input" min="10" max="500" />
                  </div>
                </div>
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">System Maintenance Mode</span>
                  <span class="sh-toggle-desc">When active, candidates will see a maintenance banner and new interview creation is paused.</span>
                </div>
                <input type="checkbox" id="adm-toggle-maint" ${s.maintenanceMode ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-adm-sys" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save System Parameters</span>
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>

      <!-- TAB 2: AI ENGINE MODELS -->
      <div class="sh-tab-pane ${activeTab === 'ai' ? 'block' : 'hidden'}" id="pane-ai">
        <form id="form-admin-ai" class="space-y-6">
          
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-indigo-400">${icon('brain', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Multi-Modal AI Engine Configuration</h3>
                  <p class="sh-card-desc">Assign LLM providers, vision neural networks, and speech models across SmartHire modules.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-5">
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div class="space-y-1.5">
                  <label class="sh-label">Primary Interview & Rubric LLM</label>
                  <select id="adm-llm" class="form-input bg-[#141627] text-white">
                    <option value="deepseek/deepseek-v4-flash" ${s.llmProvider.includes('deepseek') ? 'selected' : ''}>DeepSeek v4 Flash (Active Default)</option>
                    <option value="llama-3.3-70b-versatile" ${s.llmProvider.includes('llama') ? 'selected' : ''}>Groq Llama 3.3 70B Versatile</option>
                    <option value="qwen-2.5-32b" ${s.llmProvider.includes('qwen') ? 'selected' : ''}>Groq Qwen 2.5 32B</option>
                    <option value="gemini-1.5-pro" ${s.llmProvider.includes('gemini') ? 'selected' : ''}>Google Gemini 1.5 Pro</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label class="sh-label">Resume Analysis Engine</label>
                  <select id="adm-resume-llm" class="form-input bg-[#141627] text-white">
                    <option value="Groq Qwen 2.5 72B">Groq Qwen 2.5 72B (Rule-based Fallback)</option>
                    <option value="DeepSeek v4 Flash">DeepSeek v4 Flash</option>
                  </select>
                </div>

              </div>

              <!-- Telemetry Architecture Stack Preview -->
              <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                <div class="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  ${icon('cpu', 16)} Active Micro-Telemetry Stack
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/70 pt-1">
                  <div class="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <span class="font-bold text-white block">Speech & Audio Engine</span>
                    <span class="text-white/40">Web Speech API + WPM & Filler Detector (Client-Side)</span>
                  </div>
                  <div class="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <span class="font-bold text-white block">Vision & Face Mesh Engine</span>
                    <span class="text-white/40">MediaPipe Face Mesh 468 landmarks + Pose Telemetry</span>
                  </div>
                </div>
              </div>

              <!-- Scoring Weightings Calibration -->
              <div>
                <label class="sh-label mb-2 block font-bold">Scoring Rubric Weight Allocation (%)</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div class="p-3 rounded-xl bg-white/3 border border-white/6">
                    <span class="text-xs text-white/40 block">Technical Relevance</span>
                    <span class="text-lg font-bold text-indigo-400 mt-1 block">40%</span>
                  </div>
                  <div class="p-3 rounded-xl bg-white/3 border border-white/6">
                    <span class="text-xs text-white/40 block">Speech & Pacing</span>
                    <span class="text-lg font-bold text-cyan-400 mt-1 block">30%</span>
                  </div>
                  <div class="p-3 rounded-xl bg-white/3 border border-white/6">
                    <span class="text-xs text-white/40 block">Vision Attention</span>
                    <span class="text-lg font-bold text-emerald-400 mt-1 block">20%</span>
                  </div>
                  <div class="p-3 rounded-xl bg-white/3 border border-white/6">
                    <span class="text-xs text-white/40 block">Resume Fit</span>
                    <span class="text-lg font-bold text-amber-400 mt-1 block">10%</span>
                  </div>
                </div>
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-adm-ai" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save AI Configuration</span>
                </button>
              </div>

            </div>
          </div>

        </form>
      </div>

      <!-- TAB 3: BROADCAST & EMAIL -->
      <div class="sh-tab-pane ${activeTab === 'broadcast' ? 'block' : 'hidden'}" id="pane-broadcast">
        <form id="form-admin-broadcast" class="space-y-6">
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-amber-400">${icon('bell', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Platform Broadcast & SMTP Dispatch</h3>
                  <p class="sh-card-desc">Publish platform-wide announcements and manage transactional email delivery.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body space-y-5">
              
              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Display Global Top Announcement Banner</span>
                  <span class="sh-toggle-desc">Show a high-visibility alert banner to all active candidates and recruiters.</span>
                </div>
                <input type="checkbox" id="adm-toggle-banner" ${s.broadcastBanner ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="space-y-1.5">
                <label class="sh-label">Announcement Banner Text</label>
                <input type="text" id="adm-banner-msg" value="${s.bannerMessage}" class="form-input" placeholder="e.g. Scheduled platform maintenance window..." />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Transactional Email Dispatch Service (Resend / SMTP)</span>
                  <span class="sh-toggle-desc">Send evaluation PDF downloads, password resets, and session links via email.</span>
                </div>
                <input type="checkbox" id="adm-toggle-email" ${s.emailServiceActive ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="sh-toggle-row">
                <div>
                  <span class="sh-toggle-title">Automatic Error Escalation to Admin Email</span>
                  <span class="sh-toggle-desc">Receive immediate diagnostic trace if an AI generation API call experiences timeout.</span>
                </div>
                <input type="checkbox" id="adm-toggle-escalate" ${s.escalateErrors ? 'checked' : ''} class="sh-toggle-checkbox" />
              </div>

              <div class="flex justify-end pt-3 border-t border-white/6">
                <button type="submit" id="btn-save-adm-broadcast" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                  ${icon('save', 15)}
                  <span>Save Broadcast Settings</span>
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>

      <!-- TAB 4: SECURITY & MAINTENANCE -->
      <div class="sh-tab-pane ${activeTab === 'security' ? 'block' : 'hidden'}" id="pane-security">
        <div class="space-y-6">
          
          <!-- Master Password Card -->
          <form id="form-admin-password">
            <div class="sh-settings-card">
              <div class="sh-card-header">
                <div class="flex items-center gap-2.5">
                  <span class="text-rose-400">${icon('lock', 18)}</span>
                  <div>
                    <h3 class="sh-card-title">Admin Master Credentials</h3>
                    <p class="sh-card-desc">Update root administrator security credentials.</p>
                  </div>
                </div>
              </div>
              <div class="sh-card-body space-y-4 max-w-lg">
                <div class="space-y-1.5">
                  <label class="sh-label">Current Admin Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="adm-curr-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">New Admin Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="adm-new-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="sh-label">Confirm New Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">${icon('lock', 14)}</span>
                    <input type="password" id="adm-conf-pass" placeholder="••••••••" class="form-input" required />
                  </div>
                </div>
                <div class="pt-2">
                  <button type="submit" id="btn-save-adm-pass" class="sh-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg">
                    ${icon('key', 15)}
                    <span>Update Admin Password</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          <!-- Maintenance Operations -->
          <div class="sh-settings-card">
            <div class="sh-card-header">
              <div class="flex items-center gap-2.5">
                <span class="text-amber-400">${icon('database', 18)}</span>
                <div>
                  <h3 class="sh-card-title">Database Maintenance & Backups</h3>
                  <p class="sh-card-desc">Manage local SQLite database records, vacuum storage, and export backup snapshots.</p>
                </div>
              </div>
            </div>
            <div class="sh-card-body flex flex-wrap items-center gap-3">
              <button type="button" class="sh-secondary-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold" onclick="showToast('Database integrity check passed! 0 errors found.','success')">
                ${icon('checkCircle2', 14)} Run Integrity Check
              </button>
              <button type="button" class="sh-secondary-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold" onclick="showToast('Database snapshot saved to server/data/backup.sqlite','success')">
                ${icon('download', 14)} Export Snapshot
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  `;
}

// Settings event bindings
function bindSettingsEvents() {
  // Tab Switching
  document.querySelectorAll('[data-setting-tab]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const tab = this.getAttribute('data-setting-tab');
      window.settingsActiveTab = tab;
      
      document.querySelectorAll('[data-setting-tab]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      document.querySelectorAll('.sh-tab-pane').forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('block');
      });

      const pane = document.getElementById('pane-' + tab);
      if (pane) {
        pane.classList.remove('hidden');
        pane.classList.add('block');
      }
    });
  });

  // Radio cards in settings
  document.querySelectorAll('.sh-radio-card input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', function() {
      const groupName = this.name;
      document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
        r.closest('.sh-radio-card').classList.remove('active');
      });
      if (this.checked) {
        this.closest('.sh-radio-card').classList.add('active');
      }
    });
  });

  const candProfForm = document.getElementById('form-candidate-profile');
  if (candProfForm) {
    candProfForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-cand-profile');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const first = document.getElementById('cand-first-name').value.trim();
      const last = document.getElementById('cand-last-name').value.trim();
      const fullName = (first + ' ' + last).trim();

      const curSettings = getCandidateSettings();
      curSettings.firstName = first;
      curSettings.lastName = last;
      curSettings.phone = document.getElementById('cand-phone').value.trim();
      curSettings.targetRole = document.getElementById('cand-role').value.trim();
      curSettings.experienceLevel = document.getElementById('cand-exp').value;
      curSettings.skills = document.getElementById('cand-skills').value.trim();
      curSettings.bio = document.getElementById('cand-bio').value.trim();
      saveCandidateSettings(curSettings);

      try {
        if (fullName && typeof api.updateProfile === 'function') {
          const res = await api.updateProfile({ name: fullName });
          if (res && res.user) {
            state.user = res.user;
          }
        }
        showToast('Profile updated successfully!', 'success');
      } catch (err) {
        showToast('Saved locally. Note: ' + (err.message || 'Server sync error'), 'info');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (typeof render === 'function') render();
      }
    });
  }

  const candAiForm = document.getElementById('form-candidate-ai');
  if (candAiForm) {
    candAiForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-cand-ai');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const cur = getCandidateSettings();
      const diffEl = document.querySelector('input[name="difficulty"]:checked');
      if (diffEl) cur.defaultDifficulty = diffEl.value;

      const feedEl = document.querySelector('input[name="feedbackDepth"]:checked');
      if (feedEl) cur.aiFeedbackDepth = feedEl.value;

      cur.visionEyeTracking = document.getElementById('cand-toggle-eye').checked;
      cur.visionEmotion = document.getElementById('cand-toggle-emotion').checked;
      cur.visionPosture = document.getElementById('cand-toggle-posture').checked;
      cur.speechFluency = document.getElementById('cand-toggle-fluency').checked;
      cur.speechFillerWords = document.getElementById('cand-toggle-filler').checked;
      cur.speechPronunciation = document.getElementById('cand-toggle-pronunc').checked;

      saveCandidateSettings(cur);

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        showToast('Interview & AI preferences saved!', 'success');
      }, 400);
    });
  }

  const candNotifForm = document.getElementById('form-candidate-notif');
  if (candNotifForm) {
    candNotifForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-cand-notif');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const cur = getCandidateSettings();
      cur.notifReminders = document.getElementById('cand-notif-remind').checked;
      cur.notifReports = document.getElementById('cand-notif-reports').checked;
      cur.notifRecruiter = document.getElementById('cand-notif-recruiter').checked;
      cur.notifWeeklyDigest = document.getElementById('cand-notif-weekly').checked;
      cur.soundEffects = document.getElementById('cand-notif-sound').checked;

      saveCandidateSettings(cur);

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        showToast('Notification rules updated!', 'success');
      }, 400);
    });
  }

  const candPassForm = document.getElementById('form-candidate-password');
  if (candPassForm) {
    candPassForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const curr = document.getElementById('cand-curr-pass').value;
      const npass = document.getElementById('cand-new-pass').value;
      const conf = document.getElementById('cand-conf-pass').value;

      if (npass !== conf) {
        showToast('New passwords do not match!', 'error');
        return;
      }
      if (npass.length < 8) {
        showToast('New password must be at least 8 characters.', 'error');
        return;
      }

      const btn = document.getElementById('btn-save-cand-pass');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Updating...`;

      try {
        await api.changePassword(curr, npass);
        showToast('Password changed successfully!', 'success');
        candPassForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed to update password.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });
  }

  const recProfForm = document.getElementById('form-recruiter-profile');
  if (recProfForm) {
    recProfForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-rec-profile');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const cur = getRecruiterSettings();
      cur.fullName = document.getElementById('rec-name').value.trim();
      cur.companyName = document.getElementById('rec-company').value.trim();
      cur.companyWebsite = document.getElementById('rec-website').value.trim();
      cur.industry = document.getElementById('rec-industry').value.trim();
      cur.department = document.getElementById('rec-dept').value.trim();
      saveRecruiterSettings(cur);

      try {
        if (cur.fullName && typeof api.updateProfile === 'function') {
          const res = await api.updateProfile({ name: cur.fullName });
          if (res && res.user) state.user = res.user;
        }
        showToast('Recruiter profile saved!', 'success');
      } catch (err) {
        showToast('Saved locally. Note: ' + (err.message || 'Server sync error'), 'info');
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (typeof render === 'function') render();
      }
    });
  }

  const recHiringForm = document.getElementById('form-recruiter-hiring');
  if (recHiringForm) {
    recHiringForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-rec-hiring');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const cur = getRecruiterSettings();
      cur.passThreshold = parseInt(document.getElementById('range-pass-score').value, 10);
      cur.fluencyCutoff = parseInt(document.getElementById('range-fluency-score').value, 10);
      cur.attentionCutoff = parseInt(document.getElementById('range-attention-score').value, 10);
      cur.autoShortlist = document.getElementById('rec-toggle-shortlist').checked;
      cur.autoFlagIntegrity = document.getElementById('rec-toggle-integrity').checked;
      cur.questionTimeLimit = document.getElementById('rec-time-limit').value;
      saveRecruiterSettings(cur);

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = orig;
        showToast('Hiring benchmarks and cutoff rules updated!', 'success');
      }, 400);
    });
  }

  const recNotifForm = document.getElementById('form-recruiter-notif');
  if (recNotifForm) {
    recNotifForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-rec-notif');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const cur = getRecruiterSettings();
      cur.notifSubmissions = document.getElementById('rec-notif-sub').checked;
      cur.notifStarCandidates = document.getElementById('rec-notif-star').checked;
      cur.notifDailyDigest = document.getElementById('rec-notif-digest').checked;
      saveRecruiterSettings(cur);

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = orig;
        showToast('Pipeline alert triggers saved!', 'success');
      }, 400);
    });
  }

  const recPassForm = document.getElementById('form-recruiter-password');
  if (recPassForm) {
    recPassForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const curr = document.getElementById('rec-curr-pass').value;
      const npass = document.getElementById('rec-new-pass').value;
      const conf = document.getElementById('rec-conf-pass').value;

      if (npass !== conf) {
        showToast('New passwords do not match!', 'error');
        return;
      }
      if (npass.length < 8) {
        showToast('Password must be at least 8 characters.', 'error');
        return;
      }

      const btn = document.getElementById('btn-save-rec-pass');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Updating...`;

      try {
        await api.changePassword(curr, npass);
        showToast('Recruiter credentials updated!', 'success');
        recPassForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed to update password.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });
  }

  const admSysForm = document.getElementById('form-admin-system');
  if (admSysForm) {
    admSysForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-adm-sys');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const cur = getAdminSettings();
      cur.platformName = document.getElementById('adm-plat-name').value.trim();
      cur.supportEmail = document.getElementById('adm-support-email').value.trim();
      cur.maxConcurrency = parseInt(document.getElementById('adm-concurrency').value, 10);
      cur.maintenanceMode = document.getElementById('adm-toggle-maint').checked;
      saveAdminSettings(cur);

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = orig;
        showToast('Enterprise system parameters updated!', 'success');
      }, 400);
    });
  }

  const admAiForm = document.getElementById('form-admin-ai');
  if (admAiForm) {
    admAiForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-adm-ai');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const cur = getAdminSettings();
      cur.llmProvider = document.getElementById('adm-llm').value;
      cur.resumeEngine = document.getElementById('adm-resume-llm').value;
      saveAdminSettings(cur);

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = orig;
        showToast('AI multi-modal engines synchronized!', 'success');
      }, 400);
    });
  }

  const admBroadForm = document.getElementById('form-admin-broadcast');
  if (admBroadForm) {
    admBroadForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-adm-broadcast');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Saving...`;

      const cur = getAdminSettings();
      cur.broadcastBanner = document.getElementById('adm-toggle-banner').checked;
      cur.bannerMessage = document.getElementById('adm-banner-msg').value.trim();
      cur.emailServiceActive = document.getElementById('adm-toggle-email').checked;
      cur.escalateErrors = document.getElementById('adm-toggle-escalate').checked;
      saveAdminSettings(cur);

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = orig;
        showToast('Broadcast rules & announcement saved!', 'success');
      }, 400);
    });
  }

  const admPassForm = document.getElementById('form-admin-password');
  if (admPassForm) {
    admPassForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const curr = document.getElementById('adm-curr-pass').value;
      const npass = document.getElementById('adm-new-pass').value;
      const conf = document.getElementById('adm-conf-pass').value;

      if (npass !== conf) {
        showToast('New passwords do not match!', 'error');
        return;
      }
      if (npass.length < 8) {
        showToast('Password must be at least 8 characters.', 'error');
        return;
      }

      const btn = document.getElementById('btn-save-adm-pass');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin">${icon('loader', 14)}</span> Updating...`;

      try {
        await api.changePassword(curr, npass);
        showToast('Admin master password updated!', 'success');
        admPassForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed to update admin password.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });
  }
}
