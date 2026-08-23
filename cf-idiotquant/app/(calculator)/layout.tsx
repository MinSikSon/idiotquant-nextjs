import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '복리 수익률 계산기 - 적립식·거치식 복리 계산',
  description: '초기 투자금과 매월 적립금, 기대 수익률만 넣으면 만기 평가금액과 연도별 명세를 바로 보여줍니다. 단리·복리, 복리 주기(연·반기·분기·월), 이자소득세 15.4%, 물가를 반영한 실질 금액까지 계산합니다.',
  keywords: [
    '복리 계산기', '복리 수익률 계산기', '적립식 복리 계산', '거치식 복리 계산',
    '단리 복리 차이', '이자소득세 계산', '실질 수익률 계산', '주식 투자 계산기',
  ],
  alternates: { canonical: 'https://idiotquant.com/calculator' },
  openGraph: {
    title: '복리 수익률 계산기 | IdiotQuant',
    description: '적립식·거치식 복리를 세후·실질 기준으로 계산하고 연도별 명세로 확인하세요.',
    url: 'https://idiotquant.com/calculator',
  },
};

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '복리 수익률 계산기', item: 'https://idiotquant.com/calculator' },
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
