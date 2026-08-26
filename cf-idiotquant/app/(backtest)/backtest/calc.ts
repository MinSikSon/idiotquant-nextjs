/**
 * 백테스트의 계산부 — 수익률과 포트폴리오 집계.
 *
 * page.tsx 안에 있던 것을 옮겨 왔다. 여기가 틀리면 사용자는 "잘못된 백테스트 결과"를
 * 사실로 믿는다 — 화면은 멀쩡히 그려지므로 아무도 되짚어보지 않는다. 특히 calcReturn 은
 * 병합(역분할)을 시가총액 ÷ 상장주식수로 되돌리는 자리라, 한 번 어긋나면 옛 종목의
 * 수익률이 통째로 거짓이 된다.
 *
 * 동작은 한 줄도 바꾸지 않았다(옮기기만 했다). test/backtest-calc.test.ts 가 건다.
 */

import { safeNum } from "@/lib/utils/numbers";
import { STRATEGY_PRESETS_CLIENT } from "@/lib/constants/strategies";

export interface PortfolioPoint {
    date: string;
    portfolio_pct: number;
    covered: number;
    win_count: number;
}

export interface PortfolioSummary {
    current_pct: number;
    days: number;
    top_gainer: { ticker: string; name: string; pct: number } | null;
    top_loser:  { ticker: string; name: string; pct: number } | null;
}

export interface TickerSeries {
    ticker: string;
    name: string;
    data: { date: string; pct: number }[];
    final_pct?: number;
}

export interface PortfolioResult {
    start_date: string;
    strategy: string;
    candidate_count: number;
    candidates: { ticker: string; name: string; start_price: number; start_market_cap?: number }[];
    time_series: PortfolioPoint[];
    ticker_series?: TickerSeries[];
    summary: PortfolioSummary;
    note?: string;
}

export interface DailyItem {
    ticker: string;
    name: string;
    scan_date: string;
    ncav_ratio: number;
    last_price: number;
    market_cap?: number;
    lstn_stcn?: number;
    per: number;
    pbr: number;
    eps: number;
    bps: number;
    strategies: string[];
}

export function parseStrategies(strategies: unknown): string[] {
    if (Array.isArray(strategies)) return strategies as string[];
    try { return JSON.parse((strategies as string) ?? '[]'); } catch { return []; }
}

export function resolveAllStrategies(item: DailyItem): string[] {
    const base = new Set<string>(item.strategies ?? []);
    for (const preset of STRATEGY_PRESETS_CLIENT) {
        if (preset.clientFilter && preset.clientFilter(item)) base.add(preset.id);
    }
    return Array.from(base);
}

export const DAY_KOR = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function getDayKor(yyyymmdd: string): string {
    const d = new Date(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8));
    return DAY_KOR[d.getDay()];
}

export function fmtDate(yyyymmdd: string): string {
    return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}(${getDayKor(yyyymmdd)})`;
}

// 날짜 간격이 있는 데이터를 선형 보간으로 채움 (차트 연속성 확보)
export function fillDateGaps<T extends { date: string }>(data: T[], numericKeys: string[]): (T & { estimated?: boolean })[] {
    if (data.length <= 1) return data;
    const parseD = (s: string) => new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
    const fmtD = (d: Date) =>
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const out: (T & { estimated?: boolean })[] = [];
    for (let i = 0; i < data.length - 1; i++) {
        out.push(data[i]);
        const d0 = parseD(data[i].date), d1 = parseD(data[i + 1].date);
        const days = Math.round((d1.getTime() - d0.getTime()) / 86400000);
        if (days > 1) {
            for (let j = 1; j < days; j++) {
                const t = j / days;
                const nd = new Date(d0); nd.setDate(nd.getDate() + j);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pt: any = { ...data[i], date: fmtD(nd), estimated: true };
                for (const k of numericKeys) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pt[k] = safeNum((data[i] as any)[k]) + (safeNum((data[i + 1] as any)[k]) - safeNum((data[i] as any)[k])) * t;
                }
                out.push(pt);
            }
        }
    }
    out.push(data[data.length - 1]);
    return out;
}

// 병합(역분할) 보정 수익률: entry_market_cap / current_lstn_stcn 으로 기준가 재계산
// splitAdjusted=false 이면 기존 last_price 기반 단순 수익률 반환
export function calcReturn(
    entryPrice: number,
    entryMarketCap: number | undefined,
    ticker: string,
    curPrice: number,
    splitAdjusted: boolean,
    lstnMap: Map<string, number>
): number {
    // market_cap은 억원 단위(KIS hts_avls), last_price는 원 단위이므로 ×100_000_000 변환 필요
    if (splitAdjusted && entryMarketCap && entryMarketCap > 0) {
        const curLstn = lstnMap.get(ticker);
        if (curLstn && curLstn > 0) {
            const adjEntry = entryMarketCap * 100_000_000 / curLstn;
            return (curPrice / adjEntry - 1) * 100;
        }
    }
    return (curPrice / entryPrice - 1) * 100;
}

// 실측 시계열(>=2)이 있는 결과에 공통 필터(filteredTickers)를 적용해 포트폴리오 지표를 재계산.
// 백엔드가 전략·전체 후보로 계산한 결과를 클라이언트 필터 기준으로 다시 평균낸다.
export function recomputePortfolioWithFilter(
    result: PortfolioResult,
    filteredTickers: Set<string>,
): PortfolioResult | null {
    // 필터 미적용(모든 후보 포함) → 백엔드 계산과 동일하므로 원본 그대로 반환
    if (result.candidates.every(c => filteredTickers.has(c.ticker))) return result;

    const candidates = result.candidates.filter(c => filteredTickers.has(c.ticker));
    const series = (result.ticker_series ?? []).filter(ts => filteredTickers.has(ts.ticker));

    // 필터가 전체를 제외 → null 반환해 페이지 빈 상태 메시지 노출
    if (series.length === 0) return null;

    // 날짜별로 필터 종목들의 pct 평균 → time_series 재구성 (백엔드 fill-forward 시계열과 동일 의미)
    const dateAgg = new Map<string, { sum: number; n: number; win: number }>();
    for (const ts of series) {
        for (const pt of ts.data) {
            const a = dateAgg.get(pt.date) ?? { sum: 0, n: 0, win: 0 };
            a.sum += pt.pct;
            a.n += 1;
            if (pt.pct >= 0) a.win += 1;
            dateAgg.set(pt.date, a);
        }
    }
    const timeSeries: PortfolioPoint[] = [...dateAgg.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, a]) => ({
            date,
            portfolio_pct: Math.round((a.sum / a.n) * 100) / 100,
            covered: a.n,
            win_count: a.win,
        }));

    const sorted = [...series].sort((a, b) => (b.final_pct ?? 0) - (a.final_pct ?? 0));
    const top = sorted[0];
    const bot = sorted.at(-1);
    const summary: PortfolioSummary = {
        current_pct: timeSeries.at(-1)?.portfolio_pct ?? 0,
        days: result.summary?.days ?? 0,
        top_gainer: top ? { ticker: top.ticker, name: top.name, pct: Math.round((top.final_pct ?? 0) * 100) / 100 } : null,
        top_loser:  bot ? { ticker: bot.ticker, name: bot.name, pct: Math.round((bot.final_pct ?? 0) * 100) / 100 } : null,
    };

    return {
        ...result,
        candidate_count: candidates.length,
        candidates,
        ticker_series: series,
        time_series: timeSeries,
        summary,
    };
}

// 시계열 데이터 부족 시 currentPriceMap 으로 보간하여 항상 PortfolioResult 를 반환
export function augmentPortfolioResult(
    result: PortfolioResult | null,
    fallbackCandidates: { ticker: string; name: string; start_price: number; start_market_cap?: number }[],
    currentPriceMap: Map<string, number>,
    currentLstnMap: Map<string, number>,
    splitAdjusted: boolean,
    filteredTickers: Set<string>,
    selectedDate: string,
    latestScanDate: string | null,
): PortfolioResult | null {
    // 이미 충분한 시계열 → 공통 필터(filteredTickers)를 적용해 재계산 후 반환
    if ((result?.time_series?.length ?? 0) >= 2) return recomputePortfolioWithFilter(result!, filteredTickers);

    // 유효 후보 목록 결정 (portfolioResult.candidates 우선, 없으면 filteredList 기반 fallback)
    const candidates: { ticker: string; name: string; start_price: number; start_market_cap?: number }[] =
        (result?.candidates?.length ?? 0) > 0
            ? result!.candidates.filter(c => filteredTickers.has(c.ticker))
            : fallbackCandidates;
    if (!candidates.length) return result;

    // currentPriceMap 으로 종목별 현재 수익률 계산
    const tickerReturns: { ticker: string; name: string; pct: number }[] = [];
    for (const c of candidates) {
        const cur = currentPriceMap.get(c.ticker);
        if (!cur || c.start_price <= 0) continue;
        const raw = calcReturn(c.start_price, c.start_market_cap, c.ticker, cur, splitAdjusted, currentLstnMap);
        tickerReturns.push({ ticker: c.ticker, name: c.name, pct: Math.round(raw * 100) / 100 });
    }
    if (!tickerReturns.length) return result;

    const avgPct   = Math.round(tickerReturns.reduce((s, t) => s + t.pct, 0) / tickerReturns.length * 100) / 100;
    const winCount = tickerReturns.filter(t => t.pct >= 0).length;
    const startDate = result?.start_date ?? selectedDate;
    const endDate   = latestScanDate && latestScanDate > startDate ? latestScanDate : selectedDate;

    const parseD = (s: string) => new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
    const days = Math.max(0, Math.round((parseD(endDate).getTime() - parseD(startDate).getTime()) / 86400000));

    const existing = result?.time_series ?? [];

    // 시계열 조립: 기존 포인트 유지 + 현재가 end-point 추가
    const synthesized: PortfolioPoint[] = existing.length === 0
        ? [{ date: startDate, portfolio_pct: 0, covered: tickerReturns.length, win_count: 0 }]
        : [...existing];

    if (synthesized.at(-1)!.date < endDate) {
        synthesized.push({ date: endDate, portfolio_pct: avgPct, covered: tickerReturns.length, win_count: winCount });
    } else {
        // 같은 날짜 → 마지막 포인트 현재값으로 갱신
        synthesized[synthesized.length - 1] = {
            ...synthesized.at(-1)!,
            portfolio_pct: avgPct,
            covered: tickerReturns.length,
            win_count: winCount,
        };
    }
    // 최소 2포인트 보장 (startDate === endDate 엣지케이스)
    if (synthesized.length < 2) {
        synthesized.push({ date: endDate, portfolio_pct: avgPct, covered: tickerReturns.length, win_count: winCount });
    }

    const sorted = [...tickerReturns].sort((a, b) => b.pct - a.pct);

    return {
        start_date:      startDate,
        strategy:        result?.strategy ?? 'ncav',
        candidate_count: candidates.length,
        candidates,
        time_series: synthesized,
        ticker_series: tickerReturns.map(t => ({
            ticker:    t.ticker,
            name:      t.name,
            data: [
                ...(existing.length === 0 ? [{ date: startDate, pct: 0 }] : []),
                { date: endDate, pct: t.pct },
            ],
            final_pct: t.pct,
        })),
        summary: {
            current_pct: avgPct,
            days,
            top_gainer: sorted[0]
                ? { ticker: sorted[0].ticker,     name: sorted[0].name,     pct: sorted[0].pct }
                : null,
            top_loser: sorted.at(-1)
                ? { ticker: sorted.at(-1)!.ticker, name: sorted.at(-1)!.name, pct: sorted.at(-1)!.pct }
                : null,
        },
        note: '현재가 기준 보간 데이터 포함',
    };
}
