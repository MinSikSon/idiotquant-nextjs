// 리플레이 라운드 API — 로그인 사용자 (백엔드 /user/replay).
// 비로그인은 lib/paper/localRound.ts 가 같은 모양을 브라우저 안에서 다룬다.

import type { ReplayRound, ReplayHistoryItem, HabitSummary } from "@/lib/paper/round";
import type { Firm } from "@/lib/paper/firm";

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
            // 원문은 콘솔에만. 예전에 이 자리에서 text.slice(0,100) 을 그대로 에러 메시지로 써서
            // Cloudflare 오류 페이지의 <!DOCTYPE html ... 이 토스트에 뜬 적이 있다.
            console.error("[replay] 예상치 못한 응답", res.status, text.slice(0, 500));
            return {
                success: false,
                status: res.status,
                error: res.status === 404 ? "서버에 아직 이 기능이 없습니다. 잠시 후 다시 시도해주세요."
                    : res.status >= 500 ? "서버에서 판을 준비하지 못했습니다. 잠시 후 다시 시도해주세요."
                        : "서버 응답을 이해하지 못했습니다.",
            };
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
        firm?: Firm;
        habits?: HabitSummary | null;
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

/** 리서치 도구 구매. 성공하면 갱신된 firm 이 온다. */
export const buyTool = (toolId: string): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "buy-tool", tool_id: toolId });

export const renameFirm = (name: string): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "rename-firm", name });
