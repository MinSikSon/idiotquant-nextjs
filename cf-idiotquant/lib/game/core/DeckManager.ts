// 손패를 돌린다. **덱은 이제 내가 겪은 장면들이다.**
//
// 예전 `RoguelikeManager` 는 카드에 강화 단계가 있었고, 3·6·9턴에 셋 중 하나를 고르게
// 했고, 같은 카드 셋을 합쳤고, 인사이트로 유물과 카드를 해금했다. 그 다섯이 전부
// 사라졌다 — 모으는 방식이 **조건 달성** 하나로 바뀌었기 때문이다(`core/situations.ts`).
//
//   유물        → 없앤다. 모으는 것은 하나뿐이어야 한다
//   보상 턴     → 조건을 채운 그 자리에서 온다
//   합성        → 겪은 장면은 하나뿐이라 같은 카드가 두 장이 안 나온다
//   해금        → 겪는 것 자체가 해금이다
//   경력 인사이트 → 쓸 데가 없어졌다. 진행도는 회차와 수집률이 말한다
//
// 남은 것은 이 파일이 하는 일 하나다: **여섯 장을 섞어 셋씩 돌린다.**

import type { StrategyCard, TurnBuff } from "./types";
import { NO_BUFF } from "./types";
import { SITUATION_BY_ID, countsAsThesis, type Situation } from "./situations";

export const HAND_SIZE = 3;
/** 집에서 골라 나가는 장 수. 모은 것이 늘어도 덱이 물처럼 묽어지지 않게 한다. */
export const LOADOUT_SIZE = 6;

/** mulberry32 — 짧고, 32비트 시드 하나로 충분히 고르게 흩어진다. */
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

/** 덱이 지금 어떤 상태인가. HUD 한 줄이 이걸 읽는다. */
export interface DeckState {
    draw: number;
    discard: number;
    total: number;
    /** 그중 저주 — 덱이 얼마나 더러운가. */
    curses: number;
}

function toCard(s: Situation, uid: string): StrategyCard {
    return {
        uid, id: s.id, name: s.name, lane: s.lane,
        shortDescription: s.short,
        effectDescription: s.effect,
        when: s.when,
        scene: s.scene,
        isThesis: countsAsThesis(s),
        isUsed: false,
    };
}

export class DeckManager {
    /** 이번 챕터에 들고 나온 장들(상황 id). 집에서 골랐다. */
    private readonly loadout: string[];
    private draw: string[] = [];
    private discard: string[] = [];
    private hand: StrategyCard[] = [];
    private rand: () => number;
    private uidSeq = 0;

    /** 이번 턴에 낸 카드들. 턴이 넘어가면 비워진다. */
    private played: Situation[] = [];
    /** 여러 턴 걸쳐 있는 것 — 예보와 손절은 걸어 두면 남는다. */
    private peekLeft = 0;
    private stopLeft = 0;
    private feeFreeLeft = 0;

    constructor(seed: number, loadout: readonly string[]) {
        this.rand = mulberry32(seed >>> 0);
        // 없는 id 는 조용히 버린다 — 저장된 덱이 정의보다 오래됐을 수 있다.
        this.loadout = loadout.filter(id => SITUATION_BY_ID[id]).slice(0, LOADOUT_SIZE);
        this.reshuffle();
    }

    private reshuffle(): void {
        this.draw = [...this.loadout];
        for (let i = this.draw.length - 1; i > 0; i--) {
            const j = Math.floor(this.rand() * (i + 1));
            [this.draw[i], this.draw[j]] = [this.draw[j]!, this.draw[i]!];
        }
        this.discard = [];
    }

    /** 이번 턴의 손패 셋. 덱이 모자라면 버린 더미를 다시 섞는다. */
    dealHand(): StrategyCard[] {
        this.hand = [];
        for (let i = 0; i < HAND_SIZE; i++) {
            if (this.draw.length === 0) {
                if (this.discard.length === 0) break;
                this.draw = this.discard;
                this.discard = [];
                for (let k = this.draw.length - 1; k > 0; k--) {
                    const j = Math.floor(this.rand() * (k + 1));
                    [this.draw[k], this.draw[j]] = [this.draw[j]!, this.draw[k]!];
                }
            }
            const id = this.draw.pop();
            if (!id) break;
            const s = SITUATION_BY_ID[id];
            if (!s) continue;
            this.hand.push(toCard(s, `c${this.uidSeq++}`));
        }
        return this.hand;
    }

    get currentHand(): readonly StrategyCard[] { return this.hand; }

    /** 한 장을 낸다. 이미 낸 장은 다시 안 먹는다. */
    playCard(uid: string): boolean {
        const card = this.hand.find(c => c.uid === uid);
        if (!card || card.isUsed) return false;
        const s = SITUATION_BY_ID[card.id];
        if (!s) return false;
        card.isUsed = true;
        this.played.push(s);
        return true;
    }

    /**
     * 이번 턴에 열린 것 전부.
     *
     * **근거는 여기서 정해진다.** `info` 갈래를 냈으면 그 이름이 `thesis` 에 박히고,
     * 「내부자 제보」는 안 박힌다(알아본 것이 아니라 얻어들은 것이다). 저주가 있으면
     * 무엇을 냈든 근거가 지워진다 — 그 턴은 「믿어보십시오」밖에 없다.
     */
    buildBuff(): TurnBuff {
        let b: TurnBuff = { ...NO_BUFF };
        for (const s of this.played) b = s.apply(b);

        // 걸어 둔 것이 남아 있으면 이어 준다.
        if (this.peekLeft > 0) b.peekTurns = Math.max(b.peekTurns, 1);
        if (this.stopLeft > 0 && b.stopLoss === 0) b.stopLoss = 0.08;
        if (this.feeFreeLeft > 0) b.feeMult = 0;

        const thesis = this.played.find(s => countsAsThesis(s));
        b.thesis = b.noThesis ? null : (thesis?.name ?? null);
        return b;
    }

    /** 턴이 넘어갔다. 낸 카드를 버린 더미로 보내고, 걸어 둔 것의 남은 턴을 줄인다. */
    consumeTurn(buff: TurnBuff): void {
        for (const c of this.hand) if (c.isUsed) this.discard.push(c.id);
        this.hand = [];
        this.played = [];

        this.peekLeft = Math.max(0, buff.peekTurns > 0 ? Math.max(this.peekLeft, 1) - 1 : this.peekLeft - 1);
        this.stopLeft = Math.max(0, buff.stopLossTurns > 0 ? buff.stopLossTurns - 1 : this.stopLeft - 1);
        this.feeFreeLeft = Math.max(0, buff.feeFreeTurns > 0 ? buff.feeFreeTurns - 1 : this.feeFreeLeft - 1);
    }

    get state(): DeckState {
        const all = [...this.draw, ...this.discard, ...this.hand.map(c => c.id)];
        return {
            draw: this.draw.length,
            discard: this.discard.length,
            total: this.loadout.length,
            curses: all.filter(id => SITUATION_BY_ID[id]?.lane === "curse").length,
        };
    }

    /** 이 카드가 지금 아무 일도 못 하는가. 손패에서 흐리게 칠할 근거다. */
    isIdle(card: StrategyCard, p: { holdings: number; cash: number }): boolean {
        // 방어와 손절은 들고 있는 것이 있어야 뜻이 있다.
        if (card.id === "stoploss" || card.id === "burned" || card.id === "explained") return p.holdings === 0;
        // 살 돈이 없으면 집행 카드가 헛돈다.
        if (card.lane === "act" && card.id !== "spread") return p.cash <= 0;
        return false;
    }
}
