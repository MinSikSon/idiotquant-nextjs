'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { FACTORS, DEFAULT_RULES, rankFactors, parseResearchCsv, backtestFactors, scanResearchRows, type FactorRule, type ResearchRow } from '@/lib/research/strategy';
import { getScanDailyList } from '@/lib/features/algorithmTrade/algorithmTradeAPI';

const STORAGE_KEY = 'idiotquant:factor-rules:v1';
const inputClass = 'w-full rounded border border-neutral-200 bg-white px-2 py-2 text-base tabular-nums dark:border-surface-dark-border dark:bg-surface-dark-card sm:text-sm';
const buttonClass = 'rounded border border-neutral-200 px-3 py-2 text-sm hover:border-brand dark:border-surface-dark-border';
const display = (value: number) => Number.isFinite(value) ? value.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '—';
const isoDate = (value: string) => /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : value;

function download(name: string, text: string) {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    URL.revokeObjectURL(url);
}

export default function FactorWorkbench({ items, scanDate, country, isAdmin, availableDates }: {
    items: Record<string, any>[]; scanDate: string | null; country: 'KR' | 'US'; isAdmin: boolean; availableDates: string[];
}) {
    const loadVersion = useRef(0);
    const [rules, setRules] = useState<FactorRule[]>(DEFAULT_RULES);
    const [history, setHistory] = useState<ResearchRow[]>([]);
    const [source, setSource] = useState('');
    const [start, setStart] = useState(''); const [end, setEnd] = useState('');
    const [topN, setTopN] = useState(10); const [rebalance, setRebalance] = useState(20); const [costBps, setCostBps] = useState(10);
    const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
    const [result, setResult] = useState<ReturnType<typeof backtestFactors> | null>(null);
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
            if (Array.isArray(stored) && stored.length === FACTORS.length && stored.every((r, i) => r.key === FACTORS[i].key && Number.isFinite(r.weight) && r.weight >= 0 && typeof r.lower === 'boolean' && (r.min == null || Number.isFinite(r.min)) && (r.max == null || Number.isFinite(r.max)))) setRules(stored);
        } catch { /* 저장된 조건이 없으면 기본 조합을 사용한다. */ }
    }, []);
    useEffect(() => { setResult(null); }, [rules, history, topN, rebalance, costBps]);
    useEffect(() => { loadVersion.current++; setHistory([]); setSource(''); setResult(null); setError(''); setBusy(false); }, [country]);
    const ranking = useMemo(() => {
        try { return { rows: scanDate ? rankFactors(scanResearchRows(items, isoDate(scanDate)), rules) : [], error: '' }; }
        catch (e) { return { rows: [], error: e instanceof Error ? e.message : '조건을 확인해 주세요.' }; }
    }, [items, scanDate, rules]);
    const change = (key: string, patch: Partial<FactorRule>) => setRules(current => current.map(rule => rule.key === key ? { ...rule, ...patch } : rule));
    async function readFile(file?: File) {
        if (!file) return;
        const version = ++loadVersion.current;
        setError(''); setBusy(true);
        try {
            if (file.size > 10 * 1024 * 1024) throw new Error('CSV 파일은 10MB 이하로 선택해 주세요.');
            const text = await file.text();
            if (version !== loadVersion.current) return;
            const rows = parseResearchCsv(text);
            if (new Set(rows.map(row => row.date)).size < 3) throw new Error('서로 다른 날짜가 3개 이상 필요합니다.');
            setHistory(rows); setSource(`${file.name} · ${rows.length.toLocaleString()}행`);
        } catch (e) { if (version !== loadVersion.current) return; setHistory([]); setSource(''); setError(e instanceof Error ? e.message : 'CSV를 읽지 못했습니다.'); }
        finally { if (version === loadVersion.current) setBusy(false); }
    }
    async function loadSnapshots() {
        if (!isAdmin || busy) return;
        const version = ++loadVersion.current;
        setError(''); setBusy(true); setHistory([]); setSource('');
        try {
            const dates = availableDates.filter(date => isoDate(date) >= start && isoDate(date) <= end).sort();
            if (!start || !end || start > end || dates.length < 3) throw new Error('저장된 스캔 날짜가 3개 이상 포함되도록 기간을 선택해 주세요.');
            if (dates.length > 120) throw new Error('한 번에 최대 120개 스냅샷을 조회할 수 있습니다.');
            const rows: ResearchRow[] = [];
            for (const date of dates) {
                const response = await getScanDailyList(date, 'all', 2500, country);
                if (version !== loadVersion.current) return;
                if (response?.success === false || !Array.isArray(response?.data) || !response.data.length) throw new Error(`${isoDate(date)} 스냅샷을 읽지 못했습니다.`);
                if (String(response.meta?.scanDate ?? '').replaceAll('-', '') !== date || response.data.some((row: any) => String(row.scan_date).replaceAll('-', '') !== date)) throw new Error(`${isoDate(date)}의 확정 스냅샷이 아닙니다. 최신 데이터로 대체하지 않습니다.`);
                if (Number(response.meta?.matched ?? 0) > response.data.length) throw new Error(`${isoDate(date)} 목록이 일부만 반환되었습니다. 전체 CSV를 이용해 주세요.`);
                rows.push(...scanResearchRows(response.data, isoDate(date)));
                setNotice(`스냅샷 ${rows.length.toLocaleString()}행 조회 중`);
            }
            setHistory(rows); setSource(`${country} 일간 스캔 · ${dates.length}개 날짜 · ${rows.length.toLocaleString()}행`); setNotice('');
        } catch (e) { if (version !== loadVersion.current) return; setError(e instanceof Error ? e.message : '스냅샷 조회에 실패했습니다.'); setNotice(''); }
        finally { if (version === loadVersion.current) setBusy(false); }
    }
    function run() {
        setError(''); setResult(null);
        try { setResult(backtestFactors(history, rules, topN, rebalance, costBps)); }
        catch (e) { setError(e instanceof Error ? e.message : '검증 조건을 확인해 주세요.'); }
    }
    const historyDates = [...new Set(history.map(row => row.date))].sort();
    return (
        <details className="mx-auto max-w-[1600px] lg:max-w-none border-t border-neutral-200 px-4 py-6 dark:border-surface-dark-border sm:px-6">
            <summary className="cursor-pointer text-sm font-semibold">팩터 실험실 · 나만의 조합과 과거 검증</summary>
            <div className="mt-5 space-y-6">
                <p className="text-sm leading-6 text-neutral-500">팩터별 범위와 가중치를 직접 정해 조합하세요. 아래 순위는 현재 발굴 화면에 불러온 {items.length.toLocaleString()}개 종목 안에서 계산합니다. 선택한 지표가 없는 종목은 제외합니다.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rules.map(rule => <fieldset key={rule.key} className="rounded-lg border border-neutral-200 p-3 dark:border-surface-dark-border">
                        <legend className="px-1 text-sm font-medium">{FACTORS.find(f => f.key === rule.key)!.label}</legend>
                        <div className="grid grid-cols-3 gap-2">
                            <label className="text-xs text-neutral-500">가중치<input aria-label={`${rule.key} 가중치`} type="number" min="0" max="100" value={rule.weight} onChange={e => change(rule.key, { weight: Number(e.target.value) })} className={`mt-1 ${inputClass}`} /></label>
                            <label className="text-xs text-neutral-500">최솟값<input aria-label={`${rule.key} 최솟값`} type="number" step="any" value={rule.min ?? ''} onChange={e => change(rule.key, { min: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="없음" className={`mt-1 ${inputClass}`} /></label>
                            <label className="text-xs text-neutral-500">최댓값<input aria-label={`${rule.key} 최댓값`} type="number" step="any" value={rule.max ?? ''} onChange={e => change(rule.key, { max: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="없음" className={`mt-1 ${inputClass}`} /></label>
                        </div>
                        <label className="mt-3 flex items-center gap-2 text-xs text-neutral-500">순위 기준<select aria-label={`${rule.key} 순위 방향`} value={rule.lower ? 'low' : 'high'} onChange={e => change(rule.key, { lower: e.target.value === 'low' })} className="rounded border border-neutral-200 bg-transparent p-1 dark:border-surface-dark-border"><option value="low">낮을수록 우선</option><option value="high">높을수록 우선</option></select></label>
                    </fieldset>)}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={buttonClass} onClick={() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); setNotice('팩터 조합을 이 브라우저에 저장했습니다.'); } catch { setError('브라우저 저장소를 사용할 수 없습니다.'); } }}>조합 저장</button>
                    <button type="button" className={buttonClass} onClick={() => { setRules(DEFAULT_RULES); setNotice('기본 조합으로 변경했습니다.'); }}>기본 조합</button>
                </div>
                {notice && <p role="status" className="text-sm text-brand-ink">{notice}</p>}
                <div>
                    <h3 className="text-sm font-semibold">현재 목록의 팩터 순위 · {ranking.rows.length}개</h3>
                    <p className="mt-2 text-xs leading-6 text-neutral-500">범위 조건은 모두 충족해야 합니다. 점수는 지표별 순위를 0~100으로 바꾸고 가중 평균한 상대값입니다. 동점은 같은 점수를 받습니다. 현재 스캔에 모멘텀 값이 없으면 모멘텀 조합의 순위는 표시하지 않습니다.</p>
                    {ranking.error && <p role="status" className="mt-2 text-sm text-neutral-500">{ranking.error}</p>}
                    <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {ranking.rows.slice(0, topN).map((row, i) => <li key={row.ticker} className="flex justify-between gap-3 rounded border border-neutral-200 p-3 text-sm dark:border-surface-dark-border"><Link href={`/analyze?ticker=${encodeURIComponent(country === 'KR' ? row.name || row.ticker : row.ticker)}`} className="min-w-0 truncate hover:text-brand-ink">{i + 1}. {row.name || row.ticker}</Link><span className="tabular-nums text-neutral-500">{display(row.score)}</span></li>)}
                    </ol>
                </div>
                <section aria-label="과거 팩터 검증" className="border-t border-neutral-200 pt-6 dark:border-surface-dark-border">
                    <h3 className="text-base font-semibold">과거 시점 검증</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">날짜별 가격과 그 시점에 알 수 있었던 재무지표를 담은 CSV를 선택하세요. 파일은 브라우저에서만 계산합니다. 현재 재무지표를 과거 날짜에 복사한 데이터는 사용하지 마세요.</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label className="text-sm">과거 데이터 CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { void readFile(e.target.files?.[0]); e.target.value = ''; }} className="mt-2 block max-w-full text-sm" /></label>
                        <button type="button" className={buttonClass} onClick={() => download('factor-history-template.csv', 'date,available_date,ticker,name,close,pbr,per,roe,ncav_ratio,momentum20,momentum60\n')}>CSV 양식 내려받기</button>
                    </div>
                    <details className="mt-4 text-xs leading-6 text-neutral-500"><summary className="cursor-pointer">CSV 작성 기준</summary><p className="mt-2">date·available_date는 YYYY-MM-DD 형식입니다. date는 가격 기준일, available_date는 그 행의 지표를 알 수 있었던 날짜입니다. 미래에 공개된 지표는 종목 선정에서 제외합니다. close는 0 이상의 가격이며 상장폐지의 확정 정산값이 0이면 0으로 입력합니다. 가격이 누락된 보유 종목이 있으면 계산을 중단합니다. 서로 다른 시장·통화는 한 파일에 섞지 마세요. 각 날짜의 투자 가능 종목과 보유 종목 가격을 모두 포함하고, 배당·분할 반영 여부를 일관되게 맞추세요. 모멘텀 열을 비우면 종목별 과거 종가 관측값으로 20·60기간 변화율(%)을 계산합니다. 직접 넣는 값도 해당 날짜까지의 데이터만 사용해야 합니다. 거래일이 누락되거나 주간 자료이면 기간은 일수가 아닌 관측 개수입니다.</p></details>
                    {isAdmin && <div className="mt-4 flex flex-wrap items-end gap-3">
                        <label className="text-xs text-neutral-500">스캔 시작일<input type="date" value={start} onChange={e => setStart(e.target.value)} className={`mt-1 ${inputClass}`} /></label>
                        <label className="text-xs text-neutral-500">스캔 종료일<input type="date" value={end} onChange={e => setEnd(e.target.value)} className={`mt-1 ${inputClass}`} /></label>
                        <button type="button" className={buttonClass} disabled={busy} onClick={() => void loadSnapshots()}>{busy ? '조회 중…' : '저장된 일간 스캔 불러오기'}</button>
                    </div>}
                    {source && <p className="mt-3 text-xs text-neutral-500">{source} · {historyDates[0]} ~ {historyDates.at(-1)}</p>}
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <label className="text-xs text-neutral-500">보유 종목 수<input type="number" min="1" max="100" value={topN} onChange={e => setTopN(Number(e.target.value))} className={`mt-1 ${inputClass}`} /></label>
                        <label className="text-xs text-neutral-500">리밸런싱 간격 (스냅샷 수)<input type="number" min="1" value={rebalance} onChange={e => setRebalance(Number(e.target.value))} className={`mt-1 ${inputClass}`} /></label>
                        <label className="text-xs text-neutral-500">편도 비용 · 수수료+슬리피지 (bp)<input type="number" min="0" max="500" step="any" value={costBps} onChange={e => setCostBps(Number(e.target.value))} className={`mt-1 ${inputClass}`} /></label>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-neutral-500">이전 스냅샷으로 종목을 선정하고 다음 스냅샷 종가에 동일 비중으로 매매합니다. 1bp는 거래금액의 0.01%입니다. 후보가 없으면 현금으로 보유합니다. 거래 비용은 매수·매도 금액에 각각 적용하며 세금·추가 배당·환율·시장 충격은 별도로 계산하지 않습니다. 저장된 스캔은 수집 범위 내 검증이며 전체 시장 백테스트가 아닙니다.</p>
                    <button type="button" disabled={busy || !history.length} onClick={run} className="mt-4 rounded bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40">과거 검증 실행</button>
                    {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
                    {result && <div className="mt-5 space-y-4">
                        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[['누적 수익률', result.totalReturn], ['연환산 수익률', result.cagr], ['최대 낙폭', result.mdd], ['누적 거래 비용 / 초기자산', result.totalCosts]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 text-base font-semibold tabular-nums">{value == null ? '1년 미만' : `${display(value as number)}%`}</dd></div>)}</dl>
                        <p className="text-xs leading-6 text-neutral-500">거래 발생 {result.trades}회 · 아래 자산 지수는 초기자산을 100으로 표시합니다. 1년 미만 구간은 연환산 수익률을 표시하지 않습니다. 누락 종목·수정 재무·오늘의 구성 종목만 담은 데이터에 의한 편향은 입력 데이터에서 점검해야 합니다.</p>
                        <div className="max-h-72 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">평가일</th><th className="p-2">자산 지수</th><th className="p-2">종목 선정 기준일</th><th className="p-2">보유 종목</th></tr></thead><tbody>{result.curve.map(point => <tr key={point.date} className="border-t border-neutral-200 dark:border-surface-dark-border"><td className="p-2 whitespace-nowrap">{point.date}</td><td className="p-2 tabular-nums">{display(point.value * 100)}</td><td className="p-2 whitespace-nowrap">{point.signalDate || '—'}</td><td className="p-2 break-all">{point.holdings.join(', ') || '현금'}</td></tr>)}</tbody></table></div>
                        <a className="inline-block text-xs text-brand-ink hover:underline" href="https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/backtesting-and-simulation" target="_blank" rel="noreferrer">백테스트의 편향과 한계 참고</a>
                    </div>}
                </section>
            </div>
        </details>
    );
}
