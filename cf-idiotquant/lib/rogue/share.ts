import type { HeroOrigin } from "./origins";

export interface SharedRun {
    seed: number;
    origin: HeroOrigin;
}

const MAX_SEED = 0x7fffffff;
const ORIGINS = new Set<HeroOrigin>(["knight", "rogue", "alchemist", "scholar", "ranger"]);

/** 공유 링크는 새 판 하나만 가리킨다 — 저장된 진행·도감·상자는 싣지 않는다. */
export function sharedRun(search: string): SharedRun | null {
    const params = new URLSearchParams(search);
    const rawSeed = params.get("seed");
    const rawOrigin = params.get("origin");
    if (!rawSeed || !/^\d+$/.test(rawSeed) || !rawOrigin || !ORIGINS.has(rawOrigin as HeroOrigin)) return null;

    const seed = Number(rawSeed);
    if (!Number.isSafeInteger(seed) || seed > MAX_SEED) return null;
    return { seed, origin: rawOrigin as HeroOrigin };
}

/** 방 초대 같은 기존 쿼리는 싣지 않는다 — 이 링크의 뜻은 오직 새 던전 하나다. */
export function sharedRunUrl(href: string, run: SharedRun): string {
    const url = new URL(href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("seed", String(run.seed));
    url.searchParams.set("origin", run.origin);
    return url.toString();
}
