"use client";

// 손패(=이번 전투의 고정 기술셋) — 포켓몬처럼 탭하면 즉시 발동(드래그 폐기). PP(usesLeft)가
// 0인 기술은 비활성화. 발동 로직 자체(피해 계산·적 턴 자동 진행)는 부모(useGameRun)에 위임.

import { cn } from "@/lib/utils";
import type { CombatCard } from "@/app/(game)/game/gameTypes";

// 캔버스 높이를 지키기 위해(3줄 그리드는 세로 공간을 너무 많이 먹어 캔버스를 짜부라뜨림 —
// 과거 HUD 배지 흔들림 이슈와 같은 원인) 옛 드래그 미니카드와 동일한 고정 크기 가로 한 줄로.
// 탭하면 즉시 발동(드래그 대신).
function SkillCard({ card, onPlay }: { card: CombatCard; onPlay: (instanceId: string) => void }) {
  const usable = card.usesLeft > 0;
  return (
    <button type="button" disabled={!usable} onClick={() => onPlay(card.instanceId)}
      className={cn("shrink-0 w-16 h-20 rounded-lg border p-1 flex flex-col items-center justify-between select-none active:scale-95 transition-transform",
        usable
          ? "bg-white/90 dark:bg-white/[0.08] border-black/10 dark:border-white/15"
          : "bg-black/[0.03] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-40 cursor-not-allowed")}>
      <p className="text-[8px] font-bold text-neutral-500 dark:text-neutral-400 truncate w-full text-center">{card.name}</p>
      <div className="grid grid-cols-2 gap-x-1 text-[9px] font-black tabular-nums w-full">
        <span className="text-rose-500 text-center text-[8px]">⚔0~{card.stats.attack}</span>
        <span className="text-sky-500 text-center">🛡{card.stats.shield}</span>
      </div>
      <span className={cn("text-[8px] font-black tabular-nums", usable ? "text-violet-600 dark:text-violet-400" : "text-neutral-400")}>
        PP {card.usesLeft}/{card.stats.maxUses}
      </span>
    </button>
  );
}

// 포켓몬 대각선 배치용 — 적 정보 오버레이(주사위 등)는 좌상단, 내 정보 오버레이는 우하단에
// 떠서 각자 반대편 코너(적 캐릭터=우상단, 내 캐릭터=좌하단)와 시선이 교차하게 배치. Phaser
// 캔버스(CombatScene.ts)의 이름표+HP바가 그 좌상단/우하단 자리를 이미 쓰고 있어서, 이 DOM
// 오버레이는 그 아래/위로 한 칸 밀어(top-[17%]/bottom-[17%]) 겹치지 않게 한다.
function Battlefield({ children, topLeftOverlay, bottomRightOverlay }: {
  children: React.ReactNode; topLeftOverlay?: React.ReactNode; bottomRightOverlay?: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-full rounded-xl">
      {children}
      {topLeftOverlay && <div className="absolute left-1.5 top-[17%] z-10">{topLeftOverlay}</div>}
      {bottomRightOverlay && <div className="absolute right-1.5 bottom-[26%] z-10">{bottomRightOverlay}</div>}
    </div>
  );
}

export default function HandView({ cards, onPlayCard, topLeftOverlay, bottomRightOverlay, children }: {
  cards: CombatCard[];
  onPlayCard: (instanceId: string) => void;
  topLeftOverlay?: React.ReactNode;
  bottomRightOverlay?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex-1 min-h-0">
        <Battlefield topLeftOverlay={topLeftOverlay} bottomRightOverlay={bottomRightOverlay}>{children}</Battlefield>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-1.5 py-1.5 overflow-x-auto">
        {cards.map(card => <SkillCard key={card.instanceId} card={card} onPlay={onPlayCard} />)}
      </div>
    </>
  );
}
