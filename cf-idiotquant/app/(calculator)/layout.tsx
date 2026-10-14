import { publicPageMetadata } from '@/lib/seo';
import { CALCULATOR_FAQ } from '@/lib/seo-content';
import PageAnswers from '@/components/pageAnswers';

export const metadata = publicPageMetadata('/calculator', '복리 수익률 계산기 - 적립식·거치식 복리 계산', '초기 투자금, 매월 적립금, 연 수익률로 만기 평가금액과 연도별 명세를 계산하세요. 단리·복리, 복리 주기, 세후·물가 반영 금액을 비교합니다.');

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '복리 계산기', item: 'https://idiotquant.com/calculator' },
  ],
};

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {children}
      <PageAnswers title="복리 계산기" path="/calculator" items={CALCULATOR_FAQ} />
    </>
  );
}
