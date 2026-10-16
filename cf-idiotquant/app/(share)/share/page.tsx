'use client';

import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, FileUp, Loader2 } from 'lucide-react';
import { PageHeader, PAGE_ACTION_CLS, PAGE_WIDTH } from '@/components/pageHeader';
import ResultShare from '@/components/result-share';
import SharedResultView from '@/components/share/result-views';
import { loadSnapshot } from '@/lib/share/client';
import { decodeSnapshot, MAX_SNAPSHOT_BYTES, parseSnapshot, type ResultSnapshot } from '@/lib/share/snapshot';

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

  const sourceLabel = snapshot ? ({ screener: '직접 발굴하기', compare: '새 비교 시작', analyze: '직접 분석하기', calculator: '이 조건으로 계산하기' }[snapshot.kind]) : '직접 이용하기';
  const pageTitle = snapshot ? ({ screener: '종목 발굴', compare: '종목 비교', analyze: snapshot.title.replace(/ 분석 결과$/, ''), calculator: '복리 수익률 계산기' }[snapshot.kind]) : '공유 결과';

  return <div className="landing-style-page min-h-screen bg-surface-canvas text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100">
    <PageHeader title={pageTitle}
      meta={snapshot ? <><span className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">공유된 결과</span><span>{new Date(snapshot.createdAt).toLocaleString('ko-KR')}</span>{snapshot.summary.map((item, index) => <span key={index}>· {item.label} {item.value}</span>)}</> : undefined}
      actions={snapshot ? <><ResultShare getSnapshot={() => snapshot} /><Link href={snapshot.sourcePath} className={PAGE_ACTION_CLS} aria-label={sourceLabel}><span className="hidden sm:inline">{sourceLabel}</span><ArrowUpRight size={15} aria-hidden="true" /></Link></> : undefined} />
    <main className={`${PAGE_WIDTH.data} py-6 sm:py-8`}>
      {loading && <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={16} className="animate-spin" /> 공유 결과를 여는 중…</p>}
      {error && <p role="alert" className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!loading && snapshot && <>
        <p className="mb-5 border-b border-neutral-200 pb-4 text-xs leading-5 text-neutral-500 dark:border-border-subtle-dark dark:text-neutral-400">공유자가 확인한 시점의 결과입니다. 시세·재무 조회나 계산을 다시 실행하지 않습니다.</p>
        <SharedResultView key={`${snapshot.kind}:${snapshot.createdAt}`} snapshot={snapshot} />
        <div className="mt-6 space-y-2 text-xs leading-6 text-neutral-500 dark:text-neutral-400">{snapshot.notes.map((note, index) => <p key={index}>{note}</p>)}</div>
        <Link href={snapshot.sourcePath} className={`${PAGE_ACTION_CLS} mt-5`}>{sourceLabel}<ArrowUpRight size={14} aria-hidden="true" /></Link>
      </>}
      {!loading && !snapshot && !error && <p className="mb-4 text-sm text-neutral-500">받은 공유 링크로 접속하거나 결과 파일을 선택해 주세요.</p>}
      <div className="mt-8 border-t border-neutral-200 pt-5 dark:border-neutral-700">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><FileUp size={16} aria-hidden="true" /> 결과 파일 열기<input type="file" accept="application/json,.json" onChange={event => void openFile(event)} className="ml-2 max-w-52 text-xs" aria-label="공유 결과 파일 선택" /></label>
      </div>
    </main>
  </div>;
}
