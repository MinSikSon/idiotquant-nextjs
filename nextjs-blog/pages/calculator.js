// code 출처 : https://reactjsexample.com/a-simple-calculator-app-built-using-tailwind-css-and-react-js/
import Head from "next/head";
import Link from "next/link";
import Script from "next/script.js";
import React from "react";

import { Input, Select, Option, Button } from "@material-tailwind/react";

export default function Calculator() {
    const [date, setDate] = React.useState(new Date());

    React.useEffect(() => {
        setInterval(() => { setDate(new Date()); }, 1000);
    }, []);

    React.useEffect(() => {
        handleCalculate();
    });

    const Left = (props) => {
        return (
            <Link href="/">
                <svg className="w-7 h-7 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </Link>
        );
    }

    const Title = () => {
        return (
            <div className="font-serif text-xl header-contents text-center">
                Investment<span className='bg-yellow-500'> Inflation </span>Calculator
            </div>
        );
    };

    const ClearButton = (props) => {
        return <Button className='rounded-lg text-black bg-yellow-100' color="yellow" onClick={props.handleClick}>CLEAR</Button>
    }

    const [investmentAmount, setInvestmentAmount] = React.useState(500000);
    const [numberOfYears, setNumberOfYears] = React.useState(3);
    const [interestRate, setInterestRate] = React.useState(27);
    const [compunding, setCompunding] = React.useState('');
    const [contributions, setContributions] = React.useState(50000);
    const [frequency, setFrequency] = React.useState('');
    const [annualInflationRate, setAnnualInflationRate] = React.useState(3);
    const [result, setResult] = React.useState('');

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

        const totalValue = Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 });
        setResult(totalValue);
    }

    function handleClear() {
        setInvestmentAmount('');
        setNumberOfYears('');
        setInterestRate('');
        setCompunding('');
        setContributions('');
        setFrequency('');
        setAnnualInflationRate('');

        setResult('');
    }

    return (
        <div>
            <Head>
                <title>투자 계산기</title>
                <link rel="icon" href="/images/profile.jpeg" />
            </Head>
            <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
                crossorigin="anonymous"
                strategy="lazyOnload"
                onLoad={() =>
                    console.log(`script loaded correctly, window.FB has been populated`)
                }
            />
            <div className='grid grid-cols-8 py-2'>
                <div className='col-span-1 pl-2'>
                    <Left />
                </div>
                <div className='col-span-6 self-center text-center'>
                    <Title />
                </div>
                <div className='col-span-1 self-center text-right pr-2'>
                </div>
            </div>

            <div className="bg-gray-200 w-screen h-screen flex justify-center items-center">

                <div className="w-full h-full bg-gray-50 rounded-2xl shadow-xl border-4 border-gray-100">
                    <div className="w-auto m-1 h-auto mb-2">
                        <form className="flex flex-col gap-2 m-8">
                            <div className='flex'>
                                <Input color="black" label="투자 시작 금액: (원)" type='number' onChange={(e) => { setInvestmentAmount(e.target.value) }} value={investmentAmount} />
                                {investmentAmount && <ClearButton handleClick={() => setInvestmentAmount('')} />}
                            </div>
                            <div className='flex'>
                                <Input color="black" label="투자 기간: (년)" type='number' onChange={(e) => { setNumberOfYears(e.target.value) }} value={numberOfYears} />
                                {numberOfYears && <ClearButton handleClick={() => setNumberOfYears('')} />}
                            </div>
                            <div className='flex'>
                                <Input color="black" label="연간 이자율 (%)" type='number' onChange={(e) => { setInterestRate(e.target.value) }} value={interestRate} />
                                {interestRate && <ClearButton handleClick={() => setInterestRate('')} />}
                            </div>
                            <Select disabled color="blue" label="복리" value='3' onChange={(value) => { setCompunding(value) }}
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
                                <Input color="black" label="추가 납입금" type='number' onChange={(e) => { setContributions(e.target.value) }} value={contributions} />
                                {contributions && <ClearButton handleClick={() => setContributions('')} />}
                            </div>
                            <Select disabled color="blue" label="추가 납입금 납입 빈도" value='4' onChange={(value) => { setFrequency(value) }}
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
                                <Input color="black" label="물가상승률 (%)" type='number' onChange={(e) => { setAnnualInflationRate(e.target.value) }} value={annualInflationRate} />
                                {annualInflationRate && <ClearButton handleClick={() => setAnnualInflationRate('')} />}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Button color="gray" onClick={handleClear}>Clear</Button>
                                <Button color="yellow" onClick={handleCalculate}>Calculate</Button>
                            </div>
                            <Button color="green" variant="outlined" onClick={handleCalculateSampleData}>
                                <div>(예시) 시작금액: 5000 만원, 투자기간: 12년</div>
                                <div>이자율: 25%, 추납금: 200 만원, 물가 상승률: 1% </div>
                            </Button>

                            <div className='grid grid-rows-8'>
                                <div className='rows-span-1 text-2xl underline decoration-4 decoration-yellow-500'>{'최종 수입금: ' + result + ' 원'}</div>
                                <div className='rows-span-1'>{'투자 시작 금액: ' + Number(investmentAmount).toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + ' 원'}</div>
                                <div className='rows-span-1'>{'투자 기간: ' + numberOfYears + ' 년'}</div>
                                <div className='rows-span-1'>{'연간 이자율: ' + interestRate + ' %'}</div>
                                <div className='rows-span-1'>{'복리: ' + compunding + ' '}</div>
                                <div className='rows-span-1'>{'추가 납입금: ' + Number(contributions).toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + ' 원'}</div>
                                <div className='rows-span-1'>{'물가 상승률: ' + annualInflationRate + ' %'}</div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}