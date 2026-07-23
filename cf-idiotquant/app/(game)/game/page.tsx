"use client";

// =========================================================================
// 밸류 아레나 — 용사(내 카드) vs 몬스터(상대 카드) 지표 픽 배틀 던전 크롤 게임
// NCAV·PBR·PER·ROE 중 하나를 골라 대결(sub 정규화 점수 비교). 이기면 다음 층으로,
// 지면 방패 소모(0이 되면 던전 종료). 3층마다 장비 선택(7슬롯, 런 스코프 로그라이크 버프,
// 세트 3/5/7개 보너스 있음), 10층마다 보스. 층 클리어·카드 획득마다 골드 적립(런 스코프, 던전 나가면 초기화).
// 카드 등급(메달)은 NCAV·PBR·PER·ROE를 종합한 저평가 점수로 별도 산정.
// 이긴 카드만 확률적으로 "내 덱"에 수집 → 계정별 D1 저장(로그인 필요). 비로그인 시 수집 시점에 로그인 유도.
// =========================================================================

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowUp, ArrowDown, Layers, Copy, TrendingUp, Sparkles, ChevronRight, ChevronDown, Lock, Info,
  Cpu, Dna, Landmark, CarFront, Ship, Construction, Zap, FlaskConical, Factory, RadioTower, Gamepad2,
  Soup, ShoppingCart, PlaneTakeoff, Shirt, Code2, Gem, Compass, Anchor, Map as MapIcon, Medal as MedalIcon,
  BatteryCharging, Bot, Wallet, History, X, Flame, Trophy, Target, Wand2, Shield, Swords, Crown, Loader2, UserRound,
  type LucideIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { computeValueScore } from "@/lib/utils/valueScore";
import { getDeck, addDeckCard, getWallet, syncBestStreak, type DeckCardSnapshot } from "@/lib/features/deck/deckAPI";
import { cn } from "@/lib/utils";
import { HOLO_THRESHOLD, HoloOverlay, PackReveal, AchievementBadges } from "./gameCollectibles";
import { WalletChip, ConvertButton, ShopPanel, BOOST_ITEMS, type BoostItem } from "./gameShop";

const safeNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// 비교 스탯: 시가총액 하나로 고정 (카드 등급은 별도 저평가 점수로 산정)
type Stat = { key: string; label: string; get: (it: any) => number; fmt: (v: number) => string };
const STAT: Stat = {
  key: "market_cap", label: "시가총액", get: it => safeNum(it.market_cap),
  fmt: v => v >= 10000 ? `${(v / 10000).toFixed(1)}조` : `${Math.round(v).toLocaleString()}억`,
};

// 지표 픽커용 "내 카드 유불리" 태그 — sub(0~1 정규화 점수)를 3단계로 단순화해 보여줌.
// 상대 카드 값은 고를 때까지 안 보이지만, sub가 높을수록(=절대 기준으로 좋은 값일수록)
// 무작위 상대를 이길 확률도 통계적으로 높아지므로 "내 카드 기준 유불리"만으로도 유효한 선택 근거가 됨.
function statTag(sub: number): { label: string; cls: string } {
  if (sub >= 0.66) return { label: "유리", cls: "bg-[#16a34a]/15 text-[#16a34a]" };
  if (sub >= 0.34) return { label: "보통", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  return { label: "불리", cls: "bg-rose-500/15 text-rose-500" };
}

// 장비(로그라이크 요소) — 3라운드마다 장비 하나를 3택1로 획득해 7개 슬롯(투구·갑옷·무기·방패·목걸이·
// 장신구 I·II)을 채워나감. 이번 던전(런) 동안만 적용되고, 던전을 나가면(cashOut/game over) 해제됨
// — 단, "지금까지 한 번이라도 장착해본 장비"는 도감(equipmentLog)으로 로컬에 계속 남음.
// 같은 슬롯이라도 수호자/약탈자 두 세트 중 어느 걸 착용하든 슬롯 자체의 효과는 동일하고(테마만 다름),
// 대신 같은 세트로 3/5/7개를 맞추면 추가 세트 보너스가 붙어 "몰아서 맞출지 섞어 쓸지" 선택하게 함.
type EquipSlot = "helmet" | "armor" | "weapon" | "shield" | "necklace" | "accessory1" | "accessory2";
type EquipSetId = "guardian" | "raider";
type EquipItem = { id: string; slot: EquipSlot; set: EquipSetId; icon: string; name: string; desc: string };

const EQUIP_SLOTS: EquipSlot[] = ["helmet", "armor", "weapon", "shield", "necklace", "accessory1", "accessory2"];
const EQUIP_SLOT_LABEL: Record<EquipSlot, string> = {
  helmet: "투구", armor: "갑옷", weapon: "무기", shield: "방패",
  necklace: "목걸이", accessory1: "장신구 I", accessory2: "장신구 II",
};
const EQUIP_SET_LABEL: Record<EquipSetId, string> = { guardian: "수호자 세트", raider: "약탈자 세트" };

const EQUIP_POOL: EquipItem[] = [
  // 수호자 세트 — 방어 지향
  { id: "guardian_helmet", slot: "helmet", set: "guardian", icon: "⛑️", name: "수호자의 투구", desc: "최대 방패 +1" },
  { id: "guardian_armor", slot: "armor", set: "guardian", icon: "🥋", name: "수호자의 갑옷", desc: "패배 시 방패 소모 -1" },
  { id: "guardian_weapon", slot: "weapon", set: "guardian", icon: "🔨", name: "수호자의 망치", desc: "카드 획득 확률 +6%p" },
  { id: "guardian_shield", slot: "shield", set: "guardian", icon: "🛡️", name: "수호자의 방패", desc: "최대 방패 +1" },
  { id: "guardian_necklace", slot: "necklace", set: "guardian", icon: "📿", name: "수호자의 목걸이", desc: "카드 획득 확률 +4%p" },
  { id: "guardian_accessory1", slot: "accessory1", set: "guardian", icon: "💍", name: "수호자의 반지", desc: "골드 획득량 +25%" },
  { id: "guardian_accessory2", slot: "accessory2", set: "guardian", icon: "🧿", name: "수호자의 부적", desc: "골드 획득량 +25%" },
  // 약탈자 세트 — 슬롯별 효과는 수호자 세트와 동일, 테마(세트 보너스 방향)만 다름
  { id: "raider_helmet", slot: "helmet", set: "raider", icon: "🎩", name: "약탈자의 후드", desc: "최대 방패 +1" },
  { id: "raider_armor", slot: "armor", set: "raider", icon: "🧥", name: "약탈자의 조끼", desc: "패배 시 방패 소모 -1" },
  { id: "raider_weapon", slot: "weapon", set: "raider", icon: "🗡️", name: "약탈자의 단검", desc: "카드 획득 확률 +6%p" },
  { id: "raider_shield", slot: "shield", set: "raider", icon: "🪃", name: "약탈자의 버클러", desc: "최대 방패 +1" },
  { id: "raider_necklace", slot: "necklace", set: "raider", icon: "📜", name: "약탈자의 인장", desc: "카드 획득 확률 +4%p" },
  { id: "raider_accessory1", slot: "accessory1", set: "raider", icon: "💰", name: "약탈자의 주머니", desc: "골드 획득량 +25%" },
  { id: "raider_accessory2", slot: "accessory2", set: "raider", icon: "🗝️", name: "약탈자의 열쇠", desc: "골드 획득량 +25%" },
];
// 세트 보너스 — 같은 세트로 맞춘 슬롯 개수(3/5/7)에 따라 추가로 붙는 보너스
const SET_BONUS: Record<EquipSetId, { at: number; label: string }[]> = {
  guardian: [
    { at: 3, label: "최대 방패 +1" },
    { at: 5, label: "패배 시 방패 소모 -1" },
    { at: 7, label: "최대 방패 +2" },
  ],
  raider: [
    { at: 3, label: "카드 획득 확률 +5%p" },
    { at: 5, label: "골드 획득량 +25%" },
    { at: 7, label: "카드 획득 확률 +10%p" },
  ],
};
type Equipment = Record<EquipSlot, string | null>;
const EMPTY_EQUIPMENT: Equipment = { helmet: null, armor: null, weapon: null, shield: null, necklace: null, accessory1: null, accessory2: null };
// 이미 장착 중인 "정확히 같은" 장비는 후보에서 제외(같은 슬롯의 다른 세트로 교체 제안은 허용) — 슬롯 7개 ×
// 세트 2개 = 14종 중 최대 7개만 제외되므로 최소 7개는 항상 남아 3택1이 막힐 일은 없음(유물 4종과 달리
// 품절 시 골드 대체 로직 불필요).
function pickItemChoices(equipment: Equipment): EquipItem[] {
  const equippedIds = new Set(Object.values(equipment).filter(Boolean));
  const pool = EQUIP_POOL.filter(i => !equippedIds.has(i.id));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
}

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
      {/* w-4 h-4(16px)는 탭 영역이 너무 작아서 주변 레이아웃을 안 건드리는 선에서 패딩으로 살짝 키움 */}
      <button type="button" aria-label="저평가 점수 설명" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center p-1.5 rounded-full text-neutral-400 hover:text-[#16a34a] transition-colors">
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
  const [showFlavor, setShowFlavor] = useState(false); // 룰박스 설명(플레이버+효과) 기본 숨김 — 탭하면 펼쳐짐
  // 높다/낮다 — 카드를 좌우로 드래그해서 판정(오른쪽=높다, 왼쪽=낮다). 폭의 28% 이상 끌면 확정.
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
    <div className={cn("relative w-full h-full flex flex-col overflow-hidden rounded-[5%] hover:-translate-y-1 p-[3.5%]", !onGuess && "transition-transform duration-200 ease-out", locked && "grayscale-[0.85] brightness-[0.65]")}
      style={{
        background: "linear-gradient(160deg,#232323,#0c0c0c)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 4px 14px -6px rgba(0,0,0,0.6)",
        ...(onGuess ? {
          transform: `translateX(${dragX}px) rotate(${Math.max(-12, Math.min(12, dragX / 14))}deg)`,
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(.34,1.56,.64,1)",
        } : null),
      }}>
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
              {/* 높다/낮다 — 카드를 좌우로 드래그(오른쪽=높다/초록, 왼쪽=낮다/빨강). 놓으면 임계값 넘었는지 판정, 아니면 원위치 */}
              {onGuess && (
                <div ref={dragLayerRef}
                  className="absolute inset-0 z-[6] cursor-grab active:cursor-grabbing touch-none"
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
              {/* 정답 시 다음 카드 — 별도 버튼 대신 카드 위 동일한 사각 라운드 버튼으로 통합 */}
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

      {/* 검정 여백 — 아트존과 룰박스 사이 (레퍼런스의 카드지 마진, 카드 크기에 비례) */}
      <div className="shrink-0 h-[2.2%]" />

      {/* 룰박스: 마룬 대리석 테두리(레퍼런스와 동일한 고정색, 둥근 인셋 박스) + 회청색 바탕 텍스트 — 플레이버 + 효과.
          게임 전체적으로 설명 텍스트가 카드 공간을 차지한다는 피드백에 따라 기본은 업종 라벨만 한 줄
          보이고, 탭하면 플레이버·효과 문구가 펼쳐짐(shrink-0라 접혀 있을 땐 그만큼 아트존이 커짐). */}
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

// 던전 탐험 종료 시 틀린 종목 정보 카드 (무엇을 놓쳤는지 + 그 종목 지표 학습)
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
    <div className="text-left rounded-2xl backdrop-blur-md bg-black/[0.03] dark:bg-black/30 border border-black/5 dark:border-white/10 p-2.5">
      <p className="text-[11px] font-black text-rose-500 mb-1.5">아깝게 놓친 종목</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 break-keep leading-relaxed">
        <b className="text-neutral-800 dark:text-neutral-200">{c.name}</b>의 {missed.statLabel}
        <b className="text-neutral-700 dark:text-neutral-300"> {missed.challengerStr}</b>이(가){" "}
        {missed.anchor.name}({missed.anchorStr})보다{" "}
        <b className="text-rose-500">더 좋았어요</b>.
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
          <div key={m.label} className="rounded-lg bg-white/70 dark:bg-white/[0.05] p-1.5 text-center">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">{m.label}</p>
            <p className="text-xs font-black tabular-nums text-neutral-800 dark:text-neutral-200 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* 점수 계산 과정: 지표별 서브점수 × 가중치 → 종합 (값 없는 지표는 제외) */}
      <div className="rounded-lg bg-white/70 dark:bg-white/[0.05] p-2.5">
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
        <div className="mt-1.5 pt-1.5 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
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

// 이번 던전에서 획득한 카드 목록 (종료 화면). 같은 종목은 ×N 합산, 점수 높은 순.
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
    <div className="text-left rounded-2xl backdrop-blur-md bg-[#16a34a]/[0.06] border border-[#16a34a]/25 p-2.5">
      <p className="text-[11px] font-black text-[#15803d] dark:text-[#16a34a] mb-1.5 flex items-center gap-1">
        <Sparkles size={12} /> 이번 던전 획득 {cards.length}장
      </p>
      {/* 가로 스트립 — 카드 수가 많아도 높이가 고정(한 화면 유지). 좌우로 슬라이드 */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-hide">
        {agg.map(({ item: c, count }) => (
          <div key={c.ticker} className="relative shrink-0 flex items-center gap-1.5 rounded-xl bg-white/70 dark:bg-white/[0.05] border border-black/5 dark:border-white/10 py-1.5 pl-1.5 pr-2.5 text-neutral-700 dark:text-neutral-200">
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

// 이번 던전 탐험(연승) 기록 기반 용사 등급 (전역 리더보드 대신 자체 랭크)
function rankOf(streak: number): { emoji: string; title: string } {
  if (streak >= 15) return { emoji: "👑", title: "전설의 용사" };
  if (streak >= 10) return { emoji: "🏆", title: "던전 정복자" };
  if (streak >= 6) return { emoji: "🛡️", title: "베테랑 용사" };
  if (streak >= 3) return { emoji: "🗡️", title: "던전 탐험가" };
  return { emoji: "🔰", title: "견습 용사" };
}

// 던전 층 진행도 — 원형 노드 나열 대신 꺾은선 그래프로 표시. floor가 커질수록(더 깊이 내려갈수록)
// 선이 아래로 내려가는 "하강" 모양으로 그려 "지하 N층"이라는 세계관과 맞춤. 보스 층은 왕관으로 표시.
type FloorNode = { n: number; floor: number; boss: boolean; cleared: boolean; current: boolean };
function FloorGraph({ nodes }: { nodes: FloorNode[] }) {
  // 원형 노드 나열이던 예전 배지(높이 ~32px)보다 커지면 그만큼 배틀 카드가 작아지므로
  // (배틀 화면은 세로 공간이 병목) 같은 높이 예산 안에서 그리도록 치수를 맞춤.
  const W = 132, H = 24, PAD_X = 10, PAD_TOP = 4;
  const stepX = (W - PAD_X * 2) / (nodes.length - 1);
  const stepY = 3.5; // 층마다 살짝 더 깊이 내려가는 느낌
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

type Phase = "loading" | "battling" | "resolved" | "over";

// useSearchParams는 Suspense 경계가 필요(screener 페이지와 동일 패턴) — 게임 본체를 감싼다
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

  const requireLogin = useCallback(() => {
    router.push(`/login?callbackUrl=${encodeURIComponent("/game")}`);
  }, [router]);

  // 내 덱 열림 상태는 URL(?deck=1)로 관리 — 네비게이션(게임 버튼)에서 열 수 있게. 소프트 내비라 게임 진행 상태는 유지됨.
  const showDeck = searchParams.get("deck") === "1";
  const openDeck = useCallback(() => router.replace("/game?deck=1", { scroll: false }), [router]);
  const closeDeck = useCallback(() => router.replace("/game", { scroll: false }), [router]);

  // 플레이어 카드(항상 공개) vs 상대 카드 — 4개 지표(NCAV·PBR·PER·ROE) 중 하나를 선택해 배틀.
  const [playerCard, setPlayerCard] = useState<any | null>(null);
  const [opponentCard, setOpponentCard] = useState<any | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [shields, setShields] = useState(3); // 방패(목숨) — 0이 되면 런 종료. 패배해도 즉시 끝나지 않음.
  const [roundNum, setRoundNum] = useState(0); // 이번 런 누적 라운드 수(승패 무관). 10의 배수 층마다 보스, 3의 배수 층마다 장비.
  const [streak, setStreak] = useState(0); // 연속 무패(패배 시 0으로 리셋되지만 런은 계속)
  const [totalWins, setTotalWins] = useState(0); // 이번 런 누적 승수 — 최종 스코어
  const [best, setBest] = useState(0); // 역대 최고 승수(서버 동기화)
  const [newBest, setNewBest] = useState(false); // 이번 런에 최고 기록 경신
  const [chosenStat, setChosenStat] = useState<string | null>(null); // 이번 라운드 배틀에 고른 지표
  const [lastResult, setLastResult] = useState<{ win: boolean; statKey: string; shieldLoss?: number; goldGain?: number } | null>(null);
  const [dropped, setDropped] = useState(false);      // 이번 라운드 카드 획득(로그인)
  const [dropPrompt, setDropPrompt] = useState(false); // 카드가 떴지만 로그인 필요
  const [saveFail, setSaveFail] = useState<string | null>(null); // 덱 저장 실패 사유
  const [escaped, setEscaped] = useState<string | null>(null); // 높은 등급 카드가 도망감(메달)
  const [deck, setDeck] = useState<DeckItem[]>([]);
  const [missed, setMissed] = useState<any | null>(null); // 패배 라운드의 지표 비교 정보
  const [acquired, setAcquired] = useState<DeckCardSnapshot[]>([]); // 이번 런에서 획득한 카드
  const [history, setHistory] = useState<any[]>([]); // 전투 기록 {player, opponent, statKey, win} — 최근 10개
  const [showHistory, setShowHistory] = useState(false); // 전투 기록 패널 열림 상태
  const [coins, setCoins] = useState(0); // 지갑 코인 잔액
  const [showShop, setShowShop] = useState(false);
  const [activeBoost, setActiveBoost] = useState<{ mult: number; roundsLeft: number } | null>(null); // 상점 부스트(세션 로컬)
  const [packOpening, setPackOpening] = useState(false); // 팩 오픈 리빌 연출 표시 중
  const [firstDupHint, setFirstDupHint] = useState(false); // 첫 중복 카드 획득 시 지갑/전환 안내
  const [showTutorial, setShowTutorial] = useState(false); // 방법 안내 모달(첫 방문 자동 표시 + ? 버튼으로 재열람)
  const [showStatus, setShowStatus] = useState(false); // 용사 상태창(방패·연승·골드·장비 등) 모달
  const [showResultDetail, setShowResultDetail] = useState(false); // 결과 화면 상세(업적·획득 카드·놓친 종목) 접힘 상태 — 기본은 핵심 정보만
  const [gold, setGold] = useState(0); // 이번 런 골드(층 클리어·카드 획득마다 적립) — 던전을 나가면 초기화
  const [equipment, setEquipment] = useState<Equipment>(EMPTY_EQUIPMENT); // 이번 런 장비(슬롯별 아이템 id) — 던전을 나가면 초기화
  const [itemChoices, setItemChoices] = useState<EquipItem[] | null>(null); // 3라운드마다 뜨는 장비 선택지(null=선택 없음)
  // 장비 도감 — 지금까지 한 번이라도 장착해본 장비 id. 장비 자체는 런 한정이지만 "얼마나 모아봤는지"는
  // 로컬에 영구 저장해 다음 던전에서도 이어짐(best 연승 기록과 같은 패턴).
  const equipLogKey = "iq:game:equipLog";
  const [equipmentLog, setEquipmentLog] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(equipLogKey);
      if (raw) setEquipmentLog(new Set(JSON.parse(raw)));
    } catch { }
  }, []);

  const equippedItems = useMemo(() =>
    EQUIP_SLOTS.map(s => equipment[s]).filter((id): id is string => !!id)
      .map(id => EQUIP_POOL.find(i => i.id === id)!).filter(Boolean),
    [equipment]);
  const setCount = useCallback((set: EquipSetId) => equippedItems.filter(i => i.set === set).length, [equippedItems]);
  // 장비 총 보너스 = 슬롯별 기본 효과 합 + (같은 세트로 3/5/7개 채웠을 때) 세트 보너스
  const equipBonus = useMemo(() => {
    let maxShield = 0, shieldLossReduce = 0, acquirePctBonus = 0, goldMult = 1;
    for (const item of equippedItems) {
      if (item.slot === "helmet" || item.slot === "shield") maxShield += 1;
      else if (item.slot === "armor") shieldLossReduce += 1;
      else if (item.slot === "weapon") acquirePctBonus += 0.06;
      else if (item.slot === "necklace") acquirePctBonus += 0.04;
      else if (item.slot === "accessory1" || item.slot === "accessory2") goldMult += 0.25;
    }
    const gCount = setCount("guardian"), rCount = setCount("raider");
    if (gCount >= 3) maxShield += 1;
    if (gCount >= 5) shieldLossReduce += 1;
    if (gCount >= 7) maxShield += 2;
    if (rCount >= 3) acquirePctBonus += 0.05;
    if (rCount >= 5) goldMult += 0.25;
    if (rCount >= 7) acquirePctBonus += 0.10;
    return { maxShield, shieldLossReduce, acquirePctBonus, goldMult };
  }, [equippedItems, setCount]);

  const pickItem = useCallback((id: string) => {
    const item = EQUIP_POOL.find(i => i.id === id);
    if (!item) return;
    setEquipment(e => ({ ...e, [item.slot]: id }));
    setEquipmentLog(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem(equipLogKey, JSON.stringify([...next])); } catch { }
      return next;
    });
    setItemChoices(null);
  }, []);
  const skipItem = useCallback(() => setItemChoices(null), []);

  // 처음 방문이면 방법 안내를 자동으로 한 번 띄움 — 재방문 시엔 뜨지 않고 ? 버튼으로만 열람
  const tutorialKey = "iq:game:tutorialSeen";
  useEffect(() => {
    try {
      if (!localStorage.getItem(tutorialKey)) setShowTutorial(true);
    } catch { }
  }, []);
  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    try { localStorage.setItem(tutorialKey, "1"); } catch { }
  }, []);

  // 배틀 카드 두 장(플레이어+상대)이 나란히 들어갈 크기 — 모바일/데스크톱 공통 레이아웃이라 남은 공간을
  // JS로 실측해 두 장이 꼭 맞게 들어가는 픽셀 크기를 직접 계산(CSS만으로는 남는 공간을 다 못 채우는 문제가 있었음).
  // 콜백 ref 사용: 카드 박스는 phase에 따라 조건부로 마운트되므로 일반 useEffect([])로는 최초 렌더 시점에
  // DOM이 없어 옵저버가 아예 안 붙는 문제가 있었음 — 콜백 ref는 노드가 실제로 마운트될 때마다 호출됨.
  const battleRowRoRef = useRef<ResizeObserver | null>(null);
  const [battleCardSize, setBattleCardSize] = useState<{ w: number; h: number } | null>(null);
  const battleRowRef = useCallback((el: HTMLDivElement | null) => {
    battleRowRoRef.current?.disconnect();
    battleRowRoRef.current = null;
    if (!el) return;
    // width / height — 배틀 화면은 세로 공간이 항상 병목(카드가 남은 높이에 맞춰 커짐)이라,
    // 0.75(실제 TCG 카드 비율)로는 좌우에 안 쓰는 여백이 많이 남음. 카드가 작아 보인다는
    // 반복된 피드백에 따라 0.8로 살짝 넓혀 그 여백만큼 카드가 더 커 보이게 함.
    const RATIO = 0.8;
    const GAP = 6; // JSX의 gap-1.5(카드 사이 간격)와 일치해야 함 — VS 배지를 없애 카드 사이엔 이 간격 하나만 남음
    const RESERVED = GAP; // 카드 두 장 사이 간격 1번만 예약
    const update = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const wByHeight = h * RATIO;
      if (wByHeight * 2 + RESERVED <= w) {
        setBattleCardSize({ w: wByHeight, h });
      } else {
        const wByWidth = (w - RESERVED) / 2;
        setBattleCardSize({ w: wByWidth, h: wByWidth / RATIO });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    battleRowRoRef.current = ro;
  }, []);

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

  // 서로 다른 두 카드를 뽑되, 보스전이면 상대를 고등급 풀에서 우선 선택. 배틀 가능한(둘 다 데이터 있는)
  // 공통 지표가 하나도 없으면 다시 뽑음(최대 20회 시도).
  const drawPair = useCallback((boss: boolean): [any, any] | null => {
    if (pool.length < 2) return null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      let candidates = pool;
      if (boss) {
        const strong = pool.filter((it: any) => it.ticker !== p.ticker && ["gold", "diamond", "treasure", "legend"].includes(computeValueScore(it).tone));
        if (strong.length > 0) candidates = strong;
      }
      let o = candidates[Math.floor(Math.random() * candidates.length)];
      for (let i = 0; i < 10 && o.ticker === p.ticker; i++) o = candidates[Math.floor(Math.random() * candidates.length)];
      if (o.ticker === p.ticker) continue;
      const pv = computeValueScore(p), ov = computeValueScore(o);
      const hasCommonStat = pv.parts.some(part => part.available && ov.parts.find(op => op.key === part.key)?.available);
      if (hasCommonStat) return [p, o];
    }
    return [pool[0], pool[1 % pool.length]];
  }, [pool]);

  const start = useCallback(() => {
    const pair = drawPair(false);
    if (!pair) return;
    setPlayerCard(pair[0]); setOpponentCard(pair[1]);
    setShields(3); setRoundNum(0);
    setStreak(0); setTotalWins(0); setNewBest(false);
    setChosenStat(null); setLastResult(null);
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setMissed(null);
    setAcquired([]); setPackOpening(false); setFirstDupHint(false); setHistory([]);
    setGold(0); setEquipment(EMPTY_EQUIPMENT); setItemChoices(null); // 골드·장비는 던전(런) 단위 — 새 던전 입장 시 초기화
    setShowResultDetail(false);
    setPhase("battling");
  }, [drawPair]);

  const started = useRef(false);
  useEffect(() => {
    if (!started.current && pool.length >= 2) { started.current = true; start(); }
  }, [pool, start]);

  // 지표(NCAV/PBR/PER/ROE) 하나를 골라 배틀 — sub(0~1 정규화 점수)로 비교하므로 지표별 방향(NCAV는 높을수록,
  // PBR·PER은 낮을수록 좋음)을 신경 쓸 필요 없이 그대로 비교하면 됨.
  const battle = useCallback((statKey: string) => {
    if (phase !== "battling" || !playerCard || !opponentCard) return;
    const pv = computeValueScore(playerCard), ov = computeValueScore(opponentCard);
    const pPart = pv.parts.find(p => p.key === statKey);
    const oPart = ov.parts.find(p => p.key === statKey);
    if (!pPart?.available || !oPart?.available) return;
    const win = pPart.sub >= oPart.sub; // 동점은 승리 처리
    // 패배 대가 — 밀어붙인 연승(streak)이 길수록 커짐(3연승마다 +1, 최대 보유 방패만큼).
    // "한 판 더" 를 계속 고를수록 다음 패배가 더 아파지는 푸시-유어-럭 긴장감 장치. 갑옷/수호자 세트 장비는 -N(최소 1).
    const shieldLoss = win ? 0 : Math.max(1, Math.min(shields, 1 + Math.floor(streak / 3)) - equipBonus.shieldLossReduce);
    setChosenStat(statKey);
    setLastResult({ win, statKey, shieldLoss });
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setFirstDupHint(false);
    setPhase("resolved");

    // 상점에서 산 확률 부스트는 세션 로컬로만 추적 — 라운드(승패 무관)마다 1씩 소진
    if (activeBoost) {
      setActiveBoost(b => (b && b.roundsLeft > 1) ? { ...b, roundsLeft: b.roundsLeft - 1 } : null);
    }

    if (win) {
      const ns = streak + 1;
      setStreak(ns);
      const nt = totalWins + 1;
      setTotalWins(nt);
      if (nt > best) {
        setBest(nt); setNewBest(true);
        try { localStorage.setItem(bestKey, String(nt)); } catch { }
        if (isLoggedIn) syncBestStreak(nt).catch(() => { });
      }

      // 승리 카드만 수집. 연승↑ → 획득 확률↑, 높은 등급일수록 더 높은 연승 필요. 부스트 배율 + 무기/목걸이/약탈자 세트 장비 적용.
      const chance = Math.min(0.95, acquireChance(opponentCard, ns) * (activeBoost?.mult ?? 1) + equipBonus.acquirePctBonus);
      const willDrop = Math.random() < chance;

      // 골드 — 층 클리어(기본) + 보스 처치 보너스 + 카드 획득 보너스. 장신구/약탈자 세트 장비면 배율 적용.
      // 보스는 10라운드마다(기존 5라운드에서 변경), 장비는 3라운드마다 획득 — 두 주기가 겹치는 30라운드째는
      // 보스 조우를 우선하고 그 라운드의 장비 드랍은 건너뜀(30라운드마다 1번뿐이라 무시 가능한 손실).
      const isBossRound = roundNum > 0 && roundNum % 10 === 0;
      const isItemRound = roundNum > 0 && roundNum % 3 === 0 && !isBossRound;
      const goldGain = Math.round((3 + (isBossRound ? 15 : 0) + (willDrop ? 5 : 0)) * equipBonus.goldMult);
      setGold(g => g + goldGain);
      setLastResult(r => (r ? { ...r, goldGain } : r));

      // 3라운드마다 장비 3택1 선택지 제공(품절 걱정 없음 — pickItemChoices 주석 참고)
      if (isItemRound) {
        setItemChoices(pickItemChoices(equipment));
      }

      if (willDrop) {
        const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        setPackOpening(true);
        setTimeout(() => setPackOpening(false), reduceMotion ? 50 : 650);

        if (!isLoggedIn) {
          setDropPrompt(true);
        } else {
          const snap = toCard(opponentCard);
          addDeckCard(snap).then(res => {
            if (res?.added) {
              setDropped(true);
              if (res.count === 2) setFirstDupHint(true); // 처음으로 중복 카드가 생긴 순간 — 전환 기능 안내
              setAcquired(prev => [snap, ...prev]); // 이번 런 획득 목록에 추가
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
        const v = computeValueScore(opponentCard);
        if (["silver", "gold", "diamond", "treasure", "legend"].includes(v.tone)) setEscaped(v.medal);
      }
    } else {
      // 패배 — 방패 shieldLoss개 소모(런은 계속). 패배 라운드의 지표 비교 정보 스냅샷(종료 화면/자동 표시용)
      setStreak(0);
      setShields(s => s - shieldLoss);
      setMissed({
        challenger: opponentCard, anchor: playerCard,
        statLabel: pPart.label,
        anchorStr: pPart.valueStr,
        challengerStr: oPart.valueStr,
        higherSide: "challenger", // 패배 라운드는 항상 상대(opponentCard) 지표가 더 좋았던 경우
      });
    }
  }, [phase, playerCard, opponentCard, best, bestKey, isLoggedIn, streak, totalWins, activeBoost, shields, roundNum, equipment, equipBonus]);

  // 승리든 패배든, 방패가 남아있으면 그 자리에서 런을 마무리(안전 정리)할 수 있음 — "더 갈까 여기서 챙길까" 선택지.
  const cashOut = useCallback(() => {
    if (phase !== "resolved") return;
    setPhase("over");
  }, [phase]);

  const nextRound = useCallback(() => {
    if (phase !== "resolved" || shields <= 0 || !playerCard || !opponentCard) return;
    setHistory(h => [...h, { player: playerCard, opponent: opponentCard, statKey: chosenStat, win: lastResult?.win ?? false }].slice(-10));
    const nextNum = roundNum + 1;
    const boss = nextNum % 10 === 0;
    const pair = drawPair(boss);
    if (!pair) return;
    setRoundNum(nextNum);
    setPlayerCard(pair[0]); setOpponentCard(pair[1]);
    setChosenStat(null); setLastResult(null);
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setPackOpening(false); setFirstDupHint(false);
    setPhase("battling");
  }, [phase, shields, playerCard, opponentCard, chosenStat, lastResult, roundNum, drawPair]);

  useEffect(() => { if (phase === "resolved" && shields <= 0) setPhase("over"); }, [phase, shields]);

  const isLoading = ncav.state === "pending" || ncav.state === "init" || pool.length < 2;

  // 획득 확률 — 승리 시(연승+1) 이 카드 획득 확률. 연승↑·낮은 등급↑, 높은 등급은 더 높은 연승 필요. 상점 부스트 + 무기/목걸이/약탈자 세트 장비 반영.
  const acquirePct = opponentCard ? Math.round(Math.min(0.95, acquireChance(opponentCard, streak + 1) * (activeBoost?.mult ?? 1) + equipBonus.acquirePctBonus) * 100) : 0;
  const ownedOpponent = opponentCard ? deck.find(c => c.ticker === opponentCard.ticker) : undefined;
  const playerParts = playerCard ? computeValueScore(playerCard).parts : [];
  const opponentParts = opponentCard ? computeValueScore(opponentCard).parts : [];
  const nextLossPenalty = Math.max(1, Math.min(shields, 1 + Math.floor(streak / 3)) - equipBonus.shieldLossReduce); // "다음 패배 시 방패 -N" 경고에 표시
  const maxShields = 3 + equipBonus.maxShield; // 투구/방패 장비·수호자 세트 보너스만큼 최대 방패 +N(HUD 아이콘 수)
  // 최대 방패가 늘어나기만 하고 현재 방패는 그대로면(예: 3/4) "장비 효과가 안 먹는 것처럼" 보임 —
  // 늘어난 만큼(delta) 현재 방패도 즉시 채워줌(기존 유물 "수호의 방패"가 즉시 +1 주던 것과 동일 UX).
  // 런 시작(start)으로 maxShields가 줄어드는 경우엔 delta<=0이라 자연히 무시됨.
  const prevMaxShieldsRef = useRef(maxShields);
  useEffect(() => {
    const delta = maxShields - prevMaxShieldsRef.current;
    if (delta > 0) setShields(s => Math.min(maxShields, s + delta));
    prevMaxShieldsRef.current = maxShields;
  }, [maxShields]);
  // 상단 던전 층 표시 — 현재 층 기준 앞뒤 슬라이딩 창(5칸). floor=roundNum+1(1층부터), 10의 배수 층마다 보스(기존 5에서 변경).
  const floorWindow = useMemo(() => {
    const start = Math.max(0, roundNum - 1);
    return Array.from({ length: 5 }, (_, i) => start + i).map(n => ({
      n, floor: n + 1, boss: n > 0 && n % 10 === 0, cleared: n < roundNum, current: n === roundNum,
    }));
  }, [roundNum]);

  return (
    // main의 pt-[48px]/pb-[64px](모바일 헤더·하단 탭 바) 안에서 100svh를 기준으로 높이를 역산하면
    // 주소창 접힘·기종별 오차로 몇 px씩 어긋나 문서 전체가 스크롤되고, 그 여백만큼 하단 탭 바에
    // 화면 일부가 가려지는 문제가 있었음. top/bottom을 뷰포트에 직접 고정(fixed)해서 헤더·탭 바가
    // 차지하는 만큼만 비워두면 뷰포트 단위 계산 자체가 필요 없어 이 오차가 생기지 않음.
    // z-50: position:fixed는 z-index 값과 무관하게 항상 새 스태킹 컨텍스트를 만들기 때문에, 이 안의
    // 튜토리얼/기록/상태창 모달(z-50)이 하단 탭 바(z-40, 이 div 밖의 형제 요소)와 비교될 때 모달의
    // z-50이 아니라 이 div 자체의 z-index로 비교됨 — z-index를 지정하지 않으면(auto) 탭 바에 가려짐.
    <div className="fixed z-50 left-0 right-0 top-[48px] bottom-[64px] md:left-[220px] md:top-0 md:bottom-0 flex flex-col overflow-hidden bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-200 dark:from-[#0a0a0e] dark:via-[#101015] dark:to-[#08080a] transition-colors">
      {/* 프리미엄 아레나 배경 — 카드 위쪽에 은은한 스포트라이트 글로우 + 격자 텍스처 */}
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "radial-gradient(55% 45% at 50% 24%, rgba(168,85,247,0.12), transparent 70%)" }} />
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] dark:opacity-[0.08]"
        style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="relative z-10 w-full max-w-2xl sm:max-w-4xl mx-auto px-1 sm:px-2 pt-3 pb-1 flex-1 min-h-0 flex flex-col">

        {/* 상단 메뉴 바 없음 — 홈·제목·내 덱 접근은 전역 네비게이션(게임 버튼)에 통합됨 */}

        {/* 본문 — 항상 스크롤 가능. 플레이는 flex-1 로 남은 공간을 채움(넘치면 스크롤), 종료/덱은 자연 스크롤 */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {showDeck ? (
          <DeckView deck={deck} catalog={catalog} best={best} coins={coins} isLoggedIn={isLoggedIn}
            onLogin={requireLogin} onClose={() => { setShowShop(false); closeDeck(); }}
            showShop={showShop} onToggleShop={() => setShowShop(v => !v)}
            onBuyBoost={(item) => setActiveBoost({ mult: item.mult, roundsLeft: item.rounds })}
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
          <div className={cn("w-full", phase === "over" ? "flex flex-col sm:flex-1 sm:min-h-0" : "flex flex-col flex-1 min-h-0")}>
            {/* 상단 HUD (플레이 중에만) — 방패(목숨) · 던전 층 · 승수/최고/획득확률 · 골드/장비 글래스 배지.
                골드/장비/부스트/보유/기록 배지는 게임 진행 중 나타났다 사라지는데, 예전엔 이 배지들이
                본체 HUD 행에 같이 섞여 있어서 배지 유무에 따라 HUD 행이 1~2줄을 오갔고, 그 높이 변화가
                battleRowRef의 ResizeObserver를 타고 카드 크기를 흔들리게 했음(요청: "UI 틀이 흔들리지
                않게"). 그래서 "핵심 정보(1행, 값만 바뀌고 구성은 항상 동일)"와 "조건부 배지(2행, 높이
                고정 h-8 + 넘치면 줄바꿈 대신 가로 스크롤)"를 분리해 HUD 전체 높이를 항상 고정시킴. */}
            {phase !== "over" && (
              <div className="shrink-0 mb-1 sm:mb-2 space-y-1">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
                    {Array.from({ length: maxShields }, (_, i) => (
                      <Shield key={i} size={15} strokeWidth={2.5}
                        className={i < shields ? "text-[#16a34a] fill-[#16a34a]/25" : "text-neutral-300 dark:text-neutral-700"} />
                    ))}
                  </div>
                  {/* 던전 층 표시 — 원형 노드 나열 대신 꺾은선 그래프. 회색=미탐험, 초록=돌파, 빨강(확대)=현재, 왕관=보스층 */}
                  <div className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider pr-0.5 whitespace-nowrap">지하{roundNum + 1}층</span>
                    <FloorGraph nodes={floorWindow} />
                  </div>
                  <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
                    <div className="text-center px-2.5 sm:px-3">
                      <p className="flex items-center justify-center gap-1 text-base sm:text-xl font-black tabular-nums text-[#16a34a] leading-none">
                        <Flame size={13} strokeWidth={2.5} className="shrink-0" />{totalWins}
                      </p>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5 sm:mt-1">승수</p>
                    </div>
                    <div className="h-6 sm:h-7 w-px bg-neutral-200 dark:bg-white/10" />
                    <div className="text-center px-2.5 sm:px-3">
                      <p className="flex items-center justify-center gap-1 text-base sm:text-xl font-black tabular-nums text-amber-500 leading-none">
                        <Trophy size={13} strokeWidth={2.5} className="shrink-0" />{best}
                      </p>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5 sm:mt-1">최고</p>
                    </div>
                    {phase === "battling" && opponentCard && (
                      <>
                        <div className="h-6 sm:h-7 w-px bg-neutral-200 dark:bg-white/10" />
                        <div className="text-center px-2.5 sm:px-3">
                          <p className="flex items-center justify-center gap-1 text-base sm:text-xl font-black tabular-nums text-amber-600 dark:text-amber-400 leading-none">
                            <Target size={13} strokeWidth={2.5} className="shrink-0" />{acquirePct}%
                          </p>
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5 sm:mt-1">획득 확률</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 h-8 overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-hide">
                  {gold > 0 && (
                    // 상점의 영구 "코인"(🪙, 은색/amber Coins 아이콘)과 혼동되지 않도록 이번 던전 한정
                    // "골드"는 다른 아이콘(💰)·문구로 구분 — 두 재화는 서로 별개(런 종료 시 골드만 초기화)
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-bold tabular-nums">
                      💰 골드 {gold}
                    </span>
                  )}
                  {equippedItems.length > 0 && (
                    // 장비 효과 상세 설명은 아래 "상태창"으로 통합(간단 뱃지는 탭하면 바로 상태창을 엶)
                    <button key={equippedItems.length} type="button" onClick={() => setShowStatus(true)} aria-label="상태창 보기 — 장비"
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-violet-500/10 border border-violet-500/25 text-[10px] font-bold text-violet-600 dark:text-violet-400 tabular-nums animate-in zoom-in-50 duration-300">
                      🎒 {equippedItems.length}/{EQUIP_SLOTS.length}
                    </button>
                  )}
                  {phase === "battling" && activeBoost && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-bold tabular-nums">
                      <Wand2 size={11} strokeWidth={2.5} /> ×{activeBoost.mult}·{activeBoost.roundsLeft}판
                    </span>
                  )}
                  {phase === "battling" && ownedOpponent && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-[#16a34a]/10 border border-[#16a34a]/25 text-[#16a34a] text-[10px] font-bold tabular-nums">
                      <Layers size={11} strokeWidth={2.5} /> ×{ownedOpponent.count}
                    </span>
                  )}
                  {history.length > 0 && (
                    <button type="button" onClick={() => setShowHistory(true)} aria-label="전투 기록 보기"
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)] text-[11px] font-bold text-neutral-500 dark:text-neutral-300 hover:text-[#16a34a] transition-colors">
                      <History size={13} /> {history.length}
                    </button>
                  )}
                  <button type="button" onClick={() => setShowStatus(true)} aria-label="상태창 보기"
                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)] text-neutral-500 dark:text-neutral-300 hover:text-[#16a34a] transition-colors">
                    <UserRound size={14} />
                  </button>
                  <button type="button" onClick={() => setShowTutorial(true)} aria-label="게임 방법 보기"
                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)] text-neutral-500 dark:text-neutral-300 hover:text-[#16a34a] transition-colors">
                    <Info size={14} />
                  </button>
                </div>
              </div>
            )}

            {phase === "over" ? (
              // 결과 카드: 모바일은 본문 단일 스크롤로 자연스럽게 흐르고, 데스크톱(sm+)은 뷰포트를 꽉 채우고 헤더·버튼 고정 + 중간만 내부 스크롤
              <div className="flex flex-col rounded-3xl backdrop-blur-md bg-white/85 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-300 sm:flex-1 sm:min-h-0 sm:overflow-hidden">
                {/* 프리미엄 글로우 헤더 — 등급 이모지 + 스포트라이트 */}
                <div className="relative h-20 sm:h-40 shrink-0 overflow-hidden"
                  style={{ background: "radial-gradient(60% 90% at 50% 105%, rgba(192,38,211,0.28), transparent 70%), linear-gradient(180deg, #18171e, #0a0a0d)" }}>
                  <div aria-hidden className="absolute inset-0 opacity-[0.08]"
                    style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div className="relative h-full flex items-center justify-center">
                    <span aria-hidden className="text-4xl sm:text-6xl" style={{ filter: "drop-shadow(0 0 18px rgba(192,38,211,0.55))" }}>{rankOf(totalWins).emoji}</span>
                  </div>
                  {newBest && totalWins > 0 && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-white text-[11px] font-black shadow-md animate-in fade-in zoom-in-95">
                      🎉 신기록
                    </span>
                  )}
                </div>

                {/* 중간 — 모바일은 자연 흐름(본문 스크롤), 데스크톱은 이 영역만 내부 스크롤(헤더·버튼 항상 보임) */}
                <div className="px-5 pt-1.5 pb-2 text-center space-y-2 sm:flex-1 sm:min-h-0 sm:overflow-y-auto">
                  <div>
                    <p className="text-lg font-black text-neutral-900 dark:text-white">던전 탐험 종료!</p>
                    <p className="text-[11px] font-bold text-neutral-400 mt-0.5">
                      {shields <= 0 ? "던전 깊은 곳에서 쓰러지고 말았어요" : "무사히 던전을 빠져나왔어요"}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#86efac]/60 dark:border-[#166534]/60 text-[#15803d] dark:text-[#16a34a] text-xs font-black">
                      <span aria-hidden className="text-sm leading-none">{rankOf(totalWins).emoji}</span>{rankOf(totalWins).title}
                    </span>
                  </div>

                  {/* 이번 런 성과 — 핵심 3종 스탯만 항상 보이게(간단 명료). 업적 배지·획득 카드·놓친 종목
                      같은 부가 정보는 "자세히 보기"를 눌러야 펼쳐지는 별도 섹션으로 분리 */}
                  <div className="rounded-2xl backdrop-blur-md bg-black/[0.03] dark:bg-black/30 border border-black/5 dark:border-white/10 p-2.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">이번 런 성과</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-white/70 dark:bg-white/[0.05] py-1.5">
                        <p className="flex items-center justify-center gap-1 text-xl font-black tabular-nums text-[#16a34a] leading-none">
                          <Flame size={15} strokeWidth={2.5} />{totalWins}
                        </p>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">총 승수</p>
                      </div>
                      <div className="rounded-xl bg-white/70 dark:bg-white/[0.05] py-1.5">
                        <p className="flex items-center justify-center gap-1 text-xl font-black tabular-nums text-amber-500 leading-none">
                          <Trophy size={15} strokeWidth={2.5} />{best}
                        </p>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">최고 기록</p>
                      </div>
                      <div className="rounded-xl bg-white/70 dark:bg-white/[0.05] py-1.5">
                        <p className="flex items-center justify-center gap-1 text-xl font-black tabular-nums text-rose-500 leading-none">
                          <Crown size={15} strokeWidth={2.5} />{Math.floor(roundNum / 5)}
                        </p>
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
                        <div className="flex justify-center">
                          <AchievementBadges deck={deck} best={best} catalogTotal={catalog.length} />
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-2 break-keep">
                          {isLoggedIn ? <>발굴한 카드는 <b className="text-neutral-600 dark:text-neutral-300">내 덱({deckTotal(deck)})</b>에 쌓였습니다.</> : "로그인하면 발굴한 카드를 덱에 모을 수 있어요."}
                        </p>
                        {(gold > 0 || equippedItems.length > 0) && (
                          <p className="text-[11px] text-neutral-400 mt-1 break-keep">
                            💰 이번 던전 골드 {gold}
                            {equippedItems.length > 0 && <> · 장비 {equippedItems.map(i => i.icon).join(" ")}</>}
                            <span className="block mt-0.5">던전을 나가면 초기화돼요</span>
                          </p>
                        )}
                      </div>
                      {acquired.length > 0 && <AcquiredThisGame cards={acquired} />}
                      {missed && <MissedInfo missed={missed} />}
                    </div>
                  )}
                </div>

                {/* 버튼 고정 (항상 보임) — 그라데이션 + 글로우 프리미엄 버튼 */}
                <div className="shrink-0 px-5 pb-3 pt-2 border-t border-black/5 dark:border-white/10">
                  <button onClick={start}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-black text-sm shadow-[0_8px_24px_-8px_rgba(22,163,74,0.55)] active:scale-[0.98] transition-all">
                    <Swords size={16} /> 새 던전 입장
                  </button>
                </div>
              </div>
            ) : playerCard && opponentCard ? (
              <>
                {/* 배틀 아레나 — 모바일/데스크톱 공통 레이아웃. 두 카드가 남은 세로 공간을 JS로 실측해 꽉 채움(스크롤 방지).
                    카드가 작아진다는 피드백에 따라 VS 배지를 없애 그 공간만큼 카드를 더 키움 — 카드 사이
                    간격(gap-1.5)은 battleRowRef의 RESERVED 계산과 반드시 일치시켜야 함.
                    "내 카드"/"몬스터" 라벨은 예전엔 카드 위에 별도 행으로 떨어뜨려 배치했는데, 라벨과
                    카드 사이가 붕 떠 보인다는 피드백에 따라 각 카드 wrapper를 relative로 만들고 라벨을
                    카드 상단 테두리에 겹치는 배지로 바로 부착함(행 자체를 없애 카드 세로 공간도 늘어남). */}
                <div ref={battleRowRef} className="flex-1 min-h-0 flex items-center justify-center gap-1.5">
                  <div className="relative" style={battleCardSize ? { width: battleCardSize.w, height: battleCardSize.h } : { width: "38%", maxWidth: 220, aspectRatio: "0.8" }}>
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#16a34a] text-white text-[9px] font-black shadow-md whitespace-nowrap">🗡️ 내 카드</span>
                    <TcgCard hero item={playerCard} value={STAT.fmt(STAT.get(playerCard))} rank={rankMap.get(String(playerCard.ticker))} />
                  </div>
                  <div className="relative" style={battleCardSize ? { width: battleCardSize.w, height: battleCardSize.h } : { width: "38%", maxWidth: 220, aspectRatio: "0.8" }}>
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black shadow-md whitespace-nowrap">👹 몬스터</span>
                    <TcgCard hero item={opponentCard} value={STAT.fmt(STAT.get(opponentCard))} rank={rankMap.get(String(opponentCard.ticker))} />
                  </div>
                </div>

                {/* 지표 픽커 — 가로로 긴 행 4개를 쌓던 걸 세로 한 줄(4열 그리드)로 바꿈. 버튼이 화면의
                    절반 가까이 차지해 카드가 작아 보인다는 피드백 대응 — 행 4개(각 ~38px+간격)를
                    한 줄로 압축해 카드 공간을 크게 돌려줌. 칸이 좁아 라벨/내 값/태그를 세로로 쌓아 표시하고,
                    고른 지표만 라운드 종료 후 태그 자리에 상대 값이 나타남(같은 칸이 태그→값으로 전환). */}
                <div className="shrink-0 grid grid-cols-4 gap-1.5 mt-1.5">
                  {playerParts.map(pPart => {
                    const oPart = opponentParts.find(o => o.key === pPart.key);
                    const bothAvailable = !!(pPart.available && oPart?.available);
                    const isChosen = chosenStat === pPart.key;
                    const revealed = phase === "resolved" && isChosen;
                    const tag = statTag(pPart.sub);
                    return (
                      <button key={pPart.key} type="button" disabled={phase !== "battling" || !bothAvailable}
                        onClick={() => battle(pPart.key)}
                        className={cn("flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl border backdrop-blur-md transition-all",
                          !bothAvailable ? "opacity-40 border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] cursor-not-allowed"
                            : revealed ? (lastResult?.win ? "border-[#16a34a]/50 bg-[#16a34a]/10" : "border-rose-500/50 bg-rose-500/10")
                              : "border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] hover:border-[#16a34a]/40 active:scale-[0.98]")}>
                        <span className="text-[9px] font-bold text-neutral-400">{pPart.label}</span>
                        <span className="text-xs font-black tabular-nums text-neutral-700 dark:text-neutral-200">{pPart.available ? pPart.valueStr : "—"}</span>
                        <span className={cn("px-1.5 py-0.5 rounded-full text-[8px] font-black",
                          revealed ? "text-neutral-500 dark:text-neutral-400" : pPart.available ? tag.cls : "text-neutral-400")}>
                          {revealed ? (oPart?.valueStr ?? "—") : pPart.available ? tag.label : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 결과 안내 / 다음 전투 / 획득·로그인 유도 — 배틀 힌트(1줄)와 결과 메시지(승패+부가문구+
                    버튼, 최대 3~4줄)의 줄 수 차이가 커서, 예전엔 min-height만 걸어 뒀더니 내용에 따라
                    이 블록 높이가 늘었다 줄었다 하고 그때마다 battleRowRef가 카드 크기를 재계산해
                    흔들렸음. 높이를 고정(h-24)하고 내용을 그 안에서 세로 중앙 정렬해 어떤 상태든
                    이 블록 자체의 높이가 절대 바뀌지 않게 함. */}
                <div className="shrink-0 h-24 flex flex-col items-center justify-center text-center mt-1 overflow-hidden">
                  {packOpening ? (
                    <PackReveal item={opponentCard} />
                  ) : phase === "battling" ? (
                    <p className="text-xs font-bold text-neutral-400">
                      몬스터와 겨룰 지표를 하나 골라보세요 ⚔️
                      {streak >= 3 && <span className="block mt-0.5 text-rose-500">⚠️ 다음 패배 시 방패 -{nextLossPenalty}</span>}
                    </p>
                  ) : (
                    // 결과 메시지가 배틀 힌트(1줄)보다 훨씬 길어지면(승패+획득/도망 메시지+버튼) 카드가
                    // 그만큼 눌려서 작아 보인다는 피드백에 따라, 부가 메시지들을 더 작은 글씨(text-[10px])로
                    // 압축하고 줄 간격(space-y-0.5)도 좁혀서 이 블록 전체 높이를 최대한 줄임.
                    <div className="space-y-0.5">
                      <p className={cn("text-sm font-black animate-in fade-in", lastResult?.win ? "text-[#16a34a]" : "text-rose-500")}>
                        {lastResult?.win ? "승리! ✔" : `패배! 방패 -${lastResult?.shieldLoss ?? 1}`}
                        {lastResult?.win && !!lastResult.goldGain && (
                          <span className="ml-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">💰 +{lastResult.goldGain}</span>
                        )}
                      </p>
                      {lastResult?.win && dropped && (
                        <span className="flex flex-col items-center gap-0.5 animate-in fade-in slide-in-from-bottom-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Sparkles size={11} /> 카드 획득! {opponentCard.name} 이(가) 덱에 추가됨
                          </span>
                          {firstDupHint && (
                            <button onClick={openDeck}
                              className="text-[10px] font-bold text-neutral-400 hover:text-[#16a34a] hover:underline">
                              🪙 같은 카드가 2장이 됐어요 — 내 덱에서 코인으로 전환해보세요 →
                            </button>
                          )}
                        </span>
                      )}
                      {lastResult?.win && dropPrompt && (
                        <button onClick={requireLogin}
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#16a34a] animate-in fade-in hover:underline">
                          <Lock size={11} /> 카드가 나왔어요! 로그인하고 덱에 담기 →
                        </button>
                      )}
                      {lastResult?.win && !dropped && !dropPrompt && saveFail && (
                        <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 animate-in fade-in">덱 저장 실패 — {saveFail}</span>
                      )}
                      {lastResult?.win && !dropped && !dropPrompt && !saveFail && escaped && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-in fade-in">{escaped} 등급 카드가 도망갔어요 — 연승을 쌓으면 획득 확률↑</span>
                      )}
                      {shields > 0 && !itemChoices && (
                        <div className="flex items-center justify-center gap-2 pt-0.5">
                          <button onClick={cashOut}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/[0.05] hover:border-amber-500/50 text-neutral-600 dark:text-neutral-300 font-black text-xs active:scale-[0.97] transition-all">
                            <Trophy size={13} className="text-amber-500" /> 여기서 정리
                          </button>
                          <button onClick={nextRound}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:brightness-110 text-white font-black text-xs shadow-[0_6px_16px_-6px_rgba(22,163,74,0.55)] active:scale-[0.97] transition-all">
                            다음 층으로 <Swords size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
        </div>
      </div>

      {/* 전투 기록 패널 — 지나온 라운드(플레이어 vs 상대, 고른 지표, 승패) 목록 */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3"
          onClick={() => setShowHistory(false)}>
          <div className="w-full sm:max-w-sm max-h-[70vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                <History size={15} /> 전투 기록 {history.length}
              </p>
              <button type="button" onClick={() => setShowHistory(false)} className="text-neutral-400 hover:text-[#16a34a]" aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-center text-xs text-neutral-400 py-6">아직 전투 기록이 없어요.</p>
            ) : (
              <div className="space-y-1.5">
                {[...history].reverse().map((h, i) => {
                  const label = computeValueScore(h.player).parts.find((p: any) => p.key === h.statKey)?.label ?? h.statKey;
                  return (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-[#faf9f7] dark:bg-[#1f1e1b]">
                      {h.win ? <span className="shrink-0 text-[#16a34a] font-black">✔</span> : <span className="shrink-0 text-rose-500 font-black">✕</span>}
                      <Medal item={h.win ? h.opponent : h.player} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">{h.player.name} vs {h.opponent.name}</p>
                        <p className="text-[10px] text-neutral-400">{label} 지표 배틀</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 방법 안내 — 첫 방문 시 자동으로 뜨고, 이후엔 HUD의 ? 버튼으로 재열람 */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3"
          onClick={closeTutorial}>
          <div className="w-full sm:max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                🗡️ 용사의 던전 도전
              </p>
              <button type="button" onClick={closeTutorial} className="text-neutral-400 hover:text-[#16a34a]" aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { icon: "⚔️", text: <>용사(내 카드)와 몬스터(상대 카드)의 지표(NCAV·PBR·PER·ROE) 중 하나를 골라 대결하세요. 지표 이름을 몰라도 옆에 뜨는 <b className="text-[#16a34a]">유리</b>/<b className="text-amber-600 dark:text-amber-400">보통</b>/<b className="text-rose-500">불리</b> 태그만 보고 초록을 고르면 돼요.</> },
                { icon: "🛡️", text: <>이기면 다음 층으로, 지면 <b className="text-neutral-800 dark:text-neutral-100">방패</b>를 잃어요. 방패가 다 떨어지면 던전에서 나가게 돼요.</> },
                { icon: "🃏", text: <>이긴 몬스터 카드는 확률에 따라 <b className="text-neutral-800 dark:text-neutral-100">내 덱</b>에 카드로 수집돼요.</> },
                { icon: "🎒", text: <>3층마다 <b className="text-neutral-800 dark:text-neutral-100">장비</b>를 하나 골라 투구·갑옷·무기·방패·목걸이·장신구 2개, 7개 슬롯을 채워보세요. 같은 세트로 3/5/7개를 맞추면 추가 보너스가 붙어요. 10층마다는 강한 <b className="text-violet-600 dark:text-violet-400">보스</b>가 나와요.</> },
                { icon: "💰", text: <>층을 돌파할 때마다 <b className="text-neutral-800 dark:text-neutral-100">골드</b>를 얻어요. 골드와 장비는 던전을 나가면 초기화돼요 — 내 덱에서 카드를 바꾸는 영구 <b className="text-neutral-800 dark:text-neutral-100">코인</b>(🪙)과는 다른 재화예요.</> },
                { icon: "⚠️", text: <>연승이 길어질수록 다음 패배의 대가도 커져요. 매 판마다 <b className="text-neutral-800 dark:text-neutral-100">"여기서 정리"</b>(안전하게 마무리)와 <b className="text-neutral-800 dark:text-neutral-100">"다음 층으로"</b>(위험 감수) 중 골라보세요.</> },
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

      {/* 용사 상태창 — 방패·연승·골드·장비 슬롯 7칸을 한 화면에 모아 보여줌. HUD의 장비 뱃지/사람 아이콘 버튼으로 엶 */}
      {showStatus && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3"
          onClick={() => setShowStatus(false)}>
          <div className="w-full sm:max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                <UserRound size={16} /> 용사 상태창
              </p>
              <button type="button" onClick={() => setShowStatus(false)} className="text-neutral-400 hover:text-[#16a34a]" aria-label="닫기">
                <X size={18} />
              </button>
            </div>

            {/* 모바일에서 세로 스크롤 없이 한 화면에 들어오도록 압축 — 예전엔 순위 패널(1줄)+스탯
                2×2 그리드(2줄)로 나뉘어 있던 걸 "순위 한 줄 + 스탯 4열 한 줄"로, 종이인형 칸 높이도
                줄이고, 장비 설명·세트 진행도·도감을 각각 별도 블록 대신 압축된 줄로 합침. */}
            <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              <span aria-hidden className="text-base leading-none">{rankOf(totalWins).emoji}</span>
              <b className="text-neutral-800 dark:text-neutral-100">{rankOf(totalWins).title}</b>
              <span>· 지하 {roundNum + 1}층</span>
            </p>

            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                <p className="flex items-center justify-center gap-0.5 text-sm font-black tabular-nums text-[#16a34a] leading-none">
                  <Shield size={11} strokeWidth={2.5} />{shields}/{maxShields}
                </p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">방패</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                <p className="flex items-center justify-center gap-0.5 text-sm font-black tabular-nums text-rose-500 leading-none">
                  <Flame size={11} strokeWidth={2.5} />{streak}
                </p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">연승</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                <p className="flex items-center justify-center gap-0.5 text-sm font-black tabular-nums text-amber-500 leading-none">
                  <Trophy size={11} strokeWidth={2.5} />{best}
                </p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">최고</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1.5 text-center">
                <p className="flex items-center justify-center gap-0.5 text-sm font-black tabular-nums text-amber-600 dark:text-amber-400 leading-none">
                  💰{gold}
                </p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-1">골드</p>
              </div>
            </div>

            <p className="text-xs font-black text-neutral-700 dark:text-neutral-200 mb-1.5">
              장비 {equippedItems.length}/{EQUIP_SLOTS.length}
            </p>
            {/* 종이인형(paper-doll) 배치 — 가운데 사람 실루엣을 배경으로 깔고, 슬롯을 신체 부위에
                맞춰 둘러 배치(투구=머리, 목걸이=목, 무기/방패=양손, 갑옷=몸통, 장신구=허리 양옆).
                빈 슬롯 칸은 점선 테두리로만 표시해 실루엣이 그 자리에 은은히 비쳐 보이게 함. */}
            <div className="relative rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 p-2 mb-1.5">
              <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none text-neutral-400 dark:text-neutral-600 opacity-[0.15]">
                <UserRound size={90} strokeWidth={1} />
              </div>
              <div className="relative grid grid-cols-3 gap-1"
                style={{ gridTemplateAreas: `". helmet ." "weapon necklace shield" ". armor ." "accessory1 . accessory2"` }}>
                {EQUIP_SLOTS.map(slot => {
                  const id = equipment[slot];
                  const item = id ? EQUIP_POOL.find(i => i.id === id) : null;
                  return (
                    <div key={slot} style={{ gridArea: slot }}
                      className={cn("flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 px-1 text-center min-h-[38px]",
                        item ? "bg-violet-500/10 border border-violet-500/30" : "bg-white/40 dark:bg-white/[0.03] border border-dashed border-black/10 dark:border-white/15")}>
                      <span aria-hidden className={cn("text-sm leading-none", !item && "opacity-30")}>{item ? item.icon : "•"}</span>
                      <span className="text-[7px] font-bold text-neutral-400 leading-tight">{EQUIP_SLOT_LABEL[slot]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {equippedItems.length > 0 && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-1.5">
                {equippedItems.map(item => (
                  <p key={item.id} className="flex items-center gap-1 text-[10px] truncate">
                    <span aria-hidden className="shrink-0">{item.icon}</span>
                    <span className="text-neutral-500 dark:text-neutral-400 truncate">{item.desc}</span>
                  </p>
                ))}
              </div>
            )}
            <p className="text-[10px] text-neutral-400">
              {EQUIP_SET_LABEL.guardian} {setCount("guardian")}/7 · {EQUIP_SET_LABEL.raider} {setCount("raider")}/7 · 도감 {equipmentLog.size}/{EQUIP_POOL.length}
            </p>
          </div>
        </div>
      )}

      {/* 장비 선택 — 3라운드마다 뜨는 로그라이크 보상. 배틀 화면의 촘촘한 no-scroll 레이아웃과
          별개로 고정 오버레이(모달)로 띄워서 카드 크기 실측 로직에 영향을 주지 않게 함(튜토리얼/기록 패널과 동일 패턴).
          packOpening 중엔 뒤로 미룸 — 안 그러면 모달이 팩 오픈 리빌 연출을 그대로 가려서 못 보게 됨. */}
      {itemChoices && !packOpening && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3">
          <div className="w-full sm:max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 sm:zoom-in-95 duration-200">
            <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5 mb-3">
              🎒 장비를 하나 고르세요
            </p>
            <div className="space-y-2">
              {itemChoices.map(item => {
                const equippedInSlot = equipment[item.slot] ? EQUIP_POOL.find(i => i.id === equipment[item.slot]) : null;
                return (
                  <button key={item.id} type="button" onClick={() => pickItem(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-left active:scale-[0.98] transition-all">
                    <span className="text-xl shrink-0" aria-hidden>{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-neutral-800 dark:text-neutral-100">{item.name}</span>
                      <span className="block text-xs text-neutral-500 dark:text-neutral-400">{EQUIP_SLOT_LABEL[item.slot]} · {item.desc}</span>
                    </span>
                    {equippedInSlot && equippedInSlot.id !== item.id && (
                      <span className="shrink-0 text-[9px] font-bold text-amber-600 dark:text-amber-400 text-right">
                        {equippedInSlot.icon} 교체
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-center mt-3">
              <button type="button" onClick={skipItem} className="text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">건너뛰기</button>
            </div>
          </div>
        </div>
      )}
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
          {/* 도감 완성도 — 글로우 그라데이션 프로그레스 바 */}
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
            <AchievementBadges deck={deck} best={best} catalogTotal={catalog.length} />
            {catalog.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="inline-flex rounded-lg overflow-hidden backdrop-blur-md border border-black/5 dark:border-white/10">
                  {(["tier", "sector"] as const).map(m => (
                    <button key={m} onClick={() => { setGroupMode(m); setVisible(PAGE); }}
                      className={cn("px-2 py-1 text-[11px] font-bold transition-colors",
                        groupMode === m ? "bg-[#16a34a] text-white" : "bg-white/80 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400")}>
                      {m === "tier" ? "등급별" : "업종별"}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setShowOwnedOnly(v => !v); setVisible(PAGE); }}
                  className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg border backdrop-blur-md text-[11px] font-bold transition-colors",
                    showOwnedOnly
                      ? "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] shadow-[0_0_10px_-2px_rgba(22,163,74,0.5)]"
                      : "border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400")}>
                  <Layers size={11} /> 보유만
                </button>
                <button onClick={() => { setShowDupesOnly(v => !v); setVisible(PAGE); }}
                  className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg border backdrop-blur-md text-[11px] font-bold transition-colors",
                    showDupesOnly
                      ? "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] shadow-[0_0_10px_-2px_rgba(22,163,74,0.5)]"
                      : "border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400")}>
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
              <Loader2 size={20} className="animate-spin" />
              카드 데이터를 불러오는 중…
            </p>
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
