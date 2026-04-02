"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, Elevation, Tag, Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import LineChart from "@/components/LineChart";
import SearchAutocomplete from "@/components/searchAutoComplete";

interface StockHeaderProps {
    data: any;
    isUs: boolean;
    isFixed: boolean;
    all_tickers: string[];
    handleSearch: (val: string) => void;
}

export const StockHeader = ({ data, isUs, isFixed, all_tickers, handleSearch }: StockHeaderProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const { kiChart, kiPrice, usSearchInfo, usDetail, usDaily } = data;

    // 1. 스크롤 발생 시 검색 모드 해제 -> 차트/정보 모드로 복구
    useEffect(() => {
        const handleScroll = () => {
            if (isFocused) setIsFocused(false);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isFocused]);

    // 2. 고정 상태 변화 시 초기화
    useEffect(() => {
        setIsFocused(false);
    }, [isFixed]);

    const config = useMemo(() => {
        return isUs ? {
            marketName: usSearchInfo?.output?.tr_mket_name,
            prdtName: usSearchInfo?.output?.prdt_name,
            price: Number(usDetail?.output?.last || 0).toFixed(2),
            currency: usDetail?.output?.curr || "USD",
            chartData: usDaily?.output2?.map((i: any) => Number(i.clos)).reverse() || [],
            chartCategory: usDaily?.output2?.map((i: any) => i.xymd).reverse() || [],
            color: "#818cf8"
        } : {
            marketName: kiPrice?.output?.rprs_mrkt_kor_name,
            prdtName: kiChart?.output1?.hts_kor_isnm,
            price: Number(kiChart?.output1?.stck_prpr || 0).toLocaleString(),
            currency: "원",
            chartData: kiChart?.output2?.map((i: any) => Number(i.stck_oprc)).reverse() || [],
            chartCategory: kiChart?.output2?.map((i: any) => i.stck_bsop_date).reverse() || [],
            color: "#6366f1"
        };
    }, [isUs, data]);

    const showSummary = config.prdtName && !isFocused;

    return (
        <div className={`w-full transition-all duration-300 ${isFixed ? "fixed top-0 left-0 z-50 shadow-xl" : "relative mb-6"}`}>
            <Card
                elevation={isFixed ? Elevation.TWO : Elevation.ONE}
                className={`
                    dark:!bg-zinc-900 border-none p-0 transition-all duration-300
                    ${isFocused ? "overflow-visible" : "overflow-hidden"}
                    ${isFixed ? "rounded-none bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md" : "rounded-2xl bg-white"}
                `}
            >
                <div className="max-w-6xl mx-auto relative h-[64px] md:h-[80px] flex items-center">
                    
                    {/* [1] 검색 인풋 레이어 */}
                    <div className={`absolute inset-0 z-30 p-3 md:p-4 flex items-center transition-all duration-300 ${
                        showSummary ? "opacity-0 pointer-events-none" : "opacity-100"
                    }`}>
                        <div className="w-full relative">
                            <SearchAutocomplete
                                placeHolder="종목명 또는 티커 입력"
                                onSearchButton={(val:any) => {
                                    handleSearch(val);
                                    setIsFocused(false);
                                }}
                                validCorpNameArray={all_tickers}
                                onFocus={() => setIsFocused(true)}
                                // onBlur를 사용하면 추천 목록 클릭 전에 닫힐 수 있으므로 주의가 필요합니다.
                            />
                        </div>
                    </div>

                    {/* [2] 종목 정보(차트) 레이어 */}
                    {showSummary && (
                        <div 
                            onClick={() => setIsFocused(true)}
                            className="absolute inset-0 z-20 flex items-center justify-between px-5 md:px-8 cursor-text animate-in fade-in duration-500"
                        >
                            <div className="flex items-center gap-3 md:gap-6 flex-none">
                                <Icon icon={IconNames.SEARCH} className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                <div className="flex flex-col -space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base md:text-xl font-black dark:text-white truncate max-w-[120px] md:max-w-[250px]">
                                            {config.prdtName}
                                        </span>
                                        <Tag minimal intent="primary" className="!text-[9px] opacity-60 font-bold">{config.marketName}</Tag>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg md:text-2xl font-mono font-black text-blue-600 dark:text-blue-400">
                                            {config.price}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 uppercase font-bold">{config.currency}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 차트 영역 */}
                            <div className="flex-1 h-10 md:h-14 ml-4 md:ml-10 mr-2 md:mr-10">
                                {config.chartData.length > 0 && (
                                    <LineChart
                                        data_array={[{ name: "Price", data: config.chartData, color: config.color }]}
                                        category_array={config.chartCategory}
                                        height={isFixed ? 48 : 60} 
                                        show_yaxis_label={false}
                                        legend_disable
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};