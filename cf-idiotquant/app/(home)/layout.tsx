import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata('', '관심종목 변화 확인 · 종목 발굴과 분석',
  '관심종목의 지난 확인 이후 가격과 투자 지표 변화를 짧게 살펴보세요. 국내·미국 종목 검색, 발굴, 분석과 비교를 제공합니다.');

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
