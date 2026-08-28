// 몇 주를 살까 · 몇 주를 팔까.
//
// 게임 화면의 버튼은 주식 수를 직접 묻지 않는다 — 실제로 하는 생각은 "반은 실어 보자",
// "세 번에 나눠 사자", "주식 비중을 60%로 맞추자" 쪽이다. 그 말을 주식 수로 옮기는 것이
// 이 파일이 하는 일 전부다.
//
// 계산만 있고 상태가 없어서 page.tsx 에서 떼어 뒀다. 이 셈이 틀리면 화면이 아니라 돈이
// 틀리는 자리라, 눈으로 확인하는 대신 테스트로 못박는다(test/paper-sizing.test.ts).
//
// 체결 규칙(수수료·세금)은 engine.ts 한 곳에만 있다. 여기서 수수료를 다시 계산하지 않고
// 견적을 물어보는 이유는, 두 벌로 두면 어느 날 한쪽만 고쳐지기 때문이다.

import { quoteBuy, quoteShort } from "./engine";

/**
 * 예산 안에서 살 수 있는 최대 주수.
 *
 * `budget / price` 로 끝내면 수수료만큼 모자라 체결이 거절된다. 견적이 통과할 때까지
 * 한 주씩 내리는데, 수수료가 0.015% 라 실제로는 한두 번 만에 끝난다.
 */
export function qtyWithinBudget(budget: number, price: number): number {
    if (!(price > 0) || !(budget > 0)) return 0;
    let n = Math.floor(budget / price);
    while (n > 0 && !quoteBuy({ price, qty: n, cash: budget }).ok) n--;
    return n;
}

/**
 * **내 돈**(현금 + 주식 평가금액)의 pct% 어치.
 *
 * 현금 기준이 아니라 총자산 기준이다 — 현금 기준으로 25% 를 네 번 누르면
 * 25 → 19 → 14 → 10% 로 줄어들어 네 종목을 고르게 담을 수가 없었다.
 * 내 돈 기준이면 25% 를 네 번 눌러 균등 매수가 그대로 된다.
 *
 * 살 돈은 어차피 현금을 넘을 수 없으므로 현금으로 한 번 자른다(그래서 현금이 모자라면
 * 버튼에 적힌 주수가 그만큼 줄어든다). 100%(최대)만 현금 전액이다.
 */
/**
 * 담보 안에서 빌려 팔 수 있는 최대 주수.
 *
 * 공매도는 판 대금을 쥐지 않고 그대로 담보로 묶으므로(engine.ts), 걸리는 것은 현금뿐이다.
 * 사는 쪽과 달리 수수료가 담보를 **깎아 주는** 방향이라 한 주 더 들어갈 때가 있는데,
 * 견적에 물어보는 방식이라 그 차이도 저절로 맞는다.
 */
export function shortQtyWithinCash(cash: number, price: number): number {
    if (!(price > 0) || !(cash > 0)) return 0;
    let n = Math.floor(cash / price);
    // 수수료만큼 담보가 줄어 한 주가 더 들어가는 경우
    while (quoteShort({ price, qty: n + 1, cash }).ok) n++;
    while (n > 0 && !quoteShort({ price, qty: n, cash }).ok) n--;
    return n;
}

/**
 * **내 돈**의 pct% 어치를 빌려 판다. 비율 매수와 같은 기준·같은 눈금이다.
 *
 * 담보는 현금에서 나가므로 현금으로 한 번 자른다(비율 매수가 그러는 것과 같다).
 */
export function partShortQty(args: { pct: number; price: number; cash: number; totalAssets: number }): number {
    const { pct, price, cash, totalAssets } = args;
    const budget = pct >= 100 ? cash : Math.min(cash, Math.floor(totalAssets * pct / 100));
    return shortQtyWithinCash(budget, price);
}

export function partBuyQty(args: { pct: number; price: number; cash: number; totalAssets: number }): number {
    const { pct, price, cash, totalAssets } = args;
    const budget = pct >= 100 ? cash : Math.min(cash, Math.floor(totalAssets * pct / 100));
    return qtyWithinBudget(budget, price);
}

/**
 * 내 돈을 `parts` 등분한 **한 몫**.
 *
 * 위의 비율 매수와 같은 기준(내 돈)이다. 한때 남은 현금을 등분했는데, 그러면 1/3 을 세 번
 * 눌러도 33 → 22 → 15% 로 줄어들어 세 번에 나눠 담은 것이 되지 않았다. 등분은 "몇 번에
 * 나눠 담을까"이고, 세 번 나눠 담았으면 세 몫이 같아야 그 말이 맞는다.
 *
 * 비율 쪽과 다른 것은 눈금뿐이다 — 1/3·1/5 처럼 나누어 떨어지지 않는 몫은 % 로는 짚을 수
 * 없고, 담을 자리가 셋·다섯일 때 필요한 것이 그 몫이다.
 */
export function splitBuyQty(args: { parts: number; price: number; cash: number; totalAssets: number }): number {
    const { parts, price, cash, totalAssets } = args;
    if (!(parts >= 1)) return 0;
    // 살 돈은 어차피 현금을 넘을 수 없다(비율 매수와 같은 규칙).
    return qtyWithinBudget(Math.min(cash, Math.floor(totalAssets / parts)), price);
}

/** 보유의 pct%. 100% 는 남김없이 — 1주라도 남으면 "전부"가 거짓말이 된다. */
export function sellPartQty(held: number, pct: number): number {
    if (held <= 0) return 0;
    return pct >= 100 ? held : Math.max(1, Math.min(held, Math.floor(held * pct / 100)));
}

export interface RebalanceOrder { side: "buy" | "sell"; qty: number }

/**
 * 이 종목이 내 돈의 `targetPct`% 를 차지하도록 사거나 판다.
 *
 * 종목이 하나뿐인 판에서는 이것이 곧 주식과 현금의 비율이다. 넷이면 "이 자리에 얼마를
 * 담을까"가 되고, 넷 모두 25% 로 맞추면 균등 배분이 된다.
 *
 * 수수료 때문에 맞춘 뒤 비중이 목표에서 아주 조금 어긋난다. 그것을 메우려고 한 주를 더
 * 얹지는 않는다 — 목표를 넘겨 사는 것이 모자라게 사는 것보다 나쁘다.
 *
 * 되돌릴 것이 없으면(이미 목표에 있거나 살 현금이 없으면) null 을 준다. 0주 주문을
 * 만들어 내보내면 버튼이 눌리는데 아무 일도 안 일어난다.
 */
export function rebalanceOrder(args: {
    targetPct: number; price: number; cash: number; held: number; totalAssets: number;
}): RebalanceOrder | null {
    const { targetPct, price, cash, held, totalAssets } = args;
    if (!(totalAssets > 0)) return null;
    const targetValue = Math.round(totalAssets * Math.min(100, Math.max(0, targetPct)) / 100);
    return fitToValue({ targetValue, price, cash, held });
}

/**
 * 이 자리의 평가금액을 `targetValue` 원에 맞추는 주문.
 *
 * 비중(%)이 아니라 금액으로 받는다. 자리가 여럿일 때는 "내 돈의 몇 %"를 자리마다 다시
 * 계산하는 것보다 목표 금액을 한 번 나눠 주는 편이 어긋날 자리가 없다.
 */
export function fitToValue(args: {
    targetValue: number; price: number; cash: number; held: number;
}): RebalanceOrder | null {
    const { targetValue, price, cash, held } = args;
    if (!(price > 0)) return null;

    const gap = targetValue - held * price;
    if (gap > 0) {
        const qty = qtyWithinBudget(Math.min(cash, gap), price);
        return qty > 0 ? { side: "buy", qty } : null;
    }
    // 파는 쪽은 반올림하지 않고 버린다. 반올림하면 목표보다 한 주 더 팔아 비중이 밑돈다.
    const qty = Math.min(held, Math.floor(-gap / price));
    return qty > 0 ? { side: "sell", qty } : null;
}

export interface SlotOrder extends RebalanceOrder { slot: number }
export interface EqualWeightPlan {
    /** 자리마다 맞출 금액. 화면이 "각 N%" 를 적을 때 쓴다. */
    targetValue: number;
    /** 실행할 주문. **파는 것이 먼저다** — 그 돈이 있어야 살 수 있다. */
    orders: SlotOrder[];
}

/**
 * 전 자리 균등 — 현금을 `cashPct`% 남기고 나머지를 자리 수로 똑같이 나눠 담는다.
 *
 * 한 자리씩 맞추면 앞 자리를 채우는 동안 현금이 마르고, 뒤 자리는 목표에 못 미친 채 끝난다.
 * 그래서 목표를 **먼저 다 계산해 두고**, 파는 주문을 앞에 세운다.
 *
 * 매수 수량은 여기서 계산한 값이 그대로 나가지 않는다 — 앞 주문이 체결되면 현금이 달라져서,
 * 화면은 이 계획을 순서로만 쓰고 수량은 그때그때 다시 잡는다. 여기 적힌 수량은 "지금
 * 이대로라면" 의 값이고, 버튼에 몇 건인지 적는 데 쓴다.
 */
export function equalWeightPlan(args: {
    slots: { slot: number; price: number; held: number }[];
    cash: number;
    /** 주식에 담을 비중(%). 나머지가 현금이다. */
    stockPct: number;
}): EqualWeightPlan {
    const { slots, cash, stockPct } = args;
    const usable = slots.filter(s => s.price > 0);
    if (!usable.length) return { targetValue: 0, orders: [] };

    const totalAssets = cash + usable.reduce((a, s) => a + s.held * s.price, 0);
    const pct = Math.min(100, Math.max(0, stockPct));
    const targetValue = Math.floor(totalAssets * pct / 100 / usable.length);

    // 두 번 훑는다. 파는 것을 먼저 다 세어야 살 돈이 얼마인지 알 수 있고, 실행도 그 순서다.
    // 파는 주문끼리는 서로 간섭하지 않는다 — 보유는 자리마다 따로다.
    const sells: SlotOrder[] = [];
    let free = cash;
    for (const s of usable) {
        const over = s.held * s.price - targetValue;
        if (over <= 0) continue;
        const qty = Math.min(s.held, Math.floor(over / s.price));
        if (qty > 0) {
            sells.push({ slot: s.slot, side: "sell", qty });
            free += qty * s.price;   // 수수료·세금만큼은 덜 들어온다. 그래서 사는 쪽이 조금 모자란다.
        }
    }

    const buys: SlotOrder[] = [];
    for (const s of usable) {
        if (s.held * s.price >= targetValue) continue;
        const o = fitToValue({ targetValue, price: s.price, cash: free, held: s.held });
        if (!o || o.side !== "buy") continue;
        buys.push({ ...o, slot: s.slot });
        free -= o.qty * s.price;
    }

    return { targetValue, orders: [...sells, ...buys] };
}
