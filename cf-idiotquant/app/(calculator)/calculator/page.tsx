"use client";

import React, { useState, useEffect } from "react";
import {
    Button,
    Card,
    Elevation,
    H2,
    H5,
    Icon,
    InputGroup,
    NumericInput,
    Section,
    SectionCard,
    Text,
    ButtonGroup,
    Divider,
    Callout,
    Intent,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { CalculatorIcon } from "@heroicons/react/24/outline";
import ResultChart, { ChartDataItem } from "./ResultChart";
import { Util } from "@/components/util";

export interface CalculationResult {
    investmentAmount: number;
    numberOfYears: number;
    interestRate: number;
    compounding: number;
    contributions: number;
    frequency: number;
    inflationRate: number;
    totalInvestment: number;
    finalValue: number;
    finalRateOfReturn: number;
    chartData: ChartDataItem[];
}

export default function Calculator() {
    const InterestRateBenchmarkTermPerHour = {
        eDAILY365: 24,
        eMONTHLY: 730,
        eQUARTERLY: 2190,
        eANNUALLY: 8760,
    } as const;

    const ContributionRateBenchmarkTermPerHour = {
        eWEEKLY: 168,
        eBIWEEKLY: 336,
        eSEMIMONTHLY: 1460,
        eMONTHLY: 730,
        eQUARTERLY: 2190,
        eSEMIANNUALLY: 17520,
        eANNUALLY: 8760,
    } as const;

    // 입력값 상태
    const [investmentAmount, setInvestmentAmount] = useState<number>(5000);
    const [numberOfYears, setNumberOfYears] = useState<number>(12);
    const [interestRate, setInterestRate] = useState<number>(24);
    const [compounding, setCompounding] = useState<number>(InterestRateBenchmarkTermPerHour.eANNUALLY);
    const [contributions, setContributions] = useState<number>(300);
    const [frequency, setFrequency] = useState<number>(ContributionRateBenchmarkTermPerHour.eMONTHLY);
    const [inflationRate, setInflationRate] = useState<number>(0);

    // 계산 결과 상태
    const [totalInvestment, setTotalInvestment] = useState<number>(0);
    const [finalValue, setFinalValue] = useState<number>(0);
    const [finalRateOfReturn, setFinalRateOfReturn] = useState<number>(0);
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [resultList, setResultList] = useState<CalculationResult[]>([]);

    // 계산 로직
    const calculateResult = () => {
        const years = Math.max(0, Math.floor(numberOfYears));
        const hoursPerYear = 365 * 24;
        const totalHours = years * hoursPerYear;

        let principal = Number(investmentAmount) * 10000;
        let additional = 0;
        let cumulativeInvestment = Number(investmentAmount) * 10000;

        const yearlySnapshots: ChartDataItem[] = [{ year: 0, totalValue: principal, profitRate: 0 }];

        for (let hour = 1; hour <= totalHours; hour++) {
            if (frequency > 0 && hour % frequency === 0) {
                additional += contributions * 10000;
                cumulativeInvestment += contributions * 10000;
            }
            if (compounding > 0 && hour % compounding === 0) {
                const netRate = (interestRate - inflationRate) / 100;
                principal *= 1 + netRate;
                additional *= 1 + netRate;
            }
            if (hour % hoursPerYear === 0) {
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
        setTotalInvestment(Math.round(cumulativeInvestment));
        setFinalValue(finalTotal);
        setFinalRateOfReturn(cumulativeInvestment === 0 ? 0 : Number(((finalTotal / cumulativeInvestment) * 100 - 100).toFixed(2)));
        setChartData(yearlySnapshots);
    };

    useEffect(() => {
        calculateResult();
    }, [investmentAmount, numberOfYears, interestRate, compounding, contributions, frequency, inflationRate]);

    const registerResult = () => {
        const newResult: CalculationResult = {
            investmentAmount, numberOfYears, interestRate, compounding,
            contributions, frequency, inflationRate, totalInvestment,
            finalValue, finalRateOfReturn, chartData,
        };
        setResultList([newResult, ...resultList]);
    };

    return (
        <div className="bp5-dark bg-zinc-50 dark:!bg-black min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center justify-center gap-3 mb-8">
                    <CalculatorIcon className="h-8 w-8 !text-blue-500" />
                    <Text className="text-3xl font-semibold m-0 tracking-tighter uppercase justify-center text-center dark:!text-white">수익률 계산기</Text>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: Inputs */}
                    <div className="lg:col-span-5 space-y-4">
                        <Section title="투자 설정" icon={IconNames.SETTINGS} compact className="dark:!bg-zinc-400">
                            <SectionCard className="space-y-6 dark:!bg-black">
                                {/* 액 */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <Text className="font-bold ">투자 시작 금액</Text>
                                        <Text className="text-blue-500 text-base font-mono">
                                            {Util.UnitConversion(investmentAmount * 10000, true)}
                                        </Text>
                                    </div>
                                    <ButtonGroup fill minimal className="mb-2">
                                        {[10, 100, 500, 1000].map((amt) => (
                                            <Button className="dark:!text-white" key={amt} onClick={() => setInvestmentAmount((p) => p + amt)}>+{amt}만</Button>
                                        ))}
                                        <Button className="!text-red-500" onClick={() => setInvestmentAmount(0)}>초기화</Button>
                                    </ButtonGroup>
                                    <NumericInput
                                        fill
                                        value={investmentAmount}
                                        onValueChange={(v) => setInvestmentAmount(v)}
                                        leftIcon={IconNames.WON}
                                        placeholder="시작 금액(만원)"
                                        rightElement={<Text className="mr-2 text-center justify-center pt-0.5">만</Text>}
                                    />
                                </div>

                                <Divider className="dark:!bg-white" />

                                {/* 기간 및 이자율 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Text className="font-bold">투자 기간 (년)</Text>
                                        <NumericInput
                                            fill
                                            value={numberOfYears}
                                            onValueChange={(v) => setNumberOfYears(v)}
                                            min={1}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Text className="font-bold">연 이자율 (%)</Text>
                                        <NumericInput
                                            fill
                                            value={interestRate}
                                            onValueChange={(v) => setInterestRate(v)}
                                        />
                                    </div>
                                </div>

                                {/* 추가 납입금 */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <Text className="font-bold">매달 추가 납입금</Text>
                                        <Text className="text-blue-500 text-base font-mono">
                                            {Util.UnitConversion(contributions * 10000, true)}
                                        </Text>
                                    </div>
                                    <ButtonGroup fill minimal className="mb-2">
                                        {[10, 100, 500, 1000].map((amt) => (
                                            <Button className="dark:!text-white" key={amt} onClick={() => setContributions((p) => p + amt)}>+{amt}만</Button>
                                        ))}
                                        <Button className="!text-red-500" onClick={() => setContributions(0)}>초기화</Button>
                                    </ButtonGroup>
                                    <NumericInput
                                        fill
                                        value={contributions}
                                        onValueChange={(v) => setContributions(v)}
                                        placeholder="매달 추가금(만원)"
                                        leftIcon={IconNames.WON}
                                        rightElement={<Text className="mr-2 text-center justify-center pt-0.5">만</Text>}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Text className="font-bold text-base">기대 물가상승률 (%)</Text>
                                    <NumericInput
                                        fill
                                        value={inflationRate}
                                        onValueChange={(v) => setInflationRate(v)}
                                    />
                                </div>
                            </SectionCard>
                        </Section>

                        {/* Results Summary Area */}
                        <Callout intent={Intent.SUCCESS} icon={IconNames.TRENDING_UP} title="계산 결과 요약">
                            <div className="grid grid-cols-1 gap-2 mt-2 font-mono">
                                <div className="flex justify-between">
                                    <span>최종 수입금:</span>
                                    <span className="font-bold text-lg">{finalValue.toLocaleString()} 원</span>
                                </div>
                                <div className="flex justify-between opacity-80">
                                    <span>누적 투자금:</span>
                                    <span>{totalInvestment.toLocaleString()} 원</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>최종 수익률:</span>
                                    <span className="text-green-600 dark:!text-green-400 font-bold">{finalRateOfReturn}%</span>
                                </div>
                            </div>
                        </Callout>

                        <Button
                            fill
                            large
                            intent={Intent.PRIMARY}
                            icon={IconNames.ADD}
                            onClick={registerResult}
                            className="py-3"
                        >
                            히스토리에 등록하기
                        </Button>
                    </div>

                    {/* Right Panel: Chart & History */}
                    <div className="lg:col-span-7 space-y-4">
                        <Card elevation={Elevation.TWO} className="rounded-xl overflow-hidden !p-0 !m-0 dark:!bg-zinc-900">
                            <div className="p-4 border-b dark:border-zinc-800">
                                <Text className="m-0 text-xl font-bold">자산 성장 그래프</Text>
                            </div>
                            <ResultChart data={chartData} height={"h-96"} />
                        </Card>

                        <Section title="히스토리" icon={IconNames.HISTORY} collapsible>
                            <SectionCard className="p-0 overflow-x-auto dark:!bg-black">
                                <table className="bp5-html-table bp5-html-table-striped bp5-interactive w-full text-base">
                                    <thead>
                                        <tr>
                                            <th>시작 금액</th>
                                            <th>기간</th>
                                            <th>수익률</th>
                                            <th className="text-right">최종 자산</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultList.map((res, idx) => (
                                            <tr key={idx} onClick={() => {
                                                setInvestmentAmount(res.investmentAmount);
                                                setNumberOfYears(res.numberOfYears);
                                                setInterestRate(res.interestRate);
                                                setContributions(res.contributions);
                                            }}>
                                                <td>{res.investmentAmount.toLocaleString()}만</td>
                                                <td>{res.numberOfYears}년</td>
                                                <td className="text-green-500 font-bold">{res.finalRateOfReturn}%</td>
                                                <td className="text-right font-mono">{Util.UnitConversion(res.finalValue, true)}</td>
                                            </tr>
                                        ))}
                                        {resultList.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-8 opacity-50">저장된 기록이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </SectionCard>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
}