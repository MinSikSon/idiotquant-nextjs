/**
 * 복리 수익률 계산 — 화면과 떨어진 순수 계산부.
 *
 * 금액 단위는 전부 만원이다. 원 단위로 두면 화면에 찍히는 숫자가 여덟 자리를
 * 넘어가고, 이 계산기가 다루는 값은 애초에 만원 아래를 따지지 않는다.
 */

export type Method = "compound" | "simple";
export type Periods = 1 | 2 | 4 | 12;
/** 화면에 몇 줄을 펼칠지. 계산 조건도 함께 정한다(maskDetail). */
export type Detail = "simple" | "detailed";

/** 수익률을 한 값으로 둘지, 범위 안에서 해마다 뽑을지. */
export type RateMode = "fixed" | "range";

export interface CalcInputs {
    initial: number;    // 초기 투자금 (만원)
    monthly: number;    // 매월 적립금 (만원)
    rate: number;       // 연 수익률 (%) — rateMode 가 fixed 일 때 쓰인다
    years: number;
    method: Method;
    periods: Periods;   // 복리 편입 주기 (연 1 / 반기 2 / 분기 4 / 월 12)
    tax: boolean;       // 이자소득세 15.4%
    inflation: number;  // 물가상승률 (%)

    rateMode: RateMode;
    rateMin: number;    // 범위 하한 (%)
    rateMax: number;    // 범위 상한 (%)
    /** 난수의 씨앗. 같은 씨앗이면 언제 어디서 열어도 같은 해에 같은 수익률이 나온다. */
    seed: number;
}

export const TAX_RATE = 15.4;

export const DEFAULTS: CalcInputs = {
    initial: 1000,
    monthly: 50,
    rate: 7,
    years: 20,
    method: "compound",
    periods: 12,
    tax: true,
    inflation: 2.5,
    rateMode: "fixed",
    rateMin: 0,
    rateMax: 14,
    seed: 1,
};

const LIMITS: Record<"initial" | "monthly" | "rate" | "years" | "inflation", [number, number]> = {
    initial: [0, 1_000_000],
    monthly: [0, 10_000],
    rate: [-50, 100],
    years: [1, 60],
    inflation: [0, 20],
};

const clamp = (v: number, [min, max]: [number, number], fallback: number) =>
    Math.min(max, Math.max(min, Number.isFinite(v) ? v : fallback));

/* ── 치는 중인 글자 ──────────────────────────────────────────────
 *
 * ── 왜 이 둘이 필요한가 ────────────────────────────────────────
 * 입력칸이 `value={숫자}` 에 `onChange={e => set(Number(e.target.value))}` 였다.
 * 한 글자 칠 때마다 숫자로 바꿔 `sanitize` 를 태우고 그 결과를 도로 칸에 그리는
 * 구조인데, **치는 중인 글자는 아직 숫자가 아니다.** 그래서 두 가지가 났다.
 *
 *   0 이 안 지워진다   마지막 숫자를 지우면 칸이 빈 글자가 되고 `Number("")` 는 0 이다.
 *                      그 0 이 다시 칸에 그려지니 **칸을 비울 수가 없다.** 500 을 치려면
 *                      먼저 0 을 지워야 하는데 그게 안 된다.
 *   01 이 된다         지울 수가 없으니 0 뒤에 이어 치게 된다. 게다가 친 글자의 숫자값이
 *                      지금 값과 같으면(`"00"` → 0) 리액트가 다시 그릴 것이 없다고 보고
 *                      **친 글자를 그대로 둔다.**
 *
 * 그래서 **치는 동안에는 글자를 그대로 들고 있고**(`NumberField` 의 draft), 숫자로
 * 읽히는 순간에만 값을 확정한다. 칸을 떠나면 확정된 숫자로 돌아온다.
 *
 * 판단을 화면에 두지 않는 이유는 늘 같다 — 여기 있으면 브라우저 없이 테스트가 된다.
 */

/**
 * 이 글자를 칸에 받아 줄 것인가. **빈 글자도 받는다** — 지우는 중이기 때문이다.
 *
 * `"-"` 와 `"7."` 처럼 **아직 숫자가 아닌 중간 상태도 받는다.** 이걸 막으면 음수나
 * 소수점을 칠 방법이 없다. 숫자로 확정하는 것은 `draftValue` 가 따로 본다.
 */
export function acceptsDraft(raw: string, allowNegative = false): boolean {
    return allowNegative ? /^-?\d*\.?\d*$/.test(raw) : /^\d*\.?\d*$/.test(raw);
}

/**
 * 지금 이 글자로 값을 확정할 수 있는가. 못 하면 `null` — **그때는 값을 안 건드린다.**
 *
 * `""`(지우는 중) · `"-"` · `"."` 가 그런 자리다. 여기서 0 을 돌려주면 처음의 그 고장이
 * 그대로 돌아온다 — 지우는 순간 0 이 확정되고, 그 0 이 칸에 그려진다.
 */
export function draftValue(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

/**
 * 앞자리 0 을 떼어 낸다. **「01」은 1 이다.**
 *
 * 칸을 비울 수 있게 되면서 「01」은 대개 안 나지만, 0 이 든 칸의 **끝을 짚고 이어
 * 치면** 여전히 그렇게 된다. 값으로는 1 이라 계산은 맞지만 칸에 적힌 것이 1 이 아니라
 * 「01」인데, **적힌 것과 계산되는 것이 다르면 그 칸은 못 믿는 칸**이다.
 *
 * 0 **뒤에 숫자가 바로 붙을 때만** 뗀다 — `"0"` 은 0 이고 `"0.5"` 는 0.5 다.
 */
export function trimLeadingZero(raw: string): string {
    return raw.replace(/^(-?)0+(\d)/, "$1$2");
}

export function sanitize(raw: Partial<CalcInputs>): CalcInputs {
    const base = { ...DEFAULTS, ...raw };

    // 하한이 상한보다 크면 바로잡는다. 눈금 둘을 따로 끌다 보면 자연스럽게 넘어가는데,
    // 그대로 두면 뽑히는 값이 거꾸로 나오거나 범위가 음수 폭이 된다.
    const lo = clamp(Number(base.rateMin), LIMITS.rate, DEFAULTS.rateMin);
    const hi = clamp(Number(base.rateMax), LIMITS.rate, DEFAULTS.rateMax);

    return {
        ...base,
        rateMode: base.rateMode === "range" ? "range" : "fixed",
        rateMin: Math.min(lo, hi),
        rateMax: Math.max(lo, hi),
        // 씨앗은 화면에 안 보이지만 링크에는 실린다 — 깨진 값이 오면 1로 되돌린다.
        seed: Number.isFinite(Number(base.seed)) ? Math.abs(Math.floor(Number(base.seed))) || 1 : 1,
        initial: clamp(Number(base.initial), LIMITS.initial, DEFAULTS.initial),
        monthly: clamp(Number(base.monthly), LIMITS.monthly, DEFAULTS.monthly),
        rate: clamp(Number(base.rate), LIMITS.rate, DEFAULTS.rate),
        years: Math.round(clamp(Number(base.years), LIMITS.years, DEFAULTS.years)),
        inflation: clamp(Number(base.inflation), LIMITS.inflation, DEFAULTS.inflation),
        method: base.method === "simple" ? "simple" : "compound",
        periods: ([1, 2, 4, 12] as const).includes(base.periods as Periods) ? base.periods : 12,
        tax: Boolean(base.tax),
    };
}

/**
 * 간단 단계가 말없이 정해두는 값.
 *
 * 안 보이는 항목은 계산에서도 빠진다 — 화면에 없는 설정 때문에 숫자가 달라지면
 * 왜 이 값이 나오는지 알 길이 없다. 입력한 값 자체는 지우지 않아서, 상세로
 * 돌아오면 고쳐뒀던 조건이 그대로 살아 있다.
 */
export function maskDetail(inputs: CalcInputs, detail: Detail): CalcInputs {
    if (detail === "detailed") return inputs;
    return { ...inputs, method: "compound", periods: 12, tax: true, inflation: 0 };
}

export const SIMPLE_ASSUMPTIONS = [
    "월 복리",
    `이자소득세 ${TAX_RATE}% 차감`,
    "물가 미반영 (명목 금액)",
];

export interface YearRow {
    year: number;
    principal: number;  // 그 해까지 납입한 원금 누계
    value: number;      // 평가금액
    /** 그 해에 적용된 수익률(%). 범위 모드에서 해마다 달라진다. 0년차에는 없다. */
    rate?: number;
}

/* ── 해마다 다른 수익률 ───────────────────────────────────────

   Math.random 을 쓰지 않는다. 그러면 화면을 새로 그릴 때마다 숫자가 바뀌어
   같은 조건인데 다른 답이 나오고, 링크로 보낸 결과를 상대가 재현할 수 없다.
   씨앗에서 값을 만들어 두면 "이 조건 + 이 씨앗 = 이 결과"가 언제나 성립한다. */

/** mulberry32 — 32비트 씨앗 하나로 도는 작은 난수기. 암호용이 아니다. */
function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * 해마다 적용할 수익률. 고정 모드면 전부 같은 값이다.
 *
 * 소수 한 자리로 끊는다 — 화면에 그 값을 그대로 보여주는데, 표기는 7.3% 인데
 * 계산은 7.2718% 로 돌면 사용자가 손으로 검산했을 때 숫자가 안 맞는다.
 */
export function yearlyRates(inputs: CalcInputs): number[] {
    const { years, rateMode, rate, rateMin, rateMax, seed } = inputs;
    if (rateMode !== "range") return Array.from({ length: years }, () => rate);

    const next = rng(seed);
    const span = rateMax - rateMin;
    return Array.from({ length: years }, () => Math.round((rateMin + next() * span) * 10) / 10);
}

export interface CalcResult {
    rows: YearRow[];
    final: number;
    principal: number;
    profit: number;
    cumret: number;     // 누적 수익률 %
    cagr: number;       // 연평균 %
    real: number;       // 물가 반영 후 오늘의 구매력
    taxPaid: number;
}

/**
 * 월 단위로 걸어간다. 이자는 매월 발생하되 선택한 주기에만 원금에 편입된다 —
 * 주기 중간에 들어온 적립금도 그 달부터 이자를 만들기 때문에, 주기말 잔액에
 * 한 번 곱하는 방식보다 실제 적립식 상품에 가깝다.
 */
export function simulate(inputs: CalcInputs): CalcResult {
    const { initial, monthly, years, method, periods, tax, inflation } = inputs;

    const months = years * 12;
    const step = 12 / periods;              // 편입 간격(개월)
    // 해마다 다른 값일 수 있다. 고정 모드면 전부 같은 값이 들어 있다.
    const rates = yearlyRates(inputs);

    let principal = initial;                // 총 납입 원금
    let balance = initial;                  // 복리 평가금액
    let simpleInterest = 0;                 // 단리 이자 — 원금과 섞이지 않는다
    let pending = 0;                        // 아직 편입되지 않은 이자
    let taxPaid = 0;

    const rows: YearRow[] = [{ year: 0, principal: initial, value: initial }];

    for (let m = 1; m <= months; m++) {
        principal += monthly;
        if (method === "compound") balance += monthly;

        // 그 달이 몇 해째인가로 그 해 수익률을 고른다.
        const r = rates[Math.floor((m - 1) / 12)] / 100;

        // 단리는 원금에만, 복리는 불어난 잔액 전체에 이자가 붙는다.
        pending += (method === "compound" ? balance : principal) * r / 12;

        if (m % step === 0) {
            let credited = pending;
            if (tax && credited > 0) {
                const t = credited * (TAX_RATE / 100);
                taxPaid += t;
                credited -= t;
            }
            if (method === "compound") balance += credited;
            else simpleInterest += credited;
            pending = 0;
        }

        if (m % 12 === 0) {
            rows.push({
                year: m / 12,
                principal,
                value: method === "compound" ? balance : principal + simpleInterest,
                rate: rates[m / 12 - 1],
            });
        }
    }

    const last = rows[rows.length - 1];
    const profit = last.value - last.principal;

    return {
        rows,
        final: last.value,
        principal: last.principal,
        profit,
        cumret: last.principal > 0 ? (last.value / last.principal - 1) * 100 : 0,
        // 원금이 한 번에 들어간 게 아니라 근사값이다 — 라벨을 '연평균' 으로만 적어 과신을 막는다.
        cagr: last.principal > 0 && last.value > 0
            ? (Math.pow(last.value / last.principal, 1 / years) - 1) * 100
            : 0,
        real: last.value / Math.pow(1 + inflation / 100, years),
        taxPaid,
    };
}

/* ── 표기 ────────────────────────────────────────────────────── */

/** 만원 단위 → '1억 2,340만원'. 계산서 전체가 이 규칙 하나를 쓴다. */
export function won(man: number): string {
    const v = Math.round(man);
    const sign = v < 0 ? "−" : "";
    const abs = Math.abs(v);
    const eok = Math.floor(abs / 10000);
    const rest = abs % 10000;

    if (eok > 0) {
        return `${sign}${eok.toLocaleString("ko-KR")}억${rest > 0 ? ` ${rest.toLocaleString("ko-KR")}만` : ""}원`;
    }
    return `${sign}${abs.toLocaleString("ko-KR")}만원`;
}

export const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

export const PERIOD_LABEL: Record<Periods, string> = { 1: "연", 2: "반기", 4: "분기", 12: "월" };

/** 결과가 어떤 조건에서 나온 값인지 한 줄로. 결과 제목 옆에 그대로 붙는다. */
export function basisOf(inputs: CalcInputs): string {
    const how = inputs.method === "compound"
        ? `복리 · ${PERIOD_LABEL[inputs.periods]} 편입`
        : "단리";
    const band = inputs.rateMode === "range"
        ? ` · 해마다 ${inputs.rateMin.toFixed(1)}~${inputs.rateMax.toFixed(1)}% 중 무작위`
        : "";
    return `${how} · ${inputs.tax ? "세후" : "세전"}${band}`;
}

/* ── 주소로 주고받기 ─────────────────────────────────────────── */

export function serialize(inputs: CalcInputs, detail: Detail): string {
    const p = new URLSearchParams();
    (Object.keys(DEFAULTS) as (keyof CalcInputs)[]).forEach((k) => p.set(k, String(inputs[k])));
    // 단계가 곧 계산 조건이다 — 안 실으면 링크를 받은 사람이 다른 숫자를 본다.
    p.set("detail", detail);
    return p.toString();
}

export function parse(params: URLSearchParams): { inputs: CalcInputs; detail: Detail } | null {
    const has = (Object.keys(DEFAULTS) as string[]).some((k) => params.get(k) !== null);
    if (!has) return null;

    const num = (k: keyof CalcInputs) => {
        const v = params.get(k);
        return v === null || v.trim() === "" ? undefined : Number(v);
    };

    return {
        inputs: sanitize({
            initial: num("initial"),
            monthly: num("monthly"),
            rate: num("rate"),
            years: num("years"),
            inflation: num("inflation"),
            method: (params.get("method") as Method) ?? undefined,
            periods: (Number(params.get("periods")) as Periods) || undefined,
            tax: params.get("tax") === null ? undefined : params.get("tax") === "true",
            // 씨앗까지 실어야 링크를 받은 사람이 같은 해에 같은 수익률을 본다.
            rateMode: (params.get("rateMode") as RateMode) ?? undefined,
            rateMin: num("rateMin"),
            rateMax: num("rateMax"),
            seed: num("seed"),
        }),
        detail: params.get("detail") === "detailed" ? "detailed" : "simple",
    };
}
