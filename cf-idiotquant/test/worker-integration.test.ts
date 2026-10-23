import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { SignJWT } from 'jose';
import { createBackendHeaders } from '../lib/server/proxyIdentity.ts';
import { watchSnapshot, watchChanges } from '../lib/features/stockLikes/changes.ts';

// Worker 원본과 wrangler deploy --dry-run 번들이 주어지면 실제 workerd·로컬 D1에서 실행한다.
// 기본은 임시 키다. 로컬 키 확인 시에만 WORKER_TEST_SECRET_FILE을 명시한다. DB·브로커는 로컬 테스트 전용이다.
const workerRoot = process.env.WORKER_TEST_ROOT;
const bundle = process.env.WORKER_TEST_BUNDLE;
const localSecretFile = process.env.WORKER_TEST_SECRET_FILE;
if (process.env.WORKER_TEST_REQUIRED === '1' && (!workerRoot || !bundle)) {
    throw new Error('WORKER_TEST_ROOT와 WORKER_TEST_BUNDLE을 지정해 주세요. docs/service-improvements.md의 Worker 테스트 방법을 참고하세요.');
}

describe('프록시 JWT → Worker → 로컬 D1 통합', { skip: !workerRoot || !bundle, timeout: 60_000 }, () => {
    let runtime: any;
    let db: any;
    const secret = localSecretFile ? process.env.INTERNAL_JWT_SECRET ?? '' : randomBytes(32).toString('hex');
    const user = { id: 'integration-user', role: 'user' };
    const admin = { id: 'integration-admin', role: 'admin' };

    before(async () => {
        if (localSecretFile) {
            const workerEnv = parseEnv(readFileSync(localSecretFile, 'utf8')) as Record<string, string>;
            // assert.equal로 비교하면 실패 시 비밀값을 출력하므로 일치 여부만 검사한다.
            assert.ok(secret.length > 0 && workerEnv.INTERNAL_JWT_SECRET === secret, '프론트와 Worker의 로컬 내부 서명 키가 없거나 서로 다릅니다.');
        }
        const { Miniflare } = createRequire(join(workerRoot!, 'package.json'))('miniflare');
        runtime = new Miniflare({
            scriptPath: bundle, modules: true, modulesRoot: dirname(bundle!),
            modulesRules: [{ type: 'Text', include: ['**/*.sql'] }],
            compatibilityDate: '2024-11-11',
            bindings: { INTERNAL_JWT_SECRET: secret, ACCESS_CONTROL_ALLOW_ORIGIN: 'http://localhost:3000', SCHEDULED_ON: false },
            d1Databases: ['D1_IDIOTQUANT_MAIN'],
            kvNamespaces: ['IQ', 'IQ_TIMESTAMP', 'IQ_PURCHASE_LOG'],
        });
        db = await runtime.getD1Database('D1_IDIOTQUANT_MAIN');
        await db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, plan TEXT, name TEXT, can_search_account INTEGER);');
        for (const person of [user, admin, { id: 'integration-other', role: 'user' }]) {
            await db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').bind(person.id, person.role, 'free', person.id, 0).run();
        }
        const migrations = [
            '0004_stock_data_universal.sql', '0006_stock_likes.sql', '0013_stock_info.sql', '0014_risk_flags.sql',
            '0024_ledger_entries.sql', '0025_ledger_categories.sql', '0026_ledger_sharing.sql',
            '0027_ledger_category_refs.sql', '0028_ledger_entry_authors.sql', '0029_ledger_entry_position.sql',
        ];
        for (const name of migrations) {
            const sql = readFileSync(join(workerRoot!, 'migrations', name), 'utf8').replace(/--.*$/gm, '');
            for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await db.prepare(statement).run();
        }
    });
    after(async () => { await runtime?.dispose(); });

    async function request(path: string, person: typeof user | null = user, init: RequestInit = {}) {
        const headers = await createBackendHeaders(new Headers(init.headers), person, secret);
        return runtime.dispatchFetch(`http://worker.test${path}`, { ...init, headers });
    }

    test('익명 공개 페이지는 200, 가계부는 401로 응답한다', async () => {
        assert.equal((await request('/docs', null)).status, 200);
        const response = await request('/user/ledger?month=2026-10', null);
        assert.equal(response.status, 401);
        assert.equal((await response.json()).success, false);
    });

    test('프론트가 발급한 JWT로 가계부를 저장하고 읽는다', async () => {
        const saved = await request('/user/ledger', user, { method: 'POST', body: JSON.stringify({ entry_date: '2026-10-23', kind: 'income', category: 'salary', amount: 12345, memo: 'integration fixture' }) });
        assert.equal(saved.status, 200);
        assert.equal((await saved.json()).data.amount, 12345);
        const response = await request('/user/ledger?month=2026-10');
        assert.equal(response.status, 200);
        const rows = (await response.json()).data;
        assert.equal(rows.length, 1);
        assert.equal(rows[0].created_by, user.id);
    });

    test('관심종목 저장·조회 응답이 프론트 변화 비교 형식과 호환된다', async () => {
        await db.prepare('INSERT INTO stock_data_daily (ticker, name, scan_date, strategies, last_price, pbr, per, ncav_ratio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .bind('005930', '삼성전자', '20261023', '["ncav"]', 60000, 0.8, 8, 1.2).run();
        const added = await request('/user/likes', user, { method: 'POST', body: JSON.stringify({ ticker: '005930', stock_name: '삼성전자', is_us: false }) });
        assert.equal((await added.json()).liked, true);
        const response = await request('/user/likes');
        assert.equal(response.status, 200);
        const before = watchSnapshot((await response.json()).data);
        assert.equal(before[0].pbr, 0.8);
        await db.prepare('UPDATE stock_data_daily SET strategies = ?, last_price = ? WHERE ticker = ?').bind('["low_pbr"]', 66000, '005930').run();
        const after = watchSnapshot((await (await request('/user/likes')).json()).data);
        const [change] = watchChanges(before, after);
        assert.deepEqual(change.entered, ['low_pbr']);
        assert.deepEqual(change.exited, ['ncav']);
        assert.ok(Math.abs(change.pricePercent! - 10) < 1e-8);
    });

    test('직접 보낸 위조 신원 헤더만으로는 로그인하지 못한다', async () => {
        const response = await runtime.dispatchFetch('http://worker.test/user/ledger', { headers: { 'X-User-Id': user.id, 'X-User-Role': 'admin' } });
        assert.equal(response.status, 401);
    });

    test('다른 키·만료·변조된 JWT를 거절한다', async () => {
        const good = await createBackendHeaders(new Headers(), user, secret);
        const token = good.get('authorization')!.slice(7);
        const [header, , signature] = token.split('.');
        const forged = `${header}.${Buffer.from(JSON.stringify({ userId: admin.id, exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url')}.${signature}`;
        const wrong = await new SignJWT({ userId: user.id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1m').sign(new TextEncoder().encode('wrong-test-key'));
        const expired = await new SignJWT({ userId: user.id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(Math.floor(Date.now() / 1000) - 120).sign(new TextEncoder().encode(secret));
        for (const value of [forged, wrong, expired]) {
            assert.equal((await runtime.dispatchFetch('http://worker.test/user/ledger', { headers: { authorization: `Bearer ${value}` } })).status, 401);
        }
    });

    test('JWT의 관리자 주장보다 DB 권한을 우선한다', async () => {
        assert.equal((await request('/admin/usage', { ...user, role: 'admin' })).status, 403);
        assert.equal((await request('/admin/usage', { ...admin, role: 'user' })).status, 200);
    });

    test('다른 사용자의 가계부는 차단하고 공유 멤버에게만 허용한다', async () => {
        const other = { id: 'integration-other', role: 'user' };
        assert.equal((await request(`/user/ledger?month=2026-10&owner=${user.id}`, other)).status, 404);
        await db.prepare('INSERT INTO ledger_members (owner_user_id, member_user_id) VALUES (?, ?)').bind(user.id, other.id).run();
        const response = await request(`/user/ledger?month=2026-10&owner=${user.id}`, other);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).data[0].amount, 12345);
    });

    test('존재하지 않는 사용자 토큰은 개인 데이터에 접근하지 못한다', async () => {
        assert.equal((await request('/user/ledger', { id: 'missing-user', role: 'admin' })).status, 401);
    });
});
