// 복리 수익률 계산.
//
// 값을 손으로 적어 박제하면 "지금 나오는 숫자"를 지킬 뿐이라 계산이 틀려도 통과한다.
// 그래서 가능한 곳은 닫힌 식(closed form)과 견준다 — 식이 답을 따로 알고 있어야
// 테스트가 계산을 검증하는 것이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { simulate, sanitize, maskDetail, DEFAULTS, TAX_RATE, type CalcInputs } from "../app/(calculator)/calculator/calc.ts";

const base = (over: Partial<CalcInputs> = {}): CalcInputs => ({
    ...DEFAULTS, initial: 0, monthly: 0, tax: false, inflation: 0, ...over,
});

/** 상대 오차로 견준다 — 부동소수 마지막 자리까지 맞출 이유는 없다. */
const near = (got: number, want: number, tol = 1e-9) =>
    assert.ok(Math.abs(got - want) <= Math.abs(want) * tol + 1e-9,
        `${got} ≉ ${want}`);

test("거치식 월복리는 A = P(1 + r/12)^n 과 같다", () => {
    const r = simulate(base({ initial: 1000, rate: 6, years: 10, periods: 12 }));
    near(r.final, 1000 * Math.pow(1 + 0.06 / 12, 120));
});

test("편입 주기를 연 1회로 두면 A = P(1 + r)^y", () => {
    // 매월 이자가 쌓였다가 연말에 한 번 편입되므로 연 단위 단리 누적과 같다.
    const r = simulate(base({ initial: 1000, rate: 6, years: 10, periods: 1 }));
    near(r.final, 1000 * Math.pow(1 + 0.06, 10));
});

test("단리는 이자가 원금에 섞이지 않는다 — A = P(1 + r·y)", () => {
    const r = simulate(base({ initial: 1000, rate: 6, years: 10, method: "simple" }));
    near(r.final, 1000 * (1 + 0.06 * 10));
});

test("적립식은 기시급 연금(annuity-due) 미래가치 식과 같다", () => {
    // 적립금이 그달 이자를 만드느냐가 갈림길이다. simulate 는 월초에 넣고 그달부터
    // 이자를 붙이므로(기시급) 기말급 식보다 (1+i) 배 크다 — 실제 적립식 상품 쪽이다.
    //   기말급 FV = PMT · ((1+i)^n − 1) / i
    //   기시급 FV = 기말급 × (1 + i)
    const i = 0.06 / 12;
    const n = 120;
    const r = simulate(base({ monthly: 50, rate: 6, years: 10, periods: 12 }));
    near(r.final, 50 * ((Math.pow(1 + i, n) - 1) / i) * (1 + i));
});

test("수익률 0% 면 원금 그대로", () => {
    const r = simulate(base({ initial: 1000, monthly: 50, rate: 0, years: 10 }));
    near(r.final, 1000 + 50 * 120);
    near(r.profit, 0);
});

test("세금은 이자에만 붙는다", () => {
    const noTax = simulate(base({ initial: 1000, rate: 6, years: 1, periods: 1 }));
    const taxed = simulate(base({ initial: 1000, rate: 6, years: 1, periods: 1, tax: true }));

    const interest = noTax.final - 1000;
    near(taxed.taxPaid, interest * (TAX_RATE / 100));
    near(taxed.final, 1000 + interest * (1 - TAX_RATE / 100));
});

test("손실이 나면 세금을 걷지 않는다", () => {
    const r = simulate(base({ initial: 1000, rate: -10, years: 5, tax: true }));
    assert.equal(r.taxPaid, 0);
    assert.ok(r.final < 1000);
});

test("물가 반영 값은 명목을 (1+i)^y 로 나눈 것", () => {
    const r = simulate(base({ initial: 1000, rate: 6, years: 10, inflation: 2.5 }));
    near(r.real, r.final / Math.pow(1.025, 10));
});

test("행은 0년부터 마지막 해까지 하나씩", () => {
    const r = simulate(base({ initial: 1000, rate: 6, years: 10 }));
    assert.equal(r.rows.length, 11);
    assert.equal(r.rows[0].year, 0);
    assert.equal(r.rows[0].value, 1000);
    assert.equal(r.rows[10].year, 10);
    near(r.rows[10].value, r.final);
});

test("누적 수익률과 연평균이 서로 맞는다", () => {
    const r = simulate(base({ initial: 1000, rate: 7, years: 20 }));
    near(r.cumret, (r.final / r.principal - 1) * 100);
    near(r.cagr, (Math.pow(r.final / r.principal, 1 / 20) - 1) * 100);
});

test("원금이 0이면 나눗셈으로 NaN 을 내지 않는다", () => {
    const r = simulate(base({ initial: 0, monthly: 0, rate: 7, years: 10 }));
    assert.equal(r.cumret, 0);
    assert.equal(r.cagr, 0);
    assert.ok(Number.isFinite(r.final));
});

test("sanitize 는 범위 밖 값을 잘라내고 쓰레기는 기본값으로", () => {
    const s = sanitize({ years: 999, rate: 500, initial: NaN, periods: 7 as any, method: "??" as any });
    assert.equal(s.years, 60);
    assert.equal(s.rate, 100);
    assert.equal(s.initial, DEFAULTS.initial);
    assert.equal(s.periods, 12);     // 1·2·4·12 가 아니면 월
    assert.equal(s.method, "compound");
});

test("간단 단계는 화면에 없는 조건을 계산에서도 뺀다", () => {
    const custom = base({ method: "simple", periods: 1, tax: false, inflation: 5 });

    const simple = maskDetail(custom, "simple");
    assert.deepEqual(
        [simple.method, simple.periods, simple.tax, simple.inflation],
        ["compound", 12, true, 0],
    );

    // 상세로 돌아오면 고쳐둔 조건이 그대로 살아 있어야 한다.
    assert.deepEqual(maskDetail(custom, "detailed"), custom);
});
