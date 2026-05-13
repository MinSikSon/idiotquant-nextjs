"use client";

import React, { useMemo } from "react";
import { 
  Lightbulb, 
  Search, 
  Info, 
  ShieldCheck, 
  ChevronRight, 
  Activity 
} from "lucide-react";

/** Strategy ID 파싱 로직 */
const parseStrategyId = (id: string) => {
  if (!id) return null;
  
  const parts = id.split('_');
  // 형식: [국가, IQ, 지표, 연도, 분기, 시가총액]
  const [country, , metricRaw, year, quarterRaw, mcapRaw] = parts;

  // 1. 국가 해석
  const isUS = country === "US";
  const countryName = isUS ? "미국(US) 시장" : "한국(KR) 시장";
  const countryContext = isUS
    ? "글로벌 금융의 중심인 미국 시장의 방대한 데이터를 바탕으로"
    : "역동적인 한국 자본 시장의 상장 기업들을 전수 조사하여";

  // 2. 지표 해석 (NCAV)
  const ratio = metricRaw?.replace("NCAV", "") || "1.0";
  const metricTitle = `NCAV(청산가치) ${ratio}배 안전마진 전략`;

  // 문구 랜덤화를 위한 배열
  const descriptions = [
    `기업이 보유한 순유동자산이 시가총액 대비 ${ratio}배를 상회하는 종목을 발굴합니다. 이는 '장부상 현금이 주가보다 많은' 상태를 뜻합니다.`,
    `벤저민 그레이엄의 원칙에 따라, 기업의 실제 청산가치가 시장 평가액보다 ${ratio}배 높은 절대적 저평가 기업을 필터링합니다.`,
    `시장에서 극도로 소외되어 기업 가치보다 현저히 낮은 가격에 거래되는 ${ratio}배수 안전마진 종목군을 선정합니다.`
  ];

  const quarter = quarterRaw === "Q0" ? "연간 확정 실적" : `${quarterRaw?.replace("Q", "")}분기 데이터`;
  const mcap = mcapRaw === "MCAP0" ? "전 종목(All-Cap)" : `시가총액 상위 ${mcapRaw?.replace("MCAP", "")}%`;
  const hash = id.length % descriptions.length;

  return {
    title: `[${country}] ${metricTitle}`,
    description: `${countryContext}, ${descriptions[hash]}`,
    details: `본 포트폴리오는 ${year}년 ${quarter} 기준 재무제표를 반영하고 있습니다. ${mcap}을 분석 대상으로 삼아 정량적 필터링을 완료했습니다.`,
    philosophy: `데이터 기반의 ${countryName} 퀀트 투자는 인간의 편향을 제거하고 오직 숫자가 증명하는 저평가 기회에만 집중합니다.`
  };
};

interface StrategyDescriptionProps {
  strategyId: string;
}

export default function StrategyDescription({ strategyId }: StrategyDescriptionProps) {
  const content = useMemo(() => parseStrategyId(strategyId), [strategyId]);

  if (!content) return null;

  return (
    <div className="w-full rounded-2xl border border-blue-100 bg-white p-6 shadow-sm dark:border-blue-900/30 dark:bg-zinc-900 mb-6 transition-all hover:shadow-md">
      {/* 1. Header Section */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
          <Lightbulb className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 leading-none">
            {content.title}
          </h4>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 rounded uppercase tracking-wider">
              {strategyId}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Divider */}
      <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800 mb-6" />

      {/* 2. Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Strategy Details (Main Content) */}
        <div className="lg:col-span-8 space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-3 text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              <Search className="h-3.5 w-3.5" />
              <span>전략 메커니즘</span>
            </div>
            <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {content.description}
            </p>
          </section>

          <section className="relative overflow-hidden rounded-xl bg-zinc-50 p-4 border border-zinc-100 dark:bg-zinc-800/40 dark:border-zinc-800">
            <div className="flex gap-3">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug">
                {content.details}
              </p>
            </div>
          </section>
        </div>

        {/* Right: Key Terms (Glossary) */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-blue-50 bg-blue-50/30 p-5 dark:border-blue-900/20 dark:bg-blue-900/10">
            <h5 className="flex items-center gap-2 text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
              <Activity className="h-3.5 w-3.5" />
              <span>Key Terms</span>
            </h5>
            <dl className="space-y-4">
              <TermItem 
                term="NCAV" 
                desc="순유동자산가치. 기업이 가진 당장 현금화 가능한 자산에서 모든 부채를 뺀 가치입니다." 
              />
              <TermItem 
                term="Market Cap" 
                desc="시가총액. 발행주식수와 현재 주가를 곱한 기업의 전체 시장 가치입니다." 
              />
              <TermItem 
                term="Safety Margin" 
                desc="안전마진. 실제 내재가치와 주가 사이의 차이로, 예상치 못한 하락 시 방어막 역할을 합니다." 
              />
            </dl>
          </div>
        </div>
      </div>

      {/* 3. Footer: Disclaimer */}
      <div className="mt-8 pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed italic">
            <span className="font-bold text-zinc-500 dark:text-zinc-400 not-italic mr-1">Disclaimer:</span>
            {content.philosophy} 본 리스트는 알고리즘에 의한 필터링 결과이며 종목 추천이 아닙니다. 모든 투자의 결과와 책임은 투자자 본인에게 귀속됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

/** 용어 설명용 보조 컴포넌트 */
function TermItem({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="group">
      <dt className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-200">
        <ChevronRight className="h-2.5 w-2.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
        {term}
      </dt>
      <dd className="mt-1 ml-4 text-[11px] leading-normal text-zinc-500 dark:text-zinc-400">
        {desc}
      </dd>
    </div>
  );
}