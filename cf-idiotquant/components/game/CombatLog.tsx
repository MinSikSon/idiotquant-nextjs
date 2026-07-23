"use client";

// 전투 기록 — D&D 전투기록처럼 카드 발동/적 공격/아이템 사용 결과를 실제 수치와 함께 쌓아 보여줌.
// 순수 표시용(useGameRun의 log 배열을 그대로 렌더링), 새 항목이 추가되면 자동으로 맨 아래로 스크롤.

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/app/(game)/game/gameTypes";

const KIND_COLOR: Record<string, string> = {
  player: "text-emerald-400",
  enemy: "text-rose-400",
  item: "text-amber-400",
  system: "text-neutral-400",
};

export default function CombatLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [entries]);

  return (
    <div ref={ref} className="shrink-0 h-14 sm:h-16 overflow-y-auto rounded-lg bg-black/85 border border-white/10 px-2 py-1 font-mono">
      {entries.map(e => (
        <p key={e.id} className={cn("text-[10px] leading-relaxed break-keep", KIND_COLOR[e.kind] ?? "text-neutral-400")}>
          <span aria-hidden className="opacity-50">&gt; </span>{e.text}
        </p>
      ))}
    </div>
  );
}
