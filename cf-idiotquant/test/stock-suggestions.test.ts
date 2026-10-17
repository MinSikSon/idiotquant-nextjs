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

test("자동완성은 정확 일치·접두어·길이 순위를 유지하고 원본 목록을 변경하지 않는다", () => {
    const names = ["한국삼성", "삼성전자", "삼성", "ABC", "XAB", "ABCD", "AB"];
    const index = buildStockSearchIndex(names);
    assert.deepEqual(findStockSuggestions(index, "삼성"), ["삼성", "삼성전자", "한국삼성"]);
    assert.deepEqual(findStockSuggestions(index, "ab"), ["AB", "ABC", "ABCD", "XAB"]);
    assert.deepEqual(names, ["한국삼성", "삼성전자", "삼성", "ABC", "XAB", "ABCD", "AB"]);
    assert.equal(findStockSuggestions(buildStockSearchIndex(Array.from({ length: 20 }, (_, i) => `ABC${i}`)), "abc").length, 10);
});
