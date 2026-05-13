"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Globe,
    TrendingUp,
    RefreshCw,
    Key,
    Info,
    ChevronUp,
    ChevronDown,
    BarChart3,
    Send,
    ChevronsUpDown,
} from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

// --- Helpers ---
const getFieldValue = (item: any, key: string) => {
    const map: any = {
        name: item.prdt_name || item.ovrs_item_name || item.itms_nm,
        price: item.prpr || item.ovrs_now_pric1 || 0,
        avg_price: item.pchs_avg_pric || item.pchs_avg_pric1 || 0,
        qty: item.hldg_qty || item.ccld_qty_smtl1 || 0,
        evlu_amt: item.evlu_amt || item.frcr_evlu_amt2 || 0,
        profit_rt: item.evlu_pfls_rt || item.evlu_pfls_rt1 || 0,
        pchs_amt: item.pchs_amt || item.frcr_pchs_amt || 0,
    };
    return map[key];
};

interface InquireBalanceResultProps {
    balanceKey: any;
    setBalanceKey: any;
    kiBalance: any;
    reqGetInquireBalance: any;
    reqGetUsCapital?: any;
    kakaoMemberList?: any;
}

export default function InquireBalanceResult(props: InquireBalanceResultProps) {
    const { data: session } = useSession();
    const dispatch = useAppDispatch();

    const isUs = !!props.kiBalance?.output3 || !!props.kiBalance?.output1?.[0]?.ovrs_item_name;
    const exRate = Number(props.kiBalance?.output2?.[0]?.frst_bltn_exrt || 0);

    const evlu_smtl = Number(props.kiBalance?.output3?.evlu_amt_smtl ?? props.kiBalance?.output2?.[0]?.evlu_amt_smtl_amt ?? 0);
    const pchs_smtl = Number(props.kiBalance?.output3?.pchs_amt_smtl ?? props.kiBalance?.output2?.[0]?.pchs_amt_smtl_amt ?? 0);
    const cash = Number(props.kiBalance?.output3?.frcr_use_psbl_amt ?? props.kiBalance?.output2?.[0]?.dnca_tot_amt ?? 0);
    const totalProfitRate = pchs_smtl === 0 ? 0 : (evlu_smtl / pchs_smtl * 100 - 100);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlKey = searchParams.get("key");

    useEffect(() => {
        if (urlKey) {
            props.setBalanceKey(urlKey);
        } else if (session?.user?.id) {
            router.replace(`${pathname}?key=${session.user.id}`);
        }
    }, [urlKey, session?.user?.id]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 md:p-8 transition-colors">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* 헤더 섹션 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white">
                            {isUs ? <Globe size={24} /> : <TrendingUp size={24} />}
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight dark:text-white">
                                {isUs ? "미국 주식 실시간 잔고" : "국내 주식 실시간 잔고"}
                            </h1>
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Real-time Portfolio</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded text-[10px] font-black text-zinc-600 dark:text-zinc-400">
                            {isUs ? "USD" : "KRW"}
                        </span>
                        <button
                            disabled={props.kiBalance.state === "pending"}
                            onClick={() => dispatch(props.reqGetInquireBalance(props.balanceKey))}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                        >
                            <RefreshCw size={16} className={props.kiBalance.state === "pending" ? "animate-spin" : ""} />
                            새로고침
                        </button>
                    </div>
                </div>

                {/* 메인 카드 */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    {/* 마스터 모드 선택기 */}
                    {session?.user?.name === process.env.NEXT_PUBLIC_MASTER && (
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase">
                                <Key size={12} /> MASTER MODE
                            </div>
                            <div className="relative inline-block">
                                <select
                                    value={props.balanceKey}
                                    onChange={(e) => props.setBalanceKey(e.target.value)}
                                    className="appearance-none bg-transparent pl-2 pr-8 py-1 font-bold text-sm focus:outline-none dark:text-white cursor-pointer"
                                >
                                    {Array.isArray(props.kakaoMemberList?.list) ? (
                                        props.kakaoMemberList.list.map((item: any) => (
                                            <option key={item.key} value={String(item.key)} className="dark:bg-zinc-900">
                                                {item.value?.nickname} ({item.key})
                                            </option>
                                        ))
                                    ) : (
                                        <option value="">계좌 목록 로딩 중...</option>
                                    )}
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                            </div>
                        </div>
                    )}

                    {/* 요약 데이터 그리드 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-zinc-100 dark:divide-zinc-800">
                        <SummaryItem
                            label="평가 손익"
                            value={`${totalProfitRate.toFixed(2)}%`}
                            subValue={`₩${Math.round(evlu_smtl - pchs_smtl).toLocaleString()}`}
                            colorClass={totalProfitRate >= 0 ? "text-rose-500" : "text-blue-500"}
                        />
                        <SummaryItem
                            label="총 평가금액"
                            value={`₩${evlu_smtl.toLocaleString()}`}
                            subValue={`매입: ₩${pchs_smtl.toLocaleString()}`}
                        />
                        <SummaryItem
                            label="순자산 (NAV)"
                            value={`₩${(evlu_smtl + cash).toLocaleString()}`}
                            subValue={isUs && exRate ? `약 $${Math.round((evlu_smtl + cash) / exRate).toLocaleString()}` : ""}
                            colorClass="text-indigo-500"
                        />
                    </div>
                </div>

                {/* 알림 배너 */}
                {props.kiBalance.msg1 && (
                    <div className="flex items-start gap-3 p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        <Info size={18} className="text-zinc-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                            {props.kiBalance.msg1}
                        </p>
                    </div>
                )}

                {/* 테이블 섹션 */}
                <div className="overflow-hidden bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <SortableBalanceTable inventoryData={props.kiBalance.output1 || []} isUs={isUs} />
                </div>
            </div>
        </div>
    );
}

function SummaryItem({ label, value, subValue, colorClass = "dark:text-white" }: any) {
    return (
        <div className="p-8 text-center md:text-left">
            <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">{label}</span>
            <div className={`text-3xl font-black tracking-tighter mb-1 ${colorClass}`}>{value}</div>
            <span className="text-xs font-bold text-zinc-500">{subValue}</span>
        </div>
    );
}

function SortableBalanceTable({ inventoryData, isUs }: { inventoryData: any[], isUs: boolean }) {
    const [sortConfig, setSortConfig] = useState<any>({ key: "evlu_amt", direction: "desc" });

    const sortedItems = useMemo(() => {
        let items = [...inventoryData];
        items.sort((a, b) => {
            const aVal = Number(getFieldValue(a, sortConfig.key));
            const bVal = Number(getFieldValue(b, sortConfig.key));
            return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        });
        return items;
    }, [inventoryData, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === "desc" ? "asc" : "desc" });
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                        <th className="p-4 text-center w-16 text-[10px] font-black text-zinc-400 uppercase">#</th>
                        <TableHeader label="종목명" sortKey="name" currentConfig={sortConfig} onSort={handleSort} />
                        <TableHeader label="현재가" sortKey="price" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <TableHeader label="수익률" sortKey="profit_rt" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <TableHeader label="매입금액" sortKey="pchs_amt" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <TableHeader label="평가금액" sortKey="evlu_amt" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <th className="p-4 text-center text-[10px] font-black text-zinc-400 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {sortedItems.map((item, idx) => {
                        const profitRt = Number(getFieldValue(item, "profit_rt"));
                        return (
                            <tr key={idx} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="p-4 text-center font-mono text-xs text-zinc-400">{idx + 1}</td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm dark:text-zinc-100 leading-none mb-1 group-hover:text-blue-600 transition-colors">
                                            {getFieldValue(item, "name")}
                                        </span>
                                        <span className="text-[10px] font-mono text-zinc-500">{item.pdno || item.ovrs_pdno}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-right font-mono text-sm font-bold dark:text-zinc-300">
                                    ₩{Number(getFieldValue(item, "price")).toLocaleString()}
                                </td>
                                <td className={`p-4 text-right font-mono text-sm font-black ${profitRt >= 0 ? "text-rose-500" : "text-blue-500"}`}>
                                    {profitRt >= 0 ? "+" : ""}{profitRt.toFixed(2)}%
                                </td>
                                <td className="p-4 text-right font-mono text-sm font-bold text-zinc-600 dark:text-zinc-400">
                                    ₩{Number(getFieldValue(item, "pchs_amt")).toLocaleString()}
                                </td>
                                <td className="p-4 text-right font-mono text-sm font-black dark:text-white">
                                    ₩{Number(getFieldValue(item, "evlu_amt")).toLocaleString()}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-500 transition-colors">
                                            <BarChart3 size={16} />
                                        </button>
                                        <button className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 transition-colors">
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TableHeader({ label, sortKey, align = "left", currentConfig, onSort }: any) {
    const isActive = currentConfig.key === sortKey;
    return (
        <th
            className={`p-4 cursor-pointer select-none transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${align === "right" ? "text-right" : "text-left"}`}
            onClick={() => onSort(sortKey)}
        >
            <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-blue-600" : "text-zinc-400"}`}>
                    {label}
                </span>
                <div className="text-zinc-300 dark:text-zinc-600">
                    {isActive ? (
                        currentConfig.direction === "asc" ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                    ) : (
                        <ChevronsUpDown size={14} />
                    )}
                </div>
            </div>
        </th>
    );
}