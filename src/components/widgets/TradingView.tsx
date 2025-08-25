"use client";

import React, { useEffect, useRef, useState, memo } from "react";
import { CustomDropdown, SymbolDropdown } from "./CustomBinance";

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

type Interval =
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

interface SymbolVolume {
  symbol: string;
  quoteVolume: number;
}

interface SymbolWithIcon extends SymbolVolume {
  icon?: string;
}

const DEFAULT_SYMBOL = "BTCUSDT";

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

const INTERVALS: Interval[] = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "12h",
  "1d",
  "1w",
  "1M",
];

// TradingView interval mapping - using exact format from official docs
const TRADINGVIEW_INTERVALS: Record<string, string> = {
  "1m": "1",
  "3m": "3",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "2h": "120",
  "4h": "240",
  "6h": "360",
  "12h": "720",
  "1d": "D",
  "1w": "W",
  "1M": "M",
};

const TradingViewWidget = memo(() => {
  const container = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [hideToolbar, setHideToolbar] = useState(true);
  const [time, setTime] = useState("1h");
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [symbolsList, setSymbolsList] = useState<SymbolWithIcon[]>([]);
  const [symbolIMG, setSymbolIMG] = useState(
    "https://cryptocurrencyliveprices.com/img/btc-bitcoin.png"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbolsAndVolumes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [exchangeInfoRes, tickerRes] = await Promise.all([
          fetch("https://api.binance.com/api/v3/exchangeInfo"),
          fetch("https://api.binance.com/api/v3/ticker/24hr"),
        ]);

        if (!exchangeInfoRes.ok || !tickerRes.ok) {
          throw new Error("Failed to fetch market data");
        }

        const exchangeInfo = await exchangeInfoRes.json();
        const tickers = await tickerRes.json();

        const usdtPairs: string[] = exchangeInfo.symbols
          .filter(
            (s: ExchangeInfoSymbol) =>
              s.symbol.endsWith("USDT") && s.status === "TRADING"
          )
          .map((s: ExchangeInfoSymbol) => s.symbol);

        const symbolsWithVolume: SymbolVolume[] = tickers
          .filter((t: Ticker24hr) => usdtPairs.includes(t.symbol))
          .map((t: Ticker24hr) => ({
            symbol: t.symbol.replace("USDT", ""),
            quoteVolume: parseFloat(t.quoteVolume),
          }));

        symbolsWithVolume.sort((a, b) => b.quoteVolume - a.quoteVolume);

        try {
          const cpRes = await fetch("https://api.coinpaprika.com/v1/coins");
          const cpCoins = await cpRes.json();

          const cpMap: Record<string, string> = {};
          cpCoins.forEach((coin: { id: string; symbol: string }) => {
            if (!cpMap[coin.symbol.toLowerCase()]) {
              cpMap[coin.symbol.toLowerCase()] = coin.id;
            }
          });

          const finalList: SymbolWithIcon[] = symbolsWithVolume.map((item) => {
            const slug = cpMap[item.symbol.toLowerCase()];
            const iconUrl = slug
              ? `https://cryptocurrencyliveprices.com/img/${slug}.png`
              : "/edit.png";
            return {
              ...item,
              icon: iconUrl,
            };
          });

          setSymbolsList(finalList);
        } catch (iconError) {
          console.warn("Failed to fetch coin icons:", iconError);
          setSymbolsList(
            symbolsWithVolume.map((item) => ({ ...item, icon: "/edit.png" }))
          );
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch symbols/volumes", err);
        setError(
          err instanceof Error ? err.message : "Failed to load market data"
        );
        setIsLoading(false);
      }
    };

    fetchSymbolsAndVolumes();
  }, []);

  useEffect(() => {
    if (!container.current) return;

    // Remove existing script if it exists
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }

    // Clear container completely
    container.current.innerHTML = "";

    // Create widget container div
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)";
    widgetDiv.style.width = "100%";

    // Create copyright div
    // const copyrightDiv = document.createElement("div");
    // copyrightDiv.className = "tradingview-widget-copyright";
    // copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/symbols/BINANCE-${symbol}/?exchange=BINANCE" rel="noopener nofollow" target="_blank"><span class="blue-text">${symbol} chart by TradingView</span></a>`;

    // Add divs to container
    container.current.appendChild(widgetDiv);
    // container.current.appendChild(copyrightDiv);

    // Create script with minimal configuration - remove problematic properties
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const tvInterval = TRADINGVIEW_INTERVALS[time] || "60";
    const tvSymbol = `BINANCE:${symbol}`;

    // Minimal configuration to avoid validation errors
    const config = {
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      hide_top_toolbar: true,
      hide_side_toolbar: hideToolbar,
      save_image: false,
      autosize: true,
    };

    script.innerHTML = JSON.stringify(config);
    scriptRef.current = script;

    // Error handling
    script.onerror = (e) => {
      console.error("Script loading error:", e);
      setError("Failed to load TradingView widget script");
    };

    // Add script to container
    container.current.appendChild(script);

    // Cleanup function
    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
    };
  }, [hideToolbar, symbol, time]);

  const handleSymbolChange = (newSymbol: string) => {
    const cleanSymbol = newSymbol.replace("BINANCE:", "");
    const finalSymbol = cleanSymbol.endsWith("USDT")
      ? cleanSymbol
      : `${cleanSymbol}USDT`;
    setSymbol(finalSymbol);
  };

  if (error && !isLoading) {
    return (
      <main className="h-full w-full relative pt-6 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p>Error: {error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full w-full relative pt-6">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white">Loading market data...</div>
        </div>
      )}

      <div
        className="tradingview-widget-container"
        ref={container}
        style={{ height: "100%", width: "100%" }}
      />

      <button
        className={`p-2 bg-[#000000df] text-gray-400 cursor-pointer rounded-md absolute bottom-10 transition duration-100 z-20 ${
          hideToolbar ? "left-2" : "left-14"
        }`}
        onClick={() => setHideToolbar(!hideToolbar)}
      >
        {hideToolbar ? ">" : "<"}
      </button>

      <div className="absolute -top-8 right-0 flex gap-4 mt-2 z-20">
        <div className="flex items-center gap-2">
          <SymbolDropdown
            symbolsList={symbolsList}
            symbol={symbol.replace("USDT", "")}
            symbolIMG={symbolIMG}
            setSymbolIMG={setSymbolIMG}
            setSymbol={handleSymbolChange}
            formatVolume={formatVolume}
          />
        </div>
        <CustomDropdown options={INTERVALS} value={time} onChange={setTime} />
      </div>
    </main>
  );
});

TradingViewWidget.displayName = "TradingViewWidget";

export default TradingViewWidget;
