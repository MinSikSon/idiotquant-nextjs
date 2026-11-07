import { test } from "node:test";
import assert from "node:assert/strict";
import { homeStockPreview, LARGE_CAP_EXAMPLES } from "@/lib/utils/homeStockPreview";

const stock = (ticker: string, per: number, pbr: number, ncav_ratio: number, market_cap = 100) => ({ ticker, per, pbr, ncav_ratio, market_cap });
const list = [stock("small", 9, 0.2, 1.2, 10), stock("large", 20, 0.49, 0.5, 1000), stock("growth", 30, 0.1, 2, 2000), stock("loss", -1, 0.1, 3), stock("zero", 0, 0, 0), stock("boundary", 10, 0.5, 1)];

test("홈 조건은 공개 PER 미리보기 안에서만 적용하고 시총 큰 순으로 보여준다", () => {
    assert.deepEqual(homeStockPreview(list, "per20").map(s => s.ticker), ["large", "boundary", "small"]);
    assert.deepEqual(homeStockPreview(list, "per10").map(s => s.ticker), ["boundary", "small"]);
    assert.deepEqual(homeStockPreview(list, "low_pbr").map(s => s.ticker), ["large", "small"]);
    assert.deepEqual(homeStockPreview(list, "ncav").map(s => s.ticker), ["boundary", "small"]);
    assert.equal(list[0].ticker, "small", "공유 목록 순서를 변경하지 않는다");
});

test("미리보기는 최대 5개이며 빈 결과와 무효 지표를 처리한다", () => {
    assert.equal(homeStockPreview(Array.from({length: 10}, (_, i) => stock(String(i), 5, .1, 1)), "per20").length, 5);
    assert.deepEqual(homeStockPreview([], "ncav"), []);
    for (const value of [NaN, Infinity, -Infinity]) {
        assert.deepEqual(homeStockPreview([stock("invalid", value, .1, 1)], "per20"), []);
        assert.deepEqual(homeStockPreview([stock("invalid", 5, value, 1)], "low_pbr"), []);
        assert.deepEqual(homeStockPreview([stock("invalid", 5, .1, value)], "ncav"), []);
    }
});

test("국내·미국 대형주 예시는 중복 없는 분석용 종목 코드만 제공한다", () => {
    for (const [market, examples] of Object.entries(LARGE_CAP_EXAMPLES)) {
        assert.equal(examples.length, 5);
        assert.equal(new Set(examples.map(s => s.ticker)).size, 5);
        for (const item of examples) {
            assert.match(item.ticker, market === "KR" ? /^\d{6}$/ : /^[A-Z]+$/);
            assert.ok(item.name.length > 0);
        }
    }
});
