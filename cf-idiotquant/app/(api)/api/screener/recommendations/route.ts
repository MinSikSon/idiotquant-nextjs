import { NextResponse } from "next/server";
import { selectGuestRecommendations } from "@/lib/utils/guestRecommendations";

export const runtime = "edge";

const CACHE_SECONDS = 300;

export async function GET(request: Request) {
    const country = new URL(request.url).searchParams.get("country") === "US" ? "US" : "KR";
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!baseUrl) return NextResponse.json({ success: false, error: "Scan API unavailable" }, { status: 503 });

    try {
        const url = `${baseUrl}/scan/daily?date=latest&strategy=all&limit=2500&sort=ncav_ratio&order=desc&country=${country}`;
        const response = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
        if (!response.ok) throw new Error(`Scan API HTTP ${response.status}`);
        const result = await response.json();
        if (result?.success === false || !Array.isArray(result?.data)) throw new Error("Invalid scan response");

        return NextResponse.json(
            { ...result, data: selectGuestRecommendations(result.data), meta: { ...result.meta, country } },
            { headers: { "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS}` } }
        );
    } catch (error) {
        console.error("Guest recommendations:", error);
        return NextResponse.json({ success: false, error: "Recommendations unavailable" }, { status: 502 });
    }
}
