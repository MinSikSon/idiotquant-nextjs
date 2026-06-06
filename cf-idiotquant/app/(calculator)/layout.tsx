import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '투자 계산기 - NCAV·S-RIM·적정주가 계산',
  description: 'NCAV(순유동자산가치), S-RIM(초과이익모델), 그레이엄 공식 기반 적정 주가를 직접 계산해보세요. 재무제표 수치만 입력하면 즉시 목표주가 결과를 확인할 수 있습니다.',
  keywords: [
    'NCAV 계산기', '적정주가 계산기', 'S-RIM 계산기', '목표주가 계산',
    '주식 투자 계산기', '그레이엄 공식 계산', '주식 내재가치 계산',
  ],
  alternates: { canonical: 'https://idiotquant.com/calculator' },
  openGraph: {
    title: '투자 계산기 - NCAV·S-RIM·적정주가 | IdiotQuant',
    description: 'NCAV, S-RIM, 그레이엄 공식으로 적정 주가를 직접 계산해보세요.',
    url: 'https://idiotquant.com/calculator',
  },
};

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '투자 계산기', item: 'https://idiotquant.com/calculator' },
  ],
};

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {children}
    </>
  );
}
