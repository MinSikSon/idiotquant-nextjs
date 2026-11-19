import { QUANT_FAQ, faqSchema } from '@/lib/seo-content';
import type { Metadata } from 'next';

// "퀀트" 로 검색해서 들어오는 사람이 닿는 자리. 서비스 소개가 아니라 **설명**이 먼저다 —
// 무엇을 파는지부터 말하면 검색한 사람이 찾던 답이 아니라 광고를 읽게 된다.
export const metadata: Metadata = {
  title: { absolute: '퀀트 투자란? 퀀트 주식 전략 9가지와 스크리너 | IdiotQuant' },
  description:
    '재무지표로 종목을 고르는 방법을 설명합니다. NCAV·저PBR·저PER·S-RIM 등 IdiotQuant 발굴 전략 9가지의 조건과 주의할 점을 확인하세요.',
  keywords: [
    '퀀트', 'quant', '퀀트 투자', '퀀트 주식', '퀀트 전략', '퀀트 투자란',
    '퀀트 스크리너', '퀀트 프로그램', '퀀트 종목 발굴',
    'NCAV', '저PBR', '저PER', 'S-RIM', '마법공식', '가치투자', '계량투자',
  ],
  alternates: { canonical: 'https://idiotquant.com/quant' },
  openGraph: {
    title: '퀀트 투자란? 퀀트 주식 전략 9가지와 스크리너',
    description:
      'NCAV·저PBR·저PER·S-RIM 등 퀀트 전략 9가지의 조건과 주의할 점을 설명합니다.',
    url: 'https://idiotquant.com/quant',
    type: 'article',
    images: [{ url: 'https://idiotquant.com/icon-512.png', width: 512, height: 512, alt: 'IdiotQuant' }],
  },
  twitter: {
    card: 'summary',
    images: ['https://idiotquant.com/icon-512.png'],
    title: '퀀트 투자란? 퀀트 주식 전략 9가지',
    description: '재무지표로 종목을 고르는 방법과 전략별 조건을 설명합니다.',
  },
};

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '퀀트 투자', item: 'https://idiotquant.com/quant' },
  ],
};

// 이 글이 무엇을 설명하는 글인지 검색엔진에 그대로 알린다.
const jsonLdArticle = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '퀀트 투자란? 퀀트 주식 전략 9가지와 스크리너',
  description:
    '재무지표로 종목을 고르는 절차와 NCAV·저PBR·저PER·S-RIM 등 전략의 조건과 주의할 점을 설명합니다.',
  inLanguage: 'ko',
  author: { '@type': 'Organization', name: 'IdiotQuant', url: 'https://idiotquant.com' },
  publisher: {
    '@type': 'Organization',
    name: 'IdiotQuant',
    logo: { '@type': 'ImageObject', url: 'https://idiotquant.com/icon-512.png' },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://idiotquant.com/quant' },
};

const jsonLdFaq = faqSchema(QUANT_FAQ, '/quant');

export default function QuantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq).replace(/</g, '\\u003c') }} />
      {children}
    </>
  );
}
