import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GET } from '../app/(api)/api/public/home-quote/route.ts';

const request = (country: string, ticker: string, cookie?: string) => new Request(
    `http://localhost/api/public/home-quote?${new URLSearchParams({ country, ticker })}`,
    { headers: cookie ? { Cookie: cookie } : undefined },
);

test('비로그인 홈 시세는 방문자 간 공유하고 실패한 응답은 캐시하지 않는다', async t => {
    const previousBase = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = 'https://quote.example/';
    t.after(() => {
        if (previousBase === undefined) delete process.env.NEXT_PUBLIC_API_URL;
        else process.env.NEXT_PUBLIC_API_URL = previousBase;
    });

    let shouldFail = true;
    const upstream = t.mock.method(globalThis, 'fetch', async (input: URL | string, init: RequestInit) => {
        const url = new URL(input);
        assert.equal(url.origin, 'https://quote.example');
        assert.equal(init.headers, undefined);
        const ticker = url.searchParams.get('PDNO');
        if (ticker === '005930') {
            assert.equal(url.pathname, '/uapi/domestic-stock/v1/quotations/inquire-price');
            return Response.json({ rt_cd: '0', output: { stck_prpr: '180900', unused: 'private-field' } });
        }
        assert.equal(url.pathname, '/uapi/overseas-price/v1/quotations/price-detail');
        assert.equal(ticker, 'AAPL');
        return Response.json(shouldFail ? { rt_cd: '1' } : { rt_cd: '0', output1: { last: '342.5600' } });
    });

    const invalid = await GET(request('US', '../invalid'));
    assert.equal(invalid.status, 400);
    assert.equal(invalid.headers.get('cache-control'), 'no-store');

    const visitors = await Promise.all([GET(request('KR', '005930', 'one=1')), GET(request('KR', '005930', 'two=2'))]);
    visitors.push(await GET(request('KR', '005930')));
    assert.equal(upstream.mock.callCount(), 1);
    for (const response of visitors) {
        assert.equal(response.status, 200);
        assert.match(response.headers.get('cache-control') ?? '', /^public, max-age=0, s-maxage=4[0-5]$/);
        assert.deepEqual(await response.json(), { price: 180900 });
    }

    const failed = await GET(request('US', 'AAPL'));
    assert.equal(failed.status, 502);
    assert.equal(failed.headers.get('cache-control'), 'no-store');
    shouldFail = false;
    assert.deepEqual(await (await GET(request('US', 'AAPL'))).json(), { price: 342.56 });
    assert.equal(upstream.mock.callCount(), 3);
});
