"use client"

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, ButtonGroup, Input } from "@material-tailwind/react";
import RegisterTemplate from "@/components/register_template";
import Link from "next/link";

import {
    Timeline,
    TimelineItem,
    TimelineConnector,
    TimelineHeader,
    TimelineIcon,
    TimelineBody,
    Typography,
} from "@material-tailwind/react";
import { setBackTestConditionType1, getBackTestConditionType1 } from "@/lib/features/backtest/backtestSlice";
import { setBackTestConditionType2, getBackTestConditionType2 } from "@/lib/features/backtest/backtestSlice";
import { setBackTestConditionType3, getBackTestConditionType3 } from "@/lib/features/backtest/backtestSlice";
import { reqGetFinancialInfoList, getBackTestConditionFinancialInfoList } from "@/lib/features/backtest/backtestSlice";

import React from "react";

export default function BackTest() {
    const dispatch = useAppDispatch();

    const backTestConditionType1 = useAppSelector(getBackTestConditionType1);
    const backTestConditionType2 = useAppSelector(getBackTestConditionType2);
    const backTestConditionType3 = useAppSelector(getBackTestConditionType3);
    const backTestConditionFinancialInfoList = useAppSelector(getBackTestConditionFinancialInfoList);

    const getTitle = () => {
        return "back test"
    };

    const getSubTitle = () => {
        return "back test gogo"
    };

    const getStepContents = (title: string, list: any[], selectValue: any, handleOnClick: any) => {
        return <div className="flex flex-col">
            <div className="flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500">
                <div>{title}</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {list.map((item, key) => <Button key={key} className={selectValue == item ? `bg-blue-500 text-white` : ``} onClick={() => handleOnClick(item)}>{`${item}`}</Button>)}
                </ButtonGroup>
            </div>
        </div>
    };

    const getDateContents = (title: string, selectValue: any, handleOnChange: any) => {
        return <div className="flex flex-col">
            <div className="flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500">
                <Input
                    className=""
                    color="black"
                    label={title}
                    type="date"
                    value={selectValue} crossOrigin={undefined}
                    onChange={(e) => handleOnChange(e.currentTarget.value)}
                    min="2004-04-01"
                    max="2024-04-01"
                />
            </div>
        </div>
    };

    React.useEffect(() => {
        console.log(`backTestConditionType1`, backTestConditionType1);
    }, [backTestConditionType1]);
    React.useEffect(() => {
        console.log(`backTestConditionType2`, backTestConditionType2);
    }, [backTestConditionType2]);
    React.useEffect(() => {
        console.log(`backTestConditionType3`, backTestConditionType3);
    }, [backTestConditionType3]);
    React.useEffect(() => {
        console.log(`backTestConditionFinancialInfoList`, backTestConditionFinancialInfoList);

        const output2 = backTestConditionFinancialInfoList.output2;
        const transformedData = output2.filter(item => item.endsWith("12"));
        console.log(`transformedData`, transformedData);

    }, [backTestConditionFinancialInfoList]);

    const getContents = () => {
        return <>
            {getStepContents(backTestConditionType1.title, backTestConditionType1.strategyList, backTestConditionType1.strategy, (item: string) => { dispatch(setBackTestConditionType1({ ...backTestConditionType1, strategy: item })); })}
            {getDateContents(backTestConditionType2.title, backTestConditionType2.startDate, (item: any) => { dispatch(setBackTestConditionType2({ ...backTestConditionType2, startDate: item })); })}
            {getDateContents(backTestConditionType3.title, backTestConditionType3.endDate, (item: any) => { dispatch(setBackTestConditionType3({ ...backTestConditionType3, endDate: item })); })}
        </>
    };

    const getFooter = () => {
        const handleOnClick = () => {
            console.log(`[handleOnClick] dispatch(reqGetFinancialInfoList())`);
            dispatch(reqGetFinancialInfoList());
        }

        return <>
            {
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <Link href={`/`}>
                            <Button color="red" size="sm" variant="outlined">
                                {/* prev */}
                                취소
                            </Button>
                        </Link>
                        {/* <Link href={`/`}> */}
                        <Button className="hover:text-blue-500 hover:border-blue-500" color={`black`} onClick={() => handleOnClick()} size="sm" variant="outlined">
                            등록
                        </Button>
                        {/* </Link> */}
                    </div>
                </div>
            }
        </>
    };

    // 1. 특정 날짜 기준으로 종목 뽑기
    // - strategy-register 참고
    // 2. 해당 종목을 팔기
    // - 현재 가격으로 비교
    // { getStepContents("전략", ["test"], "test", (item: any) => { dispatch(setDefaultStrategy(item)); }) }
    return <>
        <RegisterTemplate
            cardBodyFix={true}
            title={getTitle()}
            subTitle={getSubTitle()}
            content={getContents()}
            footer={getFooter()}
        />
        <div className="p-2 m-2 border rounded">
            <DefaultTimeline />
        </div>
    </>
}

const DefaultTimeline = () => {
    return (
        // <div className="w-[32rem]">
        <div className="w-full">
            <Timeline>
                <TimelineItem>
                    <TimelineConnector />
                    <TimelineHeader className="h-3">
                        <TimelineIcon />
                        <Typography variant="h6" color="blue-gray" className="leading-none">
                            Timeline Title Here.
                        </Typography>
                    </TimelineHeader>
                    {/* <TimelineBody className="w-8/12 sm:w-9/12 lg:w-11/12 xl:w-full pb-8"> */}
                    <TimelineBody className="pb-8">
                        <Typography variant="small" color="gray" className="font-normal text-gray-600">
                            The key to more success is to have a lot of pillows. Put it this way, it took me
                            twenty five years to get these plants, twenty five years of blood sweat and tears, and
                            I&apos;m never giving up, I&apos;m just getting started. I&apos;m up to something. Fan
                            luv.
                        </Typography>
                    </TimelineBody>
                </TimelineItem>
                <TimelineItem>
                    <TimelineConnector />
                    <TimelineHeader className="h-3">
                        <TimelineIcon />
                        <Typography variant="h6" color="blue-gray" className="leading-none">
                            Timeline Title Here.
                        </Typography>
                    </TimelineHeader>
                    <TimelineBody className="pb-8">
                        <Typography variant="small" color="gray" className="font-normal text-gray-600">
                            The key to more success is to have a lot of pillows. Put it this way, it took me
                            twenty five years to get these plants, twenty five years of blood sweat and tears, and
                            I&apos;m never giving up, I&apos;m just getting started. I&apos;m up to something. Fan
                            luv.
                        </Typography>
                    </TimelineBody>
                </TimelineItem>
                <TimelineItem>
                    <TimelineHeader className="h-3">
                        <TimelineIcon />
                        <Typography variant="h6" color="blue-gray" className="leading-none">
                            Timeline Title Here.
                        </Typography>
                    </TimelineHeader>
                    <TimelineBody>
                        <Typography variant="small" color="gray" className="font-normal text-gray-600">
                            The key to more success is to have a lot of pillows. Put it this way, it took me
                            twenty five years to get these plants, twenty five years of blood sweat and tears, and
                            I&apos;m never giving up, I&apos;m just getting started. I&apos;m up to something. Fan
                            luv.
                        </Typography>
                    </TimelineBody>
                </TimelineItem>
            </Timeline>
        </div>
    );
}