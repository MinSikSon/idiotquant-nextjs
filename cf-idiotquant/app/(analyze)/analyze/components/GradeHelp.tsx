'use client';

import * as Popover from '@radix-ui/react-popover';
import { HelpCircle, X } from 'lucide-react';

const GRADE_RANGES = [
  ['SSS', '+200% 이상'],
  ['SS', '+150% 이상 ~ +200% 미만'],
  ['S', '+100% 이상 ~ +150% 미만'],
  ['A', '+50% 이상 ~ +100% 미만'],
  ['B', '0% 이상 ~ +50% 미만'],
  ['F', '0% 미만'],
];

export function GradeHelp({ grade, upside }: { grade: string; upside: number }) {
  const knownGrade = GRADE_RANGES.some(([label]) => label === grade);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${grade} 등급 산정 기준 보기`}
          className="inline-flex min-h-8 items-center gap-1 rounded border border-neutral-200 px-1.5 py-0.5 font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-surface-dark-border dark:text-neutral-300 dark:hover:bg-surface-dark-muted"
        >
          {grade}
          <HelpCircle size={12} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="등급 산정 기준"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[100] w-80 max-w-[calc(100vw-24px)] max-h-[min(32rem,80dvh)] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 text-[13px] leading-relaxed text-neutral-600 shadow-xl dark:border-border-subtle-dark dark:bg-surface-dark-card dark:text-neutral-300"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-neutral-900 dark:text-white">등급 산정 기준</h3>
            <Popover.Close aria-label="등급 설명 닫기" className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-surface-dark-muted">
              <X size={14} aria-hidden="true" />
            </Popover.Close>
          </div>
          <p className="mt-2">순유동자산(NCAV)은 유동자산에서 총부채를 뺀 값입니다. 등급은 이 값이 현재 주가에 비해 얼마나 큰지 나타냅니다.</p>
          <p className="mt-2 rounded-lg bg-neutral-50 p-2 dark:bg-surface-dark-muted">
            주당 NCAV = (유동자산 − 총부채) ÷ 발행주식수<br />
            업사이드(%) = (주당 NCAV ÷ 현재가 − 1) × 100
          </p>
          <p className="mt-2">
            {knownGrade && Number.isFinite(upside)
              ? `이 종목의 NCAV 업사이드는 ${upside >= 0 ? '+' : ''}${upside.toFixed(2)}%로, ${grade} 등급입니다.`
              : '등급을 계산하는 데 필요한 데이터가 없어 등급을 표시할 수 없습니다.'}
          </p>
          <table className="mt-3 w-full text-left">
            <caption className="sr-only">NCAV 업사이드별 등급 구간</caption>
            <thead><tr><th scope="col" className="pb-1">등급</th><th scope="col" className="pb-1">NCAV 업사이드</th></tr></thead>
            <tbody>
              {GRADE_RANGES.map(([label, range]) => (
                <tr key={label} aria-current={label === grade ? 'true' : undefined} className={label === grade ? 'bg-neutral-100 font-semibold text-neutral-900 dark:bg-surface-dark-muted dark:text-white' : ''}>
                  <th scope="row" className="px-2 py-1 font-mono">{label}</th>
                  <td className="px-2 py-1">{range}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">수익성·성장성·상장폐지 위험은 반영하지 않습니다. 업사이드는 자산가치와의 비교값이며, 실제 주가 상승을 예측하는 수익률은 아닙니다.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
