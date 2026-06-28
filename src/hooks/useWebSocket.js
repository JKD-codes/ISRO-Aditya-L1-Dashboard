import { useState, useEffect, useRef, useCallback } from 'react';
import useMLStore from '../store/useMLStore';

const WS_URL = 'ws://localhost:8000/ws/realtime';

export const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);
  const backoff = useRef(1000);
  const maxBackoff = 30000;
  
  const lastPingTime = useRef(Date.now());

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      setConnected(true);
      useMLStore.getState().setWsConnected(true);
      backoff.current = 1000; // Reset backoff

      // Send ping every 20 seconds
      pingInterval.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          lastPingTime.current = Date.now();
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.current.onmessage = (event) => {
      setLastMessage(event.data);
      
      try {
        const data = JSON.parse(event.data);
        
        // Handle latency calculation from pong
        if (data.type === 'pong' || data.pong) {
          setLatency(Date.now() - lastPingTime.current);
          return;
        }

        const store = useMLStore.getState();
        
        // Update solexsLive if data is present
        if (data.solexsLive) {
          const newData = Array.isArray(data.solexsLive) ? data.solexsLive : [data.solexsLive];
          const processedSolexs = newData.map(item => ({
            ...item,
            flux_log: item.flux > 0 ? Math.log10(item.flux) : 0
          }));
          
          useMLStore.setState({ 
            // Append and keep the latest 150 points for example
            solexsLive: [...store.solexsLive, ...processedSolexs].slice(-150) 
          });
        }
        
        // Update heliosLive if data is present
        if (data.heliosLive) {
          const newData = Array.isArray(data.heliosLive) ? data.heliosLive : [data.heliosLive];
          useMLStore.setState({ 
            heliosLive: [...store.heliosLive, ...newData].slice(-150) 
          });
        }
      } catch (err) {
        console.error('Error parsing WebSocket message', err);
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
      useMLStore.getState().setWsConnected(false);
      clearInterval(pingInterval.current);
      
      // Auto-reconnect with exponential backoff (1s, 2s, 4s... up to 30s)
      reconnectTimeout.current = setTimeout(() => {
        backoff.current = Math.min(backoff.current * 2, maxBackoff);
        connect();
      }, backoff.current);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
      ws.current.close();
    };
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      clearTimeout(reconnectTimeout.current);
      clearInterval(pingInterval.current);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return { connected, latency, lastMessage };
};

export default useWebSocket;
