import type { MetadataRoute } from 'next';

// 공개 대표 URL만 포함한다. 변경 시점을 알 수 없는 페이지에 lastModified를 임의로 넣지 않는다.

const BASE = 'https://idiotquant.com';

export default function sitemap(): MetadataRoute.Sitemap {
    const routes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
        { path: '',              changeFrequency: 'daily',   priority: 1.0 },
        { path: '/screener',     changeFrequency: 'daily',   priority: 0.9 },
        { path: '/quant',        changeFrequency: 'monthly', priority: 0.9 },
        { path: '/analyze',      changeFrequency: 'weekly',  priority: 0.85 },
        { path: '/compare',      changeFrequency: 'weekly',  priority: 0.7 },
        { path: '/calculator',   changeFrequency: 'monthly', priority: 0.6 },
        { path: '/games',        changeFrequency: 'monthly', priority: 0.5 },
        { path: '/terms',        changeFrequency: 'yearly',  priority: 0.2 },
        { path: '/privacy',      changeFrequency: 'yearly',  priority: 0.2 },
    ];

    return routes.map(r => ({
        url: `${BASE}${r.path}`,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
    }));
}
