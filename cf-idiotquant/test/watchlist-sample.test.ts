import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../lib/features/stockLikes/sample.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(respond: (url: string) => unknown) {
    const requests: string[] = [];
    const output = { exports: {} as { getWatchlistSample: () => Promise<any> } };
    runInNewContext(source, { exports: output.exports, module: output, require(name: string) {
        if (name.endsWith('/apiRequest')) return { apiRequest: async (url: string) => { requests.push(url); return respond(url); } };
        throw new Error(name);
    } });
    return { get: output.exports.getWatchlistSample, requests };
}

const row = (ticker: string, date: string, price: number) => ({ ticker, name: `종목 ${ticker}`, scan_date: date, last_price: price, per: 10, pbr: 1, ncav_ratio: null, strategies: ['low_per'], eps: 10, bps: 100, current_assets: 200, total_liabilities: 50, lstn_stcn: 1000000 });

test('두 종목의 최신 스캔과 평가에 필요한 실제 재무 수치를 조회한다', async () => {
    const h = load(url => {
        const ticker = url.includes('005930') ? '005930' : '000660';
        return { success: true, data: [row(ticker, '2026-11-08', 100), row(ticker, '20261111', 110)] };
    });
    const data = await h.get();
    assert.equal(h.requests.length, 2);
    assert.ok(h.requests.every(url => url.startsWith('/scan/daily/ticker/') && url.endsWith('?limit=1')));
    assert.equal(data.items.length, 2);
    assert.equal(data.items[0].scan_date, '20261111');
    assert.equal(data.items[0].last_price, 110);
    assert.equal(data.items[0].eps, 10);
    assert.equal(data.items[0].bps, 100);
    assert.equal(data.items[0].current_assets, 200);
    assert.equal(data.items[0].total_liabilities, 50);
    assert.equal(data.items[0].lstn_stcn, 1000000);
});

test('부분 실패 시 조회된 종목만 반환한다', async () => {
    const h = load(url => url.includes('005930')
        ? { success: true, data: [row('005930', '20261111', 110)] }
        : { success: false, error: '조회 실패' });
    const data = await h.get();
    assert.equal(data.items.length, 1);
    assert.equal(data.failed, 1);
});

test('종목·날짜가 잘못된 데이터와 빈 응답을 가상값으로 대체하지 않는다', async () => {
    const h = load(() => ({ success: true, data: [row('OTHER', '20261111', 100), row('005930', 'bad-date', 100)] }));
    const data = await h.get();
    assert.equal(data.items.length, 0);
});


test('누락되거나 유효하지 않은 재무 수치는 0으로 바꾸지 않는다', async () => {
    const h = load(url => ({ success: true, data: [{ ticker: url.includes('005930') ? '005930' : '000660', scan_date: '20261111', eps: Infinity, bps: null }] }));
    const data = await h.get();
    for (const item of data.items) {
        assert.equal(item.eps, null);
        assert.equal(item.bps, null);
        assert.equal(item.current_assets, null);
        assert.equal(item.total_liabilities, null);
        assert.equal(item.lstn_stcn, null);
    }
});
