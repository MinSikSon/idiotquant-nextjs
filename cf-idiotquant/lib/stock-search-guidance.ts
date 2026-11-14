export type StockSearchPurpose = 'analyze' | 'compare' | 'screener' | 'balance' | 'ticker-map';

export const STOCK_SEARCH_GUIDANCE = {
  analyze: {
    title: '종목 분석을 시작해 보세요',
    description: '국내 종목명·코드, 미국 종목명·티커로 찾을 수 있어요.',
    placeholder: '종목명 또는 티커를 검색해 보세요',
    steps: ['종목을 선택하면 해당 종목의 분석 화면으로 이동해요.', '주가·재무지표·가치 평가를 함께 확인할 수 있어요.'],
    note: '분석 결과는 투자 참고 자료이며, 특정 종목의 매수·매도를 권유하지 않습니다.',
  },
  compare: {
    title: '함께 비교할 종목을 찾아보세요',
    description: '국내·미국 종목을 같은 비교표에 추가할 수 있어요.',
    placeholder: '비교할 종목명 또는 티커 검색',
    steps: ['선택한 종목을 현재 비교표에 추가해요.', '이미 추가한 종목과 비교 날짜는 그대로 유지돼요.'],
    note: '비교 가격과 지표는 조회 기준에 따라 달라집니다. 변화율에는 배당·수수료·세금이 포함되지 않습니다.',
  },
  screener: {
    title: '발굴 목록에서 종목을 찾아보세요',
    description: '현재 선택한 시장의 종목명이나 코드로 검색해 보세요.',
    placeholder: '목록에서 종목명 또는 코드 검색',
    steps: ['선택한 종목을 현재 발굴 목록의 검색 조건에 적용해요.', '시장·날짜·전략·필터는 유지돼요. 다른 조건에 맞지 않으면 결과가 없을 수 있어요.'],
    note: '발굴 결과는 선택한 조건과 스캔 시점의 자료입니다. 조건 충족 여부가 투자 성과를 보장하지 않습니다.',
  },
  balance: {
    title: '현재 계좌에서 거래할 종목을 찾아보세요',
    description: '현재 계좌의 시장에서 선택할 수 있는 종목을 보여드려요.',
    placeholder: '주문할 종목명 또는 티커 검색',
    steps: ['종목을 선택하면 주문 입력창을 열어요.', '계좌·종목·수량·가격을 확인하고 직접 주문을 제출해 주세요.'],
    note: '검색과 종목 선택만으로 주문이 전송되지는 않습니다. 실제 주문 전 계좌와 주문 내용을 확인해 주세요.',
  },
  'ticker-map': {
    title: '관리할 종목 매핑을 찾아보세요',
    description: '선택한 시장의 티커나 종목명으로 조회할 수 있어요.',
    placeholder: '티커 또는 종목명 검색',
    steps: ['선택한 종목으로 매핑 목록을 검색해요.', '검색만으로 매핑이 변경되지는 않아요. 수정한 내용은 저장 후 반영돼요.'],
    note: '종목 매핑은 서비스의 종목명 표시에 사용됩니다. 시장과 티커를 확인한 뒤 수정해 주세요.',
  },
} satisfies Record<StockSearchPurpose, { title: string; description: string; placeholder: string; steps: string[]; note: string }>;
