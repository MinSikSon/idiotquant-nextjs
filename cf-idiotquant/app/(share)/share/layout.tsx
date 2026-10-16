import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공유 결과',
  description: '공유자가 조회한 발굴·비교·분석 결과를 확인하세요.',
  robots: { index: false, follow: false },
};

export default function SharedResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
