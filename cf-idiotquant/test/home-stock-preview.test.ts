import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHomeStockPreview, formatHomeMarketCap, homeFilterFromParams, homeResultsHref, homeStockPreview } from "@/lib/utils/homeStockPreview";

const stock = (ticker: string, per: number, pbr: number, ncav_ratio: number, market_cap = 100) => ({ ticker, name: ticker, last_price: 100, scan_date: "20261108", per, pbr, ncav_ratio, market_cap });
const list = [stock("small", 9, 0.2, 1.2, 10), stock("large", 20, 0.49, 0.5, 1000), stock("growth", 30, 0.1, 2, 2000), stock("loss", -1, 0.05, 3), stock("zero", 0, 0, 0), stock("boundary", 10, 0.5, 1)];

test("전략은 전체 조회 목록에 독립적으로 적용하고 해당 지표로 정렬한다", () => {
    assert.deepEqual(homeStockPreview(list, "per10").map(s => s.ticker), ["small", "boundary"]);
    assert.deepEqual(homeStockPreview(list, "low_pbr").map(s => s.ticker), ["loss", "growth", "small", "large"]);
    assert.deepEqual(homeStockPreview(list, "ncav").map(s => s.ticker), ["loss", "growth", "small", "boundary"]);
    assert.equal(list[0].ticker, "small", "공유 목록 순서를 변경하지 않는다");
});

test("대형주는 PER 제한 없이 시가총액 순으로 실제 지표를 함께 반환한다", () => {
    const result = homeStockPreview(list, "large_cap");
    assert.equal(result[0].ticker, "growth");
    assert.equal(result[0].per, 30);
    assert.equal(result[0].pbr, .1);
    assert.equal(result[0].last_price, 100);
    assert.equal(result.length, 5);
});

test("조건별 표시 수와 전체 조회 수를 구분하고 최대 5개만 전달한다", () => {
    const result = buildHomeStockPreview(Array.from({length: 12}, (_, i) => stock(String(i), 5, .1, 1)), 3000, "20261108");
    assert.equal(result.groups.ncav.length, 5);
    assert.equal(result.counts.ncav, 12);
    assert.equal(result.loaded, 12);
    assert.equal(result.total, 3000);
    assert.equal(result.scanDate, "20261108");
    assert.deepEqual(homeStockPreview([], "ncav"), []);
    for (const value of [NaN, Infinity, -Infinity]) {
        assert.deepEqual(homeStockPreview([stock("invalid", value, .1, 1)], "per10"), []);
        assert.deepEqual(homeStockPreview([stock("invalid", 5, value, 1)], "low_pbr"), []);
        assert.deepEqual(homeStockPreview([stock("invalid", 5, .1, value)], "ncav"), []);
    }
});

test("발굴 이동 시 시장과 선택 조건을 유지하며 PER를 다른 전략에 덧씌우지 않는다", () => {
    const url = (filter: Parameters<typeof homeResultsHref>[0]) => new URL(homeResultsHref(filter, "US"), "https://idiotquant.local");
    assert.equal(url("large_cap").searchParams.get("sort"), "market_cap");
    assert.equal(url("per10").searchParams.get("maxper"), "10");
    assert.equal(url("low_pbr").searchParams.get("strategies"), "low_pbr");
    assert.equal(url("ncav").searchParams.has("maxper"), false);
    assert.equal(url("ncav").searchParams.get("country"), "US");
});

test("시가총액은 국내 억 원과 미국 달러의 원본 단위를 구분해 표시한다", () => {
    assert.equal(formatHomeMarketCap(11312549, "KR"), "1,131.3조 원");
    assert.equal(formatHomeMarketCap(5115300000000, "US"), "$5,115.3B");
    assert.equal(formatHomeMarketCap(NaN, "KR"), "—");
    assert.equal(formatHomeMarketCap(71, "KR"), "71억 원");
    assert.equal(formatHomeMarketCap(73283984, "US"), "$73.3M");
});

test("홈에서 고른 시장·조건·정렬을 발굴 URL과 공개 미리보기에서 동일하게 해석한다", () => {
    for (const country of ["KR", "US"] as const) {
        for (const filter of ["large_cap", "per10", "low_pbr", "ncav"] as const) {
            const params = new URL(homeResultsHref(filter, country), "https://idiotquant.local").searchParams;
            assert.equal(params.get("country"), country);
            assert.equal(params.get("from"), "preview");
            assert.equal(homeFilterFromParams(params), filter);
            assert.equal(params.get("order"), filter === "large_cap" || filter === "ncav" ? "desc" : "asc");
        }
    }
    assert.equal(homeFilterFromParams(new URLSearchParams()), "large_cap");
    assert.equal(homeFilterFromParams(new URLSearchParams("strategies=ncav&maxper=10")), "ncav");
});

test("발굴 더 보기의 첫 5개는 홈과 같고 같은 기준의 다음 5개로 이어진다", () => {
    const list = Array.from({length: 15}, (_, i) => stock(String(i), i / 2 + 1, .01 * (i + 1), 20 - i, 1000 - i));
    const home = buildHomeStockPreview(list, list.length, "20261108");
    const discovery = buildHomeStockPreview(list, list.length, "20261108", 10);
    for (const filter of ["large_cap", "per10", "low_pbr", "ncav"] as const) {
        assert.equal(discovery.groups[filter].length, 10);
        assert.deepEqual(discovery.groups[filter].slice(0, 5), home.groups[filter]);
        assert.equal(discovery.counts[filter], home.counts[filter]);
    }
});
