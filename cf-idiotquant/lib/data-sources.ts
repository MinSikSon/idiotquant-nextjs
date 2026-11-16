export const DATA_SOURCES = {
  kis: {
    name: '한국투자증권 KIS Developers',
    url: 'https://apiportal.koreainvestment.com/',
    usage: '국내·미국 시세 및 종목 정보',
    terms: '이용 계약과 시세 정보 제공 조건에 따릅니다. 출처 표시만으로 재배포 권한이 부여되지는 않습니다.',
  },
  finnhub: {
    name: 'Finnhub',
    url: 'https://finnhub.io/terms-of-service',
    usage: '미국 공시 재무제표 (Financials As Reported)',
    terms: '데이터 및 파생 결과의 제3자 제공에는 서면 승인이 필요합니다. 개인용 요금제는 별도 승인 없이 사업 용도로 사용할 수 없습니다.',
  },
  dataGoKr: {
    name: '금융위원회 · 공공데이터포털',
    url: 'https://www.data.go.kr/data/15094808/openapi.do',
    usage: '종목 비교의 과거 시가총액 보완 · 금융위원회_주식시세정보',
    terms: '공공누리 제4유형(출처표시·상업적 이용금지·변경금지). 제3자 무단 제공·재배포가 금지되며, 상업적 이용은 원천 소유자인 한국거래소에 별도 문의해야 합니다.',
  },
  dart: {
    name: '금융감독원 OpenDART',
    url: 'https://opendart.fss.or.kr/intro/terms.do',
    usage: '국내 재무상태표·손익계산서 · 단일회사 주요계정(fnlttSinglAcnt.json)',
    terms: 'OpenDART 이용약관과 개별 자료의 권리 조건을 따릅니다. 백엔드에서 계정을 매핑하고 금액을 억 원으로 환산하여 제공합니다.',
  },
} as const;
