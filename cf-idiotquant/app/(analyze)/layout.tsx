import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주식 분석 - 재무지표·목표주가·밸류에이션',
  description: 'PER, PBR, EPS, BPS, 52주 최고/최저, 시가총액 등 상세 재무지표와 DCF·RIM·그레이엄 공식 기반 목표주가를 무료로 분석합니다. 국내·미국 주식 모두 지원.',
  keywords: [
    '주식 재무분석', '주식 목표주가', 'PER PBR 분석', '52주 최고 최저',
    'DCF 계산', 'RIM 계산', '그레이엄 공식', '시가총액 조회',
    '국내 주식 분석', '미국 주식 분석', '주식 밸류에이션',
  ],
  alternates: { canonical: 'https://idiotquant.com/analyze' },
  openGraph: {
    title: '주식 분석 - 재무지표·목표주가 | IdiotQuant',
    description: 'PER, PBR, EPS, BPS, DCF·RIM 기반 목표주가를 무료로 분석. 국내·미국 주식 지원.',
    url: 'https://idiotquant.com/analyze',
  },
};

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
