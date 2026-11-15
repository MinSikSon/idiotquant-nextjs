import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as changes from '../lib/features/stockLikes/changes.ts';

const source = ts.transpileModule(readFileSync(new URL('../lib/features/stockLikes/sample.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(respond: (url: string) => unknown) {
    const requests: string[] = [];
    const output = { exports: {} as { getWatchlistSample: () => Promise<any> } };
    runInNewContext(source, { exports: output.exports, module: output, require(name: string) {
        if (name.endsWith('/changes')) return changes;
        if (name.endsWith('/apiRequest')) return { apiRequest: async (url: string) => { requests.push(url); return respond(url); } };
        throw new Error(name);
    } });
    return { get: output.exports.getWatchlistSample, requests };
}

const row = (ticker: string, date: string, price: number) => ({ ticker, name: `종목 ${ticker}`, scan_date: date, last_price: price, per: 10, pbr: 1, ncav_ratio: null, strategies: ['low_per'] });

test('두 종목의 실제 최신·직전 스캔을 날짜순으로 매핑하고 조회만 수행한다', async () => {
    const h = load(url => {
        const ticker = url.includes('005930') ? '005930' : '000660';
        return { success: true, data: [row(ticker, '2026-11-08', 100), row(ticker, '20261111', 110)] };
    });
    const data = await h.get();
    assert.equal(h.requests.length, 2);
    assert.ok(h.requests.every(url => url.startsWith('/scan/daily/ticker/') && url.endsWith('?limit=2')));
    assert.equal(data.items.length, 2);
    assert.equal(data.items[0].scan_date, '20261111');
    assert.equal(data.items[0].last_price, 110);
    assert.equal(data.previous[0].scanDate, '20261108');
    assert.equal(data.previous[0].price, 100);
    const result = changes.watchChanges(data.previous, changes.watchSnapshot(data.items));
    assert.equal(result.length, 2);
    assert.ok(Math.abs(result[0].pricePercent! - 10) < 0.0001);
});

test('부분 실패·단일 스캔에서도 있는 데이터만 반환하며 비교값을 만들지 않는다', async () => {
    const h = load(url => url.includes('005930')
        ? { success: true, data: [row('005930', '20261111', 110)] }
        : { success: false, error: '조회 실패' });
    const data = await h.get();
    assert.equal(data.items.length, 1);
    assert.equal(data.previous.length, 0);
    assert.equal(data.failed, 1);
});

test('종목·날짜가 잘못된 데이터와 빈 응답을 가상값으로 대체하지 않는다', async () => {
    const h = load(() => ({ success: true, data: [row('OTHER', '20261111', 100), row('005930', 'bad-date', 100)] }));
    const data = await h.get();
    assert.equal(data.items.length, 0);
    assert.equal(data.previous.length, 0);
});
