import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/accounts',
          '/admin',
          '/profile',
          '/balance',
          '/balance-kr',
          '/balance-us',
          '/api/',
          '/algorithm-trade',
        ],
      },
    ],
    sitemap: 'https://idiotquant.com/sitemap.xml',
  };
}
