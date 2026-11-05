import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTradingAccountToken } from '../lib/features/algorithmTrade/tradingAccountAPI.ts';

test('선택한 국가/계정에 저장된 토큰 확인만 요청한다', async t => {
    t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
        assert.equal(url, '/api/proxy/trading/account?country=US&kakao-id=user%26other%3D1');
        assert.equal(options.method, 'PATCH');
        assert.equal(options.body, undefined);
        return Response.json({ success: true, data: { valid: true, message: '인증 성공', checked_at: '2026-11-05T00:00:00Z' } });
    });
    const result = await checkTradingAccountToken('US', 'user&other=1');
    assert.equal(result.valid, true);
    assert.equal(result.checked_at, '2026-11-05T00:00:00Z');
});

for (const payload of [
    { success: false, error: '관리자 권한이 필요합니다.' },
    { success: true },
    { success: true, data: { message: '상태 누락' } },
]) {
    test(`실패 또는 잘못된 응답을 유효한 토큰으로 표시하지 않는다: ${JSON.stringify(payload)}`, async t => {
        t.mock.method(globalThis, 'fetch', async () => Response.json(payload));
        assert.equal((await checkTradingAccountToken('KR', 'user')).valid, null);
    });
}

test('네트워크 실패는 확인 불가로 반환한다', async t => {
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
    const result = await checkTradingAccountToken('KR', 'user');
    assert.equal(result.valid, null);
    assert.match(result.message, /네트워크/);
});
