import { apiRequest } from "../apiRequest";

export const postSearchLog = (data: { ticker: string; name: string; isUs: boolean }) =>
    apiRequest("/api/search-log/", { method: "POST", body: data });

// count 는 이 엔드포인트가 쿼리가 아니라 헤더로 받는다.
export const getSearchLog = (count: string) =>
    apiRequest("/api/search-log/", { headers: { count } });
