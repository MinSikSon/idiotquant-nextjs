"use client";

// 전투 HUD 조각들 — HP바/에너지바/보유 아이템 목록. 순수 표시(+ ItemBar만 액티브 아이템 발동 콜백).

import { cn } from "@/lib/utils";
import type { ItemDef, OwnedItem } from "@/app/(game)/game/gameTypes";

export function HpBar({ hp, maxHp, label }: { hp: number; maxHp: number; label: string }) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] font-black text-neutral-400 shrink-0">{label}</span>
      <div className="relative w-16 sm:w-24 h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden shrink-0">
        <div className={cn("h-full rounded-full transition-all", pct > 50 ? "bg-[#16a34a]" : pct > 20 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-black tabular-nums text-neutral-600 dark:text-neutral-300 shrink-0">{hp}/{maxHp}</span>
    </div>
  );
}

export function EnergyBar({ energy, energyMax }: { energy: number; energyMax: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: Math.max(energy, energyMax) }, (_, i) => (
        <span key={i} aria-hidden className={cn("w-2.5 h-2.5 rounded-full", i < energy ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" : "bg-black/10 dark:bg-white/10")} />
      ))}
      <span className="ml-1 text-[10px] font-black tabular-nums text-amber-600 dark:text-amber-400">{energy}</span>
    </div>
  );
}

export function ItemBar({ ownedDefs, ownedItems, onUseActive, canUseActive }: {
  ownedDefs: ItemDef[]; ownedItems: OwnedItem[];
  onUseActive: (instanceId: string) => void; canUseActive: boolean;
}) {
  if (ownedItems.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ownedItems.map(o => {
        const def = ownedDefs.find(d => d.id === o.defId);
        if (!def) return null;
        const isActive = def.kind === "active";
        return (
          <button key={o.instanceId} type="button" title={`${def.name} — ${def.desc}`}
            disabled={!isActive || !canUseActive}
            onClick={() => isActive && onUseActive(o.instanceId)}
            className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full text-sm shrink-0 border transition-all",
              isActive
                ? cn("bg-amber-500/10 border-amber-500/40", canUseActive ? "hover:bg-amber-500/20 active:scale-90" : "opacity-40 cursor-not-allowed")
                : "bg-sky-500/10 border-sky-500/30 cursor-default",
              def.isLegend && "ring-1 ring-amber-500")}>
            <span aria-hidden>{def.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
