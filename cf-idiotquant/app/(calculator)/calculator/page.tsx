"use client";

import React, { useState, useEffect } from "react";
import { Badge, Box, Button, Card, Code, DataList, Flex, Text, TextField } from "@radix-ui/themes";

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
            <Flex align="center" justify="center">
                <Text className="text-2xl flex items-center justify-left gap-2 p-6 sm:p-8 md:p-10 lg:p-12 ">
                    <CalculatorIcon className="h-5 w-5" strokeWidth={2} />
                    <Code>Profit Calculator</Code>
                </Text>
            </Flex>

            <div className="md:flex lg:flex xl:flex 2xl:flex">
                <Card className="w-full mx-auto shadow-xl rounded-2xl">
                    {/* <CardHeader className="p-0"></CardHeader> */}
                    <Box className="space-y-4">
                        <div className="flex flex-col gap-1">
                            {/* 입력폼 */}
                            <div className="flex flex-col gap-1 border-b pb-1">
                                <div className="flex gap-1 text-xs">
                                    <div className="flex w-full justify-between min-w-32">
                                        <Button
                                            onClick={() => increaseInvestment(10)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +10만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(100)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +100만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(200)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +200만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(500)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +500만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(1000)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +1000만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseInvestment(2000)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +2000만
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                                <div className="w-full flex justify-between items-center">
                                    <div className="flex gap-1 min-w-16">
                                        <Button
                                            onClick={() => setInvestmentAmount(0)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            // variant="outline"
                                            // color="error"
                                            color="crimson"
                                            variant="classic"
                                            radius="full"
                                        >
                                            CLEAR
                                        </Button>
                                    </div>
                                    <Text size="3" className="font-mono mx-4 min-w-20 text-right">투자 시작 금액</Text>
                                    <TextField.Root size="3" type="number" value={investmentAmount} onChange={(e) => { removeLeftZero(e); setInvestmentAmount(Number(e.target.value)); }} />
                                    <Text className="font-mono text-[0.8rem] ml-2 min-w-20">({Util.UnitConversion(Number(investmentAmount) * 10000, true, investmentAmount >= 10000 ? 1 : 0)})</Text>

                                </div>
                            </div>
                            <div className="w-full flex justify-between items-center">
                                <div className="flex gap-1 min-w-16">
                                    <Button
                                        onClick={() => increaseNumberOfYears(-1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        // color="info"
                                        variant="outline"
                                        radius="full"
                                    >
                                        -1
                                    </Button>
                                    <Button
                                        onClick={() => increaseNumberOfYears(1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        // color="info"
                                        variant="outline"
                                        radius="full"
                                    >
                                        +1
                                    </Button>
                                </div>
                                <Text size="3" className="font-mono mx-4 min-w-20 text-right">투자 기간</Text>
                                <TextField.Root size="3" type="number" value={numberOfYears} onChange={(e) => { removeLeftZero(e); setNumberOfYears(Number(e.target.value)); }} />
                                <Text className="font-mono text-[0.8rem] ml-2 min-w-20">(년)</Text>
                            </div>
                            <div className="w-full flex justify-between items-center border-b pb-1">
                                <div className="flex gap-1 min-w-16">
                                    <Button
                                        onClick={() => increaseInterestRate(-1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        // color="info"
                                        variant="outline"
                                        radius="full"
                                    >
                                        -1
                                    </Button>
                                    <Button
                                        onClick={() => increaseInterestRate(1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        // color="info"
                                        variant="outline"
                                        radius="full"
                                    >
                                        +1
                                    </Button>
                                </div>
                                <Text size="3" className="font-mono mx-4 min-w-20 text-right">연 이자율</Text>
                                <TextField.Root size="3" type="number" value={interestRate} onChange={(e) => { removeLeftZero(e); setInterestRate(Number(e.target.value)); }} />
                                <Text className="font-mono text-[0.8rem] ml-2 min-w-20">(%)</Text>
                            </div>
                            <div className="flex flex-col gap-1 border-b pb-1">
                                <div className="flex gap-1 text-xs">
                                    <div className="flex w-full justify-between min-w-32">
                                        <Button
                                            onClick={() => increaseContributions(10)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +10만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(100)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +100만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(200)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +200만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(500)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +500만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(1000)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +1000만
                                            </span>
                                        </Button>
                                        <Button
                                            onClick={() => increaseContributions(2000)}
                                            variant="outline"
                                            radius="full"
                                        >
                                            <span className="text-[0.6rem]">
                                                +2000만
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                                <div className="w-full flex justify-between items-center">
                                    <div className="flex gap-1 min-w-16">
                                        <Button
                                            onClick={() => setContributions(0)}
                                            className="px-1 py-1 text-[0.8rem] rounded min-w-14"
                                            // variant="outline"
                                            // color="error"
                                            color="crimson"
                                            variant="classic"
                                            radius="full"
                                        >
                                            CLEAR
                                        </Button>
                                    </div>
                                    <div className="flex flex-col font-mono text-[0.8rem] mx-4 min-w-20 text-right">
                                        <Text size="3">추가 납입금</Text>
                                        <Text className="text-[0.7rem]">(매달)</Text>
                                    </div>
                                    <TextField.Root size="3" type="number" value={contributions} onChange={(e) => { removeLeftZero(e); setContributions(Number(e.target.value)); }} />
                                    <Text className="font-mono text-[0.8rem] ml-2 min-w-20">({Util.UnitConversion(Number(contributions) * 10000, true, contributions >= 10000 ? 1 : 0)})</Text>
                                </div>
                            </div>
                            <div className="w-full flex justify-between items-center border-b pb-1">
                                <div className="flex gap-1 min-w-16">
                                    <Button
                                        onClick={() => increaseInflationRate(-1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        // color="info"
                                        variant="outline"
                                    >
                                        -1
                                    </Button>
                                    <Button
                                        onClick={() => increaseInflationRate(1)}
                                        className="px-1 py-1 text-[0.8rem] rounded min-w-7"
                                        // color="info"
                                        variant="outline"
                                    >
                                        +1
                                    </Button>
                                </div>
                                <Text size="3" className="font-mono mx-4 min-w-20 text-right">물가상승률</Text>
                                <TextField.Root size="3" type="number" value={inflationRate} onChange={(e) => { removeLeftZero(e); setInflationRate(Number(e.target.value)); }} />
                                <Text className="font-mono text-[0.8rem] ml-2 min-w-20">(%)</Text>
                            </div>

                            {/* 계산 결과 */}
                            <div className="border-t py-1 pl-1 rounded-lg border">
                                <div className="w-full flex justify-between items-center">
                                    <Text className="text-[0.8rem] mx-4 min-w-32 text-right">최종 수입금:</Text>
                                    <Text className="!font-mono !tabular-nums tracking-tight text-right min-w-32">{finalValue.toLocaleString()}</Text>
                                    <Text className="text-[0.8rem] ml-2 min-w-8">원</Text>
                                </div>
                                <div className="w-full flex justify-between items-center">
                                    <Text className="text-[0.8rem] mx-4 min-w-32 text-right">누적 투자금:</Text>
                                    <Text className="!font-mono !tabular-nums tracking-tight text-right min-w-32">{totalInvestment.toLocaleString()}</Text>
                                    <Text className="text-[0.8rem] ml-2 min-w-8">원</Text>
                                </div>
                                <div className="w-full flex justify-between items-center">
                                    <Text className="text-[0.8rem] mx-4 min-w-32 text-right">최종 수익률:</Text>
                                    <Text className="!font-mono !tabular-nums tracking-tight text-right min-w-32">{finalRateOfReturn.toFixed(2)}</Text>
                                    <Text className="text-[0.8rem] ml-2 min-w-8">%</Text>
                                </div>
                            </div>

                            {/* 차트 */}
                            <div className="mb-4 md:hidden border rounded-md">
                                <ResultChart data={chartData} height={"h-80"} />
                            </div>
                            <Button
                                onClick={registerResult}
                                className="w-full mt-2 mb-1 py-2 text-[0.9rem] rounded-lg"
                                variant="classic"
                                color="blue"
                            >
                                계산 결과 등록 🦄
                            </Button>

                            {/* 히스토리 리스트 */}
                            <Box mt="4" p="1" className="border rounded-md">
                                <Box p="1">
                                    <Text className="font-bold text-sm">히스토리</Text>
                                </Box>
                                <DataList.Root>
                                    {resultList.map((res, idx) => (
                                        <DataList.Item align="center" key={idx} className="text-xs cursor-pointer hover:text-blue-400" onClick={() => loadHistory(res)}>
                                            <DataList.Label minWidth="40px">
                                                <Flex direction="column">
                                                    <Text>
                                                        시작금액: {res.investmentAmount.toLocaleString()}만원
                                                    </Text>
                                                    <Text>
                                                        기간: {res.numberOfYears}년
                                                    </Text>
                                                    <Text>
                                                        이자율: {res.interestRate}% | 물가상승률: {res.inflationRate}%
                                                    </Text>
                                                    <Text>
                                                        누적 투자금: {Util.UnitConversion(Number(res.totalInvestment), true)}
                                                    </Text>
                                                </Flex>
                                            </DataList.Label>
                                            <DataList.Value>
                                                <Flex direction="column">
                                                    <Text>
                                                        최종 수익금: {res.finalValue.toLocaleString()}원 ({res.finalRateOfReturn.toFixed(2)}%)
                                                    </Text>
                                                </Flex>
                                            </DataList.Value>
                                        </DataList.Item>
                                    ))}
                                </DataList.Root>


                            </Box>
                        </div>
                    </Box>
                </Card>
                <div className="mb-4 hidden md:block border rounded-md w-full">
                    <Card className="max-w-lg mx-auto shadow-xl rounded-2xl w-full">
                        {/* 차트 */}
                        <div className="pb-8">
                            <ResultChart data={chartData} height={"h-96"} />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
