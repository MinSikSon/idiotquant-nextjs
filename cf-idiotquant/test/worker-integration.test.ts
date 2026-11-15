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
            '0035_us_screener.sql', '0040_trading_operations.sql', '0041_operation_snapshots.sql', '0047_watchlist_reviews.sql',
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

    test('관심종목 확인은 GET으로 갱신되지 않고 명시적 완료 후 다른 기기에 반영된다', async () => {
        const read = async (person = user) => (await (await request('/user/likes/review', person)).json()).data;
        const initial = await read();
        assert.equal(initial.baseline.revision, 0);
        const displayed = watchSnapshot(initial.items);
        const save = await request('/user/likes/review', user, { method: 'POST', body: JSON.stringify({ revision: 0, items: displayed }) });
        assert.equal(save.status, 200);
        const saved = (await save.json()).data;
        assert.equal(saved.revision, 1);
        assert.deepEqual(saved.items, displayed);
        await db.prepare('UPDATE stock_data_daily SET last_price = ? WHERE ticker = ?').bind(70000, '005930').run();
        for (let i = 0; i < 2; i++) {
            const otherDevice = await read();
            assert.deepEqual(otherDevice.baseline, saved);
            assert.equal(watchChanges(saved.items, watchSnapshot(otherDevice.items)).length, 1);
        }
        const unrelated = await read({ id: 'integration-other', role: 'user' });
        assert.equal(unrelated.baseline.revision, 0);
        assert.deepEqual(unrelated.items, []);
        assert.equal((await request('/user/likes/review', null)).status, 401);
        assert.equal((await request('/user/likes/review', null, { method: 'POST', body: '{}' })).status, 401);
    });

    test('동시 확인은 하나만 성공하고 오래된 기기는 최신 기준을 덮어쓰지 못한다', async () => {
        const data = (await (await request('/user/likes/review')).json()).data;
        const payload = JSON.stringify({ revision: data.baseline.revision, items: watchSnapshot(data.items) });
        const saves = await Promise.all([1, 2].map(() => request('/user/likes/review', user, { method: 'POST', body: payload })));
        assert.deepEqual(saves.map(result => result.status).sort(), [200, 409]);
        const final = (await (await request('/user/likes/review')).json()).data;
        assert.equal(final.baseline.revision, data.baseline.revision + 1);
        assert.equal(final.baseline.items[0].price, 70000);
        const foreign = await request('/user/likes/review', { id: 'integration-other', role: 'user' }, { method: 'POST', body: JSON.stringify({ revision: 0, items: watchSnapshot(data.items) }) });
        assert.equal(foreign.status, 400);
        const failed = await request('/user/likes/review', user, { method: 'POST', body: '{invalid' });
        assert.equal(failed.status, 400);
        assert.deepEqual((await (await request('/user/likes/review')).json()).data.baseline, final.baseline);
    });

    test('과거·누락 데이터는 확인 기준을 잃지 않고 관심 해제는 다음 저장에 반영된다', async () => {
        const read = async () => (await (await request('/user/likes/review')).json()).data;
        const save = async (revision: number, items: unknown[]) => request('/user/likes/review', user, { method: 'POST', body: JSON.stringify({ revision, items }) });
        const original = await read();
        const older = { ...original.baseline.items[0], scanDate: '20261022', price: 100 };
        assert.equal((await save(original.baseline.revision, [older])).status, 200);
        const afterOld = await read();
        assert.deepEqual(afterOld.baseline.items, original.baseline.items);
        await db.prepare('DELETE FROM stock_data_daily WHERE ticker = ?').bind('005930').run();
        const missing = await read();
        assert.equal(missing.items.length, 1);
        assert.equal(watchSnapshot(missing.items).length, 0);
        assert.equal((await save(missing.baseline.revision, [])).status, 200);
        const retained = await read();
        assert.deepEqual(retained.baseline.items, original.baseline.items);
        await request('/user/likes', user, { method: 'POST', body: JSON.stringify({ ticker: '005930' }) });
        assert.equal((await save(retained.baseline.revision, [])).status, 200);
        assert.deepEqual((await read()).baseline.items, []);
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

    test('자동매매 운영 API는 DB 관리자만 허용하고 실제 D1 실행 단계를 반환한다', async () => {
        assert.equal((await request('/admin/trading/status', null)).status, 401);
        assert.equal((await request('/admin/trading/status', { ...user, role: 'admin' })).status, 403);
        assert.equal((await runtime.dispatchFetch('http://worker.test/admin/trading/status', { headers: { 'X-User-Id': admin.id, 'X-User-Role': 'admin' } })).status, 401);
        const { observeOperation } = await import(join(workerRoot!, 'src/lib/operationObserver.js'));
        let runId = '';
        await observeOperation({ D1_IDIOTQUANT_MAIN: db }, { job: 'trade', country: 'KR', userId: 'fixture-account' }, async (observer: { run: { id: string }; start: (stage: string, context?: object, parent?: string) => Promise<void>; result: (code: string) => Promise<void> }) => {
            runId = observer.run.id;
            await observer.start('process');
            await observer.start('order', { symbol: '005930', quantity: 1, appkey: 'never-persist-this' }, 'process');
            await observer.result('order_error');
            await observer.start('save');
        });
        const response = await request(`/admin/trading/runs/${runId}`, admin);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const run = (await response.json()).data;
        assert.equal(run.status, 'partial');
        assert.equal(run.steps.find((step: { stage: string }) => step.stage === 'order').status, 'failed');
        assert.ok(!JSON.stringify(run).includes('never-persist-this'));
        const list = await request('/admin/trading/runs?job=trade&country=KR', admin);
        assert.equal((await list.json()).data.items[0].id, runId);
        const overview = await request('/admin/trading/status?country=US', admin);
        assert.equal((await overview.json()).data.stages.trade[0].id, 'auth');
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
