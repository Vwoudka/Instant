// INSTANT backend entry point.
// Express HTTP API + WebSocket server for real-time push of MQTT readings.
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');

const config = require('./config');
const store = require('./state');
const mqttService = require('./mqtt');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const topics = config.mqtt.topics;

// Push a JSON message to every connected WebSocket client.
function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

// Handles a single MQTT message: maps topic -> state field, recomputes the
// fault flag, stores a history point and broadcasts the change to all clients.
function handleData(topic, payload) {
  const value = String(payload || '').trim();
  const now = Date.now();
  const patch = { lastUpdated: new Date(now).toISOString() };

  if (topic === topics.voltage) {
    patch.voltage = Number(parseFloat(value).toFixed(1)) || 0;
  } else if (topic === topics.current) {
    patch.current = Number(parseFloat(value).toFixed(2)) || 0;
  } else if (topic === topics.power) {
    patch.power = Number(parseFloat(value).toFixed(1)) || 0;
  } else if (topic === topics.pf) {
    patch.pf = Math.min(1, Math.max(0, parseFloat(value) || 0));
  } else if (topic === topics.relayState) {
    patch.relay = value.toUpperCase() === 'ON' ? 'ON' : 'OFF';
    patch.relayFromMqtt = true;
  } else if (topic === topics.fault) {
    patch.fault = value === 'NONE' || value === '0' || !value ? null : value;
  } else if (topic === topics.vmax) {
    const v = parseFloat(value);
    if (v > 0) {
      patch.thresholds = { ...store.getThresholds(), vmax: v };
      patch.thresholdsSource = 'mqtt';
    }
  } else if (topic === topics.imax) {
    const v = parseFloat(value);
    if (v > 0) {
      patch.thresholds = { ...store.getThresholds(), imax: v };
      patch.thresholdsSource = 'mqtt';
    }
  } else if (topic === topics.pmax) {
    const v = parseFloat(value);
    if (v > 0) {
      patch.thresholds = { ...store.getThresholds(), pmax: v };
      patch.thresholdsSource = 'mqtt';
    }
  }

  store.update(patch);

  // Compute the fault flag from the safety thresholds when the firmware does
  // not publish its own fault/status topic.
  const s = store.getState();
  const th = s.thresholds;
  const exceeded = s.voltage > th.vmax || s.current > th.imax || s.power > th.pmax;

  if (topic === topics.fault) {
    if (!s.fault && exceeded) store.update({ fault: 'Safety limit exceeded' });
  } else if (topic === topics.voltage || topic === topics.current || topic === topics.power) {
    store.update({ fault: exceeded ? 'Safety limit exceeded' : null });
  }

  const updated = store.getState();

  // Only append a history point when an actual measurement topic changed.
  const isMeasurement =
    topic === topics.voltage || topic === topics.current || topic === topics.power || topic === topics.pf;
  if (isMeasurement) {
    store.pushHistory({
      t: now,
      voltage: updated.voltage,
      current: updated.current,
      power: updated.power,
      pf: updated.pf,
    });
  }

  broadcast({ type: 'data', data: store.getState() });
}

function onStatusChange(status) {
  broadcast({ type: 'status', ...status });
}

// ---- HTTP API ----

// Live snapshot (no history — used by /api/state and WS broadcasts).
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ...store.getState() });
});

app.get('/api/state', (req, res) => {
  res.json(store.getState());
});

// Read the current thresholds. They live in memory and stay in sync with the
// settings/* MQTT topics (published by the device on boot and by the Settings
// page on save) — no cloud round-trip, so this is instant.
app.get('/api/thresholds', (req, res) => {
  res.json({
    ...store.getThresholds(),
    relay: store.getState().relay,
    source: store.getState().thresholdsSource || 'local',
  });
});

// Save thresholds and (optionally) the relay default by publishing them over
// MQTT to the settings topics the device subscribes to. Always validates input.
app.post('/api/thresholds', (req, res) => {
  const vmax = parseFloat(req.body.vmax);
  const imax = parseFloat(req.body.imax);
  const pmax = parseFloat(req.body.pmax);
  if (![vmax, imax, pmax].every((v) => Number.isFinite(v) && v > 0)) {
    return res.status(400).json({ error: 'vmax, imax and pmax must all be positive numbers' });
  }
  const th = {
    vmax: Number(vmax.toFixed(2)),
    imax: Number(imax.toFixed(2)),
    pmax: Number(pmax.toFixed(2)),
  };
  store.setThresholds(th);

  const published =
    mqttService.publish(topics.vmax, String(th.vmax)) &&
    mqttService.publish(topics.imax, String(th.imax)) &&
    mqttService.publish(topics.pmax, String(th.pmax));

  if (req.body.relay) {
    const r = String(req.body.relay).toUpperCase();
    if (r === 'ON' || r === 'OFF') {
      store.update({ relay: r });
      mqttService.publish(topics.relayCommand, r);
    }
  }

  broadcast({ type: 'data', data: store.getState() });
  res.json({ ok: true, ...store.getThresholds(), published, relay: store.getState().relay });
});

// Toggle the relay: publish "ON"/"OFF" to relay/command over MQTT. The device
// confirms by publishing relay/state back, which keeps the UI in sync.
app.post('/api/relay', (req, res) => {
  const value = String((req.body && req.body.state) || '').toUpperCase();
  if (value !== 'ON' && value !== 'OFF') {
    return res.status(400).json({ error: 'state must be either "ON" or "OFF"' });
  }

  const mqttPublished = mqttService.publish(topics.relayCommand, value);
  store.update({ relay: value });
  store.logRelay(value);

  broadcast({ type: 'data', data: store.getState() });
  res.json({ ok: true, state: value, mqttPublished });
});

// Historical data for the History page: rolling buffer from MQTT (downsampled)
// plus the recent relay toggle log.
app.get('/api/history', (req, res) => {
  const raw = parseInt(req.query.hours || '24', 10);
  const hours = Math.min(168, Math.max(1, raw));
  const points = store.getHistoryRange(hours * 3600 * 1000);
  res.json({ hours, count: points.length, points, relayLog: store.getRelayLog() });
});

// ---- WebSocket ----
wss.on('connection', (ws) => {
  // Send a full snapshot (including history) once per connection.
  ws.send(JSON.stringify({ type: 'snapshot', data: store.getFullState() }));
});

// Serve the built frontend in production (frontend/build).
const frontendDist = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/ws') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error middleware (JSON parse failures etc.)
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err) {
    console.error('[express]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
  next();
});

// ---- Start ----
mqttService.start({ onData: handleData, onStatusChange });

server.listen(config.port, () => {
  console.log(`[instant] backend listening at http://localhost:${config.port}`);
  console.log(`[instant] WebSocket endpoint: ws://localhost:${config.port}/ws`);
  if (config.demoMode) console.log('[instant] DEMO MODE enabled — generating mock MQTT data');
  console.log('[instant] thresholds & relay are exchanged over MQTT (no ThingSpeak involved)');
});

function shutdown() {
  console.log('\n[instant] shutting down…');
  mqttService.stop();
  wss.clients.forEach((c) => c.close());
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
