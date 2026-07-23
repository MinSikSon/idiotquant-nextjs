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

// 상단 동그라미 개수 = energyMax(기본 4 + 레버리지 등 패시브 아이템의 energyBonus 합).
// 채워진(노란) 동그라미 수 = 이번 턴에 아직 쓸 수 있는 코스트. 카드의 코스트 숫자와 같은
// 동그라미 기호(●)를 써서 "카드를 내면 이 동그라미가 그만큼 준다"는 걸 시각적으로 잇는다.
export function EnergyBar({ energy, energyMax }: { energy: number; energyMax: number }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] font-black text-neutral-400 shrink-0">코스트</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: Math.max(energy, energyMax) }, (_, i) => (
          <span key={i} aria-hidden className={cn("w-2.5 h-2.5 rounded-full", i < energy ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" : "bg-black/10 dark:bg-white/10")} />
        ))}
      </div>
      <span className="text-[10px] font-black tabular-nums text-amber-600 dark:text-amber-400 shrink-0">{energy}</span>
    </div>
  );
}

// 이번 턴 동안 쌓인 방어력 — 적 턴 한 번 막고 사라지므로, 카드를 낼 때마다 바로바로
// 눈에 보여야 "지금 방어를 쌓고 있다"는 걸 알 수 있다.
export function ShieldBadge({ block }: { block: number }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span aria-hidden className="text-sky-500">🛡️</span>
      <span className="text-[10px] font-black tabular-nums text-sky-600 dark:text-sky-400">{block}</span>
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
