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

    if (isUs) {
        return (
            <Card elevation={Elevation.ONE} className="dark:!bg-zinc-900 p-0 overflow-hidden rounded-xl border-none mb-4">
                <div className={`flex transition-all duration-300 ${isFixed ? "fixed top-[81px] left-0 w-full z-20 !bg-white/90 dark:!bg-zinc-900/90 backdrop-blur shadow-md px-4 py-0" : "p-4"}`}>
                    <div className="w-7/12">
                        {!isFixed && <Tag intent="primary" minimal className="text-[10px] !text-zinc-500">{usSearchInfo?.output?.tr_mket_name}</Tag>}
                        <h2 className="text-xl md:!text-2xl font-black dark:!text-white">{usSearchInfo?.output?.prdt_name}</h2>
                        <div className="text-xl font-mono font-bold !text-blue-600 dark:!text-blue-400 underline decoration-dotted decoration-2">
                            {Number(usDetail?.output?.last).toFixed(2)} <span className="text-xs">{usDetail?.output?.curr}</span>
                        </div>
                    </div>
                    <div className="w-5/12 h-16">
                        <LineChart
                            data_array={[{ name: "Price", data: usDaily?.output2?.map((i: any) => i.clos).reverse(), color: "#818cf8" }]}
                            category_array={usDaily?.output2?.map((i: any) => i.xymd).reverse()}
                            height={isFixed ? 60 : 80} show_yaxis_label={false} legend_disable
                        />
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card elevation={Elevation.ONE} className="dark:!bg-zinc-900 p-0 overflow-hidden rounded-xl border-none mb-4">
            <div className={`flex transition-all duration-300 ${isFixed ? "fixed top-[81px] left-0 w-full z-20 !bg-white/90 dark:!bg-zinc-900/90 backdrop-blur shadow-md px-4 py-0" : "p-4"}`}>
                <div className="w-7/12">
                    {!isFixed && <div className="text-[10px] !text-zinc-500">{kiPrice?.output?.rprs_mrkt_kor_name}</div>}
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl md:!text-2xl font-black dark:!text-white">{kiChart?.output1?.hts_kor_isnm}</h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl font-mono font-bold !text-blue-600 dark:!text-blue-400 underline decoration-dotted decoration-2">
                            {Number(kiChart?.output1?.stck_prpr).toLocaleString()}
                        </span>
                        <span className="text-xs !text-zinc-500">원</span>
                    </div>
                </div>
                <div className="w-5/12 h-16">
                    <LineChart
                        data_array={[{ name: "Price", data: kiChart?.output2?.map((i: any) => i.stck_oprc).reverse(), color: "#6366f1" }]}
                        category_array={kiChart?.output2?.map((i: any) => i.stck_bsop_date).reverse()}
                        height={isFixed ? 60 : 80} show_yaxis_label={false} legend_disable
                    />
                </div>
            </div>
        </Card>
    );
};