// 카드와 유물. 여기도 **Phaser 를 모른다.**
//
// 카드는 한 턴짜리이고 유물은 판 내내 남는다. 그 둘이 합쳐진 결과가 TurnBuff 하나로 나가고,
// 엔진은 그 덩어리만 받는다 — 카드를 하나 더 만들어도 엔진의 함수 모양이 안 바뀐다.

import type { PlayerState, Relic, StrategyCard, TurnBuff } from "./types";
import { NO_BUFF } from "./types";

/** 한 턴에 손에 들어오는 카드 수. */
export const HAND_SIZE = 3;

/** 카드 한 장이 무엇을 하는가. 정의와 효과를 한자리에 둔다 — 갈라 두면 반드시 어긋난다. */
interface CardDef {
    id: string;
    name: string;
    type: StrategyCard["type"];
    effectDescription: string;
    apply: (b: TurnBuff) => TurnBuff;
}

const CARD_POOL: CardDef[] = [
    {
        id: "insider", name: "인사이더 호재", type: "price",
        effectDescription: "이번 턴 주가가 확실히 오릅니다 (+12%p).",
        apply: b => ({ ...b, priceBias: b.priceBias + 0.12 }),
    },
    {
        id: "leak", name: "미공개 정보", type: "price",
        effectDescription: "이번 턴 주가에 +20%p. 대신 다음 판까지 소문이 남습니다.",
        apply: b => ({ ...b, priceBias: b.priceBias + 0.20 }),
    },
    {
        id: "nofee", name: "손절 수수료 면제", type: "trade",
        effectDescription: "이번 턴 매도 수수료와 거래세를 내지 않습니다.",
        apply: b => ({ ...b, feeWaived: true }),
    },
    {
        id: "rebound", name: "급반등 유도", type: "price",
        effectDescription: "이번 턴에 내리면 그 폭만큼 되돌려 올립니다.",
        apply: b => ({ ...b, reboundRatio: Math.max(b.reboundRatio, 1) }),
    },
    {
        id: "shield", name: "방어막", type: "price",
        effectDescription: "이번 턴 하락폭이 절반으로 줄어듭니다.",
        apply: b => ({ ...b, downshieldRatio: Math.max(b.downshieldRatio, 0.5) }),
    },
    {
        id: "volatile", name: "변동성 폭발", type: "price",
        effectDescription: "이번 턴 변동폭이 두 배가 됩니다. 위로든 아래로든.",
        apply: b => ({ ...b, volatilityMult: b.volatilityMult * 2 }),
    },
    {
        id: "steady", name: "관망 지시", type: "price",
        effectDescription: "이번 턴 변동폭이 절반으로 줄어듭니다.",
        apply: b => ({ ...b, volatilityMult: b.volatilityMult * 0.5 }),
    },
    {
        id: "pump", name: "작전 세력", type: "price",
        effectDescription: "이번 턴 +8%p, 그리고 변동폭도 1.5배.",
        apply: b => ({ ...b, priceBias: b.priceBias + 0.08, volatilityMult: b.volatilityMult * 1.5 }),
    },
];

/** 유물 — 한 번 얻으면 판이 끝날 때까지 남는다. */
const RELIC_POOL: Relic[] = [
    {
        id: "compass", name: "낡은 나침반", triggerType: "onTurnStart",
        description: "매 턴 시작에 인사이트 +1.",
    },
    {
        id: "hotline", name: "증권가 핫라인", triggerType: "onTurnStart",
        description: "매 턴 주가에 +1.5%p 가 얹힙니다.",
    },
    {
        id: "vest", name: "방탄 조끼", triggerType: "onTurnStart",
        description: "하락폭이 항상 20% 줄어듭니다.",
    },
    {
        id: "broker", name: "단골 브로커", triggerType: "onTrade",
        description: "매도 수수료와 거래세를 항상 면제받습니다.",
    },
    {
        id: "ledger", name: "비밀 장부", triggerType: "onTurnEnd",
        description: "오른 턴마다 인사이트 +1.",
    },
];

/* ── 난수 ───────────────────────────────────────────────────── */

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 겹치지 않게 n 개를 뽑는다. */
function sample<T>(pool: readonly T[], n: number, rand: () => number): T[] {
    const left = [...pool];
    const out: T[] = [];
    while (out.length < n && left.length > 0) {
        const i = Math.floor(rand() * left.length);
        out.push(left.splice(i, 1)[0]!);
    }
    return out;
}

/* ── 매니저 ─────────────────────────────────────────────────── */

export class RoguelikeManager {
    /** 이번 턴의 손패. */
    hand: StrategyCard[] = [];
    /** 이 판에서 들고 있는 유물. */
    relics: Relic[] = [];

    private rand: () => number;
    /** 이번 턴에 고른 카드. 턴이 넘어가면 비워진다. */
    private picked: CardDef | null = null;

    constructor(seed: number) {
        // 엔진과 같은 시드를 쓰되 흩어 둔다. 그대로 쓰면 주가와 카드가 같은 수열을 밟는다.
        this.rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    }

    /* ── 유물 ───────────────────────────────────────────── */

    /**
     * 판을 시작할 때 유물을 나눠 준다.
     *
     * 쌓아 둔 인사이트가 많을수록 하나 더 — 이게 판을 넘어 이어지는 유일한 성장이다.
     */
    grantStartingRelics(insightPoints: number): Relic[] {
        const n = Math.min(RELIC_POOL.length, 1 + Math.floor(insightPoints / 15));
        this.relics = sample(RELIC_POOL, n, this.rand);
        return this.relics;
    }

    /** 판 도중에 하나 더. 화면이 "유물을 얻었다" 를 띄울 수 있게 얻은 것을 돌려준다. */
    grantRandomRelic(): Relic | null {
        const owned = new Set(this.relics.map(r => r.id));
        const left = RELIC_POOL.filter(r => !owned.has(r.id));
        if (left.length === 0) return null;
        const got = left[Math.floor(this.rand() * left.length)]!;
        this.relics.push(got);
        return got;
    }

    private has(id: string): boolean {
        return this.relics.some(r => r.id === id);
    }

    /* ── 손패 ───────────────────────────────────────────── */

    /** 턴이 시작될 때 세 장을 새로 깐다. 지난 턴에 고른 것은 여기서 지워진다. */
    dealHand(): StrategyCard[] {
        this.picked = null;
        this.hand = sample(CARD_POOL, HAND_SIZE, this.rand).map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            effectDescription: d.effectDescription,
            isUsed: false,
        }));
        return this.hand;
    }

    /**
     * 카드를 고른다. 한 턴에 한 장뿐이다 — 여러 장을 겹치면 첫 턴에 판이 끝난다.
     * @returns 골라졌으면 true. 이미 고른 뒤면 false.
     */
    playCard(cardId: string): boolean {
        if (this.picked) return false;
        const def = CARD_POOL.find(c => c.id === cardId);
        if (!def) return false;

        this.picked = def;
        for (const c of this.hand) c.isUsed = c.id === cardId;
        return true;
    }

    get pickedCard(): StrategyCard | null {
        return this.hand.find(c => c.isUsed) ?? null;
    }

    /* ── 이번 턴의 효과 ───────────────────────────────────── */

    /**
     * 유물(항상) + 고른 카드(이번 턴)를 합쳐 한 덩어리로 만든다.
     *
     * 유물을 먼저 얹는다 — 카드가 유물 위에 쌓이는 것이지 유물을 덮는 것이 아니다.
     */
    buildBuff(): TurnBuff {
        let b: TurnBuff = { ...NO_BUFF };

        if (this.has("hotline")) b = { ...b, priceBias: b.priceBias + 0.015 };
        if (this.has("vest")) b = { ...b, downshieldRatio: Math.max(b.downshieldRatio, 0.2) };
        if (this.has("broker")) b = { ...b, feeWaived: true };

        return this.picked ? this.picked.apply(b) : b;
    }

    /* ── 유물 발동 ───────────────────────────────────────── */

    /** 턴이 열릴 때 터지는 유물. 화면에 띄울 문구를 돌려준다. */
    onTurnStart(player: PlayerState): string[] {
        const fired: string[] = [];
        if (this.has("compass")) {
            player.insightPoints += 1;
            fired.push("낡은 나침반 — 인사이트 +1");
        }
        return fired;
    }

    /** 턴이 닫힐 때 터지는 유물. */
    onTurnEnd(player: PlayerState, changePct: number): string[] {
        const fired: string[] = [];
        if (this.has("ledger") && changePct > 0) {
            player.insightPoints += 1;
            fired.push("비밀 장부 — 인사이트 +1");
        }
        return fired;
    }
}
