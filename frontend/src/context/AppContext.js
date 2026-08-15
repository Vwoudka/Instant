import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getLatest, getConfig, saveConfig } from '../api/client';

const AppContext = createContext(null);

const FRESH_MS = 3 * 60 * 1000; // readings older than 3 min => offline
const POLL_MS = 20000; // how often we poll ThingSpeak
const HISTORY_MS = 5 * 60 * 1000; // rolling chart window
const HISTORY_CAP = 300;
// ThingSpeak free tier allows ONE update per channel every 15 s. Writes that
// land sooner are rejected with HTTP 400, which made rapid relay clicks look
// like they "snapped back". Cooldown with a small margin so commands always go
// through, and let polls re-read the config for a while before trusting it.
const WRITE_COOLDOWN_MS = 16000;
const RELAY_GRACE_MS = 26000;

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
  relayCooldownUntil: 0,
};

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [theme, setTheme] = useState(() => localStorage.getItem('instant-theme') || 'dark');
  const [toasts, setToasts] = useState([]);

  // Latest state, readable from async callbacks without a stale closure.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Timestamp of the last config-channel write we attempted, so we can both
  // enforce the 15 s cooldown and ignore stale config reads right after a write.
  const lastWriteAtRef = useRef(0);

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
      const connected = !!(latest && Date.now() - latest.t < FRESH_MS);

      // Right after we publish a relay command the config read can still return
      // the old value (in-flight request or ThingSpeak latency). Trust our
      // optimistic state until the grace window has passed.
      const recentlyCommanded = Date.now() - lastWriteAtRef.current < RELAY_GRACE_MS;
      const relay = config && !recentlyCommanded ? config.relay : s.relay;

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

  // Optimistically flip the relay, then publish the command to ThingSpeak. The
  // free tier rejects a second update within 15 s, so clicks during the cooldown
  // are ignored (with a hint) instead of being silently lost or reverted.
  const toggleRelay = useCallback(async () => {
    const now = Date.now();
    const since = now - lastWriteAtRef.current;
    if (since < WRITE_COOLDOWN_MS) {
      notify('info', `ThingSpeak allows one config update per 15 s \u2014 retry in ${Math.ceil((WRITE_COOLDOWN_MS - since) / 1000)} s`);
      return;
    }

    const next = stateRef.current.relay === 'ON' ? 'OFF' : 'ON';
    lastWriteAtRef.current = now;
    setState((s) => ({ ...s, relay: next, relayCooldownUntil: now + WRITE_COOLDOWN_MS }));

    try {
      await saveConfig({
        vmax: stateRef.current.thresholds.vmax,
        imax: stateRef.current.thresholds.imax,
        pmax: stateRef.current.thresholds.pmax,
        relay: next,
      });
      // Keep the optimistic value — don't let a stale poll override it.
      setState((s) => ({ ...s, relay: next }));
      notify('success', `Relay command sent: ${next}`);
    } catch (err) {
      // Never guess after a failure: re-read what's actually stored so the UI
      // shows the truth instead of snapping to a stale value.
      let actual = next;
      try {
        const c = await getConfig();
        actual = c.relay;
      } catch (_) {
        /* keep optimistic value on sync failure */
      }
      setState((s) => ({ ...s, relay: actual }));
      notify('error', `${err.message || 'Failed to send relay command'} (1 update / 15 s limit)`);
    }
  }, [notify]);

  const saveThresholds = useCallback(
    async (payload) => {
      const now = Date.now();
      const since = now - lastWriteAtRef.current;
      if (since < WRITE_COOLDOWN_MS) {
        notify('info', `ThingSpeak allows one config update per 15 s \u2014 retry in ${Math.ceil((WRITE_COOLDOWN_MS - since) / 1000)} s`);
        return false;
      }
      lastWriteAtRef.current = now;

      try {
        await saveConfig({
          vmax: Number(payload.vmax),
          imax: Number(payload.imax),
          pmax: Number(payload.pmax),
          relay: payload.relay || stateRef.current.relay,
        });
        setState((s) => ({
          ...s,
          thresholds: {
            vmax: Number(payload.vmax),
            imax: Number(payload.imax),
            pmax: Number(payload.pmax),
          },
          relay: payload.relay || s.relay,
          relayCooldownUntil: now + WRITE_COOLDOWN_MS,
        }));
        notify('success', 'Thresholds published to ThingSpeak');
        return true;
      } catch (err) {
        notify('error', `${err.message || 'Failed to save thresholds'} (1 update / 15 s limit)`);
        return false;
      }
    },
    [notify]
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
