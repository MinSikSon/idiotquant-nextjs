"use client";

import { useRef, useState } from "react";
import type { QuantRule } from "@/lib/features/capital/capitalSlice";

export interface GroupStrategySettings {
  quant_rule: QuantRule | null;
  budget_krw: number | null;
  side?: "buy" | "sell";
  dca?: boolean;
}

interface Props {
  groupQuantRule?: QuantRule;
  groupBudget?: number;
  groupSide?: "buy" | "sell";
  groupDca?: boolean;
  tradingActive: boolean;
  onApply: (settings: GroupStrategySettings) => Promise<unknown>;
  onClose: () => void;
}

const modes = [
  { id: "quant", label: "퀀트", description: "재무·NCAV 조건을 확인해 매매합니다." },
  { id: "dca", label: "정액 적립", description: "적립 포인트를 모아 1주 단위로 주문합니다." },
  { id: "weight", label: "목표 비중", description: "보유 평가액을 목표 비중에 맞게 조정합니다." },
] as const;

const inputClass = "min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-base dark:border-border-subtle-dark dark:bg-surface-dark-canvas";
const buttonClass = "min-h-11 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-subtle-dark";

export default function GroupStrategyEditor({ groupQuantRule, groupBudget, groupSide, groupDca, tradingActive, onApply, onClose }: Props) {
  const initial = {
    mode: groupDca ? "dca" as const : "quant" as const,
    side: groupSide === "sell" ? "sell" as const : "buy" as const,
    budget: groupBudget == null ? "" : String(groupBudget),
    count: String(groupQuantRule?.active_count ?? ""),
    ncav: String(groupQuantRule?.ncav_ratio ?? ""),
  };
  const [baseline] = useState(initial);
  const [draft, setDraft] = useState<{ mode: "quant" | "dca" | "weight"; side: "buy" | "sell"; budget: string; count: string; ncav: string }>(initial);
  const [saving, setSaving] = useState(false);
  const [resetRule, setResetRule] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const dca = draft.mode === "dca";
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline) || (resetRule && !!groupQuantRule && Object.keys(groupQuantRule).length > 0);
  const stale = JSON.stringify(initial) !== JSON.stringify(baseline);
  const validNumber = (value: string, min: number, max = Infinity, integer = false) => value.trim() === "" || (Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max && (!integer || Number.isInteger(Number(value))));
  const valid = validNumber(draft.budget, 0, 1_000_000_000, true) && validNumber(draft.count, 1, 200, true) && (dca || draft.side === "sell" || validNumber(draft.ncav, 0));
  const setField = (field: keyof typeof draft, value: string) => { setDraft(previous => ({ ...previous, [field]: value })); setError(""); };

  async function apply() {
    if (inFlight.current || !dirty || !valid || stale || draft.mode === "weight") return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    const rule: QuantRule = resetRule ? {} : { ...groupQuantRule };
    delete rule.active_count;
    if (draft.count.trim()) rule.active_count = Number(draft.count);
    if (!dca && draft.side === "buy") {
      delete rule.ncav_ratio;
      if (draft.ncav.trim()) rule.ncav_ratio = Number(draft.ncav);
    }
    try {
      await onApply({ quant_rule: Object.keys(rule).length ? rule : null, budget_krw: Number(draft.budget) > 0 ? Number(draft.budget) : null, side: draft.side, dca });
      onClose();
    } catch {
      setError("전략을 적용하지 못했습니다. 편집값은 유지됩니다. 연결 상태를 확인하고 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <section aria-label="그룹 운용 전략 편집" className="space-y-4 border-b border-neutral-100 bg-neutral-50 p-3 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:p-4">
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        <legend className="mb-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">1. 운용 전략</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="전략 화면 선택">
          {modes.map(mode => <button key={mode.id} type="button" aria-pressed={draft.mode === mode.id} onClick={() => setField("mode", mode.id)} className={`min-h-20 rounded-xl border p-3 text-left ${draft.mode === mode.id ? "border-brand bg-brand/10 text-brand-ink" : "border-neutral-200 bg-white text-neutral-500 dark:border-border-subtle-dark dark:bg-surface-dark-canvas dark:text-neutral-400"}`}>
            <span className="flex flex-wrap items-center gap-2 text-sm font-bold">{mode.label}{mode.id === baseline.mode && <span className="text-[11px] text-brand-ink">적용 중</span>}{mode.id === "weight" && <span className="text-[11px]">준비 중</span>}</span>
            <span className="mt-1 block text-xs">{mode.description}</span>
          </button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-xs dark:border-border-subtle-dark dark:bg-surface-dark-canvas" aria-live="polite">
          <span>현재 적용: {baseline.mode === "dca" ? "정액 적립" : "퀀트"} · 자동매매 {tradingActive ? "ON" : "OFF"}</span>
          <span className="font-bold text-brand-ink">{dirty ? "미적용 변경사항" : "저장된 설정"}</span>
          <p className="w-full text-neutral-500 dark:text-neutral-400">탭 선택은 화면만 전환합니다. 적용 버튼을 누르기 전까지 기존 설정을 유지합니다.</p>
        </div>
        {draft.mode === "weight" ? <div className="rounded-lg bg-brand/5 p-4 text-sm text-neutral-700 dark:text-neutral-300"><p className="font-bold">목표 비중 리밸런싱 준비 중</p><p className="mt-1 text-xs">목표 비중 저장과 주문 실행 기능은 아직 지원하지 않습니다. 현재 적용된 전략은 유지됩니다.</p></div> : <>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{dca ? "정액 적립은 주문 시 NCAV·재무 조건 검사를 건너뜁니다. 대상 선정 필터와 활성 종목 수 제한은 계속 적용됩니다." : "퀀트는 선정 필터와 NCAV 순위로 대상을 정합니다. 매수 조건을 충족하면 적립 포인트 범위에서 실행합니다."}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <h4 className="text-xs font-bold sm:col-span-2">2. 방향·예산</h4>
            <label className="space-y-1 text-xs">방향<select className={inputClass} value={draft.side} onChange={event => setField("side", event.target.value)}><option value="buy">매수</option><option value="sell">매도</option></select></label>
            <label className="space-y-1 text-xs">월 적립 예산 (원)<input className={inputClass} type="number" min={0} max={1_000_000_000} step={1} value={draft.budget} placeholder="계좌예산 분배" onChange={event => setField("budget", event.target.value)} /></label>
            <h4 className="text-xs font-bold sm:col-span-2">3. {dca ? "대상 선정 제한" : "퀀트 조건"}</h4>
            <label className="space-y-1 text-xs">활성 종목 수<input className={inputClass} type="number" min={1} max={200} step={1} value={draft.count} placeholder="계좌 기본값" onChange={event => setField("count", event.target.value)} /></label>
            {!dca && draft.side === "buy" && <label className="space-y-1 text-xs">NCAV 비율<input className={inputClass} type="number" min={0} step="any" value={draft.ncav} placeholder="계좌 기본값" onChange={event => setField("ncav", event.target.value)} /></label>}
          </div>
          {draft.side === "sell" && <p className="text-xs text-rose-600 dark:text-rose-400">{dca ? "적립 포인트로 수량을 계산하고 보유 수량 내에서 매도합니다." : "퀀트 매도는 포인트·매수 조건과 무관하게 선정된 종목의 보유 수량 전량을 매도합니다."}</p>}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">빈 값은 계좌 기본값을 사용합니다. 월 예산 0원도 계좌예산 분배로 돌아갑니다.</p>
        </>}
        {stale && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">다른 곳에서 설정이 변경되었습니다. 편집기를 닫고 최신 설정으로 다시 열어 주세요.</p>}
        {!valid && draft.mode !== "weight" && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">예산은 0~10억의 정수, 활성 종목 수는 1~200의 정수, NCAV 비율은 0 이상으로 입력해 주세요.</p>}
        {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {draft.mode !== "weight" && <button type="button" className={buttonClass} onClick={() => { setDraft(previous => ({ ...previous, budget: "", count: "", ncav: "" })); setResetRule(true); setError(""); }}>조건·예산 기본값</button>}
          <button type="button" className={buttonClass} onClick={() => { setDraft(baseline); setResetRule(false); setError(""); }} disabled={!dirty}>변경 취소</button>
          <button type="button" className={buttonClass} onClick={onClose}>닫기</button>
          <button type="button" onClick={apply} disabled={!dirty || !valid || stale || draft.mode === "weight" || saving} className={`${buttonClass} border-transparent bg-brand text-white hover:bg-brand-hover`}>{saving ? "적용 중…" : draft.mode === "weight" ? "준비 중" : draft.mode !== baseline.mode ? "이 전략으로 적용" : "변경사항 적용"}</button>
        </div>
        {tradingActive && dirty && draft.mode !== "weight" && <p className="text-xs text-neutral-500 dark:text-neutral-400">적용하면 다음 자동매매 판단부터 새 설정을 사용합니다.</p>}
        {resetRule && <p className="text-xs text-neutral-500 dark:text-neutral-400">적용 시 이 그룹의 선정 조건 전체와 예산을 기본값으로 되돌립니다. 방향과 전략은 현재 선택을 유지합니다.</p>}
      </fieldset>
    </section>
  );
}
