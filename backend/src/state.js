// In-memory store holding the latest live readings, thresholds and a rolling
// history buffer. This keeps the backend fast (no DB required) while WebSocket
// clients receive instant updates.

const DEFAULT_THRESHOLDS = { vmax: 240, imax: 10, pmax: 2000 };

const state = {
  voltage: 0,
  current: 0,
  power: 0,
  pf: 0,
  relay: 'OFF',
  relayFromMqtt: false,
  fault: null,
  connected: false,
  demoMode: false,
  lastUpdated: null,
  thresholds: { ...DEFAULT_THRESHOLDS },
  thresholdsSource: 'local',
  history: [], // rolling buffer: { t, voltage, current, power, pf }
  relayLog: [], // recent relay toggles: { t, state }
};

const HISTORY_WINDOW_MS = 7 * 24 * 3600 * 1000; // keep 7 days
const MAX_POINTS = 20000;

// Lightweight snapshot for broadcasts / /api/state (no big history array).
function getState() {
  const { history, relayLog, ...rest } = state;
  return { ...rest, historyCount: history.length, relayLog };
}

// Full state including the history buffer (sent once per WS connection).
function getFullState() {
  return { ...state };
}

function update(patch) {
  Object.assign(state, patch);
  return state;
}

function pushHistory(point) {
  state.history.push(point);
  const cutoff = Date.now() - HISTORY_WINDOW_MS;
  while (state.history.length > MAX_POINTS || state.history[0].t < cutoff) {
    state.history.shift();
  }
}

// Returns history points inside the requested window, downsampled so charts
// never have to render thousands of points.
function getHistoryRange(ms) {
  const cutoff = Date.now() - ms;
  let pts = state.history.filter((p) => p.t >= cutoff);
  const max = 600;
  if (pts.length > max) {
    const step = Math.ceil(pts.length / max);
    pts = pts.filter((_, i) => i % step === 0);
  }
  return pts;
}

function logRelay(newState) {
  state.relayLog.push({ t: new Date().toISOString(), state: newState });
  if (state.relayLog.length > 50) state.relayLog.splice(0, state.relayLog.length - 50);
}

function getRelayLog() {
  return state.relayLog;
}

function setThresholds(th) {
  state.thresholds = th;
}

function getThresholds() {
  return state.thresholds;
}

module.exports = {
  getState,
  getFullState,
  update,
  pushHistory,
  getHistoryRange,
  logRelay,
  getRelayLog,
  setThresholds,
  getThresholds,
};
