// 운용사 규칙 — 반기 성적이 맡은 돈에 어떻게 반영되는가.
//
// 값을 박제하지 않고 상수에서 식을 세워 견준다. 계수를 바꾸면 테스트도 같이 따라와야
// "규칙이 바뀐 것"이고, 식이 어긋나면 그때 깨진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { flowRate, baseFee, perfFee, settleQuarter, INITIAL_AUM, FLOW_EXCESS_MULT, FLOW_LOSS_MULT, BASE_FEE_BP, PERF_FEE_PCT } from "@/lib/paper/firm";
import { CLIENTS } from "@/lib/paper/season";

const near = (got: number, want: number, tol = 1e-9) =>
    assert.ok(Math.abs(got - want) <= Math.abs(want) * tol + 1e-9, `${got} ≉ ${want}`);

/* ── 고객 자금 유출입 ────────────────────────────────────────── */
test("벤치마크를 이긴 만큼 돈이 들어온다 · 시장에 진 만큼 돈이 나간다", () => {
    // ── 벤치마크를 이긴 만큼 돈이 들어온다
    {
        // +10% 인데 시장이 +4% → 초과 6%p
        near(flowRate(10, 4), 6 * FLOW_EXCESS_MULT);
    }

    // ── 시장에 진 만큼 돈이 나간다
    {
        near(flowRate(4, 10), -6 * FLOW_EXCESS_MULT);
    }
});

test("잃으면 시장을 이겼어도 따로 벌을 받는다 · 번 해에는 손실 벌점이 없다", () => {
    // ── 잃으면 시장을 이겼어도 따로 벌을 받는다
    {
        // −5% 인데 시장은 −10% → 초과 +5%p 지만 절대 손실 −5% 도 함께 센다
        near(flowRate(-5, -10), 5 * FLOW_EXCESS_MULT + -5 * FLOW_LOSS_MULT);
    }

    // ── 번 해에는 손실 벌점이 없다
    {
        // 절대 손실이 0 이므로 초과분만 남는다
        near(flowRate(3, 1), 2 * FLOW_EXCESS_MULT);
    }
});

/* ── 맡은 돈 ─────────────────────────────────────────────────── */
/* ── 보수 ────────────────────────────────────────────────────── */
test("기본 보수는 맡은 돈에만 걸린다 (성적과 무관) · 성과 보수는 초과수익이 있을 때만", () => {
    // ── 기본 보수는 맡은 돈에만 걸린다 (성적과 무관)
    {
        const want = Math.floor((INITIAL_AUM * BASE_FEE_BP) / 10_000);
        assert.equal(baseFee(INITIAL_AUM), want);
        assert.equal(baseFee(0), 0);
    }

    // ── 성과 보수는 초과수익이 있을 때만
    {
        assert.equal(perfFee(INITIAL_AUM, 4, 10), 0, "시장에 졌는데 성과 보수를 받았다");
        assert.equal(perfFee(INITIAL_AUM, 10, 10), 0, "초과가 0 이면 없다");

        const want = Math.floor((INITIAL_AUM * 6 * PERF_FEE_PCT) / 10_000);
        assert.equal(perfFee(INITIAL_AUM, 10, 4), want);
    }
});

/* ── 등급 ────────────────────────────────────────────────────── */
/* ── 표기 ────────────────────────────────────────────────────── */
/* ── 문을 닫는 선, 그리고 관망 ─────────────────────────────────
   워커(src/lib/firmRules.js)와 같은 규칙이다. 한쪽을 고치면 여기서 깨져야 한다. */

test("고객에 따라 같은 성적이 다르게 평가된다 · 고객이 없으면 예전 규칙 그대로", () => {
    // ── 고객에 따라 같은 성적이 다르게 평가된다
    {
        const pension = CLIENTS.find(c => c.id === "pension")!;
        const hedge = CLIENTS.find(c => c.id === "hedge")!;
        // 벤치마크는 이겼지만 절대 손실이 난 반기 — 고객 성격이 가장 갈리는 자리
        const a = settleQuarter(INITIAL_AUM, -5, -12, { client: pension });
        const b = settleQuarter(INITIAL_AUM, -5, -12, { client: hedge });
        assert.ok(b.aumAfter > a.aumAfter, "헤지펀드는 초과분을, 연기금은 손실을 더 크게 본다");
        assert.ok(b.feePerf > a.feePerf, "성과보수 배수도 다르다");
    }

    // ── 고객이 없으면 예전 규칙 그대로
    {
        const plain = settleQuarter(INITIAL_AUM, 5, 1);
        const nulled = settleQuarter(INITIAL_AUM, 5, 1, { client: null });
        assert.equal(plain.aumAfter, nulled.aumAfter);
        assert.equal(plain.feePerf, nulled.feePerf);
    }
});

/* ── 부서 ────────────────────────────────────────────────────── */
