import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '오늘의 발굴 종목 - NCAV·저PBR·저PER 주식 스크리너',
  description: '매일 업데이트되는 퀀트 기반 저평가 주식 목록. NCAV(순유동자산), 저PBR, 저PER, S-RIM, 그레이엄 공식으로 검증된 코스피·코스닥 투자 후보 종목을 무료로 확인하세요.',
  keywords: [
    'NCAV 스크리너', '오늘의 추천 주식', '저평가 주식 목록', '퀀트 스크리너',
    '국내 주식 스크리너', '코스닥 저평가', '코스피 저평가', '저PBR 종목',
    '저PER 종목', 'S-RIM 주식', '그레이엄 공식', '가치주 발굴',
  ],
  alternates: { canonical: 'https://idiotquant.com/screener' },
  openGraph: {
    title: '오늘의 발굴 종목 - NCAV·저PBR·저PER 스크리너 | IdiotQuant',
    description: '매일 업데이트. 퀀트 전략으로 검증된 코스피·코스닥 저평가 주식 목록.',
    url: 'https://idiotquant.com/screener',
  },
};

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '오늘의 발굴 종목', item: 'https://idiotquant.com/screener' },
  ],
};

export default function ScreenerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {children}
    </>
  );
}
