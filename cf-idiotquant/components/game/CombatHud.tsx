"use client";

// 전투 HUD 조각들 — HP바/에너지바/보유 아이템 목록. 순수 표시(+ ItemBar만 액티브 아이템 발동 콜백).

import { useState } from "react";
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

// 적의 다음 공격이 얼마나 아플지 미리 보여주는 텔레그래프 — 공격력이 이제 고정 데미지가 아니라
// 0~N 범위 주사위 굴림이라 정확한 수치 대신 범위로 표시한다.
export function EnemyIntentBadge({ base }: { base: number }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span aria-hidden className="text-rose-500">⚔️</span>
      <span className="text-[10px] font-black tabular-nums text-rose-600 dark:text-rose-400">0~{base} 예정</span>
    </div>
  );
}

// 하단 캐릭터 정보 패널용 — 아이콘+값(굵게, 크게)을 한 줄로, 라벨을 그 아래 작게. 가로
// 스크롤로 숨겨지던 수치들을 전부 동시에 보이는 고정 그리드로 펼치기 위한 셀 하나.
const TILE_TONE = {
  amber: "text-amber-600 dark:text-amber-400",
  sky: "text-sky-600 dark:text-sky-400",
  rose: "text-rose-600 dark:text-rose-400",
  emerald: "text-[#16a34a] dark:text-emerald-400",
} as const;
export function StatTile({ icon, label, value, tone = "amber", suffix }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; tone?: keyof typeof TILE_TONE; suffix?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 py-1 text-center">
      <p className={cn("flex items-center justify-center gap-0.5 text-xs font-black tabular-nums leading-none", TILE_TONE[tone])}>
        {icon}{value}
      </p>
      {suffix && <p className="text-[8px] font-bold text-emerald-500 mt-0.5 leading-none">{suffix}</p>}
      <p className="text-[7px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5 leading-none">{label}</p>
    </div>
  );
}

// 이번 런에서 얻은 아이템 — 탭하면 즉시 소모(액티브) 대신 먼저 설명이 뜨고, 그 안의
// "사용하기" 버튼을 따로 눌러야 실제로 소모된다(오탭으로 아이템을 날리는 위험을 줄이는
// 부수 효과도 있음). 패시브 아이템은 원래 탭해도 반응이 없었는데, 이제 똑같이 설명이 뜬다.
export function ItemBar({ ownedDefs, ownedItems, onUseActive, canUseActive }: {
  ownedDefs: ItemDef[]; ownedItems: OwnedItem[];
  onUseActive: (instanceId: string) => void; canUseActive: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  if (ownedItems.length === 0) return null;
  const selectedOwned = ownedItems.find(o => o.instanceId === selected);
  const selectedDef = selectedOwned && ownedDefs.find(d => d.id === selectedOwned.defId);
  return (
    <div className="relative flex items-center gap-1 flex-wrap justify-center">
      {ownedItems.map(o => {
        const def = ownedDefs.find(d => d.id === o.defId);
        if (!def) return null;
        const isActive = def.kind === "active";
        return (
          <button key={o.instanceId} type="button"
            onClick={() => setSelected(s => s === o.instanceId ? null : o.instanceId)}
            className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full text-sm shrink-0 border transition-all active:scale-90",
              selected === o.instanceId ? "ring-2 ring-offset-1 ring-offset-white dark:ring-offset-[#242320]" : "",
              isActive ? cn("bg-amber-500/10 border-amber-500/40", selected === o.instanceId && "ring-amber-500")
                : cn("bg-sky-500/10 border-sky-500/30", selected === o.instanceId && "ring-sky-500"),
              def.isLegend && "ring-1 ring-amber-500")}>
            <span aria-hidden>{def.icon}</span>
          </button>
        );
      })}
      {/* absolute — 설명이 펼쳐져도 이 행의 높이(=상단 HUD 전체 높이)가 안 변해야 캔버스가
          같이 리사이즈되며 흔들리는 문제(과거 HUD 배지 높이 고정 작업의 이유)가 재발하지 않음 */}
      {selectedDef && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-20 w-max max-w-[220px] rounded-lg backdrop-blur-md bg-white/95 dark:bg-[#242320]/95 border border-black/5 dark:border-white/10 shadow-lg px-2 py-1.5 text-center">
          <p className="text-[10px] font-black text-neutral-800 dark:text-neutral-100">{selectedDef.name}</p>
          <p className="text-[9px] text-neutral-500 dark:text-neutral-400 leading-tight">{selectedDef.desc}</p>
          {selectedDef.kind === "active" && (
            <button type="button" disabled={!canUseActive}
              onClick={() => { onUseActive(selectedOwned!.instanceId); setSelected(null); }}
              className={cn("mt-1 px-3 py-1 rounded-full text-[10px] font-black transition-colors",
                canUseActive ? "bg-amber-500 text-white active:scale-95" : "bg-black/10 dark:bg-white/10 text-neutral-400 cursor-not-allowed")}>
              사용하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
