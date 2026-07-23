"use client";

// =========================================================================
// 가치투자 덱빌더 — 손패·에너지 기반 다중 턴 전투 던전 크롤 게임(프로토타입).
// 4개 재무지표(ROE→공격력·NCAV→방어력·PBR→코스트·PER→환급) → 카드 전투 스탯(1~10).
// 보유 컬렉션(계정 덱) 전체가 곧 전투 덱 — 손패에서 카드를 전장(Phaser 캔버스)으로 드래그해
// 발동, 에너지 소진 시 "턴 종료"로 적 턴 진행. 3층마다 패시브/액티브 아이템 획득, 10층마다 보스.
// 이긴 층의 카드만 확률적으로 "내 덱"에 수집(계정별 D1 저장, 로그인 필요).
// =========================================================================

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowUp, ArrowDown, Layers, Copy, TrendingUp, Sparkles, ChevronDown, Lock, Info,
  Cpu, Dna, Landmark, CarFront, Ship, Construction, Zap, FlaskConical, Factory, RadioTower, Gamepad2,
  Soup, ShoppingCart, PlaneTakeoff, Shirt, Code2, Gem, Compass, Anchor, Map as MapIcon, Medal as MedalIcon,
  BatteryCharging, Bot, Wallet, Flame, Trophy, Target, Wand2, Swords, Crown, Loader2, UserRound, X,
  type LucideIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { computeValueScore } from "@/lib/utils/valueScore";
import { getDeck, getWallet, type DeckCardSnapshot } from "@/lib/features/deck/deckAPI";
import { cn } from "@/lib/utils";
import { HOLO_THRESHOLD, PackReveal, AchievementBadges, ACHIEVEMENTS } from "./gameCollectibles";
import { WalletChip, ConvertButton, ShopPanel, BOOST_ITEMS } from "./gameShop";
import { useGameRun, deckTotal, type DeckItem } from "./useGameRun";
import { HpBar, EnergyBar, ShieldBadge, ItemBar } from "@/components/game/CombatHud";
import CombatLog from "@/components/game/CombatLog";

const PhaserCombatCanvas = dynamic(() => import("@/components/game/PhaserCombatCanvas"), { ssr: false });
const HandView = dynamic(() => import("@/components/game/HandView"), { ssr: false });

const safeNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// 비교 스탯: 시가총액 하나로 고정 (카드 등급은 별도 저평가 점수로 산정)
type Stat = { key: string; label: string; get: (it: any) => number; fmt: (v: number) => string };
const STAT: Stat = {
  key: "market_cap", label: "시가총액", get: it => safeNum(it.market_cap),
  fmt: v => v >= 10000 ? `${(v / 10000).toFixed(1)}조` : `${Math.round(v).toLocaleString()}억`,
};

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

// 종목 로고 (KR: NEXT_PUBLIC_KR_LOGO_API, US: logo.dev). 실패 시 첫 글자 fallback.
function logoUrlFor(item: any): string {
  const t = String(item?.ticker ?? "");
  return item?.isUs
    ? `https://img.logo.dev/ticker/${t}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
    : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${t}`;
}

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

// 등급별 카드 효과 보너스(%) — 카드 룰박스 장식 문구용(플레이버, 실제 게임 로직엔 미반영)
const EFFECT_BONUS: Record<string, number> = {
  legend: 10, treasure: 9, diamond: 8, gold: 7, silver: 6, bronze: 5, iron: 4, raw: 3, clay: 2, explore: 1,
};

// 업종 추론 — 종목명/티커 키워드로 대표 업종을 매핑.
type SectorInfo = { label: string; icon: LucideIcon; image?: string; hue: string; flavor: string; keyword: string };
const SEC_IMG = (name: string) => `/images/sectors/${name}.jpg`;
const SECTORS: (SectorInfo & { re: RegExp })[] = [
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
const ALL_SECTOR_IMAGES = Array.from(new Set([...SECTORS, ...SECTOR_FALLBACK].map(s => s.image).filter(Boolean))) as string[];

// 저평가 점수 설명 툴팁
function ScoreInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="저평가 점수 설명" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center p-1.5 rounded-full text-neutral-400 hover:text-[#16a34a] transition-colors">
        <Info size={13} />
      </button>
      {open && (
        <span className="fixed z-50 inset-x-4 bottom-20 sm:absolute sm:z-30 sm:inset-x-auto sm:left-0 sm:bottom-full sm:mb-2 sm:w-72 rounded-xl bg-neutral-900 dark:bg-[#242320] border border-neutral-700/60 dark:border-[#35332e] p-3 text-[11px] leading-relaxed text-neutral-200 shadow-xl text-left font-medium break-keep">
          <b className="text-white">저평가 점수 (0~100)</b><br />
          NCAV·PBR·PER·ROE를 가중 평균해 점수화(값 없는 지표는 제외, 적자·자본잠식 등 음수 지표는 0점):
          <span className="block mt-1.5 space-y-0.5 text-neutral-300">
            <span className="block">· NCAV 40% — 1.5배↑ 만점, 0.3배↓ 0점 (→ 전투 방어력)</span>
            <span className="block">· PBR 25% — 0.3↓ 만점, 1.5↑ 0점 (→ 전투 코스트, 역방향)</span>
            <span className="block">· PER 20% — 5↓ 만점, 20↑ 0점 (→ 전투 환급, 역방향)</span>
            <span className="block">· ROE 15% — 18%↑ 만점, 3%↓ 0점 (→ 전투 공격력)</span>
          </span>
        </span>
      )}
    </span>
  );
}

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

// 종목 카드(수집/도감 전용) — 던전 전투 화면에선 더 이상 안 쓰이고(HandView 미니카드가 대체),
// 내 덱(DeckView) 브라우징에만 쓰임. onGuess/onNext(옛 높다/낮다 스와이프)는 이제 아무도 안 넘기므로
// 관련 분기는 그대로 둬도 무해(조건부 렌더라 죽은 코드가 아니라 단순 비활성 경로).
function TcgCard({ item, value, hero = false, count, locked = false, rank, onGuess, onNext }:
  { item: any; value: React.ReactNode; hero?: boolean; count?: number; idleDelay?: number; locked?: boolean; rank?: number; onGuess?: (dir: "higher" | "lower") => void; onNext?: () => void }) {
  const [showInfo, setShowInfo] = useState(false);
  const [showFlavor, setShowFlavor] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragLayerRef = useRef<HTMLDivElement>(null);
  const DRAG_RATIO = 0.28;
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onGuess) return;
    dragStartX.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - dragStartX.current);
  };
  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const width = dragLayerRef.current?.offsetWidth ?? 300;
    if (Math.abs(dragX) > width * DRAG_RATIO) onGuess?.(dragX > 0 ? "higher" : "lower");
    setDragX(0);
  };
  const v = computeValueScore(item);
  const c = TIER[v.tone] ?? TIER.explore;
  const sec = sectorArt(item);
  const Icon = sec.icon;
  const bonus = EFFECT_BONUS[v.tone] ?? 1;
  const holo = !locked && count != null && count >= HOLO_THRESHOLD;
  const displayName = locked ? "???" : item.name;
  const displayTicker = locked ? "??????" : item.ticker;
  const marbleBase = "linear-gradient(135deg, #7a1830, #4a0f20 28%, #9c2c48 52%, #3d0c1a 74%, #7a1830)";
  const marble = `radial-gradient(30% 45% at 18% 22%, rgba(255,255,255,0.22), transparent 60%), radial-gradient(26% 40% at 82% 75%, rgba(0,0,0,0.35), transparent 60%), radial-gradient(20% 30% at 70% 15%, rgba(255,255,255,0.15), transparent 60%), ${marbleBase}`;
  const line = "rgba(0,0,0,0.55)";
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
    <div className={cn("relative w-full h-full flex flex-col overflow-hidden rounded-[5%] hover:-translate-y-1 p-[3.5%]", !onGuess && "transition-transform duration-200 ease-out", locked && "grayscale-[0.85] brightness-[0.65]")}
      style={{
        background: "linear-gradient(160deg,#232323,#0c0c0c)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 4px 14px -6px rgba(0,0,0,0.6)",
        ...(onGuess ? {
          transform: `translateX(${dragX}px) rotate(${Math.max(-12, Math.min(12, dragX / 14))}deg)`,
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(.34,1.56,.64,1)",
        } : null),
      }}>
      {holo && (
        <span aria-hidden className="absolute top-1 right-1 z-[5] px-1 py-0.5 rounded-full bg-black/70 text-white text-[8px] font-black tracking-wide">HOLO</span>
      )}
      <div className="relative shrink-0 flex flex-col overflow-hidden" style={{ background: "linear-gradient(175deg,#ece4cf,#ddd0a6)", flex: "1 1 auto", minHeight: 0 }}>
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
              <button type="button" onClick={e => { e.stopPropagation(); setShowInfo(s => !s); }}
                onMouseEnter={() => setShowInfo(true)} onMouseLeave={() => setShowInfo(false)}
                className="font-serif font-black tabular-nums underline decoration-dotted decoration-1 underline-offset-2 cursor-help"
                style={{ fontSize: hero ? 12 : 9.5, color: "#221c10" }} aria-label="점수 계산 내역 보기">
                {v.grade}{rank != null && `-${rank}`}
              </button>
            )}
          </div>
        </div>
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
                  <div aria-hidden className="absolute inset-0" style={{ boxShadow: "inset 0 0 14px 2px rgba(0,0,0,0.45)" }} />
                </>
              ) : (
                <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                  <Icon className="w-[46%] h-[46%]" style={{ color: rgba(sec.hue, 0.85) }} strokeWidth={1.15} />
                </div>
              )}
              {!locked && (
                <div className={cn("absolute z-[2]", sec.image ? "bottom-1 right-1" : "inset-0 flex justify-center items-center")}>
                  <PortMedallion item={item} size={sec.image ? (hero ? 34 : 26) : (hero ? 56 : 40)} lift={hero} />
                </div>
              )}
              {!locked && count != null && count > 1 && (
                <span className="absolute top-1 left-1 z-[3] px-1.5 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-black tabular-nums leading-none">×{count}</span>
              )}
              {onGuess && (
                <div ref={dragLayerRef} className="absolute inset-0 z-[6] cursor-grab active:cursor-grabbing touch-none"
                  onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
                  <span aria-hidden className="absolute top-[8%] left-[6%] inline-flex items-center gap-1 rounded-lg border-2 font-serif font-black -rotate-12"
                    style={{ padding: hero ? "4px 9px" : "2px 6px", fontSize: hero ? 13 : 10, borderColor: "#e11d48", color: "#e11d48", background: "rgba(0,0,0,0.6)", opacity: dragX < 0 ? Math.min(1, -dragX / 60) : 0 }}>
                    <ArrowDown size={hero ? 13 : 10} strokeWidth={3} /> 낮다
                  </span>
                  <span aria-hidden className="absolute top-[8%] right-[6%] inline-flex items-center gap-1 rounded-lg border-2 font-serif font-black rotate-12"
                    style={{ padding: hero ? "4px 9px" : "2px 6px", fontSize: hero ? 13 : 10, borderColor: "#16a34a", color: "#16a34a", background: "rgba(0,0,0,0.6)", opacity: dragX > 0 ? Math.min(1, dragX / 60) : 0 }}>
                    높다 <ArrowUp size={hero ? 13 : 10} strokeWidth={3} />
                  </span>
                </div>
              )}
              {onNext && (
                <button type="button" aria-label="다음 카드" onClick={e => { e.stopPropagation(); onNext(); }}
                  className="group absolute inset-0 z-[6] flex items-center justify-center bg-black/0 hover:bg-black/15 transition-colors animate-in fade-in">
                  <span className="inline-flex items-center gap-1.5 rounded-xl shadow-lg transition-transform group-active:scale-90"
                    style={{ padding: hero ? "8px 18px" : "5px 12px", background: "#16a34a", boxShadow: "0 4px 14px -4px rgba(22,163,74,0.6)" }}>
                    <span className="font-serif font-black text-white" style={{ fontSize: hero ? 13 : 10 }}>다음 카드</span>
                    <TrendingUp size={hero ? 16 : 12} strokeWidth={3} className="text-white" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 h-[2.2%]" />
      <div className="relative z-[2] shrink-0 p-[4%]" style={{ background: marble }}>
        <button type="button" onClick={e => { e.stopPropagation(); setShowFlavor(v => !v); }}
          className="w-full text-left rounded-lg px-2 py-2" style={{ background: "#c8d2d6", boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.8)" }}>
          <p className="font-bold uppercase tracking-wide flex items-center justify-between gap-1" style={{ fontSize: hero ? 8 : 6.5, color: sec.hue }}>
            {sec.label}
            {!showFlavor && <Info size={hero ? 10 : 8} className="shrink-0 opacity-50" />}
          </p>
          {showFlavor && (
            <>
              <p className={cn("leading-snug break-keep mt-0.5", hero ? "line-clamp-2" : "line-clamp-1")} style={{ fontSize: hero ? 10 : 7.5, color: "#181818" }}>{sec.flavor}</p>
              <p className="leading-snug break-keep mt-1" style={{ fontSize: hero ? 9 : 7, color: "#181818" }}>
                "{sec.keyword}" 관련 발굴 확률 <b style={{ color: c.accent }}>+{bonus}%p</b>
              </p>
            </>
          )}
        </button>
      </div>
      <div className="relative z-[2] shrink-0 flex items-center justify-end gap-1 px-0.5 pt-[2%]">
        <span className={cn("font-serif font-extrabold whitespace-nowrap leading-none flex items-center gap-1", hero ? "text-sm" : "text-[11px]")}>
          <span className="font-sans font-bold opacity-60" style={{ fontSize: hero ? 7.5 : 6.5, color: "#cbc6ba" }}>{STAT.label}</span>
          <span style={{ color: c.glow }}>{value}</span>
        </span>
      </div>
      {showInfo && !locked && (
        <div className="absolute inset-0 z-[7] flex flex-col justify-center gap-1 bg-black p-[6%]" onClick={e => { e.stopPropagation(); setShowInfo(false); }}>
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
                ) : <span className="text-neutral-500">데이터 없음</span>}
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

function AcquiredThisGame({ cards }: { cards: DeckCardSnapshot[] }) {
  return (
    <div className="text-left rounded-2xl backdrop-blur-md bg-black/[0.03] dark:bg-black/30 border border-black/5 dark:border-white/10 p-2.5">
      <p className="text-[11px] font-black text-[#16a34a] mb-1.5">이번 던전에서 발굴한 카드</p>
      <div className="flex flex-wrap gap-1.5">
        {cards.map((c, i) => (
          <div key={`${c.ticker}-${i}`} className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/70 dark:bg-white/[0.05]">
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

// 이번 던전 진행(클리어 층수) 기반 용사 등급 (전역 리더보드 대신 자체 랭크)
function rankOf(floors: number): { emoji: string; title: string } {
  if (floors >= 15) return { emoji: "👑", title: "전설의 용사" };
  if (floors >= 10) return { emoji: "🏆", title: "던전 정복자" };
  if (floors >= 6) return { emoji: "🛡️", title: "베테랑 용사" };
  if (floors >= 3) return { emoji: "🗡️", title: "던전 탐험가" };
  return { emoji: "🔰", title: "견습 용사" };
}

// 던전 층 진행도 — 꺾은선 그래프. 보스 층은 왕관으로 표시.
type FloorNode = { n: number; floor: number; boss: boolean; cleared: boolean; current: boolean };
function FloorGraph({ nodes }: { nodes: FloorNode[] }) {
  const W = 132, H = 24, PAD_X = 10, PAD_TOP = 4;
  const stepX = (W - PAD_X * 2) / (nodes.length - 1);
  const stepY = 3.5;
  const pts = nodes.map((f, i) => ({ x: PAD_X + i * stepX, y: PAD_TOP + i * stepY, f }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible" aria-hidden>
      <path d={pathD} fill="none" strokeWidth={1.5} strokeLinecap="round" className="stroke-black/10 dark:stroke-white/15" />
      {pts.map(({ x, y, f }) => (
        <g key={f.n}>
          <circle cx={x} cy={y} r={f.current ? 3.5 : 2.75}
            className={f.current ? "fill-rose-500" : f.cleared ? "fill-[#16a34a]" : "fill-neutral-300 dark:fill-neutral-700"} />
          {f.current && <circle cx={x} cy={y} r={5.5} className="fill-none stroke-rose-300 dark:stroke-rose-800" strokeWidth={1.2} />}
          <text x={x} y={y + 10} textAnchor="middle" fontSize={f.boss ? 8 : 6.5}
            className={cn("font-black", f.current ? "fill-rose-500" : f.cleared ? "fill-[#16a34a]" : "fill-neutral-400 dark:fill-neutral-600")}>
            {f.boss ? "👑" : f.floor}
          </text>
        </g>
      ))}
    </svg>
  );
}

// useSearchParams는 Suspense 경계가 필요
export default function GamePage() {
  return <Suspense fallback={null}><GameContent /></Suspense>;
}

function GameContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ncav = useAppSelector(selectNcavDailyList);
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const requireLogin = useCallback(() => { router.push(`/login?callbackUrl=${encodeURIComponent("/game")}`); }, [router]);

  const showDeck = searchParams.get("deck") === "1";
  const openDeck = useCallback(() => router.replace("/game?deck=1", { scroll: false }), [router]);
  const closeDeck = useCallback(() => router.replace("/game", { scroll: false }), [router]);

  const [deck, setDeck] = useState<DeckItem[]>([]);
  const [coins, setCoins] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showResultDetail, setShowResultDetail] = useState(false);
  const [introLabel, setIntroLabel] = useState<string | null>(null);

  useEffect(() => { dispatch(reqGetNcavDailyList("latest")); }, [dispatch]);
  useEffect(() => { for (const src of ALL_SECTOR_IMAGES) { const img = new window.Image(); img.src = src; } }, []);

  useEffect(() => {
    if (!isLoggedIn) { setDeck([]); return; }
    let cancelled = false;
    getDeck().then(res => {
      if (cancelled || !res?.success || !Array.isArray(res.data)) return;
      setDeck(res.data.map((r: any) => ({ ticker: r.ticker, name: r.name, ...(r.card ?? {}), count: r.count ?? 1 })));
    }).catch(() => { });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) { setCoins(0); return; }
    let cancelled = false;
    getWallet().then(res => { if (!cancelled && res?.success) setCoins(res.coins ?? 0); }).catch(() => { });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const pool = useMemo(() => {
    const list = Array.isArray(ncav.list) ? ncav.list : [];
    return list.filter((it: any) => it?.name && it?.ticker && STAT.get(it) > 0);
  }, [ncav.list]);

  const poolSnapshotRef = useRef<any[] | null>(null);
  useEffect(() => { if (!poolSnapshotRef.current && pool.length >= 2) poolSnapshotRef.current = pool; }, [pool]);
  const catalog = useMemo(() => {
    const snap = poolSnapshotRef.current ?? pool;
    const byTicker = new Map(snap.map((it: any) => [it.ticker, it]));
    for (const d of deck) if (!byTicker.has(d.ticker)) byTicker.set(d.ticker, d);
    return [...byTicker.values()];
  }, [pool, deck]);
  const rankMap = useMemo(() => buildTierRankMap(catalog), [catalog]);

  const run = useGameRun({ pool, deck, setDeck, isLoggedIn });

  // 보스/정예 진입 시에만 짧은 인트로 라벨 노출(Phaser 씬에 전달) — 일반 배틀은 없음
  const prevRoundRef = useRef(-1);
  useEffect(() => {
    if (run.phase !== "battling" || run.roundNum === prevRoundRef.current) return;
    prevRoundRef.current = run.roundNum;
    if (run.encounter === "boss") setIntroLabel("👑 보스 등장!");
    else if (run.encounter === "elite") setIntroLabel("🗡️ 정예 등장!");
    else setIntroLabel(null);
  }, [run.phase, run.roundNum, run.encounter]);

  const tutorialKey = "iq:game:tutorialSeen";
  useEffect(() => { try { if (!localStorage.getItem(tutorialKey)) setShowTutorial(true); } catch { } }, []);
  const closeTutorial = useCallback(() => { setShowTutorial(false); try { localStorage.setItem(tutorialKey, "1"); } catch { } }, []);

  const isLoading = ncav.state === "pending" || ncav.state === "init" || pool.length < 2;

  const floorWindow = useMemo(() => {
    const start = Math.max(0, run.roundNum - 1);
    return Array.from({ length: 5 }, (_, i) => start + i).map(n => ({
      n, floor: n + 1, boss: n > 0 && n % 10 === 0, cleared: n < run.roundNum, current: n === run.roundNum,
    }));
  }, [run.roundNum]);

  return (
    <div className="fixed z-50 left-0 right-0 top-[48px] bottom-[64px] md:left-[220px] md:top-0 md:bottom-0 flex flex-col overflow-hidden bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-200 dark:from-[#0a0a0e] dark:via-[#101015] dark:to-[#08080a] transition-colors">
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(55% 45% at 50% 24%, rgba(168,85,247,0.12), transparent 70%)" }} />
      <div className="relative z-10 w-full max-w-2xl sm:max-w-4xl mx-auto px-1 sm:px-2 pt-3 pb-1 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {showDeck ? (
            <DeckView deck={deck} catalog={catalog} best={run.best} coins={coins} isLoggedIn={isLoggedIn}
              onLogin={requireLogin} onClose={() => { setShowShop(false); closeDeck(); }}
              showShop={showShop} onToggleShop={() => setShowShop(v => !v)}
              onBuyBoost={item => run.buyBoost(item)}
              onConverted={(ticker, gained, remaining) => {
                setCoins(c => c + gained);
                setDeck(prev => prev.map(c => c.ticker === ticker ? { ...c, count: remaining } : c));
              }} />
          ) : isLoading ? (
            <div className="my-auto py-24 flex flex-col items-center gap-2 text-sm text-neutral-400">
              <Loader2 size={20} className="animate-spin" />
              카드 데이터를 불러오는 중…
            </div>
          ) : (
            <div className={cn("w-full", run.phase === "over" ? "flex flex-col sm:flex-1 sm:min-h-0" : "flex flex-col flex-1 min-h-0")}>
              {/* 상단 HUD */}
              {run.phase !== "over" && (
                <div className="shrink-0 mb-1 sm:mb-2 space-y-1">
                  <button type="button" onClick={() => setShowStatus(true)} aria-label="상태창 보기"
                    className="flex items-center justify-center gap-1.5 flex-wrap w-full active:opacity-70 transition-opacity">
                    <div className="px-2 py-1.5 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
                      <HpBar hp={run.player.hp} maxHp={run.player.maxHp} label="HP" />
                    </div>
                    <div className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
                      <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider pr-0.5 whitespace-nowrap">지하{run.roundNum + 1}층</span>
                      <FloorGraph nodes={floorWindow} />
                    </div>
                    {run.phase === "battling" && (
                      <div className="px-2 py-1.5 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
                        <ShieldBadge block={run.player.block} />
                      </div>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-1.5 h-8 overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-hide">
                    {run.gold > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-bold tabular-nums">
                        💰 골드 {run.gold}
                      </span>
                    )}
                    <ItemBar ownedDefs={run.ownedDefs} ownedItems={run.ownedItems} canUseActive={run.phase === "battling"} onUseActive={run.useOwnedActiveItem} />
                    {run.phase === "battling" && run.activeBoost && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-bold tabular-nums">
                        <Wand2 size={11} strokeWidth={2.5} /> ×{run.activeBoost.mult}·{run.activeBoost.roundsLeft}판
                      </span>
                    )}
                    {run.phase === "battling" && run.enemy && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-amber-600/10 border border-amber-600/25 text-amber-700 dark:text-amber-400 text-[10px] font-bold tabular-nums">
                        <Target size={11} strokeWidth={2.5} /> 획득 {run.acquirePct}%
                      </span>
                    )}
                    <button type="button" onClick={() => setShowTutorial(true)} aria-label="게임 방법 보기"
                      className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)] text-neutral-500 dark:text-neutral-300 hover:text-[#16a34a] transition-colors">
                      <Info size={14} />
                    </button>
                  </div>
                </div>
              )}

              {run.phase === "over" ? (
                <ResultScreen run={run} showResultDetail={showResultDetail} setShowResultDetail={setShowResultDetail}
                  isLoggedIn={isLoggedIn} deck={deck} catalog={catalog} />
              ) : run.phase === "event" ? (
                <EventScreen run={run} />
              ) : run.phase === "resolved" ? (
                <ResolvedScreen run={run} />
              ) : run.enemy ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden backdrop-blur-md bg-white/60 dark:bg-white/[0.03] border border-black/5 dark:border-white/10">
                    <HandView cards={run.hand} energy={run.player.energy} freeCostThreshold={run.passive.freeCostThreshold} onPlayCard={run.playHandCard}
                      hudOverlay={<EnergyBar vertical energy={run.player.energy} base={run.player.energyMax + run.passive.energyBonus} bonus={run.turnBonusCost} />}>
                      <PhaserCombatCanvas enemy={run.enemy} player={run.player} introLabel={introLabel} />
                    </HandView>
                  </div>
                  <div className="shrink-0 pt-1.5">
                    <CombatLog entries={run.log} />
                  </div>
                  <div className="shrink-0 pt-1.5 flex justify-center">
                    <button type="button" onClick={run.endTurn}
                      className="inline-flex items-center gap-1.5 px-6 py-2 rounded-2xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-black text-sm shadow-[0_8px_24px_-8px_rgba(22,163,74,0.55)] active:scale-[0.98] transition-all">
                      <Swords size={15} /> 턴 종료
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 방법 안내 */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3" onClick={closeTutorial}>
          <div className="w-full sm:max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 sm:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">🗡️ 용사의 던전 도전</p>
              <button type="button" onClick={closeTutorial} className="text-neutral-400 hover:text-[#16a34a]" aria-label="닫기"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {[
                { icon: "⚔️", text: <>내 덱(보유 카드)이 곧 전투 카드예요. 매 턴 <b className="text-neutral-800 dark:text-neutral-100">손패</b>에서 카드를 <b className="text-neutral-800 dark:text-neutral-100">전장으로 드래그</b>해 발동하세요 — 공격력만큼 적 HP를, 방어력만큼 내 블록을 올려요.</> },
                { icon: "●", text: <>카드를 내려면 <b className="text-neutral-800 dark:text-neutral-100">코스트</b>가 필요해요 — 상단의 노란 동그라미 개수만큼 쓸 수 있고, 카드의 ●숫자만큼 소모돼요.</> },
                { icon: "🔋", text: <>카드의 🔋(환급) 숫자만큼 <b className="text-neutral-800 dark:text-neutral-100">다음 턴 코스트</b>가 미리 충전돼요 — 이번 턴엔 안 쓰이고 다음 턴 시작할 때 동그라미로 더해져요.</> },
                { icon: "🛡️", text: <>쌓인 방어력은 상단 🛡️ 배지에 실시간으로 표시돼요. <b className="text-neutral-800 dark:text-neutral-100">적 턴 하나만</b> 막고 사라지니, 적의 "다음 턴 예정 공격력"을 미리 보고 방어할지 판단하세요.</> },
                { icon: "🎒", text: <>3층마다 <b className="text-neutral-800 dark:text-neutral-100">패시브/액티브 아이템</b>을 하나 고를 수 있어요. 패시브는 자동 적용, 액티브는 원할 때 탭해서 1회 사용해요.</> },
                { icon: "🃏", text: <>적을 처치(층 클리어)하면 확률에 따라 <b className="text-neutral-800 dark:text-neutral-100">내 덱</b>에 카드가 수집돼요. 좋은 카드일수록 전투 스탯도 강해요.</> },
                { icon: "🎲", text: <>층이 깊어질수록 <b className="text-neutral-800 dark:text-neutral-100">상인</b>(골드로 HP 회복)·<b className="text-neutral-800 dark:text-neutral-100">휴식</b>(무료 회복)·<b className="text-orange-500 dark:text-orange-400">정예</b>(강한 몬스터) 조우가 섞여 나와요. 10층마다는 <b className="text-violet-600 dark:text-violet-400">보스</b>예요.</> },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span aria-hidden className="shrink-0 text-lg leading-none">{row.icon}</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed break-keep">{row.text}</p>
                </div>
              ))}
            </div>
            <button onClick={closeTutorial}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-black text-sm shadow-[0_8px_24px_-8px_rgba(22,163,74,0.55)] active:scale-[0.98] transition-all">
              <Swords size={16} /> 던전 입장!
            </button>
          </div>
        </div>
      )}

      {/* 용사 상태창 */}
      {showStatus && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3" onClick={() => setShowStatus(false)}>
          <div className="w-full sm:max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 sm:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5"><UserRound size={16} /> 용사 상태창</p>
              <button type="button" onClick={() => setShowStatus(false)} className="text-neutral-400 hover:text-[#16a34a]" aria-label="닫기"><X size={18} /></button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              <span aria-hidden className="text-base leading-none">{rankOf(run.roundNum).emoji}</span>
              <b className="text-neutral-800 dark:text-neutral-100">{rankOf(run.roundNum).title}</b>
              <span>· 지하 {run.roundNum + 1}층</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                <p className="flex items-center justify-center gap-0.5 text-sm font-black tabular-nums text-rose-500 leading-none"><UserRound size={11} strokeWidth={2.5} />{run.player.hp}/{run.player.maxHp}</p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">HP</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                <p className="flex items-center justify-center gap-0.5 text-sm font-black tabular-nums text-amber-500 leading-none"><Trophy size={11} strokeWidth={2.5} />{run.best}</p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">최고 층수</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                <p className="flex items-center justify-center gap-0.5 text-sm font-black tabular-nums text-amber-600 dark:text-amber-400 leading-none">💰{run.gold}</p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">골드</p>
              </div>
              {run.phase === "battling" && (
                <>
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                    <p className="text-sm font-black tabular-nums text-amber-500 leading-none">●{run.player.energy}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">코스트</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                    <p className="text-sm font-black tabular-nums text-sky-500 leading-none">🛡️{run.player.block}</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">방어력</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                    <p className="text-sm font-black tabular-nums text-amber-700 dark:text-amber-400 leading-none">{run.acquirePct}%</p>
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">획득 확률</p>
                  </div>
                </>
              )}
            </div>
            {run.activeBoost && (
              <p className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-2">
                <Wand2 size={12} strokeWidth={2.5} /> 확률 부스트 ×{run.activeBoost.mult} — {run.activeBoost.roundsLeft}판 남음
              </p>
            )}
            <p className="text-xs font-black text-neutral-700 dark:text-neutral-200 mb-1.5">보유 아이템 {run.ownedItems.length}</p>
            {run.ownedItems.length === 0 ? (
              <p className="text-[11px] text-neutral-400">아직 없어요. 3층마다 획득 기회가 있어요.</p>
            ) : (
              <div className="space-y-1.5">
                {run.ownedItems.map(o => {
                  const def = run.ownedDefs.find((d: any) => d.id === o.defId);
                  if (!def) return null;
                  return (
                    <div key={o.instanceId} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", def.kind === "active" ? "bg-amber-500/10" : "bg-sky-500/10")}>
                      <span aria-hidden className="text-base">{def.icon}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-xs font-black text-neutral-800 dark:text-neutral-100">
                          {def.name}
                          {def.isLegend && <span className="px-1 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white">전설</span>}
                          <span className="text-[9px] font-bold text-neutral-400">{def.kind === "active" ? "액티브" : "패시브"}</span>
                        </span>
                        <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">{def.desc}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 아이템 선택 — 3층마다(또는 보스 처치 시) 뜨는 3택1 */}
      {run.itemChoices && !run.packOpening && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3">
          <div className="w-full sm:max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 sm:zoom-in-95 duration-200">
            <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5 mb-3">🎒 아이템을 하나 고르세요</p>
            <div className="space-y-2">
              {run.itemChoices.map((item: any) => (
                <button key={item.id} type="button" onClick={() => run.pickItem(item.id)}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left active:scale-[0.98] transition-all",
                    item.isLegend ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15" : "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10")}>
                  <span className="text-xl shrink-0" aria-hidden>{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-black text-neutral-800 dark:text-neutral-100">
                      {item.name}
                      {item.isLegend && <span className="px-1 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white">전설</span>}
                      <span className="text-[9px] font-bold text-neutral-400">{item.kind === "active" ? "액티브" : "패시브"}</span>
                    </span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={run.skipItem} className="w-full mt-3 py-2 text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              건너뛰기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 배틀 승리 직후("resolved") — 골드/카드 획득 결과 + 다음 층 진행 선택
function ResolvedScreen({ run }: { run: ReturnType<typeof useGameRun> }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 text-center px-4">
      {run.packOpening ? (
        <PackReveal item={run.enemy?.item ?? {}} />
      ) : (
        <>
          <span aria-hidden className="text-4xl">🏆</span>
          <p className="text-lg font-black text-[#16a34a]">층 클리어!</p>
          {!!run.lastResult?.goldGain && <p className="text-xs font-bold text-amber-600 dark:text-amber-400">💰 +{run.lastResult.goldGain} 골드</p>}
          {run.dropped && <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1"><Sparkles size={12} /> 카드 획득! 내 덱에 추가됨</p>}
          {run.dropPrompt && <p className="text-[11px] font-bold text-[#16a34a] flex items-center gap-1"><Lock size={11} /> 카드가 나왔어요! 로그인하면 덱에 담을 수 있어요</p>}
          {run.saveFail && <p className="text-[10px] font-bold text-rose-500">덱 저장 실패 — {run.saveFail}</p>}
          <div className="flex items-center gap-2 pt-2">
            <button onClick={run.cashOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/[0.05] hover:border-amber-500/50 text-neutral-600 dark:text-neutral-300 font-black text-xs active:scale-[0.97] transition-all">
              <Trophy size={13} className="text-amber-500" /> 여기서 정리
            </button>
            <button onClick={run.nextRound}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-black text-xs shadow-[0_6px_16px_-6px_rgba(22,163,74,0.55)] active:scale-[0.97] transition-all">
              다음 층으로 <Swords size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 상인/휴식 — 배틀 없이 지나가는 라운드
function EventScreen({ run }: { run: ReturnType<typeof useGameRun> }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-center px-4">
      {run.encounter === "merchant" ? (
        <>
          <span aria-hidden className="text-5xl">🛒</span>
          <p className="text-lg font-black text-neutral-900 dark:text-white">떠돌이 상인</p>
          <p className="text-xs text-neutral-400 max-w-[240px] break-keep">"지친 모험가로군. 골드가 있다면 상처를 손봐주지."</p>
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <button type="button" onClick={run.buyMerchantHeal} disabled={run.player.hp >= run.player.maxHp || run.gold < 8}
              className="w-full inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-all">
              <span className="text-sm font-black text-neutral-800 dark:text-neutral-100">❤️ HP 회복</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">💰 8</span>
            </button>
            <button type="button" onClick={run.proceedFromEvent}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-black text-sm shadow-[0_6px_16px_-6px_rgba(22,163,74,0.55)] active:scale-[0.97] transition-all">
              다음 층으로 <Swords size={14} />
            </button>
          </div>
        </>
      ) : (
        <>
          <span aria-hidden className="text-5xl">🏕️</span>
          <p className="text-lg font-black text-neutral-900 dark:text-white">잠깐의 휴식</p>
          <p className="text-xs text-neutral-400 max-w-[240px] break-keep">
            {run.restHealed ? "모닥불 옆에서 상처를 돌봤다 — HP 회복!" : "이미 HP가 가득 차 있어 딱히 회복할 게 없다."}
          </p>
          <button type="button" onClick={run.proceedFromEvent}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-black text-sm shadow-[0_6px_16px_-6px_rgba(22,163,74,0.55)] active:scale-[0.97] transition-all">
            다음 층으로 <Swords size={14} />
          </button>
        </>
      )}
    </div>
  );
}

// 던전 종료 화면
function ResultScreen({ run, showResultDetail, setShowResultDetail, isLoggedIn, deck, catalog }: {
  run: ReturnType<typeof useGameRun>; showResultDetail: boolean; setShowResultDetail: (fn: (v: boolean) => boolean) => void;
  isLoggedIn: boolean; deck: DeckItem[]; catalog: any[];
}) {
  return (
    <div className="flex flex-col rounded-3xl backdrop-blur-md bg-white/85 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-300 sm:flex-1 sm:min-h-0 sm:overflow-hidden">
      <div className="relative h-20 sm:h-40 shrink-0 overflow-hidden"
        style={{ background: "radial-gradient(60% 90% at 50% 105%, rgba(192,38,211,0.28), transparent 70%), linear-gradient(180deg, #18171e, #0a0a0d)" }}>
        <div aria-hidden className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative h-full flex items-center justify-center">
          <span aria-hidden className="text-4xl sm:text-6xl" style={{ filter: "drop-shadow(0 0 18px rgba(192,38,211,0.55))" }}>{rankOf(run.roundNum).emoji}</span>
        </div>
        {run.newBest && run.roundNum > 0 && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-white text-[11px] font-black shadow-md animate-in fade-in zoom-in-95">
            🎉 신기록
          </span>
        )}
      </div>
      <div className="px-5 pt-1.5 pb-2 text-center space-y-2 sm:flex-1 sm:min-h-0 sm:overflow-y-auto">
        <div>
          <p className="text-lg font-black text-neutral-900 dark:text-white">던전 탐험 종료!</p>
          <p className="text-[11px] font-bold text-neutral-400 mt-0.5">
            {run.player.hp <= 0 ? "던전 깊은 곳에서 쓰러지고 말았어요" : "무사히 던전을 빠져나왔어요"}
          </p>
          <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#86efac]/60 dark:border-[#166534]/60 text-[#15803d] dark:text-[#16a34a] text-xs font-black">
            <span aria-hidden className="text-sm leading-none">{rankOf(run.roundNum).emoji}</span>{rankOf(run.roundNum).title}
          </span>
        </div>
        <div className="rounded-2xl backdrop-blur-md bg-black/[0.03] dark:bg-black/30 border border-black/5 dark:border-white/10 p-2.5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">이번 런 성과</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/70 dark:bg-white/[0.05] py-1.5">
              <p className="flex items-center justify-center gap-1 text-xl font-black tabular-nums text-[#16a34a] leading-none"><Flame size={15} strokeWidth={2.5} />{run.roundNum}</p>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">클리어 층수</p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-white/[0.05] py-1.5">
              <p className="flex items-center justify-center gap-1 text-xl font-black tabular-nums text-amber-500 leading-none"><Trophy size={15} strokeWidth={2.5} />{run.best}</p>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">최고 기록</p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-white/[0.05] py-1.5">
              <p className="flex items-center justify-center gap-1 text-xl font-black tabular-nums text-rose-500 leading-none"><Crown size={15} strokeWidth={2.5} />{Math.floor(run.roundNum / 10)}</p>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">처치한 보스</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setShowResultDetail(v => !v)}
          className="w-full flex items-center justify-center gap-1 py-1 text-[11px] font-bold text-neutral-400 hover:text-[#16a34a] transition-colors">
          {showResultDetail ? "접기" : "자세히 보기"}
          <ChevronDown size={13} className={cn("transition-transform", showResultDetail && "rotate-180")} />
        </button>
        {showResultDetail && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="rounded-2xl backdrop-blur-md bg-black/[0.03] dark:bg-black/30 border border-black/5 dark:border-white/10 p-2.5">
              <div className="flex justify-center"><AchievementBadges deck={deck} best={run.best} catalogTotal={catalog.length} /></div>
              <p className="text-[11px] text-neutral-400 mt-2 break-keep">
                {isLoggedIn ? <>발굴한 카드는 <b className="text-neutral-600 dark:text-neutral-300">내 덱({deckTotal(deck)})</b>에 쌓였습니다.</> : "로그인하면 발굴한 카드를 덱에 모을 수 있어요."}
              </p>
              {run.gold > 0 && <p className="text-[11px] text-neutral-400 mt-1 break-keep">💰 이번 던전 골드 {run.gold}<span className="block mt-0.5">던전을 나가면 초기화돼요</span></p>}
            </div>
            {run.acquired.length > 0 && <AcquiredThisGame cards={run.acquired} />}
          </div>
        )}
      </div>
      <div className="shrink-0 px-5 pb-3 pt-2 border-t border-black/5 dark:border-white/10">
        <button onClick={run.start}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-black text-sm shadow-[0_8px_24px_-8px_rgba(22,163,74,0.55)] active:scale-[0.98] transition-all">
          <Swords size={16} /> 새 던전 입장
        </button>
      </div>
    </div>
  );
}

// 등급 카드 배경 틴트
const TIER_ORDER: Array<ReturnType<typeof computeValueScore>["tone"]> =
  ["legend", "treasure", "diamond", "gold", "silver", "bronze", "iron", "raw", "clay", "explore"];

// 덱 뷰 — 도감(catalog 전체) 기준으로 보유/미보유(잠금) 카드를 함께 보여줌
function DeckView({ deck, catalog, best, coins, isLoggedIn, onLogin, onClose, showShop, onToggleShop, onBuyBoost, onConverted }: {
  deck: DeckItem[]; catalog: any[]; best: number; coins: number; isLoggedIn: boolean;
  onLogin: () => void; onClose: () => void;
  showShop: boolean; onToggleShop: () => void; onBuyBoost: (item: (typeof BOOST_ITEMS)[number]) => void;
  onConverted: (ticker: string, gained: number, remaining: number) => void;
}) {
  const ownedByTicker = useMemo(() => new Map(deck.map(d => [d.ticker, d])), [deck]);

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

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const { cards } of tierGroups) cards.forEach((c, i) => map.set(String(c.item.ticker), i + 1));
    return map;
  }, [tierGroups]);

  const sectorGroups = useMemo(() => {
    const bySector = new Map<string, { item: any; owned: DeckItem | undefined; v: ReturnType<typeof computeValueScore> }[]>();
    for (const c of catalog) {
      const label = sectorArt(c).label;
      if (!bySector.has(label)) bySector.set(label, []);
      bySector.get(label)!.push({ item: c, owned: ownedByTicker.get(c.ticker), v: computeValueScore(c) });
    }
    for (const list of bySector.values()) list.sort((a, b) => b.v.score - a.v.score);
    return Array.from(bySector.entries()).sort((a, b) => b[1].length - a[1].length).map(([label, cards]) => ({ key: label, cards }));
  }, [catalog, ownedByTicker]);

  const [groupMode, setGroupMode] = useState<"tier" | "sector">("tier");
  const groups = groupMode === "tier" ? tierGroups : sectorGroups;

  const completion = useMemo(() => {
    const byGroup: Record<string, { owned: number; total: number }> = {};
    for (const { key, cards } of groups) byGroup[key] = { owned: cards.filter(c => c.owned).length, total: cards.length };
    const total = catalog.length, owned = ownedByTicker.size;
    return { byGroup, total, owned, pct: total > 0 ? Math.round((owned / total) * 100) : 0 };
  }, [groups, catalog.length, ownedByTicker]);

  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [showDupesOnly, setShowDupesOnly] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState<string | null>(null);
  const displayGroups = useMemo(() => {
    let result = groups;
    if (showOwnedOnly) result = result.map(g => ({ key: g.key, cards: g.cards.filter(c => c.owned) })).filter(g => g.cards.length > 0);
    if (showDupesOnly) result = result.map(g => ({ key: g.key, cards: g.cards.filter(c => (c.owned?.count ?? 0) >= 2) })).filter(g => g.cards.length > 0);
    if (achievementFilter) {
      const achievement = ACHIEVEMENTS.find(a => a.id === achievementFilter);
      if (achievement?.cardFilter) result = result.map(g => ({ key: g.key, cards: g.cards.filter(achievement.cardFilter!) })).filter(g => g.cards.length > 0);
    }
    return result;
  }, [groups, showOwnedOnly, showDupesOnly, achievementFilter]);

  const PAGE = 12;
  const total = useMemo(() => displayGroups.reduce((a, g) => a + g.cards.length, 0), [displayGroups]);
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible >= total) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting)) setVisible(v => Math.min(total, v + PAGE)); }, { rootMargin: "400px" });
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
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-md border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] text-xs font-bold text-neutral-600 dark:text-neutral-300">
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
          {catalog.length > 0 && (
            <div className="mb-3 rounded-xl backdrop-blur-md bg-black/[0.03] dark:bg-black/30 border border-black/5 dark:border-white/10 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-black text-neutral-700 dark:text-neutral-200">도감 완성도 <span className="text-neutral-400 font-medium">· 오늘 기준 발굴 가능 종목</span></p>
                <p className="text-xs font-black text-[#16a34a] tabular-nums">{completion.owned}/{completion.total} ({completion.pct}%)</p>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#16a34a] to-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.7)] transition-all" style={{ width: `${completion.pct}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <AchievementBadges deck={deck} best={best} catalogTotal={catalog.length}
              selected={achievementFilter} onSelect={id => { setAchievementFilter(f => f === id ? null : id); setVisible(PAGE); }} />
            {catalog.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="inline-flex rounded-lg overflow-hidden backdrop-blur-md border border-black/5 dark:border-white/10">
                  {(["tier", "sector"] as const).map(m => (
                    <button key={m} onClick={() => { setGroupMode(m); setVisible(PAGE); }}
                      className={cn("px-2 py-1 text-[11px] font-bold transition-colors", groupMode === m ? "bg-[#16a34a] text-white" : "bg-white/80 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400")}>
                      {m === "tier" ? "등급별" : "업종별"}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setShowOwnedOnly(v => !v); setVisible(PAGE); }}
                  className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg border backdrop-blur-md text-[11px] font-bold transition-colors",
                    showOwnedOnly ? "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] shadow-[0_0_10px_-2px_rgba(22,163,74,0.5)]" : "border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400")}>
                  <Layers size={11} /> 보유만
                </button>
                <button onClick={() => { setShowDupesOnly(v => !v); setVisible(PAGE); }}
                  className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg border backdrop-blur-md text-[11px] font-bold transition-colors",
                    showDupesOnly ? "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] shadow-[0_0_10px_-2px_rgba(22,163,74,0.5)]" : "border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400")}>
                  <Copy size={11} /> 중복만
                </button>
              </div>
            )}
          </div>

          {!isLoggedIn && (
            <div className="my-4 py-4 text-center rounded-xl backdrop-blur-md border border-dashed border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-black/20">
              <Lock size={18} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">덱은 계정에 저장됩니다</p>
              <p className="text-[11px] text-neutral-400 mt-1 mb-3">로그인하면 발굴한 카드가 기기와 상관없이 보관돼요.</p>
              <button onClick={onLogin} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-bold text-xs shadow-[0_8px_20px_-8px_rgba(22,163,74,0.55)]">
                로그인하고 덱 시작
              </button>
            </div>
          )}

          {catalog.length === 0 ? (
            <p className="py-20 flex flex-col items-center gap-2 text-center text-sm text-neutral-400">
              <Loader2 size={20} className="animate-spin" /> 카드 데이터를 불러오는 중…
            </p>
          ) : (showOwnedOnly || showDupesOnly) && total === 0 ? (
            <p className="py-20 text-center text-sm text-neutral-400">
              {showDupesOnly ? "2장 이상 보유한 중복 카드가 없어요. 코인으로 전환하려면 같은 카드가 더 필요해요!" : "아직 보유한 카드가 없어요. 게임을 하며 카드를 수집하세요!"}
            </p>
          ) : (
            <div className="space-y-5 mt-3">
              {(() => {
                let shown = 0;
                return displayGroups.map(({ key, cards }) => {
                  const start = shown;
                  shown += cards.length;
                  const slice = cards.slice(0, Math.max(0, visible - start));
                  if (slice.length === 0) return null;
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
                        {slice.map(({ item, owned }) => (
                          <div key={item.ticker} className="relative aspect-[3/4]">
                            <TcgCard item={owned ?? item} value={STAT.fmt(STAT.get(item))} count={owned?.count} locked={!owned} rank={rankMap.get(String(item.ticker))} />
                            {owned && (owned.count ?? 1) >= 2 && (
                              <ConvertButton item={owned} count={owned.count ?? 1} onConverted={(gained, remaining) => onConverted(owned.ticker, gained, remaining)} />
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl backdrop-blur-md border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:border-[#16a34a]/50">
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
