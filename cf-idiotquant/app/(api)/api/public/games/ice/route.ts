import { DIRECT_ICE_SERVERS } from "@/lib/rogue/online";

export const runtime = "edge";

/** 장기 TURN 키는 서버에만 두고 브라우저에는 단기 ICE 인증만 돌려준다. */
export async function POST(request: Request): Promise<Response> {
    const headers = { "Cache-Control": "no-store" };
    if (request.headers.get("origin") !== new URL(request.url).origin) {
        return Response.json({ error: "Forbidden" }, { status: 403, headers });
    }
    const key = process.env.CLOUDFLARE_TURN_KEY_ID;
    const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
    if (!key || !token) return Response.json({ iceServers: DIRECT_ICE_SERVERS, relay: false }, { headers });
    try {
        const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(key)}/credentials/generate-ice-servers`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ ttl: 86400 }),
            signal: AbortSignal.timeout(4000),
            cache: "no-store",
        });
        if (!response.ok) throw new Error("TURN credential request failed");
        const data = await response.json();
        if (!Array.isArray(data.iceServers) || !data.iceServers.length) throw new Error("Invalid TURN response");
        return Response.json({ iceServers: data.iceServers, relay: true }, { headers });
    } catch {
        return Response.json({ iceServers: DIRECT_ICE_SERVERS, relay: false }, { headers });
    }
}
