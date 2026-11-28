import { newsletterMarketBase } from "@/lib/server/newsletterMarket";
import { parseStockKey, scanPath, scanSnapshot } from "@/lib/utils/newsletterValuation";

export const runtime = "edge";

export async function GET(request: Request) {
    const stock = parseStockKey(new URL(request.url).searchParams.get("stock"));
    if (!stock) return Response.json({ success: false, error: "종목을 확인해 주세요." }, { status: 400 });

    const marketBase = newsletterMarketBase();
    if (!marketBase) {
        return Response.json({ success: false, error: "스캔 서버 연결을 확인 중입니다." }, { status: 503 });
    }

    try {
        const upstream = await fetch(marketBase + scanPath(stock, "latest"), {
            cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8000),
        });
        if (!upstream.ok) throw new Error("scan source unavailable");
        const payload = await upstream.json();
        if (payload.success !== true || !Array.isArray(payload.data)) throw new Error("invalid scan response");
        const snapshot = payload.data[0] ? scanSnapshot(payload.data[0], stock) : null;
        return Response.json({ success: true, data: snapshot });
    } catch {
        return Response.json({ success: false, error: "최근 스캔을 불러오지 못했습니다." }, { status: 502 });
    }
}
