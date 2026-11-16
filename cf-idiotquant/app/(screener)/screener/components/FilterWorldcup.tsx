'use client';

import { useRef, useState } from 'react';
import { worldcupFilters, worldcupRounds, type WorldcupAnswer, type WorldcupFilters } from '../worldcup';

const buttonClass = 'min-h-11 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-surface-dark-border disabled:opacity-40';

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
        heading.current?.focus();
    };
    const choose = (answer: WorldcupAnswer) => {
        setAnswers(previous => { const result = [...previous]; result[step] = answer; return result; });
        next(step + 1);
    };

    return <section aria-label="내 투자 기준 월드컵" className="min-w-0 py-5 sm:py-6">
        <p className="text-xs font-semibold text-brand-ink">내 투자 기준 월드컵</p>
        <h2 ref={heading} tabIndex={-1} className="mt-1 text-xl font-semibold tracking-tight focus:outline-none sm:text-2xl">
            {done ? '내가 고른 이유가, 필터가 됩니다.' : '둘 중, 어떤 쪽을 더 살펴볼까요?'}
        </h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{done ? '선택한 조건을 확인한 뒤 적용하세요. 적용 전까지 현재 목록은 바뀌지 않습니다.' : '어려운 필터 설정 대신, 네 번의 비교로 시작하세요.'}</p>

        {!done ? <>
            <div className="mb-2 mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span>비교 {step + 1} / {rounds.length} · {round.label}</span><span>정답도, 우승 종목도 없습니다</span>
            </div>
            <div role="progressbar" aria-label="완료한 비교" aria-valuemin={0} aria-valuemax={rounds.length} aria-valuenow={step} className="h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div className="h-full bg-brand" style={{ width: `${step / rounds.length * 100}%` }} />
            </div>
            <div className="my-5 text-center" aria-live="polite">
                <h3 className="text-lg font-semibold">{round.question}</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{round.context}</p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-stretch gap-1 sm:gap-3">
                {(['a', 'b'] as const).map((choice, index) => <div key={choice} className="contents">
                    {index === 1 && <span className="self-center text-center text-xs text-neutral-400" aria-hidden="true">VS</span>}
                    <button type="button" disabled={choice === 'a' && step === 3 && !hasTradingAmount} onClick={() => choose(choice)}
                        className="group flex min-w-0 flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-brand hover:bg-brand-light/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-surface-dark-border dark:bg-surface-dark-card dark:hover:border-brand dark:hover:bg-brand-muted/20 sm:p-4">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-sm font-semibold text-brand-ink dark:bg-brand-muted/30">{choice.toUpperCase()}</span>
                        <span className="text-base font-semibold sm:text-lg">{round[choice].title}</span>
                        <span className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{round[choice].description}</span>
                        <span className="mt-auto border-t border-neutral-200 pt-3 dark:border-surface-dark-border">
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400">발굴에 적용할 조건</span>
                            <span className="mt-1 block text-sm font-semibold sm:text-base">{round[choice].value}</span>
                        </span>
                        <span className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{round[choice].tradeoff}</span>
                        <span className="rounded-lg bg-brand-light px-1 py-2 text-center text-xs font-semibold text-brand-ink dark:bg-brand-muted/30">이쪽을 선택할게요</span>
                    </button>
                </div>)}
            </div>
            {step === 3 && !hasTradingAmount && <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400" role="status">{loading ? '거래대금 자료를 확인하고 있습니다.' : '현재 목록에 거래대금 자료가 없어 하한 선택을 사용할 수 없습니다.'}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button type="button" className={buttonClass} disabled={step === 0} onClick={() => next(step - 1)}>← 이전 비교</button>
                <button type="button" className={buttonClass} onClick={() => choose('unknown')}>아직 모르겠어요</button>
                <button type="button" className={buttonClass} onClick={() => choose('neither')}>둘 다 마음에 안 들어요</button>
            </div>
        </> : <>
            <dl className="mt-5 divide-y divide-neutral-200 dark:divide-surface-dark-border">
                {rounds.map((item, index) => {
                    const answer = effectiveAnswers[index];
                    return <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <dt className="text-sm">{item.label}</dt>
                        <dd className="col-start-1 text-sm font-semibold text-brand-ink sm:col-auto">{answer === 'a' || answer === 'b' ? item[answer].value : answer === 'neither' ? '두 선택지 모두 거절 · 미적용' : '미정 · 미적용'}</dd>
                        <dd className="col-start-2 row-start-1 row-end-3 sm:col-auto sm:row-auto"><button type="button" className={buttonClass} onClick={() => next(index)}>다시 고르기</button></dd>
                    </div>;
                })}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{unknownCount > 0 ? `미정인 ${unknownCount}개 기준은 적용하지 않습니다. 기존의 해당 필터도 해제됩니다.` : '선택한 네 조건을 모두 적용합니다.'} 기존 전략·검색·관심종목과 나머지 필터는 유지됩니다.</p>
            <p className="mt-3 text-sm" aria-live="polite">{loading ? '스캔 데이터를 불러오는 중입니다.' : `현재 목록과 나머지 조건에 적용하면 ${previewCount(proposed)}종목입니다.`}</p>
            {proposed.minTrAmt > 0 && country === 'KR' && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">거래대금이 누락된 국내 종목은 기존 필터 기준에 따라 목록에 남을 수 있습니다.</p>}
            <div className="mt-4 flex flex-wrap justify-between gap-2">
                <button type="button" className={buttonClass} onClick={() => { setAnswers([]); next(0); }}>처음부터 다시 고르기</button>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={buttonClass} onClick={onManual}>기존 필터 직접 설정</button>
                    <button type="button" disabled={loading} onClick={() => onApply(proposed)} className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-40">이 조건 적용하고 후보 보기 →</button>
                </div>
            </div>
        </>}
        <p className="mt-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">PER·PBR 수치는 탐색을 시작하기 위한 기준입니다. 적용 후 기존 필터에서 직접 수정할 수 있습니다.</p>
    </section>;
}
