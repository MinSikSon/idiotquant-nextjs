/**
 * /api/proxy 로 나가는 요청 한 자리.
 *
 * 이 파일이 생긴 이유는 한 가지다 — `res.json()` 은 응답이 JSON 이 아니면 던진다.
 * 워커가 죽어 Cloudflare 오류 페이지를 돌려주거나 프록시가 502 HTML 을 주면,
 * 사용자가 보는 것은 브라우저가 만든 "The string did not match the expected pattern."
 * 한 줄뿐이고 정작 원인(예: no such table: ledger_invites)은 어디에도 안 남는다.
 * 가계부에서 실제로 겪은 일이고, 같은 자리가 여러 기능에 흩어져 있었다.
 *
 * 그래서 규칙은 하나다: **이 함수는 절대 던지지 않는다.**
 * 언제나 객체를 돌려주고, 실패는 { success: false, error } 로 말한다.
 * 부르는 쪽은 result?.success === false 만 보면 된다(슬라이스들이 이미 쓰는 규칙).
 */

/** 응답이 JSON 이 아니거나 아예 닿지 못했을 때의 모양. */
export interface ApiFailure {
    success: false;
    /** 네트워크 자체가 실패했으면 0. */
    status: number;
    error: string;
}

export interface ApiRequestOptions {
    method?: string;
    body?: object;
    /** search-log 의 count 처럼 이 요청에만 붙는 헤더. */
    headers?: Record<string, string>;
}

/** 본문을 못 읽었을 때 사용자에게 보일 말. 원문은 화면이 아니라 콘솔로 간다. */
function messageFor(status: number) {
    if (status === 0) return "네트워크 연결을 확인해 주세요.";
    if (status === 401 || status === 403) return "로그인이 필요합니다.";
    if (status === 404) return "서버에 아직 이 기능이 없습니다. 잠시 후 다시 시도해 주세요.";
    if (status >= 500) return "서버에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
    return `서버 응답을 읽지 못했습니다 (HTTP ${status}).`;
}

export async function apiRequest(subUrl: string, options: ApiRequestOptions = {}): Promise<any> {
    const { method = "GET", body, headers } = options;

    let res: Response;
    try {
        res = await fetch(`/api/proxy${subUrl}`, {
            method,
            credentials: "include",
            headers: { "content-type": "application/json", ...headers },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
    } catch {
        // 오프라인·중단 등 응답이 아예 없는 경우.
        return { success: false, status: 0, error: messageFor(0) } satisfies ApiFailure;
    }

    const text = await res.text().catch(() => "");

    let parsed: unknown = null;
    try {
        parsed = text ? JSON.parse(text) : null;
    } catch {
        // 원문은 콘솔에만 남긴다. 예전에 text.slice(0,100) 을 그대로 오류 메시지로 써서
        // Cloudflare 오류 페이지의 "<!DOCTYPE html …" 이 토스트에 뜬 적이 있다.
        console.error(`[api] ${method} ${subUrl} → ${res.status}, JSON 아님:`, text.slice(0, 500));
    }

    if (parsed === null || typeof parsed !== "object") {
        return { success: false, status: res.status, error: messageFor(res.status) } satisfies ApiFailure;
    }

    // 배열이나 원시값을 객체로 펼치면 모양이 망가진다 — 그때는 받은 그대로 돌려준다.
    if (Array.isArray(parsed)) return parsed;

    return { ...parsed, status: res.status };
}
