"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card,
    Elevation,
    Button,
    HTMLTable,
    Tag,
    Icon,
    Intent,
    Divider,
    ButtonGroup,
    Callout,
    Section,
    SectionCard,
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

export default function ResponsiveNCAV({ strategies }: { strategies?: Strategy | Strategy[] }) {
    const list = useMemo(() => {
        if (!strategies) return [];
        return Array.isArray(strategies) ? strategies : [strategies];
    }, [strategies]);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const data = list[selectedIndex];
    const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<string>("ticker");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
            {/* [1. 전략 선택 사이드바 & 메트릭] */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-3">
                    <Section title="전략 라이브러리" icon={IconNames.LAYERS} compact className="!bg-transparent">
                        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                            {list.map((s, idx) => (
                                <Card
                                    key={idx}
                                    interactive
                                    onClick={() => setSelectedIndex(idx)}
                                    className={`!p-4 min-w-[200px] lg:min-w-0 !rounded-xl transition-all border-none ${idx === selectedIndex ? '!bg-blue-600 !text-white shadow-xl scale-[1.02]' : 'dark:!bg-zinc-900'}`}
                                >
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${idx === selectedIndex ? 'text-blue-100' : 'text-gray-500'}`}>Strategy {idx + 1}</p>
                                    <div className="font-bold truncate text-sm">{s.strategyId}</div>
                                </Card>
                            ))}
                        </div>
                    </Section>
                </div>

                <div className="col-span-12 lg:col-span-9 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard label="추천 종목" value={data.numCandidates} icon={IconNames.STAR} intent={Intent.PRIMARY} />
                        <MetricCard label="전체 유니버스" value={data.numFilteredKeys} icon={IconNames.GLOBE} />
                        <MetricCard label="데이터 동기화" value={data.dataSource.balanceSheet} icon={IconNames.DATABASE} />
                        <MetricCard label="기준 일자" value={data.asOfDate} icon={IconNames.CALENDAR} />
                    </div>

                    <StrategyDescription strategyId={data.strategyId} />

                    {/* [2. 종목 리스트 - Justinmind 카드 그리드 스타일] */}
                    <Section
                        title="추천 종목 상세 분석"
                        icon={IconNames.TH_DERIVED}
                        rightElement={<Tag minimal round intent={Intent.PRIMARY} className="font-mono">{sortedCandidates.length}</Tag>}
                    >
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900">
                            <HTMLTable interactive striped className="w-full">
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
                                    {sortedCandidates.map(([ticker, info]: any) => (
                                        <React.Fragment key={ticker}>
                                            <tr className="hover:!bg-blue-50/30 dark:hover:!bg-blue-900/10 transition-colors">
                                                <td className="py-4 font-bold !text-blue-600">{ticker} <span className="text-[10px] text-gray-400 ml-2 font-medium">{info.name}</span></td>
                                                <td className="font-mono text-xs">{`$${formatNum(info.condition?.LastPrice)}`}</td>
                                                <td className="font-mono text-xs opacity-60">{formatNum(info.condition?.MarketCapitalization)}</td>
                                                <td>
                                                    <Tag minimal intent={Number(info.ncavRatio) > 1.2 ? Intent.SUCCESS : Intent.WARNING} className="font-bold">
                                                        {info.ncavRatio}x
                                                    </Tag>
                                                </td>
                                                <td className="text-right pr-4">
                                                    <Button minimal icon={expandedTicker === ticker ? IconNames.EYE_OFF : IconNames.EYE_OPEN} onClick={() => setExpandedTicker(expandedTicker === ticker ? null : ticker)} />
                                                </td>
                                            </tr>
                                            <AnimatePresence>
                                                {expandedTicker === ticker && (
                                                    <tr>
                                                        <td colSpan={5} className="!p-0 border-none">
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-gray-50 dark:bg-black/40">
                                                                <div className="p-8 grid grid-cols-2 gap-8">
                                                                    <pre className="text-[10px] p-4 bg-white dark:bg-zinc-950 rounded-xl border border-black/5 shadow-inner overflow-auto max-h-60">
                                                                        {JSON.stringify(info.condition, null, 2)}
                                                                    </pre>
                                                                    <div className="space-y-4">
                                                                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-600">Quick Analysis</h4>
                                                                        <Callout intent={Intent.SUCCESS} className="!bg-white dark:!bg-zinc-900 shadow-sm border-none">
                                                                            해당 종목은 현재 순유동자산 대비 시가총액 비율이 <b>{info.ncavRatio}배</b>로 강력한 매수 안전 마진을 확보하고 있습니다.
                                                                        </Callout>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </HTMLTable>
                        </div>

                        {/* Mobile 3-Column Grid View */}
                        <div className="md:hidden grid grid-cols-3 gap-2">
                            {sortedCandidates.map(([ticker, info]: any) => (
                                <motion.div
                                    key={ticker}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setExpandedTicker(expandedTicker === ticker ? null : ticker)}
                                >
                                    <Card className="!p-2 flex flex-col items-center text-center !rounded-xl border-none shadow-sm dark:!bg-zinc-900 h-full">
                                        <span className="text-[10px] font-black !text-blue-600 truncate w-full">{ticker}</span>
                                        <div className="h-4" />
                                        <span className="text-[14px] font-black dark:text-white leading-none mb-1">{info.ncavRatio}x</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase">NCAV</span>
                                        <div className="mt-2 text-[8px] font-mono opacity-50">{`$${formatNum(info.condition?.LastPrice)}`}</div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </Section>

                    {/* [3. 상세 설정 파라미터] */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Callout title="전략 파라미터" icon={IconNames.SETTINGS} className="!bg-white dark:!bg-zinc-900 border-none shadow-sm rounded-xl">
                            <div className="mt-4 space-y-2">
                                {Object.entries(data.params).map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-center text-[11px] pb-2 border-b border-gray-50 dark:border-white/5">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">{k}</span>
                                        <span className="font-mono font-black text-blue-600">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </Callout>
                        <Callout title="시스템 상태" icon={IconNames.GLOBE} className="!bg-white dark:!bg-zinc-900 border-none shadow-sm rounded-xl">
                            <div className="mt-4 text-[11px] space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold uppercase tracking-tighter">Status</span>
                                    <Tag intent={Intent.SUCCESS} minimal round className="font-black text-[9px]">{data.status}</Tag>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400 font-bold uppercase tracking-tighter">Price Data</span>
                                    <span className="font-bold">{data.dataSource.prices}</span>
                                </div>
                            </div>
                        </Callout>
                    </div>
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
        <th className="cursor-pointer select-none py-4 px-4 hover:bg-black/5 transition-colors" onClick={() => isActive ? onDir(dir === "asc" ? "desc" : "asc") : onSort(id)}>
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-blue-600" : "text-gray-400"}`}>{label}</span>
                <Icon icon={isActive ? (dir === "asc" ? IconNames.CHEVRON_UP : IconNames.CHEVRON_DOWN) : IconNames.DOUBLE_CARET_VERTICAL} size={10} className={isActive ? "text-blue-600" : "text-gray-200"} />
            </div>
        </th>
    );
}