import { NextResponse } from "next/server";
import { buildHomeStockPreview, type HomeStock } from "@/lib/utils/homeStockPreview";
import nasdaq from "@/public/data/usStockSymbols/nasdaq_full_tickers.json";
import nyse from "@/public/data/usStockSymbols/nyse_full_tickers.json";
import amex from "@/public/data/usStockSymbols/amex_full_tickers.json";

export const runtime = "edge";
const usNames = new Map([...nasdaq, ...nyse, ...amex].map(item => [item.symbol, (item as { koreanName?: string }).koreanName || item.name]));

export async function GET(request: Request) {
    const country = new URL(request.url).searchParams.get("country") === "US" ? "US" : "KR";
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) return NextResponse.json({ error: "서버 연결 설정을 확인 중입니다." }, { status: 503 });
    try {
        // 공개 수집 목록을 시장별로 공유 캐시하고, 브라우저에는 조건별 상위 5개만 전달한다.
        const response = await fetch(`${base}/scan/daily?date=latest&strategy=all&limit=2500&sort=market_cap&order=desc&country=${country}`);
        const result = await response.json();
        if (!response.ok || result?.success === false || !Array.isArray(result?.data)) throw new Error("scan unavailable");
        const list: HomeStock[] = result.data.map((item: HomeStock) => ({
            ticker: item.ticker, name: country === "US" ? usNames.get(item.ticker) || item.name : item.name, last_price: item.last_price,
            per: item.per, pbr: item.pbr, ncav_ratio: item.ncav_ratio,
            market_cap: item.market_cap, scan_date: item.scan_date,
        }));
        return NextResponse.json(buildHomeStockPreview(list, result.meta?.matched ?? list.length, result.meta?.scanDate ?? null), {
            headers: { "Cache-Control": "public, s-maxage=300, max-age=60" },
        });
    } catch {
        return NextResponse.json({ error: "발굴 종목을 불러오지 못했습니다. 다시 시도해 주세요." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
}
