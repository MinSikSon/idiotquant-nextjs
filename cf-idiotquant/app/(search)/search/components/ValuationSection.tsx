"use client";

import React, { useMemo, useState } from "react";
import { 
  CalculatorIcon, 
  ChartBarIcon, 
  Squares2X2Icon,
  SparklesIcon,
  InformationCircleIcon,
  DocumentChartBarIcon,
  PresentationChartLineIcon,
  ArrowTrendingUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AdjustmentsHorizontalIcon,
  TableCellsIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { 
  calculateKrNcav, 
  calculateKrSRIM, 
  calculateKrDCF, 
  calculateKrMultipliers, 
  calculateKrPbrBand,
  calculateUsNcav, 
  calculateUsSRIM, 
  calculateUsPEG, 
  calculateUsDCF,
  calculateUsMultipliers,
  ValuationResult 
} from "@/components/utils/financeCalc";

type ValuationModelType = "NCAV" | "SRIM" | "DCF" | "PER" | "PEG" | "PBR" | string;
type FilterTabType = "ALL" | "ASSET" | "EARNING";

interface ModelDescription {
  summary: string;
  idea: string;
  target: string;
}

interface ModelThemeConfig {
  name: string;
  category: "ASSET" | "EARNING";
  description: ModelDescription;
  icon: React.ReactNode;
  wrapperClass: string;
  containerClass: string;
  radialClass: string;
  headerClass: string;
  iconWrapperClass: string;
  badgeClass: string;
  badgeTextClass: string;
  metricDashboardClass: string;
  metricHoverClass: string;
  footerClass: string;
  extendMetrics?: (baseMetrics: any[], rows: any[]) => any[];
}

const VALUATION_CONFIG: Record<ValuationModelType, ModelThemeConfig> = {
  NCAV: {
    name: "NCAV 청산가치",
    category: "ASSET",
    description: {
      summary: "벤자민 그레이엄이 정립한 모델로, 기업이 당장 영업을 중단하고 자산을 처분했을 때의 가치인 '순유동자산(유동자산-총부채)'을 구합니다.",
      idea: "시가총액이 청산가치보다도 낮은 상태를 탐색하여 완벽한 '안전마진'을 확보합니다.",
      target: "시장 소외주, 하방 경직성이 보장된 극단적 저평가 자산주"
    },
    icon: <CalculatorIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
    wrapperClass: "from-blue-300/80 via-zinc-200 to-blue-400/60 dark:from-blue-950 dark:via-zinc-800/60 dark:to-zinc-900 shadow-blue-500/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
    containerClass: "border-blue-100 dark:border-blue-950/50",
    radialClass: "from-blue-100/70 via-transparent to-transparent",
    headerClass: "border-blue-100/80 dark:border-blue-950/60 bg-blue-50/20 dark:bg-blue-950/10",
    iconWrapperClass: "bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-900/50",
    badgeClass: "bg-blue-50/80 dark:bg-blue-950/60 border-blue-200/50 dark:border-blue-900/40",
    badgeTextClass: "text-blue-700 dark:text-blue-400",
    metricDashboardClass: "bg-blue-50/10 dark:bg-blue-950/5 border-blue-100/60 dark:border-blue-950/40",
    metricHoverClass: "border-blue-400 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/40",
    footerClass: "bg-blue-50/10 dark:bg-blue-950/5 border-blue-100/60 dark:border-blue-950/30",
    extendMetrics: (base, rows) => {
      const currentPriceMetric = base.find(m => /현재가|주가|price/i.test(m.label.replace(/\s+/g, "")));
      const currentPrice = currentPriceMetric ? parseFloat(currentPriceMetric.value.replace(/[^0-9.-]/g, '')) : 0;
      let ncavPrice = 0;
      if (rows && rows.length > 0) {
        const baseRow = rows.find((r: any) => /1\.0|100|기준|적정/i.test((r.multiplier || r.label || r.weight || "").toString().replace(/\s+/g, ""))) || rows[0];
        if (baseRow) ncavPrice = baseRow.targetPrice;
      }
      if (ncavPrice > 0 && currentPrice > 0) {
        return [...base, { label: "안전마진율", value: `${((ncavPrice - currentPrice) / ncavPrice * 100).toFixed(1)}%` }];
      }
      return [...base, { label: "안전마진율", value: "데이터 확인" }];
    }
  },
  PBR: {
    name: "PBR 자본밴드",
    category: "ASSET",
    description: {
      summary: "주주지분(순자산) 가치와 주가를 비교하여 역사적인 주가순자산배수(PBR)의 상·하단 고점 밴드를 역산합니다.",
      idea: "현재 장부상 자산가치 대비 주가가 역사적 최하단 바닥권에 진입했는지 추적합니다.",
      target: "실적 변동성은 크지만 망하지 않을 대형 자산주, 경기 민감 사이클 주 종목"
    },
    icon: <Squares2X2Icon className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />,
    wrapperClass: "from-cyan-300/80 via-zinc-200 to-cyan-400/60 dark:from-cyan-950 dark:via-zinc-800/60 dark:to-zinc-900 shadow-cyan-500/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
    containerClass: "border-cyan-100 dark:border-cyan-950/50",
    radialClass: "from-cyan-100/70 via-transparent to-transparent",
    headerClass: "border-cyan-100/80 dark:border-cyan-950/60 bg-cyan-50/20 dark:bg-cyan-950/10",
    iconWrapperClass: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/60 dark:border-cyan-900/50",
    badgeClass: "bg-cyan-50/80 dark:bg-cyan-950/60 border-cyan-200/50 dark:border-cyan-900/40",
    badgeTextClass: "text-cyan-700 dark:text-cyan-400",
    metricDashboardClass: "bg-cyan-50/10 dark:bg-cyan-950/5 border-cyan-100/60 dark:border-cyan-950/40",
    metricHoverClass: "border-cyan-400 dark:border-cyan-500 bg-cyan-50/30 dark:bg-cyan-950/40",
    footerClass: "bg-cyan-50/10 dark:bg-zinc-950/5 border-cyan-100/60 dark:border-cyan-950/30",
  },
  SRIM: {
    name: "S-RIM 초과수익",
    category: "EARNING",
    description: {
      summary: "기업의 순자산 가치에 '미래 초과수익의 현재가치'를 결합합니다. 주주 요구수익률 대비 자기자본이익률(ROE)의 우위를 측정합니다.",
      idea: "자본을 활용해 요구 기준치 이상의 부가가치를 지속적으로 만들어내는지 평가합니다.",
      target: "우량 제조 강소기업, 자본 효율성이 우수하고 지속 성장이 기대되는 종목"
    },
    icon: <ChartBarIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
    wrapperClass: "from-emerald-300/80 via-zinc-200 to-emerald-400/60 dark:from-emerald-950 dark:via-zinc-800/60 dark:to-zinc-900 shadow-emerald-500/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
    containerClass: "border-emerald-100 dark:border-emerald-950/50",
    radialClass: "from-emerald-100/70 via-transparent to-transparent",
    headerClass: "border-emerald-100/80 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10",
    iconWrapperClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/50",
    badgeClass: "bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-200/50 dark:border-emerald-900/40",
    badgeTextClass: "text-emerald-700 dark:text-emerald-400",
    metricDashboardClass: "bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-100/60 dark:border-emerald-950/40",
    metricHoverClass: "border-emerald-400 dark:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/40",
    footerClass: "bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-100/60 dark:border-emerald-950/30",
    extendMetrics: (base, rows) => {
      const hasRoe = base.some(m => /ROE/i.test(m.label));
      let focusValue = "ROE 연동";
      if (rows && rows.length > 0) {
        const firstRow = rows[0]?.multiplier || "";
        if (firstRow.includes("%")) {
          focusValue = "초과이익 현가";
        }
      }
      const filteredBase = base.filter(m => m.label !== "평가 포커스");
      return [...filteredBase, { label: "평가 포커스", value: focusValue }];
    }
  },
  DCF: {
    name: "DCF 현금흐름할인",
    category: "EARNING",
    description: {
      summary: "회계상의 장부 이익 대신 기업이 미래에 영업활동으로 창출할 실제 '잉여현금흐름(FCF)'을 구한 뒤 가중평균자본비용(할인율)으로 할인합니다.",
      idea: "비즈니스의 본질적인 현금 창출력에 기반한 절대적 내재가치를 측정합니다.",
      target: "현금흐름 예측이 용이한 성숙기 대형주, 시장 지배력이 확고한 경제적 해자 기업"
    },
    icon: <PresentationChartLineIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
    wrapperClass: "from-purple-300/80 via-zinc-200 to-purple-400/60 dark:from-purple-950 dark:via-zinc-800/60 dark:to-zinc-900 shadow-purple-500/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
    containerClass: "border-purple-100 dark:border-purple-950/50",
    radialClass: "from-purple-100/70 via-transparent to-transparent",
    headerClass: "border-purple-100/80 dark:border-purple-950/60 bg-purple-50/20 dark:bg-purple-950/10",
    iconWrapperClass: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-900/50",
    badgeClass: "bg-purple-50/80 dark:bg-purple-950/60 border-purple-200/50 dark:border-purple-900/40",
    badgeTextClass: "text-purple-700 dark:text-purple-400",
    metricDashboardClass: "bg-purple-50/10 dark:bg-purple-950/5 border-purple-100/60 dark:border-purple-950/40",
    metricHoverClass: "border-purple-400 dark:border-emerald-500 bg-purple-50/30 dark:bg-purple-950/40",
    footerClass: "bg-purple-50/10 dark:bg-purple-950/5 border-purple-100/60 dark:border-purple-950/30",
  },
  PER: {
    name: "PER 멀티플",
    category: "EARNING",
    description: {
      summary: "주당순이익(EPS)에 업종 평균, 과거 평균, 혹은 타겟 배수(Multiple)를 결합하는 대중적인 상대가치 모델입니다.",
      idea: "현재 시장의 심리와 인기도를 반영하여 직관적인 밸류에이션 상한/하한을 빠르게 설정합니다.",
      target: "보편적인 주류 업종 내 종목 비교, 시장 트렌드가 빠르게 반영되는 주도주"
    },
    icon: <DocumentChartBarIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
    wrapperClass: "from-indigo-300/80 via-zinc-200 to-indigo-400/60 dark:from-indigo-950 dark:via-zinc-800/60 dark:to-zinc-900 shadow-indigo-500/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
    containerClass: "border-indigo-100 dark:border-indigo-950/50",
    radialClass: "from-indigo-100/70 via-transparent to-transparent",
    headerClass: "border-indigo-100/80 dark:border-indigo-950/60 bg-indigo-50/20 dark:bg-indigo-950/10",
    iconWrapperClass: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-900/50",
    badgeClass: "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200/50 dark:border-indigo-900/40",
    badgeTextClass: "text-indigo-700 dark:text-indigo-400",
    metricDashboardClass: "bg-indigo-50/10 dark:bg-indigo-950/5 border-indigo-100/60 dark:border-indigo-950/40",
    metricHoverClass: "border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40",
    footerClass: "bg-indigo-50/10 dark:bg-indigo-950/5 border-indigo-100/60 dark:border-indigo-950/30",
  },
  PEG: {
    name: "PEG 가치성장",
    category: "EARNING",
    description: {
      summary: "피터 린치가 대중화한 지표로, 단순 고PER 부담을 덜어내기 위해 PER을 실질 '이익성장률(G)'로 나눈 수치입니다.",
      idea: "PER이 높더라도 그를 압도하는 이익 성장력이 있다면 정당한 프리미엄인지 여부를 가려냅니다.",
      target: "성장 초기/중기의 주도 기술주, 혁신 성장 기업 및 고성장 트렌드 종목"
    },
    icon: <ArrowTrendingUpIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
    wrapperClass: "from-amber-300/80 via-zinc-200 to-amber-400/60 dark:from-amber-950 dark:via-zinc-800/60 dark:to-zinc-900 shadow-amber-500/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
    containerClass: "border-amber-100 dark:border-amber-950/50",
    radialClass: "from-amber-100/70 via-transparent to-transparent",
    headerClass: "border-amber-100/80 dark:border-amber-950/60 bg-amber-50/20 dark:bg-amber-950/10",
    iconWrapperClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/50",
    badgeClass: "bg-amber-50/80 dark:bg-amber-950/60 border-amber-200/50 dark:border-amber-900/40",
    badgeTextClass: "text-amber-700 dark:text-amber-400",
    metricDashboardClass: "bg-amber-50/10 dark:bg-amber-950/5 border-amber-100/60 dark:border-amber-950/40",
    metricHoverClass: "border-amber-400 dark:border-amber-500 bg-amber-50/30 dark:bg-amber-950/40",
    footerClass: "bg-amber-50/10 dark:bg-amber-950/5 border-amber-100/60 dark:border-amber-950/30",
  }
};

const METRIC_DICTIONARY: Record<string, { desc: string }> = {
  "유동자산": { desc: "1년 내 현금화 가능한 자산으로 청산가치의 근간이 됩니다." },
  "총부채": { desc: "기업이 갚아야 할 모든 빚으로 유동자산에서 전액 차감하여 안전마진을 구합니다." },
  "현재가": { desc: "현재 시장에서 실시간으로 거래되고 있는 종목의 주가입니다." },
  "자본총계": { desc: "자산에서 부채를 뺀 순자산 가치로, 주주 몫의 실질 자본금입니다." },
  "ROE": { desc: "자기자본이익률로 기업이 자본을 활용해 얼마나 효율적으로 이익을 창출하는지 파악합니다." },
  "순유동자산": { desc: "유동자산에서 총부채를 차감한 실질 청산 자산가치입니다." },
  "안전마진율": { desc: "자산 내재가치 대비 주가가 얼마나 저렴하게 안전마진을 확보했는지 판단하는 지표입니다." },
  "영업현금흐름": { desc: "기업이 핵심 비즈니스를 통해 유입시킨 실제 현금 흐름 크기입니다." },
  "할인율": { desc: "미래 현금흐름의 시간 가치를 반영하기 위해 적용하는 자본 비용 가중치(WACC)입니다." },
  "주당순이익": { desc: "회사 발행 주식 1주당 귀속되는 당기순이익 지표입니다." },
  "주당순자산": { desc: "회사 발행 주식 1주당 귀속되는 자본총계(순자산) 지표입니다." },
  "Trailing PER": { desc: "현재 주가를 최근 4분기 합산 EPS로 나눈 상대 가치 배수입니다." },
  "가정 성장률": { desc: "향후 보수적으로 실현 가능하다고 가정한 이익 성장 속도 비율입니다." },
  "평가포커스": { desc: "해당 벨류에이션 모델이 현재 자산 구조와 수익성 중 어느 파트에 연동 가중치를 주는지 식별합니다." }
};

/**
 * 뷰포트 바운더리 탈출 방지를 위한 위치 최적화 대시보드 전용 툴팁 컴포넌트
 */
const TopDashboardTooltip = ({ config, index }: { config: ModelThemeConfig; index: number }) => {
  // 인덱스 기반으로 좌/우 밀림 방지 정렬 자동 선택
  const alignmentClass = index % 5 >= 3 ? "right-0" : index % 5 === 0 ? "left-0" : "left-1/2 -translate-x-1/2";
  
  return (
    <div className={cn(
      "absolute z-[9999] p-4 rounded-2xl bg-zinc-950/95 text-white shadow-2xl border border-zinc-800/80 text-[11px] leading-relaxed font-sans font-medium pointer-events-none w-64 bottom-full mb-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md shadow-black/80",
      alignmentClass
    )}>
      <div className="font-extrabold text-amber-400 mb-3 flex items-center gap-2 border-b border-zinc-800 pb-2">
        <span className="p-1 rounded bg-zinc-900/60 shrink-0">{config.icon}</span>
        <span className="text-xs font-black">{config.name}</span>
      </div>
      
      <div className="flex flex-col gap-2.5 text-zinc-300">
        <div>
          <span className="text-amber-400 font-black block text-[10px] uppercase tracking-wider mb-0.5">💡 핵심 요약</span>
          <p className="font-medium text-zinc-200 tracking-tight leading-normal">{config.description.summary}</p>
        </div>
        <div>
          <span className="text-cyan-400 font-black block text-[10px] uppercase tracking-wider mb-0.5">🎯 투자 아이디어</span>
          <p className="font-medium text-zinc-200 tracking-tight leading-normal">{config.description.idea}</p>
        </div>
        <div>
          <span className="text-emerald-400 font-black block text-[10px] uppercase tracking-wider mb-0.5">👤 적합한 타겟</span>
          <p className="font-medium text-zinc-200 tracking-tight leading-normal">{config.description.target}</p>
        </div>
      </div>
    </div>
  );
};

interface ValuationSectionProps {
  data: any;
  isUs: boolean;
}

export const ValuationSection = ({ data, isUs }: ValuationSectionProps) => {
  const [activeTab, setActiveTab] = useState<FilterTabType>("ALL");
  const [hoveredSummaryModel, setHoveredSummaryModel] = useState<string | null>(null);

  const models = useMemo(() => {
    const list: { type: ValuationModelType; result: ValuationResult }[] = [];

    if (isUs) {
      if (data?.finnhubData && data?.usDetail) {
        const ncav = calculateUsNcav(data.finnhubData, data.usDetail);
        if (typeof ncav !== "string") list.push({ type: "NCAV", result: ncav });

        const srim = calculateUsSRIM(data.finnhubData, data.usDetail);
        if (typeof srim !== "string") list.push({ type: "SRIM", result: srim });

        const peg = calculateUsPEG(data.finnhubData, data.usDetail);
        if (typeof peg !== "string") list.push({ type: "PEG", result: peg });

        const dcf = calculateUsDCF(data.finnhubData, data.usDetail);
        if (typeof dcf !== "string") list.push({ type: "DCF", result: dcf });

        const per = calculateUsMultipliers(data.finnhubData, data.usDetail);
        if (typeof per !== "string") list.push({ type: "PER", result: per });
      }
    } else {
      if (data?.kiBS && data?.kiChart) {
        const ncav = calculateKrNcav(data.kiBS, data.kiChart);
        if (ncav) list.push({ type: "NCAV", result: ncav });

        const pbr = calculateKrPbrBand(data.kiBS, data.kiChart);
        if (pbr) list.push({ type: "PBR", result: pbr });

        if (data?.kiIS) {
          const srim = calculateKrSRIM(data.kiBS, data.kiIS, data.kiChart);
          if (srim) list.push({ type: "SRIM", result: srim });

          const per = calculateKrMultipliers(data.kiBS, data.kiIS, data.kiChart);
          if (per) list.push({ type: "PER", result: per });
        }

        if (data?.kiCF) {
          const dcf = calculateKrDCF(data.kiCF, data.kiChart);
          if (dcf) list.push({ type: "DCF", result: dcf });
        }
      }
    }
    return list;
  }, [data, isUs]);

  const filteredModels = useMemo(() => {
    return models.filter(m => {
      if (activeTab === "ALL") return true;
      return VALUATION_CONFIG[m.type]?.category === activeTab;
    });
  }, [models, activeTab]);

  const currency = isUs ? "$" : "₩";

  return (
    <div className="w-full flex flex-col gap-6 mb-6 overflow-visible">
      
      {/* 1. 상단 모델별 가치 요약 대시보드 */}
      {models.length > 0 && (
        <div className="w-full bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900/60 dark:to-zinc-950 p-5 rounded-[2rem] border border-zinc-200/70 dark:border-zinc-800/70 shadow-sm overflow-visible">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <TableCellsIcon className="w-4 h-4 text-zinc-500" />
            <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 tracking-tight uppercase">모델별 평가 결과 요약</h4>
            <span className="text-[10px] text-zinc-400 font-medium ml-auto">마우스를 올리면 상세 모델 소개가 보입니다.</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 overflow-visible">
            {models.map((m, idx) => {
              const config = VALUATION_CONFIG[m.type];
              const baseRow = m.result.rows.find((r: any) => /1\.0|100|기준|적정/i.test((r.multiplier || r.label || r.weight || "").toString().replace(/\s+/g, ""))) || m.result.rows[0];
              const targetPrice = baseRow ? baseRow.targetPrice : 0;
              const returnPct = baseRow ? baseRow.returnPct : 0;
              const isPositive = returnPct >= 0;

              return (
                <div 
                  key={m.type}
                  className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm flex flex-col gap-1 relative cursor-help transition-all duration-200 hover:border-zinc-400 dark:hover:border-zinc-600 overflow-visible"
                  onMouseEnter={() => setHoveredSummaryModel(m.type)}
                  onMouseLeave={() => setHoveredSummaryModel(null)}
                >
                  <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <span className="p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 block">
                      {config?.icon || <Squares2X2Icon className="w-3 h-3" />}
                    </span>
                    <span className="text-[10px] font-black tracking-tight truncate">{config?.name || m.type}</span>
                  </div>
                  
                  <div className="flex flex-col mt-0.5">
                    <span className="text-xs font-black text-zinc-950 dark:text-white font-mono tracking-tight">
                      {currency}{targetPrice.toLocaleString()}
                    </span>
                    <span className={cn(
                      "text-[9px] font-black font-mono mt-0.5",
                      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                    )}>
                      {isPositive ? "▲" : "▼"} {Math.abs(returnPct).toFixed(1)}%
                    </span>
                  </div>

                  {hoveredSummaryModel === m.type && config && (
                    <TopDashboardTooltip config={config} index={idx} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 전략 모델 제어 필터 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-100/70 dark:bg-zinc-900/40 p-2 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md overflow-visible">
        <div className="flex items-center gap-2 px-2 text-zinc-700 dark:text-zinc-300">
          <AdjustmentsHorizontalIcon className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-bold tracking-tight">전략 모델 필터</span>
        </div>
        
        <div className="flex gap-1.5 bg-zinc-200/50 dark:bg-zinc-950/40 p-1 rounded-xl">
          {(["ALL", "ASSET", "EARNING"] as FilterTabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200",
                activeTab === tab
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {tab === "ALL" && `전체 모델 (${models.length})`}
              {tab === "ASSET" && "자산가치 중심 (NCAV/PBR)"}
              {tab === "EARNING" && "수익성/성장성 중심 (SRIM/DCF/PER/PEG)"}
            </button>
          ))}
        </div>
      </div>

      {filteredModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible">
          {filteredModels.map((m) => (
            <StrategyCard 
              key={m.type}
              modelType={m.type}
              result={m.result} 
              currency={currency} 
            />
          ))}
        </div>
      ) : (
        <div className="py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-2">
          <Squares2X2Icon className="w-8 h-8 opacity-40" />
          <span className="text-xs font-medium">가용 가능한 재무 정보 혹은 필터 조건 모델이 없습니다.</span>
        </div>
      )}
    </div>
  );
};

interface StrategyCardProps {
  modelType: ValuationModelType;
  result: ValuationResult;
  currency: string;
}

function StrategyCard({ modelType, result, currency }: StrategyCardProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [hoveredTitle, setHoveredTitle] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const theme = useMemo(() => {
    return VALUATION_CONFIG[modelType] || {
      name: modelType,
      category: "ASSET",
      description: { summary: "등록되지 않은 가치평가 모델 방식입니다.", idea: "", target: "" },
      icon: <Squares2X2Icon className="w-4 h-4 text-zinc-500" />,
      wrapperClass: "from-zinc-300 via-zinc-200 to-zinc-400 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900",
      containerClass: "border-zinc-200 dark:border-zinc-900",
      radialClass: "from-zinc-100 via-transparent to-transparent",
      headerClass: "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40",
      iconWrapperClass: "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
      badgeClass: "bg-zinc-200/60 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800",
      badgeTextClass: "text-zinc-700 dark:text-zinc-300",
      metricDashboardClass: "bg-zinc-100/40 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800",
      metricHoverClass: "border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/80",
      footerClass: "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
    };
  }, [modelType]);

  const extendedMetrics = useMemo(() => {
    if (theme.extendMetrics) {
      return theme.extendMetrics(result.metrics, result.rows || []);
    }
    return result.metrics;
  }, [result, theme]);
return (
    <div className={cn(
      "rounded-[2rem] p-[5px] shadow-xl transform-gpu relative overflow-visible transition-all duration-300 flex flex-col h-fit",
      theme.wrapperClass,
      (hoveredTitle || hoveredMetric !== null) ? "z-50 shadow-2xl scale-[1.001]" : "z-10"
    )}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0 rounded-[1.9rem]" />
      
      <div className={cn(
        "w-full h-full rounded-[1.8rem] bg-white dark:bg-zinc-950 relative flex flex-col flex-1 border transition-colors duration-300 overflow-visible",
        theme.containerClass,
        hoveredTitle ? "z-30" : "z-10"
      )}>
        <div className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] pointer-events-none z-0 opacity-50 dark:opacity-25 transition-all rounded-[1.8rem]",
          theme.radialClass
        )} />

        {/* Card Header Section */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "px-5 py-4 md:px-6 md:py-5 border-b flex items-center justify-between relative backdrop-blur-sm transition-colors cursor-pointer select-none hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 rounded-t-[1.8rem] overflow-visible",
            theme.headerClass,
            hoveredTitle ? "z-40" : "z-20"
          )}
        >
          <div className={cn("flex items-center gap-3 relative overflow-visible transition-all", hoveredTitle ? "z-50" : "z-30")}>
            <div 
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm shrink-0 transition-colors cursor-help",
                theme.iconWrapperClass
              )}
              onMouseEnter={(e) => { e.stopPropagation(); setHoveredTitle(true); }}
              onMouseLeave={(e) => { e.stopPropagation(); setHoveredTitle(false); }}
            >
              {theme.icon}
            </div>
            
            <div 
              className="cursor-help"
              onMouseEnter={(e) => { e.stopPropagation(); setHoveredTitle(true); }}
              onMouseLeave={(e) => { e.stopPropagation(); setHoveredTitle(false); }}
            >
              <h3 className="text-xs md:text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                {result.title}
              </h3>
              <p className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-0.5">
                {result.formula}
              </p>
            </div>

            {hoveredTitle && theme.description.summary && (
              <div className="fixed bottom-4 left-4 right-4 sm:absolute sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-64 w-[calc(100vw-2rem)] z-[9999] p-4 rounded-2xl bg-zinc-950/95 text-white shadow-2xl border border-zinc-800 text-[11px] leading-relaxed font-sans font-medium pointer-events-none animate-in fade-in zoom-in-95 duration-150 shadow-black/60 backdrop-blur-md whitespace-normal">
                <div className="font-extrabold text-amber-400 mb-2.5 border-b border-zinc-800 pb-1.5 text-xs font-black">모델 구조 가이드</div>
                <div className="flex flex-col gap-2.5 text-zinc-300">
                  <div>
                    <span className="text-amber-400 font-black block text-[10px] uppercase tracking-wider mb-0.5">💡 핵심 요약</span>
                    <p className="font-medium text-zinc-200 tracking-tight leading-normal">{theme.description.summary}</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-black block text-[10px] uppercase tracking-wider mb-0.5">🎯 투자 아이디어</span>
                    <p className="font-medium text-zinc-200 tracking-tight leading-normal">{theme.description.idea}</p>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-black block text-[10px] uppercase tracking-wider mb-0.5">👤 적합한 타겟</span>
                    <p className="font-medium text-zinc-200 tracking-tight leading-normal">{theme.description.target}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm transition-colors",
              theme.badgeClass
            )}>
              <span className={cn(
                "text-[8px] font-mono font-black uppercase tracking-widest italic flex items-center gap-1 whitespace-nowrap",
                theme.badgeTextClass
              )}>
                {theme.category === "ASSET" ? "ASSET MODEL" : "EARNING MODEL"}
              </span>
            </div>
            <div className="text-zinc-400 dark:text-zinc-500 p-1">
              {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </div>
          </div>
        </div>

        <div className={cn(
          "transition-all duration-300 ease-in-out origin-top flex flex-col flex-1 rounded-b-[1.8rem] overflow-visible",
          isExpanded ? "max-h-[1200px] opacity-100 visible" : "max-h-0 opacity-0 invisible pointer-events-none"
        )}>
          {/* 핵심 메트릭 그리드 */}
          <div className={cn(
            "p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b transition-colors overflow-visible",
            theme.metricDashboardClass,
            hoveredTitle ? "relative z-0" : "relative z-20"
          )}>
            {extendedMetrics.map((m: any, i: number) => {
              const cleanLabel = m.label.replace(/[\s\(\)]/g, "");
              const dictItem = METRIC_DICTIONARY[cleanLabel] || Object.values(METRIC_DICTIONARY).find((v, idx) => Object.keys(METRIC_DICTIONARY)[idx].includes(cleanLabel) || cleanLabel.includes(Object.keys(METRIC_DICTIONARY)[idx]));
              const isHovered = hoveredMetric === `${result.title}-${m.label}-${i}`;
              
              const elementAlignmentClass = cn(
                i % 2 === 0 ? "left-0" : "right-0",
                i % 4 >= 2 ? "sm:right-0 sm:left-auto" : "sm:left-0 sm:right-auto"
              );

              return (
                <div 
                  key={i} 
                  className={cn(
                    "p-2.5 rounded-xl border bg-white dark:bg-zinc-900/40 flex flex-col gap-0.5 shadow-sm transition-all duration-150 relative cursor-help overflow-visible",
                    isHovered ? "z-40 border-zinc-400 dark:border-zinc-500" : "z-10 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                  style={{ isolation: isHovered ? "isolate" : "auto" }}
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

                  {/* 고려 변수 설명 호버 툴팁: 모바일 화면폭을 감안해 w-44로 축소하고 데스크톱에서 w-52 적용 */}
                  {isHovered && dictItem && (
                    <div className={cn(
                      "absolute z-[9999] p-3 rounded-lg bg-zinc-900 text-white shadow-xl border border-zinc-700 text-[10.5px] leading-relaxed font-sans font-medium pointer-events-none w-44 sm:w-52 top-full mt-2 animate-in fade-in zoom-in-95 duration-100 shadow-black/40 whitespace-normal",
                      elementAlignmentClass
                    )}>
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

          {/* 밸류에이션 리스트 테이블 */}
          <div className={cn(
            "p-5 flex-1 bg-white dark:bg-zinc-950/20 relative overflow-x-auto custom-valuation-scrollbar",
            hoveredTitle ? "z-0" : "z-10"
          )}>
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

          <div className={cn(
            "px-5 py-4 border-t text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 luxurious-footer flex items-start gap-2 relative z-10 whitespace-normal transition-colors",
            theme.footerClass
          )}>
            <SparklesIcon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className="font-sans tracking-tight">{result.footerNotice}</span>
          </div>
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