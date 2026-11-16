import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata('', '내 관심종목 · 종목 발굴과 분석',
  '관심종목의 가격과 전략별 적정주가를 한눈에 살펴보세요. 국내·미국 종목 검색, 발굴, 분석과 비교를 제공합니다.');

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
