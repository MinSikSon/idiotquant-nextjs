import { publicPageMetadata } from '@/lib/seo';
import { ANALYZE_FAQ } from '@/lib/seo-content';
import PageAnswers from '@/components/pageAnswers';

export const metadata = publicPageMetadata('/analyze', '주식 분석 - 재무·모멘텀·기술적 지표', '국내·미국 주식의 재무지표와 가치 평가, 모멘텀·이동평균·RSI·거래량을 확인하세요. 종목별 데이터와 모델 가정을 함께 비교할 수 있습니다.');

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '주식 분석', item: 'https://idiotquant.com/analyze' },
  ],
};

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {children}
      <PageAnswers title="주식 분석" path="/analyze" items={ANALYZE_FAQ} />
    </>
  );
}
