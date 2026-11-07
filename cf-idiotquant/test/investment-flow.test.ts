import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analysisHref, comparisonHref, completeWatchRequest, matchesWatchStock, readPendingWatch, screenerReturnPath, toggleComparisonSelection } from '@/lib/investmentFlow';

test('발굴 조건은 분석과 로그인 복귀 주소에서 보존한다', () => {
    const source = '/screener?country=US&strategies=ncav&filter=liked&q=A%26B';
    const href = analysisHref('AAPL', source);
    const analysis = new URL(href, 'https://idiotquant.local');
    assert.equal(analysis.searchParams.get('returnTo'), source);
    const login = new URL(`/login?callbackUrl=${encodeURIComponent(href)}`, 'https://idiotquant.local');
    assert.equal(login.searchParams.get('callbackUrl'), href);
    assert.equal(analysis.searchParams.get('ticker'), 'AAPL');
    for (const invalid of ['https://example.com', '//example.com/screener', '/screener-elsewhere', '/profile']) {
        assert.equal(screenerReturnPath(invalid), null);
        assert.equal(new URL(analysisHref('AAPL', invalid), 'https://idiotquant.local').searchParams.has('returnTo'), false);
    }
});

test('관심 저장 복귀는 같은 종목의 최근 명시적 요청만 허용한다', () => {
    const now = 1_800_000_000_000;
    const stock = { ticker: '060850', name: '영림원소프트랩', isUs: false };
    const raw = JSON.stringify({ ...stock, createdAt: now - 1000 });
    assert.deepEqual(readPendingWatch(raw, stock.ticker, now), stock);
    assert.equal(readPendingWatch(raw, 'AAPL', now), null);
    assert.equal(readPendingWatch(raw, stock.ticker, now + 31 * 60_000), null);
    assert.equal(readPendingWatch(raw, stock.ticker, now - 2000), null);
    assert.equal(readPendingWatch('broken', stock.ticker, now), null);
    assert.equal(readPendingWatch(JSON.stringify(stock), stock.ticker, now), null);
});

test('기존 관심종목은 코드·이름으로 확인하고 국가가 다른 종목은 구분한다', () => {
    const stock = { ticker: '005930', name: '삼성전자', isUs: false };
    assert.equal(matchesWatchStock({ ticker: '005930', is_us: 0 }, stock), true);
    assert.equal(matchesWatchStock({ ticker: '삼성전자', is_us: 0 }, stock), true);
    assert.equal(matchesWatchStock({ ticker: 'old', stock_name: '삼성전자', is_us: 0 }, stock), true);
    assert.equal(matchesWatchStock({ ticker: '005930', is_us: 1 }, stock), false);
    assert.equal(matchesWatchStock({ ticker: 'aapl', is_us: 1 }, { ticker: 'AAPL', name: 'Apple', isUs: true }), true);
});

test('선택 비교는 한도를 지키고 해제 후 다른 종목을 추가할 수 있다', () => {
    let selected = ['AAPL', 'MSFT'];
    selected = toggleComparisonSelection(selected, 'NVDA', 2);
    assert.deepEqual(selected, ['AAPL', 'MSFT']);
    selected = toggleComparisonSelection(selected, 'AAPL', 2);
    selected = toggleComparisonSelection(selected, 'NVDA', 2);
    assert.deepEqual(selected, ['MSFT', 'NVDA']);
    const url = new URL(comparisonHref('US', [...selected, 'MSFT'], '2026-11-08'), 'https://idiotquant.local');
    assert.equal(url.searchParams.get('date'), '20261108');
    assert.equal(url.searchParams.get('tickers'), 'MSFT,NVDA');
    assert.equal(url.searchParams.get('country'), 'US');
});

test('로그인 복귀 저장은 이미 담긴 종목을 토글하지 않는다', async () => {
    const calls: string[] = [];
    await completeWatchRequest({ ticker: '005930', name: '삼성전자', isUs: false },
        async () => [{ ticker: '삼성전자', is_us: 0 }], () => { calls.push('consume'); },
        async () => { calls.push('toggle'); });
    assert.deepEqual(calls, ['consume']);
});

test('저장 조회 실패는 의도를 남기고, 토글 실패는 자동 재실행하지 않도록 먼저 소비한다', async () => {
    const stock = { ticker: 'AAPL', name: 'Apple', isUs: true };
    const calls: string[] = [];
    await assert.rejects(() => completeWatchRequest(stock, async () => { throw new Error('load'); },
        () => { calls.push('consume'); }, async () => { calls.push('toggle'); }));
    assert.equal(calls.length, 0);
    await assert.rejects(() => completeWatchRequest(stock, async () => [],
        () => { calls.push('consume'); }, async () => { calls.push('toggle'); throw new Error('save'); }));
    assert.deepEqual(calls, ['consume', 'toggle']);
});
