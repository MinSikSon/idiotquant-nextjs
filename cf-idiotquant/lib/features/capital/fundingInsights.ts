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
    // 현재 ON인 풀의 활성 종목만 합산한다. 마지막 리필 계획은 설정 변경보다 늦을 수 있다.
    const activeGroups = new Map((capital.groups ?? []).filter(group => group.id !== "__likes__" && group.is_trading_active !== false).map(group => [group.id, group]));
    let activeBuy = 0, activeSell = 0, activeStocks = 0;
    const activePools = new Set<string>();
    for (const stock of capital.stock_list ?? []) {
        const group = stock.group_id ? activeGroups.get(stock.group_id) : undefined;
        if (!group || stock.action !== "active") continue;
        const amount = Math.max(0, numericValue(stock.token) ?? 0);
        if (group.side === "sell") activeSell += amount;
        else activeBuy += amount;
        activeStocks++;
        activePools.add(group.id);
    }
    const activeTotal = activeBuy + activeSell;
    const period = capital.refill_plan?.period_minutes || 5;
    const ratio = (value: number) => cashKrw !== null && cashKrw > 0 ? value / cashKrw * 100 : null;
    return { activeBuy, activeSell, activeTotal, activeStocks, activePools: activePools.size, activeRatio: ratio(activeTotal), activeBuyRatio: ratio(activeBuy), activeSellRatio: ratio(activeSell),
        hasPlan: !!capital.refill_plan, buyMonthly, buyPerTick, sellPerTick, period,
        buyPerHour: buyPerTick * 60 / period, sellPerHour: sellPerTick * 60 / period,
        monthlyRatio: capital.refill_plan ? ratio(buyMonthly) : null,
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
