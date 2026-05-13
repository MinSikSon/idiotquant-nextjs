'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calculator as CalcIcon, 
  TrendingUp, 
  User, 
  ArrowLeftRight, 
  Info, 
  Lightbulb, 
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ResultChart, { ChartDataItem } from './ResultChart';

// --- Utils ---
const formatKrw = (value: number): string => {
  if (value === 0) return '0원';
  const absValue = Math.abs(value);
  const billion = Math.floor(absValue / 10000);
  const million = Math.floor(absValue % 10000);

  let result = value < 0 ? '-' : '';
  if (billion > 0) result += `${billion.toLocaleString()}억 `;
  if (million > 0) result += `${million.toLocaleString()}만`;

  return result.trim() + '원';
};

interface CalcInputs {
  startAge: number;
  retirementAge: number;
  targetAge: number;
  investmentAmount: number;
  interestRate: number;
  contributions: number;
  contributionGrowthRate: number;
  monthlyExpense: number;
  expenseGrowthRate: number;
  taxRate: number;
  applyTax: boolean;
}

export default function Calculator() {
  const [inputs, setInputs] = useState<CalcInputs>({
    startAge: 30,
    retirementAge: 60,
    targetAge: 90,
    investmentAmount: 5000,
    interestRate: 8,
    contributions: 150,
    contributionGrowthRate: 3.0,
    monthlyExpense: 300,
    expenseGrowthRate: 2.5,
    taxRate: 15.4,
    applyTax: true,
  });

  const [results, setResults] = useState({
    totalInvestment: 0,
    finalValue: 0,
    finalRateOfReturn: 0,
    chartData: [] as ChartDataItem[],
  });

  const calculateResult = useCallback(() => {
    const {
      startAge, retirementAge, targetAge, investmentAmount,
      interestRate, contributions, contributionGrowthRate,
      monthlyExpense, expenseGrowthRate, taxRate, applyTax,
    } = inputs;

    let currentBalance = investmentAmount;
    let totalInvested = investmentAmount;
    let monthlyIncome = contributions;
    let monthlyOutgo = monthlyExpense;

    const totalMonths = (targetAge - startAge) * 12;
    const workingMonths = (retirementAge - startAge) * 12;

    const snapshots: ChartDataItem[] = [
      { year: startAge, totalValue: Math.round(currentBalance), profitRate: 0 }
    ];

    for (let m = 1; m <= totalMonths; m++) {
      let profit = currentBalance * (interestRate / 100 / 12);
      if (applyTax && profit > 0) profit *= (1 - taxRate / 100);
      currentBalance += profit;

      if (m <= workingMonths) {
        currentBalance += monthlyIncome;
        totalInvested += monthlyIncome;
      }
      currentBalance -= monthlyOutgo;

      if (m % 12 === 0) {
        if (m <= workingMonths) monthlyIncome *= (1 + contributionGrowthRate / 100);
        monthlyOutgo *= (1 + expenseGrowthRate / 100);

        snapshots.push({
          year: startAge + (m / 12),
          totalValue: Math.max(0, Math.round(currentBalance)),
          profitRate: totalInvested > 0 ? Number(((currentBalance / totalInvested - 1) * 100).toFixed(1)) : 0,
        });
      }
      if (currentBalance < -500000) break;
    }

    setResults({
      totalInvestment: totalInvested,
      finalValue: Math.round(currentBalance),
      finalRateOfReturn: totalInvested > 0 ? Number(((currentBalance / totalInvested - 1) * 100).toFixed(1)) : 0,
      chartData: snapshots,
    });
  }, [inputs]);

  useEffect(() => { calculateResult(); }, [calculateResult]);

  const updateInput = (key: keyof CalcInputs, val: any) => setInputs(p => ({ ...p, [key]: val }));

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen p-4 md:p-10 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* <header className="flex flex-col items-center text-center space-y-4">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-500/20 text-white">
            <CalcIcon size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Precision Financial Planner</h1>
          <p className="text-zinc-500 font-medium">데이터에 기반한 정밀한 은퇴 및 자산 성장 시뮬레이션</p>
        </header> */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* 왼쪽: 입력 컨트롤 영역 */}
          <div className="lg:col-span-5 space-y-10">

            {/* 자산 지표 */}
            <SectionWrapper title="핵심 자산 지표" icon={<TrendingUp size={18} />}>
              <div className="space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <InputGroup label="초기 투자 금액" value={formatKrw(inputs.investmentAmount)} color="text-blue-600">
                  <div className="relative group">
                    <input 
                      type="number"
                      value={inputs.investmentAmount}
                      onChange={(e) => updateInput('investmentAmount', Number(e.target.value))}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold text-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold uppercase">만원</div>
                  </div>
                </InputGroup>

                <InputGroup label="연 목표 수익률" value={`${inputs.interestRate}%`} color="text-orange-600">
                  <input 
                    type="range" min="0" max="30" step="0.1"
                    value={inputs.interestRate}
                    onChange={(e) => updateInput('interestRate', Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex items-center justify-between mt-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <span className="text-[11px] font-black text-zinc-500 uppercase tracking-tight">이자소득세(15.4%) 자동 차감</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" checked={inputs.applyTax} 
                        onChange={(e) => updateInput('applyTax', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </InputGroup>
              </div>
            </SectionWrapper>

            {/* 생애 주기 */}
            <SectionWrapper title="나이 및 기간 설정" icon={<User size={18} />}>
              <div className="space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <AgeSlider label="현재 나이" value={inputs.startAge} min={20} max={100} onChange={(v:any) => updateInput('startAge', v)} />
                <AgeSlider label="은퇴 및 적립 중단 나이" value={inputs.retirementAge} min={20} max={100} onChange={(v:any) => updateInput('retirementAge', v)} />
                <AgeSlider label="시뮬레이션 종료 나이" value={inputs.targetAge} min={20} max={100} onChange={(v:any) => updateInput('targetAge', v)} />
              </div>
            </SectionWrapper>

            {/* 현금 흐름 */}
            <SectionWrapper title="매월 현금 흐름" icon={<ArrowLeftRight size={18} />}>
              <div className="space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <InputGroup label="월 정립액" value={formatKrw(inputs.contributions)} subLabel={`매년 ${inputs.contributionGrowthRate}% 증가`}>
                  <input 
                    type="number" value={inputs.contributions}
                    onChange={(e) => updateInput('contributions', Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold mb-4 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input 
                    type="range" min="0" max="15" step="0.1"
                    value={inputs.contributionGrowthRate}
                    onChange={(e) => updateInput('contributionGrowthRate', Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </InputGroup>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                <InputGroup label="월 생활비" value={formatKrw(inputs.monthlyExpense)} subLabel={`매년 ${inputs.expenseGrowthRate}% 인상`} color="text-red-500">
                  <input 
                    type="number" value={inputs.monthlyExpense}
                    onChange={(e) => updateInput('monthlyExpense', Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 font-bold mb-4 outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <input 
                    type="range" min="0" max="10" step="0.1"
                    value={inputs.expenseGrowthRate}
                    onChange={(e) => updateInput('expenseGrowthRate', Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </InputGroup>
              </div>
            </SectionWrapper>
          </div>

          {/* 오른쪽: 메인 결과 및 차트 */}
          <div className="lg:col-span-7 space-y-10">
            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className={`p-10 rounded-[3rem] shadow-2xl relative overflow-hidden transition-all duration-700 ${
                results.finalValue >= 0 ? 'bg-zinc-900 text-white shadow-blue-500/10' : 'bg-red-950 text-white shadow-red-500/20'
              }`}>
                <div className="relative z-10 space-y-10">
                  <div className="space-y-4">
                    <span className={`text-[10px] font-black uppercase tracking-[0.4em] px-3 py-1 rounded-full border border-white/10 ${
                      results.finalValue >= 0 ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {inputs.targetAge}세 예상 최종 자산
                    </span>
                    <h2 className={`text-5xl md:text-7xl font-black tracking-tighter transition-colors ${
                      results.finalValue >= 0 ? 'text-blue-400' : 'text-red-500'
                    }`}>
                      {formatKrw(results.finalValue)}
                    </h2>
                    {results.finalValue < 0 && (
                      <div className="flex items-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                        <AlertTriangle size={14} /> 자산 고갈 위험군: 은퇴 자금 재설계가 시급합니다.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">총 투입 원금</span>
                      <div className="text-xl font-bold">{formatKrw(results.totalInvestment)}</div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm text-right">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">최종 수익률</span>
                      <div className={`text-3xl font-black ${results.finalRateOfReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {results.finalRateOfReturn}%
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 배경 오로라 효과 */}
                <div className={`absolute -right-20 -top-20 w-96 h-96 rounded-full blur-[140px] opacity-20 ${
                  results.finalValue >= 0 ? 'bg-blue-600' : 'bg-red-600'
                }`} />
              </div>
            </motion.div>

            {/* 차트 영역 */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-black tracking-tight">자산 성장 시뮬레이션</h3>
                  <p className="text-xs text-zinc-500 font-medium mt-1">복리와 인플레이션이 반영된 장기 성장 곡선</p>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-black/40 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                <ResultChart data={results.chartData} height="h-[500px] md:h-[650px]" />
              </div>
            </div>

            {/* 도움말 가이드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CalloutWrapper icon={<Info size={20} className="text-blue-500" />} title="복리 상식">
                수익률 <span className="font-bold text-blue-600">{inputs.interestRate}%</span>는 강력한 부의 증식 엔진입니다. 하지만 물가 상승률을 고려하지 않은 은퇴 계획은 자산을 빠르게 고갈시킬 수 있으므로 주의가 필요합니다.
              </CalloutWrapper>
              
              <CalloutWrapper 
                icon={<Lightbulb size={20} className={results.finalValue > 0 ? "text-emerald-500" : "text-red-500"} />} 
                title="전문가 진단"
              >
                {results.finalValue > 0
                  ? `현재 계획은 매우 탄탄합니다. 은퇴 후에도 자산이 지속적으로 성장하는 구조입니다.`
                  : `자산 고갈이 예상됩니다. 적립액을 늘리거나 지출을 줄이는 등의 수정 전략이 권장됩니다.`}
              </CalloutWrapper>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 하위 컴포넌트들 ---

function SectionWrapper({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1 text-zinc-500">
        {icon}
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InputGroup({ label, value, subLabel, color = "text-zinc-900 dark:text-zinc-100", children }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-0.5">{label}</span>
          {subLabel && <span className="text-[11px] font-bold text-blue-500/80 italic">{subLabel}</span>}
        </div>
        <span className={`text-lg font-black ${color}`}>{value}</span>
      </div>
      {children}
    </div>
  );
}

function AgeSlider({ label, value, min, max, onChange }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
        <span className="text-lg font-black">{value}세</span>
      </div>
      <input 
        type="range" min={min} max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
}

function CalloutWrapper({ icon, title, children }: any) {
  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex gap-4">
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div>
        <h5 className="font-bold text-sm mb-1">{title}</h5>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium">{children}</p>
      </div>
    </div>
  );
}