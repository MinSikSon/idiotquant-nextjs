import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchOperations, operationStatus, stepStatus, type OperationRun, type OperationStep } from '../lib/features/algorithmTrade/operations.ts';

const run: OperationRun = {
    id: 'run', parent_id: null, country: 'KR', user_id: 'account', job: 'trade',
    scheduled_at: 1000, started_at: 1000, updated_at: 2000, finished_at: null,
    status: 'running', current_stage: 'process', reason: null, context: {},
};
const step: OperationStep = { seq: 0, stage: 'quote', parent_stage: 'process', started_at: 2000, finished_at: null, status: 'running', reason: null, context: {} };

test('오래된 실행은 실패로 추정하지 않고 확인 불가로 표시한다', () => {
    assert.equal(operationStatus(run, 601999), 'running');
    assert.equal(operationStatus(run, 602000), 'unknown');
    assert.equal(stepStatus(step, run, 602000), 'unknown');
    assert.equal(operationStatus({ ...run, status: 'completed' }, 9e9), 'completed');
    assert.equal(stepStatus({ ...step, status: 'failed' }, run, 9e9), 'failed');
});

test('기록되지 않은 단계는 실행 중에는 대기, 종료 뒤에는 미수행으로 표시한다', () => {
    assert.equal(stepStatus(undefined, run, 3000), 'pending');
    assert.equal(stepStatus(undefined, run, 602000), 'unknown');
    assert.equal(stepStatus(undefined, { ...run, status: 'skipped', finished_at: 2000 }, 3000), 'skipped');
});

test('조회 API는 no-store·중단 신호를 전달하고 오류·비JSON을 성공으로 처리하지 않는다', async () => {
    const original = globalThis.fetch;
    const controller = new AbortController();
    try {
        globalThis.fetch = async (input, options) => {
            assert.equal(input, '/api/proxy/admin/trading/status');
            assert.equal(options?.cache, 'no-store');
            assert.equal(options?.signal, controller.signal);
            return Response.json({ success: true, data: { scheduler: null } });
        };
        assert.deepEqual(await fetchOperations('status', controller.signal), { scheduler: null });
        globalThis.fetch = async () => Response.json({ success: false, error: '관리자 권한이 필요합니다.', code: 'WORKER_ADMIN_REQUIRED' }, { status: 403 });
        await assert.rejects(fetchOperations('status', controller.signal), /관리자 권한.*WORKER_ADMIN_REQUIRED/);
        globalThis.fetch = async () => new Response('<html>unavailable</html>', { status: 502 });
        await assert.rejects(fetchOperations('status', controller.signal), /실행 기록/);
    } finally { globalThis.fetch = original; }
});
