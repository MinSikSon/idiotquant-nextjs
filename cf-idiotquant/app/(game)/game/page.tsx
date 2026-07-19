"use client";

// =========================================================================
// 종목 카드: 높다/낮다 (Higher-Lower) — 덱 빌딩 게임 1탄
// 두 종목 카드를 시가총액으로 비교해 맞히면 연승.
// 카드 등급(메달)은 NCAV·PBR·PER·ROE를 종합한 저평가 점수로 별도 산정.
// 정답을 맞힌 카드만 "내 덱"에 수집 → 계정별 D1 저장(로그인 필요).
// 연승↑ → 획득 확률↑, 높은 등급(메달) 카드일수록 더 높은 연승이 필요.
// 비로그인 시 수집 시점에 로그인 유도.
// =========================================================================

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowUp, ArrowDown, Layers, Copy, TrendingUp, Sparkles, ChevronLeft, ChevronRight, Lock, Info,
  Cpu, Dna, Landmark, CarFront, Ship, Construction, Zap, FlaskConical, Factory, RadioTower, Gamepad2,
  Soup, ShoppingCart, PlaneTakeoff, Shirt, Code2, Gem, Compass, Anchor, Map as MapIcon, Medal as MedalIcon,
  BatteryCharging, Bot, Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { computeValueScore } from "@/lib/utils/valueScore";
import { getDeck, addDeckCard, getWallet, syncBestStreak, type DeckCardSnapshot } from "@/lib/features/deck/deckAPI";
import { cn } from "@/lib/utils";
import VoyageArt from "@/components/game/voyageArt";
import GameSeaArt from "@/components/game/gameSeaArt";
import { HOLO_THRESHOLD, HoloOverlay, PackReveal, AchievementBadges } from "./gameCollectibles";
import { WalletChip, ConvertButton, ShopPanel, BOOST_ITEMS, type BoostItem } from "./gameShop";

const safeNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// 비교 스탯: 시가총액 하나로 고정 (카드 등급은 별도 저평가 점수로 산정)
type Stat = { key: string; label: string; get: (it: any) => number; fmt: (v: number) => string };
const STAT: Stat = {
  key: "market_cap", label: "시가총액", get: it => safeNum(it.market_cap),
  fmt: v => v >= 10000 ? `${(v / 10000).toFixed(1)}조` : `${Math.round(v).toLocaleString()}억`,
};

// 카드 수집: 정답을 맞힌 카드만 획득 판정. 등급별 "기본 획득 확률" + 연승 보너스.
// 연승이 없어도(첫 정답에도) 기본 확률로 카드가 나오며, 높은 등급일수록 기본 확률이 낮고
// 연승을 쌓을수록 확률이 오른다 (SS전설>S보물>A다이아>B금>C은>D동>E철>F원석>G흙>H탐색).
const TIER_BASE: Record<string, number> = {
  explore: 0.35, clay: 0.29, raw: 0.24, iron: 0.19, bronze: 0.15, silver: 0.11, gold: 0.08, diamond: 0.055, treasure: 0.035, legend: 0.02,
};
function acquireChance(item: any, streak: number): number {
  const tone = computeValueScore(item).tone;
  const base = TIER_BASE[tone] ?? 0.2;
  // streak 은 정답 후 연승(≥1). 첫 정답(streak 1)엔 기본 확률, 이후 연승마다 +7%p.
  return Math.min(0.9, base + Math.max(0, streak - 1) * 0.07);
}

// 덱 저장 실패 사유를 사람이 읽을 문구로 (401 로그인 / 404 미배포 / 500 마이그레이션)
function deckFailReason(res: any): string {
  const s = res?.status;
  if (s === 401) return "로그인이 필요해요 (로그인 후 다시 시도)";
  if (s === 404) return "서버(워커)가 아직 배포되지 않았어요";
  if (s === 500) return "서버 오류 — 덱 테이블(마이그레이션) 확인 필요";
  return res?.error ? String(res.error) : "저장 실패";
}

// 덱 아이템 = 카드 스냅샷 + 수집 개수 (같은 종목 중복 누적)
export type DeckItem = DeckCardSnapshot & { count: number };
export const deckTotal = (deck: DeckItem[]) => deck.reduce((a, c) => a + (c.count ?? 1), 0);

function toCard(it: any): DeckCardSnapshot {
  return {
    ticker: String(it.ticker), name: String(it.name),
    market_cap: safeNum(it.market_cap), last_price: safeNum(it.last_price),
    ncav_ratio: safeNum(it.ncav_ratio), pbr: safeNum(it.pbr), per: safeNum(it.per),
    eps: safeNum(it.eps), bps: safeNum(it.bps),
    tone: computeValueScore(it).tone, // 지갑 중복 카드 전환 시 코인 가치 조회용(워커에 점수 로직 미복제)
  };
}

// 메달 톤
const MEDAL_TONE: Record<string, string> = {
  legend: "bg-violet-100 text-violet-700 ring-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800",
  treasure: "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
  diamond: "bg-sky-50 text-sky-700 ring-sky-300 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-800",
  gold: "bg-yellow-50 text-yellow-700 ring-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-300 dark:ring-yellow-800",
  silver: "bg-neutral-100 text-neutral-600 ring-neutral-300 dark:bg-[#2c2b27] dark:text-neutral-300 dark:ring-[#4a4641]",
  bronze: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900",
  iron: "bg-zinc-100 text-zinc-600 ring-zinc-300 dark:bg-zinc-900/40 dark:text-zinc-400 dark:ring-zinc-700",
  raw: "bg-stone-100 text-stone-600 ring-stone-300 dark:bg-stone-900/40 dark:text-stone-400 dark:ring-stone-700",
  clay: "bg-lime-50 text-lime-800 ring-lime-200 dark:bg-lime-950/30 dark:text-lime-500 dark:ring-lime-900",
  explore: "bg-neutral-50 text-neutral-400 ring-neutral-200 dark:bg-[#242320] dark:text-neutral-500 dark:ring-[#35332e]",
};

function Medal({ item, lg }: { item: any; lg?: boolean }) {
  const v = computeValueScore(item);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-black tabular-nums",
      lg ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-[11px]", MEDAL_TONE[v.tone])}>
      <span aria-hidden>{v.medal}</span>{v.score}
    </span>
  );
}

// 종목 로고 (KR: NEXT_PUBLIC_KR_LOGO_API, US: logo.dev). 실패 시 첫 글자 fallback. StockCard와 동일 소스.
function logoUrlFor(item: any): string {
  const t = String(item?.ticker ?? "");
  return item?.isUs
    ? `https://img.logo.dev/ticker/${t}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
    : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${t}`;
}

// 로고 메달리온 — 밝은 원형 칩 + 등급색 발광 링(평면 2D). 로고 실패 시 이니셜. (기존 3D 오브 대체)
function PortMedallion({ item, size = 56, lift = false }: { item: any; size?: number; lift?: boolean }) {
  const [err, setErr] = useState(false);
  const c = TIER[computeValueScore(item).tone] ?? TIER.explore;
  return (
    <div className="relative rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-b from-white to-[#e6e8ec]"
      style={{ width: size, height: size,
        boxShadow: `0 0 0 2px ${c.accent}, 0 0 ${lift ? 16 : 10}px ${rgba(c.glow, lift ? 0.55 : 0.45)}, 0 ${lift ? 6 : 3}px ${lift ? 12 : 7}px rgba(0,0,0,0.4)` }}>
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrlFor(item)} alt={item?.name ?? "logo"} loading="lazy"
          className="w-[82%] h-[82%] object-contain" onError={() => setErr(true)} />
      ) : (
        <span className="font-serif font-extrabold text-[#334155] leading-none" style={{ fontSize: size * 0.46 }}>
          {(item?.name ?? item?.ticker ?? "?").charAt(0)}
        </span>
      )}
    </div>
  );
}

// 등급별 프리즘 팔레트 — computeValueScore().tone 이 조인키. 테두리·봉인·스탯 강조색을 결정.
// glow=발광색 · edge=포일 테두리 스톱 · accent=스탯값 강조색. 카드 본문은 아래 PARCHMENT(양피지) 고정색.
export const rgba = (h: string, a: number) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const TIER: Record<string, { glow: string; accent: string }> = {
  legend:   { glow: "#a855f7", accent: "#9333ea" },
  treasure: { glow: "#fb923c", accent: "#ea580c" },
  diamond:  { glow: "#22d3ee", accent: "#0891b2" },
  gold:     { glow: "#facc15", accent: "#ca8a04" },
  silver:   { glow: "#94a3b8", accent: "#64748b" },
  bronze:   { glow: "#f59e0b", accent: "#9a3412" },
  iron:     { glow: "#8a94a6", accent: "#4b5563" },
  raw:      { glow: "#a8a29e", accent: "#57534e" },
  clay:     { glow: "#a1785a", accent: "#6b4a2f" },
  explore:  { glow: "#10b981", accent: "#047857" },
};

// 등급별 카드 효과 보너스(%) — 설명란 효과 문구용 (전설이 가장 높음)
const EFFECT_BONUS: Record<string, number> = {
  legend: 10, treasure: 9, diamond: 8, gold: 7, silver: 6, bronze: 5, iron: 4, raw: 3, clay: 2, explore: 1,
};

// 업종 추론 — 종목명/티커 키워드로 대표 업종을 매핑. 데이터에 sector 필드가 없어 이름 기반.
// image=사용자 제공 업종 일러스트(사진) — GICS 11개 섹터 기준 카드 세트에서 크롭. 없으면 icon(벡터)으로 대체.
// hue=업종 고유색 · flavor=설명 · keyword=효과 문구 키워드. GICS상 가까운 섹터끼리는 같은 이미지를 공유(예: 화학·소재/철강·금속 → materials).
type SectorInfo = { label: string; icon: LucideIcon; image?: string; hue: string; flavor: string; keyword: string };
const SEC_IMG = (name: string) => `/images/sectors/${name}.jpg`;
const SECTORS: (SectorInfo & { re: RegExp })[] = [
  // 세분화된 테마(핀테크·2차전지·로봇)를 먼저 검사해 소프트웨어·에너지 등 상위 카테고리에 앞서 매칭되게 함
  { re: /핀테크|페이|사이버결제|간편결제|fintech|payment/i, icon: Wallet, image: SEC_IMG("fintech"), hue: "#6b3fa0", label: "핀테크", flavor: "돈의 흐름을 코드로 다시 설계하는 금융의 최전선.", keyword: "결제 점유율" },
  { re: /2차전지|배터리|에너지솔루션|에코프로|엘앤에프|포스코퓨처엠|battery/i, icon: BatteryCharging, image: SEC_IMG("battery"), hue: "#1b6ec2", label: "2차전지", flavor: "전기의 시대를 떠받치는 작은 셀 하나하나의 혁신.", keyword: "셀 기술력" },
  { re: /로봇|로보틱|자동화|robot|automat/i, icon: Bot, image: SEC_IMG("robotics"), hue: "#556270", label: "로봇·자동화", flavor: "반복을 기계에 맡기고 사람은 더 큰 일을 한다.", keyword: "자동화율" },
  { re: /반도체|전자|디스플레이|칩|하이닉스|테크|semi|chip|micron|nvidia|amd|intel|apple|tech/i, icon: Cpu, image: SEC_IMG("semiconductor"), hue: "#2f7dd6", label: "전자·반도체", flavor: "더 빠르고 더 작은 회로로 정보화 시대를 이끄는 기술의 심장부.", keyword: "기술력" },
  { re: /바이오|제약|헬스|메디|파마|셀|진단|bio|pharma|health|medi|gene/i, icon: Dna, image: SEC_IMG("healthcare"), hue: "#9d3fa0", label: "바이오·제약", flavor: "생명을 향한 연구와 신뢰로 인류의 건강을 지킨다.", keyword: "바이오 기술" },
  { re: /은행|금융|증권|캐피탈|카드|보험|지주|홀딩스|bank|financ|capital|insur|jpmorgan|goldman/i, icon: Landmark, image: SEC_IMG("financials"), hue: "#52606d", label: "금융", flavor: "자본의 흐름을 설계해 신뢰의 네트워크를 구축하는 곳.", keyword: "유동성" },
  { re: /자동차|모비스|타이어|모터|현대차|기아|auto|motor|\bcar\b|tesla|ford|toyota/i, icon: CarFront, image: SEC_IMG("automobiles"), hue: "#3b6fc4", label: "자동차", flavor: "바퀴 위에서 이동의 미래를 실현하는 엔지니어링의 결정체.", keyword: "생산력" },
  { re: /조선|해운|중공업|marine|ship|해양/i, icon: Ship, image: SEC_IMG("transportation"), hue: "#1d94c9", label: "조선·해운", flavor: "대양을 가르는 강철 선체로 세계 무역을 실어나른다.", keyword: "물류" },
  { re: /건설|엔지니어|건축|시멘트|construc|engineer|cement/i, icon: Construction, image: SEC_IMG("industrials"), hue: "#6b8e35", label: "건설", flavor: "도시의 뼈대를 세우고 미래의 스카이라인을 그린다.", keyword: "수주" },
  { re: /에너지|전력|가스|정유|석유|원전|태양|energy|oil|power|solar|exxon|chevron/i, icon: Zap, image: SEC_IMG("energy"), hue: "#d2691e", label: "에너지", flavor: "빛과 동력을 공급해 산업의 맥박을 뛰게 하는 원천.", keyword: "공급망" },
  { re: /화학|케미|소재|섬유|폴리|chem|material/i, icon: FlaskConical, image: SEC_IMG("materials"), hue: "#3568a8", label: "화학·소재", flavor: "분자 단위의 혁신으로 모든 산업의 기초를 완성한다.", keyword: "소재 경쟁력" },
  { re: /철강|금속|포스코|steel|metal|alum/i, icon: Factory, image: SEC_IMG("materials"), hue: "#3568a8", label: "철강·금속", flavor: "불과 압력으로 세상을 지탱하는 뼈대를 벼려낸다.", keyword: "원가 경쟁력" },
  { re: /통신|텔레콤|kt|skt|telecom|networ|verizon|comcast/i, icon: RadioTower, image: SEC_IMG("communication"), hue: "#4f5fbf", label: "통신", flavor: "보이지 않는 전파로 세계를 하나로 연결한다.", keyword: "네트워크" },
  { re: /게임|엔터|미디어|콘텐츠|넷마블|엔씨|크래프톤|game|media|netflix|disney|entertain/i, icon: Gamepad2, image: SEC_IMG("media_entertainment"), hue: "#8b2fb0", label: "게임·엔터", flavor: "상상을 픽셀로, 즐거움을 콘텐츠로 빚어내는 창작소.", keyword: "IP 파워" },
  { re: /식품|푸드|제과|음료|주류|라면|food|bever|coca|pepsi|nestle/i, icon: Soup, image: SEC_IMG("cons_staples"), hue: "#c98a1e", label: "식품", flavor: "누군가의 식탁 위에 매일 신뢰를 올려놓는다.", keyword: "브랜드 신뢰" },
  { re: /유통|마트|리테일|백화|커머스|이마트|쿠팡|retail|amazon|walmart|shop/i, icon: ShoppingCart, image: SEC_IMG("diversified"), hue: "#4f9e42", label: "유통", flavor: "생산자와 소비자를 잇는 거대한 흐름의 관문.", keyword: "판매망" },
  { re: /항공|우주|방산|aero|defense|boeing|lockheed/i, icon: PlaneTakeoff, image: SEC_IMG("industrials"), hue: "#6b8e35", label: "항공·방산", flavor: "하늘과 안보의 경계를 지키는 첨단 기술의 결집체.", keyword: "기술 우위" },
  { re: /패션|의류|화장품|뷰티|아모레|fashion|cosmet|nike|beauty/i, icon: Shirt, image: SEC_IMG("cons_discretionary"), hue: "#c94a3d", label: "패션·뷰티", flavor: "취향과 자신감을 디자인하는 감각의 산업.", keyword: "브랜드 파워" },
  { re: /소프트|플랫폼|클라우드|인터넷|카카오|네이버|soft|cloud|internet|google|meta|microsoft/i, icon: Code2, image: SEC_IMG("it"), hue: "#2f7dd6", label: "소프트웨어", flavor: "코드 몇 줄로 세상의 방식을 다시 쓰는 플랫폼.", keyword: "확장성" },
];
const SECTOR_FALLBACK: SectorInfo[] = [
  { icon: Gem, image: SEC_IMG("value_stock"), hue: "#c99a2e", label: "가치주", flavor: "저평가된 가치, 시장이 아직 알아보지 못한 원석.", keyword: "저평가" },
  { icon: TrendingUp, image: SEC_IMG("growth_stock"), hue: "#1d5fa8", label: "성장주", flavor: "가파른 곡선 위에서 다음 시대를 선점한다.", keyword: "성장성" },
  { icon: Compass, image: SEC_IMG("compass_voyage"), hue: "#8a6d3f", label: "탐험", flavor: "지도에 없는 시장을 개척하는 최전선의 도전자.", keyword: "개척" },
  { icon: Anchor, image: SEC_IMG("utilities"), hue: "#14a08f", label: "블루칩", flavor: "오랜 시간 검증된 안정감, 흔들리지 않는 기둥.", keyword: "안정성" },
  { icon: MapIcon, image: SEC_IMG("new_continent"), hue: "#d4820f", label: "신대륙", flavor: "아직 발견되지 않은 기회의 땅을 향해 나아간다.", keyword: "잠재력" },
  { icon: MedalIcon, image: SEC_IMG("bluechip_shield"), hue: "#c9a227", label: "우량주", flavor: "탄탄한 재무구조로 어떤 파도에도 흔들리지 않는다.", keyword: "재무 건전성" },
  { icon: Landmark, image: SEC_IMG("dividend_stock"), hue: "#2f7d4f", label: "배당주", flavor: "꾸준한 배당으로 현금흐름을 돌려주는 신뢰의 나무.", keyword: "배당수익률" },
  { icon: Dna, image: SEC_IMG("esg_invest"), hue: "#5b3a8f", label: "ESG 투자", flavor: "환경·사회·지배구조를 함께 고려하는 책임 있는 투자.", keyword: "ESG 등급" },
  { icon: Construction, image: SEC_IMG("reits"), hue: "#3f7d4f", label: "리츠", flavor: "부동산에서 나오는 안정적인 임대수익을 나눠 갖는다.", keyword: "임대수익률" },
  { icon: Construction, image: SEC_IMG("infra_invest"), hue: "#1e5c8a", label: "인프라 투자", flavor: "다리와 길처럼, 세상의 기반을 놓는 오래가는 투자.", keyword: "인프라 안정성" },
  { icon: CarFront, image: SEC_IMG("ev_mobility"), hue: "#1f8a7a", label: "전기차·모빌리티", flavor: "충전 한 번으로 달리는 이동수단의 미래.", keyword: "충전 인프라" },
  { icon: ShoppingCart, image: SEC_IMG("consumer_brand"), hue: "#a8791e", label: "소비재·브랜드", flavor: "일상 속 브랜드 파워로 꾸준히 사랑받는 소비재.", keyword: "브랜드 충성도" },
  { icon: Compass, image: SEC_IMG("risk_challenge"), hue: "#2c4f66", label: "위험과 도전", flavor: "거친 파도를 넘어야 더 큰 성장이 보인다.", keyword: "리스크 관리" },
  { icon: Gem, image: SEC_IMG("gold_discovery"), hue: "#b8860b", label: "황금의 발견", flavor: "묻혀 있던 가치를 가장 먼저 찾아내는 안목.", keyword: "발굴력" },
  { icon: Ship, image: SEC_IMG("trade_expansion"), hue: "#6b5030", label: "무역의 확장", flavor: "손을 맞잡고 시장을 넓혀가는 교역의 힘.", keyword: "글로벌 네트워크" },
  { icon: Compass, image: SEC_IMG("pioneer_spirit"), hue: "#c9711e", label: "개척자의 정신", flavor: "끊임없는 도전과 혁신으로 새로운 길을 개척한다.", keyword: "혁신성" },
  { icon: Ship, image: SEC_IMG("harbor_town"), hue: "#2a6b8a", label: "무역항", flavor: "성공적인 투자를 통해 풍요와 안정을 이룬 항구.", keyword: "안정적 수익" },
  { icon: TrendingUp, image: SEC_IMG("business_cycle"), hue: "#5a7a4a", label: "경기순환", flavor: "경기의 흐름을 이해하고 사이클에 맞는 투자를 한다.", keyword: "타이밍" },
  { icon: MedalIcon, image: SEC_IMG("diversification"), hue: "#8a6d3f", label: "분산투자", flavor: "다양한 자산에 나눠 담아 위험을 줄이고 안정성을 높인다.", keyword: "포트폴리오" },
  { icon: MedalIcon, image: SEC_IMG("long_term_invest"), hue: "#9a7a3f", label: "장기투자", flavor: "시간의 힘을 믿고 인내하며 복리의 효과를 누린다.", keyword: "복리 효과" },
  { icon: Landmark, image: SEC_IMG("cash_flow"), hue: "#4a7a5a", label: "현금흐름", flavor: "지속적인 현금흐름을 창출하는 기업과 자산에 투자한다.", keyword: "잉여현금흐름" },
  { icon: Gem, image: SEC_IMG("value_creation"), hue: "#2f6b5a", label: "가치 창출", flavor: "기업의 본질적 가치를 키워 주주와 사회에 보답한다.", keyword: "내재가치" },
  { icon: TrendingUp, image: SEC_IMG("innovation_growth"), hue: "#2f5a8a", label: "혁신 성장", flavor: "혁신과 기술로 미래를 선도하며 꾸준한 성장을 이어간다.", keyword: "R&D 투자" },
  { icon: MapIcon, image: SEC_IMG("global_invest"), hue: "#2f4a7a", label: "글로벌 투자", flavor: "세계 시장을 무대로 더 넓은 기회를 포착한다.", keyword: "해외 매출 비중" },
  { icon: TrendingUp, image: SEC_IMG("sustainable_growth"), hue: "#3f7a4f", label: "지속가능 성장", flavor: "지속가능한 성장을 통해 미래 세대와 함께 번영한다.", keyword: "지속가능성" },
  { icon: TrendingUp, image: SEC_IMG("education"), hue: "#b8622a", label: "인재 양성", flavor: "배움과 지식의 가치를 전하며 미래 인재를 키운다.", keyword: "인적자본" },
  { icon: Landmark, image: SEC_IMG("value_building"), hue: "#2f6fa8", label: "가치주", flavor: "기업의 내재가치 대비 저평가된 주식에 투자하여 안정적인 수익을 추구한다.", keyword: "내재가치 대비" },
  { icon: TrendingUp, image: SEC_IMG("growth_leaf"), hue: "#3f8f4f", label: "성장주", flavor: "높은 성장 잠재력을 가진 기업에 투자하여 미래의 가치를 선점한다.", keyword: "성장 잠재력" },
  { icon: Gem, image: SEC_IMG("won_coin"), hue: "#c9971e", label: "배당주", flavor: "꾸준한 배당을 지급하는 기업에 투자하여 안정적인 현금흐름과 복리의 힘을 누린다.", keyword: "현금흐름" },
  { icon: Bot, image: SEC_IMG("theme_stock"), hue: "#7c3fb0", label: "테마주", flavor: "시대의 흐름을 이끄는 테마에 투자해 구조적 성장을 추구하고 미래의 변화를 먼저 읽어낸다.", keyword: "테마 선점력" },
  { icon: MedalIcon, image: SEC_IMG("shield_laurel"), hue: "#2f6fb0", label: "우량주", flavor: "재무구조가 건실하고 경쟁력이 뛰어난 우량 기업에 투자하여 위기 속에서도 빛나는 기업을 선택한다.", keyword: "재무 안정성" },
  { icon: Ship, image: SEC_IMG("new_continent2"), hue: "#1f9ac9", label: "신대륙 발견", flavor: "미지의 시장과 기회를 개척하여 새로운 가치를 발견한다.", keyword: "시장 개척" },
  { icon: Gem, image: SEC_IMG("gold_land"), hue: "#8a6018", label: "황금의 땅", flavor: "숨겨진 자산과 기업을 발굴하여 가치를 극대화한다.", keyword: "자산 발굴" },
  { icon: Compass, image: SEC_IMG("risk_scale"), hue: "#c05a2a", label: "위험과 기회", flavor: "높은 위험 속에 큰 기회가 존재한다. 리스크를 이해하고 통제할 때 보상이 따른다.", keyword: "리스크 관리" },
  { icon: MedalIcon, image: SEC_IMG("hourglass2"), hue: "#d98a1e", label: "장기 투자", flavor: "시간의 힘을 믿고 인내하며 복리의 효과를 누린다.", keyword: "복리 효과" },
  { icon: MapIcon, image: SEC_IMG("global_expand"), hue: "#1f6a8a", label: "글로벌 확장", flavor: "세계 시장을 무대로 다양한 국가와 산업에 투자하여 성장 기회를 넓힌다.", keyword: "해외 확장성" },
];
function sectorArt(item: any): SectorInfo {
  const hay = `${item?.name ?? ""} ${item?.ticker ?? ""}`;
  for (const s of SECTORS) if (s.re.test(hay)) return s;
  const h = [...String(item?.ticker ?? item?.name ?? "")].reduce((a, c) => a + c.charCodeAt(0), 0);
  return SECTOR_FALLBACK[h % SECTOR_FALLBACK.length];
}
// 카드 아트에 쓰는 업종 사진 전체(중복 제거) — 마운트 시 미리 로드해두면 카드가 바뀔 때마다 재요청 없이 캐시에서 즉시 표시됨.
const ALL_SECTOR_IMAGES = Array.from(new Set([...SECTORS, ...SECTOR_FALLBACK].map(s => s.image).filter(Boolean))) as string[];

// 저평가 점수 설명 툴팁 (마우스 오버 + 클릭, 모바일 대응)
function ScoreInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="저평가 점수 설명" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-neutral-400 hover:text-[#16a34a] transition-colors">
        <Info size={13} />
      </button>
      {open && (
        // 모바일(<640px)에선 화면에 고정된 패널로(트리거 위치와 무관하게 항상 화면 안에 보임),
        // 모바일 하단 탭바(h-[64px], z-40)에 가리지 않도록 그 위로 띄우고 z-index도 더 높임.
        // sm 이상(하단 탭바 없음)에선 아이콘 옆에 뜨는 툴팁으로.
        <span className="fixed z-50 inset-x-4 bottom-20 sm:absolute sm:z-30 sm:inset-x-auto sm:left-0 sm:bottom-full sm:mb-2 sm:w-72 rounded-xl bg-neutral-900 dark:bg-[#242320] border border-neutral-700/60 dark:border-[#35332e] p-3 text-[11px] leading-relaxed text-neutral-200 shadow-xl text-left font-medium break-keep">
          <b className="text-white">저평가 점수 (0~100)</b><br />
          NCAV·PBR·PER·ROE를 가중 평균해 점수화(값 없는 지표는 제외, 적자·자본잠식 등 음수 지표는 0점):
          <span className="block mt-1.5 space-y-0.5 text-neutral-300">
            <span className="block">· NCAV 40% — 1.5배↑ 만점, 0.3배↓ 0점</span>
            <span className="block">· PBR 25% — 0.3↓ 만점, 1.5↑ 0점</span>
            <span className="block">· PER 20% — 5↓ 만점, 20↑ 0점</span>
            <span className="block">· ROE 15% — 18%↑ 만점, 3%↓ 0점</span>
          </span>
          <span className="block mt-1.5 text-neutral-300">
            등급: 👑SS 전설 90+ · 🏆S 보물 80+ · 💎A 다이아 70+ · 🥇B 금 62+<br />
            🥈C 은 54+ · 🥉D 동 46+ · 🔩E 철 38+ · 🪨F 원석 30+<br />
            🟤G 흙 20+ · 🧭H 탐색 그 외
          </span>
        </span>
      )}
    </span>
  );
}

// 등급 젬 배지 — 발광 젬 방울 + 메달 이모지. (카드/획득칩 공용)
export function WaxSeal({ item, size = 26 }: { item: any; size?: number }) {
  const v = computeValueScore(item);
  const c = TIER[v.tone] ?? TIER.explore;
  return (
    <span className="relative shrink-0 inline-flex items-center justify-center rounded-full"
      style={{ width: size, height: size,
        background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.6), ${c.glow} 55%, rgba(0,0,0,0.5))`,
        boxShadow: `0 0 8px ${rgba(c.glow, 0.8)}, inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -3px 5px rgba(0,0,0,0.4)` }}>
      <span aria-hidden className="leading-none" style={{ fontSize: size * 0.5, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}>{v.medal}</span>
    </span>
  );
}

// 등급 내 카드 번호(예: S-1) — 도감(catalog) 기준 등급별 점수 내림차순 순번. TcgCard 의 rank prop 에 꽂아줌.
function buildTierRankMap(catalog: any[]): Map<string, number> {
  const byTone = new Map<string, any[]>();
  for (const c of catalog) {
    const tone = computeValueScore(c).tone;
    if (!byTone.has(tone)) byTone.set(tone, []);
    byTone.get(tone)!.push(c);
  }
  const map = new Map<string, number>();
  for (const list of byTone.values()) {
    list.sort((a, b) => computeValueScore(b).score - computeValueScore(a).score);
    list.forEach((c, i) => map.set(String(c.ticker), i + 1));
  }
  return map;
}

// 종목 카드 — 실물 TCG(그리드 아일랜드 카드) 레이아웃 그대로: 검정 카드지 + 명패(점수·이름·코드) +
// 어두운 아트창(업종 심볼+로고) + 대리석 테두리 룰박스(플레이버+효과, 등급색) + 하단 인쇄줄(티커·시가총액).
// 레퍼런스 카드엔 사진 아트가 들어가지만 이미지 생성 API가 없어 업종별 벡터 심볼(lucide)로 대체 — 레이아웃/구획은 그대로 유지.
// hero=플레이용(큼), 미지정=덱 콤팩트. 룰박스는 shrink-0 로 항상 온전히 보이고, 아트창만 flex-1 로 크기에 맞춰 줄어듦.
function TcgCard({ item, value, hero = false, count, locked = false, rank, onGuess, onNext }:
  { item: any; value: React.ReactNode; hero?: boolean; count?: number; idleDelay?: number; locked?: boolean; rank?: number; onGuess?: (dir: "higher" | "lower") => void; onNext?: () => void }) {
  const [showInfo, setShowInfo] = useState(false);
  const v = computeValueScore(item);
  const c = TIER[v.tone] ?? TIER.explore;
  const sec = sectorArt(item);
  const Icon = sec.icon;
  const bonus = EFFECT_BONUS[v.tone] ?? 1;
  const holo = !locked && count != null && count >= HOLO_THRESHOLD;
  const displayName = locked ? "???" : item.name;
  const displayTicker = locked ? "??????" : item.ticker;
  // 룰박스 대리석 — 레퍼런스 카드 실물 사진과 동일하게 등급 무관 고정 마룬(적갈색) 톤으로 통일.
  // 등급 구분은 배지(MEDAL_TONE)·글로우(PortMedallion)·홀로 등 다른 요소로 남긴다.
  const marbleBase = "linear-gradient(135deg, #7a1830, #4a0f20 28%, #9c2c48 52%, #3d0c1a 74%, #7a1830)";
  const marble = `radial-gradient(30% 45% at 18% 22%, rgba(255,255,255,0.22), transparent 60%), radial-gradient(26% 40% at 82% 75%, rgba(0,0,0,0.35), transparent 60%), radial-gradient(20% 30% at 70% 15%, rgba(255,255,255,0.15), transparent 60%), ${marbleBase}`;
  const line = "rgba(0,0,0,0.55)";
  // 명패 구분 기둥 — 레퍼런스 카드의 리벳 캡 달린 세로 기둥(핀) 장식을 복제
  const Pillar = () => (
    <span aria-hidden className="relative z-[3] shrink-0" style={{ width: hero ? 9 : 7 }}>
      <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-full"
        style={{ width: hero ? 5 : 4, background: "linear-gradient(180deg,#2e3546,#12141a)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)" }} />
      <span className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{ top: hero ? -4 : -3, width: hero ? 8 : 6.5, height: hero ? 8 : 6.5, background: "linear-gradient(160deg,#454e63,#14161c)", boxShadow: "0 0 0 1px rgba(0,0,0,0.7)" }} />
      <span className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{ bottom: hero ? -4 : -3, width: hero ? 8 : 6.5, height: hero ? 8 : 6.5, background: "linear-gradient(160deg,#454e63,#14161c)", boxShadow: "0 0 0 1px rgba(0,0,0,0.7)" }} />
    </span>
  );
  return (
    <div className={cn("relative w-full h-full flex flex-col overflow-hidden rounded-[5%] transition-transform duration-200 ease-out hover:-translate-y-1 p-[3.5%]", locked && "grayscale-[0.85] brightness-[0.65]")}
      style={{ background: "linear-gradient(160deg,#232323,#0c0c0c)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 4px 14px -6px rgba(0,0,0,0.6)" }}>
      {holo && <HoloOverlay tone={v.tone} />}
      {/* 명패+아트 존 — 상아색 카드지 한 장. 명패는 카드지 가장자리까지 꽉 차고, 아트는 사진 매트처럼 안쪽에 여백을 두고 액자처럼 삽입 */}
      <div className="relative shrink-0 flex flex-col overflow-hidden"
        style={{ background: "linear-gradient(175deg,#ece4cf,#ddd0a6)", flex: "1 1 auto", minHeight: 0 }}>
        {/* 명패: 티커 | 종목명 | 등급-순번 — 레퍼런스와 동일한 리벳 기둥 구분선 */}
        <div className="relative z-[2] shrink-0 flex items-stretch border-b-2" style={{ borderColor: line }}>
          <div className="flex items-center justify-center shrink-0 px-1" style={{ minWidth: hero ? 26 : 20 }}>
            <span className="font-mono tracking-tight truncate" style={{ fontSize: hero ? 8 : 6.5, color: "#4a3f2a" }}>{displayTicker}</span>
          </div>
          <Pillar />
          <div className="flex-1 min-w-0 flex items-center justify-center px-1 py-[3%]">
            <p className={cn("font-serif font-bold truncate", hero ? "text-[13px]" : "text-[10.5px]")} style={{ color: "#221c10" }}>{displayName}</p>
          </div>
          <Pillar />
          <div className="flex items-center justify-center shrink-0 px-1" style={{ minWidth: hero ? 30 : 24 }}>
            {locked ? (
              <span className="font-serif font-black tabular-nums" style={{ fontSize: hero ? 12 : 9.5, color: "#221c10" }}>{v.grade}{rank != null && `-${rank}`}</span>
            ) : (
              <button type="button"
                onClick={e => { e.stopPropagation(); setShowInfo(s => !s); }}
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
                className="font-serif font-black tabular-nums underline decoration-dotted decoration-1 underline-offset-2 cursor-help"
                style={{ fontSize: hero ? 12 : 9.5, color: "#221c10" }}
                aria-label="점수 계산 내역 보기">
                {v.grade}{rank != null && `-${rank}`}
              </button>
            )}
          </div>
        </div>

        {/* 아트 매트: 명패 아래 크림색 여백을 두고 그 안에 검정 액자 + 아트창을 배치 (레퍼런스의 사진 매트 프레임) */}
        <div className="relative flex-1 min-h-[42px] p-[3%]">
          <div className="relative w-full h-full overflow-hidden" style={{ background: "#181312", padding: "2.5%" }}>
            <div className="relative w-full h-full overflow-hidden" style={{ background: (sec.image && !locked) ? "#0c0a08" : `radial-gradient(120% 90% at 50% 30%, ${rgba(sec.hue, 0.35)}, transparent 65%), linear-gradient(155deg, #2a2015, #14100a)` }}>
              {locked ? (
                <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                  <Icon className="w-[40%] h-[40%]" style={{ color: rgba(sec.hue, 0.5) }} strokeWidth={1.15} />
                  <Lock className="absolute w-[26%] h-[26%] text-white/70" strokeWidth={1.5} />
                </div>
              ) : sec.image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sec.image} alt={sec.label} loading={hero ? "eager" : "lazy"} decoding="async" fetchPriority={hero ? "high" : "auto"} className="absolute inset-0 w-full h-full object-cover" />
                  {/* 사진 비네트 — 레퍼런스 사진 특유의 가장자리 음영 */}
                  <div aria-hidden className="absolute inset-0" style={{ boxShadow: "inset 0 0 14px 2px rgba(0,0,0,0.45)" }} />
                </>
              ) : (
                <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                  <Icon className="w-[46%] h-[46%]" style={{ color: rgba(sec.hue, 0.85) }} strokeWidth={1.15} />
                </div>
              )}
              {/* 종목 로고 — 업종 사진이 있으면 가리지 않도록 우하단 작은 배지로, 없으면(벡터 심볼일 때) 중앙에. 잠금 카드는 정체를 가려야 하므로 렌더 안 함 */}
              {!locked && (
                <div className={cn("absolute z-[2]", sec.image ? "bottom-1 right-1" : "inset-0 flex justify-center items-center")}>
                  <PortMedallion item={item} size={sec.image ? (hero ? 34 : 26) : (hero ? 56 : 40)} lift={hero} />
                </div>
              )}
              {!locked && count != null && count > 1 && (
                <span className="absolute top-1 left-1 z-[3] px-1.5 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-black tabular-nums leading-none">×{count}</span>
              )}
              {/* 높다/낮다 — 카드(아트창) 상/하단 전체를 탭 영역으로 쓰되, 실제 버튼처럼 보이는 알약 배지를 중앙에 배치 */}
              {onGuess && (
                <>
                  <button type="button" aria-label="높다" onClick={e => { e.stopPropagation(); onGuess("higher"); }}
                    className="group absolute inset-x-0 top-0 h-1/2 z-[6] flex items-center justify-center bg-gradient-to-b from-transparent via-transparent to-black/10 hover:to-black/25 transition-colors">
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 shadow-lg transition-transform group-active:scale-90"
                      style={{ padding: hero ? "7px 16px" : "4px 10px", background: "linear-gradient(160deg,#232323,#0c0c0c)", borderColor: "#16a34a", boxShadow: "0 4px 14px -4px rgba(22,163,74,0.7)" }}>
                      <ArrowUp size={hero ? 16 : 12} strokeWidth={3} className="text-[#16a34a]" />
                      <span className="font-serif font-black" style={{ fontSize: hero ? 12 : 9, color: "#ece4cf" }}>높다</span>
                    </span>
                  </button>
                  <button type="button" aria-label="낮다" onClick={e => { e.stopPropagation(); onGuess("lower"); }}
                    className="group absolute inset-x-0 bottom-0 h-1/2 z-[6] flex items-center justify-center bg-gradient-to-t from-transparent via-transparent to-black/10 hover:to-black/25 transition-colors">
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 shadow-lg transition-transform group-active:scale-90"
                      style={{ padding: hero ? "7px 16px" : "4px 10px", background: "linear-gradient(160deg,#232323,#0c0c0c)", borderColor: "#e11d48", boxShadow: "0 4px 14px -4px rgba(225,29,72,0.7)" }}>
                      <span className="font-serif font-black" style={{ fontSize: hero ? 12 : 9, color: "#ece4cf" }}>낮다</span>
                      <ArrowDown size={hero ? 16 : 12} strokeWidth={3} className="text-[#e11d48]" />
                    </span>
                  </button>
                </>
              )}
              {/* 정답 시 다음 카드 — 별도 버튼 대신 카드 위 동일한 알약 배지로 통합 */}
              {onNext && (
                <button type="button" aria-label="다음 카드" onClick={e => { e.stopPropagation(); onNext(); }}
                  className="group absolute inset-0 z-[6] flex items-center justify-center bg-black/0 hover:bg-black/15 transition-colors animate-in fade-in">
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 shadow-lg transition-transform group-active:scale-90"
                    style={{ padding: hero ? "8px 18px" : "5px 12px", background: "linear-gradient(160deg,#232323,#0c0c0c)", borderColor: "#16a34a", boxShadow: "0 4px 14px -4px rgba(22,163,74,0.7)" }}>
                    <span className="font-serif font-black" style={{ fontSize: hero ? 13 : 10, color: "#ece4cf" }}>다음 카드</span>
                    <TrendingUp size={hero ? 16 : 12} strokeWidth={3} className="text-[#16a34a]" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 검정 여백 — 아트존과 룰박스 사이 (레퍼런스의 카드지 마진, 카드 크기에 비례) */}
      <div className="shrink-0 h-[2.2%]" />

      {/* 룰박스: 마룬 대리석 테두리(레퍼런스와 동일한 고정색, 둥근 인셋 박스) + 회청색 바탕 텍스트 — 플레이버 + 효과. shrink-0, 항상 온전히 보임 */}
      <div className="relative z-[2] shrink-0 p-[4%]" style={{ background: marble }}>
        <div className="rounded-lg px-2 py-2" style={{ background: "#c8d2d6", boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.8)" }}>
          <p className="font-bold uppercase tracking-wide" style={{ fontSize: hero ? 8 : 6.5, color: sec.hue }}>{sec.label}</p>
          <p className={cn("leading-snug break-keep mt-0.5", hero ? "line-clamp-2" : "line-clamp-1")} style={{ fontSize: hero ? 10 : 7.5, color: "#181818" }}>{sec.flavor}</p>
          <p className="leading-snug break-keep mt-1" style={{ fontSize: hero ? 9 : 7, color: "#181818" }}>
            "{sec.keyword}" 관련 발굴 확률 <b style={{ color: c.accent }}>+{bonus}%p</b>
          </p>
        </div>
      </div>

      {/* 하단 인쇄줄 — 레퍼런스의 저작권 표기 자리에 시가총액(게임 진행에 필요한 실 스탯) */}
      <div className="relative z-[2] shrink-0 flex items-center justify-end gap-1 px-0.5 pt-[2%]">
        <span className={cn("font-serif font-extrabold whitespace-nowrap leading-none flex items-center gap-1", hero ? "text-sm" : "text-[11px]")}>
          <span className="font-sans font-bold opacity-60" style={{ fontSize: hero ? 7.5 : 6.5, color: "#cbc6ba" }}>{STAT.label}</span>
          <span style={{ color: c.glow }}>{value}</span>
        </span>
      </div>

      {/* 점수 계산 내역 — 명패 점수 클릭/오버 시 카드 안쪽에 오버레이(카드 밖으로 안 나가 overflow-hidden에 안전) */}
      {showInfo && !locked && (
        <div className="absolute inset-0 z-[7] flex flex-col justify-center gap-1 bg-black p-[6%]"
          onClick={e => { e.stopPropagation(); setShowInfo(false); }}>
          <p className="font-serif font-black text-center" style={{ fontSize: hero ? 13 : 10, color: c.glow }}>저평가 점수 {v.score}</p>
          <div className="space-y-[3%] mt-1">
            {v.parts.map(p => (
              <div key={p.key} className="flex items-center justify-between" style={{ fontSize: hero ? 9.5 : 7 }}>
                <span className="font-bold text-neutral-300">{p.label}</span>
                {p.available ? (
                  <span className="tabular-nums text-neutral-400">
                    {p.valueStr} → <b className="text-white">{Math.round(p.sub * 100)}</b>
                    <span className="text-neutral-500">×{Math.round(p.weight * 100)}%</span>
                  </span>
                ) : (
                  <span className="text-neutral-500">데이터 없음</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-neutral-500 mt-1" style={{ fontSize: hero ? 8 : 6.5 }}>탭하면 닫혀요</p>
        </div>
      )}
    </div>
  );
}

const fmtCap = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}조` : `${Math.round(v).toLocaleString()}억`);

// 항해 종료 시 틀린 종목 정보 카드 (무엇을 놓쳤는지 + 그 종목 지표 학습)
function MissedInfo({ missed }: { missed: any }) {
  const c = missed.challenger;
  const v = computeValueScore(c);
  const byKey = Object.fromEntries(v.parts.map(p => [p.key, p]));
  const metrics = [
    { label: "시총", value: fmtCap(safeNum(c.market_cap)) },
    { label: "NCAV", value: byKey.ncav.valueStr },
    { label: "PBR", value: byKey.pbr.valueStr },
    { label: "PER", value: byKey.per.valueStr },
    { label: "ROE", value: byKey.roe.valueStr },
  ];
  return (
    <div className="text-left rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-2.5">
      <p className="text-[11px] font-black text-rose-500 mb-1.5">아깝게 놓친 종목</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 break-keep leading-relaxed">
        <b className="text-neutral-800 dark:text-neutral-200">{c.name}</b>의 {missed.statLabel}
        <b className="text-neutral-700 dark:text-neutral-300"> {missed.challengerStr}</b>은{" "}
        {missed.anchor.name}({missed.anchorStr})보다{" "}
        <b className={missed.higherSide === "challenger" ? "text-[#16a34a]" : "text-rose-500"}>
          {missed.higherSide === "challenger" ? "높았어요" : "낮았어요"}
        </b>.
      </p>
      <div className="flex items-center gap-2 mb-2">
        <PortMedallion item={c} size={40} />
        <Medal item={c} lg />
        <ScoreInfo />
        <div className="min-w-0 ml-0.5">
          <p className="font-serif font-bold text-sm text-neutral-800 dark:text-neutral-100 truncate">{c.name}</p>
          <p className="text-[10px] text-neutral-500 font-mono">{c.ticker}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-2">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1.5 text-center">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">{m.label}</p>
            <p className="text-xs font-black tabular-nums text-neutral-800 dark:text-neutral-200 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* 점수 계산 과정: 지표별 서브점수 × 가중치 → 종합 (값 없는 지표는 제외) */}
      <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-2.5">
        <p className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 mb-1.5">
          점수 계산 <span className="font-medium text-neutral-400">· 값 없는 지표 제외 후 가중 평균</span>
        </p>
        <div className="space-y-1">
          {v.parts.map(p => (
            <div key={p.key} className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-neutral-600 dark:text-neutral-300">{p.label}</span>
              {p.available ? (
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {p.valueStr} → <b className="text-neutral-700 dark:text-neutral-200">{Math.round(p.sub * 100)}점</b>
                  <span className="text-neutral-400"> × {Math.round(p.weight * 100)}%</span>
                </span>
              ) : (
                <span className="text-neutral-400">데이터 없음 · 제외</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-[#35332e] flex items-center justify-between">
          <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-200">종합 점수</span>
          <span className="text-sm font-black text-[#16a34a] tabular-nums">{v.score}점</span>
        </div>
      </div>

      <Link href={`/analyze?ticker=${encodeURIComponent(c.name)}&from=game`}
        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#16a34a] hover:underline">
        이 종목 분석하기 <ChevronRight size={12} />
      </Link>
    </div>
  );
}

// 이번 항해에서 획득한 카드 목록 (종료 화면). 같은 종목은 ×N 합산, 점수 높은 순.
function AcquiredThisGame({ cards }: { cards: DeckCardSnapshot[] }) {
  const agg = useMemo(() => {
    const m = new Map<string, { item: DeckCardSnapshot; count: number }>();
    for (const c of cards) {
      const e = m.get(c.ticker);
      if (e) e.count++; else m.set(c.ticker, { item: c, count: 1 });
    }
    return [...m.values()].sort((a, b) => computeValueScore(b.item).score - computeValueScore(a.item).score);
  }, [cards]);

  return (
    <div className="text-left rounded-2xl border border-[#86efac]/60 dark:border-[#166534]/50 bg-[#f0fdf4]/60 dark:bg-[#052e16]/20 p-2.5">
      <p className="text-[11px] font-black text-[#15803d] dark:text-[#16a34a] mb-1.5 flex items-center gap-1">
        <Sparkles size={12} /> 이번 항해 획득 {cards.length}장
      </p>
      {/* 가로 스트립 — 카드 수가 많아도 높이가 고정(한 화면 유지). 좌우로 슬라이드 */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-hide">
        {agg.map(({ item: c, count }) => (
          <div key={c.ticker} className="relative shrink-0 flex items-center gap-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 py-1.5 pl-1.5 pr-2.5 text-neutral-700 dark:text-neutral-200">
            {count > 1 && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full bg-neutral-800 text-white text-[9px] font-black tabular-nums leading-none">×{count}</span>
            )}
            <PortMedallion item={c} size={26} />
            <div className="min-w-0 flex items-center gap-1.5">
              <p className="font-serif font-bold text-[11px] truncate max-w-[64px]">{c.name}</p>
              <WaxSeal item={c} size={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 이번 항해(연승) 기록 기반 등급 (전역 리더보드 대신 자체 랭크)
function rankOf(streak: number): { emoji: string; title: string } {
  if (streak >= 15) return { emoji: "👑", title: "전설의 선장" };
  if (streak >= 10) return { emoji: "🚢", title: "제독" };
  if (streak >= 6) return { emoji: "⚓", title: "선장" };
  if (streak >= 3) return { emoji: "🧭", title: "항해사" };
  return { emoji: "⛵", title: "견습 항해사" };
}

type Phase = "loading" | "guessing" | "revealed" | "over";

export default function GamePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const ncav = useAppSelector(selectNcavDailyList);
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const requireLogin = useCallback(() => {
    router.push(`/login?callbackUrl=${encodeURIComponent("/game")}`);
  }, [router]);

  const [anchor, setAnchor] = useState<any | null>(null);
  const [challenger, setChallenger] = useState<any | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false); // 이번 판에 최고 기록 경신
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [dropped, setDropped] = useState(false);      // 이번 라운드 카드 획득(로그인)
  const [dropPrompt, setDropPrompt] = useState(false); // 카드가 떴지만 로그인 필요
  const [saveFail, setSaveFail] = useState<string | null>(null); // 덱 저장 실패 사유
  const [escaped, setEscaped] = useState<string | null>(null); // 높은 등급 카드가 도망감(메달)
  const [deck, setDeck] = useState<DeckItem[]>([]);
  const [showDeck, setShowDeck] = useState(false);
  const [missed, setMissed] = useState<any | null>(null); // 항해 종료 시 틀린 종목 정보
  const [acquired, setAcquired] = useState<DeckCardSnapshot[]>([]); // 이번 항해에서 획득한 카드
  const [history, setHistory] = useState<any[]>([]); // 지나온 비교 카드(왼쪽으로 쌓임) — 슬라이드로 항해 기록 확인
  const trackRef = useRef<HTMLDivElement>(null); // 카드 필름스트립(가로 스크롤)
  const jumpScrollRef = useRef(false); // true면 다음 스크롤을 애니메이션 없이 즉시 이동(게임 재개용)
  const [coins, setCoins] = useState(0); // 지갑 코인 잔액
  const [showShop, setShowShop] = useState(false);
  const [activeBoost, setActiveBoost] = useState<{ mult: number; roundsLeft: number } | null>(null); // 상점 부스트(세션 로컬)
  const [packOpening, setPackOpening] = useState(false); // 팩 오픈 리빌 연출 표시 중
  const [firstDupHint, setFirstDupHint] = useState(false); // 첫 중복 카드 획득 시 지갑/전환 안내

  useEffect(() => { dispatch(reqGetNcavDailyList("latest")); }, [dispatch]);

  // 카드 아트(업종 사진) 전체를 미리 로드 — 첫 카드가 뜨기 전에 브라우저 캐시에 올려둬서 다음 라운드에 지연 없이 표시.
  useEffect(() => {
    for (const src of ALL_SECTOR_IMAGES) { const img = new window.Image(); img.src = src; }
  }, []);

  // 로그인 상태면 계정 덱 로드
  useEffect(() => {
    if (!isLoggedIn) { setDeck([]); return; }
    let cancelled = false;
    getDeck().then(res => {
      if (cancelled || !res?.success || !Array.isArray(res.data)) return;
      setDeck(res.data.map((r: any) => ({ ticker: r.ticker, name: r.name, ...(r.card ?? {}), count: r.count ?? 1 })));
    }).catch(() => { });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // 로그인 상태면 지갑(코인·서버 최고 연승) 로드 — 서버 값과 로컬 값 중 큰 쪽을 최종 best로 병합
  useEffect(() => {
    if (!isLoggedIn) { setCoins(0); return; }
    let cancelled = false;
    getWallet().then(res => {
      if (cancelled || !res?.success) return;
      setCoins(res.coins ?? 0);
      setBest(b => Math.max(b, res.best_streak ?? 0));
    }).catch(() => { });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // 비교 가능한 종목 풀 (시가총액 보유 종목)
  const pool = useMemo(() => {
    const list = Array.isArray(ncav.list) ? ncav.list : [];
    return list.filter((it: any) => it?.name && it?.ticker && STAT.get(it) > 0);
  }, [ncav.list]);

  // 도감(완성도) 총량 스냅샷 — 세션 진입 시 1회 고정해 스캔 진행 중에도 완성률이 들쭉날쭉 보이지 않게 함
  const poolSnapshotRef = useRef<any[] | null>(null);
  useEffect(() => {
    if (!poolSnapshotRef.current && pool.length >= 2) poolSnapshotRef.current = pool;
  }, [pool]);
  const catalog = useMemo(() => {
    const snap = poolSnapshotRef.current ?? pool;
    const byTicker = new Map(snap.map((it: any) => [it.ticker, it]));
    for (const d of deck) if (!byTicker.has(d.ticker)) byTicker.set(d.ticker, d); // 오늘 목록에서 빠진 보유 종목도 유지
    return [...byTicker.values()];
  }, [pool, deck]);
  const rankMap = useMemo(() => buildTierRankMap(catalog), [catalog]); // 카드 명패의 "등급-번호"(예: S-1)용

  const bestKey = "iq:game:best:hl:market_cap"; // 기존 시가총액 비교 기록 키 유지
  useEffect(() => { setBest(b => Math.max(b, safeNum(typeof window !== "undefined" ? localStorage.getItem(bestKey) : 0))); }, [bestKey]);

  const draw = useCallback((excludeTicker?: string) => {
    if (pool.length < 2) return null;
    for (let i = 0; i < 30; i++) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      if (c.ticker !== excludeTicker) return c;
    }
    return pool[0];
  }, [pool]);

  const start = useCallback(() => {
    // 틀려서 이어서 시작하는 경우 방금 틀린 카드(challenger)부터 이어감. 첫 시작은 무작위 추첨.
    const a = missed ? missed.challenger : draw();
    if (!a) return;
    jumpScrollRef.current = true; // 게임 재개 시 필름스트립이 스르르 넘어가지 않고 마지막 위치로 바로 이동
    setAnchor(a); setChallenger(draw(a.ticker));
    // 패배 라운드의 anchor도 항해 기록에 남겨 필름스트립이 끊기지 않게 하고, 최근 10개까지만 유지
    setHistory(h => (missed ? [...h, missed.anchor] : h).slice(-10));
    setStreak(0); setNewBest(false); setLastWin(null); setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setMissed(null); setAcquired([]); setPackOpening(false); setFirstDupHint(false); setPhase("guessing");
  }, [draw, missed]);

  const started = useRef(false);
  useEffect(() => {
    if (!started.current && pool.length >= 2) { started.current = true; start(); }
  }, [pool, start]);

  const guess = useCallback((dir: "higher" | "lower") => {
    if (phase !== "guessing" || !anchor || !challenger) return;
    const av = STAT.get(anchor), cv = STAT.get(challenger);
    const win = dir === "higher" ? cv >= av : cv <= av;   // 동점은 승리 처리
    setLastWin(win);
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setFirstDupHint(false);
    setPhase("revealed");

    // 상점에서 산 확률 부스트는 세션 로컬로만 추적 — 라운드(승패 무관)마다 1씩 소진
    if (activeBoost) {
      setActiveBoost(b => (b && b.roundsLeft > 1) ? { ...b, roundsLeft: b.roundsLeft - 1 } : null);
    }

    if (win) {
      const ns = streak + 1;
      setStreak(ns);
      if (ns > best) {
        setBest(ns); setNewBest(true);
        try { localStorage.setItem(bestKey, String(ns)); } catch { }
        if (isLoggedIn) syncBestStreak(ns).catch(() => { });
      }

      // 정답 카드만 수집. 연승↑ → 획득 확률↑, 높은 등급일수록 더 높은 연승 필요. 부스트 배율 적용.
      const chance = Math.min(0.95, acquireChance(challenger, ns) * (activeBoost?.mult ?? 1));
      if (Math.random() < chance) {
        const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        setPackOpening(true);
        setTimeout(() => setPackOpening(false), reduceMotion ? 50 : 650);

        if (!isLoggedIn) {
          setDropPrompt(true);
        } else {
          const snap = toCard(challenger);
          addDeckCard(snap).then(res => {
            if (res?.added) {
              setDropped(true);
              if (res.count === 2) setFirstDupHint(true); // 처음으로 중복 카드가 생긴 순간 — 전환 기능 안내
              setAcquired(prev => [snap, ...prev]); // 이번 항해 획득 목록에 추가
              // 같은 종목이면 개수 누적, 없으면 새로 추가
              setDeck(prev => {
                const i = prev.findIndex(c => c.ticker === snap.ticker);
                if (i >= 0) {
                  const next = [...prev];
                  next[i] = { ...next[i], count: res.count ?? next[i].count + 1 };
                  return next;
                }
                return [{ ...snap, count: res.count ?? 1 }, ...prev];
              });
            } else if (res?.success !== true) {
              // 서버가 저장을 못 함 → 사유를 화면에 노출 (조용히 실패 방지)
              setSaveFail(deckFailReason(res));
            }
          }).catch(() => setSaveFail("네트워크 오류"));
        }
      } else {
        // 높은 등급 카드가 도망감 → 연승 더 쌓으라는 힌트
        const v = computeValueScore(challenger);
        if (["silver", "gold", "diamond", "treasure", "legend"].includes(v.tone)) setEscaped(v.medal);
      }
    } else {
      // 틀린 라운드 정보 스냅샷 (종료 화면에서 표시)
      setMissed({
        challenger, anchor,
        statLabel: STAT.label,
        anchorStr: STAT.fmt(av),
        challengerStr: STAT.fmt(cv),
        higherSide: cv >= av ? "challenger" : "anchor",
      });
    }
  }, [phase, anchor, challenger, best, bestKey, isLoggedIn, streak, activeBoost]);

  const next = useCallback(() => {
    if (!lastWin) return;
    setHistory(h => [...h, anchor].slice(-10));   // 왼쪽 카드를 항해 기록에 쌓음(오른쪽 카드가 왼쪽 자리로), 최근 10개까지만 유지
    setAnchor(challenger);
    setChallenger(draw(challenger?.ticker));
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setLastWin(null); setPackOpening(false); setFirstDupHint(false); setPhase("guessing");
  }, [lastWin, anchor, challenger, draw]);

  // 카드가 늘거나 라운드가 바뀌면 필름스트립을 우측 끝(최신)으로 스크롤. 평소엔 부드럽게(카드가 쌓이는 연출),
  // 게임 재개(이어서 항해) 직후엔 jumpScrollRef로 애니메이션 없이 바로 마지막 위치로 이동.
  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: jumpScrollRef.current ? "auto" : "smooth" });
    jumpScrollRef.current = false;
  }, [history.length, challenger]);

  useEffect(() => { if (phase === "revealed" && lastWin === false) setPhase("over"); }, [phase, lastWin]);

  const isLoading = ncav.state === "pending" || ncav.state === "init" || pool.length < 2;

  return (
    <div className="relative h-[calc(100dvh-112px)] md:h-[100dvh] flex flex-col overflow-hidden bg-gradient-to-b from-[#fdf4e3] via-[#eaf6ef] to-[#dff0e6] dark:from-[#0a1a1f] dark:via-[#0c1f1a] dark:to-[#0a1512] transition-colors">
      {/* 대항해시대 바다 3D 배경 (three.js) */}
      <div className="absolute inset-0 z-0"><GameSeaArt /></div>
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#fdf4e3]/70 via-transparent to-[#dff0e6]/85 dark:from-[#0a1a1f]/75 dark:via-transparent dark:to-[#0a1512]/90" />
      <div className="relative z-10 w-full max-w-2xl mx-auto px-2 pt-3 pb-1 flex-1 min-h-0 flex flex-col">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-[#16a34a]">
            <ChevronLeft size={14} /> 홈
          </Link>
          <h1 className="text-sm font-black text-neutral-900 dark:text-white">⛵ 신대륙 항해 · 종목 발굴</h1>
          <div className="flex items-center gap-1.5">
            {isLoggedIn && <WalletChip coins={coins} />}
            <button onClick={() => setShowDeck(v => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] text-xs font-bold text-neutral-600 dark:text-neutral-300">
              <Layers size={13} className="text-[#16a34a]" /> 내 덱 {deckTotal(deck)}
              {!isLoggedIn && <Lock size={10} className="opacity-60" />}
            </button>
          </div>
        </div>

        {/* 본문 — 항상 스크롤 가능. 플레이는 my-auto 로 세로 중앙(넘치면 스크롤), 종료/덱은 자연 스크롤 */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {showDeck ? (
          <DeckView deck={deck} catalog={catalog} best={best} coins={coins} isLoggedIn={isLoggedIn}
            onLogin={requireLogin} onClose={() => { setShowDeck(false); setShowShop(false); }}
            showShop={showShop} onToggleShop={() => setShowShop(v => !v)}
            onBuyBoost={(item) => setActiveBoost({ mult: item.mult, roundsLeft: item.rounds })}
            onConverted={(ticker, gained, remaining) => {
              setCoins(c => c + gained);
              setDeck(prev => prev.map(c => c.ticker === ticker ? { ...c, count: remaining } : c));
            }} />
        ) : isLoading ? (
          <div className="my-auto py-24 text-center text-sm text-neutral-400">카드 데이터를 불러오는 중…</div>
        ) : (
          <div className={cn("w-full", phase === "over" ? "flex-1 min-h-0 flex flex-col" : "my-auto")}>
            {/* 스코어 (플레이 중에만) */}
            {phase !== "over" && (
              <div className="flex items-center justify-center mb-3 shrink-0">
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-sm">
                  <div className="text-center px-3">
                    <p className="text-xl font-black tabular-nums text-[#16a34a] leading-none">{streak}</p>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">연승</p>
                  </div>
                  <div className="h-7 w-px bg-neutral-200 dark:bg-[#35332e]" />
                  <div className="text-center px-3">
                    <p className="text-xl font-black tabular-nums text-neutral-700 dark:text-neutral-200 leading-none">{best}</p>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">최고</p>
                  </div>
                </div>
              </div>
            )}

            {/* 질문 — 최상단(스코어 바로 아래)으로 이동해 카드를 보기 전에 무엇을 비교하는지 먼저 알 수 있게 */}
            {phase === "guessing" && anchor && challenger && (
              <p className="text-center text-sm sm:text-base font-bold text-neutral-800 dark:text-neutral-100 mb-3 shrink-0 break-keep leading-snug">
                <b className="text-[#16a34a]">{challenger.name}</b>
                <span className="font-medium text-neutral-500 dark:text-neutral-400">의 {STAT.label}은 </span>
                <b className="text-neutral-900 dark:text-white">{anchor.name}</b>
                <span className="font-medium text-neutral-500 dark:text-neutral-400">보다?</span>
              </p>
            )}

            {phase === "over" ? (
              // 결과 카드: 화면(뷰포트)을 꽉 채우고 헤더·버튼은 고정, 중간만 필요 시 내부 스크롤 → 한 화면에서 보임
              <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-300">
                {/* 3D 보물상자 헤더 (three.js) — 모바일 축소 */}
                <div className="relative h-20 sm:h-40 shrink-0 bg-gradient-to-b from-[#fff7e6] to-white dark:from-[#241d0e] dark:to-[#242320]">
                  <VoyageArt />
                  {newBest && streak > 0 && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-white text-[11px] font-black shadow-md animate-in fade-in zoom-in-95">
                      🎉 신기록
                    </span>
                  )}
                </div>

                {/* 중간 — 넘칠 때만 이 영역만 내부 스크롤(헤더·버튼은 항상 보임) */}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1.5 pb-2 text-center space-y-2">
                  <div>
                    <p className="text-lg font-black text-neutral-900 dark:text-white">항해 종료!</p>
                    <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#86efac]/60 dark:border-[#166534]/60 text-[#15803d] dark:text-[#16a34a] text-xs font-black">
                      <span aria-hidden className="text-sm leading-none">{rankOf(streak).emoji}</span>{rankOf(streak).title}
                    </span>
                  </div>

                  {/* 이번 항해 성과 — 스탯·업적을 한 패널로 묶어 시각적으로 한 덩어리로 보이게 */}
                  <div className="rounded-2xl border border-neutral-100 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1f1e1b] p-2.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">이번 항해 성과</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-white dark:bg-[#242320] py-1.5">
                        <p className="text-xl font-black tabular-nums text-[#16a34a] leading-none">{streak}</p>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">이번 연승</p>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-[#242320] py-1.5">
                        <p className="text-xl font-black tabular-nums text-neutral-700 dark:text-neutral-200 leading-none">{best}</p>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">최고 기록</p>
                      </div>
                    </div>
                    <div className="flex justify-center mt-2">
                      <AchievementBadges deck={deck} best={best} catalogTotal={catalog.length} />
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-2 break-keep">
                      {isLoggedIn ? <>발굴한 카드는 <b className="text-neutral-600 dark:text-neutral-300">내 덱({deckTotal(deck)})</b>에 쌓였습니다.</> : "로그인하면 발굴한 카드를 덱에 모을 수 있어요."}
                    </p>
                  </div>

                  {acquired.length > 0 && <AcquiredThisGame cards={acquired} />}
                  {missed && <MissedInfo missed={missed} />}
                </div>

                {/* 버튼 고정 (항상 보임) */}
                <div className="shrink-0 px-5 pb-3 pt-2 border-t border-neutral-100 dark:border-[#35332e]">
                  <button onClick={start}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-sm shadow-md shadow-[#16a34a]/25 active:scale-[0.98] transition-all">
                    <TrendingUp size={16} /> 이어서 항해
                  </button>
                </div>
              </div>
            ) : anchor && challenger ? (
              <>
                {/* PC — 필름스트립: 활성 2장이 우측에 꽉 차고, 지나온 카드는 왼쪽에 쌓임. 왼쪽으로 슬라이드하면 항해 기록 확인 */}
                <div className="relative hidden sm:block">
                  <div ref={trackRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pt-3 pb-2">
                    {history.map((c, i) => (
                      <div key={`${c.ticker}-${i}`} className="shrink-0 self-end snap-end w-[calc(50%-0.5rem)] opacity-90">
                        <div className="aspect-[3/4]"><TcgCard item={c} value={STAT.fmt(STAT.get(c))} rank={rankMap.get(String(c.ticker))} idleDelay={i * 0.4} /></div>
                      </div>
                    ))}
                    <div className="shrink-0 self-end snap-end w-[calc(50%-0.5rem)]">
                      <div className="aspect-[3/4]"><TcgCard hero item={anchor} value={STAT.fmt(STAT.get(anchor))} rank={rankMap.get(String(anchor.ticker))} idleDelay={0} /></div>
                    </div>
                    <div className="shrink-0 self-end snap-end w-[calc(50%-0.5rem)]">
                      <div className="aspect-[3/4]"><TcgCard hero item={challenger} rank={rankMap.get(String(challenger.ticker))} idleDelay={3}
                        onGuess={phase === "guessing" ? guess : undefined}
                        onNext={phase === "revealed" && lastWin ? next : undefined}
                        value={phase === "revealed"
                          ? <span className="animate-in zoom-in-75 duration-300">{STAT.fmt(STAT.get(challenger))}</span>
                          : <span className="text-neutral-300 dark:text-neutral-600">?</span>} /></div>
                    </div>
                  </div>
                  {/* VS — 활성 쌍(우측 두 장) 사이 */}
                  <span className="pointer-events-none absolute left-1/2 top-[calc(50%+0.25rem)] -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#5b4a2e] dark:bg-[#c9a86a] text-[#f3e9d2] dark:text-[#14100a] text-[10px] font-black font-serif flex items-center justify-center shadow-lg ring-4 ring-[#faf9f7] dark:ring-[#1a1915]">VS</span>
                  {history.length > 0 && (
                    <span className="pointer-events-none absolute left-1 top-3 z-20 inline-flex items-center gap-0.5 text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                      <ChevronLeft size={11} /> 항해 기록 {history.length}
                    </span>
                  )}
                </div>

                {/* 모바일 — 챌린저(비교 대상) 카드 위주 큰 뷰, 앵커(기준)는 값 배지로 축소 */}
                <div className="sm:hidden pt-3 pb-2">
                  <div className="flex items-center justify-center mb-2.5">
                    <span className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-sm">
                      <PortMedallion item={anchor} size={22} />
                      <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 truncate max-w-[100px]">{anchor.name}</span>
                      <span className="text-xs font-black text-neutral-800 dark:text-neutral-100 tabular-nums">{STAT.fmt(STAT.get(anchor))}</span>
                    </span>
                  </div>
                  <div className="mx-auto w-[86%] max-w-[320px] aspect-[3/4]">
                    <TcgCard hero item={challenger} rank={rankMap.get(String(challenger.ticker))} idleDelay={3}
                      onGuess={phase === "guessing" ? guess : undefined}
                      onNext={phase === "revealed" && lastWin ? next : undefined}
                      value={phase === "revealed"
                        ? <span className="animate-in zoom-in-75 duration-300">{STAT.fmt(STAT.get(challenger))}</span>
                        : <span className="text-neutral-300 dark:text-neutral-600">?</span>} />
                  </div>
                </div>

                {/* 획득 / 로그인 유도 */}
                <div className="min-h-[1.75rem] text-center">
                  {packOpening ? (
                    <PackReveal item={challenger} />
                  ) : (
                    <>
                      {phase === "revealed" && dropped && (
                        <span className="flex flex-col items-center gap-1 animate-in fade-in slide-in-from-bottom-1">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <Sparkles size={12} /> 카드 획득! {challenger.name} 이(가) 덱에 추가됨
                          </span>
                          {firstDupHint && (
                            <button onClick={() => setShowDeck(true)}
                              className="text-[10px] font-bold text-neutral-400 hover:text-[#16a34a] hover:underline">
                              🪙 같은 카드가 2장이 됐어요 — 내 덱에서 코인으로 전환해보세요 →
                            </button>
                          )}
                        </span>
                      )}
                      {phase === "revealed" && dropPrompt && (
                        <button onClick={requireLogin}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16a34a] animate-in fade-in hover:underline">
                          <Lock size={12} /> 카드가 나왔어요! 로그인하고 덱에 담기 →
                        </button>
                      )}
                      {phase === "revealed" && lastWin && !dropped && !dropPrompt && (
                        saveFail
                          ? <span className="text-xs font-bold text-rose-500 dark:text-rose-400 animate-in fade-in">정답! 덱 저장 실패 — {saveFail}</span>
                          : escaped
                            ? <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-in fade-in">정답! {escaped} 등급 카드가 도망갔어요 — 연승을 쌓으면 획득 확률↑</span>
                            : <span className="text-xs font-bold text-[#16a34a] animate-in fade-in">정답! ✔</span>
                      )}
                    </>
                  )}
                </div>

                {/* 획득 확률 안내 — 높다/낮다·다음 카드 모두 이제 카드(챌린저) 위에서 직접 탭해서 진행 */}
                {phase === "guessing" && (() => {
                  // 정답 시(연승+1) 이 카드 획득 확률 — 연승↑·낮은 등급↑, 높은 등급은 더 높은 연승 필요. 상점 부스트 배율 반영.
                  const chance = Math.round(Math.min(0.95, acquireChance(challenger, streak + 1) * (activeBoost?.mult ?? 1)) * 100);
                  const owned = deck.find(c => c.ticker === challenger.ticker);
                  return (
                    <p className="text-center text-[11px]">
                      <span className="text-neutral-400">획득 확률 </span>
                      <b className="text-[#16a34a] tabular-nums">{chance}%</b>
                      <span className="text-neutral-300 dark:text-neutral-600"> · 연승 시 ↑</span>
                      {activeBoost && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                          🪄 부적 ×{activeBoost.mult} (남은 {activeBoost.roundsLeft}판)
                        </span>
                      )}
                      {owned && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#16a34a]/10 text-[#16a34a] font-bold tabular-nums">
                          보유 ×{owned.count} · 획득 시 +1
                        </span>
                      )}
                    </p>
                  );
                })()}
              </>
            ) : null}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// 등급 카드 배경 틴트 (섹션·카드 모두에서 등급을 한눈에 구분)
const TIER_ORDER: Array<ReturnType<typeof computeValueScore>["tone"]> =
  ["legend", "treasure", "diamond", "gold", "silver", "bronze", "iron", "raw", "clay", "explore"];

// 덱 뷰 — 도감(catalog 전체) 기준으로 보유/미보유(잠금) 카드를 함께 보여줌
function DeckView({ deck, catalog, best, coins, isLoggedIn, onLogin, onClose, showShop, onToggleShop, onBuyBoost, onConverted }: {
  deck: DeckItem[]; catalog: any[]; best: number; coins: number; isLoggedIn: boolean;
  onLogin: () => void; onClose: () => void;
  showShop: boolean; onToggleShop: () => void; onBuyBoost: (item: BoostItem) => void;
  onConverted: (ticker: string, gained: number, remaining: number) => void;
}) {
  const ownedByTicker = useMemo(() => new Map(deck.map(d => [d.ticker, d])), [deck]);

  // 등급별로 묶고, 등급 순서(보물→탐색) → 등급 내 점수 내림차순으로 정렬해 분류를 명확히 함
  const tierGroups = useMemo(() => {
    const byTone = new Map<string, { item: any; owned: DeckItem | undefined; v: ReturnType<typeof computeValueScore> }[]>();
    for (const c of catalog) {
      const v = computeValueScore(c);
      if (!byTone.has(v.tone)) byTone.set(v.tone, []);
      byTone.get(v.tone)!.push({ item: c, owned: ownedByTicker.get(c.ticker), v });
    }
    for (const list of byTone.values()) list.sort((a, b) => b.v.score - a.v.score);
    return TIER_ORDER.filter(t => byTone.has(t)).map(t => ({ key: t, cards: byTone.get(t)! }));
  }, [catalog, ownedByTicker]);

  // 등급 내 카드 번호(예: S-1) — tierGroups(등급별·점수 내림차순) 기준 순번, 카드 명패에 표시
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const { cards } of tierGroups) cards.forEach((c, i) => map.set(String(c.item.ticker), i + 1));
    return map;
  }, [tierGroups]);

  // 업종별로 묶고, 종목 수 많은 업종 → 업종 내 점수 내림차순으로 정렬 (항목/종목분류 기준 도감 완성)
  const sectorGroups = useMemo(() => {
    const bySector = new Map<string, { item: any; owned: DeckItem | undefined; v: ReturnType<typeof computeValueScore> }[]>();
    for (const c of catalog) {
      const label = sectorArt(c).label;
      if (!bySector.has(label)) bySector.set(label, []);
      bySector.get(label)!.push({ item: c, owned: ownedByTicker.get(c.ticker), v: computeValueScore(c) });
    }
    for (const list of bySector.values()) list.sort((a, b) => b.v.score - a.v.score);
    return Array.from(bySector.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([label, cards]) => ({ key: label, cards }));
  }, [catalog, ownedByTicker]);

  // 도감 그룹 기준 — 등급별 / 업종별(항목·종목분류) 전환
  const [groupMode, setGroupMode] = useState<"tier" | "sector">("tier");
  const groups = groupMode === "tier" ? tierGroups : sectorGroups;

  // 완성도: 그룹별 owned/total + 전체 % (필터와 무관하게 항상 도감 전체 기준)
  const completion = useMemo(() => {
    const byGroup: Record<string, { owned: number; total: number }> = {};
    for (const { key, cards } of groups) byGroup[key] = { owned: cards.filter(c => c.owned).length, total: cards.length };
    const total = catalog.length, owned = ownedByTicker.size;
    return { byGroup, total, owned, pct: total > 0 ? Math.round((owned / total) * 100) : 0 };
  }, [groups, catalog.length, ownedByTicker]);

  // 보유 카드만 / 중복(2장 이상, 코인 전환 가능) 카드만 보기 필터
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [showDupesOnly, setShowDupesOnly] = useState(false);
  const displayGroups = useMemo(() => {
    let result = groups;
    if (showOwnedOnly) result = result.map(g => ({ key: g.key, cards: g.cards.filter(c => c.owned) })).filter(g => g.cards.length > 0);
    if (showDupesOnly) result = result.map(g => ({ key: g.key, cards: g.cards.filter(c => (c.owned?.count ?? 0) >= 2) })).filter(g => g.cards.length > 0);
    return result;
  }, [groups, showOwnedOnly, showDupesOnly]);

  // 카드가 3D(두께·범선·홀로)라 한 번에 다 그리면 무거움 → 12장씩 나눠 렌더(스크롤 시 자동 추가)
  const PAGE = 12;
  const total = useMemo(() => displayGroups.reduce((a, g) => a + g.cards.length, 0), [displayGroups]);
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible >= total) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some(e => e.isIntersecting)) setVisible(v => Math.min(total, v + PAGE)); },
      { rootMargin: "400px" } // 화면에 닿기 전에 미리 다음 묶음 로드
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, total]);

  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5 min-w-0">
          내 덱 <span className="text-[#16a34a]">{deckTotal(deck)}</span>장
          <ScoreInfo />
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLoggedIn && <WalletChip coins={coins} />}
          {isLoggedIn && (
            <button onClick={onToggleShop}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] text-xs font-bold text-neutral-600 dark:text-neutral-300">
              🪙 상점
            </button>
          )}
          <button onClick={onClose} className="text-xs font-bold text-neutral-500 hover:text-[#16a34a]">게임으로 ▶</button>
        </div>
      </div>

      {showShop ? (
        <ShopPanel coins={coins} onBuy={onBuyBoost} onClose={onToggleShop} />
      ) : (
        <>
          {/* 도감 완성도 */}
          {catalog.length > 0 && (
            <div className="mb-3 rounded-xl border border-neutral-100 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1f1e1b] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-black text-neutral-700 dark:text-neutral-200">도감 완성도 <span className="text-neutral-400 font-medium">· 오늘 기준 발굴 가능 종목</span></p>
                <p className="text-xs font-black text-[#16a34a] tabular-nums">{completion.owned}/{completion.total} ({completion.pct}%)</p>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-[#35332e] overflow-hidden">
                <div className="h-full bg-[#16a34a] transition-all" style={{ width: `${completion.pct}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <AchievementBadges deck={deck} best={best} catalogTotal={catalog.length} />
            {catalog.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="inline-flex rounded-lg border border-neutral-200 dark:border-[#35332e] overflow-hidden">
                  {(["tier", "sector"] as const).map(m => (
                    <button key={m} onClick={() => { setGroupMode(m); setVisible(PAGE); }}
                      className={cn("px-2 py-1 text-[11px] font-bold transition-colors",
                        groupMode === m ? "bg-[#16a34a] text-white" : "bg-white dark:bg-[#242320] text-neutral-500 dark:text-neutral-400")}>
                      {m === "tier" ? "등급별" : "업종별"}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setShowOwnedOnly(v => !v); setVisible(PAGE); }}
                  className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-colors",
                    showOwnedOnly
                      ? "border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                      : "border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] text-neutral-500 dark:text-neutral-400")}>
                  <Layers size={11} /> 보유만
                </button>
                <button onClick={() => { setShowDupesOnly(v => !v); setVisible(PAGE); }}
                  className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-colors",
                    showDupesOnly
                      ? "border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                      : "border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] text-neutral-500 dark:text-neutral-400")}>
                  <Copy size={11} /> 중복만
                </button>
              </div>
            )}
          </div>

          {!isLoggedIn && (
            <div className="my-4 py-4 text-center rounded-xl border border-dashed border-neutral-200 dark:border-[#35332e]">
              <Lock size={18} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">덱은 계정에 저장됩니다</p>
              <p className="text-[11px] text-neutral-400 mt-1 mb-3">로그인하면 발굴한 카드가 기기와 상관없이 보관돼요.</p>
              <button onClick={onLogin} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs">
                로그인하고 덱 시작
              </button>
            </div>
          )}

          {catalog.length === 0 ? (
            <p className="py-20 text-center text-sm text-neutral-400">카드 데이터를 불러오는 중…</p>
          ) : (showOwnedOnly || showDupesOnly) && total === 0 ? (
            <p className="py-20 text-center text-sm text-neutral-400">
              {showDupesOnly ? "2장 이상 보유한 중복 카드가 없어요. 코인으로 전환하려면 같은 카드가 더 필요해요!" : "아직 보유한 카드가 없어요. 게임을 하며 카드를 수집하세요!"}
            </p>
          ) : (
            <div className="space-y-5 mt-3">
              {(() => {
                let shown = 0; // 지금까지 렌더한 카드 수(그룹 순). visible 이내 카드만 그림
                return displayGroups.map(({ key, cards }) => {
                  const start = shown;
                  shown += cards.length;
                  const slice = cards.slice(0, Math.max(0, visible - start));
                  if (slice.length === 0) return null; // 이 그룹은 아직 로드 범위 밖 → 스크롤 시 노출
                  const sec = groupMode === "sector" ? sectorArt(cards[0].item) : null;
                  const SecIcon = sec?.icon;
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-2 px-0.5">
                        {groupMode === "tier" ? (
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ring-inset text-[11px] font-black", MEDAL_TONE[key])}>
                            <span aria-hidden>{cards[0].v.medal}</span>{cards[0].v.grade} {cards[0].v.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ring-inset text-[11px] font-black"
                            style={{ background: rgba(sec!.hue, 0.12), color: sec!.hue, "--tw-ring-color": rgba(sec!.hue, 0.35) } as React.CSSProperties}>
                            {SecIcon && <SecIcon aria-hidden size={11} />}{key}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-neutral-400">{completion.byGroup[key]?.owned ?? 0}/{completion.byGroup[key]?.total ?? cards.length}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {slice.map(({ item, owned }, ci) => (
                          <div key={item.ticker} className="relative aspect-[3/4]">
                            <TcgCard item={owned ?? item} value={STAT.fmt(STAT.get(item))} count={owned?.count} locked={!owned} rank={rankMap.get(String(item.ticker))} idleDelay={ci * 0.6} />
                            {owned && (owned.count ?? 1) >= 2 && (
                              <ConvertButton item={owned} count={owned.count ?? 1}
                                onConverted={(gained, remaining) => onConverted(owned.ticker, gained, remaining)} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
              {visible < total && (
                <div ref={sentinelRef} className="pt-1 pb-4 text-center">
                  <button onClick={() => setVisible(v => Math.min(total, v + PAGE))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:border-[#16a34a]/50">
                    더 보기 <span className="tabular-nums text-neutral-400">{visible}/{total}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
