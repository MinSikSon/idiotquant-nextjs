import type { Metadata } from 'next';

// "퀀트" 로 검색해서 들어오는 사람이 닿는 자리. 서비스 소개가 아니라 **설명**이 먼저다 —
// 무엇을 파는지부터 말하면 검색한 사람이 찾던 답이 아니라 광고를 읽게 된다.
export const metadata: Metadata = {
  title: { absolute: '퀀트 투자란? 퀀트 주식 전략 9가지와 무료 스크리너 | IdiotQuant' },
  description:
    '퀀트(quant) 투자는 감이 아니라 숫자 규칙으로 종목을 고르는 방법입니다. NCAV·저PBR·저PER·S-RIM·마법공식 등 대표 퀀트 전략의 기준식과 한계를 정리하고, 코스피·코스닥 전 종목에 그 기준을 매일 적용한 결과를 무료로 봅니다.',
  keywords: [
    '퀀트', 'quant', '퀀트 투자', '퀀트 주식', '퀀트 전략', '퀀트 투자란',
    '퀀트 스크리너', '무료 퀀트', '퀀트 프로그램', '퀀트 종목 발굴',
    'NCAV', '저PBR', '저PER', 'S-RIM', '마법공식', '가치투자', '계량투자',
  ],
  alternates: { canonical: 'https://idiotquant.com/quant' },
  openGraph: {
    title: '퀀트 투자란? 퀀트 주식 전략 9가지와 무료 스크리너',
    description:
      '퀀트 투자는 감이 아니라 숫자 규칙으로 종목을 고르는 방법입니다. 대표 퀀트 전략의 기준식과 한계, 그리고 무료로 시작하는 법.',
    url: 'https://idiotquant.com/quant',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: '퀀트 투자란? 퀀트 주식 전략 9가지',
    description: '감이 아니라 숫자 규칙으로 종목을 고르는 방법 — 기준식과 한계까지.',
  },
};

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://idiotquant.com' },
    { '@type': 'ListItem', position: 2, name: '퀀트 투자', item: 'https://idiotquant.com/quant' },
  ],
};

// 이 글이 무엇을 설명하는 글인지 검색엔진에 그대로 알린다.
const jsonLdArticle = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '퀀트 투자란? 퀀트 주식 전략 9가지와 무료 스크리너',
  description:
    '퀀트(quant) 투자의 뜻과 절차, NCAV·저PBR·저PER·S-RIM 등 대표 전략의 기준식, 그리고 퀀트가 못 하는 일까지 정리했습니다.',
  inLanguage: 'ko',
  author: { '@type': 'Organization', name: 'IdiotQuant', url: 'https://idiotquant.com' },
  publisher: {
    '@type': 'Organization',
    name: 'IdiotQuant',
    logo: { '@type': 'ImageObject', url: 'https://idiotquant.com/icon-512.png' },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://idiotquant.com/quant' },
};

// 검색 결과에서 질문이 그대로 펼쳐지는 자리. 답은 이 페이지 본문과 **같은 말**이어야 한다 —
// 다르면 그건 검색엔진에만 하는 말이 된다.
const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '퀀트 투자란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퀀트(quant) 투자는 정량(quantitative) 지표로 규칙을 먼저 정하고, 그 규칙을 모든 종목에 똑같이 적용해 종목을 고르는 방법입니다. "PBR 0.5 미만" 처럼 숫자로 적을 수 있는 기준만 쓰기 때문에, 같은 기준이면 누가 언제 돌려도 같은 목록이 나옵니다. 뉴스나 감이 아니라 재무제표와 시세라는 같은 데이터를 봅니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퀀트 투자는 프로그래밍을 할 줄 알아야 하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '아닙니다. 파이썬으로 직접 데이터를 받아 돌리는 방법도 있지만, 기준이 이미 정해진 스크리너를 쓰면 코드 없이 같은 일을 할 수 있습니다. IdiotQuant는 코스피·코스닥 전 종목에 NCAV·저PBR·저PER·S-RIM 등의 기준을 매일 적용한 결과를 가입 없이 무료로 보여 줍니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퀀트 투자에서 가장 많이 쓰는 전략은 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '자산 기준으로는 NCAV(순유동자산 > 시가총액)와 저PBR(PBR 0.5 미만), 이익 기준으로는 저PER(PER 10 미만, 흑자)과 마법공식(PER 15 미만 & ROE 10% 초과)이 대표적입니다. 둘을 합친 그레이엄 기준(PER × PBR < 22.5)과 초과이익모델 S-RIM(ROE 8% 초과 & PBR 1.0 미만)도 널리 쓰입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퀀트 투자는 무조건 수익이 나나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '아닙니다. 퀀트는 과거 데이터에서 통했던 규칙을 앞으로도 쓰는 방법이라, 그 규칙이 통하지 않는 구간이 몇 년씩 이어질 수 있습니다. 싼 데는 이유가 있는 종목(적자 지속, 상장폐지 위험, 거래량 부족)이 기준에 걸려 올라오기도 하므로, 스크리너가 내준 목록은 매수 목록이 아니라 조사 목록으로 봐야 합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퀀트 주식 스크리너는 무료인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'IdiotQuant의 종목 발굴(스크리너)과 오늘의 발굴 결과는 가입 없이 무료입니다. 카카오 로그인을 하면 종목별 상세 재무분석, 목표주가 계산(DCF·RIM·그레이엄), 상장폐지 위험도까지 무료로 볼 수 있습니다.',
      },
    },
  ],
};

export default function QuantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      {children}
    </>
  );
}
