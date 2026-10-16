'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { sharedStockAnalysisHref } from '@/lib/share/navigation';
import { ChevronDown, LayoutGrid, List } from 'lucide-react';
import LineChart from '@/components/LineChart';
import { FinancialBars } from '@/app/(search)/search/components/FinancialBars';
import GrowthChart from '@/app/(calculator)/calculator/GrowthChart';
import { PAGE_ACTION_CLS } from '@/components/pageHeader';
import {
  ANALYSIS_TABS,
  analysisTableTab,
  snapshotGrowthRows,
  snapshotPriceSeries,
  snapshotFinancialModel,
  snapshotStockName,
  type AnalysisTab,
} from '@/lib/share/presentation';
import type { ResultSnapshot, SnapshotTable } from '@/lib/share/snapshot';
import { SHARE_CARD, SharedTable, StoredValue } from './shared-table';

function Metrics({ rows, columns = 4 }: { rows: string[][]; columns?: 3 | 4 }) {
  return (
    <dl
      className={`grid grid-cols-2 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}
    >
      {rows.map(([label, value], index) => (
        <div
          key={index}
          className="min-w-0 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800 sm:py-4"
        >
          <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {label}
          </dt>
          <dd className="mt-1 break-words text-lg font-semibold tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function Section({
  tag,
  title,
  children,
}: {
  tag: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 mt-6 sm:mt-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            {tag}
          </span>
          <div className="h-px flex-1 bg-neutral-200 dark:bg-border-subtle-dark" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ScreenerView({ snapshot }: { snapshot: ResultSnapshot }) {
  const [view, setView] = useState<'card' | 'table'>(() =>
    new URL(snapshot.sourcePath, 'https://idiotquant.com').searchParams.get(
      'view'
    ) === 'table'
      ? 'table'
      : 'card'
  );
  const [visible, setVisible] = useState(30);
  const table = snapshot.tables[0];
  const conditions =
    snapshot.notes
      .find((note) => note.startsWith('적용 조건:'))
      ?.slice(6)
      .split(' · ')
      .filter(Boolean) ?? [];
  if (!table) return null;
  return (
    <>
      <div className="mb-5 border-b border-neutral-200 pb-4 dark:border-border-subtle-dark">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">
              {snapshot.summary.find((item) => item.label === '시장')?.value ??
                '발굴'}{' '}
              종목
            </span>
            <span className="text-neutral-500">
              {table.rows.length.toLocaleString()}개
            </span>
          </div>
          <div
            role="group"
            aria-label="발굴 결과 보기 방식"
            className="flex gap-1"
          >
            {(
              [
                ['card', '카드', LayoutGrid],
                ['table', '목록', List],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={`${PAGE_ACTION_CLS} ${view === key ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white' : ''}`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
        {conditions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {conditions.map((condition, index) => (
              <span
                key={index}
                className="rounded-full border border-brand-light-hover bg-brand-light px-2.5 py-1 text-[11px] font-medium text-brand-ink dark:border-brand/40 dark:bg-brand-muted/30"
              >
                {condition}
              </span>
            ))}
          </div>
        )}
      </div>
      {view === 'table' ? (
        <SharedTable table={table} title={false} stockColumn />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {table.rows.slice(0, visible).map((row, index) => {
              const stock = snapshotStockName(row[0]);
              const metricColumns = table.columns.map((label, at) => ({
                label,
                value: row[at],
                at,
              }));
              const metrics = metricColumns.filter((column) =>
                ['NCAV 배수', 'PBR', 'PER', 'ROE'].includes(column.label)
              );
              const price = metricColumns.find(
                (column) => column.label === '현재가'
              );
              const extra = metricColumns.filter(
                (column) =>
                  column.at > 0 &&
                  !['현재가', 'NCAV 배수', 'PBR', 'PER', 'ROE'].includes(
                    column.label
                  )
              );
              return (
                <article
                  key={index}
                  className={`${SHARE_CARD} overflow-hidden`}
                >
                  <div className="p-4">
                    <h2 className="text-sm font-semibold">{stock.name}</h2>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      {stock.code}
                    </p>
                    {price && (
                      <p className="mt-3 text-xl font-semibold tabular-nums">
                        {price.value}
                      </p>
                    )}
                  </div>
                  <dl className="grid grid-cols-4 border-y border-neutral-100 bg-surface-canvas/60 px-2 py-3 dark:border-neutral-800 dark:bg-surface-dark-canvas/50">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="min-w-0 px-1 text-center"
                      >
                        <dt className="text-[10px] text-neutral-500">
                          {metric.label}
                        </dt>
                        <dd className="mt-1 break-words text-xs font-semibold tabular-nums">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <dl className="space-y-2 p-4">
                    {extra.map((column) => (
                      <div
                        key={column.at}
                        className="flex items-start justify-between gap-3"
                      >
                        <dt className="shrink-0 text-[11px] text-neutral-500">
                          {column.label}
                        </dt>
                        <dd className="text-right text-xs font-medium tabular-nums">
                          {column.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="border-t border-neutral-100 px-4 py-2 dark:border-neutral-800">
                    <Link
                      href={sharedStockAnalysisHref(row[0])}
                      prefetch={false}
                      className="inline-flex min-h-9 items-center text-xs font-medium text-brand-ink"
                    >
                      이 종목의 최신 분석 보기 →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          {visible < table.rows.length && (
            <button
              type="button"
              className={`${PAGE_ACTION_CLS} mx-auto mt-6 flex`}
              onClick={() => setVisible((count) => count + 30)}
            >
              더 보기 ({table.rows.length - visible}개 남음)
            </button>
          )}
        </>
      )}
      {snapshot.tables.slice(1).map((table, index) => (
        <div key={index} className="mt-6">
          <SharedTable table={table} />
        </div>
      ))}
    </>
  );
}

function CompareView({ snapshot }: { snapshot: ResultSnapshot }) {
  const table = snapshot.tables[0];
  const statistics = snapshot.tables.find(
    (table) => table.title === '날짜별 주가 변화율 통계'
  );
  const dates =
    table?.columns.filter((column) =>
      /^\d{4}-\d{2}-\d{2} 종가$/.test(column)
    ) ?? [];
  return (
    <>
      {dates.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" aria-label="비교 날짜">
          {dates.map((date) => (
            <span
              key={date}
              className={`${SHARE_CARD} px-3 py-2 text-xs font-medium`}
            >
              {date.replace(' 종가', '')}
            </span>
          ))}
        </div>
      )}
      {statistics && (
        <section className="mb-6" aria-label={statistics.title}>
          <h2 className="mb-3 text-base font-semibold">{statistics.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {statistics.rows.map((row, index) => (
              <div key={index} className={`${SHARE_CARD} p-4`}>
                <p className="text-xs text-neutral-500">{row[0]}</p>
                <div className="mt-2 text-xl font-semibold tabular-nums">
                  <StoredValue value={row[1]} />
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  평균 변화율 · 중앙값 {row[2]}
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  상승 / 집계 종목 {row[3]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {table && (
        <section aria-label="종목 비교 결과">
          <div className="space-y-2 md:hidden">
            {table.rows.map((row, index) => {
              const stock = snapshotStockName(row[0]);
              return (
                <details
                  key={index}
                  className={`${SHARE_CARD} group overflow-hidden`}
                >
                  <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="break-words text-sm font-semibold">
                          {stock.name}
                        </h2>
                        <p className="mt-1 text-[11px] text-neutral-500">
                          {stock.code}
                        </p>
                      </div>
                      <ChevronDown
                        size={15}
                        className="shrink-0 text-neutral-400 group-open:rotate-180"
                      />
                    </div>
                    {dates.length > 0 && (
                      <div className="mt-3 text-right text-sm font-semibold tabular-nums">
                        <StoredValue
                          value={row[table.columns.indexOf(dates.at(-1)!)]}
                        />
                      </div>
                    )}
                  </summary>
                  <dl className="divide-y divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
                    {table.columns.slice(1).map((column, at) => (
                      <div
                        key={at}
                        className="grid grid-cols-2 gap-3 px-4 py-3"
                      >
                        <dt className="text-xs text-neutral-500">{column}</dt>
                        <dd className="text-right text-sm font-medium tabular-nums">
                          <StoredValue value={row[at + 1]} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="border-t border-neutral-100 px-4 py-2 dark:border-neutral-800">
                    <Link
                      href={sharedStockAnalysisHref(row[0])}
                      prefetch={false}
                      className="inline-flex min-h-9 items-center text-xs font-medium text-brand-ink"
                    >
                      이 종목의 최신 분석 보기 →
                    </Link>
                  </div>
                </details>
              );
            })}
          </div>
          <div className="hidden md:block">
            <SharedTable table={table} title={false} stockColumn />
          </div>
        </section>
      )}
      {snapshot.tables
        .filter((item) => item !== table && item !== statistics)
        .map((table, index) => (
          <div key={index} className="mt-6">
            <SharedTable table={table} />
          </div>
        ))}
    </>
  );
}

function AnalysisView({ snapshot }: { snapshot: ResultSnapshot }) {
  const [tab, setTab] = useState<AnalysisTab>(() =>
    snapshot.tables.some((table) => analysisTableTab(table) === 'valuation')
      ? 'valuation'
      : 'metrics'
  );
  const [financeView, setFinanceView] = useState<'bars' | 'table'>('bars');
  const tables = snapshot.tables.filter(
    (table) => analysisTableTab(table) === tab
  );
  const metrics = tables.find((table) => table.title === '핵심 지표');
  const price = snapshot.summary.find((item) => item.label === '현재가');
  return (
    <>
      <nav
        aria-label="분석 항목"
        className="mb-5 flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800"
      >
        {ANALYSIS_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`min-h-11 flex-1 shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium ${tab === item.key ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100' : 'border-transparent text-neutral-500 dark:text-neutral-400'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {tab === 'metrics' && metrics && (
        <section
          className={`${SHARE_CARD} mb-6 overflow-hidden`}
          aria-label="종목 핵심 지표"
        >
          <div className="p-4 sm:p-5">
            <p className="text-xs text-neutral-500">
              {snapshot.summary.find((item) => item.label === '시장')?.value} ·
              공유된 종목 분석
            </p>
            <h2 className="mt-1 text-base font-semibold">
              {snapshot.title.replace(/ 분석 결과$/, '')}
            </h2>
            {price && (
              <p className="mt-3 text-3xl font-semibold tabular-nums">
                {price.value}
              </p>
            )}
          </div>
          <Metrics rows={metrics.rows} columns={3} />
        </section>
      )}
      {tab === 'financials' && tables.length > 0 && (
        <div
          role="group"
          aria-label="재무제표 보기 방식"
          className="mb-4 flex justify-end gap-1"
        >
          {(['bars', 'table'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={financeView === mode}
              onClick={() => setFinanceView(mode)}
              className={PAGE_ACTION_CLS}
            >
              {mode === 'bars' ? '막대' : '표'}
            </button>
          ))}
        </div>
      )}
      <div
        className={
          tab === 'valuation'
            ? 'grid items-start gap-4 lg:grid-cols-2'
            : 'space-y-6'
        }
      >
        {tables
          .filter((table) => table !== metrics)
          .map((table, index) => {
            if (tab === 'financials' && financeView === 'bars')
              return (
                <FinancialBars
                  key={index}
                  bs={snapshotFinancialModel(table)}
                  is={null}
                  unit={table.title.endsWith('USD') ? 'usd' : 'eok'}
                />
              );
            if (table.title === '상장유지 위험도 확인')
              return (
                <section
                  key={index}
                  aria-label={table.title}
                  className="space-y-3"
                >
                  <h2 className="text-base font-semibold">{table.title}</h2>
                  {table.rows.map((row, at) => (
                    <article key={at} className={`${SHARE_CARD} p-4`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-semibold">{row[0]}</h3>
                        <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium dark:bg-neutral-800">
                          {row[1]}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold tabular-nums">
                        {row[2]}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-neutral-500">
                        {row[3]}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-neutral-400">
                        {row[4]}
                      </p>
                    </article>
                  ))}
                </section>
              );
            if (table.title === '저평가 기준 확인')
              return (
                <section key={index} aria-label={table.title}>
                  <h2 className="mb-3 text-base font-semibold">
                    {table.title}
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {table.rows.map((row, at) => (
                      <div
                        key={at}
                        className={`${SHARE_CARD} flex flex-wrap items-center justify-between gap-3 p-4`}
                      >
                        <div>
                          <p className="text-xs font-medium">
                            {row[0]} · {row[1]}
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums">
                            {row[2]}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-medium ${row[3] === '충족' ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-500'}`}
                        >
                          {row[3]}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            if (table.title === '조회된 주가 추이') {
              const series = snapshotPriceSeries(table);
              return (
                <section
                  key={index}
                  className={`${SHARE_CARD} overflow-hidden p-4 sm:p-5`}
                  aria-label="조회된 주가 추이"
                >
                  <h2 className="mb-4 text-base font-semibold">주가 추이</h2>
                  {series.length > 1 && (
                    <LineChart
                      category_array={series.map((bar) => bar.date)}
                      data_array={[
                        { name: '종가', data: series.map((bar) => bar.close) },
                      ]}
                      height={240}
                    />
                  )}
                  <details className="mt-4">
                    <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-neutral-500">
                      거래일별 종가 · 거래량 보기
                    </summary>
                    <SharedTable table={table} title={false} />
                  </details>
                </section>
              );
            }
            if (table.columns.length === 2)
              return (
                <section
                  key={index}
                  className={`${SHARE_CARD} overflow-hidden`}
                  aria-label={table.title}
                >
                  <h2 className="px-4 pt-4 text-base font-semibold">
                    {table.title}
                  </h2>
                  <Metrics rows={table.rows} columns={3} />
                </section>
              );
            return <SharedTable key={index} table={table} />;
          })}
      </div>
      {tables.length === 0 && (
        <div className={`${SHARE_CARD} p-6 text-sm leading-6 text-neutral-500`}>
          이 항목은 공유된 결과에 포함되어 있지 않습니다.
        </div>
      )}
    </>
  );
}

function CalculatorView({ snapshot }: { snapshot: ResultSnapshot }) {
  const conditions = snapshot.tables.find(
    (table) => table.title === '계산 조건'
  );
  const result = snapshot.tables.find((table) => table.title === '계산 결과');
  const breakdown = snapshot.tables.find(
    (table) => table.title === '연도별 명세'
  );
  const growthRows = snapshotGrowthRows(snapshot);
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,490px)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div>
        {conditions && (
          <Section tag="INPUT" title="조건">
            <dl
              className={`${SHARE_CARD} divide-y divide-neutral-100 dark:divide-neutral-800`}
            >
              {conditions.rows.map(([label, value], index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 px-4 py-4"
                >
                  <dt className="text-sm font-medium">{label}</dt>
                  <dd className="break-words text-right text-sm font-semibold tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </div>
      <div className="min-w-0">
        <Section tag="RESULT" title="결과">
          <div className={`${SHARE_CARD} p-4 sm:p-5`}>
            <p className="text-xs text-neutral-500">만기 평가금액</p>
            <p className="mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {snapshot.summary.find((item) => item.label === '만기 평가금액')
                ?.value ?? '—'}
            </p>
            <p className="mt-3 text-sm text-neutral-500">
              {snapshot.summary
                .filter((item) => item.label !== '만기 평가금액')
                .map((item) => `${item.label} ${item.value}`)
                .join(' · ')}
            </p>
          </div>
          {result && (
            <div className={`${SHARE_CARD} mt-3 overflow-hidden`}>
              <Metrics rows={result.rows} />
            </div>
          )}
        </Section>
        {growthRows.length > 1 && (
          <Section tag="GROWTH" title="자산 구성 추이">
            <GrowthChart rows={growthRows} />
          </Section>
        )}
        {snapshot.tables
          .filter(
            (table) =>
              table !== conditions && table !== result && table !== breakdown
          )
          .map((table, index) => (
            <Section key={index} tag="VALUE" title={table.title}>
              <SharedTable table={table} title={false} />
            </Section>
          ))}
        {breakdown && (
          <Section tag="BREAKDOWN" title="연도별 명세">
            <SharedTable table={breakdown} title={false} />
          </Section>
        )}
      </div>
    </div>
  );
}

export default function SharedResultView({
  snapshot,
}: {
  snapshot: ResultSnapshot;
}) {
  if (snapshot.kind === 'screener') return <ScreenerView snapshot={snapshot} />;
  if (snapshot.kind === 'compare') return <CompareView snapshot={snapshot} />;
  if (snapshot.kind === 'analyze') return <AnalysisView snapshot={snapshot} />;
  return <CalculatorView snapshot={snapshot} />;
}
