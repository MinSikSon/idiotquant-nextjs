// 재무제표 막대 뷰의 계산 — React 비의존. 표현은 FinancialBars.tsx 가 맡는다.
//
// 두 가지 축 규칙이 섞여 있어서 헷갈리기 쉬운데, 의도된 것이다.
//  · 추이 막대(BarItem)는 "그 항목의 최댓값"이 100% — 항목끼리 길이를 비교하면 안 된다.
//    매출액(4,180)과 영업이익(310)을 같은 축에 두면 영업이익이 보이지 않기 때문이다.
//  · 구성 스택(StackRow)은 한 줄 합계가 100% — 이쪽은 가로 비교가 목적이다.

export type Tone = "green" | "rose" | "emerald" | "indigo" | "violet" | "teal" | "amber";

export interface BarItem {
    label: string;
    /** 합계 행 — 이름 앞에 색 막대를 붙이고 굵게 */
    isTotal?: boolean;
    /** 최근 → 과거 순. 값이 없으면 null (0 과 구분해야 한다) */
    values: (number | null)[];
    tone: Tone;
    /** 늘면 나쁜 항목(부채·비용) — 증감 배지 색을 뒤집는다 */
    costLike?: boolean;
    /** 좋고 나쁨을 단정할 수 없는 항목(현금흐름) — 배지를 중립으로 */
    neutral?: boolean;
}

export interface BarGroup { labelEn: string; tone: Tone; items: BarItem[] }
export interface StackSeg { label: string; pct: number; tone: Tone; pale?: boolean }
export interface StackRow { title: string; note?: string; segs: StackSeg[]; legend?: { label: string; tone: Tone }[] }

export interface BarModel {
    title: string;
    /** 최근 → 과거 순 라벨 (예: "2025.12", "FY2025") */
    periods: string[];
    groups: BarGroup[];
    stacks: StackRow[];
}

const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

// ── 막대 기하 ────────────────────────────────────────────────────────────
export interface BarGeometry {
    /** 0 선의 가로 위치(%) — 음수가 없으면 0 */
    zeroPct: number;
    bars: { pct: number; negative: boolean; empty: boolean }[];
}

/**
 * 0 선 위치를 데이터가 정한다: 음수최대 ÷ (음수최대 + 양수최대).
 * 손실이 클수록 0 선이 오른쪽으로 밀려 손실 폭이 길이로 드러나고,
 * 값이 전부 음수면 0 선이 오른쪽 끝에 서서 막대가 왼쪽으로만 자란다.
 */
export function barGeometry(values: (number | null)[]): BarGeometry {
    const nums = values.filter((v): v is number => v !== null);
    const maxPos = nums.reduce((m, v) => (v > m ? v : m), 0);
    const maxNeg = nums.reduce((m, v) => (-v > m ? -v : m), 0);
    const span = maxPos + maxNeg;
    if (span <= 0) {
        return { zeroPct: 0, bars: values.map(v => ({ pct: 0, negative: false, empty: v === null })) };
    }
    return {
        zeroPct: (maxNeg / span) * 100,
        bars: values.map(v =>
            v === null
                ? { pct: 0, negative: false, empty: true }
                : { pct: (Math.abs(v) / span) * 100, negative: v < 0, empty: false }
        ),
    };
}

// ── 기간 증감 ────────────────────────────────────────────────────────────
export interface PeriodDelta { pct: number | null; turnedLoss: boolean; spanCount: number }

/** values 는 최근 → 과거 순. 가장 오래된 값 대비 최근 값의 변화. */
export function periodDelta(values: (number | null)[]): PeriodDelta {
    const idxLatest = values.findIndex(v => v !== null);
    let idxOldest = -1;
    for (let i = values.length - 1; i >= 0; i--) { if (values[i] !== null) { idxOldest = i; break; } }
    if (idxLatest < 0 || idxOldest <= idxLatest) return { pct: null, turnedLoss: false, spanCount: 0 };

    const latest = values[idxLatest] as number;
    const oldest = values[idxOldest] as number;
    const spanCount = idxOldest - idxLatest + 1;
    if (latest < 0 && oldest >= 0) return { pct: null, turnedLoss: true, spanCount };
    if (oldest === 0) return { pct: null, turnedLoss: false, spanCount };
    return { pct: ((latest - oldest) / Math.abs(oldest)) * 100, turnedLoss: false, spanCount };
}

// ── 값 표기 ──────────────────────────────────────────────────────────────
/** 국내: 원본이 억 원 단위 */
export const fmtEok = (v: number | null): string =>
    v === null ? "—" : `${Math.round(v).toLocaleString()}`;

/** 미국: 원본이 USD */
export function fmtUsd(v: number | null): string {
    if (v === null) return "—";
    const abs = Math.abs(v);
    const sign = v < 0 ? "−" : "";
    if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}M`;
    return `${sign}${Math.round(abs).toLocaleString()}`;
}

/**
 * 한 블록 안에서는 단위를 하나로 고정한다. 값마다 B/M 을 갈아 쓰면
 * (−1.85B 옆에 −900M) 길이는 비슷한데 숫자는 두 배 넘게 차이 나 보인다.
 */
export function usdBlockFormatter(values: (number | null)[]): (v: number | null) => string {
    const max = values.reduce<number>((m, v) => (v === null ? m : Math.max(m, Math.abs(v))), 0);
    const [div, suffix] = max >= 1e12 ? [1e12, "T"] : max >= 1e9 ? [1e9, "B"] : max >= 1e6 ? [1e6, "M"] : [1, ""];
    return v => {
        if (v === null) return "—";
        const scaled = Math.abs(v) / div;
        return `${v < 0 ? "−" : ""}${div === 1 ? Math.round(scaled).toLocaleString() : scaled.toFixed(2)}${suffix}`;
    };
}

// ── 구성 스택 ────────────────────────────────────────────────────────────
/** 합계가 0 이하이거나 조각이 비면 스택을 만들지 않는다(빈 막대는 오해를 부른다) */
function makeStack(
    title: string,
    total: number | null,
    parts: { label: string; value: number | null; tone: Tone; pale?: boolean }[],
    legend?: { label: string; tone: Tone }[],
    note?: string,
): StackRow | null {
    if (total === null || total <= 0) return null;
    const segs: StackSeg[] = [];
    for (const p of parts) {
        if (p.value === null || p.value < 0) return null;
        segs.push({ label: p.label, pct: (p.value / total) * 100, tone: p.tone, pale: p.pale });
    }
    return { title, note, segs, legend };
}

// ── 국내 (KIS) ───────────────────────────────────────────────────────────
const KR_BS_GROUPS: { labelEn: string; tone: Tone; rows: [string, string, boolean?][] }[] = [
    { labelEn: "자산 ASSETS", tone: "green", rows: [["유동자산", "cras"], ["고정자산", "fxas"], ["자산총계", "total_aset", true]] },
    { labelEn: "부채 LIABILITIES", tone: "rose", rows: [["유동부채", "flow_lblt"], ["고정부채", "fix_lblt"], ["부채총계", "total_lblt", true]] },
    { labelEn: "자본 EQUITY", tone: "emerald", rows: [["자본금", "cpfn"], ["이익잉여금", "prfi_surp"], ["자본총계", "total_cptl", true]] },
];

const KR_IS_GROUPS: { labelEn: string; tone: Tone; rows: [string, string, boolean?][] }[] = [
    { labelEn: "수익 REVENUE", tone: "indigo", rows: [["매출액", "sale_account", true], ["매출원가", "sale_cost"], ["매출총이익", "sale_totl_prfi"]] },
    { labelEn: "영업 OPERATING", tone: "violet", rows: [["판관비", "sell_mang"], ["영업이익", "bsop_prti", true]] },
    { labelEn: "순이익 NET INCOME", tone: "teal", rows: [["당기순이익", "thtr_ntin", true]] },
];

const KR_COST_KEYS = new Set(["flow_lblt", "fix_lblt", "total_lblt", "sale_cost", "sell_mang"]);

const krPeriodLabel = (raw: unknown): string =>
    String(raw ?? "").replace(/^(\d{4})(\d{2})$/, "$1.$2") || "—";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function krValues(periods: any[], key: string): (number | null)[] {
    return periods.map(p => num(p?.[key]));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildKrBars(kiBS: any, kiIS: any): { bs: BarModel | null; is: BarModel | null } {
    const bsRows: any[] = (kiBS?.output ?? []).slice(0, 5);
    const isRows: any[] = (kiIS?.output ?? []).slice(0, 5);

    const toGroups = (defs: typeof KR_BS_GROUPS, rows: any[]): BarGroup[] =>
        defs.map(g => ({
            labelEn: g.labelEn,
            tone: g.tone,
            items: g.rows.map(([label, key, isTotal]) => ({
                label,
                isTotal,
                tone: g.tone,
                costLike: KR_COST_KEYS.has(key),
                values: krValues(rows, key),
            })),
        }));

    const bs: BarModel | null = bsRows.length ? (() => {
        const at = (key: string) => num(bsRows[0]?.[key]);
        const asset = at("total_aset");
        const stacks = [
            makeStack("자산은 무엇으로 이루어져 있나", asset, [
                { label: "유동자산", value: at("cras"), tone: "green" },
                { label: "고정자산", value: at("fxas"), tone: "green", pale: true },
            ], undefined, asset === null ? undefined : `총 ${fmtEok(asset)}억`),
            makeStack("그 자산은 누구 돈인가", asset, [
                { label: "부채", value: at("total_lblt"), tone: "rose" },
                { label: "자본", value: at("total_cptl"), tone: "emerald" },
            ], [
                { label: `갚아야 할 돈 ${fmtEok(at("total_lblt"))}억`, tone: "rose" },
                { label: `주주 몫 ${fmtEok(at("total_cptl"))}억`, tone: "emerald" },
            ]),
        ].filter((s): s is StackRow => s !== null);
        return { title: "재무상태표", periods: bsRows.map(r => krPeriodLabel(r?.stac_yymm)), groups: toGroups(KR_BS_GROUPS, bsRows), stacks };
    })() : null;

    const is: BarModel | null = isRows.length ? (() => {
        const at = (key: string) => num(isRows[0]?.[key]);
        const sale = at("sale_account");
        const op = at("bsop_prti");
        const stacks = [
            makeStack("매출 100원이 어디로 갔나", sale, [
                { label: "매출원가", value: at("sale_cost"), tone: "indigo", pale: true },
                { label: "판관비", value: at("sell_mang"), tone: "violet", pale: true },
                { label: "영업이익", value: op, tone: "violet" },
            ], op !== null && sale ? [{ label: `영업이익 ${fmtEok(op)}억 · 영업이익률 ${((op / sale) * 100).toFixed(1)}%`, tone: "violet" }] : undefined,
                sale === null ? undefined : `매출액 ${fmtEok(sale)}억`),
        ].filter((s): s is StackRow => s !== null);
        return { title: "손익계산서", periods: isRows.map(r => krPeriodLabel(r?.stac_yymm)), groups: toGroups(KR_IS_GROUPS, isRows), stacks };
    })() : null;

    return { bs, is };
}

// ── 미국 (Finnhub) ───────────────────────────────────────────────────────
const US_CONCEPTS = {
    cash: ["us-gaap_CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalentsAtCarryingValue"],
    ar: ["us-gaap_AccountsReceivableNetCurrent", "AccountsReceivableNetCurrent"],
    inventory: ["us-gaap_InventoryNet", "InventoryNet"],
    currentAssets: ["us-gaap_AssetsCurrent", "AssetsCurrent"],
    assets: ["us-gaap_Assets", "Assets"],
    liabilities: ["us-gaap_Liabilities", "Liabilities", "us-gaap_LiabilitiesAndStockholdersEquity"],
    equity: ["us-gaap_StockholdersEquity", "StockholdersEquity", "us-gaap_StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    revenue: [
        "us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "us-gaap_Revenues", "Revenues", "us-gaap_SalesRevenueNet", "SalesRevenueNet",
    ],
    operating: ["us-gaap_OperatingIncomeLoss", "OperatingIncomeLoss"],
    netIncome: ["us-gaap_NetIncomeLoss", "NetIncomeLoss"],
    cfo: ["us-gaap_NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivities"],
    cfi: ["us-gaap_NetCashProvidedByUsedInInvestingActivities", "NetCashProvidedByUsedInInvestingActivities"],
    cff: ["us-gaap_NetCashProvidedByUsedInFinancingActivities", "NetCashProvidedByUsedInFinancingActivities"],
} as const;

type UsKey = keyof typeof US_CONCEPTS;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function usColumns(reports: any[]): { label: string; map: Map<string, number | null> }[] {
    return (Array.isArray(reports) ? reports : []).slice(0, 5).map(r => {
        const dateStr = String(r?.endDate || r?.filedDate || r?.acceptedDate || "").split(" ")[0];
        const map = new Map<string, number | null>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const merge = (arr: any[] = []) => arr.forEach(item => {
            const concept = item?.concept || item?.label || "";
            if (concept) map.set(concept, num(item?.value ?? item?.val ?? item?.amount));
        });
        merge(r?.report?.bs);
        merge(r?.report?.ic);
        merge(r?.report?.cf);
        return { label: dateStr ? dateStr.slice(0, 4) : "—", map };
    });
}

const pick = (map: Map<string, number | null>, key: UsKey): number | null => {
    for (const c of US_CONCEPTS[key]) {
        const v = map.get(c);
        if (v !== undefined) return v;
    }
    return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildUsBars(reports: any[]): { bs: BarModel | null; is: BarModel | null } {
    const cols = usColumns(reports);
    if (!cols.length) return { bs: null, is: null };

    const series = (key: UsKey) => cols.map(c => pick(c.map, key));
    const periods = cols.map(c => `FY${c.label}`);
    const latest = (key: UsKey) => pick(cols[0].map, key);

    const assets = latest("assets");
    const currentAssets = latest("currentAssets");
    const bsStacks = [
        makeStack("자산은 무엇으로 이루어져 있나", assets, [
            { label: "유동자산", value: currentAssets, tone: "green" },
            { label: "비유동", value: assets !== null && currentAssets !== null ? assets - currentAssets : null, tone: "green", pale: true },
        ], undefined, assets === null ? undefined : `총 ${fmtUsd(assets)}`),
        makeStack("그 자산은 누구 돈인가", assets, [
            { label: "부채", value: latest("liabilities"), tone: "rose" },
            { label: "자본", value: latest("equity"), tone: "emerald" },
        ], [
            { label: `갚아야 할 돈 ${fmtUsd(latest("liabilities"))}`, tone: "rose" },
            { label: `주주 몫 ${fmtUsd(latest("equity"))}`, tone: "emerald" },
        ]),
    ].filter((s): s is StackRow => s !== null);

    const bs: BarModel = {
        title: "재무상태표",
        periods,
        stacks: bsStacks,
        groups: [
            {
                labelEn: "자산 ASSETS", tone: "green", items: [
                    { label: "현금성 자산", tone: "green", values: series("cash") },
                    { label: "매출채권", tone: "green", values: series("ar") },
                    { label: "재고자산", tone: "green", values: series("inventory") },
                    { label: "유동자산 합계", tone: "green", isTotal: true, values: series("currentAssets") },
                    { label: "자산 총계", tone: "green", isTotal: true, values: series("assets") },
                ],
            },
            {
                labelEn: "부채 및 자본 LIAB & EQUITY", tone: "rose", items: [
                    { label: "부채 총계", tone: "rose", isTotal: true, costLike: true, values: series("liabilities") },
                    { label: "자본 총계", tone: "emerald", isTotal: true, values: series("equity") },
                ],
            },
        ],
    };

    const revenue = latest("revenue");
    const operating = latest("operating");
    const isStacks = [
        makeStack("매출 $100 이 어디로 갔나", revenue, [
            { label: "비용", value: revenue !== null && operating !== null ? revenue - operating : null, tone: "indigo", pale: true },
            { label: "영업이익", value: operating, tone: "violet" },
        ], operating !== null && revenue ? [{ label: `영업이익 ${fmtUsd(operating)} · 영업이익률 ${((operating / revenue) * 100).toFixed(1)}%`, tone: "violet" }] : undefined,
            revenue === null ? undefined : `매출액 ${fmtUsd(revenue)}`),
    ].filter((s): s is StackRow => s !== null);

    const is: BarModel = {
        title: "손익계산서 · 현금흐름",
        periods,
        stacks: isStacks,
        groups: [
            {
                labelEn: "수익 · 이익 REVENUE & PROFIT", tone: "indigo", items: [
                    { label: "매출액", tone: "indigo", isTotal: true, values: series("revenue") },
                    { label: "영업이익", tone: "violet", isTotal: true, values: series("operating") },
                    { label: "순이익", tone: "teal", isTotal: true, values: series("netIncome") },
                ],
            },
            {
                labelEn: "현금흐름 CASH FLOW", tone: "amber", items: [
                    { label: "영업활동", tone: "amber", values: series("cfo") },
                    // 유출이 늘어난 게 좋은지 나쁜지는 단정할 수 없다(설비투자일 수도, 자사주 매입일 수도)
                    { label: "투자활동", tone: "amber", neutral: true, values: series("cfi") },
                    { label: "재무활동", tone: "amber", neutral: true, values: series("cff") },
                ],
            },
        ],
    };

    return { bs, is };
}
