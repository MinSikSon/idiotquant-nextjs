import { publicPageMetadata } from '@/lib/seo';
import { HOME_FAQ, faqSchema } from '@/lib/seo-content';

export const metadata = publicPageMetadata('', '퀀트 주식 스크리너 - 종목 발굴·비교·분석',
  'NCAV·저PBR·저PER 등 재무 기준으로 코스피·코스닥 종목을 발굴하고 국내·미국 주식을 분석하세요. 날짜별 종목 비교와 복리 계산기를 가입 없이 이용할 수 있습니다.');

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(HOME_FAQ, '')).replace(/</g, '\\u003c') }} />
      {children}
    </>
  );
}
