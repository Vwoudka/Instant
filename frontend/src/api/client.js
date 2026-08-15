// Small wrapper around fetch for the backend REST API.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const getState = () => request('/api/state');
export const getThresholds = () => request('/api/thresholds');
export const postRelay = (state) => request('/api/relay', { method: 'POST', body: JSON.stringify({ state }) });
export const postThresholds = (payload) => request('/api/thresholds', { method: 'POST', body: JSON.stringify(payload) });
export const getHistory = (hours) => request(`/api/history?hours=${hours}`);

export const getWSURL = () =>
  process.env.REACT_APP_WS_URL || API_URL.replace(/^http/, 'ws') + '/ws';
