"use client";

import { useEffect, useRef, useState } from "react";
import type { RebalancingActionHandler, RebalancingPolicy, RebalancingRun } from "@/lib/features/capital/rebalancing";

interface Props {
  policy: RebalancingPolicy;
  currency: "KRW" | "USD";
  canExecute: boolean;
  onAction: RebalancingActionHandler;
  onBusyChange?: (busy: boolean) => void;
}
const buttonClass = "min-h-11 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-subtle-dark";
const labels: Record<string, string> = { running: "진행 중", waiting: "대기 중", needs_review: "확인 필요", completed: "계획 완료", stopped: "중단", failed: "실패", accepted: "주문 접수", submitting: "전송 확인 중", unknown: "응답 확인 필요", partial: "부분체결", filled: "체결", cancelled: "취소", rejected: "거절" };
const reasons: Record<string,string> = { queued: "실행 준비", outside_session: "정규장 실행 시간 대기", external_open_orders: "계좌의 다른 미체결 주문 대기", order_response_unknown: "증권사 주문번호 확인 필요 · 자동 재전송 차단", execution_check_failed: "잔고·시세·체결·저장 상태 확인 필요", settings_changed: "설정 변경으로 남은 주문 중단", stopped: "남은 주문 중단", plan_completed: "이번 계획 처리 완료", completed_with_skips: "일부 미실행을 포함해 이번 계획 처리 완료", order_settled: "체결 결과 반영", broker_capacity_insufficient: "주문가능금액·수량 부족", broker_capacity_partial: "주문가능금액·수량 범위로 일부만 주문", account_changed: "계좌 변경 확인 필요" };
const isActive = (run?: RebalancingRun) => run && !["completed", "stopped", "failed"].includes(run.status);

export default function RebalancingExecutionPanel({ policy, currency, canExecute, onAction, onBusyChange }: Props) {
  const [runs, setRuns] = useState<RebalancingRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const [brokerDate, setBrokerDate] = useState("");
  const inFlight = useRef(false), requestKey = useRef<string | null>(null), alive = useRef(true);
  const current = runs.find(run => isActive(run)) ?? runs[0];
  const unknown = current?.orders.find(order => ["unknown", "submitting"].includes(order.status) && !order.broker_id);
  useEffect(() => {
    let disposed = false;
    alive.current = true;
    const load = async () => {
      if (disposed || document.hidden || inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await onAction("runs");
        if (!disposed) { setRuns(result.runs ?? []); setError(""); }
      } catch { if (!disposed) setError("실행 기록을 조회하지 못했습니다. 마지막 조회 결과를 표시합니다."); }
      finally { inFlight.current = false; }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 5000);
    const visible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { disposed = true; alive.current = false; clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [onAction]);

  async function act(action: "execute" | "resume" | "stop" | "attach") {
    if (inFlight.current || (action === "execute" && (!canExecute || isActive(current)))) return;
    inFlight.current = true; setBusy(true); onBusyChange?.(true); setError("");
    if (action === "execute") requestKey.current ??= crypto.randomUUID();
    const body = action === "execute" ? { expected_policy: policy, request_key: requestKey.current }
      : { run_id: current?.id, ...(action === "attach" ? { broker_id: brokerId, broker_date: brokerDate } : {}) };
    try {
      const result = await onAction(action, body);
      if (alive.current && result.run) {
        setRuns(previous => [result.run!, ...previous.filter(run => run.id !== result.run!.id)]);
        if (action === "execute") requestKey.current = null;
      }
    } catch { if (alive.current) setError("요청 결과를 확인하지 못했습니다. 주문을 다시 보내지 말고 상태를 조회해 주세요. 실행 재시도는 같은 요청 키를 사용합니다."); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); onBusyChange?.(false); }
  }
  const format = (minor: number) => (minor / (currency === "USD" ? 100 : 1)).toLocaleString("ko-KR", { style: "currency", currency });
  return <section aria-label="실제 리밸런싱 실행" className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-border-subtle-dark">
    <p className="text-sm font-bold">실제 주문 · 실행 기록</p>
    <p className="text-xs text-neutral-500">저장된 전략과 미리보기를 확인한 뒤 실행하세요. 현재가 기준 지정가 주문을 전송하며, 미체결 주문은 다음 조회까지 기다립니다. 매도 체결을 확인한 뒤 매수를 다시 계산합니다.</p>
    <p className="text-xs text-neutral-500">실행 중 계좌의 다른 주문과 그룹 설정 변경은 차단됩니다. 남은 주문 중단은 이미 접수된 주문을 취소하지 않습니다. 취소가 필요하면 증권사에서 처리한 뒤 상태를 조회하세요.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={`${buttonClass} bg-brand text-white`} disabled={busy || !canExecute || !!isActive(current)} onClick={() => act("execute")}>실제 주문 실행</button>
      {current && <button type="button" className={buttonClass} disabled={busy} onClick={() => act("resume")}>체결 확인·이어가기</button>}
      {isActive(current) && <button type="button" className={buttonClass} disabled={busy || current?.stop_requested} onClick={() => act("stop")}>남은 주문 중단</button>}
    </div>
    {!canExecute && <p className="text-xs text-neutral-500">변경사항을 먼저 저장하고 주문 미리보기를 조회하면 실제 실행할 수 있습니다.</p>}
    {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    {current && <div className="space-y-2 text-xs" aria-live="polite">
      <p className="font-bold">{labels[current.status]} · {reasons[current.reason] ?? labels[current.reason] ?? current.reason}</p>
      <p>그룹 현금 장부 {format(current.cash_minor)} · {current.stop_requested ? "중단 요청됨 · 접수 주문 정산 대기" : current.phase === "sell" ? "매도 단계" : "매수 단계"}</p>
      <p className="break-all text-neutral-500">실행 {current.id} · 갱신 {new Date(current.updated_at).toLocaleString("ko-KR")}</p>
      {current.skipped?.map((item,index) => <p key={`skip-${index}`}>{item.symbol} · {reasons[item.reason] ?? item.reason}</p>)}
      {current.orders.map((order,index) => <div key={index} className="rounded border border-neutral-200 p-2 dark:border-border-subtle-dark"><p>{order.symbol} · {order.side === "buy" ? "매수" : "매도"} {order.quantity}주 · {labels[order.status] ?? order.status}</p><p>체결 {order.filled_quantity}주 / {format(order.filled_minor)}{order.broker_id ? ` · 주문번호 ${order.broker_id}` : ""}</p></div>)}
      {current.preview && <details><summary className="cursor-pointer">최근 잔고 기준 비중</summary>{current.preview.rows.map(row => <p key={row.symbol} className="mt-1">{row.symbol} · 현재 {(row.current_bp/100).toFixed(2)}% / 목표 {(row.target_bp/100).toFixed(2)}%</p>)}</details>}
      {unknown && <div className="space-y-2">
        <p>응답이 유실되었습니다. 증권사에서 종목·방향·수량·주문 시각을 확인한 후 주문번호를 연결하세요. 일치하는 주문이 없으면 계좌 잠금을 유지하고 운영자 확인이 필요합니다.</p>
        <label className="block">증권사 주문번호<input className="mt-1 min-h-11 w-full rounded border bg-transparent px-2" inputMode="numeric" value={brokerId} onChange={e => setBrokerId(e.target.value)} /></label>
        <label className="block">증권사 주문일자 (YYYYMMDD)<input className="mt-1 min-h-11 w-full rounded border bg-transparent px-2" inputMode="numeric" value={brokerDate} onChange={e => setBrokerDate(e.target.value)} /></label>
        <button type="button" className={buttonClass} disabled={busy || !/^\d{1,20}$/.test(brokerId) || !/^\d{8}$/.test(brokerDate)} onClick={() => act("attach")}>주문번호 연결·체결 조회</button>
      </div>}
    </div>}
    {runs.length > 1 && <details><summary className="cursor-pointer text-xs">이전 실행 {runs.length-1}건</summary>{runs.filter(run => run.id !== current?.id).map(run => <p key={run.id} className="mt-2 text-xs">{new Date(run.created_at).toLocaleString("ko-KR")} · {labels[run.status]} · {run.orders.length}건</p>)}</details>}
  </section>;
}
