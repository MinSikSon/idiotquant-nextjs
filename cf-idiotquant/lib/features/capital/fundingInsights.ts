import type { KrUsCapitalType, RefillTick } from "./capitalSlice";
import { numericValue } from "./tradingSummary";

type CashRow = { dnca_tot_amt?: unknown; crcy_cd?: unknown; frcr_dncl_amt_2?: unknown; frst_bltn_exrt?: unknown };
export function tradingCash(country: "KR" | "US", balance: { state: string; output2?: CashRow[] }) {
    const row = country === "KR" ? balance.output2?.[0] : balance.output2?.find(item => item.crcy_cd === "USD");
    const amount = balance.state === "rejected" ? null : numericValue(country === "KR" ? row?.dnca_tot_amt : row?.frcr_dncl_amt_2);
    const rate = country === "KR" ? 1 : numericValue(row?.frst_bltn_exrt);
    const krw = amount !== null && rate !== null && rate > 0 && Number.isFinite(amount * rate) ? amount * rate : null;
    return { amount, krw, rate, currency: country === "KR" ? "KRW" as const : "USD" as const, state: balance.state };
}
export type TradingCash = ReturnType<typeof tradingCash>;

export function fundingMetrics(capital: KrUsCapitalType, cashKrw: number | null) {
    const groups = capital.refill_plan?.groups ?? [];
    const buyGroups = groups.filter(group => group.side !== "sell");
    const buyMonthly = buyGroups.reduce((sum, group) => sum + group.monthly_budget_krw, 0);
    const buyPerTick = buyGroups.reduce((sum, group) => sum + group.per_tick_krw, 0);
    const sellPerTick = groups.filter(group => group.side === "sell").reduce((sum, group) => sum + group.per_tick_krw, 0);
    const buyIds = new Set((capital.groups ?? []).filter(group => group.side !== "sell" && group.id !== "__likes__").map(group => group.id));
    const buyTokens = (capital.stock_list ?? []).filter(stock => stock.group_id && buyIds.has(stock.group_id)).reduce((sum, stock) => sum + (numericValue(stock.token) ?? 0), 0);
    const period = capital.refill_plan?.period_minutes || 5;
    const ratio = (value: number) => cashKrw !== null && cashKrw > 0 ? value / cashKrw * 100 : null;
    return { hasPlan: !!capital.refill_plan, buyMonthly, buyPerTick, sellPerTick, buyTokens, period,
        buyPerHour: buyPerTick * 60 / period, sellPerHour: sellPerTick * 60 / period,
        monthlyRatio: capital.refill_plan ? ratio(buyMonthly) : null, tokenRatio: ratio(buyTokens),
        tickRatio: capital.refill_plan ? ratio(buyPerTick) : null, hourlyRatio: capital.refill_plan ? ratio(buyPerTick * 60 / period) : null,
    };
}

/** 실제 기록만 합산하며 누락 구간을 예상 충전금으로 채우지 않는다. */
export function refillBuckets(history: RefillTick[], now: number, minutes: 60 | 1440) {
    const count = minutes === 60 ? 12 : 24;
    const width = minutes * 60000 / count;
    const end = now;
    const start = end - count * width;
    const buckets = Array.from({ length: count }, (_, i) => ({ at: start + i * width, buy: 0, sell: 0, count: 0 }));
    for (const tick of history) {
        if (!Number.isFinite(tick.at) || tick.at <= start || tick.at > now) continue;
        const index = Math.ceil((tick.at - start) / width) - 1;
        if (index < 0 || index >= count) continue;
        const buy = numericValue(tick.buy_krw), sell = numericValue(tick.sell_krw);
        if (buy === null || sell === null || buy < 0 || sell < 0) continue;
        buckets[index].buy += buy;
        buckets[index].sell += sell;
        buckets[index].count++;
    }
    return buckets;
}

export function refillWindowOpen(country: "KR" | "US", now: number) {
    const hour = new Date(now + 9 * 3600000).getUTCHours();
    return country === "KR" ? hour >= 8 && hour < 18 : hour >= 21 || hour < 6;
}
