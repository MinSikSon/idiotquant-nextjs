import { apiRequest } from '@/lib/features/apiRequest';
import { getWatchlistSample, WATCHLIST_SAMPLE_COMPANIES } from '@/lib/features/stockLikes/sample';
import { profitableScanStock } from '@/lib/utils/scanFinancials';
import { isValuationEligible } from '@/lib/utils/stockValuationEligibility';
import { PER_VALUATION_MULTIPLE, type scanValuationSummary } from '@/lib/utils/valuationSummary';

export const guestWatchlistGroups = [
    { id: 'kr-large', title: '한국 대형주', country: 'KR' },
    { id: 'kr-value', title: '한국 저평가주', country: 'KR' },
    { id: 'us-large', title: '미국 대형주', country: 'US' },
    { id: 'us-value', title: '미국 저평가주', country: 'US' },
] as const;

export type GuestWatchlistGroup = typeof guestWatchlistGroups[number];
type Scan = Parameters<typeof scanValuationSummary>[0] & { scan_date: string | null };
export type GuestStock = { ticker: string; name: string; scan?: Scan };

function finite(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stockFromScan(row: Record<string, unknown>, country: 'KR' | 'US'): GuestStock[] {
    if (typeof row.ticker !== 'string' || !row.ticker.trim()) return [];
    const date = typeof row.scan_date === 'string' ? row.scan_date.replaceAll('-', '') : '';
    return [{
        ticker: row.ticker,
        name: typeof row.name === 'string' && row.name.trim() ? row.name : row.ticker,
        scan: {
            scan_date: /^\d{8}$/.test(date) ? date : null,
            is_us: country === 'US' ? 1 : 0,
            last_price: finite(row.last_price),
            eps: finite(row.eps),
            bps: finite(row.bps),
            ncav_ratio: finite(row.ncav_ratio),
            net_income: finite(row.net_income),
            current_assets: finite(row.current_assets),
            total_liabilities: finite(row.total_liabilities),
            lstn_stcn: finite(row.lstn_stcn),
        },
    }];
}

export async function loadGuestWatchlist(group: GuestWatchlistGroup): Promise<{ stocks: GuestStock[]; partialFailure: boolean }> {
    if (group.id === 'kr-large') {
        const result = await getWatchlistSample();
        return {
            stocks: WATCHLIST_SAMPLE_COMPANIES.map(company => ({
                ...company,
                scan: result.items.find(item => item.ticker === company.ticker),
            })),
            partialFailure: result.failed > 0,
        };
    }

    if (group.id === 'us-large') {
        const response = await fetch('/api/public/home-stocks?country=US');
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.groups?.large_cap)) throw new Error('대형주 조회 실패');
        return { stocks: result.groups.large_cap.flatMap((row: Record<string, unknown>) => stockFromScan(row, group.country)).slice(0, 2), partialFailure: false };
    }

    const result = await apiRequest(`/scan/daily?country=${group.country}&date=latest&strategy=low_per&limit=20&sort=market_cap&order=desc`);
    if (result.success === false || !Array.isArray(result.data)) throw new Error('저PER 종목 조회 실패');
    const stocks = result.data
        .filter((row: Record<string, any>) => row.per > 0 && row.per < PER_VALUATION_MULTIPLE
            && profitableScanStock({ ...row, country: group.country }) && isValuationEligible(row, group.country))
        .flatMap((row: Record<string, unknown>) => stockFromScan(row, group.country))
        .slice(0, 2);
    return { stocks, partialFailure: false };
}

export async function loadGuestQuote(ticker: string, country: 'KR' | 'US') {
    const params = new URLSearchParams({ country, ticker });
    const response = await fetch(`/api/public/home-quote?${params}`, { credentials: 'omit' });
    if (!response.ok) throw new Error('시세 조회 실패');
    const { price } = await response.json();
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) throw new Error('시세 조회 실패');
    return price;
}
