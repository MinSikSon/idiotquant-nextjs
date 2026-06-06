import type { Metadata } from 'next';

// /search는 /analyze로 리다이렉트 — 중복 색인 방지
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
