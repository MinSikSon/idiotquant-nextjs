"use client"

import { GetMergedStocksList, GetStocksFilteredByStrategyNCAV } from "@/components/strategy";
import TablePanel, { ListNodeTemplate } from "@/components/TablePanel";
import { getPrevYearAndQuarter, getYearAndQuarterByDate } from "@/components/yearQuarterMatcher";
import { getEndMarketInfo, getStartFinancialInfo, getStartMarketInfo, selectEndMarketInfo, selectStartFinancialInfo, selectStartMarketInfo, setBackTestStrategyList } from "@/lib/features/backtest/backtestSlice";
import { selectMarketInfoList } from "@/lib/features/marketInfo/marketInfoSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, Card, CardBody, CardFooter, CardHeader, Slider, Typography } from "@material-tailwind/react";
import { useState, useEffect } from "react";

const SimpleCard = (props: any) => {
    return (
        <Card className="my-0 w-full sm:px-28 lg:px-48 xl:px-64">
            {/* <CardHeader
                floated={false}
                shadow={false}
                color="transparent"
                className="m-0 rounded-none">
                <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1471&q=80"
                    alt="ui/ux review check"
                />
            </CardHeader> */}
            <CardBody>
                <Typography variant="h5" color="blue-gray" className="mb-2">
                    {props.title}
                </Typography>
                <Typography variant="h6">
                    {props.description1}
                    {props.description2}
                </Typography>
            </CardBody>
            <CardFooter className="flex pt-0">
                <Button className="grow" onClick={props.buttonClieckEvent}>{props.buttonDesc}</Button>
            </CardFooter>
        </Card>
    );
}

export default function BackTesting(props: any) {
    const dispatch = useAppDispatch();
    const startFinancialInfo = useAppSelector(selectStartFinancialInfo);
    const startMarketInfo = useAppSelector(selectStartMarketInfo);
    const endMarketInfo = useAppSelector(selectEndMarketInfo);
    // console.log(`[BackTesting] startFinancialInfo`, startFinancialInfo);
    // console.log(`[BackTesting] startMarketInfo`, startMarketInfo);
    // console.log(`[BackTesting] endMarketInfo`, endMarketInfo);

    // console.log(`Step1. 선택할 수 있는 marketInfo date 출력`);
    const marketInfoDateList = useAppSelector(selectMarketInfoList).replaceAll("[", "").replaceAll("]", "").split(",").map(data => data.replaceAll("\"", ""));

    // console.log(`Step2. 해당 marketInfo date 선택하면, financialInfo 와 조합하여 종목 추출 (일단은 전략은 NCAV 로 통일)`);
    // console.log(`Step3. run backtesting 버튼 누르면 실행 (현재 주가와 비교)`);

    const [startIndex, setStartIndex] = useState(0);
    const [endIndex, setEndIndex] = useState(0);
    const [filteredStocks, setFilteredStocks] = useState({});

    useEffect(() => {
        if (0 == startIndex) {
            setStartIndex(0);
        }
        if (0 == endIndex) {
            setEndIndex(marketInfoDateList.length - 1);
        }
    }, [startIndex, endIndex, marketInfoDateList]);

    function handleChange(e: any) {
        const offset = Number((100 / marketInfoDateList.length).toFixed(0));
        // console.log(`handleChange`, e, `, e.target.value:`, e.target.value);
        const index = e.target.value / offset;
        // console.log(`marketInfoDateList`, marketInfoDateList);
        // console.log(`marketInfoDateList[index: ${index}]`, marketInfoDateList[index]);
        // console.log(`startIndex`, startIndex, `, endIndex`, endIndex);
        if (index < endIndex) {
            setStartIndex(index);
        }
        // offset 에 따라 화면에 값 출력
    }

    function handleChange2(e: any) {
        const offset = Number((100 / marketInfoDateList.length).toFixed(0));
        // console.log(`handleChange`, e, `, e.target.value:`, e.target.value);
        const index = e.target.value / offset;
        // console.log(`marketInfoDateList`, marketInfoDateList);
        // console.log(`marketInfoDateList[index: ${index}]`, marketInfoDateList[index]);
        // console.log(`startIndex`, startIndex, `, endIndex`, endIndex);
        if (startIndex < index) {
            setEndIndex(index);
        }
        // offset 에 따라 화면에 값 출력
    }


    let prevStartYearAndQuarter = { year: 9999, quarter: 1 };
    let prevEndYearAndQuarter = { year: 9999, quarter: 1 };

    function runBacktest() {
        // console.log(`[runBacktest]`, startIndex, endIndex, prevStartYearAndQuarter);

        const startMarketInfoDate: string = marketInfoDateList[startIndex].split("_")[1];
        const endMarketInfoDate: string = marketInfoDateList[endIndex].split("_")[1];
        dispatch(getStartFinancialInfo({ year: (prevStartYearAndQuarter.year).toString(), quarter: (prevStartYearAndQuarter.quarter).toString() }));
        dispatch(getStartMarketInfo({ date: startMarketInfoDate }));
        dispatch(getEndMarketInfo({ date: endMarketInfoDate }));
    }

    useEffect(() => {
        if (true == !!startFinancialInfo && Object.keys(startFinancialInfo).length > 0)
            if (true == !!startMarketInfo && Object.keys(startMarketInfo).length > 0)
                if (true == !!endMarketInfo && Object.keys(endMarketInfo).length > 0) {
                    const mergedStockInfo = GetMergedStocksList(startFinancialInfo, startMarketInfo);
                    const dicFilteredStocks = GetStocksFilteredByStrategyNCAV(mergedStockInfo);
                    setFilteredStocks(dicFilteredStocks);

                    const ncavStrategyList = {
                        financialInfoDate: `${prevStartYearAndQuarter.year}${prevStartYearAndQuarter.quarter}Q`,
                        marketInfoDate: startMarketInfo[`date`],
                        ncavList: JSON.stringify(filteredStocks)
                    }

                    dispatch(setBackTestStrategyList(ncavStrategyList));
                }

    }, [startFinancialInfo, startMarketInfo, endMarketInfo])

    // console.log(`marketInfoDateList `, marketInfoDateList);
    // console.log(`marketInfoDateList.length `, marketInfoDateList.length);
    if ('' != marketInfoDateList[0]) {
        let startYearAndQuarter = getYearAndQuarterByDate(marketInfoDateList[startIndex].split("_")[1]);
        prevStartYearAndQuarter = getPrevYearAndQuarter(startYearAndQuarter.year, startYearAndQuarter.quarter);

        let endYearAndQuarter = getYearAndQuarterByDate(marketInfoDateList[endIndex].split("_")[1]);
        prevEndYearAndQuarter = getPrevYearAndQuarter(endYearAndQuarter.year, endYearAndQuarter.quarter);

    }

    let endValue = 100;
    if (marketInfoDateList.length > 0) {
        endValue = (Number((100 / marketInfoDateList.length).toFixed(0)) * endIndex);
        endValue = endValue > 100 ? 100 : endValue;
    }

    // console.log(`[BackTesting] filteredStocksList`, filteredStocks);
    // console.log(`[BackTesting] bsnsDate`, startMarketInfo[`date`]);

    return <>
        <SimpleCard
            title={`back test (strategy : NCAV only)`}
            description1={<div className="w-full">
                <div>
                    start date : {marketInfoDateList[startIndex]}
                </div>
                <div className="px-3">
                    <Slider
                        size={"lg"}
                        defaultValue={0}
                        value={marketInfoDateList.length > 0 ? Number((100 / marketInfoDateList.length).toFixed(0)) * startIndex : 0}
                        step={marketInfoDateList.length > 0 ? (100 / marketInfoDateList.length).toFixed(0) : 1}
                        onChange={handleChange}
                    />
                </div>
                <div className="pl-6">
                    year:{prevStartYearAndQuarter.year}, quarter:{prevStartYearAndQuarter.quarter}
                </div>
            </div>}
            description2={
                <div className="w-full">
                    <div>
                        end date : {marketInfoDateList[endIndex]}
                    </div>
                    <div className="px-3">
                        <Slider
                            size={"lg"}
                            defaultValue={100}
                            value={endValue}
                            step={marketInfoDateList.length > 0 ? (100 / marketInfoDateList.length).toFixed(0) : 1}
                            onChangeCapture={handleChange2}
                        />
                    </div>
                    <div className="pl-6">
                        year:{prevEndYearAndQuarter.year}, quarter:{prevEndYearAndQuarter.quarter}
                    </div>
                </div>
            }
            buttonDesc={"run backtesting"}
            buttonClieckEvent={runBacktest}
        />

        <TablePanel
            listHeader={<ListNodeTemplate
                link={`/backtest`}
                item1={"종목명"}
                item2={"start"}
                item3={"➡️"}
                item4={"목표가"}
                color={"blue"}
                bgColor={"bg-gray-200"}
                item5={"end"}
            />}
            loadingMsg={`waiting`}

            pathname={`backtest`}
            marqueueDisplay={false}

            filteredStocks={filteredStocks}
            bsnsDate={!!startMarketInfo["date"] ? startMarketInfo["date"] : "999999"}
            endMarketInfo={endMarketInfo}

            endDate={marketInfoDateList[endIndex]}
        />
    </>;
}
