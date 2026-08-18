import type { Metadata } from 'next';

// 로그인해야만 닿는 화면이라 색인하지 않는다 — 검색 결과에서 들어와도 로그인으로 튕긴다.
export const metadata: Metadata = {
  title: '가계부 - 수입·지출 기록',
  description: '수입과 지출을 직접 기입하고 월별로 확인하는 가계부. 급여·주식 배당·이자부터 고정비·생활비·투자까지 항목별로 나눠 봅니다.',
  robots: { index: false, follow: false },
};

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
