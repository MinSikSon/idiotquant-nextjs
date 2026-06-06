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

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'NCAV란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'NCAV(Net Current Asset Value, 순유동자산가치)는 벤저민 그레이엄이 제시한 투자 기준으로, 유동자산에서 총부채를 뺀 값이 시가총액보다 큰 종목을 의미합니다. 청산가치 이하에 거래되는 초저평가 종목을 발굴하는 데 활용됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '저PBR 투자 전략이란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PBR(주가순자산비율)이 0.5 미만인 종목을 선택하는 전략입니다. 기업 순자산의 절반 이하 가격에 거래되는 심층 저평가 종목을 발굴합니다. 코스피·코스닥 시장에서 PBR 0.5 미만 종목은 역사적으로 높은 수익률을 기록해 왔습니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'IdiotQuant 스크리너는 어떻게 작동하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '매일 코스피·코스닥 2,000개 종목의 재무제표(유동자산, 총부채, 순이익 등)와 실시간 시세를 자동으로 스캔합니다. NCAV, 저PBR, 저PER, S-RIM 등 퀀트 전략 기준을 충족하는 종목을 필터링해 매일 업데이트된 발굴 종목 목록을 제공합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '무료로 사용할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 스크리너와 오늘의 발굴 종목 확인은 완전 무료입니다. 카카오 계정으로 간편 로그인하면 상세 재무분석, 목표주가 계산(DCF·RIM·그레이엄 공식), 상장폐지 위험도 분석 기능을 추가로 이용할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'S-RIM이란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'S-RIM(초과이익모델)은 ROE(자기자본이익률)가 요구수익률을 초과하는 기업의 적정 주가를 계산하는 밸류에이션 모델입니다. ROE 8% 이상이면서 PBR 1.0 미만인 종목이 해당합니다.',
      },
    },
  ],
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      {children}
    </>
  );
}
