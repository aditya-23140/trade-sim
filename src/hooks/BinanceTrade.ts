import { useEffect, useState, useRef } from "react";

export function useBinanceTradeWS(symbol: string, isFutures: boolean) {
  const [ltp, setLtp] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const closedByClientRef = useRef(false);

  useEffect(() => {
    if (!symbol) return;

    const connect = () => {
      closedByClientRef.current = false;
      const baseUrl = isFutures
        ? "wss://fstream.binance.com/ws"
        : "wss://stream.binance.com:9443/ws";
      const url = `${baseUrl}/${symbol.toLowerCase()}@trade`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const price = parseFloat(data.p);
          if (Number.isFinite(price)) {
            setLtp(price);
          }
        } catch (err) {
          console.error("WS parse error", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("WS error", err);
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closedByClientRef.current) {
          reconnectRef.current = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      closedByClientRef.current = true;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      wsRef.current?.close(1000, "client close");
      wsRef.current = null;
    };
  }, [symbol, isFutures]);

  return { ltp, connected };
}
