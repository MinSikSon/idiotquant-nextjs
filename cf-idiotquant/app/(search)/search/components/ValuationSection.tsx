"use client";

import React, { useMemo } from "react";
import { Calculator, BarChart3 } from "lucide-react";
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
        <StrategyCard result={ncavData as ValuationResult} icon={<Calculator className="w-4 h-4 text-blue-500 dark:text-blue-400" />} currency={currency} />
      )}
      {srimData && srimData !== "ERROR_INSUFFICIENT_DATA" && (
        <StrategyCard result={srimData as ValuationResult} icon={<BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />} currency={currency} />
      )}
    </div>
  );
};

function StrategyCard({ result, icon, currency }: { result: ValuationResult; icon: React.ReactNode; currency: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] dark:border-zinc-800/80 dark:bg-zinc-950 overflow-hidden transition-colors duration-200">
      
      {/* 타이틀 레이어 (다크모드 그라데이션 및 블러 세팅 보정) */}
      <div className="px-5 py-4 bg-gradient-to-r from-zinc-50/60 to-white dark:from-zinc-900/50 dark:to-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-3">
        <div className="p-2 rounded-xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{result.title}</h3>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">{result.formula}</p>
        </div>
      </div>

      {/* 핵심 메트릭 그리드 (다크모드 내부 카드 대비 최적화) */}
      <div className="p-4 grid grid-cols-3 gap-2 bg-zinc-50/30 dark:bg-zinc-900/20 border-b border-zinc-100 dark:border-zinc-900/60">
        {result.metrics.map((m: any, i: any) => (
          <div key={i} className="p-2.5 rounded-xl border border-zinc-100 bg-white dark:border-zinc-800/60 dark:bg-zinc-900/40 flex flex-col gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tight">{m.label}</span>
            <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 font-mono tabular-nums">{m.value}</span>
          </div>
        ))}
      </div>

      {/* 메인 파이낸셜 데이터 테이블 (가독성을 위한 명도 가공) */}
      <div className="p-4 flex-1 bg-white dark:bg-zinc-950">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
              {result.headers.map((h: any, i: any) => (
                <th key={i} className={cn("pb-2 text-[11px] font-bold text-zinc-400 dark:text-zinc-500", i > 0 && "text-right")}>
                  {h
                }</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900/50">
            {result.rows.map((row: any, idx: any) => {
              const isPositive = row.returnPct >= 0;
              return (
                <tr key={idx} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors duration-150">
                  <td className="py-3 text-xs font-bold text-zinc-800 dark:text-zinc-300 font-mono">{row.multiplier}</td>
                  <td className={cn(
                    "py-3 text-xs font-black font-mono text-right tabular-nums", 
                    isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                  )}>
                    {isPositive ? "+" : ""}{row.returnPct.toFixed(2)}%
                  </td>
                  <td className="py-3 text-xs font-extrabold text-zinc-900 dark:text-zinc-100 font-mono text-right tabular-nums">
                    {currency}{row.targetPrice.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 안내 문구 하단 풋바 */}
      <div className="px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed">
        {result.footerNotice}
      </div>
    </div>
  );
}