// /api/proxy 요청 래퍼.
//
// 이 래퍼의 약속은 하나뿐이다: **절대 던지지 않는다.** 워커가 죽어 HTML 오류
// 페이지가 돌아오든 네트워크가 끊기든, 부르는 쪽은 언제나 객체를 받는다.
// 그게 깨지면 사용자는 다시 "The string did not match the expected pattern." 을 본다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { apiRequest } from "../lib/features/apiRequest.ts";

/** globalThis.fetch 를 갈아끼워 응답을 정한다. */
function serve(body: string, status = 200) {
    (globalThis as any).fetch = async () => new Response(body, { status });
}
function offline() {
    (globalThis as any).fetch = async () => { throw new TypeError("Failed to fetch"); };
}

test("정상 JSON 은 본문 그대로, status 를 얹어서", async () => {
    serve(JSON.stringify({ success: true, data: [1, 2] }));

    const r = await apiRequest("/user/ledger");
    assert.equal(r.success, true);
    assert.deepEqual(r.data, [1, 2]);
    assert.equal(r.status, 200);
});

test("워커가 HTML 오류 페이지를 주면 던지지 않고 읽히는 말로 바꾼다", async () => {
    serve("<!DOCTYPE html><html>Worker threw exception 1101</html>", 500);

    const r = await apiRequest("/user/ledger");
    assert.equal(r.success, false);
    assert.equal(r.status, 500);
    // 원문이 화면으로 새면 안 된다 — 예전에 '<!DOCTYPE html…' 이 토스트에 떴었다.
    assert.ok(!r.error.includes("DOCTYPE"));
});

test("네트워크가 끊기면 status 0", async () => {
    offline();

    const r = await apiRequest("/user/ledger");
    assert.equal(r.success, false);
    assert.equal(r.status, 0);
});

test("배열 응답은 배열 그대로 — 객체로 펼치면 모양이 깨진다", async () => {
    serve(JSON.stringify([{ id: 1 }, { id: 2 }]));

    const r = await apiRequest("/scan/daily");
    assert.ok(Array.isArray(r));
    assert.equal(r.length, 2);
});

test("status 를 실어 보낸다 — tradingStatus 가 404 로 '계정 없음'을 읽는다", async () => {
    serve(JSON.stringify({ success: false, error: "없음" }), 404);

    const r = await apiRequest("/trading/account-status");
    assert.equal(r.status, 404);
    assert.equal(r.success, false);
});

test("빈 본문도 실패로 처리하고 터지지 않는다", async () => {
    serve("", 200);

    const r = await apiRequest("/user/likes");
    assert.equal(r.success, false);
    assert.ok(Number.isFinite(r.status));
});

test("워커가 준 오류 문구는 그대로 살린다", async () => {
    serve(JSON.stringify({ success: false, error: "같은 이름의 항목이 이미 있습니다." }), 400);

    const r = await apiRequest("/user/ledger/categories");
    assert.equal(r.error, "같은 이름의 항목이 이미 있습니다.");
});

test("body 를 주면 JSON 으로 실어 보낸다", async () => {
    let sent: any = null;
    (globalThis as any).fetch = async (_url: string, init: RequestInit) => {
        sent = init;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    await apiRequest("/user/ledger", { method: "POST", body: { amount: 5000 } });
    assert.equal(sent.method, "POST");
    assert.equal(sent.body, JSON.stringify({ amount: 5000 }));
});

test("요청마다 붙는 헤더를 받는다 — search-log 의 count 가 그렇다", async () => {
    let sent: any = null;
    (globalThis as any).fetch = async (_url: string, init: RequestInit) => {
        sent = init;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    await apiRequest("/api/search-log/", { headers: { count: "10" } });
    assert.equal((sent.headers as any).count, "10");
});
