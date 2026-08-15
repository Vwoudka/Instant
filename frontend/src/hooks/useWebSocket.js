import { useEffect, useRef, useState } from 'react';
import { getWSURL } from '../api/client';

// Connects to the backend WebSocket and reconnects automatically with
// exponential backoff whenever the connection drops.
export default function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let ws = null;
    let timer = null;
    let closed = false;
    let retries = 0;

    const connect = () => {
      ws = new WebSocket(getWSURL());

      ws.onopen = () => {
        setConnected(true);
        retries = 0;
      };

      ws.onmessage = (e) => {
        try {
          onMessageRef.current(JSON.parse(e.data));
        } catch (_) {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          const delay = Math.min(1000 * 2 ** retries, 15000);
          timer = setTimeout(connect, delay);
          retries += 1;
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch (_) {
          /* ignore */
        }
      };
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch (_) {
        /* ignore */
      }
    };
  }, []);

  return connected;
}
