import React, { useMemo, useState } from "react";

// Next.js + Radix UI + Tailwind — candidates 테이블 버전
// 반영된 내용:
// - user가 제공한 최신 JSON 구조에 맞게 candidates 렌더링 수정
// - candidates를 테이블로 보여주고, 행 클릭으로 상세(JSON) 토글
// - Actions: Details 토글, Copy JSON, Download CSV (condition 기준)
// - 중복 버튼 제거 및 타입 안전성 보강

import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Flex, Text } from "@radix-ui/themes";

type CandidateInfo = {
    symbol?: string;
    key?: string;
    condition?: Record<string, any> | null;
    ncavRatio?: string;
    [k: string]: any;
};

type Strategy = {
    strategyId: string;
    key: string;
    name: string;
    asOfDate: string;
    kvFilter: Record<string, string | number>;
    numAllTickers?: number;
    numNasdaqTickers?: number;
    numNyseTickers?: number;
    numAmexTickers?: number;
    numAllKeys: number;
    numFilteredKeys: number;
    universe: string;
    params: Record<string, number>;
    dataSource: {
        balanceSheet: string;
        prices: string;
        fetchedAt: string;
    };
    candidates: Record<string, CandidateInfo>;
    numCandidates: number;
    lastRun: string | null;
    status: string;
    notes: string;
    lastSearchIndex: number;
    searchCountPerRequest: number;
};

const sample: Strategy = {
    strategyId: "IQ_NCAV1.5_MCAP0",
    key: "US:NCAV:2024:Q0:20251115:MCAP:0",
    name: "NCAV - NASDAQ/NYSE/AMEX",
    asOfDate: "2025-11-15",
    kvFilter: { year: "2024", quarter: 0 },
    numAllTickers: 6951,
    numNasdaqTickers: 3922,
    numNyseTickers: 2737,
    numAmexTickers: 292,
    numAllKeys: 4405,
    numFilteredKeys: 3643,
    universe: "NASDAQ/NYSE/AMEX",
    params: { ncavToMarketCapMin: 1.5, minMarketCap: 0, minAvgVol30d: 50000 },
    dataSource: { balanceSheet: "finnhub", prices: "koreainvestment", fetchedAt: "2025-11-16T00:00:00+09:00" },
    candidates: {
        AP: { symbol: "AP", key: "US:AP:2024:Q0", condition: { AssetsCurrent: 236787000, LiabilitiesCurrent: 125216000, NetIncome: 438000, MarketCapitalization: 48173568, LastPrice: 2.37, per: 9.04, pbr: 0.8, eps: 0.26, bps: 2.97, date: "Mon Nov 24 2025 07:04:21 GMT+0000 (UTC)" }, ncavRatio: "2.31602" },
        BRLT: { symbol: "BRLT", key: "US:BRLT:2024:Q0", condition: { AssetsCurrent: 211413000, LiabilitiesCurrent: 78169000, NetIncome: 541000, MarketCapitalization: 25334256, LastPrice: 1.67, per: 7.34, pbr: 13.95, eps: 0.23, bps: 0.12, date: "Mon Nov 24 2025 07:28:22 GMT+0000 (UTC)" }, ncavRatio: "5.25944" }
    },
    numCandidates: 2,
    lastRun: null,
    status: "idle",
    notes: "",
    lastSearchIndex: 2850,
    searchCountPerRequest: 30,
};

function jsonToCSV(obj: unknown) {
    // for a candidate we often want condition fields => flatten object
    const flattened: Record<string, string> = {};
    if (typeof obj === "object" && obj !== null) {
        const o = obj as Record<string, any>;
        for (const k of Object.keys(o)) {
            const v = o[k];
            if (typeof v === "object") flattened[k] = JSON.stringify(v);
            else flattened[k] = String(v ?? "");
        }
    }
    const headers = Object.keys(flattened);
    if (headers.length === 0) return "";
    const rows = [headers.join(','), headers.map(h => `"${String(flattened[h]).replace(/"/g, '""')}"`).join(',')];
    return rows.join('\n');
}

export default function NCAVTable({ strategies }: { strategies?: any | any[] }) {
    const list = useMemo(() => {
        if (!strategies) return [sample];
        if (Array.isArray(strategies)) return strategies.length ? strategies : [sample];
        return [strategies];
    }, [strategies]);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const data = list[selectedIndex] ?? sample;

    // expanded candidate ticker
    const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

    const metaRows: Array<[string, string]> = [
        ["strategyId", data.strategyId],
        ["key", data.key],
        ["name", data.name],
        ["asOfDate", data.asOfDate],
        ["universe", data.universe],
        ["numAllKeys", String(data.numAllKeys)],
        ["numFilteredKeys", String(data.numFilteredKeys)],
        ["numCandidates", String(data.numCandidates)],
        ["status", data.status],
        ["lastRun", String(data.lastRun ?? "-")],
        ["notes", data.notes || "-"],
        ["lastSearchIndex", String(data.lastSearchIndex)],
        ["searchCountPerRequest", String(data.searchCountPerRequest)],
    ];

    const kvFilterEntries = Object.entries(data.kvFilter).map(([k, v]) => [k, String(v)] as [string, string]);
    const paramsEntries = Object.entries(data.params).map(([k, v]) => [k, String(v)] as [string, string]);
    const dataSourceEntries = Object.entries(data.dataSource).map(([k, v]) => [k, String(v)] as [string, string]);

    const candidateEntries = Object.entries(data.candidates ?? {}) as [string, CandidateInfo][];

    const copyJSON = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            showToast('JSON이 복사되었습니다');
        } catch (e) {
            alert("복사 실패: 브라우저가 클립보드 접근을 허용하지 않습니다.");
        }
    };

    function showToast(msg: string) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.className = 'fixed bottom-6 right-6  px-4 py-2 rounded shadow-lg text-sm';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 1600);
    }

    const overviewMaxHeight = 'calc(100vh - 220px)';

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold leading-tight">{data.name}</h1>
                        <p className="text-sm ">{data.key} • As of {data.asOfDate}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <button onClick={copyJSON} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:brightness-95">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                        <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                        <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                    </svg>
                                    <span className="text-sm">Copy JSON</span>
                                </button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content side="bottom" align="center" className="rounded-md p-2 text-xs ">
                                    Clipboard에 JSON 복사
                                    <Tooltip.Arrow className="fill-slate-900" />
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {list.length > 1 && (
                        <nav className="lg:col-span-1 rounded-2xl p-3 shadow min-h-[220px]">
                            <h3 className="text-sm font-medium mb-2">Strategies</h3>
                            <ul className="space-y-2">
                                {list.map((s, idx) => (
                                    <li key={s.strategyId || idx}>
                                        <button
                                            onClick={() => setSelectedIndex(idx)}
                                            className={`w-full text-left px-3 py-2 rounded-md hover: ${idx === selectedIndex ? 'ring-1 ring-slate-200' : ''}`}
                                        >
                                            <div className="text-sm font-medium">{s.name}</div>
                                            <div className="text-xs ">{s.asOfDate} • {s.universe}</div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}

                    <section className={`rounded-2xl p-4 shadow ${list.length > 1 ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
                        <h2 className="text-lg font-medium mb-3">Overview</h2>

                        <div className="border rounded-lg overflow-scroll">
                            <div className="grid grid-cols-[220px_1fr] border-b sticky top-0 z-10">
                                <div className="px-4 py-3 text-sm font-medium bg-slate-50 dark:bg-slate-900">Field</div>
                                <div className="px-4 py-3 text-sm font-medium bg-slate-50 dark:bg-slate-900">Value</div>
                            </div>

                            <ScrollArea.Root className="w-full" style={{ maxHeight: overviewMaxHeight }}>
                                <ScrollArea.Viewport>
                                    <table className="w-full table-auto text-sm">
                                        <tbody>
                                            {metaRows.map(([k, v], idx) => (
                                                <tr key={k} className={`${idx % 2 === 0 ? '' : ''}`}>
                                                    <td className="px-4 py-3 align-top w-52 font-medium ">{k}</td>
                                                    <td className="px-4 py-3 align-top  whitespace-pre-wrap">{v}</td>
                                                </tr>
                                            ))}

                                            <tr className="">
                                                <td className="px-4 py-3 font-medium">kvFilter</td>
                                                <td className="px-4 py-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {kvFilterEntries.map(([k, v]) => (
                                                            <div key={k} className="rounded-md p-2 border">
                                                                <div className="text-xs ">{k}</div>
                                                                <div className="text-sm font-medium">{v}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td className="px-4 py-3 font-medium">params</td>
                                                <td className="px-4 py-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        {paramsEntries.map(([k, v]) => (
                                                            <div key={k} className="rounded-md p-2 border">
                                                                <div className="text-xs ">{k}</div>
                                                                <div className="text-sm font-medium">{v}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>

                                            <tr className="">
                                                <td className="px-4 py-3 font-medium">dataSource</td>
                                                <td className="px-4 py-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {dataSourceEntries.map(([k, v]) => (
                                                            <div key={k} className="rounded-md p-2 border">
                                                                <div className="text-xs ">{k}</div>
                                                                <div className="text-sm font-medium">{v}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* CANDIDATES TABLE SECTION */}
                                            <tr className="">
                                                <td className="px-4 py-3 font-medium align-top">candidates</td>
                                                <td className="px-4 py-3">
                                                    {candidateEntries.length === 0 ? (
                                                        <div className="text-sm ">No candidates available</div>
                                                    ) : (
                                                        <div className="overflow-auto border rounded-md">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="">
                                                                    <tr>
                                                                        <th className="text-left px-3 py-2 ">Ticker</th>
                                                                        <th className="text-left px-3 py-2 ">Last Price</th>
                                                                        <th className="text-left px-3 py-2 ">Market Cap</th>
                                                                        <th className="text-left px-3 py-2 ">NCAV Ratio</th>
                                                                        <th className="text-left px-3 py-2 ">P/E</th>
                                                                        <th className="text-left px-3 py-2 ">P/B</th>
                                                                        <th className="text-left px-3 py-2 ">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {candidateEntries.map(([ticker, info]) => {
                                                                        const isOpen = expandedCandidate === String(ticker);
                                                                        const cond = info?.condition ?? {};
                                                                        const lastPrice = cond?.LastPrice ?? cond?.Lastprice ?? "-";
                                                                        const marketCap = cond?.MarketCapitalization ?? cond?.marketCapitalization ?? "-";
                                                                        const ncavRatio = info?.ncavRatio ?? "-";
                                                                        const per = cond?.per ?? cond?.PER ?? "-";
                                                                        const pbr = cond?.pbr ?? cond?.PBR ?? "-";

                                                                        return (
                                                                            <React.Fragment key={ticker}>
                                                                                <tr className={`border-t hover: ${isOpen ? '' : ''}`}>
                                                                                    <td className="px-3 py-2 font-medium">{ticker}</td>
                                                                                    <td className="px-3 py-2">{typeof lastPrice === 'number' ? String(lastPrice) : String(lastPrice)}</td>
                                                                                    <td className="px-3 py-2">{typeof marketCap === 'number' ? marketCap.toLocaleString() : String(marketCap)}</td>
                                                                                    <td className="px-3 py-2">{String(ncavRatio)}</td>
                                                                                    <td className="px-3 py-2">{String(per)}</td>
                                                                                    <td className="px-3 py-2">{String(pbr)}</td>
                                                                                    <td className="px-3 py-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <button
                                                                                                onClick={() => setExpandedCandidate(isOpen ? null : String(ticker))}
                                                                                                className="text-xs px-2 py-1 rounded border"
                                                                                            >
                                                                                                {isOpen ? 'Hide' : 'Details'}
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => navigator.clipboard.writeText(JSON.stringify(info, null, 2))}
                                                                                                className="text-xs px-2 py-1 rounded border"
                                                                                            >
                                                                                                Copy
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    const csv = jsonToCSV(info?.condition ?? info ?? {});
                                                                                                    if (!csv) { showToast('No data to download'); return; }
                                                                                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                                                                                    const url = URL.createObjectURL(blob);
                                                                                                    const a = document.createElement('a');
                                                                                                    a.href = url;
                                                                                                    a.download = `${ticker}.csv`;
                                                                                                    a.click();
                                                                                                    URL.revokeObjectURL(url);
                                                                                                }}
                                                                                                className="text-xs px-2 py-1 rounded border"
                                                                                            >
                                                                                                CSV
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>

                                                                                {isOpen && (
                                                                                    <tr className="">
                                                                                        <td colSpan={7} className="px-3 py-3 border-t">
                                                                                            <div className="text-xs  p-3 rounded">
                                                                                                <pre className="whitespace-pre-wrap">{JSON.stringify(info, null, 2)}</pre>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                )}
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>

                                        </tbody>
                                    </table>
                                </ScrollArea.Viewport>

                                <ScrollArea.Scrollbar orientation="horizontal" className="w-2 bg-transparent p-1">
                                    <ScrollArea.Thumb className="flex-1 rounded-full" />
                                </ScrollArea.Scrollbar>
                            </ScrollArea.Root>
                        </div>

                        <details className="mt-4 p-3 rounded">
                            <summary className="cursor-pointer text-sm font-medium">Raw JSON</summary>
                            <pre className="mt-2 max-h-60 overflow-auto text-xs  p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
                        </details>
                    </section>

                    <aside className="hidden lg:block rounded-2xl p-4 shadow">
                        <h2 className="text-lg font-medium mb-3">Meta</h2>

                        <div className="space-y-3 text-sm ">
                            <div className="flex justify-between gap-2">
                                <span className="">Candidates</span>
                                <span className="font-medium">{data.numCandidates}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="">Status</span>
                                <span className="font-medium capitalize">{data.status}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="">Fetched at</span>
                                <span className="font-medium">{data.dataSource.fetchedAt}</span>
                            </div>
                        </div>

                        <div className="mt-4">
                            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                                className="w-full text-sm px-3 py-2 rounded-lg border hover:">
                                Quick Copy JSON
                            </button>
                        </div>
                    </aside>
                </div>

                <footer className="mt-6 text-sm ">
                    <Flex direction="column">
                        <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                            NCAV: Net Current Asset Value (순유동자산가치)
                        </Text>
                        <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                            순유동자산가치: 유동자산 - 총부채
                        </Text>
                        <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                            Q:0: 연간보고서
                        </Text>
                        <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                            단위: USD
                        </Text>
                    </Flex>
                </footer>
            </div>
        </div>
    );
}
