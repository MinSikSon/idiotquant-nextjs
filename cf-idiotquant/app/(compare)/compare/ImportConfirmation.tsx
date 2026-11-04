'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { startImportCountdown } from '@/lib/features/compare/import';
import { PAGE_ACTION_CLS, PAGE_PRIMARY_ACTION_CLS } from '@/components/pageHeader';
import styles from './ImportConfirmation.module.css';

export default function ImportConfirmation({ limit, onDecision }: {
  limit: number; onDecision: (replace: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const decided = useRef(false);
  const [seconds, setSeconds] = useState(5);
  const callback = useRef(onDecision);
  useEffect(() => { callback.current = onDecision; }, [onDecision]);
  const decide = useCallback((replace: boolean) => {
    if (decided.current) return;
    decided.current = true;
    callback.current(replace);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const stop = startImportCountdown(setSeconds, () => decide(true));
    return () => { stop(); element?.close(); };
  }, [decide]);

  return <dialog ref={dialog} aria-labelledby="import-confirm-title" aria-describedby="import-confirm-description"
    onCancel={event => { event.preventDefault(); decide(false); }}
    onClick={event => { if (event.target === dialog.current) decide(false); }}
    className="fixed inset-0 m-auto w-[calc(100%_-_32px)] max-w-md rounded-2xl border border-neutral-200 bg-surface-canvas p-5 text-neutral-900 shadow-xl backdrop:bg-black/50 dark:border-neutral-700 dark:bg-surface-dark-card dark:text-neutral-100">
    <h2 id="import-confirm-title" className="text-base font-semibold">새 목록으로 바꿀까요?</h2>
    <p id="import-confirm-description" className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
      한도({limit}개) 초과로 기존 종목·날짜가 지워집니다.
    </p>
    <div className="mt-4">
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">{seconds}초 후 자동 교체</p>
      <div role="progressbar" aria-label="자동 교체까지 남은 시간" aria-valuemin={0} aria-valuemax={5} aria-valuenow={seconds} aria-valuetext={`${seconds}초 남음`}
        className="h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div className={`${styles.countdown} h-full rounded-full bg-brand dark:bg-[#a15669]`} />
      </div>
    </div>
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" autoFocus onClick={() => decide(false)} className={PAGE_ACTION_CLS}>취소</button>
      <button type="button" onClick={() => decide(true)} className={PAGE_PRIMARY_ACTION_CLS}>교체</button>
    </div>
  </dialog>;
}
