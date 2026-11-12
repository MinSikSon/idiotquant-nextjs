export type OperationJob = 'trade' | 'scan' | 'archive' | 'scheduler';
export type OperationStatus = 'running' | 'completed' | 'partial' | 'failed' | 'skipped' | 'pending' | 'unknown';
export type OperationContext = Record<string, string | number | boolean>;
export interface OperationRun {
    id: string;
    parent_id: string | null;
    job: OperationJob;
    country: 'KR' | 'US' | null;
    user_id: string | null;
    scheduled_at: number;
    started_at: number;
    updated_at: number;
    finished_at: number | null;
    status: OperationStatus;
    current_stage: string | null;
    reason: string | null;
    context: OperationContext;
}
export interface OperationStep {
    seq: number;
    stage: string;
    parent_stage: string | null;
    started_at: number;
    finished_at: number | null;
    status: OperationStatus;
    reason: string | null;
    context: OperationContext;
}
export interface OperationDetail extends OperationRun { steps: OperationStep[] }
export interface OperationStage {
    id: string;
    label: string;
    description: string;
    functions: string[];
    services: string[];
    storage: string[];
}
export interface OperationsOverview {
    server_time: number;
    scheduler_enabled: boolean;
    scheduler: OperationRun | null;
    scan_country: 'KR' | 'US';
    background_task?: 'scan' | 'archive' | 'mixed';
    schedule: {
        trading_minutes: number[];
        archive_minutes: number[];
        scan: string;
        windows: Record<'KR' | 'US', { start: number; end: number }>;
        monthly: string;
    };
    stages: Record<OperationJob | 'details', OperationStage[]>;
    reasons: Record<string, string>;
}
export interface OperationsPage {
    items: OperationRun[];
    next_cursor: { at: number; id: string } | null;
}
export const OPERATION_STATUS_LABELS: Record<OperationStatus, string> = {
    running: '실행 중', completed: '완료', partial: '일부 실패', failed: '실패', skipped: '생략', pending: '대기', unknown: '확인 불가',
};
export function operationStatus(item: Pick<OperationRun, 'status' | 'updated_at'>, now: number): OperationStatus {
    return item.status === 'running' && now - item.updated_at >= 600_000 ? 'unknown' : item.status;
}
export function stepStatus(step: OperationStep | undefined, run: OperationRun, now: number): OperationStatus {
    if (!step) return run.status === 'skipped' ? 'skipped' : run.finished_at ? 'skipped' : operationStatus(run, now) === 'unknown' ? 'unknown' : 'pending';
    return step.status === 'running' && operationStatus(run, now) === 'unknown' ? 'unknown' : step.status;
}
export async function fetchOperations<T>(path: string, signal: AbortSignal): Promise<T> {
    const response = await fetch(`/api/proxy/admin/trading/${path}`, { cache: 'no-store', signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success !== true || !payload.data) {
        const message = typeof payload?.error === 'string' ? payload.error : '실행 기록을 불러오지 못했습니다.';
        throw new Error(typeof payload?.code === 'string' ? `${message} (${payload.code})` : message);
    }
    return payload.data as T;
}
