'use client';

import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileUp, Loader2 } from 'lucide-react';
import { PageHeader, PAGE_ACTION_CLS, PAGE_WIDTH } from '@/components/pageHeader';
import ResultShare from '@/components/result-share';
import { loadSnapshot } from '@/lib/share/client';
import { decodeSnapshot, MAX_SNAPSHOT_BYTES, parseSnapshot, type ResultSnapshot, type SnapshotTable } from '@/lib/share/snapshot';

function SharedTable({ table }: { table: SnapshotTable }) {
  const [visible, setVisible] = useState(50);
  return <section className="mt-6" aria-label={table.title}>
    <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-base font-semibold">{table.title}</h2><span className="text-xs text-neutral-500">{table.rows.length.toLocaleString()}개 항목</span></div>
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-surface-dark-card">
      <table className="w-full border-collapse text-sm"><thead><tr className="border-b border-neutral-200 dark:border-neutral-700">{table.columns.map((column, index) => <th key={index} scope="col" className="min-w-28 whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">{column}</th>)}</tr></thead>
        <tbody>{table.rows.slice(0, visible).map((row, index) => <tr key={index} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">{row.map((value, column) => <td key={column} className="min-w-28 px-4 py-3 align-top tabular-nums"><span className="block max-w-md whitespace-pre-wrap break-words">{value}</span></td>)}</tr>)}</tbody>
      </table>
    </div>
    {visible < table.rows.length && <button type="button" onClick={() => setVisible(count => count + 100)} className={`${PAGE_ACTION_CLS} mt-3`}>더 보기 ({table.rows.length - visible}개 남음)</button>}
  </section>;
}

export default function SharedResultPage() {
  return <Suspense fallback={<p className="p-6 text-sm">공유 결과를 여는 중…</p>}><SharedResult /></Suspense>;
}

function SharedResult() {
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState<ResultSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);

  useEffect(() => {
    async function load() {
      const current = ++request.current;
      setLoading(true); setError(''); setSnapshot(null);
      const id = searchParams.get('id');
      const encoded = new URLSearchParams(window.location.hash.slice(1)).get('r');
      try {
        if (id || encoded) {
          const result = id ? await loadSnapshot(id) : await decodeSnapshot(encoded!);
          if (request.current === current) setSnapshot(result);
        }
      } catch (reason) {
        if (request.current === current) setError(reason instanceof Error ? reason.message : '공유 결과를 열지 못했습니다.');
      } finally { if (request.current === current) setLoading(false); }
    }
    void load();
    window.addEventListener('hashchange', load);
    return () => { request.current++; window.removeEventListener('hashchange', load); };
  }, [searchParams]);

  async function openFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const current = ++request.current;
    setLoading(true); setError(''); setSnapshot(null);
    try {
      if (file.size > MAX_SNAPSHOT_BYTES) throw new Error('2MB 이하의 결과 파일을 선택해 주세요.');
      const result = parseSnapshot(await file.text());
      if (request.current === current) setSnapshot(result);
    } catch (reason) {
      if (request.current === current) setError(reason instanceof Error ? reason.message : '결과 파일을 열지 못했습니다.');
    } finally { if (request.current === current) setLoading(false); }
  }

  return <div className="min-h-screen bg-surface-canvas text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100">
    <PageHeader title={snapshot?.title ?? '공유 결과'} description="공유자가 확인한 값을 그대로 보여줍니다. 시세·재무 조회나 계산을 다시 실행하지 않습니다."
      meta={snapshot ? `공유 시점 ${new Date(snapshot.createdAt).toLocaleString('ko-KR')}` : undefined}
      actions={snapshot ? <ResultShare getSnapshot={() => snapshot} /> : undefined} />
    <main className={`${PAGE_WIDTH.data} py-6 sm:py-8`}>
      {loading && <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={16} className="animate-spin" /> 공유 결과를 여는 중…</p>}
      {error && <p role="alert" className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!loading && snapshot && <>
        <dl className="grid gap-3 sm:grid-cols-3">{snapshot.summary.map((item, index) => <div key={index} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-surface-dark-card"><dt className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</dt><dd className="mt-2 break-words text-lg font-medium">{item.value}</dd></div>)}</dl>
        {snapshot.tables.map((table, index) => <SharedTable key={`${snapshot.createdAt}:${index}`} table={table} />)}
        <div className="mt-6 space-y-2 text-xs leading-6 text-neutral-500 dark:text-neutral-400">{snapshot.notes.map((note, index) => <p key={index}>{note}</p>)}</div>
        <Link href={snapshot.sourcePath} className={`${PAGE_ACTION_CLS} mt-5`}>{snapshot.kind === 'compare' ? '새 비교 시작' : snapshot.kind === 'calculator' ? '이 조건으로 계산기 열기' : '최신 데이터로 열기'}</Link>
      </>}
      {!loading && !snapshot && !error && <p className="mb-4 text-sm text-neutral-500">받은 공유 링크로 접속하거나 결과 파일을 선택해 주세요.</p>}
      <div className="mt-8 border-t border-neutral-200 pt-5 dark:border-neutral-700">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><FileUp size={16} aria-hidden="true" /> 결과 파일 열기<input type="file" accept="application/json,.json" onChange={event => void openFile(event)} className="ml-2 max-w-52 text-xs" aria-label="공유 결과 파일 선택" /></label>
      </div>
    </main>
  </div>;
}
