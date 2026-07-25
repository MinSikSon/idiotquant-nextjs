// 업종(섹터) 기반 상성 — React/Phaser 비의존 순수 로직. page.tsx의 SECTORS 배열(카드 플레이버/
// 아이콘용)과 키워드 목록이 겹치지만, 이쪽은 아이콘·이미지 없이 전투 상성 계산에만 쓰는 축약판이다.
// 종목명/티커가 어느 업종에도 안 걸리면 무속성(null)으로 처리 — 상성 계산에서 항상 중립(배율 1).

export interface SectorTypeDef { label: string; re: RegExp }

export const SECTOR_TYPES: SectorTypeDef[] = [
  { label: "핀테크", re: /핀테크|페이|사이버결제|간편결제|fintech|payment/i },
  { label: "2차전지", re: /2차전지|배터리|에너지솔루션|에코프로|엘앤에프|포스코퓨처엠|battery/i },
  { label: "로봇·자동화", re: /로봇|로보틱|자동화|robot|automat/i },
  { label: "전자·반도체", re: /반도체|전자|디스플레이|칩|하이닉스|테크|semi|chip|micron|nvidia|amd|intel|apple|tech/i },
  { label: "바이오·제약", re: /바이오|제약|헬스|메디|파마|셀|진단|bio|pharma|health|medi|gene/i },
  { label: "금융", re: /은행|금융|증권|캐피탈|카드|보험|지주|홀딩스|bank|financ|capital|insur|jpmorgan|goldman/i },
  { label: "자동차", re: /자동차|모비스|타이어|모터|현대차|기아|auto|motor|\bcar\b|tesla|ford|toyota/i },
  { label: "조선·해운", re: /조선|해운|중공업|marine|ship|해양/i },
  { label: "건설", re: /건설|엔지니어|건축|시멘트|construc|engineer|cement/i },
  { label: "에너지", re: /에너지|전력|가스|정유|석유|원전|태양|energy|oil|power|solar|exxon|chevron/i },
  { label: "화학·소재", re: /화학|케미|소재|섬유|폴리|chem|material/i },
  { label: "철강·금속", re: /철강|금속|포스코|steel|metal|alum/i },
  { label: "통신", re: /통신|텔레콤|kt|skt|telecom|networ|verizon|comcast/i },
  { label: "게임·엔터", re: /게임|엔터|미디어|콘텐츠|넷마블|엔씨|크래프톤|game|media|netflix|disney|entertain/i },
  { label: "식품", re: /식품|푸드|제과|음료|주류|라면|food|bever|coca|pepsi|nestle/i },
  { label: "유통", re: /유통|마트|리테일|백화|커머스|이마트|쿠팡|retail|amazon|walmart|shop/i },
  { label: "항공·방산", re: /항공|우주|방산|aero|defense|boeing|lockheed/i },
  { label: "패션·뷰티", re: /패션|의류|화장품|뷰티|아모레|fashion|cosmet|nike|beauty/i },
  { label: "소프트웨어", re: /소프트|플랫폼|클라우드|인터넷|카카오|네이버|soft|cloud|internet|google|meta|microsoft/i },
];

// 종목명/티커로 업종을 추론 — 어느 것에도 안 걸리면 무속성(null, 상성 계산에서 항상 중립).
export function sectorType(item: any): string | null {
  const hay = `${item?.name ?? ""} ${item?.ticker ?? ""}`;
  for (const s of SECTOR_TYPES) if (s.re.test(hay)) return s.label;
  return null;
}

const ADVANTAGE_MULT = 1.5;
const DISADVANTAGE_MULT = 2 / 3;

// 업종을 SECTOR_TYPES 배열 순서로 된 순환 고리로 보고, "다음 업종"을 상대로는 우위(더 큰 피해),
// "이전 업종"을 상대로는 열위(더 작은 피해)로 판정한다. 무속성이 하나라도 끼면 항상 중립(배율 1).
export function typeMultiplier(atkType: string | null, defType: string | null): number {
  if (!atkType || !defType || atkType === defType) return 1;
  const i = SECTOR_TYPES.findIndex(s => s.label === atkType);
  const j = SECTOR_TYPES.findIndex(s => s.label === defType);
  if (i < 0 || j < 0) return 1;
  const n = SECTOR_TYPES.length;
  if ((i + 1) % n === j) return ADVANTAGE_MULT;
  if ((j + 1) % n === i) return DISADVANTAGE_MULT;
  return 1;
}
