import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesWatchlistMarket, watchlistExchange } from '../lib/features/stockLikes/markets.ts';

test('관심 종목을 국가와 거래소별로 구분한다', () => {
    const kosdaq = { is_us: 0, market: '코스닥' };
    const nasdaq = { is_us: 1, market: ' NASD ' };
    assert.equal(matchesWatchlistMarket(kosdaq, 'all'), true);
    assert.equal(matchesWatchlistMarket(kosdaq, 'KR'), true);
    assert.equal(matchesWatchlistMarket(kosdaq, 'US'), false);
    assert.equal(matchesWatchlistMarket(kosdaq, 'KOSDAQ'), true);
    assert.equal(matchesWatchlistMarket(kosdaq, 'KOSPI'), false);
    assert.equal(matchesWatchlistMarket(nasdaq, 'US'), true);
    assert.equal(matchesWatchlistMarket(nasdaq, 'NASDAQ'), true);
    assert.equal(matchesWatchlistMarket(nasdaq, 'KR'), false);
    assert.equal(watchlistExchange({ is_us: 0, market: '유가증권시장' }), 'KOSPI');
    assert.equal(watchlistExchange({ is_us: 0, market: 'konex' }), 'KONEX');
    assert.equal(watchlistExchange({ is_us: 1, market: 'NYS' }), 'NYSE');
    assert.equal(watchlistExchange({ is_us: 1, market: 'NYSE American' }), 'AMEX');
});

test('거래소 결측·모호한 값은 추측하지 않고 국가 및 미분류 필터에 남긴다', () => {
    for (const market of [undefined, null, '', 'NYSE/NASDAQ', 'OTC']) {
        const item = { is_us: 1, market };
        assert.equal(matchesWatchlistMarket(item, 'all'), true);
        assert.equal(matchesWatchlistMarket(item, 'US'), true);
        assert.equal(matchesWatchlistMarket(item, 'unknown'), true);
        assert.equal(matchesWatchlistMarket(item, 'NASDAQ'), false);
        assert.equal(matchesWatchlistMarket(item, 'NYSE'), false);
    }
    assert.equal(matchesWatchlistMarket({ is_us: 0, market: null }, 'KR'), true);
    assert.equal(watchlistExchange({ is_us: 0, market: 'NASDAQ' }), 'unknown');
});
