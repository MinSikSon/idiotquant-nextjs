import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IdiotQuant - 무료 NCAV·저PBR·저PER 주식 스크리너',
  description: '퀀트 알고리즘이 매일 코스피·코스닥 2,000개 종목을 스캔해 NCAV, 저PBR, 저PER, S-RIM 기준 저평가 주식을 자동 발굴합니다. 데이터 기반 스마트 가치투자의 시작.',
  keywords: [
    'NCAV 주식', '저PBR 주식', '저PER 주식', '퀀트 투자', '주식 스크리너',
    '저평가 주식', '주식 발굴', '퀀트 전략', '가치투자', '코스피 저평가 주식',
  ],
  alternates: { canonical: 'https://idiotquant.com' },
  openGraph: {
    title: 'IdiotQuant - 무료 NCAV·저PBR·저PER 주식 스크리너',
    description: '퀀트 알고리즘이 매일 코스피·코스닥 저평가 주식을 발굴합니다.',
    url: 'https://idiotquant.com',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
