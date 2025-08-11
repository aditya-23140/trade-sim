"use client";

import React, { useEffect, useRef, useState } from "react";
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

const TradingView = () => {
  const container = useRef<HTMLDivElement>(null);
  const [hideToolbar, setHideToolbar] = useState(false);
  const [time, setTime] = useState("2H");
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [symbolsList, setSymbolsList] = useState<SymbolWithIcon[]>([]);
  const [symbolIMG, setSymbolIMG] = useState(
    "https://cryptocurrencyliveprices.com/img/btc-bitcoin.png"
  );

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
            symbol: t.symbol.replace("USDT", ""),
            quoteVolume: parseFloat(t.quoteVolume),
          }));

        // Sort by volume descending
        symbolsWithVolume.sort((a, b) => b.quoteVolume - a.quoteVolume);
        const cpRes = await fetch("https://api.coinpaprika.com/v1/coins");
        const cpCoins = await cpRes.json();

        // 3. Build symbol to id map (symbol in lowercase)
        const cpMap: Record<string, string> = {};
        cpCoins.forEach((coin: { id: string; symbol: string }) => {
          if (!cpMap[coin.symbol.toLowerCase()]) {
            cpMap[coin.symbol.toLowerCase()] = coin.id;
          }
        });

        // 4. Build final list with icon URLs
        const finalList: SymbolWithIcon[] = symbolsWithVolume.map((item) => {
          const slug = cpMap[item.symbol.toLowerCase()];
          // Coinpaprika icons URL format:
          // https://coinpaprika.com/images/coins/{slug}.png
          // slug example: btc-bitcoin
          const iconUrl = slug
            ? `https://cryptocurrencyliveprices.com/img/${slug}.png`
            : "/edit.png";
          return {
            ...item,
            icon: iconUrl,
          };
        });

        setSymbolsList(finalList);
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
      <div className="absolute -top-8 right-0 flex gap-4 mt-2">
        <div className="flex items-center gap-2">
          <SymbolDropdown
            symbolsList={symbolsList}
            symbol={symbol}
            symbolIMG={symbolIMG}
            setSymbolIMG={setSymbolIMG}
            setSymbol={setSymbol}
            formatVolume={formatVolume}
          />
        </div>
        <CustomDropdown
          options={INTERVALS}
          value={time}
          onChange={setTime}
        />
      </div>
    </main>
  );
};

export default TradingView;
