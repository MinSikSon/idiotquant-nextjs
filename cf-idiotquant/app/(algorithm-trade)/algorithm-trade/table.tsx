"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card,
    Button,
    HTMLTable,
    Tag,
    Icon,
    Intent,
    Callout,
    Section,
    Position,
    Tooltip
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import StrategyDescription from "@/components/strategyParser";

// --- Types ---
type CandidateInfo = {
    symbol?: string;
    name?: string;
    condition?: Record<string, any> | null;
    ncavRatio?: string | number;
    [k: string]: any;
};

type Strategy = {
    strategyId: string;
    key: string;
    name: string;
    asOfDate: string;
    kvFilter: Record<string, any>;
    universe: string;
    params: Record<string, number>;
    dataSource: { balanceSheet: string; prices: string; fetchedAt: string; };
    candidates: Record<string, CandidateInfo>;
    numCandidates: number;
    numFilteredKeys: number;
    status: string;
};

// --- Utils ---
const isKoreanStock = (ticker: string) => /^\d{6}$/.test(ticker);

/**
 * 숫자를 포맷팅하는 지능형 헬퍼 함수
 * 국장 시가총액 데이터가 '억' 단위(예: 1000 = 1000억)임을 반영합니다.
 */
const formatValue = (v: any, isMarketCap: boolean = false, isKR: boolean = false) => {
    const num = Number(v);
    if (isNaN(num)) return String(v ?? "-");
    if (num === 0) return "0";

    // 한국 종목이고 시가총액인 경우 처리
    if (isKR && isMarketCap) {
        // 입력값 v가 이미 '억' 단위이므로 나누지 않고 그대로 사용
        const eok = Math.floor(num);

        // 10,000억 이상이면 '조' 단위로 표시 (예: 12500 -> 1조 2,500억)
        if (eok >= 10000) {
            const jo = Math.floor(eok / 10000);
            const remainingEok = eok % 10000;
            return remainingEok === 0
                ? `${jo}조`
                : `${jo}조 ${remainingEok.toLocaleString()}억`;
        }
        return `${eok.toLocaleString()}억`;
    }

    // 일반 수치나 미국 주식 시가총액은 천 단위 콤마 포맷팅
    return num.toLocaleString();
};

export default function ResponsiveNCAV({
    strategies,
    activeStrategyId,
    onStrategyChange
}: {
    strategies: Strategy[],
    activeStrategyId?: string | null,
    onStrategyChange: (id: string) => void
}) {
    const router = useRouter();

    const initialIndex = useMemo(() => {
        if (!activeStrategyId) return 0;
        const found = strategies.findIndex(s => s.strategyId === activeStrategyId);
        return found !== -1 ? found : 0;
    }, [strategies, activeStrategyId]);

    const [selectedIndex, setSelectedIndex] = useState(initialIndex);
    const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<string>("ticker");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const data = strategies[selectedIndex];

    useEffect(() => {
        if (activeStrategyId) {
            const found = strategies.findIndex(s => s.strategyId === activeStrategyId);
            if (found !== -1 && found !== selectedIndex) {
                setSelectedIndex(found);
            }
        }
    }, [activeStrategyId, strategies, selectedIndex]);

    const handleStrategySelect = (idx: number) => {
        setSelectedIndex(idx);
        onStrategyChange(strategies[idx].strategyId);
    };

    const handleTickerClick = (ticker: string, name?: string) => {
        const searchTerm = isKoreanStock(ticker) ? (name || ticker) : ticker;
        router.push(`/search?ticker=${encodeURIComponent(searchTerm)}`);
    };

    const sortedCandidates = useMemo(() => {
        if (!data?.candidates) return [];
        const items = Object.entries(data.candidates);
        items.sort((a, b) => {
            let va: any = a[0];
            let vb: any = b[0];
            if (sortKey !== "ticker") {
                va = (a[1] as any).condition?.[sortKey] ?? (a[1] as any)[sortKey];
                vb = (b[1] as any).condition?.[sortKey] ?? (b[1] as any)[sortKey];
            }
            if (va == null) return 1;
            if (vb == null) return -1;
            const res = va < vb ? -1 : va > vb ? 1 : 0;
            return sortDir === "asc" ? res : -res;
        });
        return items;
    }, [data, sortKey, sortDir]);

    if (!data) return null;

    return (
        <div className="space-y-6 pb-20">
            <div className="grid grid-cols-12 gap-6">
                {/* Sidebar */}
                <div className="col-span-12 lg:col-span-3">
                    <Section title="전략 라이브러리" icon={IconNames.LAYERS} compact className="!bg-transparent">
                        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                            {strategies.map((s, idx) => (
                                <Card
                                    key={s.strategyId}
                                    interactive
                                    onClick={() => handleStrategySelect(idx)}
                                    className={`!p-4 min-w-[200px] lg:min-w-0 !rounded-xl transition-all border-none ${idx === selectedIndex ? '!bg-blue-600 !text-white shadow-xl scale-[1.02]' : 'dark:!bg-zinc-900'}`}
                                >
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${idx === selectedIndex ? 'text-blue-100' : 'text-gray-500'}`}>
                                        Strategy {idx + 1}
                                    </p>
                                    <div className="font-bold truncate text-sm">{s.strategyId}</div>
                                </Card>
                            ))}
                        </div>
                    </Section>
                </div>

                {/* Main Content */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard label="추천 종목" value={data.numCandidates} icon={IconNames.STAR} intent={Intent.PRIMARY} />
                        <MetricCard label="전체 유니버스" value={data.numFilteredKeys} icon={IconNames.GLOBE} />
                        <MetricCard label="데이터 소스" value={data.dataSource.balanceSheet} icon={IconNames.DATABASE} />
                        <MetricCard label="기준 일자" value={data.asOfDate} icon={IconNames.CALENDAR} />
                    </div>

                    <StrategyDescription strategyId={data.strategyId} />

                    <Section
                        title="추천 종목 상세 분석"
                        icon={IconNames.TH_DERIVED}
                        rightElement={<Tag minimal round intent={Intent.PRIMARY} className="font-mono">{sortedCandidates.length}</Tag>}
                    >
                        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                            <HTMLTable striped className="w-full">
                                <thead className="bg-gray-50/50 dark:bg-black/20">
                                    <tr>
                                        <SortHeader label="Ticker" id="ticker" current={sortKey} dir={sortDir} onSort={setSortKey} onDir={setSortDir} />
                                        <SortHeader label="Price" id="LastPrice" current={sortKey} dir={sortDir} onSort={setSortKey} onDir={setSortDir} />
                                        <SortHeader label="Market Cap" id="MarketCapitalization" current={sortKey} dir={sortDir} onSort={setSortKey} onDir={setSortDir} />
                                        <SortHeader label="NCAV Ratio" id="ncavRatio" current={sortKey} dir={sortDir} onSort={setSortKey} onDir={setSortDir} />
                                        <th className="text-right pr-6 py-4 text-[10px] font-black uppercase text-gray-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedCandidates.map(([ticker, info]) => {
                                        const isKR = isKoreanStock(ticker);
                                        const currency = isKR ? "₩" : "$";
                                        const mktCap = info.condition?.MarketCapitalization ?? 0;

                                        return (
                                            <React.Fragment key={ticker}>
                                                <tr className="hover:!bg-blue-50/30 dark:hover:!bg-blue-900/10 transition-colors">
                                                    <td className="py-4 font-bold">
                                                        <div onClick={() => handleTickerClick(ticker, info.name)} className="!text-blue-600 cursor-pointer hover:underline flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                {ticker} <Icon icon={IconNames.SHARE} size={10} className="opacity-40" />
                                                            </div>
                                                            <span className="text-[11px] text-gray-500 font-medium italic">{info.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="font-mono text-xs">{`${currency}${formatValue(info.condition?.LastPrice)}`}</td>
                                                    <td className="font-mono text-xs opacity-60">
                                                        {isKR ? "" : currency}
                                                        {formatValue(mktCap, true, isKR)}
                                                    </td>
                                                    <td>
                                                        <Tag minimal intent={Number(info.ncavRatio) > 1.2 ? Intent.SUCCESS : Intent.WARNING} className="font-bold">
                                                            {info.ncavRatio}x
                                                        </Tag>
                                                    </td>
                                                    <td className="text-right pr-4">
                                                        <Button
                                                            minimal
                                                            icon={expandedTicker === ticker ? IconNames.EYE_OFF : IconNames.EYE_OPEN}
                                                            onClick={() => setExpandedTicker(expandedTicker === ticker ? null : ticker)}
                                                        />
                                                    </td>
                                                </tr>
                                                <AnimatePresence>
                                                    {expandedTicker === ticker && (
                                                        <tr>
                                                            <td colSpan={5} className="!p-0 border-none">
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden bg-gray-50 dark:bg-black/40"
                                                                >
                                                                    <div className="p-8 grid grid-cols-2 gap-8">
                                                                        <pre className="text-[10px] p-4 bg-white dark:bg-zinc-950 rounded-xl max-h-60 overflow-auto border border-gray-100 dark:border-white/5">
                                                                            {JSON.stringify(info.condition, null, 2)}
                                                                        </pre>
                                                                        <div className="space-y-4">
                                                                            <Callout intent={Intent.SUCCESS} title="분석 데이터" icon={IconNames.LIGHTBULB}>
                                                                                시가총액 {formatValue(mktCap, true, isKR)} 기준 분석 결과입니다.
                                                                            </Callout>
                                                                            <Button fill large intent={Intent.PRIMARY} icon={IconNames.CHART} onClick={() => handleTickerClick(ticker, info.name)}>
                                                                                상세 재무 차트 보기
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </HTMLTable>
                        </div>

                        {/* Mobile Grid */}
                        <div className="md:hidden grid grid-cols-2 gap-3">
                            {sortedCandidates.map(([ticker, info]) => {
                                const isKR = isKoreanStock(ticker);
                                return (
                                    <Card
                                        key={ticker}
                                        interactive
                                        onClick={() => handleTickerClick(ticker, info.name)}
                                        className="!p-4 flex flex-col items-start !rounded-xl dark:!bg-zinc-900 border-none shadow-sm"
                                    >
                                        <div className="flex justify-between w-full items-start">
                                            <span className="text-[12px] font-black !text-blue-600">{ticker}</span>
                                            <Tag minimal round className="text-[9px] font-bold">{info.ncavRatio}x</Tag>
                                        </div>
                                        <span className="text-[11px] font-bold mt-1 truncate w-full">{info.name}</span>
                                        <span className="text-[10px] text-gray-500 mt-2 font-mono">
                                            Cap: {formatValue(info.condition?.MarketCapitalization, true, isKR)}
                                        </span>
                                    </Card>
                                );
                            })}
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
}

// --- Helper Components ---
function MetricCard({ label, value, icon, intent = Intent.NONE }: any) {
    return (
        <Card className="!p-4 border-none shadow-sm dark:!bg-zinc-900 flex items-center !rounded-2xl">
            <div className={`p-3 rounded-xl mr-4 ${intent === Intent.PRIMARY ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                <Icon icon={icon} size={16} />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0 leading-none">{label}</p>
                <p className="text-lg font-black !m-0 dark:text-white leading-tight mt-1">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
            </div>
        </Card>
    );
}

function SortHeader({ label, id, current, dir, onSort, onDir }: any) {
    const isActive = current === id;
    return (
        <th className="cursor-pointer select-none py-4 px-4 hover:bg-black/5" onClick={() => isActive ? onDir(dir === "asc" ? "desc" : "asc") : onSort(id)}>
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-blue-600" : "text-gray-400"}`}>{label}</span>
                <Icon icon={isActive ? (dir === "asc" ? IconNames.CHEVRON_UP : IconNames.CHEVRON_DOWN) : IconNames.DOUBLE_CARET_VERTICAL} size={10} className={isActive ? "text-blue-600" : "text-gray-200"} />
            </div>
        </th>
    );
}