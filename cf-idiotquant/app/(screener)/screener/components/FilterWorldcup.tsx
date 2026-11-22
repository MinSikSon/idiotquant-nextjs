'use client';

import { useEffect, useRef, useState } from 'react';
import { worldcupCode, worldcupFilters, worldcupRounds, type WorldcupAnswer, type WorldcupFilters } from '../worldcup';

import styles from './worldcup.module.css';

export function FilterWorldcup({ initialAnswers = [], country, hasTradingAmount, loading, previewCount, onApply, onManual, onSharePathChange }: {
    initialAnswers?: WorldcupAnswer[];
    country: 'KR' | 'US';
    hasTradingAmount: boolean;
    loading: boolean;
    previewCount: (filters: WorldcupFilters) => number;
    onApply: (filters: WorldcupFilters, answers: WorldcupAnswer[]) => void;
    onManual: () => void;
    onSharePathChange: (path?: string) => void;
}) {
    const [answers, setAnswers] = useState<WorldcupAnswer[]>(initialAnswers);
    const [step, setStep] = useState(initialAnswers.length === 4 ? 4 : 0);
    const heading = useRef<HTMLHeadingElement>(null);
    const previousStep = useRef(step);
    const rounds = worldcupRounds(country);
    const done = step === rounds.length;
    const round = rounds[step];
    // 데이터가 사라졌다면 이전의 거래대금 선택을 몰래 적용하지 않는다.
    const effectiveAnswers = answers.map((answer, index) => index === 3 && !hasTradingAmount ? 'unknown' as const : answer);
    const proposed = worldcupFilters(effectiveAnswers, country);
    const shareCode = done ? worldcupCode(country, effectiveAnswers) : null;
    useEffect(() => {
        onSharePathChange(shareCode ? `/screener?w=${shareCode}` : undefined);
        return () => onSharePathChange(undefined);
    }, [onSharePathChange, shareCode]);
    const unknownCount = rounds.filter((_, index) => !['a', 'b'].includes(effectiveAnswers[index])).length;
    useEffect(() => {
        if (previousStep.current === step) return;
        previousStep.current = step;
        heading.current?.focus({ preventScroll: true });
    }, [step]);
    const choose = (answer: WorldcupAnswer) => {
        setAnswers(previous => { const result = [...previous]; result[step] = answer; return result; });
        setStep(step + 1);
    };

    return <section aria-label="내 투자 기준 월드컵" className={styles.worldcup}>
        <div className={styles.header}>
            <p>투자 기준 월드컵</p>
            <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{country === 'US' ? '미국' : '국내'} · {done ? '선택 완료' : `${step + 1} / ${rounds.length}`}</span>
        </div>
        <nav aria-label="월드컵 진행 단계" className={styles.steps}>
            {rounds.map((item, index) => <button key={item.label} type="button" disabled={index > answers.length}
                aria-current={!done && index === step ? 'step' : undefined} onClick={() => setStep(index)}
                className={styles.step} data-complete={index < answers.length}>
                <span className="sr-only">{item.label} · {index < answers.length ? '선택 완료 · 다시 고르기' : `${index + 1}단계`}</span>
            </button>)}
        </nav>
        {!done ? <>
            <div className={styles.stage}>
                <h2 ref={heading} tabIndex={-1} className={styles.question}>{round.question}</h2>
                <div className={styles.choices} key={step}>
                    {(['a', 'b'] as const).map(choice => <button key={`${step}-${choice}`} type="button"
                        aria-label={`선택 ${choice.toUpperCase()}: ${round[choice].title}`}
                        disabled={choice === 'a' && step === 3 && !hasTradingAmount}
                        aria-pressed={effectiveAnswers[step] === choice}
                        onClick={() => choose(choice)}
                        className={styles.choice}>
                        <span className={styles.choiceArt} aria-hidden="true" style={{ backgroundPosition: `${((step % 2) * 2 + (choice === 'b' ? 1 : 0)) * 100 / 3}% ${step < 2 ? 0 : 100}%` }} />
                        <span className={styles.choiceCaption}>
                            <span className={styles.choiceTitle}>{round[choice].title}</span>
                            {effectiveAnswers[step] === choice && <span className={styles.choiceIndicator} aria-hidden="true">✓</span>}
                        </span>
                    </button>)}
                </div>
            </div>
            {step === 3 && !hasTradingAmount && <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400" role="status">{loading ? '거래대금 자료를 확인하고 있습니다.' : '거래대금 자료가 없어 하한 조건을 선택할 수 없습니다.'}</p>}
            <div className={styles.controls}>
                <button type="button" className={styles.back} disabled={step === 0} onClick={() => setStep(step - 1)}><span aria-hidden="true">↶</span><span className="sr-only">← 이전 비교</span></button>
                <button type="button" className={styles.skip} onClick={() => choose('unknown')}>건너뛰기</button>
            </div>
            <details key={step} className="mt-3 border-t border-neutral-200 dark:border-surface-dark-border">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs text-neutral-500 focus-visible:outline-brand-ink dark:text-neutral-400">선택 기준 자세히 <span aria-hidden="true">＋</span></summary>
                <p className="pb-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{round.context}</p>
            </details>
        </> : <>
            <h2 ref={heading} tabIndex={-1} className={styles.question}>적용할 필터</h2>
            <dl className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-surface-dark-border dark:border-surface-dark-border">
                {rounds.map((item, index) => {
                    const answer = effectiveAnswers[index];
                    return <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3">
                        <dt className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</dt>
                        <dd className="col-start-1 mt-1 text-sm font-semibold">{answer === 'a' || answer === 'b' ? item[answer].value : answer === 'neither' ? '미적용' : '미정 · 미적용'}</dd>
                        <dd className="col-start-2 row-start-1 row-end-3"><button type="button" className="min-h-11 shrink-0 px-2 text-xs font-medium text-brand-ink focus-visible:outline-brand-ink" aria-label={`${item.label} 다시 고르기`} onClick={() => setStep(index)}>변경</button></dd>
                    </div>;
                })}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{unknownCount > 0 ? `미정인 ${unknownCount}개 기준은 적용하지 않습니다. 기존의 해당 필터도 해제됩니다.` : '선택한 네 조건을 모두 적용합니다.'} 나머지 필터는 유지됩니다.</p>
            <div className="my-4 rounded-lg bg-brand-light/50 p-4 dark:bg-brand-muted/20" aria-live="polite">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">현재 목록에 이 기준을 적용하면</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">{loading ? '데이터 확인 중…' : `${previewCount(proposed)}종목`}</p>
            </div>
            {proposed.minTrAmt > 0 && country === 'KR' && <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">거래대금 자료가 없는 국내 종목은 하한을 적용해도 목록에 남을 수 있습니다.</p>}
            <button type="button" disabled={loading} onClick={() => onApply(proposed, effectiveAnswers)} className="service-button min-h-12 w-full bg-brand-ink px-4 py-3 text-sm font-semibold text-white hover:bg-brand-ink-hover dark:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink disabled:opacity-40">필터 적용</button>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <button type="button" className="min-h-11 text-xs text-neutral-500 focus-visible:outline-brand-ink dark:text-neutral-400" onClick={() => { setAnswers([]); setStep(0); }}>처음부터 다시 고르기</button>
                <button type="button" className="min-h-11 text-xs text-neutral-500 focus-visible:outline-brand-ink dark:text-neutral-400" onClick={onManual}>직접 필터 설정</button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">적용한 조건은 필터에서 수정할 수 있습니다.</p>
        </>}
    </section>;
}
