import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { discoverLogo, handleLogoRequest, isPublicIpv4, isPublicIpv6, logoCandidates, publicWebsite, readLimited } from '../lib/server/stockLogo.ts';

const SERVER = 'https://kr-logo-api.tofu89223.workers.dev';
const ORIGIN = 'https://idiotquant.com';
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOZkAAAAASUVORK5CYII=';
const pngBytes = Uint8Array.from(atob(PNG), c => c.charCodeAt(0));
const admin = { role: 'admin' };
const placeholder = readFileSync(new URL('./fixtures/stock-logo-placeholder.svg', import.meta.url), 'utf8');

function request(method: string, body?: object, origin = ORIGIN) {
    return new Request(`${ORIGIN}/api/admin/stock-logo?ticker=100030`, {
        method, headers: { Origin: origin, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

test('관리자 권한과 동일 출처를 검사한 뒤에만 서버를 호출한다', async t => {
    const calls = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch'); });
    for (const user of [undefined, { role: 'user' }]) {
        assert.equal((await handleLogoRequest(request('GET'), user, 'test-password')).status, 403);
        assert.equal((await handleLogoRequest(request('PUT', {}), user, 'test-password')).status, 403);
    }
    assert.equal((await handleLogoRequest(request('POST', {}, 'https://untrusted.com'), admin, 'test-password')).status, 403);
    assert.equal(calls.mock.callCount(), 0);
});

test('공개 홈페이지 URL과 DNS의 사설 주소를 검증한다', () => {
    for (const url of ['http://localhost/a', 'http://127.0.0.1', 'http://2130706433', 'http://[::1]',
        'file:///etc/passwd', 'https://a:b@company.com', 'https://company.com:8443', 'https://metadata.internal']) {
        assert.throws(() => publicWebsite(url));
    }
    assert.equal(publicWebsite('/logo.png', 'https://www.company.com/page').href, 'https://www.company.com/logo.png');
    for (const ip of ['0.1.2.3', '10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1',
        '192.168.1.1', '100.100.100.200', '198.19.0.1', '224.1.2.3', '256.1.1.1']) assert.equal(isPublicIpv4(ip), false, ip);
    assert.equal(isPublicIpv4('93.184.216.34'), true);
    for (const ip of ['::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1', '2002:7f00:1::1']) assert.equal(isPublicIpv6(ip), false, ip);
    assert.equal(isPublicIpv6('2606:4700:4700::1111'), true);
});

test('헤더 로고를 우선하고 상대 경로·HTML 엔티티·아이콘을 처리한다', () => {
    const candidates = logoCandidates(`
      <!-- <img class="logo" src="https://fake.com/logo.png"> -->
      <script>const s='<img class="logo" src="https://fake.com/script.png">';</script>
      <meta property="og:image" content="/banner.jpg">
      <link rel="shortcut icon" href="/favicon.png">
      <img class="logo" data-src="../brand.png?v=1&amp;x=2">
      <img alt="logo" src="http://127.0.0.1/private.png">
    `, 'https://www.company.com/about/');
    assert.deepEqual(candidates.map(url => url.href), [
        'https://www.company.com/brand.png?v=1&x=2', 'https://www.company.com/favicon.png',
        'https://www.company.com/banner.jpg', 'https://www.company.com/favicon.ico',
    ]);
});

test('서버 설정 누락·잘못된 본문·종목코드를 거절한다', async () => {
    assert.equal((await handleLogoRequest(request('POST', {}), admin, undefined)).status, 503);
    for (const body of [{ ticker: '../../admin', name: '기업', website: 'https://www.company.com' },
        { ticker: '100030', name: '', website: 'https://www.company.com' }, { ticker: '100030', name: '기업', website: 1 }]) {
        assert.equal((await handleLogoRequest(request('POST', body), admin, 'test-password')).status, 400);
    }
});

test('조회 오류와 로고 누락을 구분한다', async t => {
    let status = 404;
    t.mock.method(globalThis, 'fetch', async () => new Response('', { status }));
    assert.deepEqual(await (await handleLogoRequest(request('GET'), admin, undefined)).json(), { missing: true });
    status = 200;
    assert.deepEqual(await (await handleLogoRequest(request('GET'), admin, undefined)).json(), { missing: false });
    status = 503;
    assert.equal((await handleLogoRequest(request('GET'), admin, undefined)).status, 502);
});

test('200으로 반환되는 기본 클립보드 아이콘도 미등록으로 표시한다', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response(placeholder.replace(/\s+/g, ' '), {
        headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
    }));
    const response = await handleLogoRequest(request('GET'), admin, undefined);
    assert.deepEqual(await response.json(), { missing: true });
});

test('실제 SVG 로고는 미등록으로 오인하지 않는다', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h20v20z"/></svg>', {
        headers: { 'Content-Type': 'image/svg+xml' },
    }));
    assert.deepEqual(await (await handleLogoRequest(request('GET'), admin, undefined)).json(), { missing: false });
});

test('기본 클립보드 아이콘은 관리자가 수집한 로고로 등록할 수 있다', async t => {
    let uploaded = false;
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
        if (String(input).endsWith('/upload')) { uploaded = true; return Response.json({ success: true }); }
        return new Response(placeholder, { headers: { 'Content-Type': 'image/svg+xml' } });
    });
    const response = await handleLogoRequest(request('PUT', { ticker: '032280', name: '삼일', imageBase64: PNG }), admin, 'test-password');
    assert.equal(response.status, 200);
    assert.equal(uploaded, true);
});

test('홈페이지에서 찾은 이미지를 미리보기로만 반환한다', async t => {
    const urls: string[] = [];
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
        const url = String(input); urls.push(url);
        if (url.startsWith(SERVER)) return new Response('', { status: 404 });
        if (url.startsWith('https://cloudflare-dns.com/')) return Response.json({ Answer: [{ type: 1, data: '93.184.216.34' }] });
        if (url === 'https://www.company.com/') return new Response('<img alt="기업 로고" src="/logo.png">', { headers: { 'Content-Type': 'text/html' } });
        if (url === 'https://www.company.com/logo.png') return new Response(pngBytes, { headers: { 'Content-Type': 'image/png' } });
        throw new Error('Unexpected request');
    });
    const response = await handleLogoRequest(request('POST', { ticker: '100030', name: '인지소프트', website: 'https://www.company.com/' }), admin, 'test-password');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { dataUrl: `data:image/png;base64,${PNG}` });
    assert.equal(urls.some(url => url.endsWith('/upload')), false);
});

test('사설 주소 DNS·내부망 리디렉션을 가져오지 않는다', async t => {
    let mode = 'private';
    const urls: string[] = [];
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
        const url = String(input); urls.push(url);
        if (url.startsWith('https://cloudflare-dns.com/')) return Response.json({ Answer: [{ type: 1, data: mode === 'private' ? '10.0.0.1' : '93.184.216.34' }] });
        return new Response(null, { status: 302, headers: { Location: 'http://169.254.169.254/' } });
    });
    await assert.rejects(discoverLogo('https://www.company.com/'), /공개된/);
    assert.equal(urls.some(url => url === 'https://www.company.com/'), false);
    mode = 'redirect';
    await assert.rejects(discoverLogo('https://www.company.com/'), /공개된/);
    assert.equal(urls.some(url => url.includes('169.254')), false);
});

test('공개 IPv4와 사설 IPv6가 함께 있는 도메인도 거절한다', async t => {
    const urls: string[] = [];
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
        const url = String(input); urls.push(url);
        return Response.json({ Answer: [{ type: url.endsWith('AAAA') ? 28 : 1, data: url.endsWith('AAAA') ? 'fc00::1' : '93.184.216.34' }] });
    });
    await assert.rejects(discoverLogo('https://www.company.com/'), /공개된/);
    assert.equal(urls.some(url => url === 'https://www.company.com/'), false);
});

test('미리보기 이미지로 PNG를 저장하고 비밀번호·서버 응답을 노출하지 않는다', async t => {
    let uploaded: Record<string, unknown> | undefined;
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
        if (String(input).endsWith('/view/100030')) return new Response('', { status: 404 });
        assert.equal(String(input), `${SERVER}/upload`);
        uploaded = JSON.parse(String(init?.body));
        return new Response('private upstream response');
    });
    const response = await handleLogoRequest(request('PUT', { ticker: '100030', name: '인지소프트', imageBase64: PNG }), admin, 'test-password');
    assert.equal(response.status, 200);
    assert.deepEqual(uploaded, { bizNo: '100030', corpName: '인지소프트', format: 'png', imageBase64: PNG, adminPw: 'test-password' });
    assert.deepEqual(await response.json(), { success: true });
});

test('이미 등록된 종목을 덮어쓰지 않고 SVG 원본 저장을 거절한다', async t => {
    const calls = t.mock.method(globalThis, 'fetch', async () => new Response(pngBytes));
    const existing = await handleLogoRequest(request('PUT', { ticker: '100030', name: '인지소프트', imageBase64: PNG }), admin, 'test-password');
    assert.equal(existing.status, 409);
    assert.equal(calls.mock.callCount(), 1);
    const svg = btoa('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const invalid = await handleLogoRequest(request('PUT', { ticker: '100030', name: '인지소프트', imageBase64: svg }), admin, 'test-password');
    assert.equal(invalid.status, 400);
    assert.equal(calls.mock.callCount(), 1);
});

test('서버 응답의 비밀 정보를 오류 메시지에 포함하지 않는다', async t => {
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => String(input).endsWith('/upload')
        ? new Response('password=test-password', { status: 403 }) : new Response('', { status: 404 }));
    const response = await handleLogoRequest(request('PUT', { ticker: '100030', name: '인지소프트', imageBase64: PNG }), admin, 'test-password');
    assert.equal(response.status, 502);
    assert.equal((await response.text()).includes('test-password'), false);
});

test('헤더의 길이를 믿지 않고 스트림 크기를 제한한다', async () => {
    await assert.rejects(readLimited(new Response('oversized', { headers: { 'Content-Length': '1' } }), 4), /용량/);
});
