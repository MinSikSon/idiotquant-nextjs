import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isNonEquityName, isValuationEligible } from '@/lib/utils/stockValuationEligibility';
import nonEquitySymbols from '@/public/data/usStockSymbols/non_equity_symbols.json' with { type: 'json' };
import { buildHomeStockPreview } from '@/lib/utils/homeStockPreview';
import { applyFilters } from '@/app/(screener)/screener/filters';

const common = { country: 'US' as const, ticker: 'DOW', name: 'DOW INC', last_price: 10, market_cap: 100, ncav_ratio: 2, bps: 30, per: 5, pbr: .33, scan_date: '20261108' };

test('메타데이터에서 확인된 워런트는 이름이 티커뿐이어도 제외한다', () => {
    for (const ticker of ['AUROW', 'SLDPW', 'SABSW']) {
        assert.equal(isValuationEligible({ ...common, ticker, name: ticker }), false);
    }
    for (const name of ['Aurora C/WTS 03/11/2026', '솔리드 파워 콜 워런트', 'ACME WARRANTS', 'ACME ETF', 'ACME RIGHTS', 'ACME UNIT 1 SHARE & 1 WARRANT']) {
        assert.equal(isNonEquityName(name), true, name);
    }
});

test('보통주는 티커 접미사나 회사명 일부만으로 제외하지 않는다', () => {
    for (const ticker of ['DOW', 'SNOW', 'CW', 'UNIT']) {
        assert.equal(isValuationEligible({ ...common, ticker, name: ticker }), true, ticker);
    }
    assert.equal(isNonEquityName('UNITI GROUP INC'), false);
    assert.equal(isNonEquityName('UNITED AIRLINES HOLDINGS INC'), false);
    assert.equal(isNonEquityName('ACME WARRANTY SERVICES'), false);
});

test('생성한 제외 목록은 거래소 원본 분류와 일치한다', () => {
    const names = ['nasdaq', 'nyse', 'amex'].flatMap(market => JSON.parse(readFileSync(new URL(`../public/data/usStockSymbols/${market}_full_tickers.json`, import.meta.url), 'utf8')));
    const expected = [...new Set<string>(names.filter(item => isNonEquityName(`${item.name} ${item.koreanName ?? ''}`)).map(item => item.symbol.trim().toUpperCase()))].sort();
    assert.deepEqual(nonEquitySymbols, expected);
});

test('가격·시총·NCAV 계산이 유효하지 않으면 제외한다', () => {
    for (const last_price of [0, -1, NaN, Infinity, null]) assert.equal(isValuationEligible({ ...common, last_price }), false);
    for (const market_cap of [0, -1, NaN, Infinity, null]) assert.equal(isValuationEligible({ ...common, market_cap }), false);
    assert.equal(isValuationEligible({ ...common, current_assets: 250, total_liabilities: 50 }), true);
    assert.equal(isValuationEligible({ ...common, current_assets: 250, total_liabilities: 50, ncav_ratio: 2000 }), false);
    assert.equal(isValuationEligible({ ...common, current_assets: 200, total_liabilities: 50, market_cap: 77, ncav_ratio: 1.94805 }), true, '저장 반올림 허용');
});

test('NCAV 후보의 순유동자산과 장부가치 기준이 불일치하면 제외한다', () => {
    assert.equal(isValuationEligible({ ...common, ticker: 'UPC', ncav_ratio: 5766.09461, last_price: 1.4, bps: 98.78 }), false);
    assert.equal(isValuationEligible({ ...common, ticker: 'ENLV', ncav_ratio: 694.43885, last_price: 1.27, bps: 231.6 }), false);
    assert.equal(isValuationEligible({ ...common, ncav_ratio: 1000, last_price: .01, bps: 20 }), true, '큰 비율 자체는 제외 사유가 아니다');
    assert.equal(isValuationEligible({ ...common, ncav_ratio: 2, bps: 19.999 }), true, 'BPS 반올림 허용');
});

test('홈 결과·조건 개수와 발굴 기본 목록에 같은 제외 기준을 적용한다', () => {
    const list = [common, { ...common, ticker: 'AUROW', name: 'AUROW', ncav_ratio: 196051 }, { ...common, ticker: 'UPC', ncav_ratio: 5766.09461, last_price: 1.4, bps: 98.78 }];
    const home = buildHomeStockPreview(list, 3, '20261108');
    assert.deepEqual(home.groups.ncav.map(item => item.ticker), ['DOW']);
    assert.equal(home.counts.ncav, 1);
    const filters = { country: 'US' as const, strategies: new Set<string>(), mode: 'OR' as const, q: '', excludeHoldings: false, excludeDeficit: false, excludePreferred: false, excludeAdr: false, excludeHalted: false, excludeManaged: false, excludeDelisting: false, sectors: new Set<string>(), markets: new Set<string>(), maxW52Pos: 0, minTrAmt: 0, minMarketCap: 0, maxPbr: 0, maxPer: 0, minRoe: 0, minNcav: 0 };
    assert.deepEqual(applyFilters(list, filters).map(item => item.ticker), ['DOW']);
});
