// 백테스트의 계산부 — 수익률과 포트폴리오 집계.
//
// 여기가 틀리면 사용자는 "잘못된 수익률"을 사실로 믿는다. 화면은 멀쩡히 그려지고
// 숫자는 그럴듯해서 아무도 되짚어보지 않는다. 그래서 값을 박제하지 않고 식과 견준다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    calcReturn, fillDateGaps, recomputePortfolioWithFilter,
    parseStrategies, getDayKor, fmtDate, augmentPortfolioResult,
    type PortfolioResult,
} from "@/app/(backtest)/backtest/calc";

const near = (got: number, want: number, tol = 1e-9) =>
    assert.ok(Math.abs(got - want) <= Math.abs(want) * tol + 1e-9, `${got} ≉ ${want}`);

/* ── 수익률 ──────────────────────────────────────────────────── */

test("보정을 끄면 단순 수익률 — (현재가 / 매수가 − 1) × 100", () => {
    near(calcReturn(10_000, undefined, "A", 12_000, false, new Map()), 20);
    near(calcReturn(10_000, undefined, "A", 8_000, false, new Map()), -20);
    near(calcReturn(10_000, undefined, "A", 10_000, false, new Map()), 0);
});

test("병합 보정 — 기준가를 시가총액 ÷ 현재 상장주식수로 되돌린다", () => {
    // 시가총액 1,000억(억원 단위 1000) ÷ 100만주 = 주당 10만원이 보정된 매수가.
    // market_cap 은 억원, last_price 는 원이라 1e8 을 곱해 단위를 맞춘다.
    const lstn = new Map([["A", 1_000_000]]);
    near(calcReturn(50_000, 1000, "A", 120_000, true, lstn), 20);   // 120,000 / 100,000 − 1

    // 보정을 켜면 원래 entryPrice(50,000)는 쓰이지 않는다 — 그게 이 함수의 요점이다.
    assert.notEqual(
        calcReturn(50_000, 1000, "A", 120_000, true, lstn),
        calcReturn(50_000, 1000, "A", 120_000, false, lstn),
    );
});

test("보정에 필요한 값이 없으면 조용히 단순 수익률로 돌아간다", () => {
    const empty = new Map<string, number>();
    const lstn = new Map([["A", 1_000_000]]);

    // 상장주식수를 모름
    near(calcReturn(10_000, 1000, "A", 12_000, true, empty), 20);
    // 시가총액을 모름
    near(calcReturn(10_000, undefined, "A", 12_000, true, lstn), 20);
    // 시가총액이 0
    near(calcReturn(10_000, 0, "A", 12_000, true, lstn), 20);
    // 상장주식수가 0 — 나눗셈이 Infinity 가 되면 안 된다
    near(calcReturn(10_000, 1000, "A", 12_000, true, new Map([["A", 0]])), 20);
});

/* ── 날짜 ────────────────────────────────────────────────────── */

test("요일과 표기", () => {
    // 2026-08-25 는 화요일
    assert.equal(getDayKor("20260825"), "화");
    assert.equal(fmtDate("20260825"), "08/25(화)");
});

/* ── 시계열 빈칸 채우기 ──────────────────────────────────────── */

test("빈 날짜를 선형 보간으로 채우고 채운 것에 표시를 남긴다", () => {
    const out = fillDateGaps(
        [{ date: "20260101", v: 0 }, { date: "20260104", v: 30 }],
        ["v"],
    );

    assert.deepEqual(out.map(p => p.date), ["20260101", "20260102", "20260103", "20260104"]);
    // 3일 간격 → 1/3, 2/3 지점
    near((out[1] as any).v, 10);
    near((out[2] as any).v, 20);

    // 실측과 추정이 구별되어야 한다 — 차트가 둘을 같은 선으로 그리면 안 된다.
    assert.deepEqual(out.map(p => p.estimated ?? false), [false, true, true, false]);
});

test("빈칸이 없으면 그대로 둔다", () => {
    const data = [{ date: "20260101", v: 1 }, { date: "20260102", v: 2 }];
    assert.deepEqual(fillDateGaps(data, ["v"]).map(p => p.date), ["20260101", "20260102"]);
});

test("점이 하나 이하면 그대로 — 보간할 상대가 없다", () => {
    assert.equal(fillDateGaps([], ["v"]).length, 0);
    assert.equal(fillDateGaps([{ date: "20260101", v: 1 }], ["v"]).length, 1);
});

test("월을 넘는 간격도 실제 날짜로 센다", () => {
    // 1/30 → 2/2 는 3일 (1월은 31일까지)
    const out = fillDateGaps([{ date: "20260130", v: 0 }, { date: "20260202", v: 3 }], ["v"]);
    assert.deepEqual(out.map(p => p.date), ["20260130", "20260131", "20260201", "20260202"]);
});

/* ── 포트폴리오 재계산 ───────────────────────────────────────── */

const series = (ticker: string, name: string, pts: [string, number][], final: number) => ({
    ticker, name, final_pct: final,
    data: pts.map(([date, pct]) => ({ date, pct })),
});

const result = (): PortfolioResult => ({
    start_date: "20260101",
    strategy: "ncav",
    candidate_count: 2,
    candidates: [
        { ticker: "A", name: "가", start_price: 1000 },
        { ticker: "B", name: "나", start_price: 2000 },
    ],
    time_series: [],
    ticker_series: [
        series("A", "가", [["20260101", 0], ["20260102", 10]], 10),
        series("B", "나", [["20260101", 0], ["20260102", -4]], -4),
    ],
    summary: { current_pct: 0, days: 2, top_gainer: null, top_loser: null },
});

test("필터가 전부 통과시키면 백엔드 계산을 그대로 쓴다", () => {
    const r = result();
    assert.equal(recomputePortfolioWithFilter(r, new Set(["A", "B"])), r, "원본 객체 그대로여야 한다");
});

test("걸러진 종목만으로 날짜별 평균을 다시 낸다", () => {
    const out = recomputePortfolioWithFilter(result(), new Set(["A"]))!;

    assert.equal(out.candidate_count, 1);
    assert.deepEqual(out.time_series.map(p => p.portfolio_pct), [0, 10]);   // A 만
    assert.deepEqual(out.time_series.map(p => p.covered), [1, 1]);
});

test("평균은 걸린 종목 수로 나눈다 — 빠진 종목을 0으로 세지 않는다", () => {
    const out = recomputePortfolioWithFilter(result(), new Set(["A", "B"]))!;
    // 위 테스트에서 통과필터는 원본을 그대로 주므로, 여기서는 셋 중 둘만 남겨 확인한다.
    const r = result();
    r.ticker_series!.push(series("C", "다", [["20260101", 0], ["20260102", 100]], 100));
    r.candidates.push({ ticker: "C", name: "다", start_price: 3000 });

    const two = recomputePortfolioWithFilter(r, new Set(["A", "B"]))!;
    near(two.time_series[1].portfolio_pct, 3);   // (10 + −4) / 2 = 3, (10−4+0)/3 이 아니다
    assert.equal(two.time_series[1].covered, 2);
    assert.ok(out);
});

test("이긴 종목 수를 함께 센다 (0% 는 이긴 것으로 본다)", () => {
    const out = recomputePortfolioWithFilter(result(), new Set(["A"]))!;
    assert.deepEqual(out.time_series.map(p => p.win_count), [1, 1]);   // 0% 와 +10%
});

test("최고·최저 종목은 최종 수익률 기준", () => {
    const r = result();
    r.ticker_series!.push(series("C", "다", [["20260101", 0], ["20260102", 50]], 50));
    r.candidates.push({ ticker: "C", name: "다", start_price: 3000 });

    const out = recomputePortfolioWithFilter(r, new Set(["A", "C"]))!;
    assert.equal(out.summary.top_gainer?.ticker, "C");
    assert.equal(out.summary.top_loser?.ticker, "A");
});

test("필터가 전부 걸러내면 null — 화면이 빈 상태를 띄운다", () => {
    assert.equal(recomputePortfolioWithFilter(result(), new Set(["없는종목"])), null);
});

/* ── 전략 파싱 ───────────────────────────────────────────────── */

test("전략 목록은 배열·JSON 문자열 어느 쪽으로 와도 읽는다", () => {
    assert.deepEqual(parseStrategies(["ncav", "low_pbr"]), ["ncav", "low_pbr"]);
    assert.deepEqual(parseStrategies('["ncav"]'), ["ncav"]);
});

test("깨진 값이 와도 빈 배열 — 목록 하나 때문에 화면이 죽지 않는다", () => {
    assert.deepEqual(parseStrategies("{망가진"), []);
    assert.deepEqual(parseStrategies(null), []);
    assert.deepEqual(parseStrategies(undefined), []);
});

/* ── 보간 진입점 ─────────────────────────────────────────────── */

test("시계열이 충분하면 필터 재계산으로 넘긴다", () => {
    const r = result();
    r.time_series = [
        { date: "20260101", portfolio_pct: 0, covered: 2, win_count: 2 },
        { date: "20260102", portfolio_pct: 3, covered: 2, win_count: 1 },
    ];
    const out = augmentPortfolioResult(r, [], new Map(), new Map(), false, new Set(["A"]), "20260102", null)!;
    assert.equal(out.candidate_count, 1);
});

test("후보가 아예 없으면 받은 것을 그대로 돌려준다", () => {
    const r = result();
    r.time_series = [];
    r.candidates = [];
    r.ticker_series = [];
    const out = augmentPortfolioResult(r, [], new Map(), new Map(), false, new Set(), "20260102", null);
    assert.equal(out, r);
});
