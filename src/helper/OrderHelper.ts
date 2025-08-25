export const uid = (p = "") => p + Math.random().toString(36).slice(2, 9);

export function toFixedSafe(n: number, d = 8) {
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(d);
}

/* Small sleep util */
export const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
