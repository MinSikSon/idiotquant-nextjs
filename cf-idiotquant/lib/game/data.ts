// 판을 만드는 데 필요한 것을 가져온다.
//
// 판을 만드는 일 자체는 lib/paper/localRound.ts 가 이미 한다 — KIS 일봉의 뒤집힌 정렬,
// 100일을 넘기면 주봉이 오는 함정, 종목 하나가 실패했을 때 다음 종목으로 넘어가는 것까지.
// 여기서는 그 함수에 넘길 종목 목록만 챙긴다.

import { getScanDailyList } from "@/lib/features/algorithmTrade/algorithmTradeAPI";
import { buildLocalRound, loadLocal, saveLocal } from "@/lib/paper/localRound";
import type { ReplayRound } from "@/lib/paper/round";

/** 후보 종목 수. 판 하나에 최대 넷만 시도하므로 이 이상은 받아도 안 쓴다. */
const POOL = 200;

/** 종목을 뽑아 판을 하나 만든다. 못 만들면 null — 부르는 쪽이 다시 눌러 보게 한다. */
export async function loadRound(): Promise<ReplayRound | null> {
    const res: any = await getScanDailyList("latest", undefined, POOL);
    const pool = (Array.isArray(res?.data) ? res.data : [])
        .filter((r: any) => r?.ticker && r?.name && Number(r.last_price) > 0)
        .map((r: any) => ({ ticker: String(r.ticker), name: String(r.name) }));
    if (pool.length === 0) return null;
    return buildLocalRound(pool);
}

/** 굴리다 만 판이 있으면 이어받는다. 없으면 null. */
export function resumeRound(): ReplayRound | null {
    const r = loadLocal();
    return r && r.status === "playing" ? r : null;
}

/** 판을 버린다 — 준비 화면에서 새로 시작할 때. */
export function dropRound() {
    saveLocal(null);
}

/* ── 최고 기록 ─────────────────────────────────────────────
   이 게임이 남기는 것은 이것 하나다. 회사·기간·매매 습관은 전부 뺐고(HTML 판에 그대로
   있다), 그래서 서버에 저장할 것도 없다. 나중에 기록을 서버에 남기게 되면 이 두 함수만
   갈아 끼우면 된다. */

const BEST_KEY = "iq:game:best:v1";

export function bestReturn(): number | null {
    try {
        const raw = localStorage.getItem(BEST_KEY);
        const n = raw === null ? NaN : Number(raw);
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;   // 프라이빗 모드 — 기록만 없고 판은 그대로 돈다
    }
}

/** 기록을 넘었으면 저장하고 true. 화면이 "새 기록" 을 띄우는 근거다. */
export function saveBest(value: number): boolean {
    if (!Number.isFinite(value)) return false;
    const prev = bestReturn();
    if (prev !== null && value <= prev) return false;
    try {
        localStorage.setItem(BEST_KEY, String(value));
    } catch {
        // 저장 못 해도 이번 판의 성적은 화면에 그대로 뜬다
    }
    return true;
}
