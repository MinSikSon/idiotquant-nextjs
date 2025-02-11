"use client"

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getList, initFinancialInfo, selectFinancialInfo, selectFinancialInfoList, selectFinancialInfoState, selectLatestDate, selectLoaded, setList } from "@/lib/features/financialInfo/financialInfoSlice";

import { getMarketList, initMarketInfo, selectMarketInfo, selectMarketInfoLatestDate, selectMarketInfoList, selectMarketInfoLoaded, selectMarketInfoState, setMarketInfoStateLoading, setMarketList } from "@/lib/features/marketInfo/marketInfoSlice";
import { getStrategyList, addStrategyList, selectStrategyState, setLoading, selectNcavList } from "@/lib/features/strategy/strategySlice";
import { getCloudFlareLoginStatus } from "@/lib/features/login/loginSlice";
import { GetMergedStocksList, GetStocksFilteredByStrategyNCAV } from "@/components/strategy";
import { selectKakaoId } from "@/lib/features/login/loginSlice";
import { getCookie, isValidCookie } from "./util";

export const LoadData = () => {
    const dispatch = useAppDispatch();
    const financialInfoState = useAppSelector(selectFinancialInfoState);

    const financialInfo: any = useAppSelector(selectFinancialInfo);
    const financialInfoList: string[] = useAppSelector(selectFinancialInfoList);
    const financialLatestDate: any = useAppSelector(selectLatestDate);

    const marketInfoState = useAppSelector(selectMarketInfoState);
    const marketInfo: any = useAppSelector(selectMarketInfo);
    const marketInfoList = useAppSelector(selectMarketInfoList);
    const marketLatestDate: any = useAppSelector(selectMarketInfoLatestDate);

    const strategyState = useAppSelector(selectStrategyState);

    const kakaoId = useAppSelector(selectKakaoId);

    // TODO 1
    // -  date list -> get latest financialInfo date
    // - getMarketInfo date list -> get latest marketInfo date

    // TODO 2
    // - ncavList 존재 o -> getNcavList(latestFinancialInfoDate, latestMarketInfoDate)
    // - ncavList 존재 x ->  + getMarketInfo -> ncavList 구성 -> setNcavList

    function checkInCommon() {
        if ("ready-financialInfoList" == financialInfoState)
            if ("ready-marketInfoList" == marketInfoState) {
                const { year, quarter } = financialLatestDate;
                const date = marketLatestDate;

                if ("init" == strategyState) {
                    dispatch(setLoading());
                    const financialInfoDate = `${year}${quarter}Q`;
                    dispatch(getStrategyList({ financialInfoDate, marketInfoDate: date }));
                }
            }

        if ("ready-financialInfo" == financialInfoState)
            if ("ready-marketInfo" == marketInfoState) {
            }
    }

    useEffect(() => {
        if (financialInfoState == "init") {
            const isValidCookieKakaoId = isValidCookie("kakaoId");
            console.log(`[LoadData]`, `kakaoId:`, kakaoId, `isValidCookieKakaoId`, isValidCookieKakaoId);
            if (false == !!kakaoId && true == isValidCookieKakaoId) {
                dispatch(getCloudFlareLoginStatus());
            }
            dispatch(getList());
            dispatch(getMarketList());
        }
    }, [financialInfoState, marketInfoState])

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
                "financialInfo_2022_4Q",
                "financialInfo_2023_4Q",
                "financialInfo_2024_3Q",
            ];
            dispatch(setList(financialInfoList));
        }

        checkInCommon();
    }, [financialInfoState, dispatch])

    useEffect(() => {
        if ("ready-marketInfoList" == marketInfoState) {
        }
        else if ("get-rejected" == marketInfoState) {
            const marketInfoList: string[] = [
                "marketInfo_20181214",
                "marketInfo_20191213",
                "marketInfo_20201214",
                "marketInfo_20211214",
                "marketInfo_20221214",
                "marketInfo_20231124",
                "marketInfo_20241202",
                "marketInfo_20250115",
            ];
            dispatch(setMarketList(marketInfoList));
        }

        checkInCommon();
    }, [marketInfoState, dispatch, marketLatestDate])

    useEffect(() => {
        if (true == !!financialInfo && true == !!financialInfo["output"] && Object.keys(financialInfo["output"]).length > 0)
            if (true == !!marketInfo && Object.keys(marketInfo).length > 0) {
                const mergedStockInfo = GetMergedStocksList(financialInfo["output"], marketInfo);
                const filteredStocks = GetStocksFilteredByStrategyNCAV(mergedStockInfo);
                const { year, quarter } = financialLatestDate;

                const ncavStrategyList: any = {
                    title: "퀀트 전략 : NCAV",
                    subTitle: `종목수: ${Object.keys(filteredStocks).length}`,
                    desc: "NCAV: 저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.",
                    financialInfoDate: `${year}${quarter}Q`,
                    marketInfoDate: marketInfo[`date`],
                    ncavList: JSON.stringify(filteredStocks)
                }
                dispatch(addStrategyList(ncavStrategyList));
            }
    }, [financialInfo, marketInfo, dispatch, financialLatestDate]);

    useEffect(() => {
        switch (strategyState) {
            case "get-rejected":
                {
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
