// 몇 주를 살까 · 몇 주를 팔까.
//
// 값을 손으로 적어 박제하는 대신, 나온 주수를 **다시 견적에 넣어** 확인한다 —
// "이 주수가 예산 안에 들어가는가", "한 주 더 사면 넘치는가". 그래야 수수료율이 바뀌어도
// 테스트가 규칙을 검증하는 것이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { quoteBuy, quoteShort } from "@/lib/paper/engine";
import {
    qtyWithinBudget, partBuyQty, splitBuyQty, sellPartQty, rebalanceOrder, equalWeightPlan,
    shortQtyWithinCash, partShortQty,
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

/* ── 등분 매수 (내 돈 기준) ───────────────────────────────────── */

test("1/n 은 내 돈을 n등분한 한 몫", () => {
    const price = 10_000, totalAssets = 9_000_000, cash = 9_000_000;
    assert.equal(splitBuyQty({ parts: 3, price, cash, totalAssets }), qtyWithinBudget(3_000_000, price));
    assert.equal(splitBuyQty({ parts: 2, price, cash, totalAssets }), qtyWithinBudget(4_500_000, price));
});

test("같은 등분을 세 번 누르면 세 몫이 같다", () => {
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
});

test("현금이 모자라면 그만큼만 산다", () => {
    // 내 돈은 900만이지만 현금은 100만뿐 — 1/3(300만) 을 눌러도 100만어치가 한계다.
    const n = splitBuyQty({ parts: 3, price: 10_000, cash: 1_000_000, totalAssets: 9_000_000 });
    assert.equal(n, 99);
});

test("1등분은 내 돈 전부 — 현금이 그만큼 있을 때", () => {
    const price = 7_777, cash = 5_000_000;
    assert.equal(splitBuyQty({ parts: 1, price, cash, totalAssets: cash }), qtyWithinBudget(cash, price));
});

test("등분 수가 이상하면 0", () => {
    const a = { price: 10_000, cash: 1_000_000, totalAssets: 1_000_000 };
    assert.equal(splitBuyQty({ parts: 0, ...a }), 0);
    assert.equal(splitBuyQty({ parts: -3, ...a }), 0);
});

test("1/4 과 25% 는 같은 몫이다 — 눈금만 다르다", () => {
    const a = { price: 10_000, cash: 8_000_000, totalAssets: 8_000_000 };
    assert.equal(splitBuyQty({ parts: 4, ...a }), partBuyQty({ pct: 25, ...a }));
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

/* ── 전 자리 균등 ─────────────────────────────────────────────── */

/** 자리 넷, 값은 다르게. 값이 같으면 나눗셈 실수가 드러나지 않는다. */
const four = (held = [0, 0, 0, 0]) => [
    { slot: 0, price: 10_000, held: held[0] },
    { slot: 1, price: 7_500, held: held[1] },
    { slot: 2, price: 33_000, held: held[2] },
    { slot: 3, price: 1_200, held: held[3] },
];

test("현금 50% 를 남기고 나머지를 넷으로 나눈다", () => {
    // 내 돈 1,000만 · 주식 50% → 500만 · 넷이면 자리마다 125만
    const plan = equalWeightPlan({ slots: four(), cash: 10_000_000, stockPct: 50 });
    assert.equal(plan.targetValue, 1_250_000);
    assert.equal(plan.orders.length, 4);
    assert.equal(plan.orders.every(o => o.side === "buy"), true);
});

test("맞춘 뒤 자리마다 목표 금액에 가깝고, 넘지 않는다", () => {
    const slots = four();
    const cash = 10_000_000;
    const plan = equalWeightPlan({ slots, cash, stockPct: 60 });
    for (const o of plan.orders) {
        const s = slots.find(x => x.slot === o.slot)!;
        const value = o.qty * s.price;
        assert.ok(value <= plan.targetValue, `${o.slot}번이 목표를 넘었다 ${value} > ${plan.targetValue}`);
        // 한 주 값 안쪽으로 붙어 있어야 "균등"이라 부를 수 있다.
        // 딱 한 주만큼 모자란 것까지는 정상이다 — 목표에 꼭 맞는 주수는 수수료를 낼 돈이
        // 없어 한 주가 밀려난다(150주 × 10,000원 = 목표지만 수수료 225원이 더 필요하다).
        assert.ok(plan.targetValue - value <= s.price,
            `${o.slot}번이 한 주 넘게 모자라다 (목표 ${plan.targetValue} · 실제 ${value})`);
    }
});

test("쓰는 현금이 가진 현금을 넘지 않는다", () => {
    const slots = four();
    const cash = 10_000_000;
    const plan = equalWeightPlan({ slots, cash, stockPct: 100 });
    const spend = plan.orders.reduce((a, o) => a + o.qty * slots.find(x => x.slot === o.slot)!.price, 0);
    assert.ok(spend <= cash, `현금보다 많이 썼다 ${spend} > ${cash}`);
});

test("파는 주문이 사는 주문보다 앞선다 — 그 돈이 있어야 산다", () => {
    // 0번에 몰빵해 둔 상태. 0번을 덜어 나머지 셋에 나눠야 한다.
    const slots = four([900, 0, 0, 0]);
    const plan = equalWeightPlan({ slots, cash: 1_000_000, stockPct: 100 });
    const sides = plan.orders.map(o => o.side);
    assert.ok(sides.includes("sell") && sides.includes("buy"), `한쪽만 나왔다: ${sides}`);
    assert.equal(sides.indexOf("buy") > sides.lastIndexOf("sell"), true, `순서가 섞였다: ${sides}`);
});

test("판 돈까지 세어야 나머지 자리를 채울 수 있다", () => {
    // 현금 100만뿐이라 판 돈을 안 세면 1,200원짜리 자리 하나도 제대로 못 채운다.
    const slots = four([900, 0, 0, 0]);
    const plan = equalWeightPlan({ slots, cash: 1_000_000, stockPct: 100 });
    const buys = plan.orders.filter(o => o.side === "buy");
    assert.equal(buys.length, 3, "세 자리를 다 채워야 한다");
});

test("이미 균등하면 아무 주문도 없다", () => {
    // 자리마다 정확히 250만어치 — 값이 나누어떨어지는 자리만 골라 쓴다
    const slots = [
        { slot: 0, price: 10_000, held: 250 },
        { slot: 1, price: 25_000, held: 100 },
    ];
    const plan = equalWeightPlan({ slots, cash: 5_000_000, stockPct: 50 });
    assert.equal(plan.targetValue, 2_500_000);
    assert.deepEqual(plan.orders, []);
});

test("주식 0% 는 전부 판다", () => {
    const slots = four([100, 200, 30, 500]);
    const plan = equalWeightPlan({ slots, cash: 0, stockPct: 0 });
    assert.equal(plan.targetValue, 0);
    assert.deepEqual(
        plan.orders,
        [{ slot: 0, side: "sell", qty: 100 }, { slot: 1, side: "sell", qty: 200 },
         { slot: 2, side: "sell", qty: 30 }, { slot: 3, side: "sell", qty: 500 }],
    );
});

test("자리가 하나면 그 자리가 곧 주식 비중", () => {
    const slots = [{ slot: 0, price: 10_000, held: 0 }];
    const plan = equalWeightPlan({ slots, cash: 10_000_000, stockPct: 70 });
    assert.equal(plan.targetValue, 7_000_000);
    assert.equal(plan.orders[0].qty, qtyWithinBudget(7_000_000, 10_000));
});

test("값을 못 가져온 자리는 셈에서 빼고, 하나도 없으면 계획이 비어 있다", () => {
    const plan = equalWeightPlan({
        slots: [{ slot: 0, price: 0, held: 0 }, { slot: 1, price: 10_000, held: 0 }],
        cash: 10_000_000, stockPct: 100,
    });
    // 쓸 수 있는 자리가 하나뿐이라 그 자리에 전부 간다
    assert.equal(plan.targetValue, 10_000_000);
    assert.deepEqual(plan.orders.map(o => o.slot), [1]);

    assert.deepEqual(equalWeightPlan({ slots: [], cash: 100, stockPct: 50 }), { targetValue: 0, orders: [] });
});

test("비중은 0~100 밖으로 나가지 않는다", () => {
    const slots = four();
    assert.deepEqual(
        equalWeightPlan({ slots, cash: 10_000_000, stockPct: 500 }),
        equalWeightPlan({ slots, cash: 10_000_000, stockPct: 100 }),
    );
    assert.deepEqual(equalWeightPlan({ slots: four([10, 10, 10, 10]), cash: 0, stockPct: -20 }).orders.map(o => o.side),
        ["sell", "sell", "sell", "sell"]);
});

/* ── 빌려 팔 수 있는 만큼 ─────────────────────────────────────── */

test("나온 주수는 담보 안에 들어가고, 한 주 더 빌리면 넘친다", () => {
    for (const [cash, price] of [[1_000_000, 7_310], [10_000_000, 56_589], [50_000, 49_900]]) {
        const n = shortQtyWithinCash(cash, price);
        assert.ok(n > 0, `빌려 팔 수 있어야 한다 (${cash}/${price})`);
        assert.equal(quoteShort({ price, qty: n, cash }).ok, true, "담보를 넘었다");
        assert.equal(quoteShort({ price, qty: n + 1, cash }).ok, false, "한 주를 덜 빌렸다");
    }
});

test("공매도 비율은 매수 비율과 같은 눈금이다 — 내 돈 기준", () => {
    const args = { price: 10_000, cash: 10_000_000, totalAssets: 10_000_000 };
    const half = partShortQty({ ...args, pct: 50 });
    const quarter = partShortQty({ ...args, pct: 25 });
    assert.ok(Math.abs(half - quarter * 2) <= 1, `${half} vs ${quarter}×2`);
    // 현금이 모자라면 현금으로 잘린다
    assert.ok(partShortQty({ price: 10_000, cash: 1_000_000, totalAssets: 10_000_000, pct: 50 }) <= 101);
});

test("돈이 없으면 빌려 팔 수도 없다", () => {
    assert.equal(shortQtyWithinCash(0, 10_000), 0);
    assert.equal(shortQtyWithinCash(1_000_000, 0), 0);
});
