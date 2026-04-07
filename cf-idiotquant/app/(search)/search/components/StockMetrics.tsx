"use client";
import React from "react";
import { formatKoreanUnit } from "../utils/financeCalc";

export const StockMetrics = ({ data, isUs }: { data: any; isUs: boolean }) => {
    // 데이터 존재 여부 확인
    if (!data) return null;

    // 헬퍼: 숫자 안전 변환 (NaN 방지)
    const n = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    let metrics = [];

    if (isUs) {
        // --- 미국 주식 데이터 처리 (usDetail, usDaily, usSearchInfo) ---
        const detail = data.usDetail?.output;
        const daily = data.usDaily?.output2?.[0]; // 최근 영업일 데이터
        const search = data.usSearchInfo?.output;

        if (!detail || !search) return null;

        // 미국 시가총액 (usDetail.mcap은 보통 백만달러 단위인 경우가 많으나, 
        // 제공해주신 tomv(총 시가총액 추정치) 또는 직접 계산을 활용)
        const usMarketCap = n(detail.last) * n(search.lstg_stck_num);
        
        // 대금/시총 계산 (tamt: 거래대금)
        const turnoverRatio = usMarketCap > 0
            ? (100 * n(detail.tamt) / usMarketCap).toFixed(3)
            : "0";

        metrics = [
            { label: "PER", val: detail.perx ? `${detail.perx}배` : "-" },
            { label: "PBR", val: detail.pbrx ? `${detail.pbrx}배` : "-" },
            { label: "EPS", val: n(detail.epsx) ? `$${n(detail.epsx).toLocaleString()}` : "-" },
            { label: "BPS", val: n(detail.bpsx) ? `$${n(detail.bpsx).toLocaleString()}` : "-" },
            { label: "52주 최고", val: n(detail.h52p) ? `$${n(detail.h52p).toLocaleString()}` : "-", sub: detail.h52d },
            { label: "52주 최저", val: n(detail.l52p) ? `$${n(detail.l52p).toLocaleString()}` : "-", sub: detail.l52d },
            { label: "시가총액", val: `$${formatKoreanUnit(usMarketCap)}` },
            { label: "상장주식수", val: n(search.lstg_stck_num) ? `${n(search.lstg_stck_num).toLocaleString()}개` : "-" },
            { label: "거래량", val: n(detail.tvol) ? `${n(detail.tvol).toLocaleString()}회` : "-" },
            { label: "거래대금", val: `$${formatKoreanUnit(n(detail.tamt))}` },
            { label: "대금/시총", val: `${turnoverRatio}%`, highlight: true },
        ];
    } else {
        // --- 한국 주식 데이터 처리 (기존 로직 유지) ---
        if (!data.kiPrice?.output || !data.kiChart?.output1) return null;
        
        const p = data.kiPrice.output;
        const c = data.kiChart.output1;

        const calculatedMarketCap = n(c.stck_prpr) * n(c.lstn_stcn);
        const turnoverRatio = calculatedMarketCap > 0
            ? (100 * n(p.acml_tr_pbmn) / calculatedMarketCap).toFixed(3)
            : "0";

        metrics = [
            { label: "PER", val: p.per ? `${p.per}배` : "-" },
            { label: "PBR", val: p.pbr ? `${p.pbr}배` : "-" },
            { label: "EPS", val: n(p.eps) ? `${n(p.eps).toLocaleString()}원` : "-" },
            { label: "BPS", val: n(p.bps) ? `${n(p.bps).toLocaleString()}원` : "-" },
            { label: "52주 최고", val: n(p.w52_hgpr) ? `${n(p.w52_hgpr).toLocaleString()}원` : "-", sub: p.w52_hgpr_date },
            { label: "52주 최저", val: n(p.w52_lwpr) ? `${n(p.w52_lwpr).toLocaleString()}원` : "-", sub: p.dryy_lwpr_date },
            { label: "시가총액", val: formatKoreanUnit(calculatedMarketCap) },
            { label: "상장주식수", val: n(c.lstn_stcn) ? `${n(c.lstn_stcn).toLocaleString()}개` : "-" },
            { label: "거래량", val: n(p.acml_vol) ? `${n(p.acml_vol).toLocaleString()}회` : "-" },
            { label: "거래대금", val: formatKoreanUnit(n(p.acml_tr_pbmn)) },
            { label: "대금/시총", val: `${turnoverRatio}%`, highlight: true },
        ];
    }

    return (
        <div className="my-4 bg-white dark:bg-zinc-900 border-y dark:border-zinc-800 py-1.5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1 px-3">
                {metrics.map((m, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-gray-50 dark:border-zinc-800/40 pb-0.5">
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium shrink-0">
                            {m.label}
                        </span>
                        <div className="flex flex-col items-end">
                            <span className={`text-[11px] font-mono font-bold ${m.highlight ? "text-blue-600 dark:text-blue-400" : "text-zinc-800 dark:text-zinc-200"}`}>
                                {m.val}
                            </span>
                            {m.sub && (
                                <span className="text-[8px] text-zinc-400 font-mono -mt-1 scale-[0.9] origin-right">
                                    {m.sub}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};