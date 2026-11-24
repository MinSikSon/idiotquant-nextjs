import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT } from "jose";
import { GET } from "../app/(api)/api/internal/watchlist-valuation/route.ts";

test("watchlist valuation checks the billing signature and uses Analyze prices and model inputs", async t => {
    const secret = "watchlist-test-secret";
    const previous = {
        BILLING_INTERNAL_JWT_SECRET: process.env.BILLING_INTERNAL_JWT_SECRET,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    };
    t.after(() => {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });
    process.env.BILLING_INTERNAL_JWT_SECRET = secret;
    process.env.NEXT_PUBLIC_API_URL = "https://market.example";
    const token = (audience: string) => new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("idiotquant-billing")
        .setAudience(audience)
        .setExpirationTime("1m")
        .sign(new TextEncoder().encode(secret));
    const request = (market: string, ticker: string, bearer: string) => GET(
        new Request(`https://frontend.example/api/internal/watchlist-valuation?market=${market}&ticker=${ticker}`,
            { headers: { Authorization: `Bearer ${bearer}` } }),
    );
    const fetch = t.mock.method(globalThis, "fetch", async (input: URL) => {
        assert.equal(input.origin, "https://market.example");
        if (input.searchParams.get("PDNO") === "AAPL") {
            if (input.pathname.endsWith("/price-detail")) return Response.json({ rt_cd: "0", output: { last: "125.25" } });
            assert.match(input.pathname, /financials-reported$/);
            return Response.json({ data: [] });
        }
        assert.equal(input.searchParams.get("PDNO"), "005930");
        if (input.pathname.endsWith("/inquire-price")) {
            return Response.json({ rt_cd: "0", output: { stck_prpr: "75000" } });
        }
        if (input.pathname.endsWith("/inquire-daily-itemchartprice")) {
            assert.equal(input.searchParams.get("FID_INPUT_DATE_1"), "20170101");
            return Response.json({ rt_cd: "0", output1: { lstn_stcn: "1000000", stck_prpr: "68000" } });
        }
        if (input.pathname.endsWith("/balance-sheet")) {
            return Response.json({ rt_cd: "0", output: [{ cras: "1000", total_lblt: "250" }] });
        }
        assert.match(input.pathname, /income-statement$/);
        return new Response(null, { status: 503 });
    });

    const signed = await token("watchlist-valuation");
    assert.equal((await request("KR", "005930", await token("billing"))).status, 401);
    assert.equal((await request("KR", "../../005930", signed)).status, 400);
    assert.equal(fetch.mock.callCount(), 0);

    const kr = await (await request("KR", "005930", signed)).json();
    assert.equal(kr.price, 75000);
    assert.deepEqual(kr.targets.find(({ type }: { type: string }) => type === "NCAV"), { type: "NCAV", price: 75000 });
    assert.ok(kr.targets.filter(({ type }: { type: string }) => type === "SRIM" || type === "PER")
        .every(({ price }: { price: number | null }) => price === null));

    const us = await (await request("US", "AAPL", signed)).json();
    assert.equal(us.price, 125.25);
    assert.deepEqual(us.targets.map(({ type }: { type: string }) => type), ["NCAV", "SRIM", "PEG", "DCF", "PER"]);
});
