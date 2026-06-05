"use client";

import React, { useMemo } from "react";
import { formatKoreanUnit } from "../../../../components/utils/financeCalc";
import { cn } from "@/lib/utils";
import {
  BarChart3, Calendar, DollarSign, Coins,
  TrendingUp, Layers, Activity,
} from "lucide-react";

interface MetricItem {
  label: string;
  val: string;
  sub?: string;
  highlight?: boolean;
  type?: "valuation" | "price" | "volume";
  desc: string;
}

// =========================================================================
// 지표 카드
// =========================================================================
function MetricCard({ m }: { m: MetricItem }) {
  return (
    <div className={cn(
      "p-3.5 rounded-xl border relative group cursor-help transition-colors select-none",
      m.highlight
        ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-900/40"
        : "bg-[#faf9f7] dark:bg-[#242320]/50 border-neutral-100 dark:border-[#35332e] hover:border-neutral-200 dark:hover:border-neutral-700"
    )}>
      <p className={cn(
        "text-[9px] font-bold uppercase tracking-wider mb-1.5 truncate",
        m.highlight ? "text-indigo-500 dark:text-indigo-400" : "text-neutral-400"
      )}>
        {m.label}
      </p>
      <p className={cn(
        "text-sm font-black font-mono tabular-nums leading-tight",
        m.highlight
          ? "text-indigo-700 dark:text-indigo-300"
          : "text-neutral-900 dark:text-white"
      )}>
        {m.val}
      </p>
      {m.sub && (
        <div className="flex items-center gap-1 mt-1.5">
          <Calendar size={9} className="text-neutral-400 shrink-0" />
          <span className="text-[9px] text-neutral-400 font-mono">
            {m.sub.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}
          </span>
        </div>
      )}

      {/* 호버 툴팁 */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-neutral-900 dark:bg-[#242320] text-white text-[10px] p-2.5 rounded-xl shadow-lg border border-neutral-700/60 z-50 pointer-events-none whitespace-normal break-keep text-center leading-relaxed">
        <p className="font-bold text-neutral-400 text-[9px] pb-1 mb-1 tracking-widest font-mono uppercase border-b border-neutral-700">{m.label}</p>
        <p className="text-neutral-200 font-medium">{m.desc}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-neutral-900 dark:border-t-neutral-800" />
      </div>
    </div>
  );
}

// 섹션 레이블
function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-neutral-400">{icon}</span>
      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">{label}</span>
      <div className="flex-1 h-px bg-[#faf9f7] dark:bg-[#242320]" />
    </div>
  );
}

// =========================================================================
// StockMetrics
// =========================================================================
export const StockMetrics = ({ data, isUs }: { data: any; isUs: boolean }) => {
  if (!data) return null;

  const n = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const metrics: MetricItem[] = useMemo(() => {
    if (isUs) {
      const detail = data.usDetail?.output;
      const search = data.usSearchInfo?.output;
      if (!detail || !search) return [];

      const usMarketCap = n(detail.last) * n(search.lstg_stck_num);
      const turnoverRatio = usMarketCap > 0
        ? (100 * n(detail.tamt) / usMarketCap).toFixed(3)
        : "0";

      return [
        { label: "PER",     val: detail.perx ? `${detail.perx}배` : "—", type: "valuation", desc: "주가수익비율. 주가가 1주당 순이익의 몇 배인지 나타냅니다." },
        { label: "PBR",     val: detail.pbrx ? `${detail.pbrx}배` : "—", type: "valuation", desc: "주가순자산비율. 주가가 1주당 순자산의 몇 배인지 나타냅니다." },
        { label: "EPS",     val: n(detail.epsx) ? `$${n(detail.epsx).toLocaleString()}` : "—", type: "valuation", desc: "주당순이익. 기업이 1주당 얼마의 순이익을 냈는지 보여줍니다." },
        { label: "BPS",     val: n(detail.bpsx) ? `$${n(detail.bpsx).toLocaleString()}` : "—", type: "valuation", desc: "주당순자산. 청산 시 1주당 주주에게 돌아가는 자산 가치입니다." },
        { label: "52주 최고", val: n(detail.h52p) ? `$${n(detail.h52p).toLocaleString()}` : "—", sub: detail.h52d,  type: "price", desc: "최근 1년간 가장 높았던 주가와 기록한 날짜입니다." },
        { label: "52주 최저", val: n(detail.l52p) ? `$${n(detail.l52p).toLocaleString()}` : "—", sub: detail.l52d,  type: "price", desc: "최근 1년간 가장 낮았던 주가와 기록한 날짜입니다." },
        { label: "시가총액",  val: `$${formatKoreanUnit(usMarketCap)}`, type: "volume", desc: "상장주식 전체를 현재 주가로 평가한 총 금액입니다." },
        { label: "상장주식수", val: n(search.lstg_stck_num) ? `${n(search.lstg_stck_num).toLocaleString()}주` : "—", type: "volume", desc: "시장에 발행되어 상장된 총 주식 수입니다." },
        { label: "거래량",    val: n(detail.tvol) ? `${n(detail.tvol).toLocaleString()}` : "—", type: "volume", desc: "당일 시장에서 매매가 완료된 주식의 총 수량입니다." },
        { label: "거래대금",  val: `$${formatKoreanUnit(n(detail.tamt))}`, type: "volume", desc: "당일 거래된 주식의 총 거래 금액입니다." },
        { label: "대금 / 시총", val: `${turnoverRatio}%`, highlight: true, type: "volume", desc: "시가총액 대비 거래대금 비율. 자본의 유동성 및 시장 활성도를 나타내는 퀀트 지표입니다." },
      ];
    } else {
      if (!data.kiPrice?.output || !data.kiChart?.output1) return [];
      const p = data.kiPrice.output;
      const c = data.kiChart.output1;

      const calculatedMarketCap = n(c.stck_prpr) * n(c?.lstn_stcn ?? 1);
      const turnoverRatio = calculatedMarketCap > 0
        ? (100 * n(p.acml_tr_pbmn) / calculatedMarketCap).toFixed(3)
        : "0";

      // 액면분할·합병 보정: 일별 상장주식수 기준으로 과거 가격을 현재 주식수 기준으로 환산
      const currentShares = n(c.lstn_stcn);
      const dailyItems = data.kiChart.output2 ?? [];
      let adj52High = 0;
      let adj52HighDate = "";
      let adj52Low = Infinity;
      let adj52LowDate = "";

      if (currentShares > 0 && dailyItems.length > 0) {
        for (const day of dailyItems) {
          const dayShares = n(day.lstn_stcn);
          const ratio = dayShares > 0 ? dayShares / currentShares : 1;
          const adjHigh = n(day.stck_hgpr) * ratio;
          const adjLow  = n(day.stck_lwpr) * ratio;
          if (adjHigh > adj52High) { adj52High = adjHigh; adj52HighDate = day.stck_bsop_date ?? ""; }
          if (adjLow > 0 && adjLow < adj52Low) { adj52Low = adjLow; adj52LowDate = day.stck_bsop_date ?? ""; }
        }
      }
      const has52High = adj52High > 0;
      const has52Low  = adj52Low < Infinity;
      const fmt52Date = (d: string) => d ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : "";

      return [
        { label: "PER",     val: p.per ? `${p.per}배` : "—", type: "valuation", desc: "주가수익비율. 주가가 1주당 순이익의 몇 배인지 나타냅니다." },
        { label: "PBR",     val: p.pbr ? `${p.pbr}배` : "—", type: "valuation", desc: "주가순자산비율. 주가가 1주당 순자산의 몇 배인지 나타냅니다." },
        { label: "EPS",     val: n(p.eps) ? `${n(p.eps).toLocaleString()}원` : "—", type: "valuation", desc: "주당순이익. 기업이 1주당 얼마의 순이익을 냈는지 보여줍니다." },
        { label: "BPS",     val: n(p.bps) ? `${n(p.bps).toLocaleString()}원` : "—", type: "valuation", desc: "주당순자산. 청산 시 1주당 주주에게 돌아가는 자산 가치입니다." },
        { label: "52주 최고", val: has52High ? `${Math.round(adj52High).toLocaleString()}원` : "—", sub: fmt52Date(adj52HighDate), type: "price", desc: "최근 1년간 가장 높았던 주가 (액면분할·합병 보정)." },
        { label: "52주 최저", val: has52Low  ? `${Math.round(adj52Low).toLocaleString()}원`  : "—", sub: fmt52Date(adj52LowDate),  type: "price", desc: "최근 1년간 가장 낮았던 주가 (액면분할·합병 보정)." },
        { label: "시가총액",  val: formatKoreanUnit(calculatedMarketCap), type: "volume", desc: "상장주식 전체를 현재 주가로 평가한 총 금액입니다." },
        { label: "상장주식수", val: n(c.lstn_stcn) ? `${n(c.lstn_stcn).toLocaleString()}주` : "—", type: "volume", desc: "시장에 발행되어 상장된 총 주식 수입니다." },
        { label: "거래량",    val: n(p.acml_vol) ? `${n(p.acml_vol).toLocaleString()}` : "—", type: "volume", desc: "당일 시장에서 매매가 완료된 주식의 총 수량입니다." },
        { label: "거래대금",  val: formatKoreanUnit(n(p.acml_tr_pbmn)), type: "volume", desc: "당일 거래된 주식의 총 거래 금액입니다." },
        { label: "대금 / 시총", val: `${turnoverRatio}%`, highlight: true, type: "volume", desc: "시가총액 대비 거래대금 비율. 자본의 유동성 및 시장 활성도를 나타내는 퀀트 지표입니다." },
      ];
    }
  }, [data, isUs]);

  if (metrics.length === 0) return null;

  const valuationMetrics = metrics.filter(m => m.type === "valuation");
  const priceMetrics     = metrics.filter(m => m.type === "price");
  const volumeMetrics    = metrics.filter(m => m.type === "volume");

  return (
    <div className="w-full h-full bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm flex flex-col">

      {/* ── 헤더 ── */}
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#faf9f7] dark:bg-[#242320] rounded-lg flex items-center justify-center border border-neutral-200 dark:border-[#3a3834] shrink-0">
            <BarChart3 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 tracking-tight leading-tight">
              시장 지표
            </h4>
            <p className="text-[9px] text-neutral-400 font-mono font-bold uppercase tracking-wider mt-0.5">
              Market Indicators
            </p>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black font-mono uppercase tracking-wider shrink-0",
          isUs
            ? "bg-[#fff8f5] dark:bg-[#3d1f10]/30 text-[#bf6644] dark:text-[#d97757] border-[#f9c9b0]/60 dark:border-[#7d3f27]/40"
            : "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-900/40"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse shrink-0", isUs ? "bg-[#fff8f5]0" : "bg-indigo-500")} />
          {isUs
            ? <><DollarSign size={10} />USD</>
            : <><Coins size={10} />KRW</>
          }
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      <div className="flex-1 p-5 space-y-5">

        {/* 밸류에이션 지표 */}
        {valuationMetrics.length > 0 && (
          <div>
            <SectionLabel icon={<Layers size={11} />} label="밸류에이션" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {valuationMetrics.map((m, i) => <MetricCard key={i} m={m} />)}
            </div>
          </div>
        )}

        {/* 52주 가격 범위 */}
        {priceMetrics.length > 0 && (
          <div>
            <SectionLabel icon={<TrendingUp size={11} />} label="52주 가격 범위" />
            <div className="grid grid-cols-2 gap-2.5">
              {priceMetrics.map((m, i) => <MetricCard key={i} m={m} />)}
            </div>
          </div>
        )}

        {/* 시장 데이터 */}
        {volumeMetrics.length > 0 && (
          <div>
            <SectionLabel icon={<Activity size={11} />} label="시장 데이터" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {volumeMetrics.map((m, i) => <MetricCard key={i} m={m} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
