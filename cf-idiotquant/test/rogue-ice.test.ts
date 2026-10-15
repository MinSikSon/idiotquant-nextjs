import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "@/app/(api)/api/public/games/ice/route";
import { DIRECT_ICE_SERVERS, loadOnlineConfig, onlineErrorMessage } from "@/lib/rogue/online";

test("중계 인증은 서버에서 발급하며 미설정·장애 시 직접 연결은 유지한다", async (t) => {
    const key = process.env.CLOUDFLARE_TURN_KEY_ID;
    const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
    const req = (origin = "https://game.example") => new Request("https://game.example/api/public/games/ice", { method: "POST", headers: { origin } });
    try {
        delete process.env.CLOUDFLARE_TURN_KEY_ID;
        delete process.env.CLOUDFLARE_TURN_API_TOKEN;
        let response = await POST(req());
        assert.equal(response.headers.get("cache-control"), "no-store", "인증 응답을 공유 캐시에 보관한다");
        assert.deepEqual(await response.json(), { iceServers: DIRECT_ICE_SERVERS, relay: false }, "미설정 시 직접 연결까지 막는다");
        assert.equal((await POST(req("https://other.example"))).status, 403, "다른 사이트가 인증 발급을 요청할 수 있다");

        process.env.CLOUDFLARE_TURN_KEY_ID = "test-key";
        process.env.CLOUDFLARE_TURN_API_TOKEN = "test-server-secret";
        const iceServers = [{ urls: "turns:turn.cloudflare.com:443?transport=tcp", username: "short-user", credential: "short-secret" }];
        const fetchMock = t.mock.method(globalThis, "fetch", async (input: unknown, init?: RequestInit) => {
            assert.equal(input, "https://rtc.live.cloudflare.com/v1/turn/keys/test-key/credentials/generate-ice-servers", "발급 API 주소가 잘못됐다");
            assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-server-secret", "서버 비밀 키로 인증하지 않는다");
            assert.deepEqual(JSON.parse(String(init?.body)), { ttl: 86400 }, "단기 인증 만료 시간을 전달하지 않는다");
            return Response.json({ iceServers }, { status: 201 });
        });
        response = await POST(req());
        const body = await response.text();
        assert.deepEqual(JSON.parse(body), { iceServers, relay: true }, "단기 인증을 브라우저로 넘기지 않는다");
        assert.ok(!body.includes("test-server-secret"), "장기 비밀 키가 응답에 유출됐다");

        fetchMock.mock.mockImplementation(async () => { throw new Error("upstream down"); });
        assert.deepEqual(await (await POST(req())).json(), { iceServers: DIRECT_ICE_SERVERS, relay: false }, "중계 서버 장애가 직접 연결까지 막는다");
    } finally {
        if (key === undefined) delete process.env.CLOUDFLARE_TURN_KEY_ID;
        else process.env.CLOUDFLARE_TURN_KEY_ID = key;
        if (token === undefined) delete process.env.CLOUDFLARE_TURN_API_TOKEN;
        else process.env.CLOUDFLARE_TURN_API_TOKEN = token;
    }
});

test("클라이언트는 발급된 ICE 설정을 쓰며 실패 종류마다 다른 안내를 낸다", async (t) => {
    const iceServers = [{ urls: "turns:turn.example:443", username: "short-user", credential: "short-secret" }];
    const fetchMock = t.mock.method(globalThis, "fetch", async (input: unknown, init?: RequestInit) => {
        assert.equal(input, "/api/public/games/ice");
        assert.equal(init?.method, "POST");
        return Response.json({ iceServers, relay: true });
    });
    assert.deepEqual(await loadOnlineConfig(), { config: { iceServers }, relay: true }, "방장·게스트에 전달할 중계 설정을 잃었다");
    fetchMock.mock.mockImplementation(async () => { throw new Error("offline"); });
    assert.deepEqual(await loadOnlineConfig(), { config: { iceServers: DIRECT_ICE_SERVERS }, relay: false }, "설정 요청 실패 후 직접 연결이 없다");
    assert.match(onlineErrorMessage("peer-unavailable", true), /방 번호/, "방 없음 오류를 연결 중으로 숨긴다");
    assert.match(onlineErrorMessage("webrtc", false), /우회 연결을 사용할 수 없습니다/, "우회가 없는 연결 실패를 구분하지 않는다");
    assert.doesNotMatch(onlineErrorMessage("webrtc", true), /우회 연결을 사용할 수 없습니다/, "중계가 있는데 없다고 안내한다");
    assert.match(onlineErrorMessage("network", false), /연결 서버/, "신호 서버 장애를 구분하지 않는다");
});
