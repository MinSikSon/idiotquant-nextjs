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
    const [format, setFormat] = useState<{ title: string; note: string } | null>(null);
    const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
    const [formatBusy, setFormatBusy] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [formatMessage, setFormatMessage] = useState("");

    useEffect(() => {
        let current = true;
        void apiRequest("/billing/mailing/stocks").then(result => {
            if (!current) return;
            if (result.success) setStocks(result.data);
            else setError(result.error);
        });
        void apiRequest("/billing/mailing/stocks?format=1").then(result => {
            if (!current) return;
            if (result.success) setFormat(result.data);
            else setFormatMessage(result.error);
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

    async function updateFormat(action: "format" | "preview" | "test") {
        if (!format || formatBusy) return;
        setFormatBusy(true);
        setFormatMessage("");
        const result = await apiRequest("/billing/mailing/stocks", { method: "POST", body: { action, ...format, ...(action === "test" ? { email: testEmail } : {}) } });
        setFormatBusy(false);
        if (!result.success) { setFormatMessage(result.error); return; }
        if (action === "preview") setPreview(result.data);
        else if (action === "test") setFormatMessage(`${result.data.recipient}에 테스트 메일 발송을 요청했습니다.`);
        else { setFormat(result.data); setFormatMessage("메일 포맷을 저장했습니다."); }
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
            <section aria-labelledby="mailing-format" className="space-y-3 rounded-lg border border-neutral-300 bg-white p-4 dark:border-border-subtle-dark dark:bg-surface-dark-card">
                <h2 id="mailing-format" className="text-lg font-semibold">메일 포맷</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">제목과 안내 문구는 저장 후 다음 발송부터 적용됩니다. 미리보기는 현재 입력 내용과 발송 종목을 사용합니다.</p>
                {format ? <>
                    <label htmlFor="mailing-title" className="block text-sm font-semibold">제목</label>
                    <input id="mailing-title" value={format.title} maxLength={100} onChange={event => setFormat({ ...format, title: event.target.value })}
                        className="min-h-11 w-full rounded-md border border-neutral-400 bg-transparent px-3 text-base dark:border-border-subtle-dark" />
                    <label htmlFor="mailing-note" className="block text-sm font-semibold">안내 문구</label>
                    <textarea id="mailing-note" value={format.note} maxLength={2000} rows={3} onChange={event => setFormat({ ...format, note: event.target.value })}
                        className="w-full rounded-md border border-neutral-400 bg-transparent p-3 text-base dark:border-border-subtle-dark" />
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={formatBusy || !format.title.trim() || !format.note.trim()} onClick={() => void updateFormat("format")}
                            className="min-h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">저장</button>
                        <button type="button" disabled={formatBusy || !format.title.trim() || !format.note.trim()} onClick={() => void updateFormat("preview")}
                            className="min-h-11 rounded-md border border-neutral-400 px-4 text-sm font-semibold disabled:opacity-50">{formatBusy ? "처리 중…" : "메일 미리보기"}</button>
                    </div>
                    <form onSubmit={event => { event.preventDefault(); void updateFormat("test"); }} className="space-y-2 border-t border-neutral-200 pt-3 dark:border-border-subtle-dark">
                        <label htmlFor="mailing-test-email" className="block text-sm font-semibold">테스트 수신 이메일</label>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">현재 입력 내용과 발송 종목으로 테스트 메일 한 통을 보냅니다. 저장하지 않은 문구도 적용됩니다.</p>
                        <div className="flex flex-wrap gap-2">
                            <input id="mailing-test-email" type="email" required value={testEmail} onChange={event => setTestEmail(event.target.value)}
                                className="min-h-11 min-w-0 flex-1 basis-52 rounded-md border border-neutral-400 bg-transparent px-3 text-base dark:border-border-subtle-dark" />
                            <button type="submit" disabled={formatBusy || !format.title.trim() || !format.note.trim() || !testEmail.trim()}
                                className="min-h-11 rounded-md border border-neutral-400 px-4 text-sm font-semibold disabled:opacity-50">테스트 메일 보내기</button>
                        </div>
                    </form>
                </> : <p className="text-sm">{formatMessage || "메일 포맷을 불러오는 중입니다."}</p>}
                {format && formatMessage && <p role="status" className="text-sm">{formatMessage}</p>}
                {preview && <div className="space-y-2">
                    <h3 className="font-semibold">메일 미리보기</h3>
                    <p className="break-words text-sm"><strong>제목:</strong> {preview.subject}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">조회 시점의 가격과 목표가입니다. 발송 시 다시 조회합니다.</p>
                    <iframe title="실제 메일 본문 미리보기" sandbox="" srcDoc={preview.html} className="h-[600px] w-full rounded-md border border-neutral-300 bg-white" />
                </div>}
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
