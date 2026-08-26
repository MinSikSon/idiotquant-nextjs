// 리플레이 매매 규칙 (비로그인 판).
//
// engine.ts 스스로 적어둔 위험이 있다: 워커에 같은 규칙의 사본이 있고
// (idiotquant-backend/src/lib/paperEngine.js), 상수나 반올림이 어긋나면 같은 사람이
// 로그인 전후로 다른 수익률을 본다. 레포가 갈라져 있어 한쪽 테스트가 다른 쪽을 부를 수
// 없으므로, 여기서는 **값을 정확한 정수로 못 박는다** — 워커 쪽 test/paper-engine.test.js
// 도 같은 값을 박고 있어, 어느 한쪽이 움직이면 그쪽 테스트가 먼저 깨진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    quoteBuy, quoteSell, applyBuy, applySell, avgPrice,
    SEED, BUY_FEE_NUM, SELL_FEE_NUM, SELL_TAX_NUM,
    type BuyQuote, type SellQuote,
} from "@/lib/paper/engine";

const ok = <T>(q: T | { ok: false; error: string }): T => {
    assert.ok((q as any).ok, `견적이 거절됐다: ${(q as any).error}`);
    return q as T;
};

test("상수는 워커와 같은 값이어야 한다", () => {
    assert.equal(SEED, 10_000_000);
    assert.equal(BUY_FEE_NUM, 15);    // 0.015%
    assert.equal(SELL_FEE_NUM, 15);   // 0.015%
    assert.equal(SELL_TAX_NUM, 180);  // 0.18% 증권거래세
});

test("수수료는 정수 연산이라 1원이 새지 않는다", () => {
    // 파일 주석이 지목한 바로 그 값: 700000 * 0.00015 === 104.99999999999999 라
    // 부동소수로 floor 하면 104 가 된다. 정수 연산은 105 다.
    const q = ok<BuyQuote>(quoteBuy({ price: 70_000, qty: 10, cash: SEED }));
    assert.equal(q.gross, 700_000);
    assert.equal(q.fee, 105);
    assert.equal(q.total, 700_105);

    assert.equal(Math.floor(700_000 * 0.00015), 104, "부동소수는 104 를 준다 — 그래서 정수로 센다");
});

test("매수 견적 — gross·fee·total 이 정확한 정수", () => {
    for (const [price, qty, gross, fee] of [
        [1, 1, 1, 0],
        [66_667, 3, 200_001, 30],
        [12_345, 7, 86_415, 12],
        [999_999, 1, 999_999, 149],
    ] as const) {
        const q = ok<BuyQuote>(quoteBuy({ price, qty, cash: SEED }));
        assert.equal(q.gross, gross, `${price}×${qty} gross`);
        assert.equal(q.fee, fee, `${price}×${qty} fee`);
        assert.equal(q.total, gross + fee);
    }
});

test("현금이 모자라면 거절한다 — 수수료까지 셈에 넣고 판단한다", () => {
    // gross 700,000 은 되지만 수수료 105 를 더하면 넘는다.
    const q = quoteBuy({ price: 70_000, qty: 10, cash: 700_050 });
    assert.equal(q.ok, false);

    assert.equal(quoteBuy({ price: 70_000, qty: 10, cash: 700_105 }).ok, true, "딱 맞으면 통과");
});

test("수량·가격이 0 이하면 거절한다", () => {
    assert.equal(quoteBuy({ price: 0, qty: 1, cash: SEED }).ok, false);
    assert.equal(quoteBuy({ price: 100, qty: 0, cash: SEED }).ok, false);
    assert.equal(quoteBuy({ price: 100, qty: -1, cash: SEED }).ok, false);
});

test("매도 수수료는 위탁수수료 + 증권거래세", () => {
    const q = ok<SellQuote>(quoteSell({ price: 70_000, qty: 10, position: { ticker: "A", name: null, qty: 10, cost_basis: 700_105 } }));
    // 700,000 × 0.015% = 105,  700,000 × 0.18% = 1,260
    assert.equal(q.fee, 105 + 1_260);
    assert.equal(q.net, 700_000 - 1_365);
});

test("전량 매도하면 원가가 정확히 0 이 된다", () => {
    const pos = { ticker: "A", name: null, qty: 10, cost_basis: 700_105 };
    const q = ok<SellQuote>(quoteSell({ price: 70_000, qty: 10, position: pos }));

    assert.equal(q.costOut, 700_105, "전량이면 cost_basis 와 같아야 한다");
    assert.deepEqual(applySell(pos, q), { qty: 0, cost_basis: 0 });
});

test("부분 매도를 반복해도 원가가 새지 않는다", () => {
    // 평단가를 저장하지 않는 이유가 이것이다 — 반올림한 평단가를 쓰면 조금씩 어긋난다.
    let pos = { ticker: "A", name: null, qty: 0, cost_basis: 0 };
    const buy = ok<BuyQuote>(quoteBuy({ price: 33_333, qty: 9, cash: SEED }));
    pos = { ...pos, ...applyBuy(pos, buy) };

    // 3주씩 세 번 판다
    for (let i = 0; i < 3; i++) {
        const s = ok<SellQuote>(quoteSell({ price: 40_000, qty: 3, position: pos }));
        pos = { ...pos, ...applySell(pos, s) };
    }

    assert.equal(pos.qty, 0);
    assert.equal(pos.cost_basis, 0, "다 팔았는데 원가가 남았다");
});

test("보유보다 많이 팔 수 없다", () => {
    const pos = { ticker: "A", name: null, qty: 5, cost_basis: 100_000 };
    assert.equal(quoteSell({ price: 1_000, qty: 6, position: pos }).ok, false);
    assert.equal(quoteSell({ price: 1_000, qty: 5, position: pos }).ok, true);
    assert.equal(quoteSell({ price: 1_000, qty: 1, position: null }).ok, false);
});

test("이어서 사면 수량과 원가가 함께 쌓인다", () => {
    let pos = { ticker: "A", name: null, qty: 0, cost_basis: 0 };
    const a = ok<BuyQuote>(quoteBuy({ price: 10_000, qty: 5, cash: SEED }));
    pos = { ...pos, ...applyBuy(pos, a) };
    const b = ok<BuyQuote>(quoteBuy({ price: 20_000, qty: 5, cash: SEED }));
    pos = { ...pos, ...applyBuy(pos, b) };

    assert.equal(pos.qty, 10);
    assert.equal(pos.cost_basis, a.total + b.total);
    // 평단가는 저장하지 않고 파생시킨다
    assert.equal(avgPrice(pos), pos.cost_basis / 10);
});

test("보유가 없으면 평단가는 0 — 0 으로 나누지 않는다", () => {
    assert.equal(avgPrice({ qty: 0, cost_basis: 0 }), 0);
    assert.equal(avgPrice({ qty: 0, cost_basis: 12_345 }), 0);
});

test("실현손익 = 받은 돈 − 판 만큼의 원가", () => {
    const pos = { ticker: "A", name: null, qty: 10, cost_basis: 500_000 };
    const q = ok<SellQuote>(quoteSell({ price: 70_000, qty: 10, position: pos }));
    assert.equal(q.realized, q.net - q.costOut);
    assert.ok(q.realized > 0, "50만원에 사서 70만원에 팔았으면 이익이어야 한다");
});
