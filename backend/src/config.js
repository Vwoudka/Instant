// Central configuration loaded from environment variables (.env file).
// No secrets are hardcoded — copy `.env.example` to `.env` and fill in your values.
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),

  mqtt: {
    url: process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    topics: {
      voltage: process.env.MQTT_TOPIC_VOLTAGE || 'energy/voltage',
      current: process.env.MQTT_TOPIC_CURRENT || 'energy/current',
      power: process.env.MQTT_TOPIC_POWER || 'energy/power',
      pf: process.env.MQTT_TOPIC_PF || 'energy/pf',
      relayState: process.env.MQTT_TOPIC_RELAY_STATE || 'relay/state',
      relayCommand: process.env.MQTT_TOPIC_RELAY_COMMAND || 'relay/command',
      fault: process.env.MQTT_TOPIC_FAULT || 'fault/status',
      vmax: process.env.MQTT_TOPIC_VMAX || 'settings/vmax',
      imax: process.env.MQTT_TOPIC_IMAX || 'settings/imax',
      pmax: process.env.MQTT_TOPIC_PMAX || 'settings/pmax',
    },
  },

  // When true, a simulator feeds fake readings so the whole app works
  // without a broker or physical hardware.
  demoMode: process.env.DEMO_MODE === 'true',
};

module.exports = config;
