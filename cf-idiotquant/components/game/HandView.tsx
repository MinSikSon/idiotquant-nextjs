"use client";

// 전투 하단 패널 — 매 내 턴마다 3가지 모드를 오간다: action(전투/아이템/도망치기/월드맵 선택)
// → skills(기술 목록, PP 있으면 탭해서 즉시 발동) 또는 items(보유 액티브 아이템 사용). 세 모드
// 모두 같은 높이(w-16 h-20 카드 한 줄)를 유지해 모드 전환 시 캔버스가 리사이즈되며 흔들리는
// 문제(과거 HUD 배지 흔들림 이슈와 같은 원인)를 피한다.

import { cn } from "@/lib/utils";
import type { SkillDef, ItemDef, OwnedItem } from "@/app/(game)/game/gameTypes";

type SkillRuntime = { def: SkillDef; pp: number };

const CARD_CLASS = "shrink-0 w-16 h-20 rounded-lg border p-1 flex flex-col items-center justify-between select-none active:scale-95 transition-transform";
const CARD_ON = "bg-white/90 dark:bg-white/[0.08] border-black/10 dark:border-white/15";
const CARD_OFF = "bg-black/[0.03] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-40 cursor-not-allowed";

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack}
      className={cn(CARD_CLASS, CARD_ON, "justify-center text-neutral-500 dark:text-neutral-400")}>
      <span aria-hidden className="text-lg leading-none">◀</span>
      <span className="text-[9px] font-bold">뒤로</span>
      <span />
    </button>
  );
}

const ACTIONS: { id: "fight" | "item" | "flee" | "map"; icon: string; label: string }[] = [
  { id: "fight", icon: "⚔️", label: "전투" },
  { id: "item", icon: "🎒", label: "아이템" },
  { id: "flee", icon: "🏃", label: "도망치기" },
  { id: "map", icon: "🗺️", label: "월드맵" },
];
function ActionMenu({ onSelect }: { onSelect: (action: "fight" | "item" | "flee" | "map") => void }) {
  return (
    <>
      {ACTIONS.map(a => (
        <button key={a.id} type="button" onClick={() => onSelect(a.id)} className={cn(CARD_CLASS, CARD_ON)}>
          <span aria-hidden className="text-xl leading-none">{a.icon}</span>
          <p className="text-[9px] font-bold text-neutral-600 dark:text-neutral-300 text-center leading-tight">{a.label}</p>
          <span />
        </button>
      ))}
    </>
  );
}

const EFFECT_ICON = { attack: "⚔", shield: "🛡", heal: "❤️" } as const;
function SkillMenu({ skills, onPlay, onBack }: { skills: SkillRuntime[]; onPlay: (skillId: string) => void; onBack: () => void }) {
  return (
    <>
      <BackButton onBack={onBack} />
      {skills.map(({ def, pp }) => {
        const usable = pp > 0;
        return (
          <button key={def.id} type="button" disabled={!usable} onClick={() => onPlay(def.id)}
            className={cn(CARD_CLASS, usable ? CARD_ON : CARD_OFF)}>
            <p className="text-[8px] font-bold text-neutral-500 dark:text-neutral-400 truncate w-full text-center">{def.name}</p>
            <span className="text-[9px] font-black tabular-nums">
              {EFFECT_ICON[def.effect]}{def.effect === "attack" ? `0~${def.power}` : def.power}
            </span>
            <span className={cn("text-[8px] font-black tabular-nums", usable ? "text-violet-600 dark:text-violet-400" : "text-neutral-400")}>
              PP {pp}/{def.maxPP}
            </span>
          </button>
        );
      })}
    </>
  );
}

function ItemMenu({ ownedItems, ownedDefs, onUse, onBack }: {
  ownedItems: OwnedItem[]; ownedDefs: ItemDef[]; onUse: (instanceId: string) => void; onBack: () => void;
}) {
  return (
    <>
      <BackButton onBack={onBack} />
      {ownedItems.length === 0 && (
        <div className={cn(CARD_CLASS, CARD_OFF, "justify-center")}>
          <span className="text-[9px] font-bold text-neutral-400 text-center leading-tight">보유<br />아이템<br />없음</span>
        </div>
      )}
      {ownedItems.map(o => {
        const def = ownedDefs.find(d => d.id === o.defId);
        if (!def) return null;
        const usable = def.kind === "active";
        return (
          <button key={o.instanceId} type="button" disabled={!usable} onClick={() => onUse(o.instanceId)}
            className={cn(CARD_CLASS, usable ? CARD_ON : CARD_OFF)}>
            <span aria-hidden className="text-lg leading-none">{def.icon}</span>
            <p className="text-[8px] font-bold text-neutral-500 dark:text-neutral-400 truncate w-full text-center">{def.name}</p>
            <span className={cn("text-[8px] font-black", usable ? "text-amber-600 dark:text-amber-400" : "text-neutral-400")}>
              {usable ? "탭해서 사용" : "패시브"}
            </span>
          </button>
        );
      })}
    </>
  );
}

// 포켓몬 대각선 배치용 — 적 정보 오버레이(주사위 등)는 좌상단, 내 정보 오버레이는 우하단에
// 떠서 각자 반대편 코너(적 캐릭터=우상단, 내 캐릭터=좌하단)와 시선이 교차하게 배치. Phaser
// 캔버스(CombatScene.ts)의 이름표+HP바가 그 좌상단/우하단 자리를 이미 쓰고 있어서, 이 DOM
// 오버레이는 그 아래/위로 한 칸 밀어(top-[17%]/bottom-[26%]) 겹치지 않게 한다.
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

type HandViewProps = {
  topLeftOverlay?: React.ReactNode;
  bottomRightOverlay?: React.ReactNode;
  children: React.ReactNode;
} & (
  | { mode: "action"; onSelectAction: (action: "fight" | "item" | "flee" | "map") => void }
  | { mode: "skills"; skills: SkillRuntime[]; onPlaySkill: (skillId: string) => void; onBack: () => void }
  | { mode: "items"; ownedItems: OwnedItem[]; ownedDefs: ItemDef[]; onUseItem: (instanceId: string) => void; onBack: () => void }
);

export default function HandView(props: HandViewProps) {
  const { topLeftOverlay, bottomRightOverlay, children } = props;
  return (
    <>
      <div className="flex-1 min-h-0">
        <Battlefield topLeftOverlay={topLeftOverlay} bottomRightOverlay={bottomRightOverlay}>{children}</Battlefield>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-1.5 py-1.5 overflow-x-auto">
        {props.mode === "action" ? <ActionMenu onSelect={props.onSelectAction} />
          : props.mode === "skills" ? <SkillMenu skills={props.skills} onPlay={props.onPlaySkill} onBack={props.onBack} />
            : <ItemMenu ownedItems={props.ownedItems} ownedDefs={props.ownedDefs} onUse={props.onUseItem} onBack={props.onBack} />}
      </div>
    </>
  );
}
