// 스크리너의 판단부 — 어떤 종목을 남기고 어떤 순서로 세우는가.
//
// 이 로직이 어긋나면 사용자는 "잘못된 종목 목록"을 보게 되는데, 화면은 멀쩡히
// 그려지므로 아무도 알아채지 못한다. 그래서 여기를 건다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { applyFilters, sortList, roeOf, grahamOk, marketOf, sectorOf, isPreferredStock, safeNum, type ScreenerFilters } from "@/app/(screener)/screener/filters";

/** 아무것도 안 거르는 기본값. 테스트마다 한 조건씩만 켠다. */
const none = (over: Partial<ScreenerFilters> = {}): ScreenerFilters => ({
    strategies: new Set(), mode: "OR", q: "",
    excludeHoldings: false, excludeDeficit: false, excludePreferred: false,
    excludeHalted: false, excludeManaged: false, excludeDelisting: false,
    sectors: new Set(), markets: new Set(),
    maxW52Pos: 0, minTrAmt: 0, minMarketCap: 0,
    maxPbr: 0, maxPer: 0, minRoe: 0, minNcav: 0,
    ...over,
});

const stock = (over: Record<string, any> = {}) => ({
    ticker: "005930", name: "삼성전자", market: "KOSPI", sector: "전기전자",
    ncav_ratio: 0.5, per: 12, pbr: 1.2, eps: 5000, bps: 50000,
    market_cap: 400_000_000_000_000, last_price: 70000,
    ...over,
});

const names = (list: any[]) => list.map(i => i.name);

/* ── 값 뽑기 ─────────────────────────────────────────────────── */
test("safeNum 은 숫자가 아닌 값을 0 으로 — 필터가 NaN 으로 무너지지 않는다 · ROE = EPS ÷ BPS × 100, bps 가 없으면 0", () => {
    // ── safeNum 은 숫자가 아닌 값을 0 으로 — 필터가 NaN 으로 무너지지 않는다
    {
        assert.equal(safeNum("123"), 123);
        assert.equal(safeNum(null), 0);
        assert.equal(safeNum(undefined), 0);
        assert.equal(safeNum("없음"), 0);
    }

    // ── ROE = EPS ÷ BPS × 100, bps 가 없으면 0
    {
        assert.equal(roeOf({ eps: 5000, bps: 50000 }), 10);
        assert.equal(roeOf({ eps: 5000, bps: 0 }), 0);
        assert.equal(roeOf({ eps: 5000 }), 0);
    }
});

test("그레이엄 수 — PER × PBR < 22.5, 음수는 통과시키지 않는다 · 시장 이름을 한 가지 표기로 모은다", () => {
    // ── 그레이엄 수 — PER × PBR < 22.5, 음수는 통과시키지 않는다
    {
        assert.equal(grahamOk({ per: 10, pbr: 2 }), true);    // 20
        assert.equal(grahamOk({ per: 10, pbr: 3 }), false);   // 30
        assert.equal(grahamOk({ per: -5, pbr: 1 }), false);   // 적자
        assert.equal(grahamOk({ per: 10, pbr: 0 }), false);
    }

    // ── 시장 이름을 한 가지 표기로 모은다
    {
        assert.equal(marketOf({ market: "코스닥" }), "KOSDAQ");
        assert.equal(marketOf({ market: "KOSDAQ GLOBAL" }), "KOSDAQ");
        assert.equal(marketOf({ market: "유가증권" }), "KOSPI");
        assert.equal(marketOf({ market: "" }), "");
    }
});

test("업종은 sector 를 먼저 보고 옛 응답의 industry 로 폴백한다 · 우선주 판별 — 본주는 남기고 우선주만 걸러낸다", () => {
    // ── 업종은 sector 를 먼저 보고 옛 응답의 industry 로 폴백한다
    {
        assert.equal(sectorOf({ sector: "화학" }), "화학");
        assert.equal(sectorOf({ industry: "화학" }), "화학");
        assert.equal(sectorOf({}), "");
    }

    // ── 우선주 판별 — 본주는 남기고 우선주만 걸러낸다
    {
        for (const n of ["삼성전자우", "현대차2우B", "LG화학우"]) {
            assert.equal(isPreferredStock(n), true, n);
        }
        for (const n of ["삼성전자", "우리금융지주", "한국우주항공"]) {
            assert.equal(isPreferredStock(n), false, n);
        }
    }
});

/* ── 필터 ────────────────────────────────────────────────────── */
test("적자 제외는 EPS 가 양수인 것만 남긴다 · 지주·우선주 제외", () => {
    // ── 적자 제외는 EPS 가 양수인 것만 남긴다
    {
        const list = [stock({ name: "흑자", eps: 100 }), stock({ name: "적자", eps: -100 }), stock({ name: "0", eps: 0 })];
        assert.deepEqual(names(applyFilters(list, none({ excludeDeficit: true }))), ["흑자"]);
    }

    // ── 지주·우선주 제외
    {
        const list = [stock({ name: "삼성전자" }), stock({ name: "삼성홀딩스" }), stock({ name: "삼성전자우" })];
        assert.deepEqual(names(applyFilters(list, none({ excludeHoldings: true }))), ["삼성전자", "삼성전자우"]);
        assert.deepEqual(names(applyFilters(list, none({ excludePreferred: true }))), ["삼성전자", "삼성홀딩스"]);
    }
});

test("업종·시장은 고른 것만 남긴다 · 전략 OR 은 하나만 걸려도 남고, AND 는 전부 걸려야 남는다", () => {
    // ── 업종·시장은 고른 것만 남긴다
    {
        const list = [
            stock({ name: "가", sector: "화학", market: "KOSPI" }),
            stock({ name: "나", sector: "전기전자", market: "코스닥" }),
        ];
        assert.deepEqual(names(applyFilters(list, none({ sectors: new Set(["화학"]) }))), ["가"]);
        assert.deepEqual(names(applyFilters(list, none({ markets: new Set(["KOSDAQ"]) }))), ["나"]);
    }

    // ── 전략 OR 은 하나만 걸려도 남고, AND 는 전부 걸려야 남는다
    {
        // 저PBR(pbr<0.5) 과 저PER(per<10, eps>0) 둘 다 만족 / 하나만 만족
        const both = stock({ name: "둘다", pbr: 0.4, per: 8, eps: 100 });
        const onlyPbr = stock({ name: "PBR만", pbr: 0.4, per: 30, eps: 100 });
        const list = [both, onlyPbr];
        const picked = new Set(["low_pbr", "low_per"]);

        assert.deepEqual(names(applyFilters(list, none({ strategies: picked, mode: "OR" }))), ["둘다", "PBR만"]);
        assert.deepEqual(names(applyFilters(list, none({ strategies: picked, mode: "AND" }))), ["둘다"]);
    }
});

test("값을 모르는 종목은 유동성·52주 조건에서 통과시킨다 · 조건을 여러 개 걸면 모두 만족하는 것만 남는다", () => {
    // ── 값을 모르는 종목은 유동성·52주 조건에서 통과시킨다
    {
        // 수집이 덜 된 구간에서 "모르는 것"을 "조건 위반"으로 보면 목록이 통째로 빈다.
        const unknown = stock({ name: "미수집" });   // acml_tr_pbmn·w52 없음
        assert.equal(applyFilters([unknown], none({ minTrAmt: 10 })).length, 1);
        assert.equal(applyFilters([unknown], none({ maxW52Pos: 25 })).length, 1);
    }

    // ── 조건을 여러 개 걸면 모두 만족하는 것만 남는다
    {
        const list = [
            stock({ name: "다만족", pbr: 0.4, per: 8, eps: 100, ncav_ratio: 1.2 }),
            stock({ name: "PBR탈락", pbr: 0.9, per: 8, eps: 100, ncav_ratio: 1.2 }),
            stock({ name: "적자탈락", pbr: 0.4, per: 8, eps: -1, ncav_ratio: 1.2 }),
        ];
        const f = none({ maxPbr: 0.5, maxPer: 10, minNcav: 1.0, excludeDeficit: true });
        assert.deepEqual(names(applyFilters(list, f)), ["다만족"]);
    }
});

/* ── 정렬 ────────────────────────────────────────────────────── */
test("ROE 를 모르는 종목은 맨 아래로 — 0 으로 두면 적자 사이에 섞여 올라온다 · 값이 없는 종목은 0 으로 세어 내림차순 끝에 놓인다", () => {
    // ── ROE 를 모르는 종목은 맨 아래로 — 0 으로 두면 적자 사이에 섞여 올라온다
    {
        const list = [
            stock({ name: "높음", eps: 5000, bps: 25000 }),   // 20%
            stock({ name: "모름", eps: 5000, bps: 0 }),        // 값 없음
            stock({ name: "적자", eps: -5000, bps: 50000 }),   // -10%
        ];
        assert.deepEqual(names(sortList([...list], "roe", "desc")), ["높음", "적자", "모름"]);
    }

    // ── 값이 없는 종목은 0 으로 세어 내림차순 끝에 놓인다
    {
        const list = [stock({ name: "있음", per: 10 }), stock({ name: "없음", per: null })];
        assert.deepEqual(names(sortList([...list], "per", "desc")), ["있음", "없음"]);
    }
});
