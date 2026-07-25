"use client";

// 전투 하단 패널 — 포켓몬 클래식 구도(메시지 텍스트박스+선택 그리드 나란히 배치)를 따른다.
// 매 내 턴마다 3가지 모드를 오간다: action(전투/아이템/도망치기/월드맵 선택) → skills(기술
// 목록, PP 있으면 탭해서 즉시 발동) 또는 items(보유 액티브 아이템 사용). 세 모드 모두 같은
// 높이(h-20)를 유지해 모드 전환 시 캔버스가 리사이즈되며 흔들리는 문제(과거 HUD 배지 흔들림
// 이슈와 같은 원인)를 피한다.

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { SkillDef, ItemDef, OwnedItem } from "@/app/(game)/game/gameTypes";

type SkillRuntime = { def: SkillDef; pp: number };

const TYPE_SPEED_MS = 22; // 글자당 출력 간격 — 포켓몬 특유의 또박또박 타자기 속도
function MessageBox({ text }: { text: string }) {
  const chars = useMemo(() => Array.from(text ?? ""), [text]);
  const [count, setCount] = useState(chars.length);
  useEffect(() => {
    setCount(0);
    if (chars.length === 0) return;
    const id = setInterval(() => {
      setCount(c => {
        if (c + 1 >= chars.length) { clearInterval(id); return chars.length; }
        return c + 1;
      });
    }, TYPE_SPEED_MS);
    return () => clearInterval(id);
  }, [chars]);
  return (
    <div className="flex-1 min-w-0 h-20 rounded-lg border-2 border-neutral-800 dark:border-neutral-200 bg-white dark:bg-[#1a1a1a] px-2.5 py-2 overflow-hidden">
      <p className="text-[11px] leading-snug font-bold text-neutral-800 dark:text-neutral-100 break-keep">
        {chars.slice(0, count).join("")}
      </p>
    </div>
  );
}

const CELL_CLASS = "min-w-0 h-full rounded-md border px-1 flex flex-col items-center justify-center select-none active:scale-95 transition-transform overflow-hidden";
const CELL_ON = "bg-white/90 dark:bg-white/[0.08] border-black/10 dark:border-white/15";
const CELL_OFF = "bg-black/[0.03] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-40 cursor-not-allowed";

// 포켓몬 배틀 메뉴의 상시 취소 화살표(그리드 칸을 하나 차지하지 않고 옆에 따로 붙어 있음)를
// 흉내낸 슬림 세로 버튼 — skills/items 모드에서만 노출.
function BackColumn({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} aria-label="뒤로"
      className="shrink-0 w-6 h-full rounded-md border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400 flex items-center justify-center active:scale-95 transition-transform">
      <span aria-hidden className="text-sm leading-none">◀</span>
    </button>
  );
}

// 2x2 그리드 하나로 고정 — 포켓몬의 FIGHT/BAG/POKÉMON/RUN 4택, 그리고 기술도 한 캐릭터당
// 최대 4개라는 규칙을 그대로 가져왔기 때문에(WARRIOR_SKILLS도 정확히 4개) 스크롤 없이 꽉 채움.
function Grid2x2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full w-[168px] shrink-0">{children}</div>;
}

const ACTIONS: { id: "fight" | "item" | "flee" | "map"; icon: string; label: string }[] = [
  { id: "fight", icon: "⚔️", label: "전투" },
  { id: "item", icon: "🎒", label: "아이템" },
  { id: "flee", icon: "🏃", label: "도망치기" },
  { id: "map", icon: "🗺️", label: "월드맵" },
];
function ActionMenu({ onSelect }: { onSelect: (action: "fight" | "item" | "flee" | "map") => void }) {
  return (
    <Grid2x2>
      {ACTIONS.map(a => (
        <button key={a.id} type="button" onClick={() => onSelect(a.id)} className={cn(CELL_CLASS, CELL_ON)}>
          <span aria-hidden className="text-base leading-none">{a.icon}</span>
          <p className="text-[9px] font-bold text-neutral-600 dark:text-neutral-300 text-center leading-tight mt-0.5">{a.label}</p>
        </button>
      ))}
    </Grid2x2>
  );
}

const EFFECT_ICON = { attack: "⚔", shield: "🛡", heal: "❤️" } as const;
function SkillMenu({ skills, onPlay, onBack }: { skills: SkillRuntime[]; onPlay: (skillId: string) => void; onBack: () => void }) {
  return (
    <>
      <BackColumn onBack={onBack} />
      <Grid2x2>
        {skills.map(({ def, pp }) => {
          const usable = pp > 0;
          return (
            <button key={def.id} type="button" disabled={!usable} onClick={() => onPlay(def.id)}
              className={cn(CELL_CLASS, usable ? CELL_ON : CELL_OFF)}>
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
      </Grid2x2>
    </>
  );
}

function ItemMenu({ ownedItems, ownedDefs, onUse, onBack }: {
  ownedItems: OwnedItem[]; ownedDefs: ItemDef[]; onUse: (instanceId: string) => void; onBack: () => void;
}) {
  return (
    <>
      <BackColumn onBack={onBack} />
      <div className="flex items-center gap-1 h-full w-[168px] shrink-0 overflow-x-auto">
        {ownedItems.length === 0 && (
          <div className={cn(CELL_CLASS, CELL_OFF, "w-full")}>
            <span className="text-[9px] font-bold text-neutral-400 text-center leading-tight">보유 아이템 없음</span>
          </div>
        )}
        {ownedItems.map(o => {
          const def = ownedDefs.find(d => d.id === o.defId);
          if (!def) return null;
          const usable = def.kind === "active";
          return (
            <button key={o.instanceId} type="button" disabled={!usable} onClick={() => onUse(o.instanceId)}
              className={cn(CELL_CLASS, "w-16 shrink-0", usable ? CELL_ON : CELL_OFF)}>
              <span aria-hidden className="text-base leading-none">{def.icon}</span>
              <p className="text-[8px] font-bold text-neutral-500 dark:text-neutral-400 truncate w-full text-center">{def.name}</p>
              <span className={cn("text-[8px] font-black", usable ? "text-amber-600 dark:text-amber-400" : "text-neutral-400")}>
                {usable ? "탭해서 사용" : "패시브"}
              </span>
            </button>
          );
        })}
      </div>
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
  message: string; // 텍스트박스에 타자기 효과로 표시할 최신 전투 로그 한 줄
  topLeftOverlay?: React.ReactNode;
  bottomRightOverlay?: React.ReactNode;
  children: React.ReactNode;
} & (
  | { mode: "action"; onSelectAction: (action: "fight" | "item" | "flee" | "map") => void }
  | { mode: "skills"; skills: SkillRuntime[]; onPlaySkill: (skillId: string) => void; onBack: () => void }
  | { mode: "items"; ownedItems: OwnedItem[]; ownedDefs: ItemDef[]; onUseItem: (instanceId: string) => void; onBack: () => void }
);

export default function HandView(props: HandViewProps) {
  const { message, topLeftOverlay, bottomRightOverlay, children } = props;
  return (
    <>
      <div className="flex-1 min-h-0">
        <Battlefield topLeftOverlay={topLeftOverlay} bottomRightOverlay={bottomRightOverlay}>{children}</Battlefield>
      </div>
      {/* 포켓몬 클래식 구도 — 왼쪽은 메시지 텍스트박스(타자기 효과), 오른쪽은 선택 그리드
          (전투/아이템/도망치기/월드맵 또는 기술/아이템 목록). 둘 다 h-20으로 높이를 맞춰서
          모드가 바뀌어도 이 행 전체 높이가 안 흔들린다. */}
      <div className="shrink-0 flex items-stretch gap-1.5 py-1.5">
        <MessageBox text={message} />
        {props.mode === "action" ? <ActionMenu onSelect={props.onSelectAction} />
          : props.mode === "skills" ? <SkillMenu skills={props.skills} onPlay={props.onPlaySkill} onBack={props.onBack} />
            : <ItemMenu ownedItems={props.ownedItems} ownedDefs={props.ownedDefs} onUse={props.onUseItem} onBack={props.onBack} />}
      </div>
    </>
  );
}
