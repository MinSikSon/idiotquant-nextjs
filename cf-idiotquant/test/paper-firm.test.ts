// 운용사 규칙 — 반기 성적이 맡은 돈에 어떻게 반영되는가.
//
// 값을 박제하지 않고 상수에서 식을 세워 견준다. 계수를 바꾸면 테스트도 같이 따라와야
// "규칙이 바뀐 것"이고, 식이 어긋나면 그때 깨진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    flowRate, nextAum, baseFee, perfFee, settleQuarter, rankOf, fmtMoney,
    INITIAL_AUM, FLOW_MIN, FLOW_MAX, FLOW_EXCESS_MULT, FLOW_LOSS_MULT,
    BASE_FEE_BP, PERF_FEE_PCT, isRuined, IDLE_FLOW,
    TOOLS, DEPARTMENTS, perksOf, BASE_RESERVATIONS, RUIN_KEEP_PCT,
} from "@/lib/paper/firm";
import { SHORT_CALL_PCT } from "@/lib/paper/engine";
import { CLIENTS } from "@/lib/paper/season";

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

/* ── 문을 닫는 선, 그리고 관망 ─────────────────────────────────
   워커(src/lib/firmRules.js)와 같은 규칙이다. 한쪽을 고치면 여기서 깨져야 한다. */

test("최고점의 40% 아래로 떨어지면 문을 닫는다", () => {
    assert.equal(isRuined(100_000_000, 40_000_000), false, "정확히 40% 면 아직 버틴다");
    assert.equal(isRuined(100_000_000, 39_999_999), true);
    // 규모와 무관하게 같은 비율로 걸린다
    assert.equal(isRuined(10_000_000_000, 3_900_000_000), true);
    assert.equal(isRuined(10_000_000_000, 4_100_000_000), false);
});

test("최고점을 모르면 판정하지 않는다 — 규칙이 없던 시절의 회사를 뒤늦게 벌하지 않는다", () => {
    assert.equal(isRuined(0, 1), false);
    assert.equal(isRuined(null, 1), false);
    assert.equal(isRuined(undefined, 1), false);
});

test("최고점은 이번 반기를 시작할 때의 맡은 돈도 후보다", () => {
    // 최고점을 기록한 적 없는 회사(peak 0)도 첫 정산부터 규칙이 걸려야 한다
    const s = settleQuarter(INITIAL_AUM, -5, 0);
    assert.equal(s.peakBefore, INITIAL_AUM);
    assert.ok(s.peakAfter >= INITIAL_AUM || s.peakAfter === s.aumAfter);
});

test("최고점은 뒤로 가지 않는다", () => {
    const s = settleQuarter(50_000_000, 1, 0, { peak: 200_000_000 });
    assert.equal(s.peakBefore, 200_000_000);
    assert.equal(s.peakAfter, 200_000_000, "잘한 반기라도 예전 최고점을 못 넘으면 그대로다");
});

test("한 주도 안 산 반기는 성적과 무관하게 고객이 떠나고 성과보수가 없다", () => {
    // 하락장에서 현금으로 앉아 벤치마크를 크게 이긴 상황
    const played = settleQuarter(INITIAL_AUM, 0, -12);
    assert.ok(played.flowRate > 0, "굴렸다면 초과분만큼 들어온다");
    assert.ok(played.feePerf > 0);

    const idle = settleQuarter(INITIAL_AUM, 0, -12, { idle: true });
    assert.equal(idle.flowRate, IDLE_FLOW);
    assert.equal(idle.feePerf, 0, "운용하지 않고 성과보수를 받으면 관망이 벌이가 된다");
    assert.ok(idle.feeBase > 0, "운용보수는 맡은 돈에서 나오므로 그대로 받는다");
    assert.ok(idle.aumAfter < played.aumAfter);
});

test("고객에 따라 같은 성적이 다르게 평가된다", () => {
    const pension = CLIENTS.find(c => c.id === "pension")!;
    const hedge = CLIENTS.find(c => c.id === "hedge")!;
    // 벤치마크는 이겼지만 절대 손실이 난 반기 — 고객 성격이 가장 갈리는 자리
    const a = settleQuarter(INITIAL_AUM, -5, -12, { client: pension });
    const b = settleQuarter(INITIAL_AUM, -5, -12, { client: hedge });
    assert.ok(b.aumAfter > a.aumAfter, "헤지펀드는 초과분을, 연기금은 손실을 더 크게 본다");
    assert.ok(b.feePerf > a.feePerf, "성과보수 배수도 다르다");
});

test("고객이 없으면 예전 규칙 그대로", () => {
    const plain = settleQuarter(INITIAL_AUM, 5, 1);
    const nulled = settleQuarter(INITIAL_AUM, 5, 1, { client: null });
    assert.equal(plain.aumAfter, nulled.aumAfter);
    assert.equal(plain.feePerf, nulled.feePerf);
});

/* ── 부서 ────────────────────────────────────────────────────── */

test("부서를 안 산 회사는 전부 기본값이다", () => {
    const none = perksOf([]);
    assert.equal(none.maxReservations, BASE_RESERVATIONS);
    assert.equal(none.ruinKeepPct, RUIN_KEEP_PCT);
    assert.equal(none.shortCallPct, SHORT_CALL_PCT);
    assert.equal(none.flowExcessMult, 1);
    // 부서가 없던 시절 회사는 tools 자체가 없다
    assert.deepEqual(perksOf(null), none);
    assert.deepEqual(perksOf(undefined), none);
});

test("리서치 도구만 산 회사는 규칙이 안 바뀐다", () => {
    // 도구와 부서가 같은 tools 배열에 섞여 저장된다 — 도구 id 가 새면 규칙이 흔들린다
    assert.deepEqual(perksOf(TOOLS.map(t => t.id)), perksOf([]));
});

test("예약 데스크는 걸 수 있는 예약을 늘린다", () => {
    assert.ok(perksOf(["desk"]).maxReservations > BASE_RESERVATIONS);
});

test("리스크 관리팀은 문 닫는 선을 낮추고 마진콜을 늦춘다", () => {
    const p = perksOf(["risk"]);
    assert.ok(p.ruinKeepPct < RUIN_KEEP_PCT);
    assert.ok(p.shortCallPct > SHORT_CALL_PCT);

    // 기본 규칙으로는 문을 닫는 손실이 리스크 관리팀이 있으면 넘어간다
    const peak = INITIAL_AUM, aum = Math.round(peak * 0.35);
    assert.equal(isRuined(peak, aum, RUIN_KEEP_PCT), true);
    assert.equal(isRuined(peak, aum, p.ruinKeepPct), false);
});

test("IR팀은 잘한 반기의 유입만 키운다", () => {
    const ir = perksOf(["ir"]);
    const won = flowRate(10, 0), wonIr = flowRate(10, 0, { perks: ir });
    assert.ok(wonIr > won, "초과분에 배수가 붙는다");
    near(wonIr, won * ir.flowExcessMult);

    const lost = flowRate(-10, 0);
    assert.equal(flowRate(-10, 0, { perks: ir }), lost, "못한 반기의 유출은 그대로다");
});

test("부서는 정산에 그대로 실린다", () => {
    const plain = settleQuarter(INITIAL_AUM, 10, 0);
    const withIr = settleQuarter(INITIAL_AUM, 10, 0, { perks: perksOf(["ir"]) });
    assert.ok(withIr.aumAfter > plain.aumAfter);

    // 파산 판정도 부서를 본다
    const aum = Math.round(INITIAL_AUM * 0.35);
    assert.equal(settleQuarter(aum, 0, 0, { peak: INITIAL_AUM }).ruined, true);
    assert.equal(
        settleQuarter(aum, 0, 0, { peak: INITIAL_AUM, perks: perksOf(["risk"]) }).ruined, false,
    );
});

test("부서 가격은 회사가 감당할 수 있는 순서로 오른다", () => {
    const prices = DEPARTMENTS.map(d => d.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    assert.equal(new Set(DEPARTMENTS.map(d => d.id)).size, DEPARTMENTS.length);
    // 도구와 id 가 겹치면 무엇을 산 것인지 갈리지 않는다
    for (const d of DEPARTMENTS) assert.equal(TOOLS.some(t => t.id === d.id), false, d.id);
});
