"use client";

// 손패(dnd-kit 드래그) — 미니카드를 전장(children, 드롭존)으로 드래그해서 놓으면 발동.
// 에너지가 부족한 카드는 드래그 자체를 비활성화. 발동 로직은 onPlayCard(부모의 run.playHandCard)에 위임.

import { DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { CombatCard } from "@/app/(game)/game/gameTypes";

function MiniCard({ card, affordable, free }: { card: CombatCard; affordable: boolean; free: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.instanceId, disabled: !affordable });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("relative shrink-0 w-14 h-20 rounded-lg border p-1 flex flex-col items-center justify-between select-none touch-none",
        isDragging ? "z-50 shadow-xl scale-105" : "z-0",
        affordable
          ? "bg-white/90 dark:bg-white/[0.08] border-black/10 dark:border-white/15 cursor-grab active:cursor-grabbing"
          : "bg-black/[0.03] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-40 cursor-not-allowed")}>
      <p className="text-[8px] font-bold text-neutral-500 dark:text-neutral-400 truncate w-full text-center">{card.name}</p>
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[9px] font-black tabular-nums w-full">
        <span className="text-rose-500 text-center">⚔{card.stats.attack}</span>
        <span className="text-sky-500 text-center">🛡{card.stats.shield}</span>
        <span className={cn("text-center", free ? "text-amber-400 line-through" : "text-amber-600 dark:text-amber-400")}>💰{card.stats.cost}</span>
        <span className="text-emerald-500 text-center">🔋{card.stats.refund}</span>
      </div>
    </div>
  );
}

function Battlefield({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "battlefield" });
  return (
    <div ref={setNodeRef} className={cn("relative w-full h-full rounded-xl transition-colors", isOver && "ring-2 ring-[#16a34a] ring-inset bg-[#16a34a]/5")}>
      {children}
    </div>
  );
}

export default function HandView({ cards, energy, freeCostThreshold, onPlayCard, children }: {
  cards: CombatCard[]; energy: number; freeCostThreshold: number;
  onPlayCard: (instanceId: string) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over?.id === "battlefield") onPlayCard(String(e.active.id));
  };
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex-1 min-h-0">
        <Battlefield>{children}</Battlefield>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-1.5 py-1.5 overflow-x-auto">
        {cards.map(card => {
          const free = card.stats.cost <= freeCostThreshold;
          const cost = free ? 0 : card.stats.cost;
          return <MiniCard key={card.instanceId} card={card} affordable={energy >= cost} free={free} />;
        })}
      </div>
    </DndContext>
  );
}
