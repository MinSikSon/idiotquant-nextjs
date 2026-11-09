"use client";

import { DetailHelp } from "./detailHelp";
import type { ReactNode } from "react";
import WeightStrategyEditor from "./weightStrategyEditor";
import type { RebalancingPolicy, RebalancingPreview, RebalancingActionHandler } from "@/lib/features/capital/rebalancing";
import { useRef, useState } from "react";
import type { QuantRule } from "@/lib/features/capital/capitalSlice";

export interface GroupStrategySettings {
  rebalancing?: RebalancingPolicy | null;
  quant_rule: QuantRule | null;
  budget_krw: number | null;
  side?: "buy" | "sell";
  dca?: boolean;
}

interface Props {
  groupRebalancing?: RebalancingPolicy | null;
  stocks?: { symbol: string; name?: string }[];
  currency?: "KRW" | "USD";
  onAction?: RebalancingActionHandler;
  onPreview?: (policy: RebalancingPolicy) => Promise<RebalancingPreview>;
  groupQuantRule?: QuantRule;
  accountQuantRule?: QuantRule;
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

const selectionFields = [
  { key: "max_pbr", label: "최대 PBR", min: 0 },
  { key: "min_pbr", label: "최소 PBR", min: 0 },
  { key: "min_per", label: "최소 PER" },
  { key: "min_eps", label: "최소 EPS" },
  { key: "min_bps", label: "최소 BPS" },
] as const;

const inputClass = "min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-base dark:border-border-subtle-dark dark:bg-surface-dark-canvas";
const buttonClass = "min-h-11 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-subtle-dark";

const selectionHelp: Record<string, string> = {
  max_pbr: "PBR은 주가 ÷ 주당순자산입니다. 설정값을 초과하는 종목을 제외하며, 같은 값은 허용합니다. 예: 1이면 PBR 1 이하만 통과합니다.",
  min_pbr: "PBR은 주가 ÷ 주당순자산입니다. 설정값 이하인 종목을 제외합니다. 예: 0.2이면 PBR이 0.2를 초과해야 합니다.",
  min_per: "PER은 주가 ÷ 주당순이익입니다. 설정값 이하인 종목을 제외합니다. 최대 PER 제한이 아닙니다. 0은 제한을 끄므로 흑자 종목만 고르는 조건이 되지 않습니다.",
  min_eps: "EPS는 주당순이익입니다. 설정값 이하인 종목을 제외합니다. 종목 재무 데이터의 통화 단위를 사용하며, 미국 종목은 달러 기준입니다. 0은 제한을 끄므로 적자 종목을 자동 제외하지 않습니다.",
  min_bps: "BPS는 주당순자산입니다. 설정값 이하인 종목을 제외합니다. 종목 재무 데이터의 통화 단위를 사용하며, 미국 종목은 달러 기준입니다. 0이면 이 제한을 적용하지 않습니다.",
};

function SettingHelp({ label, help, children, className = "" }: { label: string; help: ReactNode; children: ReactNode; className?: string }) {
  return <div className={`relative min-w-0 [&>label]:block [&>label]:pt-1 [&>label]:leading-7 ${className}`}>
    {children}
    <div className="absolute right-0 top-0"><DetailHelp label={label}>{help}</DetailHelp></div>
  </div>;
}

export default function GroupStrategyEditor({ groupRebalancing, stocks = [], currency = "KRW", onPreview, onAction, groupQuantRule, accountQuantRule, groupBudget, groupSide, groupDca, tradingActive, onApply, onClose }: Props) {
  const initial = {
    mode: groupRebalancing ? "weight" as const : groupDca ? "dca" as const : "quant" as const,
    side: groupSide === "sell" ? "sell" as const : "buy" as const,
    budget: groupBudget == null ? "" : String(groupBudget),
    count: String(groupQuantRule?.active_count ?? ""),
    ncav: String(groupQuantRule?.ncav_ratio ?? ""),
    details: Object.fromEntries(selectionFields.map(({ key }) => [key, String(groupQuantRule?.[key] ?? "")])) as Record<string, string>,
    warrants: groupQuantRule?.exclude_call_warrants == null ? "" : String(groupQuantRule.exclude_call_warrants),
    keywordMode: groupQuantRule?.exclude_key_word == null ? "inherit" : "custom",
    keywords: (groupQuantRule?.exclude_key_word ?? []).join(", "),
    rebalancing: JSON.stringify({ policy: groupRebalancing ?? null, symbols: stocks.map(s => s.symbol).sort() }),
  };
  const [baseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [resetRule, setResetRule] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const dca = draft.mode === "dca";
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline) || (resetRule && !!groupQuantRule && Object.keys(groupQuantRule).length > 0);
  const [accountBaseline] = useState(JSON.stringify(accountQuantRule));
  const stale = JSON.stringify(initial) !== JSON.stringify(baseline) || JSON.stringify(accountQuantRule) !== accountBaseline;
  const validNumber = (value: string, min: number, max = Infinity, integer = false) => value.trim() === "" || (Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max && (!integer || Number.isInteger(Number(value))));
  const effectiveMaxPbr = draft.details.max_pbr.trim() ? Number(draft.details.max_pbr) : Number(accountQuantRule?.max_pbr ?? 0);
  const effectiveMinPbr = draft.details.min_pbr.trim() ? Number(draft.details.min_pbr) : Number(accountQuantRule?.min_pbr ?? 0);
  const valid = validNumber(draft.budget, 0, 1_000_000_000, true) && validNumber(draft.count, 1, 200, true) && (dca || draft.side === "sell" || validNumber(draft.ncav, 0)) && selectionFields.every(field => validNumber(draft.details[field.key], "min" in field ? field.min : -Infinity)) && (!effectiveMaxPbr || effectiveMaxPbr > effectiveMinPbr);
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
    for (const { key } of selectionFields) {
      delete rule[key];
      if (draft.details[key].trim()) rule[key] = Number(draft.details[key]);
    }
    delete rule.exclude_call_warrants;
    if (draft.warrants !== "") rule.exclude_call_warrants = draft.warrants === "true";
    delete rule.exclude_key_word;
    if (draft.keywordMode === "custom") rule.exclude_key_word = draft.keywords.split(",").map(word => word.trim()).filter(Boolean);
    try {
      await onApply({ quant_rule: Object.keys(rule).length ? rule : null, budget_krw: Number(draft.budget) > 0 ? Number(draft.budget) : null, side: draft.side, dca, ...(groupRebalancing ? { rebalancing: null } : {}) });
      onClose();
    } catch (cause) {
      // unwrap() rejects with a serialized Redux error, not necessarily an Error instance.
      const message = cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string" ? cause.message.trim() : "";
      setError(`전략을 적용하지 못했습니다. 편집값은 유지됩니다. ${message || "요청에 실패했습니다. 잠시 후 다시 시도해 주세요."}`);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <section aria-label="그룹 운용 전략 편집" className="space-y-4 border-b border-neutral-100 bg-neutral-50 p-3 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:p-4">
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        <legend className="mb-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">운용 전략</legend>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2" role="group" aria-label="전략 화면 선택">
          {modes.map(mode => <button key={mode.id} type="button" aria-pressed={draft.mode === mode.id} onClick={() => setField("mode", mode.id)} className={`flex h-full min-h-20 min-w-0 flex-col items-start rounded-xl border p-2 text-left sm:p-3 ${draft.mode === mode.id ? "border-brand bg-brand/10 text-brand-ink" : "border-neutral-200 bg-white text-neutral-500 dark:border-border-subtle-dark dark:bg-surface-dark-canvas dark:text-neutral-400"}`}>
            <span className="flex min-h-10 flex-wrap content-start items-center gap-x-1 gap-y-0.5 text-xs font-bold sm:min-h-0 sm:gap-2 sm:text-sm">{mode.label}{mode.id === baseline.mode && <span className="text-[10px] text-brand-ink sm:text-[11px]">적용 중</span>}</span>
            <span className="mt-1 block break-keep text-[11px] leading-relaxed sm:text-xs">{mode.description}</span>
          </button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-xs dark:border-border-subtle-dark dark:bg-surface-dark-canvas" aria-live="polite">
          <span>현재 적용: {baseline.mode === "weight" ? "목표 비중" : baseline.mode === "dca" ? "정액 적립" : "퀀트"} · 자동매매 {tradingActive ? "ON" : "OFF"}</span>
          <span className="font-bold text-brand-ink">{dirty ? "미적용 변경사항" : "저장된 설정"}</span>
          <p className="w-full text-neutral-500 dark:text-neutral-400">탭 선택은 화면만 전환합니다. 적용 버튼을 누르기 전까지 기존 설정을 유지합니다.</p>
        </div>
        {draft.mode === "weight" ? <WeightStrategyEditor onAction={onAction} onBusyChange={setSaving} policy={groupRebalancing} stocks={stocks} currency={currency} stale={stale} onPreview={onPreview} onClose={onClose} onApply={async rebalancing => { await onApply({ quant_rule: groupQuantRule ?? null, budget_krw: groupBudget ?? null, side: groupSide, dca: groupDca, rebalancing }); onClose(); }} /> : <>
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{dca ? "선정된 종목에 포인트를 적립해 주문합니다." : "그룹 내 종목 선정 → 조건 확인 → 적립 포인트로 매수"}</span>
            <DetailHelp label={dca ? "정액 적립 동작" : "퀀트 동작"}>
              <ol className="list-decimal space-y-2 pl-4">
                <li>이 그룹에 포함된 종목 중 세부 선정 조건을 통과한 종목을 NCAV 비율이 높은 순으로 정렬하고, 활성 종목 수만큼 대상을 정합니다. 그룹 자동매매가 ON이어야 합니다.</li>
                <li>활성 종목별로 예산 포인트를 나누어 적립합니다. 충전은 예산 배분이며 증권계좌에 실제 돈을 입금하는 기능이 아닙니다.</li>
                <li>{dca ? "정액 적립은 주문 시 NCAV·재무 조건과 퀀트 보유 비중 검사를 건너뜁니다. 매수는 적립 포인트로 살 수 있는 수량, 매도는 포인트와 보유 수량 범위에서 계산합니다." : "퀀트 매수는 주문 시 NCAV 조건을 확인하며, 미국 주식은 재무 조건과 종목당 보유 비중 제한도 다시 확인합니다. 종목별 포인트가 1주 가격 이상 쌓여야 주문하며, 미국 주식은 현재가와 환율로 계산합니다. 조건 미달이면 매수하지 않고 다음 판단을 기다립니다."}</li>
                {!dca && <li>퀀트 매도는 선정된 종목의 보유 전량을 매도합니다. 적립 포인트와 매수 조건 충족을 기다리지 않습니다.</li>}
              </ol>
              <p className="mt-2">계좌의 자동매매 실행도 ON이어야 합니다. 적용 후 다음 자동매매 판단부터 반영되며, 실제 주문에는 증권사 주문 가능 시간·주문 가능 자금 또는 보유 수량이 필요합니다. 주문 접수가 체결을 보장하지는 않습니다.</p>
            </DetailHelp>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingHelp label="방향" help="매수는 선택한 전략의 조건과 예산으로 수량을 계산합니다. 퀀트 매도는 선정된 종목의 보유 전량을, 정액 적립 매도는 포인트로 계산한 수량을 보유 수량 내에서 주문합니다. 매수 조건 미달을 이유로 자동 매도하지는 않습니다."><label className="space-y-1 text-xs"><span className="pr-8">방향</span><select className={inputClass} value={draft.side} onChange={event => setField("side", event.target.value)}><option value="buy">매수</option><option value="sell">매도</option></select></label></SettingHelp>
            <SettingHelp label="월 적립 예산 (원)" help="이 그룹에 매월 배분할 원화 기준 예산입니다. 미국 종목도 원화로 입력합니다. 충전 시간대에 5분 주기로 나누고 활성 종목에 균등 적립합니다. 비워 두거나 0을 입력하면 계좌 월 예산을 활성 종목이 있는 그룹 수로 나눈 값을 사용합니다. 0원은 자동매매 중지가 아닙니다. 퀀트 매도 수량은 이 예산과 무관합니다."><label className="space-y-1 text-xs"><span className="pr-8">월 적립 예산 (원)</span><input className={inputClass} type="number" min={0} max={1_000_000_000} step={1} value={draft.budget} placeholder="계좌예산 분배" onChange={event => setField("budget", event.target.value)} /></label></SettingHelp>
            <SettingHelp label="활성 종목 수" help="그룹 내 선정 조건을 통과한 종목 중 NCAV 비율 상위 몇 종목을 활성화할지 정합니다. 예: 20이면 최대 20종목이며 통과 종목이 적으면 그 수만 활성화합니다. 활성화가 곧 주문을 뜻하지는 않습니다. 비워 두면 계좌 기본값을 사용합니다. 입력 범위는 1~200의 정수입니다."><label className="space-y-1 text-xs"><span className="pr-8">활성 종목 수</span><input className={inputClass} type="number" min={1} max={200} step={1} value={draft.count} placeholder={`계좌 기본값: ${accountQuantRule?.active_count ?? 20}`} onChange={event => setField("count", event.target.value)} /></label></SettingHelp>
            {!dca && draft.side === "buy" && <SettingHelp label="NCAV 비율" help="NCAV 비율 = (유동자산 − 총부채) ÷ 시가총액입니다. 퀀트 매수 시 현재 비율이 설정값을 초과해야 합니다. 예: 1이면 1 초과만 통과하며 정확히 1은 통과하지 않습니다. 비워 두면 계좌 기본값을 사용합니다. 0도 검사를 끄지 않고 0 초과 조건을 적용합니다."><label className="space-y-1 text-xs"><span className="pr-8">NCAV 비율</span><input className={inputClass} type="number" min={0} step="any" value={draft.ncav} placeholder={`계좌 기본값: ${accountQuantRule?.ncav_ratio ?? 1}`} onChange={event => setField("ncav", event.target.value)} /></label></SettingHelp>}
          </div>
          <details open className="rounded-xl border border-neutral-200 p-3 dark:border-border-subtle-dark">
            <summary className="min-h-11 cursor-pointer text-sm font-bold">세부 선정 조건</summary>
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">각 항목의 ⓘ를 누르면 용도와 적용 기준을 확인할 수 있습니다.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectionFields.map(field => <SettingHelp key={field.key} label={field.label} help={<><p>{selectionHelp[field.key]}</p><p className="mt-2">비워 두면 계좌 기본값을 사용하고, 0이면 이 제한만 끕니다. 대상 선정에는 퀀트·정액 적립 모두 적용합니다. 미국 퀀트 매수는 주문 시점에도 이 재무 조건을 다시 확인합니다.</p></>}><label className="space-y-1 text-xs"><span className="pr-8">{field.label}</span><input className={inputClass} type="number" min={"min" in field ? field.min : undefined} step="any" value={draft.details[field.key]} placeholder={`계좌 기본값: ${accountQuantRule?.[field.key] ?? 0}`} onChange={event => { setDraft(previous => ({ ...previous, details: { ...previous.details, [field.key]: event.target.value } })); setError(""); }} /></label></SettingHelp>)}
              <SettingHelp label="콜워런트 제외" help="제외를 선택하면 PER·PBR·EPS·BPS가 모두 0인 종목을 선정 대상에서 제외합니다. 종목 유형을 직접 판별하는 대신 지표 조합으로 걸러내므로 재무 데이터가 모두 0인 종목도 제외될 수 있습니다. 계좌 기본값 선택 시 계좌 설정을 따릅니다."><label className="space-y-1 text-xs"><span className="pr-8">콜워런트 제외</span><select className={inputClass} value={draft.warrants} onChange={event => setField("warrants", event.target.value)}><option value="">계좌 기본값{accountQuantRule?.exclude_call_warrants == null ? "" : accountQuantRule.exclude_call_warrants ? " (제외)" : " (포함)"}</option><option value="true">제외</option><option value="false">포함</option></select></label></SettingHelp>
              <SettingHelp className="sm:col-span-2" label="제외 키워드 설정" help="계좌 기본값 사용은 계좌의 제외 키워드를 그대로 적용합니다. 그룹별 직접 지정은 계좌 목록을 이 그룹의 목록으로 대체합니다. 종목명에 해당 문자열이 포함되면 대상에서 제외합니다."><label className="space-y-1 text-xs"><span className="pr-8">제외 키워드 설정</span><select className={inputClass} value={draft.keywordMode} onChange={event => setField("keywordMode", event.target.value)}><option value="inherit">계좌 기본값 사용</option><option value="custom">그룹별 직접 지정</option></select></label></SettingHelp>
              {draft.keywordMode === "custom" ? <SettingHelp className="sm:col-span-2" label="종목명 제외 키워드" help="종목명에서 제외할 문자열을 쉼표로 구분해 입력합니다. 예: 홀딩스, 지주. 직접 지정 상태에서 비워 두면 이 그룹은 키워드로 종목을 제외하지 않습니다."><label className="space-y-1 text-xs"><span className="pr-8">종목명 제외 키워드</span><input className={inputClass} value={draft.keywords} placeholder="쉼표로 구분 (예: 홀딩스, 지주)" onChange={event => setField("keywords", event.target.value)} /></label></SettingHelp> : <p className="text-xs text-neutral-500 sm:col-span-2">계좌 제외 키워드: {accountQuantRule?.exclude_key_word?.join(", ") || "없음"}</p>}
            </div>
          </details>
          {draft.side === "sell" && <p className="text-xs text-rose-600 dark:text-rose-400">{dca ? "적립 포인트로 수량을 계산하고 보유 수량 내에서 매도합니다." : "퀀트 매도는 포인트·매수 조건과 무관하게 선정된 종목의 보유 수량 전량을 매도합니다."}</p>}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">입력값을 모두 채울 필요는 없습니다. 빈칸은 계좌 기본값을 사용하며, 월 예산은 계좌예산을 분배합니다.</p>
        </>}
        {stale && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">다른 곳에서 설정이 변경되었습니다. 편집기를 닫고 최신 설정으로 다시 열어 주세요.</p>}
        {!valid && draft.mode !== "weight" && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">예산은 0~10억의 정수, 활성 종목 수는 1~200의 정수, NCAV·PBR은 0 이상으로 입력해 주세요. 세부 조건은 유효한 숫자로 입력하고 최대 PBR은 최소 PBR보다 크게 설정해 주세요.</p>}
        {error && <div role="alert" className="space-y-2 text-xs text-rose-600 dark:text-rose-400">
            <p>{error}</p>
            {error.includes("계좌 주문 처리 중") && <p>계좌의 다른 주문이나 목표 비중 실행이 진행 중이거나 주문 결과 확인이 필요한 상태입니다. 목표 비중 실행 중이라면 해당 그룹의 ‘목표 비중’ 탭에서 ‘남은 주문 중단’ 후 ‘체결 확인·이어가기’로 접수 주문 결과를 확인해 주세요. 중단해도 접수 주문이 취소되지는 않습니다. 증권사 주문 내역을 확인한 뒤에도 계속 차단되면 관리자에게 문의해 주세요.</p>}
          </div>}
        {draft.mode !== "weight" && <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={buttonClass} onClick={() => { setDraft(previous => ({ ...previous, budget: "", count: "", ncav: "", details: Object.fromEntries(selectionFields.map(({ key }) => [key, ""])), warrants: "", keywordMode: "inherit", keywords: "" })); setResetRule(true); setError(""); }}>조건·예산 기본값</button>
          <button type="button" className={buttonClass} onClick={() => { setDraft(baseline); setResetRule(false); setError(""); }} disabled={!dirty}>변경 취소</button>
          <button type="button" className={buttonClass} onClick={onClose}>닫기</button>
          <button type="button" onClick={apply} disabled={!dirty || !valid || stale || saving} className={`${buttonClass} border-transparent bg-brand text-white hover:bg-brand-hover`}>{saving ? "적용 중…" : draft.mode !== baseline.mode ? "이 전략으로 적용" : "변경사항 적용"}</button>
        </div>}
        {tradingActive && dirty && draft.mode !== "weight" && <p className="text-xs text-neutral-500 dark:text-neutral-400">적용하면 다음 자동매매 판단부터 새 설정을 사용합니다.</p>}
        {resetRule && <p className="text-xs text-neutral-500 dark:text-neutral-400">적용 시 이 그룹의 선정 조건 전체와 예산을 기본값으로 되돌립니다. 방향과 전략은 현재 선택을 유지합니다.</p>}
      </fieldset>
    </section>
  );
}
