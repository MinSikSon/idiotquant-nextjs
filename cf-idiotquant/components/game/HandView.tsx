"use client";

// 손패(dnd-kit 드래그) — 미니카드를 전장(children, 드롭존)으로 드래그해서 놓으면 발동.
// 에너지가 부족한 카드는 드래그 자체를 비활성화. 발동 로직은 onPlayCard(부모의 run.playHandCard)에 위임.

import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { CombatCard } from "@/app/(game)/game/gameTypes";

function CardFace({ card, free }: { card: CombatCard; free: boolean }) {
  return (
    <>
      <p className="text-[8px] font-bold text-neutral-500 dark:text-neutral-400 truncate w-full text-center">{card.name}</p>
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[9px] font-black tabular-nums w-full">
        <span className="text-rose-500 text-center">⚔{card.stats.attack}</span>
        <span className="text-sky-500 text-center">🛡{card.stats.shield}</span>
        <span className={cn("text-center", free ? "text-amber-400 line-through" : "text-amber-600 dark:text-amber-400")}>●{card.stats.cost}</span>
        <span className="text-emerald-500 text-center">🔋{card.stats.refund}</span>
      </div>
    </>
  );
}

// 드래그 중엔 원래 자리의 카드는 옅게 남겨두고(원위치 표시), 실제 시각적 카드는 DragOverlay가
// 별도 플로팅 레이어로 그려줌 — 부모(overflow-x-auto)의 클리핑 경계에 안 잘리게 하기 위함.
function MiniCard({ card, affordable, free }: { card: CombatCard; affordable: boolean; free: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.instanceId, disabled: !affordable });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={cn("relative shrink-0 w-14 h-20 rounded-lg border p-1 flex flex-col items-center justify-between select-none touch-none",
        isDragging && "opacity-30",
        affordable
          ? "bg-white/90 dark:bg-white/[0.08] border-black/10 dark:border-white/15 cursor-grab active:cursor-grabbing"
          : "bg-black/[0.03] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-40 cursor-not-allowed")}>
      <CardFace card={card} free={free} />
    </div>
  );
}

function DragPreview({ card, free }: { card: CombatCard; free: boolean }) {
  return (
    <div className="w-14 h-20 rounded-lg border-2 border-[#16a34a] p-1 flex flex-col items-center justify-between shadow-2xl scale-110 bg-white dark:bg-[#242320]">
      <CardFace card={card} free={free} />
    </div>
  );
}

function Battlefield({ children, hudOverlay }: { children: React.ReactNode; hudOverlay?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "battlefield" });
  return (
    <div ref={setNodeRef} className={cn("relative w-full h-full rounded-xl transition-colors", isOver && "ring-2 ring-[#16a34a] ring-inset bg-[#16a34a]/5")}>
      {children}
      {hudOverlay && <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">{hudOverlay}</div>}
    </div>
  );
}

export default function HandView({ cards, energy, freeCostThreshold, onPlayCard, hudOverlay, children }: {
  cards: CombatCard[]; energy: number; freeCostThreshold: number;
  onPlayCard: (instanceId: string) => void;
  hudOverlay?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (e.over?.id === "battlefield") onPlayCard(String(e.active.id));
  };
  const activeCard = cards.find(c => c.instanceId === activeId) ?? null;
  // DragOverlay는 position:fixed로 그려지는데, 손패를 감싼 조상(overflow-hidden +
  // backdrop-blur)이 fixed 자손의 containing block을 가로채 화면 밖으로 잘려 보이던 문제가
  // 있었다 — document.body로 직접 포탈해서 그 조상 체인을 완전히 벗어나게 함.
  const overlay = (
    <DragOverlay>
      {activeCard ? <DragPreview card={activeCard} free={activeCard.stats.cost <= freeCostThreshold} /> : null}
    </DragOverlay>
  );
  return (
    <DndContext sensors={sensors}
      onDragStart={e => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}>
      <div className="flex-1 min-h-0">
        <Battlefield hudOverlay={hudOverlay}>{children}</Battlefield>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-1.5 py-1.5 overflow-x-auto">
        {cards.map(card => {
          const free = card.stats.cost <= freeCostThreshold;
          const cost = free ? 0 : card.stats.cost;
          return <MiniCard key={card.instanceId} card={card} affordable={energy >= cost} free={free} />;
        })}
      </div>
      {typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay}
    </DndContext>
  );
}
