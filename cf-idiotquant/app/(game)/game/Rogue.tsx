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
 *
 * ── 배낭이 조작의 중심이다 ───────────────────────────────────────────────
 * 원작은 `w`(쥔다)·`W`(입는다)·`P`(낀다) 처럼 **행동마다 키가 따로**다. 키보드에서는
 * 그게 빠르지만, 폰에서 그 키들을 단추로 다 세우면 열 개가 넘고 그중 대부분이 늘
 * 잠겨 있다. 그래서 **물건을 먼저 고르고 할 일을 고른다** — 갑옷을 누르면 「입는다」가
 * 뜬다. 키는 원작 그대로 살아 있다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import {
    type BestiaryRow,
    type Command,
    type Sighting,
    bestiaryProgress,
    bestiaryRows,
    newGame,
    perform,
    score,
    survey,
} from "@/lib/rogue/game";
import { describe, isThrowable, itemPower } from "@/lib/rogue/items";
import { isDetail } from "@/lib/rogue/combat";
import { equippedArmor, equippedWeapon, heroAttackText, heroDefense, heroHitBonus, heroStr, hungerOf, hungerRate, wornRings } from "@/lib/rogue/hero";
import {
    bury,
    clear,
    graves,
    load,
    loadBestiary,
    save,
    saveBestiary,
    type Tomb,
} from "@/lib/rogue/storage";
import { T, idx, type GameState, type Item, type ItemKind } from "@/lib/rogue/types";

import Aim from "./components/Aim";
import MapView from "./components/MapView";
import Panel from "./components/Panel";
import TouchPad, { type PadAction } from "./components/TouchPad";

/** 무엇을 고르는 중인가 — 원작의 「어느 것을?」 자리. */
interface Picker {
    title: string;
    kinds: ItemKind[];
    make: (letter: string) => Command;
    empty: string;
    /** 이 물건이 고를 만한가 — 종류만으로 안 갈리는 경우(던지기). */
    allow?: (it: Item) => boolean;
}

/** 방향을 기다리는 중 — 지팡이·던지기. */
interface Aiming {
    title: string;
    what: string;
    make: (dx: number, dy: number) => Command;
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
    const [aiming, setAiming] = useState<Aiming | null>(null);
    const [sheet, setSheet] = useState<
        "none" | "pack" | "log" | "help" | "graves" | "survey" | "bestiary"
    >("none");
    /** 배낭에서 짚은 물건 — 그 아래에 할 수 있는 일이 뜬다. */
    const [chosen, setChosen] = useState<number | null>(null);
    const [tombs, setTombs] = useState<Tomb[]>([]);
    const buried = useRef(false);

    // 첫 그림은 서버에서 못 그린다 — 새 판이 난수로 만들어지므로 서버와 값이 어긋난다.
    useEffect(() => {
        const kept = loadBestiary();
        const saved = load();
        if (saved && saved.phase === "playing") {
            // 저장된 판과 저장소의 도감 중 **큰 쪽**을 남긴다. 판을 띄워 둔 채 다른
            // 탭에서 한 판을 더 돌았을 수 있고, 그때 잡은 것을 잃으면 안 된다.
            const merged = { ...saved.bestiary };
            for (const [ch, n] of Object.entries(kept)) {
                merged[ch] = Math.max(merged[ch] ?? 0, n);
            }
            saved.bestiary = merged;
            setState(saved);
            return;
        }
        setState(newGame(undefined, kept));
    }, []);

    useEffect(() => {
        if (!state) return;
        // 도감은 **판과 따로** 적는다 — 죽어서 판이 지워져도 남아야 한다.
        saveBestiary(state.bestiary);
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
        setChosen(null);
        // 새 판도 도감은 이어받는다 — 그것이 죽어도 남는 유일한 것이다.
        setState(newGame(undefined, loadBestiary()));
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
            P: { title: "무엇을 낄까", kinds: ["ring"], make: (letter) => ({ t: "putOn", letter }), empty: "반지가 없다." },
            R: { title: "무엇을 뺄까", kinds: ["ring"], make: (letter) => ({ t: "removeRing", letter }), empty: "낀 반지가 없다." },
            d: {
                title: "무엇을 내려놓을까",
                kinds: ["potion", "scroll", "food", "weapon", "armor", "ring", "wand", "amulet"],
                make: (letter) => ({ t: "drop", letter }),
                empty: "배낭이 비었다.",
            },
        }),
        [],
    );

    /** 지팡이·던지기는 물건을 고른 **뒤에** 방향을 묻는다. */
    const aimAfterPick = useCallback(
        (kind: "zap" | "throw") => {
            setSheet("none");
            setPicker({
                title: kind === "zap" ? "무슨 지팡이로" : "무엇을 던질까",
                kinds:
                    kind === "zap"
                        ? ["wand"]
                        : ["weapon", "potion"],
                allow: kind === "throw" ? isThrowable : undefined,
                empty: kind === "zap" ? "지팡이가 없다." : "던질 만한 것이 없다.",
                make: () => ({ t: "rest" }), // 쓰이지 않는다 — 아래에서 가로챈다
            });
            setAiming(null);
            pendingAim.current = kind;
        },
        [],
    );
    /** 물건을 고르면 방향 판으로 넘어가야 하는가. */
    const pendingAim = useRef<"zap" | "throw" | null>(null);

    const choosePicked = useCallback(
        (letter: string) => {
            const mode = pendingAim.current;
            if (mode) {
                pendingAim.current = null;
                setPicker(null);
                setAiming({
                    title: mode === "zap" ? "어디로 쏠까" : "어디로 던질까",
                    what: mode === "zap" ? "지팡이를 겨눕니다." : "겨눈 방향으로 날아갑니다.",
                    make: (dx, dy) => ({ t: mode, letter, dx, dy }),
                });
                return;
            }
            setPicker((p) => {
                if (p) run(p.make(letter));
                return null;
            });
        },
        [run],
    );

    // ── 키보드 ─────────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!state) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

            // 겨누는 중이면 방향키가 걷지 않고 겨눈다.
            if (aiming) {
                const d = KEY_DIRS[e.key];
                if (d) {
                    e.preventDefault();
                    run(aiming.make(d[0], d[1]));
                    setAiming(null);
                }
                return;
            }

            if (picker) {
                const it = state.hero.pack.find(
                    (p) =>
                        p.letter === e.key &&
                        picker.kinds.includes(p.kind) &&
                        (!picker.allow || picker.allow(p)),
                );
                if (it) {
                    e.preventDefault();
                    choosePicked(e.key);
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
                case "s":
                    e.preventDefault();
                    run({ t: "search" });
                    break;
                case "z":
                    e.preventDefault();
                    aimAfterPick("zap");
                    break;
                case "t":
                    e.preventDefault();
                    aimAfterPick("throw");
                    break;
                case "x":
                    e.preventDefault();
                    setSheet("survey");
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
    }, [state, picker, aiming, sheet, run, openPicker, aimAfterPick, choosePicked, PICKERS]);

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
    const rings = wornRings(hero);
    const has = (k: ItemKind) => hero.pack.some((p) => p.kind === k);
    // 조사와 도감이 읽는 것 — **화면이 세지 않는다.** 엔진이 낸 것을 늘어놓을 뿐이다.
    const sightings = survey(state);
    const progress = bestiaryProgress(state.bestiary);

    // **세 개씩 한 묶음**으로 늘어놓는다. 단추 판이 세 칸 격자라(`TouchPad`) 한 줄이
    // 곧 한 묶음이 된다 — 계단 둘이 나란히, 배낭에서 꺼내 쓰는 것들이 한 줄에.
    const actions: PadAction[] = [
        // 발밑
        { label: "내려간다", hint: ">", on: () => run({ t: "descend" }), off: onStairs ? undefined : "계단 위가 아니다" },
        {
            label: "올라간다",
            hint: "< — 1층 계단은 증표가 있어야 열린다",
            on: () => run({ t: "ascend" }),
            off: !onUpStairs
                ? "계단 위가 아니다"
                : level.depth === 1 && !hero.hasAmulet
                  ? "증표 없이는 못 나간다"
                  : undefined,
        },
        { label: "줍기", hint: ", 또는 g", on: () => run({ t: "pickup" }), off: hereItem ? undefined : "발밑에 아무것도 없다" },
        // 배낭에서 꺼내 쓰는 것들
        { label: "배낭", hint: "i — 쥐기·입기·끼기는 여기서", on: () => setSheet("pack") },
        { label: "마신다", hint: "q", on: () => openPicker(PICKERS.q), off: has("potion") ? undefined : "마실 것이 없다" },
        { label: "읽는다", hint: "r", on: () => openPicker(PICKERS.r), off: has("scroll") ? undefined : "읽을 것이 없다" },
        { label: "먹는다", hint: "e", on: () => openPicker(PICKERS.e), off: has("food") ? undefined : "먹을 것이 없다" },
        { label: "쏜다", hint: "z", on: () => aimAfterPick("zap"), off: has("wand") ? undefined : "지팡이가 없다" },
        {
            label: "던진다",
            hint: "t",
            on: () => aimAfterPick("throw"),
            off: hero.pack.some(isThrowable) ? undefined : "던질 만한 것이 없다",
        },
        // 살피는 것들
        { label: "뒤진다", hint: "s — 숨은 문과 함정", on: () => run({ t: "search" }) },
        {
            label: "조사",
            hint: "x — 잡아 본 적 있는 놈이면 속을 안다",
            on: () => setSheet("survey"),
            off: sightings.length ? undefined : "보이는 몬스터가 없다",
        },
        { label: "도감", hint: `${progress.found}/${progress.total}`, on: () => setSheet("bestiary") },
        // 판 바깥
        { label: "기록", hint: "m", on: () => setSheet("log") },
        {
            // 제일 좁은 폰(360px)의 칸에 들어가야 한다 — 「지난 판들」은 넘친다.
            label: "지난 판",
            hint: "여태 죽은 자리와 점수",
            on: () => {
                setTombs(graves());
                setSheet("graves");
            },
        },
        { label: "도움말", hint: "?", on: () => setSheet("help") },
    ];

    // 띠는 **일어난 일**만 보여 준다. 계산 줄(`· 명중 …`)까지 넣으면 두 줄이 산수로
    // 차서 정작 무슨 일이 났는지가 밀려난다. 계산은 기록 판이 전부 갖고 있다.
    const recent = state.messages.filter((m) => !isDetail(m)).slice(-2);
    const pickable = picker
        ? hero.pack.filter((p) => picker.kinds.includes(p.kind) && (!picker.allow || picker.allow(p)))
        : [];
    const hpLow = hero.hp <= hero.maxHp / 4;

    /** 이 물건으로 지금 할 수 있는 일 — **규칙이 아니라 목록**이다. 눌러도 규칙이 다시 본다. */
    const actionsFor = (it: Item): { label: string; on: () => void }[] => {
        const out: { label: string; on: () => void }[] = [];
        const worn =
            it.id === hero.weaponId ||
            it.id === hero.armorId ||
            it.id === hero.leftRingId ||
            it.id === hero.rightRingId;
        const go = (cmd: Command) => () => {
            run(cmd);
            setChosen(null);
        };
        switch (it.kind) {
            case "weapon":
                if (!worn) out.push({ label: "쥔다", on: go({ t: "wield", letter: it.letter! }) });
                break;
            case "armor":
                if (!worn) out.push({ label: "입는다", on: go({ t: "wear", letter: it.letter! }) });
                break;
            case "ring":
                if (worn) out.push({ label: "뺀다", on: go({ t: "removeRing", letter: it.letter! }) });
                else out.push({ label: "낀다", on: go({ t: "putOn", letter: it.letter! }) });
                break;
            case "potion":
                out.push({ label: "마신다", on: go({ t: "quaff", letter: it.letter! }) });
                break;
            case "scroll":
                out.push({ label: "읽는다", on: go({ t: "read", letter: it.letter! }) });
                break;
            case "food":
                out.push({ label: "먹는다", on: go({ t: "eat", letter: it.letter! }) });
                break;
            case "wand":
                out.push({
                    label: "쏜다",
                    on: () => {
                        setChosen(null);
                        setSheet("none");
                        setAiming({
                            title: "어디로 쏠까",
                            what: `${name(it)} 를 겨눕니다.`,
                            make: (dx, dy) => ({ t: "zap", letter: it.letter!, dx, dy }),
                        });
                    },
                });
                break;
        }
        if (isThrowable(it)) {
            out.push({
                label: "던진다",
                on: () => {
                    setChosen(null);
                    setSheet("none");
                    setAiming({
                        title: "어디로 던질까",
                        what: `${name(it)} 를 던집니다.`,
                        make: (dx, dy) => ({ t: "throw", letter: it.letter!, dx, dy }),
                    });
                },
            });
        }
        if (it.kind !== "amulet") out.push({ label: "내려놓는다", on: go({ t: "drop", letter: it.letter! }) });
        return out;
    };

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
                <span>힘 {heroStr(hero)}</span>
                {/* 방어는 있는데 공격이 없으면 무기를 바꿀 때 무엇이 나아지는지가 안 보인다. */}
                <span>공격 {heroAttackText(hero, state.known)}</span>
                <span>방어도 {heroDefense(hero)}</span>
                <span>경험 {hero.exp}</span>
                <span className="text-[#ffd24a]">금화 {hero.gold}</span>
                {rings.length > 0 && <span className="text-[#7fe0c8]">반지 {rings.length}</span>}
                {hero.confused > 0 && <span className="text-[#d987c4]">혼란</span>}
                {hero.blind > 0 && <span className="text-[#d987c4]">실명</span>}
                {hero.stuck > 0 && <span className="text-[#f2884b]">덫</span>}
                {hunger && <span className="text-[#f2884b]">{hunger}</span>}
                {hero.hasAmulet && <span className="text-[#ffe27a]">증표</span>}
            </div>

            <div className="shrink-0 border-t border-[#202927]">
                <TouchPad
                    onMove={(dx, dy) => {
                        if (aiming) {
                            if (dx === 0 && dy === 0) return;
                            run(aiming.make(dx, dy));
                            setAiming(null);
                            return;
                        }
                        run(dx === 0 && dy === 0 ? { t: "rest" } : { t: "move", dx, dy });
                    }}
                    actions={actions}
                />
            </div>

            {/* ── 덮는 판들 ───────────────────────────────────────────── */}
            {aiming && (
                <Aim
                    title={aiming.title}
                    what={aiming.what}
                    onPick={(dx, dy) => {
                        run(aiming.make(dx, dy));
                        setAiming(null);
                    }}
                    onCancel={() => setAiming(null)}
                />
            )}

            {picker && !aiming && (
                <Panel
                    title={picker.title}
                    onClose={() => {
                        pendingAim.current = null;
                        setPicker(null);
                    }}
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
                                        onClick={() => choosePicked(it.letter!)}
                                    >
                                        {/* 자리가 없으면 `?` — 「undefined) 식량」이 화면에 뜨면 안 된다. 되읽을 때
                                            `storage.fixLetters` 가 메우지만 끝내 못 메우는 경우가 남는다. */}
                                        {/* 위와 같다 — 화면에 `undefined` 를 내보내지 않는다. */}
                                            <span className="text-[#8a9a95]">{it.letter ?? "?"})</span> {name(it)}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {sheet === "pack" && !aiming && (
                <Panel
                    title={`배낭 (${hero.pack.length}/26)`}
                    onClose={() => {
                        setChosen(null);
                        setSheet("none");
                    }}
                    footer="물건을 누르면 할 수 있는 일이 뜹니다."
                >
                    {hero.pack.length === 0 ? (
                        <p className="text-[#7d8d88]">아무것도 없다.</p>
                    ) : (
                        <ul className="space-y-1">
                            {hero.pack.map((it) => {
                                const open = chosen === it.id;
                                const worn =
                                    it.id === hero.weaponId
                                        ? "쥐고 있다"
                                        : it.id === hero.armorId
                                          ? "입고 있다"
                                          : it.id === hero.leftRingId || it.id === hero.rightRingId
                                            ? "끼고 있다"
                                            : null;
                                return (
                                    <li key={it.id}>
                                        <button
                                            type="button"
                                            onClick={() => setChosen(open ? null : it.id)}
                                            className={`w-full rounded-[2px] px-1 text-left ${open ? "bg-[#1b2321]" : "hover:bg-[#161c1a]"}`}
                                        >
                                            <span className="text-[#8a9a95]">{it.letter ?? "?"})</span> {name(it)}
                                            {it.count > 1 && <span className="text-[#7d8d88]"> ×{it.count}</span>}
                                            {/* 고르는 자리에서 숫자가 보여야 고를 수 있다. **손질이 붙은
                                                값**을 적되(그래야 `+1` 이 더 좋아 보인다) 아직 정체를
                                                모르는 물건은 기본값만 — 화면이 속을 흘리면 안 된다. */}
                                            {(it.kind === "weapon" || it.kind === "armor") && (
                                                <span className="text-[#7d8d88]"> {itemPower(it, state.known)}</span>
                                            )}
                                            {worn && <span className="text-[#9fb0aa]"> ({worn})</span>}
                                        </button>
                                        {open && (
                                            <div className="my-1 flex flex-wrap gap-1 pl-5">
                                                {actionsFor(it).map((a) => (
                                                    <button
                                                        key={a.label}
                                                        type="button"
                                                        onClick={a.on}
                                                        className="rounded-[3px] border border-[#3a4a45] bg-[#161c1a] px-2 py-1 text-[#e6eeea] active:translate-y-px"
                                                    >
                                                        {a.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <div className="mt-3 space-y-0.5 border-t border-[#2a3532] pt-2 text-[#7d8d88]">
                        <div>
                            무기 {equippedWeapon(hero) ? name(equippedWeapon(hero)!) : "맨손"} · 갑옷{" "}
                            {equippedArmor(hero) ? name(equippedArmor(hero)!) : "맨몸"}
                        </div>
                        <div>
                            반지 {rings.length ? rings.map(name).join(" · ") : "없음"} · 한 걸음에 배고픔{" "}
                            {hungerRate(hero)}
                        </div>
                        {/* 물건마다 적힌 숫자는 **그 물건 몫**이고, 이 줄은 힘까지 더한 **지금의 나**다. */}
                        <div className="text-[#9fb0aa]">
                            지금 공격 {heroAttackText(hero, state.known)} · 명중 +{heroHitBonus(hero)} · 방어도{" "}
                            {heroDefense(hero)}
                        </div>
                    </div>
                </Panel>
            )}

            {sheet === "survey" && !aiming && (
                <Panel
                    title="조사"
                    onClose={() => setSheet("none")}
                    footer="한 마리를 잡아 보면 그 종의 속을 알게 됩니다. 조사는 턴을 쓰지 않습니다."
                >
                    {sightings.length === 0 ? (
                        <p className="text-[#7d8d88]">보이는 것이 없다.</p>
                    ) : (
                        <ul className="space-y-2">
                            {sightings.map((m: Sighting) => (
                                <li key={m.id} className="border-b border-[#1b2321] pb-2 last:border-0">
                                    <div>
                                        <span className="text-[#f2884b]">{m.ch}</span>{" "}
                                        <span className="text-[#e6eeea]">{m.name}</span>
                                        <span className="text-[#7d8d88]">
                                            {" "}· {m.distance}칸 · {m.awake ? "쫓고 있다" : "아직 못 봤다"} ·{" "}
                                        </span>
                                        <span className={m.condition === "성하다" ? "text-[#9fb0aa]" : "text-[#ff6b5a]"}>
                                            {m.condition}
                                        </span>
                                    </div>
                                    {m.known ? (
                                        <div className="text-[#9fb0aa]">
                                            레벨 {m.level} · 방어도 {m.defense} · 피해 {m.damage?.join(" + ") || "없음"} ·
                                            경험 {m.exp} · 체력 {m.hp}
                                            {m.mean && <span className="text-[#f2884b]"> · 보자마자 달려든다</span>}
                                            <span className="text-[#7d8d88]"> (여태 {m.kills}마리)</span>
                                        </div>
                                    ) : (
                                        <div className="text-[#7d8d88]">
                                            처음 보는 놈이다 — 한 마리를 잡아야 속을 안다.
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {sheet === "bestiary" && !aiming && (
                <Panel
                    title={`도감 ${progress.found}/${progress.total}`}
                    onClose={() => setSheet("none")}
                    footer="도감은 죽어도 남습니다. 물약의 색은 그 판의 것이지만, 오크가 얼마나 단단한지는 세상의 사실입니다."
                >
                    {progress.found === 0 ? (
                        <p className="text-[#7d8d88]">아직 아무것도 못 잡았다.</p>
                    ) : (
                        <ul className="space-y-1">
                            {bestiaryRows(state.bestiary).map((r: BestiaryRow) => (
                                <li key={r.ch}>
                                    <span className="text-[#f2884b]">{r.ch}</span>{" "}
                                    <span className="text-[#e6eeea]">{r.name}</span>
                                    <span className="text-[#ffd24a]"> ×{r.kills}</span>
                                    <div className="text-[#9fb0aa]">
                                        레벨 {r.level} · 방어도 {r.defense} · 피해 {r.damage.join(" + ") || "없음"} ·
                                        경험 {r.exp} · 체력 {r.hp}
                                        {r.mean && <span className="text-[#f2884b]"> · 보자마자 달려든다</span>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {/*
              * 기록은 **최신이 맨 위**다. 판을 열면 방금 일어난 일이 손 닿는 자리에
              * 있어야 한다 — 아래로 굴려 내려가서 찾을 일이 아니다.
              * 위쪽 두 줄 띠는 그대로 시간순이다(그쪽은 「방금」만 보여 주므로).
              */}
            {sheet === "log" && (
                <Panel title="지나온 기록" onClose={() => setSheet("none")}>
                    <ul className="space-y-0.5">
                        {state.messages
                            .slice(-80)
                            .reverse()
                            .map((m, i) => (
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
                        <dt className="text-[#8a9a95]">s</dt><dd>벽을 뒤진다 — 숨은 문과 함정이 드러난다</dd>
                        <dt className="text-[#8a9a95]">&gt; &lt;</dt><dd>계단을 내려간다 · 올라간다</dd>
                        <dt className="text-[#8a9a95]">q r e</dt><dd>마신다 · 읽는다 · 먹는다</dd>
                        <dt className="text-[#8a9a95]">w W</dt><dd><b>쥔다 · 입는다</b></dd>
                        <dt className="text-[#8a9a95]">P R</dt><dd>반지를 낀다 · 뺀다</dd>
                        <dt className="text-[#8a9a95]">z t</dt><dd>지팡이를 쏜다 · 던진다 (고른 뒤 방향)</dd>
                        <dt className="text-[#8a9a95]">d</dt><dd>내려놓는다</dd>
                        <dt className="text-[#8a9a95]">x</dt><dd><b>조사</b> — 보이는 몬스터의 속을 본다 (턴을 안 씁니다)</dd>
                        <dt className="text-[#8a9a95]">i m ?</dt><dd>배낭 · 기록 · 이 화면</dd>
                    </dl>
                    <div className="mt-3 space-y-1 border-t border-[#2a3532] pt-2 text-[#9fb0aa]">
                        <p className="text-[#e6eeea]">
                            갑옷을 입으려면 <b>배낭</b>을 열고 갑옷을 누른 뒤 <b>「입는다」</b>를 누릅니다.
                            키보드로는 <b>W</b>.
                        </p>
                        <p><span className="text-white">@</span> 나 · <span className="text-[#f2884b]">A–Z</span> 몬스터 · <span className="text-[#ffd24a]">*</span> 금화 · <span className="text-[#d987c4]">!</span> 물약 · <span className="text-[#cfe3f5]">?</span> 주문서</p>
                        <p><span className="text-[#c3ced6]">)</span> 무기 · <span className="text-[#8fb6cf]">]</span> 갑옷 · <span className="text-[#7fe0c8]">=</span> 반지 · <span className="text-[#b6a2e8]">/</span> 지팡이 · <span className="text-[#cfa878]">%</span> 식량</p>
                        <p><span className="text-[#ff6b5a]">^</span> 함정 · <span className="text-[#f0f0f0]">&gt;</span> 아래 계단 · <span className="text-[#f0f0f0]">&lt;</span> 위 계단 · <span className="text-[#c08a45]">+</span> 문</p>
                        <p className="pt-1 text-[#7d8d88]">
                            <b className="text-[#9fb0aa]">싸움은 D&amp;D 의 주사위 규칙을 씁니다.</b>{" "}
                            <span className="text-[#9fb0aa]">d20 + 숙련 + 힘 + 무기</span>가 상대의{" "}
                            <span className="text-[#9fb0aa]">방어도</span> 이상이면 맞습니다 — <b>막는 쪽은
                            굴리지 않습니다.</b> <b>20</b> 은 무조건 맞고 <b>피해 주사위를 두 번</b> 굴리며,
                            <b>1</b> 은 무조건 빗나갑니다. 자는 놈을 치면 <b>유리</b>(두 번 굴려 높은 쪽),
                            눈이 멀거나 헷갈리면 <b>불리</b>입니다. 굴린 값은 모두 <b>기록</b>에 남습니다.
                        </p>
                        <p className="text-[#7d8d88]">
                            숨은 문은 벽과 똑같이 보입니다. 막힌 것 같으면 <b>뒤져</b> 보십시오.
                            반지는 끼고 있으면 배가 더 고픕니다.
                        </p>
                        <p className="text-[#7d8d88]">
                            <b className="text-[#9fb0aa]">한 종을 한 마리라도 잡으면</b> 그 뒤로는 조사해서
                            레벨·방어·피해를 볼 수 있습니다. 이 도감은 <b className="text-[#9fb0aa]">죽어도
                            남습니다</b> — 물약의 색은 판마다 섞이지만 오크가 얼마나 단단한지는 세상의 사실입니다.
                        </p>
                        <p className="text-[#7d8d88]">
                            <b className="text-[#9fb0aa]">위 계단으로 언제든 물러설 수 있습니다.</b> 지나온
                            층은 떠난 그대로 남아 있으니, 두고 온 물건을 가지러 돌아가도 됩니다.
                        </p>
                        <p className="text-[#7d8d88]">
                            지하 26층에 옌더의 증표가 있습니다. <b className="text-[#9fb0aa]">1층의 계단은
                            증표가 있어야 열립니다</b> — 그것을 쥐고 밖으로 나오면 이깁니다.
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

            {state.phase !== "playing" && sheet === "none" && !picker && !aiming && (
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
