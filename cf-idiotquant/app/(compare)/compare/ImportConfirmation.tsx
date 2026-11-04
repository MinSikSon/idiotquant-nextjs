'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { startImportCountdown } from '@/lib/features/compare/import';

export default function ImportConfirmation({ existingCount, incomingCount, limit, onDecision }: {
  existingCount: number; incomingCount: number; limit: number; onDecision: (replace: boolean) => void;
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
    <h2 id="import-confirm-title" className="text-base font-semibold">기존 비교 종목을 지울까요?</h2>
    <p id="import-confirm-description" className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
      기존 {existingCount}개에 새 종목 {incomingCount}개를 추가하면 최대 {limit}개를 넘습니다. 기존 비교 목록과 날짜를 지우고 발굴 결과를 가져옵니다.
    </p>
    <p role="status" className="mt-3 text-sm font-medium text-brand-ink">{seconds}초 후 자동으로 동의하고 가져옵니다.</p>
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" autoFocus onClick={() => decide(false)} className="min-h-11 rounded-xl border border-neutral-300 px-4 text-sm font-semibold dark:border-neutral-600">취소 · 기존 목록 유지</button>
      <button type="button" onClick={() => decide(true)} className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white">기존 목록 지우고 가져오기</button>
    </div>
  </dialog>;
}
