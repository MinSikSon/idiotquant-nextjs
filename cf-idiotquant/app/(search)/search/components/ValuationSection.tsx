"use client";

import React, { useMemo } from "react";
import { 
  CalculatorIcon, 
  ChartBarIcon, 
  Squares2X2Icon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { calculateKrNcav, calculateKrSRIM, calculateUsNcav, calculateUsSRIM, ValuationResult } from "@/components/utils/financeCalc";

interface ValuationSectionProps {
  data: any;
  isUs: boolean;
}

export const ValuationSection = ({ data, isUs }: ValuationSectionProps) => {
  const ncavData = useMemo(() => {
    if (isUs) return data?.finnhubData && data?.usDetail ? calculateUsNcav(data.finnhubData, data.usDetail) : null;
    return data?.kiBS && data?.kiChart ? calculateKrNcav(data.kiBS, data.kiChart) : null;
  }, [data, isUs]);

  const srimData = useMemo(() => {
    if (isUs) return data?.finnhubData && data?.usDetail ? calculateUsSRIM(data.finnhubData, data.usDetail) : null;
    return data?.kiBS && data?.kiChart && data?.kiIS ? calculateKrSRIM(data.kiBS, data.kiIS, data.kiChart) : null;
  }, [data, isUs]);

  const currency = isUs ? "$" : "₩";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {ncavData && ncavData !== "ERROR_INSUFFICIENT_DATA" && (
        <StrategyCard 
          result={ncavData as ValuationResult} 
          icon={<CalculatorIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />} 
          currency={currency} 
          isBs={true}
        />
      )}
      {srimData && srimData !== "ERROR_INSUFFICIENT_DATA" && (
        <StrategyCard 
          result={srimData as ValuationResult} 
          icon={<ChartBarIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />} 
          currency={currency} 
          isBs={false}
        />
      )}
    </div>
  );
};

interface StrategyCardProps {
  result: ValuationResult;
  icon: React.ReactNode;
  currency: string;
  isBs: boolean;
}

function StrategyCard({ result, icon, currency, isBs }: StrategyCardProps) {
  return (
    <div className="rounded-[2rem] p-[5px] bg-gradient-to-br from-zinc-300 via-zinc-200 to-zinc-400 dark:from-zinc-700 via-zinc-800/80 to-zinc-900 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform-gpu relative overflow-hidden transition-colors duration-300 flex flex-col">
      
      {/* 정밀 배경 격자 데코레이션 패널 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />
      
      {/* 메인 이너 컨테이너 */}
      <div className="w-full h-full rounded-[1.8rem] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl relative z-10 overflow-hidden flex flex-col flex-1">
        
        {/* 상단 테마별 은은한 래디얼 그라데이션 조명 */}
        <div className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] pointer-events-none z-0 opacity-40 dark:opacity-20",
          isBs ? "from-blue-100 via-transparent to-transparent" : "from-emerald-100 via-transparent to-transparent"
        )} />

        {/* Card Header Section */}
        <div className="px-5 py-4 md:px-6 md:py-5 border-b border-black/[0.06] dark:border-white/5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
              {icon}
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                {result.title}
              </h3>
              <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono mt-0.5">
                {result.formula}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-full border border-black/[0.03] dark:border-white/5 shadow-sm">
            <span className="text-[8px] font-mono font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest italic flex items-center gap-1">
              <Squares2X2Icon className="w-2.5 h-2.5" /> QUANT MODEL
            </span>
          </div>
        </div>

        {/* 핵심 메트릭 그리드 대시보드 */}
        <div className="p-4 grid grid-cols-3 gap-2 bg-zinc-50/40 dark:bg-zinc-900/20 border-b border-black/[0.04] dark:border-white/[0.02] relative z-10">
          {result.metrics.map((m: any, i: any) => (
            <div 
              key={i} 
              className="p-3 rounded-2xl border border-black/[0.04] dark:border-white/5 bg-white/80 dark:bg-zinc-900/40 flex flex-col gap-1 shadow-sm transition-all duration-200 hover:border-black/10 dark:hover:border-white/10"
            >
              <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 tracking-tight font-sans">
                {m.label}
              </span>
              <span className="text-[11px] md:text-xs font-black text-zinc-800 dark:text-zinc-200 font-mono tabular-nums truncate">
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* 메인 파이낸셜 데이터 밸류에이션 테이블 타겟 판넬 */}
        <div className="p-5 flex-1 bg-white/20 dark:bg-zinc-950/20 relative z-10 overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/5">
                {result.headers.map((h: any, i: any) => (
                  <th 
                    key={i} 
                    className={cn(
                      "pb-2.5 text-[9px] md:text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono border-b border-black/[0.06] dark:border-white/5", 
                      i > 0 && "text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.02]">
              {result.rows.map((row: any, idx: any) => {
                const isPositive = row.returnPct >= 0;
                return (
                  <tr 
                    key={idx} 
                    className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors duration-150 transform-gpu"
                  >
                    <td className="py-3.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 font-mono tracking-tight">
                      {row.multiplier}
                    </td>
                    <td className={cn(
                      "py-3.5 text-xs font-black font-mono text-right tabular-nums", 
                      isPositive 
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] px-1 rounded-md" 
                        : "text-rose-500 dark:text-rose-400 bg-rose-500/[0.02] dark:bg-rose-500/[0.04] px-1 rounded-md"
                    )}>
                      {isPositive ? "+" : ""}{row.returnPct.toFixed(2)}%
                    </td>
                    <td className="py-3.5 text-xs font-black text-zinc-950 dark:text-white font-mono text-right tabular-nums">
                      {currency}{row.targetPrice.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 안내 문구 하단 풋바 */}
        <div className="px-5 py-4 bg-zinc-50/60 dark:bg-zinc-900/40 border-t border-black/[0.06] dark:border-white/5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed flex items-start gap-2 relative z-10">
          <SparklesIcon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span className="font-sans tracking-tight">{result.footerNotice}</span>
        </div>
      </div>
    </div>
  );
}