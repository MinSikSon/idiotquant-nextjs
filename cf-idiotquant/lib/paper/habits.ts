// 매매 습관 — 한 판에서 관찰된 사실만 뽑는다.
//
// 워커 src/lib/habits.js 의 computeHabits 를 옮긴 것이다. 판이 브라우저에서 굴러가면서
// 반기 마감도 여기서 하게 됐고, 습관은 마감 때 확정되는 값이라 함께 왔다.
// 여러 판을 합치는 summarizeHabits 는 옮기지 않았다 — 지난 기록은 D1 에만 있어서
// 그 계산은 워커에 남는 것이 맞다.
//
// test/paper-habits.test.ts 가 워커 test/habits.test.js 와 같은 기대값을 들고 있다.
//
// ── 왜 "성향"이 아니라 "습관"인가 ──────────────────────────────────────
// 40일짜리 한 판에 체결 두세 건으로 "당신은 ○○형 투자자"라고 단정하면 근거 없는
// 확신이고, 다음 판에 정반대로 나올 수 있다. 그래서 유형·칭호를 붙이지 않고
// 관찰된 값만 낸다. 말할 수 없는 건 null 로 두고 화면이 "아직 알 수 없음"이라고 적는다.

import type { Candle, ReplayOrder, RoundHabits } from "./round";

/** 진입 타이밍을 볼 때 되돌아보는 거래일 수. 컨텍스트 20일 덕에 항상 계산 가능하다. */
const TREND_LOOKBACK = 5;

const round1 = (v: number) => Math.round(v * 10) / 10;
const pct1 = (num: number, den: number) => (den > 0 ? round1((num / den) * 100) : null);

/**
 * 한 판의 매매 습관.
 *
 * @param cursor       공개된 캔들 수 (거래 가능 마지막 날 = cursor-1)
 * @param contextDays  앞부분 컨텍스트 구간(거래 불가)
 */
export function computeHabits({ candles, orders, cursor, seed, contextDays }: {
    candles: Candle[];
    orders: ReplayOrder[];
    cursor: number;
    seed: number;
    contextDays: number;
}): RoundHabits {
    const cs = Array.isArray(candles) ? candles : [];
    // 마지막 날 강제 청산은 플레이어의 선택이 아니다 — 습관에서 뺀다.
    const manual = (Array.isArray(orders) ? orders : [])
        .filter(o => !o.auto)
        .slice()
        .sort((a, b) => a.day_index - b.day_index || (a.side === "buy" ? -1 : 1));

    const buys = manual.filter(o => o.side === "buy");
    const firstDay = Math.max(0, (contextDays ?? 0) - 1);
    const lastDay = Math.max(firstDay, (cursor ?? cs.length) - 1);
    const tradableDays = lastDay - firstDay + 1;

    // ── 매수/매도 FIFO 매칭 ────────────────────────────────────
    // 매도 한 건이 여러 매수에 걸칠 수 있어 조각으로 쪼갠다. 각 조각의 보유일과 손익
    // 부호를 알아야 "이익은 며칠 만에, 손실은 며칠 만에 팔았나"를 말할 수 있다.
    const lots = buys.map(b => ({ day: b.day_index, price: b.price, left: b.qty }));
    const closed: { qty: number; days: number; gain: boolean }[] = [];
    let li = 0;
    for (const s of manual) {
        if (s.side !== "sell") continue;
        let need = s.qty;
        while (need > 0 && li < lots.length) {
            const lot = lots[li];
            if (lot.left <= 0) { li++; continue; }
            const take = Math.min(need, lot.left);
            closed.push({
                qty: take,
                days: s.day_index - lot.day,
                gain: s.price > lot.price,   // 수수료 전 단가 비교 — 방향만 본다
            });
            lot.left -= take;
            need -= take;
            if (lot.left === 0) li++;
        }
    }

    const wavg = <T extends { qty: number }>(rows: T[], pick: (r: T) => number) => {
        const q = rows.reduce((a, r) => a + r.qty, 0);
        return q > 0 ? round1(rows.reduce((a, r) => a + pick(r) * r.qty, 0) / q) : null;
    };

    // ── 1. 회전율 · 보유 기간 ─────────────────────────────────
    const buyAmount = buys.reduce((a, b) => a + b.price * b.qty, 0);
    const turnover = seed > 0 && buyAmount > 0 ? round1(buyAmount / seed) : (buyAmount > 0 ? null : 0);
    const holdDays = wavg(closed, r => r.days);

    // ── 2. 진입 타이밍 (추격 ↔ 저가매수) ───────────────────────
    // 산 날 직전 5거래일 수익률. 양수면 오르는 중에 샀다는 뜻이다.
    const entries = buys.map(b => {
        const i = b.day_index;
        const base = cs[Math.max(0, i - TREND_LOOKBACK)]?.c;
        const now = cs[i]?.c;
        return { qty: b.qty, trend: base > 0 && now > 0 ? ((now - base) / base) * 100 : 0 };
    });
    const entryTrend = wavg(entries, r => r.trend);
    const chaseQty = entries.filter(e => e.trend > 0).reduce((a, e) => a + e.qty, 0);
    const totalBuyQty = entries.reduce((a, e) => a + e.qty, 0);
    const chaseRatio = pct1(chaseQty, totalBuyQty);

    // ── 3. 처분효과 (이익은 빨리, 손실은 오래) ─────────────────
    // 양쪽이 다 있어야 비교가 성립한다. 한쪽만 있으면 말하지 않는다.
    const gains = closed.filter(r => r.gain);
    const losses = closed.filter(r => !r.gain);
    const gainHoldDays = gains.length ? wavg(gains, r => r.days) : null;
    const lossHoldDays = losses.length ? wavg(losses, r => r.days) : null;
    const disposition = gainHoldDays !== null && lossHoldDays !== null
        ? round1(lossHoldDays - gainHoldDays)   // 양수 = 손실을 더 오래 들고 있었다
        : null;

    // ── 4. 투입 강도 · 관망 ───────────────────────────────────
    // 한 번에 얼마나 넣었나 — 그 시점 총자산 대비. 시드에서 시작해 체결을 따라간다.
    let cash = seed, qty = 0, maxExposure = 0;
    const bites: { qty: number; share: number }[] = [];
    for (const o of manual) {
        const price = cs[o.day_index]?.c ?? o.price;
        const assetsBefore = cash + qty * price;
        if (o.side === "buy") {
            const amount = o.price * o.qty;
            if (assetsBefore > 0) bites.push({ qty: o.qty, share: (amount / assetsBefore) * 100 });
            cash -= amount; qty += o.qty;
        } else {
            cash += o.price * o.qty; qty -= o.qty;
        }
        const assetsAfter = cash + qty * price;
        if (assetsAfter > 0) maxExposure = Math.max(maxExposure, (qty * price) / assetsAfter);
    }
    const biteShare = wavg(bites, r => r.share);
    const tradedDays = new Set(manual.map(o => o.day_index)).size;
    const watchRatio = pct1(tradableDays - tradedDays, tradableDays);

    return {
        trades: manual.length,
        buys: buys.length,
        sells: manual.length - buys.length,
        closedLots: closed.length,
        tradableDays,
        turnover,
        holdDays,
        entryTrend,
        chaseRatio,
        gainHoldDays,
        lossHoldDays,
        disposition,
        biteShare,
        maxExposure: manual.length ? round1(maxExposure * 100) : 0,
        watchRatio,
    };
}
