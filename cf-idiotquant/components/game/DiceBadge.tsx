"use client";

// 주사위 굴림 결과 연출 — 굴림 자체는 combatEngine의 rollAttack()이 이미 동기로 판정을 끝내고
// HP/블록 등 상태가 즉시 반영된 뒤, 이 배지는 그 결과를 보여주는 순수 연출 레이어(판정 로직
// 없음). 화면을 덮는 팝업 대신 전장 한쪽에 상시 떠 있다가, 굴릴 때마다 짧게 눈이 빠르게
// 바뀌는 연출 후 실제 값에 멈추고, 그 값이 다음 굴림 전까지 그대로 남아있는 방식.
// 내 주사위와 적 주사위를 각각 독립적으로 표시해 누구의 굴림인지 항상 구분되게 한다.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AttackRollResult } from "@/app/(game)/game/gameTypes";

const SPIN_MS = 400;
const SPIN_TICK_MS = 60;
const CRIT_FLASH_MS = 700;

function DiceRow({ label, roll, isPlayer }: { label: string; roll: AttackRollResult | null; isPlayer: boolean }) {
  const [faces, setFaces] = useState<number[] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [critFlash, setCritFlash] = useState(false);
  const prevRoll = useRef<AttackRollResult | null>(null);

  useEffect(() => {
    if (!roll || roll === prevRoll.current) return;
    prevRoll.current = roll;
    const faceCount = roll.faces.length;
    setSpinning(true);
    setCritFlash(false);
    const spinInterval = setInterval(() => {
      setFaces(Array.from({ length: faceCount }, () => 1 + Math.floor(Math.random() * 20)));
    }, SPIN_TICK_MS);
    const settle = setTimeout(() => {
      clearInterval(spinInterval);
      setFaces(roll.faces);
      setSpinning(false);
      if (roll.isCrit) {
        setCritFlash(true);
        setTimeout(() => setCritFlash(false), CRIT_FLASH_MS);
      }
    }, SPIN_MS);
    return () => { clearInterval(spinInterval); clearTimeout(settle); };
  }, [roll]);

  const idle = !roll || faces === null;

  return (
    <div className={cn("flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-xl border transition-colors",
      critFlash ? "bg-amber-400/20 border-amber-500/50"
        : isPlayer ? "bg-emerald-500/[0.06] border-emerald-500/25" : "bg-rose-500/[0.06] border-rose-500/25")}>
      <span className={cn("text-[8px] font-black whitespace-nowrap", isPlayer ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        {idle ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black text-neutral-400 border border-dashed border-black/10 dark:border-white/15">–</span>
        ) : (
          faces!.map((f, i) => (
            <span key={i} className={cn("inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black tabular-nums border-2 transition-colors",
              spinning ? "border-black/10 dark:border-white/15 text-neutral-400 bg-black/[0.03] dark:bg-white/[0.04]"
                : critFlash ? "border-amber-500 bg-amber-400 text-white"
                : isPlayer ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-400")}>
              {f}
            </span>
          ))
        )}
      </div>
      {!idle && !spinning && (
        <span className={cn("text-[9px] font-black tabular-nums", isPlayer ? "text-[#16a34a]" : "text-rose-500")}>
          ⚔{roll!.totalDamage}
        </span>
      )}
    </div>
  );
}

export default function DiceBadge({ playerRoll, enemyRoll }: { playerRoll: AttackRollResult | null; enemyRoll: AttackRollResult | null }) {
  return (
    <div className="flex flex-col gap-1 p-1 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
      <DiceRow label="나" roll={playerRoll} isPlayer />
      <DiceRow label="적" roll={enemyRoll} isPlayer={false} />
    </div>
  );
}
