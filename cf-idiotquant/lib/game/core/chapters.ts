// 연대와 종목. **1997~2000 이 여기 통째로 적혀 있다.**
//
// ── 시대는 국면의 순서다 ─────────────────────────────────────────
// 이 게임의 캔들은 실제 과거 시세가 아니다(구할 수도 없다 — 그 시절의 주인공들은
// 상장폐지다). 대신 엔진에 이미 있던 **국면**을 무작위로 잇지 않고 **역사에서 받아온다.**
// 1998 은 bear → chop → bull, 1999 는 극단으로 민 bull, 2000 은 crash.
// 종목 이름은 지어낸 것이고 시대만 진짜다.
//
// ── 반기마다 회사 하나가 상장한다 ────────────────────────────────
// 챕터 12턴 = 1년 = 2반기이므로 각 챕터의 **1턴과 7턴**에 하나씩 는다(보상과 안 겹치게
// 반기 첫 턴이다). 시작 셋 + 여섯 반기 = 아홉. 그리고 **새로 상장하는 회사가 그 반기의
// 성격을 말한다** — 1999 하반기의 거인닷컴(β 2.0)이 이 표의 핵심이다. 열병이 정점일 때
// 상장해 날아오르고, 2000 에 그만큼 무너진다.

import type { Regime } from "./types";

/* ── 전 구간의 시간 ──────────────────────────────────────────── */

/** 첫 턴 앞에 놓이는 봉. 판을 열자마자 읽을 거리가 있어야 한다. */
export const CONTEXT_BARS = 6;
/** 한 챕터의 턴 수(프롤로그만 예외). */
export const CHAPTER_TURNS = 12;
/** 반기 = 6턴. 상장이 여기 맞춰 일어난다. */
export const HALF_TURNS = 6;

/* ── 종목 ────────────────────────────────────────────────────── */

export interface StockDef {
    id: string;
    name: string;
    ticker: string;
    /** 상장 시점의 가격. */
    price: number;
    /** 한 턴 개별 변동폭의 기준(0.02 = 2%). 시장과 무관한 저 혼자의 흔들림이다. */
    vol: number;
    /**
     * 시장 국면에 대한 민감도. 1 이 시장과 같이 가는 것.
     *
     * **국면은 시장에 하나뿐이다.** 종목마다 국면을 따로 두면 2000년에 어떤 것은 오르고
     * 어떤 것은 내려 "붕괴" 가 안 느껴진다. 대신 베타로 갈린다 — 같은 하락에서
     * 무진홀딩스(0.4)와 거인닷컴(2.0)이 다섯 배로 벌어진다.
     */
    beta: number;
    /** 몇 번째 턴에 상장하는가(전 구간 기준). 그 전에는 목록에도 안 나온다. */
    listedAt: number;
    /** 어떤 회사인가. 시세판에서 한 줄로 나간다. */
    blurb: string;
}

/**
 * 이름은 지어낸 것이다 — 실제 회사의 성적을 흉내 내는 게임이 아니다.
 * 티커도 장식이다.
 */
export const UNIVERSE: readonly StockDef[] = [
    // 시작 셋 — 내가 이미 담당하던 것들
    { id: "daesung", name: "대성중공업", ticker: "004150", price: 18_500, vol: 0.028, beta: 1.1, listedAt: 1,
      blurb: "내가 담당하던 중공업" },
    { id: "dongbang", name: "동방해운", ticker: "001680", price: 9_400, vol: 0.041, beta: 1.3, listedAt: 1,
      blurb: "환율에 제일 먼저 맞았다" },
    { id: "cheongwoo", name: "청우식품", ticker: "005180", price: 31_200, vol: 0.019, beta: 0.5, listedAt: 1,
      blurb: "안 오르고 안 내린다" },
    // 1998 상 — 수출로 살아나는 쪽
    { id: "hanbit", name: "한빛반도체", ticker: "011000", price: 24_000, vol: 0.035, beta: 1.2, listedAt: 5,
      blurb: "수출로 살아나는 쪽" },
    // 1998 하 — 구조조정 끝에 남은 자산주
    { id: "taepyeong", name: "태평제강", ticker: "003030", price: 12_700, vol: 0.030, beta: 0.9, listedAt: 11,
      blurb: "구조조정 끝에 남았다" },
    // 1999 상 — 코스닥 인터넷 1세대
    { id: "nuri", name: "누리소프트", ticker: "078340", price: 16_800, vol: 0.046, beta: 1.6, listedAt: 17,
      blurb: "코스닥 인터넷 1세대" },
    // 1999 하 — 광풍의 얼굴. 이 표의 핵심이다
    { id: "geoin", name: "거인닷컴", ticker: "038290", price: 21_500, vol: 0.062, beta: 2.0, listedAt: 23,
      blurb: "광풍의 얼굴" },
    // 2000 상 — 마지막 벤처 상장
    { id: "mirae", name: "미래바이오", ticker: "092300", price: 44_000, vol: 0.052, beta: 1.8, listedAt: 29,
      blurb: "마지막 벤처 상장" },
    // 2000 하 — 무너진 뒤에 상장한 배당주
    { id: "mujin", name: "무진홀딩스", ticker: "001440", price: 8_900, vol: 0.016, beta: 0.4, listedAt: 35,
      blurb: "무너진 뒤에 상장했다" },
] as const;

/** 이 턴에 이미 상장한 종목들. */
export function listedAt(turn: number): readonly StockDef[] {
    return UNIVERSE.filter(s => s.listedAt <= turn);
}

/** 이 턴에 **새로** 상장한 종목. 없으면 null — 로그가 그 사실을 말한다. */
export function newlyListedAt(turn: number): StockDef | null {
    return UNIVERSE.find(s => s.listedAt === turn) ?? null;
}

/* ── 국면 스크립트 ───────────────────────────────────────────── */

export interface RegimeSpan {
    kind: Regime;
    turns: number;
    /** 이 구간의 기울기 배수. 1999 의 광기와 2000 의 붕괴가 여기서 나온다. */
    driftMult?: number;
    /** 이 구간의 흔들림 배수. */
    volMult?: number;
}

/** 프롤로그가 시작될 때 이미 들고 있는 자리. */
export interface OpeningPosition {
    stockId: string;
    /** 시작 자금의 몇 %를 이 종목에 넣어 뒀는가. */
    pctOfCash: number;
    /**
     * 평단가가 지금 값의 몇 배인가. 1.6 이면 이미 −37% 다.
     *
     * **프롤로그가 이길 수 없는 이유가 이것이다.** 판이 열리기 전에 이미 무너지기
     * 시작했고, 나는 그 자리를 물려받은 채 앉아 있다. 첫 턴에 전부 팔아도 손실은
     * 확정되고 수수료까지 나간다 — 무엇을 해도 진다.
     */
    avgOverCurrent: number;
}

export interface Chapter {
    id: string;
    /** 챕터 띠에 나가는 것 — "1998" */
    year: string;
    /** 챕터 이름 — "바닥에서" */
    title: string;
    /** 집에서 읽는 1인칭 내레이션. */
    narration: readonly string[];
    turns: number;
    /** 이 챕터가 전 구간의 몇 번째 턴에서 시작하는가(1부터). */
    startTurn: number;
    regimes: readonly RegimeSpan[];
    news: { good: readonly string[]; bad: readonly string[] };
    /** 챕터가 끝날 때 남은 빚에 붙는 이자(비율). */
    interest: number;
    /** 프롤로그에만 있다. */
    opening?: readonly OpeningPosition[];
    /** 이 챕터가 끝나면 생기는 빚(원). 프롤로그에만 있다. */
    debtOnEnd?: number;
}

export const CHAPTERS: readonly Chapter[] = [
    {
        id: "1997",
        year: "1997",
        title: "프롤로그",
        narration: [
            "1997년 11월.",
            "회사가 흔들린다는 말은 여름부터 있었다.",
            "나는 괜찮다고 말했다. 그렇게 말하는 것이 내 일이었다.",
        ],
        turns: 4,
        startTurn: 1,
        // 무엇을 해도 진다. 국면이 처음부터 끝까지 아래를 본다.
        regimes: [
            { kind: "bear", turns: 2, driftMult: 1.6, volMult: 1.2 },
            { kind: "bear", turns: 2, driftMult: 3.0, volMult: 1.6 },
        ],
        news: {
            good: ["정부, 금융시장 안정 대책 발표", "환율 방어 개입"],
            bad: [
                "기아, 부도 처리",
                "종금사 영업정지",
                "환율 1,700원 돌파",
                "IMF 구제금융 신청",
                "증권사 두 곳 부도",
            ],
        },
        interest: 0,
        // 판이 열리기 전에 이미 물려 있다. 고객 돈 전부가 시장에 있다.
        opening: [
            { stockId: "daesung", pctOfCash: 40, avgOverCurrent: 1.7 },
            { stockId: "dongbang", pctOfCash: 35, avgOverCurrent: 1.9 },
            { stockId: "cheongwoo", pctOfCash: 25, avgOverCurrent: 1.3 },
        ],
        debtOnEnd: 30_000_000,
    },
    {
        id: "1998",
        year: "1998",
        title: "바닥에서",
        narration: [
            "1998년 1월. 회사는 없어졌다.",
            "내 말을 믿고 맡긴 사람들은 그 돈을 잃었다.",
            "명동 골목 3층에 사무실 하나를 얻었다.",
        ],
        turns: CHAPTER_TURNS,
        startTurn: 5,
        regimes: [
            { kind: "bear", turns: 4, driftMult: 1.2 },
            { kind: "chop", turns: 3, volMult: 1.3 },
            { kind: "bull", turns: 5, driftMult: 1.3 },
        ],
        news: {
            good: ["수출 호조 — 환율 효과", "외국인 순매수 전환", "금리 인하", "구조조정 마무리 발표"],
            bad: ["실업률 최고치", "회사채 발행 실패", "대주주 지분 매각", "감자 결정"],
        },
        interest: 0.12,
    },
    {
        id: "1999",
        year: "1999",
        title: "열병",
        narration: [
            "1999년 1월.",
            "사람들이 다시 전화를 걸어오기 시작했다.",
            "다만 이번엔 내 말을 듣고 싶어서가 아니었다.",
        ],
        turns: CHAPTER_TURNS,
        startTurn: 17,
        // 안 타면 뒤처지고 타면 죽는다. 기울기도 흔들림도 극단이다.
        regimes: [
            { kind: "bull", turns: 5, driftMult: 1.6, volMult: 1.4 },
            { kind: "chop", turns: 2, volMult: 1.8 },
            { kind: "bull", turns: 5, driftMult: 2.1, volMult: 1.8 },
        ],
        news: {
            good: [
                "코스닥 신규 상장 봇물",
                "15일 연속 상한가 종목 등장",
                "인터넷 사업 진출 공시",
                "액면분할 결정",
                "무상증자 발표",
            ],
            bad: ["작전 세력 조사 착수", "대주주 매도 공시", "실적 없는 공시라는 지적"],
        },
        interest: 0.1,
    },
    {
        id: "2000",
        year: "2000",
        title: "청구서",
        narration: [
            "2000년 1월.",
            "작년에 번 돈이 얼마인지 다들 알고 있었다.",
            "그것이 어떻게 번 돈인지는 아무도 묻지 않았다.",
        ],
        turns: CHAPTER_TURNS,
        startTurn: 29,
        regimes: [
            { kind: "chop", turns: 2, volMult: 1.5 },
            { kind: "bear", turns: 6, driftMult: 2.2, volMult: 1.6 },
            { kind: "bear", turns: 4, driftMult: 1.4 },
        ],
        news: {
            good: ["낙폭 과대 반등", "자사주 매입 발표", "정부 안정 기금 조성"],
            bad: [
                "코스닥 반토막",
                "나스닥 급락 — 밤사이 −8%",
                "대주주 담보 반대매매",
                "상장폐지 실질심사",
                "감사의견 거절",
            ],
        },
        interest: 0.15,
    },
] as const;

/** 전 구간의 총 턴 수. 프롤로그 4 + 12 × 3 = 40. */
export const TOTAL_TURNS = CHAPTERS.reduce((n, c) => n + c.turns, 0);

/** 전 구간 기준 턴이 어느 챕터에 속하는가. 범위를 벗어나면 null. */
export function chapterAtTurn(turn: number): Chapter | null {
    return CHAPTERS.find(c => turn >= c.startTurn && turn < c.startTurn + c.turns) ?? null;
}

/**
 * 이 챕터의 국면을 턴마다 펼친다. `regimes` 의 `turns` 합이 챕터 길이와 다르면
 * 마지막 것이 이어진다 — 표를 고칠 때 길이를 매번 세지 않아도 되게.
 */
export function regimeTimeline(ch: Chapter): RegimeSpan[] {
    const out: RegimeSpan[] = [];
    for (const span of ch.regimes) {
        for (let i = 0; i < span.turns && out.length < ch.turns; i++) out.push(span);
    }
    const last = ch.regimes[ch.regimes.length - 1];
    while (out.length < ch.turns && last) out.push(last);
    return out;
}
