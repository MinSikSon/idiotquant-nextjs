"use client";

import { Activity, Clock, RefreshCw, Gauge, Layers, ArrowDownCircle, ArrowUpCircle, ChevronDown } from "lucide-react";
import { executionAmount, numericValue, stockBudgetProgress } from "@/lib/features/capital/tradingSummary";
import { cn } from "@/lib/utils";
import { KrUsCapitalType, TradingActivityState, TradingLog, UsCapitalStockItem, LIKES_GROUP_ID } from "@/lib/features/capital/capitalSlice";
import validCorpCodeArray from "@/public/data/validCorpCodeArray.json";
import validCorpNameArray from "@/public/data/validCorpNameArray.json";

// KR 종목코드(6자리) → 종목명. stockListTable 과 동일 소스(병렬 배열).
const KR_CODE_TO_NAME: Record<string, string> = (() => {
  const codes = validCorpCodeArray as string[];
  const names = validCorpNameArray as string[];
  const map: Record<string, string> = {};
  for (let i = 0; i < codes.length; i++) map[codes[i]] = names[i];
  return map;
})();
const displayName = (symbol: string, name?: string | null) => {
  const n = (name ?? "").trim();
  if (n && n !== symbol) return n;
  return KR_CODE_TO_NAME[symbol] || symbol;
};

// 자동매매 스케줄 창 (워커 isWithinTimeRange 와 동일): KR 08~18 / US 21~06 KST
function isWindowOpen(country: "KR" | "US"): boolean {
  const kst = new Date(Date.now() + 9 * 3600_000);
  const h = kst.getUTCHours(); // Date+9h 이므로 UTC 시각이 KST 시각
  return country === "KR" ? (h >= 8 && h < 18) : (h >= 21 || h < 6);
}

function relTime(dateStr?: string): string {
  if (!dateStr) return "실행 기록 없음";
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return "-";
  const diff = Date.now() - t;
  if (diff < 0) return "방금";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

const won = (n: number) => `₩${Math.round(Number(n) || 0).toLocaleString("ko-KR")}`;

// 워커가 종목별로 기록한 마지막 매매 결과(last_result.code) → 표시 라벨/색상.
type LastResult = { at?: string; code?: string; msg?: string };
const RESULT_META: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  bought: { label: "매수 접수", tone: "green" },
  sold: { label: "매도 접수", tone: "green" },
  insufficient_token: { label: "예산 모으는 중", tone: "amber" },
  condition_fail: { label: "조건 미달", tone: "amber" },
  no_financials: { label: "재무 없음", tone: "amber" },
  sell_no_holding: { label: "보유 없음", tone: "neutral" },
  pdno_unresolved: { label: "종목코드 오류", tone: "red" },
  no_price: { label: "현재가 조회 실패", tone: "red" },
  order_error: { label: "주문 오류", tone: "red" },
};
const RESULT_TONE_CLS: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  red: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
  neutral: "bg-neutral-100 text-neutral-500 dark:bg-surface-dark-muted dark:text-neutral-400",
};

function StatusBadge({ lr, compact = false }: { lr?: LastResult; compact?: boolean }) {
  if (!lr?.code) return compact ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400" role="img" aria-label="대기" /> : <span className="text-[11px] text-neutral-400">대기</span>;
  const meta = RESULT_META[lr.code] ?? { label: lr.code, tone: "neutral" as const };
  const detail = [lr.msg, relTime(lr.at)].filter(Boolean).join(" · ");
  if (compact) return <span title={detail} role="img" aria-label={meta.label} className={cn("inline-block h-1.5 w-1.5 rounded-full", meta.tone === "green" ? "bg-emerald-500" : meta.tone === "amber" ? "bg-amber-400" : meta.tone === "red" ? "bg-rose-500" : "bg-neutral-400")} />;
  return (
    <span title={detail}
      className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", RESULT_TONE_CLS[meta.tone])}>
      {meta.label}
    </span>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-border-subtle-dark bg-surface-canvas dark:bg-surface-dark-card px-2.5 py-2 sm:px-3 sm:py-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap sm:block">
        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 sm:mb-1">
          {icon}
          <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-sm font-black text-neutral-900 dark:text-neutral-50 tabular-nums leading-tight text-left sm:text-left">{value}</p>
      </div>
      {hint && <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-left sm:text-left sm:mt-0.5">{hint}</p>}
    </div>
  );
}

export default function TradingActivityPanel({
  country, capital, activity, onRefresh,
}: {
  country: "KR" | "US";
  capital: KrUsCapitalType;
  activity: TradingActivityState;
  onRefresh?: () => void;
}) {
  const open = isWindowOpen(country);
  const windowLabel = country === "KR" ? "08:00~18:00 KST" : "21:00~06:00 KST";

  const stockList = capital?.stock_list ?? [];
  // 현재 매매 대상 = 활성 그룹(is_trading_active) 소속 + action==="active".
  // stockListTable 의 '매매중' 정의 및 워커 makeStockList 활성화 기준과 일치.
  const gmap = new Map((capital?.groups ?? []).filter(g => g.id !== LIKES_GROUP_ID).map(g => [g.id, g]));
  const isActiveGroupStock = (s: UsCapitalStockItem) => {
    const g = s.group_id ? gmap.get(s.group_id) : undefined;
    return !!g && g.is_trading_active !== false && s.action === "active";
  };
  const activeStocks = stockList.filter(isActiveGroupStock);
  const activeTokenSum = activeStocks.reduce((acc, s) => acc + Number(s.token ?? 0), 0);
  const activeCount = activeStocks.length;
  const chargeRate = Number(capital?.charge_info?.capital_charge_rate ?? 0);
  const refillIdx = capital?.token_info?.refill_stock_index ?? 0;

  const logs: TradingLog[] = activity?.logs ?? [];
  const loading = activity?.state === "pending";

  const priceUnit = country === "US" ? "$" : "₩";
  const fmtPrice = (v: string | number | undefined) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return `${priceUnit}${n.toLocaleString("ko-KR")}`;
  };

  return (
    <div>
      {/* 가동 상태 배너 */}
      <div className={cn(
        "flex items-center gap-2 rounded-xl border px-2.5 py-2 mb-2 md:gap-3 md:px-4 md:py-3 md:mb-4",
        open
          ? "border-brand-light-hover dark:border-brand/40 bg-brand-light dark:bg-brand-muted/20"
          : "border-neutral-200 dark:border-border-subtle-dark bg-surface-canvas dark:bg-surface-dark-card"
      )}>
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {open && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />}
          <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", open ? "bg-brand" : "bg-neutral-400")} />
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-black", open ? "text-brand-ink-hover dark:text-[#4ade80]" : "text-neutral-500 dark:text-neutral-400")}>
            {open ? "매매 시간대 · 5분마다 실행" : "매매 시간대 아님 · 대기"}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">{country} 스케줄 {windowLabel} · 마지막 실행 {relTime(capital?.time_stamp?.current)}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="min-h-11 sm:min-h-0 shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-neutral-500 dark:text-neutral-400 bg-white dark:bg-surface-dark border border-neutral-200 dark:border-border-subtle-dark hover:border-brand/50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        )}
      </div>

      {/* 요약 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5 mb-2 md:mb-4">
        <Stat icon={<Clock size={12} />} label="마지막 실행" value={relTime(capital?.time_stamp?.current)} />
        <Stat icon={<Gauge size={12} />} label="충전 속도" value={`${won(chargeRate)}`} hint="/ 5분 틱" />
        <Stat icon={<Layers size={12} />} label="활성 포인트 합계" value={won(activeTokenSum)} hint={`활성 ${activeCount}종목`} />
        <Stat icon={<Activity size={12} />} label="리필 인덱스" value={`${refillIdx} / ${stockList.length}`} hint="다음 매매 대상 위치" />
      </div>

      {/* 현재 매매 대상 (활성 그룹 소속 · action=active) — 워커가 이 종목들을 자동매매 */}
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-ink">현재 매매 대상</p>
        <p className="text-[11px] font-bold text-neutral-400">활성 그룹 {activeCount}종목 · 예산 {won(activeTokenSum)}</p>
      </div>
      <div className="mb-4 space-y-2 sm:hidden">
        {activeStocks.length === 0 && <p className="rounded-xl border border-neutral-200 p-4 text-xs text-neutral-500 dark:border-border-subtle-dark">활성 그룹에 매매 대상 종목이 없습니다.</p>}
        {activeStocks.map((stock, index) => {
          const group = stock.group_id ? gmap.get(stock.group_id) : undefined;
          const point = stockBudgetProgress(stock, country, capital.frst_bltn_exrt);
          const unitKrw = point?.unitKrw ?? null;
          const points = point?.points ?? 0;
          const progress = point?.percent ?? 0;
          return <details key={`${stock.symbol}-${index}`} className="group/stock min-w-0 rounded-xl border border-neutral-200 px-3 dark:border-border-subtle-dark">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{displayName(stock.symbol, stock.name)}</span>
              <span className="shrink-0"><StatusBadge lr={(stock as unknown as { last_result?: LastResult }).last_result} compact /></span>
              <span className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums text-brand-ink">{won(stock.token ?? 0)}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform group-open/stock:rotate-180" aria-hidden="true" />
            </summary>
            <div className="pb-3 pt-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="break-words text-sm font-bold">{displayName(stock.symbol, stock.name)}</p><p className="mt-0.5 break-words text-[11px] text-neutral-500 dark:text-neutral-400">{group?.name ?? "—"} · {group?.dca ? "정액" : "일반"}{group?.side === "sell" ? "매도" : "매수"}</p></div>
              <StatusBadge lr={(stock as unknown as { last_result?: LastResult }).last_result} />
            </div>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs"><span className="text-neutral-500 dark:text-neutral-400">현재 포인트</span><strong className="break-all text-base tabular-nums text-brand-ink">{won(stock.token ?? 0)}</strong></div>
            {group?.dca && unitKrw !== null && <div className="mt-2">
              <div className="flex flex-wrap justify-between gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"><span>1주 예산 적립</span><span>{points >= unitKrw ? `예산 기준 ${Math.floor(points / unitKrw).toLocaleString("ko-KR")}주` : `${won(unitKrw - points)} 더 필요`}</span></div>
              <div role="progressbar" aria-label={`${displayName(stock.symbol, stock.name)} 1주 예산 적립`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-surface-dark-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} /></div>
              <p className="mt-1 text-[10px] text-neutral-400">저장된 시세 기준{group.side === "sell" ? " · 매도는 보유 수량 한도" : " · 실제 주문 수량은 달라질 수 있음"}</p>
            </div>}
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">NCAV {Number.isFinite(Number(stock.ncavRatio)) ? `${Number(stock.ncavRatio).toFixed(2)}x` : "—"}</p>
            </div>
          </details>;
        })}
      </div>
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-neutral-200 dark:border-border-subtle-dark mb-4">
        <table className="w-full text-sm text-left min-w-[500px]">
          <thead>
            <tr className="bg-[#fcfaf7] dark:bg-surface-dark border-b border-neutral-100 dark:border-border-subtle-dark">
              {["종목", "그룹", "상태", "NCAV", "예산(토큰)"].map((h, i) => (
                <th key={h} className={cn("px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider", i >= 3 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-border-subtle-dark/40">
            {activeStocks.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-neutral-400">활성 그룹에 매매 대상 종목이 없습니다. (그룹 자동매매 ON + 조건 충족 필요)</td></tr>
            ) : (
              activeStocks.map((s, i) => {
                const nm = displayName(s.symbol, s.name);
                const grp = s.group_id ? gmap.get(s.group_id) : undefined;
                const ncav = Number(s.ncavRatio);
                return (
                  <tr key={`${s.symbol}-${i}`} className="hover:bg-surface-canvas dark:hover:bg-surface-dark-card/50">
                    <td className="px-3 py-2">
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate max-w-[120px]">{nm}</p>
                      {nm !== s.symbol && <p className="text-[10px] text-neutral-400 font-mono">{s.symbol}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 truncate max-w-[90px]">
                        {grp?.name ?? "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2"><StatusBadge lr={(s as unknown as { last_result?: LastResult }).last_result} /></td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">{Number.isFinite(ncav) ? `${ncav.toFixed(2)}x` : "-"}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">{won(s.token ?? 0)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 최근 자동 체결 */}
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-ink mb-2">최근 자동 주문 접수 · 포인트 기록</p>
      <details className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
        <summary className="min-h-11 cursor-pointer py-3 font-medium">주문 접수와 실제 체결·포인트의 차이</summary>
        <p className="pb-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">주문금액은 로그의 가격 × 주문 수량이며 실제 체결금액과 다를 수 있습니다. 기록된 포인트는 차감 전 값입니다. 매수·정액매도 접수 시 포인트가 차감되지만, 이 로그에는 차감 후 잔액과 실제 체결 확인이 없어 차감·체결 검증은 할 수 없습니다.</p>
      </details>
      {activity.state === "rejected" && <p role="alert" className="mb-2 text-xs text-rose-500">체결 내역 조회 실패 · 새로고침해 주세요. 기존 내역이 표시될 수 있습니다.</p>}
      <div className="space-y-2 sm:hidden">
        {logs.length === 0 && <p className="rounded-xl border border-neutral-200 p-4 text-xs text-neutral-500 dark:border-border-subtle-dark">{loading ? "불러오는 중…" : "아직 자동 주문 접수 내역이 없습니다."}</p>}
        {logs.map((log, index) => {
          const amount = executionAmount(log);
          const remaining = numericValue(log.remaining_token);
          const sell = log.buyOrSell === "sell";
          const name = country === "US" ? log.symbol : log.stock_name || log.stock_code || log.symbol;
          return <details key={`${log.ts}-${index}`} className="group/order min-w-0 rounded-xl border border-neutral-200 px-3 dark:border-border-subtle-dark">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{name || "—"}</span>
              <span className={cn("shrink-0 text-[11px] font-bold", sell ? "text-rose-500" : "text-brand-ink")}>{sell ? "매도" : "매수"}</span>
              <span className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums">{amount === null ? "미확인" : fmtPrice(amount)}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform group-open/order:rotate-180" aria-hidden="true" />
            </summary>
            <div className="pb-3 pt-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="break-words text-sm font-bold">{name || "—"}</p><p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{Number.isFinite(log.ts) ? new Date(log.ts).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
              <span className={cn("shrink-0 rounded-md px-2 py-1 text-xs font-bold", sell ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30")}>{sell ? "매도 접수" : "매수 접수"}</span>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-500 dark:text-neutral-400">주문금액</dt><dd className="break-all text-sm font-bold tabular-nums">{amount === null ? "미확인" : fmtPrice(amount)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-500 dark:text-neutral-400">수량 × 기준가</dt><dd className="break-all tabular-nums">{Number(log.ORD_QTY ?? 0).toLocaleString("ko-KR")}주 × {fmtPrice(log.stck_prpr)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-neutral-100 pt-2 dark:border-border-subtle-dark"><dt className="text-neutral-500 dark:text-neutral-400">차감 전 포인트 · 원화</dt><dd className="break-all font-bold tabular-nums">{remaining === null ? "잔액 기록 없음" : won(remaining)}</dd></div>
            </dl>
            </div>
          </details>;
        })}
      </div>
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-neutral-200 dark:border-border-subtle-dark">
        <table className="w-full text-sm text-left min-w-[460px]">
          <thead>
            <tr className="bg-[#fcfaf7] dark:bg-surface-dark border-b border-neutral-100 dark:border-border-subtle-dark">
              {["시각", "종목", "구분", "수량", "주문 기준가", "주문금액", "차감 전 포인트 (원)"].map((h, i) => (
                <th key={h} className={cn("px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider", i >= 3 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-border-subtle-dark/40">
            {loading && logs.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-neutral-400">불러오는 중…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-neutral-400">아직 자동 주문 접수 내역이 없습니다.</td></tr>
            ) : (
              logs.map((l, i) => {
                const amount = executionAmount(l);
                const remaining = numericValue(l.remaining_token);
                const sell = (l.buyOrSell ?? "") === "sell";
                const name = country === "US" ? (l.symbol ?? "-") : (l.stock_name ?? l.symbol ?? "-");
                const code = country === "US" ? (l.symbol ?? "") : (l.stock_code ?? "");
                const ts = Number.isFinite(l.ts) ? new Date(l.ts).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
                return (
                  <tr key={`${code}-${l.ts}-${i}`} className="hover:bg-surface-canvas dark:hover:bg-surface-dark-card/50">
                    <td className="px-3 py-2 text-[11px] text-neutral-400 tabular-nums whitespace-nowrap">{ts}</td>
                    <td className="px-3 py-2">
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate max-w-[120px]">{name}</p>
                      {code && <p className="text-[10px] text-neutral-400 font-mono">{code}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black",
                        sell
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                      )}>
                        {sell ? <ArrowDownCircle size={11} /> : <ArrowUpCircle size={11} />}
                        {sell ? "매도" : "매수"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">{Number(l.ORD_QTY ?? 0).toLocaleString("ko-KR")}주</td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">{fmtPrice(l.stck_prpr)}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold tabular-nums whitespace-nowrap">{amount === null ? "미확인" : fmtPrice(amount)}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{remaining === null ? <span className="text-neutral-400">잔액 기록 없음</span> : <span className="font-bold text-brand-ink">{won(remaining)}</span>}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
