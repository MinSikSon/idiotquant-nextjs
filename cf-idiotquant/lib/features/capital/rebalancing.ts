/** Monetary amounts use KRW for Korea and USD cents for the US. */
export interface RebalancingPolicy {
  schedule?: { frequency: "once" | "weekly" | "monthly"; start_at: string };
  execution: "buy_only" | "buy_sell";
  cash_bp: number;
  tolerance_bp: number;
  cash_minor: number;
  min_order_minor: number;
  targets: { symbol: string; weight_bp: number }[];
}

export interface RebalancingPreview {
  currency: "KRW" | "USD";
  observed_at: string;
  total_minor: number;
  cash_minor: number;
  target_cash_minor: number;
  remaining_cash_minor: number;
  rows: {
    symbol: string;
    current_minor: number;
    target_minor: number;
    current_bp: number;
    target_bp: number;
    difference_bp: number;
    side: "buy" | "sell";
    quantity: number;
    amount_minor: number;
    reason: string;
  }[];
}

// Parse decimal text without accepting exponent notation or silently rounding input.
export function parseScaled(value: string, decimals = 2): number | null {
  if (!Number.isInteger(decimals) || decimals < 1 || decimals > 2) return null;
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`).test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 10 ** decimals + Number(fraction.padEnd(decimals, "0"));
  return Number.isSafeInteger(result) ? result : null;
}

export interface RebalancingRun {
  id: string;
  status: "running" | "waiting" | "needs_review" | "completed" | "stopped" | "failed";
  created_at: number;
  updated_at: number;
  phase: "sell" | "buy";
  reason: string;
  cash_minor: number;
  stop_requested: boolean;
  skipped: { symbol: string; reason: string }[];
  orders: {
    symbol: string;
    side: "buy" | "sell";
    quantity: number;
    price_minor: number;
    status: string;
    broker_id?: string;
    broker_date?: string;
    filled_quantity: number;
    filled_minor: number;
  }[];
  preview: RebalancingPreview | null;
}
export type RebalancingAction = "runs" | "execute" | "resume" | "stop" | "attach";
export type RebalancingActionHandler = (action: RebalancingAction, body?: Record<string, unknown>) => Promise<{ run?: RebalancingRun; runs?: RebalancingRun[] }>;
