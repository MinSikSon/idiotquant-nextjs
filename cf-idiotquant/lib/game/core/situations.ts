// 상황카드 — **겪어야 얻는다.**
//
// 예전에는 두 갈래를 모았다: 카드는 3·6·9턴에 셋 중 하나를 고르고, 유물은 판이 열릴 때
// 인사이트만큼 받았다. 둘 다 **시간표**였다. 지금은 하나뿐이고, 정해진 턴이 아니라
// **조건을 채우면 그 자리에서** 온다. 획득이 보상이 아니라 **사건**이 된다.
//
// ── 이것이 회귀의 「아는 것」이다 ────────────────────────────────
// 판이 끝나면 1997 로 돌아가고 돈도 신뢰도 고객도 사라지지만, 겪은 장면은 남는다.
// 그 장면이 곧 다음 회차의 손패다. **내가 한 것이 곧 내가 된다.**
//
// ── 조건은 채워지기 전에도 보인다 ───────────────────────────────
// `met()` 옆에 `progress()` 를 같이 둔다. 집 화면이 `근거를 대고 권한다 (2/3)` 을 세울 수
// 있어야 수집이 끌어당긴다 — 채워진 뒤에야 알게 되면 그건 수집이 아니라 우연이다.
// 판정과 표시가 **같은 사실**에서 나와야 어긋나지 않으므로 둘을 한자리에 둔다.

import type { CardLane, TurnBuff } from "./types";

/** 조건이 읽는 사실. 한 회차 동안 쌓인다. */
export interface SituationFacts {
    /** 근거를 대고 권한 횟수. */
    thesisPlays: number;
    /** 근거를 대고 권했다가 잃은 횟수. */
    thesisLosses: number;
    /** 근거 없이 권해서 잃은 횟수. */
    blindLosses: number;
    /** 근거 없이 권해서 번 횟수. */
    blindGains: number;
    /** 손절이 발동한 횟수. */
    stopHits: number;
    /** 한 챕터에서 「기다리시죠」를 고른 횟수(챕터마다 0 으로 돌아간다). */
    waitsThisChapter: number;
    /** 한 턴에 맞은 최악의 등락(%). 음수다. */
    worstTurnPct: number;
    /** 챕터를 끝냈을 때의 신뢰 중 가장 높았던 값. */
    bestChapterEndTrust: number;
    /** 챕터를 끝냈을 때 들고 있던 종목 수 중 가장 많았던 값. */
    mostHoldingsAtChapterEnd: number;
    /** 김 부장에게 근거를 대고 연속으로 벌어 준 횟수. */
    kimStreak: number;
    /** 자본잠식으로 끝난 적이 있는가. **회차를 넘어 남는 사실이다.** */
    everRuined: boolean;
}

export const EMPTY_FACTS: SituationFacts = {
    thesisPlays: 0, thesisLosses: 0, blindLosses: 0, blindGains: 0,
    stopHits: 0, waitsThisChapter: 0, worstTurnPct: 0,
    bestChapterEndTrust: 0, mostHoldingsAtChapterEnd: 0, kimStreak: 0,
    everRuined: false,
};

export interface Situation {
    id: string;
    name: string;
    lane: CardLane;
    /** 어떤 장면인가. 도감과 획득 알림이 이 한 줄을 쓴다. */
    scene: string;
    /** 손패에 늘 붙는 한 줄. */
    short: string;
    /** 눌러서 펼쳤을 때. */
    effect: string;
    /** 언제 쓰는 카드인가. */
    when: string;
    /** 처음부터 갖고 있는가. 증권맨이면 이미 겪었을 일들이다. */
    starter?: boolean;
    /** 언제 얻는가. 도감에 그대로 나간다. */
    how: string;
    /** 지금 몇 / 몇인가. 표시와 판정이 같은 사실에서 나오게 여기 함께 둔다. */
    progress(f: SituationFacts): [number, number];
    /** 손패에서 냈을 때 이번 턴에 열어 주는 것. */
    apply(b: TurnBuff): TurnBuff;
    /**
     * 이 카드가 **근거가 되는가.** `info` 갈래는 기본으로 근거가 되지만,
     * 「내부자 제보」만은 아니다 — 알아본 것이 아니라 얻어들은 것이라서다.
     */
    countsAsThesis?: boolean;
}

/** 조건이 채워졌는가. `progress` 하나에서 나오므로 둘이 어긋날 수 없다. */
export function isMet(s: Situation, f: SituationFacts): boolean {
    const [now, goal] = s.progress(f);
    return now >= goal;
}

const P = (now: number, goal: number): [number, number] => [Math.min(now, goal), goal];

export const SITUATIONS: readonly Situation[] = [
    /* ── 처음부터 갖고 있는 셋 ─────────────────────────────
       1997 이전에 그는 이 일을 잘하던 사람이었다. 갈래마다 하나씩. */
    {
        id: "report", name: "보고서를 읽은 밤", lane: "info", starter: true,
        scene: "야근을 하며 리포트를 끝까지 읽던 날들이 있었다.",
        short: "국면 + 남은 턴", when: "무엇을 권할지 정하기 전에.",
        effect: "지금 국면과 턴당 평균 등락, 그리고 이 국면이 몇 턴 더 가는지 알려 줍니다. 이 턴의 매수에 근거가 됩니다.",
        how: "처음부터 갖고 있다",
        progress: () => P(1, 1),
        apply: b => ({ ...b, regimeDepth: Math.max(b.regimeDepth, 2) }),
    },
    {
        id: "split", name: "나눠 담던 습관", lane: "act", starter: true,
        scene: "한 번에 다 넣지 않는 것만은 몸에 배어 있었다.",
        short: "수수료 절반", when: "여러 번에 걸쳐 담을 때.",
        effect: "이번 턴 수수료와 거래세를 절반만 냅니다.",
        how: "처음부터 갖고 있다",
        progress: () => P(1, 1),
        apply: b => ({ ...b, feeMult: Math.min(b.feeMult, 0.5) }),
    },
    {
        id: "burned", name: "한 번 데어 본 적 있다", lane: "guard", starter: true,
        scene: "그 전에도 한 번, 크게 맞아 본 적이 있었다.",
        short: "하락폭 40% 차단", when: "국면이 아래를 볼 때.",
        effect: "이번 턴 내리는 폭만 40% 줄입니다. 오르는 쪽은 안 건드립니다.",
        how: "처음부터 갖고 있다",
        progress: () => P(1, 1),
        apply: b => ({ ...b, downshieldRatio: Math.max(b.downshieldRatio, 0.4) }),
    },

    /* ── 겪어야 얻는 것들 ─────────────────────────────── */
    {
        id: "phone", name: "전화가 먼저 오던 시절", lane: "info",
        scene: "묻지 않아도 먼저 알려 주는 사람이 있던 때가 있었다.",
        short: "다음 1턴 미리보기", when: "이번 턴이 위험해 보일 때.",
        effect: "다음 1턴의 등락을 차트에 유령 봉으로 미리 그려 줍니다. 이 턴의 매수에 근거가 됩니다.",
        how: "한 챕터를 신뢰 60 이상으로 끝낸다",
        progress: f => P(f.bestChapterEndTrust, 60),
        apply: b => ({ ...b, peekTurns: Math.max(b.peekTurns, 1) }),
    },
    {
        id: "stoploss", name: "손절을 배운 날", lane: "act",
        scene: "더 내려갈 수 있다는 것을, 그날 처음으로 인정했다.",
        short: "−8% 자동 매도", when: "들고는 있어야 하는데 무서울 때.",
        effect: "앞으로 3턴 동안, 하루에 −8% 아래로 빠지면 그 자리에서 전량 매도합니다.",
        how: "손절을 세 번 맞는다",
        progress: f => P(f.stopHits, 3),
        apply: b => ({ ...b, stopLoss: 0.08, stopLossTurns: Math.max(b.stopLossTurns, 3) }),
    },
    {
        id: "explained", name: "설명할 수 있는 손실", lane: "guard",
        scene: "잃었지만, 왜 그랬는지는 말할 수 있었다. 그 차이가 컸다.",
        short: "근거 손실 절반", when: "근거는 있는데 결과가 불안할 때.",
        effect: "근거를 대고 권했다가 잃어도, 신뢰가 깎이는 폭이 절반이 됩니다.",
        how: "근거를 대고 세 번 잃는다",
        progress: f => P(f.thesisLosses, 3),
        apply: b => ({ ...b, softenLoss: true }),
    },
    {
        id: "kimsmile", name: "김 부장이 웃은 날", lane: "info",
        scene: "그가 웃었다. 1997년 이후로 처음이었다.",
        short: "이 턴 신뢰 유지", when: "신뢰가 한 칸 남았을 때.",
        effect: "이번 턴에는 신뢰가 저절로 줄지 않습니다. 이 턴의 매수에 근거가 됩니다.",
        how: "김 부장에게 근거를 대고 세 번 연속 벌어 준다",
        progress: f => P(f.kimStreak, 3),
        apply: b => ({ ...b, noDecay: true, regimeDepth: Math.max(b.regimeDepth, 1) }),
    },
    {
        id: "patience", name: "기다릴 줄 알게 됐다", lane: "guard",
        scene: "아무것도 안 하는 것이 제일 어려운 일이라는 걸 알게 됐다.",
        short: "신뢰 유지 + 방어", when: "국면이 바뀌기를 기다릴 때.",
        effect: "이번 턴 신뢰가 저절로 줄지 않고, 내리는 폭도 20% 줄입니다.",
        how: "한 챕터에서 다섯 번 기다린다",
        progress: f => P(f.waitsThisChapter, 5),
        apply: b => ({ ...b, noDecay: true, downshieldRatio: Math.max(b.downshieldRatio, 0.2) }),
    },
    {
        id: "margin", name: "빚으로 산 적 있다", lane: "act",
        scene: "없는 돈으로 사 봤다. 되긴 됐다. 다음이 문제였다.",
        short: "현금의 2배까지", when: "확신이 설 때. 그리고 그때가 제일 위험할 때.",
        effect: "이번 턴 현금의 두 배까지 살 수 있습니다. 대신 이번 턴 현금의 5%가 이자로 나갑니다.",
        how: "근거 없이 권해 세 번 잃는다",
        progress: f => P(f.blindLosses, 3),
        apply: b => ({ ...b, buyingPowerMult: Math.max(b.buyingPowerMult, 2), cashDrainPct: Math.max(b.cashDrainPct, 0.05) }),
    },
    {
        id: "bottom", name: "바닥을 본 적 있다", lane: "info",
        scene: "다 날린 적이 있다. 그 뒤로는 시장이 조금 다르게 보였다.",
        short: "국면 + 다음 국면", when: "판을 열자마자.",
        effect: "지금 국면과 남은 턴, 그리고 다음에 무엇이 오는지까지 알려 줍니다. 이 턴의 매수에 근거가 됩니다.",
        how: "맡은 돈을 전부 날려 본다",
        progress: f => P(f.everRuined ? 1 : 0, 1),
        apply: b => ({ ...b, regimeDepth: Math.max(b.regimeDepth, 3) }),
    },
    {
        id: "spread", name: "한 바구니에 안 담는다", lane: "act",
        scene: "셋으로 나눠 두었더니, 하나가 무너져도 사무실은 남았다.",
        short: "수수료 면제", when: "여러 자리를 한꺼번에 정리할 때.",
        effect: "이번 턴 수수료와 거래세를 내지 않습니다.",
        how: "세 종목을 들고 챕터를 끝낸다",
        progress: f => P(f.mostHoldingsAtChapterEnd, 3),
        apply: b => ({ ...b, feeMult: 0 }),
    },
    {
        id: "insider", name: "내부자 제보", lane: "info",
        scene: "어디서 들었냐고는 아무도 묻지 않았다.",
        short: "다음 2턴 미리보기", when: "알고는 싶은데 설명할 수는 없을 때.",
        // **근거가 되지 않는 유일한 정보 카드다.** 알아본 것이 아니라 얻어들은 것이라서,
        // 고객은 받아들여도 신뢰는 오르지 않는다.
        effect: "다음 2턴의 등락을 미리 봅니다. 다만 이것은 **근거가 되지 않습니다** — 알아본 것이 아니라 얻어들은 것입니다.",
        how: "근거 없이 권해 세 번 번다",
        progress: f => P(f.blindGains, 3),
        apply: b => ({ ...b, peekTurns: Math.max(b.peekTurns, 2) }),
        countsAsThesis: false,
    },
    {
        id: "everyone", name: "남들은 다 벌었다", lane: "curse",
        scene: "옆집이 두 배가 됐다는 말을 들은 날부터, 아무 말도 들리지 않았다.",
        short: "이 턴 근거 불가", when: "쓰고 싶어서 쓰는 카드가 아니다.",
        effect: "이번 턴에는 근거를 댈 수 없습니다. 무엇을 들고 있든 「믿어보십시오」가 됩니다.",
        how: "근거 없이 권해 한 번 잃는다",
        progress: f => P(f.blindLosses, 1),
        apply: b => ({ ...b, noThesis: true }),
    },
] as const;

export const SITUATION_BY_ID: Record<string, Situation> =
    Object.fromEntries(SITUATIONS.map(s => [s.id, s]));

/** 처음부터 갖고 시작하는 것들. */
export const STARTER_IDS: readonly string[] =
    SITUATIONS.filter(s => s.starter).map(s => s.id);

/**
 * 이 사실 위에서 **새로** 얻는 것들. 이미 가진 것은 다시 안 나온다 —
 * 겪은 장면은 하나뿐이라 같은 카드가 두 장이 될 수 없다.
 */
export function newlyEarned(f: SituationFacts, owned: readonly string[]): Situation[] {
    return SITUATIONS.filter(s => !s.starter && !owned.includes(s.id) && isMet(s, f));
}

/** 아직 못 겪은 것들 중 **가장 가까운** 셋. 집 화면이 이걸 카운터와 함께 세운다. */
export function nextUp(f: SituationFacts, owned: readonly string[], n = 3): Situation[] {
    return SITUATIONS
        .filter(s => !s.starter && !owned.includes(s.id))
        .map(s => ({ s, ratio: (() => { const [a, b] = s.progress(f); return b > 0 ? a / b : 0; })() }))
        .sort((x, y) => y.ratio - x.ratio)
        .slice(0, n)
        .map(x => x.s);
}

/** 이 카드가 이번 턴의 근거가 되는가. */
export function countsAsThesis(s: Situation): boolean {
    return s.countsAsThesis ?? s.lane === "info";
}
