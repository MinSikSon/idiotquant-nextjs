// 예약 주문 — "얼마가 되면 사고, 얼마가 되면 판다"를 미리 걸어 둔다.
//
// 워커 src/lib/reservations.js 의 TS 판이다. 판이 브라우저 안에서 돌아가면서
// 체결 판정도 여기로 왔다. 두 파일은 **같은 입력에 같은 답**을 내야 한다 —
// 어긋나면 화면이 보여 준 판과 서버에 저장된 결과가 달라진다.
// test/paper-reservations.test.ts 가 워커 테스트와 같은 기대값으로 그걸 붙들고 있다.
//
// ── 체결가를 어떻게 잡는가 ─────────────────────────────────────────
// 하루 안의 순서는 알 수 없고 우리가 가진 건 시가·고가·저가·종가뿐이다. 그래서
// **조건 가격 그대로** 체결하되, 갭으로 그 값을 건너뛰고 시작한 날은 **시가**로 잡는다.
// 이 규칙이 없으면 손절이 실제보다 유리해진다(갭 하락으로 조건보다 훨씬 아래에서
// 시작했는데 조건 가격에 팔린 것으로 치면, 있지도 않았던 가격에 판 셈이다).

import type { Candle, Reservation } from "./round";

export const RESERVE_KINDS = ["buy_limit", "stop_loss", "take_profit"] as const;
export const MAX_RESERVATIONS = 3;

/** 화면에 쓰는 이름. 규칙과 같은 파일에 둬야 이름과 동작이 어긋나지 않는다. */
export const RESERVE_LABEL: Record<Reservation["kind"], string> = {
    buy_limit: "지정가 매수",
    stop_loss: "손절",
    take_profit: "익절",
};

// 같은 날 여러 개가 걸리면 이 순서로 본다. 나쁜 일(손절)을 먼저 치는 쪽이 보수적이다 —
// 하루 안의 순서를 모르는 채 유리한 쪽을 먼저 치면 성적이 실제보다 좋게 나온다.
const ORDER: Record<string, number> = { stop_loss: 0, take_profit: 1, buy_limit: 2 };

/** 이 예약이 그날 걸렸는가. 걸렸으면 체결가를, 아니면 null. */
export function fillPrice(res: Reservation, candle: Candle | undefined): number | null {
    const price = Number(res?.price) || 0;
    const o = Number(candle?.o) || 0, h = Number(candle?.h) || 0, l = Number(candle?.l) || 0;
    if (!(price > 0) || !(o > 0) || !(h > 0) || !(l > 0)) return null;

    switch (res.kind) {
        // 아래로 내려오면 산다. 갭 하락으로 더 싸게 시작했으면 그 시가에 산다(유리한 쪽).
        case "buy_limit":
            return l <= price ? Math.min(price, o) : null;
        // 아래로 내려오면 판다. 갭 하락이면 시가에 팔린다(불리한 쪽) — 손절의 현실이다.
        case "stop_loss":
            return l <= price ? Math.min(price, o) : null;
        // 위로 올라가면 판다. 갭 상승이면 시가에 팔린다(유리한 쪽).
        case "take_profit":
            return h >= price ? Math.max(price, o) : null;
        default:
            return null;
    }
}

/** 걸린 예약을 순서대로. 각 항목은 원본과 체결가를 함께 준다. */
export function triggered(
    pending: Reservation[], candle: Candle | undefined,
): { res: Reservation; index: number; price: number }[] {
    return (Array.isArray(pending) ? pending : [])
        .map((res, index) => ({ res, index, price: fillPrice(res, candle) }))
        .filter((x): x is { res: Reservation; index: number; price: number } => x.price !== null)
        .sort((a, b) => (ORDER[a.res.kind] ?? 9) - (ORDER[b.res.kind] ?? 9));
}

export type ValidateResult =
    | { ok: true; res: Required<Reservation> }
    | { ok: false; error: string };

/**
 * 새 예약을 검사한다. 문제가 있으면 error 를 준다.
 *
 * 자리를 안 보내면 0번으로 본다 — 종목이 하나뿐이던 시절 예약과 같은 취급이다.
 *
 * @param slots 이 판의 자리 수. 그 밖의 자리는 거절한다.
 * @param maxRes 걸 수 있는 건수. 예약 데스크를 들이면 늘어난다(firm.ts 의 perksOf).
 */
export function validateReservation(
    input: Partial<Reservation> | null | undefined, pendingCount: number, slots = 1,
    maxRes = MAX_RESERVATIONS,
): ValidateResult {
    const kind = String(input?.kind ?? "") as Reservation["kind"];
    const price = Math.floor(Number(input?.price) || 0);
    const qty = Math.floor(Number(input?.qty) || 0);
    const slot = input?.slot == null ? 0 : Math.floor(Number(input.slot));
    // 자리 수 상한. 예약 건수 상한(maxRes)과는 다른 값이다.
    const slotMax = Math.max(1, Math.floor(Number(slots) || 1));

    if (!(RESERVE_KINDS as readonly string[]).includes(kind)) {
        return { ok: false, error: "예약 종류가 올바르지 않습니다." };
    }
    if (!(price > 0)) return { ok: false, error: "가격은 1원 이상이어야 합니다." };
    if (!(qty > 0)) return { ok: false, error: "수량은 1주 이상이어야 합니다." };
    if (!Number.isInteger(slot) || slot < 0 || slot >= slotMax) {
        return { ok: false, error: "없는 자리입니다." };
    }
    if (pendingCount >= maxRes) {
        return { ok: false, error: `예약은 ${maxRes}건까지 걸 수 있습니다.` };
    }
    return { ok: true, res: { kind, price, qty, slot } };
}
