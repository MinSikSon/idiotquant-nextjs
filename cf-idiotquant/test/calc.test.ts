// 복리 수익률 계산.
//
// 값을 손으로 적어 박제하면 "지금 나오는 숫자"를 지킬 뿐이라 계산이 틀려도 통과한다.
// 그래서 가능한 곳은 닫힌 식(closed form)과 견준다 — 식이 답을 따로 알고 있어야
// 테스트가 계산을 검증하는 것이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { simulate, sanitize, maskDetail, yearlyRates, serialize, parse, DEFAULTS, TAX_RATE, type CalcInputs } from "@/app/(calculator)/calculator/calc";

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

/* ── 범위 수익률 (해마다 무작위) ─────────────────────────────── */

/* base() 는 initial·monthly 가 0 이라 그대로 쓰면 final 이 늘 0 이고, 씨앗을 바꿔도
   0 === 0 으로 통과해버린다. 범위 테스트에는 굴릴 돈이 있어야 한다. */
const ranged = (over: Partial<CalcInputs> = {}): CalcInputs =>
    base({ initial: 1000, rateMode: "range", rateMin: 0, rateMax: 14, seed: 42, years: 10, ...over });

test("같은 씨앗이면 언제나 같은 결과 — 새로 그릴 때마다 숫자가 바뀌면 안 된다", () => {
    const a = simulate(ranged());
    const b = simulate(ranged());
    assert.equal(a.final, b.final);
    assert.deepEqual(a.rows.map(r => r.rate), b.rows.map(r => r.rate));
});

test("씨앗이 다르면 다른 갈래가 나온다", () => {
    const a = simulate(ranged({ seed: 1 }));
    const b = simulate(ranged({ seed: 2 }));
    assert.notEqual(a.final, b.final);
});

test("뽑힌 수익률은 전부 범위 안에 있다", () => {
    for (const seed of [1, 7, 99, 12345]) {
        for (const r of yearlyRates(ranged({ seed, rateMin: -5, rateMax: 20, years: 40 }))) {
            assert.ok(r >= -5 && r <= 20, `범위를 벗어났다: ${r} (seed ${seed})`);
        }
    }
});

test("해마다 값이 달라진다 — 한 번 뽑아 전부에 쓰는 게 아니다", () => {
    const rates = yearlyRates(ranged({ years: 20 }));
    assert.ok(new Set(rates).size > 5, `너무 적게 갈린다: ${new Set(rates).size}가지`);
});

test("하한과 상한이 같으면 고정 모드와 정확히 같은 결과", () => {
    // 범위 폭이 0 이면 무작위가 개입할 여지가 없다 — 여기서 어긋나면 배선이 잘못된 것이다.
    const fixed = simulate(base({ initial: 1000, rate: 7, years: 15 }));
    const band = simulate(ranged({ rateMin: 7, rateMax: 7, years: 15 }));
    near(band.final, fixed.final);
    near(band.principal, fixed.principal);
});

test("고정 모드는 rateMin·rateMax 를 무시한다", () => {
    const a = simulate(base({ initial: 1000, rate: 7, years: 10 }));
    const b = simulate(base({ initial: 1000, rate: 7, years: 10, rateMin: -50, rateMax: 100 }));
    near(a.final, b.final);
});

test("해마다 다른 값이 실제로 계산에 쓰인다", () => {
    // 연 1회 편입이면 각 해의 평가금액 증가율이 그 해 수익률과 같아야 한다.
    const r = simulate(ranged({ periods: 1, monthly: 0, initial: 1000, years: 5, tax: false }));
    for (let i = 1; i < r.rows.length; i++) {
        const grew = r.rows[i].value / r.rows[i - 1].value - 1;
        near(grew * 100, r.rows[i].rate!, 1e-6);
    }
});

test("행마다 그 해 수익률이 실려 나온다 (0년차 제외)", () => {
    const r = simulate(ranged({ years: 5 }));
    assert.equal(r.rows[0].rate, undefined, "0년차에는 수익률이 없다");
    assert.equal(r.rows.filter(x => x.year > 0).every(x => typeof x.rate === "number"), true);
});

test("sanitize 는 뒤집힌 범위를 바로잡는다", () => {
    const s = sanitize({ rateMode: "range", rateMin: 20, rateMax: 3 });
    assert.equal(s.rateMin, 3);
    assert.equal(s.rateMax, 20);
});

test("sanitize 는 깨진 씨앗을 1 로 되돌린다", () => {
    assert.equal(sanitize({ seed: NaN }).seed, 1);
    assert.equal(sanitize({ seed: 0 }).seed, 1);
    assert.equal(sanitize({ seed: -5 }).seed, 5);
});

test("링크에 방식·범위·씨앗이 실려 그대로 돌아온다", () => {
    // 씨앗이 안 실리면 링크를 받은 사람이 다른 숫자를 본다.
    const inputs = ranged({ seed: 777, rateMin: 2.5, rateMax: 11 });
    const back = parse(new URLSearchParams(serialize(inputs, "detailed")))!;

    assert.equal(back.inputs.rateMode, "range");
    assert.equal(back.inputs.rateMin, 2.5);
    assert.equal(back.inputs.rateMax, 11);
    assert.equal(back.inputs.seed, 777);
    assert.equal(simulate(back.inputs).final, simulate(inputs).final);
});
