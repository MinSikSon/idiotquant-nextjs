import { apiRequest } from '../apiRequest';
import type { LikedStockItem } from './stockLikesSlice';
import { watchSnapshot } from './changes';

export type SampleStock = Pick<LikedStockItem, 'ticker' | 'stock_name' | 'is_us' | 'scan_date' | 'strategies' | 'last_price' | 'per' | 'pbr' | 'ncav_ratio'>;
export type WatchlistSampleData = { items: SampleStock[]; previous: ReturnType<typeof watchSnapshot>; failed: number };

// 대표 종목의 최근 두 스캔만 조회한다. 예시 조회는 사용자 목록과 확인 기준을 변경하지 않는다.
export async function getWatchlistSample(): Promise<WatchlistSampleData> {
    const results = await Promise.all(['005930', '000660'].map(async ticker => {
        const result = await apiRequest(`/scan/daily/ticker/${ticker}?limit=2`);
        if (result.success === false) return { rows: [], failed: true };
        const rows: SampleStock[] = (Array.isArray(result.data) ? result.data : []).flatMap((row: Record<string, unknown>) => {
            if (row.ticker !== ticker || typeof row.scan_date !== 'string' || !/^\d{8}$/.test(row.scan_date.replaceAll('-', ''))) return [];
            const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
            return [{ ticker, stock_name: typeof row.name === 'string' ? row.name : ticker, is_us: 0,
                scan_date: row.scan_date.replaceAll('-', ''), strategies: Array.isArray(row.strategies) ? row.strategies.filter((value): value is string => typeof value === 'string') : [],
                last_price: number(row.last_price), per: number(row.per), pbr: number(row.pbr), ncav_ratio: number(row.ncav_ratio) }];
        });
        rows.sort((a, b) => b.scan_date!.localeCompare(a.scan_date!));
        return { rows, failed: false };
    }));
    const items = results.flatMap(result => result.rows.slice(0, 1));
    const previous = watchSnapshot(results.flatMap(result => {
        const older = result.rows.find(row => row.scan_date! < result.rows[0].scan_date!);
        return older ? [older] : [];
    }));
    return { items, previous, failed: results.filter(result => result.failed).length };
}
