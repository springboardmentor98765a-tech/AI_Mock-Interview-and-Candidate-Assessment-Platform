/* ── API Utility ── */
const API_BASE = '/api';

async function apiRequest(endpoint, options) {
  var config = {
    headers: { 'Content-Type': 'application/json' },
  };
  var token = localStorage.getItem('smarthire_token');
  if (token) {
    config.headers['Authorization'] = 'Bearer ' + token;
  }
  Object.assign(config, options);
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  var response = await fetch(API_BASE + endpoint, config);
  var data;
  try {
    data = await response.json();
  } catch (_) {
    throw new Error('The server returned an invalid response. Make sure the SmartHire server is running.');
  }
  if (!response.ok) {
    throw new Error(data.detail || data.error || data.message || 'Request failed.');
  }
  return data;
}

var api = {
  register: function(name, email, password, role) {
    return apiRequest('/auth/register', { method: 'POST', body: { name, email, password, role } });
  },
  login: function(email, password) {
    return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
  },
  requestPasswordReset: function(email) {
    return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
  },
  resetPassword: function(token, newPassword) {
    return apiRequest('/auth/reset-password', { method: 'POST', body: { token: token, new_password: newPassword } });
  },
  googleLogin: function(credential) {
    return apiRequest('/auth/google', { method: 'POST', body: { credential } });
  },
  getMe: function() {
    return apiRequest('/auth/me');
  },
  updateProfile: function(fields) {
    return apiRequest('/auth/profile', { method: 'PUT', body: fields });
  },
  changePassword: function(currentPassword, newPassword) {
    return apiRequest('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } });
  },
  getUsers: function(params) {
    var qs = new URLSearchParams(params || {}).toString();
    return apiRequest('/users' + (qs ? '?' + qs : ''));
  },
  getUserStats: function() {
    return apiRequest('/users/stats');
  },
  generateInterview: function(payload) {
    return apiRequest('/interviews/generate', { method: 'POST', body: payload });
  },
  getInterviews: function(params) {
    var qs = new URLSearchParams(params || {}).toString();
    return apiRequest('/interviews' + (qs ? '?' + qs : ''));
  },
  getInterview: function(id) {
    return apiRequest('/interviews/' + id);
  },
  updateInterview: function(id, payload) {
    return apiRequest('/interviews/' + id, { method: 'PUT', body: payload });
  },
  deleteInterview: function(id) {
    return apiRequest('/interviews/' + id, { method: 'DELETE' });
  },
  startInterview: function(interviewId) {
    return apiRequest('/interviews/' + interviewId + '/start', { method: 'POST' });
  },
  pauseInterview: function(id, currentQuestionIndex, elapsedSeconds) {
    return apiRequest('/interviews/' + id, {
      method: 'PUT',
      body: { status: 'paused', current_question_index: currentQuestionIndex, elapsed_seconds: elapsedSeconds }
    });
  },
  resumeInterview: function(id) {
    return apiRequest('/interviews/' + id + '/resume', { method: 'POST' });
  },
  endInterview: function(id, elapsedSeconds) {
    return apiRequest('/interviews/' + id, {
      method: 'PUT',
      body: { status: 'completed', elapsed_seconds: elapsedSeconds }
    });
  },
  submitInterviewAnswer: function(interviewId, questionId, answerText, durationSeconds, wpm) {
    var payload = { question_id: questionId, answer_text: answerText };
    if (typeof durationSeconds === 'number') payload.duration_seconds = durationSeconds;
    if (typeof wpm === 'number') payload.wpm = wpm;
    return apiRequest('/interviews/' + interviewId + '/answer', {
      method: 'POST',
      body: payload,
    });
  },
  speakInterviewQuestion: function(interviewId, questionId) {
    return apiRequest('/interviews/' + interviewId + '/speak', { method: 'POST', body: { question_id: questionId } });
  },
  submitVoiceAnswer: function(interviewId, questionId, audioData) {
    return apiRequest('/interviews/' + interviewId + '/answer-audio', {
      method: 'POST', body: { question_id: questionId, audio_data: audioData },
    });
  },
  sendVisionFrame: function(interviewId, imageDataUrl, questionIndex) {
    var payload = { image_data: imageDataUrl };
    if (typeof questionIndex === 'number') payload.question_index = questionIndex;
    return apiRequest('/interviews/' + interviewId + '/vision-frame', { method: 'POST', body: payload });
  },
  getVisionSummary: function(interviewId) {
    return apiRequest('/interviews/' + interviewId + '/vision-summary');
  },
  getInterviewHistory: function() {
    return apiRequest('/interviews/history');
  },
  getInterviewReport: function(id) {
    return apiRequest('/interviews/' + id + '/report');
  },
  getAnalyticsSummary: function() {
    return apiRequest('/interviews/analytics/summary');
  },
  uploadResume: function(file) {
    var formData = new FormData();
    formData.append('file', file);
    var token = localStorage.getItem('smarthire_token');
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API_BASE + '/interviews/upload-resume', {
      method: 'POST',
      headers: headers,
      body: formData,
    }).then(async function(res) {
      var data;
      try { data = await res.json(); } catch(_) { throw new Error('Upload failed.'); }
      if (!res.ok) throw new Error(data.detail || data.error || data.message || 'Upload failed.');
      return data;
    });
  },
  transcribeChunk: function(audioBase64, mimeType) {
    return apiRequest('/interviews/transcribe-chunk', {
      method: 'POST',
      body: { audio_chunk: audioBase64, mime_type: mimeType || 'audio/webm' },
    });
  },
  generateAssessment: function(payload) {
    return apiRequest('/assessments/generate', { method: 'POST', body: payload });
  },
  startAssessment: function(id) {
    return apiRequest('/assessments/' + id + '/start', { method: 'POST' });
  },
  getAssessment: function(id) {
    return apiRequest('/assessments/' + id);
  },
  submitAssessment: function(id, payload) {
    return apiRequest('/assessments/' + id + '/submit', { method: 'POST', body: payload });
  },
  getAssessmentHistory: function() {
    return apiRequest('/assessments/history');
  },
  uploadInterviewRecording: function(interviewId, blob, meta) {
    var formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    formData.append('recording_type', (meta && meta.recording_type) || 'video');
    if (meta && meta.duration) formData.append('duration', String(meta.duration));
    if (meta && meta.mime_type) formData.append('mime_type', meta.mime_type);

    var token = localStorage.getItem('smarthire_token');
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API_BASE + '/interviews/' + interviewId + '/recordings/upload', {
      method: 'POST',
      headers: headers,
      body: formData,
    }).then(async function(res) {
      var data;
      try { data = await res.json(); } catch(_) { throw new Error('Recording upload failed.'); }
      if (!res.ok) throw new Error(data.detail || data.error || data.message || 'Recording upload failed.');
      return data;
    });
  },
  getInterviewRecordings: function(interviewId) {
    return apiRequest('/interviews/' + interviewId + '/recordings');
  },
  getAllRecordings: function() {
    return apiRequest('/interviews/recordings/all');
  },
  deleteRecording: function(recordingId, interviewId) {
    var url = interviewId ? ('/interviews/' + interviewId + '/recordings/' + recordingId) : ('/interviews/recordings/' + recordingId);
    return apiRequest(url, { method: 'DELETE' });
  },
  getRecruiterSummary: function() {
    return apiRequest('/recruiter/summary');
  },
  getRecruiterCandidates: function(params) {
    var q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest('/recruiter/candidates' + q);
  },
  updateCandidateStatus: function(candidateId, status, notes) {
    return apiRequest('/recruiter/candidates/' + candidateId + '/status', {
      method: 'PUT',
      body: { status: status, notes: notes }
    });
  },
  getRecruiterLiveSessions: function() {
    return apiRequest('/recruiter/sessions/live');
  },
  getRecruiterSessions: function(statusFilter) {
    var q = statusFilter ? '?status_filter=' + encodeURIComponent(statusFilter) : '';
    return apiRequest('/recruiter/sessions' + q);
  },
  getRecruiterTemplates: function() {
    return apiRequest('/recruiter/templates');
  },
  createInterviewTemplate: function(payload) {
    return apiRequest('/recruiter/templates', {
      method: 'POST',
      body: payload
    });
  },
  deleteInterviewTemplate: function(templateId) {
    return apiRequest('/recruiter/templates/' + templateId, {
      method: 'DELETE'
    });
  },
  getRecruiterCompare: function(candidateIds) {
    var idsStr = Array.isArray(candidateIds) ? candidateIds.join(',') : candidateIds;
    return apiRequest('/recruiter/compare?candidate_ids=' + encodeURIComponent(idsStr));
  },
  getNotifications: function(tab, limit, offset) {
    var params = new URLSearchParams();
    if (tab) params.append('tab', tab);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);
    var q = params.toString();
    return apiRequest('/notifications' + (q ? '?' + q : ''));
  },
  getUnreadNotifCount: function() {
    return apiRequest('/notifications/unread-count');
  },
  markNotifRead: function(notificationId) {
    return apiRequest('/notifications/' + notificationId + '/read', { method: 'PUT' });
  },
  markAllNotifsRead: function() {
    return apiRequest('/notifications/read-all', { method: 'PUT' });
  },
  deleteNotif: function(notificationId) {
    return apiRequest('/notifications/' + notificationId, { method: 'DELETE' });
  },
  clearAllNotifs: function() {
    return apiRequest('/notifications', { method: 'DELETE' });
  },
  sendNotifReminder: function(payload) {
    return apiRequest('/notifications/send-reminder', { method: 'POST', body: payload || {} });
  },
};

