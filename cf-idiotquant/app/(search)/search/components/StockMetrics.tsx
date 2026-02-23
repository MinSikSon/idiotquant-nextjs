"use client";
import React from "react";
import { formatKoreanUnit, ONE_HUNDRED_MILLION } from "../utils/financeCalc";

export const StockMetrics = ({ data, isUs }: { data: any; isUs: boolean }) => {
    // 데이터 존재 여부 및 한국 주식(KR) 여부 확인
    if (isUs || !data?.kiPrice?.output || !data?.kiChart?.output1) return null;

    const p = data.kiPrice.output;
    const c = data.kiChart.output1;

    // 헬퍼: 숫자 안전 변환 (NaN 방지)
    const n = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    // 기존 page.tsx의 시가총액 수식: 현재가 * 상장주식수
    const calculatedMarketCap = n(c.stck_prpr) * n(c.lstn_stcn);

    // 기존 page.tsx의 대금/시총 수식: (100 * 거래대금 / (현재가 * 주식수))
    // 참고: kiPrice.output.acml_tr_pbmn은 당일 누적 거래대금(원 단위)
    const turnoverRatio = calculatedMarketCap > 0
        ? (100 * n(p.acml_tr_pbmn) / calculatedMarketCap).toFixed(3)
        : "0";

    const metrics = [
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

    return (
        <div className="mb-4 bg-white dark:bg-zinc-900 border-y dark:border-zinc-800 py-1.5 shadow-sm">
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