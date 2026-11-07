"use client";

import RebalancingExecutionPanel from "./rebalancingExecutionPanel";
import { useEffect, useRef, useState } from "react";
import { parseScaled, type RebalancingPolicy, type RebalancingPreview, type RebalancingActionHandler } from "@/lib/features/capital/rebalancing";

interface Props {
  policy?: RebalancingPolicy | null;
  stocks: { symbol: string; name?: string }[];
  currency: "KRW" | "USD";
  stale: boolean;
  onApply: (policy: RebalancingPolicy) => Promise<unknown>;
  onPreview?: (policy: RebalancingPolicy) => Promise<RebalancingPreview>;
  onAction?: RebalancingActionHandler;
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
}
const inputClass = "min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-base dark:border-border-subtle-dark dark:bg-surface-dark-canvas";
const buttonClass = "min-h-11 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-subtle-dark";
const reasons: Record<string, string> = { planned: "예상 주문", within_tolerance: "허용 오차 이내", buy_only: "매수 전용 · 매도 제외", below_one_share: "1주 미만", insufficient_cash: "배정 현금 부족", not_sellable: "매도가능수량 없음", below_minimum: "최소 주문금액 미달" };

export default function WeightStrategyEditor({ policy, stocks, currency, stale, onApply, onPreview, onAction, onClose, onBusyChange }: Props) {
  const scale = currency === "USD" ? 100 : 1;
  const [weights, setWeights] = useState(() => Object.fromEntries(stocks.map(s => [s.symbol, String((policy?.targets.find(t => t.symbol === s.symbol)?.weight_bp ?? 0) / 100)])));
  const [cashWeight, setCashWeight] = useState(String((policy?.cash_bp ?? 10000) / 100));
  const [cash, setCash] = useState(String((policy?.cash_minor ?? 0) / scale));
  const [minimum, setMinimum] = useState(String((policy?.min_order_minor ?? 0) / scale));
  const [tolerance, setTolerance] = useState(String((policy?.tolerance_bp ?? 0) / 100));
  const [execution, setExecution] = useState<RebalancingPolicy["execution"]>(policy?.execution ?? "buy_only");
  const [frequency, setFrequency] = useState<"manual" | "once" | "weekly" | "monthly">(policy?.schedule?.frequency ?? "manual");
  const [startAt, setStartAt] = useState(policy?.schedule?.start_at ? new Date(Date.parse(policy.schedule.start_at) + 9 * 3600000).toISOString().slice(0,16) : "");
  const scheduleTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startAt) ? Date.parse(`${startAt}:00+09:00`) : NaN;
  const scheduleValid = frequency === "manual" || (Number.isFinite(scheduleTime) && (frequency !== "monthly" || Number(startAt.slice(8,10)) <= 28));
  const [busy, setBusy] = useState<"save" | "preview" | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ key: string; value: RebalancingPreview } | null>(null);
  const inFlight = useRef(false);
  const targets = stocks.map(s => ({ symbol: s.symbol, weight_bp: parseScaled(weights[s.symbol] ?? "") }));
  const cashBp = parseScaled(cashWeight), toleranceBp = parseScaled(tolerance);
  const money = (text: string) => currency === "USD" ? parseScaled(text) : /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : null;
  const cashMinor = money(cash), minimumMinor = money(minimum);
  const sum = targets.reduce((total, t) => total + (t.weight_bp ?? 0), cashBp ?? 0);
  const valid = scheduleValid && stocks.length > 0 && stocks.length <= 200 && sum === 10000 && targets.every(t => t.weight_bp !== null && t.weight_bp <= 10000) && cashBp !== null && cashBp <= 10000 && toleranceBp !== null && toleranceBp <= 10000 && cashMinor !== null && cashMinor <= 1e12 && minimumMinor !== null && minimumMinor <= 1e12;
  const draft: RebalancingPolicy = { ...(frequency !== "manual" && Number.isFinite(scheduleTime) ? { schedule: { frequency, start_at: new Date(scheduleTime).toISOString() } } : {}), execution, cash_bp: cashBp ?? 0, tolerance_bp: toleranceBp ?? 0, cash_minor: cashMinor ?? 0, min_order_minor: minimumMinor ?? 0, targets: targets.map(t => ({ symbol: t.symbol, weight_bp: t.weight_bp ?? 0 })) };
  const key = JSON.stringify(draft);
  // Include current props in the identity: a changed account/group snapshot invalidates prior results.
  const identity = JSON.stringify({ key, currency, stocks, policy, stale });
  const latest = useRef(identity);
  useEffect(() => { latest.current = identity; }, [identity]);
  const shownPreview = preview?.key === identity && !stale ? preview.value : null;
  const changed = !policy || JSON.stringify(draft.schedule ?? null) !== JSON.stringify(policy.schedule ?? null) || draft.execution !== policy.execution || draft.cash_bp !== policy.cash_bp || draft.tolerance_bp !== policy.tolerance_bp || draft.cash_minor !== policy.cash_minor || draft.min_order_minor !== policy.min_order_minor || draft.targets.length !== policy.targets.length || draft.targets.some(target => policy.targets.find(t => t.symbol === target.symbol)?.weight_bp !== target.weight_bp);
  const format = (amount: number) => (amount / scale).toLocaleString("ko-KR", { style: "currency", currency, maximumFractionDigits: currency === "USD" ? 2 : 0 });

  async function run(action: "save" | "preview") {
    if (inFlight.current || stale || !valid || (action === "preview" && !onPreview)) return;
    inFlight.current = true;
    setBusy(action); onBusyChange?.(true); setError(""); setPreview(null);
    const requested = identity;
    try {
      if (action === "save") await onApply(draft);
      else {
        const value = await onPreview!(draft);
        if (latest.current === requested) setPreview({ key: requested, value });
      }
    } catch {
      if (latest.current === requested) setError(action === "save" ? "설정을 저장하지 못했습니다. 편집값을 확인하고 다시 시도해 주세요." : "잔고·시세를 조회하지 못했습니다. 설정과 계좌 연결을 확인하고 다시 시도해 주세요.");
    } finally { inFlight.current = false; setBusy(null); onBusyChange?.(false); }
  }

  return <fieldset disabled={busy !== null} className="min-w-0 space-y-3">
    <legend className="text-sm font-bold">목표 비중 설정 · 주문 미리보기</legend>
    <p className="text-xs text-neutral-500">그룹 등록 종목의 계좌 전체 보유수량을 사용합니다. 수동 매수 물량도 포함됩니다. {currency === "USD" ? "미국 실전계좌를 달러로 평가하며 원화 예산을 자동 환산하지 않습니다. 미국 모의계좌 미리보기는 지원하지 않습니다." : "국내는 원화로 평가합니다."}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {stocks.map(stock => <label key={stock.symbol} className="min-w-0 space-y-1 text-xs"><span className="block break-all">{stock.name || stock.symbol} 목표 비중 (%)</span><input aria-label={`${stock.symbol} 목표 비중`} className={inputClass} type="number" min={0} max={100} step="0.01" value={weights[stock.symbol] ?? ""} onChange={e => setWeights(previous => ({ ...previous, [stock.symbol]: e.target.value }))} /></label>)}
      <label className="space-y-1 text-xs">목표 현금 비중 (%)<input className={inputClass} type="number" min={0} max={100} step="0.01" value={cashWeight} onChange={e => setCashWeight(e.target.value)} /></label>
      <label className="space-y-1 text-xs">그룹 배정 현금 ({currency})<input className={inputClass} type="number" min={0} step={1 / scale} value={cash} onChange={e => setCash(e.target.value)} /></label>
      <label className="space-y-1 text-xs">허용 오차 (±%p)<input className={inputClass} type="number" min={0} max={100} step="0.01" value={tolerance} onChange={e => setTolerance(e.target.value)} /></label>
      <label className="space-y-1 text-xs">최소 주문금액 ({currency})<input className={inputClass} type="number" min={0} step={1 / scale} value={minimum} onChange={e => setMinimum(e.target.value)} /></label>
      <label className="space-y-1 text-xs">실행 방식<select className={inputClass} value={execution} onChange={e => setExecution(e.target.value as RebalancingPolicy["execution"])}><option value="buy_only">부족 종목 매수만</option><option value="buy_sell">초과 종목 매도 포함</option></select></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs">예약 실행<select className={inputClass} value={frequency} onChange={e => setFrequency(e.target.value as typeof frequency)}><option value="manual">수동만</option><option value="once">일회</option><option value="weekly">주간</option><option value="monthly">월간</option></select></label>
      {frequency !== "manual" && <label className="space-y-1 text-xs">첫 예약 일시 (한국 시간)<input className={inputClass} type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} /></label>}
    </div>
    {frequency !== "manual" && <p className="text-xs text-neutral-500">저장하면 실제 주문 예약이 적용됩니다. 한국 시간 기준 같은 시각에 반복하며, 월간은 1~28일입니다. 예약 시각 이후 해당 시장 정규장 실행 시간에 처리합니다. 휴장·미체결·계좌 OFF일 때는 체결 상태를 먼저 확인합니다.</p>}
    {!scheduleValid && <p role="alert" className="text-xs text-rose-600">예약 일시를 입력해 주세요. 월간은 한국 시간 1~28일만 사용할 수 있습니다.</p>}
    {changed && <p className="text-xs text-brand-ink">미적용 목표 비중·예약 변경사항이 있습니다.</p>}
    <p aria-live="polite" className="text-xs font-bold">종목 + 현금 합계: {(sum / 100).toFixed(2)}%</p>
    {!valid && <p role="alert" className="text-xs text-rose-600">종목을 등록하고 비중 합계를 100%로 맞춰 주세요. 비중은 소수 둘째 자리, 금액은 {currency === "USD" ? "센트" : "원"} 단위까지 입력할 수 있습니다.</p>}
    <p className="text-xs text-neutral-500">배정 현금은 그룹 현금 장부의 초기값입니다. 실제 실행은 장부 잔액과 증권사 주문가능금액을 함께 확인합니다. 같은 배정값을 유지하면 이전 체결을 반영한 장부를 사용합니다. 적립 포인트는 제외합니다. 목표 비중으로 적용하면 기존 포인트 자동매매·충전을 중단합니다.</p>
    <p className="text-xs text-neutral-500">매수만 모드는 현금 부족으로 목표에 도달하지 못할 수 있습니다. 종목 삭제·이동은 매도하지 않으며 비중을 다시 설정해야 합니다.</p>
    {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" className={buttonClass} onClick={onClose}>닫기</button>
      <button type="button" className={buttonClass} disabled={!valid || stale || busy !== null || !onPreview} onClick={() => run("preview")}>{busy === "preview" ? "잔고 조회 중…" : "주문 미리보기"}</button>
      <button type="button" className={`${buttonClass} bg-brand text-white`} disabled={!valid || stale || !changed || busy !== null} onClick={() => run("save")}>{busy === "save" ? "저장 중…" : "목표 비중 적용"}</button>
    </div>
    {policy && onAction && <RebalancingExecutionPanel policy={policy} currency={currency} canExecute={!!shownPreview && !changed && !stale && busy === null} onAction={onAction} onBusyChange={onBusyChange} />}
    {shownPreview && <section aria-label="리밸런싱 주문 미리보기" className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-border-subtle-dark">
      <p className="text-xs font-bold">운용자산 {format(shownPreview.total_minor)} · 목표 현금 {format(shownPreview.target_cash_minor)}</p>
      <p className="text-xs text-neutral-500">조회 시각 {new Date(shownPreview.observed_at).toLocaleString("ko-KR")} · 주문 전송 없음</p>
      <p className="text-xs text-neutral-500">등록 순서로 배정 현금 내 매수량을 계산하며 비용 여유 0.3%를 반영합니다. 예상 매도대금은 매수에 사용하지 않습니다. 매도 체결 후 다시 조회해야 하며 미체결 주문·시세 지연은 반영하지 않습니다.</p>
      <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-xs"><thead><tr>{["종목", "현재 / 목표", "차이", "예상 주문", "사유"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{shownPreview.rows.map(row => <tr key={row.symbol}>
        <td className="p-2">{stocks.find(s => s.symbol === row.symbol)?.name || row.symbol}</td><td className="p-2">{(row.current_bp / 100).toFixed(2)}% / {(row.target_bp / 100).toFixed(2)}%<span className="block text-neutral-500">{format(row.current_minor)} / {format(row.target_minor)}</span></td><td className="p-2">{(row.difference_bp / 100).toFixed(2)}%p</td><td className="p-2">{row.quantity ? `${row.side === "buy" ? "매수" : "매도"} ${row.quantity}주` : "—"}<span className="block text-neutral-500">{format(row.amount_minor)}</span></td><td className="p-2">{reasons[row.reason] ?? row.reason}</td>
      </tr>)}</tbody></table></div>
    </section>}
  </fieldset>;
}
