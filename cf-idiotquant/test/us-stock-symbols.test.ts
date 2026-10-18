import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildStockSearchIndex, findStockSuggestions } from '../lib/utils/stockSuggestions.ts';
import { isUsTicker } from '../lib/utils/stockSearchInput.ts';

function readSymbols(market: string, full = false) {
    return JSON.parse(readFileSync(new URL(`../public/data/usStockSymbols/${market}_${full ? 'full_' : ''}tickers.json`, import.meta.url), 'utf8'));
}

test('CRWV 등 누락되었던 미국 종목을 소문자로 입력해도 자동완성에 표시한다', () => {
    for (const [market, symbols] of [
        ['nasdaq', ['CRWV', 'AAPL']],
        ['nyse', ['CRCL', 'FIG', 'BRK/B']],
        ['amex', ['VOO', 'SPY']],
    ] as const) {
        const index = buildStockSearchIndex(readSymbols(market));
        for (const symbol of symbols) {
            assert.equal(findStockSuggestions(index, symbol.toLowerCase())[0], symbol);
        }
    }
});

test('검색과 관리 화면의 미국 티커·종목명 목록은 일치하고 중복이 없다', () => {
    const all = new Set<string>();
    for (const market of ['nasdaq', 'nyse', 'amex']) {
        const symbols: string[] = readSymbols(market);
        const full: { symbol: string; name: string }[] = readSymbols(market, true);
        assert.deepEqual(full.map(item => item.symbol), symbols);
        for (const item of full) {
            assert.ok(item.name.trim());
            assert.ok(isUsTicker(item.symbol), `검색에서 허용하지 않는 티커: ${item.symbol}`);
            assert.equal(all.has(item.symbol), false, `중복 티커: ${item.symbol}`);
            all.add(item.symbol);
        }
    }
});

test('공식 한글·영문 종목명 검색은 실제 티커로 연결된다', () => {
    const stocks = ['nasdaq', 'nyse', 'amex'].flatMap(market => readSymbols(market, true));
    const index = buildStockSearchIndex([], stocks);
    for (const [query, symbol] of [
        ['코어위브', 'CRWV'], ['coreweave', 'CRWV'], ['애플', 'AAPL'],
        ['엔비디아', 'NVDA'], ['버크셔 해서웨이 B', 'BRK/B'],
    ]) {
        assert.equal(findStockSuggestions(index, query)[0], symbol);
    }
});
