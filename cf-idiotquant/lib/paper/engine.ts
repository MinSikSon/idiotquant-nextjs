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

/* ── 공매도 ────────────────────────────────────────────────────────
   빌린 주식을 먼저 팔고 나중에 사서 갚는다. 값이 내려가면 번다.

   ── 왜 넣었나 ──────────────────────────────────────────────────
   살 수만 있으면 크게 빠지는 반기에는 할 수 있는 게 없다 — 사면 잃고, 안 사면
   관망 패널티를 받는다. 대응할 수단 없이 벌만 주는 자리가 된다.

   ── 돈이 어떻게 도는가 ──────────────────────────────────────────
   판 대금을 손에 쥐지 않는다. **그 돈이 그대로 담보로 묶인다.**

     공매도  현금은 그대로 두고, 판 값만큼이 담보로 묶인다(그만큼 살 돈이 준다)
     갚기    담보가 풀리고, 그 사이의 값 차이가 손익으로 현금에 반영된다

   그래서 "공매도하려면 묶이지 않은 현금이 그만큼 있어야 한다"가 규칙의 전부다 —
   빌린 돈으로 더 크게 굴리는(레버리지) 길은 열지 않았다. 담보 100%.

   개시에 현금이 안 움직이는 것이 중요하다. 담보를 현금에서 빼고 평가손익까지 더하면
   같은 돈을 두 번 세게 된다. 지금은 내 돈 = 현금 + 롱 평가금액 + 공매도 평가손익 으로
   딱 떨어진다. 수수료·세금은 담보(short_basis)를 그만큼 깎아 둬서, 개시 직후의 평가손익이
   정확히 -수수료가 된다. */

/** 빌려서 판 자리. 갚을 것이 얼마이고, 담보로 묶인 돈이 얼마인가. */
export interface ShortPosition {
    short_qty: number;
    /** 팔아서 받은 돈(수수료·세금 뺀 실수령)의 합계. 그대로 묶인 담보이기도 하다. */
    short_basis: number;
}

export interface ShortQuote {
    ok: true; side: "short"; price: number; qty: number; gross: number; fee: number;
    /** 묶이는 담보 = 실수령(수수료·세금 뺀 값). 현금은 움직이지 않는다. */
    net: number;
}
export interface CoverQuote {
    ok: true; side: "cover"; price: number; qty: number; gross: number; fee: number;
    /** 갚는 데 드는 돈 */
    cost: number;
    /** 풀리는 담보 몫 */
    basisOut: number;
    /** 이 거래로 확정되는 손익. 현금이 이만큼 움직인다(개시 수수료까지 이미 반영돼 있다). */
    realized: number;
}

/**
 * 평가손실이 담보의 이만큼을 넘으면 강제로 갚게 한다(%).
 *
 * 빌린 것이 무섭지 않으면 넣은 뜻이 없다. 값이 오르는 데는 끝이 없어서, 이 선이 없으면
 * 담보보다 큰 빚을 지고 현금이 음수가 되는 판이 나온다.
 */
export const SHORT_CALL_PCT = 80;

/**
 * 공매도 개시. 담보가 모자라면 거절한다.
 *
 * @param cash **묶이지 않은** 현금. 이미 걸어 둔 담보는 부르는 쪽이 빼고 준다.
 */
export function quoteShort(args: { price: number; qty: number; cash: number }): ShortQuote | QuoteError {
    const price = Math.floor(Number(args.price) || 0);
    const qty = Math.floor(Number(args.qty) || 0);
    if (price <= 0) return { ok: false, error: "현재가를 가져오지 못했습니다." };
    if (qty <= 0) return { ok: false, error: "수량은 1주 이상이어야 합니다." };

    const gross = price * qty;
    // 빌려서 파는 것도 파는 것이다 — 매도 수수료와 거래세를 그대로 낸다.
    const fee = cut(gross, SELL_FEE_NUM) + cut(gross, SELL_TAX_NUM);
    if (gross > args.cash) {
        return { ok: false, error: `담보가 부족합니다. 필요 ${gross.toLocaleString()}원 / 남은 현금 ${Math.floor(args.cash).toLocaleString()}원` };
    }
    // 담보는 실수령으로 잡는다 — 그래야 개시 직후의 평가손익이 정확히 -수수료가 된다.
    return { ok: true, side: "short", price, qty, gross, fee, net: gross - fee };
}

/** 환매수 — 사서 갚는다. */
export function quoteCover(args: {
    price: number; qty: number; position?: ShortPosition | null;
}): CoverQuote | QuoteError {
    const price = Math.floor(Number(args.price) || 0);
    const qty = Math.floor(Number(args.qty) || 0);
    if (price <= 0) return { ok: false, error: "현재가를 가져오지 못했습니다." };
    if (qty <= 0) return { ok: false, error: "수량은 1주 이상이어야 합니다." };

    const owed = Math.floor(Number(args.position?.short_qty) || 0);
    if (owed < qty) return { ok: false, error: `갚을 수량이 부족합니다. 빌린 것 ${owed}주` };

    const gross = price * qty;
    const fee = cut(gross, BUY_FEE_NUM);
    const cost = gross + fee;
    // 갚는 수량만큼의 담보. 전부 갚으면(qty === owed) short_basis 와 정확히 같아져 0 이 된다.
    const basisOut = Math.round(((Number(args.position?.short_basis) || 0) * qty) / owed);
    return { ok: true, side: "cover", price, qty, gross, fee, cost, basisOut, realized: basisOut - cost };
}

/** 갚고 난 자리. 담보가 풀리고 빌린 수량이 준다. */
export function applyCover(position: ShortPosition, q: CoverQuote): ShortPosition {
    const nextQty = position.short_qty - q.qty;
    return {
        short_qty: nextQty,
        short_basis: nextQty === 0 ? 0 : position.short_basis - q.basisOut,
    };
}

/**
 * 지금 값으로 쳤을 때 이 공매도의 평가손익. 값이 내려갔으면 양수다.
 *
 * 담보(short_basis)는 팔았을 때 받은 돈이고, 지금 갚으려면 price × qty 가 든다.
 */
export function shortPnl(position: ShortPosition | null | undefined, price: number): number {
    const qty = Math.floor(Number(position?.short_qty) || 0);
    if (qty <= 0) return 0;
    return (Number(position?.short_basis) || 0) - Math.floor(Number(price) || 0) * qty;
}

/** 담보가 못 버티는가 — 평가손실이 담보의 SHORT_CALL_PCT 를 넘었는가. */
export function shortCalled(position: ShortPosition | null | undefined, price: number): boolean {
    const basis = Number(position?.short_basis) || 0;
    if (!(basis > 0) || !((Number(position?.short_qty) || 0) > 0)) return false;
    return -shortPnl(position, price) > (basis * SHORT_CALL_PCT) / 100;
}

/** 평단가 — 저장하지 않고 항상 여기서 파생시킨다. */
export function avgPrice(position: Pick<PaperPosition, "qty" | "cost_basis">): number {
    if (position.qty <= 0) return 0;
    return position.cost_basis / position.qty;
}
