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
    kvFilter: { year?: string | number; quarter?: string | number;[key: string]: any; };
    universe: string;
    params: { [key: string]: number; };
    dataSource: { balanceSheet: string; prices: string; fetchedAt: string; };
    candidates: Record<string, CandidateInfo>;
    numCandidates: number;
    numFilteredKeys: number;
    status: string;
};

const formatNum = (v: any) => (typeof v === 'number' ? v.toLocaleString() : String(v ?? "-"));
const isKoreanStock = (ticker: string) => /^\d{6}$/.test(ticker);

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

    // [중요] URL의 strategyId에 맞춰 초기 인덱스 계산
    const initialIndex = useMemo(() => {
        if (!activeStrategyId) return 0;
        const found = strategies.findIndex(s => s.strategyId === activeStrategyId);
        return found !== -1 ? found : 0;
    }, [strategies, activeStrategyId]);

    const [selectedIndex, setSelectedIndex] = useState(initialIndex);
    const data = strategies[selectedIndex];
    const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<string>("ticker");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    // 외부(URL)에서 activeStrategyId가 변경되면 내부 index 동기화 (뒤로가기 대응)
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
        // 국장이면 이름(name), 미장이면 티커(ticker) 전달
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
                {/* 전략 선택 사이드바 */}
                <div className="col-span-12 lg:col-span-3">
                    <Section title="전략 라이브러리" icon={IconNames.LAYERS} compact className="!bg-transparent">
                        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                            {strategies.map((s, idx) => (
                                <Card
                                    key={idx}
                                    interactive
                                    onClick={() => handleStrategySelect(idx)}
                                    className={`!p-4 min-w-[200px] lg:min-w-0 !rounded-xl transition-all border-none ${idx === selectedIndex ? '!bg-blue-600 !text-white shadow-xl scale-[1.02]' : 'dark:!bg-zinc-900'}`}
                                >
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${idx === selectedIndex ? 'text-blue-100' : 'text-gray-500'}`}>Strategy {idx + 1}</p>
                                    <div className="font-bold truncate text-sm">{s.strategyId}</div>
                                </Card>
                            ))}
                        </div>
                    </Section>
                </div>

                {/* 메인 분석 영역 */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard label="추천 종목" value={data.numCandidates} icon={IconNames.STAR} intent={Intent.PRIMARY} />
                        <MetricCard label="전체 유니버스" value={data.numFilteredKeys} icon={IconNames.GLOBE} />
                        <MetricCard label="데이터 동기화" value={data.dataSource.balanceSheet} icon={IconNames.DATABASE} />
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
                                    {sortedCandidates.map(([ticker, info]: [string, CandidateInfo]) => {
                                        const isKR = isKoreanStock(ticker);
                                        const currency = isKR ? "₩" : "$";
                                        return (
                                            <React.Fragment key={ticker}>
                                                <tr className="hover:!bg-blue-50/30 dark:hover:!bg-blue-900/10 transition-colors">
                                                    <td className="py-4 font-bold">
                                                        <Tooltip content={`${info.name || ticker} 상세 분석`} position={Position.TOP}>
                                                            <div onClick={() => handleTickerClick(ticker, info.name)} className="!text-blue-600 cursor-pointer hover:underline flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    {ticker} <Icon icon={IconNames.SHARE} size={10} className="opacity-40" />
                                                                </div>
                                                                <span className="text-[11px] text-gray-500 font-medium italic">{info.name}</span>
                                                            </div>
                                                        </Tooltip>
                                                    </td>
                                                    <td className="font-mono text-xs">{`${currency}${formatNum(info.condition?.LastPrice)}`}</td>
                                                    <td className="font-mono text-xs opacity-60">{`${currency}${formatNum(info.condition?.MarketCapitalization)}`}</td>
                                                    <td><Tag minimal intent={Number(info.ncavRatio) > 1.2 ? Intent.SUCCESS : Intent.WARNING} className="font-bold">{info.ncavRatio}x</Tag></td>
                                                    <td className="text-right pr-4">
                                                        <Button minimal icon={expandedTicker === ticker ? IconNames.EYE_OFF : IconNames.EYE_OPEN} onClick={() => setExpandedTicker(expandedTicker === ticker ? null : ticker)} />
                                                    </td>
                                                </tr>
                                                <AnimatePresence>
                                                    {expandedTicker === ticker && (
                                                        <tr>
                                                            <td colSpan={5} className="!p-0 border-none">
                                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-gray-50 dark:bg-black/40">
                                                                    <div className="p-8 grid grid-cols-2 gap-8">
                                                                        <pre className="text-[10px] p-4 bg-white dark:bg-zinc-950 rounded-xl max-h-60 overflow-auto">{JSON.stringify(info.condition, null, 2)}</pre>
                                                                        <div className="space-y-4">
                                                                            <Callout intent={Intent.SUCCESS}><b>{info.name || ticker}</b>는 현재 <b>{info.ncavRatio}배</b>로 매수 안전 마진을 확보했습니다.</Callout>
                                                                            <Button fill large intent={Intent.PRIMARY} onClick={() => handleTickerClick(ticker, info.name)}>정밀 재무 분석 이동</Button>
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

                        {/* Mobile View */}
                        <div className="md:hidden grid grid-cols-3 gap-2">
                            {sortedCandidates.map(([ticker, info]: [string, CandidateInfo]) => {
                                const isKR = isKoreanStock(ticker);
                                return (
                                    <Card key={ticker} interactive onClick={() => handleTickerClick(ticker, info.name)} className="!p-2 flex flex-col items-center !rounded-xl dark:!bg-zinc-900">
                                        <span className="text-[10px] font-black !text-blue-600">{ticker}</span>
                                        <span className="text-[8px] text-gray-500 truncate w-full text-center">{info.name}</span>
                                        <span className="text-[14px] font-black mt-1">{info.ncavRatio}x</span>
                                        <span className="text-[8px] text-gray-400 uppercase">NCAV</span>
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

// Helper Components
function MetricCard({ label, value, icon, intent = Intent.NONE }: any) {
    return (
        <Card className="!p-4 border-none shadow-sm dark:!bg-zinc-900 flex items-center !rounded-2xl">
            <div className={`p-3 rounded-xl mr-4 ${intent === Intent.PRIMARY ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                <Icon icon={icon} size={16} />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0">{label}</p>
                <p className="text-lg font-black !m-0 dark:text-white leading-tight">{formatNum(value)}</p>
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