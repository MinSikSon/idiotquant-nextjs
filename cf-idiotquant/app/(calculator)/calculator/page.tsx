"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Input, Typography } from "@material-tailwind/react";
import { CalculatorIcon } from "@heroicons/react/24/outline";
import ResultChart, { ChartDataItem } from "./ResultChart";
import { DesignButton } from "@/components/designButton";

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
    const [investmentAmount, setInvestmentAmount] = useState<number>(50000000);
    const [numberOfYears, setNumberOfYears] = useState<number>(12);
    const [interestRate, setInterestRate] = useState<number>(24);
    const [compounding, setCompounding] = useState<number>(InterestRateBenchmarkTermPerHour.eANNUALLY);
    const [contributions, setContributions] = useState<number>(3000000);
    const [frequency, setFrequency] = useState<number>(ContributionRateBenchmarkTermPerHour.eMONTHLY);
    const [inflationRate, setInflationRate] = useState<number>(3);

    // 계산 결과
    const [totalInvestment, setTotalInvestment] = useState<number>(0);
    const [finalValue, setFinalValue] = useState<number>(0);
    const [finalRateOfReturn, setFinalRateOfReturn] = useState<number>(0);
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);

    // 히스토리
    const [resultList, setResultList] = useState<CalculationResult[]>([]);

    const removeLeftZero = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = (Number(e.target.value) * 1).toString();
    };

    // 계산 함수
    const calculateResult = () => {
        const years = Math.max(0, Math.floor(numberOfYears));
        const hoursPerYear = 365 * 24;
        const totalHours = years * hoursPerYear;

        const safeCompounding = compounding > 0 ? compounding : InterestRateBenchmarkTermPerHour.eANNUALLY;
        const safeFrequency = frequency > 0 ? frequency : ContributionRateBenchmarkTermPerHour.eMONTHLY;

        let principal = Number(investmentAmount);
        let additional = 0;
        let cumulativeInvestment = Number(investmentAmount);

        const yearlySnapshots: ChartDataItem[] = [];

        for (let hour = 1; hour <= totalHours; hour++) {
            if (safeFrequency > 0 && hour % safeFrequency === 0) {
                additional += contributions;
                cumulativeInvestment += contributions;
            }

            if (safeCompounding > 0 && hour % safeCompounding === 0) {
                const netRate = (interestRate - inflationRate) / 100;
                principal = principal * (1 + netRate);
                additional = additional * (1 + netRate);
            }

            if (hour % hoursPerYear === 0) {
                const yearIndex = hour / hoursPerYear;
                const totalValue = Math.round(principal + additional);
                const profitRate = cumulativeInvestment > 0 ? (totalValue / cumulativeInvestment - 1) * 100 : 0;

                yearlySnapshots.push({
                    year: yearIndex,
                    totalValue,
                    profitRate: Number(profitRate.toFixed(2)),
                });
            }
        }

        const finalTotal = Math.round(principal + additional);

        setTotalInvestment(Math.round(cumulativeInvestment));
        setFinalValue(finalTotal);
        setFinalRateOfReturn(cumulativeInvestment === 0 ? 0 : Number(((finalTotal / cumulativeInvestment) * 100 - 100).toFixed(2)));
        setChartData(yearlySnapshots);
    };

    // 입력값 변경 시 자동 계산
    useEffect(() => {
        calculateResult();
    }, [investmentAmount, numberOfYears, interestRate, compounding, contributions, frequency, inflationRate]);

    // 히스토리에 저장
    const registerResult = () => {
        const newResult: CalculationResult = {
            investmentAmount,
            numberOfYears,
            interestRate,
            compounding,
            contributions,
            frequency,
            inflationRate,
            totalInvestment,
            finalValue,
            finalRateOfReturn,
            chartData,
        };
        setResultList([newResult, ...resultList]);
    };

    // 히스토리 클릭 시 복원
    const loadHistory = (res: CalculationResult) => {
        setInvestmentAmount(res.investmentAmount);
        setNumberOfYears(res.numberOfYears);
        setInterestRate(res.interestRate);
        setCompounding(res.compounding);
        setContributions(res.contributions);
        setFrequency(res.frequency);
        setInflationRate(res.inflationRate);
        setTotalInvestment(res.totalInvestment);
        setFinalValue(res.finalValue);
        setFinalRateOfReturn(res.finalRateOfReturn);
        setChartData(res.chartData);
    };

    return (
        <div className="flex flex-col dark:bg-black h-full dark:text-white">
            <div className="text-2xl flex items-center justify-left gap-2 p-6 sm:p-8 md:p-10 lg:p-12 ">
                <CalculatorIcon className="h-5 w-5" strokeWidth={2} />
                <div>Profit Calculator</div>
            </div>

            <div className="md:flex lg:flex xl:flex 2xl:flex">
                <Card className="max-w-lg mx-auto shadow-xl rounded-2xl">
                    <CardHeader className="p-0"></CardHeader>
                    <CardBody className="space-y-4">
                        <div className="flex flex-col gap-4">
                            {/* 입력폼 */}
                            <div className="flex flex-col w-full">
                                <Typography type="small" color="primary" className="font-mono text-[0.7rem] ml-2">투자 시작 금액 (원)</Typography>
                                <Input type="number" value={investmentAmount} onChange={(e) => { removeLeftZero(e); setInvestmentAmount(Number(e.target.value)); }} />
                            </div>
                            <div className="flex flex-col w-full">
                                <Typography type="small" color="primary" className="font-mono text-[0.7rem] ml-2">투자 기간 (년)</Typography>
                                <Input type="number" value={numberOfYears} onChange={(e) => { removeLeftZero(e); setNumberOfYears(Number(e.target.value)); }} />
                            </div>
                            <div className="flex flex-col w-full">
                                <Typography type="small" color="primary" className="font-mono text-[0.7rem] ml-2">연 이자율 (%)</Typography>
                                <Input type="number" value={interestRate} onChange={(e) => { removeLeftZero(e); setInterestRate(Number(e.target.value)); }} />
                            </div>
                            <div className="flex flex-col w-full">
                                <Typography type="small" color="primary" className="font-mono text-[0.7rem] ml-2">추가 납입금 (원)</Typography>
                                <Input type="number" value={contributions} onChange={(e) => { removeLeftZero(e); setContributions(Number(e.target.value)); }} />
                            </div>
                            <div className="flex flex-col w-full">
                                <Typography type="small" color="primary" className="font-mono text-[0.7rem] ml-2">물가상승률 (%)</Typography>
                                <Input type="number" value={inflationRate} onChange={(e) => { removeLeftZero(e); setInflationRate(Number(e.target.value)); }} />
                            </div>

                            {/* 계산 결과 */}
                            <div className="border-t py-2 px-6 rounded-lg border">
                                <div className="w-full flex justify-between">
                                    <Typography className="text-base text-right">최종 수입금:</Typography>
                                    <Typography className="text-base text-right">{finalValue.toLocaleString()} 원</Typography>
                                </div>
                                <div className="w-full flex justify-between">
                                    <Typography className="text-base text-right">누적 투자금:</Typography>
                                    <Typography className="text-base text-right">{totalInvestment.toLocaleString()} 원</Typography>
                                </div>
                                <div className="w-full flex justify-between">
                                    <Typography className="text-base text-right">최종 수익률:</Typography>
                                    <Typography className="text-base text-right">{finalRateOfReturn.toFixed(2)} %</Typography>
                                </div>
                            </div>

                            {/* 차트 */}
                            <div className="pb-8 md:hidden">
                                <ResultChart data={chartData} />
                            </div>
                            {/* 히스토리 등록 버튼 */}
                            <DesignButton
                                handleOnClick={registerResult}
                                buttonName="계산 결과 등록 🦄"
                                buttonBgColor="bg-blue-500"
                                buttonBorderColor="border-gray-500"
                                buttonShadowColor="#D5D5D5"
                                textStyle="text-white text-xs pt-0.5 font-bold"
                                buttonStyle="rounded-lg p-4"
                            />

                            {/* 히스토리 리스트 */}
                            <div className="mt-4">
                                <Typography className="font-bold text-sm">계산 결과 히스토리:</Typography>
                                <ul className="list-disc list-inside">
                                    {resultList.map((res, idx) => (
                                        <li key={idx} className="text-xs cursor-pointer hover:text-blue-400" onClick={() => loadHistory(res)}>
                                            투자: {res.investmentAmount.toLocaleString()}원, 기간: {res.numberOfYears}년, 연 이자율: {res.interestRate}%, 물가상승률: {res.inflationRate}%, 누적 투자금: {res.totalInvestment.toLocaleString()}원, 최종: {res.finalValue.toLocaleString()}원 ({res.finalRateOfReturn.toFixed(2)}%)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                    </CardBody>
                </Card>
                <Card className="hidden md:block max-w-lg mx-auto shadow-xl rounded-2xl">
                    {/* 차트 */}
                    <div className="pb-8">
                        <ResultChart data={chartData} />
                    </div>
                </Card>
            </div>
        </div>
    );
}
