// 리플레이 라운드 API — 로그인 사용자 (백엔드 /user/replay).
//
// 판을 굴리는 것은 브라우저다(lib/paper/half.ts). 여기 남은 것은 판을 만들고, 굴리는
// 중에 체크포인트를 흘려 보내고, 반기가 끝나면 결과를 제출하는 세 가지뿐이다 —
// 예전에는 매수 한 번, 하루 넘기기 한 번마다 이 파일을 거쳤다.
//
// 비로그인은 lib/paper/localRound.ts 가 판 만드는 일까지 브라우저 안에서 한다.

import type { ReplayRound, ReplayHistoryItem, HabitSummary, Campaign } from "@/lib/paper/round";
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
        /** 회사가 문을 닫았다. 이때도 campaign 이 null 이 되므로 기간 완주와 가려야 한다. */
        ruined?: boolean;
        history?: ReplayHistoryItem[];
        wallet?: { coins: number; best_streak: number; best_return: number | null };
        firm?: Firm;
        habits?: HabitSummary | null;
        /** 굴러가는 캠페인. null 이면 기간부터 골라야 한다. */
        campaign?: Campaign | null;
        year_choices?: number[];
        existed?: boolean;
    }
    | { success: false; status: number; error: string };

export const getReplayState = (): Promise<ReplayResponse> => replayRequest("GET");

/** 기간을 골라 캠페인을 연다. 굴러가는 게 있으면 서버가 그걸 그대로 준다. */
export const startCampaign = (years: number): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "start-campaign", years });

export const startReplayRound = (scenario?: string | null): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "start", ...(scenario ? { scenario } : {}) });

/*
 * 하루 진행(advance)·사고팔기(trade)·예약(reserve·cancel-reserve)·중도 포기(giveup) 은
 * 여기서 사라졌다 — 판이 브라우저 안에서 돌면서 부를 일이 없어졌다. 워커 쪽 액션은
 * 그대로 살아 있으므로 되돌려야 할 일이 생기면 이 자리에 다시 쓰면 된다.
 */

/** 리서치 도구 구매. 성공하면 갱신된 firm 이 온다. */
export const buyTool = (toolId: string): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "buy-tool", tool_id: toolId });

export const renameFirm = (name: string): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "rename-firm", name });

/**
 * 반기 마감 — 브라우저가 굴린 결과를 제출한다. 서버가 정산까지 채워 돌려준다.
 * 결과 화면이 쓸 것(지난 분기·회사·지갑·습관·캠페인)도 이 응답에 함께 온다.
 */
export const submitHalf = (payload: object): Promise<ReplayResponse> =>
    replayRequest("POST", { action: "submit", ...payload });

/**
 * 진행 중 체크포인트 — 기기를 바꿔도 굴리던 판이 살아 있게 한다.
 *
 * **응답을 기다리지 않는다.** 화면을 멈추게 할 이유가 없고, 실패해도 판은 브라우저
 * 안에서 계속 돈다(마지막 체크포인트 이후의 진행만 다른 기기에서 사라진다).
 * keepalive 는 탭을 닫는 중에도 요청이 끝까지 가게 한다.
 */
export function checkpointHalf(payload: object): void {
    try {
        void fetch("/api/proxy/user/replay", {
            method: "POST",
            credentials: "include",
            keepalive: true,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "checkpoint", ...payload }),
        }).catch(() => { /* 판은 계속 돈다 */ });
    } catch { /* 〃 */ }
}
