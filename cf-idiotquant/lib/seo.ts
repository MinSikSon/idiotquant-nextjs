import type { Metadata } from 'next';

export function publicPageMetadata(path: string, title: string, description: string): Metadata {
  const url = `https://idiotquant.com${path}`;
  const fullTitle = `${title} | IdiotQuant`;
  const image = 'https://idiotquant.com/icon-512.png';
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle, description, url, type: 'website',
      siteName: 'IdiotQuant', locale: 'ko_KR',
      images: [{ url: image, width: 512, height: 512, alt: 'IdiotQuant' }],
    },
    twitter: { card: 'summary', title: fullTitle, description, images: [image] },
  };
}
