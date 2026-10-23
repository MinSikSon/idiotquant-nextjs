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

test('검증된 세션으로만 서명하고 잘못된 세션은 차단한다', async () => {
    const secret = 'test-only-secret-long-enough-for-hmac';
    const headers = await createBackendHeaders(new Headers({ Authorization: 'Bearer forged' }), { id: 'verified', role: 'user' }, secret);
    const { payload } = await jwtVerify(headers.get('authorization')!.slice(7), new TextEncoder().encode(secret));
    assert.equal(payload.userId, 'verified');
    assert.equal(payload.role, 'user');
    assert.ok(payload.exp! - payload.iat! <= 60);
    await assert.rejects(createBackendHeaders(new Headers(), {}, secret), (error: unknown) =>
        error instanceof ProxyIdentityError && error.status === 401);
});


test('키가 없는 기존 배포에서는 검증된 세션 신원만 전달하고 위조 헤더를 덮어쓴다', async () => {
    const headers = await createBackendHeaders(new Headers({
        'X-User-Id': 'attacker', 'X-User-Role': 'admin',
        Authorization: 'Bearer forged', Cookie: 'session=private',
    }), { id: 'verified', role: 'user' }, undefined);
    assert.equal(headers.get('x-user-id'), 'verified');
    assert.equal(headers.get('x-user-role'), 'user');
    assert.equal(headers.has('authorization'), false);
    assert.equal(headers.has('cookie'), false);
    const defaultRole = await createBackendHeaders(new Headers(), { id: 'verified' }, undefined);
    assert.equal(defaultRole.get('x-user-role'), 'user');
    await assert.rejects(createBackendHeaders(new Headers(), {}, undefined), (error: unknown) =>
        error instanceof ProxyIdentityError && error.status === 401);
});
