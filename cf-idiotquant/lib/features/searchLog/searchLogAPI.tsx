import { apiRequest } from "../apiRequest";
import { recordSearchOnce, type SearchLogEntry } from "./tracking";

export const postSearchLog = (data: SearchLogEntry) => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* 브라우저 저장소 없이도 기록할 수 있다. */ }
    return recordSearchOnce(data, entry => apiRequest("/api/search-log/", { method: "POST", body: entry }), storage);
};

// count 는 이 엔드포인트가 쿼리가 아니라 헤더로 받는다.
export const getSearchLog = (count: string) =>
    apiRequest("/api/search-log/", { headers: { count } });
