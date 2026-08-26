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

import { quoteBuy } from "./engine";

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
export function partBuyQty(args: { pct: number; price: number; cash: number; totalAssets: number }): number {
    const { pct, price, cash, totalAssets } = args;
    const budget = pct >= 100 ? cash : Math.min(cash, Math.floor(totalAssets * pct / 100));
    return qtyWithinBudget(budget, price);
}

/**
 * 현금을 `parts` 등분한 **한 몫**.
 *
 * 위의 비율 매수와 기준이 다르다. 저쪽은 내 돈에서 이 종목이 차지할 몫을 정하는 것이고,
 * 이쪽은 **남은 총알을 몇 번에 나눠 쏠까**이다. 그래서 현금 기준이고, 누를 때마다 한 몫이
 * 작아진다 — 1/3 을 세 번 누르면 현금이 3분의 1씩 남아 33% → 22% → 15% 로 들어간다.
 * 물타기·분할 매수가 실제로 그렇게 굴러간다.
 */
export function splitBuyQty(args: { parts: number; price: number; cash: number }): number {
    const { parts, price, cash } = args;
    if (!(parts >= 1)) return 0;
    return qtyWithinBudget(Math.floor(cash / parts), price);
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
    if (!(price > 0) || !(totalAssets > 0)) return null;

    const target = Math.round(totalAssets * Math.min(100, Math.max(0, targetPct)) / 100);
    const gap = target - held * price;

    if (gap > 0) {
        const qty = qtyWithinBudget(Math.min(cash, gap), price);
        return qty > 0 ? { side: "buy", qty } : null;
    }
    // 파는 쪽은 반올림하지 않고 버린다. 반올림하면 목표보다 한 주 더 팔아 비중이 밑돈다.
    const qty = Math.min(held, Math.floor(-gap / price));
    return qty > 0 ? { side: "sell", qty } : null;
}
