import { createPublicRequestCache } from '@/lib/utils/publicRequestCache';

export const runtime = 'edge';

const ttlSeconds = 45;
const quotes = createPublicRequestCache<{ price: number; expiresAt: number }>(ttlSeconds * 1000, 64);
const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const ticker = searchParams.get('ticker') ?? '';
    if ((country !== 'KR' && country !== 'US') ||
        !(country === 'KR' ? /^\d{6}$/ : /^[A-Z][A-Z0-9.-]{0,9}$/).test(ticker)) {
        return Response.json({ error: '시장과 종목 코드를 확인해 주세요.' }, { status: 400, headers: noStore });
    }

    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    if (!base) return Response.json({ error: '시세 서버 설정을 확인 중입니다.' }, { status: 503, headers: noStore });

    try {
        const isUs = country === 'US';
        const path = isUs ? 'overseas-price/v1/quotations/price-detail' : 'domestic-stock/v1/quotations/inquire-price';
        const quote = await quotes(`${country}:${ticker}`, async () => {
            const response = await fetch(`${base}/uapi/${path}?PDNO=${ticker}`, {
                cache: 'no-store',
                signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error('시세 조회 실패');
            const result = await response.json();
            const row = result?.output ?? result?.output1;
            const rawPrice = isUs ? row?.last : row?.stck_prpr;
            const price = typeof rawPrice === 'number' || typeof rawPrice === 'string' ? Number(rawPrice) : NaN;
            if (result?.rt_cd !== '0' || !Number.isFinite(price) || price <= 0) throw new Error('시세 조회 실패');
            return { price, expiresAt: Date.now() + ttlSeconds * 1000 };
        });

        // 서버에서 이미 보낸 시간만큼 CDN 캐시의 수명도 줄인다.
        const remaining = Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));
        return Response.json({ price: quote.price }, {
            headers: { 'Cache-Control': `public, max-age=0, s-maxage=${remaining}` },
        });
    } catch {
        return Response.json({ error: '현재가를 불러오지 못했습니다.' }, { status: 502, headers: noStore });
    }
}
