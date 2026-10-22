import { test } from "node:test";
import assert from "node:assert/strict";
import { scanRequestKey, shouldFetchScan } from "@/lib/utils/scanRequest";

const preview = { date: "latest", preview: true };
const ready = { requestKey: scanRequestKey(preview), requestId: null, receivedAt: 1000, state: "fulfilled" };

test("홈과 비로그인 발굴은 기본값과 명시적 KR·limit 차이에도 같은 미리보기다", () => {
    assert.equal(scanRequestKey(preview), scanRequestKey({ ...preview, country: "KR", limit: 10 }));
    assert.notEqual(scanRequestKey(preview), scanRequestKey({ ...preview, country: "US" }));
    assert.notEqual(scanRequestKey(preview), scanRequestKey({ date: "latest" }));
    assert.notEqual(scanRequestKey(preview), scanRequestKey({ ...preview, date: "20260101" }));
    assert.notEqual(scanRequestKey(preview), scanRequestKey({ weeklyPeriod: "20260101" }));
    assert.equal(scanRequestKey(undefined), scanRequestKey("latest"));
});

test("같은 최신 결과는 pending 없이 건너뛰고 만료·새로고침·다른 조건은 조회한다", () => {
    assert.equal(shouldFetchScan(ready, preview, 30_999), false);
    assert.equal(shouldFetchScan(ready, preview, 31_000), true);
    assert.equal(shouldFetchScan(ready, { ...preview, force: true }, 1001), true);
    assert.equal(shouldFetchScan(ready, { ...preview, country: "US" }, 1001), true);
    assert.equal(shouldFetchScan(ready, { preview: false }, 1001), true);
    assert.equal(shouldFetchScan({ ...ready, receivedAt: null, state: "init" }, preview, 1001), true);
    assert.equal(shouldFetchScan({ ...ready, state: "rejected" }, preview, 1001), true);
});

test("같은 요청 진행 중에는 중복 동작을 막고 다른 나라 조회는 허용한다", () => {
    const pending = { ...ready, requestId: "loading", state: "pending" };
    assert.equal(shouldFetchScan(pending, preview, 31_000), false);
    assert.equal(shouldFetchScan(pending, { ...preview, force: true }, 31_000), false);
    assert.equal(shouldFetchScan(pending, { ...preview, country: "US" }, 31_000), true);
});
