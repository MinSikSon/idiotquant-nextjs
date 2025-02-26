"use client"

// code 출처 : https://reactjsexample.com/a-simple-calculator-app-built-using-tailwind-css-and-react-js/
import Head from "next/head";
import Script from "next/script.js";
import React from "react";

import { Input, Select, Option, Button, ListItem, ListItemSuffix } from "@material-tailwind/react";
import { CalculationList } from "@/app/(calculator)/calculator/calculationList"
import { DesignButton } from "@/components/designButton";

export interface CalculationResult {
    index: number,
    investmentAmount: number,
    numberOfYears: number,
    interestRate: number,
    compounding: number,
    contributions: number,
    frequency: number,
    inflationRate: number,
    totalInvestment: number,
    totalValue: number,
    finalRateOfReturn: number,
}

export default function Calculator() {
    React.useEffect(() => {
        handleCalculate();
    });

    const InterestRateBenchmarkTermPerHour =
    {
        // eDAILY360: 1, //"(Daily 360/Yr)"
        eDAILY365: 24,    // 365 day * 24 hour / 365 day = 24 hour
        eMONTHLY: 730,    // 365 day * 24 hour / 12 month = 730 hour
        eQUARTERLY: 2190, // 365 day * 24 hour / 4 quarter = 2190 hour
        eANNUALLY: 8760,  // 365 day * 24 hour / 1 year = 8760 hour
    }

    const ContributionRateBenchmarkTermPerHour = {
        eWEEKLY: 168,         // 7 day * 24 hour = 168 hour
        eBIWEEKLY: 336,       // 14 day * 24 hour = 336 hour
        eSEMIMONTHLY: 1460,   // 365 day * 24 hour / 6 month = 1460 hour
        eMONTHLY: 730,        // 365 day * 24 hour / 12 month = 730 hour
        eQUARTERLY: 2190,     // 365 day * 24 hour / 4 quarter = 2190 hour
        eSEMIANNUALLY: 17520, // 365 day * 24 hour / 2 year = 17520 hour
        eANNUALLY: 8760,      // 365 day * 24 hour / 1 year = 8760 hour
    }


    const DEFAULT_INTEREST_RATE_BENCHMARK = InterestRateBenchmarkTermPerHour.eANNUALLY;
    const DEFAULT_CONTRIBUTION_RATE_BENCHMARK = ContributionRateBenchmarkTermPerHour.eMONTHLY;

    const [investmentAmount, setInvestmentAmount] = React.useState<number>(50000000);
    const [totalInvestment, setTotalInvestment] = React.useState<number>(0);
    const [finalRateOfReturn, setFinalRateOfReturn] = React.useState<number>(0);

    const [numberOfYears, setNumberOfYears] = React.useState<number>(12);
    const [interestRate, setInterestRate] = React.useState<number>(24);
    const [compounding, setCompounding] = React.useState<number>(DEFAULT_INTEREST_RATE_BENCHMARK);
    const [contributions, setContributions] = React.useState<number>(3000000);
    const [frequency, setFrequency] = React.useState<number>(DEFAULT_CONTRIBUTION_RATE_BENCHMARK);
    const [inflationRate, setInflationRate] = React.useState<number>(3);
    const [result, setResult] = React.useState<number>(0);
    const [resultList, setResultList] = React.useState<CalculationResult[]>([]);


    function handleCalculateSampleData() {
        setInvestmentAmount(Number(50000000) * 1);
        setNumberOfYears(12);
        setInterestRate(24);
        setCompounding(DEFAULT_INTEREST_RATE_BENCHMARK);
        setContributions(3000000);
        setFrequency(DEFAULT_CONTRIBUTION_RATE_BENCHMARK);
        setInflationRate(3);
    }

    function getInterestRateBenchmark(interestRateBenchmark: number) {
        // console.log(`interestRateBenchmark`, interestRateBenchmark);
        switch (interestRateBenchmark) {
            case InterestRateBenchmarkTermPerHour.eDAILY365:
                return "Daily (365/Yr)";
            case InterestRateBenchmarkTermPerHour.eMONTHLY:
                return "Monthly (12/Yr)";
            case InterestRateBenchmarkTermPerHour.eQUARTERLY:
                return "Quarterly (4/Yr)";
            case InterestRateBenchmarkTermPerHour.eANNUALLY:
                return "Annually (1/Yr)";
            default:
                return "Unknown";
        }
    }

    function getContributeRateBenchmark(contributeRateBenchmark: number) {
        // console.log(`interestRateBenchmark`, interestRateBenchmark);
        switch (contributeRateBenchmark) {
            case ContributionRateBenchmarkTermPerHour.eWEEKLY:
                return "WEEKLY";
            case ContributionRateBenchmarkTermPerHour.eBIWEEKLY:
                return "BI-WEEKLY";
            case ContributionRateBenchmarkTermPerHour.eSEMIMONTHLY:
                return "SEMI-MONTHLY";
            case ContributionRateBenchmarkTermPerHour.eMONTHLY:
                return "MONTHLY";
            case ContributionRateBenchmarkTermPerHour.eQUARTERLY:
                return "QUARTERLY";
            case ContributionRateBenchmarkTermPerHour.eSEMIANNUALLY:
                return "SEMI-ANNUALLY";
            case ContributionRateBenchmarkTermPerHour.eANNUALLY:
                return "ANNUALLY";
            default:
                return "Unknown";
        }
    }

    function handleCalculate() {
        const numberOfDay = numberOfYears * 365;
        const numberOfHour = numberOfDay * 24;

        // 원금 수익 계산
        let principalReturn = Number(investmentAmount);
        let totalInvestmentReturn = principalReturn;
        for (let i = 0; i <= numberOfHour; ++i) {
            if (i > 0 && (0 == (i % compounding))) {
                principalReturn = principalReturn * (1 + ((interestRate - inflationRate) / 100));
            }
        }

        // 추가납입금 수익 계산
        let additionalPaymentReturn = 0;
        for (let i = 0; i <= numberOfHour; ++i) {
            if (i > 0 && (0 == (i % compounding))) {
                additionalPaymentReturn = additionalPaymentReturn * (1 + ((interestRate - inflationRate) / 100));
            }

            if (i > 0 && (0 == (i % frequency))) {
                totalInvestmentReturn += Number(contributions);
                additionalPaymentReturn += Number(contributions);
            }
        }

        const totalValue: number = Number(principalReturn.toFixed(0)) + Number(additionalPaymentReturn.toFixed(0));
        setResult(totalValue);
        setTotalInvestment(totalInvestmentReturn);
        setFinalRateOfReturn(0 == totalInvestmentReturn ? 0 : ((totalValue / totalInvestmentReturn) * 100 - 100));
    }

    function handleClear() {
        setInvestmentAmount(Number(0) * 1);
        setNumberOfYears(0);
        setInterestRate(0);
        setCompounding(DEFAULT_INTEREST_RATE_BENCHMARK);
        setContributions(0);
        setFrequency(DEFAULT_CONTRIBUTION_RATE_BENCHMARK);
        setInflationRate(0);
        setTotalInvestment(0);
        setResult(0);
        setFinalRateOfReturn(0);
    }

    function handleRegister() {
        console.log(`resultList`, resultList);
        const index = resultList.length;
        let registerValue: CalculationResult = {
            'index': index,
            'investmentAmount': investmentAmount,
            'numberOfYears': numberOfYears,
            'interestRate': interestRate,
            'compounding': compounding,
            'contributions': contributions,
            'frequency': frequency,
            'inflationRate': inflationRate,
            'totalInvestment': totalInvestment,
            'totalValue': result,
            'finalRateOfReturn': finalRateOfReturn,
        }
        console.log(`계산 결과 등록`, registerValue);

        const NewResultList = [registerValue, ...resultList];
        console.log(`NewResultList`, NewResultList);
        setResultList(NewResultList);
    }

    function handleOnClickResultList(e: any, key: any) {
        console.log(`[handleOnClickResultList]`, `e:`, e, `, key:`, key);

        setInvestmentAmount(resultList[key].investmentAmount);
        setNumberOfYears(resultList[key].numberOfYears);
        setInterestRate(resultList[key].interestRate);
        setCompounding(resultList[key].compounding);
        setContributions(resultList[key].contributions);
        setFrequency(resultList[key].frequency);
        setInflationRate(resultList[key].inflationRate);

        setResult(resultList[key].totalValue);
    }

    function removeLeftZero(e: any) {
        e.target.value = (Number(e.target.value) * 1).toString();
    }

    return (
        <div className="font-mono">
            <Head>
                <title>기대 수익 계산기 | 미래 수익 예측</title>
                <link rel="icon" href="/images/icons8-calculator-color-32.png" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
                <meta name="description" content="인플레이션을 고려하여 미래 수익을 계산하는 계산기를 제공하는 웹 페이지입니다. 현재 가치를 기반으로 인플레이션률을 적용하여 미래의 금융적 상황을 예측하고 투자 결정에 도움을 드립니다." />
            </Head>
            <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
                crossOrigin="anonymous"
                strategy="lazyOnload"
                onLoad={() =>
                    console.log(`script loaded correctly, window.FB has been populated`)
                }
            />

            <div className='w-screen flex justify-between items-center px-4 py-0 sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
                <div className="w-full h-full rounded-xl bg-white text-gray-700 border border-gray-300 shadow-md">
                    <ListItem className='text-black pb-0 mb-1'>
                        <div className="w-full text-md header-contents text-center">
                            <span className='bg-yellow-500'> 기대 수익</span> 계산기
                        </div>
                        <ListItemSuffix>
                            <img className='h-4 col-span-1 object-fill' src='/images/icons8-calculator.gif' />
                        </ListItemSuffix>
                    </ListItem>
                    <div className="w-auto m-1 h-auto mb-1">
                        <form className="flex flex-col gap-1.5 m-4">
                            <div className="gap-0">
                                <div className='flex justify-between my-0'>
                                    <div className='text-base underline decoration-4 decoration-yellow-500'>{'최종 수입금:'}</div>
                                    <div className='text-xl text-right underline decoration-4 decoration-yellow-500'>{' ' + result.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + ' 원'}</div>
                                </div>
                                <div className='flex justify-between my-0 py-0'>
                                    <div className='text-md'>{'최종 수익률:'}</div>
                                    <div className='text-xl text-right'>{' ' + Number(finalRateOfReturn).toFixed(2) + ' %'}</div>
                                </div>
                                <div className='flex justify-between my-0 py-0'>
                                    <div className='text-base'>{'누적 투자금:'}</div>
                                    <div className='text-xl text-right'>{' ' + totalInvestment.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + ' 원'}</div>
                                </div>
                            </div>
                            <div className='flex'>
                                <Input color="black" label="투자 시작 금액: (원)" type='number' onChange={(e) => { removeLeftZero(e); setInvestmentAmount(Number(e.target.value)); }} value={Number(investmentAmount) * 1} crossOrigin={undefined} />
                                {!!investmentAmount ?
                                    <>
                                        <DesignButton
                                            handleOnClick={() => setInvestmentAmount(Number(0) * 1)}
                                            buttonName="CLEAR"
                                            buttonBgColor="bg-green-400"
                                            buttonBorderColor="border-green-300"
                                            buttonShadowColor="#129600"
                                            textStyle="text-white text-xs pt-0.5 font-bold"
                                            buttonStyle="rounded-lg px-4 ml-2"
                                        />
                                    </>
                                    :
                                    <></>}
                            </div>
                            <div className='flex'>
                                <Input color="black" label="투자 기간: (년)" type='number' onChange={(e) => { removeLeftZero(e); setNumberOfYears(Number(e.target.value)); }} value={numberOfYears} crossOrigin={undefined} />
                                {!!numberOfYears ? <>
                                    <DesignButton
                                        handleOnClick={() => setNumberOfYears(0)}
                                        buttonName="CLEAR"
                                        buttonBgColor="bg-green-400"
                                        buttonBorderColor="border-green-300"
                                        buttonShadowColor="#129600"
                                        textStyle="text-white text-xs pt-0.5 font-bold"
                                        buttonStyle="rounded-lg px-4 ml-2"
                                    />
                                    {/* <Button className="font-mono ml-1 py-0" variant="outlined" onClick={() => setNumberOfYears(0)}>CLEAR</Button> */}
                                </>
                                    : <></>}
                            </div>
                            <div className='flex-row border-4  border-red-100 pt-1'>
                                <Select label="복리" value={String(compounding)} onChange={(value) => { setCompounding(Number(value)) }}
                                    animate={{
                                        mount: { y: 0 },
                                        unmount: { y: 25 },
                                    }}>
                                    <Option value={String(InterestRateBenchmarkTermPerHour.eDAILY365)}>Daily (365/Yr)</Option>
                                    <Option value={String(InterestRateBenchmarkTermPerHour.eMONTHLY)}>Monthly (12/Yr)</Option>
                                    <Option value={String(InterestRateBenchmarkTermPerHour.eQUARTERLY)}>Quarterly (4/Yr)</Option>
                                    <Option value={String(InterestRateBenchmarkTermPerHour.eANNUALLY)}>Annually (1/Yr)</Option>
                                </Select>
                                <div className='pt-2 flex'>
                                    <Input color="black" label={`${getInterestRateBenchmark(compounding)} 이자율 (%)`} type='number' onChange={(e) => { removeLeftZero(e); setInterestRate(Number(e.target.value)); }} value={interestRate} crossOrigin={undefined} />
                                    {!!interestRate ?
                                        <>
                                            <DesignButton
                                                handleOnClick={() => setInterestRate(0)}
                                                buttonName="CLEAR"
                                                buttonBgColor="bg-green-400"
                                                buttonBorderColor="border-green-300"
                                                buttonShadowColor="#129600"
                                                textStyle="text-white text-xs pt-0.5 font-bold"
                                                buttonStyle="rounded-lg px-4 ml-2"
                                            />
                                            {/* <Button className="font-mono ml-1 py-0" variant="outlined" onClick={() => setInterestRate(0)}>CLEAR</Button> */}
                                        </>
                                        : <></>}
                                </div>
                            </div>
                            <div className='flex-row border-4  border-blue-100 pt-1'>
                                <Select className="bg-white" label="추가 납입금 납입 빈도" value={String(frequency)} onChange={(value) => { setFrequency(Number(value)) }}
                                    animate={{
                                        mount: { y: 0 },
                                        unmount: { y: 25 },
                                    }} >
                                    <Option value={String(ContributionRateBenchmarkTermPerHour.eWEEKLY)}>Weekly</Option>
                                    <Option value={String(ContributionRateBenchmarkTermPerHour.eBIWEEKLY)}>Bi-Weekly</Option>
                                    <Option value={String(ContributionRateBenchmarkTermPerHour.eSEMIMONTHLY)}>Semi-Monthly</Option>
                                    <Option value={String(ContributionRateBenchmarkTermPerHour.eMONTHLY)}>Monthly</Option>
                                    <Option value={String(ContributionRateBenchmarkTermPerHour.eQUARTERLY)}>Quarterly</Option>
                                    <Option value={String(ContributionRateBenchmarkTermPerHour.eSEMIANNUALLY)}>Semi-Annually</Option>
                                    <Option value={String(ContributionRateBenchmarkTermPerHour.eANNUALLY)}>Annually</Option>
                                </Select>
                                <div className='pt-2 flex bg-white'>
                                    <Input color="black" label={`${getContributeRateBenchmark(frequency)} 추가 납입금`} type='number' onChange={(e) => { removeLeftZero(e); setContributions(Number(e.target.value)); }} value={contributions} crossOrigin={undefined} />
                                    {!!contributions ?
                                        <>
                                            <DesignButton
                                                handleOnClick={() => setContributions(0)}
                                                buttonName="CLEAR"
                                                buttonBgColor="bg-green-400"
                                                buttonBorderColor="border-green-300"
                                                buttonShadowColor="#129600"
                                                textStyle="text-white text-xs pt-0.5 font-bold"
                                                buttonStyle="rounded-lg px-4 ml-2"
                                            />
                                            {/* <Button className="font-mono ml-1 py-0" variant="outlined" onClick={() => setContributions(0)}>CLEAR</Button> */}
                                        </>
                                        : <></>}
                                </div>
                            </div>
                            <div className='flex'>
                                <Input color="black" label="물가상승률 (%)" type='number' onChange={(e) => { removeLeftZero(e); setInflationRate(Number(e.target.value)); }} value={inflationRate} crossOrigin={undefined} />
                                {!!inflationRate ?
                                    <>
                                        <DesignButton
                                            handleOnClick={() => setInflationRate(0)}
                                            buttonName="CLEAR"
                                            buttonBgColor="bg-green-400"
                                            buttonBorderColor="border-green-300"
                                            buttonShadowColor="#129600"
                                            textStyle="text-white text-xs pt-0.5 font-bold"
                                            buttonStyle="rounded-lg px-4 ml-2"
                                        />
                                        {/* <Button className="font-mono ml-1 py-0" variant="outlined" onClick={() => setInflationRate(0)}>CLEAR</Button> */}
                                    </>
                                    : <></>}
                            </div>
                            <div className="flex">
                                <DesignButton
                                    handleOnClick={() => handleCalculateSampleData()}
                                    buttonName="계산 예시"
                                    buttonBgColor="bg-green-400"
                                    buttonBorderColor="border-green-300"
                                    buttonShadowColor="#129600"
                                    textStyle="text-white text-xs pt-0.5 font-bold"
                                    buttonStyle="rounded-lg px-6 py-2"
                                />
                                {/* <Button className="font-mono w-36 mr-1" color="green" variant="outlined" onClick={handleCalculateSampleData}>
                                    <div>(계산 예시)</div>
                                </Button> */}
                                <div className="flex-1 grid grid-cols-1">
                                    <DesignButton
                                        handleOnClick={() => handleClear()}
                                        buttonName="ALL CLEAR"
                                        buttonBgColor="bg-red-400"
                                        buttonBorderColor="border-red-300"
                                        buttonShadowColor="#910000"
                                        textStyle="text-white text-xs pt-0.5 font-bold"
                                        // buttonStyle="rounded-lg px-4 py-2 ml-2"
                                        buttonStyle={`rounded-lg px-4 py-2 ml-2 flex items-center justify-center mb-2 px-1 button bg-red-400 rounded-full cursor-pointer select-none
                                            active:translate-y-1 active:[box-shadow:0_0px_0_0_#910000,0_0px_0_0_#91000041] active:border-b-[0px]
                                            transition-all duration-150 [box-shadow:0_4px_0_0_#910000,0_8px_0_0_#91000041] border-b-[1px] border-red-300
                                            `}
                                    />
                                    {/* <Button className="font-mono ml-1 rounded-full" variant="outlined" color="red" onClick={handleClear}>ALL CLEAR</Button> */}
                                </div>
                            </div>
                            <DesignButton
                                handleOnClick={() => handleRegister()}
                                buttonName="계산 결과 등록 🦄"
                                buttonBgColor="bg-green-400"
                                buttonBorderColor="border-green-300"
                                buttonShadowColor="#129600"
                                textStyle="text-white text-xs pt-0.5 font-bold"
                                buttonStyle="rounded-lg p-4"
                            />
                            {/* <Button className="font-mono" variant="outlined" onClick={handleRegister}>계산 결과 등록 🦄</Button> */}
                        </form>
                    </div>
                </div>
            </div>
            <CalculationList
                resultList={resultList}
                handleOnClickResultList={handleOnClickResultList}
                getInterestRateBenchmark={getInterestRateBenchmark}
                getContributeRateBenchmark={getContributeRateBenchmark}
            />

        </div>
    );
}