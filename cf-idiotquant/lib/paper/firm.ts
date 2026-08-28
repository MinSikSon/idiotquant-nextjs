// 운용사 규칙 (클라이언트 판).
//
// 워커의 src/lib/firmRules.js 와 짝이다. 화면이 "이번 분기에 얼마 벌었다"를 보여 주려면
// 서버와 같은 계산을 해야 해서, 상수나 식이 어긋나면 화면과 서버가 다른 숫자를 말한다.
// 한쪽을 고치면 반드시 다른 쪽도 고칠 것.
// (레포가 갈라져 있어 코드를 공유할 수 없어 감수하는 중복이다 — engine·round 와 같은 사정)
//
// ── 맡은 돈이 곧 굴리는 돈이다 ──────────────────────────────────────────
// 한 반기의 시드는 그 시점의 AUM 이다. 반기가 끝나면 그 수익률이 AUM 에 그대로 곱해지고,
// 거기에 고객 유출입이 더해진다. 잘하면 다음 반기가 커지고 못하면 줄어든다.
// 다만 끝없이 줄지는 않는다 — 최고점 대비 너무 많이 잃으면 회사가 문을 닫는다.

import type { SeasonClient } from "./season";

export const INITIAL_AUM = 100_000_000;

/**
 * 최고점 대비 이만큼은 남아 있어야 문을 안 닫는다(%).
 *
 * 아무리 잃어도 판이 계속 굴러가면 손절도 비중 조절도 할 이유가 없다 — 벤치마크 초과에
 * 붙는 유입(×3)이 손실에 붙는 유출(×1.5)보다 커서, 늘 최대한 몰아넣는 쪽이 기대값에서
 * 앞선다. 문을 닫는 선이 있어야 그 꼬리에 값이 매겨진다.
 *
 * 절대 금액이 아니라 최고점 대비인 이유: 1억을 굴리든 100억을 굴리든 "맡은 돈의 60% 가
 * 사라지면 회사가 못 버틴다"는 규모와 무관하게 성립한다.
 */
export const RUIN_KEEP_PCT = 40;

/**
 * 한 주도 안 산 반기의 고객 유출률(%).
 *
 * 관망도 전략이지만 40일 내내 한 주도 안 산 반기는 운용이 아니다. 하락장에서는 그게
 * 벤치마크를 이기는 가장 쉬운 길이라, 그대로 두면 "아무것도 하지 않기"가 최적 전략이
 * 되어 게임이 멈춘다. 한 번이라도 사면 보통 규칙으로 돌아간다.
 */
export const IDLE_FLOW = -10;

/** 정산에 얹히는 이번 반기의 사정. */
export interface SettleOpts {
    /** 이번 반기에 맡긴 쪽. 없으면(옛 판) 예전 규칙 그대로. */
    client?: SeasonClient | null;
    /** 한 주도 안 샀는가. */
    idle?: boolean;
    /** 여태 맡았던 돈의 최고점. 파산 판정에 쓴다. */
    peak?: number;
}

/** 계산이 성립하는 최소치(0 나눗셈 방지). 게임 규칙이 아니다 — 워커의 MIN_CAPITAL 과 같다. */
const MIN_CAPITAL = 1;

// 화면이 "고객 돈이 왜 이만큼 들고 났는지"를 설명하려면 식의 계수까지 알아야 한다.
// 문장에 숫자를 다시 적으면 규칙이 바뀔 때 설명만 옛말이 된다.
export const FLOW_MIN = -40;
export const FLOW_MAX = 50;
export const FLOW_EXCESS_MULT = 3;    // 벤치마크 초과 1%p 당 유입 3%
export const FLOW_LOSS_MULT = 1.5;    // 절대 손실 1% 당 유출 1.5%
export const BASE_FEE_BP = 25;        // 연 1% ÷ 4분기
export const PERF_FEE_PCT = 10;       // 초과수익분의 10%

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 다음 분기로 넘긴 보유. 종목은 알려 주지 않는다 — 이어지는 판도 블라인드여야 한다. */
export interface Carry {
    qty: number;
    price: number;
    sector: string | null;
}

export interface Firm {
    name: string | null;
    aum: number;
    /** 여태 맡았던 돈의 최고점. 여기서 RUIN_KEEP_PCT 아래로 떨어지면 문을 닫는다. */
    peak_aum?: number;
    cash: number;
    quarters: number;
    tools: string[];
    rank: string;
    /** 다음 반기로 넘긴 자리들. 넷 중 둘만 들고 갈 수도 있다. */
    carry?: Carry[] | null;
}

export interface Tool {
    id: string;
    name: string;
    detail: string;
    price: number;
    /** 화면에 그대로 나가는 설명. "무엇을 그리는가" 가 아니라 "어떻게 읽는가". */
    hint: string;
}

/** 고객 성격의 배수. 고객이 없으면(옛 판) 1 — 예전 규칙 그대로 굴러간다. */
const mult = (v: number | undefined) => (Number.isFinite(Number(v)) ? Number(v) : 1);

/**
 * 분기 성적 → 고객 자금 유출입률(%). 벤치마크 초과가 주된 동력, 절대 손실은 따로 벌을 받는다.
 *
 * 같은 성적이라도 연기금 앞에서는 손실이 두 배로 아프고 헤지펀드 앞에서는 초과분만 센다.
 */
export function flowRate(finalReturn: number, bhReturn: number, opts: SettleOpts = {}): number {
    if (opts.idle) return IDLE_FLOW;
    const excess = (Number(finalReturn) || 0) - (Number(bhReturn) || 0);
    const loss = Math.min(Number(finalReturn) || 0, 0);
    return clamp(
        excess * FLOW_EXCESS_MULT * mult(opts.client?.excess)
        + loss * FLOW_LOSS_MULT * mult(opts.client?.loss),
        FLOW_MIN, FLOW_MAX,
    );
}

/** 운용 성과가 먼저 곱해지고(맡은 돈을 굴렸으니), 그다음 고객이 들고 난다. */
export function nextAum(aum: number, finalReturn: number, bhReturn: number, opts: SettleOpts = {}): number {
    const base = Math.max(Number(aum) || 0, MIN_CAPITAL);
    const grown = base * (1 + (Number(finalReturn) || 0) / 100);
    return Math.max(Math.round(grown * (1 + flowRate(finalReturn, bhReturn, opts) / 100)), MIN_CAPITAL);
}

export function baseFee(aum: number): number {
    return Math.floor((Math.max(Number(aum) || 0, 0) * BASE_FEE_BP) / 10_000);
}

/**
 * 성과보수 — 벤치마크를 이겼을 때만. 한 주도 안 산 반기에는 주지 않는다: 하락장에
 * 현금으로 앉아 생긴 초과분은 운용의 결과가 아니고, 그걸로 보수까지 받으면 관망이
 * 곧 벌이가 된다.
 */
export function perfFee(aum: number, finalReturn: number, bhReturn: number, opts: SettleOpts = {}): number {
    if (opts.idle) return 0;
    const excess = (Number(finalReturn) || 0) - (Number(bhReturn) || 0);
    if (!(excess > 0)) return 0;
    return Math.floor(
        (Math.max(Number(aum) || 0, 0) * excess * PERF_FEE_PCT * mult(opts.client?.perf)) / 10_000,
    );
}

const RANKS = [
    { min: 100_000_000_000, name: "대형 자산운용사" },
    { min: 10_000_000_000, name: "헤지펀드" },
    { min: 1_000_000_000, name: "중형 운용사" },
    { min: 100_000_000, name: "부티크 운용사" },
    { min: 0, name: "1인 사무실" },
];

export function rankOf(aum: number): string {
    const v = Number(aum) || 0;
    return RANKS.find(r => v >= r.min)!.name;
}

export const TOOLS: Tool[] = [
    {
        id: "ma", name: "이동평균선", detail: "5일·20일", price: 300_000,
        hint: "최근 5일과 20일의 평균 가격. 짧은 선이 긴 선 위에 있으면 오름세, 아래면 내림세로 본다.",
    },
    {
        id: "dc", name: "돌파선", detail: "20일 최고·최저", price: 800_000,
        hint: "지난 20일 안에서 가장 비쌌던 값과 가장 쌌던 값. 위를 뚫으면 20일 신고가, 아래를 뚫으면 신저가다.",
    },
    {
        id: "bb", name: "볼린저밴드", detail: "20일 · 2σ", price: 1_000_000,
        hint: "20일 평균에서 표준편차 2배만큼 위아래로 그은 선. 밖으로 나가면 평소보다 많이 움직인 날이다.",
    },
    {
        id: "atr", name: "변동폭", detail: "14일 평균 하루 폭", price: 2_000_000,
        hint: "최근 14일 동안 하루에 오르내린 폭의 평균을 현재가 위아래로. 손절 자리를 이 폭보다 좁게 잡으면 그냥 흔들림에 털린다.",
    },
];

/**
 * 문을 닫을 만큼 잃었는가. 최고점을 모르면(옛 기록) 판단하지 않는다 — 규칙이 없던
 * 시절의 회사를 뒤늦게 폐업시키는 것은 사용자가 겪은 적 없는 벌이다.
 */
export function isRuined(peak: number | null | undefined, aum: number): boolean {
    const p = Math.max(Number(peak) || 0, 0);
    if (!(p > 0)) return false;
    return (Number(aum) || 0) < Math.floor((p * RUIN_KEEP_PCT) / 100);
}

export function settleQuarter(aum: number, finalReturn: number, bhReturn: number, opts: SettleOpts = {}) {
    const before = Math.max(Number(aum) || 0, MIN_CAPITAL);
    const fee = baseFee(before);
    const perf = perfFee(before, finalReturn, bhReturn, opts);
    const after = nextAum(before, finalReturn, bhReturn, opts);
    // 이번 반기를 시작할 때의 맡은 돈도 최고점 후보다 — 최고점을 기록한 적 없는 회사도
    // 첫 정산부터 규칙이 걸리게.
    const peakBefore = Math.max(Number(opts.peak) || 0, before);
    return {
        aumBefore: before, aumAfter: after,
        flowRate: flowRate(finalReturn, bhReturn, opts),
        feeBase: fee, feePerf: perf, feeTotal: fee + perf,
        rankBefore: rankOf(before), rankAfter: rankOf(after),
        peakBefore, peakAfter: Math.max(peakBefore, after),
        ruined: isRuined(peakBefore, after),
        idle: !!opts.idle,
    };
}

/** 억·만 단위로 짧게. 모바일에서 ₩1,090,000,000 은 칸을 넘긴다. */
export function fmtMoney(won: number): string {
    const v = Math.round(Number(won) || 0);
    const sign = v < 0 ? "-" : "";
    const a = Math.abs(v);
    if (a >= 100_000_000) {
        const eok = Math.floor(a / 100_000_000);
        const man = Math.floor((a % 100_000_000) / 10_000);
        return `${sign}${eok}억${man ? ` ${man.toLocaleString()}만` : ""}`;
    }
    if (a >= 10_000) return `${sign}${Math.floor(a / 10_000).toLocaleString()}만`;
    return `${sign}${a.toLocaleString()}`;
}
