"use client";

import React, { useMemo } from "react";
import { Card, Elevation, Tag } from "@blueprintjs/core";
import LineChart from "@/components/LineChart";

interface StockHeaderProps {
    data: any;
    isUs: boolean;
    isFixed: boolean;
}

export const StockHeader = ({ data, isUs, isFixed }: StockHeaderProps) => {
    const { kiChart, kiPrice, usSearchInfo, usDetail, usDaily } = data;

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
            chartData: kiChart?.output2?.map((i: any) => Number(i.stck_clpr)).reverse() || [],
            chartCategory: kiChart?.output2?.map((i: any) => i.stck_bsop_date).reverse() || [],
            color: "#6366f1"
        };
    }, [isUs, data]);

    if (!config.prdtName) return null;

    return (
        <div className={`w-full transition-all duration-300 ${isFixed ? "fixed top-[70px] left-0 z-[45]" : "relative mt-4"}`}>
            <Card
                elevation={Elevation.ONE}
                className={`
                    border-none !p-0 !bg-white dark:!bg-zinc-900 
                    ${isFixed ? "rounded-none border-b dark:border-zinc-800 shadow-md" : "rounded-2xl shadow-sm"}
                `}
            >
                <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-1 md:px-8">
                    <div className="flex items-center gap-4 flex-none pt-1">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-sm md:text-lg font-black dark:text-white truncate max-w-[150px]">
                                    {config.prdtName}
                                </span>
                                <Tag minimal intent="primary" className="!text-[8px] font-bold opacity-70">
                                    {config.marketName}
                                </Tag>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg md:text-xl font-mono font-black text-blue-600 dark:text-blue-400">
                                    {config.price}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">{config.currency}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 h-10 md:h-14 ml-8 max-w-[400px]">
                        {config.chartData.length > 0 && (
                            <LineChart
                                data_array={[{ name: "Price", data: config.chartData, color: config.color }]}
                                category_array={config.chartCategory}
                                height={isFixed ? 45 : 50}
                                show_yaxis_label={false}
                                legend_disable
                            />
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};