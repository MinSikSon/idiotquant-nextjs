"use client"

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getList, initFinancialInfo, selectFinancialInfo, selectFinancialInfoList, selectFinancialInfoState, selectLoaded, setList } from "@/lib/features/financialInfo/financialInfoSlice";
import { getMarketList, initMarketInfo, selectMarketInfo, selectMarketInfoList, selectMarketInfoLoaded, selectMarketInfoState, setMarketList } from "@/lib/features/marketInfo/marketInfoSlice";
import { getStrategyList, setStrategyList, selectNcavListState, setRetry, setLoading, selectNcavList } from "@/lib/features/strategy/strategySlice";

export const LoadData = () => {
    const dispatch = useAppDispatch();
    const financialInfoState = useAppSelector(selectFinancialInfoState);
    const financialInfoLoaded = useAppSelector(selectLoaded);
    const financialInfo: object = useAppSelector(selectFinancialInfo);
    const financialInfoList: string[] = useAppSelector(selectFinancialInfoList);

    const marketInfoState = useAppSelector(selectMarketInfoState);
    const marketInfoLoaded = useAppSelector(selectMarketInfoLoaded);
    const marketInfo: object = useAppSelector(selectMarketInfo);
    const marketInfoList: string[] = useAppSelector(selectMarketInfoList);

    const ncavList: object = useAppSelector(selectNcavList);

    const ncavListState = useAppSelector(selectNcavListState);

    // TODO 1
    // - getFinancialInfo date list -> get latest financialInfo date
    // - getMarketInfo date list -> get latest marketInfo date


    // TODO 2
    // - ncavList 존재 o -> getNcavList(latestFinancialInfoDate, latestMarketInfoDate)
    // - ncavList 존재 x -> getFinancialInfo + getMarketInfo -> ncavList 구성 -> setNcavList

    useEffect(() => {
        if (false == financialInfoLoaded) {
            console.log(`[LoadData] financialInfoList:`, financialInfoList);
            console.log(`[LoadData] financialInfoLoaded:`, financialInfoLoaded);
            // state: "init" | "getFinancialInfoList" | "setFinancialInfoList" | "loading" | "loaded" | "rejected";

            if ("init" == financialInfoState) {
                dispatch(getList());
            }
        }

        if (false == marketInfoLoaded) {
            console.log(`[LoadData] marketInfoState:`, marketInfoState);
            console.log(`[LoadData] marketInfoLoaded:`, marketInfoLoaded);
            if ("init" == marketInfoState) {
                dispatch(getMarketList());
            }
        }

    }, [])

    useEffect(() => {
        if ("ready-financialInfoList" == financialInfoState) {
            const afinancialInfoList = String(financialInfoList).split(",");
            const latestFinancialInfoList = afinancialInfoList[afinancialInfoList.length - 1];
            console.log(`[LoadData] latestFinancialInfoList`, latestFinancialInfoList);
            const splitLatestFinancialInfoList = latestFinancialInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
            console.log(`[LoadData] splitLatestFinancialInfoList`, splitLatestFinancialInfoList);
            const year = splitLatestFinancialInfoList[1];
            const quarter = splitLatestFinancialInfoList[2];

            console.log(`[LoadData] year, quarter`, year, quarter);
            console.log(`[LoadData] ncavListState 1`, ncavListState);
            if ("ready" == ncavListState) {
                dispatch(setLoading());
                const financialInfoDate = `${year}${quarter}`;
                // dispatch(getStrategyList({ financialInfoDate, marketInfoDate }));
            }
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
            ];
            dispatch(setList(financialInfoList));
        }
    }, [financialInfoState])

    useEffect(() => {
        console.log(`[LoadData] marketInfoState`, marketInfoState);
        if ("ready-marketInfoList" == marketInfoState) {
            const aMarketInfoList = String(marketInfoList).split(",");
            const latestMarketInfoList = aMarketInfoList[aMarketInfoList.length - 1];
            const splitLatestMarketInfoList = latestMarketInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
            const date = splitLatestMarketInfoList[1];

            console.log(`[LoadData] [ready-marketInfoList]`, date);
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
            ];
            dispatch(setMarketList(marketInfoList));
        }
    }, [marketInfoState])

    useEffect(() => {
        if ("ready-financialInfoList" == financialInfoState)
            if ("ready-marketInfoList" == marketInfoState) {
                const afinancialInfoList = String(financialInfoList).split(",");
                const latestFinancialInfoList = afinancialInfoList[afinancialInfoList.length - 1];
                const splitLatestFinancialInfoList = latestFinancialInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
                const year = splitLatestFinancialInfoList[1];
                const quarter = splitLatestFinancialInfoList[2];

                const aMarketInfoList = String(marketInfoList).split(",");
                const latestMarketInfoList = aMarketInfoList[aMarketInfoList.length - 1];
                const splitLatestMarketInfoList = latestMarketInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
                const date = splitLatestMarketInfoList[1];

                console.log(`year:`, year, `, quarter:`, quarter, `, date:`, date, `, ncavListState:`, ncavListState);
                if ("ready" == ncavListState) {
                    dispatch(setLoading());
                    const financialInfoDate = `${year}${quarter}`;
                    dispatch(getStrategyList({ financialInfoDate, marketInfoDate: date }));
                }

                // dispatch(initMarketInfo({ date: marketInfoDate }));

            }
    }, [financialInfoState, marketInfoState])

    useEffect(() => {
        console.log(`[LoadData] ncavListState 2`, ncavListState);
        if ("get-rejected" == ncavListState) {
            if (false == financialInfoLoaded) {
                const afinancialInfoList = String(financialInfoList).split(",");
                const latestFinancialInfoList = afinancialInfoList[afinancialInfoList.length - 1];
                const splitLatestFinancialInfoList = latestFinancialInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
                const year = splitLatestFinancialInfoList[1];
                const quarter = splitLatestFinancialInfoList[2].replace("Q", "");
                // console.log(`[LoadData] year, quarter`, year, quarter);
                dispatch(initFinancialInfo({ year, quarter }));
            }

            if (false == marketInfoLoaded) {
                const aMarketInfoList = String(marketInfoList).split(",");
                const latestMarketInfoList = aMarketInfoList[aMarketInfoList.length - 1];
                const splitLatestMarketInfoList = latestMarketInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
                const date = splitLatestMarketInfoList[1];
                dispatch(initMarketInfo({ date }));
            }

            // const ncavList = ["손민식", "김수빈", "테슷흐"];
            // dispatch(setRetry());
            // console.log(`rejected!!!!!!!!!!`);
            // const dummy = {
            //     financialInfoDate: `${year}${quarter}Q`,
            //     marketInfoDate: marketInfoDate,
            //     ncavList: ncavList
            // }
            // dispatch(setStrategyList(dummy));
        }
        else if ("retry" == ncavListState) {
            console.log(`end!!!!!!!!!!!!!!`);
        }
    }, [ncavListState]);

    useEffect(() => {
        if (true == financialInfoLoaded)
            if (true == marketInfoLoaded) {
                console.log(`TODO: need to make ncav List`);
            }
    },
        [financialInfoLoaded, marketInfoLoaded])

    console.log(`financialInfo`, financialInfo);
    console.log(`marketInfo`, marketInfo);
    console.log(`ncavListState`, ncavListState);
    console.log(`ncavList`, ncavList);

    return (
        <></>
    );
}
