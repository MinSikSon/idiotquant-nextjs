"use client";

import React, { useMemo } from "react";
import LineChart from "@/components/LineChart";
import { cn } from "@/lib/utils";

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
    <div 
      className={cn(
        "w-full transition-all duration-300 ease-in-out",
        isFixed 
          ? "fixed top-[66px] left-0 z-[40] animate-in fade-in slide-in-from-top-2" 
          : "relative mt-4"
      )}
    >
      <div
        className={cn(
          "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 transition-all",
          isFixed 
            ? "rounded-none border-b shadow-lg backdrop-blur-md bg-white/90 dark:bg-zinc-900/90" 
            : "rounded-2xl border shadow-sm mx-auto"
        )}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2 md:px-8">
          {/* 종목 정보 영역 */}
          <div className="flex items-center gap-4 flex-none">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-black dark:text-white truncate transition-all",
                  isFixed ? "text-sm md:text-base" : "text-base md:text-xl"
                )}>
                  {config.prdtName}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-tighter">
                  {config.marketName}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  "font-mono font-black text-blue-600 dark:text-blue-400 transition-all",
                  isFixed ? "text-base md:text-lg" : "text-xl md:text-2xl"
                )}>
                  {config.price}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  {config.currency}
                </span>
              </div>
            </div>
          </div>

          {/* 차트 영역 */}
          <div className={cn(
            "flex-1 ml-4 md:ml-8 max-w-[450px] transition-all",
            isFixed ? "h-10 opacity-80" : "h-14 opacity-100"
          )}>
            {config.chartData.length > 0 && (
              <LineChart
                data_array={[{ name: "Price", data: config.chartData, color: config.color }]}
                category_array={config.chartCategory}
                height={isFixed ? 40 : 56}
                show_yaxis_label={false}
                legend_disable
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};