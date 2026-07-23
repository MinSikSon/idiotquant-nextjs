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

// 동그라미 개수 = base(기본 4 + 레버리지 등 패시브의 energyBonus) + bonus(직전 턴 카드들의
// 환급(🔋)으로 이번 턴에만 얹힌 보너스). 기본분은 노란색, 환급 보너스분은 카드의 🔋과 같은
// 초록색으로 구분해서 "이번 턴엔 기본보다 N 더 쓸 수 있다"는 걸 한눈에 보이게 한다.
// 채워진 동그라미 수 = 아직 안 쓴 코스트, 카드의 ●와 같은 기호를 써서 관계를 시각적으로 잇는다.
// vertical: 전장 오른쪽 가장자리에 세로로 띄우는 배지(동그라미가 아래→위로 채워짐, 자원계 UI 관례).
export function EnergyBar({ energy, base, bonus, vertical }: { energy: number; base: number; bonus: number; vertical?: boolean }) {
  const total = Math.max(energy, base + bonus);
  const dot = (i: number) => {
    const filled = i < energy;
    const isBonus = i >= base;
    return (
      <span key={i} aria-hidden className={cn(vertical ? "w-2.5 h-2.5" : "w-2.5 h-2.5", "rounded-full",
        !filled ? "bg-black/10 dark:bg-white/10"
          : isBonus ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]")} />
    );
  };

  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-1 px-1.5 py-2 rounded-2xl backdrop-blur-md bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
        <span className="text-[8px] font-black text-neutral-400 whitespace-nowrap">코스트</span>
        <div className="flex flex-col-reverse items-center gap-0.5 py-0.5">
          {Array.from({ length: total }, (_, i) => dot(i))}
        </div>
        <span className="text-[10px] font-black tabular-nums text-amber-600 dark:text-amber-400">{energy}</span>
        {bonus > 0 && <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">🔋+{bonus}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] font-black text-neutral-400 shrink-0">코스트</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: total }, (_, i) => dot(i))}
      </div>
      <span className="text-[10px] font-black tabular-nums text-amber-600 dark:text-amber-400 shrink-0">{energy}</span>
      {bonus > 0 && <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">🔋+{bonus}</span>}
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
