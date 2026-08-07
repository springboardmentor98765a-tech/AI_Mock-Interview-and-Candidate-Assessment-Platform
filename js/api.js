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
  submitInterviewAnswer: function(interviewId, questionId, answerText) {
    return apiRequest('/interviews/' + interviewId + '/answer', {
      method: 'POST',
      body: { question_id: questionId, answer_text: answerText },
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
  getInterviewHistory: function() {
    return apiRequest('/interviews/history');
  },
  getInterviewReport: function(id) {
    return apiRequest('/interviews/' + id + '/report');
  },
  getAnalyticsSummary: function() {
    return apiRequest('/interviews/analytics/summary');
  },
  transcribeChunk: function(audioBase64, mimeType) {
    return apiRequest('/interviews/transcribe-chunk', {
      method: 'POST',
      body: { audio_chunk: audioBase64, mime_type: mimeType || 'audio/webm' },
    });
  },
};
