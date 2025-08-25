export type OrderType = "MARKET" | "LIMIT";
export type Side = "LONG" | "SHORT";
export type OrderStatus = "OPEN" | "FILLED" | "CANCELED" | "LIQUIDATED";

export interface Order {
  status: OrderStatus;
  id: string;
  symbol: string;
  type: OrderType;
  side: Side;
  price?: number;
  qty: number;
  timestamp: string;
}

export type Position = {
  symbol: string;
  side: Side;
  qty: number; // base quantity
  avgEntry: number; // average entry price
  leverage: number;
  margin: number; // locked margin (USDT)
  realizedPnl: number; // cumulative realized pnl for this position
  liquidationPrice: number;
};
