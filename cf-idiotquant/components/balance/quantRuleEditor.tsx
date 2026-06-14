"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Save, RotateCcw, Info, Lock, CheckCircle2 } from "lucide-react";
import { QuantRule, QuantRuleState } from "@/lib/features/capital/capitalSlice";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  data?: QuantRuleState;
  isMaster: boolean;
  onSave: (rule: QuantRule) => void;
  className?: string;
}

// 기본 표시 순서 (백엔드 desc 가 비어 있어도 최소한의 폴백)
const FALLBACK_ORDER = [
  "ncav_ratio", "active_count", "portfolio_weight",
  "max_pbr", "min_pbr", "min_per", "min_eps", "min_bps",
  "exclude_call_warrants", "exclude_key_word",
];

function ruleToDraft(rule: QuantRule): Record<string, string | boolean> {
  const d: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(rule ?? {})) {
    if (Array.isArray(v)) d[k] = v.join(", ");
    else if (typeof v === "boolean") d[k] = v;
    else d[k] = v == null ? "" : String(v);
  }
  return d;
}

export default function QuantRuleEditor({ data, isMaster, onSave, className = "" }: Props) {
  const rule = data?.rule ?? {};
  const desc = data?.desc ?? {};
  const saving = data?.saveState === "pending";

  const [draft, setDraft] = useState<Record<string, string | boolean>>(() => ruleToDraft(rule));
  const [dirty, setDirty] = useState(false);

  // 서버에서 새 rule 이 도착하면(저장 후/최초 로드) draft 동기화 — 단, 편집 중이면 보존
  useEffect(() => {
    if (!dirty) setDraft(ruleToDraft(rule));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rule)]);

  // 저장 성공 시 dirty 해제
  useEffect(() => {
    if (data?.saveState === "fulfilled") setDirty(false);
  }, [data?.saveState]);

  // 표시할 필드 키 (desc 우선, 없으면 폴백 + rule 의 키)
  const fieldKeys = useMemo(() => {
    const keys = Object.keys(desc);
    if (keys.length > 0) return keys;
    const set = new Set([...FALLBACK_ORDER, ...Object.keys(rule)]);
    return Array.from(set);
  }, [desc, rule]);

  const metaFor = (k: string) => desc[k] ?? inferMeta(k);

  const setField = (k: string, v: string | boolean) => {
    setDraft(prev => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const handleReset = () => {
    if (!data?.default) return;
    setDraft(ruleToDraft(data.default));
    setDirty(true);
  };

  const handleSave = () => {
    const out: QuantRule = {};
    for (const k of fieldKeys) {
      const meta = metaFor(k);
      const v = draft[k];
      if (meta.type === "boolean") out[k] = !!v;
      else if (meta.type === "string[]") {
        out[k] = String(v ?? "").split(",").map(s => s.trim()).filter(Boolean);
      } else if (meta.type === "int") {
        const n = Math.trunc(Number(v));
        out[k] = Number.isFinite(n) ? Math.max(0, n) : 0;
      } else {
        const n = Number(v);
        out[k] = Number.isFinite(n) ? n : 0;
      }
    }
    onSave(out);
  };

  const noAccount = data && data.state === "fulfilled" && !data.has_account;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-[#35332e] dark:bg-[#1a1915]">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[#16a34a]/10 p-1.5 text-[#16a34a]">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">트레이딩 조건 (quant rule)</span>
            <span className="text-[11px] text-neutral-400">
              {data?.is_override ? "계좌 전용 조건 적용 중" : "전역 기본값 적용 중 (저장 시 계좌 전용으로 전환)"}
            </span>
          </div>
        </div>
        {!isMaster && (
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-400 dark:bg-[#35332e]">
            <Lock className="h-3 w-3" /> 읽기 전용
          </span>
        )}
      </div>

      {noAccount && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-400">
          이 계좌에는 자동매매 계정(trading_account)이 없어 조건을 저장할 수 없습니다. 표시값은 전역 기본값입니다.
        </div>
      )}

      {/* 필드 그리드 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fieldKeys.map((k) => {
          const meta = metaFor(k);
          const val = draft[k];
          return (
            <div key={k} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-[#35332e] dark:bg-[#1a1915]">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{meta.label}</span>
                <code className="text-[9px] text-neutral-300 dark:text-neutral-600">{k}</code>
              </div>
              <p className="mb-2 flex items-start gap-1 text-[10px] leading-tight text-neutral-400">
                <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                {meta.desc}
              </p>
              {meta.type === "boolean" ? (
                <button
                  type="button"
                  disabled={!isMaster}
                  onClick={() => setField(k, !val)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                    val
                      ? "bg-[#16a34a] text-white"
                      : "bg-neutral-200 text-neutral-500 dark:bg-[#35332e] dark:text-neutral-400",
                    !isMaster && "cursor-not-allowed opacity-60"
                  )}
                >
                  {val ? "사용함" : "사용 안 함"}
                </button>
              ) : meta.type === "string[]" ? (
                <input
                  type="text"
                  disabled={!isMaster}
                  value={String(val ?? "")}
                  onChange={(e) => setField(k, e.target.value)}
                  placeholder="쉼표로 구분 (예: 홀딩스, 지주)"
                  className="w-full rounded-lg border border-neutral-200 bg-[#fcfaf7] px-3 py-1.5 font-mono text-xs text-neutral-800 outline-none focus:border-[#16a34a] disabled:opacity-60 dark:border-[#35332e] dark:bg-[#242320] dark:text-neutral-200"
                />
              ) : (
                <input
                  type="number"
                  step={meta.step ?? (meta.type === "int" ? 1 : 0.1)}
                  disabled={!isMaster}
                  value={String(val ?? "")}
                  onChange={(e) => setField(k, e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-[#fcfaf7] px-3 py-1.5 font-mono text-sm font-bold text-neutral-800 outline-none focus:border-[#16a34a] disabled:opacity-60 dark:border-[#35332e] dark:bg-[#242320] dark:text-neutral-200"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 액션 */}
      {isMaster && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {data?.saveState === "fulfilled" && !dirty && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16a34a]">
              <CheckCircle2 className="h-3.5 w-3.5" /> 저장됨
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-50 dark:border-[#35332e] dark:bg-[#242320] dark:text-neutral-400"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 기본값으로
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty || noAccount}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-[#16a34a] px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#15803d] active:scale-95",
              (saving || !dirty || noAccount) && "cursor-not-allowed opacity-50"
            )}
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "저장 중…" : "조건 저장"}
          </button>
        </div>
      )}
    </div>
  );
}

// desc 가 비어 있을 때 키 이름으로 최소 메타 추론
function inferMeta(k: string): { label: string; desc: string; type: "number" | "int" | "boolean" | "string[]"; step?: number } {
  if (k === "exclude_key_word") return { label: "제외 키워드", desc: "종목명에 포함되면 제외 (쉼표 구분)", type: "string[]" };
  if (k.startsWith("exclude_")) return { label: k, desc: "", type: "boolean" };
  if (k === "active_count") return { label: "활성 종목 수", desc: "NCAV 상위 N개만 자동매매", type: "int", step: 1 };
  return { label: k, desc: "", type: "number", step: 0.1 };
}
