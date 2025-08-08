"use client";
import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData } from "lightweight-charts";

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: "#0d1117" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#1e222d" },
        horzLines: { color: "#1e222d" },
      },
      crosshair: { mode: 1 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = chart.addCandlestickSeries();

    // Fetch historical data
    fetch(
      "https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&limit=100"
    )
      .then((res) => res.json())
      .then((data: any[]) => {
        const formatted: CandlestickData[] = data.map((d) => ({
          time: Math.floor(d[0] / 1000), // seconds
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));
        candleSeriesRef.current?.setData(formatted);
      });

    // WebSocket for realtime updates
    const ws = new WebSocket(
      "wss://stream.binance.com:9443/ws/solusdt@kline_1m"
    );

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const k = message.k;
      candleSeriesRef.current?.update({
        time: Math.floor(k.t / 1000),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
      });
    };

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      ws.close();
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "500px",
      }}
    />
  );
}
