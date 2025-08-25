"use client";
import React, { useEffect, useState } from "react";
import { OrderType, Order, Side, Position } from "@/types/OrderTypes";
import { uid } from "@/helper/OrderHelper";
import { useBinanceTradeWS } from "@/hooks/BinanceTrade";

type TradingMode = "FUTURES" | "SPOT";
type CurrencyMode = "USD" | "INR";

interface ExtendedOrder extends Order {
  executionPrice?: number;
  fee?: number;
  feeAsset?: string;
}

interface ExtendedPosition extends Position {
  totalFees: number;
}

interface PerformanceMetrics {
  totalOrders: number;
  filledOrders: number;
  totalFees: number;
  grossPnl: number;
  netPnl: number;
  winRate: number;
  totalVolume: number;
  avgOrderSize: number;
}

/* ---------------------- Main Component ---------------------- */
export default function OrdersSection() {
  const [tradingMode, setTradingMode] = useState<TradingMode>("FUTURES");
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("USD");
  const [usdToInrRate, setUsdToInrRate] = useState<number>(83.5); // Default INR rate
  const [symbol, setSymbol] = useState<string>("SOLUSDT");
  const [leverage, setLeverage] = useState<number>(5);
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [side, setSide] = useState<Side>("LONG");
  const [orderQty, setOrderQty] = useState<number>(0.001);
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [usdtBalance, setUsdtBalance] = useState<number>(2000);
  const [spotBalances, setSpotBalances] = useState<Record<string, number>>({
    USDT: 2000,
    SOL: 0,
    BTC: 0,
    ETH: 0,
  });

  const [futuresPositions, setFuturesPositions] = useState<
    Record<string, ExtendedPosition>
  >({});
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics>({
    totalOrders: 0,
    filledOrders: 0,
    totalFees: 0,
    grossPnl: 0,
    netPnl: 0,
    winRate: 0,
    totalVolume: 0,
    avgOrderSize: 0,
  });

  // Trading fees (realistic Binance rates)
  const FUTURES_MAKER_FEE = 0.0002; // 0.02%
  const FUTURES_TAKER_FEE = 0.0004; // 0.04%
  const SPOT_TRADING_FEE = 0.001; // 0.1%

  const { ltp, connected } = useBinanceTradeWS(
    symbol,
    tradingMode === "FUTURES"
  );

  // Currency conversion helper
  const convertCurrency = (amount: number): number => {
    return currencyMode === "INR" ? amount * usdToInrRate : amount;
  };

  const getCurrencySymbol = (): string => {
    return currencyMode === "USD" ? "$" : "₹";
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem("tradingSimulatorData");
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setUsdtBalance(data.usdtBalance || 2000);
        setSpotBalances(
          data.spotBalances || { USDT: 2000, SOL: 0, BTC: 0, ETH: 0 }
        );
        setFuturesPositions(data.futuresPositions || {});
        setOrders(data.orders || []);
        setPerformanceData(
          data.performanceData || {
            totalOrders: 0,
            filledOrders: 0,
            totalFees: 0,
            grossPnl: 0,
            netPnl: 0,
            winRate: 0,
            totalVolume: 0,
            avgOrderSize: 0,
          }
        );
        setCurrencyMode(data.currencyMode || "USD");
        setUsdToInrRate(data.usdToInrRate || 83.5);
      } catch (error) {
        console.error("Error loading saved data:", error);
      }
    }
  }, []);

  // Save data to localStorage whenever state changes
  const saveToStorage = () => {
    const dataToSave = {
      usdtBalance,
      spotBalances,
      futuresPositions,
      orders,
      performanceData,
      tradingMode,
      symbol,
      leverage,
      currencyMode,
      usdToInrRate,
    };
    localStorage.setItem("tradingSimulatorData", JSON.stringify(dataToSave));
  };

  useEffect(() => {
    saveToStorage();
  }, [
    usdtBalance,
    spotBalances,
    futuresPositions,
    orders,
    performanceData,
    currencyMode,
    usdToInrRate,
  ]);

  /* Helper: Calculate trading fees */
  function calculateFee(
    orderType: OrderType,
    notional: number,
    isFutures: boolean
  ): number {
    if (isFutures) {
      return orderType === "LIMIT"
        ? notional * FUTURES_MAKER_FEE
        : notional * FUTURES_TAKER_FEE;
    } else {
      return notional * SPOT_TRADING_FEE;
    }
  }

  /* Helper: Calculate liquidation price for futures */
  function calculateLiquidationPrice(
    avgEntry: number,
    qty: number,
    side: Side,
    margin: number,
    leverage: number
  ): number {
    if (tradingMode === "SPOT") return 0;

    const maintenanceMarginRate = 0.004; // 0.4%
    const notional = avgEntry * qty;
    const maintenanceMargin = notional * maintenanceMarginRate;

    if (side === "LONG") {
      return avgEntry - (margin - maintenanceMargin) / qty;
    } else {
      return avgEntry + (margin - maintenanceMargin) / qty;
    }
  }

  /* Helper: Update performance metrics */
  function updatePerformanceMetrics(
    order: ExtendedOrder,
    pnl: number = 0,
    fee: number = 0
  ) {
    setPerformanceData((prev) => {
      const newFilledOrders =
        order.status === "FILLED" ? prev.filledOrders + 1 : prev.filledOrders;
      const newTotalFees = prev.totalFees + fee;
      const newGrossPnl = prev.grossPnl + pnl;
      const newNetPnl = newGrossPnl - newTotalFees;
      const newTotalVolume =
        prev.totalVolume +
        (order.executionPrice ? order.executionPrice * order.qty : 0);

      // Calculate win rate (orders with positive PnL)
      const profitableOrders = orders.filter(
        (o) =>
          o.status === "FILLED" &&
          o.executionPrice &&
          ((o.side === "LONG" && (ltp || 0) > o.executionPrice) ||
            (o.side === "SHORT" && (ltp || 0) < o.executionPrice))
      ).length;
      const winRate =
        newFilledOrders > 0 ? (profitableOrders / newFilledOrders) * 100 : 0;

      return {
        totalOrders: prev.totalOrders + 1,
        filledOrders: newFilledOrders,
        totalFees: newTotalFees,
        grossPnl: newGrossPnl,
        netPnl: newNetPnl,
        winRate,
        totalVolume: newTotalVolume,
        avgOrderSize:
          newFilledOrders > 0 ? newTotalVolume / newFilledOrders : 0,
      };
    });
  }

  /* Helper: Check if user has sufficient funds for the order */
  function validateSufficientFunds(
    order: ExtendedOrder,
    execPrice: number
  ): { valid: boolean; message?: string } {
    const notional = execPrice * order.qty;
    const fee = calculateFee(order.type, notional, tradingMode === "FUTURES");

    if (tradingMode === "FUTURES") {
      // For futures, check if we have enough USDT for margin + fees
      const requiredMargin = notional / leverage;
      const totalRequired = requiredMargin + fee;

      if (usdtBalance < totalRequired) {
        return {
          valid: false,
          message: `Insufficient USDT balance. Required: ${totalRequired.toFixed(
            2
          )} USDT (${requiredMargin.toFixed(2)} margin + ${fee.toFixed(
            6
          )} fee), Available: ${usdtBalance.toFixed(2)} USDT`,
        };
      }
    } else {
      // For spot trading
      if (order.side === "LONG") {
        // Buying: need USDT for purchase + fees
        const totalRequired = notional + fee;
        const availableUsdt = spotBalances.USDT || 0;

        if (availableUsdt < totalRequired) {
          return {
            valid: false,
            message: `Insufficient USDT balance. Required: ${totalRequired.toFixed(
              2
            )} USDT (${notional.toFixed(2)} + ${fee.toFixed(
              6
            )} fee), Available: ${availableUsdt.toFixed(2)} USDT`,
          };
        }
      } else {
        // Selling: need base asset
        const baseAsset = order.symbol.replace("USDT", "");
        const availableBalance = spotBalances[baseAsset] || 0;

        if (availableBalance < order.qty) {
          return {
            valid: false,
            message: `Insufficient ${baseAsset} balance. Required: ${order.qty}, Available: ${availableBalance}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /* Helper: Close existing position before opening new one */
  function closeExistingPosition(symbolKey: string): number {
    const existingPosition = futuresPositions[symbolKey];
    if (!existingPosition || !ltp) return 0;

    // Calculate PnL from closing the existing position
    const closePnl =
      existingPosition.side === "LONG"
        ? (ltp - existingPosition.avgEntry) * existingPosition.qty
        : (existingPosition.avgEntry - ltp) * existingPosition.qty;

    // Return margin to balance and add/subtract PnL
    const totalReturn = existingPosition.margin + closePnl;
    setUsdtBalance((prev) => +(prev + totalReturn).toFixed(8));

    // Add auto-close order to history
    const autoCloseOrder: ExtendedOrder = {
      id: uid("auto_close_"),
      symbol: symbolKey,
      type: "MARKET",
      side: existingPosition.side === "LONG" ? "SHORT" : "LONG",
      qty: existingPosition.qty,
      timestamp: new Date().toISOString(),
      status: "FILLED",
      executionPrice: ltp,
      fee: calculateFee("MARKET", ltp * existingPosition.qty, true), // Add fee for closing
      feeAsset: "USDT",
    };

    setOrders((prev) => [autoCloseOrder, ...prev]);
    updatePerformanceMetrics(autoCloseOrder, closePnl, autoCloseOrder.fee || 0);

    // Deduct closing fee from balance
    setUsdtBalance((prev) => +(prev - (autoCloseOrder.fee || 0)).toFixed(8));

    // Remove the position
    setFuturesPositions((prev) => {
      const newPositions = { ...prev };
      delete newPositions[symbolKey];
      return newPositions;
    });

    return closePnl;
  }

  /* Helper: Execute futures order */
  function executeFuturesOrder(order: ExtendedOrder, execPrice: number) {
    const symbolKey = order.symbol.toUpperCase();
    const notional = execPrice * order.qty;
    const fee = calculateFee(order.type, notional, true);
    const requiredMargin = +(notional / leverage).toFixed(8);

    // Validate funds before executing
    const validation = validateSufficientFunds(order, execPrice);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    // Check if there's an existing position for this symbol
    const existingPosition = futuresPositions[symbolKey];

    // Handle position logic based on symbol and side
    if (existingPosition) {
      if (existingPosition.side !== order.side) {
        // Different side for same symbol - close existing and open new position
        const closePnl = closeExistingPosition(symbolKey);
        console.log(
          `Auto-closed existing ${
            existingPosition.side
          } position for ${symbolKey}: ${closePnl.toFixed(4)} PnL`
        );

        // Now create new position (code continues below)
      } else {
        // Same side for same symbol - increase position size
        const newQty = +(existing.qty + order.qty).toFixed(8);
        const newNotional =
          existing.avgEntry * existing.qty + execPrice * order.qty;
        const newAvg = +(newNotional / newQty).toFixed(8);
        const newMargin = +(existing.margin + requiredMargin).toFixed(8);

        const liquidationPrice = calculateLiquidationPrice(
          newAvg,
          newQty,
          existing.side,
          newMargin,
          leverage
        );

        // Update order with execution details
        const executedOrder = {
          ...order,
          status: "FILLED" as const,
          executionPrice: execPrice,
          fee,
          feeAsset: "USDT",
        };

        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? executedOrder : o))
        );

        // Deduct margin and fee from balance
        setUsdtBalance((prev) => +(prev - requiredMargin - fee).toFixed(8));

        // Update existing position
        setFuturesPositions((prev) => ({
          ...prev,
          [symbolKey]: {
            ...existing,
            qty: newQty,
            avgEntry: newAvg,
            margin: newMargin,
            liquidationPrice,
            totalFees: existing.totalFees + fee,
          },
        }));

        updatePerformanceMetrics(executedOrder, 0, fee);
        return; // Exit early for position increase
      }
    }

    // Create new position (for new symbol or after closing opposite position)
    const liquidationPrice = calculateLiquidationPrice(
      execPrice,
      order.qty,
      order.side,
      requiredMargin,
      leverage
    );

    // Update order with execution details
    const executedOrder = {
      ...order,
      status: "FILLED" as const,
      executionPrice: execPrice,
      fee,
      feeAsset: "USDT",
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? executedOrder : o))
    );

    // Deduct margin and fee from balance
    setUsdtBalance((prev) => +(prev - requiredMargin - fee).toFixed(8));

    // Create new position
    const newPosition: ExtendedPosition = {
      symbol: symbolKey,
      side: order.side,
      qty: order.qty,
      avgEntry: execPrice,
      leverage,
      margin: requiredMargin,
      realizedPnl: 0,
      liquidationPrice,
      totalFees: fee,
    };

    setFuturesPositions((prev) => ({
      ...prev,
      [symbolKey]: newPosition,
    }));

    updatePerformanceMetrics(executedOrder, 0, fee);
  }

  /* Helper: Execute spot order */
  function executeSpotOrder(order: ExtendedOrder, execPrice: number) {
    const baseAsset = order.symbol.replace("USDT", "");
    const notional = execPrice * order.qty;

    // Validate funds before executing
    const validation = validateSufficientFunds(order, execPrice);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    const fee = calculateFee(order.type, notional, false);

    // Update order with execution details
    const executedOrder = {
      ...order,
      status: "FILLED" as const,
      executionPrice: execPrice,
      fee,
      feeAsset: order.side === "LONG" ? baseAsset : "USDT",
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? executedOrder : o))
    );

    setSpotBalances((prev) => {
      const newBalances = { ...prev };

      if (order.side === "LONG") {
        // Buy: spend USDT + fee, get base asset
        const totalCost = notional + fee;
        newBalances.USDT = +(newBalances.USDT - totalCost).toFixed(8);
        newBalances[baseAsset] = +(
          (newBalances[baseAsset] || 0) + order.qty
        ).toFixed(8);
      } else {
        // Sell: spend base asset, get USDT - fee
        newBalances[baseAsset] = +(
          (newBalances[baseAsset] || 0) - order.qty
        ).toFixed(8);
        const receivedUsdt = notional - fee;
        newBalances.USDT = +(newBalances.USDT + receivedUsdt).toFixed(8);
      }

      updatePerformanceMetrics(executedOrder, 0, fee);
      return newBalances;
    });
  }

  /* Place order UI handler with enhanced validation */
  function placeOrder() {
    if (!symbol) {
      alert("Symbol required");
      return;
    }
    if (!orderQty || orderQty <= 0) {
      alert("Quantity must be > 0");
      return;
    }
    if (orderType === "LIMIT" && (!limitPrice || limitPrice <= 0)) {
      alert("Limit price required");
      return;
    }
    if (!ltp && orderType === "MARKET") {
      alert("No market price (LTP) available");
      return;
    }

    const orderPrice = orderType === "MARKET" ? ltp! : Number(limitPrice);

    // Enhanced validation for insufficient funds
    const mockOrder: ExtendedOrder = {
      id: "temp",
      symbol: symbol.toUpperCase(),
      type: orderType,
      side,
      price: orderType === "LIMIT" ? Number(limitPrice) : undefined,
      qty: orderQty,
      timestamp: new Date().toISOString(),
      status: "OPEN",
    };

    const validation = validateSufficientFunds(mockOrder, orderPrice);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    // Create the actual order
    const order: ExtendedOrder = {
      id: uid("o_"),
      symbol: symbol.toUpperCase(),
      type: orderType,
      side,
      price: orderType === "LIMIT" ? Number(limitPrice) : undefined,
      qty: orderQty,
      timestamp: new Date().toISOString(),
      status: "OPEN",
    };

    setOrders((o) => [order, ...o]);

    // Execute market orders immediately
    if (orderType === "MARKET") {
      if (tradingMode === "FUTURES") {
        executeFuturesOrder(order, ltp!);
      } else {
        executeSpotOrder(order, ltp!);
      }
    }
  }

  /* Process limit orders when LTP updates */
  useEffect(() => {
    if (ltp == null) return;

    setOrders((prev) => {
      return prev.map((o) => {
        if (o.status !== "OPEN" || o.type !== "LIMIT") return o;

        const p = o.price!;
        let shouldFill = false;

        if (o.side === "LONG" && ltp <= p) {
          shouldFill = true;
        } else if (o.side === "SHORT" && ltp >= p) {
          shouldFill = true;
        }

        if (shouldFill) {
          // Validate funds before executing limit order
          const validation = validateSufficientFunds(o, ltp);
          if (!validation.valid) {
            console.warn(
              `Limit order ${o.id} cannot be filled: ${validation.message}`
            );
            return { ...o, status: "CANCELED" as const };
          }

          if (tradingMode === "FUTURES") {
            executeFuturesOrder(o, ltp);
          } else {
            executeSpotOrder(o, ltp);
          }
          return { ...o, status: "FILLED" as const };
        }

        return o;
      });
    });
  }, [ltp, tradingMode]);

  /* Check for liquidations in futures mode */
  useEffect(() => {
    if (tradingMode !== "FUTURES" || !ltp) return;

    Object.values(futuresPositions).forEach((pos) => {
      if (pos.symbol === symbol.toUpperCase()) {
        const isLiquidated =
          (pos.side === "LONG" && ltp <= pos.liquidationPrice) ||
          (pos.side === "SHORT" && ltp >= pos.liquidationPrice);

        if (isLiquidated) {
          // Force close position at liquidation price
          const liquidationPnl =
            pos.side === "LONG"
              ? (pos.liquidationPrice - pos.avgEntry) * pos.qty
              : (pos.avgEntry - pos.liquidationPrice) * pos.qty;

          setUsdtBalance((b) => +(b + liquidationPnl).toFixed(8));

          setFuturesPositions((prev) => {
            const newPos = { ...prev };
            delete newPos[pos.symbol];
            return newPos;
          });

          // Add liquidation order to history
          const liquidationOrder: ExtendedOrder = {
            id: uid("liq_"),
            symbol: pos.symbol,
            type: "MARKET",
            side: pos.side === "LONG" ? "SHORT" : "LONG",
            qty: pos.qty,
            timestamp: new Date().toISOString(),
            status: "LIQUIDATED",
            executionPrice: pos.liquidationPrice,
            fee: 0,
            feeAsset: "USDT",
          };

          setOrders((prev) => [liquidationOrder, ...prev]);
          updatePerformanceMetrics(liquidationOrder, liquidationPnl, 0);

          alert(`Position liquidated at ${pos.liquidationPrice.toFixed(8)}`);
        }
      }
    });
  }, [ltp, futuresPositions, symbol, tradingMode]);

  /* Get current position and metrics */
  const currentPosition =
    tradingMode === "FUTURES" ? futuresPositions[symbol.toUpperCase()] : null;

  const baseAsset = symbol.replace("USDT", "");
  const spotBalance = spotBalances[baseAsset] || 0;
  const usdtSpotBalance = spotBalances.USDT || 0;

  const marginUsed = currentPosition ? currentPosition.margin : 0;

  const unrealizedPnl =
    currentPosition && ltp
      ? currentPosition.side === "LONG"
        ? (ltp - currentPosition.avgEntry) * currentPosition.qty
        : (currentPosition.avgEntry - ltp) * currentPosition.qty
      : 0;

  const availableBalance =
    tradingMode === "FUTURES" ? usdtBalance : usdtSpotBalance;
  const equity =
    tradingMode === "FUTURES"
      ? +(availableBalance + unrealizedPnl).toFixed(8)
      : usdtSpotBalance + spotBalance * (ltp || 0);

  const marginRatio =
    currentPosition && marginUsed > 0 ? +(equity / marginUsed).toFixed(4) : 0;

  /* Cancel order */
  function cancelOrder(id: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "CANCELED" } : o))
    );
  }

  /* Close futures position */
  function closeFuturesPosition(positionSymbol: string, closeQty?: number) {
    const position = futuresPositions[positionSymbol];
    if (!position || tradingMode !== "FUTURES" || !ltp) {
      alert("No position found or no market price available");
      return;
    }

    const qtyToClose = closeQty ?? position.qty;
    const closingNotional = ltp * qtyToClose;
    const closingFee = calculateFee("MARKET", closingNotional, true);

    // Check if we have enough balance for closing fee
    if (usdtBalance < closingFee) {
      alert(
        `Insufficient balance for closing fee: ${closingFee.toFixed(6)} USDT`
      );
      return;
    }

    // Calculate PnL for the quantity being closed
    const closePnl =
      position.side === "LONG"
        ? (ltp - position.avgEntry) * qtyToClose
        : (position.avgEntry - ltp) * qtyToClose;

    // Calculate margin to return (proportional to qty closed)
    const marginToReturn = (position.margin * qtyToClose) / position.qty;

    // Update balance: return margin + PnL - closing fee
    const balanceChange = marginToReturn + closePnl - closingFee;
    setUsdtBalance((prev) => +(prev + balanceChange).toFixed(8));

    // Create closing order
    const closeOrder: ExtendedOrder = {
      id: uid("close_"),
      symbol: positionSymbol,
      type: "MARKET",
      side: position.side === "LONG" ? "SHORT" : "LONG",
      qty: qtyToClose,
      timestamp: new Date().toISOString(),
      status: "FILLED",
      executionPrice: ltp,
      fee: closingFee,
      feeAsset: "USDT",
    };

    setOrders((prev) => [closeOrder, ...prev]);
    updatePerformanceMetrics(closeOrder, closePnl, closingFee);

    // Update or remove position
    setFuturesPositions((prev) => {
      const newPositions = { ...prev };

      if (qtyToClose >= position.qty) {
        // Close entire position
        delete newPositions[positionSymbol];
      } else {
        // Partial close - update position
        const remainingQty = position.qty - qtyToClose;
        const remainingMargin = position.margin - marginToReturn;

        newPositions[positionSymbol] = {
          ...position,
          qty: remainingQty,
          margin: remainingMargin,
          realizedPnl: position.realizedPnl + closePnl,
          totalFees: position.totalFees + closingFee,
          liquidationPrice: calculateLiquidationPrice(
            position.avgEntry,
            remainingQty,
            position.side,
            remainingMargin,
            leverage
          ),
        };
      }

      return newPositions;
    });
  }

  /* Sell all spot balance */
  function sellAllSpot() {
    if (tradingMode !== "SPOT" || !ltp || spotBalance <= 0) return;

    executeSpotOrder(
      {
        id: uid("sell_"),
        symbol: symbol.toUpperCase(),
        type: "MARKET",
        side: "SHORT",
        qty: spotBalance,
        timestamp: new Date().toISOString(),
        status: "OPEN",
      },
      ltp
    );
  }

  /* Quick helpers to set qty with enhanced validation */
  function setQtyByPercent(percent: number) {
    if (!ltp) return;

    if (tradingMode === "FUTURES") {
      const usdtToUse = +(availableBalance * percent);
      // Reserve some amount for fees
      const feeBuffer = usdtToUse * 0.01; // 1% buffer for fees
      const netUsdt = usdtToUse - feeBuffer;
      const qtyCalc = +((netUsdt * leverage) / ltp);
      setOrderQty(Number(Math.max(qtyCalc, 0).toFixed(8)));
    } else {
      if (side === "LONG") {
        const usdtToUse = +(usdtSpotBalance * percent);
        // Estimate fee and subtract from available
        const estimatedNotional = usdtToUse * 0.9; // Rough estimate leaving room for fees
        const estimatedFee = calculateFee(orderType, estimatedNotional, false);
        const netUsdt = Math.max(usdtToUse - estimatedFee, 0);
        const qtyCalc = +(netUsdt / ltp);
        setOrderQty(Number(Math.max(qtyCalc, 0).toFixed(8)));
      } else {
        const qtyCalc = +(spotBalance * percent);
        setOrderQty(Number(qtyCalc.toFixed(8)));
      }
    }
  }

  /* Reset all data */
  function resetSimulator() {
    if (
      confirm("Are you sure you want to reset all data? This cannot be undone.")
    ) {
      setUsdtBalance(2000);
      setSpotBalances({ USDT: 2000, SOL: 0, BTC: 0, ETH: 0 });
      setFuturesPositions({});
      setOrders([]);
      setPerformanceData({
        totalOrders: 0,
        filledOrders: 0,
        totalFees: 0,
        grossPnl: 0,
        netPnl: 0,
        winRate: 0,
        totalVolume: 0,
        avgOrderSize: 0,
      });

      localStorage.removeItem("tradingSimulatorData");
    }
  }

  /* Formatting helpers with currency conversion */
  const fmt = {
    price: (v?: number | null) => {
      if (v == null) return "—";
      // Remove trailing zeros and unnecessary decimal points
      return Number(v)
        .toFixed(8)
        .replace(/\.?0+$/, "");
    },
    money: (v?: number) =>
      v == null
        ? "—"
        : `${getCurrencySymbol()}${convertCurrency(v).toFixed(2)}`,
    percent: (v: number) => `${v.toFixed(2)}%`,
    fee: (v: number) => `${v.toFixed(6)}`,
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Enhanced Trading Simulator with INR Support
        </h2>

        {/* Mode Toggle and Currency Controls */}
        <div className="flex gap-2 items-center">
          {/* Currency Mode Toggle */}
          <div className="flex gap-2 items-center border-r pr-2">
            <button
              onClick={() => setCurrencyMode("USD")}
              className={`px-3 py-1 rounded text-sm ${
                currencyMode === "USD"
                  ? "bg-green-500 text-black"
                  : "bg-gray-700 text-white"
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrencyMode("INR")}
              className={`px-3 py-1 rounded text-sm ${
                currencyMode === "INR"
                  ? "bg-green-500 text-black"
                  : "bg-gray-700 text-white"
              }`}
            >
              INR (₹)
            </button>
          </div>

          {/* INR Rate Input */}
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-400">USD/INR:</label>
            <input
              type="number"
              value={usdToInrRate}
              onChange={(e) => setUsdToInrRate(Number(e.target.value) || 83.5)}
              className="w-20 px-2 py-1 bg-black text-white rounded text-sm"
              step="0.1"
            />
          </div>

          <button
            onClick={resetSimulator}
            className="px-3 py-1 rounded bg-red-600 text-white text-sm"
          >
            Reset
          </button>
          <button
            onClick={() => setTradingMode("FUTURES")}
            className={`px-4 py-2 rounded ${
              tradingMode === "FUTURES"
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-white"
            }`}
          >
            Futures
          </button>
          <button
            onClick={() => setTradingMode("SPOT")}
            className={`px-4 py-2 rounded ${
              tradingMode === "SPOT"
                ? "bg-blue-400 text-black"
                : "bg-gray-800 text-white"
            }`}
          >
            Spot
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Trading Controls */}
        <div className="col-span-1 bg-slate-900 p-3 rounded">
          <h4 className="font-semibold mb-3">
            {tradingMode === "FUTURES" && (
              <>
                <label className="block text-xs text-gray-300 mt-2">
                  Leverage
                </label>
                <select
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full bg-black p-2 rounded mt-1 text-white"
                >
                  {[1, 2, 3, 5, 10, 20, 50, 100].map((l) => (
                    <option key={l} value={l}>
                      {l}x
                    </option>
                  ))}
                </select>
              </>
            )}
          </h4>

          <label className="block text-xs text-gray-300">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full bg-black p-2 rounded mt-1 text-white"
            placeholder="e.g. BTCUSDT"
          />
          <label className="block text-xs text-gray-300 mt-2">Order Type</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as OrderType)}
            className="w-full bg-black p-2 rounded mt-1 text-white"
          >
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
          </select>

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setSide("LONG")}
              className={`flex-1 p-2 rounded ${
                side === "LONG"
                  ? "bg-green-500 text-black"
                  : "bg-gray-800 text-white"
              }`}
            >
              {tradingMode === "SPOT" ? "BUY" : "LONG"}
            </button>
            <button
              onClick={() => setSide("SHORT")}
              className={`flex-1 p-2 rounded ${
                side === "SHORT"
                  ? "bg-red-500 text-black"
                  : "bg-gray-800 text-white"
              }`}
              disabled={tradingMode === "SPOT" && spotBalance <= 0}
            >
              {tradingMode === "SPOT" ? "SELL" : "SHORT"}
            </button>
          </div>

          <label className="block text-xs text-gray-300 mt-2">
            Quantity ({baseAsset})
          </label>
          <input
            type="number"
            step="any"
            value={orderQty}
            onChange={(e) => setOrderQty(Number(e.target.value))}
            className="w-full bg-black p-2 rounded mt-1 text-white"
          />

          {orderType === "LIMIT" && (
            <>
              <label className="block text-xs text-gray-300 mt-2">
                Limit Price (USDT)
              </label>
              <input
                type="number"
                step="any"
                value={limitPrice}
                onChange={(e) =>
                  setLimitPrice(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="w-full bg-black p-2 rounded mt-1 text-white"
              />
            </>
          )}

          {/* Enhanced Fee and Cost Estimation with Currency Conversion - Anti-flicker */}
          {orderQty > 0 && (
            <div className="mt-2 text-xs text-gray-400 bg-black p-2 rounded">
              {(() => {
                // Use last known LTP or current LTP, prevent 0 values
                const effectiveLtp =
                  ltp && ltp > 0
                    ? ltp
                    : limitPrice && Number(limitPrice) > 0
                    ? Number(limitPrice)
                    : null;

                if (!effectiveLtp) {
                  return (
                    <div className="text-yellow-400">
                      ⏳ Waiting for price data...
                    </div>
                  );
                }

                const orderPrice =
                  orderType === "MARKET"
                    ? effectiveLtp
                    : Number(limitPrice || effectiveLtp);
                const notional = orderPrice * orderQty;
                const fee = calculateFee(
                  orderType,
                  notional,
                  tradingMode === "FUTURES"
                );
                const margin =
                  tradingMode === "FUTURES" ? notional / leverage : 0;
                const totalRequired =
                  tradingMode === "FUTURES"
                    ? margin + fee
                    : side === "LONG"
                    ? notional + fee
                    : 0;

                return (
                  <>
                    <div>Est. Cost: {fmt.money(notional)}</div>
                    <div>Est. Fee: {fmt.money(fee)}</div>
                    {tradingMode === "FUTURES" && (
                      <div>Required Margin: {fmt.money(margin)}</div>
                    )}
                    <div className="border-t border-gray-600 mt-1 pt-1">
                      <div
                        className={`font-semibold ${
                          totalRequired > availableBalance
                            ? "text-red-400"
                            : "text-green-400"
                        }`}
                      >
                        Total Required: {fmt.money(totalRequired)}
                      </div>
                      <div
                        className={`text-xs ${
                          totalRequired > availableBalance
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        Available: {fmt.money(availableBalance)}
                        {totalRequired > availableBalance &&
                          " - INSUFFICIENT FUNDS"}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={placeOrder}
              disabled={!ltp || orderQty <= 0}
              className={`flex-1 p-2 rounded font-semibold ${
                !ltp || orderQty <= 0
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-yellow-400 text-black hover:bg-yellow-300"
              }`}
            >
              Place Order
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setQtyByPercent(0.25)}
              className="flex-1 p-1 rounded bg-gray-800 text-white text-xs hover:bg-gray-700"
            >
              25%
            </button>
            <button
              onClick={() => setQtyByPercent(0.5)}
              className="flex-1 p-1 rounded bg-gray-800 text-white text-xs hover:bg-gray-700"
            >
              50%
            </button>
            <button
              onClick={() => setQtyByPercent(0.75)}
              className="flex-1 p-1 rounded bg-gray-800 text-white text-xs hover:bg-gray-700"
            >
              75%
            </button>
            <button
              onClick={() => setQtyByPercent(1)}
              className="flex-1 p-1 rounded bg-gray-800 text-white text-xs hover:bg-gray-700"
            >
              MAX
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-300 space-y-1">
            <div>Connected: {connected ? "✅" : "❌"}</div>
            <div>
              Mode: <strong>{tradingMode}</strong>
            </div>
            <div>
              Currency: <strong>{currencyMode}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span>LTP:</span>
              {ltp && ltp > 0 ? (
                <span className="font-mono text-green-400">
                  {fmt.price(ltp)}
                </span>
              ) : (
                <span className="text-yellow-400 animate-pulse">
                  Loading...
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Fees:{" "}
              {tradingMode === "FUTURES"
                ? `${(FUTURES_TAKER_FEE * 100).toFixed(3)}%`
                : `${(SPOT_TRADING_FEE * 100).toFixed(1)}%`}
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="col-span-1 bg-slate-900 p-3 rounded">
          <h4 className="font-semibold">Account</h4>

          {tradingMode === "FUTURES" ? (
            <div className="space-y-1 mt-2 text-sm text-gray-300">
              <div>Available: {fmt.money(availableBalance)}</div>
              <div>Margin Used: {fmt.money(marginUsed)}</div>
              <div>
                Unrealized PnL:
                <strong
                  className={
                    unrealizedPnl >= 0 ? "text-green-300" : "text-red-300"
                  }
                >
                  {fmt.money(unrealizedPnl)}
                </strong>
              </div>
              <div>Equity: {fmt.money(equity)}</div>
              {marginRatio > 0 && (
                <div>
                  Margin Ratio:
                  <strong
                    className={
                      marginRatio > 2
                        ? "text-green-300"
                        : marginRatio > 1.2
                        ? "text-yellow-300"
                        : "text-red-300"
                    }
                  >
                    {marginRatio}
                  </strong>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-2">
                Total Fees Paid: {fmt.money(currentPosition?.totalFees || 0)}
              </div>

              {/* Show all futures positions */}
              <div className="mt-3 space-y-1">
                <h5 className="text-xs text-gray-400">All Positions:</h5>
                {Object.keys(futuresPositions).length === 0 ? (
                  <div className="text-xs text-gray-500">No positions</div>
                ) : (
                  Object.entries(futuresPositions).map(([sym, pos]) => (
                    <div key={sym} className="text-xs bg-black p-2 rounded">
                      <div className="flex justify-between">
                        <span>{sym}</span>
                        <span
                          className={
                            pos.side === "LONG"
                              ? "text-green-300"
                              : "text-red-300"
                          }
                        >
                          {pos.side}
                        </span>
                      </div>
                      <div>Size: {pos.qty}</div>
                      <div>Entry: {fmt.price(pos.avgEntry)}</div>
                      <div>Margin: {fmt.money(pos.margin)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1 mt-2 text-sm text-gray-300">
              <div>USDT: {fmt.money(usdtSpotBalance)}</div>
              <div>
                {baseAsset}: {fmt.price(spotBalance)}
              </div>
              <div>Total Value: {fmt.money(equity)}</div>

              <div className="mt-3 space-y-1">
                <h5 className="text-xs text-gray-400">All Balances:</h5>
                {Object.entries(spotBalances)
                  .filter(([_, balance]) => balance > 0.00000001)
                  .map(([asset, balance]) => (
                    <div key={asset} className="text-xs flex justify-between">
                      <span>{asset}:</span>
                      <span>
                        {asset === "USDT"
                          ? fmt.money(balance)
                          : fmt.price(balance)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Position/Holdings */}
        <div className="col-span-1 bg-slate-900 p-3 rounded">
          <h4 className="font-semibold">
            {tradingMode === "FUTURES" ? "Position" : "Holdings"} (
            {symbol.toUpperCase()})
          </h4>

          {tradingMode === "FUTURES" ? (
            !currentPosition ? (
              <div className="text-gray-400 mt-2">No position</div>
            ) : (
              <div className="space-y-1 mt-2 text-sm text-gray-300">
                <div>
                  Side:{" "}
                  <strong
                    className={
                      currentPosition.side === "LONG"
                        ? "text-green-300"
                        : "text-red-300"
                    }
                  >
                    {currentPosition.side}
                  </strong>
                </div>
                <div>
                  Size: {currentPosition.qty} {baseAsset}
                </div>
                <div>Entry: {fmt.price(currentPosition.avgEntry)}</div>
                <div>Mark: {fmt.price(ltp)}</div>
                <div>Leverage: {currentPosition.leverage}x</div>
                <div>Margin: {fmt.money(currentPosition.margin)}</div>
                <div>
                  Liq. Price:{" "}
                  <strong className="text-red-300">
                    {fmt.price(currentPosition.liquidationPrice)}
                  </strong>
                </div>
                <div>
                  Unrealized PnL:{" "}
                  <strong
                    className={
                      unrealizedPnl >= 0 ? "text-green-300" : "text-red-300"
                    }
                  >
                    {fmt.money(unrealizedPnl)}
                  </strong>
                </div>
                <div>
                  Realized PnL: {fmt.money(currentPosition.realizedPnl)}
                </div>
                <div className="text-xs text-gray-400">
                  Position Fees: {fmt.money(currentPosition.totalFees)}
                </div>

                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => closeFuturesPosition()}
                    className="w-full bg-red-600 p-2 rounded text-sm hover:bg-red-700"
                  >
                    Close Position
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        closeFuturesPosition(
                          Math.max(
                            +(currentPosition.qty * 0.25).toFixed(8),
                            0.00000001
                          )
                        )
                      }
                      className="flex-1 bg-gray-700 p-1 rounded text-xs hover:bg-gray-600"
                    >
                      Close 25%
                    </button>
                    <button
                      onClick={() =>
                        closeFuturesPosition(
                          Math.max(
                            +(currentPosition.qty * 0.5).toFixed(8),
                            0.00000001
                          )
                        )
                      }
                      className="flex-1 bg-gray-700 p-1 rounded text-xs hover:bg-gray-600"
                    >
                      Close 50%
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-1 mt-2 text-sm text-gray-300">
              <div>
                {baseAsset}: {fmt.price(spotBalance)}
              </div>
              {ltp && spotBalance > 0 && (
                <>
                  <div>Value: {fmt.money(spotBalance * ltp)}</div>
                  <button
                    onClick={sellAllSpot}
                    className="w-full bg-red-600 p-2 rounded text-sm mt-2 hover:bg-red-700"
                  >
                    Sell All {baseAsset}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Orders */}
        <div className="col-span-1 bg-slate-900 p-3 rounded">
          <h4 className="font-semibold">Open Orders</h4>
          <div className="mt-2 text-sm">
            {orders.filter((o) => o.status === "OPEN").length === 0 ? (
              <div className="text-gray-400">No open orders</div>
            ) : (
              <div className="space-y-2 max-h-32 overflow-auto">
                {orders
                  .filter((o) => o.status === "OPEN")
                  .map((o) => (
                    <div key={o.id} className="bg-black p-2 rounded">
                      <div className="flex justify-between items-start">
                        <div className="text-xs">
                          <div
                            className={
                              o.side === "LONG"
                                ? "text-green-300"
                                : "text-red-300"
                            }
                          >
                            {o.type} {o.side}
                          </div>
                          <div>{o.symbol}</div>
                          <div>
                            {o.qty} @ {o.price ?? "Market"}
                          </div>
                        </div>
                        <button
                          onClick={() => cancelOrder(o.id)}
                          className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <h4 className="font-semibold mt-4">Recent Orders</h4>
          <div className="mt-2 text-xs text-gray-300 max-h-40 overflow-auto">
            {orders.length === 0 ? (
              <div className="text-gray-400">No orders</div>
            ) : (
              <div className="space-y-1">
                {orders.slice(0, 10).map((o) => (
                  <div
                    key={o.id}
                    className="flex justify-between items-center py-1 border-b border-slate-800"
                  >
                    <div>
                      <div className="flex gap-2">
                        <span
                          className={
                            o.side === "LONG"
                              ? "text-green-300"
                              : "text-red-300"
                          }
                        >
                          {o.side}
                        </span>
                        <span>{o.symbol}</span>
                        <span>{o.qty}</span>
                        <span>
                          @
                          {o.executionPrice
                            ? fmt.price(o.executionPrice)
                            : o.price ?? "Mkt"}
                        </span>
                      </div>
                      <div className="text-gray-500 flex gap-2">
                        <span>
                          {new Date(o.timestamp).toLocaleTimeString()}
                        </span>
                        {o.fee && <span>Fee: {fmt.money(o.fee)}</span>}
                      </div>
                    </div>
                    <div>
                      <span
                        className={
                          o.status === "FILLED"
                            ? "text-green-300"
                            : o.status === "CANCELED"
                            ? "text-gray-400"
                            : o.status === "LIQUIDATED"
                            ? "text-red-300"
                            : "text-yellow-300"
                        }
                      >
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Performance Dashboard with Currency Conversion */}
      <div className="bg-slate-900 p-4 rounded">
        <h4 className="font-semibold mb-3">
          📊 Performance Analytics ({currencyMode})
        </h4>
        <div className="grid md:grid-cols-6 gap-4 text-sm">
          <div className="bg-black p-3 rounded">
            <div className="text-gray-400">Total Orders</div>
            <div className="text-xl font-mono">
              {performanceData.totalOrders}
            </div>
            <div className="text-xs text-gray-500">
              Filled: {performanceData.filledOrders}
            </div>
          </div>

          <div className="bg-black p-3 rounded">
            <div className="text-gray-400">Total Fees</div>
            <div className="text-xl font-mono text-red-400">
              -{fmt.money(performanceData.totalFees)}
            </div>
            <div className="text-xs text-gray-500">All trading fees</div>
          </div>

          <div className="bg-black p-3 rounded">
            <div className="text-gray-400">Gross PnL</div>
            <div
              className={`text-xl font-mono ${
                performanceData.grossPnl >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {performanceData.grossPnl >= 0 ? "+" : ""}
              {fmt.money(performanceData.grossPnl)}
            </div>
            <div className="text-xs text-gray-500">Before fees</div>
          </div>

          <div className="bg-black p-3 rounded">
            <div className="text-gray-400">Net PnL</div>
            <div
              className={`text-xl font-mono ${
                performanceData.netPnl >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {performanceData.netPnl >= 0 ? "+" : ""}
              {fmt.money(performanceData.netPnl)}
            </div>
            <div className="text-xs text-gray-500">After all fees</div>
          </div>

          <div className="bg-black p-3 rounded">
            <div className="text-gray-400">Win Rate</div>
            <div
              className={`text-xl font-mono ${
                performanceData.winRate >= 50
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {fmt.percent(performanceData.winRate)}
            </div>
            <div className="text-xs text-gray-500">Profitable orders</div>
          </div>

          <div className="bg-black p-3 rounded">
            <div className="text-gray-400">Total Volume</div>
            <div className="text-xl font-mono">
              {fmt.money(performanceData.totalVolume)}
            </div>
            <div className="text-xs text-gray-500">
              Avg: {fmt.money(performanceData.avgOrderSize)}
            </div>
          </div>
        </div>

        {/* Currency Conversion Info */}
        {currencyMode === "INR" && (
          <div className="mt-3 text-xs text-gray-400 bg-black p-2 rounded">
            <div className="flex justify-between items-center">
              <span>💱 Currency Conversion Rate:</span>
              <span>1 USD = ₹{usdToInrRate}</span>
            </div>
            <div className="text-gray-500 mt-1">
              All USD values are converted to INR for display. Underlying
              calculations remain in USD.
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Fund Validation Notice */}
      <div className="bg-blue-900/20 border border-blue-600 p-3 rounded">
        <div className="flex items-center gap-2 text-blue-400">
          <span>ℹ️</span>
          <strong>Fund Validation & Currency Features</strong>
        </div>
        <div className="mt-2 text-sm text-gray-300 space-y-1">
          <div>
            • Orders are validated for sufficient funds before execution
          </div>
          <div>
            • All cost estimates limited to 2 decimal places for better
            readability
          </div>
          <div>
            • Currency toggle: View all values in USD or INR (adjustable
            exchange rate)
          </div>
          <div>
            • For futures: Opening opposite position auto-closes existing
            position for same symbol
          </div>
          <div>
            • For spot: Buy orders validate USDT balance, sell orders validate
            asset balance
          </div>
          <div>• All fees are calculated and validated upfront</div>
          <div>
            • Multi-symbol support: Different symbols create separate positions
          </div>
        </div>
      </div>

      {/* Risk Warnings */}
      {tradingMode === "FUTURES" && currentPosition && (
        <div className="bg-red-900/20 border border-red-600 p-3 rounded">
          <div className="flex items-center gap-2 text-red-400">
            <span>⚠️</span>
            <strong>Risk Warning</strong>
          </div>
          <div className="mt-2 text-sm text-gray-300">
            {marginRatio > 0 && marginRatio < 1.5 && (
              <div>
                • Margin ratio is low ({marginRatio}). Risk of liquidation!
              </div>
            )}
            {ltp && currentPosition && (
              <div>
                • Distance to liquidation:{" "}
                {currentPosition.side === "LONG"
                  ? fmt.percent(
                      ((ltp - currentPosition.liquidationPrice) / ltp) * 100
                    )
                  : fmt.percent(
                      ((currentPosition.liquidationPrice - ltp) / ltp) * 100
                    )}
              </div>
            )}
            <div>• Trading fees can significantly impact profitability</div>
            <div>
              • This is a simulation. Real trading involves significant risk.
            </div>
          </div>
        </div>
      )}

      {/* Market Info */}
      <div className="bg-slate-900 p-3 rounded">
        <h4 className="font-semibold mb-2">Market Information</h4>
        <div className="grid md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Current Price</div>
            <div className="text-lg font-mono flex items-center gap-2">
              {ltp && ltp > 0 ? (
                <span className="text-green-400">{fmt.price(ltp)}</span>
              ) : (
                <span className="text-yellow-400 animate-pulse">
                  Loading...
                </span>
              )}
              <span className="text-sm text-gray-500">USDT</span>
            </div>
          </div>
          <div>
            <div className="text-gray-400">Trading Mode</div>
            <div className="text-lg">{tradingMode}</div>
          </div>
          <div>
            <div className="text-gray-400">Currency Display</div>
            <div className="text-lg">{currencyMode}</div>
          </div>
          <div>
            <div className="text-gray-400">Connection</div>
            <div
              className={`text-lg ${
                connected ? "text-green-400" : "text-red-400"
              }`}
            >
              {connected ? "Connected" : "Disconnected"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Data Persistence</div>
            <div className="text-lg text-green-400">localStorage</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          {tradingMode === "FUTURES" && (
            <div className="space-y-1">
              <div>
                • Futures trading uses {leverage}x leverage with realistic fees
              </div>
              <div>
                • Maker fee: {(FUTURES_MAKER_FEE * 100).toFixed(3)}% | Taker
                fee: {(FUTURES_TAKER_FEE * 100).toFixed(3)}%
              </div>
              <div>
                • Maintenance margin rate: 0.4% | Liquidation occurs when equity
                falls below maintenance margin
              </div>
              <div>
                • Opening opposite position auto-closes existing position for
                same symbol
              </div>
            </div>
          )}

          {tradingMode === "SPOT" && (
            <div className="space-y-1">
              <div>
                • Spot trading fee: {(SPOT_TRADING_FEE * 100).toFixed(1)}% per
                trade
              </div>
              <div>• No leverage available | Full asset backing required</div>
              <div>
                • Fees deducted from received amount on sells, added to cost on
                buys
              </div>
              <div>
                • All orders validated for sufficient balance before execution
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
