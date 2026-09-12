"use client";

/**
 * Rogue — 화면.
 *
 * **규칙은 여기 없다.** `lib/rogue/game.ts` 의 `perform(state, cmd)` 하나가 판을 바꾸고
 * 이 파일은 명령을 만들어 보내고 돌아온 것을 그린다. 「계단 위인가」 같은 판단을 여기
 * 적기 시작하면 규칙이 두 벌이 되고, 어느 날 한쪽만 바뀐다 — 예전 게임이 무너진 자리다.
 *
 * 단추가 잠기는 이유만은 화면이 안다(`stairsHere` 따위). 그것도 **판단이 아니라 값을
 * 읽는 것**이라 규칙이 두 벌이 되지 않는다. 눌러도 규칙이 한 번 더 막는다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { type Command, newGame, perform, score } from "@/lib/rogue/game";
import { describe } from "@/lib/rogue/items";
import { equippedArmor, equippedWeapon, heroArmor, hungerOf } from "@/lib/rogue/hero";
import { bury, clear, graves, load, save, type Tomb } from "@/lib/rogue/storage";
import { T, idx, type GameState, type Item, type ItemKind } from "@/lib/rogue/types";

import MapView from "./components/MapView";
import Panel from "./components/Panel";
import TouchPad, { type PadAction } from "./components/TouchPad";

/** 무엇을 고르는 중인가. */
interface Picker {
    title: string;
    kinds: ItemKind[];
    make: (letter: string) => Command;
    empty: string;
}

const KEY_DIRS: Record<string, [number, number]> = {
    h: [-1, 0], ArrowLeft: [-1, 0],
    l: [1, 0], ArrowRight: [1, 0],
    k: [0, -1], ArrowUp: [0, -1],
    j: [0, 1], ArrowDown: [0, 1],
    y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
};

export default function Rogue() {
    const [state, setState] = useState<GameState | null>(null);
    const [picker, setPicker] = useState<Picker | null>(null);
    const [sheet, setSheet] = useState<"none" | "pack" | "log" | "help" | "graves">("none");
    const [tombs, setTombs] = useState<Tomb[]>([]);
    /** 끝난 판을 한 번만 묻는다. */
    const buried = useRef(false);

    // 첫 그림은 서버에서 못 그린다 — 새 판이 난수로 만들어지므로 서버와 값이 어긋난다.
    useEffect(() => {
        const saved = load();
        setState(saved && saved.phase === "playing" ? saved : newGame());
    }, []);

    useEffect(() => {
        if (!state) return;
        if (state.phase === "playing") {
            save(state);
            buried.current = false;
            return;
        }
        if (!buried.current) {
            buried.current = true;
            bury(state);
            clear();
        }
    }, [state]);

    const run = useCallback((cmd: Command) => {
        setState((s) => (s ? perform(s, cmd) : s));
    }, []);

    const restart = useCallback(() => {
        clear();
        buried.current = false;
        setSheet("none");
        setState(newGame());
    }, []);

    const openPicker = useCallback((p: Picker) => {
        setSheet("none");
        setPicker(p);
    }, []);

    const PICKERS: Record<string, Picker> = useMemo(
        () => ({
            q: { title: "무엇을 마실까", kinds: ["potion"], make: (letter) => ({ t: "quaff", letter }), empty: "마실 것이 없다." },
            r: { title: "무엇을 읽을까", kinds: ["scroll"], make: (letter) => ({ t: "read", letter }), empty: "읽을 것이 없다." },
            e: { title: "무엇을 먹을까", kinds: ["food"], make: (letter) => ({ t: "eat", letter }), empty: "먹을 것이 없다." },
            w: { title: "무엇을 쥘까", kinds: ["weapon"], make: (letter) => ({ t: "wield", letter }), empty: "쥘 것이 없다." },
            W: { title: "무엇을 입을까", kinds: ["armor"], make: (letter) => ({ t: "wear", letter }), empty: "입을 것이 없다." },
            d: {
                title: "무엇을 내려놓을까",
                kinds: ["potion", "scroll", "food", "weapon", "armor", "amulet"],
                make: (letter) => ({ t: "drop", letter }),
                empty: "배낭이 비었다.",
            },
        }),
        [],
    );

    // ── 키보드 ─────────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!state) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

            if (picker) {
                const it = state.hero.pack.find(
                    (p) => p.letter === e.key && picker.kinds.includes(p.kind),
                );
                if (it) {
                    e.preventDefault();
                    run(picker.make(e.key));
                    setPicker(null);
                }
                return;
            }
            if (sheet !== "none") return;

            const dir = KEY_DIRS[e.key];
            if (dir) {
                e.preventDefault();
                run({ t: "move", dx: dir[0], dy: dir[1] });
                return;
            }
            switch (e.key) {
                case ".":
                case "5":
                    e.preventDefault();
                    run({ t: "rest" });
                    break;
                case ">":
                    e.preventDefault();
                    run({ t: "descend" });
                    break;
                case "<":
                    e.preventDefault();
                    run({ t: "ascend" });
                    break;
                case ",":
                case "g":
                    e.preventDefault();
                    run({ t: "pickup" });
                    break;
                case "i":
                    e.preventDefault();
                    setSheet("pack");
                    break;
                case "m":
                    e.preventDefault();
                    setSheet("log");
                    break;
                case "?":
                    e.preventDefault();
                    setSheet("help");
                    break;
                default: {
                    const p = PICKERS[e.key];
                    if (p) {
                        e.preventDefault();
                        openPicker(p);
                    }
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [state, picker, sheet, run, openPicker, PICKERS]);

    if (!state) {
        return (
            <div className="grid h-full w-full place-items-center bg-[#0b0c0c]">
                <span className="font-[family-name:var(--font-plex-mono)] text-[12px] tracking-[0.14em] text-[#5f706b]">
                    던전을 파는 중…
                </span>
            </div>
        );
    }

    const { hero, level } = state;
    const onStairs = level.tiles[idx(hero.x, hero.y)] === T.STAIRS;
    const onUpStairs = !!level.upStairs && level.upStairs.x === hero.x && level.upStairs.y === hero.y;
    const hereItem = level.items.find((i) => i.x === hero.x && i.y === hero.y);
    const hunger = hungerOf(hero);
    const name = (it: Item) => describe(it, state.known, state.appearance);

    const actions: PadAction[] = [
        { label: "줍기", hint: ", 또는 g", on: () => run({ t: "pickup" }), off: hereItem ? undefined : "발밑에 아무것도 없다" },
        { label: "내려간다", hint: ">", on: () => run({ t: "descend" }), off: onStairs ? undefined : "계단 위가 아니다" },
        {
            label: "올라간다",
            hint: "<",
            on: () => run({ t: "ascend" }),
            off: !onUpStairs ? "계단 위가 아니다" : !hero.hasAmulet ? "증표가 없다" : undefined,
        },
        { label: "마신다", hint: "q", on: () => openPicker(PICKERS.q), off: hero.pack.some((p) => p.kind === "potion") ? undefined : "마실 것이 없다" },
        { label: "읽는다", hint: "r", on: () => openPicker(PICKERS.r), off: hero.pack.some((p) => p.kind === "scroll") ? undefined : "읽을 것이 없다" },
        { label: "먹는다", hint: "e", on: () => openPicker(PICKERS.e), off: hero.pack.some((p) => p.kind === "food") ? undefined : "먹을 것이 없다" },
        { label: "배낭", hint: "i", on: () => setSheet("pack") },
        { label: "기록", hint: "m", on: () => setSheet("log") },
        { label: "도움말", hint: "?", on: () => setSheet("help") },
    ];

    const recent = state.messages.slice(-2);
    const pickable = picker ? hero.pack.filter((p) => picker.kinds.includes(p.kind)) : [];
    const hpLow = hero.hp <= hero.maxHp / 4;

    return (
        <div className="relative flex h-full w-full flex-col bg-[#0b0c0c] text-[#c3ced6]">
            {/* 맨 위 두 줄 — 원작의 메시지 줄이다. 높이를 고정해 둔다: 줄 수가 들쭉날쭉하면
                지도가 매 턴 위아래로 흔들린다. */}
            <div className="h-[2.9em] shrink-0 overflow-hidden px-2 pt-1 font-[family-name:var(--font-plex-mono)] text-[12px] leading-[1.45] text-[#dfe8e4] sm:text-[13px]">
                {recent.map((m, i) => (
                    <div key={`${state.turn}-${i}`} className="truncate">
                        {m}
                    </div>
                ))}
            </div>

            <div className="min-h-0 flex-1">
                <MapView state={state} />
            </div>

            {/* 상태 줄 — 원작의 맨 아랫줄.
                **한 줄로 묶어 둔다.** 접히게 두면 좁은 폰에서 「금화」가 둘째 줄로 내려가
                그만큼 지도가 줄고, 값이 하나 늘 때마다 지도의 높이가 달라진다. 넘치면
                옆으로 민다 — 세로는 지도의 것이다. */}
            <div className="flex shrink-0 gap-x-3 overflow-x-auto whitespace-nowrap border-t border-[#202927] px-2 py-1 font-[family-name:var(--font-plex-mono)] text-[12px] text-[#9fb0aa] [scrollbar-width:none] sm:text-[13px]">
                <span>지하 {level.depth}층</span>
                <span>Lv {hero.level}</span>
                <span className={hpLow ? "text-[#ff6b5a]" : undefined}>
                    체력 {hero.hp}/{hero.maxHp}
                </span>
                <span>힘 {hero.str}</span>
                <span>방어 {heroArmor(hero)}</span>
                <span>경험 {hero.exp}</span>
                <span className="text-[#ffd24a]">금화 {hero.gold}</span>
                {hunger && <span className="text-[#f2884b]">{hunger}</span>}
                {hero.hasAmulet && <span className="text-[#ffe27a]">증표</span>}
            </div>

            <div className="shrink-0 border-t border-[#202927]">
                <TouchPad onMove={(dx, dy) => run(dx === 0 && dy === 0 ? { t: "rest" } : { t: "move", dx, dy })} actions={actions} />
            </div>

            {/* ── 덮는 판들 ───────────────────────────────────────────── */}
            {picker && (
                <Panel
                    title={picker.title}
                    onClose={() => setPicker(null)}
                    footer="글자를 누르거나 줄을 눌러 고릅니다."
                >
                    {pickable.length === 0 ? (
                        <p className="text-[#7d8d88]">{picker.empty}</p>
                    ) : (
                        <ul className="space-y-1">
                            {pickable.map((it) => (
                                <li key={it.id}>
                                    <button
                                        type="button"
                                        className="w-full rounded-[2px] px-1 text-left hover:bg-[#1b2321]"
                                        onClick={() => {
                                            run(picker.make(it.letter!));
                                            setPicker(null);
                                        }}
                                    >
                                        <span className="text-[#8a9a95]">{it.letter})</span> {name(it)}
                                        {it.count > 1 && <span className="text-[#7d8d88]"> ×{it.count}</span>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {sheet === "pack" && (
                <Panel title={`배낭 (${hero.pack.length}/26)`} onClose={() => setSheet("none")}>
                    {hero.pack.length === 0 ? (
                        <p className="text-[#7d8d88]">아무것도 없다.</p>
                    ) : (
                        <ul className="space-y-1">
                            {hero.pack.map((it) => (
                                <li key={it.id}>
                                    <span className="text-[#8a9a95]">{it.letter})</span> {name(it)}
                                    {it.count > 1 && <span className="text-[#7d8d88]"> ×{it.count}</span>}
                                    {it.id === hero.weaponId && <span className="text-[#9fb0aa]"> (쥐고 있다)</span>}
                                    {it.id === hero.armorId && <span className="text-[#9fb0aa]"> (입고 있다)</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-3 border-t border-[#2a3532] pt-2 text-[#7d8d88]">
                        무기 {equippedWeapon(hero) ? name(equippedWeapon(hero)!) : "맨손"} · 갑옷{" "}
                        {equippedArmor(hero) ? name(equippedArmor(hero)!) : "맨몸"}
                    </div>
                </Panel>
            )}

            {sheet === "log" && (
                <Panel title="지나온 기록" onClose={() => setSheet("none")}>
                    <ul className="space-y-0.5">
                        {state.messages.slice(-80).map((m, i) => (
                            <li key={i} className="text-[#9fb0aa]">
                                {m}
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}

            {sheet === "help" && (
                <Panel title="조작" onClose={() => setSheet("none")} footer="죽으면 그것으로 끝입니다. 저장은 자동이고, 되돌리기는 없습니다.">
                    <dl className="grid grid-cols-[7.5em_1fr] gap-y-1">
                        <dt className="text-[#8a9a95]">h j k l</dt><dd>왼 아래 위 오른쪽 (방향키도 됩니다)</dd>
                        <dt className="text-[#8a9a95]">y u b n</dt><dd>대각선 넷</dd>
                        <dt className="text-[#8a9a95]">.</dt><dd>제자리에서 쉰다</dd>
                        <dt className="text-[#8a9a95]">, 또는 g</dt><dd>발밑의 것을 줍는다</dd>
                        <dt className="text-[#8a9a95]">&gt; &lt;</dt><dd>계단을 내려간다 · 올라간다</dd>
                        <dt className="text-[#8a9a95]">q r e</dt><dd>마신다 · 읽는다 · 먹는다</dd>
                        <dt className="text-[#8a9a95]">w W d</dt><dd>쥔다 · 입는다 · 내려놓는다</dd>
                        <dt className="text-[#8a9a95]">i m ?</dt><dd>배낭 · 기록 · 이 화면</dd>
                    </dl>
                    <div className="mt-3 space-y-1 border-t border-[#2a3532] pt-2 text-[#9fb0aa]">
                        <p><span className="text-white">@</span> 나 · <span className="text-[#f2884b]">A–Z</span> 몬스터 · <span className="text-[#ffd24a]">*</span> 금화 · <span className="text-[#d987c4]">!</span> 물약 · <span className="text-[#cfe3f5]">?</span> 주문서</p>
                        <p><span className="text-[#c3ced6]">)</span> 무기 · <span className="text-[#8fb6cf]">]</span> 갑옷 · <span className="text-[#cfa878]">%</span> 식량 · <span className="text-[#f0f0f0]">&gt;</span> 아래 계단 · <span className="text-[#f0f0f0]">&lt;</span> 위 계단</p>
                        <p className="pt-1 text-[#7d8d88]">
                            지하 26층에 옌더의 증표가 있습니다. 그것을 쥐어야 위로 올라갈 수 있고,
                            1층의 계단으로 나오면 이깁니다.
                        </p>
                    </div>
                </Panel>
            )}

            {sheet === "graves" && (
                <Panel title="지난 판들" onClose={() => setSheet("none")}>
                    {tombs.length === 0 ? (
                        <p className="text-[#7d8d88]">아직 없다.</p>
                    ) : (
                        <ul className="space-y-1">
                            {tombs.map((t, i) => (
                                <li key={i} className={t.won ? "text-[#ffe27a]" : "text-[#9fb0aa]"}>
                                    {t.won ? "★" : "†"} 지하 {t.depth}층 · 금화 {t.gold} · {t.turns}턴 — {t.epitaph}
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {state.phase !== "playing" && sheet === "none" && !picker && (
                <Panel
                    title={state.phase === "won" ? "살아 돌아왔다" : "여기 잠들다"}
                    footer={
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={restart}
                                className="rounded-[2px] border border-[#3a4a45] px-3 py-1 text-[#e6eeea] hover:bg-[#1b2321]"
                            >
                                새 판
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTombs(graves());
                                    setSheet("graves");
                                }}
                                className="rounded-[2px] border border-[#2a3532] px-3 py-1 hover:bg-[#1b2321]"
                            >
                                지난 판들
                            </button>
                            <Link href="/game/imf" className="text-[#7d8d88] underline underline-offset-2">
                                옛 게임(IMF)
                            </Link>
                        </div>
                    }
                >
                    <p className="mb-2 text-[#e6eeea]">{state.epitaph}</p>
                    <dl className="grid grid-cols-[7em_1fr] gap-y-1 text-[#9fb0aa]">
                        <dt>가장 깊이</dt><dd>지하 {state.deepest}층</dd>
                        <dt>레벨</dt><dd>{hero.level}</dd>
                        <dt>버틴 턴</dt><dd>{state.turn}</dd>
                        <dt>점수</dt><dd className="text-[#ffd24a]">{score(state)}</dd>
                    </dl>
                </Panel>
            )}
        </div>
    );
}
