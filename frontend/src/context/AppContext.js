import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { getThresholds, postRelay, postThresholds } from '../api/client';

const AppContext = createContext(null);

const initialState = {
  voltage: 0,
  current: 0,
  power: 0,
  pf: 0,
  relay: 'OFF',
  fault: null,
  connected: false,
  demoMode: false,
  lastUpdated: null,
  history: [], // last 5 minutes, capped at 300 points
  thresholds: { vmax: 240, imax: 10, pmax: 2000 },
  thresholdsSource: 'local',
  relayLog: [],
};

// Processes one streamed message (snapshot / incremental data / status). Also
// used by the built-in simulator so the UI behaves identically in both modes.
function makeReducer() {
  return (msg, setState) => {
    if (msg.type === 'snapshot') {
      setState((s) => ({
        ...s,
        ...msg.data,
        history: (msg.data.history || [])
          .filter((p) => p.t > Date.now() - 5 * 60 * 1000)
          .slice(-300),
      }));
    } else if (msg.type === 'data') {
      setState((s) => {
        const { history: _omit, ...rest } = msg.data;
        const point = {
          t: Date.now(),
          voltage: rest.voltage ?? s.voltage,
          current: rest.current ?? s.current,
          power: rest.power ?? s.power,
          pf: rest.pf ?? s.pf,
        };
        const history = [...s.history, point]
          .filter((p) => p.t > Date.now() - 5 * 60 * 1000)
          .slice(-300);
        return { ...s, ...rest, history };
      });
    } else if (msg.type === 'status') {
      setState((s) => ({ ...s, connected: msg.connected, demoMode: !!msg.demo }));
    }
  };
}

const reduce = makeReducer();

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [theme, setTheme] = useState(() => localStorage.getItem('instant-theme') || 'dark');
  const [toasts, setToasts] = useState([]);
  const [localDemo, setLocalDemo] = useState(false);

  // Real-time stream from the backend WebSocket.
  const applyMessage = useCallback((msg) => reduce(msg, setState), []);
  const connected = useWebSocket(applyMessage);
  const connectedRef = useRef(connected);
  connectedRef.current = connected;

  const notify = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // If the backend is completely unreachable (e.g. static GitHub Pages or the
  // user opened the build straight from disk), fall back to a built-in browser
  // simulator so the dashboard still comes alive.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!connectedRef.current) setLocalDemo(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // If the backend becomes reachable later, drop back to the live stream.
  useEffect(() => {
    if (connected && localDemo) setLocalDemo(false);
  }, [connected, localDemo]);

  // Local demo simulator — mirrors the backend DEMO_MODE behaviour, but runs
  // entirely inside the browser.
  useEffect(() => {
    if (!localDemo) return undefined;

    let voltage = 229;
    let current = 4.1;

    // Seed the chart with the last minute so it is not empty on first paint.
    const seed = [];
    const now = Date.now();
    for (let i = 60; i >= 1; i--) {
      seed.push({
        t: now - i * 2000,
        voltage: 229 + (Math.random() - 0.5) * 4,
        current: 4 + (Math.random() - 0.5) * 1.2,
        power: 900 + (Math.random() - 0.5) * 160,
        pf: 0.9 + (Math.random() - 0.5) * 0.06,
      });
    }

    setState((s) => ({
      ...s,
      connected: true,
      demoMode: true,
      history: [...seed, ...s.history].slice(-300),
    }));

    const emit = () => {
      voltage = Math.max(205, Math.min(248, voltage + (Math.random() - 0.5) * 5));
      current = Math.max(0.3, Math.min(14, current + (Math.random() - 0.5) * 1.4));
      const power = Math.max(40, voltage * current * (0.82 + Math.random() * 0.18));
      const pf = Math.min(0.98, Math.max(0.62, 0.88 + (Math.random() - 0.5) * 0.1));
      applyMessage({
        type: 'data',
        data: {
          voltage: Math.round(voltage * 10) / 10,
          current: Math.round(current * 100) / 100,
          power: Math.round(power * 10) / 10,
          pf: Math.round(pf * 100) / 100,
          fault: voltage > 245 || current > 9 || power > 2200 ? 'Safety limit exceeded' : null,
          lastUpdated: new Date().toISOString(),
        },
      });
    };

    emit();
    const interval = setInterval(emit, 2000);
    return () => clearInterval(interval);
  }, [localDemo, applyMessage]);

  // Load thresholds (+ relay default) from the backend on startup.
  useEffect(() => {
    getThresholds()
      .then((t) => {
        setState((s) => ({
          ...s,
          thresholds: { vmax: t.vmax, imax: t.imax, pmax: t.pmax },
          relay: t.relay || s.relay,
          thresholdsSource: t.source || 'local',
        }));
      })
      .catch(() => {
        /* backend not reachable yet — live data still streams via WS */
      });
  }, []);

  // Optimistically flip the relay, publish over MQTT via the backend. In local
  // demo mode the relay just flips locally.
  const toggleRelay = useCallback(async () => {
    const next = state.relay === 'ON' ? 'OFF' : 'ON';
    const prev = state.relay;
    setState((s) => ({ ...s, relay: next }));
    if (localDemo) {
      notify('success', `Relay switched ${next} (demo)`);
      return;
    }
    try {
      await postRelay(next);
      notify('success', `Relay switched ${next}`);
    } catch (err) {
      setState((s) => ({ ...s, relay: prev }));
      notify('error', err.message || 'Failed to toggle relay');
    }
  }, [state.relay, localDemo, notify]);

  const saveThresholds = useCallback(
    async (payload) => {
      if (localDemo) {
        setState((s) => ({
          ...s,
          thresholds: {
            vmax: Number(payload.vmax),
            imax: Number(payload.imax),
            pmax: Number(payload.pmax),
          },
          relay: payload.relay || s.relay,
        }));
        notify('success', 'Thresholds saved (demo)');
        return true;
      }
      try {
        const res = await postThresholds(payload);
        setState((s) => ({
          ...s,
          thresholds: { vmax: res.vmax, imax: res.imax, pmax: res.pmax },
          relay: res.relay || s.relay,
        }));
        notify('success', 'Thresholds published over MQTT');
        return true;
      } catch (err) {
        notify('error', err.message || 'Failed to save thresholds');
        return false;
      }
    },
    [localDemo, notify]
  );

  const resetFault = useCallback(() => {
    setState((s) => ({ ...s, fault: null }));
    notify('info', 'Fault indicator cleared');
  }, [notify]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('instant-theme', next);
      return next;
    });
  }, []);

  const value = {
    state,
    connected, // WebSocket link status
    localDemo,
    theme,
    toasts,
    notify,
    dismissToast,
    toggleRelay,
    saveThresholds,
    resetFault,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
