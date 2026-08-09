// 모의투자 계좌 API — 로그인 사용자 (백엔드 /user/paper).
// 비로그인은 lib/paper/localAccount.ts 가 같은 모양을 localStorage 로 다룬다.

import type { PaperSnapshot, PaperOrderRow } from "@/lib/paper/types";

async function paperRequest(method: "GET" | "POST", body?: object) {
    try {
        const res = await fetch("/api/proxy/user/paper", {
            method,
            credentials: "include",
            headers: { "content-type": "application/json" },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const text = await res.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* 비 JSON 응답(예: 404 HTML) */ }
        if (!json || typeof json !== "object") {
            return { success: false, status: res.status, error: text ? text.slice(0, 100) : `HTTP ${res.status}` };
        }
        return { ...json, status: res.status };
    } catch {
        return { success: false, status: 0, error: "네트워크 오류" };
    }
}

export type PaperResponse =
    | ({ success: true; status: number; market_open: boolean; filled?: PaperOrderRow } & PaperSnapshot)
    | { success: false; status: number; error: string };

export const getPaperAccount = (): Promise<PaperResponse> => paperRequest("GET");

/**
 * 매수·매도. 체결가는 서버가 KIS 실시간 현재가로 잡으므로 price 를 보내지 않는다.
 *
 * 필드명이 side/ticker/qty 인 것은 취향이 아니다 — app/(api)/api/proxy 가 모든 non-GET body 에
 * PDNO·ORD_QTY·buyOrSell 을 끼워 넣고 buyOrSell 은 값이 없으면 "sell" 로 채운다. 그 이름들을
 * 피해야 매수가 매도로 새는 일이 없다.
 */
export const placePaperOrder = (side: "buy" | "sell", ticker: string, qty: number, name?: string | null): Promise<PaperResponse> =>
    paperRequest("POST", { action: "order", side, ticker, qty, name: name ?? undefined });

export const resetPaperAccount = (): Promise<PaperResponse> => paperRequest("POST", { action: "reset" });
