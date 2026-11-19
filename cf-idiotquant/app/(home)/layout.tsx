import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata('', '내 관심종목 · 종목 발굴과 분석',
  '국내·미국 주식을 검색하고 재무 기준으로 종목을 찾으세요. 관심종목의 가격과 전략별 적정주가를 비교할 수 있습니다.');

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
