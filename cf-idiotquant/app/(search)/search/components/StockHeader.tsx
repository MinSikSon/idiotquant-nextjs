"use client";

import React from "react";
import { Card, Elevation, Tag } from "@blueprintjs/core";
import LineChart from "@/components/LineChart";

interface StockHeaderProps {
    data: any;
    isUs: boolean;
    isFixed: boolean;
}

export const StockHeader = ({ data, isUs, isFixed }: StockHeaderProps) => {
    const { kiChart, kiPrice, usSearchInfo, usDetail, usDaily } = data;

    const config = isUs ? {
        marketName: usSearchInfo?.output?.tr_mket_name,
        prdtName: usSearchInfo?.output?.prdt_name,
        price: Number(usDetail?.output?.last).toFixed(2),
        currency: usDetail?.output?.curr,
        chartData: usDaily?.output2?.map((i: any) => i.clos).reverse(),
        chartCategory: usDaily?.output2?.map((i: any) => i.xymd).reverse(),
        color: "#818cf8"
    } : {
        marketName: kiPrice?.output?.rprs_mrkt_kor_name,
        prdtName: kiChart?.output1?.hts_kor_isnm,
        price: Number(kiChart?.output1?.stck_prpr).toLocaleString(),
        currency: "원",
        chartData: kiChart?.output2?.map((i: any) => i.stck_oprc).reverse(),
        chartCategory: kiChart?.output2?.map((i: any) => i.stck_bsop_date).reverse(),
        color: "#6366f1"
    };

    // [1] 글자 수에 따른 Tailwind 클래스 매핑
    // 종목명이 길어질수록 폰트 크기를 단계적으로 줄여 잘림을 방지합니다.
    const getFontSize = (name: string) => {
        const len = name?.length || 0;
        if (isFixed) return "text-lg md:text-xl"; // 고정 헤더일 때는 콤팩트하게
        if (len > 15) return "text-lg sm:text-xl md:text-2xl"; // 매우 긴 이름 (예: 바이언트 테크놀로지스...)
        if (len > 10) return "text-xl sm:text-2xl md:text-3xl"; // 중간 길이
        return "text-2xl sm:text-3xl md:text-4xl"; // 짧은 이름 (예: 삼성전자, TSLA)
    };

    return (
        <Card
            elevation={Elevation.ONE}
            className="dark:!bg-zinc-900 p-0 overflow-hidden rounded-xl border-none mb-4"
        >
            <div className={`flex items-center transition-all duration-300 ${isFixed
                ? `fixed top-[126px] left-0 w-full z-30 !bg-white/95 dark:!bg-zinc-950/95 backdrop-blur-md shadow-md px-6 py-0`
                : "flex flex-col" // 기본 상태에서 패딩을 넉넉히 주어 가독성 확보
                }`}>
                
                {/* [왼쪽 영역] 정보 섹션: 최소한의 가로 폭만 유지 */}
                <div className={`${isFixed ? "pr-4 border-r" : "flex gap-2"} flex-none min-w-[140px] md:min-w-[180px] dark:border-zinc-800`}>
                    {!isFixed && (
                        <Tag intent="primary" minimal className="text-[10px] !text-zinc-500 mb-1">
                            {config.marketName}
                        </Tag>
                    )}
                    <div className={`${isFixed ? "flex items-baseline" : "flex"} gap-2`}>
                        {/* <h2 className="text-xl md:text-2xl font-black dark:!text-white truncate max-w-[150px] md:max-w-[200px]"> */}
                        <h2 className={`
                            ${getFontSize(config.prdtName)} 
                            font-black dark:!text-white leading-[1.1] tracking-tighter
                            break-keep overflow-visible whitespace-normal transition-all duration-300
                        `}>
                            {config.prdtName}
                        </h2>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-mono font-bold !text-blue-600 dark:!text-blue-400">
                                {config.price}
                            </span>
                            <span className="text-[10px] !text-zinc-500 uppercase font-medium">{config.currency}</span>
                        </div>
                    </div>
                </div>

                {/* [오른쪽 영역] 차트 섹션: flex-1로 가로 길이를 극대화 */}
                <div className={`${isFixed? "" : "px-2"} w-full flex-1 h-18 md:h-24 ml-4 md:ml-6`}>
                    <LineChart
                        data_array={[{
                            name: "Price",
                            data: config.chartData,
                            color: config.color
                        }]}
                        category_array={config.chartCategory}
                        // 가로가 길어지므로 높이도 소폭 상향하여 시인성 확보
                        height={isFixed ? 65 : 100} 
                        show_yaxis_label={false}
                        legend_disable
                    />
                </div>
            </div>

            {/* 고정 모드 전환 시 레이아웃 점프 방지 */}
            {isFixed && <div className="h-40" />}
        </Card>
    );
};