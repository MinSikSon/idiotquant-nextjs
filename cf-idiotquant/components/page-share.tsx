"use client";

import { Camera, ChevronDown, Copy, Download, Link2, MoreHorizontal, Share2, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavigationPopover } from "@/components/navigation-popover";
import { captureScreen } from "@/lib/share/capture";
import { createScreenLink, createSnapshotLink } from "@/lib/share/client";
import { downloadFile } from "@/lib/share/image";
import type { ResultSnapshot } from "@/lib/share/snapshot";
import { CONTROL_FOCUS_CLS } from "@/lib/ui-controls";
import { cn } from "@/lib/utils";

const TOOL = "inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded px-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-surface-dark-hover " + CONTROL_FOCUS_CLS;
const MENU_ITEM = cn(TOOL, "w-full justify-start px-3 text-base md:text-sm");

export type ScreenShare = { path: string } | { getSnapshot: () => ResultSnapshot };

type ShareContent =
  | { kind: "link"; url?: string }
  | { kind: "image"; capture?: Awaited<ReturnType<typeof captureScreen>>; preview?: string };

export function PageShareTools({ share, children, inMenu = false }: {
  share?: ScreenShare;
  children?: ReactNode;
  inMenu?: boolean;
}) {
  const hasMenu = Boolean(children);
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const preview = useRef("");
  const [content, setContent] = useState<ShareContent | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => () => {
    request.current?.abort();
    if (preview.current) URL.revokeObjectURL(preview.current);
  }, []);

  function close() {
    request.current?.abort();
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = "";
    setContent(null);
  }

  async function open(kind: ShareContent["kind"]) {
    if (dialog.current?.open) return;
    const controller = new AbortController();
    request.current = controller;
    setNotice("");
    setError("");
    setContent({ kind });
    dialog.current?.showModal();

    try {
      if (kind === "image") {
        const capture = await captureScreen();
        if (controller.signal.aborted) return;
        preview.current = URL.createObjectURL(capture.file);
        setContent({ kind, capture, preview: preview.current });
      } else {
        const { origin, search, hash } = window.location;
        // 계정, 초대 화면의 주소는 공용 링크에 개인 식별값을 포함하지 않는다.
        let path = pathname;
        if (share && "path" in share) path = share.path;
        else if (pathname === "/share") path += search + hash;
        else if (pathname === "/balance" && new URLSearchParams(search).get("country") === "us") path += "?country=us";
        const url = share && "getSnapshot" in share
          ? await createSnapshotLink(share.getSnapshot(), origin, controller.signal)
          : await createScreenLink(path, origin, controller.signal);
        if (!controller.signal.aborted) setContent({ kind, url });
      }
    } catch {
      if (!controller.signal.aborted) setError(kind === "link" ? "공유 링크를 만들지 못했습니다. 창을 닫고 다시 시도해 주세요." : "화면을 캡처하지 못했습니다. 창을 닫고 다시 시도해 주세요.");
    }
  }

  async function copy() {
    const current = request.current;
    try {
      if (content?.kind === "link" && content.url) await navigator.clipboard.writeText(content.url);
      if (content?.kind === "image" && content.capture) await navigator.clipboard.write([new ClipboardItem({ "image/png": content.capture.file })]);
      if (current?.signal.aborted) return;
      setError("");
      setNotice(content?.kind === "link" ? "링크를 복사했습니다." : "이미지를 복사했습니다.");
    } catch {
      if (!current?.signal.aborted) {
        setNotice("");
        setError(content?.kind === "link" ? "아래 주소를 직접 선택해 복사해 주세요." : "이미지 저장을 이용해 주세요.");
      }
    }
  }

  const shareData: ShareData | undefined = content?.kind === "link" && content.url
    ? { url: content.url }
    : content?.kind === "image" && content.capture ? { files: [content.capture.file] } : undefined;
  const canShare = !!shareData && typeof navigator.share === "function"
    && (!shareData.files || navigator.canShare?.(shareData));
  const title = content?.kind === "image" ? "화면 캡처" : "링크 공유";
  const link = shareData?.url ? new URL(shareData.url) : null;
  const expires = link?.pathname === "/share" && link.searchParams.has("id");

  async function shareNative() {
    const current = request.current;
    try { await navigator.share(shareData); }
    catch (error) {
      if (!current?.signal.aborted && (!(error instanceof Error) || error.name !== "AbortError")) {
        setNotice("");
        setError("공유하지 못했습니다. 복사하거나 저장해 주세요.");
      }
    }
  }

  const menuItems = <>
    <div className="flex flex-col">
      <button type="button" onClick={() => void open("link")} className={MENU_ITEM} aria-haspopup="dialog"><Link2 size={17} aria-hidden="true" /> 링크 공유</button>
      <button type="button" onClick={() => void open("image")} className={cn(MENU_ITEM, !inMenu && "md:hidden")} aria-haspopup="dialog"><Camera size={17} aria-hidden="true" /> 화면 캡처</button>
    </div>
    {children}
  </>;

  return <>
    {inMenu ? menuItems : <div data-share-controls className="flex shrink-0 items-center">
      <button type="button" onClick={() => void open("image")} className={TOOL + " service-button hidden justify-center md:inline-flex"} aria-haspopup="dialog">
        <Camera size={17} aria-hidden="true" /> 캡처
      </button>
      {!children && <button type="button" onClick={() => void open("link")} className={TOOL + " service-button hidden justify-center md:inline-flex"} aria-label="링크 공유" aria-haspopup="dialog">
        <Link2 size={17} aria-hidden="true" /> 공유
      </button>}
      <NavigationPopover label="페이지 도구" className="page-share-menu" trigger={
        <button type="button" aria-label="페이지 도구" className={cn(TOOL, "justify-center", !hasMenu && "md:hidden")}>
          <MoreHorizontal size={20} className={hasMenu ? "md:hidden" : undefined} aria-hidden="true" />
          {hasMenu && <><span className="hidden md:inline">도구</span><ChevronDown size={14} className="hidden md:block" aria-hidden="true" /></>}
        </button>
      }>
        {menuItems}
      </NavigationPopover>
    </div>}
    <dialog ref={dialog} onClose={close} aria-label={title} data-screen-share data-html2canvas-ignore
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-lg overflow-auto rounded-lg border border-neutral-200 bg-surface-canvas p-4 text-neutral-900 backdrop:bg-black/50 dark:border-neutral-700 dark:bg-surface-dark-canvas dark:text-neutral-100">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="공유 창 닫기" className={TOOL + " justify-center"}><X size={18} aria-hidden="true" /></button>
      </div>
      {content?.kind === "link" && content.url && <>
        <input aria-label="공유 링크" readOnly value={content.url} onFocus={event => event.target.select()} className={`mb-2 min-h-11 w-full rounded border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-600 ${CONTROL_FOCUS_CLS}`} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copy()} className={TOOL}><Copy size={16} aria-hidden="true" /> 링크 복사</button>
          {canShare && <button type="button" onClick={() => void shareNative()} className={TOOL}><Share2 size={16} aria-hidden="true" /> 링크 공유</button>}
        </div>
        {expires && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">이 링크는 생성 후 30일 동안 열 수 있습니다.</p>}
      </>}
      {content?.kind === "image" && content.capture && content.preview && <>
        <Image unoptimized src={content.preview} alt="현재 화면 캡처" width={content.capture.width} height={content.capture.height} className="h-auto max-h-[55dvh] w-full rounded object-contain" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => { const file = content.capture?.file; if (file) downloadFile(file, file.name); }} className={TOOL}><Download size={16} aria-hidden="true" /> 이미지 저장</button>
          {typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function" && <button type="button" onClick={() => void copy()} className={TOOL}><Copy size={16} aria-hidden="true" /> 이미지 복사</button>}
          {canShare && <button type="button" onClick={() => void shareNative()} className={TOOL}><Share2 size={16} aria-hidden="true" /> 이미지 공유</button>}
        </div>
      </>}
      {content && !shareData && !error && <p role="status" className="py-3 text-sm">{content.kind === "link" ? "링크 준비 중…" : "화면 캡처 중…"}</p>}
      {notice && <p role="status" className="mt-2 text-sm text-brand-ink">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    </dialog>
  </>;
}
