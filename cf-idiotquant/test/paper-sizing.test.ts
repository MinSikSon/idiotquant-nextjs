// 몇 주를 살까 · 몇 주를 팔까.
//
// 값을 손으로 적어 박제하는 대신, 나온 주수를 **다시 견적에 넣어** 확인한다 —
// "이 주수가 예산 안에 들어가는가", "한 주 더 사면 넘치는가". 그래야 수수료율이 바뀌어도
// 테스트가 규칙을 검증하는 것이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { quoteBuy } from "@/lib/paper/engine";
import {
    qtyWithinBudget, partBuyQty, splitBuyQty, sellPartQty, rebalanceOrder,
} from "@/lib/paper/sizing";

/* ── 예산 안에서 최대 ─────────────────────────────────────────── */

test("나온 주수는 예산 안에 들어가고, 한 주 더 사면 넘친다", () => {
    for (const [budget, price] of [[1_000_000, 7_310], [10_000_000, 56_589], [50_000, 49_900]]) {
        const n = qtyWithinBudget(budget, price);
        assert.ok(n > 0, `살 수 있어야 한다 (${budget}/${price})`);
        assert.equal(quoteBuy({ price, qty: n, cash: budget }).ok, true, "예산을 넘었다");
        assert.equal(quoteBuy({ price, qty: n + 1, cash: budget }).ok, false, "한 주를 덜 샀다");
    }
});

test("수수료 때문에 예산÷값보다 한 주 적을 수 있다", () => {
    // 100주 값이 정확히 예산이면 수수료를 낼 돈이 없다 — 99주가 정답이다.
    const price = 10_000;
    assert.equal(qtyWithinBudget(1_000_000, price), 99);
    // 수수료까지 얹어 주면 100주가 된다
    assert.equal(qtyWithinBudget(1_000_000 + 150, price), 100);
});

test("살 수 없는 조건에서는 0", () => {
    assert.equal(qtyWithinBudget(0, 5_000), 0);
    assert.equal(qtyWithinBudget(1_000, 5_000), 0);   // 한 주도 못 산다
    assert.equal(qtyWithinBudget(1_000_000, 0), 0);   // 값을 못 가져왔다
    assert.equal(qtyWithinBudget(-5, 100), 0);
});

/* ── 비율 매수 (내 돈 기준) ───────────────────────────────────── */

test("25% 를 네 번 누르면 네 자리에 고르게 담긴다", () => {
    // 내 돈 기준이라 누를 때마다 같은 금액이 들어간다. 현금 기준이었다면
    // 25 → 19 → 14 → 10% 로 줄어 균등 배분이 안 된다.
    const price = 10_000, totalAssets = 10_000_000;
    let cash = totalAssets;
    const bought: number[] = [];
    for (let i = 0; i < 4; i++) {
        const n = partBuyQty({ pct: 25, price, cash, totalAssets });
        bought.push(n);
        cash -= quoteBuy({ price, qty: n, cash }).ok ? (price * n + Math.floor(price * n * 15 / 100_000)) : 0;
    }
    assert.deepEqual(bought, [249, 249, 249, 249]);
});

test("현금이 모자라면 그만큼만 산다", () => {
    // 내 돈은 1,000만이지만 현금은 100만뿐 — 50%(500만) 를 눌러도 100만어치가 한계다.
    const n = partBuyQty({ pct: 50, price: 10_000, cash: 1_000_000, totalAssets: 10_000_000 });
    assert.equal(n, 99);
});

test("최대(100%)는 내 돈이 아니라 현금 전액", () => {
    const cash = 3_000_000;
    const n = partBuyQty({ pct: 100, price: 10_000, cash, totalAssets: 10_000_000 });
    assert.equal(n, qtyWithinBudget(cash, 10_000));
});

/* ── 등분 매수 (현금 기준) ────────────────────────────────────── */

test("1/n 은 현금을 n등분한 한 몫", () => {
    const price = 10_000, cash = 9_000_000;
    assert.equal(splitBuyQty({ parts: 3, price, cash }), qtyWithinBudget(3_000_000, price));
    assert.equal(splitBuyQty({ parts: 2, price, cash }), qtyWithinBudget(4_500_000, price));
});

test("같은 등분을 반복하면 몫이 점점 작아진다 — 분할 매수가 그렇다", () => {
    // 비율 매수(내 돈 기준)와 갈리는 지점이다. 저쪽은 네 번 다 같은 금액이었다.
    const price = 10_000;
    let cash = 9_000_000;
    const bought: number[] = [];
    for (let i = 0; i < 3; i++) {
        const n = splitBuyQty({ parts: 3, price, cash });
        bought.push(n);
        cash -= price * n + Math.floor(price * n * 15 / 100_000);
    }
    assert.equal(bought.length, 3);
    assert.ok(bought[0] > bought[1] && bought[1] > bought[2], `줄지 않았다: ${bought}`);
});

test("1등분은 현금 전액과 같다", () => {
    const price = 7_777, cash = 5_000_000;
    assert.equal(splitBuyQty({ parts: 1, price, cash }), qtyWithinBudget(cash, price));
});

test("등분 수가 이상하면 0", () => {
    assert.equal(splitBuyQty({ parts: 0, price: 10_000, cash: 1_000_000 }), 0);
    assert.equal(splitBuyQty({ parts: -3, price: 10_000, cash: 1_000_000 }), 0);
});

/* ── 비율 매도 ────────────────────────────────────────────────── */

test("전부(100%)는 남김없이", () => {
    assert.equal(sellPartQty(137, 100), 137);
});

test("절반은 내림, 그래도 최소 한 주", () => {
    assert.equal(sellPartQty(137, 50), 68);
    // 3주의 25% 는 0.75 주 — 내림하면 0 이라 버튼이 죽는다. 한 주는 팔게 둔다.
    assert.equal(sellPartQty(3, 25), 1);
});

test("가진 게 없으면 0", () => {
    assert.equal(sellPartQty(0, 50), 0);
});

/* ── 비중 맞추기 ──────────────────────────────────────────────── */

test("현금만 있을 때 60% 로 맞추면 60% 어치를 산다", () => {
    const totalAssets = 10_000_000, price = 10_000;
    const o = rebalanceOrder({ targetPct: 60, price, cash: totalAssets, held: 0, totalAssets })!;
    assert.equal(o.side, "buy");
    // 6,000,000 어치 — 수수료를 내고도 예산 안이어야 한다
    assert.equal(o.qty, qtyWithinBudget(6_000_000, price));
});

test("너무 많이 담고 있으면 판다", () => {
    // 주식 800만 + 현금 200만 = 1,000만. 목표 30% 면 300만만 남기고 500만어치를 판다.
    const price = 10_000, held = 800;
    const o = rebalanceOrder({ targetPct: 30, price, cash: 2_000_000, held, totalAssets: 10_000_000 })!;
    assert.equal(o.side, "sell");
    assert.equal(o.qty, 500);
});

test("0% 로 맞추면 전부 판다", () => {
    const o = rebalanceOrder({ targetPct: 0, price: 10_000, cash: 2_000_000, held: 800, totalAssets: 10_000_000 })!;
    assert.deepEqual(o, { side: "sell", qty: 800 });
});

test("맞춘 뒤 비중은 목표를 넘지 않는다", () => {
    // 넘겨 사는 것이 모자라게 사는 것보다 나쁘다 — 다음 판단의 근거가 흐려진다.
    const price = 33_333, totalAssets = 10_000_000;
    for (const targetPct of [10, 25, 40, 55, 70, 90, 100]) {
        const o = rebalanceOrder({ targetPct, price, cash: totalAssets, held: 0, totalAssets });
        const qty = o?.qty ?? 0;
        assert.ok(qty * price <= totalAssets * targetPct / 100 + price,
            `${targetPct}% 목표를 크게 넘겼다 (${qty}주)`);
    }
});

test("이미 목표에 있으면 아무것도 하지 않는다", () => {
    // 0주 주문을 만들어 내보내면 버튼이 눌리는데 아무 일도 안 일어난다.
    const price = 10_000;
    assert.equal(rebalanceOrder({ targetPct: 50, price, cash: 5_000_000, held: 500, totalAssets: 10_000_000 }), null);
    assert.equal(rebalanceOrder({ targetPct: 100, price, cash: 0, held: 1000, totalAssets: 10_000_000 }), null);
});

test("살 현금이 없으면 사자는 주문을 만들지 않는다", () => {
    assert.equal(rebalanceOrder({ targetPct: 100, price: 10_000, cash: 0, held: 500, totalAssets: 5_000_000 }), null);
});

test("값이나 총자산이 0이면 셈이 성립하지 않는다", () => {
    assert.equal(rebalanceOrder({ targetPct: 50, price: 0, cash: 100, held: 0, totalAssets: 100 }), null);
    assert.equal(rebalanceOrder({ targetPct: 50, price: 100, cash: 0, held: 0, totalAssets: 0 }), null);
});

test("목표 비중은 0~100 밖으로 나가지 않는다", () => {
    const price = 10_000, totalAssets = 10_000_000;
    const over = rebalanceOrder({ targetPct: 500, price, cash: totalAssets, held: 0, totalAssets })!;
    assert.deepEqual(over, rebalanceOrder({ targetPct: 100, price, cash: totalAssets, held: 0, totalAssets }));

    const under = rebalanceOrder({ targetPct: -50, price, cash: 0, held: 300, totalAssets })!;
    assert.deepEqual(under, { side: "sell", qty: 300 });
});
