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
import { setBackTestConditionType1, getBackTestConditionType1, setBackTestConditionFilterResultType, BackTestConditionFilterResultType } from "@/lib/features/backtest/backtestSlice";
import { setBackTestConditionType2, getBackTestConditionType2 } from "@/lib/features/backtest/backtestSlice";
import { setBackTestConditionType3, getBackTestConditionType3 } from "@/lib/features/backtest/backtestSlice";
import { reqGetFinancialInfoList, getBackTestConditionFinancialInfoList } from "@/lib/features/backtest/backtestSlice";
import { getBackTestConditionFilterResultType } from "@/lib/features/backtest/backtestSlice";

import { reqGetFinancialInfo } from "@/lib/features/backtest/backtestSlice";

import React from "react";

export default function BackTest() {
    const dispatch = useAppDispatch();

    const backTestConditionType1 = useAppSelector(getBackTestConditionType1);
    const backTestConditionType2 = useAppSelector(getBackTestConditionType2);
    const backTestConditionType3 = useAppSelector(getBackTestConditionType3);
    const backTestConditionFinancialInfoList = useAppSelector(getBackTestConditionFinancialInfoList);
    const backTestConditionFilterResultType: BackTestConditionFilterResultType = useAppSelector(getBackTestConditionFilterResultType);

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

    const getDateContents = (title: string, selectValue: any, min: any, max: any, handleOnChange: any) => {
        return <div className="flex flex-col">
            <div className="flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500">
                <Input
                    className=""
                    color="black"
                    label={title}
                    type="date"
                    value={selectValue} crossOrigin={undefined}
                    onChange={(e) => handleOnChange(e.currentTarget.value)}
                    min={min}
                    max={max}
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

        const output1 = backTestConditionFinancialInfoList.output1;

        if ("init" == backTestConditionFinancialInfoList.state && output1.length > 0) {
            // const match = output1[0].match(/_(\d{4})_(\d)Q/); // 처음 값만 사용해서 요청
            // console.log(`match`, match);
            // dispatch(reqGetFinancialInfo({ year: match[1], quarter: match[2] })); // 요청 결과는 backTestConditionFilterResultType 에 갱신 됨.
            dispatch(setBackTestConditionFilterResultType({ ...backTestConditionFilterResultType, startDate: backTestConditionType2.startDate, endDate: backTestConditionType3.endDate, state: "loading" }));
        }
    }, [backTestConditionFinancialInfoList]);
    React.useEffect(() => {
        console.log(`backTestConditionFilterResultType`, backTestConditionFilterResultType);

        const output1 = backTestConditionFinancialInfoList.output1;
        console.log(`output1`, output1);
        const output2 = backTestConditionFinancialInfoList.output2;
        console.log(`output2`, output2);
        const yearQuarterList = backTestConditionFilterResultType.output;
        console.log(`yearQuarterList`, yearQuarterList);

        const startDate = backTestConditionFilterResultType.startDate;
        const endDate = backTestConditionFilterResultType.endDate;

        if (output1.length > 0) {
            console.log(`output1.length`, output1.length);
            const formatDate = (dateStr: string): string => {
                if (dateStr.length !== 6) {
                    throw new Error("Invalid date format");
                }

                const year = dateStr.slice(0, 4);  // "2017"
                const month = dateStr.slice(4, 6); // "12"

                return `${year}-${month}-01`; // "2017-12-01"
            };

            let isDone = true;
            for (let i = 0; i < output1.length; ++i) {
                const YYYYMMDD = formatDate(output2[i]); // YYYY-MM-DD
                console.log(new Date(startDate), new Date(endDate), new Date(YYYYMMDD));
                console.log(new Date(startDate) <= new Date(YYYYMMDD), new Date(endDate) >= new Date(YYYYMMDD));
                if (false == (new Date(startDate) <= new Date(YYYYMMDD))) {
                    continue;
                }
                if (false == (new Date(endDate) >= new Date(YYYYMMDD))) {
                    continue;
                }

                console.log(`yearQuarterList[output2[${i}]]`, yearQuarterList[output2[i]], `output2[${i}]`, output2[i]);
                if (undefined == yearQuarterList[output2[i]]) {
                    const match = output1[i].match(/_(\d{4})_(\d)Q/); // 처음 값만 사용해서 요청
                    console.log(`match`, match);
                    dispatch(reqGetFinancialInfo({ year: match[1], quarter: match[2] })); // 요청 결과는 backTestConditionFilterResultType 에 갱신 됨.

                    isDone = false;
                    break;
                }
            }

            if ("loading" == backTestConditionFilterResultType.state && true == isDone) {
                console.log(`output1.length`, output1.length, `isDone`, isDone);
                dispatch(setBackTestConditionFilterResultType({ ...backTestConditionFilterResultType, state: "done" }));
            }
        }
    }, [backTestConditionFilterResultType]);

    const getContents = () => {
        return <>
            {getStepContents(backTestConditionType1.title, backTestConditionType1.strategyList, backTestConditionType1.strategy, (item: string) => { dispatch(setBackTestConditionType1({ ...backTestConditionType1, strategy: item })); })}
            {getDateContents(backTestConditionType2.title, backTestConditionType2.startDate, backTestConditionType2.min, backTestConditionType2.max, (item: any) => { dispatch(setBackTestConditionType2({ ...backTestConditionType2, startDate: item })); })}
            {getDateContents(backTestConditionType3.title, backTestConditionType3.endDate, backTestConditionType3.min, backTestConditionType3.max, (item: any) => { dispatch(setBackTestConditionType3({ ...backTestConditionType3, endDate: item })); })}
        </>
    };

    const getFooter = () => {
        const handleOnClick = () => {
            console.log(`[handleOnClick] dispatch(reqGetFinancialInfoList())`);
            dispatch(setBackTestConditionFilterResultType({ ...backTestConditionFilterResultType, state: "init", output: {} }));
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
                        <Button className="hover:text-blue-500 hover:border-blue-500" disabled={"loading" == backTestConditionFilterResultType.state ? true : false} color={`black`} onClick={() => handleOnClick()} size="sm" variant="outlined">
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
            <DefaultTimeline2 backTestConditionFilterResultType={backTestConditionFilterResultType} />
        </div>
    </>
}
const DefaultTimeline2 = (props: any) => {
    return (
        // <div className="w-[32rem]">
        <div className="w-full">
            <Timeline>
                {Object.keys(props.backTestConditionFilterResultType.output).map((key: any, index: any) => {
                    console.log(`key`, key);
                    // console.log(props.backTestConditionFilterResultType.output[key]);
                    // console.log(props.backTestConditionFilterResultType.output[key]["삼성전자"]);
                    const firstValue = props.backTestConditionFilterResultType.output[key]["삼성전자"];
                    return <TimelineItem key={index}>
                        <TimelineConnector />
                        <TimelineHeader className="h-3">
                            <TimelineIcon />
                            <Typography variant="h6" color="blue-gray" className="leading-none">
                                {key}
                            </Typography>
                        </TimelineHeader>
                        <TimelineBody className="pb-6">
                            <Typography color="gray" className="font-normal text-xs text-gray-600">
                                유동자산: {firstValue["유동자산"]}, 부채총계: {firstValue["부채총계"]}
                            </Typography>
                        </TimelineBody>
                    </TimelineItem>
                })}
            </Timeline>
        </div>
    );
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