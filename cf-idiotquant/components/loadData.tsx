"use client"

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getList, initFinancialInfo, selectFinancialInfo, selectFinancialInfoList, selectFinancialInfoState, selectLatestDate, selectLoaded, setList } from "@/lib/features/financialInfo/financialInfoSlice";

import { getMarketList, initMarketInfo, selectMarketInfo, selectMarketInfoLatestDate, selectMarketInfoList, selectMarketInfoLoaded, selectMarketInfoState, setMarketInfoStateLoading, setMarketList } from "@/lib/features/marketInfo/marketInfoSlice";
import { getStrategyList, setStrategyList, selectStrategyState, setLoading, selectNcavList } from "@/lib/features/strategy/strategySlice";
import { GetMergedStocksList, GetStocksFilteredByStrategyNCAV } from "@/components/strategy";
import { setBackTestStrategyList } from "@/lib/features/backtest/backtestSlice";

export const LoadData = () => {
    const dispatch = useAppDispatch();
    const financialInfoState = useAppSelector(selectFinancialInfoState);

    const financialInfo: object = useAppSelector(selectFinancialInfo);
    const financialInfoList: string[] = useAppSelector(selectFinancialInfoList);
    const financialLatestDate: any = useAppSelector(selectLatestDate);

    const marketInfoState = useAppSelector(selectMarketInfoState);
    const marketInfo: any = useAppSelector(selectMarketInfo);
    const marketInfoList = useAppSelector(selectMarketInfoList);
    const marketLatestDate: any = useAppSelector(selectMarketInfoLatestDate);

    const strategyState = useAppSelector(selectStrategyState);

    // console.log(`[LoadData 1]`, new Date(), `financialInfoState:`, financialInfoState, `, financialInfo:`, financialInfo, `, financialInfoList:`, financialInfoList);
    // console.log(`[LoadData 2]`, new Date(), `financialLatestDate:`, financialLatestDate, `, marketInfoState:`, marketInfoState, `, marketInfo:`, marketInfo);
    // console.log(`[LoadData 3]`, new Date(), `marketInfoList:`, marketInfoList, `, marketLatestDate:`, marketLatestDate, `, strategyState:`, strategyState);

    // TODO 1
    // -  date list -> get latest financialInfo date
    // - getMarketInfo date list -> get latest marketInfo date

    // TODO 2
    // - ncavList 존재 o -> getNcavList(latestFinancialInfoDate, latestMarketInfoDate)
    // - ncavList 존재 x ->  + getMarketInfo -> ncavList 구성 -> setNcavList

    function checkInCommon() {
        // console.log(`checkInCommon`);
        if ("ready-financialInfoList" == financialInfoState)
            if ("ready-marketInfoList" == marketInfoState) {
                const { year, quarter } = financialLatestDate;
                const date = marketLatestDate;

                // console.log(`year:`, year, `, quarter:`, quarter, `, date:`, date, `, ncavListState:`, ncavListState);
                if ("init" == strategyState) {
                    dispatch(setLoading());
                    const financialInfoDate = `${year}${quarter}Q`;
                    dispatch(getStrategyList({ financialInfoDate, marketInfoDate: date }));
                }
            }

        if ("ready-financialInfo" == financialInfoState)
            if ("ready-marketInfo" == marketInfoState) {
                // console.log(`ready financialInfo & marketInfo`);
            }
    }

    useEffect(() => {
        if (financialInfoState == "init") {
            // console.log(`111 []`, new Date(), `financialInfoState:`, financialInfoState, `, marketInfoState:`, marketInfoState);
            dispatch(getList());
            dispatch(getMarketList());
        }
    }, [financialInfoState, marketInfoState])

    useEffect(() => {
        // console.log(`222 [loadData] financialInfoState`, financialInfoState);
        if ("ready-financialInfoList" == financialInfoState) {
        }
        else if ("get-rejected" == financialInfoState) {
            const financialInfoList: string[] = [
                "financialInfo_2017_4Q",
                "financialInfo_2018_4Q",
                "financialInfo_2019_4Q",
                "financialInfo_2020_4Q",
                "financialInfo_2021_4Q",
                "financialInfo_2022_3Q",
                "financialInfo_2022_4Q",
                "financialInfo_2023_1Q",
                "financialInfo_2023_2Q",
                "financialInfo_2023_3Q",
                "financialInfo_2023_4Q",
                "financialInfo_2024_1Q",
                "financialInfo_2024_3Q",
            ];
            dispatch(setList(financialInfoList));
        }

        checkInCommon();
    }, [financialInfoState, dispatch])

    useEffect(() => {
        // console.log(`333 [LoadData] marketInfoState`, marketInfoState);
        if ("ready-marketInfoList" == marketInfoState) {
            // console.log(`[LoadData] [ready-marketInfoList]`, marketLatestDate);
        }
        else if ("get-rejected" == marketInfoState) {
            const marketInfoList: string[] = [
                "marketInfo_20181214",
                "marketInfo_20191213",
                "marketInfo_20201214",
                "marketInfo_20211214",
                "marketInfo_20221214",
                "marketInfo_20230111",
                "marketInfo_20230302",
                "marketInfo_20230324",
                "marketInfo_20230417",
                "marketInfo_20230426",
                "marketInfo_20230524",
                "marketInfo_20230622",
                "marketInfo_20230719",
                "marketInfo_20230810",
                "marketInfo_20230825",
                "marketInfo_20230922",
                "marketInfo_20231013",
                "marketInfo_20231106",
                "marketInfo_20231124",
                "marketInfo_20240201",
                "marketInfo_20240327",
                "marketInfo_20240712",
                "marketInfo_20241202",
                "marketInfo_20250115",
            ];
            dispatch(setMarketList(marketInfoList));
        }

        checkInCommon();
    }, [marketInfoState, dispatch, marketLatestDate])

    useEffect(() => {
        // console.log(`444 [LoadData] financialInfo, marketInfo`, financialInfo, !!financialInfo, marketInfo, !!marketInfo);
        if (true == !!financialInfo && Object.keys(financialInfo).length > 0)
            if (true == !!marketInfo && Object.keys(marketInfo).length > 0) {
                const mergedStockInfo = GetMergedStocksList(financialInfo, marketInfo);
                const filteredStocks = GetStocksFilteredByStrategyNCAV(mergedStockInfo);
                const { year, quarter } = financialLatestDate;
                // console.log(`financialLatestDate`, financialLatestDate);

                const ncavStrategyList: any = {
                    financialInfoDate: `${year}${quarter}Q`,
                    marketInfoDate: marketInfo[`date`],
                    ncavList: JSON.stringify(filteredStocks)
                }
                // console.log(`ncavStrategyList`, ncavStrategyList);
                dispatch(setStrategyList(ncavStrategyList));
            }
    }, [financialInfo, marketInfo, dispatch, financialLatestDate]);

    useEffect(() => {
        // console.log(`555 [LoadData] strategyState`, strategyState);
        switch (strategyState) {
            case "get-rejected":
                {
                    // console.log(`[LoadData] get-rejected`);
                    const afinancialInfoList = String(financialInfoList).split(",");
                    const latestFinancialInfoList = afinancialInfoList[afinancialInfoList.length - 1];
                    const splitLatestFinancialInfoList = latestFinancialInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
                    const year = splitLatestFinancialInfoList[1];
                    const quarter = splitLatestFinancialInfoList[2].replace("Q", "");
                    dispatch(initFinancialInfo({ year, quarter }));

                    const aMarketInfoList = String(marketInfoList).split(",");
                    const latestMarketInfoList = aMarketInfoList[aMarketInfoList.length - 1];
                    const splitLatestMarketInfoList = latestMarketInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
                    const date = splitLatestMarketInfoList[1];
                    dispatch(initMarketInfo({ date }));
                    break;
                }
            case "loaded":
                {
                    // console.log(`[LoadData] loaded`);
                    break;
                }
            default:
                {
                    // console.log(`[LoadData] default strategyState:`, strategyState);
                    break;
                }
        }
    }, [strategyState, dispatch, financialInfoList, marketInfoList]);

    return (
        <></>
    );
}



// loadData 를 Home/page.tsx 로 옮기덙디 해야것누