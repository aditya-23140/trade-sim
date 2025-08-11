// app/trading/chartData/binanceDatafeed.ts
// TypeScript module that provides history & websocket subscription helpers for Binance klines.

export type Interval =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "6h"
  | "12h"
  | "1d"
  | "1w"
  | "1M";

export interface SymbolVolume {
  symbol: string;
  quoteVolume: number;
}

export interface SymbolWithIcon extends SymbolVolume {
  icon?: string;
}

export interface ExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

export interface Ticker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type BinanceKline = [
  number, // Open time (ms)
  string, // Open
  string, // High
  string, // Low
  string, // Close
  string, // Volume
  number, // Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string // Ignore
];

const BINANCE_REST = "https://api.binance.com/api/v3/klines";

export async function fetchKlines(
  symbol = "BTCUSDT",
  interval: Interval = "1m",
  limit = 500
): Promise<Candle[]> {
  const url = `${BINANCE_REST}?symbol=${encodeURIComponent(
    symbol
  )}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch klines: ${res.status}`);
  const data = await res.json();
  // Each candle: [ Open time, Open, High, Low, Close, Volume, ... ]
  return data.map((c: BinanceKline) => ({
    time: Math.floor(c[0] / 1000), // convert ms -> seconds
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

/**
 * Subscribe to Binance websocket kline stream for a given symbol and interval.
 * onUpdate receives either a partial (in-progress) candle or a closed candle.
 * Returns an object with `close()` to stop the subscription.
 */
export function subscribeKlines(
  symbol = "BTCUSDT",
  interval: Interval = "1m",
  onUpdate: (candle: Candle, isFinal: boolean) => void
) {
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;

  const connect = () => {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.info("Binance WS open", url);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (!msg.k) return;
        const k = msg.k;
        const candle: Candle = {
          time: Math.floor(k.t / 1000),
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
        };
        const isFinal = k.x === true; // candle closed
        onUpdate(candle, isFinal);
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    ws.onerror = (e) => {
      console.error("Binance WS error", e);
    };

    ws.onclose = (ev) => {
      console.warn("Binance WS closed", ev.code, ev.reason);
      // Auto-reconnect unless normal close (code 1000)
      if (ev.code !== 1000) {
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 3000);
      }
    };
  };

  connect();

  return {
    close: () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
      ) {
        ws.close(1000, "Manual close");
      }
    },
  };
}  
