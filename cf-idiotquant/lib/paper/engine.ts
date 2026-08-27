// 리플레이 매매 규칙 (클라이언트 판).
//
// 과거 일봉을 하루씩 넘기며 그날 종가로 사고파는 게임이라 실시간 장 시간 개념이 없다.
//
// 워커에 같은 규칙의 JS 판이 있다(idiotquant-backend/src/lib/paperEngine.js).
// 비로그인 사용자는 이 파일로 계산하고 로그인 사용자는 워커에서 계산하므로, 두 파일의
// 상수와 반올림 방식이 어긋나면 로그인 전후로 결과가 달라진다. 한쪽을 고치면 반드시
// 다른 쪽도 고칠 것. (레포가 갈라져 있어 코드를 공유할 수 없어 감수하는 중복이다)
//
// 금액은 전부 정수 원이다. 평단가를 저장하지 않고 cost_basis(총 매입금액)와 qty만 저장해
// 평단가를 파생시킨다 — 평단가를 반올림해 저장하면 부분 매도를 반복할 때 원가가 새기 때문이다.
//
// 필드명이 snake_case 인 것은 워커·D1 과 글자 그대로 같게 두기 위해서다. 두 엔진을 나란히
// 놓고 비교할 때 이름까지 같아야 어긋난 곳이 눈에 띈다.

export const SEED = 10_000_000;

// 수수료·세금은 분수로 두고 정수 연산으로 계산한다. 0.00015 를 곱하면
// 700000 * 0.00015 === 104.99999999999999 라 floor 가 105 대신 104 를 준다.
const FEE_DENOM = 100_000;
export const BUY_FEE_NUM = 15;   // 0.015%
export const SELL_FEE_NUM = 15;  // 0.015%
export const SELL_TAX_NUM = 180; // 0.18% 증권거래세 (매도만)

const cut = (gross: number, num: number) => Math.floor((gross * num) / FEE_DENOM);

export interface PaperPosition {
    ticker: string;
    name: string | null;
    qty: number;
    cost_basis: number;
}

export interface BuyQuote {
    ok: true; side: "buy"; price: number; qty: number; gross: number; fee: number; total: number;
}
export interface SellQuote {
    ok: true; side: "sell"; price: number; qty: number; gross: number; fee: number;
    net: number; costOut: number; realized: number;
}
export interface QuoteError { ok: false; error: string }

export function quoteBuy(args: { price: number; qty: number; cash: number }): BuyQuote | QuoteError {
    const price = Math.floor(Number(args.price) || 0);
    const qty = Math.floor(Number(args.qty) || 0);
    if (price <= 0) return { ok: false, error: "현재가를 가져오지 못했습니다." };
    if (qty <= 0) return { ok: false, error: "수량은 1주 이상이어야 합니다." };

    const gross = price * qty;
    const fee = cut(gross, BUY_FEE_NUM);
    const total = gross + fee;
    if (total > args.cash) {
        return { ok: false, error: `현금이 부족합니다. 필요 ${total.toLocaleString()}원 / 보유 ${Math.floor(args.cash).toLocaleString()}원` };
    }
    return { ok: true, side: "buy", price, qty, gross, fee, total };
}

// 보유분에서 읽는 것은 수량과 원가뿐이다. 종목 이름까지 요구하면 자리(slot)만 들고 있는
// 쪽이 쓸 수 없는 값을 지어내야 한다.
export function quoteSell(args: {
    price: number; qty: number;
    position?: (Partial<PaperPosition> & Pick<PaperPosition, "qty" | "cost_basis">) | null;
}): SellQuote | QuoteError {
    const price = Math.floor(Number(args.price) || 0);
    const qty = Math.floor(Number(args.qty) || 0);
    if (price <= 0) return { ok: false, error: "현재가를 가져오지 못했습니다." };
    if (qty <= 0) return { ok: false, error: "수량은 1주 이상이어야 합니다." };

    const held = Math.floor(Number(args.position?.qty) || 0);
    if (held < qty) return { ok: false, error: `보유 수량이 부족합니다. 보유 ${held}주` };

    const gross = price * qty;
    const fee = cut(gross, SELL_FEE_NUM) + cut(gross, SELL_TAX_NUM);
    const net = gross - fee;

    // 파는 수량만큼의 원가. 전량 매도(qty === held)면 cost_basis 와 정확히 같아져 잔여 원가가 0이 된다.
    const costOut = Math.round(((Number(args.position?.cost_basis) || 0) * qty) / held);
    return { ok: true, side: "sell", price, qty, gross, fee, net, costOut, realized: net - costOut };
}

export function applyBuy(position: PaperPosition | null | undefined, q: BuyQuote): { qty: number; cost_basis: number } {
    return {
        qty: (position?.qty ?? 0) + q.qty,
        cost_basis: (position?.cost_basis ?? 0) + q.total,
    };
}

export function applySell(position: PaperPosition, q: SellQuote): { qty: number; cost_basis: number } {
    const nextQty = position.qty - q.qty;
    return {
        qty: nextQty,
        cost_basis: nextQty === 0 ? 0 : position.cost_basis - q.costOut,
    };
}

/** 평단가 — 저장하지 않고 항상 여기서 파생시킨다. */
export function avgPrice(position: Pick<PaperPosition, "qty" | "cost_basis">): number {
    if (position.qty <= 0) return 0;
    return position.cost_basis / position.qty;
}
