// 운용사 규칙 (클라이언트 판).
//
// 워커의 src/lib/firmRules.js 와 짝이다. 화면이 "이번 분기에 얼마 벌었다"를 보여 주려면
// 서버와 같은 계산을 해야 해서, 상수나 식이 어긋나면 화면과 서버가 다른 숫자를 말한다.
// 한쪽을 고치면 반드시 다른 쪽도 고칠 것.
// (레포가 갈라져 있어 코드를 공유할 수 없어 감수하는 중복이다 — engine·round 와 같은 사정)
//
// ── 왜 시드는 고정인데 AUM 은 자라는가 ──────────────────────────────────
// 한 판은 언제나 1,000만원짜리 모델 포트폴리오로 굴린다 — 실력만 재기 위해서다.
// 고객은 그 성적(트랙레코드)을 보고 돈을 맡기고, 회사는 맡은 돈에서 보수를 받는다.
// 성적은 실력, AUM 은 그 실력이 벌어들이는 것.

export const INITIAL_AUM = 100_000_000;
export const MIN_AUM = 10_000_000;

const FLOW_MIN = -40;
const FLOW_MAX = 50;
const BASE_FEE_BP = 25;     // 연 1% ÷ 4분기
const PERF_FEE_PCT = 10;    // 초과수익분의 10%

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
    cash: number;
    quarters: number;
    tools: string[];
    rank: string;
    carry?: Carry | null;
}

export interface Tool {
    id: string;
    name: string;
    detail: string;
    price: number;
}

/** 분기 성적 → 고객 자금 유출입률(%). 벤치마크 초과가 주된 동력, 절대 손실은 따로 벌을 받는다. */
export function flowRate(finalReturn: number, bhReturn: number): number {
    const excess = (Number(finalReturn) || 0) - (Number(bhReturn) || 0);
    const loss = Math.min(Number(finalReturn) || 0, 0);
    return clamp(excess * 3 + loss * 1.5, FLOW_MIN, FLOW_MAX);
}

export function nextAum(aum: number, finalReturn: number, bhReturn: number): number {
    const base = Math.max(Number(aum) || 0, MIN_AUM);
    return Math.max(Math.round(base * (1 + flowRate(finalReturn, bhReturn) / 100)), MIN_AUM);
}

export function baseFee(aum: number): number {
    return Math.floor((Math.max(Number(aum) || 0, 0) * BASE_FEE_BP) / 10_000);
}

export function perfFee(aum: number, finalReturn: number, bhReturn: number): number {
    const excess = (Number(finalReturn) || 0) - (Number(bhReturn) || 0);
    if (!(excess > 0)) return 0;
    return Math.floor((Math.max(Number(aum) || 0, 0) * excess * PERF_FEE_PCT) / 10_000);
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
    { id: "ma", name: "이동평균선", detail: "5일·20일", price: 300_000 },
    { id: "bb", name: "볼린저밴드", detail: "20일 · 2σ", price: 1_000_000 },
];

export function settleQuarter(aum: number, finalReturn: number, bhReturn: number) {
    const before = Math.max(Number(aum) || 0, MIN_AUM);
    const fee = baseFee(before);
    const perf = perfFee(before, finalReturn, bhReturn);
    const after = nextAum(before, finalReturn, bhReturn);
    return {
        aumBefore: before, aumAfter: after,
        flowRate: flowRate(finalReturn, bhReturn),
        feeBase: fee, feePerf: perf, feeTotal: fee + perf,
        rankBefore: rankOf(before), rankAfter: rankOf(after),
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
