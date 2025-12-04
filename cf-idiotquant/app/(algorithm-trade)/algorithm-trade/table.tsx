import React, { useMemo, useState } from "react";

// Next.js + Radix UI + Tailwind — candidates 테이블 버전
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Button, Flex, Text } from "@radix-ui/themes";

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

/**
 * LoadingGrayText: 텍스트 자리 Skeleton (회색 깜빡임)
 * className으로 width/height 조절하세요 (예: w-40 h-4)
 */
function LoadingGrayText({ className = "" }: { className?: string }) {
    return (
        <span className={`inline-block bg-gray-300 rounded animate-pulse align-middle ${className}`}>&nbsp;</span>
    );
}

export default function NCAVTable({ strategies }: { strategies?: any | any[] }) {
    const list = useMemo(() => {
        if (!strategies) return [sample];
        if (Array.isArray(strategies)) return strategies.length ? strategies : [sample];
        return [strategies];
    }, [strategies]);

    // isUsingSample: 현재 화면에 보여지는 전략이 fallback sample인지 여부
    const isUsingSample = useMemo(() => {
        // list이 sample 하나만 있고, 원래 전달된 strategies 값이 falsy거나 빈 배열이거나
        // 또는 사용자가 명시적으로 sample 객체(동일 참조) 를 전달한 경우를 체크
        const onlySample = list.length === 1 && list[0] === sample;
        const explicitSample = strategies === sample;
        const emptyOrAbsent = !strategies || (Array.isArray(strategies) && strategies.length === 0);
        return onlySample && (explicitSample || emptyOrAbsent);
    }, [list, strategies]);

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
        // ["numAllKeys", String(data.numAllKeys)],
        ["전체종목", String(data.numAllKeys)],
        // ["numFilteredKeys", String(data.numFilteredKeys)],
        ["전체종목(연도 필터)", String(data.numFilteredKeys)],
        // ["numCandidates", String(data.numCandidates)],
        ["추천 종목 개수", String(data.numCandidates)],
        // ["status", data.status],
        // ["lastRun", String(data.lastRun ?? "-")],
        // ["notes", data.notes || "-"],
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
        t.className = 'fixed bottom-6 right-6  pl-3 py-2 rounded shadow-lg text-sm';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 1600);
    }

    const overviewMaxHeight = 'calc(100vh - 220px)';

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold leading-tight">
                            {/* {isUsingSample ? <LoadingGrayText className="w-72 h-6" /> : data.name} */}
                            {isUsingSample ? <LoadingGrayText className="w-72 h-6" /> : data.strategyId}
                        </h1>
                        <div className="text-sm ">
                            {isUsingSample ? (
                                <span className="flex gap-2 items-center">
                                    <LoadingGrayText className="w-56 h-4" />
                                </span>
                            ) : (
                                <><div className="flex flex-col">
                                    {/* <div>{data.key}</div> */}
                                    <div>• As of {data.asOfDate}</div>
                                </div></>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <Button
                                    variant="soft"
                                    onClick={copyJSON}
                                    // className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:brightness-95"
                                    disabled={isUsingSample}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                        <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                        <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                    </svg>
                                    <span className="text-sm">JSON</span>
                                </Button>
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

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
                    {list.length > 1 && (
                        <nav className="lg:col-span-1 rounded-2xl p-3 shadow min-h-[200px]">
                            {/* <h3 className="text-lg font-medium mb-2">Strategies</h3> */}
                            <h3 className="text-lg font-medium mb-2">투자 전략</h3>
                            <ul className="space-y-2">
                                {list.map((s, idx) => (
                                    <li key={s.strategyId || idx}>
                                        <button
                                            onClick={() => setSelectedIndex(idx)}
                                            className={`w-full text-left pl-3 py-1 rounded-md ${idx === selectedIndex ? 'ring-1 ring-slate-200' : 'hover:'}`}
                                        >
                                            <div className="items-center gap-1">
                                                <div className="text-sm font-medium">{s.strategyId}</div>
                                                <div className="text-[0.6rem] ">{s.asOfDate} • {s.universe}</div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <Flex direction="column" pl="9" align="start">
                                <Text as="p" color="bronze" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                                    🚀 IQ_NCAV1_2024_Q0_MCAP0 : IdiotQuant 제안, NCAV ratio 1 인 2024년 연간 시가총액이 0 이상인 종목 추천
                                </Text>
                                <Flex direction="column" pl="3">
                                    <Text as="p" color="green" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                                        🦄 NCAV = Net Current Asset Value = 유동자산 - 총부채
                                    </Text>
                                    <Text as="p" color="green" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                                        🦄 Q:0: 연간보고서를 의미
                                    </Text>
                                </Flex>
                            </Flex>
                        </nav>
                    )}

                    <section className={`rounded-2xl p-3 shadow ${list.length > 1 ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
                        <h2 className="text-lg font-medium mb-3">개요</h2>

                        <div className="border rounded-lg overflow-scroll">
                            <ScrollArea.Root className="w-full" style={{ maxHeight: overviewMaxHeight }}>
                                <ScrollArea.Viewport>
                                    <table className="w-full table-auto text-sm">
                                        <tbody>

                                            {/* CANDIDATES TABLE SECTION */}
                                            <tr className="">
                                                <td className="pl-3 py-3 font-medium align-top">추천 종목</td>
                                                <td className="pl-3 py-3">
                                                    {candidateEntries.length === 0 ? (
                                                        <div className="text-sm ">No candidates available</div>
                                                    ) : (
                                                        <div className="overflow-auto border rounded-md">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="">
                                                                    <tr>
                                                                        <th className="text-left pl-3 py-2 ">Ticker</th>
                                                                        <th className="text-left pl-3 py-2 ">Last Price</th>
                                                                        <th className="text-left pl-3 py-2 ">Market Cap</th>
                                                                        <th className="text-left pl-3 py-2 ">NCAV Ratio</th>
                                                                        <th className="text-left pl-3 py-2 ">P/E</th>
                                                                        <th className="text-left pl-3 py-2 ">P/B</th>
                                                                        <th className="text-left pl-3 py-2 ">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {isUsingSample ? (
                                                                        // Skeleton rows when sample 사용 중
                                                                        Array.from({ length: 3 }).map((_, idx) => (
                                                                            <tr key={`skeleton-${idx}`} className="border-t">
                                                                                <td className="pl-3 py-2 font-medium"><LoadingGrayText className="w-16 h-4" /></td>
                                                                                <td className="pl-3 py-2"><LoadingGrayText className="w-12 h-4" /></td>
                                                                                <td className="pl-3 py-2"><LoadingGrayText className="w-24 h-4" /></td>
                                                                                <td className="pl-3 py-2"><LoadingGrayText className="w-12 h-4" /></td>
                                                                                <td className="pl-3 py-2"><LoadingGrayText className="w-12 h-4" /></td>
                                                                                <td className="pl-3 py-2"><LoadingGrayText className="w-12 h-4" /></td>
                                                                                <td className="pl-3 py-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-xs px-2 py-1 rounded border"><LoadingGrayText className="w-12 h-3" /></span>
                                                                                        <span className="text-xs px-2 py-1 rounded border"><LoadingGrayText className="w-12 h-3" /></span>
                                                                                        <span className="text-xs px-2 py-1 rounded border"><LoadingGrayText className="w-12 h-3" /></span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        // 실제 데이터 렌더링
                                                                        candidateEntries.map(([ticker, info]) => {
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
                                                                                        <td className="pl-3 py-2 font-medium">{ticker}</td>
                                                                                        <td className="pl-3 py-2">{typeof lastPrice === 'number' ? String(lastPrice) : String(lastPrice)}</td>
                                                                                        <td className="pl-3 py-2">{typeof marketCap === 'number' ? marketCap.toLocaleString() : String(marketCap)}</td>
                                                                                        <td className="pl-3 py-2">{String(ncavRatio)}</td>
                                                                                        <td className="pl-3 py-2">{String(per)}</td>
                                                                                        <td className="pl-3 py-2">{String(pbr)}</td>
                                                                                        <td className="pl-3 py-2">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Button
                                                                                                    size="1"
                                                                                                    variant="soft"
                                                                                                    onClick={() => setExpandedCandidate(isOpen ? null : String(ticker))}
                                                                                                    className="text-xs px-2 py-1 rounded border"
                                                                                                >
                                                                                                    {isOpen ? 'Hide' : 'Details'}
                                                                                                </Button>
                                                                                                <Button
                                                                                                    size="1"
                                                                                                    variant="soft"
                                                                                                    onClick={() => navigator.clipboard.writeText(JSON.stringify(info, null, 2))}
                                                                                                    className="text-xs px-2 py-1 rounded border"
                                                                                                >
                                                                                                    Copy
                                                                                                </Button>
                                                                                                <Button
                                                                                                    size="1"
                                                                                                    variant="soft"
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
                                                                                                </Button>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>

                                                                                    {isOpen && (
                                                                                        <tr className="">
                                                                                            <td colSpan={7} className="pl-3 py-3 border-t">
                                                                                                <div className="text-xs  p-3 rounded">
                                                                                                    <pre className="whitespace-pre-wrap">{JSON.stringify(info, null, 2)}</pre>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    )}
                                                                                </React.Fragment>
                                                                            );
                                                                        })
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                            {metaRows.map(([k, v], idx) => (
                                                <tr key={k} className={`${idx % 2 === 0 ? '' : ''}`}>
                                                    <td className="pl-3 py-1 align-top w-52 font-medium ">{k}</td>
                                                    <td className="pl-3 py-1 align-top  whitespace-pre-wrap">
                                                        {isUsingSample ? <LoadingGrayText className="w-40 h-4" /> : v}
                                                    </td>
                                                </tr>
                                            ))}

                                            <tr className="">
                                                <td className="pl-3 py-3 font-medium">kvFilter</td>
                                                <td className="pl-3 py-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {isUsingSample ? (
                                                            <>
                                                                <div className="rounded-md p-2 border">
                                                                    <LoadingGrayText className="w-24 h-4" />
                                                                </div>
                                                                <div className="rounded-md p-2 border">
                                                                    <LoadingGrayText className="w-20 h-4" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            kvFilterEntries.map(([k, v]) => (
                                                                <div key={k} className="rounded-md p-2 border">
                                                                    <div className="text-xs ">{k}</div>
                                                                    <div className="text-sm font-medium">{v}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td className="pl-3 py-3 font-medium">params</td>
                                                <td className="pl-3 py-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        {isUsingSample ? (
                                                            <>
                                                                <div className="rounded-md p-2 border"><LoadingGrayText className="w-28 h-4" /></div>
                                                                <div className="rounded-md p-2 border"><LoadingGrayText className="w-20 h-4" /></div>
                                                                <div className="rounded-md p-2 border"><LoadingGrayText className="w-24 h-4" /></div>
                                                            </>
                                                        ) : (
                                                            paramsEntries.map(([k, v]) => (
                                                                <div key={k} className="rounded-md p-2 border">
                                                                    <div className="text-xs ">{k}</div>
                                                                    <div className="text-sm font-medium">{v}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            <tr className="">
                                                <td className="pl-3 py-3 font-medium">dataSource</td>
                                                <td className="pl-3 py-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {isUsingSample ? (
                                                            <>
                                                                <div className="rounded-md p-2 border"><LoadingGrayText className="w-36 h-4" /></div>
                                                                <div className="rounded-md p-2 border"><LoadingGrayText className="w-28 h-4" /></div>
                                                            </>
                                                        ) : (
                                                            dataSourceEntries.map(([k, v]) => (
                                                                <div key={k} className="rounded-md p-2 border">
                                                                    <div className="text-xs ">{k}</div>
                                                                    <div className="text-sm font-medium">{v}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
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
                            <pre className="mt-2 max-h-60 overflow-auto text-xs  p-3 rounded">
                                {isUsingSample ? <LoadingGrayText className="w-full h-24" /> : JSON.stringify(data, null, 2)}
                            </pre>
                        </details>
                    </section>

                    <aside className="hidden lg:block rounded-2xl p-4 shadow">
                        <h2 className="text-lg font-medium mb-3">Meta</h2>

                        <div className="space-y-3 text-sm ">
                            <div className="flex justify-between gap-2">
                                <span className="">Candidates</span>
                                <span className="font-medium">{isUsingSample ? <LoadingGrayText className="w-8 h-4" /> : data.numCandidates}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="">Status</span>
                                <span className="font-medium capitalize">{isUsingSample ? <LoadingGrayText className="w-12 h-4" /> : data.status}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="">Fetched at</span>
                                <span className="font-medium">{isUsingSample ? <LoadingGrayText className="w-28 h-4" /> : data.dataSource.fetchedAt}</span>
                            </div>
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                                className="w-full text-sm px-3 py-2 rounded-lg border hover:"
                                disabled={isUsingSample}
                            >
                                Quick Copy JSON
                            </button>
                        </div>
                    </aside>
                </div>

                <footer className="mt-6 text-sm ">
                    <Flex direction="column">
                        <Text as="p" color="gray" className="text-[0.5rem] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                            통화 단위: $ (USD)
                        </Text>
                    </Flex>
                </footer>
            </div>
        </div>
    );
}
