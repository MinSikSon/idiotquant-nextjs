// 비로그인 모의투자 계좌 — localStorage 에만 산다.
//
// 로그인 사용자는 워커가 같은 일을 하고(routes/user/paper.js), 여기서는 D1 대신 브라우저에
// 저장할 뿐 매매 규칙은 lib/paper/engine.ts 한 곳에서만 나온다.

import {
    SEED, quoteBuy, quoteSell, applyBuy, applySell,
    type BuyQuote, type SellQuote,
} from "./engine";
import type { PaperSnapshot, PaperPositionRow, PaperOrderRow } from "./types";

const KEY = "iq:paper:v1";
const ORDER_LIMIT = 50;

export function emptySnapshot(): PaperSnapshot {
    return {
        account: { cash: SEED, seed: SEED, realized: 0, fees_paid: 0, created_at: Math.floor(Date.now() / 1000) },
        positions: [],
        orders: [],
    };
}

export function loadLocal(): PaperSnapshot {
    if (typeof window === "undefined") return emptySnapshot();
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return emptySnapshot();
        const parsed = JSON.parse(raw) as PaperSnapshot;
        // 저장된 값이 깨져 있어도 화면이 죽지 않게 최소한만 확인한다
        if (typeof parsed?.account?.cash !== "number" || !Array.isArray(parsed.positions)) return emptySnapshot();
        return parsed;
    } catch {
        return emptySnapshot();
    }
}

export function saveLocal(snapshot: PaperSnapshot): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch {
        // 용량 초과·프라이빗 모드 — 저장만 실패하고 이번 세션은 그대로 굴러간다
    }
}

export function resetLocal(): PaperSnapshot {
    const fresh = emptySnapshot();
    saveLocal(fresh);
    return fresh;
}

export type LocalOrderResult =
    | { ok: true; snapshot: PaperSnapshot; filled: PaperOrderRow }
    | { ok: false; error: string };

/** 로컬 계좌에 체결을 반영한다. price 는 호출자가 KIS 실시간 현재가로 넘긴다. */
export function applyLocalOrder(
    snapshot: PaperSnapshot,
    args: { side: "buy" | "sell"; ticker: string; name: string | null; qty: number; price: number },
): LocalOrderResult {
    const { side, ticker, name, qty, price } = args;
    const position = snapshot.positions.find(p => p.ticker === ticker) ?? null;

    const quote = side === "buy"
        ? quoteBuy({ price, qty, cash: snapshot.account.cash })
        : quoteSell({ price, qty, position });

    if (!quote.ok) return { ok: false, error: quote.error };

    const account = { ...snapshot.account };
    let positions: PaperPositionRow[];

    if (quote.side === "buy") {
        const q = quote as BuyQuote;
        account.cash -= q.total;
        account.fees_paid += q.fee;
        const next = applyBuy(position, q);
        positions = position
            ? snapshot.positions.map(p => (p.ticker === ticker ? { ...p, ...next, name: name ?? p.name } : p))
            : [...snapshot.positions, { ticker, name, ...next }];
    } else {
        const q = quote as SellQuote;
        account.cash += q.net;
        account.fees_paid += q.fee;
        account.realized += q.realized;
        const next = applySell(position!, q);
        // 잔량 0 은 행 자체를 지운다 — 남겨두면 보유 목록에 0주짜리 유령이 뜬다
        positions = next.qty === 0
            ? snapshot.positions.filter(p => p.ticker !== ticker)
            : snapshot.positions.map(p => (p.ticker === ticker ? { ...p, ...next } : p));
    }

    const filled: PaperOrderRow = {
        id: (snapshot.orders[0]?.id ?? 0) + 1,
        ticker,
        name: name ?? position?.name ?? null,
        side,
        qty: quote.qty,
        price: quote.price,
        fee: quote.fee,
        realized: quote.side === "sell" ? quote.realized : null,
        created_at: Math.floor(Date.now() / 1000),
    };

    const next: PaperSnapshot = {
        account,
        positions,
        orders: [filled, ...snapshot.orders].slice(0, ORDER_LIMIT),
    };
    saveLocal(next);
    return { ok: true, snapshot: next, filled };
}
