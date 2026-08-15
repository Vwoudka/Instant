# INSTANT

**INSTANT** is a vivid, professional IoT web application for **real-time energy monitoring and
single-click relay control**. Live electrical parameters, relay commands and safety thresholds are
exchanged with an **ESP32S2** through **ThingSpeak** — no server to run, the browser talks to the
ThingSpeak REST API directly (CORS is fully open), so the site works on **GitHub Pages** and even
from a double-clicked `index.html`.

Built with **React** (Create React App), **styled-components**, **Chart.js** and an
**ESP32S2 + EmonLib** firmware.

![stack](https://img.shields.io/badge/stack-React%20%2B%20ThingSpeak-blue)
![real-time](https://img.shields.io/badge/live-20s%20poll-00e5a0)
![hosting](https://img.shields.io/badge/host-GitHub%20Pages-ff007f)

---

## Features

- **Live electrical parameters** — voltage (V), current (A), power (W) and power factor (PF,
  derived as `P/(V·I)`) read from the ThingSpeak measurement channel.
- **Animated dashboard** — four radial-gauge metric cards with smooth number transitions, a
  scrolling power/voltage chart, and a glowing single-click relay toggle.
- **Relay control** — one click writes `ON`/`OFF` to the config channel; the device polls it and
  applies the command within ~10 s. The toggle reflects the command state instantly.
- **Safety thresholds** — `Vmax`, `Imax`, `Pmax` live on the config channel. The Settings page
  reads them and republishes on save; a fault banner appears when a live reading exceeds them.
- **History page** — power & voltage over time with selectable ranges (1h / 6h / 24h / 7d),
  a recent-readings table and a relay-activity log derived from `field4` transitions.
- **Dark/light themes**, fully responsive layout, and toasts for all errors/successes.
- **Honest online status** — the header shows **Live** while the newest reading is fresh (< 3 min)
  and **Offline** otherwise (or when ThingSpeak is unreachable). No fake demo data.

---

## Architecture

```
  ESP32S2 firmware (EmonLib + HTTPClient)
    - measures V/I/P, power factor
    - every 15 s  -> writes measurement channel 3428306 (field1=V, 2=I, 3=P, 4=relay)
    - every 10 s  <- polls    config channel     3428310 (field1=vMax, 2=iMax,
                                                           3=pMax, 4=relay command)
                                      |
                                      | https://api.thingspeak.com (CORS open)
                                      v
                    +---------------------------------------------+
                    |  FRONTEND (React, static site — any host)   |
                    |  api/client.js  -> REST wrapper             |
                    |  AppContext     -> polls every 20 s         |
                    |  Dashboard / History / Settings             |
                    +---------------------------------------------+
```

### ThingSpeak channels

| Channel | ID      | Direction      | Fields                                                  |
| ------- | ------- | -------------- | ------------------------------------------------------- |
| Measurements | `3428306` | device → cloud | `field1`=Voltage (V), `field2`=Current (A), `field3`=Power (W), `field4`=relay state |
| Config  | `3428310` | cloud ↔ device | `field1`=vMax (V), `field2`=iMax (A), `field3`=pMax (W), `field4`=relay command |

---

## Project structure

```
instant/
├─ package.json              # root convenience scripts
├─ .github/workflows/deploy.yml  # auto-deploys the site to GitHub Pages
├─ frontend/
│  ├─ public/                # index.html + favicon
│  └─ src/
│     ├─ App.js              # routes + theming shell
│     ├─ theme.js            # dark/light palettes, global styles
│     ├─ context/AppContext.js   # global state + ThingSpeak polling
│     ├─ hooks/useAnimatedNumber.js
│     ├─ api/client.js       # ThingSpeak REST wrapper
│     ├─ components/         # Header, MetricCard, Gauge, AppLineChart,
│     │                      # RelaySwitch, FaultBanner, Toast, StatusDot, Icons
│     └─ pages/              # Dashboard, History, Settings
└─ firmware/
   └─ INSTANT_ESP32S2/       # ESP32S2 Arduino sketch (ThingSpeak + EmonLib)
      └─ INSTANT_ESP32S2.ino
```

> No backend — the old Express/MQTT server was removed when the site moved to ThingSpeak.

---

## Getting started

### 1. Prerequisites

- Node.js **18+** (tested on 22)
- npm
- (optional) the ESP32S2 hardware + Arduino IDE / PlatformIO

### 2. Install & run

```bash
npm install          # installs the frontend deps
npm run dev          # starts the Create React App dev server on :3000
```

Open **http://localhost:3000**. No `.env` files, no keys to configure — the ThingSpeak channel
IDs and API keys are embedded in `frontend/src/api/client.js`.

### 3. Production build

```bash
npm run build        # builds frontend into frontend/build
npm run preview      # serves the build folder locally
```

The build is **portable**: copy `frontend/build` anywhere (or double-click `index.html`) — it
talks to ThingSpeak directly.

### 4. GitHub Pages

Pushing to GitHub runs `.github/workflows/deploy.yml`, which builds the frontend and publishes it
to your `github.io` site automatically:

1. Push this folder to a GitHub repository.
2. Repo **Settings → Pages → Source**: pick **"GitHub Actions"**.
3. On the next push the workflow deploys the site to
   `https://<your-user>.github.io/<repo-name>/`.

---

## Firmware (ESP32S2)

`firmware/INSTANT_ESP32S2/INSTANT_ESP32S2.ino` writes measurements to ThingSpeak and polls the
config channel for thresholds + relay commands.

**Libraries** (Arduino Library Manager):

- `EmonLib` by OpenEnergyMonitor
- WiFi / HTTP via the ESP32 core's built-in `WiFi.h` / `HTTPClient.h`

**Wiring / config:**

| Item                  | Value            |
| --------------------- | ---------------- |
| Voltage sensor        | ZMPT101B on pin 34 |
| Current sensor        | SCT-013 on pin 35 |
| Relay / LED           | pin 18           |
| Calibration           | `V_CAL`, `I_CAL`, `PHASE` |
| Relay polarity        | `RELAY_ACTIVE_LOW` |
| WiFi credentials      | `ssid`, `password` |
| Write cadence         | 15 s (`T_SEND`) |
| Config poll           | 10 s (`T_READ`) |

> If you use your own ThingSpeak account, update the channel IDs and keys in the sketch — and
> keep them in sync with `frontend/src/api/client.js`.

---

## API reference (ThingSpeak)

| Use                 | Endpoint                                             | Key            |
| ------------------- | ---------------------------------------------------- | -------------- |
| Latest reading      | `GET /channels/3428306/feeds/last.json`              | read `UIWSRR7X029RCD5V` |
| History             | `GET /channels/3428306/feeds.json?minutes=N`         | read `UIWSRR7X029RCD5V` |
| Config (thresholds) | `GET /channels/3428310/feeds/last.json`              | read `F54BNJ6PACIS3OKD` |
| Write config/relay  | `POST /update` (field1–4, form-encoded)              | write `K7TDWWD0WEQN97RR` |

---

## Relay toggle flow

1. User clicks the relay switch on the Dashboard.
2. The frontend optimistically flips the UI, then POSTs `field4 = 1/0` (plus the current
   thresholds) to the config channel.
3. The firmware polls the channel every 10 s, applies the command (respecting safety limits) and
   writes the resulting relay state to the measurement channel.
4. The next 20 s poll re-syncs the dashboard.

## Threshold flow

1. The app reads the current `vMax`/`iMax`/`pMax` from the config channel on every poll.
2. User edits thresholds in Settings → the app writes all fields back to the config channel.
3. The firmware picks up the new limits on its next poll; the fault banner recomputes against them.

---

## Security notes

- **Public demo**: the ThingSpeak API keys are embedded in the browser bundle, so anyone can read
  and write the channels. That is by design for this demo; the same keys already live in the
  deployed Streamlit app.
- For a real deployment, use **private ThingSpeak channels** and keep write keys server-side only.
- All settings inputs are validated in the UI before publishing.

---

## Troubleshooting

| Symptom                    | Fix                                                    |
| -------------------------- | ------------------------------------------------------ |
| Blank / white page         | Open the **built** `frontend/build/index.html` (or serve the build folder) — don't open `public/index.html`, which has no compiled JS |
| Header shows **Offline**   | The device isn't writing (or ThingSpeak is unreachable). The app still shows the last known data; check the ESP is powered and `ssid`/`password` are right |
| Gauges stay at 0           | Check the measurement channel has fresh feeds; voltage sensor wiring / calibration |
| Relay toggle has no effect| The config channel write failed (check the toast) or the firmware isn't running to apply it |
| Chart is empty             | The selected range has no stored feeds yet — pick a smaller range |

License: MIT
