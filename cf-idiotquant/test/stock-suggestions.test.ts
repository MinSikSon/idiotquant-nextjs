import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStockSearchIndex, findStockSuggestions } from "@/lib/utils/stockSuggestions";

test("자동완성은 완성형·초성·조합 중 한글과 영문 대소문자 검색을 유지한다", () => {
    const index = buildStockSearchIndex(["삼성전자우", "삼성전자", "삼성물산", "AAPL", "AAP"]);
    assert.deepEqual(findStockSuggestions(index, "삼성전자"), ["삼성전자", "삼성전자우"]);
    assert.deepEqual(findStockSuggestions(index, "ㅅㅅㅈㅈ"), ["삼성전자", "삼성전자우"]);
    assert.deepEqual(findStockSuggestions(index, "삼성전ㅈ"), ["삼성전자", "삼성전자우"]);
    assert.deepEqual(findStockSuggestions(index, " aapl "), ["AAPL"]);
    assert.deepEqual(findStockSuggestions(index, "  "), []);
    assert.deepEqual(findStockSuggestions(index, "없는종목"), []);
});

test("회사명 정확 일치를 우선해 이름에 해당 기업을 포함한 ETF와 구분한다", () => {
    const index = buildStockSearchIndex([], [
        { symbol: "CW", name: "COREWEAVE DAILY LEVERAGED ETF", koreanName: "코어위브 레버리지 ETF" },
        { symbol: "CRWV", name: "COREWEAVE INC", koreanName: "코어위브" },
        { symbol: "NVD", name: "DAILY NVIDIA ETF", koreanName: "엔비디아 인버스 ETF" },
        { symbol: "NVDA", name: "NVIDIA CORP", koreanName: "엔비디아" },
    ]);
    assert.equal(findStockSuggestions(index, "코어위브")[0], "CRWV");
    assert.equal(findStockSuggestions(index, "coreweave")[0], "CRWV");
    assert.equal(findStockSuggestions(index, "엔비디아")[0], "NVDA");
    assert.equal(findStockSuggestions(index, "NVDA")[0], "NVDA");
});

test("자동완성은 정확 일치·접두어·길이 순위를 유지하고 원본 목록을 변경하지 않는다", () => {
    const names = ["한국삼성", "삼성전자", "삼성", "ABC", "XAB", "ABCD", "AB"];
    const index = buildStockSearchIndex(names);
    assert.deepEqual(findStockSuggestions(index, "삼성"), ["삼성", "삼성전자", "한국삼성"]);
    assert.deepEqual(findStockSuggestions(index, "ab"), ["AB", "ABC", "ABCD", "XAB"]);
    assert.deepEqual(names, ["한국삼성", "삼성전자", "삼성", "ABC", "XAB", "ABCD", "AB"]);
    assert.equal(findStockSuggestions(buildStockSearchIndex(Array.from({ length: 20 }, (_, i) => `ABC${i}`)), "abc").length, 10);
});

test("미국 종목의 영문·한글 회사명과 초성으로 검색해도 선택값은 티커다", () => {
    const stocks = [
        { symbol: "CRWV", name: "COREWEAVE INC", koreanName: "코어위브" },
        { symbol: "AAPL", name: "APPLE INC", koreanName: "애플" },
        { symbol: "GOOG", name: "ALPHABET INC", koreanName: "알파벳 C" },
        { symbol: "GOOGL", name: "ALPHABET INC", koreanName: "알파벳 A" },
    ];
    const index = buildStockSearchIndex(["삼성전자", "CRWV", "AAPL", "AAPL"], stocks);
    for (const query of ["coreweave", "COREWEAVE INC", "코어위브", "ㅋㅇㅇㅂ", "crwv"]) {
        assert.deepEqual(findStockSuggestions(index, query), ["CRWV"]);
    }
    assert.deepEqual(findStockSuggestions(index, "애플"), ["AAPL"]);
    assert.deepEqual(findStockSuggestions(index, "apple"), ["AAPL"]);
    assert.deepEqual(findStockSuggestions(index, "aapl"), ["AAPL"]);
    assert.deepEqual(findStockSuggestions(index, "알파벳"), ["GOOG", "GOOGL"]);
    assert.deepEqual(findStockSuggestions(index, "삼성전자"), ["삼성전자"]);
});
