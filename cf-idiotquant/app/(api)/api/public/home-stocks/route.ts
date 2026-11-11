import { NextResponse } from "next/server";
import { HOME_STOCK_FILTERS, type HomeStock, type HomeStockPreview } from "@/lib/utils/homeStockPreview";
import nasdaq from "@/public/data/usStockSymbols/nasdaq_full_tickers.json";
import nyse from "@/public/data/usStockSymbols/nyse_full_tickers.json";
import amex from "@/public/data/usStockSymbols/amex_full_tickers.json";

export const runtime = "edge";
const usNames = new Map([...nasdaq, ...nyse, ...amex].map(item => [item.symbol, (item as { koreanName?: string }).koreanName || item.name]));

export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const country = params.get("country") === "US" ? "US" : "KR";
    const limit = params.get("view") === "discovery" ? 10 : 5;
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) return NextResponse.json({ error: "서버 연결 설정을 확인 중입니다." }, { status: 503 });
    try {
        // The scanner materializes each strategy once; requests read only the stored small list.
        const response = await fetch(`${base}/scan/home?country=${country}`);
        const result = await response.json();
        const snapshot: HomeStockPreview = result?.data;
        if (!response.ok || result?.success === false || !snapshot?.groups || !HOME_STOCK_FILTERS.every(({ id }) => Array.isArray(snapshot.groups[id]))) throw new Error("snapshot unavailable");
        const groups = Object.fromEntries(HOME_STOCK_FILTERS.map(({ id }) => [id, snapshot.groups[id].slice(0, limit).map((item: HomeStock) => ({
            ...item, name: country === "US" ? usNames.get(item.ticker) || item.name : item.name,
        }))]));
        return NextResponse.json({ ...snapshot, groups }, {
            headers: { "Cache-Control": "public, s-maxage=60, max-age=30" },
        });
    } catch {
        return NextResponse.json({ error: "발굴 종목을 불러오지 못했습니다. 다시 시도해 주세요." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
}
