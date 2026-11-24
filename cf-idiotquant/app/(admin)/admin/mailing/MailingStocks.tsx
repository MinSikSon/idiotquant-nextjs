"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/pageHeader";
import SearchAutocomplete from "@/components/searchAutoComplete";
import { apiRequest } from "@/lib/features/apiRequest";
import { loadStaticStockData, type StaticStockData } from "@/lib/utils/stockSearchData";

type Market = "KR" | "US";
type Stock = { market: Market; ticker: string; name: string };

export default function MailingStocks() {
    const [stocks, setStocks] = useState<Stock[] | null>(null);
    const [directory, setDirectory] = useState<StaticStockData | null>(null);
    const [directoryError, setDirectoryError] = useState(false);
    const [market, setMarket] = useState<Market>("KR");
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let current = true;
        void apiRequest("/billing/mailing/stocks").then(result => {
            if (!current) return;
            if (result.success) setStocks(result.data);
            else setError(result.error);
        });
        void loadStaticStockData().then(result => {
            if (current) setDirectory(result);
        }).catch(() => { if (current) setDirectoryError(true); });
        return () => { current = false; };
    }, [refresh]);

    const marketStocks = useMemo(() => market === "KR" ? directory?.krStocks ?? [] : directory?.usStocks ?? [], [directory, market]);
    const symbols = useMemo(() => [...new Set(marketStocks.map(stock => stock.symbol))], [marketStocks]);

    async function update(stock: Stock, action: "add" | "remove") {
        if (busy) return;
        setBusy(true);
        setError("");
        setNotice("");
        const result = await apiRequest("/billing/mailing/stocks", { method: "POST", body: { action, ...stock } });
        setBusy(false);
        if (!result.success) {
            setError(result.error);
            return;
        }
        setStocks(result.data);
        setQuery("");
        setNotice(action === "add" ? `${stock.name} 종목을 추가했습니다.` : `${stock.name} 종목을 제외했습니다.`);
    }

    function add(ticker: string) {
        const stock = marketStocks.find(entry => entry.symbol === ticker);
        if (!stock) return;
        void update({ market, ticker, name: stock.koreanName || stock.name }, "add");
    }

    return <>
        <PageHeader icon={<Mail size={18} />} title="발송 종목 관리" mobileTitleInNavigation />
        <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 text-neutral-900 dark:text-neutral-100 sm:px-6">
            <Link href="/admin" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-ink hover:underline">어드민 대시보드</Link>
            <section aria-labelledby="mailing-picks" className="space-y-3 rounded-lg border border-neutral-300 bg-white p-4 dark:border-border-subtle-dark dark:bg-surface-dark-card">
                <h2 id="mailing-picks" className="text-lg font-semibold">무료 메일 발송 종목</h2>
                <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">이 목록의 전략별 목표가 도달 여부를 수신을 신청한 회원에게 보냅니다.</p>
                <div className="flex flex-wrap items-start gap-2">
                    <label className="sr-only" htmlFor="mailing-market">시장</label>
                    <select id="mailing-market" value={market} disabled={busy}
                        onChange={event => { setMarket(event.target.value as Market); setQuery(""); }}
                        className="min-h-11 rounded-md border border-neutral-400 bg-transparent px-3 text-base dark:border-border-subtle-dark">
                        <option value="KR">한국</option>
                        <option value="US">미국</option>
                    </select>
                    <div className="min-w-0 flex-1 basis-52">
                        <SearchAutocomplete value={query} onQueryChange={setQuery} validCorpNameArray={symbols}
                            stockNames={marketStocks} selectionRequired onSearchButton={add}
                            disabled={busy || !stocks || !directory} loading={!directory && !directoryError}
                            placeHolder="추가할 종목명 또는 코드" />
                    </div>
                </div>
                {directoryError && <p role="alert" className="text-sm">종목 목록을 불러오지 못했습니다.</p>}
                {stocks?.length ? (
                    <ul className="divide-y divide-neutral-200 dark:divide-border-subtle-dark">
                        {stocks.map(stock => (
                            <li key={`${stock.market}:${stock.ticker}`} className="flex items-center justify-between gap-3 py-1">
                                <div className="min-w-0 break-words text-sm">
                                    <Link href={`/analyze?ticker=${encodeURIComponent(stock.ticker)}`} className="font-semibold hover:underline">{stock.name}</Link>
                                    <span className="ml-2 text-neutral-600 dark:text-neutral-300">{stock.market === "KR" ? "한국" : "미국"} · {stock.ticker}</span>
                                </div>
                                <button type="button" disabled={busy} onClick={() => void update(stock, "remove")} aria-label={`${stock.name} 발송 제외`}
                                    className="min-h-11 shrink-0 px-2 text-sm font-semibold text-brand-ink disabled:opacity-50">제외</button>
                            </li>
                        ))}
                    </ul>
                ) : stocks
                    ? <p className="text-sm text-neutral-600 dark:text-neutral-300">등록된 발송 종목이 없습니다.</p>
                    : !error && <p role="status" className="text-sm">발송 종목을 불러오는 중입니다.</p>}
            </section>
            {error && <p role="alert" className="text-sm">{error}</p>}
            {(directoryError || (error && !stocks)) && (
                <button type="button" onClick={() => { setError(""); setDirectoryError(false); setRefresh(count => count + 1); }}
                    className="min-h-11 text-sm font-semibold text-brand-ink">다시 불러오기</button>
            )}
            {notice && <p role="status" className="text-sm">{notice}</p>}
        </main>
    </>;
}
