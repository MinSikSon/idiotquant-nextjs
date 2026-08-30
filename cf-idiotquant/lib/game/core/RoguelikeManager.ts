// 덱·카드·유물. 여기도 **Phaser 를 모른다.**
//
// ── 덱빌딩 ──────────────────────────────────────────────────────
// 카드는 전역 풀에서 아무거나 나오지 않는다. **내 덱에서 뽑는다.**
//
//   시작 덱 6장 → 매 턴 3장 뽑기 → 한 장 쓰고 셋 다 버린 더미로
//   → 덱이 마르면 버린 더미를 섞어 다시 덱으로
//
// 그래서 판 도중에 얻은 카드가 실제로 손에 잡히고, 덱이 두꺼워질수록 원하는 카드가
// 덜 나온다. "센 카드를 얻는 것" 과 "덱을 얇게 유지하는 것" 이 맞서는 자리가 이것이다.
//
// 저주는 그 맞섬을 값으로 만든다 — 가장 센 카드에는 저주가 딸려 온다.
//
// 카드는 한 턴짜리이고 유물은 판 내내 남는다. 그 둘이 합쳐진 결과가 TurnBuff 하나로
// 나가고, 엔진은 그 덩어리만 받는다 — 카드를 하나 더 만들어도 엔진의 모양이 안 바뀐다.

import type { CardKind, DeckState, PlayerState, Relic, StrategyCard, TurnBuff } from "./types";
import { NO_BUFF } from "./types";

/** 한 턴에 손에 들어오는 카드 수. */
export const HAND_SIZE = 3;

/** 카드 보상이 뜨는 턴(그 턴을 **끝냈을 때**). 12턴 중 셋. */
export const REWARD_TURNS = [3, 6, 9];

/** 보상으로 고르라고 내미는 장 수. */
export const OFFER_SIZE = 3;

/** 카드 한 장이 무엇을 하는가. 정의와 효과를 한자리에 둔다 — 갈라 두면 반드시 어긋난다. */
export interface CardDef {
    id: string;
    name: string;
    type: StrategyCard["type"];
    kind: CardKind;
    effectDescription: string;
    /**
     * **언제 쓰는 카드인가.** 효과만 적어 두면 무엇을 고를지가 안 보인다 — 도감과
     * 화면이 같이 읽는 한 줄이다.
     */
    when: string;
    apply: (b: TurnBuff) => TurnBuff;
    /** 이 카드를 얻으면 덱에 함께 들어오는 저주. 센 카드가 치르는 값이다. */
    curse?: string;
    /**
     * 지금 이 카드가 아무 일도 못 하는가. 손패에서 흐리게 칠할 근거다.
     * 안 주면 언제나 쓸모가 있다는 뜻이다.
     */
    idleWhen?: (p: { shares: number; cash: number; price: number }) => boolean;
}

const CARDS: CardDef[] = [
    /* ── 시작 덱 ─────────────────────────────────────────
       약하지만 셋 다 "덜 다치게" 하는 쪽이다. 판을 뒤집으려면 보상 카드가 필요하다. */
    {
        id: "steady", name: "관망 지시", type: "price", kind: "starter",
        effectDescription: "이번 턴 변동폭이 절반으로 줄어듭니다.",
        when: "크게 물려 있을 때. 오르지도 내리지도 않게 붙잡아 둡니다.",
        apply: b => ({ ...b, volatilityMult: b.volatilityMult * 0.5 }),
    },
    {
        id: "shield", name: "방어막", type: "price", kind: "starter",
        effectDescription: "이번 턴 하락폭이 절반으로 줄어듭니다.",
        when: "주식을 들고 있을 때. 현금만 있으면 지킬 것이 없습니다.",
        apply: b => ({ ...b, downshieldRatio: Math.max(b.downshieldRatio, 0.5) }),
        idleWhen: p => p.shares === 0,
    },
    {
        id: "insider", name: "인사이더 호재", type: "price", kind: "starter",
        effectDescription: "이번 턴 주가가 확실히 오릅니다 (+7%p).",
        when: "사고 나서 넘기는 턴. 현금만 쥔 채 쓰면 살 값만 올려 놓습니다.",
        apply: b => ({ ...b, priceBias: b.priceBias + 0.07 }),
    },
    {
        id: "nofee", name: "손절 수수료 면제", type: "trade", kind: "starter",
        effectDescription: "이번 턴 매도 수수료와 거래세를 내지 않습니다.",
        when: "이번 턴에 팔 때. 안 팔면 아무 일도 안 합니다.",
        apply: b => ({ ...b, feeWaived: true }),
        idleWhen: p => p.shares === 0,
    },

    /* ── 보상 ────────────────────────────────────────────
       판을 뒤집는 카드들. 위의 둘에는 저주가 딸려 온다. */
    {
        id: "rebound", name: "급반등 유도", type: "price", kind: "reward",
        effectDescription: "이번 턴에 내리면 그 하락을 없던 일로 만듭니다.",
        when: "들고 있는데 다음 턴이 불안할 때. 오르는 턴은 안 건드립니다.",
        apply: b => ({ ...b, reboundRatio: Math.max(b.reboundRatio, 1) }),
        idleWhen: p => p.shares === 0,
    },
    {
        id: "volatile", name: "변동성 폭발", type: "price", kind: "reward",
        effectDescription: "이번 턴 변동폭이 두 배가 됩니다. 위로든 아래로든.",
        when: "뒤가 없을 때. 방어 카드와 겹쳐 써야 도박이 아니게 됩니다.",
        apply: b => ({ ...b, volatilityMult: b.volatilityMult * 2 }),
    },
    {
        id: "bunker", name: "벙커", type: "price", kind: "reward",
        effectDescription: "이번 턴 하락폭이 없는 것이나 마찬가지가 됩니다.",
        when: "청산선이 코앞일 때. 한 턴을 통째로 버텨 냅니다.",
        apply: b => ({ ...b, downshieldRatio: Math.max(b.downshieldRatio, 0.9) }),
        idleWhen: p => p.shares === 0,
    },
    {
        id: "pump", name: "작전 세력", type: "price", kind: "reward",
        effectDescription: "이번 턴 +8%p, 변동폭 1.5배. 대신 뒷말이 남습니다.",
        when: "많이 사 둔 턴. 변동폭까지 커지니 방어 없이는 양날입니다.",
        apply: b => ({ ...b, priceBias: b.priceBias + 0.08, volatilityMult: b.volatilityMult * 1.5 }),
        curse: "rumor",
    },
    {
        id: "leak", name: "미공개 정보", type: "price", kind: "reward",
        effectDescription: "이번 턴 +20%p. 이런 건 반드시 대가가 따릅니다.",
        when: "올인한 턴에 한 번. 판을 뒤집는 대신 덱에 저주가 남습니다.",
        apply: b => ({ ...b, priceBias: b.priceBias + 0.20 }),
        curse: "probe",
    },

    /* ── 저주 ────────────────────────────────────────────
       손에 잡히면 그 턴을 버리게 만든다. 덱이 두꺼워질수록 자주 잡힌다. */
    {
        id: "rumor", name: "뒷말", type: "price", kind: "curse",
        effectDescription: "저주 — 변동폭만 1.5배가 됩니다. 방향은 안 도와줍니다.",
        when: "쓸 일이 없습니다. 현금일 때 흘려보내는 것이 그나마 낫습니다.",
        apply: b => ({ ...b, volatilityMult: b.volatilityMult * 1.5 }),
    },
    {
        id: "probe", name: "당국 조사", type: "price", kind: "curse",
        effectDescription: "저주 — 이번 턴 −6%p.",
        when: "쓸 일이 없습니다. 현금일 때 흘려보내세요.",
        apply: b => ({ ...b, priceBias: b.priceBias - 0.06 }),
    },
    {
        id: "delay", name: "공시 지연", type: "price", kind: "curse",
        effectDescription: "저주 — 아무 일도 일어나지 않습니다.",
        when: "한 턴을 버리는 카드입니다. 셋 다 저주면 이걸 고르세요.",
        apply: b => b,
    },
];

/**
 * 카드 전부. **도감이 이 배열을 그대로 그린다** — 화면용 사본을 따로 두면 어느 날
 * 한쪽만 바뀐다. `apply` 는 함수라 화면이 못 쓰지만, 나머지는 그대로 읽을 수 있다.
 */
export const CARD_LIST: readonly CardDef[] = CARDS;

function defOf(id: string): CardDef | undefined {
    return CARDS.find(c => c.id === id);
}

/**
 * 판을 시작할 때 손에 쥐는 덱. 같은 카드가 여러 장이라 뽑는 맛이 생긴다.
 *
 * **앞의 네 자리**(관망 둘, 방어막 둘)는 인사이트로 영구히 갈아 끼울 수 있다. 뒤의 둘은
 * 안 바꾼다 — 인사이더 호재와 수수료 면제는 이 게임을 굴리는 최소한이고, 그것까지
 * 사라지면 강화 없는 첫 판이 못 굴러간다.
 */
const STARTING_DECK = ["steady", "steady", "shield", "shield", "insider", "nofee"];

/** 갈아 끼울 수 있는 자리 수. STARTING_DECK 앞에서부터 이만큼이다. */
export const UPGRADE_SLOTS = 4;

/**
 * 강화로 살 수 있는 카드. 저주가 딸린 것은 뺀다 — 시작 덱에 저주를 영구히 박아 두면
 * 그건 강화가 아니라 벌이다.
 */
export const UPGRADE_POOL = ["rebound", "bunker", "volatile", "insider"];

/** 강화를 얹은 시작 덱. 모르는 카드 이름은 조용히 무시한다(저장이 상했을 때). */
export function startingDeckOf(upgrades: readonly string[]): string[] {
    const deck = [...STARTING_DECK];
    upgrades.slice(0, UPGRADE_SLOTS).forEach((id, i) => {
        if (defOf(id)) deck[i] = id;
    });
    return deck;
}

/** 보상으로 내밀 수 있는 것 — 저주는 고를 수 없다. */
const REWARD_IDS = CARDS.filter(c => c.kind === "reward").map(c => c.id);

/** 유물 — 한 번 얻으면 판이 끝날 때까지 남는다. 도감도 이 목록을 읽는다. */
export const RELIC_POOL: Relic[] = [
    {
        id: "compass", name: "낡은 나침반", triggerType: "onTurnStart",
        description: "매 턴 시작에 인사이트 +1.",
    },
    {
        id: "hotline", name: "증권가 핫라인", triggerType: "onTurnStart",
        description: "매 턴 주가에 +1%p 가 얹힙니다.",
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
    {
        id: "shredder", name: "파쇄기", triggerType: "onTurnStart",
        description: "저주를 손에 쥐면 그 자리에서 덱 밖으로 버립니다.",
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

    /** 아직 안 뽑은 장(카드 id). 앞에서부터 뽑는다. */
    private drawPile: string[] = [];
    /** 쓴 것과 안 쓴 것 모두 여기로 온다. 덱이 마르면 섞어서 되돌린다. */
    private discardPile: string[] = [];

    private rand: () => number;
    /** 이번 턴에 고른 카드. 턴이 넘어가면 비워진다. */
    private picked: CardDef | null = null;
    /** uid 를 만드는 counter. 같은 카드 여러 장을 구별하는 값이다. */
    private seq = 0;
    /** 이 판이 시작한 덱. resetDeck 이 여기로 되돌린다. */
    private baseDeck: string[];

    /**
     * @param upgrades 판을 넘어 박아 둔 강화 카드들. 시작 덱 앞자리를 대신한다.
     */
    constructor(seed: number, upgrades: readonly string[] = []) {
        // 엔진과 같은 시드를 쓰되 흩어 둔다. 그대로 쓰면 주가와 카드가 같은 수열을 밟는다.
        this.rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
        this.baseDeck = startingDeckOf(upgrades);
        this.resetDeck();
    }

    /** 강화를 하나 더 얹고 덱을 새로 세운다. 판을 열기 **전에만** 부른다. */
    applyUpgrades(upgrades: readonly string[]): void {
        this.baseDeck = startingDeckOf(upgrades);
        this.resetDeck();
    }

    /** 강화로 고르라고 내미는 카드들. 저주는 안 나온다. */
    offerUpgrades(n = OFFER_SIZE): StrategyCard[] {
        return sample(UPGRADE_POOL, n, this.rand).map(id => {
            const d = defOf(id)!;
            return {
                uid: `u${this.seq++}`,
                id: d.id, name: d.name, type: d.type, kind: d.kind,
                effectDescription: d.effectDescription, isUsed: false,
            };
        });
    }

    /* ── 덱 ─────────────────────────────────────────────── */

    /** 시작 덱으로 되돌린다. 판을 새로 열 때 한 번. */
    resetDeck(): void {
        this.drawPile = this.shuffled(this.baseDeck);
        this.discardPile = [];
        this.hand = [];
        this.picked = null;
    }

    private shuffled(ids: readonly string[]): string[] {
        const out = [...ids];
        // Fisher-Yates. 시드에서 나온 난수라 같은 시드면 같은 순서다.
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(this.rand() * (i + 1));
            [out[i], out[j]] = [out[j]!, out[i]!];
        }
        return out;
    }

    /** 덱에 한 장 넣는다. 보상으로 고른 카드와, 거기 딸린 저주가 이리로 온다. */
    addToDeck(cardId: string): void {
        if (!defOf(cardId)) return;
        // 버린 더미에 넣는다 — 방금 얻은 카드가 이번 턴에 바로 잡히면 보상이 아니라 마술이다.
        this.discardPile.push(cardId);
    }

    /** 덱에서 한 장을 영영 뺀다. 파쇄기가 저주를 버릴 때 쓴다. */
    private removeFromDeck(cardId: string): boolean {
        for (const pile of [this.drawPile, this.discardPile]) {
            const i = pile.indexOf(cardId);
            if (i >= 0) { pile.splice(i, 1); return true; }
        }
        return false;
    }

    get deckState(): DeckState {
        const all = [...this.drawPile, ...this.discardPile, ...this.hand.map(c => c.id)];
        return {
            draw: this.drawPile.length,
            discard: this.discardPile.length,
            total: all.length,
            curses: all.filter(id => defOf(id)?.kind === "curse").length,
        };
    }

    /* ── 손패 ───────────────────────────────────────────── */

    /**
     * 턴이 시작될 때 덱에서 세 장. 지난 턴 손패는 통째로 버린 더미로 간다.
     *
     * 덱이 모자라면 버린 더미를 섞어 되돌린다 — 그래서 얻은 카드가 언젠가는 반드시
     * 손에 잡히고, 덱이 두꺼울수록 그 "언젠가" 가 멀어진다.
     */
    dealHand(): StrategyCard[] {
        this.discardPile.push(...this.hand.map(c => c.id));
        this.hand = [];
        this.picked = null;

        const drawn: string[] = [];
        for (let i = 0; i < HAND_SIZE; i++) {
            if (this.drawPile.length === 0) {
                if (this.discardPile.length === 0) break;   // 덱이 통째로 비었다(파쇄기)
                this.drawPile = this.shuffled(this.discardPile);
                this.discardPile = [];
            }
            drawn.push(this.drawPile.shift()!);
        }

        this.hand = drawn.map(id => {
            const d = defOf(id)!;
            return {
                uid: `c${this.seq++}`,
                id: d.id, name: d.name, type: d.type, kind: d.kind,
                effectDescription: d.effectDescription, isUsed: false,
            };
        });
        return this.hand;
    }

    /**
     * 카드를 고른다. 한 턴에 한 장뿐이다 — 여러 장을 겹치면 첫 턴에 판이 끝난다.
     * @param uid 그 **장**의 번호. 같은 카드가 두 장 잡혔을 때 어느 쪽인지 갈라야 한다.
     */
    playCard(uid: string): boolean {
        if (this.picked) return false;
        const card = this.hand.find(c => c.uid === uid);
        if (!card) return false;
        const def = defOf(card.id);
        if (!def) return false;

        this.picked = def;
        for (const c of this.hand) c.isUsed = c.uid === uid;
        return true;
    }

    get pickedCard(): StrategyCard | null {
        return this.hand.find(c => c.isUsed) ?? null;
    }

    /**
     * 이 카드가 **지금** 아무 일도 못 하는가.
     *
     * 손절 수수료 면제를 현금만 쥔 채 쓰면 그 턴은 통째로 버려진다. 그걸 눌러 보고
     * 나서야 아는 것보다, 흐리게라도 미리 보이는 편이 낫다.
     */
    isIdle(cardId: string, p: { shares: number; cash: number; price: number }): boolean {
        return defOf(cardId)?.idleWhen?.(p) ?? false;
    }

    /** 이 카드를 언제 쓰는가. 고른 순간 화면이 함께 읽어 준다. */
    whenOf(cardId: string): string {
        return defOf(cardId)?.when ?? "";
    }

    /* ── 보상 ───────────────────────────────────────────── */

    /** 이 턴을 끝냈을 때 카드 보상이 뜨는가. */
    isRewardTurn(turn: number): boolean {
        return REWARD_TURNS.includes(turn);
    }

    /**
     * 고르라고 내미는 카드들. **덱에 넣지는 않는다** — 고른 뒤에 takeReward 를 부른다.
     * 저주는 여기 안 나온다. 저주는 센 카드에 딸려 오는 것이지 고르는 것이 아니다.
     */
    offerCards(): StrategyCard[] {
        return sample(REWARD_IDS, OFFER_SIZE, this.rand).map(id => {
            const d = defOf(id)!;
            return {
                uid: `r${this.seq++}`,
                id: d.id, name: d.name, type: d.type, kind: d.kind,
                effectDescription: d.effectDescription, isUsed: false,
                // 값을 고르기 전에 보여 준다. 고르고 나서 알게 되면 그건 고른 것이 아니다.
                ...(d.curse ? { curseName: defOf(d.curse)?.name } : {}),
            };
        });
    }

    /**
     * 보상을 받는다. 저주가 딸린 카드면 저주도 함께 덱에 들어간다.
     * @returns 함께 들어온 저주의 이름. 없으면 null — 화면이 그 사실을 말해야 한다.
     */
    takeReward(cardId: string): string | null {
        const def = defOf(cardId);
        if (!def) return null;
        this.addToDeck(def.id);
        if (!def.curse) return null;
        this.addToDeck(def.curse);
        return defOf(def.curse)?.name ?? null;
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

    /**
     * 판 도중에 얻을 유물 후보. **아직 안 준다** — 고른 뒤에 takeRelic 을 부른다.
     *
     * 예전에는 네 턴마다 하나가 그냥 굴러들어왔다. 그러면 유물이 무엇이었는지 모른 채
     * 판이 끝나고, 무슨 소용인지도 모르게 된다. 셋 중에 고르게 하면 그 순간 셋을 다
     * 읽게 되고, 들고 있는 것이 "내가 고른 것" 이 된다.
     */
    offerRelics(n = OFFER_SIZE): Relic[] {
        const owned = new Set(this.relics.map(r => r.id));
        return sample(RELIC_POOL.filter(r => !owned.has(r.id)), n, this.rand);
    }

    /** 고른 유물을 받는다. 이미 있거나 없는 것이면 아무 일도 안 한다. */
    takeRelic(relicId: string): Relic | null {
        if (this.relics.some(r => r.id === relicId)) return null;
        const got = RELIC_POOL.find(r => r.id === relicId);
        if (!got) return null;
        this.relics.push(got);
        return got;
    }

    private has(id: string): boolean {
        return this.relics.some(r => r.id === id);
    }

    /* ── 이번 턴의 효과 ───────────────────────────────────── */

    /**
     * 유물(항상) + 고른 카드(이번 턴)를 합쳐 한 덩어리로 만든다.
     *
     * 유물을 먼저 얹는다 — 카드가 유물 위에 쌓이는 것이지 유물을 덮는 것이 아니다.
     */
    buildBuff(): TurnBuff {
        let b: TurnBuff = { ...NO_BUFF };

        if (this.has("hotline")) b = { ...b, priceBias: b.priceBias + 0.01 };
        if (this.has("vest")) b = { ...b, downshieldRatio: Math.max(b.downshieldRatio, 0.2) };
        if (this.has("broker")) b = { ...b, feeWaived: true };

        return this.picked ? this.picked.apply(b) : b;
    }

    /* ── 유물 발동 ───────────────────────────────────────── */

    /**
     * 턴이 열릴 때 터지는 유물. 손패를 깐 **뒤에** 불러야 한다 — 파쇄기가 손패를 본다.
     * @returns 화면에 띄울 문구들.
     */
    onTurnStart(player: PlayerState): string[] {
        const fired: string[] = [];

        if (this.has("compass")) {
            player.insightPoints += 1;
            fired.push("낡은 나침반 — 인사이트 +1");
        }

        // 파쇄기 — 손에 잡힌 저주를 덱 밖으로. 덱을 얇게 만드는 유일한 길이다.
        if (this.has("shredder")) {
            const curses = this.hand.filter(c => c.kind === "curse");
            for (const c of curses) {
                this.hand = this.hand.filter(x => x.uid !== c.uid);
                this.removeFromDeck(c.id);
                fired.push(`파쇄기 — ${c.name} 을(를) 태웠습니다`);
            }
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
