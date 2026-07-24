"use client";

// 가치투자 덱빌더 — 캐릭터(레벨/경험치/힘·민첩·행운·체력) localStorage 연동 훅. 던전 런과 무관하게
// 계정에 영구 저장(이번 런에서 주운 스탯 아이템은 별개로 useGameRun의 패시브 합산에서만 적용됨).

import { useCallback, useEffect, useState } from "react";
import { newCharacter, grantXp } from "./characterEngine";
import type { CharacterState } from "./gameTypes";

const CHAR_KEY = "iq:game:character:v1";

export function useCharacter() {
  const [character, setCharacter] = useState<CharacterState>(() => newCharacter());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAR_KEY);
      if (raw) setCharacter(c => ({ ...c, ...JSON.parse(raw) }));
    } catch { /* 저장값이 손상됐으면 기본값 그대로 사용 */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return; // 마운트 시 기본값으로 실제 저장값을 덮어쓰지 않기 위한 가드
    try { localStorage.setItem(CHAR_KEY, JSON.stringify(character)); } catch { /* 저장 실패는 무시 */ }
  }, [character, loaded]);

  const gainXp = useCallback((amount: number) => setCharacter(c => grantXp(c, amount)), []);

  return { character, characterLoaded: loaded, gainXp };
}
