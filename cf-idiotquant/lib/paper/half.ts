// 반기 한 판을 브라우저 안에서 굴린다.
//
// ── 왜 여기로 왔나 ────────────────────────────────────────────────
// 예전에는 매수 한 번, 하루 넘기기 한 번마다 워커를 거쳐 D1 을 다섯 번 왕복했다. 반기
// 하나에 70~100번. 특히 자동 재생은 260ms 마다 그 왕복을 시켜서 뚝뚝 끊겼다. 지금은
// 판을 시작할 때 캔들을 통째로 받아 두고, 사고팔기·하루 넘기기·예약 체결을 전부 여기서
// 한다. 서버는 판을 만들 때와 반기가 끝날 때만 부른다.
//
// 대신 앞날이 브라우저 안에 있다 — 개발자 도구를 열면 볼 수 있다. 혼자 하는 게임이고
// 비로그인 판(localRound.ts)은 원래 그랬다는 것을 알고 고른 절충이다.
//
// ── 워커와 같아야 하는 것 ─────────────────────────────────────────
// 이 파일은 워커의 tradeReplayRoundD1 · advanceReplayRoundD1 · _fillReservations · _finish
// 를 옮긴 것이다. 순서와 규칙이 어긋나면 화면이 보여 준 판과 저장된 기록이 달라진다.
// 특히 지키는 것:
//   · 체결가는 언제나 **그 자리 종목의 그날 종가**다 (판의 캔들은 네 종목을 담은 지수라
//     체결가로 쓰면 있지도 않은 가격에 사고팔게 된다)
//   · 예약은 **커서를 민 뒤 새로 열린 날**에 본다
//   · 마지막 날에는 남은 것을 강제 청산하고 그 주문에 auto 를 달아 습관에서 뺀다
//
// 모든 함수는 받은 판을 고치지 않고 새 판을 돌려준다 — React 상태로 그대로 쓰기 위해서다.

import {
    quoteBuy, quoteSell, quoteShort, quoteCover, applyCover, shortCalled,
    type ShortQuote, type CoverQuote,
} from "./engine";
import { computeHabits } from "./habits";
import { triggered, validateReservation } from "./reservations";
import { seasonOf, missionMet } from "./season";
import {
    CONTEXT_DAYS, buyAndHoldReturn, carryQty,
    type ReplayHolding, type ReplayOrder, type ReplayRound, type Reservation,
} from "./round";

export type HalfResult =
    | {
        ok: true; round: ReplayRound; done?: boolean;
        /** 담보가 못 버텨 강제로 갚은 자리 수. 화면이 재생을 세우고 알린다. */
        called?: number;
    }
    | { ok: false; error: string };

/** 사고팔기의 네 가지. short·cover 는 빌려서 팔고 사서 갚는 것이다. */
export type TradeSide = "buy" | "sell" | "short" | "cover";

/** 미리 보여 준 구간. 반기 창을 달력으로 자르면 판마다 달라서 판에 적혀 온다. */
function contextDaysOf(round: ReplayRound): number {
    const v = Number(round.context_days);
    return Number.isFinite(v) && v > 0 ? v : CONTEXT_DAYS;
}

function holdingsOf(round: ReplayRound): ReplayHolding[] {
    return round.holdings ?? [];
}

/**
 * 공매도로 묶여 있는 현금.
 *
 * 현금은 판에 하나뿐이라 담보도 판 전체로 센다 — 한 자리에 걸어 둔 담보만큼 다른 자리에
 * 쓸 돈이 줄어야 "빌린 돈으로 더 크게 굴리는 길은 없다"가 지켜진다.
 */
export function lockedOf(round: ReplayRound): number {
    return holdingsOf(round).reduce((a, h) => a + (h.short_basis ?? 0), 0);
}

/**
 * 체결 하나를 판에 반영한다.
 *
 * 현금·시드는 판에 하나뿐이고 보유는 자리마다다. 워커에서는 이 둘을 한 batch 로 묶어
 * 한쪽만 남는 일이 없게 했는데, 여기서는 애초에 한 번에 새 판을 만들어 그 문제가 없다.
 */
function applyFill(
    round: ReplayRound,
    { slot, dayIdx, auto }: { slot: number; dayIdx: number; auto?: boolean },
    q: ReturnType<typeof quoteBuy> | ReturnType<typeof quoteSell>,
): ReplayRound {
    if (!q.ok) return round;
    const buy = q.side === "buy";

    const order: ReplayOrder = {
        day_index: dayIdx,
        side: buy ? "buy" : "sell",
        qty: q.qty,
        price: q.price,
        slot,
        // 지난 분기 목록의 "이 자리에 넣은 돈"이 수수료까지 세므로 함께 남긴다
        fee: q.fee,
        realized: buy ? null : q.realized,
        ...(auto ? { auto: 1 } : {}),
    };

    const nextRoundQty = buy ? round.qty + q.qty : round.qty - q.qty;
    return {
        ...round,
        cash: buy ? round.cash - q.total : round.cash + q.net,
        qty: nextRoundQty,
        // 전량을 팔면 잔여 원가를 0 으로 떨어뜨린다 — 남으면 가짜 손익이 생긴다
        cost_basis: buy
            ? round.cost_basis + q.total
            : (nextRoundQty === 0 ? 0 : round.cost_basis - q.costOut),
        realized: buy ? round.realized : round.realized + q.realized,
        fees_paid: round.fees_paid + q.fee,
        orders: [...round.orders, order],
        holdings: holdingsOf(round).map(h => {
            if (h.slot !== slot) return h;
            const nextQty = buy ? h.qty + q.qty : h.qty - q.qty;
            return {
                ...h,
                qty: nextQty,
                cost_basis: buy
                    ? h.cost_basis + q.total
                    : (nextQty === 0 ? 0 : h.cost_basis - q.costOut),
                realized: buy ? h.realized : h.realized + q.realized,
                orders: [...h.orders, order],
            };
        }),
    };
}

/**
 * 빌려서 팔거나(short) 사서 갚는(cover) 것을 판에 반영한다.
 *
 * 롱과 갈라 둔 이유는 돈이 도는 길이 다르기 때문이다 — 롱은 사면 현금이 나가고 팔면
 * 들어오지만, 공매도는 **판 대금을 손에 쥐지 않고 그대로 담보로 묶는다**(engine.ts).
 * 판 전체의 qty·cost_basis 는 롱의 것이라 여기서 건드리지 않는다.
 */
function applyShortFill(
    round: ReplayRound,
    { slot, dayIdx, auto }: { slot: number; dayIdx: number; auto?: boolean },
    q: ShortQuote | CoverQuote,
): ReplayRound {
    const opening = q.side === "short";

    const order: ReplayOrder = {
        day_index: dayIdx,
        side: opening ? "short" : "cover",
        qty: q.qty,
        price: q.price,
        slot,
        fee: q.fee,
        realized: opening ? null : q.realized,
        ...(auto ? { auto: 1 } : {}),
    };

    return {
        ...round,
        // 개시에는 현금이 움직이지 않는다 — 담보만 묶인다(engine.ts). 갚을 때 손익이 들어온다.
        cash: opening ? round.cash : round.cash + q.realized,
        realized: opening ? round.realized : round.realized + q.realized,
        fees_paid: round.fees_paid + q.fee,
        orders: [...round.orders, order],
        holdings: holdingsOf(round).map(h => {
            if (h.slot !== slot) return h;
            const pos = { short_qty: h.short_qty ?? 0, short_basis: h.short_basis ?? 0 };
            const next = opening
                ? { short_qty: pos.short_qty + q.qty, short_basis: pos.short_basis + q.net }
                : applyCover(pos, q);
            return {
                ...h, ...next,
                realized: opening ? h.realized : h.realized + q.realized,
                orders: [...h.orders, order],
            };
        }),
    };
}

/**
 * 오늘 사고팔기 — **날짜는 넘기지 않는다**.
 *
 * 종목이 넷이면 같은 날 둘을 사고 하나를 파는 게 당연한 일이라 시간과 매매를 묶어 둘 수
 * 없다. 시간은 halfAdvance 가 옮긴다.
 */
const TRADE_SIDES: TradeSide[] = ["buy", "sell", "short", "cover"];

export function halfTrade(
    round: ReplayRound, trade: { side: TradeSide; qty: number; slot?: number },
): HalfResult {
    if (round.status !== "playing") return { ok: false, error: "이미 끝난 판입니다." };

    const side = TRADE_SIDES.includes(trade?.side) ? trade.side : null;
    if (!side) return { ok: false, error: "side가 올바르지 않습니다." };
    const qty = Math.floor(Number(trade?.qty) || 0);

    const slot = Math.max(0, Math.floor(Number(trade?.slot) || 0));
    const hold = holdingsOf(round).find(h => h.slot === slot);
    if (!hold) return { ok: false, error: "그런 자리의 종목이 없습니다." };

    const dayIdx = round.cursor - 1;
    // 체결은 언제나 그 자리 종목의 그날 종가다.
    const price = hold.candles[dayIdx]?.c;
    if (!(price > 0)) return { ok: false, error: "그날은 이 종목을 거래할 수 없습니다." };

    if (side === "short" || side === "cover") {
        const q = side === "short"
            // 담보는 **묶이지 않은** 현금에서만 나온다 — 이미 걸어 둔 것을 빼고 준다.
            ? quoteShort({ price, qty, cash: round.cash - lockedOf(round) })
            : quoteCover({ price, qty, position: { short_qty: hold.short_qty ?? 0, short_basis: hold.short_basis ?? 0 } });
        if (!q.ok) return { ok: false, error: q.error };
        return { ok: true, round: applyShortFill(round, { slot, dayIdx }, q) };
    }

    const q = side === "buy"
        ? quoteBuy({ price, qty, cash: round.cash })
        : quoteSell({ price, qty, position: { qty: hold.qty, cost_basis: hold.cost_basis } });
    if (!q.ok) return { ok: false, error: q.error };

    return { ok: true, round: applyFill(round, { slot, dayIdx }, q) };
}

/**
 * 담보가 못 버티는 자리를 그날 종가로 강제 청산한다.
 *
 * 값이 오르는 데는 끝이 없어서, 이 선이 없으면 담보보다 큰 빚을 지고 현금이 음수가 되는
 * 판이 나온다. 플레이어가 누른 게 아니므로 auto 를 달아 습관에서 뺀다.
 */
function marginCalls(round: ReplayRound, dayIdx: number): { round: ReplayRound; called: number } {
    let next = round;
    let called = 0;
    for (const h of holdingsOf(round)) {
        const pos = { short_qty: h.short_qty ?? 0, short_basis: h.short_basis ?? 0 };
        const price = h.candles[dayIdx]?.c ?? 0;
        if (!(pos.short_qty > 0) || !(price > 0) || !shortCalled(pos, price)) continue;

        const q = quoteCover({ price, qty: pos.short_qty, position: pos });
        if (!q.ok) continue;
        next = applyShortFill(next, { slot: h.slot, dayIdx, auto: true }, q);
        called++;
    }
    return { round: next, called };
}

/**
 * 새로 열린 하루에 걸린 예약을 체결한다.
 *
 * 걸린 목록은 **체결을 시작하기 전에** 한 번 뽑고(그날 캔들은 변하지 않는다), 체결은
 * 하나씩 순서대로 하면서 갱신된 현금·보유를 본다. 현금이나 보유가 모자라 못 채우는
 * 예약은 **지우지 않는다** — 나중에 조건이 다시 걸리면 그때 체결될 수 있고, 조용히
 * 사라지면 플레이어는 걸어 둔 줄 알고 기다린다.
 */
function fillReservations(round: ReplayRound, dayIdx: number): ReplayRound {
    const pending = round.pending ?? [];
    if (!pending.length) return round;

    // 예약은 자리마다 걸린다 — 판정에 쓰는 고가·저가가 그 자리 종목의 것이어야 한다.
    // 자리를 안 적은 옛 예약은 0번 자리로 본다(그때는 종목이 하나뿐이었다).
    const hits: { res: Reservation; price: number; index: number; slot: number }[] = [];
    for (const h of holdingsOf(round)) {
        const day = h.candles[dayIdx];
        if (!day) continue;
        const mine = pending.map((res, index) => ({ res, index })).filter(x => (x.res.slot ?? 0) === h.slot);
        for (const t of triggered(mine.map(x => x.res), day)) {
            hits.push({ res: t.res, price: t.price, index: mine[t.index].index, slot: h.slot });
        }
    }
    if (!hits.length) return round;

    let next = round;
    const filled = new Set<number>();
    for (const hit of hits) {
        const hold = holdingsOf(next).find(h => h.slot === hit.slot);
        if (!hold) continue;
        const buy = hit.res.kind === "buy_limit";
        const q = buy
            ? quoteBuy({ price: hit.price, qty: hit.res.qty, cash: next.cash })
            : quoteSell({ price: hit.price, qty: hit.res.qty, position: { qty: hold.qty, cost_basis: hold.cost_basis } });
        if (!q.ok) continue;   // 현금·보유가 모자란다 → 예약은 그대로 둔다

        // 예약도 플레이어의 결정이다 — auto 를 달지 않아 습관에 그대로 들어간다.
        next = applyFill(next, { slot: hit.slot, dayIdx }, q);
        filled.add(hit.index);
    }

    if (!filled.size) return next;
    return { ...next, pending: pending.filter((_, i) => !filled.has(i)) };
}

/**
 * 반기를 닫는다. 완주면 마지막 캔들까지, 중도 포기면 그날까지.
 *
 * 이월을 고르면 넘길 만큼은 팔지 않고 남기고, 남긴 몫은 이 분기 성적에 **평가금액**으로
 * 들어간다 — 판 것으로 치면 안 판 이익을 판 것처럼 세게 된다.
 *
 * 분기 정산(aum_before·fee_perf …)은 여기서 안 채운다. 맡은 돈은 D1 에 있고, 그 숫자는
 * 결과를 제출할 때 서버가 확정해 돌려준다.
 */
export function finishHalf(round: ReplayRound, { carry = false }: { carry?: boolean } = {}): ReplayRound {
    const candles = round.candles ?? [];
    const lastIdx = Math.min(round.cursor, candles.length) - 1;
    const holdings = holdingsOf(round);
    const perSlotSeed = Math.floor(round.seed / Math.max(1, holdings.length));

    // 습관은 강제 청산을 넣기 전 주문으로 센다(computeHabits 가 auto 를 걸러 내므로 결과는
    // 같지만, 워커와 같은 입력을 주는 편이 나중에 규칙이 바뀌어도 안 어긋난다).
    const habits = computeHabits({
        candles,
        orders: round.orders,
        cursor: Math.min(round.cursor, candles.length),
        seed: round.seed,
        contextDays: contextDaysOf(round),
    });

    let next = round;
    let keptQty = 0;
    let carryValue = 0;

    // 빌린 주식은 이월되지 않는다 — 남의 것이라 다음 반기로 들고 갈 수 없다.
    // 롱을 정리하기 전에 먼저 갚는다(현금이 그만큼 오가야 청산 계산이 맞는다).
    for (const h of holdings) {
        const pos = { short_qty: h.short_qty ?? 0, short_basis: h.short_basis ?? 0 };
        const price = h.candles[lastIdx]?.c ?? 0;
        if (!(pos.short_qty > 0) || !(price > 0)) continue;
        const q = quoteCover({ price, qty: pos.short_qty, position: pos });
        if (q.ok) next = applyShortFill(next, { slot: h.slot, dayIdx: lastIdx, auto: true }, q);
    }

    for (const h of holdings) {
        const price = h.candles[lastIdx]?.c ?? 0;
        const keepQty = carry ? carryQty(h.qty, price, perSlotSeed) : 0;
        const sellQty = h.qty - keepQty;

        if (sellQty > 0 && price > 0) {
            const q = quoteSell({ price, qty: sellQty, position: { qty: h.qty, cost_basis: h.cost_basis } });
            // auto — 플레이어가 누른 게 아니라 마지막 날 강제 청산이다. 습관 계산에서
            // 빠져야 회전율·보유일이 정직해진다.
            if (q.ok) next = applyFill(next, { slot: h.slot, dayIdx: lastIdx, auto: true }, q);
        }

        keptQty += keepQty;
        carryValue += keepQty * price;
        next = {
            ...next,
            holdings: holdingsOf(next).map(x => x.slot === h.slot
                ? { ...x, qty: keepQty, cost_basis: keepQty * price, carried: keepQty > 0 }
                : x),
        };
    }

    const finalReturn = ((next.cash + carryValue - round.seed) / round.seed) * 100;
    // Buy & Hold 는 플레이어가 실제로 살 수 있었던 구간으로 재야 공정하다. 컨텍스트 구간은
    // 보여만 주고 거래는 못 하므로, 거기서부터 재면 플레이어가 만질 수 없는 등락을 상대에게만
    // 얹어 주는 셈이다. 첫 매수 가능일(contextDays-1) 종가가 기준점이다.
    const bhReturn = buyAndHoldReturn(candles.slice(contextDaysOf(round) - 1, lastIdx + 1));

    // 이번 반기의 목표를 해냈는가. 목표 자체는 (campaign_id, half_index) 에서 파생하므로
    // 판에 적혀 있지 않아도 여기서 다시 뽑을 수 있다. 서버도 같은 값을 뽑아 보상 액수를
    // 정한다 — 여기서 보내는 것은 해냈는지 여부뿐이다.
    const season = seasonOf(round.campaign_id, round.half_index);
    // 빌려서 판 자리도 담은 자리다 — 분산 목표가 롱만 세면 공매도로 굴린 반기가 억울해진다.
    const mine = round.orders.filter(o => (o.side === "buy" || o.side === "short") && !o.auto);
    const missionOk = season
        ? missionMet(season.mission, {
            excess: finalReturn - bhReturn,
            finalReturn,
            turnover: habits.turnover,
            maxExposure: habits.maxExposure,
            slotsUsed: new Set(mine.map(o => o.slot ?? 0)).size,
        })
        : null;

    return {
        ...next,
        qty: keptQty,
        cost_basis: keptQty > 0 ? carryValue : 0,
        status: "done",
        final_return: finalReturn,
        bh_return: bhReturn,
        habits,
        mission_ok: missionOk,
        carried: keptQty > 0,
        pending: [],
    };
}

/**
 * 하루 진행. 커서를 민 뒤 새로 열린 날의 예약을 본다.
 * 마지막 날에 닿으면 자동 청산하고 반기를 닫는다.
 */
export function halfAdvance(
    round: ReplayRound, { carry = false }: { carry?: boolean } = {},
): HalfResult {
    if (round.status !== "playing") return { ok: false, error: "이미 끝난 판입니다." };

    const candles = round.candles ?? [];
    if (!candles[round.cursor - 1]) return { ok: false, error: "캔들이 손상됐습니다." };

    const nextCursor = round.cursor + 1;
    if (nextCursor > candles.length) {
        return { ok: true, round: finishHalf({ ...round, cursor: candles.length }, { carry }), done: true };
    }

    const moved = { ...round, cursor: nextCursor };
    // 예약 체결이 먼저다 — 걸어 둔 것이 담보를 채워 마진콜을 면하게 할 수도 있다.
    const filled = fillReservations(moved, nextCursor - 1);
    const { round: next, called } = marginCalls(filled, nextCursor - 1);
    return { ok: true, round: next, done: false, called };
}

/** 중도 포기 — 그날까지로 반기를 닫는다. */
export function halfGiveUp(round: ReplayRound): HalfResult {
    if (round.status !== "playing") return { ok: false, error: "이미 끝난 판입니다." };
    return { ok: true, round: finishHalf(round), done: true };
}

/** 예약 걸기. */
export function halfReserve(round: ReplayRound, input: Partial<Reservation>): HalfResult {
    if (round.status !== "playing") return { ok: false, error: "이미 끝난 판입니다." };
    const pending = round.pending ?? [];
    const v = validateReservation(input, pending.length, Math.max(1, holdingsOf(round).length));
    if (!v.ok) return { ok: false, error: v.error };
    return { ok: true, round: { ...round, pending: [...pending, v.res] } };
}

/** 예약 지우기 — 자리(index)로 지운다. 같은 조건을 두 번 걸 수도 있어 값으로는 못 고른다. */
export function halfCancel(round: ReplayRound, index: number): HalfResult {
    if (round.status !== "playing") return { ok: false, error: "이미 끝난 판입니다." };
    const pending = round.pending ?? [];
    const i = Math.floor(Number(index));
    if (!(i >= 0 && i < pending.length)) return { ok: false, error: "없는 예약입니다." };
    return { ok: true, round: { ...round, pending: pending.filter((_, k) => k !== i) } };
}

/** 제출용 — 서버가 저장할 것만 추린다. 캔들은 서버가 이미 갖고 있어 보내지 않는다. */
export function halfSubmission(round: ReplayRound) {
    return {
        round_id: round.id,
        cursor: round.cursor,
        cash: round.cash,
        qty: round.qty,
        cost_basis: round.cost_basis,
        realized: round.realized,
        fees_paid: round.fees_paid,
        final_return: round.final_return,
        bh_return: round.bh_return,
        habits: round.habits,
        // 해냈는지만 보낸다. 보상 액수는 서버가 자기 목록에서 읽는다.
        mission_ok: round.mission_ok ?? null,
        carried: !!round.carried,
        holdings: holdingsOf(round).map(h => ({
            slot: h.slot, qty: h.qty, cost_basis: h.cost_basis,
            // 마감된 판에는 늘 0 이다(빌린 것은 이월되지 않는다). 체크포인트에서만 값이 산다.
            short_qty: h.short_qty ?? 0, short_basis: h.short_basis ?? 0,
            realized: h.realized, carried: !!h.carried,
        })),
        orders: round.orders.map(o => ({
            day_index: o.day_index, side: o.side, qty: o.qty,
            price: o.price, slot: o.slot ?? 0, auto: o.auto ? 1 : 0,
            fee: o.fee ?? 0, realized: o.realized ?? null,
        })),
    };
}

/** 이어 하기용 체크포인트 — 진행 중 상태. 기기를 바꿔도 판이 살아 있게 한다. */
export function halfCheckpoint(round: ReplayRound) {
    const s = halfSubmission(round);
    // 진행 중에는 목표 달성도 정산도 없다 — 반기가 닫혀야 정해진다.
    return {
        round_id: s.round_id, cursor: s.cursor, cash: s.cash, qty: s.qty,
        cost_basis: s.cost_basis, realized: s.realized, fees_paid: s.fees_paid,
        holdings: s.holdings, orders: s.orders, pending: round.pending ?? [],
    };
}
