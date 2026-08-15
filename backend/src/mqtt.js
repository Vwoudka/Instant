// MQTT client: subscribes to live energy topics and publishes relay commands.
// Uses the mqtt.js library. Everything is configured via environment variables.
const mqtt = require('mqtt');
const config = require('./config');
const store = require('./state');

let client = null;
let demoCleanup = null;

function getClient() {
  return client;
}

function start({ onData, onStatusChange }) {
  // Demo mode: no broker involved, a simulator calls onData directly.
  if (config.demoMode) {
    const { makeDemoEmitter } = require('./demo');
    store.update({ demoMode: true, connected: true });
    onStatusChange({ connected: true, demo: true });
    demoCleanup = makeDemoEmitter(onData);
    return;
  }

  const options = {
    clientId: 'instant_' + Math.random().toString(16).slice(2, 10),
    reconnectPeriod: 3000,
  };
  if (config.mqtt.username) options.username = config.mqtt.username;
  if (config.mqtt.password) options.password = config.mqtt.password;

  client = mqtt.connect(config.mqtt.url, options);

  client.on('connect', () => {
    store.update({ connected: true });
    onStatusChange({ connected: true, demo: false });
    // Subscribe to everything except the relay command topic, so we never
    // react to our own published commands.
    const topics = Object.values(config.mqtt.topics).filter(
      (tp) => tp !== config.mqtt.topics.relayCommand
    );
    client.subscribe(topics, (err) => {
      if (err) console.error('[mqtt] subscribe error:', err.message);
      else console.log('[mqtt] subscribed to:', topics.join(', '));
    });
  });

  client.on('message', (topic, payload) => {
    onData(topic, payload.toString());
  });

  client.on('error', (err) => {
    console.error('[mqtt] connection error:', err.message);
    store.update({ connected: false });
    onStatusChange({ connected: false, demo: false });
  });

  client.on('close', () => {
    store.update({ connected: false });
    onStatusChange({ connected: false, demo: false });
  });

  client.on('reconnect', () => {
    console.log('[mqtt] reconnecting…');
  });
}

function publish(topic, message) {
  if (client && client.connected) {
    client.publish(topic, message, { qos: 0, retain: false });
    return true;
  }
  return false;
}

function stop() {
  if (demoCleanup) {
    demoCleanup();
    demoCleanup = null;
  }
  if (client) {
    try {
      client.end(true);
    } catch (_) {
      /* ignore */
    }
    client = null;
  }
}

module.exports = { start, stop, publish, getClient };
