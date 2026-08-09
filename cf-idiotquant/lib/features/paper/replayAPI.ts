// 리플레이 라운드 API — 로그인 사용자 (백엔드 /user/replay).
// 비로그인은 lib/paper/localRound.ts 가 같은 모양을 브라우저 안에서 다룬다.

import type { ReplayRound, ReplayHistoryItem } from "@/lib/paper/round";

async function replayRequest(method: "GET" | "POST", body?: object) {
    try {
        const res = await fetch("/api/proxy/user/replay", {
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

export type ReplayResponse =
    | {
        success: true; status: number;
        round: ReplayRound | null;
        done?: boolean;
        history?: ReplayHistoryItem[];
        wallet?: { coins: number; best_streak: number; best_return: number | null };
    }
    | { success: false; status: number; error: string };

export const getReplayState = (): Promise<ReplayResponse> => replayRequest("GET");

export const startReplayRound = (): Promise<ReplayResponse> => replayRequest("POST", { action: "start" });

/**
 * 하루 진행. 체결가는 서버가 그날 종가로 잡으므로 price 를 보내지 않는다.
 *
 * 필드명이 trade.side / trade.qty 인 것은 취향이 아니다 — app/(api)/api/proxy 가 모든
 * non-GET body 에 PDNO·ORD_QTY·buyOrSell 을 끼워 넣고 buyOrSell 은 값이 없으면 "sell" 로
 * 채운다. 그 이름을 피해야 매수가 매도로 새지 않는다.
 */
export const advanceReplayRound = (roundId: string, trade?: { side: "buy" | "sell"; qty: number } | null): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "advance", round_id: roundId, trade: trade ?? undefined });

export const giveUpReplayRound = (roundId: string): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "giveup", round_id: roundId });
