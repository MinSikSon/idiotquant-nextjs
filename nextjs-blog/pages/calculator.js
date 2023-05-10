// code 출처 : https://reactjsexample.com/a-simple-calculator-app-built-using-tailwind-css-and-react-js/
import Head from "next/head";
import Link from "next/link";
import React from "react";

import { Input, Select, Option, Button } from "@material-tailwind/react";

export default function Calculator() {
    const [date, setDate] = React.useState(new Date());
    // const [number, setNumber] = React.useState('45 + (1250 x 100) / 100');
    const [number, setNumber] = React.useState('45 + (1250 x 100) / 100');
    const [sum, setSum] = React.useState('12,545');

    React.useEffect(() => {
        setInterval(() => { setDate(new Date()); }, 1000);
    }, []);

    // React.useEffect(() => {
    //     console.log(`investmentAmount`, investmentAmount);
    // });

    function handleOnClick(e) {
        console.log(`handleOnClick`, e);
        // console.log(`e.target.innerHTML`, e.target.innerHTML);
    }

    const Left = (props) => {
        return (
            <Link href="/">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7 text-black">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </Link>
        );
    }

    const Title = () => {
        return (
            <div className="font-serif text-lg header-contents text-center">
                Investment <span className='text-teal-500'>Inflation</span> Calculator
            </div>
        );
    };

    function addZeroPad(time) {
        return String(time).padStart(2, '0');
    }

    const Timer = (props) => {
        return (
            <div className="text-sm">
                {addZeroPad(date.getHours()) + ":" + addZeroPad(date.getMinutes()) + ":" + addZeroPad(date.getSeconds())}
            </div>
        )
    }

    const [investmentAmount, setInvestmentAmount] = React.useState('');
    const [numberOfYears, setNumberOfYears] = React.useState('');
    const [interestRate, setInterestRate] = React.useState('');
    const [compunding, setCompunding] = React.useState('');
    const [contributions, setContributions] = React.useState('');
    const [frequency, setFrequency] = React.useState('');
    const [annualInflationRate, setAnnualInflationRate] = React.useState('');
    const [result, setResult] = React.useState('');

    function handleCalculate() {
        console.log(`투자 시작 금액: (원) investmentAmount`, investmentAmount);
        console.log(`투자 기간: (년) numberOfYears`, numberOfYears);
        console.log(`연간 이자율 interestRate`, interestRate);
        console.log(`복리 compunding`, compunding);
        console.log(`추가 납입금 contributions`, contributions);
        console.log(`추가 납입금 납입 빈도 frequency`, frequency);
        console.log(`물가상승률 (%) annualInflationRate`, annualInflationRate);

        console.log(`result`, result);

        const totalValue = investmentAmount * numberOfYears * (1 + interestRate / 100) + compunding;
        setResult(`최종 수익금: ` + totalValue + ` 원`);
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
        // <div onClick={handleOnClick}>
        <div>
            <Head>
                <title>투자 계산기</title>
                <link rel="icon" href="/images/profile.jpeg" />
            </Head>
            <div className='grid grid-cols-2'>
                <div className='col-span-1'>
                    <Left />
                </div>

                <div className='col-span-1 self-center text-right pr-2'>
                    <Timer />
                </div>
            </div>

            <div className="bg-gray-200 w-screen h-screen flex justify-center items-center">

                <div className="w-full h-full bg-gray-50 rounded-2xl shadow-xl border-4 border-gray-100">
                    <div className="w-auto m-1 h-auto mb-2">
                        <form className="flex flex-col gap-4 m-10">
                            <div className='col-span-4 self-center'>
                                <Title />
                            </div>
                            <Input color="teal" size="lg" label="투자 시작 금액: (원)" type='number' onChange={(e) => { setInvestmentAmount(e.target.value) }} value={investmentAmount} />
                            <Input color="teal" label="투자 기간: (년)" type='number' onChange={(e) => { setNumberOfYears(e.target.value) }} value={numberOfYears} />

                            <Input color="teal" label="연간 이자율" type='number' onChange={(e) => { setInterestRate(e.target.value) }} value={interestRate} />
                            <Select color="teal" label="복리" onChange={(value) => { setCompunding(value) }}>
                                <Option value='1'>Daily (360/Yr)</Option>
                                <Option value='2'>Daily (365/Yr)</Option>
                                <Option value='3'>Monthly (12/Yr)</Option>
                                <Option value='4'>Quarterly (4/Yr)</Option>
                                <Option value='5'>Annually (1/Yr)</Option>
                            </Select>
                            <Input color="teal" label="추가 납입금" type='number' onChange={(e) => { setContributions(e.target.value) }} value={contributions} />
                            <Select color="teal" label="추가 납입금 납입 빈도" onChange={(value) => { setFrequency(value) }} >
                                <Option value='1'>Weekly</Option>
                                <Option value='2'>Bi-Weekly</Option>
                                <Option value='3'>Semi-Monthly</Option>
                                <Option value='4'>Monthly</Option>
                                <Option value='5'>Quarterly</Option>
                                <Option value='6'>Semi-Annually</Option>
                                <Option value='7'>Annually</Option>
                            </Select>
                            <Input color="teal" label="물가상승률 (%)" type='number' onChange={(e) => { setAnnualInflationRate(e.target.value) }} value={annualInflationRate} />
                            <div className="grid grid-cols-2 gap-4">
                                <Button color="red" onClick={handleClear}>Clear</Button>
                                <Button color="teal" onClick={handleCalculate}>Calculate</Button>
                            </div>
                            <div>
                                {result}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}