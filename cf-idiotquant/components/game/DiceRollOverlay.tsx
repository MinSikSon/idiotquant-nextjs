"use client";

// 주사위 굴림 결과 연출 — 굴림 자체는 combatEngine의 rollAttack()이 이미 동기로 판정을 끝내고
// HP/블록 등 상태가 즉시 반영된 뒤, 이 오버레이는 그 결과를 잠깐 보여주는 순수 연출 레이어.
// 판정 로직은 전혀 없음(재생만) — Phaser 캔버스의 popText와 같은 역할을 DOM에서 담당.

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { AttackRollResult } from "@/app/(game)/game/gameTypes";

const AUTO_DISMISS_MS = 500;

export default function DiceRollOverlay({ roll, auto, onDismiss }: {
  roll: { source: "player" | "enemy"; roll: AttackRollResult } | null;
  auto: boolean;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!roll || !auto) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [roll, auto, onDismiss]);

  if (!roll) return null;
  const { source, roll: r } = roll;
  const isPlayer = source === "player";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-3"
      onClick={auto ? undefined : onDismiss}>
      <div onClick={e => e.stopPropagation()}
        className="rounded-2xl px-6 py-5 text-center shadow-xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] animate-in zoom-in-95 fade-in duration-150">
        <p className="text-[10px] font-bold text-neutral-400 mb-1.5">{isPlayer ? "내 공격" : "적의 공격"}</p>
        <div className="flex items-center justify-center gap-2 mb-2">
          {r.faces.map((f, i) => (
            <span key={i} className={cn("inline-flex items-center justify-center w-10 h-10 rounded-lg text-lg font-black tabular-nums border-2",
              f === 20 ? "bg-amber-400 border-amber-500 text-white" : "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10 text-neutral-800 dark:text-neutral-100")}>
              {f}
            </span>
          ))}
        </div>
        {r.isCrit && <p className="text-sm font-black text-amber-500 mb-1">💥 크리티컬!</p>}
        <p className={cn("text-2xl font-black tabular-nums", isPlayer ? "text-[#16a34a]" : "text-rose-500")}>⚔{r.totalDamage}</p>
        {!auto && (
          <button type="button" onClick={onDismiss}
            className="mt-3 px-4 py-1.5 rounded-full bg-[#16a34a] text-white text-xs font-bold active:scale-95 transition-transform">
            확인
          </button>
        )}
      </div>
    </div>
  );
}
