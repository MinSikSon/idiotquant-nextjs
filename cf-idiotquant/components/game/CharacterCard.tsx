"use client";

// 플레이어 캐릭터 정보 — 직업/Lv/XP/4스탯. 화면 하단에 상시 노출되는 패널의 일부라 컴팩트한
// 가로형 레이아웃을 쓴다(과거엔 별도 모달에 세로로 크게 배치했었음). 직업 라벨과 스탯 박스를
// 탭하면 실제 전투 계산식(combatEngine.ts 상수 그대로 참조)에 기반한 설명이 펼쳐진다.

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CLASS_DEFS, xpToNextLevel } from "@/app/(game)/game/characterEngine";
import { STR_DAMAGE_DIVISOR, DEX_ROLL_DIVISOR, VIT_HP_MULTIPLIER, LUK_CRIT_PER_POINT, LUK_CRIT_CAP } from "@/app/(game)/game/combatEngine";
import type { CharacterState, CharacterStats } from "@/app/(game)/game/gameTypes";

const STAT_ICON: Record<keyof CharacterStats, string> = { str: "💪", dex: "🐇", luk: "🍀", vit: "🫀" };
const STAT_LABEL: Record<keyof CharacterStats, string> = { str: "힘", dex: "민첩", luk: "행운", vit: "체력" };
const STAT_KEYS = Object.keys(STAT_ICON) as (keyof CharacterStats)[];
const STAT_DESC: Record<keyof CharacterStats, string> = {
  str: `카드 공격 시 고정 데미지 보너스. ${STR_DAMAGE_DIVISOR}당 데미지 +1.`,
  dex: `주사위 눈에 보정치가 붙어요. ${DEX_ROLL_DIVISOR}당 눈 +1(최대 20).`,
  luk: `크리티컬(최대 데미지의 2배) 확률 상승. 1당 +${(LUK_CRIT_PER_POINT * 100).toFixed(1)}%p(최대 ${LUK_CRIT_CAP * 100}%).`,
  vit: `최대 HP 증가. 1당 +${VIT_HP_MULTIPLIER}.`,
};

type InfoKey = "class" | keyof CharacterStats;

export default function CharacterCard({ character, effectiveStats }: {
  character: CharacterState; effectiveStats: CharacterStats;
}) {
  const [infoKey, setInfoKey] = useState<InfoKey | null>(null);
  const cls = CLASS_DEFS[character.classId];
  const need = xpToNextLevel(character.level);
  const xpPct = Math.max(0, Math.min(100, (character.xp / need) * 100));
  const toggle = (key: InfoKey) => setInfoKey(k => k === key ? null : key);
  const infoText = infoKey === "class" ? cls.desc : infoKey ? STAT_DESC[infoKey] : null;

  return (
    <div className="relative rounded-xl border border-orange-500/30 bg-orange-500/[0.06] px-2 py-1">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => toggle("class")}
          className={cn("shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full transition-colors",
            infoKey === "class" ? "bg-orange-500 text-white" : "text-orange-700 dark:text-orange-300 hover:bg-orange-500/15")}>
          {cls.name} Lv.{character.level}
        </button>
        <div className="flex-1 min-w-0 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden" title={`XP ${character.xp}/${need}`}>
          <div className="h-full bg-violet-500" style={{ width: `${xpPct}%` }} />
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {STAT_KEYS.map(key => {
            const base = character.stats[key];
            const bonus = effectiveStats[key] - base;
            return (
              <button key={key} type="button" onClick={() => toggle(key)}
                className={cn("text-[10px] font-black tabular-nums px-1 py-0.5 rounded transition-colors",
                  infoKey === key ? "bg-orange-500 text-white" : "text-neutral-700 dark:text-neutral-200 hover:bg-orange-500/15")}>
                {STAT_ICON[key]}{base}{bonus > 0 && <span className={infoKey === key ? "" : "text-emerald-500"}>+{bonus}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {/* absolute — 펼쳐져도 카드 자체 높이가 안 변해야 하단 패널이 흔들리지 않음(위로 펼침,
          화면 하단에 고정 배치되므로 아래로 펼치면 화면 밖/탭바에 가려질 수 있음) */}
      {infoText && (
        <p className="absolute bottom-full left-0 right-0 mb-1 rounded-lg backdrop-blur-md bg-white/95 dark:bg-[#242320]/95 border border-black/5 dark:border-white/10 shadow-lg px-2 py-1.5 text-[9px] leading-tight text-neutral-500 dark:text-neutral-400">
          {infoKey !== "class" && <b className="text-neutral-700 dark:text-neutral-200">{STAT_LABEL[infoKey as keyof CharacterStats]} — </b>}
          {infoText}
        </p>
      )}
    </div>
  );
}
