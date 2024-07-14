"use client"

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getList, initFinancialInfo, selectFinancialInfo, selectFinancialInfoList, selectFinancialInfoState, selectLatestDate, selectLoaded, setList, setStateLoading } from "@/lib/features/financialInfo/financialInfoSlice";
import { getMarketList, initMarketInfo, selectMarketInfo, selectMarketInfoLatestDate, selectMarketInfoList, selectMarketInfoLoaded, selectMarketInfoState, setMarketInfoStateLoading, setMarketList } from "@/lib/features/marketInfo/marketInfoSlice";
import { getStrategyList, setStrategyList, selectNcavListState, setRetry, setLoading, selectNcavList } from "@/lib/features/strategy/strategySlice";
import { GetMeredStocksList, GetStockNameArrayFilteredByStrategyNCAV, GetStocksFilteredByStrategyNCAV } from "./legacy/Strategy";

export const LoadData = () => {
    const dispatch = useAppDispatch();
    const financialInfoState = useAppSelector(selectFinancialInfoState);
    const financialInfo: object = useAppSelector(selectFinancialInfo);
    const financialInfoList: string[] = useAppSelector(selectFinancialInfoList);
    const financialLatestDate: any = useAppSelector(selectLatestDate);

    const marketInfoState = useAppSelector(selectMarketInfoState);
    const marketInfo: object = useAppSelector(selectMarketInfo);
    const marketInfoList = useAppSelector(selectMarketInfoList);
    const marketLatestDate: any = useAppSelector(selectMarketInfoLatestDate);

    const ncavList: object = useAppSelector(selectNcavList);

    const ncavListState = useAppSelector(selectNcavListState);

    // TODO 1
    // -  date list -> get latest financialInfo date
    // - getMarketInfo date list -> get latest marketInfo date


    // TODO 2
    // - ncavList 존재 o -> getNcavList(latestFinancialInfoDate, latestMarketInfoDate)
    // - ncavList 존재 x ->  + getMarketInfo -> ncavList 구성 -> setNcavList

    useEffect(() => {
        dispatch(getList());
        dispatch(getMarketList());
    }, [])

    function checkInCommon() {
        // console.log(`checkInCommon`);
        if ("ready-financialInfoList" == financialInfoState)
            if ("ready-marketInfoList" == marketInfoState) {
                const { year, quarter } = financialLatestDate;
                const date = marketLatestDate;

                // console.log(`year:`, year, `, quarter:`, quarter, `, date:`, date, `, ncavListState:`, ncavListState);
                if ("ready" == ncavListState) {
                    dispatch(setLoading());
                    const financialInfoDate = `${year}${quarter}`;
                    dispatch(getStrategyList({ financialInfoDate, marketInfoDate: date }));
                }
            }

        if ("ready-financialInfo" == financialInfoState)
            if ("ready-marketInfo" == marketInfoState) {
                console.log(`ready financialInfo & marketInfo`);
            }
    }

    useEffect(() => {
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
            ];
            dispatch(setList(financialInfoList));
        }

        checkInCommon();
    }, [financialInfoState])

    useEffect(() => {
        // console.log(`useEffect3 [LoadData] marketInfoState`, marketInfoState);
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
            ];
            dispatch(setMarketList(marketInfoList));
        }

        checkInCommon();
    }, [marketInfoState])

    useEffect(() => {
        // console.log(`useEffect4 [LoadData] financialInfo, marketInfo`, financialInfo, !!financialInfo, marketInfo, !!marketInfo);
        if (true == !!financialInfo && Object.keys(financialInfo).length > 0)
            if (true == !!marketInfo && Object.keys(marketInfo).length > 0) {
                const mergedStockInfo = GetMeredStocksList(financialInfo, marketInfo);
                const filteredStocks = GetStocksFilteredByStrategyNCAV(mergedStockInfo);
                const { year, quarter } = financialLatestDate;
                // console.log(`financialLatestDate`, financialLatestDate);

                const ncavStrategyList = {
                    financialInfoDate: `${year}${quarter}Q`,
                    marketInfoDate: marketInfo[`date`],
                    ncavList: JSON.stringify(filteredStocks)
                }
                dispatch(setStrategyList(ncavStrategyList));
            }
    }, [financialInfo, marketInfo]);


    useEffect(() => {
        // console.log(`useEffect5 [LoadData] ncavListState`, ncavListState);
        if ("get-rejected" == ncavListState) {
            const afinancialInfoList = String(financialInfoList).split(",");
            const latestFinancialInfoList = afinancialInfoList[afinancialInfoList.length - 1];
            const splitLatestFinancialInfoList = latestFinancialInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
            const year = splitLatestFinancialInfoList[1];
            const quarter = splitLatestFinancialInfoList[2].replace("Q", "");
            // console.log(`[LoadData] year, quarter`, year, quarter);
            dispatch(initFinancialInfo({ year, quarter }));

            const aMarketInfoList = String(marketInfoList).split(",");
            const latestMarketInfoList = aMarketInfoList[aMarketInfoList.length - 1];
            const splitLatestMarketInfoList = latestMarketInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
            const date = splitLatestMarketInfoList[1];
            dispatch(initMarketInfo({ date }));
        }
    }, [ncavListState]);

    console.log(`ncavList`, ncavList);

    return (
        <></>
    );
}
