/**
 * 스크리너의 판단부 — 어떤 종목을 남기고 어떤 순서로 세울 것인가.
 *
 * page.tsx 안에 있던 것을 옮겨 왔다. 화면 밖으로 꺼낸 이유는 줄 수를 줄이려는 게
 * 아니라, 여기가 이 서비스의 값어치가 걸린 자리이기 때문이다 — 조건 하나가 어긋나면
 * 사용자는 "잘못된 종목 목록"을 보게 되는데, 화면 안에 있으면 확인할 방법이 없다.
 * 동작은 한 줄도 바꾸지 않았다(옮기기만 했다). 이제 test/screener-filters.test.ts 가 건다.
 */

import { STRATEGY_PRESETS_CLIENT as STRATEGY_PRESETS } from "@/lib/constants/strategies";
import { trAmtEok, isHalted, isManaged, isDelisting, w52Position } from "@/lib/utils/stockRisk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const safeNum = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };

/** 삼성전자우·현대차2우B 같은 우선주. 본주와 같은 회사가 목록에 두 번 서는 것을 막는다. */
export const isPreferredStock = (name: string): boolean => /\d*우[A-C]?$/.test((name ?? "").trim());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function marketOf(i: any): string {
    const raw = String(i?.market ?? "").trim().toUpperCase();
    if (!raw) return "";
    if (raw.includes("KOSDAQ") || raw.includes("코스닥")) return "KOSDAQ";
    if (raw.includes("KONEX") || raw.includes("코넥스")) return "KONEX";
    if (raw.includes("KOSPI") || raw.includes("코스피") || raw.includes("유가")) return "KOSPI";
    return raw;
}

// 업종명 — 워커는 sector 로 저장한다(inquire-price 의 bstp_kor_isnm). 예전 응답 호환으로 industry 도 본다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sectorOf = (i: any): string => String(i?.sector ?? i?.industry ?? "").trim();

/** ROE = EPS ÷ BPS (지배주주 기준). bps 가 없으면 0 — 필터에서는 minRoe > 0 이라 자동으로 걸러진다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const roeOf = (i: any) => safeNum(i.bps) > 0 ? (safeNum(i.eps) / safeNum(i.bps)) * 100 : 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const grahamOk = (i: any) => safeNum(i.per) > 0 && safeNum(i.pbr) > 0 && safeNum(i.per) * safeNum(i.pbr) < 22.5;

// 백엔드 strategies + 프론트엔드 clientFilter 병합 (백엔드 미분류 종목도 표시)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveStrategies(item: Record<string, any>): string[] {
    const base = new Set<string>(item.strategies ?? []);
    for (const preset of STRATEGY_PRESETS) {
        if (preset.clientFilter && preset.clientFilter(item)) base.add(preset.id);
    }
    return Array.from(base);
}

// 대표 전략 — 한 종목이 여러 전략에 걸리므로 비율 띠를 그리려면 하나로 정해야 한다.
// 규칙은 전략 묶기(buildGroups)·요약 산점도의 점 색과 같아야 한다: 프리셋 순서상 첫 번째,
// 없으면 백엔드가 붙여 준 첫 전략. 뒤쪽 폴백을 빼먹으면 어느 프리셋에도 안 걸린 종목이
// 띠에서만 사라져 합계가 전체보다 적어지고, 점 색의 범례로도 성립하지 않는다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const primaryStrategyOf = (i: any): string =>
    STRATEGY_PRESETS.find(p => p.clientFilter?.(i))?.id ?? i?.strategies?.[0] ?? "";

/* ── 필터 ─────────────────────────────────────────────────────── */

export interface ScreenerFilters {
    strategies: Set<string>;
    mode: "OR" | "AND";
    q: string;
    excludeHoldings: boolean;
    excludeDeficit: boolean;
    excludePreferred: boolean;
    excludeHalted: boolean;
    excludeManaged: boolean;
    excludeDelisting: boolean;
    sectors: Set<string>;
    markets: Set<string>;
    maxW52Pos: number;
    minTrAmt: number;
    minMarketCap: number;
    maxPbr: number;
    maxPer: number;
    minRoe: number;
    minNcav: number;
}

// 필터 그룹 — 서랍 카드 순서와 1:1. 누적 카운트(→N)는 이 순서대로 쌓아 계산한다.
export type FilterGroupKey = "mktcap" | "pbr" | "per" | "ncav" | "profit" | "market" | "sector" | "w52" | "liquidity" | "exclude";
export const FILTER_GROUP_ORDER: FilterGroupKey[] = ["mktcap", "pbr", "per", "ncav", "profit", "market", "sector", "w52", "liquidity", "exclude"];
export const GROUP_DEFAULTS: Record<FilterGroupKey, Partial<ScreenerFilters>> = {
    mktcap:  { minMarketCap: 0 },
    pbr:     { maxPbr: 0 },
    per:     { maxPer: 0 },
    ncav:    { minNcav: 0 },
    profit:  { minRoe: 0, excludeDeficit: false },
    market:    { markets: new Set<string>() },
    sector:    { sectors: new Set<string>() },
    w52:       { maxW52Pos: 0 },
    liquidity: { minTrAmt: 0 },
    exclude:   { excludeHoldings: false, excludePreferred: false, excludeHalted: false, excludeManaged: false, excludeDelisting: false },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters(list: Record<string, any>[], f: ScreenerFilters): Record<string, any>[] {
    let out = list;

    if (f.strategies.size > 0) {
        const check = f.mode === "AND" ? "every" : "some";
        const ids = Array.from(f.strategies);
        out = out.filter(item =>
            ids[check](stratId => {
                const preset = STRATEGY_PRESETS.find(p => p.id === stratId);
                return preset?.clientFilter ? preset.clientFilter(item) : resolveStrategies(item).includes(stratId);
            })
        );
    }

    if (f.q) {
        const q = f.q.toLowerCase();
        out = out.filter(item =>
            (item.ticker ?? "").toLowerCase().includes(q) ||
            (item.name ?? "").toLowerCase().includes(q)
        );
    }

    if (f.excludeHoldings)  out = out.filter(item => !item.name?.includes("홀딩스"));
    if (f.excludeDeficit)   out = out.filter(item => safeNum(item.eps) > 0);
    if (f.excludePreferred) out = out.filter(item => !isPreferredStock(item.name ?? ""));
    if (f.minMarketCap > 0) out = out.filter(item => safeNum(item.market_cap) >= f.minMarketCap);
    if (f.maxPbr > 0)  out = out.filter(item => safeNum(item.pbr) > 0 && safeNum(item.pbr) <= f.maxPbr);
    if (f.maxPer > 0)  out = out.filter(item => safeNum(item.per) > 0 && safeNum(item.per) <= f.maxPer);
    if (f.minNcav > 0) out = out.filter(item => safeNum(item.ncav_ratio) >= f.minNcav);
    if (f.minRoe > 0)  out = out.filter(item => roeOf(item) >= f.minRoe);

    if (f.sectors.size > 0) out = out.filter(item => f.sectors.has(sectorOf(item)));
    if (f.markets.size > 0) out = out.filter(item => f.markets.has(marketOf(item)));
    // 값이 아직 없는 종목은 통과시킨다. 배포 직후처럼 일부만 채워진 구간에서 "모르는 것"을
    // "조건 위반"으로 취급하면 목록이 통째로 비어 고장난 것처럼 보인다.
    // (아래 두 서랍 카드는 애초에 데이터가 있을 때만 뜨므로 정상 상태에서는 이 경로가 드물다.)
    if (f.minTrAmt > 0) out = out.filter(item => { const v = trAmtEok(item); return v === null || v >= f.minTrAmt; });
    if (f.maxW52Pos > 0) out = out.filter(item => { const v = w52Position(item); return v === null || v <= f.maxW52Pos; });
    if (f.excludeHalted) out = out.filter(item => !isHalted(item));
    if (f.excludeManaged) out = out.filter(item => !isManaged(item));
    if (f.excludeDelisting) out = out.filter(item => !isDelisting(item));

    return out;
}

/* ── 정렬 ─────────────────────────────────────────────────────── */

export type DiscoverySortKey = "ticker" | "ncav_ratio" | "per" | "pbr" | "roe" | "market_cap" | "last_price";
export type SortOrder = "asc" | "desc";

export const DEFAULT_SORT: DiscoverySortKey = "ncav_ratio";
export const VALID_SORT_KEYS: DiscoverySortKey[] = ["ticker", "ncav_ratio", "per", "pbr", "roe", "market_cap", "last_price"];

/**
 * 받은 배열을 그 자리에서 정렬한다(부르는 쪽이 이미 사본을 넘긴다).
 *
 * ROE 만 -Infinity 를 쓴다: bps 가 없는 종목은 값을 모르는 것이지 0 이 아니라서,
 * 0 으로 두면 적자 기업들 사이에 섞여 올라온다. 아래로 가라앉히는 편이 맞다.
 * (필터의 roeOf 는 0 을 쓴다 — 거기서는 minRoe > 0 조건이 어차피 걸러낸다.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortList(list: Record<string, any>[], sortKey: DiscoverySortKey, sortOrder: SortOrder) {
    list.sort((a, b) => {
        if (sortKey === "ticker") {
            return sortOrder === "asc"
                ? (a.ticker ?? "").localeCompare(b.ticker ?? "")
                : (b.ticker ?? "").localeCompare(a.ticker ?? "");
        }
        if (sortKey === "roe") {
            const ra = safeNum(a.bps) > 0 ? (safeNum(a.eps) / safeNum(a.bps)) * 100 : -Infinity;
            const rb = safeNum(b.bps) > 0 ? (safeNum(b.eps) / safeNum(b.bps)) * 100 : -Infinity;
            return sortOrder === "asc" ? ra - rb : rb - ra;
        }
        const va = safeNum(a[sortKey]);
        const vb = safeNum(b[sortKey]);
        return sortOrder === "asc" ? va - vb : vb - va;
    });
    return list;
}
