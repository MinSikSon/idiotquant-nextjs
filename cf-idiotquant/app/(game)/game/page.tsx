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
import { ArrowUp, ArrowDown, RotateCcw, Layers, TrendingUp, Sparkles, ChevronLeft, ChevronRight, Lock, Info } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { computeValueScore } from "@/lib/utils/valueScore";
import { getDeck, addDeckCard, type DeckCardSnapshot } from "@/lib/features/deck/deckAPI";
import { cn } from "@/lib/utils";
import VoyageArt from "@/components/game/voyageArt";
import GameSeaArt from "@/components/game/gameSeaArt";

const safeNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// 비교 스탯: 시가총액 하나로 고정 (카드 등급은 별도 저평가 점수로 산정)
type Stat = { key: string; label: string; get: (it: any) => number; fmt: (v: number) => string };
const STAT: Stat = {
  key: "market_cap", label: "시가총액", get: it => safeNum(it.market_cap),
  fmt: v => v >= 10000 ? `${(v / 10000).toFixed(1)}조` : `${Math.round(v).toLocaleString()}억`,
};

// 카드 수집: 정답을 맞힌 카드만 획득 판정. 등급별 "기본 획득 확률" + 연승 보너스.
// 연승이 없어도(첫 정답에도) 기본 확률로 카드가 나오며, 높은 등급일수록 기본 확률이 낮고
// 연승을 쌓을수록 확률이 오른다 (전설>보물>다이아>금>은>동>원석>탐색).
const TIER_BASE: Record<string, number> = {
  explore: 0.34, raw: 0.28, bronze: 0.22, silver: 0.16, gold: 0.11, diamond: 0.07, treasure: 0.045, legend: 0.025,
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
type DeckItem = DeckCardSnapshot & { count: number };
const deckTotal = (deck: DeckItem[]) => deck.reduce((a, c) => a + (c.count ?? 1), 0);

function toCard(it: any): DeckCardSnapshot {
  return {
    ticker: String(it.ticker), name: String(it.name),
    market_cap: safeNum(it.market_cap), last_price: safeNum(it.last_price),
    ncav_ratio: safeNum(it.ncav_ratio), pbr: safeNum(it.pbr), per: safeNum(it.per),
    eps: safeNum(it.eps), bps: safeNum(it.bps),
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
  raw: "bg-stone-100 text-stone-600 ring-stone-300 dark:bg-stone-900/40 dark:text-stone-400 dark:ring-stone-700",
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
function StockLogo({ item, size = 44 }: { item: any; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div className="rounded-2xl border border-neutral-100 dark:border-[#35332e] bg-white shrink-0 flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}>
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrlFor(item)} alt={item?.name ?? "logo"} loading="lazy"
          className="w-full h-full object-contain p-1.5" onError={() => setErr(true)} />
      ) : (
        <span className="font-black text-neutral-500 leading-none" style={{ fontSize: size * 0.4 }}>
          {(item?.name ?? item?.ticker ?? "?").charAt(0)}
        </span>
      )}
    </div>
  );
}

// 큰 로고 "포트홀"(대항해 선박 창) — 브라스 링 + 유리 반사. 로고가 있는 종목을 크게 부각.
function StockLogoHero({ item, size = 96, glow = "45,212,191" }: { item: any; size?: number; glow?: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative rounded-full shrink-0" style={{ width: size, height: size, boxShadow: `0 12px 26px -8px rgba(${glow},0.55)` }}>
      {/* 브라스 링 */}
      <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 140deg,#c8901a,#fde8a6,#a9760f,#fff6d6,#c8901a)" }} />
      <div className="absolute inset-[3px] rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-b from-white to-neutral-100 shadow-[inset_0_3px_6px_rgba(0,0,0,0.15)]">
        {!err ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrlFor(item)} alt={item?.name ?? "logo"} loading="lazy"
            className="w-[76%] h-[76%] object-contain" onError={() => setErr(true)} />
        ) : (
          <span className="font-black text-neutral-400 leading-none" style={{ fontSize: size * 0.44 }}>
            {(item?.name ?? item?.ticker ?? "?").charAt(0)}
          </span>
        )}
      </div>
      {/* 유리 반사광 */}
      <div aria-hidden className="absolute inset-[3px] rounded-full pointer-events-none"
        style={{ background: "linear-gradient(150deg,rgba(255,255,255,.72),transparent 46%)" }} />
    </div>
  );
}

// 등급별 프레임(테두리 링) + 강조 글로우 — 수집형 카드의 등급 프레임
const TIER_FRAME: Record<string, { ring: string; glow: string }> = {
  legend:   { ring: "conic-gradient(from 210deg,#a78bfa,#f0abfc,#fcd34d,#c4b5fd,#a78bfa)", glow: "167,139,250" },
  treasure: { ring: "conic-gradient(from 210deg,#f59e0b,#fde68a,#d97706,#fef3c7,#f59e0b)", glow: "251,191,36" },
  diamond:  { ring: "conic-gradient(from 210deg,#38bdf8,#a5f3fc,#0ea5e9,#e0f2fe,#38bdf8)", glow: "56,189,248" },
  gold:     { ring: "conic-gradient(from 210deg,#eab308,#fde047,#ca8a04,#fef9c3,#eab308)", glow: "234,179,8" },
  silver:   { ring: "conic-gradient(from 210deg,#94a3b8,#f1f5f9,#64748b,#e2e8f0,#94a3b8)", glow: "148,163,184" },
  bronze:   { ring: "conic-gradient(from 210deg,#ea580c,#fed7aa,#c2410c,#ffedd5,#ea580c)", glow: "251,146,60" },
  raw:      { ring: "conic-gradient(from 210deg,#a8a29e,#e7e5e4,#78716c,#f5f5f4,#a8a29e)", glow: "168,162,150" },
  explore:  { ring: "conic-gradient(from 210deg,#14b8a6,#99f6e4,#0d9488,#ccfbf1,#14b8a6)", glow: "45,212,191" },
};

// 카드 네 모서리 브라스 리벳(대항해 장식)
function CornerRivets() {
  return (
    <>
      {[["top-1.5 left-1.5"], ["top-1.5 right-1.5"], ["bottom-1.5 left-1.5"], ["bottom-1.5 right-1.5"]].map(([pos], i) => (
        <span key={i} aria-hidden className={cn("pointer-events-none absolute z-10 w-2 h-2 rounded-full", pos)}
          style={{ background: "radial-gradient(circle at 35% 30%,#fff2c4,#c8901a 60%,#8a6410)", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
      ))}
    </>
  );
}

// 업종 추론 — 종목명/티커 키워드로 대표 이모지(업종 이미지) 매핑. 데이터에 sector 필드가 없어 이름 기반.
const SECTORS: { re: RegExp; emoji: string; label: string }[] = [
  { re: /반도체|전자|디스플레이|칩|하이닉스|테크|semi|chip|micron|nvidia|amd|intel|apple|tech/i, emoji: "🔌", label: "전자·반도체" },
  { re: /바이오|제약|헬스|메디|파마|셀|진단|bio|pharma|health|medi|gene/i, emoji: "🧬", label: "바이오·제약" },
  { re: /은행|금융|증권|캐피탈|카드|보험|지주|홀딩스|bank|financ|capital|insur|jpmorgan|goldman/i, emoji: "🏦", label: "금융" },
  { re: /자동차|모비스|타이어|모터|현대차|기아|auto|motor|\bcar\b|tesla|ford|toyota/i, emoji: "🚗", label: "자동차" },
  { re: /조선|해운|중공업|marine|ship|해양/i, emoji: "🚢", label: "조선·해운" },
  { re: /건설|엔지니어|건축|시멘트|construc|engineer|cement/i, emoji: "🏗️", label: "건설" },
  { re: /에너지|전력|가스|정유|석유|원전|태양|배터리|energy|oil|power|solar|batter|exxon|chevron/i, emoji: "⚡", label: "에너지" },
  { re: /화학|케미|소재|섬유|폴리|chem|material/i, emoji: "⚗️", label: "화학·소재" },
  { re: /철강|금속|포스코|steel|metal|alum/i, emoji: "🏭", label: "철강·금속" },
  { re: /통신|텔레콤|kt|skt|telecom|networ|verizon|comcast/i, emoji: "📡", label: "통신" },
  { re: /게임|엔터|미디어|콘텐츠|넷마블|엔씨|크래프톤|game|media|netflix|disney|entertain/i, emoji: "🎮", label: "게임·엔터" },
  { re: /식품|푸드|제과|음료|주류|라면|food|bever|coca|pepsi|nestle/i, emoji: "🍱", label: "식품" },
  { re: /유통|마트|리테일|백화|커머스|이마트|쿠팡|retail|amazon|walmart|shop/i, emoji: "🛒", label: "유통" },
  { re: /항공|우주|방산|aero|defense|boeing|lockheed/i, emoji: "✈️", label: "항공·방산" },
  { re: /패션|의류|화장품|뷰티|아모레|fashion|cosmet|nike|beauty/i, emoji: "👗", label: "패션·뷰티" },
  { re: /소프트|플랫폼|클라우드|인터넷|카카오|네이버|soft|cloud|internet|google|meta|microsoft/i, emoji: "💻", label: "소프트웨어" },
];
const SECTOR_FALLBACK: { emoji: string; label: string }[] = [
  { emoji: "💎", label: "가치주" }, { emoji: "📈", label: "성장주" }, { emoji: "🧭", label: "탐험" },
  { emoji: "⚓", label: "블루칩" }, { emoji: "🗺️", label: "신대륙" }, { emoji: "🪙", label: "우량주" },
];
function sectorArt(item: any): { emoji: string; label: string } {
  const hay = `${item?.name ?? ""} ${item?.ticker ?? ""}`;
  for (const s of SECTORS) if (s.re.test(hay)) return { emoji: s.emoji, label: s.label };
  const h = [...String(item?.ticker ?? item?.name ?? "")].reduce((a, c) => a + c.charCodeAt(0), 0);
  return SECTOR_FALLBACK[h % SECTOR_FALLBACK.length];
}

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
            등급: 👑 전설 90+ · 🏆 보물 80+ · 💎 다이아 70+ · 🥇 금 60+<br />
            🥈 은 50+ · 🥉 동 40+ · 🪨 원석 25+ · 🧭 탐색 그 외
          </span>
        </span>
      )}
    </span>
  );
}

// 등급별 홀로그램 포일 (프리미엄 등급만 무지개 포일, 그 외는 포인터 하이라이트만)
const TIER_HOLO: Record<string, string> = {
  legend: "linear-gradient(115deg, transparent 18%, rgba(250,204,21,.55), rgba(45,212,191,.5), rgba(167,139,250,.5), transparent 82%)",
  treasure: "linear-gradient(115deg, transparent 18%, rgba(251,191,36,.55), rgba(253,224,71,.5), rgba(251,146,60,.5), transparent 82%)",
  diamond: "linear-gradient(115deg, transparent 20%, rgba(56,189,248,.5), rgba(125,211,252,.45), rgba(186,230,253,.45), transparent 80%)",
  gold: "linear-gradient(115deg, transparent 25%, rgba(250,204,21,.45), rgba(253,224,71,.4), transparent 78%)",
};

// 3D 글로시 플라스틱 카드 표면 (첨부 이미지 질감 참고) — 등급별 톤 · 라이트/다크
const TIER_PLASTIC: Record<string, string> = {
  legend:   "bg-[linear-gradient(157deg,#f7f3ff,#ece4ff_46%,#dccffb)] dark:bg-[linear-gradient(157deg,#2b2352,#211b41_46%,#17122f)] border-violet-200/70 dark:border-violet-800/40",
  treasure: "bg-[linear-gradient(157deg,#fff8ea,#ffeccb_46%,#ffdfa8)] dark:bg-[linear-gradient(157deg,#3b2f12,#2c220b_46%,#1e1707)] border-amber-200/70 dark:border-amber-800/40",
  diamond:  "bg-[linear-gradient(157deg,#eff9ff,#daf0fe_46%,#bfe4fd)] dark:bg-[linear-gradient(157deg,#123249,#0e2537_46%,#091926)] border-sky-200/70 dark:border-sky-800/40",
  gold:     "bg-[linear-gradient(157deg,#fffceb,#fff2c6_46%,#ffe79e)] dark:bg-[linear-gradient(157deg,#3b3410,#2c2709_46%,#1e1a05)] border-yellow-200/70 dark:border-yellow-800/40",
  silver:   "bg-[linear-gradient(157deg,#fcfcfe,#eef1f5_46%,#dee2e9)] dark:bg-[linear-gradient(157deg,#343330,#2a2926_46%,#1f1e1b)] border-neutral-200 dark:border-[#4a4641]",
  bronze:   "bg-[linear-gradient(157deg,#fff5ee,#ffe7d6_46%,#ffd2b2)] dark:bg-[linear-gradient(157deg,#3b2817,#2c1d0f_46%,#1f1309)] border-orange-200/70 dark:border-orange-800/40",
  raw:      "bg-[linear-gradient(157deg,#faf9f7,#efece6_46%,#e2dcd1)] dark:bg-[linear-gradient(157deg,#2b2926,#232120_46%,#1a1917)] border-stone-200 dark:border-stone-800/50",
  explore:  "bg-[linear-gradient(157deg,#f0fefb,#d9f7ef_46%,#bff0e3)] dark:bg-[linear-gradient(157deg,#123b34,#0e2c27_46%,#0a201d)] border-teal-200/70 dark:border-teal-800/40",
};

// 부드러운 플라스틱 입체감: 볼록한 상단 엣지(하이라이트) + 하단 음영 + 넓은 앰비언트 그림자
const PLASTIC_SHADOW =
  "0 22px 46px -18px rgba(15,40,32,0.5), 0 6px 14px -8px rgba(15,40,32,0.28), inset 0 2px 1px rgba(255,255,255,0.75), inset 0 -16px 26px -16px rgba(0,0,0,0.20)";

// 플라스틱 표면 광택 오버레이 (스페큘러 하이라이트) — 카드 면에 얹어 글로시 질감을 낸다
function Gloss({ radius }: { radius: string }) {
  return (
    <>
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 z-0", radius)}
        style={{ background: "radial-gradient(125% 85% at 24% 10%, rgba(255,255,255,0.6), rgba(255,255,255,0) 45%)", mixBlendMode: "soft-light" }} />
      <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 h-1/2 z-0", radius)}
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 85%)", mixBlendMode: "soft-light" }} />
    </>
  );
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);
  return reduce;
}

// 3D 틸트 + 등급 홀로그램 포일 — 카드에 수집욕구를 주는 인터랙티브 3D 래퍼.
// 평소엔 은은한 아이들 애니메이션(holo-idle)으로 3D가 드러나고, 포인터가 올라오면 그 방향으로 기울어진다.
function HoloCard({ tone, radius = "rounded-2xl", idleDelay = 0, thickness = 0, className, children }:
  { tone: string; radius?: string; idleDelay?: number; thickness?: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [p, setP] = useState({ x: 50, y: 50, active: false });

  const onMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setP({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, active: true });
  }, []);
  const onLeave = useCallback(() => setP(s => ({ ...s, active: false })), []);

  const tilt = p.active && !reduce;
  const rx = ((50 - p.y) / 50) * 14;
  const ry = ((p.x - 50) / 50) * 14;
  const holo = TIER_HOLO[tone];

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}
      className={cn("relative transition-transform duration-200 ease-out will-change-transform", !reduce && "holo-idle", className)}
      style={{
        transformStyle: "preserve-3d",
        animationDelay: `${-idleDelay}s`,
        // 포인터 조작 중에는 아이들 애니메이션을 끄고(그래야 인라인 transform 이 적용됨) 포인터 방향으로 기울인다.
        ...(tilt ? { transform: `perspective(820px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.05)`, animation: "none" } : {}),
      }}>
      {/* 카드 두께 — 면 뒤로 슬래브를 촘촘히 쌓아(측면 음영) 기울일 때 실제 입체 두께가 보이게 */}
      {thickness > 0 && Array.from({ length: Math.round(thickness / 3) }).map((_, k, arr) => (
        <div key={k} aria-hidden
          className={cn("pointer-events-none absolute inset-0 bg-[#c9c4b8] dark:bg-[#0c0b08]", radius,
            k === arr.length - 1 && "shadow-[0_22px_36px_rgba(20,30,20,0.30)]")}
          style={{ transform: `translateZ(-${(k + 1) * 3}px)` }} />
      ))}
      {children}
      {/* 포인터 추적 하이라이트 */}
      <div aria-hidden style={{ opacity: tilt ? 1 : 0, background: `radial-gradient(circle at ${p.x}% ${p.y}%, rgba(255,255,255,.7), transparent 45%)` }}
        className={cn("pointer-events-none absolute inset-0 transition-opacity duration-200 mix-blend-soft-light", radius)} />
      {/* 프리미엄 등급 홀로그램 포일 (평소에도 은은히 보이도록 rest opacity 상향) */}
      {holo && (
        <div aria-hidden style={{ opacity: tilt ? 0.95 : 0.45, backgroundImage: holo, backgroundSize: "220% 220%", backgroundPosition: `${p.x}% ${p.y}%` }}
          className={cn("pointer-events-none absolute inset-0 transition-opacity duration-300 mix-blend-overlay", radius)} />
      )}
    </div>
  );
}

// 종목 카드 — 팝업(카드 밖으로 튀어나오는) 3D: 아트 윈도우(햇살 방사)에서 업종 이미지가 프레임을 뚫고 솟는다.
function Card({ item, stat, value, idleDelay = 0 }: { item: any; stat: Stat; value: React.ReactNode; idleDelay?: number }) {
  const tone = computeValueScore(item).tone;
  const f = TIER_FRAME[tone] ?? TIER_FRAME.explore;
  const sec = sectorArt(item);
  return (
    <HoloCard tone={tone} radius="rounded-[26px]" idleDelay={idleDelay} thickness={36} className="w-full h-full">
      {/* 등급 프레임(금속 테두리 링) + 등급 글로우 */}
      <div className="relative w-full h-full rounded-[26px] [transform-style:preserve-3d]"
        style={{ background: f.ring, padding: "3px", boxShadow: `0 22px 48px -16px rgba(${f.glow},0.55)` }}>
        {/* 플라스틱 본체 (요소들은 translateZ 로 떠올라 기울일 때 시차 깊이 · preserve-3d) */}
        <div className={cn("relative w-full h-full rounded-[22px] px-3.5 pt-4 pb-3.5 flex flex-col items-center text-center overflow-hidden [transform-style:preserve-3d]", TIER_PLASTIC[tone] ?? TIER_PLASTIC.explore)}
          style={{ boxShadow: PLASTIC_SHADOW }}>
          <Gloss radius="rounded-[22px]" />
          <CornerRivets />
          {/* 등급 젬 (좌상단) */}
          <div className="absolute top-2.5 left-2.5 z-20" style={{ transform: "translateZ(46px)" }}><Medal item={item} lg /></div>

          {/* 아트 윈도우 — 햇살 방사(sunburst) + 로고(장면) */}
          <div className="relative z-10 mt-9 w-[86%] aspect-[6/5] rounded-lg overflow-hidden border-2 border-white/55 dark:border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]"
            style={{ transform: "translateZ(12px)" }}>
            <div aria-hidden className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 60%, rgba(255,255,255,0.9), rgba(255,255,255,0) 66%), repeating-conic-gradient(from 0deg at 50% 58%, rgba(${f.glow},0.24) 0deg 7deg, rgba(${f.glow},0) 7deg 14deg)` }} />
            <div className="absolute inset-x-0 bottom-1.5 flex justify-center">
              <StockLogo item={item} size={42} />
            </div>
          </div>

          <p className="relative z-10 mt-2.5 font-black text-base sm:text-lg text-neutral-900 dark:text-white leading-tight break-keep" style={{ transform: "translateZ(28px)" }}>{item.name}</p>
          <p className="relative z-10 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono tracking-widest" style={{ transform: "translateZ(20px)" }}>{item.ticker}</p>

          {/* 하단 값 플라크(놋쇠 명판 느낌) */}
          <div className="relative z-10 mt-auto w-full pt-2.5" style={{ transform: "translateZ(26px)" }}>
            <div className="mx-auto rounded-xl border border-white/60 dark:border-white/10 bg-white/55 dark:bg-black/25 px-3 py-1.5 backdrop-blur-sm shadow-sm">
              <p className="text-[9px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-[0.2em]">{stat.label}</p>
              <div className="text-xl sm:text-2xl font-black tabular-nums text-[#16a34a] dark:text-[#16a34a] min-h-[2rem] flex items-center justify-center">
                {value}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 업종 이미지 — 아트 윈도우에서 프레임을 뚫고 솟는 3D 팝업 (body overflow 밖 · 높은 translateZ 로 강한 시차 깊이) */}
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-[30%] z-30 leading-none select-none"
        style={{ transform: "translate(-50%,-62%) translateZ(90px)", fontSize: "clamp(48px,13vw,72px)", filter: `drop-shadow(0 16px 11px rgba(0,0,0,0.38)) drop-shadow(0 3px 5px rgba(${f.glow},0.55))` }}>
        {sec.emoji}
      </span>
    </HoloCard>
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
    <div className="mt-5 text-left rounded-2xl border border-neutral-200 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1a1915] p-4">
      <p className="text-[11px] font-black text-rose-500 mb-2">아깝게 놓친 종목</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 break-keep leading-relaxed">
        <b className="text-neutral-800 dark:text-neutral-200">{c.name}</b>의 {missed.statLabel}
        <b className="text-neutral-700 dark:text-neutral-300"> {missed.challengerStr}</b>은{" "}
        {missed.anchor.name}({missed.anchorStr})보다{" "}
        <b className={missed.higherSide === "challenger" ? "text-[#16a34a]" : "text-rose-500"}>
          {missed.higherSide === "challenger" ? "높았어요" : "낮았어요"}
        </b>.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <StockLogo item={c} size={40} />
        <Medal item={c} lg />
        <ScoreInfo />
        <div className="min-w-0 ml-0.5">
          <p className="font-black text-sm text-neutral-900 dark:text-white truncate">{c.name}</p>
          <p className="text-[10px] text-neutral-400 font-mono">{c.ticker}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg bg-white dark:bg-[#242320] p-2 text-center">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">{m.label}</p>
            <p className="text-xs font-black tabular-nums text-neutral-800 dark:text-neutral-200 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* 점수 계산 과정: 지표별 서브점수 × 가중치 → 종합 (값 없는 지표는 제외) */}
      <div className="rounded-lg bg-white dark:bg-[#242320] p-3 mb-3">
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
        <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-[#35332e] flex items-center justify-between">
          <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-200">종합 점수</span>
          <span className="text-sm font-black text-[#16a34a] tabular-nums">{v.score}점</span>
        </div>
      </div>

      <Link href={`/analyze?ticker=${encodeURIComponent(c.name)}&from=game`}
        className="inline-flex items-center gap-1 text-xs font-bold text-[#16a34a] hover:underline">
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
    <div className="mt-5 text-left rounded-2xl border border-[#86efac]/60 dark:border-[#166534]/50 bg-[#f0fdf4]/60 dark:bg-[#052e16]/20 p-4">
      <p className="text-[11px] font-black text-[#15803d] dark:text-[#16a34a] mb-2 flex items-center gap-1">
        <Sparkles size={12} /> 이번 항해에서 획득한 카드 {cards.length}장
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {agg.map(({ item: c, count }) => (
          <div key={c.ticker} className="relative flex items-center gap-2 rounded-xl bg-white dark:bg-[#242320] border border-neutral-100 dark:border-[#35332e] p-2">
            {count > 1 && (
              <span className="absolute top-1 right-1 px-1 py-0.5 rounded-full bg-[#16a34a] text-white text-[9px] font-black tabular-nums leading-none">×{count}</span>
            )}
            <StockLogo item={c} size={30} />
            <div className="min-w-0">
              <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">{c.name}</p>
              <div className="mt-0.5"><Medal item={c} /></div>
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

  useEffect(() => { dispatch(reqGetNcavDailyList("latest")); }, [dispatch]);

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

  // 비교 가능한 종목 풀 (시가총액 보유 종목)
  const pool = useMemo(() => {
    const list = Array.isArray(ncav.list) ? ncav.list : [];
    return list.filter((it: any) => it?.name && it?.ticker && STAT.get(it) > 0);
  }, [ncav.list]);

  const bestKey = "iq:game:best:hl:market_cap"; // 기존 시가총액 비교 기록 키 유지
  useEffect(() => { setBest(safeNum(typeof window !== "undefined" ? localStorage.getItem(bestKey) : 0)); }, [bestKey]);

  const draw = useCallback((excludeTicker?: string) => {
    if (pool.length < 2) return null;
    for (let i = 0; i < 30; i++) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      if (c.ticker !== excludeTicker) return c;
    }
    return pool[0];
  }, [pool]);

  const start = useCallback(() => {
    const a = draw();
    if (!a) return;
    setAnchor(a); setChallenger(draw(a.ticker));
    setStreak(0); setNewBest(false); setLastWin(null); setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setMissed(null); setAcquired([]); setPhase("guessing");
  }, [draw]);

  const started = useRef(false);
  useEffect(() => {
    if (!started.current && pool.length >= 2) { started.current = true; start(); }
  }, [pool, start]);

  const guess = useCallback((dir: "higher" | "lower") => {
    if (phase !== "guessing" || !anchor || !challenger) return;
    const av = STAT.get(anchor), cv = STAT.get(challenger);
    const win = dir === "higher" ? cv >= av : cv <= av;   // 동점은 승리 처리
    setLastWin(win);
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null);
    setPhase("revealed");

    if (win) {
      const ns = streak + 1;
      setStreak(ns);
      if (ns > best) { setBest(ns); setNewBest(true); try { localStorage.setItem(bestKey, String(ns)); } catch { } }

      // 정답 카드만 수집. 연승↑ → 획득 확률↑, 높은 등급일수록 더 높은 연승 필요.
      if (Math.random() < acquireChance(challenger, ns)) {
        if (!isLoggedIn) {
          setDropPrompt(true);
        } else {
          const snap = toCard(challenger);
          addDeckCard(snap).then(res => {
            if (res?.added) {
              setDropped(true);
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
  }, [phase, anchor, challenger, best, bestKey, isLoggedIn, streak]);

  const next = useCallback(() => {
    if (!lastWin) return;
    setAnchor(challenger);
    setChallenger(draw(challenger?.ticker));
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setLastWin(null); setPhase("guessing");
  }, [lastWin, challenger, draw]);

  useEffect(() => { if (phase === "revealed" && lastWin === false) setPhase("over"); }, [phase, lastWin]);

  const isLoading = ncav.state === "pending" || ncav.state === "init" || pool.length < 2;

  return (
    <div className="relative h-[calc(100dvh-112px)] md:h-[100dvh] flex flex-col overflow-hidden bg-gradient-to-b from-[#fdf4e3] via-[#eaf6ef] to-[#dff0e6] dark:from-[#0a1a1f] dark:via-[#0c1f1a] dark:to-[#0a1512] transition-colors">
      {/* 대항해시대 바다 3D 배경 (three.js) */}
      <div className="absolute inset-0 z-0"><GameSeaArt /></div>
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#fdf4e3]/70 via-transparent to-[#dff0e6]/85 dark:from-[#0a1a1f]/75 dark:via-transparent dark:to-[#0a1512]/90" />
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 pt-4 pb-3 flex-1 min-h-0 flex flex-col">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-[#16a34a]">
            <ChevronLeft size={14} /> 홈
          </Link>
          <h1 className="text-sm font-black text-neutral-900 dark:text-white">⛵ 신대륙 항해 · 종목 발굴</h1>
          <button onClick={() => setShowDeck(v => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] text-xs font-bold text-neutral-600 dark:text-neutral-300">
            <Layers size={13} className="text-[#16a34a]" /> 내 덱 {deckTotal(deck)}
            {!isLoggedIn && <Lock size={10} className="opacity-60" />}
          </button>
        </div>

        {/* 본문 — 항상 스크롤 가능. 플레이는 my-auto 로 세로 중앙(넘치면 스크롤), 종료/덱은 자연 스크롤 */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col py-2">
        {showDeck ? (
          <DeckView deck={deck} isLoggedIn={isLoggedIn} onLogin={requireLogin} onClose={() => setShowDeck(false)} />
        ) : isLoading ? (
          <div className="my-auto py-24 text-center text-sm text-neutral-400">카드 데이터를 불러오는 중…</div>
        ) : (
          <div className={cn("w-full", phase !== "over" && "my-auto")}>
            {/* 스코어 (플레이 중에만) */}
            {phase !== "over" && (
              <div className="flex items-center justify-center mb-4 shrink-0">
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

            {phase === "over" ? (
              <div className="rounded-3xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-300">
                {/* 3D 보물상자 헤더 (three.js) — 발굴한 보물(수집 카드) */}
                <div className="relative h-44 bg-gradient-to-b from-[#fff7e6] to-white dark:from-[#241d0e] dark:to-[#242320]">
                  <VoyageArt />
                  {newBest && streak > 0 && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-white text-[11px] font-black shadow-md animate-in fade-in zoom-in-95">
                      🎉 신기록
                    </span>
                  )}
                </div>

                <div className="px-6 pb-6 -mt-3 text-center relative">
                  <p className="text-xl font-black text-neutral-900 dark:text-white">항해 종료!</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#86efac]/60 dark:border-[#166534]/60 text-[#15803d] dark:text-[#16a34a] text-sm font-black">
                    <span aria-hidden className="text-base leading-none">{rankOf(streak).emoji}</span> {rankOf(streak).title}
                  </div>

                  {/* 스탯 타일 (가독성) */}
                  <div className="grid grid-cols-2 gap-2.5 mt-5">
                    <div className="rounded-2xl border border-neutral-100 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1f1e1b] py-3">
                      <p className="text-2xl font-black tabular-nums text-[#16a34a] leading-none">{streak}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1.5">이번 연승</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-100 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1f1e1b] py-3">
                      <p className="text-2xl font-black tabular-nums text-neutral-700 dark:text-neutral-200 leading-none">{best}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1.5">최고 기록</p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 mt-4 break-keep">
                    {isLoggedIn ? <>발굴한 카드는 <b className="text-neutral-600 dark:text-neutral-300">내 덱({deckTotal(deck)})</b>에 쌓였습니다.</> : "로그인하면 발굴한 카드를 덱에 모을 수 있어요."}
                  </p>

                  {acquired.length > 0 && <AcquiredThisGame cards={acquired} />}
                  {missed && <MissedInfo missed={missed} />}

                  <button onClick={start}
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-sm shadow-md shadow-[#16a34a]/25 active:scale-[0.98] transition-all">
                    <RotateCcw size={16} /> 다시 시작
                  </button>
                </div>
              </div>
            ) : anchor && challenger ? (
              <>
                <div className="relative grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
                  <Card item={anchor} stat={STAT} value={STAT.fmt(STAT.get(anchor))} idleDelay={0} />
                  <Card item={challenger} stat={STAT} idleDelay={3}
                    value={phase === "revealed"
                      ? <span className="animate-in zoom-in-75 duration-300">{STAT.fmt(STAT.get(challenger))}</span>
                      : <span className="text-neutral-300 dark:text-neutral-600">?</span>} />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-black flex items-center justify-center shadow-lg ring-4 ring-[#faf9f7] dark:ring-[#1a1915]">VS</span>
                </div>

                {/* 획득 / 로그인 유도 */}
                <div className="min-h-[1.75rem] mt-2 text-center">
                  {phase === "revealed" && dropped && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 animate-in fade-in slide-in-from-bottom-1">
                      <Sparkles size={12} /> 카드 획득! {challenger.name} 이(가) 덱에 추가됨
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
                </div>

                {/* 액션 */}
                {phase === "guessing" ? (
                  <div className="mt-3">
                    {/* 질문 — 이름 기준으로 명확하게 (왼/오 대신). 버튼과 바로 연결 */}
                    <p className="text-center text-sm sm:text-base font-bold text-neutral-800 dark:text-neutral-100 mb-1 break-keep leading-snug">
                      <b className="text-[#16a34a]">{challenger.name}</b>
                      <span className="font-medium text-neutral-500 dark:text-neutral-400">의 {STAT.label}은 </span>
                      <b className="text-neutral-900 dark:text-white">{anchor.name}</b>
                      <span className="font-medium text-neutral-500 dark:text-neutral-400">보다?</span>
                    </p>
                    {(() => {
                      // 정답 시(연승+1) 이 카드 획득 확률 — 연승↑·낮은 등급↑, 높은 등급은 더 높은 연승 필요.
                      const chance = Math.round(acquireChance(challenger, streak + 1) * 100);
                      const owned = deck.find(c => c.ticker === challenger.ticker);
                      return (
                        <p className="text-center text-[11px] mb-3">
                          <span className="text-neutral-400">획득 확률 </span>
                          <b className="text-[#16a34a] tabular-nums">{chance}%</b>
                          <span className="text-neutral-300 dark:text-neutral-600"> · 연승 시 ↑</span>
                          {owned && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#16a34a]/10 text-[#16a34a] font-bold tabular-nums">
                              보유 ×{owned.count} · 획득 시 +1
                            </span>
                          )}
                        </p>
                      );
                    })()}
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => guess("higher")}
                        className="group flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-b from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white shadow-lg shadow-[#16a34a]/30 active:scale-[0.97] transition-all">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 group-hover:-translate-y-0.5 transition-transform">
                          <ArrowUp size={20} strokeWidth={2.8} />
                        </span>
                        <span className="text-lg font-black tracking-tight">높다</span>
                      </button>
                      <button onClick={() => guess("lower")}
                        className="group flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-b from-[#fb7185] to-[#e11d48] hover:from-[#f43f5e] hover:to-[#be123c] text-white shadow-lg shadow-rose-500/30 active:scale-[0.97] transition-all">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 group-hover:translate-y-0.5 transition-transform">
                          <ArrowDown size={20} strokeWidth={2.8} />
                        </span>
                        <span className="text-lg font-black tracking-tight">낮다</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={next}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-black shadow-md animate-in fade-in">
                    다음 카드 <TrendingUp size={16} />
                  </button>
                )}
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
  ["legend", "treasure", "diamond", "gold", "silver", "bronze", "raw", "explore"];

// 덱 뷰
function DeckView({ deck, isLoggedIn, onLogin, onClose }: { deck: DeckItem[]; isLoggedIn: boolean; onLogin: () => void; onClose: () => void }) {
  // 등급별로 묶고, 등급 순서(보물→탐색) → 등급 내 점수 내림차순으로 정렬해 분류를 명확히 함
  const groups = useMemo(() => {
    const byTone = new Map<string, { item: DeckItem; v: ReturnType<typeof computeValueScore> }[]>();
    for (const c of deck) {
      const v = computeValueScore(c);
      if (!byTone.has(v.tone)) byTone.set(v.tone, []);
      byTone.get(v.tone)!.push({ item: c, v });
    }
    for (const list of byTone.values()) list.sort((a, b) => b.v.score - a.v.score);
    return TIER_ORDER.filter(t => byTone.has(t)).map(t => ({ tone: t, cards: byTone.get(t)! }));
  }, [deck]);

  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-4">
        <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
          내 덱 <span className="text-[#16a34a]">{deckTotal(deck)}</span>장
          <ScoreInfo />
        </p>
        <button onClick={onClose} className="text-xs font-bold text-neutral-500 hover:text-[#16a34a]">게임으로 ▶</button>
      </div>
      {!isLoggedIn ? (
        <div className="py-16 text-center">
          <Lock size={22} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">덱은 계정에 저장됩니다</p>
          <p className="text-xs text-neutral-400 mt-1 mb-4">로그인하면 발굴한 카드가 기기와 상관없이 보관돼요.</p>
          <button onClick={onLogin} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm">
            로그인하고 덱 시작
          </button>
        </div>
      ) : deck.length === 0 ? (
        <p className="py-20 text-center text-sm text-neutral-400">아직 카드가 없어요. 게임을 하며 카드를 수집하세요!</p>
      ) : (
        <div className="space-y-5">
          {groups.map(({ tone, cards }) => (
            <div key={tone}>
              <div className="flex items-center gap-2 mb-2 px-0.5">
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ring-inset text-[11px] font-black", MEDAL_TONE[tone])}>
                  <span aria-hidden>{cards[0].v.medal}</span>{cards[0].v.label}
                </span>
                <span className="text-[11px] font-bold text-neutral-400">{cards.reduce((a, x) => a + (x.item.count ?? 1), 0)}장</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cards.map(({ item: c }, ci) => {
                  const cf = TIER_FRAME[tone] ?? TIER_FRAME.explore;
                  const sc = sectorArt(c);
                  return (
                  <HoloCard key={c.ticker} tone={tone} radius="rounded-[20px]" idleDelay={ci * 0.6} thickness={22}>
                    <div className="relative w-full h-full rounded-[20px] [transform-style:preserve-3d]"
                      style={{ background: cf.ring, padding: "2.5px", boxShadow: `0 16px 32px -14px rgba(${cf.glow},0.5)` }}>
                      <div className={cn("relative w-full h-full rounded-[17px] px-3 pt-3 pb-3.5 text-center flex flex-col items-center overflow-hidden [transform-style:preserve-3d]", TIER_PLASTIC[tone] ?? TIER_PLASTIC.explore)}
                        style={{ boxShadow: PLASTIC_SHADOW }}>
                        <Gloss radius="rounded-[17px]" />
                        <CornerRivets />
                        <span className={cn("absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums leading-none",
                          (c.count ?? 1) > 1
                            ? "bg-[#16a34a] text-white"
                            : "bg-neutral-200/70 text-neutral-500 dark:bg-[#35332e] dark:text-neutral-400")}
                          style={{ transform: "translateZ(34px)" }}>
                          ×{c.count ?? 1}
                        </span>
                        <div className="relative z-10 mt-1" style={{ transform: "translateZ(38px)" }}><StockLogoHero item={c} size={62} glow={cf.glow} /></div>
                        <div className="relative z-10 mt-2" style={{ transform: "translateZ(22px)" }}><Medal item={c} /></div>
                        <p className="relative z-10 mt-1.5 font-black text-sm text-neutral-900 dark:text-white truncate max-w-full" style={{ transform: "translateZ(16px)" }}>{c.name}</p>
                        <p className="relative z-10 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono tracking-wider" style={{ transform: "translateZ(10px)" }}>{c.ticker}</p>
                      </div>
                    </div>
                    {/* 업종 이미지 — 카드 위로 튀어나오는 팝업 */}
                    <span aria-hidden className="pointer-events-none absolute left-1/2 top-[6%] z-30 leading-none select-none"
                      style={{ transform: "translate(-50%,-55%) translateZ(64px)", fontSize: "34px", filter: `drop-shadow(0 8px 7px rgba(0,0,0,0.35)) drop-shadow(0 2px 3px rgba(${cf.glow},0.5))` }}>
                      {sc.emoji}
                    </span>
                  </HoloCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
