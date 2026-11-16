'use client';

import { useRef, useState } from 'react';
import { worldcupFilters, worldcupRounds, type WorldcupAnswer, type WorldcupFilters } from '../worldcup';

export function FilterWorldcup({ country, hasTradingAmount, loading, previewCount, onApply, onManual }: {
    country: 'KR' | 'US';
    hasTradingAmount: boolean;
    loading: boolean;
    previewCount: (filters: WorldcupFilters) => number;
    onApply: (filters: WorldcupFilters) => void;
    onManual: () => void;
}) {
    const [answers, setAnswers] = useState<WorldcupAnswer[]>([]);
    const [step, setStep] = useState(0);
    const heading = useRef<HTMLHeadingElement>(null);
    const rounds = worldcupRounds(country);
    const done = step === rounds.length;
    const round = rounds[step];
    // 데이터가 사라졌다면 이전의 거래대금 선택을 몰래 적용하지 않는다.
    const effectiveAnswers = answers.map((answer, index) => index === 3 && !hasTradingAmount ? 'unknown' as const : answer);
    const proposed = worldcupFilters(effectiveAnswers, country);
    const unknownCount = rounds.filter((_, index) => !['a', 'b'].includes(effectiveAnswers[index])).length;
    const next = (index: number) => {
        setStep(index);
        heading.current?.focus({ preventScroll: true });
        heading.current?.scrollIntoView({ block: 'nearest' });
    };
    const choose = (answer: WorldcupAnswer) => {
        setAnswers(previous => { const result = [...previous]; result[step] = answer; return result; });
        next(step + 1);
    };

    return <section aria-label="내 투자 기준 월드컵" className="mx-auto max-w-2xl min-w-0 pb-8 pt-4 sm:pb-12 sm:pt-7">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold">
            <p className="text-brand-ink">내 투자 기준 월드컵</p>
            <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{done ? '선택 완료' : `${step + 1} / ${rounds.length}`}</span>
        </div>
        <div role="progressbar" aria-label="완료한 비교" aria-valuemin={0} aria-valuemax={rounds.length} aria-valuenow={step} className="mt-3 flex gap-1.5">
            {rounds.map((item, index) => <span key={item.label} className={`h-1 flex-1 rounded-full ${index < step ? 'bg-brand-ink' : index === step ? 'bg-brand-ink/40' : 'bg-neutral-200 dark:bg-neutral-700'}`} />)}
        </div>
        <h2 ref={heading} tabIndex={-1} className="mb-5 mt-6 scroll-mt-[calc(var(--navigation-h,48px)+16px)] text-balance break-keep text-2xl font-bold leading-snug tracking-tight focus:outline-none sm:mb-7 sm:text-3xl">
            {done ? '나의 투자 기준이 완성됐어요.' : round.question}
        </h2>

        {!done ? <>
            <div className="grid gap-3">
                {(['a', 'b'] as const).map(choice => <button key={`${step}-${choice}`} type="button"
                    aria-label={`선택 ${choice.toUpperCase()}: ${round[choice].title}`}
                    disabled={choice === 'a' && step === 3 && !hasTradingAmount}
                    aria-pressed={effectiveAnswers[step] === choice}
                    onClick={() => choose(choice)}
                    className={`group flex min-w-0 items-center gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-surface-dark-card sm:p-6 ${effectiveAnswers[step] === choice
                        ? 'border-brand-ink bg-brand-light/60 dark:bg-brand-muted/30'
                        : 'border-neutral-200 bg-white hover:border-brand-ink hover:bg-brand-light/40 dark:border-surface-dark-border dark:bg-surface-dark-card dark:hover:border-brand-ink dark:hover:bg-brand-muted/20'}`}>
                    <span className="min-w-0 flex-1">
                        <span className="block text-lg font-bold tracking-tight sm:text-xl">{round[choice].title}</span>
                        <span className="mt-1.5 block text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{round[choice].description}</span>
                        <span className="mt-3 block text-xs font-semibold text-brand-ink">{round[choice].value}</span>
                    </span>
                    <span aria-hidden="true" className="text-xl text-neutral-400 group-hover:text-brand-ink">↗</span>
                </button>)}
            </div>
            {step === 3 && !hasTradingAmount && <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400" role="status">{loading ? '거래대금 자료를 확인하고 있습니다.' : '거래대금 자료가 없어 하한 조건을 선택할 수 없습니다.'}</p>}
            <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" className="min-h-11 px-1 text-sm text-neutral-500 focus-visible:outline-brand-ink disabled:opacity-30 dark:text-neutral-400" disabled={step === 0} onClick={() => next(step - 1)}>← 이전 비교</button>
                <button type="button" className="min-h-11 px-1 text-sm font-medium text-neutral-600 hover:text-brand-ink focus-visible:outline-brand-ink dark:text-neutral-300" onClick={() => choose('unknown')}>모르겠어요 · 건너뛰기 →</button>
            </div>
            <details key={step} className="mt-3 border-t border-neutral-200 dark:border-surface-dark-border">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs text-neutral-500 focus-visible:outline-brand-ink dark:text-neutral-400">선택 기준 자세히 <span aria-hidden="true">＋</span></summary>
                <div className="pb-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                    <p>{round.context}</p>
                    {(['a', 'b'] as const).map(choice => <p key={choice} className="mt-3"><strong className="font-medium text-neutral-700 dark:text-neutral-200">{round[choice].title}</strong> · {round[choice].tradeoff}</p>)}
                </div>
            </details>
        </> : <>
            <dl className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-surface-dark-border dark:border-surface-dark-border">
                {rounds.map((item, index) => {
                    const answer = effectiveAnswers[index];
                    return <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3">
                        <dt className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</dt>
                        <dd className="col-start-1 mt-1 text-sm font-semibold">{answer === 'a' || answer === 'b' ? item[answer].value : answer === 'neither' ? '미적용' : '미정 · 미적용'}</dd>
                        <dd className="col-start-2 row-start-1 row-end-3"><button type="button" className="min-h-11 shrink-0 px-2 text-xs font-medium text-brand-ink focus-visible:outline-brand-ink" aria-label={`${item.label} 다시 고르기`} onClick={() => next(index)}>변경</button></dd>
                    </div>;
                })}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{unknownCount > 0 ? `미정인 ${unknownCount}개 기준은 적용하지 않습니다. 기존의 해당 필터도 해제됩니다.` : '선택한 네 조건을 모두 적용합니다.'} 나머지 필터는 유지됩니다.</p>
            <div className="my-5 rounded-2xl bg-brand-light/50 p-5 dark:bg-brand-muted/20" aria-live="polite">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">현재 목록에 이 기준을 적용하면</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">{loading ? '데이터 확인 중…' : `${previewCount(proposed)}종목`}</p>
            </div>
            {proposed.minTrAmt > 0 && country === 'KR' && <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">거래대금이 누락된 국내 종목은 기존 필터 기준에 따라 목록에 남을 수 있습니다.</p>}
            <button type="button" disabled={loading} onClick={() => onApply(proposed)} className="min-h-12 w-full rounded-xl bg-brand-ink px-4 py-3 text-sm font-semibold text-white hover:bg-brand-ink-hover dark:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-40">이 조건 적용하고 후보 보기 →</button>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <button type="button" className="min-h-11 text-xs text-neutral-500 focus-visible:outline-brand-ink dark:text-neutral-400" onClick={() => { setAnswers([]); next(0); }}>처음부터 다시 고르기</button>
                <button type="button" className="min-h-11 text-xs text-neutral-500 focus-visible:outline-brand-ink dark:text-neutral-400" onClick={onManual}>기존 필터 직접 설정</button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">PER·PBR은 탐색을 시작하는 기준입니다. 적용 후 직접 수정할 수 있습니다.</p>
        </>}
    </section>;
}
