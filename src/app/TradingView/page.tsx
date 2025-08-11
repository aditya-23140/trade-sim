"use client";

import React, { useEffect, useRef, useState } from "react";

const Page = () => {
  const container = useRef<HTMLDivElement>(null);
  const [hideToolbar, setHideToolbar] = useState(false);
  const [symbol, setSymbol] = useState("NASDAQ:AAPL");

  useEffect(() => {
    if (!container.current) return;

    // Clear existing widget content before adding new script
    container.current.innerHTML = `
      <div class="tradingview-widget-container__widget" style="height: calc(100% - 32px); width: 100%;"></div>
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
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "H",
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
  }, [hideToolbar, symbol]);

  return (
    <main className="h-screen w-full pl-18 pr-4 py-8">
      <div ref={container} className="tradingview-widget-container"></div>

      <button
        onClick={() => setHideToolbar((prev) => !prev)}
        className="relative top-4 right-4 bg-gray-500 text-white px-4 py-2 rounded"
      >
        Toggle Toolbar
      </button>
    </main>
  );
};

export default Page;
