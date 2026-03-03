"use client";

import React from "react";
import { Card, Elevation, Button, Tag } from "@blueprintjs/core";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import LineChart from "@/components/LineChart";

interface StockHeaderProps {
    data: any;
    isUs: boolean;
    isFixed: boolean;
}

export const StockHeader = ({ data, isUs, isFixed }: StockHeaderProps) => {
    const { kiChart, kiPrice, usSearchInfo, usDetail, usDaily } = data;

    // 1. 시장별 데이터 매핑 설정
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

    // 2. 공통 UI 렌더링 함수
    return (
        <Card
            elevation={Elevation.ONE}
            className="dark:!bg-zinc-900 p-0 overflow-hidden rounded-xl border-none mb-4"
        >
            <div className={`flex transition-all duration-300 ${isFixed
                ? `fixed top-[81px] left-0 w-full z-30 !bg-white dark:!bg-zinc-900/90 backdrop-blur shadow-md px-4 py-0`
                : "p-0"
                }`}>
                {/* 왼쪽: 주식 정보 */}
                <div className="w-7/12">
                    {/* 고정 상태(isFixed)가 아닐 때만 시장명 표시 */}
                    {!isFixed && (
                        <Tag intent="primary" minimal className="text-[10px] !text-zinc-500">
                            {config.marketName}
                        </Tag>
                    )}
                    <h2 className="text-xl md:!text-2xl font-black dark:!text-white">
                        {config.prdtName}
                    </h2>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-xl font-mono font-bold !text-blue-600 dark:!text-blue-400 underline decoration-dotted decoration-2">
                            {config.price}
                        </span>
                        <span className="text-xs !text-zinc-500">{config.currency}</span>
                    </div>
                </div>

                {/* 오른쪽: 미니 차트 */}
                <div className="w-5/12 h-16">
                    <LineChart
                        data_array={[{
                            name: "Price",
                            data: config.chartData,
                            color: config.color
                        }]}
                        category_array={config.chartCategory}
                        height={isFixed ? 70 : 80}
                        show_yaxis_label={false}
                        legend_disable
                    />
                </div>
            </div>
            {isFixed && <div className="h-56" />}
        </Card>
    );
};