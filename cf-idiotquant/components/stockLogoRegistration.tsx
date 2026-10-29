"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

async function pngBase64(dataUrl: string): Promise<string> {
  const image = new window.Image();
  image.src = dataUrl;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 16_777_216) {
    throw new Error("이미지 크기를 확인해 주세요.");
  }
  const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 변환할 수 없습니다.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png").split(",")[1];
}

export function StockLogoRegistration({ ticker, name, onClose, onSaved }: {
  ticker: string; name: string; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [website, setWebsite] = useState("");
  const [preview, setPreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/stock-logo", {
        method: preview ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, name, ...(preview ? { imageBase64 } : { website }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "로고를 등록할 수 없습니다.");
      if (preview) { onSaved(); return; }
      // SVG도 이미지로 디코딩한 뒤 PNG로 저장해 원본의 스크립트·외부 참조를 저장하지 않는다.
      const png = await pngBase64(result.dataUrl);
      setImageBase64(png);
      setPreview(`data:image/png;base64,${png}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "로고를 등록할 수 없습니다.");
    } finally { setBusy(false); }
  }

  return createPortal(
    <dialog ref={dialog} aria-labelledby={titleId} onClose={onClose}
      onCancel={event => { if (busy) event.preventDefault(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl backdrop:bg-black/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h2 id={titleId} className="text-lg font-semibold">{name} 로고 등록</h2>
          <p className="mt-1 text-sm text-neutral-500">기업 홈페이지나 로고 이미지 주소를 입력하세요.</p>
        </div>
        <label className="block text-sm">
          홈페이지 또는 이미지 주소
          <input type="url" required maxLength={2048} value={website} disabled={busy} placeholder="https://www.company.com"
            onChange={event => { setWebsite(event.target.value); setPreview(""); setImageBase64(""); setError(""); }}
            className="mt-2 min-h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-600" />
        </label>
        {preview && <div className="space-y-2">
          <div className="flex h-28 items-center justify-center rounded-lg bg-neutral-200 p-4 dark:bg-neutral-700">
            {/* 서버가 수집하고 PNG로 변환한 data URL만 표시한다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={`${name} 등록 예정 로고`} className="max-h-full max-w-full object-contain" />
          </div>
          <p className="text-xs text-neutral-500">찾은 이미지가 기업 로고인지 확인한 후 등록하세요.</p>
        </div>}
        {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => dialog.current?.close()}
            className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm disabled:opacity-50 dark:border-neutral-600">닫기</button>
          <button type="submit" disabled={busy}
            className="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? (preview ? "등록 중…" : "찾는 중…") : preview ? "로고 등록" : "로고 찾기"}
          </button>
        </div>
      </form>
    </dialog>, document.body,
  );
}
