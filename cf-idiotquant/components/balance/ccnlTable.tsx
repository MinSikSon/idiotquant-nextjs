"use client";

import React from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tooltip from "@radix-ui/react-tooltip";
import { KoreaInvestmentOverseasCcnl, KoreaInvestmentOverseasCcnlOutput } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";

interface Props {
    data: KoreaInvestmentOverseasCcnl;
    className?: string;
}

const HEADERS: { key: keyof KoreaInvestmentOverseasCcnlOutput | "actions"; label: string; small?: boolean }[] = [
    { key: "ord_dt", label: "주문일자", small: true },
    { key: "ord_tmd", label: "주문시각", small: true },
    { key: "odno", label: "주문번호" },
    { key: "orgn_odno", label: "원주문번호" },
    { key: "prdt_name", label: "상품명" },
    { key: "sll_buy_dvsn_cd_name", label: "매도/매수" },
    { key: "tr_mket_name", label: "거래시장" },
    { key: "tr_crcy_cd", label: "통화" },
    { key: "tr_natn_name", label: "국가" },
    { key: "ft_ord_qty", label: "주문수량" },
    { key: "ft_ccld_qty", label: "체결수량" },
    { key: "nccs_qty", label: "미체결수량" },
    { key: "ft_ord_unpr3", label: "주문단가" },
    { key: "ft_ccld_unpr3", label: "체결단가" },
    { key: "ft_ccld_amt3", label: "체결금액" },
    { key: "prcs_stat_name", label: "처리상태" },
    { key: "rjct_rson_name", label: "거부사유" },
    { key: "loan_dt", label: "대출일자", small: true },
    { key: "usa_amk_exts_rqst_yn", label: "미국애프터마켓연장" },
    { key: "splt_buy_attr_name", label: "분할속성" },
    { key: "actions", label: "동작" },
];

export default function OverseasCcnlTable({ data, className = "" }: Props) {
    const rows = data?.output ?? [];

    return (
        <div className={`w-full ${className}`}>
            {/* 상태 바 */}
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-600">[주문체결내역]</div>
                <div className="text-sm text-slate-600">상태: <span className="font-medium">{data?.state}</span></div>
                <div className="text-sm text-slate-500">응답코드: {data?.rt_cd} • {data?.msg1}</div>
            </div>

            <ScrollArea.Root className="rounded-md border border-slate-200">
                <ScrollArea.Viewport className="w-full h-[420px]">
                    <div className="min-w-[1200px]">
                        <table className="w-full table-auto border-collapse">
                            <thead>
                                <tr>
                                    {HEADERS.map((h, idx) => (
                                        <th key={String(h.key)} className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider bg-white border-b sticky top-0 z-20`} style={idx === 0 ? { position: "sticky", left: 0, zIndex: 30 } : {}}>
                                            {h.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={HEADERS.length} className="p-6 text-center text-sm text-slate-500">
                                            결과가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, rIndex) => (
                                        <tr key={`${row.odno ?? rIndex}-${rIndex}`} className={rIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                            {HEADERS.map((h, cIndex) => {
                                                if (h.key === "actions") {
                                                    return (
                                                        <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-2 whitespace-nowrap border-b">
                                                            <div className="flex gap-2">
                                                                <button className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200">상세</button>
                                                                <button className="text-xs px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100">취소</button>
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                const key = h.key as keyof KoreaInvestmentOverseasCcnlOutput;
                                                const value = row[key] ?? "-";
                                                const small = !!h.small;

                                                return (
                                                    <td key={`cell-${rIndex}-${cIndex}`} className="px-3 py-2 align-top border-b" style={cIndex === 0 ? { position: "sticky", left: 0, zIndex: 10, background: rIndex % 2 === 0 ? "white" : "#F8FAFC" } : {}}>
                                                        <Tooltip.Root>
                                                            <Tooltip.Trigger asChild>
                                                                <div className="max-w-[220px] truncate" title={String(value)}>
                                                                    <div className={`text-sm ${small ? "text-xs text-slate-500" : "text-sm text-slate-700"}`}>{String(value)}</div>
                                                                </div>
                                                            </Tooltip.Trigger>
                                                            <Tooltip.Portal>
                                                                <Tooltip.Content side="top" align="center" className="rounded-md px-2 py-1 text-xs bg-slate-800 text-white">
                                                                    {String(value)}
                                                                    <Tooltip.Arrow className="fill-current text-slate-800" />
                                                                </Tooltip.Content>
                                                            </Tooltip.Portal>
                                                        </Tooltip.Root>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea.Viewport>

                <ScrollArea.Scrollbar orientation="horizontal" className="flex select-none touch-none p-0.5 bg-slate-100" />
                <ScrollArea.Scrollbar orientation="vertical" className="flex select-none touch-none p-0.5 bg-slate-100" />
                <ScrollArea.Corner />
            </ScrollArea.Root>
        </div>
    );
}
