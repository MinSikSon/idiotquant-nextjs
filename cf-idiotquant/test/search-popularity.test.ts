import assert from 'node:assert/strict';
import test from 'node:test';
import { recordSearchOnce, searchLogFromQuote } from '../lib/features/searchLog/tracking.ts';

const now = 1_800_000_000_000;
const entry = (ticker: string) => ({ ticker, name: ticker, isUs: true });
function storage() {
    let value: string | null = null;
    return { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
}

test('실제 시세가 확인된 국내·미국 종목만 기록한다', () => {
    assert.deepEqual(searchLogFromQuote('005930', false, { rt_cd: '0', output: { stck_prpr: '65000' } }, '삼성전자'),
        { ticker: '005930', name: '삼성전자', isUs: false });
    assert.equal(searchLogFromQuote(' aapl ', true, { rt_cd: '0', output: { last: '250.50' } }, 'Apple')?.ticker, 'AAPL');
    for (const quote of [null, { rt_cd: '1', output: { last: '100' } }, { rt_cd: '0', output: { last: '0' } },
        { rt_cd: '0', output: { last: 'NaN' } }, { rt_cd: '0' }]) {
        assert.equal(searchLogFromQuote('INVALID', true, quote, '실패'), null);
    }
});

test('A→B→A 검색과 반복 조회는 30분 동안 한 번, 만료 후 다시 집계한다', async () => {
    const saved = storage();
    const calls: string[] = [];
    const post = async (log: { ticker: string }) => { calls.push(log.ticker); return { success: true }; };
    await recordSearchOnce(entry('COOLDOWN'), post, saved, now);
    await recordSearchOnce(entry('OTHER'), post, saved, now + 1);
    await recordSearchOnce(entry('COOLDOWN'), post, saved, now + 2);
    await recordSearchOnce(entry('COOLDOWN'), post, saved, now + 30 * 60 * 1000);
    assert.deepEqual(calls, ['COOLDOWN', 'OTHER', 'COOLDOWN']);
});

test('저장 실패는 재시도할 수 있고 동시 요청은 중복 기록하지 않는다', async () => {
    const saved = storage();
    let calls = 0;
    const post = async () => ({ success: ++calls > 1 });
    await recordSearchOnce(entry('RETRY'), post, saved, now);
    await recordSearchOnce(entry('RETRY'), post, saved, now + 1);
    await recordSearchOnce(entry('RETRY'), post, saved, now + 2);
    assert.equal(calls, 2);
    let complete!: (result: { success: boolean }) => void;
    const first = recordSearchOnce(entry('PENDING'), () => new Promise(resolve => { complete = resolve; }), saved, now);
    const second = await recordSearchOnce(entry('PENDING'), async () => { assert.fail('중복 요청'); }, saved, now);
    assert.equal(second.skipped, true);
    complete({ success: true });
    await first;
});

test('다른 페이지에서 저장한 기록·차단된 저장소·깨진 기록에도 쿨다운을 적용한다', async () => {
    const saved = storage();
    saved.setItem('', JSON.stringify({ 'US:PERSISTED': now - 100 }));
    const result = await recordSearchOnce(entry('PERSISTED'), async () => { assert.fail('재조회 집계'); }, saved, now);
    assert.equal(result.skipped, true);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    let calls = 0;
    const post = async () => { calls++; return { success: true }; };
    await recordSearchOnce(entry('BLOCKED'), post, blocked, now);
    await recordSearchOnce(entry('BLOCKED'), post, blocked, now + 1);
    assert.equal(calls, 1);
    saved.setItem('', '{bad');
    await recordSearchOnce(entry('CORRUPT'), post, saved, now);
    assert.equal(calls, 2);
});
