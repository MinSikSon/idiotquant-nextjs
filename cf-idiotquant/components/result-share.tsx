'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Copy, Download, Image as ImageIcon, Loader2, Share2, X } from 'lucide-react';
import { PAGE_ACTION_CLS } from '@/components/pageHeader';
import { serializeSnapshot, validateSnapshot, type ResultSnapshot } from '@/lib/share/snapshot';
import { createSnapshotLink, imageShareData, SERVICE_URL } from '@/lib/share/client';
import { downloadFile, snapshotImage } from '@/lib/share/image';

export default function ResultShare({ getSnapshot, disabled = false, iconOnly = false }: {
  getSnapshot: () => ResultSnapshot; disabled?: boolean; iconOnly?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [snapshot, setSnapshot] = useState<ResultSnapshot | null>(null);
  const [url, setUrl] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [linkAttempt, setLinkAttempt] = useState(0);
  const [canShare, setCanShare] = useState(false);
  const [canShareImage, setCanShareImage] = useState(false);
  const [canCopyImage, setCanCopyImage] = useState(false);

  useEffect(() => {
    if (!snapshot) return;
    setLinkError('');
    let cancelled = false;
    const controller = new AbortController();
    setCanShare(typeof navigator.share === 'function');
    setCanCopyImage(typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function');
    void createSnapshotLink(snapshot, window.location.origin, controller.signal).then(link => { if (!cancelled) setUrl(link); })
      .catch(reason => { if (!cancelled) setLinkError(reason instanceof Error ? reason.message : '링크를 만들지 못했습니다.'); });
    return () => { cancelled = true; controller.abort(); };
  }, [snapshot, linkAttempt]);

  useEffect(() => {
    if (!snapshot) return;
    let cancelled = false;
    let preview = '';
    void snapshotImage(snapshot).then(file => {
      if (cancelled) return;
      preview = URL.createObjectURL(file);
      setImage(file); setImageUrl(preview);
      setCanShareImage(typeof navigator.share === 'function' && !!navigator.canShare?.(imageShareData(snapshot, file)));
    }).catch(() => { if (!cancelled) setError('이미지를 만들지 못했습니다. 결과 링크나 파일로 공유해 주세요.'); });
    return () => { cancelled = true; if (preview) URL.revokeObjectURL(preview); };
  }, [snapshot]);

  function open() {
    try {
      const captured = validateSnapshot(getSnapshot());
      serializeSnapshot(captured);
      setUrl(''); setImage(null); setImageUrl(''); setLinkError(''); setError(''); setNotice('');
      setSnapshot(captured);
      dialog.current?.showModal();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '결과를 준비하지 못했습니다.'); }
  }
  async function share(data: ShareData) {
    try { await navigator.share(data); }
    catch (reason) { if (!(reason instanceof Error) || reason.name !== 'AbortError') setError('공유하지 못했습니다. 복사하거나 파일로 저장해 주세요.'); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(url); setNotice('결과를 볼 수 있는 짧은 링크를 복사했습니다.'); setError(''); }
    catch { setError('링크를 복사하지 못했습니다. 아래 링크를 직접 복사해 주세요.'); }
  }
  async function copyImage() {
    if (!image) return;
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]); setNotice('요약 이미지를 복사했습니다.'); setError(''); }
    catch { setError('이미지를 복사하지 못했습니다. 이미지 저장을 이용해 주세요.'); }
  }
  function close() { dialog.current?.close(); setSnapshot(null); }

  return <>
    <button type="button" onClick={open} disabled={disabled} className={PAGE_ACTION_CLS} aria-label="결과 공유" aria-haspopup="dialog">
      <Share2 size={15} aria-hidden="true" />{!iconOnly && <span className="hidden sm:inline">결과 공유</span>}
    </button>
    {error && !snapshot && <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    <dialog ref={dialog} aria-label="결과 공유" onCancel={close} onClick={event => { if (event.target === dialog.current) close(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-xl overflow-y-auto rounded-2xl border border-neutral-200 bg-surface-canvas p-0 text-neutral-900 shadow-xl backdrop:bg-black/50 dark:border-neutral-700 dark:bg-surface-dark-canvas dark:text-neutral-100">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
        <h2 className="text-base font-semibold">결과 공유</h2><button type="button" onClick={close} aria-label="공유 창 닫기" className={PAGE_ACTION_CLS}><X size={16} /></button>
      </div>
      {snapshot && <div className="space-y-5 p-5">
        <div><p className="font-medium">{snapshot.title}</p><p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">현재 확인한 결과를 30일간 보관하고 짧은 링크로 전달합니다. 받는 사람은 시세 조회나 계산을 다시 실행하지 않고 결과를 볼 수 있습니다.</p></div>
        <section aria-label="결과 링크"><h3 className="text-sm font-medium">결과 링크</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={!url} onClick={() => void copyLink()} className={PAGE_ACTION_CLS}><Copy size={14} /> 링크 복사</button>
            {canShare && <button type="button" disabled={!url} onClick={() => void share({ title: snapshot.title, url })} className={PAGE_ACTION_CLS}><Share2 size={14} /> 링크 공유</button>}
          </div>
          {!url && !linkError && <p role="status" className="mt-2 flex items-center gap-2 text-xs text-neutral-500"><Loader2 size={13} className="animate-spin" /> 결과 링크 준비 중…</p>}
          {url && <input aria-label="공유 결과 링크" readOnly value={url} onFocus={event => event.target.select()} className="mt-3 w-full rounded-xl border border-neutral-300 bg-white p-2 text-xs dark:border-neutral-700 dark:bg-surface-dark-card" />}
          {linkError && <div className="mt-2 space-y-2"><p role="alert" className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">{linkError}</p><button type="button" onClick={() => setLinkAttempt(attempt => attempt + 1)} className={PAGE_ACTION_CLS}>링크 다시 만들기</button></div>}
        </section>
        <section aria-label="요약 이미지"><h3 className="text-sm font-medium">요약 이미지</h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">핵심 지표와 서비스 주소를 한 장에 담습니다. 이미지 공유 시 접속 링크도 함께 전달합니다.</p>
          {imageUrl ? <img src={imageUrl} alt={`${snapshot.title} 요약 이미지`} className="mt-3 h-auto w-full rounded-xl border border-neutral-200 dark:border-neutral-700" /> : <p role="status" className="mt-3 text-xs text-neutral-500">이미지 준비 중…</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!image} onClick={() => image && downloadFile(image, image.name)} className={PAGE_ACTION_CLS}><Download size={14} /> 이미지 저장</button>
            {canCopyImage && <button type="button" disabled={!image} onClick={() => void copyImage()} className={PAGE_ACTION_CLS}><ImageIcon size={14} /> 이미지 복사</button>}
            {canShareImage && <button type="button" disabled={!image} onClick={() => image && void share(imageShareData(snapshot, image))} className={PAGE_ACTION_CLS}><Share2 size={14} /> 이미지 공유</button>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500"><span>{SERVICE_URL}</span><button type="button" onClick={() => void navigator.clipboard.writeText(SERVICE_URL).then(() => setNotice('서비스 주소를 복사했습니다. 이미지와 함께 붙여 넣어 주세요.')).catch(() => setError('서비스 주소를 직접 복사해 주세요.'))} className={PAGE_ACTION_CLS}><Copy size={14} /> 서비스 주소 복사</button></div>
        </section>
        <section className="border-t border-neutral-200 pt-4 dark:border-neutral-700" aria-label="결과 파일">
          <button type="button" onClick={() => downloadFile(new Blob([serializeSnapshot(snapshot)], { type: 'application/json' }), `idiotquant-${snapshot.kind}.json`)} className={PAGE_ACTION_CLS}><Download size={14} /> 결과 파일 저장</button>
          <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">목록이 길면 파일로 전달할 수 있습니다. 받은 파일은 <Link href="/share" className="text-brand-ink underline">공유 결과 화면</Link>에서 열 수 있습니다.</p>
        </section>
        {notice && <p role="status" className="text-xs text-brand-ink">{notice}</p>}
        {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>}
    </dialog>
  </>;
}
