"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// 복사 대상 종목 한 줄. 지표는 있으면 상세 복사에 포함, 없으면 생략.
export interface CopyStock {
  name: string;
  ticker: string;
  ncav?: number | string | null;
  pbr?: number | string | null;
  per?: number | string | null;
  roe?: number | string | null; // 퍼센트 값
}

const pos = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// 종목명만 줄바꿈으로 이어 붙임
function namesText(rows: CopyStock[]): string {
  return rows.map(r => r.name || r.ticker).join("\n");
}

// 사람이 읽는 텍스트: "삼성전자(005930) · NCAV 1.2x · PBR 0.9 · PER 8.1 · ROE 12.0%"
function detailsText(rows: CopyStock[]): string {
  return rows.map(r => {
    const parts: string[] = [];
    const ncav = pos(r.ncav); if (ncav != null) parts.push(`NCAV ${ncav.toFixed(2)}x`);
    const pbr = pos(r.pbr);   if (pbr != null) parts.push(`PBR ${pbr.toFixed(2)}`);
    const per = pos(r.per);   if (per != null) parts.push(`PER ${per.toFixed(1)}`);
    const roe = pos(r.roe);   if (roe != null) parts.push(`ROE ${roe.toFixed(1)}%`);
    const head = `${r.name || r.ticker}(${r.ticker})`;
    return parts.length ? `${head} · ${parts.join(" · ")}` : head;
  }).join("\n");
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const BTN_CLS =
  "inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 dark:border-[#35332e] dark:bg-[#242320] dark:hover:bg-[#2c2b27]";

export function CopyStockButtons({ rows, className }: { rows: CopyStock[]; className?: string }) {
  const [copied, setCopied] = useState<null | "names" | "details">(null);

  if (rows.length === 0) return null;

  const handle = async (kind: "names" | "details") => {
    const ok = await writeClipboard(kind === "names" ? namesText(rows) : detailsText(rows));
    if (ok) {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button type="button" onClick={() => handle("names")} className={BTN_CLS} title="종목명만 복사">
        {copied === "names" ? <Check className="w-3 h-3 text-[#16a34a]" /> : <Copy className="w-3 h-3" />}
        {copied === "names" ? "복사됨" : "종목명"}
      </button>
      <button type="button" onClick={() => handle("details")} className={BTN_CLS} title="종목명 + 지표 함께 복사">
        {copied === "details" ? <Check className="w-3 h-3 text-[#16a34a]" /> : <Copy className="w-3 h-3" />}
        {copied === "details" ? "복사됨" : "상세"}
      </button>
    </div>
  );
}
