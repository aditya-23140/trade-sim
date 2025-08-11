"use client";

import React, { useEffect, useRef, useState } from "react";

interface TradeEvent {
  e: string;
  E: number;
  s: string;
  t: number;
  p: string;
  q: string;
  T: number;
  m: boolean;
  M: boolean;
}

interface ExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

interface Ticker24hr {
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

interface SymbolVolume {
  symbol: string;
  quoteVolume: number;
}

const formatVolume = (value: number): string => {
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(2) + "B";
  } else if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(2) + "M";
  } else if (value >= 1_000) {
    return (value / 1_000).toFixed(2) + "K";
  } else {
    return value.toString();
  }
};

export default function Page() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [symbolsList, setSymbolsList] = useState<SymbolVolume[]>([]);
  const [latestPrice, setLatestPrice] = useState<string>("0");
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch symbols sorted by volume
  useEffect(() => {
    const fetchSymbolsAndVolumes = async () => {
      try {
        const [exchangeInfoRes, tickerRes] = await Promise.all([
          fetch("https://api.binance.com/api/v3/exchangeInfo"),
          fetch("https://api.binance.com/api/v3/ticker/24hr"),
        ]);

        const exchangeInfo = await exchangeInfoRes.json();
        const tickers = await tickerRes.json();

        // Filter USDT pairs from exchangeInfo
        const usdtPairs: string[] = exchangeInfo.symbols
          .filter((s: ExchangeInfoSymbol) => s.symbol.endsWith("USDT"))
          .map((s: ExchangeInfoSymbol) => s.symbol);

        // Map volume info and filter for only USDT pairs
        const symbolsWithVolume: SymbolVolume[] = tickers
          .filter((t: Ticker24hr) => usdtPairs.includes(t.symbol))
          .map((t: Ticker24hr) => ({
            symbol: t.symbol,
            quoteVolume: parseFloat(t.quoteVolume),
          }));

        // Sort by volume descending
        symbolsWithVolume.sort((a, b) => b.quoteVolume - a.quoteVolume);

        setSymbolsList(symbolsWithVolume);
      } catch (err) {
        console.error("Failed to fetch symbols/volumes", err);
      }
    };

    fetchSymbolsAndVolumes();
  }, []);

  const connectWebSocket = (sym: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const url = `wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@trade`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const trade: TradeEvent = JSON.parse(event.data);
      setLatestPrice(trade.p);
      setTrades((prev) => [trade, ...prev].slice(0, 20));
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      console.error("Was socket open?", ws.readyState);
    };
  };

  useEffect(() => {
    connectWebSocket(symbol);
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [symbol]);

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString();

  return (
    <div className="min-h-screen w-[80%] mx-auto bg-gray-900 text-white p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">
        Binance Real-Time Trade Tracker
      </h1>

      <div className="flex items-center gap-4 mb-6">
        <label htmlFor="symbol" className="font-medium">
          Symbol:
        </label>
        <select
          id="symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {symbolsList.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} — Vol:{" "}
              {formatVolume(parseInt(s.quoteVolume.toFixed(0)))}
            </option>
          ))}
        </select>
      </div>

      {/* Current Price */}
      <div className="mb-6">
        <span className="text-lg text-gray-300">Current Price:</span>{" "}
        <span className="text-2xl font-bold text-yellow-400">
          {parseFloat(latestPrice).toFixed(2)}
        </span>{" "}
        <span className="text-sm text-gray-400">USDT</span>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto rounded-lg shadow-lg bg-gray-800 bg-opacity-90 backdrop-blur-sm">
        <table className="w-full border-collapse">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Time
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Price (USDT)
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Amount (USDT)
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Maker Side
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade: TradeEvent) => (
              <tr
                key={trade.t}
                className="hover:bg-gray-700 transition-colors duration-200"
              >
                <td className="px-4 py-2 text-sm text-gray-300">
                  {formatTime(trade.T)}
                </td>
                <td className="px-4 py-2 text-sm font-semibold text-blue-400">
                  {parseFloat(trade.p)}
                </td>
                <td className="px-4 py-2 text-sm text-gray-300">
                  {(parseFloat(trade.q) * parseFloat(trade.p)).toFixed(2)}
                </td>
                <td
                  className={`px-4 py-2 text-sm font-bold ${
                    trade.m ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {trade.m ? "SELL" : "BUY"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
