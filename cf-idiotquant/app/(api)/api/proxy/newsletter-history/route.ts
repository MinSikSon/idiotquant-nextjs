import { auth } from "@/auth";
import { createBackendHeaders } from "@/lib/server/proxyIdentity";
import { mergeValuationSnapshots, parseStockKey, scanPath, scanSnapshot, type ValuationSnapshot } from "@/lib/utils/newsletterValuation";

export const runtime = "edge";
const headers = { "Cache-Control": "private, no-store" };

function failure(error: string, status: number, code?: string) {
    return Response.json({ success: false, error, code }, { status, headers });
}

export async function GET(request: Request) {
    const stock = parseStockKey(new URL(request.url).searchParams.get("stock"));
    if (!stock) return failure("종목을 확인해 주세요.", 400);
    const user = (await auth())?.user;
    if (!user?.id) return failure("로그인이 필요합니다.", 401, "SIGN_IN_REQUIRED");

    const billingBase = process.env.BILLING_WORKER_URL?.replace(/\/$/, "");
    const marketBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    const secret = process.env.BILLING_INTERNAL_JWT_SECRET;
    if (!billingBase || !marketBase || !secret) {
        return failure("이용권과 과거 비교 서버 연결을 확인 중입니다.", 503);
    }

    try {
        const identity = await createBackendHeaders(new Headers(), { id: user.id }, secret, true);
        // Pages rejects redirect: "error". A manual redirect fails the response.ok check below.
        const billingResponse = await fetch(`${billingBase}/billing`, {
            headers: identity, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8000),
        });
        if (!billingResponse.ok) return failure("이용권 정보를 불러오지 못했습니다.", 502);
        const billing = await billingResponse.json();
        if (billing.success !== true) return failure("이용권 정보를 불러오지 못했습니다.", 502);
        const access = billing.data?.alerts;
        if (access?.status !== "active" || !(Date.parse(access.expiresAt) > Date.now())) {
            return failure("과거 비교에는 활성 이용권이 필요합니다.", 403, "PASS_REQUIRED");
        }

        const sources = await Promise.allSettled((["monthly", "weekly", "daily"] as const).map(async source => {
            const response = await fetch(marketBase + scanPath(stock, source), {
                cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error("scan source failed");
            const payload = await response.json();
            if (payload.success !== true || !Array.isArray(payload.data)) throw new Error("invalid scan data");
            return payload.data.flatMap((row: Record<string, unknown> | null) => {
                const snapshot = row && scanSnapshot(row, stock);
                return snapshot ? [snapshot] : [];
            }) as ValuationSnapshot[];
        }));
        const groups = sources.flatMap(source => source.status === "fulfilled" ? [source.value] : []);
        if (!groups.length || (!groups.some(group => group.length) && groups.length < sources.length)) {
            return failure("과거 비교 기록을 불러오지 못했습니다.", 502);
        }
        return Response.json({
            success: true,
            data: mergeValuationSnapshots(groups),
            partial: groups.length < sources.length,
        }, { headers });
    } catch {
        return failure("과거 비교를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
    }
}
