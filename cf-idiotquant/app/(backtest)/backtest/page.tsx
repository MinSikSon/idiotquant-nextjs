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

import { reqGetFinancialInfoWithMarketInfo } from "@/lib/features/backtest/backtestSlice";

import React from "react";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { Util } from "@/components/util";

export default function BackTest() {
    const dispatch = useAppDispatch();

    const backTestConditionType1 = useAppSelector(getBackTestConditionType1);
    const backTestConditionType2 = useAppSelector(getBackTestConditionType2);
    const backTestConditionType3 = useAppSelector(getBackTestConditionType3);
    const backTestConditionFinancialInfoList = useAppSelector(getBackTestConditionFinancialInfoList);
    const backTestConditionFilterResultType: BackTestConditionFilterResultType = useAppSelector(getBackTestConditionFilterResultType);

    const totalProfit = React.useRef(0);
    const [totalProfitState, setTotalProfitState] = React.useState(0);

    const getTitle = () => {
        return "back-test"
    };

    const getSubTitle = () => {
        return "전략에 따른 수익을 확인해보세요."
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
        // console.log(`backTestConditionType1`, backTestConditionType1);
    }, [backTestConditionType1]);
    React.useEffect(() => {
        // console.log(`backTestConditionType2`, backTestConditionType2);
    }, [backTestConditionType2]);
    React.useEffect(() => {
        // console.log(`backTestConditionType3`, backTestConditionType3);
    }, [backTestConditionType3]);
    React.useEffect(() => {
        // console.log(`backTestConditionFinancialInfoList`, backTestConditionFinancialInfoList);
        const output2 = backTestConditionFinancialInfoList.output2;
        const transformedData = output2.filter(item => item.endsWith("12"));
        // console.log(`transformedData`, transformedData);

        const output1 = backTestConditionFinancialInfoList.output1;

        // if ("init" == backTestConditionFinancialInfoList.state && output1.length > 0) 
        if (output1.length > 0) {
            // const match = output1[0].match(/_(\d{4})_(\d)Q/); // 처음 값만 사용해서 요청
            // console.log(`match`, match);
            // dispatch(reqGetFinancialInfo({ year: match[1], quarter: match[2] })); // 요청 결과는 backTestConditionFilterResultType 에 갱신 됨.
            dispatch(setBackTestConditionFilterResultType({ ...backTestConditionFilterResultType, startDate: backTestConditionType2.startDate, endDate: backTestConditionType3.endDate, state: "loading" }));
        }
    }, [backTestConditionFinancialInfoList]);
    React.useEffect(() => {
        console.log(`backTestConditionFilterResultType`, backTestConditionFilterResultType);

        const output2 = backTestConditionFinancialInfoList.output2;
        // console.log(`output2`, output2);
        if ("loading" == backTestConditionFilterResultType.state && output2.length > 0) {
            const formatDate = (dateStr: string): string => {
                if (dateStr.length !== 6) {
                    throw new Error("Invalid date format");
                }

                const year = dateStr.slice(0, 4);  // "2017"
                const month = dateStr.slice(4, 6); // "12"

                return `${year}-${month}-01`; // "2017-12-01"
            };

            const yearQuarterList = backTestConditionFilterResultType.output;
            // console.log(`yearQuarterList`, yearQuarterList);

            const startDate = backTestConditionFilterResultType.startDate;
            const endDate = backTestConditionFilterResultType.endDate;
            let isDone = true;
            for (let i = 0; i < output2.length; ++i) {
                const YYYYMMDD = formatDate(output2[i]); // YYYY-MM-DD
                // console.log(new Date(startDate), new Date(endDate), new Date(YYYYMMDD));
                // console.log(new Date(startDate) <= new Date(YYYYMMDD), new Date(endDate) >= new Date(YYYYMMDD));
                if (false == (new Date(startDate) <= new Date(YYYYMMDD))) {
                    continue;
                }
                if (false == (new Date(endDate) >= new Date(YYYYMMDD))) {
                    continue;
                }

                // console.log(`yearQuarterList[output2[${i}]]`, yearQuarterList[output2[i]], `output2[${i}]`, output2[i]);
                if (undefined == yearQuarterList[output2[i]]) {
                    const output1 = backTestConditionFinancialInfoList.output1;
                    // console.log(`output1`, output1);
                    const match = output1[i].match(/_(\d{4})_(\d)Q/); // 처음 값만 사용해서 요청
                    // console.log(`match`, match);
                    dispatch(reqGetFinancialInfoWithMarketInfo({ year: match[1], quarter: match[2] })); // 요청 결과는 backTestConditionFilterResultType 에 갱신 됨.

                    isDone = false;
                    break;
                }
            }

            if (true == isDone) {
                // console.log(`output1.length`, output1.length, `isDone`, isDone);
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
            // console.log(`[handleOnClick] dispatch(reqGetFinancialInfoList())`);
            totalProfit.current = 0;
            dispatch(reqGetFinancialInfoList());
            dispatch(setBackTestConditionFilterResultType({ ...backTestConditionFilterResultType, state: "init", output: {} }));
        }

        return <>
            {
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <Link href={`/`}>
                            <Button color="red" size="sm" variant="outlined">
                                취소
                            </Button>
                        </Link>
                        <Button className="hover:text-blue-500 hover:border-blue-500" disabled={"loading" == backTestConditionFilterResultType.state ? true : false} loading={"loading" == backTestConditionFilterResultType.state ? true : false} color={`black`} onClick={() => handleOnClick()} size="sm" variant="outlined">
                            {"loading" == backTestConditionFilterResultType.state ? "등록 중" : "등록"}
                        </Button>
                    </div>
                </div>
            }
        </>
    };

    const formatDate = (dateStr: string): string => {
        if (dateStr.length !== 6) {
            // throw new Error("Invalid date format");
            return "";
        }

        const year = dateStr.slice(0, 4);  // "2017"
        const month = dateStr.slice(4, 6); // "12"

        const quarterMap: any = { "03": "1", "06": "2", "09": "3", "12": "4" };

        return `${year}년 ${quarterMap[month]}분기`;
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
            <div className="w-full">
                <Timeline>
                    <>
                        <Typography color="blue-gray" className="text-lg font-bold leading-none pb-4">
                            최종수익금: {totalProfit.current}원
                        </Typography>
                        {Object.keys(backTestConditionFilterResultType.output).map((date: any, index1: any) => {
                            let prevDate = ""
                            if (index1 >= 1) {
                                prevDate = Object.keys(backTestConditionFilterResultType.output)[index1 - 1];
                            }
                            console.log(`index1`, index1, `date`, date, `prevDate`, prevDate);
                            console.log(`backTestConditionFilterResultType`, backTestConditionFilterResultType);

                            return <TimelineItem key={index1}>
                                <TimelineConnector />
                                <TimelineHeader className="h-3">
                                    <TimelineIcon className="p-0" variant="ghost" color="green" >
                                        <CurrencyDollarIcon className="h-4 w-4" />
                                    </TimelineIcon>
                                    <Typography color="blue-gray" className="text-base font-bold leading-none">
                                        {formatDate(date)}
                                    </Typography>
                                </TimelineHeader>
                                <TimelineBody className="pb-8">
                                    <Typography color="blue-gray" className="text-base font-bold leading-none">
                                        - {formatDate(prevDate)} 종목 일괄 매도
                                        <>
                                            {index1 >= 1 ? Object.keys(backTestConditionFilterResultType.output3[prevDate]).map((stockName: any, index2: any) => {
                                                const filteredStockInfo = backTestConditionFilterResultType.output2[prevDate]["data"][stockName];
                                                const filteredStockInfoFinancial = backTestConditionFilterResultType.output3[prevDate][stockName];
                                                // if (!!!filteredStockInfo) {
                                                //     console.log(`stockName`, stockName);
                                                //     console.log(`filteredStockInfo`, filteredStockInfo);
                                                //     console.log(`prevDate`, prevDate, `date`, date);
                                                //     console.log(`backTestConditionFilterResultType.output2[prevDate]["data"]`, backTestConditionFilterResultType.output2[prevDate]["data"]);
                                                // }
                                                const currentFilteredStockInfo = backTestConditionFilterResultType.output2[date]["data"][stockName];
                                                // if (!!!currentFilteredStockInfo) {
                                                //     console.log(`currentFilteredStockInfo`, currentFilteredStockInfo);
                                                // console.log(`prevDate`,prevDate,`date`, date);
                                                //     console.log(`backTestConditionFilterResultType.output2[date]["data"]`, backTestConditionFilterResultType.output2[date]["data"]);
                                                // }
                                                // !!currentFilteredStockInfo <- 상장폐지? 또는 종목명 변경
                                                const profit = (!!currentFilteredStockInfo && !!filteredStockInfo) ? Number(((Number(currentFilteredStockInfo["시가총액"]) / Number(filteredStockInfo["시가총액"]) * Number(filteredStockInfo["시가"])) - Number(filteredStockInfo["시가"])).toFixed(0)) : (!!filteredStockInfo ? -Number(filteredStockInfo["시가"]) : 0);
                                                totalProfit.current += profit;
                                                // console.log(`currentFilteredStockInfo`, currentFilteredStockInfo);
                                                return <>
                                                    {!!filteredStockInfo ?
                                                        <Typography key={index2} color="gray" className="font-normal text-xs text-gray-600">
                                                            [{stockName}] <span className={`${profit >= 0 ? "text-red-500" : "text-blue-500"} ${!!currentFilteredStockInfo ? "" : "text-purple-500"}`}>수익:{profit}</span>
                                                            시가:{Number(filteredStockInfo["시가"]).toFixed(0)} 원,
                                                            유동자산:{Util.UnitConversion(filteredStockInfoFinancial["유동자산"], true)}, 부채총계:{Util.UnitConversion(filteredStockInfoFinancial["부채총계"], true)}
                                                        </Typography>
                                                        : <></>}
                                                </>
                                            }) : <>
                                                <Typography key={index1} color="gray" className="font-normal text-xs text-gray-600">
                                                    없음
                                                </Typography>
                                            </>}
                                        </>
                                    </Typography>
                                    <Typography color="blue-gray" className="text-base font-bold leading-none">
                                        - {formatDate(date)} 매수
                                    </Typography>
                                    <>
                                        {!!backTestConditionFilterResultType.output3[date] ? Object.keys(backTestConditionFilterResultType.output3[date]).map((stockName: any, index2: any) => {
                                            const filteredStockInfo = backTestConditionFilterResultType.output3[date][stockName];
                                            return <>
                                                {!!filteredStockInfo ?
                                                    <Typography key={index2} color="gray" className="font-normal text-xs text-gray-600">
                                                        [{stockName}] 시가:{Number(filteredStockInfo["시가"]).toFixed(0)} 원,
                                                        유동자산:{Util.UnitConversion(filteredStockInfo["유동자산"], true)},
                                                        부채총계:{Util.UnitConversion(filteredStockInfo["부채총계"], true)}
                                                    </Typography>
                                                    : <></>}
                                            </>
                                        })
                                            :
                                            <></>
                                        }
                                    </>
                                </TimelineBody>
                            </TimelineItem>
                        })}
                    </>
                </Timeline>
            </div>
        </div>
    </>
}
