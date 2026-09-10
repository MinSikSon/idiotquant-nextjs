// 체결 — **무엇을 할 수 있고, 못 하면 왜 못 하는가.**
//
// ── 왜 이 파일이 생겼나 ────────────────────────────────────────
// 「권한다」 버튼이 **눌러도 아무 일이 없는 경우**가 둘 있었다.
//
//   앞에 아무도 안 앉은 턴   씬이 `if (!this.client) return;` 으로 조용히 빠져나갔다.
//                            로그도 안 남아서, 누른 사람은 게임이 멈춘 줄 안다.
//   현금이 한 주 값에 못 미칠 때  누른 **뒤에** 로그로 「현금이 한 주 값에 못 미칩니다」가
//                            떴다. 누르기 전에는 멀쩡한 버튼으로 보인다.
//
// 둘 다 「눌러 보고 나서야 아는」 자리다. 이 게임은 캔버스라 브라우저가 해 주는 것이
// 하나도 없으므로, **못 누르는 이유를 화면이 직접 말해야 한다.**
//
// 그래서 막는 것을 값으로 만든다. 화면은 이 값을 받아 버튼을 잠그고 그 이유를 이름과
// 부제에 적는다 — 판단이 화면에 있으면 규칙이 두 군데가 되고 어느 날 한쪽만 바뀐다.

/**
 * 지금 권하는 것을 막는 것. `"none"` 이면 누를 수 있다.
 *
 * **「이미 권했다」는 여기 없다.** 그건 막힌 것이 아니라 *되돌릴 수 있는* 상태이고
 * (`무른다`), 화면이 그 자리에 다른 버튼을 세운다.
 */
export type OrderBlock = "none" | "noClient" | "refused" | "notEnoughCash";

export interface OrderCheck {
    /** 오늘 앞에 앉은 사람이 있는가. 없으면 권할 상대가 없다. */
    hasClient: boolean;
    /** 이번 턴에 권했는데 **거절당했는가.** 거절은 무를 수 없다. */
    refused: boolean;
    /** 지금 현금. */
    cash: number;
    /** 한 주 값(수수료 뺀 값이면 된다 — 경계에서 한 주 차이는 아래 주석 참고). */
    price: number;
}

/**
 * **현금 절반으로 산다.** 그래서 한 주도 못 사는 경계는 `cash / 2 < price` 다.
 *
 * 수수료(0.015%)까지 정확히 세지는 않는다. 그 값은 한 주 값의 1만분의 1.5라, 이 경계에서
 * 한 주가 갈리는 폭이 아니다. 정확한 셈은 `StockEngine.buy` 가 하고 거기서 걸리면
 * 그때는 로그가 진다 — 여기는 **누르기 전에 보여 줄 이유**를 내는 자리다.
 */
export function recommendBlock(c: OrderCheck): OrderBlock {
    if (!c.hasClient) return "noClient";
    if (c.refused) return "refused";
    if (c.price <= 0 || Math.floor(c.cash / 2) < c.price) return "notEnoughCash";
    return "none";
}

/**
 * 막힌 버튼이 뭐라고 적혀야 하는가. **이름이 상태를 말하고, 부제가 그 이유를 말한다.**
 *
 * 「권할 수 없음」처럼 화면 밖의 말을 쓰지 않는다 — 이름은 언제나 *일어나는 일*이거나
 * *지금 어떤가*여야 한다.
 */
export function blockSay(b: OrderBlock): { label: string; sub: string } {
    switch (b) {
        case "noClient":      return { label: "앞에 아무도 없다", sub: "오늘은 권할 사람이 없다" };
        case "refused":       return { label: "고개를 저었다", sub: "오늘은 여기까지다" };
        case "notEnoughCash": return { label: "현금이 모자란다", sub: "한 주 값에 못 미친다" };
        case "none":          return { label: "", sub: "" };
    }
}

/* ── 알아보는 것을 막는 것 ────────────────────────────────────── */

/**
 * 지금 알아보는 것을 막는 것. `"none"` 이면 누를 수 있다.
 *
 * ── `afterRecommend` 가 이 표에서 제일 중요하다 ─────────────
 * **근거는 권하기 전에 만들어야 붙는다.** 권하는 순간 그 턴의 근거가 `pending` 에
 * 박제되므로(`TradingScene.recommend`), 권한 뒤에 알아보면 에너지 3 만 나가고 이번
 * 턴에는 아무 값도 안 한다. 그런데 화면은 그 줄을 멀쩡히 열어 두고 있었다 —
 * **눌러도 손해만 나는 버튼**이었다.
 */
export type ResearchBlock = "none" | "thisStock" | "otherStock" | "afterRecommend" | "noEnergy";

export function researchBlock(p: {
    /** 이 종목을 이번 턴에 이미 알아봤는가. */
    researchedThis: boolean;
    /** 이번 턴에 다른 종목을 알아봤으면 그 이름. */
    otherThesis: string | null;
    /** 이번 턴에 이미 권했는가. */
    recommended: boolean;
    energy: number;
    cost: number;
}): ResearchBlock {
    // 이미 알아본 종목이면 그건 막힌 것이 아니라 **다 된** 것이다. 먼저 본다.
    if (p.researchedThis) return "thisStock";
    if (p.otherThesis !== null) return "otherStock";
    if (p.recommended) return "afterRecommend";
    if (p.energy < p.cost) return "noEnergy";
    return "none";
}

/** 그 줄에 뭐라고 적히는가. 값이 필요한 문구가 있어 인자를 받는다. */
export function researchSay(b: ResearchBlock, p: { other: string | null; cost: number }): string {
    switch (b) {
        case "none":           return `이 종목을 알아본다 — 에너지 ${p.cost}`;
        case "thisStock":      return "이 종목은 알아봤다 — 근거가 있다";
        case "otherStock":     return `이번 턴은 ${p.other}을(를) 알아봤다`;
        case "afterRecommend": return "이미 권했다 — 근거는 권하기 전에";
        case "noEnergy":       return `알아볼 에너지가 없다 (${p.cost} 필요)`;
    }
}
