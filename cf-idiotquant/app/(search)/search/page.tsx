"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useStockSearch } from "./hooks/useStockSearch";
import { StockHeader } from "./components/StockHeader"; // 아래 별도 구현
import { ValuationSection } from "./components/ValuationSection"; // 아래 별도 구현
import { FinancialTables } from "./components/FinancialTables"; // 아래 별도 구현
import FinnhubTable from "./table";
import SearchAutocomplete from "@/components/searchAutoComplete";
import { selectKrMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice";
import { Tag, Card, Elevation } from "@blueprintjs/core";
import validCorpNameArray from "@/public/data/validCorpNameArray.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";
import { SearchGuide } from "./components/SearchGuide";
import { MdTableTemplate } from "./components/MdTableTemplate";
import { StockMetrics } from "./components/StockMetrics";

const all_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers, ...validCorpNameArray];

export default function SearchPage() {
    const { onSearch, krOrUs, response, data } = useStockSearch();
    const krMarketHistory = useAppSelector(selectKrMarketHistory);
    const [fixed, setFixed] = useState(false);

    useEffect(() => {
        const handleScroll = () => setFixed(window.scrollY > 140);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const hasData = krOrUs === "KR" ? data.kiChart.state === "fulfilled" : data.usSearchInfo.state === "fulfilled";

    return (
        <div className="w-full min-h-screen !bg-gray-50 dark:!bg-zinc-950">
            <div className={`z-30 w-full transition-all ${fixed ? "fixed top-0 shadow-md" : "relative"} bg-white dark:bg-zinc-900 dark:border-zinc-800`}>
                <SearchAutocomplete placeHolder="🇰🇷 종목명 또는 🇺🇸 티커" onSearchButton={onSearch} validCorpNameArray={all_tickers} />
                <div className="flex px-4 py-1 gap-1 overflow-x-auto no-scrollbar bg-white dark:bg-zinc-900 border-t dark:border-zinc-800">
                    {krMarketHistory.slice(-6).reverse().map((s, i) => (
                        <Tag key={i} interactive round minimal onClick={() => onSearch(s)} className="cursor-pointer">
                            {s}
                        </Tag>
                    ))}
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-4 md:p-6">
                {!hasData ? (
                    <SearchGuide />
                ) : (
                    <>
                        <StockHeader data={data} isUs={krOrUs === "US"} isFixed={fixed} />
                        <StockMetrics data={data} isUs={krOrUs === "US"} />
                        <ValuationSection data={data} isUs={krOrUs === "US"} />
                        {krOrUs === "KR" ? (
                            <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                        ) : (
                            <FinnhubTable data={data.finnhubData.data} />
                        )}
                        {response && (
                            <Card elevation={Elevation.TWO} className="mt-8 border-t-4 !border-blue-500 dark:!bg-zinc-900">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <MdTableTemplate content={response} />
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}