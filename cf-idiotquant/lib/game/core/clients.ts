// 돈을 맡긴 사람들. **1997 을 나와 함께 겪은 사람들이다.**
//
// 구조는 옛 반기 게임의 `lib/paper/season.ts` 에서 그대로 가져왔다 — 고객마다 반응 계수를
// 두고 같은 성적을 다르게 평가하게 하는 방식이다. 다만 그쪽은 기관(연기금·헤지펀드)이었고
// 여기는 **사람**이다. 신뢰가 추상적인 게이지가 아니라 *나 때문에 잃은 바로 그 사람들의
// 인내* 가 되려면, 이름과 얼굴이 있어야 한다.
//
// 고객은 저장하지 않는다 — 회차와 턴에서 파생한다. 컬럼을 늘리지 않아도 되고, 같은 판이
// 같은 사람을 준다.

export interface Client {
    id: string;
    name: string;
    /** 화면에 그대로 나가는 한 줄. */
    blurb: string;
    /** 근거를 대고 벌었을 때 신뢰가 오르는 배수. */
    gain: number;
    /** 잃었을 때 신뢰가 깎이는 배수. */
    loss: number;
    /**
     * 근거 없이 권했을 때 **받아들일** 확률(0~1).
     *
     * 어머니는 무조건 받는다. 박 대리는 근거가 없으면 거절한다 — 거절당하면 그 턴은
     * 아무 일도 안 일어나고 신뢰만 자연 감소한다.
     */
    acceptsBlind: number;
}

export const CLIENTS: readonly Client[] = [
    {
        id: "kim", name: "김 부장",
        blurb: "나 때문에 퇴직금을 잃었다. 잘 안 믿는다.",
        gain: 1.4, loss: 1.4, acceptsBlind: 0.35,
    },
    {
        id: "mother", name: "어머니",
        blurb: "근거 없이 권해도 받아 준다. 그래서 잃으면 제일 아프다.",
        gain: 0.7, loss: 1.8, acceptsBlind: 1,
    },
    {
        id: "park", name: "박 대리",
        blurb: "후배다. 나보다 잘 안다. 근거가 허술하면 거절한다.",
        gain: 1.2, loss: 1, acceptsBlind: 0.1,
    },
    {
        id: "choi", name: "최 사장",
        blurb: "사채. 신뢰가 아니라 이자로 움직인다.",
        gain: 0.6, loss: 0.6, acceptsBlind: 0.9,
    },
] as const;

/** 문자열 하나를 32비트로. FNV-1a — 짧고 어디서 돌려도 같은 값이 나온다. */
function hash32(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

/**
 * 이번 턴에 앞에 앉는 사람.
 *
 * `gone` 에 든 사람은 건너뛴다 — **떠난 고객은 안 돌아온다.** 아무도 안 남으면 null 이고,
 * 그때가 곧 아무도 나에게 맡기지 않는 순간이다.
 */
export function clientAt(cycle: number, chapterId: string, turn: number, gone: readonly string[] = []): Client | null {
    const left = CLIENTS.filter(c => !gone.includes(c.id));
    if (left.length === 0) return null;
    const h = hash32(`${cycle}:${chapterId}:${turn}`);
    return left[h % left.length]!;
}
