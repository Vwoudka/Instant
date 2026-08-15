// Thin wrapper around the ThingSpeak REST API. ThingSpeak serves CORS headers
// on every endpoint, so the browser talks to it directly — no Node backend
// needed (works from GitHub Pages and even file://).
//
// Data layout (see the ESP32S2 firmware):
//   channel 3428306 (measurements): field1=V  field2=I  field3=P  field4=relay
//   channel 3428310 (config):       field1=vMax  field2=iMax  field3=pMax
//                                   field4=relay command

const TS = {
  base: 'https://api.thingspeak.com',
  channel: '3428306',
  readKey: 'UIWSRR7X029RCD5V',
  configChannel: '3428310',
  configReadKey: 'F54BNJ6PACIS3OKD',
  configWriteKey: 'K7TDWWD0WEQN97RR',
};

function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// Normalises one measurement feed entry into the app's shape.
function parseReading(f) {
  if (!f || f.field1 == null || f.field2 == null) return null;
  const voltage = num(f.field1);
  const current = num(f.field2);
  const power = num(f.field3);
  const relay = String(f.field4) === '1' ? 'ON' : 'OFF';
  // The firmware computes powerFactor but doesn't send it — derive it.
  const pf = voltage * current > 0 ? Math.max(0, Math.min(1, power / (voltage * current))) : 0;
  return {
    t: Date.parse(f.created_at) || Date.now(),
    voltage,
    current,
    power,
    pf,
    relay,
    lastUpdated: f.created_at,
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ThingSpeak error (${res.status})`);
  return res.json();
}

// Latest live reading from the measurement channel.
export async function getLatest() {
  const data = await getJson(
    `${TS.base}/channels/${TS.channel}/feeds/last.json?api_key=${TS.readKey}`
  );
  return parseReading(data);
}

// Historical readings + a derived relay-activity log (state changes of field4).
export async function getHistory(minutes) {
  const data = await getJson(
    `${TS.base}/channels/${TS.channel}/feeds.json?api_key=${TS.readKey}&minutes=${minutes}`
  );
  const feeds = data.feeds || [];
  const points = feeds.map(parseReading).filter(Boolean);

  const relayLog = [];
  let prev = null;
  for (const f of feeds) {
    const st = String(f.field4) === '1' ? 'ON' : 'OFF';
    if (prev !== null && st !== prev) relayLog.push({ t: Date.parse(f.created_at), state: st });
    prev = st;
  }
  return { points, relayLog };
}

// Current thresholds + relay command from the config channel.
export async function getConfig() {
  const data = await getJson(
    `${TS.base}/channels/${TS.configChannel}/feeds/last.json?api_key=${TS.configReadKey}`
  );
  return {
    vmax: num(data.field1) || 240,
    imax: num(data.field2) || 15,
    pmax: num(data.field3) || 3000,
    relay: String(data.field4) === '1' ? 'ON' : 'OFF',
  };
}

// Writes thresholds + relay command to the config channel the firmware polls.
export async function saveConfig({ vmax, imax, pmax, relay }) {
  const body = new URLSearchParams({
    api_key: TS.configWriteKey,
    field1: String(vmax),
    field2: String(imax),
    field3: String(pmax),
    field4: relay === 'ON' ? '1' : '0',
  });
  const res = await fetch(`${TS.base}/update`, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!res.ok) throw new Error(`ThingSpeak write failed (${res.status})`);
  return true;
}
