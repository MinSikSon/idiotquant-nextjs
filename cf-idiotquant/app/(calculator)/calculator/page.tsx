"use client"

// code 출처 : https://reactjsexample.com/a-simple-calculator-app-built-using-tailwind-css-and-react-js/
import Head from "next/head";
import Link from "next/link";
import Script from "next/script.js";
import React from "react";

import { Input, Select, Option, Button, ListItem, ListItemPrefix, ListItemSuffix } from "@material-tailwind/react";

import { HomeIcon } from "@heroicons/react/24/outline";

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
        setInvestmentAmount(50000000);
        setNumberOfYears(12);
        setInterestRate(25);
        // setCompunding('');
        setContributions(2000000);
        // setFrequency('');
        setAnnualInflationRate(1);
    }

    function handleCalculate() {
        let value = Number(investmentAmount);
        const loop = (numberOfYears < 0) ? 0 : numberOfYears * 12;
        const monthlyInterestRate = interestRate / 12;
        const monthlyInflationRate = annualInflationRate / 12;
        for (let month = 0; month < loop; month++) {
            value = value * (1 + (monthlyInterestRate - monthlyInflationRate) / 100);
            value += (Number(contributions));
        }

        const totalValue: number = Number(value.toFixed(0));
        setResult(totalValue);
    }

    function handleClear() {
        setInvestmentAmount(0);
        setNumberOfYears(0);
        setInterestRate(0);
        // setCompunding(0);
        setContributions(0);
        setFrequency(0);
        setAnnualInflationRate(0);

        setResult(0);
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
                    <ListItem className='text-black'>
                        {/* <ListItemPrefix>
                    <Link href="/">
                        <HomeIcon strokeWidth={2} className="h-6 w-6" />
                    </Link>
                </ListItemPrefix> */}
                        <div className="w-full font-mono text-xl header-contents text-center">
                            <span className='bg-yellow-500'> 인플레이션 </span> 계산기
                        </div>
                        <ListItemSuffix>
                            <img className='h-7 col-span-1 object-fill' src='/images/icons8-calculator.gif' />
                        </ListItemSuffix>
                    </ListItem>
                    <div className="w-auto m-1 h-auto mb-2">
                        <form className="flex flex-col gap-2 m-4 mt-1">
                            <div className='flex justify-between mb-4'>
                                <div className='text-lg underline decoration-4 decoration-yellow-500'>{'최종 수입금:'}</div>
                                <div className='text-2xl text-right underline decoration-4 decoration-yellow-500'>{' ' + result.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + ' 원'}</div>
                            </div>
                            <div className='flex'>
                                <Input color="black" label="투자 시작 금액: (원)" type='number' onChange={(e) => { setInvestmentAmount(Number(e.target.value)) }} value={Number(investmentAmount)} />
                                {!!investmentAmount ? <Button variant="outlined" onClick={() => setInvestmentAmount(0)} >CLEAR</Button> : <></>}
                            </div>
                            <div className='flex'>
                                <Input color="black" label="투자 기간: (년)" type='number' onChange={(e) => { setNumberOfYears(Number(e.target.value)) }} value={numberOfYears} />
                                {!!numberOfYears ? <Button variant="outlined" onClick={() => setNumberOfYears(0)}>CLEAR</Button> : <></>}
                            </div>
                            <div className='flex'>
                                <Input color="black" label="연간 이자율 (%)" type='number' onChange={(e) => { setInterestRate(Number(e.target.value)) }} value={interestRate} />
                                {!!interestRate ? <Button variant="outlined" onClick={() => setInterestRate(0)}>CLEAR</Button> : <></>}
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
                                <Input color="black" label="추가 납입금" type='number' onChange={(e) => { setContributions(Number(e.target.value)) }} value={contributions} />
                                {!!contributions ? <Button variant="outlined" onClick={() => setContributions(0)}>CLEAR</Button> : <></>}
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
                                <Input color="black" label="물가상승률 (%)" type='number' onChange={(e) => { setAnnualInflationRate(Number(e.target.value)) }} value={annualInflationRate} />
                                {!!annualInflationRate ? <Button variant="outlined" onClick={() => setAnnualInflationRate(0)}>CLEAR</Button> : <></>}
                            </div>
                            <div className="grid grid-cols-1">
                                <Button variant="outlined" onClick={handleClear}>Clear All</Button>
                                {/* <Button color="yellow" onClick={handleCalculate}>Calculate</Button> */}
                            </div>
                            <Button color="green" variant="outlined" onClick={handleCalculateSampleData}>
                                <div>(예시) 시작금액: 5000 만원, 투자기간: 12년</div>
                                <div>이자율: 25%, 추납금: 200 만원, 물가 상승률: 1% </div>
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}