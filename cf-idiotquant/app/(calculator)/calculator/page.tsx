"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { CalculatorIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import ResultChart, { ChartDataItem } from "./ResultChart";

/**
 * x조 x억 x천만원 단위 변환 함수
 * @param value 만원 단위의 숫자
 */
export const formatKoreanCurrency = (value: number): string => {
    if (value === 0) return "0원";

    let result = "";
    const trillion = Math.floor(value / 100000000); // 조 (만원 * 1억 = 조)
    const billion = Math.floor((value % 100000000) / 10000); // 억
    const tenMillion = Math.floor((value % 10000) / 1000); // 천만
    const million = value % 1000; // 나머지 만원 단위

    if (trillion > 0) result += `${trillion}조 `;
    if (billion > 0) result += `${billion}억 `;
    if (tenMillion > 0) result += `${tenMillion}천`;
    if (million > 0 && tenMillion === 0 && billion === 0 && trillion === 0) {
        result += `${million}만`;
    } else if (tenMillion > 0 || billion > 0 || trillion > 0) {
        result += "만원";
    } else {
        result += "원";
    }

    return result.trim() || "0원";
};

export default function Calculator() {
    const [investmentAmount, setInvestmentAmount] = useState<number>(5000);
    const [numberOfYears, setNumberOfYears] = useState<number>(10);
    const [interestRate, setInterestRate] = useState<number>(15);
    const [contributions, setContributions] = useState<number>(100);

    const [totalInvestment, setTotalInvestment] = useState<number>(0);
    const [finalValue, setFinalValue] = useState<number>(0);
    const [finalRateOfReturn, setFinalRateOfReturn] = useState<number>(0);
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [resultList, setResultList] = useState<any[]>([]);

    const calculateResult = useCallback(() => {
        const years = Math.max(0, Math.floor(numberOfYears));
        const hoursPerYear = 8760;
        const totalHours = years * hoursPerYear;
        const frequency = 730;
        const compounding = 8760;

        let principal = investmentAmount;
        let additional = 0;
        let cumulativeInvestment = investmentAmount;

        const yearlySnapshots: ChartDataItem[] = [{ year: 0, totalValue: principal, profitRate: 0 }];

        for (let hour = 1; hour <= totalHours; hour++) {
            if (hour % frequency === 0) {
                additional += contributions;
                cumulativeInvestment += contributions;
            }
            if (hour % compounding === 0) {
                const netRate = interestRate / 100;
                principal *= (1 + netRate);
                additional *= (1 + netRate);

                const yearIndex = hour / hoursPerYear;
                const totalVal = Math.round(principal + additional);
                yearlySnapshots.push({
                    year: yearIndex,
                    totalValue: totalVal,
                    profitRate: Number((cumulativeInvestment > 0 ? (totalVal / cumulativeInvestment - 1) * 100 : 0).toFixed(2)),
                });
            }
        }

        const finalTotal = Math.round(principal + additional);
        setTotalInvestment(cumulativeInvestment);
        setFinalValue(finalTotal);
        setFinalRateOfReturn(cumulativeInvestment === 0 ? 0 : Number(((finalTotal / cumulativeInvestment - 1) * 100).toFixed(2)));
        setChartData(yearlySnapshots);
    }, [investmentAmount, numberOfYears, interestRate, contributions]);

    useEffect(() => { calculateResult(); }, [calculateResult]);

    const registerResult = () => {
        setResultList([{ investmentAmount, numberOfYears, interestRate, contributions, totalInvestment, finalValue, finalRateOfReturn }, ...resultList.slice(0, 9)]);
    };

    return (
        // 배경을 다시 밝은 회색조(bg-zinc-50)로 돌리고 다크모드일 때만 검은색 적용
        <div className="bg-zinc-50 dark:bg-[#070707] min-h-screen p-3 md:p-6 transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-4 md:space-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                    <div className="lg:col-span-5 space-y-4">
                        <Section title="투자 설정" icon={IconNames.SETTINGS} className="!rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <SectionCard className="p-4 md:p-6 space-y-6 bg-white dark:!bg-zinc-900/50">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="font-bold text-zinc-500 dark:text-zinc-400 text-sm uppercase">초기 자산</label>
                                        <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                                            {formatKoreanCurrency(investmentAmount)}
                                        </span>
                                    </div>
                                    <NumericInput
                                        fill large
                                        value={investmentAmount}
                                        onValueChange={(v) => setInvestmentAmount(v)}
                                        className="!text-lg font-bold !rounded-lg dark:!text-white"
                                        rightElement={<Tag minimal className="mr-2 text-base">만원</Tag>}
                                    />
                                    <ButtonGroup fill minimal className="gap-2">
                                        {[100, 500, 1000].map((amt) => (
                                            <Button key={amt} className="!text-base h-10 font-semibold dark:!text-white" onClick={() => setInvestmentAmount((p) => p + amt)}>+{amt}만</Button>
                                        ))}
                                    </ButtonGroup>
                                </div>

                                <Divider className="!my-2 opacity-50 dark:opacity-20" />

                                <div className="space-y-8 py-2">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="font-bold text-zinc-500 dark:text-zinc-400 text-sm uppercase">투자 기간</label>
                                            <span className="text-blue-500 text-xl font-black">{numberOfYears}년</span>
                                        </div>
                                        <Slider min={1} max={50} stepSize={1} labelStepSize={10} onChange={setNumberOfYears} value={numberOfYears} />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="font-bold text-zinc-500 dark:text-zinc-400 text-sm uppercase">연 수익률</label>
                                            <span className="text-green-600 dark:text-green-400 text-xl font-black">{interestRate}%</span>
                                        </div>
                                        <Slider min={-10} max={100} stepSize={1} labelStepSize={20} intent={interestRate > 0 ? Intent.SUCCESS : Intent.DANGER} onChange={setInterestRate} value={interestRate} />
                                    </div>
                                </div>

                                <Divider className="!my-2 opacity-50 dark:opacity-20" />

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="font-bold text-zinc-500 dark:text-zinc-400 text-sm uppercase">월 추가 적립</label>
                                        <span className="text-zinc-600 dark:text-zinc-400 font-bold">{formatKoreanCurrency(contributions)}</span>
                                    </div>
                                    <NumericInput
                                        fill large
                                        value={contributions}
                                        onValueChange={(v) => setContributions(v)}
                                        className="!text-lg font-bold !rounded-lg dark:!text-white"
                                        rightElement={<Tag minimal className="mr-2 text-base">만원</Tag>}
                                    />
                                </div>
                            </SectionCard>
                        </Section>

                        <motion.div layout>
                            <Callout intent={finalRateOfReturn >= 0 ? Intent.SUCCESS : Intent.DANGER} className="!rounded-xl shadow-lg !p-5">
                                <div className="flex flex-col gap-3">
                                    <span className="text-xs font-bold uppercase opacity-60 dark:!text-white">최종 평가액</span>
                                    <span className="text-2xl md:text-4xl font-black tracking-tighter dark:!text-white">
                                        {formatKoreanCurrency(finalValue)}
                                    </span>
                                    <div className="h-px bg-black/10 dark:bg-white/10 w-full" />
                                    <div className="grid grid-cols-2 gap-4 items-center">
                                        <div className="flex flex-col">
                                            <span className="opacity-50 text-[10px] uppercase dark:!text-white">누적 원금</span>
                                            <span className="text-lg font-bold dark:!text-white">{formatKoreanCurrency(totalInvestment)}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="opacity-50 text-[10px] uppercase dark:!text-white">최종 수익률</span>
                                            <span className={`text-xl font-black ${finalRateOfReturn >= 0 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                                                {finalRateOfReturn > 0 && '+'}{finalRateOfReturn}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Callout>
                        </motion.div>

                        <Button
                            fill large
                            intent={Intent.PRIMARY}
                            onClick={registerResult}
                            className="!rounded-xl py-4 !text-lg font-black shadow-lg"
                        >
                            시뮬레이션 저장
                        </Button>
                    </div>

                    <div className="lg:col-span-7 space-y-4">
                        <Card elevation={Elevation.ZERO} className="!rounded-xl overflow-hidden !p-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:!bg-zinc-950">
                            <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
                                <Text className="!m-0 font-bold text-zinc-900 dark:!text-white text-base">자산 성장 및 수익률 추이</Text>
                                <Icon icon={IconNames.TIMELINE_AREA_CHART} className="text-blue-500" size={18} />
                            </div>
                            <div className="p-1 md:p-3">
                                <ResultChart data={chartData} height={"h-[350px] md:h-[500px]"} />
                            </div>
                        </Card>

                        <Section title="저장된 시나리오" icon={IconNames.HISTORY} collapsible className="!rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <SectionCard className="!p-0 overflow-hidden bg-white dark:!bg-zinc-900/20">
                                <table className="bp5-html-table bp5-html-table-striped bp5-interactive w-full">
                                    <thead>
                                        <tr className="text-[11px] uppercase tracking-wider bg-zinc-50 dark:bg-zinc-800/50">
                                            <th className="py-3 px-4 dark:!text-white">설정 (원금/기간)</th>
                                            <th className="text-right dark:!text-white">수익률</th>
                                            <th className="text-right pr-4 dark:!text-white">최종 평가액</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm md:text-base font-medium">
                                        {resultList.map((res, idx) => (
                                            <tr key={idx} className="cursor-pointer">
                                                <td className="py-4 px-4 align-middle dark:!text-white">
                                                    {res.investmentAmount.toLocaleString()}만 / {res.numberOfYears}년
                                                </td>
                                                <td className="text-right align-middle">
                                                    <span className={res.finalRateOfReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                        {res.finalRateOfReturn}%
                                                    </span>
                                                </td>
                                                <td className="text-right pr-4 align-middle font-bold text-blue-600 dark:text-blue-400">
                                                    {formatKoreanCurrency(res.finalValue)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </SectionCard>
                        </Section>
                    </div>
                </div>
            </div >
        </div >
    );
}