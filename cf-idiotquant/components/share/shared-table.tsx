'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sharedStockAnalysisHref } from '@/lib/share/navigation';
import { PAGE_ACTION_CLS } from '@/components/pageHeader';
import type { SnapshotTable } from '@/lib/share/snapshot';
import { snapshotNumber, snapshotStockName } from '@/lib/share/presentation';

export const SHARE_CARD =
  'rounded-2xl border border-neutral-200 bg-white dark:border-border-subtle-dark dark:bg-surface-dark-card';

export function StoredValue({ value }: { value: string }) {
  const parts = value.split(' · ');
  return (
    <>
      {parts.map((part, index) => {
        const numeric = part.endsWith('%') ? snapshotNumber(part) : null;
        return (
          <span
            key={index}
            className={`block ${index ? 'mt-1 text-[11px] font-normal text-neutral-500 dark:text-neutral-400' : ''} ${numeric !== null ? (numeric > 0 ? 'text-rose-600 dark:text-rose-400' : numeric < 0 ? 'text-blue-600 dark:text-blue-400' : '') : ''}`}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

export function SharedTable({
  table,
  title = true,
  stockColumn = false,
}: {
  table: SnapshotTable;
  title?: boolean;
  stockColumn?: boolean;
}) {
  const [visible, setVisible] = useState(50);
  return (
    <section aria-label={table.title}>
      {title && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{table.title}</h2>
          <span className="text-xs text-neutral-500">
            {table.rows.length.toLocaleString()}개 항목
          </span>
        </div>
      )}
      <div className={`${SHARE_CARD} overflow-x-auto`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-[#fcfaf7] dark:border-border-subtle-dark dark:bg-surface-dark-canvas">
              {table.columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 ${index === 0 ? 'sticky left-0 z-10 min-w-36 bg-[#fcfaf7] dark:bg-surface-dark-canvas' : 'min-w-24'}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.slice(0, visible).map((row, index) => (
              <tr
                key={index}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-surface-dark-hover"
              >
                {row.map((value, column) => {
                  const stock =
                    stockColumn && column === 0
                      ? snapshotStockName(value)
                      : null;
                  return column === 0 ? (
                    <th
                      key={column}
                      scope="row"
                      className="sticky left-0 z-10 bg-white px-4 py-4 text-left align-top font-semibold dark:bg-surface-dark-card"
                    >
                      <span className="block w-32 break-words sm:w-44">
                        {stock?.name ?? value}
                      </span>
                      {stock?.code && (
                        <span className="mt-1 block text-xs font-normal text-neutral-500">
                          {stock.code}
                        </span>
                      )}
                      {stock && (
                        <Link
                          href={sharedStockAnalysisHref(value)}
                          prefetch={false}
                          className="mt-2 inline-flex min-h-9 items-center text-xs font-medium text-brand-ink"
                        >
                          최신 분석 보기 →
                        </Link>
                      )}
                    </th>
                  ) : (
                    <td
                      key={column}
                      className="px-4 py-4 align-top font-medium tabular-nums"
                    >
                      <span className="block max-w-md whitespace-pre-wrap break-words">
                        <StoredValue value={value} />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible < table.rows.length && (
        <button
          type="button"
          onClick={() => setVisible((count) => count + 100)}
          className={`${PAGE_ACTION_CLS} mt-3`}
        >
          더 보기 ({table.rows.length - visible}개 남음)
        </button>
      )}
    </section>
  );
}
