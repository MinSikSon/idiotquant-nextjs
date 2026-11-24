import { jwtVerify } from "jose";
import { valuationModels } from "@/lib/utils/valuationModels";
import { valuationSummary } from "@/lib/utils/valuationSummary";

export const runtime = "edge";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
    const secret = process.env.BILLING_INTERNAL_JWT_SECRET;
    if (!secret) return new Response(null, { status: 503, headers });
    try {
        const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
        if (!token) return new Response(null, { status: 401, headers });
        await jwtVerify(token, new TextEncoder().encode(secret), {
            algorithms: ["HS256"],
            audience: "watchlist-valuation",
            issuer: "idiotquant-billing",
            requiredClaims: ["exp"],
        });
    } catch {
        return new Response(null, { status: 401, headers });
    }

    const { searchParams } = new URL(request.url);
    const market = searchParams.get("market");
    const ticker = searchParams.get("ticker") ?? "";
    const isUs = market === "US";
    if ((market !== "KR" && !isUs) ||
        !(isUs ? /^[A-Z][A-Z0-9.-]{0,14}$/ : /^\d{6}$/).test(ticker)) {
        return new Response(null, { status: 400, headers });
    }
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) return new Response(null, { status: 503, headers });

    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    // Match the inputs fetched by useStockSearch for the Analyze valuation panel.
    const sources = isUs ? {
        usDetail: "/uapi/overseas-price/v1/quotations/price-detail",
        finnhubData: "/finnhub/api/v1/stock/financials-reported",
    } : {
        kiPrice: "/uapi/domestic-stock/v1/quotations/inquire-price",
        kiChart: "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
        kiBS: "/uapi/domestic-stock/v1/finance/balance-sheet",
        kiIS: "/uapi/domestic-stock/v1/finance/income-statement",
    };
    const results = await Promise.allSettled(Object.entries(sources).map(async ([key, path]) => {
        const url = new URL(base + path);
        url.searchParams.set("PDNO", ticker);
        if (key === "kiChart") {
            url.searchParams.set("FID_INPUT_DATE_1", "20170101");
            url.searchParams.set("FID_INPUT_DATE_2", date);
        }
        const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error("market_data_unavailable");
        const result = await response.json();
        if (result?.success === false || (key !== "finnhubData" && result?.rt_cd !== "0")) {
            throw new Error("market_data_unavailable");
        }
        return [key, result] as const;
    }));
    const data = Object.fromEntries(results.flatMap(result =>
        result.status === "fulfilled" ? [result.value] : []
    ));
    const price = Number(isUs ? data.usDetail?.output?.last : data.kiPrice?.output?.stck_prpr);
    const targets = new Map(valuationSummary(valuationModels(data, isUs))
        .map(({ type, targetPrice }) => [type, targetPrice]));
    const models = isUs ? ["NCAV", "SRIM", "PEG", "DCF", "PER"] : ["NCAV", "PBR", "SRIM", "PER"];

    return Response.json({
        price: Number.isFinite(price) && price > 0 ? price : null,
        targets: models.map(type => ({ type, price: targets.get(type) ?? null })),
    }, { headers });
}
