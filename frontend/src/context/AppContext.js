import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getLatest, getConfig, saveConfig } from '../api/client';

const AppContext = createContext(null);

const FRESH_MS = 3 * 60 * 1000; // readings older than 3 min => offline
const POLL_MS = 20000; // ThingSpeak free tier writes ~every 15 s
const HISTORY_MS = 5 * 60 * 1000; // rolling chart window
const HISTORY_CAP = 300;

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
  history: [],
  thresholds: { vmax: 240, imax: 15, pmax: 3000 },
  thresholdsSource: 'thingspeak',
  relayLog: [],
};

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [theme, setTheme] = useState(() => localStorage.getItem('instant-theme') || 'dark');
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // Poll ThingSpeak on an interval; merge the latest reading + config into state
  // and flag the stream online/offline based on data freshness.
  const poll = useCallback(async () => {
    let latest = null;
    let config = null;
    try {
      latest = await getLatest();
    } catch (_) {
      /* ThingSpeak unreachable -> offline */
    }
    try {
      config = await getConfig();
    } catch (_) {
      /* keep previous config */
    }

    setState((s) => {
      const thresholds = config
        ? { vmax: config.vmax, imax: config.imax, pmax: config.pmax }
        : s.thresholds;
      const relay = config ? config.relay : s.relay;
      const connected = !!(latest && Date.now() - latest.t < FRESH_MS);

      const base = {
        ...s,
        thresholds,
        thresholdsSource: 'thingspeak',
        relay,
        connected,
        demoMode: false,
      };
      if (!latest) return base;

      const point = { t: latest.t, voltage: latest.voltage, current: latest.current, power: latest.power, pf: latest.pf };
      const last = s.history.length ? s.history[s.history.length - 1] : null;
      const history =
        last && last.t === latest.t
          ? s.history
          : [...s.history, point]
              .filter((p) => p.t > Date.now() - HISTORY_MS)
              .slice(-HISTORY_CAP);

      const exceeded =
        latest.voltage > thresholds.vmax ||
        latest.current > thresholds.imax ||
        latest.power > thresholds.pmax;

      return {
        ...base,
        voltage: latest.voltage,
        current: latest.current,
        power: latest.power,
        pf: latest.pf,
        lastUpdated: latest.lastUpdated,
        history,
        fault: exceeded ? 'Safety limit exceeded' : null,
      };
    });
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  // Optimistically flip the relay, publish the command to ThingSpeak. The
  // firmware picks it up within ~10 s; the next poll reflects the result.
  const toggleRelay = useCallback(async () => {
    const next = state.relay === 'ON' ? 'OFF' : 'ON';
    const prev = state.relay;
    setState((s) => ({ ...s, relay: next }));
    try {
      await saveConfig({
        vmax: state.thresholds.vmax,
        imax: state.thresholds.imax,
        pmax: state.thresholds.pmax,
        relay: next,
      });
      notify('success', `Relay command sent: ${next}`);
    } catch (err) {
      setState((s) => ({ ...s, relay: prev }));
      notify('error', err.message || 'Failed to send relay command');
    }
  }, [state.relay, state.thresholds, notify]);

  const saveThresholds = useCallback(
    async (payload) => {
      try {
        await saveConfig({
          vmax: Number(payload.vmax),
          imax: Number(payload.imax),
          pmax: Number(payload.pmax),
          relay: payload.relay || state.relay,
        });
        setState((s) => ({
          ...s,
          thresholds: {
            vmax: Number(payload.vmax),
            imax: Number(payload.imax),
            pmax: Number(payload.pmax),
          },
          relay: payload.relay || s.relay,
        }));
        notify('success', 'Thresholds published to ThingSpeak');
        return true;
      } catch (err) {
        notify('error', err.message || 'Failed to save thresholds');
        return false;
      }
    },
    [state.relay, notify]
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
    connected: state.connected,
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
