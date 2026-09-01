import type { MetadataRoute } from 'next';

// 사이트맵을 **코드로** 만든다. 예전에는 `public/sitemap.xml` 한 장이었는데, 페이지를
// 새로 만들 때마다 그 파일을 고쳐야 한다는 것을 아무도 기억하지 못했다 — /search·/game·
// /quant 가 넉 달 동안 빠져 있었다. 여기 있으면 라우트를 추가할 때 같이 눈에 띈다.
//
// **로그인이 필요한 경로는 넣지 않는다**(middleware 가 /login 으로 돌려보내므로 색인이
// 안 된다). 지금 공개인 곳은 middleware.ts 의 공개 목록이 정하며, 이 파일은 그 목록과
// 같은 곳만 담는다.

const BASE = 'https://idiotquant.com';

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    const routes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
        { path: '',              changeFrequency: 'daily',   priority: 1.0 },
        { path: '/screener',     changeFrequency: 'daily',   priority: 0.9 },
        { path: '/quant',        changeFrequency: 'monthly', priority: 0.9 },
        { path: '/analyze',      changeFrequency: 'weekly',  priority: 0.85 },
        { path: '/search',       changeFrequency: 'weekly',  priority: 0.7 },
        { path: '/calculator',   changeFrequency: 'monthly', priority: 0.6 },
        { path: '/game',         changeFrequency: 'monthly', priority: 0.5 },
        { path: '/game/cards',   changeFrequency: 'monthly', priority: 0.4 },
        { path: '/terms',        changeFrequency: 'yearly',  priority: 0.2 },
        { path: '/privacy',      changeFrequency: 'yearly',  priority: 0.2 },
    ];

    return routes.map(r => ({
        url: `${BASE}${r.path}`,
        lastModified: now,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
    }));
}
