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

import type { CardKind, CardLane, DeckState, PlayerState, Relic, StrategyCard, TurnBuff } from "./types";
import { NO_BUFF } from "./types";

/** 한 턴에 손에 들어오는 카드 수. */
export const HAND_SIZE = 3;

/**
 * 보상이 뜨는 턴(그 턴을 **끝냈을 때**). 12턴 중 셋.
 *
 * 카드와 유물이 **같은 자리**에서 나온다. 예전에는 카드가 3·6·9턴, 유물이 4·8턴이라
 * 판 중간에 무언가 뜨는 턴이 다섯이었고, 언제 무엇이 오는지 셀 수가 없었다. 3턴마다
 * 한 번, 그 자리에서 카드 하나와 유물 하나를 고른다.
 */
export const REWARD_TURNS = [3, 6, 9];

/** 보상으로 고르라고 내미는 장 수. */
export const OFFER_SIZE = 3;

/**
 * 강화의 끝. 0강(맨 것)에서 3강까지 넷.
 *
 * 3장이 한 장이 되므로 3강 한 장은 맨 카드 **27장**이다. 3턴마다 한 장씩 얻고 덱이 판을
 * 넘어 이어지니, 1강은 흔하고 2강은 목표이고 3강은 오래 굴린 사람의 것이다.
 */
export const MAX_LEVEL = 3;

/**
 * 강화 한 단계가 무엇을 하는가.
 *
 * 카드 하나에 넷(0~3강)이 들어 있다. **설명도 단계마다 따로 적는다** — "2배" 같은
 * 배율 한 줄로 뭉뜽그리면 지금 쥔 카드가 실제로 무엇을 하는지를 화면이 못 말한다.
 */
export interface CardLevel {
    /** 손패에 늘 붙는 한 줄. 석 자에서 예닐곱 자. */
    short: string;
    /** 눌러서 펼쳤을 때. */
    effect: string;
    apply: (b: TurnBuff) => TurnBuff;
}

/** 카드 한 장이 무엇을 하는가. 정의와 효과를 한자리에 둔다 — 갈라 두면 반드시 어긋난다. */
export interface CardDef {
    id: string;
    name: string;
    /** 무엇을 하는 갈래인가. 손패의 색이 이걸 그대로 따라간다. */
    lane: CardLane;
    kind: CardKind;
    /**
     * **언제 쓰는 카드인가.** 효과만 적어 두면 무엇을 고를지가 안 보인다 — 도감과
     * 화면이 같이 읽는 한 줄이다. 강화해도 쓰는 자리는 안 바뀌므로 단계 밖에 둔다.
     */
    when: string;
    /**
     * 0강부터 차례로. **저주는 하나뿐**이고(강화되지 않는다) 나머지는 넷이다.
     * 길이가 곧 "이 카드가 몇 강까지 가는가" 다.
     */
    levels: readonly CardLevel[];
    /** 이 카드를 얻으면 덱에 함께 들어오는 저주. 센 카드가 치르는 값이다. */
    curse?: string;
    /**
     * 지금 이 카드가 아무 일도 못 하는가. 손패에서 흐리게 칠할 근거다.
     * 안 주면 언제나 쓸모가 있다는 뜻이다.
     */
    idleWhen?: (p: { shares: number; cash: number; price: number }) => boolean;
}

/** 손절 예약이 걸리는 선. 강화해도 이 값은 안 움직인다 — 늘어나는 것은 **걸어 둔 턴 수**다. */
const STOP_LINE = 0.08;

const CARDS: CardDef[] = [
    /* ── 기본 ────────────────────────────────────────────
       판을 열 때 이 넷 중에서 무작위로 셋을 쥔다. 저주가 안 딸린다.

       강화의 축은 카드마다 하나뿐이다. 두 축을 섞으면(예보가 늘면서 수수료도 깎이면)
       그 카드가 무엇을 하는 카드인지가 강화할 때마다 흐려진다. */
    {
        id: "peek", name: "예고 시황", lane: "info", kind: "starter",
        when: "무엇을 할지 모르겠을 때. 보고 나서 크기를 정하면 됩니다.",
        // 축 = 몇 턴 앞을 보는가. 본 턴 수만큼 예보가 이어진다.
        levels: [1, 2, 3, 4].map(n => ({
            short: `다음 ${n}턴 미리보기`,
            effect: `다음 ${n}턴 등락을 차트에 유령 봉으로 미리 그려 줍니다. ${n}턴 동안 이어집니다.`,
            apply: (b: TurnBuff) => ({ ...b, peekTurns: Math.max(b.peekTurns, n) }),
        })),
    },
    {
        id: "analyst", name: "애널리스트 리포트", lane: "info", kind: "starter",
        when: "판을 열자마자. 기울기를 알면 서너 턴을 안심하고 굴립니다.",
        // 축 = 국면을 몇 겹까지 벗기는가. **0강에서 이미 숫자를 준다** — "상승" 이라는
        // 단어 하나로는 얼마나 오르는지 몰라서, 예전에는 이 카드를 써도 할 일이 안 정해졌다.
        levels: [
            {
                short: "국면 + 기울기",
                effect: "지금이 상승·하락·횡보 중 무엇인지와, 그 국면의 턴당 평균 등락(%)을 알려 줍니다.",
                apply: b => ({ ...b, regimeDepth: Math.max(b.regimeDepth, 1) }),
            },
            {
                short: "+ 남은 턴",
                effect: "위에 더해, 이 국면이 몇 턴 더 가는지 알려 줍니다.",
                apply: b => ({ ...b, regimeDepth: Math.max(b.regimeDepth, 2) }),
            },
            {
                short: "+ 다음 국면",
                effect: "위에 더해, 이 국면 다음에 무엇이 오는지 알려 줍니다.",
                apply: b => ({ ...b, regimeDepth: Math.max(b.regimeDepth, 3) }),
            },
            {
                short: "+ 다음 기울기",
                effect: "위에 더해, 다음 국면의 턴당 평균 등락까지 알려 줍니다.",
                apply: b => ({ ...b, regimeDepth: Math.max(b.regimeDepth, 4) }),
            },
        ],
    },
    {
        id: "hedge", name: "헤지", lane: "guard", kind: "starter",
        when: "들고는 있는데 방향을 모를 때.",
        // 축 = 방어가 대칭에서 비대칭으로. 0강은 오르는 쪽도 깎여서 확신이 있으면 손해지만,
        // 강화하면 **내리는 쪽만** 막게 된다 — 강화가 곧 "손해만 막는다" 는 이야기가 된다.
        levels: [
            {
                short: "등락 절반",
                effect: "이번 턴 등락이 절반으로 줄어듭니다. 오르는 쪽도 함께 줄어듭니다.",
                apply: b => ({ ...b, moveMult: b.moveMult * 0.5 }),
            },
            ...[0.5, 0.75, 0.9].map(r => ({
                short: `하락 ${Math.round(r * 100)}% 차단`,
                effect: `이번 턴 하락을 ${Math.round(r * 100)}% 막습니다. 오르는 쪽은 그대로 받습니다.`,
                apply: (b: TurnBuff) => ({ ...b, downshieldRatio: Math.max(b.downshieldRatio, r) }),
            })),
        ],
        idleWhen: p => p.shares === 0,
    },
    {
        id: "nofee", name: "수수료 면제", lane: "act", kind: "starter",
        when: "사고팔기를 자주 할 판에서. 아무 매매도 안 하면 소용없습니다.",
        // 축 = 몇 턴 동안 면제인가. 면제율은 0강에서 이미 100% 라 더 내릴 곳이 없다 —
        // 늘릴 것은 지속뿐이고, 그것이 예보와 같은 모양이라 새로 배울 것이 없다.
        levels: [1, 2, 3, 4].map(n => ({
            short: n === 1 ? "수수료 0" : `${n}턴 수수료 0`,
            effect: `${n}턴 동안 매매 수수료와 거래세를 내지 않습니다.`,
            apply: (b: TurnBuff) => ({ ...b, feeFreeTurns: Math.max(b.feeFreeTurns, n) }),
        })),
        idleWhen: p => p.shares === 0 && p.cash < p.price,
    },

    /* ── 보상 ────────────────────────────────────────────
       기본 카드보다 세고, 둘에는 저주가 딸려 온다. 이것들도 3강까지 간다. */
    {
        id: "stoploss", name: "손절 예약", lane: "guard", kind: "reward",
        when: "아무것도 못 읽은 채 들고 가야 할 때. 최악만 잘라 냅니다.",
        // 축 = 예약을 몇 턴 걸어 두는가. 손절선(−8%)은 안 움직인다 — 선을 조이면
        // 흔들림에도 팔려서 "강화" 인지 아닌지가 안 갈린다.
        levels: [1, 2, 3, 4].map(n => ({
            short: n === 1 ? "-8%면 전량 매도" : `${n}턴 -8% 손절`,
            effect: `${n}턴 동안, 8% 넘게 빠지는 턴이 오면 그 자리에서 전량 매도합니다.`,
            apply: (b: TurnBuff) => ({ ...b, stopLossTurns: Math.max(b.stopLossTurns, n) }),
        })),
        idleWhen: p => p.shares === 0,
    },
    {
        id: "insider", name: "내부자 제보", lane: "info", kind: "reward",
        when: "국면이 슬슬 끝날 것 같을 때. 예보와 국면을 한 장으로 봅니다.",
        // 정보 카드 둘을 한 장으로. 저주(정보 차단)가 딸려 오는 값이다.
        levels: [2, 3, 4, 5].map(n => ({
            short: `${n}턴 예보 + 국면`,
            effect: `다음 ${n}턴 등락을 미리 그리고, 지금 국면·기울기·남은 턴까지 함께 알려 줍니다.`,
            apply: (b: TurnBuff) => ({
                ...b,
                peekTurns: Math.max(b.peekTurns, n),
                regimeDepth: Math.max(b.regimeDepth, 2),
            }),
        })),
        curse: "blackout",
    },
    {
        id: "margin", name: "신용 융자", lane: "act", kind: "reward",
        when: "다음 턴 상승을 확실히 읽었을 때만. 틀리면 자본잠식이 그만큼 빨리 옵니다.",
        // 축 = 매수 한도 배수. **현금이 마이너스가 된다** — 갚는 절차도 이자도 없고,
        // 그 마이너스가 그대로 자산에서 빠져 자본잠식선이 가까워지는 것이 값이다.
        // (예전 설명의 "모자란 만큼은 빚" 은 갚을 무언가를 암시했는데 그런 것이 없었다.)
        levels: [2, 2.5, 3, 4].map(m => ({
            short: `매수력 ${m}배`,
            effect: `이번 턴만 현금의 ${m}배까지 삽니다. 초과한 만큼 현금이 마이너스가 되고, 그대로 자산에서 빠집니다.`,
            apply: (b: TurnBuff) => ({ ...b, buyingPowerMult: Math.max(b.buyingPowerMult, m) }),
        })),
        curse: "debt",
        idleWhen: p => p.cash < p.price,
    },

    /* ── 저주 ────────────────────────────────────────────
       손에 잡히면 그 턴이 아깝다. 덱이 두꺼워질수록 자주 잡힌다.
       **강화되지 않는다**(단계가 하나뿐이다). 셋이 모이면 그대로 사라진다 —
       파쇄기 말고 저주를 덜어 내는 유일한 길이다. */
    {
        id: "blackout", name: "정보 차단", lane: "curse", kind: "curse",
        when: "쓸 일이 없습니다. 읽을 것이 없는 턴에 흘려보내세요.",
        levels: [{
            short: "저주 — 아무것도 못 봄",
            effect: "저주 — 이번 턴은 무엇을 써도 예보도 국면도 안 보입니다.",
            apply: b => ({ ...b, blind: true }),
        }],
    },
    {
        id: "debt", name: "이자 상환", lane: "curse", kind: "curse",
        when: "쓸 일이 없습니다. 현금이 적을 때 흘려보내는 것이 그나마 낫습니다.",
        levels: [{
            short: "저주 — 현금 5% 이자",
            effect: "저주 — 이번 턴 현금의 5%가 이자로 빠져나갑니다.",
            apply: b => ({ ...b, cashDrainPct: b.cashDrainPct + 0.05 }),
        }],
    },
];

/**
 * 카드 전부. **도감이 이 배열을 그대로 그린다** — 화면용 사본을 따로 두면 어느 날
 * 한쪽만 바뀐다. `apply` 는 함수라 화면이 못 쓰지만, 나머지는 그대로 읽을 수 있다.
 */
export const CARD_LIST: readonly CardDef[] = CARDS;

/* ── 덱에 적히는 것 ─────────────────────────────────────────────
   덱은 문자열 목록이다(뽑을 더미·버린 더미·저장). **강화 단계를 그 문자열에 적는다** —
   `"peek"` 가 0강, `"peek+1"` 이 1강. 이렇게 두면 더미도 저장도 손패도 모양이 안 바뀌고,
   "같은 카드 셋" 이 곧 "같은 문자열 셋" 이라 합성이 문자열 비교 하나로 끝난다. */

/** 이 카드 이 단계를 덱에 적는 이름. */
export function cardKey(id: string, level = 0): string {
    return level > 0 ? `${id}+${level}` : id;
}

/** 덱에 적힌 이름을 갈라 읽는다. 모르는 카드면 null. */
export function parseCardKey(key: string): { def: CardDef; level: number } | null {
    const at = key.lastIndexOf("+");
    const id = at > 0 ? key.slice(0, at) : key;
    const level = at > 0 ? Number(key.slice(at + 1)) : 0;
    const def = CARDS.find(c => c.id === id);
    if (!def || !Number.isInteger(level) || level < 0 || level >= def.levels.length) return null;
    return { def, level };
}

/** 화면에 찍히는 이름. 강화했으면 `+N` 이 붙는다. */
export function displayName(def: CardDef, level: number): string {
    return level > 0 ? `${def.name} +${level}` : def.name;
}

/**
 * 옛 저장에 남은 카드 id 를 지금 것으로 옮긴다.
 *
 * 예전에는 셋을 모으면 **다른 카드**가 됐다(예고 시황 ×3 → 정밀 예보). 지금은 같은 카드가
 * 한 단계 오른다. 그래서 옛 이름들은 갈 곳이 정해져 있다 — 그냥 버리면 오래 굴린 사람의
 * 덱에서 센 카드가 소리 없이 사라진다.
 */
const LEGACY: Record<string, string> = {
    forecast: "peek+1",     // 2턴 예보
    tipoff: "analyst+1",    // 국면 + 남은 턴
    bunker: "hedge+3",      // 하락 90% 차단
    probe: "",              // 수수료 3배 저주 — 값이 하찮아 없앴다
};

function defOf(key: string): CardDef | undefined {
    return parseCardKey(key)?.def;
}

function levelOf(key: string): number {
    return parseCardKey(key)?.level ?? 0;
}

/** 덱에 적힌 이름 하나를 화면용 이름으로. */
function nameOfKey(key: string): string {
    const p = parseCardKey(key);
    return p ? displayName(p.def, p.level) : key;
}

/** 손에 든 한 장이 덱에서 어느 이름이었나. 단계가 다르면 다른 장이다. */
function keyOfCard(c: StrategyCard): string {
    return cardKey(c.id, c.level);
}

/** 아주 처음에 무작위로 쥐는 장 수. */
export const OPENING_DECK_SIZE = 3;

/** 같은 카드가 이만큼 모이면 한 단계 오른다. */
export const MERGE_COUNT = 3;

/**
 * 맨 처음 덱 — 기본 카드 넷 중 **무작위 셋**.
 *
 * 고정 여섯 장이던 시절에는 첫 턴이 늘 똑같았다. 셋을 무작위로 쥐면 첫 턴부터 이번 판이
 * 무엇을 못 보는 판인지가 갈리고, 그 빈자리를 3턴마다 얻는 카드로 메우게 된다.
 */
export function openingDeck(rand: () => number): string[] {
    const starters = CARDS.filter(c => c.kind === "starter").map(c => c.id);
    return sample(starters, OPENING_DECK_SIZE, rand);
}

/** 합성 한 번의 결과. 화면이 이걸 그대로 문장으로 만든다. */
export interface MergeResult {
    /** 합쳐진 카드 이름(강화 표시 포함). */
    from: string;
    /** 무엇이 되었는가. 사라졌으면 null. */
    to: string | null;
}

/**
 * 덱에 무엇이 몇 장 있고, 합성까지 얼마 남았는가.
 *
 * `DECK 4/9` 한 줄로는 **무엇을 모으는 중인지**가 안 보인다. 합성은 이 게임에서 덱을
 * 얇게 하는 두 길 중 하나인데, 자기가 어느 카드를 두 장 쥐고 있는지 모르면 보상 칸에서
 * 금색 테두리가 뜰 때까지 그 선택이 존재하지 않는 것과 같다.
 */
export interface DeckEntry {
    /** 덱에 적힌 이름(`peek+1`). 같은 카드라도 단계가 다르면 다른 줄이다. */
    key: string;
    id: string;
    /** 화면에 찍는 이름. 강화했으면 `+N` 이 붙어 있다. */
    name: string;
    /** 강화 단계(0~3). */
    level: number;
    lane: CardLane;
    /** 덱 전체에서 몇 장인가. 손패에 든 것도 덱의 일부라 함께 센다. */
    count: number;
    /**
     * 셋을 채우면 무엇이 되는가(이름). `null` 이면 사라지고(저주), 없으면 더 오를 곳이
     * 없다 — 3강이거나 강화가 없는 카드다.
     */
    mergeInto?: string | null;
    /** 한 장만 더 모으면 합쳐진다. */
    ready: boolean;
}

/**
 * 처음부터 열려 있는 보상 카드. 나머지는 경력 인사이트로 열린다(progress.UNLOCKS).
 *
 * 다섯 장이 처음부터 다 나오면 세 판이면 다 본다. 시작을 얇게 두면 판을 거듭할 이유와
 * 다양성이 같은 곳에서 나온다.
 */
const BASE_REWARD_IDS = ["stoploss"];

/** 처음부터 들고 있는 유물. 나머지는 해금된다. */
const BASE_RELIC_IDS = ["compass", "vest", "broker"];

/** 유물 — 한 번 얻으면 판이 끝날 때까지 남는다. 도감도 이 목록을 읽는다. */
export const RELIC_POOL: Relic[] = [
    {
        id: "compass", name: "낡은 나침반", triggerType: "onTurnStart",
        // 예전에는 설명에 없는 "인사이트 +1" 을 매 턴 몰래 줬다. 유물 하나가 두 가지를
        // 하면 무엇 때문에 골랐는지를 알 수 없어서, 안 적힌 쪽을 없앴다.
        description: "매 턴 지금 국면과 턴당 평균 등락이 보입니다. 애널리스트 리포트를 안 써도 됩니다.",
    },
    {
        id: "hotline", name: "증권가 핫라인", triggerType: "onTurnStart",
        description: "매 턴 다음 1턴 등락이 보입니다. 이 판에서 가장 센 유물입니다.",
    },
    {
        id: "vest", name: "방탄 조끼", triggerType: "onTurnStart",
        description: "하락폭이 항상 20% 줄어듭니다.",
    },
    {
        id: "broker", name: "단골 브로커", triggerType: "onTrade",
        description: "수수료와 거래세를 항상 면제받습니다.",
    },
    {
        id: "dividend", name: "배당 통지서", triggerType: "onTurnEnd",
        // 예전의 "비밀 장부 — 오른 턴마다 인사이트 +1" 을 갈아 끼웠다. 인사이트는 **다음**
        // 판의 시작 유물 수를 정하는 값이라, 이 판에서는 아무 일도 안 일어났다. 유물을
        // 고르는 자리에서 그 셋 중 하나가 이번 판에 아무것도 안 한다면 그건 선택이 아니다.
        description: "오른 턴이 끝날 때마다 보유 평가액의 1%를 현금으로 받습니다.",
    },
    {
        id: "shredder", name: "파쇄기", triggerType: "onTurnStart",
        description: "저주를 손에 쥐면 그 자리에서 덱 밖으로 버립니다.",
    },
];

/** 배당 통지서가 오른 턴마다 주는 비율. */
const DIVIDEND_RATE = 0.01;

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
    /** 이번 턴에 고른 **단계**. 턴이 넘어가면 비워진다. */
    private picked: CardLevel | null = null;
    /** uid 를 만드는 counter. 같은 카드 여러 장을 구별하는 값이다. */
    private seq = 0;
    /** 경력으로 열어 둔 카드·유물 id. 보상과 유물 후보가 여기서 넓어진다. */
    private unlocked: Set<string>;
    /** 아직 화면이 안 읽어 간 합성 결과. */
    private pendingMerges: MergeResult[] = [];

    /**
     * 예보가 **몇 턴** 더 남았는가. 턴이 넘어가도 남는다.
     *
     * 정밀 예보가 "다음 두 턴" 이라면서 다음 턴에 사라지면 그건 거짓말이다. 남은 턴 수를
     * 들고 있다가 한 턴씩 덜어 내야 두 턴짜리가 두 턴짜리가 된다.
     *
     * **값이 아니라 턴 수를 들고 있는 것이 요점이다.** 예전에는 본 등락(%)을 그대로
     * 들고 있다가 다음 턴에 그대로 다시 그렸다. 그러면 그 사이에 헤지를 들어도 그림이
     * 안 바뀌어, 차트가 오지 않을 등락을 계속 가리켰다. 지금은 턴 수만 남기고 그림은
     * 매번 `engine.read(buildBuff())` 가 새로 낸다 — 지금 든 카드가 반영된 값이다.
     *
     * 수수료 면제와 손절 예약도 같은 모양이다. 셋 다 "몇 턴 간다" 가 강화의 축이라,
     * 세는 자리를 한 곳에 모아 둔다 — 규칙이 셋이 아니라 하나다.
     */
    private lasting = { peek: 0, fee: 0, stop: 0 };

    /**
     * @param carriedDeck 지난 판에서 넘어온 덱. **비어 있으면 새 게임** — 무작위 셋으로 연다.
     * @param unlocked 경력으로 열어 둔 카드·유물 id.
     */
    constructor(seed: number, carriedDeck: readonly string[] = [], unlocked: readonly string[] = []) {
        // 엔진과 같은 시드를 쓰되 흩어 둔다. 그대로 쓰면 주가와 카드가 같은 수열을 밟는다.
        this.rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
        this.unlocked = new Set(unlocked);

        // 옛 이름을 지금 것으로 옮긴 뒤, 그러고도 모르는 것은 조용히 버린다.
        const kept = carriedDeck
            .map(key => LEGACY[key] ?? key)
            .filter(key => key !== "" && defOf(key));
        this.drawPile = this.shuffled(kept.length > 0 ? kept : openingDeck(this.rand));

        // 넘어온 덱에 이미 셋이 모여 있을 수 있다 — 보상을 건너뛰고 판을 끝냈거나, 저장이
        // 옛 규칙으로 쌓였거나. 판을 여는 자리에서 한 번 훑어야 "셋이면 합쳐진다" 가
        // 언제나 참이 된다.
        for (const key of new Set(this.drawPile)) this.mergeAt(key);
    }

    /**
     * 지금 보상으로 나올 수 있는 카드. **기본 카드도 함께 나온다.**
     *
     * 센 카드만 내밀면 합성이 죽는다 — 보상 카드는 위층이 없어 안 합쳐지고, 기본 카드는
     * 처음 세 장이 서로 다르므로 셋이 모일 길이 없어진다. 기본 카드를 섞어 두면 그 자리가
     * 진짜 선택이 된다: 지금 센 것을 집을 것인가, 약한 것을 모아 나중에 합칠 것인가.
     */
    get rewardPool(): string[] {
        return CARDS.filter(c => c.kind === "starter"
            || (c.kind === "reward" && (BASE_REWARD_IDS.includes(c.id) || this.unlocked.has(c.id))))
            .map(c => c.id);
    }

    /** 지금 나올 수 있는 유물. */
    get relicPool(): Relic[] {
        return RELIC_POOL.filter(r => BASE_RELIC_IDS.includes(r.id) || this.unlocked.has(r.id));
    }

    /** 여러 턴 가는 것이 각각 몇 턴 남았는가. 화면의 "켜짐" 한 줄이 이걸 읽는다. */
    get lastingLeft(): { peek: number; fee: number; stop: number } {
        return { ...this.lasting };
    }

    /**
     * 이번 턴에 쓴 카드가 **몇 턴짜리였는지**를 들고 간다. 더 긴 것을 쓰면 그것으로
     * 늘어나고 짧은 것으로는 안 줄어든다 — 이미 얻은 것을 도로 뺏을 이유가 없다.
     */
    remember(b: TurnBuff): void {
        const up = (v: number) => Math.max(0, Math.floor(v));
        this.lasting = {
            peek: Math.max(this.lasting.peek, up(b.peekTurns)),
            fee: Math.max(this.lasting.fee, up(b.feeFreeTurns)),
            stop: Math.max(this.lasting.stop, up(b.stopLossTurns)),
        };
    }

    /** 한 턴이 지났다. 남은 것들을 한 턴씩 덜어 낸다. */
    consumeTurn(): void {
        const dec = (v: number) => Math.max(0, v - 1);
        this.lasting = {
            peek: dec(this.lasting.peek), fee: dec(this.lasting.fee), stop: dec(this.lasting.stop),
        };
    }

    /* ── 덱 ─────────────────────────────────────────────── */

    /**
     * 지금 덱 전부(카드 id). 뽑을 것·버린 것·손에 든 것을 합친 것이다.
     *
     * 판이 끝나면 이 목록이 그대로 저장되어 다음 판의 시작 덱이 된다.
     */
    get deck(): string[] {
        // **손패는 `keyOfCard` 로 적는다.** `c.id` 로 적으면 판이 끝나는 순간 손에 들려
        // 있던 카드의 강화가 통째로 날아간다 — 3강을 쥔 채 판을 끝내면 0강으로 저장됐다.
        return this.allKeys;
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

    /**
     * 덱에 한 장 넣는다. 보상으로 고른 카드와, 거기 딸린 저주가 이리로 온다.
     *
     * 넣고 나서 곧바로 합성을 본다 — 셋째 장이 들어오는 순간이 합쳐지는 순간이다.
     */
    addToDeck(key: string): void {
        if (!defOf(key)) return;
        // 버린 더미에 넣는다 — 방금 얻은 카드가 이번 턴에 바로 잡히면 보상이 아니라 마술이다.
        this.discardPile.push(key);
        this.mergeAt(key);
    }

    /**
     * 같은 카드가 셋 모였으면 합친다. 합친 결과가 또 셋이 될 수 있어 될 때까지 돈다.
     *
     * 덱이 3턴마다 한 장씩 두꺼워지는데 합성이 없으면 원하는 카드가 영영 안 잡힌다.
     * 셋을 하나로 바꾸는 이 규칙이 "얇게 유지하기" 와 "세게 만들기" 를 같은 행동으로 묶는다.
     */
    private mergeAt(cardKeyIn: string): void {
        const queue = [cardKeyIn];
        while (queue.length > 0) {
            const key = queue.shift()!;
            const p = parseCardKey(key);
            if (!p) continue;
            const next = this.upgradeOf(p.def, p.level);
            if (next === undefined) continue;                   // 더 오를 곳이 없다

            while (this.removableCount(key) >= MERGE_COUNT) {
                for (let i = 0; i < MERGE_COUNT; i++) this.removeFromDeck(key);
                this.pendingMerges.push({
                    from: displayName(p.def, p.level),
                    to: next === null ? null : nameOfKey(next),
                });
                if (next === null) continue;                    // 저주 — 셋이 그냥 사라진다
                this.discardPile.push(next);
                queue.push(next);
            }
        }
    }

    /**
     * 이 카드 이 단계에서 셋을 모으면 무엇이 되는가.
     *
     *   키    한 단계 오른다
     *   null  사라진다 — 저주는 강화되지 않는다
     *   undefined  아무 일도 안 일어난다 — 이미 3강이다
     */
    private upgradeOf(def: CardDef, level: number): string | null | undefined {
        if (def.kind === "curse") return null;
        if (level + 1 >= def.levels.length) return undefined;
        return cardKey(def.id, level + 1);
    }

    /**
     * 지금 실제로 빼낼 수 있는 같은 카드의 수.
     *
     * 손에 든 장도 덱의 일부라 함께 세지만, **이번 턴에 고른 한 장은 뺀다** — 효과가
     * 이미 걸려 있는 카드를 도로 가져가면 화면과 결과가 어긋난다.
     */
    private removableCount(key: string): number {
        const inPiles = this.drawPile.filter(k => k === key).length
            + this.discardPile.filter(k => k === key).length;
        return inPiles + this.hand.filter(c => keyOfCard(c) === key && !c.isUsed).length;
    }

    /**
     * 이 카드를 **한 장 더 넣으면** 합성이 터지는가. 터지면 무엇이 되는지 돌려준다.
     *
     * 합성이 조용히 일어나면 덱에서 카드가 사라진 것처럼 보인다. 고르기 **전에** 이걸
     * 알려 줘야 "약한 카드를 모아 강화한다" 가 선택이 된다 — 지금 센 카드를 집을 것인가,
     * 이 한 장으로 셋을 채울 것인가.
     *
     * @returns 합쳐져서 될 카드 이름. 사라지는 저주면 빈 문자열. 안 터지면 null.
     */
    mergePreview(key: string): string | null {
        const p = parseCardKey(key);
        if (!p) return null;
        const next = this.upgradeOf(p.def, p.level);
        if (next === undefined) return null;
        if (this.removableCount(key) !== MERGE_COUNT - 1) return null;
        return next === null ? "" : nameOfKey(next);
    }

    /** 방금 일어난 합성을 가져간다. 한 번 읽으면 비워진다. */
    takeMerges(): MergeResult[] {
        const out = this.pendingMerges;
        this.pendingMerges = [];
        return out;
    }

    /** 덱에서 한 장을 영영 뺀다. 파쇄기와 합성이 쓴다. 손패에 있으면 손패에서 뺀다. */
    private removeFromDeck(key: string): boolean {
        for (const pile of [this.discardPile, this.drawPile]) {
            const i = pile.indexOf(key);
            if (i >= 0) { pile.splice(i, 1); return true; }
        }
        const j = this.hand.findIndex(c => keyOfCard(c) === key && !c.isUsed);
        if (j >= 0) { this.hand.splice(j, 1); return true; }
        return false;
    }

    /** 덱 전부(뽑을 것·버린 것·손에 든 것). 강화 단계까지 적힌 이름이다. */
    private get allKeys(): string[] {
        return [...this.drawPile, ...this.discardPile, ...this.hand.map(keyOfCard)];
    }

    get deckState(): DeckState {
        const all = this.allKeys;
        return {
            draw: this.drawPile.length,
            discard: this.discardPile.length,
            total: all.length,
            curses: all.filter(k => defOf(k)?.kind === "curse").length,
        };
    }

    /**
     * 덱에 든 카드를 종류별로. **합성이 임박한 것이 맨 위**로 온다.
     *
     * 세는 자리가 `removableCount` 와 다르다는 점이 중요하다. 저기는 "지금 빼낼 수 있는
     * 장 수"(이번 턴에 쓴 카드는 못 뺀다)이고, 여기는 **가진 장 수**다. 쓴 카드도 턴이
     * 넘어가면 버린 더미로 돌아오므로, 목록에서 빼 버리면 덱에서 한 장이 사라진 것처럼 보인다.
     */
    get deckList(): DeckEntry[] {
        const seen = new Map<string, number>();
        for (const key of this.allKeys) seen.set(key, (seen.get(key) ?? 0) + 1);

        const out: DeckEntry[] = [];
        for (const [key, count] of seen) {
            const p = parseCardKey(key);
            if (!p) continue;
            const next = this.upgradeOf(p.def, p.level);
            const e: DeckEntry = {
                key, id: p.def.id, name: displayName(p.def, p.level), level: p.level,
                lane: p.def.lane, count,
                ready: next !== undefined && count === MERGE_COUNT - 1,
            };
            // 없는 키와 `undefined` 를 가진 키를 가르려면 이렇게 넣어야 한다 — 저주의
            // `null`(사라짐)과 3강의 "더 오를 곳 없음" 은 다른 말이다.
            if (next !== undefined) e.mergeInto = next === null ? null : nameOfKey(next);
            out.push(e);
        }
        // 한 장만 더면 맨 위 → 많이 가진 것 → 강화가 높은 것 → 이름순.
        return out.sort((a, b) =>
            Number(b.ready) - Number(a.ready) || b.count - a.count
            || b.level - a.level || a.name.localeCompare(b.name));
    }

    /* ── 손패 ───────────────────────────────────────────── */

    /**
     * 턴이 시작될 때 덱에서 세 장. 지난 턴 손패는 통째로 버린 더미로 간다.
     *
     * 덱이 모자라면 버린 더미를 섞어 되돌린다 — 그래서 얻은 카드가 언젠가는 반드시
     * 손에 잡히고, 덱이 두꺼울수록 그 "언젠가" 가 멀어진다.
     */
    dealHand(): StrategyCard[] {
        const returned = this.hand.map(keyOfCard);
        this.discardPile.push(...returned);
        this.hand = [];
        this.picked = null;

        // **돌아온 카드로 셋이 채워졌으면 여기서 합쳐진다.**
        //
        // `removableCount` 는 이번 턴에 쓴 카드를 안 센다 — 효과가 걸린 카드를 도로
        // 가져가면 화면과 결과가 어긋나기 때문이다. 그래서 두 장을 쥔 채 한 장을 쓰고
        // 셋째 장을 보상으로 받으면 그 턴에는 합성이 안 터지고, 다음 턴에 손패가
        // 돌아와도 아무도 다시 안 봤다 — 같은 카드 셋을 들고 있는데 영영 안 합쳐졌다.
        for (const key of new Set(returned)) this.mergeAt(key);

        const drawn: string[] = [];
        for (let i = 0; i < HAND_SIZE; i++) {
            if (this.drawPile.length === 0) {
                if (this.discardPile.length === 0) break;   // 덱이 통째로 비었다(파쇄기)
                this.drawPile = this.shuffled(this.discardPile);
                this.discardPile = [];
            }
            drawn.push(this.drawPile.shift()!);
        }

        this.hand = drawn.map(key => this.toCard(key, "c"));
        return this.hand;
    }

    /**
     * 덱에 적힌 이름 하나를 화면이 쥘 수 있는 **한 장**으로 만든다. uid 가 그 장의 이름표다.
     *
     * 설명은 **그 단계의 것**을 편다. 강화한 카드가 0강의 설명을 달고 있으면 화면이
     * 거짓말을 한다 — 3턴 예보를 쥐고 "다음 1턴 미리보기" 를 읽게 된다.
     */
    private toCard(key: string, prefix: string): StrategyCard {
        const { def, level } = parseCardKey(key)!;
        const lv = def.levels[level]!;
        return {
            uid: `${prefix}${this.seq++}`,
            id: def.id, name: displayName(def, level), lane: def.lane, kind: def.kind,
            shortDescription: lv.short,
            effectDescription: lv.effect,
            when: def.when,
            level,
            isUsed: false,
            // 값을 고르기 전에 보여 준다. 고르고 나서 알게 되면 그건 고른 것이 아니다.
            ...(def.curse ? { curseName: defOf(def.curse)?.name } : {}),
        };
    }

    /**
     * 카드를 고른다. 한 턴에 한 장뿐이다 — 여러 장을 겹치면 첫 턴에 판이 끝난다.
     * @param uid 그 **장**의 번호. 같은 카드가 두 장 잡혔을 때 어느 쪽인지 갈라야 한다.
     */
    playCard(uid: string): boolean {
        if (this.picked) return false;
        const card = this.hand.find(c => c.uid === uid);
        if (!card) return false;
        // **그 장의 단계**를 집는다. 같은 카드라도 0강과 2강이 하는 일이 다르다.
        const p = parseCardKey(keyOfCard(card));
        if (!p) return false;

        this.picked = p.def.levels[p.level]!;
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
    isIdle(key: string, p: { shares: number; cash: number; price: number }): boolean {
        return defOf(key)?.idleWhen?.(p) ?? false;
    }

    /** 이 카드를 언제 쓰는가. 고른 순간 화면이 함께 읽어 준다. */
    whenOf(key: string): string {
        return defOf(key)?.when ?? "";
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
        // 보상은 **늘 0강**으로 나온다. 강화는 모아서 하는 것이지 얻는 것이 아니다 —
        // 강화된 카드가 보상으로 굴러들어오면 세 장을 모으는 일이 값을 잃는다.
        return sample(this.rewardPool, OFFER_SIZE, this.rand).map(id => this.toCard(id, "r"));
    }

    /**
     * 보상을 받는다. 저주가 딸린 카드면 저주도 함께 덱에 들어간다.
     * @returns 함께 들어온 저주의 이름. 없으면 null — 화면이 그 사실을 말해야 한다.
     */
    takeReward(key: string): string | null {
        const def = defOf(key);
        if (!def) return null;
        this.addToDeck(key);
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
        const pool = this.relicPool;
        const n = Math.min(pool.length, 1 + Math.floor(insightPoints / 15));
        this.relics = sample(pool, n, this.rand);
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
        return sample(this.relicPool.filter(r => !owned.has(r.id)), n, this.rand);
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

        if (this.has("compass")) b = { ...b, regimeDepth: Math.max(b.regimeDepth, 1) };
        if (this.has("hotline")) b = { ...b, peekTurns: Math.max(b.peekTurns, 1) };
        if (this.has("vest")) b = { ...b, downshieldRatio: Math.max(b.downshieldRatio, 0.2) };
        if (this.has("broker")) b = { ...b, feeMult: 0 };

        const out = this.picked ? this.picked.apply(b) : b;

        // 지난 턴에 걸어 둔 것이 아직 남아 있으면 이번 턴에도 산다. 여기서 얹어야 화면이
        // 매번 **지금 든 카드가 반영된** 예보를 새로 받는다.
        //
        // "몇 턴" 은 카드가 말하고(`feeFreeTurns`·`stopLossTurns`), 그것을 이번 턴의
        // 실제 값으로 바꾸는 것은 여기다 — 엔진은 배수와 손절선만 안다.
        const feeOn = this.lasting.fee > 0 || out.feeFreeTurns > 0;
        const stopOn = this.lasting.stop > 0 || out.stopLossTurns > 0;
        return {
            ...out,
            peekTurns: Math.max(out.peekTurns, this.lasting.peek),
            feeMult: feeOn ? 0 : out.feeMult,
            stopLoss: stopOn ? Math.max(out.stopLoss, STOP_LINE) : out.stopLoss,
        };
    }

    /* ── 유물 발동 ───────────────────────────────────────── */

    /**
     * 턴이 열릴 때 터지는 유물. 손패를 깐 **뒤에** 불러야 한다 — 파쇄기가 손패를 본다.
     * @returns 화면에 띄울 문구들.
     */
    onTurnStart(player: PlayerState): string[] {
        const fired: string[] = [];

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

    /**
     * 턴이 닫힐 때 터지는 유물.
     *
     * @param price 지금 주가. 배당이 **이 판의 현금**을 늘리므로 평가액이 필요하다.
     */
    onTurnEnd(player: PlayerState, changePct: number, price: number): string[] {
        const fired: string[] = [];
        // 배당 통지서 — 오른 턴에만, 들고 있는 만큼. 예전의 "인사이트 +1" 은 **다음** 판의
        // 시작 유물 수를 정하는 값이라 이 판에서는 아무 일도 안 일어났다.
        if (this.has("dividend") && changePct > 0 && player.shares > 0) {
            const paid = Math.floor(player.shares * price * DIVIDEND_RATE);
            if (paid > 0) {
                player.cash += paid;
                fired.push(`배당 통지서 — 현금 +${paid.toLocaleString()}원`);
            }
        }
        return fired;
    }
}
