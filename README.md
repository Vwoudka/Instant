# INSTANT

**INSTANT** is a vivid, professional IoT web application for **real-time energy monitoring and
single-click relay control**. Live electrical parameters, relay commands and safety thresholds are
exchanged **entirely over MQTT** — no slow cloud APIs, everything pushed to the browser over
**WebSocket** in milliseconds.

Built with **React** (frontend), **Node.js/Express** (backend), **mqtt.js** and an
**ESP32S2 + EmonLib** firmware.

![stack](https://img.shields.io/badge/stack-React%20%2B%20Node.js-blue)
![real-time](https://img.shields.io/badge/real--time-WebSocket%20%2B%20MQTT-ff007f)
![mqtt](https://img.shields.io/badge/data-MQTT%20only-00e5a0)

---

## Features

- **Live electrical parameters** — voltage (V), current (A), power (W) and power factor (PF),
  streamed from MQTT (`energy/*` topics) and pushed to the UI over WebSocket.
- **Animated dashboard** — four radial-gauge metric cards with smooth number transitions, a
  scrolling power/voltage chart, and a glowing single-click relay toggle.
- **Relay control** — one click publishes `ON`/`OFF` to `relay/command` over MQTT; the device
  applies it instantly and confirms on `relay/state`.
- **Thresholds over MQTT** — `Vmax`, `Imax`, `Pmax` and the relay default travel on
  `settings/vmax`, `settings/imax`, `settings/pmax` and `relay/command`. The device publishes its
  config (retained) on connect; the **Settings** page republishes on save. No ThingSpeak needed.
- **Fault detection** — a warning banner appears whenever a live reading exceeds a safety limit
  (computed from thresholds, or via the `fault/status` MQTT topic published by the firmware).
- **History page** — power & voltage over time with selectable ranges (1h / 6h / 24h / 7d),
  recent readings table and a relay activity log.
- **Dark/light themes**, fully responsive layout, toasts for all errors/successes, and
  automatic WebSocket reconnection.
- **Demo mode** — `DEMO_MODE=true` simulates the firmware over the same MQTT pipeline, so the
  app runs with zero hardware. On a static site (GitHub Pages) or when the backend is simply not
  reachable, the frontend automatically falls back to a built-in **browser demo** so the dashboard
  is never blank.

---

## Architecture

```
  ESP32S2 firmware              +----------------------------------------+
  (EmonLib + PubSubClient)      |   BACKEND (Node.js/Express)            |
  - measures V/I/P/PF           |   mqtt.js client -> in-memory state    |
  - publishes energy/*          |        |         -> history buffer     |
  - publishes relay/state       |        |                               |
  - publishes fault/status  <-->|  MQTT  |   WebSocketServer (/ws)        |
  - subscribes relay/command    | broker |        |                      |
  - subscribes settings/*       |        v        v                      |
                                |  push every update to all clients      |
                                +--------+-------------------------------+
                                         | ws://
                                         v
                          +------------------------------+
                          | FRONTEND (React)             |
                          | Dashboard / History /        |
                          | Settings + Context API       |
                          +------------------------------+
```

**MQTT topics** (configurable in `backend/.env`, hardcoded in the firmware):

| Topic             | Direction | Payload          | Meaning                           |
| ----------------- | --------- | ---------------- | --------------------------------- |
| `energy/voltage`  | in        | `235.1`          | Live voltage (V)                  |
| `energy/current`  | in        | `4.23`           | Live current (A)                  |
| `energy/power`    | in        | `990.5`          | Live power (W)                    |
| `energy/pf`       | in        | `0.93`           | Power factor                      |
| `relay/state`     | in        | `ON` / `OFF`     | Firmware-reported relay state     |
| `relay/command`   | out       | `ON` / `OFF`     | Relay command (from dashboard)    |
| `fault/status`    | in        | message or `NONE`| Fault reported by the firmware    |
| `settings/vmax`   | in/out    | `240`            | Voltage safety limit (retained)   |
| `settings/imax`   | in/out    | `15`             | Current safety limit (retained)   |
| `settings/pmax`   | in/out    | `3000`           | Power safety limit (retained)     |

Threshold topics replace ThingSpeak fields 1–3; `relay/command` replaces field 4.

---

## Project structure

```
instant/
├─ package.json              # root convenience scripts
├─ .github/workflows/deploy.yml  # auto-deploys the site to GitHub Pages
├─ backend/
│  ├─ .env.example           # copy to .env and fill in
│  └─ src/
│     ├─ index.js            # Express API + WebSocket server
│     ├─ config.js           # env-based configuration (broker + topics)
│     ├─ mqtt.js             # MQTT subscribe / publish
│     ├─ state.js            # in-memory state + history buffer
│     └─ demo.js             # mock-firmware simulator (DEMO_MODE)
├─ frontend/
│  ├─ .env.example
│  ├─ public/                # index.html + favicon
│  └─ src/
│     ├─ App.js              # routes + theming shell
│     ├─ theme.js            # dark/light palettes, global styles
│     ├─ context/AppContext.js   # global state + built-in browser demo fallback
│     ├─ hooks/              # useWebSocket, useAnimatedNumber
│     ├─ api/client.js       # REST API wrapper
│     ├─ components/         # Header, MetricCard, Gauge, AppLineChart,
│     │                      # RelaySwitch, FaultBanner, Toast, StatusDot, Icons
│     └─ pages/              # Dashboard, History, Settings
└─ firmware/
   └─ INSTANT_ESP32S2/       # ESP32S2 Arduino sketch (MQTT + EmonLib)
      └─ INSTANT_ESP32S2.ino
```

---

## Getting started

### 1. Prerequisites

- Node.js **18+** (tested on 22)
- npm or yarn
- A reachable MQTT broker — HiveMQ public (`broker.hivemq.com:1883`) works out of the box
- (optional) the ESP32S2 hardware + Arduino IDE / PlatformIO

### 2. Install dependencies

```bash
# from the project root
npm install --prefix backend
npm install --prefix frontend
# or:
npm run install-all
```

### 3. Configure environment variables

Backend:

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env`:

| Variable                  | Required | Description                                        |
| ------------------------- | -------- | -------------------------------------------------- |
| `PORT`                    | no       | HTTP/WebSocket port (default `5000`)               |
| `MQTT_URL`                | no       | Broker URL (default `mqtt://broker.hivemq.com:1883`) |
| `MQTT_USERNAME`           | no       | Broker username (blank if none)                    |
| `MQTT_PASSWORD`           | no       | Broker password (blank if none)                    |
| `MQTT_TOPIC_*`            | no       | MQTT topic names (defaults shown above)            |
| `DEMO_MODE`               | no       | `true` = simulate the firmware, no broker/hardware |

Frontend:

```bash
cd frontend
copy .env.example .env
```

| Variable              | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `REACT_APP_API_URL`   | Backend URL (default `http://localhost:5000`)         |
| `REACT_APP_WS_URL`    | WebSocket URL (default derived from API URL + `/ws`)  |

### 4. Run in development (two terminals)

```bash
# terminal 1 — backend (auto-restarts with nodemon)
cd backend && npm run dev

# terminal 2 — frontend (Create React App dev server on :3000)
cd frontend && npm start
```

Open **http://localhost:3000**.

> **No hardware yet?** Set `DEMO_MODE=true` in `backend/.env` and restart the backend — the
> dashboard is fed by the built-in firmware simulator.

### 5. Production build & single server

```bash
npm run build        # builds frontend into frontend/build
npm start            # backend serves API + static frontend on :5000
```

Open **http://localhost:5000** — one process serves everything, including the WebSocket stream.

> **Standalone static site (no backend needed).** The frontend is fully self-contained: if the
> backend isn't reachable (or you just double-click `frontend/build/index.html`), the UI switches
> to a built-in browser simulator after ~6 s and shows the dashboard in **DEMO** mode — no Node,
> no MQTT broker, no hardware required.

### 6. GitHub Pages

Pushing to GitHub runs `.github/workflows/deploy.yml`, which builds the frontend and publishes it
to your `github.io` site automatically:

1. Push this folder to a GitHub repository.
2. Repo **Settings → Pages → Source**: pick **"GitHub Actions"**.
3. On the next push the workflow deploys the site to
   `https://<your-user>.github.io/<repo-name>/`.

Because the site is static, it runs in browser **DEMO** mode (see above). To feed it live data,
point it at a running backend by building with the API URL set:

```bash
# in frontend/, before building
set REACT_APP_API_URL=https://your-backend.example.com
npm run build
```

### 7. HTTPS in production

The WebSocket/REST API works over HTTPS automatically when your server sits behind a reverse
proxy with TLS (e.g. Nginx or Caddy) — the browser simply connects to `wss://` / `https://`.
Point the proxy at the backend port (5000), then update `REACT_APP_API_URL` to your `https://`
origin and rebuild the frontend.

---

## Firmware (ESP32S2)

`firmware/INSTANT_ESP32S2/INSTANT_ESP32S2.ino` replaces the ThingSpeak version of the sketch.

**Libraries** (Arduino Library Manager):

- `PubSubClient` by Nick O'Leary
- `EmonLib` by OpenEnergyMonitor

**Wiring / config** (identical to the original sketch):

| Item                  | Value            |
| --------------------- | ---------------- |
| Voltage sensor        | ZMPT101B on pin 34 |
| Current sensor        | SCT-013 on pin 35 |
| Relay / LED           | pin 18           |
| Calibration           | `V_CAL`, `I_CAL`, `PHASE` |
| Relay polarity        | `RELAY_ACTIVE_LOW` (inverted on this build → `false`) |
| WiFi credentials      | `ssid`, `password` |
| Broker                | `broker.hivemq.com:1883` |

**What changed vs the ThingSpeak version:**

- Removed `HTTPClient` + ThingSpeak REST calls entirely (no more 15 s send rate limit, no 10 s
  config polling, no blocking HTTP latency).
- Publishes `energy/*` readings every **2 s** and on every relay/fault state change.
- Subscribes to `relay/command` and `settings/vmax|imax|pmax`; applies changes immediately.
- Publishes its config as **retained** messages on connect so the backend learns the current
  thresholds the moment it subscribes.
- Auto-reconnect (WiFi + broker) checked every **5 s** in `loop()`, on the same `reconnect()`
  pattern used in the Blynk sketch.
- Keeps the safety logic: fault trip overrides manual command, 5 s cooldown, under-voltage trip
  (`voltage < 0.8 * vMax`), and the safe OFF state at boot.

> If you use your own broker, update `MQTT_HOST`/`MQTT_PORT` in the sketch — and keep the topic
> names in sync with `backend/.env`.

---

## API reference

| Method | Endpoint               | Description                                      |
| ------ | ---------------------- | ------------------------------------------------ |
| GET    | `/api/health`          | Service health + current state                   |
| GET    | `/api/state`           | Latest live values (no history)                  |
| GET    | `/api/thresholds`      | Current thresholds + relay (local, MQTT-synced)  |
| POST   | `/api/thresholds`      | Publish thresholds (and relay default) over MQTT |
| POST   | `/api/relay`           | Body `{ "state": "ON" | "OFF" }` — publish to `relay/command` |
| GET    | `/api/history?hours=24` | Downsampled history + relay log                  |
| WS     | `/ws`                  | Real-time stream: `snapshot`, `data`, `status`   |

### WebSocket message shapes

```jsonc
{ "type": "snapshot", "data": { /* full state + history array */ } }
{ "type": "data",     "data": { /* incremental state update */ } }
{ "type": "status",   "connected": true, "demo": false }
```

---

## Relay toggle flow

1. User clicks the relay switch on the Dashboard.
2. Frontend POSTs `{"state": "ON"}` to `/api/relay`.
3. Backend publishes `ON` to `relay/command` over MQTT.
4. The firmware applies it (respecting safety limits) and publishes `relay/state`.
5. Backend broadcasts every update to all WebSocket clients — every browser updates instantly.

## Threshold flow

1. Firmware connects → publishes `settings/vmax|imax|pmax` (retained).
2. Backend receives them → stores + broadcasts → the Settings page shows "From device (MQTT)".
3. User edits thresholds in Settings → backend publishes the new values → firmware applies them on
   the fly and the backend recomputes the fault status against the new limits.

---

## Security notes

- No cloud API keys at all anymore — the only credential is the optional MQTT broker password,
  kept in `.env` (never committed — see `.gitignore`).
- All settings inputs are validated on the backend before publishing.
- Use TLS in production (reverse proxy) so live data travels over HTTPS/WSS.
- CORS is open for development; restrict the origin allow-list before deploying.
- Prefer a private MQTT broker with authentication for real deployments (public brokers are fine
  for demos but any client can read/write the shared topics).

## Customising topics

1. Backend: change `MQTT_TOPIC_*` in `backend/.env`.
2. Firmware: change the `TOPIC_*` defines in `INSTANT_ESP32S2.ino`.
Keep the two in sync.

The backend is payload-agnostic: numeric payloads are parsed, `ON`/`OFF` are normalised, and
fault payloads of `NONE`/`0`/empty are treated as no-fault.

---

## Troubleshooting

| Symptom                                | Fix                                                    |
| -------------------------------------- | ------------------------------------------------------ |
| Blank / white page                     | Open the **built** `frontend/build/index.html` (or serve the build folder) — don't open `public/index.html`, which has no compiled JS |
| Header shows **Offline**               | Check the backend is running and `REACT_APP_WS_URL` is right; the dashboard then falls back to built-in demo mode after ~6 s |
| Gauges stay at 0                       | Check broker connection in backend logs; enable demo mode |
| Backend logs "no broker" / MQTT errors | Is the broker reachable? On a corporate LAN use your own broker + credentials |
| Firmware shows `WiFi FAIL`             | Check `ssid`/`password`; Wokwi needs `Wokwi-GUEST` + empty password |
| Firmware shows `MQTT FAIL` / no connect| Check `MQTT_HOST`/`MQTT_PORT`; 1883/TCP out must be allowed |
| Chart is empty                         | History is buffered only while the backend runs — keep it running or enable demo mode |

License: MIT
