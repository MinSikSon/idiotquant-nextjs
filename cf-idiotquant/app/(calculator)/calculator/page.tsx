'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Elevation,
  Icon,
  NumericInput,
  Section,
  SectionCard,
  Text,
  ButtonGroup,
  Divider,
  Callout,
  Intent,
  Slider,
  Tag,
  H2,
  Switch,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import ResultChart, { ChartDataItem } from './ResultChart';

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
    <div className="bg-[#f4f4f7] dark:bg-[#050505] min-h-screen p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">

        <header className="flex flex-col items-center text-center space-y-3">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/30">
            <CalculatorIcon className="h-8 w-8 text-white" />
          </div>
          <H2 className="!m-0 font-black tracking-tight text-zinc-900 dark:!text-zinc-50 text-3xl">Precision Planner</H2>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* 왼쪽: 입력 영역 */}
          <div className="lg:col-span-5 space-y-8">

            {/* 섹션 1: 자금 & 수익 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Icon icon={IconNames.CHART} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-400">핵심 자산 지표</span>
              </div>

              <Card elevation={Elevation.ZERO} className="!rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-8 bg-white dark:bg-zinc-900">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">초기 자산</Text>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatKrw(inputs.investmentAmount)}</span>
                  </div>
                  <NumericInput
                    fill large min={0}
                    value={inputs.investmentAmount}
                    onValueChange={(v) => updateInput('investmentAmount', v)}
                    className="!rounded-xl border-zinc-200 dark:border-zinc-700"
                    buttonPosition="none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">연 수익률</Text>
                    <span className="text-xl font-black text-orange-600 dark:text-orange-500">{inputs.interestRate}%</span>
                  </div>
                  <Slider
                    min={0} max={100} stepSize={0.5} labelStepSize={25}
                    onChange={(v) => updateInput('interestRate', v)}
                    value={inputs.interestRate}
                  />
                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-tighter">이자소득세(15.4%) 적용</span>
                    <Switch
                      large className="!mb-0"
                      checked={inputs.applyTax}
                      onChange={(e) => updateInput('applyTax', e.currentTarget.checked)}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* 섹션 2: 생애 주기 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Icon icon={IconNames.USER} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-400">나이 및 기간</span>
              </div>
              <Card elevation={Elevation.ZERO} className="!rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
                <div className="grid grid-cols-1 gap-8">
                  {[
                    { label: '현재 나이', key: 'startAge' },
                    { label: '은퇴 및 적립 중단 나이', key: 'retirementAge' },
                    { label: '시뮬레이션 종료 나이', key: 'targetAge' },
                  ].map((age) => (
                    <div key={age.key} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">{age.label}</span>
                        <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{inputs[age.key as keyof CalcInputs]}세</span>
                      </div>
                      <Slider
                        min={20} max={100} stepSize={1} labelStepSize={20}
                        onChange={(v) => updateInput(age.key as keyof CalcInputs, v)}
                        value={inputs[age.key as keyof CalcInputs] as number}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* 섹션 3: 현금 흐름 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Icon icon={IconNames.FLOWS} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-400">매월 수입 및 지출</span>
              </div>
              <Card elevation={Elevation.ZERO} className="!rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-8 bg-white dark:bg-zinc-900">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">월 적립액</span>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">매년 {inputs.contributionGrowthRate.toFixed(1)}% 증가</span>
                    </div>
                    <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{formatKrw(inputs.contributions)}</span>
                  </div>
                  <NumericInput
                    fill large value={inputs.contributions}
                    onValueChange={(v) => updateInput('contributions', v)}
                    className="!rounded-xl border-zinc-200 dark:border-zinc-700"
                  />
                  <Slider
                    min={0} max={10} stepSize={0.1} labelStepSize={5}
                    onChange={(v) => updateInput('contributionGrowthRate', v)}
                    value={inputs.contributionGrowthRate}
                  />
                </div>

                <Divider className="dark:border-zinc-800" />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">월 생활비</span>
                      <span className="text-[11px] text-red-600 dark:text-red-400 font-bold">매년 {inputs.expenseGrowthRate.toFixed(1)}% 인상</span>
                    </div>
                    <span className="text-lg font-black text-red-600 dark:text-red-500">{formatKrw(inputs.monthlyExpense)}</span>
                  </div>
                  <NumericInput
                    fill large value={inputs.monthlyExpense}
                    onValueChange={(v) => updateInput('monthlyExpense', v)}
                    className="!rounded-xl border-zinc-200 dark:border-zinc-700"
                  />
                  <Slider
                    min={0} max={10} stepSize={0.1} labelStepSize={5}
                    onChange={(v) => updateInput('expenseGrowthRate', v)}
                    value={inputs.expenseGrowthRate}
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* 오른쪽: 결과 영역 */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                elevation={Elevation.FOUR}
                className={`!rounded-[2.5rem] !p-10 border-0 shadow-2xl relative overflow-hidden transition-all duration-500 ${results.finalValue >= 0
                  ? 'bg-[#111111] text-white shadow-indigo-500/20'
                  : 'bg-[#3b0808] text-white shadow-red-500/20'
                  }`}
              >
                <div className="relative z-10 space-y-8">
                  <div className="space-y-3">
                    <span className={`text-xs font-black uppercase tracking-[0.3em] drop-shadow-sm ${results.finalValue >= 0 ? 'text-indigo-400' : 'text-red-400'
                      }`}>
                      {inputs.targetAge}세 예상 자산 잔액
                    </span>

                    <H2 className={`!m-0 text-5xl md:text-7xl font-black tracking-tighter leading-tight drop-shadow-lg ${results.finalValue >= 0
                      ? 'text-yellow-400'
                      : 'text-red-500'
                      }`}>
                      {formatKrw(results.finalValue)}
                    </H2>

                    {results.finalValue < 0 && (
                      <div className="flex items-center gap-2 mt-4 bg-red-500/20 w-fit px-3 py-1 rounded-full border border-red-500/50">
                        <Icon icon={IconNames.WARNING_SIGN} intent="danger" size={14} />
                        <span className="text-red-400 font-bold text-[10px] uppercase tracking-wider">Warning: Asset Depletion</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">총 투입 원금</span>
                      <div className="text-xl font-bold text-zinc-500">{formatKrw(results.totalInvestment)}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl text-right border border-white/5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">최종 수익률</span>
                      <div className={`text-3xl font-black drop-shadow-sm ${results.finalRateOfReturn >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {results.finalRateOfReturn}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`absolute -right-10 -bottom-10 w-80 h-80 rounded-full blur-[120px] opacity-20 ${results.finalValue >= 0 ? 'bg-indigo-600' : 'bg-red-700'
                  }`} />
              </Card>
            </motion.div>

            {/* 차트 카드 가독성 개선 */}
            <Card className="!rounded-3xl !p-8 border-0 shadow-xl bg-white dark:bg-zinc-900">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <Text className="!m-0 font-black text-xl text-zinc-900 dark:text-zinc-50">자산 성장 곡선</Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">나이에 따른 복리 및 지출 반영 궤적</Text>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-black/40 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
                <ResultChart data={results.chartData} height="h-[500px] md:h-[600px]" />
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Callout icon={IconNames.INFO_SIGN} className="!rounded-2xl !p-6 border-0 shadow-md dark:bg-zinc-900 bg-white">
                <h5 className="font-bold mb-2 text-zinc-800 dark:text-zinc-100">복리 상식</h5>
                <Text className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  수익률 <strong>{inputs.interestRate}%</strong>는 강력한 엔진입니다. 하지만 매년 <strong>{inputs.expenseGrowthRate.toFixed(1)}%</strong>씩 오르는 물가 상승은 은퇴 후 자산을 갉아먹는 가장 큰 적입니다.
                </Text>
              </Callout>
              <Callout intent={results.finalValue > 0 ? Intent.SUCCESS : Intent.DANGER} icon={IconNames.LIGHTBULB} className="!rounded-2xl !p-6 border-0 shadow-md dark:bg-zinc-900 bg-white">
                <h5 className="font-bold mb-2 text-zinc-800 dark:text-zinc-100">전문가 진단</h5>
                <Text className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {results.finalValue > 0
                    ? `현재 계획은 매우 탄탄합니다. 은퇴 시점인 ${inputs.retirementAge}세 이후에도 자산이 안정적으로 유지될 것으로 보입니다.`
                    : `자산 고갈이 예상됩니다. 은퇴 시점을 늦추거나, 수익률 목표를 높이는 전략적 수정이 필요합니다.`}
                </Text>
              </Callout>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}