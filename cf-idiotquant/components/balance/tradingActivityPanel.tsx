"use client";

import { Activity, Clock, RefreshCw, Gauge, Layers, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
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

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#242320] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-black text-neutral-900 dark:text-neutral-50 tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-neutral-400 mt-0.5">{hint}</p>}
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
        "flex items-center gap-3 rounded-xl border px-4 py-3 mb-4",
        open
          ? "border-[#86efac] dark:border-[#166534] bg-[#f0fdf4] dark:bg-[#14532d]/20"
          : "border-neutral-200 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#242320]"
      )}>
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {open && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-60" />}
          <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", open ? "bg-[#16a34a]" : "bg-neutral-400")} />
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-black", open ? "text-[#15803d] dark:text-[#4ade80]" : "text-neutral-500 dark:text-neutral-400")}>
            {open ? "매매 시간대 · 5분마다 실행" : "매매 시간대 아님 · 대기"}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">{country} 스케줄 {windowLabel} · 마지막 실행 {relTime(capital?.time_stamp?.current)}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-neutral-500 dark:text-neutral-400 bg-white dark:bg-[#1f1e1b] border border-neutral-200 dark:border-[#35332e] hover:border-[#16a34a]/50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        )}
      </div>

      {/* 요약 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <Stat icon={<Clock size={12} />} label="마지막 실행" value={relTime(capital?.time_stamp?.current)} />
        <Stat icon={<Gauge size={12} />} label="충전 속도" value={`${won(chargeRate)}`} hint="/ 5분 틱" />
        <Stat icon={<Layers size={12} />} label="활성 토큰 합계" value={won(activeTokenSum)} hint={`활성 ${activeCount}종목`} />
        <Stat icon={<Activity size={12} />} label="리필 인덱스" value={`${refillIdx} / ${stockList.length}`} hint="다음 매수 대상 위치" />
      </div>

      {/* 현재 매매 대상 (활성 그룹 소속 · action=active) — 워커가 이 종목들을 자동매매 */}
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#16a34a]">현재 매매 대상</p>
        <p className="text-[11px] font-bold text-neutral-400">활성 그룹 {activeCount}종목 · 예산 {won(activeTokenSum)}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-[#35332e] mb-4">
        <table className="w-full text-sm text-left min-w-[420px]">
          <thead>
            <tr className="bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-100 dark:border-[#35332e]">
              {["종목", "그룹", "NCAV", "예산(토큰)"].map((h, i) => (
                <th key={h} className={cn("px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider", i >= 2 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-[#35332e]/40">
            {activeStocks.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-neutral-400">활성 그룹에 매매 대상 종목이 없습니다. (그룹 자동매매 ON + 조건 충족 필요)</td></tr>
            ) : (
              activeStocks.map((s, i) => {
                const nm = displayName(s.symbol, s.name);
                const grp = s.group_id ? gmap.get(s.group_id) : undefined;
                const ncav = Number(s.ncavRatio);
                return (
                  <tr key={`${s.symbol}-${i}`} className="hover:bg-[#faf9f7] dark:hover:bg-[#242320]/50">
                    <td className="px-3 py-2">
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate max-w-[120px]">{nm}</p>
                      {nm !== s.symbol && <p className="text-[10px] text-neutral-400 font-mono">{s.symbol}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0fdf4] text-[#16a34a] dark:bg-[#14532d]/30 dark:text-[#4ade80] truncate max-w-[90px]">
                        {grp?.name ?? "-"}
                      </span>
                    </td>
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
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#16a34a] mb-2">최근 자동 체결</p>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-[#35332e]">
        <table className="w-full text-sm text-left min-w-[460px]">
          <thead>
            <tr className="bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-100 dark:border-[#35332e]">
              {["시각", "종목", "구분", "수량", "체결가"].map((h, i) => (
                <th key={h} className={cn("px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider", i >= 3 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-[#35332e]/40">
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-neutral-400">불러오는 중…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-neutral-400">아직 자동 체결 내역이 없습니다.</td></tr>
            ) : (
              logs.map((l, i) => {
                const sell = (l.buyOrSell ?? "") === "sell";
                const name = country === "US" ? (l.symbol ?? "-") : (l.stock_name ?? l.symbol ?? "-");
                const code = country === "US" ? (l.symbol ?? "") : (l.stock_code ?? "");
                const ts = Number.isFinite(l.ts) ? new Date(l.ts).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
                return (
                  <tr key={`${code}-${l.ts}-${i}`} className="hover:bg-[#faf9f7] dark:hover:bg-[#242320]/50">
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
                          : "bg-[#f0fdf4] text-[#16a34a] dark:bg-[#14532d]/30 dark:text-[#4ade80]"
                      )}>
                        {sell ? <ArrowDownCircle size={11} /> : <ArrowUpCircle size={11} />}
                        {sell ? "매도" : "매수"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">{Number(l.ORD_QTY ?? 0).toLocaleString("ko-KR")}주</td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">{fmtPrice(l.stck_prpr)}</td>
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
