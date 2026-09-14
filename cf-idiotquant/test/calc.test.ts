// 복리 수익률 계산.
//
// 값을 손으로 적어 박제하면 "지금 나오는 숫자"를 지킬 뿐이라 계산이 틀려도 통과한다.
// 그래서 가능한 곳은 닫힌 식(closed form)과 견준다 — 식이 답을 따로 알고 있어야
// 테스트가 계산을 검증하는 것이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { simulate, sanitize, maskDetail, serialize, parse, draftValue, trimLeadingZero, DEFAULTS, TAX_RATE, type CalcInputs } from "@/app/(calculator)/calculator/calc";

const base = (over: Partial<CalcInputs> = {}): CalcInputs => ({
    ...DEFAULTS, initial: 0, monthly: 0, tax: false, inflation: 0, ...over,
});

/** 상대 오차로 견준다 — 부동소수 마지막 자리까지 맞출 이유는 없다. */
const near = (got: number, want: number, tol = 1e-9) =>
    assert.ok(Math.abs(got - want) <= Math.abs(want) * tol + 1e-9,
        `${got} ≉ ${want}`);

test("거치식 월복리는 A = P(1 + r/12)^n 과 같다 · 편입 주기를 연 1회로 두면 A = P(1 + r)^y", () => {
    // ── 거치식 월복리는 A = P(1 + r/12)^n 과 같다
    {
        const r = simulate(base({ initial: 1000, rate: 6, years: 10, periods: 12 }));
        near(r.final, 1000 * Math.pow(1 + 0.06 / 12, 120));
    }

    // ── 편입 주기를 연 1회로 두면 A = P(1 + r)^y
    {
        // 매월 이자가 쌓였다가 연말에 한 번 편입되므로 연 단위 단리 누적과 같다.
        const r = simulate(base({ initial: 1000, rate: 6, years: 10, periods: 1 }));
        near(r.final, 1000 * Math.pow(1 + 0.06, 10));
    }
});

test("단리는 이자가 원금에 섞이지 않는다 — A = P(1 + r·y) · 적립식은 기시급 연금(annuity-due) 미래가치 식과 같다", () => {
    // ── 단리는 이자가 원금에 섞이지 않는다 — A = P(1 + r·y)
    {
        const r = simulate(base({ initial: 1000, rate: 6, years: 10, method: "simple" }));
        near(r.final, 1000 * (1 + 0.06 * 10));
    }

    // ── 적립식은 기시급 연금(annuity-due) 미래가치 식과 같다
    {
        // 적립금이 그달 이자를 만드느냐가 갈림길이다. simulate 는 월초에 넣고 그달부터
        // 이자를 붙이므로(기시급) 기말급 식보다 (1+i) 배 크다 — 실제 적립식 상품 쪽이다.
        //   기말급 FV = PMT · ((1+i)^n − 1) / i
        //   기시급 FV = 기말급 × (1 + i)
        const i = 0.06 / 12;
        const n = 120;
        const r = simulate(base({ monthly: 50, rate: 6, years: 10, periods: 12 }));
        near(r.final, 50 * ((Math.pow(1 + i, n) - 1) / i) * (1 + i));
    }
});

test("수익률 0% 면 원금 그대로 · 세금은 이자에만 붙는다", () => {
    // ── 수익률 0% 면 원금 그대로
    {
        const r = simulate(base({ initial: 1000, monthly: 50, rate: 0, years: 10 }));
        near(r.final, 1000 + 50 * 120);
        near(r.profit, 0);
    }

    // ── 세금은 이자에만 붙는다
    {
        const noTax = simulate(base({ initial: 1000, rate: 6, years: 1, periods: 1 }));
        const taxed = simulate(base({ initial: 1000, rate: 6, years: 1, periods: 1, tax: true }));

        const interest = noTax.final - 1000;
        near(taxed.taxPaid, interest * (TAX_RATE / 100));
        near(taxed.final, 1000 + interest * (1 - TAX_RATE / 100));
    }
});

test("손실이 나면 세금을 걷지 않는다 · 물가 반영 값은 명목을 (1+i)^y 로 나눈 것", () => {
    // ── 손실이 나면 세금을 걷지 않는다
    {
        const r = simulate(base({ initial: 1000, rate: -10, years: 5, tax: true }));
        assert.equal(r.taxPaid, 0);
        assert.ok(r.final < 1000);
    }

    // ── 물가 반영 값은 명목을 (1+i)^y 로 나눈 것
    {
        const r = simulate(base({ initial: 1000, rate: 6, years: 10, inflation: 2.5 }));
        near(r.real, r.final / Math.pow(1.025, 10));
    }
});

test("원금이 0이면 나눗셈으로 NaN 을 내지 않는다 · sanitize 는 범위 밖 값을 잘라내고 쓰레기는 기본값으로", () => {
    // ── 원금이 0이면 나눗셈으로 NaN 을 내지 않는다
    {
        const r = simulate(base({ initial: 0, monthly: 0, rate: 7, years: 10 }));
        assert.equal(r.cumret, 0);
        assert.equal(r.cagr, 0);
        assert.ok(Number.isFinite(r.final));
    }

    // ── sanitize 는 범위 밖 값을 잘라내고 쓰레기는 기본값으로
    {
        const s = sanitize({ years: 999, rate: 500, initial: NaN, periods: 7 as any, method: "??" as any });
        assert.equal(s.years, 60);
        assert.equal(s.rate, 100);
        assert.equal(s.initial, DEFAULTS.initial);
        assert.equal(s.periods, 12);     // 1·2·4·12 가 아니면 월
        assert.equal(s.method, "compound");
    }
});

test("간단 단계는 화면에 없는 조건을 계산에서도 뺀다 · 같은 씨앗이면 언제나 같은 결과 — 새로 그릴 때마다 숫자가 바뀌면 안 된다", () => {
    // ── 간단 단계는 화면에 없는 조건을 계산에서도 뺀다
    {
        const custom = base({ method: "simple", periods: 1, tax: false, inflation: 5 });

        const simple = maskDetail(custom, "simple");
        assert.deepEqual(
            [simple.method, simple.periods, simple.tax, simple.inflation],
            ["compound", 12, true, 0],
        );

        // 상세로 돌아오면 고쳐둔 조건이 그대로 살아 있어야 한다.
        assert.deepEqual(maskDetail(custom, "detailed"), custom);
    }

    // ── 같은 씨앗이면 언제나 같은 결과 — 새로 그릴 때마다 숫자가 바뀌면 안 된다
    {
        const a = simulate(ranged());
        const b = simulate(ranged());
        assert.equal(a.final, b.final);
        assert.deepEqual(a.rows.map(r => r.rate), b.rows.map(r => r.rate));
    }
});

/* ── 범위 수익률 (해마다 무작위) ─────────────────────────────── */

/* base() 는 initial·monthly 가 0 이라 그대로 쓰면 final 이 늘 0 이고, 씨앗을 바꿔도
   0 === 0 으로 통과해버린다. 범위 테스트에는 굴릴 돈이 있어야 한다. */
const ranged = (over: Partial<CalcInputs> = {}): CalcInputs =>
    base({ initial: 1000, rateMode: "range", rateMin: 0, rateMax: 14, seed: 42, years: 10, ...over });

test("고정 모드는 rateMin·rateMax 를 무시한다 · 해마다 다른 값이 실제로 계산에 쓰인다", () => {
    // ── 고정 모드는 rateMin·rateMax 를 무시한다
    {
        const a = simulate(base({ initial: 1000, rate: 7, years: 10 }));
        const b = simulate(base({ initial: 1000, rate: 7, years: 10, rateMin: -50, rateMax: 100 }));
        near(a.final, b.final);
    }

    // ── 해마다 다른 값이 실제로 계산에 쓰인다
    {
        // 연 1회 편입이면 각 해의 평가금액 증가율이 그 해 수익률과 같아야 한다.
        const r = simulate(ranged({ periods: 1, monthly: 0, initial: 1000, years: 5, tax: false }));
        for (let i = 1; i < r.rows.length; i++) {
            const grew = r.rows[i].value / r.rows[i - 1].value - 1;
            near(grew * 100, r.rows[i].rate!, 1e-6);
        }
    }
});

test("sanitize 는 깨진 씨앗을 1 로 되돌린다 · 링크에 방식·범위·씨앗이 실려 그대로 돌아온다", () => {
    // ── sanitize 는 깨진 씨앗을 1 로 되돌린다
    {
        assert.equal(sanitize({ seed: NaN }).seed, 1);
        assert.equal(sanitize({ seed: 0 }).seed, 1);
        assert.equal(sanitize({ seed: -5 }).seed, 5);
    }

    // ── 링크에 방식·범위·씨앗이 실려 그대로 돌아온다
    {
        // 씨앗이 안 실리면 링크를 받은 사람이 다른 숫자를 본다.
        const inputs = ranged({ seed: 777, rateMin: 2.5, rateMax: 11 });
        const back = parse(new URLSearchParams(serialize(inputs, "detailed")))!;

        assert.equal(back.inputs.rateMode, "range");
        assert.equal(back.inputs.rateMin, 2.5);
        assert.equal(back.inputs.rateMax, 11);
        assert.equal(back.inputs.seed, 777);
        assert.equal(simulate(back.inputs).final, simulate(inputs).final);
    }
});

/* ── 치는 중인 글자 — 「0 이 안 지워진다」가 났던 자리 ───────── */
test("확정된 값은 그대로 sanitize 를 탄다 · 앞자리 0 은 떼어 낸다 — 「01」은 1 이다", () => {
    // ── 확정된 값은 그대로 sanitize 를 탄다
    {
        // 칸이 바뀌어도 한계는 그대로다 — 다듬는 자리는 여전히 하나뿐이다.
        assert.equal(sanitize({ ...DEFAULTS, years: draftValue("99")! }).years, 60);
        assert.equal(sanitize({ ...DEFAULTS, initial: draftValue("0")! }).initial, 0);
    }

    // ── 앞자리 0 은 떼어 낸다 — 「01」은 1 이다
    {
        assert.equal(trimLeadingZero("01"), "1");
        assert.equal(trimLeadingZero("007"), "7");
        assert.equal(trimLeadingZero("00"), "0");
        assert.equal(trimLeadingZero("-01"), "-1");
        // **0 뒤에 숫자가 바로 붙을 때만 뗀다.**
        assert.equal(trimLeadingZero("0"), "0", "0 은 0 이다");
        assert.equal(trimLeadingZero("0.5"), "0.5", "소수는 앞의 0 이 뜻을 가진다");
        assert.equal(trimLeadingZero("0."), "0.", "치는 중이다 — 건드리면 소수점을 못 친다");
        assert.equal(trimLeadingZero(""), "");
        assert.equal(trimLeadingZero("-"), "-");
    }
});
