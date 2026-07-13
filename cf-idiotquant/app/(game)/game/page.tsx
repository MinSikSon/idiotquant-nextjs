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

// 항구 메달리온 — 세피아 원형 프레임 + 브라스 링(평면). 로고 실패 시 이니셜. (기존 3D 오브 대체)
function PortMedallion({ item, size = 56, lift = false }: { item: any; size?: number; lift?: boolean }) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#fbf4e2] to-[#e7d6b0]"
      style={{ width: size, height: size,
        boxShadow: lift
          ? "0 8px 14px -4px rgba(30,18,0,0.5), 0 0 0 2px #c9a86a, 0 0 0 3px rgba(74,58,34,0.55), inset 0 -6px 10px -6px rgba(90,60,20,0.4)"
          : "0 3px 8px rgba(40,25,0,0.4), 0 0 0 2px #c9a86a, 0 0 0 3px rgba(74,58,34,0.5), inset 0 -6px 10px -6px rgba(90,60,20,0.4)" }}>
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrlFor(item)} alt={item?.name ?? "logo"} loading="lazy"
          className="w-[82%] h-[82%] object-contain" onError={() => setErr(true)} />
      ) : (
        <span className="font-serif font-extrabold text-[#7a5f30] leading-none" style={{ fontSize: size * 0.46 }}>
          {(item?.name ?? item?.ticker ?? "?").charAt(0)}
        </span>
      )}
    </div>
  );
}

// 등급별 밀랍 봉인색 + 프리미엄(브라스 포일 엣지) 여부 — computeValueScore().tone 이 조인키
const TIER_SEAL: Record<string, { wax: string; premium: boolean }> = {
  legend:   { wax: "#7c3aed", premium: true },
  treasure: { wax: "#b45309", premium: true },
  diamond:  { wax: "#0e7490", premium: true },
  gold:     { wax: "#a16207", premium: true },
  silver:   { wax: "#64748b", premium: false },
  bronze:   { wax: "#9a3412", premium: false },
  raw:      { wax: "#78716c", premium: false },
  explore:  { wax: "#0f766e", premium: false },
};

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

// 밀랍 봉인 — 등급색 왁스 방울 + 봉인 이모지 음각. (기존 Medal pill 대체, 카드 전용)
function WaxSeal({ item, size = 26 }: { item: any; size?: number }) {
  const v = computeValueScore(item);
  const { wax } = TIER_SEAL[v.tone] ?? TIER_SEAL.explore;
  return (
    <span className="relative shrink-0 inline-flex items-center justify-center rounded-full"
      style={{ width: size, height: size,
        background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.55), ${wax} 60%, rgba(0,0,0,0.42))`,
        boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -3px 5px rgba(0,0,0,0.35)" }}>
      <span aria-hidden className="absolute inset-[2px] rounded-full border border-dashed border-white/35" />
      <span aria-hidden className="leading-none" style={{ fontSize: size * 0.46, filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.35))" }}>{v.medal}</span>
    </span>
  );
}

// 코너 필리그리 (1개 SVG를 4모서리에 회전 배치)
function CornerFlourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className} stroke="currentColor" strokeWidth={1.1}>
      <path d="M2 9 V3 H8" /><path d="M4 11 V5 H10" opacity="0.6" /><circle cx="3.4" cy="3.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 나침반 로즈 — 지도 창 배경 워터마크 (기존 ShipMark 대체)
function CompassRose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden className={className} stroke="currentColor" strokeWidth={1.4}>
      <circle cx="50" cy="50" r="34" /><circle cx="50" cy="50" r="27" strokeDasharray="1 4" />
      <path d="M50 8 L56 50 L50 92 L44 50 Z" fill="currentColor" stroke="none" opacity="0.55" />
      <path d="M8 50 L50 56 L92 50 L50 44 Z" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M22 22 L50 47 L78 78 M78 22 L50 53 L22 78" strokeWidth={1} opacity="0.4" />
      <circle cx="50" cy="50" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 종목 카드 "고지도 항해일지" — 타이틀 카투시(밀랍봉인) / 지도창(나침반+항구 메달리온) / 범례줄 / 스케일바 스탯.
//  양피지·동판 인그레이빙·평면 2D(무거운 3D 제거). hero=플레이용(큼), 미지정=덱 콤팩트.
function TcgCard({ item, value, hero = false, count }:
  { item: any; value: React.ReactNode; hero?: boolean; count?: number; idleDelay?: number }) {
  const tone = computeValueScore(item).tone;
  const { premium } = TIER_SEAL[tone] ?? TIER_SEAL.explore;
  const sec = sectorArt(item);
  const R = hero ? "rounded-[14px]" : "rounded-[12px]";
  const Rin = hero ? "rounded-[12px]" : "rounded-[10px]";
  const cornerCls = "pointer-events-none absolute w-4 h-4 text-[#7a5f30] dark:text-[#b7975a] opacity-70 z-[2]";
  return (
    <div className={cn("relative w-full h-full p-[2px] transition-transform duration-200 ease-out hover:-translate-y-1", R)}
      style={{
        background: premium ? "linear-gradient(135deg,#e6cf9a,#8a6a3a 30%,#f2e2b0 52%,#7d5f33 74%,#c9a86a)" : "#6b5836",
        boxShadow: `0 ${hero ? 16 : 10}px ${hero ? 30 : 20}px -14px rgba(40,25,0,0.5)`,
      }}>
      <div className={cn("carto-body relative w-full h-full flex flex-col overflow-hidden text-[#4a3a22] dark:text-[#d8c49a]", Rin)}>
        {premium && (
          <div aria-hidden className={cn("pointer-events-none absolute inset-0", Rin)}
            style={{ background: "linear-gradient(125deg, transparent 40%, rgba(240,220,160,0.16) 50%, transparent 60%)" }} />
        )}
        {/* 코너 필리그리 4개 */}
        <CornerFlourish className={cn(cornerCls, "top-1 left-1")} />
        <CornerFlourish className={cn(cornerCls, "top-1 right-1 rotate-90")} />
        <CornerFlourish className={cn(cornerCls, "bottom-1 right-1 rotate-180")} />
        <CornerFlourish className={cn(cornerCls, "bottom-1 left-1 -rotate-90")} />

        {/* 타이틀 카투시: 종목명(세리프) + 밀랍 봉인 */}
        <div className="relative z-[2] flex items-center gap-1.5 px-2.5 pt-2 pb-1">
          <p className={cn("font-serif font-bold truncate leading-tight", hero ? "text-[15px]" : "text-[12.5px]")}>{item.name}</p>
          <span className="ml-auto"><WaxSeal item={item} size={hero ? 32 : 26} /></span>
        </div>
        <div className="relative z-[2] mx-2.5 border-t border-current opacity-25" />

        {/* 지도 창: 격자 + 나침반 워터마크 + 항구 메달리온 로고 */}
        <div className="relative z-[1] mx-2.5 mt-1 rounded-lg overflow-hidden aspect-[7/5]" style={{ boxShadow: "inset 0 0 0 1px rgba(74,58,34,0.32)" }}>
          <div aria-hidden className="carto-art absolute inset-0" />
          <div aria-hidden className="carto-grid absolute inset-0 opacity-50" />
          <div aria-hidden className="absolute inset-0 flex items-center justify-center">
            <CompassRose className="w-[74%] h-[74%] text-[#5a421e] dark:text-[#c8a569] opacity-[0.16] dark:opacity-[0.22]" />
          </div>
          <div className={cn("absolute inset-0 flex justify-center", hero ? "items-start pt-1" : "items-center")}>
            <PortMedallion item={item} size={hero ? 68 : 50} lift={hero} />
          </div>
          {count != null && count > 1 && (
            <span className="absolute top-1 right-1 z-[3] px-1.5 py-0.5 rounded-full bg-[#5b4a2e] text-[#f3e9d2] text-[10px] font-black tabular-nums leading-none">×{count}</span>
          )}
        </div>

        {/* 범례 줄: 업종(이탤릭) + 좌표(티커) */}
        <div className="relative z-[2] flex items-center gap-1.5 px-2.5 pt-1.5 text-[9px] font-bold tracking-wide">
          <span className="shrink-0 opacity-50">—</span>
          <span className="font-serif italic opacity-85 truncate min-w-0">{sec.label}</span>
          <span className="shrink-0 opacity-50">—</span>
          <span className="ml-auto shrink-0 font-mono text-[9px] tracking-[0.12em] opacity-70">{item.ticker}</span>
        </div>

        {/* 스케일바 스탯: 라벨 ┈ 점선 리더 ┈ 값(도전카드 미공개 시 ?) */}
        <div className="relative z-[2] mt-auto px-2.5 pb-2.5 pt-1.5">
          <div className="carto-plate flex items-center gap-1.5 rounded-md px-2 py-1.5">
            <span className="text-[9px] font-extrabold tracking-[0.14em] opacity-70 whitespace-nowrap">{STAT.label}</span>
            <span className="flex-1 border-t border-dotted border-current opacity-45 mt-0.5" />
            <span className={cn("font-serif font-extrabold whitespace-nowrap text-[#7a4b12] dark:text-[#e6b866] leading-none flex items-center min-h-[1.4rem]", hero ? "text-lg" : "text-[15px]")}>{value}</span>
          </div>
        </div>
      </div>
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
    <div className="mt-3 text-left rounded-2xl border border-[#c9b48a]/60 dark:border-[#5c4a2c]/70 bg-[#f3e9d2] dark:bg-[#241d12] p-3">
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
        <PortMedallion item={c} size={40} />
        <Medal item={c} lg />
        <ScoreInfo />
        <div className="min-w-0 ml-0.5">
          <p className="font-serif font-bold text-sm text-[#4a3a22] dark:text-[#e7d6b0] truncate">{c.name}</p>
          <p className="text-[10px] text-[#8a744c] dark:text-[#a98f5f] font-mono">{c.ticker}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg bg-[#fbf4e2] dark:bg-[#1b160d] p-2 text-center">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">{m.label}</p>
            <p className="text-xs font-black tabular-nums text-neutral-800 dark:text-neutral-200 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* 점수 계산 과정: 지표별 서브점수 × 가중치 → 종합 (값 없는 지표는 제외) */}
      <div className="rounded-lg bg-[#fbf4e2] dark:bg-[#1b160d] p-3 mb-3">
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
    <div className="mt-3 text-left rounded-2xl border border-[#86efac]/60 dark:border-[#166534]/50 bg-[#f0fdf4]/60 dark:bg-[#052e16]/20 p-3">
      <p className="text-[11px] font-black text-[#15803d] dark:text-[#16a34a] mb-2 flex items-center gap-1">
        <Sparkles size={12} /> 이번 항해 획득 {cards.length}장
      </p>
      {/* 가로 스트립 — 카드 수가 많아도 높이가 고정(한 화면 유지). 좌우로 슬라이드 */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-hide">
        {agg.map(({ item: c, count }) => (
          <div key={c.ticker} className="relative shrink-0 flex items-center gap-1.5 rounded-xl bg-[#f3e9d2] dark:bg-[#241d12] border border-[#c9b48a]/60 dark:border-[#5c4a2c]/70 py-1.5 pl-1.5 pr-2.5 text-[#4a3a22] dark:text-[#d8c49a]">
            {count > 1 && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full bg-[#5b4a2e] text-[#f3e9d2] text-[9px] font-black tabular-nums leading-none">×{count}</span>
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
    // 새 게임에서도 직전 항해 기록 카드 몇 장은 필름스트립 왼쪽에 남겨둠(연속성)
    setStreak(0); setNewBest(false); setLastWin(null); setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setMissed(null); setAcquired([]); setHistory(h => h.slice(-3)); setPhase("guessing");
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
    setHistory(h => [...h, anchor]);   // 왼쪽 카드를 항해 기록에 쌓음(오른쪽 카드가 왼쪽 자리로)
    setAnchor(challenger);
    setChallenger(draw(challenger?.ticker));
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setLastWin(null); setPhase("guessing");
  }, [lastWin, anchor, challenger, draw]);

  // 카드가 늘거나 라운드가 바뀌면 필름스트립을 우측 끝(최신)으로 부드럽게 스크롤 → 카드가 왼쪽으로 흐르는 효과
  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [history.length, challenger]);

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

            {phase === "over" ? (
              // 결과 카드: 화면(뷰포트)을 꽉 채우고 헤더·버튼은 고정, 중간만 필요 시 내부 스크롤 → 한 화면에서 보임
              <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-300">
                {/* 3D 보물상자 헤더 (three.js) — 모바일 축소 */}
                <div className="relative h-24 sm:h-40 shrink-0 bg-gradient-to-b from-[#fff7e6] to-white dark:from-[#241d0e] dark:to-[#242320]">
                  <VoyageArt />
                  {newBest && streak > 0 && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-white text-[11px] font-black shadow-md animate-in fade-in zoom-in-95">
                      🎉 신기록
                    </span>
                  )}
                </div>

                {/* 중간 — 넘칠 때만 이 영역만 내부 스크롤(헤더·버튼은 항상 보임) */}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-2 text-center">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <p className="text-lg font-black text-neutral-900 dark:text-white">항해 종료!</p>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#86efac]/60 dark:border-[#166534]/60 text-[#15803d] dark:text-[#16a34a] text-xs font-black">
                      <span aria-hidden className="text-sm leading-none">{rankOf(streak).emoji}</span>{rankOf(streak).title}
                    </span>
                  </div>

                  {/* 스탯 타일 */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    <div className="rounded-xl border border-neutral-100 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1f1e1b] py-2">
                      <p className="text-xl font-black tabular-nums text-[#16a34a] leading-none">{streak}</p>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">이번 연승</p>
                    </div>
                    <div className="rounded-xl border border-neutral-100 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1f1e1b] py-2">
                      <p className="text-xl font-black tabular-nums text-neutral-700 dark:text-neutral-200 leading-none">{best}</p>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">최고 기록</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400 mt-2 break-keep">
                    {isLoggedIn ? <>발굴한 카드는 <b className="text-neutral-600 dark:text-neutral-300">내 덱({deckTotal(deck)})</b>에 쌓였습니다.</> : "로그인하면 발굴한 카드를 덱에 모을 수 있어요."}
                  </p>

                  {acquired.length > 0 && <AcquiredThisGame cards={acquired} />}
                  {missed && <MissedInfo missed={missed} />}
                </div>

                {/* 버튼 고정 (항상 보임) */}
                <div className="shrink-0 px-5 pb-4 pt-2.5 border-t border-neutral-100 dark:border-[#35332e]">
                  <button onClick={start}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-sm shadow-md shadow-[#16a34a]/25 active:scale-[0.98] transition-all">
                    <RotateCcw size={16} /> 다시 시작
                  </button>
                </div>
              </div>
            ) : anchor && challenger ? (
              <>
                <div className="relative">
                  {/* 카드 필름스트립 — 활성 2장이 우측에 꽉 차고, 지나온 카드는 왼쪽에 쌓임. 왼쪽으로 슬라이드하면 항해 기록 확인 */}
                  <div ref={trackRef} className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pt-3 pb-2">
                    {history.map((c, i) => (
                      <div key={`${c.ticker}-${i}`} className="shrink-0 self-end snap-end w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.5rem)] opacity-90">
                        <div className="aspect-[3/4]"><TcgCard item={c} value={STAT.fmt(STAT.get(c))} idleDelay={i * 0.4} /></div>
                      </div>
                    ))}
                    <div className="shrink-0 self-end snap-end w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.5rem)]">
                      <div className="aspect-[3/4]"><TcgCard hero item={anchor} value={STAT.fmt(STAT.get(anchor))} idleDelay={0} /></div>
                    </div>
                    <div className="shrink-0 self-end snap-end w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.5rem)]">
                      <div className="aspect-[3/4]"><TcgCard hero item={challenger} idleDelay={3}
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

  // 카드가 3D(두께·범선·홀로)라 한 번에 다 그리면 무거움 → 12장씩 나눠 렌더(스크롤 시 자동 추가)
  const PAGE = 12;
  const total = useMemo(() => groups.reduce((a, g) => a + g.cards.length, 0), [groups]);
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
          {(() => {
            let shown = 0; // 지금까지 렌더한 카드 수(등급 순). visible 이내 카드만 그림
            return groups.map(({ tone, cards }) => {
              const start = shown;
              shown += cards.length;
              const slice = cards.slice(0, Math.max(0, visible - start));
              if (slice.length === 0) return null; // 이 등급은 아직 로드 범위 밖 → 스크롤 시 노출
              return (
                <div key={tone}>
                  <div className="flex items-center gap-2 mb-2 px-0.5">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ring-inset text-[11px] font-black", MEDAL_TONE[tone])}>
                      <span aria-hidden>{cards[0].v.medal}</span>{cards[0].v.label}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-400">{cards.reduce((a, x) => a + (x.item.count ?? 1), 0)}장</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slice.map(({ item: c }, ci) => (
                      <div key={c.ticker} className="aspect-[3/4]">
                        <TcgCard item={c} value={STAT.fmt(STAT.get(c))} count={c.count} idleDelay={ci * 0.6} />
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
    </div>
  );
}
