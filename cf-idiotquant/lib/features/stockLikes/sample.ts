import { apiRequest } from '../apiRequest';
import type { LikedStockItem } from './stockLikesSlice';

export type SampleStock = Pick<LikedStockItem, 'ticker' | 'stock_name' | 'is_us' | 'scan_date' | 'strategies' | 'last_price' | 'per' | 'pbr' | 'ncav_ratio' | 'eps' | 'bps' | 'current_assets' | 'total_liabilities'> & { lstn_stcn: number | null };
export type WatchlistSampleData = { items: SampleStock[]; failed: number };

export const WATCHLIST_SAMPLE_COMPANIES = [
    { ticker: '005930', name: '삼성전자' },
    { ticker: '000660', name: 'SK하이닉스' },
] as const;

// 대표 종목의 최신 스캔만 조회한다. 예시 조회는 사용자 목록과 확인 기준을 변경하지 않는다.
export async function getWatchlistSample(): Promise<WatchlistSampleData> {
    const results = await Promise.all(WATCHLIST_SAMPLE_COMPANIES.map(async ({ ticker }) => {
        const result = await apiRequest(`/scan/daily/ticker/${ticker}?limit=1`);
        if (result.success === false) return { rows: [], failed: true };
        const rows: SampleStock[] = (Array.isArray(result.data) ? result.data : []).flatMap((row: Record<string, unknown>) => {
            if (row.ticker !== ticker || typeof row.scan_date !== 'string' || !/^\d{8}$/.test(row.scan_date.replaceAll('-', ''))) return [];
            const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
            return [{ ticker, stock_name: typeof row.name === 'string' ? row.name : ticker, is_us: 0,
                scan_date: row.scan_date.replaceAll('-', ''), strategies: Array.isArray(row.strategies) ? row.strategies.filter((value): value is string => typeof value === 'string') : [],
                last_price: number(row.last_price), per: number(row.per), pbr: number(row.pbr), ncav_ratio: number(row.ncav_ratio), eps: number(row.eps), bps: number(row.bps),
                current_assets: number(row.current_assets), total_liabilities: number(row.total_liabilities), lstn_stcn: number(row.lstn_stcn) }];
        });
        rows.sort((a, b) => b.scan_date!.localeCompare(a.scan_date!));
        return { rows, failed: false };
    }));
    const items = results.flatMap(result => result.rows.slice(0, 1));
    return { items, failed: results.filter(result => result.failed).length };
}
