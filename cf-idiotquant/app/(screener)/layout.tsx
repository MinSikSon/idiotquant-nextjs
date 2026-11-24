import { publicPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import PageAnswers from '@/components/pageAnswers';

export const metadata = publicPageMetadata('/screener', '주식 스크리너 - NCAV·저PBR·저PER 종목 발굴', '코스피·코스닥 재무 기준 발굴 결과를 확인하고 팩터 범위·가중치를 직접 조합하세요. 과거 시점 CSV로 보유 수·리밸런싱·거래 비용을 설정해 검증할 수 있습니다.');

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '종목 발굴', item: 'https://idiotquant.com/screener' },
  ],
};

export default async function ScreenerLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("faq");
  const items = ([0, 1, 2, 3] as const).map(index => ({ q: t(`screenerQ${index}`), a: t(`screenerA${index}`) }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {children}
      <PageAnswers title={t("screener")} path="/screener" items={items} />
    </>
  );
}
