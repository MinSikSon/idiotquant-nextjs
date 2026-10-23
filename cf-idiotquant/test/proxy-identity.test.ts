import assert from 'node:assert/strict';
import test from 'node:test';
import { jwtVerify } from 'jose';
import { createBackendHeaders, ProxyIdentityError } from '../lib/server/proxyIdentity.ts';

test('익명 요청에서 위조 신원·인증 헤더와 쿠키를 제거한다', async () => {
    const headers = await createBackendHeaders(new Headers({
        'X-User-Id': 'admin', 'X-User-Role': 'admin', Authorization: 'Bearer forged',
        Cookie: 'session=private', count: '10',
    }), null, undefined);
    for (const key of ['x-user-id', 'x-user-role', 'authorization', 'cookie']) assert.equal(headers.has(key), false);
    assert.equal(headers.get('count'), '10');
});

test('검증된 세션으로만 서명하고 서명 키 누락 시 요청을 차단한다', async () => {
    const secret = 'test-only-secret-long-enough-for-hmac';
    const headers = await createBackendHeaders(new Headers({ Authorization: 'Bearer forged' }), { id: 'verified', role: 'user' }, secret);
    const { payload } = await jwtVerify(headers.get('authorization')!.slice(7), new TextEncoder().encode(secret));
    assert.equal(payload.userId, 'verified');
    assert.equal(payload.role, 'user');
    assert.ok(payload.exp! - payload.iat! <= 60);
    await assert.rejects(createBackendHeaders(new Headers(), { id: 'verified' }, undefined), (error: unknown) =>
        error instanceof ProxyIdentityError && error.status === 503);
    await assert.rejects(createBackendHeaders(new Headers(), {}, secret), (error: unknown) =>
        error instanceof ProxyIdentityError && error.status === 401);
});
