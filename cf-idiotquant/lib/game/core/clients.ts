// 돈을 맡긴 사람들. **1997 을 나와 함께 겪은 사람들이다.**
//
// 구조는 옛 반기 게임의 `lib/paper/season.ts` 에서 그대로 가져왔다 — 고객마다 반응 계수를
// 두고 같은 성적을 다르게 평가하게 하는 방식이다. 다만 그쪽은 기관(연기금·헤지펀드)이었고
// 여기는 **사람**이다. 에너지가 추상적인 막대가 아니라 *나 때문에 잃은 바로 그 사람들의
// 인내* 가 되려면, 이름과 얼굴이 있어야 한다.
//
// 고객은 저장하지 않는다 — 회차와 턴에서 파생한다. 컬럼을 늘리지 않아도 되고, 같은 판이
// 같은 사람을 준다.

export interface Client {
    id: string;
    name: string;
    /** 화면에 그대로 나가는 한 줄. */
    blurb: string;
    /** 근거를 대고 벌었을 때 에너지가 오르는 배수. */
    gain: number;
    /** 잃었을 때 에너지가 깎이는 배수. */
    loss: number;
    /**
     * 근거 없이 권했을 때 **받아들일** 확률(0~1).
     *
     * 어머니는 무조건 받는다. 박 대리는 근거가 없으면 거절한다 — 거절당하면 그 턴은
     * 아무 일도 안 일어나고 에너지만 자연 감소한다.
     */
    acceptsBlind: number;
    /**
     * 이 사람이 굴려 달라고 내놓을 수 있는 돈의 크기(배수). **`gain`/`loss` 와 다른 값이다.**
     *
     * 둘을 한 값으로 쓰려다 말았다. 김 부장은 퇴직금을 쥐고 있어 **큰 돈**인데 잘 안 믿고,
     * 어머니는 무조건 받아 주지만 **내놓을 돈이 적다.** 한 값으로는 이 둘이 뒤집힌다.
     * 그래서 「얼마나 움직이나」(gain/loss)와 「얼마를 맡기나」(purse)를 갈라 둔다.
     */
    purse: number;
}

export const CLIENTS: readonly Client[] = [
    {
        id: "kim", name: "김 부장",
        blurb: "나 때문에 퇴직금을 잃었다. 잘 안 믿는다.",
        gain: 1.4, loss: 1.4, acceptsBlind: 0.35, purse: 1.4,
    },
    {
        id: "mother", name: "어머니",
        blurb: "근거 없이 권해도 받아 준다. 그래서 잃으면 제일 아프다.",
        gain: 0.7, loss: 1.8, acceptsBlind: 1, purse: 0.6,
    },
    {
        id: "park", name: "박 대리",
        blurb: "후배다. 나보다 잘 안다. 근거가 허술하면 거절한다.",
        gain: 1.2, loss: 1, acceptsBlind: 0.1, purse: 0.8,
    },
    {
        id: "choi", name: "최 사장",
        blurb: "사채. 사람을 보지 않고 이자로 움직인다.",
        gain: 0.6, loss: 0.6, acceptsBlind: 0.9, purse: 1.8,
    },
] as const;

/* ── 맡긴다 ─────────────────────────────────────────────────── */

/**
 * 에너지가 0 이어도 이만큼은 맡긴다. 사람이 앞에 앉아 권하는 것을 들었으니까.
 * 계좌가 0 에서 시작하는 게임이라, **첫 턴에 굴릴 돈이 생기는 크기가 이 값이다.**
 */
export const ENTRUST_BASE = 5_000_000;

/** 에너지가 가득 찼을 때 여기까지 더 붙는다. */
export const ENTRUST_BY_ENERGY = 7_000_000;

/**
 * 근거를 못 댔는데도 받아 준 경우 맡기는 비율.
 *
 * **거절하지 않은 것과 믿는 것은 다르다.** 어머니는 언제나 받아 주지만 그렇다고 전 재산을
 * 내놓지는 않는다. 이 값이 1 이면 근거를 대는 이유가 에너지 하나로 줄어든다.
 */
export const BLIND_ENTRUST = 0.35;

/**
 * 이 사람이 이번에 맡기는 돈. **맡은 돈이 0 에서 시작하는 게임의 심장이다.**
 *
 * ── 에너지가 곧 운용 규모다 ────────────────────────────────
 * 예전에는 2,500만원이 판이 열릴 때 손에 쥐어져 있었고 에너지는 보수율만 정했다. 이제
 * 에너지는 **얼마를 굴리게 되는지**까지 정한다. 그래서 「근거를 대고 맞힌다 → 에너지가
 * 오른다 → 더 큰 돈을 맡는다 → 보수가 커진다 → 빚이 줄어든다」 가 한 줄로 닫힌다.
 *
 * 반대쪽도 닫힌다 — 알바로 연명하면 에너지가 말라 맡기는 돈이 바닥을 기고, 그러면
 * 영업으로 돌아올 자리도 없어진다. 버티기만 하는 전략이 공짜가 아닌 이유다.
 *
 * @param energy 지금 에너지(0~100).
 * @param hadThesis 근거를 대고 권했는가.
 */
export function entrustAmount(client: Client, energy: number, hadThesis: boolean): number {
    const t = Math.max(0, Math.min(100, energy)) / 100;
    const raw = (ENTRUST_BASE + ENTRUST_BY_ENERGY * t) * client.purse;
    return Math.floor(raw * (hadThesis ? 1 : BLIND_ENTRUST));
}

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
