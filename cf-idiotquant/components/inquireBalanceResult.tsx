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
    X,
    Loader2,
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

function formatValue(value: number | string, type: "MONEY" | "QTY") {
    const num = Number(value);
    if (isNaN(num)) return "0";

    if (type === "MONEY") {
        return `₩${Math.floor(num).toLocaleString()}`;
    }
    if (type === "QTY") {
        return num % 1 === 0 ? num.toLocaleString() : num.toFixed(4);
    }
    return num.toLocaleString();
}

interface InquireBalanceResultProps {
    balanceKey: any;
    setBalanceKey: any;
    kiBalance: any;
    reqGetInquireBalance: any;
    reqGetInquireCcnl?: any;
    reqGetInquireNccs?: any;
    reqGetUsCapital?: any;
    kiOrderCash?: any;
    reqPostOrderCash?: any;
    kakaoTotal?: any;
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

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<any>(null);

    useEffect(() => {
        if (urlKey) {
            props.setBalanceKey(urlKey);
        } else if (session?.user?.id) {
            router.replace(`${pathname}?key=${session.user.id}`);
        }
    }, [urlKey, session?.user?.id]);

    useEffect(() => {
        if (props.kiOrderCash?.state === "fulfilled") {
            const serverMsg = props.kiOrderCash?.data?.msg1 || props.kiOrderCash?.data?.rt_msg || "주문 요청이 완료되었습니다.";
            alert(`[주문 처리 결과]\n${serverMsg}`);
            
            setIsOrderModalOpen(false);
            dispatch(props.reqGetInquireBalance(props.balanceKey));
            if (props.reqGetInquireCcnl) dispatch(props.reqGetInquireCcnl(props.balanceKey));
            if (props.reqGetInquireNccs) dispatch(props.reqGetInquireNccs(props.balanceKey));
            if (props.reqGetUsCapital) dispatch(props.reqGetUsCapital(props.balanceKey));
        } else if (props.kiOrderCash?.state === "rejected") {
            const errorMsg = props.kiOrderCash?.error || props.kiOrderCash?.data?.msg1 || "알 수 없는 오류가 발생했습니다.";
            alert(`주문 실패:\n${errorMsg}`);
        }
    }, [props.kiOrderCash?.state]);

    const handleOpenOrderModal = (stock: any) => {
        setSelectedStock(stock);
        setIsOrderModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* 헤더 섹션 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-xl text-white">
                        {isUs ? <Globe size={20} /> : <TrendingUp size={20} />}
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight dark:text-white">
                            {isUs ? "미국 주식 실시간 잔고 (원화 환산)" : "국내 주식 실시간 잔고"}
                        </h1>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Real-time Portfolio</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded text-[10px] font-black text-zinc-600 dark:text-zinc-400">
                        {isUs ? "KRW (고시환율 정산)" : "KRW"}
                    </span>
                    <button
                        disabled={props.kiBalance.state === "pending"}
                        onClick={() => {
                            dispatch(props.reqGetInquireBalance(props.balanceKey));
                            if (props.reqGetInquireCcnl) dispatch(props.reqGetInquireCcnl(props.balanceKey));
                            if (props.reqGetInquireNccs) dispatch(props.reqGetInquireNccs(props.balanceKey));
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                        <RefreshCw size={14} className={props.kiBalance.state === "pending" ? "animate-spin" : ""} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* 메인 요약 카드 */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
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

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-zinc-100 dark:divide-zinc-800">
                    <SummaryItem
                        label="평가 손익률"
                        value={`${totalProfitRate >= 0 ? "+" : ""}${totalProfitRate.toFixed(2)}%`}
                        subValue={`손익 합계: ${formatValue(evlu_smtl - pchs_smtl, "MONEY")}`}
                        colorClass={totalProfitRate >= 0 ? "text-rose-500" : "text-blue-500"}
                    />
                    <SummaryItem
                        label="총 평가금액"
                        value={formatValue(evlu_smtl, "MONEY")}
                        subValue={`매입 합계: ${formatValue(pchs_smtl, "MONEY")}`}
                    />
                    <SummaryItem
                        label="순자산 (NAV)"
                        value={formatValue(evlu_smtl + cash, "MONEY")}
                        subValue={isUs && exRate ? `추정 달러잔고: 약 $${Math.round((evlu_smtl + cash) / exRate).toLocaleString()}` : `예수금: ${formatValue(cash, "MONEY")}`}
                        colorClass="text-indigo-500"
                    />
                </div>
            </div>

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
                <SortableBalanceTable 
                    inventoryData={props.kiBalance.output1 || []} 
                    isUs={isUs} 
                    onOpenOrder={handleOpenOrderModal}
                />
            </div>

            {/* 주문 처리 모달 컴포넌트 */}
            {isOrderModalOpen && selectedStock && (
                <OrderModal
                    isUs={isUs}
                    stock={selectedStock}
                    balanceKey={props.balanceKey}
                    kiOrderCash={props.kiOrderCash}
                    reqPostOrderCash={props.reqPostOrderCash}
                    onClose={() => setIsOrderModalOpen(false)}
                />
            )}
        </div>
    );
}

function SummaryItem({ label, value, subValue, colorClass = "dark:text-white" }: any) {
    return (
        <div className="p-6 text-center md:text-left">
            <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">{label}</span>
            <div className={`text-2xl font-black tracking-tighter mb-1 ${colorClass}`}>{value}</div>
            <span className="text-xs font-bold text-zinc-500">{subValue}</span>
        </div>
    );
}

function SortableBalanceTable({ inventoryData, isUs, onOpenOrder }: { inventoryData: any[], isUs: boolean, onOpenOrder: (stock: any) => void }) {
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
                        <TableHeader label="보유수량" sortKey="qty" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <TableHeader label="현재가 / 매입단가 (KRW)" sortKey="price" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <TableHeader label="수익률" sortKey="profit_rt" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <TableHeader label="매입금액" sortKey="pchs_amt" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <TableHeader label="평가금액" sortKey="evlu_amt" align="right" currentConfig={sortConfig} onSort={handleSort} />
                        <th className="p-4 text-center text-[10px] font-black text-zinc-400 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {sortedItems.map((item, idx) => {
                        const profitRt = Number(getFieldValue(item, "profit_rt"));
                        const price = Number(getFieldValue(item, "price"));
                        const avgPrice = Number(getFieldValue(item, "avg_price"));
                        const qty = getFieldValue(item, "qty");

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
                                    {formatValue(qty, "QTY")}
                                </td>
                                <td className="p-4 text-right font-mono text-sm space-y-0.5">
                                    <div className="font-black dark:text-zinc-200">
                                        {formatValue(price, "MONEY")}
                                    </div>
                                    <div className="text-[11px] text-zinc-400 font-medium">
                                        {formatValue(avgPrice, "MONEY")}
                                    </div>
                                </td>
                                <td className={`p-4 text-right font-mono text-sm font-black ${profitRt >= 0 ? "text-rose-500" : "text-blue-500"}`}>
                                    {profitRt >= 0 ? "+" : ""}{profitRt.toFixed(2)}%
                                </td>
                                <td className="p-4 text-right font-mono text-sm font-bold text-zinc-600 dark:text-zinc-400">
                                    {formatValue(getFieldValue(item, "pchs_amt"), "MONEY")}
                                </td>
                                <td className="p-4 text-right font-mono text-sm font-black dark:text-white">
                                    {formatValue(getFieldValue(item, "evlu_amt"), "MONEY")}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-500 transition-colors">
                                            <BarChart3 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onOpenOrder(item)}
                                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 transition-colors"
                                        >
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

// --- 수동 주문 모달 서브 컴포넌트 ---
interface OrderModalProps {
    isUs: boolean;
    stock: any;
    balanceKey: string;
    kiOrderCash: any;
    reqPostOrderCash: any;
    onClose: () => void;
}

function OrderModal({ isUs, stock, balanceKey, kiOrderCash, reqPostOrderCash, onClose }: OrderModalProps) {
    const dispatch = useAppDispatch();
    const [buyOrSell, setBuyOrSell] = useState<"buy" | "sell">("buy");
    const [price, setPrice] = useState(String(getFieldValue(stock, "price")));
    const [qty, setQty] = useState("1");

    const pdno = stock.pdno || stock.ovrs_pdno;
    const name = getFieldValue(stock, "name");
    
    // 🔥 [핵심 교정] 한투 API 해외주식 잔고에서 내려주는 거래소 코드('ovrs_excg_cd') 추출
    // 만약 국내 주식이거나 값이 비어있다면 디폴트로 'NASD' 설정
    const excgCd = stock.ovrs_excg_cd || (isUs ? "NASD" : "");

    const handleSubmitOrder = () => {
        if (!reqPostOrderCash) {
            alert("주문 액션 프로퍼티(reqPostOrderCash)가 구성되지 않았습니다.");
            return;
        }
        if (!price || Number(price) <= 0 || !qty || Number(qty) <= 0) {
            alert("정확한 가격과 수량을 입력해 주세요.");
            return;
        }

        // 🔥 Slice 스키마에 맞게 excg_cd 파라미터 추가 전달
        dispatch(reqPostOrderCash({
            key: balanceKey,
            PDNO: pdno,
            buyOrSell: buyOrSell,
            excg_cd: excgCd, 
            price: String(price), // Thunk 스펙에 맞춰 string으로 변환해 전달
            qty: Number(qty)
        }));
    };

    const isPending = kiOrderCash?.state === "pending";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-2xl space-y-6 relative mx-4">
                
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Manual Trading</span>
                        <h3 className="text-xl font-black dark:text-white mt-0.5">{name}</h3>
                        <p className="text-xs text-zinc-400 font-mono">
                            {pdno} • {isUs ? `미국(US) [${excgCd}]` : "국내(KR)"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button
                        onClick={() => setBuyOrSell("buy")}
                        className={`py-2.5 text-sm font-black rounded-lg transition-all ${buyOrSell === "buy" ? "bg-rose-500 text-white shadow-md" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
                    >
                        매수 (BUY)
                    </button>
                    <button
                        onClick={() => setBuyOrSell("sell")}
                        className={`py-2.5 text-sm font-black rounded-lg transition-all ${buyOrSell === "sell" ? "bg-blue-600 text-white shadow-md" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
                    >
                        매도 (SELL)
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">주문 가격 (KRW 환산값 기준)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₩</span>
                            <input
                                type="number"
                                step="1"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 pl-8 pr-4 py-3 rounded-xl font-mono font-bold text-sm focus:outline-none focus:border-blue-600 dark:text-white"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">주문 수량 (QTY)</label>
                        <input
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 px-4 py-3 rounded-xl font-mono font-bold text-sm focus:outline-none focus:border-blue-600 dark:text-white"
                            placeholder="1"
                            min="1"
                        />
                    </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-400">예상 총 금액</span>
                    <span className="font-mono font-black dark:text-white">
                        ₩{((Number(price) || 0) * (Number(qty) || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>

                <button
                    disabled={isPending}
                    onClick={handleSubmitOrder}
                    className={`w-full py-3.5 rounded-xl text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg ${buyOrSell === "buy" ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"} disabled:bg-zinc-300 dark:disabled:bg-zinc-700`}
                >
                    {isPending ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            주문 처리 중...
                        </>
                    ) : (
                        <>
                            <Send size={16} />
                            {buyOrSell === "buy" ? "매수 주문 제출" : "매도 주문 제출"}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}