import type { GameState, Hero } from "./types";

/** 시야·벽과 무관하게 주변 다섯 칸(대각선 포함)의 살아 있는 오크를 감지한다. */
export const STING_ORC_RADIUS = 5;

export function updateStingGlow(state: GameState, notify?: (hero: Hero, glowing: boolean) => void): void {
    for (const hero of state.heroes) {
        const stings = hero.pack.filter((it) => it.kind === "weapon" && it.type === "sting");
        if (!stings.length) continue;
        const glowing = hero.hp > 0 && state.level.monsters.some((m) =>
            m.hp > 0 && m.def.ch === "O" && Math.max(Math.abs(m.x - hero.x), Math.abs(m.y - hero.y)) <= STING_ORC_RADIUS);
        const changed = stings.some((it) => !!it.stingGlowing !== glowing);
        for (const it of stings) it.stingGlowing = glowing;
        if (changed) notify?.(hero, glowing);
    }
}
