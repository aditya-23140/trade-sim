"use client";

import React, { useEffect, useRef, useState } from "react";

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

const timeList = ["1m", "5m", "15m", "30m", "1H", "2H", "4H", "1D", "1W", "1M"];

const TradingView = () => {
  const container = useRef<HTMLDivElement>(null);
  const [hideToolbar, setHideToolbar] = useState(false);
  const [symbol, setSymbol] = useState("SOLUSDT");
  const [time, setTime] = useState("2H");
  const [symbolsList, setSymbolsList] = useState<SymbolVolume[]>([]);

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

  useEffect(() => {
    if (!container.current) return;

    // Clear existing widget content before adding new script
    container.current.innerHTML = `
      <div class="tradingview-widget-container__widget" style="height: 100%; width: 100%;"></div>
    `;

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "allow_symbol_change": true,
        "calendar": false,
        "details": false,
        "hide_side_toolbar": ${hideToolbar},
        "hide_top_toolbar": true,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "${time}",
        "locale": "en",
        "save_image": true,
        "style": "1",
        "symbol": "${symbol}",
        "theme": "dark",
        "timezone": "Etc/UTC",
        "backgroundColor": "#0F0F0F",
        "gridColor": "rgba(242, 242, 242, 0.06)",
        "watchlist": [],
        "withdateranges": false,
        "compareSymbols": [],
        "studies": [],
        "autosize": true
      }`;
    container.current.appendChild(script);
  }, [hideToolbar, symbol, time]);

  return (
    <main className="h-full w-full relative pt-6">
      <div ref={container} className="tradingview-widget-container"></div>
      <button
        className={`p-2 bg-[#000000df] text-gray-400 cursor-pointer rounded-md absolute bottom-2 transition duration-100 ${
          hideToolbar ? "left-2" : "left-14"
        }`}
        onClick={() => setHideToolbar(!hideToolbar)}
      >
        {hideToolbar ? ">" : "<"}
      </button>
      <div className="absolute -top-8 flex gap-4 mt-2">
        <select
          id="symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="px-3 py-2 rounded-md bg-black  text-white cursor-pointer focus:outline-none"
        >
          {symbolsList.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} — Vol:{" "}
              {formatVolume(parseInt(s.quoteVolume.toFixed(0)))}
            </option>
          ))}
        </select>
        <select
          id="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 rounded-md bg-black  text-white cursor-pointer focus:outline-none"
        >
          {timeList.map((s, index) => (
            <option key={index} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </main>
  );
};

export default TradingView;
