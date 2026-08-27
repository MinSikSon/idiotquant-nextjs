// 비로그인 리플레이 — 판이 브라우저 안에서만 돌아간다.
//
// 로그인 사용자는 워커가 캔들을 쥐고 하루씩 흘려 주지만(routes/user/replay.js), 비로그인은
// 서버에 라운드를 만들 수 없어 캔들 전부가 브라우저에 있다. 마음만 먹으면 앞날을 볼 수 있지만
// 기록을 서버에 남기지 않으므로 속일 대상도 없다 — 기록이 걸린 쪽은 서버가 지킨다.
//
// 매매 규칙은 lib/paper/engine.ts, 판의 규칙은 lib/paper/round.ts 한 곳에서만 나온다.

import { SEED, quoteBuy, quoteSell, applyBuy, applySell, type BuyQuote, type SellQuote } from "./engine";
import { TOTAL_DAYS, CONTEXT_DAYS, buyAndHoldReturn, type Candle, type ReplayRound, type ReplayOrder } from "./round";
import { getInquireDailyItemChartPrice } from "@/lib/features/koreaInvestment/koreaInvestmentAPI";

const KEY = "iq:replay:v1";
const REQUEST_SPAN_DAYS = 95;  // 캘린더 100일을 넘기면 KIS 가 일봉 대신 주봉을 준다
const MAX_TRIES = 4;

function ymd(date: Date) {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** 6개월~5년 전. 너무 최근이면 그 구간 시장을 기억해 블라인드가 무의미해진다. */
function randomStart() {
    const now = Date.now();
    const min = now - 5 * 365 * 24 * 3600 * 1000;
    const max = now - 6 * 30 * 24 * 3600 * 1000;
    return new Date(min + Math.random() * (max - min));
}

function normalize(output2: any[]): Candle[] {
    return (output2 ?? [])
        .filter(r => Number(r?.stck_clpr) > 0 && r?.stck_bsop_date)
        .map(r => ({
            d: String(r.stck_bsop_date),
            o: Math.round(Number(r.stck_oprc) || 0),
            h: Math.round(Number(r.stck_hgpr) || 0),
            l: Math.round(Number(r.stck_lwpr) || 0),
            c: Math.round(Number(r.stck_clpr) || 0),
        }))
        .sort((a, b) => a.d.localeCompare(b.d));
}

/** 후보 종목에서 하나씩 시도해 60일치가 나오는 판을 만든다. */
export async function buildLocalRound(pool: { ticker: string; name: string }[]): Promise<ReplayRound | null> {
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, MAX_TRIES);

    for (const pick of shuffled) {
        try {
            const start = randomStart();
            const end = new Date(start.getTime() + REQUEST_SPAN_DAYS * 24 * 3600 * 1000);
            const res: any = await getInquireDailyItemChartPrice(pick.ticker, ymd(start), ymd(end));
            const candles = normalize(res?.output2);
            if (candles.length < TOTAL_DAYS) continue;

            const full = candles.slice(0, TOTAL_DAYS);
            const round: ReplayRound = {
                id: `local-${Date.now()}`,
                cursor: CONTEXT_DAYS,
                total_days: TOTAL_DAYS,
                cash: SEED, seed: SEED, qty: 0, cost_basis: 0, realized: 0, fees_paid: 0,
                status: "playing",
                orders: [],
                candles: full,           // 로컬은 전부 들고 있고 화면에서 cursor 까지만 그린다
                ticker: pick.ticker, name: pick.name,
                start_date: full[0].d, end_date: full[full.length - 1].d,
                final_return: null, bh_return: null,
                // 체험 운용에는 회사가 없다 — 정산은 로그인해야 붙는다
                aum_before: null, aum_after: null, fee_base: null, fee_perf: null,
                habits: null,     // 체험 운용은 서버가 없어 습관도 안 붙는다
                sector: null,     // 업종·판 성격도 서버가 붙인다
                scenario: null,
                pending: [],      // 체험 운용은 예약을 지원하지 않는다 (화면에서도 버튼을 안 띄운다)
                carried: false,   // 이월도 회사가 있어야 한다
            };
            saveLocal(round);
            return round;
        } catch {
            // 한 종목이 실패해도 판을 못 만들 이유는 없다
        }
    }
    return null;
}

export function loadLocal(): ReplayRound | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ReplayRound;
        if (!Array.isArray(parsed?.candles) || typeof parsed?.cursor !== "number") return null;
        // orders 를 넣기 전에 저장된 판이 남아 있을 수 있다
        return {
            ...parsed,
            orders: Array.isArray(parsed.orders) ? parsed.orders : [],
            aum_before: parsed.aum_before ?? null, aum_after: parsed.aum_after ?? null,
            fee_base: parsed.fee_base ?? null, fee_perf: parsed.fee_perf ?? null,
            habits: parsed.habits ?? null,
        };
    } catch {
        return null;
    }
}

export function saveLocal(round: ReplayRound | null): void {
    if (typeof window === "undefined") return;
    try {
        if (round) window.localStorage.setItem(KEY, JSON.stringify(round));
        else window.localStorage.removeItem(KEY);
    } catch {
        // 용량 초과·프라이빗 모드 — 저장만 실패하고 이번 판은 그대로 굴러간다
    }
}

function finish(round: ReplayRound): ReplayRound {
    const lastIdx = Math.min(round.cursor, round.candles.length) - 1;
    const lastPrice = round.candles[lastIdx]?.c ?? 0;

    let { cash, realized, fees_paid: fees, qty, cost_basis } = round;
    const orders = [...round.orders];
    if (qty > 0 && lastPrice > 0) {
        const q = quoteSell({ price: lastPrice, qty, position: { ticker: round.ticker!, name: round.name, qty, cost_basis } });
        if (q.ok) {
            const s = q as SellQuote;
            cash += s.net;
            realized += s.realized;
            fees += s.fee;
            orders.push({ day_index: lastIdx, side: "sell", qty, price: s.price });
            qty = 0;
            cost_basis = 0;
        }
    }

    const finalReturn = ((cash - round.seed) / round.seed) * 100;
    // 플레이어가 실제로 살 수 있었던 구간으로 재야 공정하다. 컨텍스트 20일은 보여만 주고
    // 거래는 못 하므로, 거기서부터 재면 만질 수 없는 20일치 등락을 상대에게만 얹어 준다.
    const bhReturn = buyAndHoldReturn(round.candles.slice(CONTEXT_DAYS - 1, lastIdx + 1));

    const done: ReplayRound = {
        ...round, cash, realized, fees_paid: fees, qty: 0, cost_basis: 0,
        orders,
        status: "done",
        final_return: finalReturn,
        bh_return: bhReturn,
    };
    saveLocal(done);
    return done;
}

export type LocalAdvance =
    | { ok: true; round: ReplayRound; done: boolean }
    | { ok: false; error: string };

/** 하루 진행. trade 가 있으면 그날(= 마지막 공개 캔들) 종가로 먼저 체결한다. */
// 체험 운용은 종목 하나짜리 판이라 slot 은 받기만 하고 쓰지 않는다(언제나 0번).
export function advanceLocal(round: ReplayRound, trade?: { side: "buy" | "sell"; qty: number; slot?: number } | null): LocalAdvance {
    if (round.status !== "playing") return { ok: false, error: "이미 끝난 판입니다." };
    const today = round.candles[round.cursor - 1];
    if (!today) return { ok: false, error: "캔들이 손상됐습니다." };

    let next = { ...round };

    if (trade?.side) {
        const position = { ticker: round.ticker!, name: round.name, qty: round.qty, cost_basis: round.cost_basis };
        const q = trade.side === "buy"
            ? quoteBuy({ price: today.c, qty: trade.qty, cash: round.cash })
            : quoteSell({ price: today.c, qty: trade.qty, position });
        if (!q.ok) return { ok: false, error: q.error };

        // 몇 번째 캔들에서 체결됐는지 — 차트에 찍을 자리다
        const order: ReplayOrder = { day_index: round.cursor - 1, side: q.side, qty: q.qty, price: q.price };

        if (q.side === "buy") {
            const b = q as BuyQuote;
            const pos = applyBuy(position, b);
            next = { ...next, cash: next.cash - b.total, fees_paid: next.fees_paid + b.fee, ...pos };
        } else {
            const s = q as SellQuote;
            const pos = applySell(position, s);
            next = { ...next, cash: next.cash + s.net, realized: next.realized + s.realized, fees_paid: next.fees_paid + s.fee, ...pos };
        }
        next = { ...next, orders: [...next.orders, order] };
    }

    const nextCursor = next.cursor + 1;
    if (nextCursor > TOTAL_DAYS) {
        return { ok: true, round: finish({ ...next, cursor: TOTAL_DAYS }), done: true };
    }

    next = { ...next, cursor: nextCursor };
    saveLocal(next);
    return { ok: true, round: next, done: false };
}

export function giveUpLocal(round: ReplayRound): ReplayRound {
    return finish(round);
}
