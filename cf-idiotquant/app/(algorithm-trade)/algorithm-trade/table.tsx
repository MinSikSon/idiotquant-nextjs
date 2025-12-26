"use client";

import React, { useMemo, useState } from "react";
import {
    Card,
    Elevation,
    Button,
    HTMLTable,
    Tag,
    H4,
    Icon,
    Intent,
    Divider,
    ButtonGroup,
    Callout,
    Section,
    SectionCard,
    Position,
    Tooltip,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

// --- 스타일 임포트 (전역 설정이 되어있지 않다면 필요) ---
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

// --- 타입 정의 (에러 방지를 위해 옵셔널 처리 강화) ---
type CandidateInfo = {
    symbol?: string;
    name?: string;
    key?: string;
    condition?: Record<string, any> | null;
    ncavRatio?: string | number;
    [k: string]: any;
};

// 1. 기존의 Strategy 타입을 Redux에서 오는 데이터 구조와 일치시킵니다.
type Strategy = {
    strategyId: string;
    key: string;
    name: string;
    asOfDate: string;
    // Record 대신 any를 사용하거나, 구체적인 타입을 지정하여 인덱스 시그니처 에러 방지
    kvFilter: {
        year?: string | number;
        quarter?: string | number;
        [key: string]: any; // 인덱스 시그니처 추가
    };
    universe: string;
    params: {
        [key: string]: number;
    };
    dataSource: {
        balanceSheet: string;
        prices: string;
        fetchedAt: string;
    };
    candidates: Record<string, CandidateInfo>;
    numCandidates: number;
    numFilteredKeys: number;
    status: string;
};

// --- 샘플 데이터 ---
const sample: Strategy = {
    strategyId: "IQ_NCAV1.5_MCAP0",
    key: "US:NCAV:2024:Q0:20251115:MCAP:0",
    name: "NCAV Strategy",
    asOfDate: "2025-11-15",
    kvFilter: { year: "2024", quarter: 0 },
    universe: "NASDAQ/NYSE/AMEX",
    params: { ncavToMarketCapMin: 1.5, minMarketCap: 0, minAvgVol30d: 50000 },
    dataSource: { balanceSheet: "finnhub", prices: "koreainvestment", fetchedAt: "2025-11-16T00:00:00+09:00" },
    candidates: {
        AP: { symbol: "AP", name: "Ampco-Pittsburgh", condition: { LastPrice: 2.37, MarketCapitalization: 48173568, per: 9.04, pbr: 0.8 }, ncavRatio: "2.31602" },
        BRLT: { symbol: "BRLT", name: "Brilliant Earth", condition: { LastPrice: 1.67, MarketCapitalization: 25334256, per: 7.34, pbr: 13.95 }, ncavRatio: "5.25944" }
    },
    numCandidates: 2,
    numFilteredKeys: 3643,
    status: "idle",
};

// --- 유틸리티 함수 ---
const formatNum = (v: any) => (typeof v === 'number' ? v.toLocaleString() : String(v ?? "-"));

export default function ResponsiveNCAV({ strategies }: { strategies?: Strategy | Strategy[] }) {
    // 1. 데이터 초기화 및 에러 방지
    const list = useMemo(() => {
        if (!strategies) return [sample];
        return Array.isArray(strategies) ? (strategies.length ? strategies : [sample]) : [strategies];
    }, [strategies]);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const data = list[selectedIndex] ?? sample;
    const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

    // 2. 정렬 로직 (에러 방지용 안전한 접근)
    const [sortKey, setSortKey] = useState<string>("ticker");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const candidateEntries = Object.entries(data.candidates ?? {});

    const sortedCandidates = useMemo(() => {
        const items = [...candidateEntries];
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
    }, [candidateEntries, sortKey, sortDir]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-2 sm:p-4 md:p-8">
            <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6">

                {/* [상단 헤더] 모바일: 세로적재, 데스크톱: 가로배치 */}
                <Card elevation={Elevation.ONE} className="!p-4 md:!p-6 border-none shadow-sm dark:bg-zinc-900">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Icon icon={IconNames.CHART} intent={Intent.PRIMARY} size={20} />
                                <H4 className="!m-0 text-lg md:text-xl font-bold truncate max-w-[280px] sm:max-w-none">
                                    {data.strategyId || "전략 정보 없음"}
                                </H4>
                                <Tag intent={Intent.SUCCESS} minimal round size="medium">{data.status}</Tag>
                            </div>
                            <p className="text-gray-500 text-xs mt-1 font-medium">
                                <Icon icon={IconNames.CALENDAR} size={12} className="mr-1" />
                                {`As of ${data.asOfDate} • ${data.universe}`}
                            </p>
                        </div>
                        <ButtonGroup fill className="w-full md:w-auto">
                            <Button icon={IconNames.DUPLICATE} onClick={() => navigator.clipboard.writeText(JSON.stringify(data))}>JSON</Button>
                            <Button icon={IconNames.DOWNLOAD} intent={Intent.PRIMARY}>CSV</Button>
                        </ButtonGroup>
                    </div>
                </Card>

                <div className="grid grid-cols-12 gap-4 md:gap-6">

                    {/* [사이드바] 모바일: 수평 스크롤 칩, 데스크톱: 수직 리스트 */}
                    <div className="col-span-12 lg:col-span-3">
                        <Section title="Strategy List" icon={IconNames.LAYERS} compact>
                            <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible p-2 gap-2 no-scrollbar">
                                {list.map((s, idx) => (
                                    <Card
                                        key={idx}
                                        interactive
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`!p-3 min-w-[160px] lg:min-w-0 transition-all border-none ${idx === selectedIndex ? 'bg-blue-600 text-white shadow-lg scale-[1.02]' : 'bg-white dark:bg-zinc-800'}`}
                                    >
                                        <div className={`text-xs font-bold truncate ${idx === selectedIndex ? 'text-white' : ''}`}>{s.strategyId}</div>
                                        <div className={`text-[10px] mt-1 font-medium ${idx === selectedIndex ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {`Q${s.kvFilter.quarter} • ${s.asOfDate}`}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </Section>
                    </div>

                    {/* [본문 컨텐츠] */}
                    <div className="col-span-12 lg:col-span-9 space-y-4 md:space-y-6">

                        {/* 메트릭 그리드: 모바일 2열, 데스크톱 4열 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            <MetricCard label="추천 종목" value={data.numCandidates} icon={IconNames.TH_DERIVED} intent={Intent.PRIMARY} />
                            <MetricCard label="필터 통과" value={data.numFilteredKeys} icon={IconNames.FILTER_LIST} />
                            <MetricCard label="데이터 소스" value={data.dataSource.balanceSheet} icon={IconNames.DATABASE} />
                            <MetricCard label="마지막 실행" value={data.asOfDate.slice(5)} icon={IconNames.TIME} />
                        </div>

                        {/* [반응형 리스트 섹션] */}
                        <Section
                            title="Recommended Candidates"
                            icon={IconNames.LIST_COLUMNS}
                            rightElement={<Tag minimal round>{`${sortedCandidates.length} Items`}</Tag>}
                        >
                            <SectionCard className="!p-0 border-none overflow-hidden">

                                {/* 1. 데스크톱 뷰 (Table) - md 이상에서 표시 */}
                                <div className="hidden md:block overflow-x-auto">
                                    <HTMLTable interactive striped className="w-full text-sm">
                                        <thead>
                                            <tr>
                                                <SortHeader label="Ticker" id="ticker" current={sortKey} dir={sortDir} onSort={setSortKey} onDir={setSortDir} />
                                                <SortHeader label="Price" id="LastPrice" current={sortKey} dir={sortDir} onSort={setSortKey} onDir={setSortDir} />
                                                <SortHeader label="Market Cap" id="MarketCapitalization" current={sortKey} dir={sortDir} onSort={setSortKey} onDir={setSortDir} />
                                                <SortHeader label="NCAV Ratio" id="ncavRatio" current={sortKey} dir={sortDir} onSort={setSortKey} onDir={setSortDir} />
                                                <th className="text-right pr-6">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedCandidates.map(([ticker, info]: any) => (
                                                <React.Fragment key={ticker}>
                                                    <tr className={expandedTicker === ticker ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}>
                                                        <td className="font-bold text-blue-600">{ticker}</td>
                                                        <td className="font-mono text-xs">{`$${formatNum(info.condition?.LastPrice)}`}</td>
                                                        <td className="font-mono text-xs text-gray-500">{formatNum(info.condition?.MarketCapitalization)}</td>
                                                        <td>
                                                            <Tag minimal intent={Number(info.ncavRatio) > 1.5 ? Intent.SUCCESS : Intent.NONE}>
                                                                {String(info.ncavRatio)}
                                                            </Tag>
                                                        </td>
                                                        <td className="text-right pr-4">
                                                            <Button
                                                                minimal
                                                                small
                                                                icon={expandedTicker === ticker ? IconNames.CHEVRON_UP : IconNames.CHEVRON_DOWN}
                                                                onClick={() => setExpandedTicker(expandedTicker === ticker ? null : ticker)}
                                                            />
                                                        </td>
                                                    </tr>
                                                    {expandedTicker === ticker && (
                                                        <tr>
                                                            <td colSpan={5} className="!p-6 bg-gray-50 dark:bg-zinc-800/30 shadow-inner">
                                                                <pre className="text-[11px] font-mono leading-relaxed bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-auto max-h-80">
                                                                    {JSON.stringify(info, null, 2)}
                                                                </pre>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </HTMLTable>
                                </div>

                                {/* 2. 모바일 뷰 (Card List) - md 미만에서 표시 */}
                                <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
                                    {sortedCandidates.map(([ticker, info]: any) => (
                                        <div key={ticker} className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-lg font-black text-blue-600 mr-2">{ticker}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">{info.name || "N/A"}</span>
                                                </div>
                                                <Tag intent={Intent.SUCCESS} minimal size="medium">{info.ncavRatio}</Tag>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-gray-50 dark:bg-zinc-800/50 p-2 rounded">
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Price</p>
                                                    <p className="text-xs font-mono font-bold">{`$${formatNum(info.condition?.LastPrice)}`}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-zinc-800/50 p-2 rounded">
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Market Cap</p>
                                                    <p className="text-xs font-mono font-bold">{formatNum(info.condition?.MarketCapitalization)}</p>
                                                </div>
                                            </div>
                                            <Button
                                                fill
                                                minimal
                                                small
                                                rightIcon={expandedTicker === ticker ? IconNames.EYE_OFF : IconNames.EYE_OPEN}
                                                text={expandedTicker === ticker ? "상세 정보 닫기" : "데이터 원본 보기"}
                                                onClick={() => setExpandedTicker(expandedTicker === ticker ? null : ticker)}
                                            />
                                            {expandedTicker === ticker && (
                                                <div className="mt-2 p-3 bg-zinc-900 text-green-400 text-[10px] font-mono rounded-lg overflow-x-auto shadow-inner">
                                                    <pre>{JSON.stringify(info.condition, null, 2)}</pre>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        </Section>

                        {/* 하단 상세 설정 파라미터 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Callout title="Strategy Rules" icon={IconNames.SETTINGS} className="border-none shadow-sm dark:bg-zinc-900">
                                <div className="mt-2 space-y-2">
                                    {Object.entries(data.params).map(([k, v]) => (
                                        <div key={k} className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-zinc-800 pb-1.5">
                                            <span className="text-gray-500 font-medium uppercase text-[10px]">{k}</span>
                                            <span className="font-mono font-bold text-blue-600">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </Callout>
                            <Callout title="Data Integrity" icon={IconNames.SHIELD} intent={Intent.NONE} className="border-none shadow-sm dark:bg-zinc-900">
                                <div className="mt-2 text-[11px] space-y-2 text-gray-600 dark:text-gray-400">
                                    <p className="flex justify-between"><span>BS Source:</span> <b className="text-gray-900 dark:text-white">{data.dataSource.balanceSheet}</b></p>
                                    <p className="flex justify-between"><span>Price Source:</span> <b className="text-gray-900 dark:text-white">{data.dataSource.prices}</b></p>
                                    <p className="flex justify-between"><span>Last Sync:</span> <b className="text-gray-900 dark:text-white">{new Date(data.dataSource.fetchedAt).toLocaleTimeString()}</b></p>
                                </div>
                            </Callout>
                        </div>
                    </div>
                </div>

                <footer className="py-10 text-center">
                    <Divider className="mb-6" />
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
                        Powered by IdiotQuant Engine • Currency in USD ($)
                    </p>
                </footer>
            </div>
        </div>
    );
}

// --- 하위 도우미 컴포넌트 (에러 방지 적용) ---

function MetricCard({ label, value, icon, intent = Intent.NONE }: any) {
    return (
        <Card elevation={Elevation.ZERO} className="flex flex-col sm:flex-row items-center p-3 md:p-4 border-none shadow-sm dark:bg-zinc-900 text-center sm:text-left">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center sm:mr-4 mb-2 sm:mb-0 ${intent === Intent.PRIMARY ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}>
                <Icon icon={icon} size={16} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-[10px] uppercase font-black text-gray-400 mb-0 tracking-tight">{label}</p>
                <p className="text-sm md:text-lg font-bold !m-0 truncate dark:text-white">{formatNum(value)}</p>
            </div>
        </Card>
    );
}

function SortHeader({ label, id, current, dir, onSort, onDir }: any) {
    const isActive = current === id;
    const handleToggle = () => {
        if (isActive) onDir(dir === "asc" ? "desc" : "asc");
        else onSort(id);
    };

    return (
        <th className="cursor-pointer select-none py-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors" onClick={handleToggle}>
            <div className="flex items-center gap-2">
                <span className={isActive ? "text-blue-600 font-bold" : "text-gray-600 dark:text-gray-400"}>{label}</span>
                <Icon
                    icon={isActive ? (dir === "asc" ? IconNames.CHEVRON_UP : IconNames.CHEVRON_DOWN) : IconNames.DOUBLE_CARET_VERTICAL}
                    size={12}
                    className={isActive ? "text-blue-600" : "text-gray-300"}
                />
            </div>
        </th>
    );
}