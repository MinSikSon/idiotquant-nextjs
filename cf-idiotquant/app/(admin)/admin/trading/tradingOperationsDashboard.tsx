'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, Check, ChevronRight, Clock, Database, RefreshCw, Shield, X } from 'lucide-react';
import { PageHeader, PAGE_WIDTH } from '@/components/pageHeader';
import { cn } from '@/lib/utils';
import { fetchOperations, operationStatus, stepStatus, OPERATION_STATUS_LABELS,
    type OperationDetail, type OperationJob, type OperationRun, type OperationStage,
    type OperationStatus, type OperationsOverview, type OperationsPage } from '@/lib/features/algorithmTrade/operations';
import styles from './tradingOperations.module.css';

const JOBS: { id: OperationJob; label: string }[] = [
    { id: 'trade', label: '자동매매' }, { id: 'scan', label: '종목 스캔' },
    { id: 'archive', label: '아카이브' }, { id: 'scheduler', label: '스케줄러' },
];
const contextLabels: Record<string, string> = {
    symbol: '종목', group_id: '풀 ID', side: '주문 방향', dca: '정액 주문', quantity: '주문 수량',
    price: '주문 기준가', points_before: '처리 전 포인트(원)', points_after: '처리 후 포인트(원)',
    active_count: '활성 종목 수', stock_count: '전체 종목 수', monthly_budget_krw: '월 예산(원)',
    refill_stock_index: '다음 종목 인덱스', ncav_ratio: 'NCAV 기준', loop_limit: '반복 한도', cursor: '커서',
    total: '전체 대상 수', count: '처리 건수', period: '기간 유형', period_label: '대상 기간', cutoff: '정리 기준일',
    source: '데이터 출처', scan_date: '수집 날짜', account_count: '계좌 수', kind: '작업 종류',
    group_budget_krw: '풀 월 예산(원)', per_tick_krw: '풀 회당 적립(원)', per_stock_krw: '종목당 적립(원)',
    min_per: '최소 PER', max_pbr: '최대 PBR', min_pbr: '최소 PBR', min_eps: '최소 EPS', min_bps: '최소 BPS', portfolio_weight: '최대 비중',
};
const time = (value: number | null, full = false) => value ? new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', ...(full ? { month: '2-digit', day: '2-digit' } : {}), hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}) : '기록 없음';
const duration = (start: number, end: number) => `${Math.max(0, (end - start) / 1000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}초`;
const runTitle = (run: OperationRun) => run.user_id ? `계좌 ${run.user_id.slice(0, 8)}` : `${run.country ? `${run.country} · ` : ''}${JOBS.find(job => job.id === run.job)?.label}`;
function Badge({ status }: { status: OperationStatus }) {
    return <span className={cn(styles.badge, styles[status])}>{OPERATION_STATUS_LABELS[status]}</span>;
}
function Mark({ status }: { status: OperationStatus }) {
    return <span className={cn(styles.point, styles[status])} aria-hidden="true">{status === 'completed' ? <Check size={11} /> : status === 'failed' || status === 'partial' ? <X size={11} /> : status === 'running' ? <span /> : status === 'skipped' ? '−' : status === 'unknown' ? '?' : ''}</span>;
}
function Connection({ label, values }: { label: string; values?: string[] }) {
    return <div><dt>{label}</dt><dd>{values?.length ? values.map(value => <code key={value}>{value}</code>) : '없음'}</dd></div>;
}

export default function TradingOperationsDashboard() {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [job, setJob] = useState<OperationJob>('trade');
    const [country, setCountry] = useState<'KR' | 'US'>('KR');
    const [cursor, setCursor] = useState<OperationsPage['next_cursor']>(null);
    const [selectedId, setSelectedId] = useState('');
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [overview, setOverview] = useState<{ key: string; data: OperationsOverview; receivedAt: number } | null>(null);
    const [page, setPage] = useState<{ key: string; data: OperationsPage } | null>(null);
    const [detail, setDetail] = useState<OperationDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(() => Date.now());
    const query = new URLSearchParams({ job, country, ...(cursor ? { cursor: JSON.stringify(cursor) } : {}) }).toString();
    const runs = page?.key === query ? page.data.items : [];
    const meta = overview?.key === country ? overview.data : null;
    const id = selectedId || runs[0]?.id || '';
    const run = detail?.id === id ? detail : null;

    useEffect(() => {
        let active = true;
        let controller: AbortController | null = null;
        let inFlight = false;
        async function load() {
            if (inFlight) return;
            inFlight = true;
            controller?.abort();
            controller = new AbortController();
            setLoading(true);
            const results = await Promise.allSettled([
                fetchOperations<OperationsOverview>(`status?country=${country}`, controller.signal),
                fetchOperations<OperationsPage>(`runs?${query}`, controller.signal),
            ]);
            inFlight = false;
            if (!active || controller.signal.aborted) return;
            const [statusResult, pageResult] = results;
            if (statusResult.status === 'fulfilled') {
                setOverview({ key: country, data: statusResult.value, receivedAt: Date.now() });
                setNow(statusResult.value.server_time);
            }
            if (pageResult.status === 'fulfilled') setPage({ key: query, data: pageResult.value });
            const failed = results.find(result => result.status === 'rejected');
            setError(failed?.status === 'rejected' ? (failed.reason instanceof Error ? failed.reason.message : '조회 실패') : null);
            setLoading(false);
        }
        const visibility = () => { if (!document.hidden) void load(); };
        void load();
        const timer = setInterval(() => { if (!document.hidden) void load(); }, 5000);
        document.addEventListener('visibilitychange', visibility);
        return () => { active = false; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
    }, [country, query, refresh]);

    useEffect(() => {
        if (!id) return;
        let active = true;
        let controller: AbortController | null = null;
        let inFlight = false;
        async function load() {
            if (inFlight) return;
            inFlight = true;
            controller?.abort();
            controller = new AbortController();
            try {
                const data = await fetchOperations<OperationDetail>(`runs/${encodeURIComponent(id)}`, controller.signal);
                if (active && !controller.signal.aborted) { setDetail(data); setDetailError(null); }
            } catch (failure) {
                if (active && !controller.signal.aborted) setDetailError(failure instanceof Error ? failure.message : '실행 상세 조회 실패');
            } finally { inFlight = false; }
        }
        void load();
        const visibility = () => { if (!document.hidden) void load(); };
        const timer = setInterval(() => { if (!document.hidden) void load(); }, 5000);
        document.addEventListener('visibilitychange', visibility);
        return () => { active = false; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
    }, [id, refresh]);

    useEffect(() => {
        const timer = setInterval(() => setNow(overview ? overview.data.server_time + Date.now() - overview.receivedAt : Date.now()), 1000);
        return () => clearInterval(timer);
    }, [overview]);

    function chooseJob(next: OperationJob) { setJob(next); setCursor(null); setSelectedId(''); setSelectedStage(null); }
    function chooseCountry(next: 'KR' | 'US') { setCountry(next); setCursor(null); setSelectedId(''); setSelectedStage(null); }
    function chooseRun(next: string) { setSelectedId(next); setSelectedStage(null); setDetailError(null); }
    const stages = meta?.stages[job] ?? [];
    const stageId = selectedStage ?? run?.current_stage ?? stages[0]?.id;
    const stage = stages.find(item => item.id === stageId);
    const step = run?.steps.filter(item => !item.parent_stage && item.stage === stageId).at(-1);
    const children = run?.steps.filter(item => item.parent_stage === stageId) ?? [];
    const selectedStatus = run ? stepStatus(step, run, now) : 'pending';
    const reason = (code: string | null | undefined) => code ? meta?.reasons[code] ?? code : null;
    const accounts = Array.from(new Map(runs.map(item => [item.user_id ?? item.id, item] as const).reverse()).values()).sort((a, b) => b.started_at - a.started_at);
    const sidebar = job === 'trade' ? accounts : runs.slice(0, 10);
    useEffect(() => {
        const container = timelineRef.current;
        if (!container) return;
        const reveal = () => {
            const selected = container.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
            if (!selected) return;
            const target = selected.getBoundingClientRect();
            const bounds = container.getBoundingClientRect();
            container.scrollTo({ left: container.scrollLeft + target.left - bounds.left - (container.clientWidth - target.width) / 2 });
        };
        reveal();
        const observer = new ResizeObserver(reveal);
        observer.observe(container);
        return () => observer.disconnect();
    }, [stageId, id]);
    const scheduler = meta?.scheduler;
    const schedulerStale = scheduler && now - scheduler.started_at >= 180_000;
    const currentWindow = meta?.schedule.windows[country];
    const hasOldData = !!error || !!detailError;

    return <>
        <PageHeader width="content" icon={<Activity size={18} />} title="자동매매 운영 현황" meta="관리자 전용 · 실행 단계와 내부 구성" />
        <main className={cn(PAGE_WIDTH.content, styles.dashboard)}>
            <div className={styles.toolbar}><Link href="/admin" className={styles.back}><ArrowLeft size={14} />관리자 홈</Link><div className={styles.refresh}><span><Shield size={12} />관리자 전용</span><button onClick={() => setRefresh(value => value + 1)} disabled={loading} className={styles.button}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />새로고침</button></div></div>
            {(error || detailError) && <div role="alert" className={styles.error}>{error || detailError} {(meta || run) && '· 마지막으로 조회한 데이터가 표시될 수 있습니다.'}</div>}
            <div className={styles.stats}>
                <div className={styles.stat}><p>스케줄러</p><strong>{!meta ? '확인 중' : !meta.scheduler_enabled ? 'OFF' : !scheduler ? '실행 기록 없음' : schedulerStale ? '스케줄 진입 미확인' : 'ON · 매 분 확인'}</strong><small>마지막 진입 {time(scheduler?.started_at ?? null)} KST</small></div>
                <div className={styles.stat}><p>{country} 매매 스케줄</p><strong>{currentWindow ? `${String(currentWindow.start).padStart(2, '0')}:00 ~ ${String(currentWindow.end).padStart(2, '0')}:00` : '확인 중'}</strong><small>5분 간격 · 스케줄 시간대이며 장 개장 여부와 다를 수 있습니다.</small></div>
                <div className={styles.stat}><p>오늘 종목 수집 대상</p><strong>{meta ? `${meta.scan_country} 시장` : '확인 중'}</strong><small>매매·아카이브 분을 제외한 매 분 · 국장 1일 / 미장 2일</small></div>
            </div>
            <div className={styles.workbar}><div role="group" aria-label="관찰할 작업" className={styles.tabs}>{JOBS.map(item => <button key={item.id} aria-pressed={job === item.id} onClick={() => chooseJob(item.id)}>{item.label}</button>)}</div><div role="group" aria-label="시장 선택" className={styles.markets}>{(['KR', 'US'] as const).map(value => <button key={value} aria-pressed={country === value} onClick={() => chooseCountry(value)}>{value} {value === 'KR' ? '한국' : '미국'}</button>)}</div></div>
            <div className={styles.layout}>
                <aside className={styles.sidebar}><h2>{job === 'trade' ? cursor ? '조회 범위 내 계좌' : '계좌별 최근 실행' : '최근 실행'}<small>{sidebar.length}개</small></h2>
                    {!runs.length && <p className={styles.empty}>{loading ? '실행 기록 조회 중…' : '최근 24시간 기록이 없습니다.'}</p>}
                    {sidebar.map(item => <button key={item.id} className={styles.account} aria-pressed={run?.user_id && job === 'trade' ? item.user_id === run.user_id : id === item.id} onClick={() => chooseRun(item.id)}><strong>{runTitle(item)}</strong><span>{time(item.started_at)}<Badge status={operationStatus(item, now)} /></span><small>{meta?.stages[job].find(stage => stage.id === item.current_stage)?.label ?? reason(item.reason) ?? '기록 확인'}</small></button>)}
                    <p className={styles.sideFoot}>{job === 'trade' ? '계좌별 실행은 병렬로 진행됩니다. 같은 계좌도 실행 시각에 따라 별도 기록됩니다.' : '각 실행의 처리 범위와 저장·생략 결과를 확인합니다.'}</p>
                    <div className={styles.pagination}>{cursor && <button className={styles.button} onClick={() => { setCursor(null); chooseRun(''); }}>최신 기록</button>}{page?.key === query && page.data.next_cursor && <button className={styles.button} onClick={() => { setCursor(page.data.next_cursor); chooseRun(''); }}>이전 50건<ChevronRight size={12} /></button>}</div>
                </aside>
                <div className={styles.content}>
                    <section className={styles.panel} aria-label="실행 단계 진행도"><div className={styles.panelHead}><div><h2>{run ? runTitle(run) : '실행을 선택하세요'}</h2><p>{run ? `${time(run.started_at, true)} KST · ${run.country ?? '전체'}${run.user_id ? ` · ${run.user_id}` : ''}` : '실행 기록이 생성되면 단계별 진행 상태가 표시됩니다.'}</p></div><label className={styles.history}>실행 시각<select value={id} onChange={event => chooseRun(event.target.value)} aria-label="조회할 실행 시각"><option value="" disabled>실행 선택</option>{runs.map(item => <option key={item.id} value={item.id}>{time(item.started_at, true)} · {runTitle(item)} · {OPERATION_STATUS_LABELS[operationStatus(item, now)]}</option>)}</select></label></div>
                        {stages.length > 0 && <div className={styles.timelineScroll} ref={timelineRef}><ol className={styles.timeline}>{stages.map(item => { const record = run?.steps.filter(step => !step.parent_stage && step.stage === item.id).at(-1); const status = run ? stepStatus(record, run, now) : 'pending'; return <li key={item.id} className={cn(record && record.status !== 'skipped' && styles.connected)}><button onClick={() => setSelectedStage(item.id)} aria-pressed={stageId === item.id} aria-label={`${item.label} · ${OPERATION_STATUS_LABELS[status]}`}><Mark status={status} /><span>{item.label}</span><small>{OPERATION_STATUS_LABELS[status]}</small></button></li>; })}</ol></div>}
                        <div className={styles.current} aria-live="polite">{run ? <><Badge status={operationStatus(run, now)} /><span>{reason(run.reason) ?? (operationStatus(run, now) === 'unknown' ? '10분 이상 갱신되지 않아 현재 수행 상태를 확인할 수 없습니다.' : meta?.stages[job].find(stage => stage.id === run.current_stage)?.label ?? '실행 준비')}{run.context.symbol && ` · ${run.context.symbol}`}</span><small>{duration(run.started_at, run.finished_at ?? now)}</small></> : <span>{loading ? '불러오는 중…' : '아직 기록이 없습니다. Worker 배포 후 새 실행부터 수집합니다.'}</span>}</div>
                        <p className={styles.note}>점을 선택하면 단계의 내부 처리와 연결 구성을 확인할 수 있습니다. 주문 접수와 실제 체결은 별도입니다.</p>
                    </section>
                    {stage && <section className={styles.panel}><div className={styles.panelHead}><h2>{stage.label} · 내부 동작</h2>{run && <Badge status={selectedStatus} />}</div><p className={styles.description}>{stage.description}</p>
                        {(reason(step?.reason) || (!step && run?.finished_at)) && <p className={styles.reason}>{reason(step?.reason) ?? reason(run?.reason) ?? '이 실행에서 도달하지 않았거나 기록되지 않은 단계입니다.'}</p>}
                        <div className={styles.detailGrid}><div><h3>내부 처리 기록</h3>{children.length ? <ol className={styles.children}>{children.map(child => <li key={child.seq}><Mark status={stepStatus(child, run!, now)} /><div><strong>{meta?.stages.details.find(stage => stage.id === child.stage)?.label ?? child.stage}</strong><p>{[child.context.symbol, child.context.group_id && `풀 ${child.context.group_id}`, reason(child.reason)].filter(Boolean).join(' · ')}</p><small>{time(child.started_at)} · {OPERATION_STATUS_LABELS[stepStatus(child, run!, now)]}{child.finished_at ? ` · ${duration(child.started_at, child.finished_at)}` : ''}</small>{Object.entries(child.context).filter(([key]) => !['symbol', 'group_id'].includes(key)).length > 0 && <dl className={styles.inlineContext}>{Object.entries(child.context).filter(([key]) => !['symbol', 'group_id'].includes(key)).map(([key, value]) => <div key={key}><dt>{contextLabels[key] ?? key}</dt><dd>{String(value)}</dd></div>)}</dl>}</div></li>)}</ol> : <p className={styles.description}>{step ? `${time(step.started_at)} 시작${step.finished_at ? ` · ${duration(step.started_at, step.finished_at)} 소요` : ''}` : '해당 단계의 실행 기록이 없습니다.'}</p>}</div><dl className={styles.connections}><Connection label="실행 함수" values={stage.functions} /><Connection label="외부 서비스" values={stage.services} /><Connection label="저장소 · 읽기 / 쓰기" values={stage.storage} />{Array.from(new Set(children.map(child => child.stage))).map(id => { const childStage: OperationStage | undefined = meta?.stages.details.find(stage => stage.id === id); return childStage ? <Connection key={id} label={childStage.label} values={[...childStage.functions, ...childStage.services, ...childStage.storage]} /> : null; })}</dl></div>
                        {step && Object.keys(step.context).length > 0 && <dl className={styles.settings}>{Object.entries(step.context).map(([key, value]) => <div key={key}><dt>{contextLabels[key] ?? key}</dt><dd>{typeof value === 'boolean' ? value ? 'ON' : 'OFF' : String(value)}</dd></div>)}</dl>}
                    </section>}
                    {run && <section className={styles.panel}><div className={styles.panelHead}><h2><Clock size={14} />실행 기록</h2><span className={styles.note}>{run.id}</span></div><ol className={styles.events}>{[...run.steps].reverse().slice(0, 15).map(item => <li key={item.seq}><time>{time(item.finished_at ?? item.started_at)}</time><Badge status={stepStatus(item, run, now)} /><span>{[...stages, ...(meta?.stages.details ?? [])].find(stage => stage.id === item.stage)?.label ?? item.stage}{item.context.symbol && ` · ${item.context.symbol}`}{item.reason && ` · ${reason(item.reason)}`}</span></li>)}</ol>{run.parent_id && <p className={styles.note}>스케줄 분기 실행: {run.parent_id}</p>}</section>}
                </div>
            </div>
            <footer className={styles.footer}><span><Database size={12} />최근 24시간 · 단계 상세는 실행 종료 후 반영 · 5초마다 조회{hasOldData ? ' · 조회 실패' : ''}</span><span>최근 응답 {time(overview?.data.server_time ?? null)} KST</span></footer>
        </main>
    </>;
}
