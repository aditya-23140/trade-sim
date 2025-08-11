"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickSeries,
} from "lightweight-charts";
import {
  fetchKlines,
  subscribeKlines,
  Candle,
  Interval,
  SymbolVolume,
  ExchangeInfoSymbol,
  Ticker24hr,
  SymbolWithIcon,
} from "./chartdata/binanceDatafeed";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

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

interface CustomDropdownProps {
  options: Interval[];
  value: string;
  onChange: (value: Interval) => void;
  className?: string;
}

export function CustomDropdown({
  options,
  value,
  onChange,
  className = "",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = value;

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
    >
      <button
        type="button"
        className="px-3 py-2 rounded-md bg-black text-white cursor-pointer w-full text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedLabel}
        <span className="inline-block ml-2">&#9662;</span>
      </button>

      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-black text-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {options.map((option) => (
            <li
              key={option}
              className={`cursor-pointer px-3 py-2 hover:bg-gray-700 ${
                option === value ? "bg-gray-800 font-semibold" : ""
              }`}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SymbolDropdown({
  symbolsList,
  symbol,
  symbolIMG,
  setSymbolIMG,
  setSymbol,
  formatVolume,
}: {
  symbolsList: SymbolWithIcon[];
  symbol: string;
  symbolIMG: string;
  setSymbolIMG: (s: string) => void;
  setSymbol: (s: string) => void;
  formatVolume: (v: number) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm 
                   flex items-center justify-between gap-2 min-w-[160px]
                   hover:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
      >
        <div className="flex items-center gap-2">
          <Image
            src={symbolIMG}
            alt={symbol}
            width={20}
            height={20}
            className="rounded-full"
          />
          <span className="text-gray-200 font-medium">{symbol}</span>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-[65px] mt-2 w-[220px] bg-gray-900 border border-gray-700 
                     rounded-lg shadow-lg overflow-hidden z-50 max-h-64 overflow-y-auto"
        >
          {symbolsList.map((s) => (
            <div
              key={s.symbol}
              onClick={() => {
                setSymbol(s.symbol + "USDT");
                setSymbolIMG(s.icon!);
                setIsOpen(false);
              }}
              className="px-4 py-2 flex justify-between items-center cursor-pointer 
                         hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Image
                  src={s.icon!}
                  alt={s.symbol}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-gray-200 font-medium">{s.symbol}</span>
              </div>
              <span className="text-gray-400 text-xs">
                Vol: {formatVolume(parseInt(s.quoteVolume.toFixed(0)))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

export default function CustomBinance() {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [interval, setInterval] = useState<Interval>("1m");
  const wsSubscriptionRef = useRef<{ close: () => void } | null>(null);
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

  // create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "#0f0f0f" },
        textColor: "#ddd",
      },
      grid: {
        vertLines: { color: "rgba(242,242,242,0.04)" },
        horzLines: { color: "rgba(242,242,242,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(160,160,160,0.2)" },
      timeScale: { borderColor: "rgba(160,160,160,0.2)" },
      localization: { dateFormat: "yyyy-MM-dd" },
    });

    chartRef.current = chart;
    // Use the modern, type-safe addCandlestickSeries method
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    candleSeriesRef.current = candleSeries;

    // resize observer
    const ro = new ResizeObserver(() => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.resize(
        chartContainerRef.current.clientWidth,
        chartContainerRef.current.clientHeight
      );
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      if (wsSubscriptionRef.current) wsSubscriptionRef.current.close();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  // load data & subscribe whenever symbol or interval changes
  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!candleSeriesRef.current) return;
      // stop previous ws
      if (wsSubscriptionRef.current) {
        wsSubscriptionRef.current.close();
        wsSubscriptionRef.current = null;
      }

      try {
        const history = await fetchKlines(symbol, interval, 500);
        if (cancelled) return;
        if (!candleSeriesRef.current) return;
        // map to lightweight-charts format
        const bars = history.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        // set initial data
        candleSeriesRef.current.setData(bars);

        let lastCandleTime = 0;
        // subscribe live updates
        wsSubscriptionRef.current = subscribeKlines(
          symbol,
          interval,
          (candle: Candle) => {
            // The `isFinal` parameter is not needed
            if (!candleSeriesRef.current) return;

            if (candle.time < lastCandleTime) {
              return; // ignore older candle
            }

            lastCandleTime = candle.time;

            // ✅ CORRECT: Use the library's `update` method.
            // This is the only code needed. It efficiently updates the last
            // candle or appends a new one without relying on stale variables.
            candleSeriesRef.current.update({
              time: candle.time as UTCTimestamp,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            });
          }
        );
      } catch (err) {
        console.error("load/subscribe error", err);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (wsSubscriptionRef.current) {
        wsSubscriptionRef.current.close();
        wsSubscriptionRef.current = null;
      }
    };
  }, [symbol, interval]);

  return (
    <main className="md:h-full h-[100%] w-full mx-auto bg-[#0f0f0f00] rounded-2xl text-white flex flex-col">
      <div ref={chartContainerRef} className="w-full h-[96%] mt-auto" />
      <div className="absolute top-0 right-2 flex gap-4 mt-2">
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
          value={interval}
          onChange={setInterval}
        />
      </div>
    </main>
  );
}
