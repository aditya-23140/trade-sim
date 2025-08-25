export interface BinanceTrade {
  e: string; // event type
  E: number; // event time
  s: string; // symbol
  p: string; // price
  q: string; // quantity
  T: number; // trade time
}
