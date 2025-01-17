"use client"

// code 출처 : https://reactjsexample.com/a-simple-calculator-app-built-using-tailwind-css-and-react-js/
import Head from "next/head";
import Script from "next/script.js";
import React from "react";

import { Input, Select, Option, Button, ListItem, ListItemSuffix } from "@material-tailwind/react";

export default function Calculator() {
    React.useEffect(() => {
        handleCalculate();
    });

    const [investmentAmount, setInvestmentAmount] = React.useState<number>(500000);
    const [numberOfYears, setNumberOfYears] = React.useState<number>(3);
    const [interestRate, setInterestRate] = React.useState<number>(27);
    const [compunding, setCompunding] = React.useState<number>(0);
    const [contributions, setContributions] = React.useState<number>(50000);
    const [frequency, setFrequency] = React.useState<number>(0);
    const [annualInflationRate, setAnnualInflationRate] = React.useState<number>(3);
    const [result, setResult] = React.useState<number>(0);

    function handleCalculateSampleData() {
        setInvestmentAmount(Number(50000000) * 1);
        setNumberOfYears(12);
        setInterestRate(24);
        // setCompunding('');
        setContributions(2000000);
        // setFrequency('');
        setAnnualInflationRate(1);
    }

    function handleCalculate() {
        // 원금계산
        let principalReturn = Number(investmentAmount);
        const loop = (numberOfYears < 0) ? 0 : numberOfYears * 12;
        const monthlyInterestRate = interestRate / 12;
        const monthlyInflationRate = annualInflationRate / 12;
        for (let month = 0; month < loop; month++) {
            principalReturn = principalReturn * (1 + (monthlyInterestRate - monthlyInflationRate) / 100);
        }

        // 추가납입금 계산
        let additionalPaymentReturn = 0;
        // const loop = (numberOfYears < 0) ? 0 : numberOfYears * 12;
        // const monthlyInterestRate = interestRate / 12;
        // const monthlyInflationRate = annualInflationRate / 12;
        for (let month = 0; month < loop; month++) {
            additionalPaymentReturn += Number(contributions);
            additionalPaymentReturn = additionalPaymentReturn * (1 + (monthlyInterestRate - monthlyInflationRate) / 100);
        }

        const totalValue: number = Number(principalReturn.toFixed(0)) + Number(additionalPaymentReturn.toFixed(0));
        setResult(totalValue);
    }

    function handleClear() {
        setInvestmentAmount(Number(0) * 1);
        setNumberOfYears(0);
        setInterestRate(0);
        // setCompunding(0);
        setContributions(0);
        setFrequency(0);
        setAnnualInflationRate(0);

        setResult(0);
    }

    function removeLeftZero(e: any) {
        e.target.value = (Number(e.target.value) * 1).toString();
    }

    return (
        <div>
            <Head>
                <title>인플레이션 및 수익 계산기 | 미래 수익 예측</title>
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

            <div className='w-screen flex justify-between items-center p-4 sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
                <div className="w-full h-full rounded-xl bg-white text-gray-700 border border-gray-300 shadow-md">
                    <ListItem className='text-black pb-0 mb-1'>
                        <div className="w-full font-mono text-md header-contents text-center">
                            <span className='bg-yellow-500'> 인플레이션 </span> 계산기
                        </div>
                        <ListItemSuffix>
                            <img className='h-4 col-span-1 object-fill' src='/images/icons8-calculator.gif' />
                        </ListItemSuffix>
                    </ListItem>
                    <div className="w-auto m-1 h-auto mb-1">
                        <form className="flex flex-col gap-2 m-4">
                            <div className='flex justify-between mb-1'>
                                <div className='text-lg underline decoration-4 decoration-yellow-500'>{'최종 수입금:'}</div>
                                <div className='text-2xl text-right underline decoration-4 decoration-yellow-500'>{' ' + result.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + ' 원'}</div>
                            </div>
                            <div className='flex'>
                                <Input color="black" label="투자 시작 금액: (원)" type='number' onChange={(e) => { removeLeftZero(e); setInvestmentAmount(Number(e.target.value)); }} value={Number(investmentAmount) * 1} crossOrigin={undefined} />
                                {!!investmentAmount ? <Button className="py-0" variant="outlined" onClick={() => setInvestmentAmount(Number(0) * 1)} >CLEAR</Button> : <></>}
                            </div>
                            <div className='flex'>
                                <Input color="black" label="투자 기간: (년)" type='number' onChange={(e) => { removeLeftZero(e); setNumberOfYears(Number(e.target.value)); }} value={numberOfYears} crossOrigin={undefined} />
                                {!!numberOfYears ? <Button className="py-0" variant="outlined" onClick={() => setNumberOfYears(0)}>CLEAR</Button> : <></>}
                            </div>
                            <div className='flex'>
                                <Input color="black" label="연간 이자율 (%)" type='number' onChange={(e) => { removeLeftZero(e); setInterestRate(Number(e.target.value)); }} value={interestRate} crossOrigin={undefined} />
                                {!!interestRate ? <Button className="py-0" variant="outlined" onClick={() => setInterestRate(0)}>CLEAR</Button> : <></>}
                            </div>
                            <Select disabled color="blue" label="복리" value='3' onChange={(value) => { setCompunding(Number(value)) }}
                                animate={{
                                    mount: { y: 0 },
                                    unmount: { y: 25 },
                                }}>
                                <Option value='1'>Daily (360/Yr)</Option>
                                <Option value='2'>Daily (365/Yr)</Option>
                                <Option value='3'>복리: Monthly (12/Yr)</Option>
                                <Option value='4'>Quarterly (4/Yr)</Option>
                                <Option value='5'>Annually (1/Yr)</Option>
                            </Select>
                            <div className='flex'>
                                <Input color="black" label="추가 납입금" type='number' onChange={(e) => { removeLeftZero(e); setContributions(Number(e.target.value)); }} value={contributions} crossOrigin={undefined} />
                                {!!contributions ? <Button className="py-0" variant="outlined" onClick={() => setContributions(0)}>CLEAR</Button> : <></>}
                            </div>
                            <Select disabled color="blue" label="추가 납입금 납입 빈도" value='4' onChange={(value) => { setFrequency(Number(value)) }}
                                animate={{
                                    mount: { y: 0 },
                                    unmount: { y: 25 },
                                }} >
                                <Option value='1'>Weekly</Option>
                                <Option value='2'>Bi-Weekly</Option>
                                <Option value='3'>Semi-Monthly</Option>
                                <Option value='4'>추가 납입금 납입 빈도: Monthly</Option>
                                <Option value='5'>Quarterly</Option>
                                <Option value='6'>Semi-Annually</Option>
                                <Option value='7'>Annually</Option>
                            </Select>
                            <div className='flex'>
                                <Input color="black" label="물가상승률 (%)" type='number' onChange={(e) => { removeLeftZero(e); setAnnualInflationRate(Number(e.target.value)); }} value={annualInflationRate} crossOrigin={undefined} />
                                {!!annualInflationRate ? <Button className="py-0" variant="outlined" onClick={() => setAnnualInflationRate(0)}>CLEAR</Button> : <></>}
                            </div>
                            <div className="flex">
                                <Button className="w-36" color="green" variant="outlined" onClick={handleCalculateSampleData}>
                                    <div>(계산 예)</div>
                                    {/* <div>(예시) 시작 금액: {investmentAmount}원, 투자 기간: {numberOfYears}년</div> */}
                                    {/* <div>이자율: {interestRate}%, 추납금: {contributions}원, 물가 상승률: {annualInflationRate}% </div> */}
                                </Button>
                                <div className="w-full grid grid-cols-1">
                                    <Button variant="outlined" onClick={handleClear}>Clear All</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div className='w-screen flex justify-between items-center p-4 sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
                <div className="w-full h-full rounded-xl bg-white text-gray-700 border border-gray-300 shadow-md">
                    <ListItem className='text-black pb-0 mb-1'>
                        <div className="w-full font-mono text-md header-contents text-center">
                            인플레이션 계산 <span className='bg-yellow-500'> 결과 </span>
                        </div>
                        <ListItemSuffix>
                            <img className='h-4 col-span-1 object-fill' src='/images/icons8-calculator.gif' />
                        </ListItemSuffix>
                    </ListItem>

                </div>
            </div>
        </div>
    );
}