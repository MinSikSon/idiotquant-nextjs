"use client";

// 카드 게임 수집 요소 — 홀로 마감(중복 카드) · 팩 오픈 연출 · 업적 배지.
// 도감(완성도)·잠금 카드는 TcgCard 자체의 `locked` 분기로 처리(page.tsx).

import { useMemo } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIER, rgba, WaxSeal, deckTotal, type DeckItem } from "./page";
import { computeValueScore } from "@/lib/utils/valueScore";

// ─── 중복 카드 홀로/프리미엄 마감 ────────────────────────────────────
export const HOLO_THRESHOLD = 3;

export function HoloOverlay({ tone }: { tone: string }) {
  const c = TIER[tone] ?? TIER.explore;
  const grad = `conic-gradient(from 0deg at 50% 50%, ${rgba(c.glow, 0)}, rgba(255,255,255,.5), ${rgba(c.glow, .5)}, rgba(255,255,255,.15), ${rgba(c.glow, 0)})`;
  return (
    <>
      <span aria-hidden className="holo-sheen absolute inset-0 pointer-events-none z-[4]"
        style={{ background: grad, backgroundSize: "250% 250%", mixBlendMode: "color-dodge", opacity: 0.28 }} />
      <span aria-hidden className="absolute top-1 right-1 z-[5] px-1 py-0.5 rounded-full bg-black/70 text-white text-[8px] font-black tracking-wide">HOLO</span>
      <style jsx>{`
        .holo-sheen { animation: holo-pan 7s linear infinite; }
        @keyframes holo-pan { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
        @media (prefers-reduced-motion: reduce) { .holo-sheen { animation-play-state: paused; } }
      `}</style>
    </>
  );
}

// ─── 팩 오픈 리빌 연출 — 카드 획득 시 WaxSeal을 확대해 짧게 보여줌 ──────
export function PackReveal({ item }: { item: any }) {
  return (
    <span className="pack-reveal inline-flex flex-col items-center gap-1">
      <span className="pack-pop"><WaxSeal item={item} size={40} /></span>
      <span className="text-xs font-bold text-neutral-400">카드 개봉 중…</span>
      <style jsx>{`
        .pack-pop { display: inline-flex; animation: pop 0.65s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes pop {
          0% { transform: scale(.4) rotate(-8deg); opacity: 0; }
          55% { transform: scale(1.08) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) { .pack-pop { animation-duration: .01ms; } }
      `}</style>
    </span>
  );
}

// ─── 업적 배지 — deck/best/catalogTotal에서 매 렌더 파생 계산(서버 저장 없음) ──
type Achievement = {
  id: string; label: string; desc: string; icon: string;
  done: (ctx: { deck: DeckItem[]; best: number; catalogTotal: number }) => boolean;
};
const ACHIEVEMENTS: Achievement[] = [
  { id: "first", icon: "🎴", label: "첫 발굴", desc: "카드 1장 이상 수집", done: ({ deck }) => deckTotal(deck) >= 1 },
  { id: "collector", icon: "📚", label: "수집가의 눈", desc: "카드 20장 수집", done: ({ deck }) => deckTotal(deck) >= 20 },
  { id: "legend3", icon: "👑", label: "전설의 발굴자", desc: "전설 등급 카드 누적 3장", done: ({ deck }) => deck.filter(c => computeValueScore(c).tone === "legend").reduce((a, c) => a + (c.count ?? 1), 0) >= 3 },
  { id: "prism4", icon: "💠", label: "프리즘 소유자", desc: "전설·보물·다이아·금 등급 모두 보유", done: ({ deck }) => ["legend", "treasure", "diamond", "gold"].every(t => deck.some(c => computeValueScore(c).tone === t)) },
  { id: "half", icon: "📖", label: "도감 반절", desc: "도감 50% 달성", done: ({ deck, catalogTotal }) => catalogTotal > 0 && deck.length / catalogTotal >= 0.5 },
  { id: "holo", icon: "✨", label: "홀로 컬렉터", desc: "같은 카드 3장으로 홀로 카드 제작", done: ({ deck }) => deck.some(c => (c.count ?? 1) >= HOLO_THRESHOLD) },
  { id: "streak10", icon: "🔥", label: "생존 스트릭 10", desc: "한 항해에서 10연승", done: ({ best }) => best >= 10 },
  { id: "captain", icon: "🚢", label: "전설의 선장", desc: "최고 기록 15연승 달성", done: ({ best }) => best >= 15 }, // rankOf()의 "전설의 선장"(streak>=15)과 동일 기준
];

export function AchievementBadges({ deck, best, catalogTotal }: { deck: DeckItem[]; best: number; catalogTotal: number }) {
  const list = useMemo(() => ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.done({ deck, best, catalogTotal }) })), [deck, best, catalogTotal]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(a => (
        <span key={a.id} title={a.desc}
          className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ring-1 ring-inset backdrop-blur-md",
            a.unlocked ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 ring-amber-500/40 shadow-[0_0_10px_-2px_rgba(245,158,11,0.5)]"
              : "bg-black/[0.03] dark:bg-white/[0.04] text-neutral-400 dark:text-neutral-600 ring-black/5 dark:ring-white/10")}>
          {a.unlocked ? <span aria-hidden>{a.icon}</span> : <Lock size={10} />}
          {a.label}
        </span>
      ))}
    </div>
  );
}
