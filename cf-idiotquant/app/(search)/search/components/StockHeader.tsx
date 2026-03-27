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

    return (
        <Card
            elevation={Elevation.ONE}
            className="dark:!bg-zinc-900 p-0 overflow-hidden rounded-xl border-none mb-4"
        >
            <div className={`flex items-center transition-all duration-300 ${isFixed
                ? `fixed top-[130px] left-0 w-full z-30 !bg-white/95 dark:!bg-zinc-950/95 backdrop-blur-md shadow-sm px-6 py-0`
                : "p-5 md:p-6" // 기본 상태에서 패딩을 넉넉히 주어 가독성 확보
                }`}>
                
                {/* [왼쪽 영역] 정보 섹션: 최소한의 가로 폭만 유지 */}
                <div className="flex-none min-w-[140px] md:min-w-[180px] pr-4 border-r dark:border-zinc-800">
                    {!isFixed && (
                        <Tag intent="primary" minimal className="text-[10px] !text-zinc-500 mb-1">
                            {config.marketName}
                        </Tag>
                    )}
                    <div className={`${isFixed ? "flex items-baseline gap-2" : "block"}`}>
                        <h2 className="text-xl md:text-2xl font-black dark:!text-white truncate max-w-[150px] md:max-w-[200px]">
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
                <div className="flex-1 h-20 md:h-24 ml-4 md:ml-6">
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