import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublicRequestCache } from "@/lib/utils/publicRequestCache";

test("공개 목록의 동시·완료 요청을 재사용하고 반환 객체는 공유하지 않는다", async () => {
    const reuse = createPublicRequestCache<{ rows: number[] }>();
    let requests = 0;
    const load = async () => { requests++; return { rows: [1] }; };
    const [home, screener] = await Promise.all([reuse("KR:preview", load), reuse("KR:preview", load)]);
    home.rows.push(2);
    assert.deepEqual(screener.rows, [1]);
    assert.deepEqual((await reuse("KR:preview", load)).rows, [1]);
    assert.equal(requests, 1);
    await reuse("US:preview", load);
    await reuse("KR:full", load);
    assert.equal(requests, 3, "국가와 미리보기·전체 목록을 구분한다");
});

test("유효기간 만료·수동 새로고침은 요청하고 실패한 결과는 저장하지 않는다", async () => {
    let time = 0, requests = 0;
    const reuse = createPublicRequestCache<number>(30, 4, () => time);
    const load = async () => ++requests;
    assert.equal(await reuse("x", load), 1);
    time = 29;
    assert.equal(await reuse("x", load), 1);
    time = 30;
    assert.equal(await reuse("x", load), 2);
    assert.equal(await reuse("x", load, true), 3);
    await assert.rejects(reuse("error", async () => { throw new Error("offline"); }));
    assert.equal(await reuse("error", load), 4);
});

test("오래 걸린 이전 요청의 실패가 새 요청을 지우지 않으며 보관량을 제한한다", async () => {
    let time = 0;
    const reuse = createPublicRequestCache<number>(30, 2, () => time);
    let reject!: (reason: Error) => void;
    const pending = reuse("x", () => new Promise((_, fail) => { reject = fail; }));
    await Promise.resolve();
    time = 31;
    assert.equal(await reuse("x", async () => 2), 2);
    reject(new Error("old request"));
    await assert.rejects(pending);
    assert.equal(await reuse("x", async () => 3), 2);
    await reuse("y", async () => 4);
    await reuse("z", async () => 5);
    assert.equal(await reuse("x", async () => 6), 6, "보관 개수를 넘긴 오래된 키는 다시 조회한다");
});
