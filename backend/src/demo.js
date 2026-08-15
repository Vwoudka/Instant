// Demo-mode simulator: feeds realistic fake readings through the exact same
// onData(topic, payload) pipeline a real MQTT broker would, so the whole stack
// can be tested without hardware. Set DEMO_MODE=true in .env to enable.
const config = require('./config');
const store = require('./state');

function makeDemoEmitter(onData) {
  const t = config.mqtt.topics;
  let voltage = 229;
  let current = 4.1;

  // Publish the current config once at start, exactly like the firmware does
  // on connect (this is how the backend learns the thresholds over MQTT).
  onData(t.vmax, '240');
  onData(t.imax, '10');
  onData(t.pmax, '2000');

  const emit = () => {
    voltage = Math.max(205, Math.min(248, voltage + (Math.random() - 0.5) * 5));
    current = Math.max(0.3, Math.min(14, current + (Math.random() - 0.5) * 1.4));
    const power = Math.max(40, voltage * current * (0.82 + Math.random() * 0.18));
    const pf = Math.min(0.98, Math.max(0.62, 0.88 + (Math.random() - 0.5) * 0.1));
    const fault =
      voltage > 245 || current > 9 || power > 2200 ? 'Safety limit exceeded' : 'NONE';

    onData(t.voltage, voltage.toFixed(1));
    onData(t.current, current.toFixed(2));
    onData(t.power, power.toFixed(1));
    onData(t.pf, pf.toFixed(3));
    onData(t.relayState, store.getState().relay); // mirror any UI toggle
    onData(t.fault, fault);
  };

  emit();
  const interval = setInterval(emit, 2000);
  return () => clearInterval(interval);
}

module.exports = { makeDemoEmitter };
