"use client";

import React, { useState, useEffect } from "react";
import { Button, Card, CardBody, CardHeader, Input, Typography } from "@material-tailwind/react";
import { CalculatorIcon } from "@heroicons/react/24/outline";
import ResultChart, { ChartDataItem } from "./ResultChart";
import { DesignButton } from "@/components/designButton";
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

        const safeCompounding =
            compounding > 0 ? compounding : InterestRateBenchmarkTermPerHour.eANNUALLY;
        const safeFrequency =
            frequency > 0 ? frequency : ContributionRateBenchmarkTermPerHour.eMONTHLY;

        let principal = Number(investmentAmount) * 10000; // ✅ 초기 투자금
        let additional = 0;
        let cumulativeInvestment = Number(investmentAmount) * 10000;

        const yearlySnapshots: ChartDataItem[] = [];

        // ✅ 초기값을 첫 데이터로 추가
        yearlySnapshots.push({
            year: 0,
            totalValue: principal, // 초기 투자금 그대로
            profitRate: 0,         // 아직 수익률 없음
        });

        for (let hour = 1; hour <= totalHours; hour++) {
            if (safeFrequency > 0 && hour % safeFrequency === 0) {
                additional += (contributions * 10000); // 만원 단위 변환
                cumulativeInvestment += (contributions * 10000); // 만원 단위 변환
            }

            if (safeCompounding > 0 && hour % safeCompounding === 0) {
                const netRate = (interestRate - inflationRate) / 100;
                principal = principal * (1 + netRate);
                additional = additional * (1 + netRate);
            }

            if (hour % hoursPerYear === 0) {
                const yearIndex = hour / hoursPerYear;
                const totalValue = Math.round(principal + additional);
                const profitRate =
                    cumulativeInvestment > 0
                        ? (totalValue / cumulativeInvestment - 1) * 100
                        : 0;

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
        setFinalRateOfReturn(
            cumulativeInvestment === 0
                ? 0
                : Number(((finalTotal / cumulativeInvestment) * 100 - 100).toFixed(2))
        );
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

    const increaseInvestment = (amount: number) => {
        setInvestmentAmount((prev) => prev + amount);
    };
    const increaseNumberOfYears = (amount: number) => {
        setNumberOfYears((prev) => prev + amount);
    };
    const increaseInterestRate = (amount: number) => {
        setInterestRate((prev) => prev + amount);
    };
    const increaseContributions = (amount: number) => {
        setContributions((prev) => prev + amount);
    };
    const increaseInflationRate = (amount: number) => {
        setInflationRate((prev) => prev + amount);
    };

    return (
        <div className="flex flex-col dark:bg-black h-full dark:text-white">
            <div className="text-2xl flex items-center justify-left gap-2 p-6 sm:p-8 md:p-10 lg:p-12 ">
                <CalculatorIcon className="h-5 w-5" strokeWidth={2} />
                <div>Profit Calculator</div>
            </div>

            <div className="md:flex lg:flex xl:flex 2xl:flex">
                <Card className="max-w-lg mx-auto shadow-xl rounded-2xl">
                    {/* <CardHeader className="p-0"></CardHeader> */}
                    <CardBody className="space-y-4">
                        <div className="flex flex-col gap-1">
                            {/* 입력폼 */}
                            <div className="flex flex-col gap-1 border-b pb-1">
                                <div className="flex gap-1 text-xs">
                                    <div className="flex w-full justify-between min-w-32">
                                        <Button
                                            onClick={() => increaseInvestment(10)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +10만
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(100)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +100만
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(200)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +200만
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(500)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +500만
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(1000)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +1000만
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(2000)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +2000만
                                        </Button>
                                    </div>
                                </div>
                                <div className="w-full flex justify-between items-center">
                                    <div className="flex gap-1 min-w-16">
                                        <Button
                                            onClick={() => setInvestmentAmount(0)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            // variant="outline"
                                            color="error"
                                        >
                                            CLEAR
                                        </Button>
                                    </div>
                                    <Typography type="small" color="primary" className="font-mono text-[0.8rem] mx-4 min-w-20 text-right">투자 시작 금액</Typography>
                                    <Input type="number" value={investmentAmount} onChange={(e) => { removeLeftZero(e); setInvestmentAmount(Number(e.target.value)); }} />
                                    <Typography type="small" color="primary" className="font-mono text-[0.8rem] ml-2 min-w-20">({Util.UnitConversion(Number(investmentAmount) * 10000, true, investmentAmount >= 10000 ? 1 : 0)})</Typography>

                                </div>
                            </div>
                            <div className="w-full flex justify-between items-center">
                                <div className="flex gap-1 min-w-16">
                                    <Button
                                        onClick={() => increaseNumberOfYears(-1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        color="info"
                                        variant="outline"
                                    >
                                        -1
                                    </Button>
                                    <Button
                                        onClick={() => increaseNumberOfYears(1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        color="info"
                                        variant="outline"
                                    >
                                        +1
                                    </Button>
                                </div>
                                <Typography type="small" color="primary" className="font-mono text-[0.8rem] mx-4 min-w-20 text-right">투자 기간</Typography>
                                <Input type="number" value={numberOfYears} onChange={(e) => { removeLeftZero(e); setNumberOfYears(Number(e.target.value)); }} />
                                <Typography type="small" color="primary" className="font-mono text-[0.8rem] ml-2 min-w-20">(년)</Typography>
                            </div>
                            <div className="w-full flex justify-between items-center border-b pb-1">
                                <div className="flex gap-1 min-w-16">
                                    <Button
                                        onClick={() => increaseInterestRate(-1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        color="info"
                                        variant="outline"
                                    >
                                        -1
                                    </Button>
                                    <Button
                                        onClick={() => increaseInterestRate(1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        color="info"
                                        variant="outline"
                                    >
                                        +1
                                    </Button>
                                </div>
                                <Typography type="small" color="primary" className="font-mono text-[0.8rem] mx-4 min-w-20 text-right">연 이자율</Typography>
                                <Input type="number" value={interestRate} onChange={(e) => { removeLeftZero(e); setInterestRate(Number(e.target.value)); }} />
                                <Typography type="small" color="primary" className="font-mono text-[0.8rem] ml-2 min-w-20">(%)</Typography>
                            </div>
                            <div className="flex flex-col gap-1 border-b pb-1">
                                <div className="flex gap-1 text-xs">
                                    <div className="flex w-full justify-between min-w-32">
                                        <Button
                                            onClick={() => increaseContributions(10)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +10만
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(100)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +100만
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(200)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +200만
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(500)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +500만
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(1000)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +1000만
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(2000)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            variant="outline"
                                        >
                                            +2000만
                                        </Button>
                                    </div>
                                </div>
                                <div className="w-full flex justify-between items-center">
                                    <div className="flex gap-1 min-w-16">
                                        <Button
                                            onClick={() => setContributions(0)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            // variant="outline"
                                            color="error"
                                        >
                                            CLEAR
                                        </Button>
                                    </div>
                                    <div className="flex flex-col font-mono text-[0.8rem] mx-4 min-w-20 text-right">
                                        <Typography type="small" color="primary" className="">추가 납입금</Typography>
                                        <Typography type="small" color="primary" className="text-[0.7rem]">(매달)</Typography>
                                    </div>
                                    <Input type="number" value={contributions} onChange={(e) => { removeLeftZero(e); setContributions(Number(e.target.value)); }} />
                                    <Typography type="small" color="primary" className="font-mono text-[0.8rem] ml-2 min-w-20">({Util.UnitConversion(Number(contributions) * 10000, true, contributions >= 10000 ? 1 : 0)})</Typography>
                                </div>
                            </div>
                            <div className="w-full flex justify-between items-center border-b pb-1">
                                <div className="flex gap-1 min-w-16">
                                    <Button
                                        onClick={() => increaseInflationRate(-1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        color="info"
                                        variant="outline"
                                    >
                                        -1
                                    </Button>
                                    <Button
                                        onClick={() => increaseInflationRate(1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        color="info"
                                        variant="outline"
                                    >
                                        +1
                                    </Button>
                                </div>
                                <Typography type="small" color="primary" className="font-mono text-[0.8rem] mx-4 min-w-20 text-right">물가상승률</Typography>
                                <Input type="number" value={inflationRate} onChange={(e) => { removeLeftZero(e); setInflationRate(Number(e.target.value)); }} />
                                <Typography type="small" color="primary" className="font-mono text-[0.8rem] ml-2 min-w-20">(%)</Typography>
                            </div>

                            {/* 계산 결과 */}
                            <div className="border-t py-1 pl-1 rounded-lg border">
                                <div className="w-full flex justify-between items-center">
                                    <Typography className="text-[0.8rem] mx-4 min-w-32 text-right">최종 수입금:</Typography>
                                    <Typography className="!font-mono !tabular-nums tracking-tight text-right min-w-32">{finalValue.toLocaleString()}</Typography>
                                    <Typography className="text-[0.8rem] ml-2 min-w-8">원</Typography>
                                </div>
                                <div className="w-full flex justify-between items-center">
                                    <Typography className="text-[0.8rem] mx-4 min-w-32 text-right">누적 투자금:</Typography>
                                    <Typography className="!font-mono !tabular-nums tracking-tight text-right min-w-32">{totalInvestment.toLocaleString()}</Typography>
                                    <Typography className="text-[0.8rem] ml-2 min-w-8">원</Typography>
                                </div>
                                <div className="w-full flex justify-between items-center">
                                    <Typography className="text-[0.8rem] mx-4 min-w-32 text-right">최종 수익률:</Typography>
                                    <Typography className="!font-mono !tabular-nums tracking-tight text-right min-w-32">{finalRateOfReturn.toFixed(2)}</Typography>
                                    <Typography className="text-[0.8rem] ml-2 min-w-8">%</Typography>
                                </div>
                            </div>

                            {/* 차트 */}
                            <div className="mb-4 md:hidden border rounded-md">
                                <ResultChart data={chartData} height={"h-80"} />
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
                        <ResultChart data={chartData} height={"h-96"} />
                    </div>
                </Card>
            </div>
        </div>
    );
}
