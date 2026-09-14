// 몇 주를 살까 · 몇 주를 팔까.
//
// 값을 손으로 적어 박제하는 대신, 나온 주수를 **다시 견적에 넣어** 확인한다 —
// "이 주수가 예산 안에 들어가는가", "한 주 더 사면 넘치는가". 그래야 수수료율이 바뀌어도
// 테스트가 규칙을 검증하는 것이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { quoteBuy } from "@/lib/paper/engine";
import { qtyWithinBudget, splitBuyQty, equalWeightPlan } from "@/lib/paper/sizing";

/* ── 예산 안에서 최대 ─────────────────────────────────────────── */
test("나온 주수는 예산 안에 들어가고, 한 주 더 사면 넘친다 · 수수료 때문에 예산÷값보다 한 주 적을 수 있다", () => {
    // ── 나온 주수는 예산 안에 들어가고, 한 주 더 사면 넘친다
    {
        for (const [budget, price] of [[1_000_000, 7_310], [10_000_000, 56_589], [50_000, 49_900]]) {
            const n = qtyWithinBudget(budget, price);
            assert.ok(n > 0, `살 수 있어야 한다 (${budget}/${price})`);
            assert.equal(quoteBuy({ price, qty: n, cash: budget }).ok, true, "예산을 넘었다");
            assert.equal(quoteBuy({ price, qty: n + 1, cash: budget }).ok, false, "한 주를 덜 샀다");
        }
    }

    // ── 수수료 때문에 예산÷값보다 한 주 적을 수 있다
    {
        // 100주 값이 정확히 예산이면 수수료를 낼 돈이 없다 — 99주가 정답이다.
        const price = 10_000;
        assert.equal(qtyWithinBudget(1_000_000, price), 99);
        // 수수료까지 얹어 주면 100주가 된다
        assert.equal(qtyWithinBudget(1_000_000 + 150, price), 100);
    }
});

/* ── 비율 매수 (내 돈 기준) ───────────────────────────────────── */
/* ── 등분 매수 (내 돈 기준) ───────────────────────────────────── */
test("1/n 은 내 돈을 n등분한 한 몫 · 같은 등분을 세 번 누르면 세 몫이 같다", () => {
    // ── 1/n 은 내 돈을 n등분한 한 몫
    {
        const price = 10_000, totalAssets = 9_000_000, cash = 9_000_000;
        assert.equal(splitBuyQty({ parts: 3, price, cash, totalAssets }), qtyWithinBudget(3_000_000, price));
        assert.equal(splitBuyQty({ parts: 2, price, cash, totalAssets }), qtyWithinBudget(4_500_000, price));
    }

    // ── 같은 등분을 세 번 누르면 세 몫이 같다
    {
        // 여기가 핵심이다. 남은 현금을 등분하면 33 → 22 → 15% 로 줄어들어 "세 번에 나눠
        // 담았다"가 되지 않는다. 내 돈은 사고팔아도 (수수료를 빼면) 그대로라 몫이 유지된다.
        const price = 10_000, totalAssets = 9_000_000;
        let cash = totalAssets;
        const bought: number[] = [];
        for (let i = 0; i < 3; i++) {
            const n = splitBuyQty({ parts: 3, price, cash, totalAssets });
            bought.push(n);
            cash -= price * n + Math.floor(price * n * 15 / 100_000);
        }
        assert.deepEqual(bought, [299, 299, 299]);
    }
});

/* ── 비율 매도 ────────────────────────────────────────────────── */
/* ── 비중 맞추기 ──────────────────────────────────────────────── */
/* ── 전 자리 균등 ─────────────────────────────────────────────── */

/** 자리 넷, 값은 다르게. 값이 같으면 나눗셈 실수가 드러나지 않는다. */
const four = (held = [0, 0, 0, 0]) => [
    { slot: 0, price: 10_000, held: held[0] },
    { slot: 1, price: 7_500, held: held[1] },
    { slot: 2, price: 33_000, held: held[2] },
    { slot: 3, price: 1_200, held: held[3] },
];

test("파는 주문이 사는 주문보다 앞선다 — 그 돈이 있어야 산다 · 판 돈까지 세어야 나머지 자리를 채울 수 있다", () => {
    // ── 파는 주문이 사는 주문보다 앞선다 — 그 돈이 있어야 산다
    {
        // 0번에 몰빵해 둔 상태. 0번을 덜어 나머지 셋에 나눠야 한다.
        const slots = four([900, 0, 0, 0]);
        const plan = equalWeightPlan({ slots, cash: 1_000_000, stockPct: 100 });
        const sides = plan.orders.map(o => o.side);
        assert.ok(sides.includes("sell") && sides.includes("buy"), `한쪽만 나왔다: ${sides}`);
        assert.equal(sides.indexOf("buy") > sides.lastIndexOf("sell"), true, `순서가 섞였다: ${sides}`);
    }

    // ── 판 돈까지 세어야 나머지 자리를 채울 수 있다
    {
        // 현금 100만뿐이라 판 돈을 안 세면 1,200원짜리 자리 하나도 제대로 못 채운다.
        const slots = four([900, 0, 0, 0]);
        const plan = equalWeightPlan({ slots, cash: 1_000_000, stockPct: 100 });
        const buys = plan.orders.filter(o => o.side === "buy");
        assert.equal(buys.length, 3, "세 자리를 다 채워야 한다");
    }
});

/* ── 빌려 팔 수 있는 만큼 ─────────────────────────────────────── */
