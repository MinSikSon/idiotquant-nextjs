// 운용사 규칙 — 반기 성적이 맡은 돈에 어떻게 반영되는가.
//
// 값을 박제하지 않고 상수에서 식을 세워 견준다. 계수를 바꾸면 테스트도 같이 따라와야
// "규칙이 바뀐 것"이고, 식이 어긋나면 그때 깨진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    flowRate, nextAum, baseFee, perfFee, settleQuarter, rankOf, fmtMoney,
    INITIAL_AUM, FLOW_MIN, FLOW_MAX, FLOW_EXCESS_MULT, FLOW_LOSS_MULT,
    BASE_FEE_BP, PERF_FEE_PCT,
} from "@/lib/paper/firm";

const near = (got: number, want: number, tol = 1e-9) =>
    assert.ok(Math.abs(got - want) <= Math.abs(want) * tol + 1e-9, `${got} ≉ ${want}`);

/* ── 고객 자금 유출입 ────────────────────────────────────────── */

test("벤치마크를 이긴 만큼 돈이 들어온다", () => {
    // +10% 인데 시장이 +4% → 초과 6%p
    near(flowRate(10, 4), 6 * FLOW_EXCESS_MULT);
});

test("시장에 진 만큼 돈이 나간다", () => {
    near(flowRate(4, 10), -6 * FLOW_EXCESS_MULT);
});

test("잃으면 시장을 이겼어도 따로 벌을 받는다", () => {
    // −5% 인데 시장은 −10% → 초과 +5%p 지만 절대 손실 −5% 도 함께 센다
    near(flowRate(-5, -10), 5 * FLOW_EXCESS_MULT + -5 * FLOW_LOSS_MULT);
});

test("번 해에는 손실 벌점이 없다", () => {
    // 절대 손실이 0 이므로 초과분만 남는다
    near(flowRate(3, 1), 2 * FLOW_EXCESS_MULT);
});

test("유출입은 상·하한을 넘지 않는다", () => {
    assert.equal(flowRate(1000, 0), FLOW_MAX);
    assert.equal(flowRate(-100, 50), FLOW_MIN);
});

test("숫자가 아닌 값이 와도 0 으로 세고 터지지 않는다", () => {
    assert.equal(Number.isFinite(flowRate(NaN as any, 0)), true);
    assert.equal(Number.isFinite(flowRate(undefined as any, undefined as any)), true);
});

/* ── 맡은 돈 ─────────────────────────────────────────────────── */

test("성과가 먼저 곱해지고 그다음 고객이 들고 난다", () => {
    // 순서가 바뀌면 이번 반기에 없던 돈으로 번 셈이 된다.
    const aum = INITIAL_AUM;
    const grown = aum * 1.1;                       // +10%
    const want = Math.round(grown * (1 + flowRate(10, 4) / 100));
    assert.equal(nextAum(aum, 10, 4), want);
});

test("크게 잃으면 굴릴 돈도 줄어든 채로 간다", () => {
    const after = nextAum(INITIAL_AUM, -30, 0);
    assert.ok(after < INITIAL_AUM, "손실인데 맡은 돈이 안 줄었다");
    assert.ok(after > 0, "0 이하로 내려가면 다음 반기 계산이 무너진다");
});

/* ── 보수 ────────────────────────────────────────────────────── */

test("기본 보수는 맡은 돈에만 걸린다 (성적과 무관)", () => {
    const want = Math.floor((INITIAL_AUM * BASE_FEE_BP) / 10_000);
    assert.equal(baseFee(INITIAL_AUM), want);
    assert.equal(baseFee(0), 0);
});

test("성과 보수는 초과수익이 있을 때만", () => {
    assert.equal(perfFee(INITIAL_AUM, 4, 10), 0, "시장에 졌는데 성과 보수를 받았다");
    assert.equal(perfFee(INITIAL_AUM, 10, 10), 0, "초과가 0 이면 없다");

    const want = Math.floor((INITIAL_AUM * 6 * PERF_FEE_PCT) / 10_000);
    assert.equal(perfFee(INITIAL_AUM, 10, 4), want);
});

test("정산은 반기 전 금액을 기준으로 보수를 매긴다", () => {
    const s = settleQuarter(INITIAL_AUM, 10, 4);

    assert.equal(s.aumBefore, INITIAL_AUM);
    assert.equal(s.feeBase, baseFee(INITIAL_AUM));
    assert.equal(s.feePerf, perfFee(INITIAL_AUM, 10, 4));
    assert.equal(s.feeTotal, s.feeBase + s.feePerf);
    assert.equal(s.aumAfter, nextAum(INITIAL_AUM, 10, 4));
    near(s.flowRate, flowRate(10, 4));
});

/* ── 등급 ────────────────────────────────────────────────────── */

test("맡은 돈이 늘면 등급이 올라간다", () => {
    assert.equal(rankOf(0), "1인 사무실");
    assert.equal(rankOf(99_999_999), "1인 사무실");
    assert.equal(rankOf(100_000_000), "부티크 운용사");     // 1억 — 경계값 포함
    assert.equal(rankOf(1_000_000_000), "중형 운용사");     // 10억
    assert.equal(rankOf(10_000_000_000), "헤지펀드");        // 100억
    assert.equal(rankOf(100_000_000_000), "대형 자산운용사"); // 1000억
});

/* ── 표기 ────────────────────────────────────────────────────── */

test("억·만 단위로 짧게 — 모바일 칸을 넘기지 않는다", () => {
    assert.equal(fmtMoney(100_000_000), "1억");
    assert.equal(fmtMoney(109_000_000), "1억 900만");
    assert.equal(fmtMoney(50_000_000), "5,000만");
    assert.equal(fmtMoney(9_999), "9,999");
    assert.equal(fmtMoney(-100_000_000), "-1억");
    assert.equal(fmtMoney(0), "0");
});
