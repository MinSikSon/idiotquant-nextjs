import { publicPageMetadata } from '@/lib/seo';
import { COMPARE_FAQ } from '@/lib/seo-content';
import PageAnswers from '@/components/pageAnswers';

export const metadata = publicPageMetadata('/compare', '종목 비교 - 날짜별 주가·수익률 비교', '비교할 날짜와 종목을 등록해 날짜별 종가와 수익률을 나란히 확인하세요. PER·PBR·EPS·BPS·ROE 등 현재 재무지표도 함께 비교합니다.');

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '종목 비교', item: 'https://idiotquant.com/compare' },
  ],
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {children}
      <PageAnswers title="종목 비교" path="/compare" items={COMPARE_FAQ} />
    </>
  );
}
