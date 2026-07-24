"use client";

// 플레이어 캐릭터 카드 — 기존 주식 카드(TcgCard)의 둥근 프레임 + 아이콘 + 2x2 스탯 그리드
// 시각 언어를 재사용하되, 등급 글로우 대신 직업 고정 톤(전사=주황 계열)을 쓴다. 이번 스코프는
// 픽셀아트 대신 이모지 placeholder — 몬스터도 처음엔 placeholder였다가 여러 피드백을 거쳐
// 지금 모습이 된 전례를 따라 우선 저비용으로 시작한다.

import { CLASS_DEFS, xpToNextLevel } from "@/app/(game)/game/characterEngine";
import type { CharacterState, CharacterStats } from "@/app/(game)/game/gameTypes";

const STAT_ICON: Record<keyof CharacterStats, string> = { str: "💪", dex: "🐇", luk: "🍀", vit: "🫀" };
const STAT_LABEL: Record<keyof CharacterStats, string> = { str: "힘", dex: "민첩", luk: "행운", vit: "체력" };
const STAT_KEYS = Object.keys(STAT_ICON) as (keyof CharacterStats)[];

export default function CharacterCard({ character, effectiveStats, hp, maxHp }: {
  character: CharacterState; effectiveStats: CharacterStats; hp: number; maxHp: number;
}) {
  const cls = CLASS_DEFS[character.classId];
  const need = xpToNextLevel(character.level);
  const xpPct = Math.max(0, Math.min(100, (character.xp / need) * 100));
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;

  return (
    <div className="rounded-2xl border-2 border-orange-500/40 bg-gradient-to-b from-orange-500/10 to-transparent p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black text-orange-700 dark:text-orange-300">{cls.name}</span>
        <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black">Lv.{character.level}</span>
      </div>

      <div className="flex justify-center py-2 text-4xl" aria-hidden>⚔️🛡️</div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {STAT_KEYS.map(key => {
          const base = character.stats[key];
          const bonus = effectiveStats[key] - base;
          return (
            <div key={key} className="rounded-lg bg-black/[0.03] dark:bg-white/[0.04] py-1 text-center">
              <p className="text-xs font-black tabular-nums text-neutral-800 dark:text-neutral-100">
                {STAT_ICON[key]} {base}{bonus > 0 && <span className="text-emerald-500"> (+{bonus})</span>}
              </p>
              <p className="text-[8px] font-bold text-neutral-400">{STAT_LABEL[key]}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-1.5">
        <div className="flex items-center justify-between text-[9px] font-bold text-neutral-400 mb-0.5">
          <span>XP</span><span className="tabular-nums">{character.xp}/{need}</span>
        </div>
        <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-violet-500" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[9px] font-bold text-neutral-400 mb-0.5">
          <span>HP</span><span className="tabular-nums">{hp}/{maxHp}</span>
        </div>
        <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-rose-500" style={{ width: `${hpPct}%` }} />
        </div>
      </div>
    </div>
  );
}
