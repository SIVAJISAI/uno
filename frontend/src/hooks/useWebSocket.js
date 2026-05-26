import { useEffect, useRef, useState } from 'react';

const createWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

export default function useWebSocket(onMessage) {
  const socketRef = useRef(null);
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    const wsUrl = createWebSocketUrl();
    console.log('[WS] connecting to', wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      console.log('[WS] connected');
      setSocketReady(true);
    });

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[WS] received', message);
        onMessage(message);
      } catch (error) {
        console.error('[WS] invalid server message', error, event.data);
      }
    });

    socket.addEventListener('close', (event) => {
      console.log('[WS] closed', event.code, event.reason);
      setSocketReady(false);
    });

    socket.addEventListener('error', (event) => {
      console.error('[WS] error', event);
      setSocketReady(false);
    });

    return () => {
      socket.close();
    };
  }, [onMessage]);

  const sendMessage = (type, payload = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = { type, payload };
      console.log('[WS] send', message);
      socketRef.current.send(JSON.stringify(message));
    }
  };

  return { socketReady, sendMessage };
}
