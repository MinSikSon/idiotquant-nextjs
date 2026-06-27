"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// 복사 대상 종목 한 줄. 지표는 있으면 상세 복사에 포함, 없으면 생략.
export interface CopyStock {
  name: string;
  ticker: string;
  // 밸류에이션 지표 (스크리너·관심·운용 종목)
  ncav?: number | string | null;
  pbr?: number | string | null;
  per?: number | string | null;
  roe?: number | string | null; // 퍼센트 값
  // 잔고(보유) 전용 — 있으면 상세에 포함
  qty?: number | string | null;
  evluAmt?: number | string | null;
  profitRate?: number | string | null; // 퍼센트 값 (음수 가능)
}

const fin = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const pos = (v: unknown): number | null => {
  const n = fin(v);
  return n != null && n > 0 ? n : null;
};

// 한 종목의 지표 묶음 ("NCAV 1.20x · PBR 0.90 · 보유 10주 · 수익률 +5.2%")
function metricsOf(r: CopyStock): string {
  const parts: string[] = [];
  const ncav = pos(r.ncav); if (ncav != null) parts.push(`NCAV ${ncav.toFixed(2)}x`);
  const pbr = pos(r.pbr);   if (pbr != null) parts.push(`PBR ${pbr.toFixed(2)}`);
  const per = pos(r.per);   if (per != null) parts.push(`PER ${per.toFixed(1)}`);
  const roe = pos(r.roe);   if (roe != null) parts.push(`ROE ${roe.toFixed(1)}%`);
  const qty = pos(r.qty);   if (qty != null) parts.push(`보유 ${qty.toLocaleString()}주`);
  const evlu = pos(r.evluAmt); if (evlu != null) parts.push(`평가 ${Math.round(evlu).toLocaleString()}`);
  const pr = fin(r.profitRate); if (pr != null) parts.push(`수익률 ${pr > 0 ? "+" : ""}${pr.toFixed(1)}%`);
  return parts.join(" · ");
}

// 종목명만 줄바꿈으로 이어 붙임
function namesText(rows: CopyStock[]): string {
  return rows.map(r => r.name || r.ticker).join("\n");
}

// 사람이 읽기 좋은 상세: 번호 + 2줄 블록
//   관심 종목 3개
//
//   1. 삼성전자 (005930)
//      NCAV 1.20x · PBR 0.90 · PER 8.1 · ROE 12.0%
// (1개일 때는 번호·헤더 생략)
function detailsText(rows: CopyStock[], label?: string): string {
  const single = rows.length === 1;
  const header = !single && label ? `${label} ${rows.length}개\n\n` : "";
  const body = rows.map((r, i) => {
    const head = `${single ? "" : `${i + 1}. `}${r.name || r.ticker} (${r.ticker})`;
    const metrics = metricsOf(r);
    return metrics ? `${head}\n${single ? "" : "   "}${metrics}` : head;
  }).join("\n\n");
  return header + body;
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

export function CopyStockButtons({ rows, label, className }: { rows: CopyStock[]; label?: string; className?: string }) {
  const [copied, setCopied] = useState<null | "names" | "details">(null);

  if (rows.length === 0) return null;

  const handle = async (kind: "names" | "details") => {
    const ok = await writeClipboard(kind === "names" ? namesText(rows) : detailsText(rows, label));
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
