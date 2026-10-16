'use client';

import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, FileUp, Loader2 } from 'lucide-react';
import { PageHeader, PAGE_ACTION_CLS, PAGE_WIDTH } from '@/components/pageHeader';
import ResultShare from '@/components/result-share';
import SharedResultView from '@/components/share/result-views';
import { ShareServiceBanner, ShareServiceMenu } from '@/components/share/service-navigation';
import { shareServiceTarget } from '@/lib/share/navigation';
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

  const source = snapshot ? shareServiceTarget(snapshot) : null;
  const pageTitle = snapshot ? ({ screener: '종목 발굴', compare: '종목 비교', analyze: snapshot.title.replace(/ 분석 결과$/, ''), calculator: '복리 수익률 계산기' }[snapshot.kind]) : '공유 결과';

  return <div className="landing-style-page min-h-screen bg-surface-canvas text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100">
    <div className="border-b border-neutral-200 bg-white dark:border-border-subtle-dark dark:bg-surface-dark-card"><div className={`${PAGE_WIDTH.data} flex min-h-12 items-center justify-between gap-3 py-2`}><Link href="/" prefetch={false} className="text-sm font-semibold tracking-tight">idiotquant</Link><Link href="/" prefetch={false} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-brand-ink">서비스 홈으로<ArrowUpRight size={14} aria-hidden="true" /></Link></div></div>
    <PageHeader title={pageTitle}
      meta={snapshot ? <><span className="rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">공유된 결과</span><span>{new Date(snapshot.createdAt).toLocaleString('ko-KR')}</span>{snapshot.summary.map((item, index) => <span key={index}>· {item.label} {item.value}</span>)}</> : undefined}
      actions={snapshot ? <><ResultShare getSnapshot={() => snapshot} /><Link href={source!.href} prefetch={false} className={PAGE_ACTION_CLS}>{source!.label}<ArrowUpRight size={15} aria-hidden="true" /></Link></> : undefined} />
    <main className={`${PAGE_WIDTH.data} py-6 sm:py-8`}>
      {loading && <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={16} className="animate-spin" /> 공유 결과를 여는 중…</p>}
      {error && <p role="alert" className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!loading && snapshot && <>
        <ShareServiceBanner snapshot={snapshot} />
        <SharedResultView key={`${snapshot.kind}:${snapshot.createdAt}`} snapshot={snapshot} />
        <div className="mt-6 space-y-2 text-xs leading-6 text-neutral-500 dark:text-neutral-400">{snapshot.notes.map((note, index) => <p key={index}>{note}</p>)}</div>

      </>}
      {!loading && !snapshot && !error && <p className="mb-4 text-sm text-neutral-500">받은 공유 링크로 접속하거나 결과 파일을 선택해 주세요.</p>}
      <ShareServiceMenu />
      <div className="mt-8 border-t border-neutral-200 pt-5 dark:border-neutral-700">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><FileUp size={16} aria-hidden="true" /> 결과 파일 열기<input type="file" accept="application/json,.json" onChange={event => void openFile(event)} className="ml-2 max-w-52 text-xs" aria-label="공유 결과 파일 선택" /></label>
      </div>
    </main>
  </div>;
}
