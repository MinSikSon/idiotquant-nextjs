"use client"

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, ButtonGroup, Input, Spinner } from "@material-tailwind/react";
import RegisterTemplate from "@/components/register_template";
import Link from "next/link";

import {
    Timeline,
    Typography,
} from "@material-tailwind/react";
import { setBackTestConditionType1, getBackTestConditionType1, setBackTestConditionFilterResultType, BackTestConditionFilterResultType, BackTestConditionFinancialInfoList, BackTestConditionType1, BackTestConditionType2, BackTestConditionType3 } from "@/lib/features/backtest/backtestSlice";
import { setBackTestConditionType2, getBackTestConditionType2 } from "@/lib/features/backtest/backtestSlice";
import { setBackTestConditionType3, getBackTestConditionType3 } from "@/lib/features/backtest/backtestSlice";
import { reqGetFinancialInfoList, getBackTestConditionFinancialInfoList } from "@/lib/features/backtest/backtestSlice";
import { getBackTestConditionFilterResultType } from "@/lib/features/backtest/backtestSlice";

import { reqGetFinancialInfoWithMarketInfo } from "@/lib/features/backtest/backtestSlice";

import { useState, useEffect, useRef } from "react";
import { isValidCookie, Util } from "@/components/util";


import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, KoreaInvestmentInquirePrice, getKoreaInvestmentInquirePrice, reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, reqGetBalanceSheet, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { selectLoginState } from "@/lib/features/login/loginSlice";
import Login from "@/app/(login)/login/login";
import Auth from "@/components/auth";
import { usePathname } from "next/navigation";

import { DayPicker } from "react-day-picker";
// import { NavArrowRight, NavArrowLeft } from "iconoir-react";
import { Popover } from "@material-tailwind/react";

export default function BackTest() {
    const dispatch = useAppDispatch();

    const backTestConditionType1: BackTestConditionType1 = useAppSelector(getBackTestConditionType1);
    const backTestConditionType2: BackTestConditionType2 = useAppSelector(getBackTestConditionType2);
    const backTestConditionType3: BackTestConditionType3 = useAppSelector(getBackTestConditionType3);
    const backTestConditionFinancialInfoList: BackTestConditionFinancialInfoList = useAppSelector(getBackTestConditionFinancialInfoList);
    const backTestConditionFilterResultType: BackTestConditionFilterResultType = useAppSelector(getBackTestConditionFilterResultType);

    const totalProfit = useRef(0);

    const getStepContents = (title: string, list: any[], selectValue: any, handleOnClick: any) => {
        return <div className="flex flex-col">
            <div className="flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500">
                <div>{title}</div>
                <ButtonGroup color="primary" variant="outline" size="sm">
                    {list.map((item, key) => <Button key={key} className={selectValue == item ? `bg-blue-500 text-white` : ``} onClick={() => handleOnClick(item)}>{`${item}`}</Button>)}
                </ButtonGroup>
            </div>
        </div>
    };

    const [date, setDate] = useState<Date>();
    const [validCookie, setValidCookie] = useState<any>(false);

    const getDateContents = (title: string, selectValue: any, min: any, max: any, handleOnChange: any) => {
        return <div className="flex flex-col">
            <div className="flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500">
                <Typography type="small" color="primary" className="font-mono text-[0.7rem] ml-2">
                    {title}
                </Typography>
                {/* <Input
                    color="primary"
                    type="date"
                    value={selectValue}
                    onChange={(e) => handleOnChange(e.currentTarget.value)}
                    min={min}
                    max={max}
                /> */}

                <Popover placement="bottom">
                    <Popover.Trigger>
                        <div className="w-72">
                            <Input
                                readOnly
                                onChange={(e) => handleOnChange(e.currentTarget.value)}
                                placeholder="Select a date"
                                value={selectValue}
                            />
                        </div>
                    </Popover.Trigger>
                    <Popover.Content>
                        <Popover.Arrow />
                        <DayPicker
                            mode="single"
                            selected={selectValue}
                            onSelect={(e) => {
                                // console.log(`selectValue`, selectValue);
                                // console.log(`e`, e?.toDateString());
                                // console.log(`e`, e?.toISOString().split('T')[0]);
                                console.log(`e`, e?.toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                }).replace(/\. /g, '-').replace('.', ''));
                                // .toISOString().split('T')[0]
                                handleOnChange(e?.toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                }).replace(/\. /g, '-').replace('.', ''));
                            }}
                            disabled={[
                                { before: new Date(min) },
                                { after: new Date(max) },
                            ]}
                            showOutsideDays
                            className="border-0"
                            classNames={{
                                day_hidden: "invisible",
                                nav: "flex items-center",
                                day: "h-9 w-9 p-0 ",
                                day_range_end: "day-range-end",
                                table: "w-full border-collapse",
                                nav_button_next: "absolute right-1.5",
                                nav_button_previous: "absolute left-1.5",
                                head_row: "flex font-medium text-black dark:text-white",
                                day_disabled: "text-foreground opacity-50",
                                head_cell: "m-0.5 w-9 text-sm",
                                day_today: "rounded-md bg-surface text-black dark:text-white",
                                caption_label: "text-sm font-medium text-black dark:text-white",
                                caption: "flex justify-center py-2 mb-4 relative items-center",
                                nav_button: "h-6 w-6 bg-transparent hover:bg-primary/10 p-1 rounded transition-colors duration-300",
                                row: "flex w-full mt-2",
                                day_selected: "rounded-md bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white",
                                day_outside: "day-outside text-foreground opacity-50 aria-selected:bg-primary-light aria-selected:text-black dark:aria-selected:text-white aria-selected:bg-opacity-10",
                                cell: "text-foreground rounded-md h-9 w-9 text-center text-sm p-0 m-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-primary/20 [&:has([aria-selected].day-outside)]:text-white [&:has([aria-selected])]:bg-primary/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            }}
                        // components={{
                        //     IconLeft: ({ ...props }) => (
                        //         <ArrowLeftIcon {...props} className="h-4 w-4 stroke-2" />
                        //     ),
                        //     IconRight: ({ ...props }) => (
                        //         <ArrowRightIcon {...props} className="h-4 w-4 stroke-2" />
                        //     ),
                        // }}
                        />
                    </Popover.Content>
                </Popover>
            </div>
        </div>
    };

    useEffect(() => {
        // console.log(`backTestConditionType1`, backTestConditionType1);
    }, [backTestConditionType1]);
    useEffect(() => {
        // console.log(`backTestConditionType2`, backTestConditionType2);
    }, [backTestConditionType2]);
    useEffect(() => {
        // console.log(`backTestConditionType3`, backTestConditionType3);
    }, [backTestConditionType3]);
    useEffect(() => {
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
    useEffect(() => {
        console.log(`backTestConditionFilterResultType`, backTestConditionFilterResultType);
        if (!!backTestConditionFilterResultType && !!backTestConditionFilterResultType.output3 && !!Object.keys(backTestConditionFilterResultType.output3)[2]) {
            const date = Object.keys(backTestConditionFilterResultType.output3)[2];
            console.log(`[test] `, date);
            console.log(`[test] backTestConditionFilterResultType.output3[date]`, backTestConditionFilterResultType.output3[date]);
            console.log(`[test] backTestConditionFilterResultType.output3[date]["조아제약"]`, backTestConditionFilterResultType.output3[date]["조아제약"]);
        }

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
                            <Button color="error" size="sm" variant="outline">
                                취소
                            </Button>
                        </Link>
                        <Button color="info" size="sm" variant="outline" className="hover:text-blue-500 hover:border-blue-500" disabled={"loading" == backTestConditionFilterResultType.state ? true : false} onClick={() => handleOnClick()}>
                            {"loading" == backTestConditionFilterResultType.state ? <div className="flex"><Spinner size="sm" /> 등록 중</div> : "등록"}
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

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const loginState = useAppSelector(selectLoginState);
    const pathname = usePathname();

    useEffect(() => {
        // console.log(`[BackTest]`, `kiToken:`, kiToken);
        // console.log(`[BackTest]`, `loginState`, loginState);
        if ("cf" == loginState || "kakao" == loginState) {
            const isValidKiAccessToken = !!kiToken["access_token"];
            if (true == isValidKiAccessToken) {
                dispatch(reqGetInquireBalance(kiToken));
            }
        }
    }, [kiToken, loginState]);

    useEffect(() => {
        setValidCookie(isValidCookie("koreaInvestmentToken"));
    }, []);

    if ("init" == loginState || "rejected" == loginState) {
        return <>
            <Login parentUrl={pathname} />
        </>
    }
    if (false == validCookie || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
        </>
    }

    const getTitle = () => {
        return "back-test"
    };

    const getSubTitle = () => {
        return "전략에 따른 수익을 확인해보세요."
    };

    if ("init" == backTestConditionFilterResultType.state || "loading" == backTestConditionFilterResultType.state) {
        return <>
            <RegisterTemplate
                cardBodyFix={true}
                title={getTitle()}
                subTitle={getSubTitle()}
                content={getContents()}
                footer={getFooter()}
            />
        </>;
    }

    // console.log(`backTestConditionFilterResultType`, backTestConditionFilterResultType);
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
        <div className="p-1 m-1 border rounded">
            <div className="text-lg font-bold leading-none pb-4">
                최종수익금: {totalProfit.current}원
            </div>
            <Timeline color="primary" orientation="vertical">
                <>
                    {Object.keys(backTestConditionFilterResultType.output).map((date: any, index1: any) => {
                        let prevDate = ""
                        if (index1 >= 1) {
                            prevDate = Object.keys(backTestConditionFilterResultType.output)[index1 - 1];
                        }
                        console.log(`index1`, index1, `date`, date, `prevDate`, prevDate);
                        console.log(`backTestConditionFilterResultType`, backTestConditionFilterResultType);

                        return <Timeline.Item key={date}>
                            <Timeline.Header>
                                <Timeline.Separator />
                                <Timeline.Icon className="h-3 w-3" />
                            </Timeline.Header>
                            <Timeline.Body className="pb-8">
                                <div>
                                    <Typography color="primary" className="font-mono font-bold text-xl leading-none">
                                        {formatDate(date)}
                                    </Typography>
                                    <Typography color="primary" className="font-mono font-bold text-xs leading-none">
                                        - {formatDate(prevDate)} 종목 일괄 매도
                                    </Typography>
                                    <div className="">
                                        {index1 >= 1 ? Object.keys(backTestConditionFilterResultType.output3[prevDate]).map((stockName: any, index2: any) => {
                                            const filteredStockInfo = backTestConditionFilterResultType.output2[prevDate]["data"][stockName];
                                            const filteredStockInfoFinancial = backTestConditionFilterResultType.output3[prevDate][stockName];
                                            const currentFilteredStockInfo = backTestConditionFilterResultType.output2[date]["data"][stockName];
                                            const profit = (!!currentFilteredStockInfo && !!filteredStockInfo) ? Number(((Number(currentFilteredStockInfo["시가총액"]) / Number(filteredStockInfo["시가총액"]) * Number(filteredStockInfo["시가"])) - Number(filteredStockInfo["시가"])).toFixed(0)) : (!!filteredStockInfo ? -Number(filteredStockInfo["시가"]) : 0);
                                            totalProfit.current += profit;
                                            // console.log(`currentFilteredStockInfo`, currentFilteredStockInfo);
                                            return <>
                                                {!!filteredStockInfo ?
                                                    <Typography key={stockName} color="primary" className="font-mono text-[0.6rem]">
                                                        {stockName}|<span className={`${profit >= 0 ? "text-red-500" : "text-blue-500"} ${!!currentFilteredStockInfo ? "" : "text-purple-500"}`}>수익:{profit}</span>
                                                        |시가:{Number(filteredStockInfo["시가"]).toFixed(0)}원
                                                        |유동자산:{Util.UnitConversion(filteredStockInfoFinancial["유동자산"], false)}
                                                        |부채총계:{Util.UnitConversion(filteredStockInfoFinancial["부채총계"], false)}
                                                    </Typography>
                                                    : <></>}
                                            </>
                                        }) : <Typography key={index1} color="primary" className="font-mono text-[0.6rem]">
                                            없음
                                        </Typography>
                                        }
                                    </div>
                                </div>
                                <Typography color="primary" className="font-mono font-bold text-xs leading-none">
                                    - {formatDate(date)} 매수
                                </Typography>
                                <>
                                    {!!backTestConditionFilterResultType.output3[date] ? Object.keys(backTestConditionFilterResultType.output3[date]).map((stockName: any, index2: any) => {
                                        const filteredStockInfo = backTestConditionFilterResultType.output3[date][stockName];
                                        return <>
                                            {!!filteredStockInfo ?
                                                <Typography key={stockName + index2} color="primary" className="font-mono text-[0.6rem]">
                                                    {stockName}| 시가:{Number(filteredStockInfo["시가"]).toFixed(0)}원
                                                    |유동자산:{Util.UnitConversion(filteredStockInfo["유동자산"], false)}
                                                    |부채총계:{Util.UnitConversion(filteredStockInfo["부채총계"], false)}
                                                </Typography>
                                                : <></>}
                                        </>
                                    })
                                        :
                                        <></>
                                    }
                                </>
                            </Timeline.Body>
                        </Timeline.Item>
                    })}
                </>
            </Timeline>
        </div>
    </>
}
