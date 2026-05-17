"use client";

import React, { useMemo, useState } from "react";
import { 
  CalculatorIcon, 
  ChartBarIcon, 
  Squares2X2Icon,
  SparklesIcon,
  InformationCircleIcon
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

const METRIC_DICTIONARY: Record<string, { desc: string }> = {
  "유동자산": { desc: "1년 내 현금화 가능한 자산으로 청산가치의 근간이 됩니다." },
  "총부채": { desc: "기업이 갚아야 할 모든 빚으로, 유동자산에서 전액 차감하여 청산가치를 구합니다." },
  "현재가": { desc: "현재 시장에서 실시간으로 거래되고 있는 해당 종목의 주가입니다." },
  "자본총계": { desc: "자산에서 부채를 뺀 순자산 가치로, S-RIM 모델의 시작점이자 주주의 몫입니다." },
  "ROE": { desc: "당기순이익을 자본총계로 나눈 값으로, 기업의 자본 운용 효율성 및 수익 창출력 지표입니다." },
  "BBB- 금리": { desc: "5년 만기 BBB- 등급 회사채 수익률로, S-RIM 모델에서 투자자가 요구하는 최소 할인율(요구수익률)의 척도로 쓰입니다." },
  "순유동자산": { desc: "유동자산에서 총부채를 차감한 진짜 안전마진 금액입니다. (NCAV의 핵심)" },
  "안전마진율": { desc: "[(목표 청산가치 - 현재가) / 목표 청산가치] × 100 공식으로 산출됩니다. 자산 가치 대비 주가가 얼마나 저렴하게 거래되는지 보여주는 방어력 지표입니다." },
  "요구수익률": { desc: "투자자가 기업에 기회비용 측면에서 기대하는 최소한의 ROE 기준선입니다." },
  "목표청산가치": { desc: "순유동자산(NCAV)에 가중치(멀티플)를 적용해 산출한 이론적 보수 가치입니다. 벤자민 그레이엄은 이 가치보다 30% 이상 저렴할 때 안전마진이 확보되었다고 보았습니다." }
};

function StrategyCard({ result, icon, currency, isBs }: StrategyCardProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  // 유연한 문자열 매칭 패턴을 적용한 메트릭 확장 레이어
  const extendedMetrics = useMemo(() => {
    const base = [...result.metrics];
    
    if (isBs) {
      // 1. 현재 주가 추출 (KR/US 명칭 다변화 대응: 현재가, 주가, Price, Current Price 등)
      const currentPriceMetric = base.find(m => 
        /현재가|주가|price/i.test(m.label.replace(/\s+/g, ""))
      );
      const currentPrice = currentPriceMetric ? parseFloat(currentPriceMetric.value.replace(/[^0-9.-]/g, '')) : 0;
      
      // 2. NCAV 기준가(100% 혹은 1.0배 멀티플 가격) 추출
      let ncavPrice = 0;
      if (result.rows && result.rows.length > 0) {
        // multiplier나 타 레이블 속성에서 1.0, 100%, 기준 가치를 유연하게 스캔
        const baseRow = result.rows.find((r: any) => {
          const rowLabel = (r.multiplier || r.label || r.weight || "").toString().replace(/\s+/g, "");
          return /1\.0|100|기준|적정/i.test(rowLabel);
        }) || result.rows[0]; // 매칭 실패 시 첫 번째 행을 청산가치 기본선으로 안전하게 가용
        
        if (baseRow) {
          ncavPrice = baseRow.targetPrice;
        }
      }

      // 3. 안전마진율 동적 계산: ((청산가치 - 현재가) / 청산가치) * 100
      if (ncavPrice > 0 && currentPrice > 0) {
        const marginOfSafety = ((ncavPrice - currentPrice) / ncavPrice) * 100;
        return [
          ...base,
          { label: "안전마진율", value: `${marginOfSafety.toFixed(1)}%` }
        ];
      }
      
      // 파싱 시 주가 데이터가 비어있거나 지표가 누락된 경우 디펜스용 안내 메시지 출력
      return [
        ...base,
        { label: "안전마진율", value: "데이터 확인" }
      ];
    } else {
      // S-RIM 요구수익률 가이드라인 보완 가용
      const bbbCell = base.find(m => /금리|할인율|요구|rate/i.test(m.label.replace(/\s+/g, "")));
      return [
        ...base,
        { label: "요구수익률", value: bbbCell ? bbbCell.value : "약 8.5%↑" }
      ];
    }
  }, [result, isBs]);

  return (
    <div className="rounded-[2rem] p-[5px] bg-gradient-to-br from-zinc-300 via-zinc-200 to-zinc-400 dark:from-zinc-700 via-zinc-800/80 to-zinc-900 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform-gpu relative overflow-visible transition-colors duration-300 flex flex-col">
      
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0 rounded-[1.9rem]" />
      
      {/* overflow-hidden을 주어 내부 자식 컴포넌트(풋바 등)가 둥근 모서리 경계를 삐져나오지 못하게 잠금 처리 */}
      <div className="w-full h-full rounded-[1.8rem] bg-white dark:bg-zinc-950 relative z-10 overflow-hidden flex flex-col flex-1 border border-zinc-200 dark:border-zinc-900">
        
        <div className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] pointer-events-none z-0 opacity-40 dark:opacity-20",
          isBs ? "from-blue-100 via-transparent to-transparent" : "from-emerald-100 via-transparent to-transparent"
        )} />

        {/* Card Header Section */}
        <div className="px-5 py-4 md:px-6 md:py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between relative z-20 bg-zinc-50/60 dark:bg-zinc-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
              {icon}
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                {result.title}
              </h3>
              <p className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-0.5">
                {result.formula}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-200/60 dark:bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-300 dark:border-zinc-800 shadow-sm">
            <span className="text-[8px] font-mono font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest italic flex items-center gap-1 whitespace-nowrap">
              <Squares2X2Icon className="w-2.5 h-2.5" /> QUANT MODEL
            </span>
          </div>
        </div>

        {/* 핵심 메트릭 그리드 대시보드 */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-100/40 dark:bg-zinc-900/20 border-b border-zinc-200 dark:border-zinc-800 relative z-20">
          {extendedMetrics.map((m: any, i: number) => {
            const cleanLabel = m.label.replace(/[\s\(\)]/g, "");
            const dictItem = METRIC_DICTIONARY[cleanLabel] || Object.values(METRIC_DICTIONARY).find((v, idx) => Object.keys(METRIC_DICTIONARY)[idx].includes(cleanLabel) || cleanLabel.includes(Object.keys(METRIC_DICTIONARY)[idx]));
            const isHovered = hoveredMetric === `${result.title}-${m.label}-${i}`;

            return (
              <div 
                key={i} 
                className={cn(
                  "p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-0.5 shadow-sm transition-all duration-150 relative cursor-help overflow-visible",
                  isHovered ? "border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/80 z-30" : "hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
                onMouseEnter={() => setHoveredMetric(`${result.title}-${m.label}-${i}`)}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <div className="flex items-center gap-1 w-full text-zinc-500 dark:text-zinc-400">
                  <span className="text-[9px] font-extrabold tracking-tight font-sans truncate">
                    {m.label}
                  </span>
                  <InformationCircleIcon className="w-3 h-3 opacity-60 shrink-0 ml-auto" />
                </div>
                <span className="text-[11px] md:text-xs font-black text-zinc-900 dark:text-zinc-100 font-mono tabular-nums truncate block">
                  {m.value}
                </span>

                {/* 계정과목 지표 정보 제공 풍선 툴팁 */}
                {isHovered && dictItem && (
                  <div className="absolute z-[9999] p-3 rounded-lg bg-zinc-900 text-white shadow-xl border border-zinc-700 text-[10.5px] leading-relaxed font-sans font-medium pointer-events-none w-52 left-1/2 -translate-x-1/2 top-full mt-2 animate-in fade-in duration-100 shadow-black/40 whitespace-normal">
                    <div className="font-bold text-amber-400 mb-1 flex items-center gap-1 border-b border-zinc-800 pb-1">
                      <span>{m.label}</span>
                    </div>
                    <p className="text-zinc-200 text-[10.5px] tracking-tight leading-normal">
                      {dictItem.desc}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 메인 파이낸셜 데이터 밸류에이션 테이블 타겟 판넬 */}
        <div className="p-5 flex-1 bg-white dark:bg-zinc-950/20 relative z-10 overflow-x-auto custom-valuation-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {result.headers.map((h: any, i: any) => (
                  <th 
                    key={i} 
                    className={cn(
                      "pb-2.5 text-[9px] md:text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-200 dark:border-zinc-800 whitespace-nowrap", 
                      i > 0 && "text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/40">
              {result.rows.map((row: any, idx: any) => {
                const isPositive = row.returnPct >= 0;
                const displayMultiplier = row.multiplier || row.label || row.weight || "-";
                
                return (
                  <tr 
                    key={idx} 
                    className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors duration-100 transform-gpu"
                  >
                    <td className="py-3.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono tracking-tight whitespace-nowrap">
                      {displayMultiplier}
                    </td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <span className={cn(
                        "text-xs font-black font-mono tabular-nums px-2.5 py-0.5 rounded-xl inline-block", 
                        isPositive 
                          ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/40 dark:border-emerald-900/30" 
                          : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/40 dark:border-rose-900/30"
                      )}>
                        {isPositive ? "+" : ""}{row.returnPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 text-xs font-black text-zinc-950 dark:text-white font-mono text-right tabular-nums whitespace-nowrap">
                      {currency}{row.targetPrice.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 안내 문구 하단 풋바 (부모의 overflow-hidden 덕분에 완벽한 rounded 매칭 유지) */}
        <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-start gap-2 relative z-10 whitespace-normal">
          <SparklesIcon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span className="font-sans tracking-tight">{result.footerNotice}</span>
        </div>
      </div>

      <style jsx global>{`
        .custom-valuation-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-valuation-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-valuation-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.2);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}