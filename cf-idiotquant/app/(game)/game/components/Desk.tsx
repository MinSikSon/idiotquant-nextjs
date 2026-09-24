"use client";

/**
 * 한 사람의 책상 — **배낭 · 고르기 · 겨누기.**
 *
 * 한 화면 둘이서 할 때 두 사람이 **따로** 연다. 한쪽이 배낭을 뒤지는 동안 다른 쪽은 걷는다.
 * 그래서 이 판들의 상태(무엇을 고르는 중인가, 어디를 겨누는 중인가)는 판(`GameState`)이
 * 아니라 **사람마다 하나씩** 이 컴포넌트 안에 산다. 혼자 할 때는 하나만 서서 예전과 같다.
 *
 * 둘이서 할 때는 글자 키가 이동이 되므로 고르는 줄을 **그 사람의 방향 키로 옮기고 행동 키로
 * 고른다**(`padKey`). 혼자 할 때는 원작처럼 글자로 고른다(`soloKey`).
 */

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";

import { type Command, enchantScrollKind, scrollTargetKinds } from "@/lib/rogue/game";
import {
    CHEST_SLOTS,
    canHoldEnchant,
    ENCHANT_MAX,
    MELT_RETURN,
    describe,
    equipmentRating,
    enchantOdds,
    enchantOf,
    enchantSafeMax,
    isStashable,
    isThrowable,
    itemChar,
    itemPower,
    meltMax,
    meltYield,
    needsBow,
    WAND_RECHARGE,
} from "@/lib/rogue/items";
import { canOffHand, equippedArmor, equippedWeapon, isDualWielding } from "@/lib/rogue/hero";
import type { GameState, Item, ItemKind } from "@/lib/rogue/types";

import Aim from "./Aim";
import Panel from "./Panel";

/** 무엇을 고르는 중인가 — 원작의 「어느 것을?」 자리. */
export interface Picker {
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

const CURSOR = "outline outline-1 outline-[var(--rg-strong)]";

export type DeskMode = "none" | "pack" | "picker" | "aim";

/** 부모(`Rogue`)가 키보드와 단추 판에서 부르는 문. */
export interface DeskHandle {
    togglePack(): void;
    craftBlessing(): void;
    /** 원작의 한 글자 명령(`q r e w W P R d`) — 없는 키면 `false`. */
    openPicker(key: string): boolean;
    aim(kind: "zap" | "throw"): void;
    /** 겨누는 중이면 그 방향으로 쏘고 `true`. */
    aimAt(dx: number, dy: number): boolean;
    /** 혼자 할 때의 키 — 판이 떠 있으면 먹고 `true`(아래로 안 흘린다). */
    soloKey(key: string, dir?: [number, number]): boolean;
    /** 둘이서 할 때의 키 — 방향은 줄을 옮기고, 행동은 고르고, 배낭 키는 열고 닫는다. */
    padKey(input: { dir?: [number, number]; act?: boolean; pack?: boolean; cancel?: boolean }): void;
}

export default function Desk({
    ref,
    state,
    w,
    run,
    side,
    label,
    accent,
    closeKey,
    onMode,
}: {
    ref?: Ref<DeskHandle>;
    state: GameState;
    /** 누구의 책상인가 — `heroes` 의 칸 번호. */
    w: number;
    /** 이 사람의 명령으로 보낸다(`who` 는 부르는 쪽이 싣는다). */
    run: (cmd: Command) => void;
    /** 둘이서면 화면의 반쪽에 뜬다. 없으면 예전처럼 한가운데. */
    side?: "left" | "right";
    /** 판 제목 앞에 붙는 이름 — 둘이서면 누구의 판인지 적는다. */
    label?: string;
    /** 그 사람의 색 — 둘이서면 판 테두리와 제목에 칠한다. */
    accent?: string;
    /** 둘이서면 그 사람의 취소 키 — Esc 대신 닫기 단추에 적는다. */
    closeKey?: string;
    onMode: (w: number, mode: DeskMode) => void;
}) {
    const hero = state.heroes[w] ?? state.heroes[0];
    const who = label ? `${label} · ` : "";
    const [picker, setPicker] = useState<Picker | null>(null);
    const [aiming, setAiming] = useState<Aiming | null>(null);
    const [packOpen, setPackOpen] = useState(false);
    /** 배낭에서 짚은 물건 — 그 아래에 할 수 있는 일이 뜬다. */
    const [chosen, setChosen] = useState<number | null>(null);
    /** 둘이서 할 때 키로 옮기는 줄 · 그 줄에서 고른 할 일. */
    const [cursor, setCursor] = useState(0);
    const [actCursor, setActCursor] = useState(0);

    const mode: DeskMode = aiming ? "aim" : picker ? "picker" : packOpen ? "pack" : "none";
    useEffect(() => {
        onMode(w, mode);
        setCursor(0);
        setActCursor(0);
    }, [w, mode, onMode]);

    const openPicker = useCallback((p: Picker) => {
        setPackOpen(false);
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
            setPackOpen(false);
            setPicker({
                title: kind === "zap" ? "무슨 지팡이로" : "무엇을 던질까",
                kinds:
                    kind === "zap"
                        ? ["wand"]
                        : ["weapon", "potion"],
                allow: kind === "throw" ? (it) => isThrowable(it) && (!needsBow(it) || equippedWeapon(hero)?.type === "short bow") : undefined,
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

    /** 강화 주문서를 읽었으면 **무엇에 걸지**를 한 번 더 묻는다 — 그 주문서의 자리. */
    const pendingEnchant = useRef<string | null>(null);
    /** 축복의 기름은 마시는 대신 장비 하나에 바른다. */
    const pendingBlessing = useRef<string | null>(null);
    const pendingCraft = useRef<string | null>(null);
    /**
     * 그 주문서가 강화냐 축복이냐 재련이냐 — 줄마다 적을 것이 갈린다.
     *
     * **재련을 `null` 로 두지 않는다.** 그러면 「고르기가 안 열린 상태」와 같은 값이 되어
     * 화면이 두 가지를 못 가리고, 재련 줄이 강화 줄과 **똑같이 생긴 채** 뜬다 — 강화인 줄
     * 알고 눌러서 무기 종류가 바뀌는 사고가 거기서 난다.
     */
    const pendingEnchantStyle = useRef<"plain" | "blessed" | "transmute" | "recharge" | null>(null);

    /**
     * 주문서 하나를 읽는다 — **강화나 재련이면 고를 것을 한 번 더 묻는다.**
     *
     * 「무엇을 읽을까」 고르기에서도, 배낭 줄의 「읽는다」에서도 여기로 온다. 두 길이
     * 갈리면 한쪽만 고치는 날이 오고, 실제로 배낭 쪽은 대상 없이 `read` 를 던져서
     * **아무 일도 안 나는** 자리가 됐었다.
     *
     * 대상이 필요한지는 **엔진에 묻는다**(`scrollTargetKinds`) — 판단이 아니라 값 읽기다.
     */
    const readScroll = useCallback(
        (letter: string) => {
            const targetKinds = scrollTargetKinds(state, letter, w);
            if (!targetKinds) {
                run({ t: "read", letter });
                return;
            }
            // **강화냐 재련이냐는 엔진이 답한다**(`enchantScrollKind`). 대상 종류의 개수로
            // 가르면 축복(무기·갑옷)이 재련(무기·갑옷·반지)과 같은 칸에 떨어져서, 상한에
            // 닿은 물건이 고르는 목록에 그대로 뜬다.
            const style = enchantScrollKind(state, letter, w) ?? (targetKinds[0] === "wand" ? "recharge" : "transmute");
            pendingEnchant.current = letter;
            pendingEnchantStyle.current = style;
            const wantSingle = targetKinds.length === 1 ? targetKinds[0] : null;
            setPicker({
                title: style === "transmute"
                    ? "무엇을 재련할까 — 다른 종류로 바뀐다"
                    : style === "recharge"
                    ? `어느 지팡이에 ${WAND_RECHARGE}회를 더할까`
                    : style === "blessed"
                    ? "무엇에 축복을 걸까"
                    : wantSingle === "weapon"
                    ? "무엇을 강화할까"
                    : "무슨 갑옷을 강화할까",
                kinds: targetKinds,
                // **상한에 닿은 것은 안 보여 준다** (재련은 제한 없음)
                // **겹쳐 쌓이는 것도 안 보여 준다** — 한 장이 열 자루를 올리고, 모루는
                // 한 자루씩 녹이므로 거기서 주문서가 불어났다(`canHoldEnchant`).
                // 재련은 그대로 둔다: 표창 열 자루가 **한 자루**의 딴 무기가 되므로
                // 불어나지 않는다. 눌러도 엔진이 한 번 더 막는다 — 자물쇠는 둘이다.
                allow: (p) =>
                    style === "transmute" || style === "recharge" || (canHoldEnchant(p) && enchantOf(p) < ENCHANT_MAX),
                empty: style === "transmute"
                    ? "재련할 장비(무기·갑옷·반지)가 없다."
                    : style === "recharge"
                    ? "충전할 지팡이가 없다."
                    : style === "blessed"
                    ? "축복을 걸 무기나 갑옷이 없다."
                    : wantSingle === "weapon"
                    ? "강화할 무기가 없다."
                    : "강화할 갑옷이 없다.",
                make: () => ({ t: "rest" }), // 쓰이지 않는다 — `choosePicked` 가 가로챈다
            });
        },
        [run, state, w],
    );

    const quaffPotion = useCallback(
        (letter: string) => {
            const potion = state.heroes[w]?.pack.find((it) => it.letter === letter);
            if (potion?.type !== "blessing") {
                run({ t: "quaff", letter });
                return;
            }
            pendingBlessing.current = letter;
            setPicker({
                title: "무엇에 축복을 입힐까",
                kinds: ["weapon", "armor"],
                allow: (it) => canHoldEnchant(it) && enchantOf(it) < ENCHANT_MAX && !it.blessed,
                empty: "축복을 입힐 무기나 갑옷이 없다.",
                make: () => ({ t: "rest" }),
            });
        },
        [run, state.heroes, w],
    );

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
            // 두 번째 고르기 — 강화할 물건을 짚었다.
            const scroll = pendingEnchant.current;
            if (scroll) {
                pendingEnchant.current = null;
                pendingEnchantStyle.current = null;
                setPicker(null);
                run({ t: "read", letter: scroll, target: letter });
                return;
            }
            const blessing = pendingBlessing.current;
            if (blessing) {
                pendingBlessing.current = null;
                setPicker(null);
                run({ t: "quaff", letter: blessing, target: letter });
                return;
            }
            const ingredient = pendingCraft.current;
            if (ingredient !== null) {
                if (!ingredient) {
                    pendingCraft.current = letter;
                    setPicker({
                        title: "두 번째 재료 포션을 고르세요",
                        kinds: ["potion"],
                        allow: (it) => it.type !== "blessing" && (it.letter !== letter || it.count >= 2),
                        empty: "두 번째 재료로 쓸 포션이 없다.",
                        make: () => ({ t: "rest" }),
                    });
                    return;
                }
                pendingCraft.current = null;
                setPicker(null);
                run({ t: "classSkill", ingredients: [ingredient, letter] });
                return;
            }
            // 주문서를 짚었으면 **강화인지 아닌지**를 `readScroll` 이 엔진에 묻는다.
            if (picker?.kinds.length === 1 && picker.kinds[0] === "scroll") {
                setPicker(null);
                readScroll(letter);
                return;
            }
            if (picker?.kinds.length === 1 && picker.kinds[0] === "potion") {
                setPicker(null);
                quaffPotion(letter);
                return;
            }
            // **명령은 갱신 함수 밖에서 보낸다.** 갱신 함수는 그리는 도중에 돌아서, 그 안에서
            // 부모의 상태를 건드리면 React 가 「그리는 중에 다른 컴포넌트를 고친다」고 막는다.
            if (picker) run(picker.make(letter));
            setPicker(null);
        },
        [picker, quaffPotion, readScroll, run],
    );

    const name = (it: Item) => describe(it, state.known, state.appearance);
    const craftBlessing = useCallback(() => {
        setPackOpen(false);
        pendingCraft.current = "";
        setPicker({
            title: "첫 번째 재료 포션을 고르세요",
            kinds: ["potion"],
            allow: (it) => it.type !== "blessing",
            empty: "재료로 쓸 포션이 없다.",
            make: () => ({ t: "rest" }),
        });
    }, []);
    /** 새 장비의 물건 몫만 지금 장비와 비교한다 — 힘·직업 같은 영웅 값은 여기서 다시 계산하지 않는다. */
    const comparedPower = (it: Item): "better" | "worse" | null => {
        const current = it.kind === "weapon" ? equippedWeapon(hero) : it.kind === "armor" ? equippedArmor(hero) : undefined;
        if (!current || current.id === it.id) return null;
        const difference = (equipmentRating(it) ?? 0) - (equipmentRating(current) ?? 0);
        return difference > 0 ? "better" : difference < 0 ? "worse" : null;
    };
    const { level } = state;
    /** 모루 위인가 — 여기서만 배낭 줄에 「녹인다」가 뜬다. */
    const onAnvil = !!level.anvil && level.anvil.x === hero.x && level.anvil.y === hero.y;
    const pickable = picker
        ? hero.pack.filter((p) => picker.kinds.includes(p.kind) && (!picker.allow || picker.allow(p)))
        : [];
    /**
     * 지금 고르는 것이 **강화할 대상**인가 — 그러면 줄마다 거는 값을 적는다.
     * 재련이면 `null` 이다(재련은 수치를 올리는 것이 아니라 종류를 바꾸는 것이라 적을 값이 없다).
     */
    const enchantStyle = picker && pendingEnchant.current ? pendingEnchantStyle.current : null;

    // 분류 제목만 끼우고, 각 분류 안에서는 배낭의 기존 순서를 그대로 둔다.
    const packGroups: { kind: ItemKind; label: string; items: { item: Item; index: number }[] }[] = [
        { kind: "weapon", label: "무기", items: [] },
        { kind: "armor", label: "갑옷", items: [] },
        { kind: "ring", label: "반지", items: [] },
        { kind: "potion", label: "물약", items: [] },
        { kind: "scroll", label: "주문서", items: [] },
        { kind: "wand", label: "지팡이", items: [] },
        { kind: "food", label: "식량", items: [] },
        { kind: "gem", label: "보석", items: [] },
        { kind: "relic", label: "유물", items: [] },
        { kind: "gold", label: "금화", items: [] },
        { kind: "amulet", label: "증표", items: [] },
    ];
    for (const [index, item] of hero.pack.entries()) {
        packGroups.find((group) => group.kind === item.kind)?.items.push({ item, index });
    }

    /**
     * 고르는 줄의 「→ +N (…)」 — **값은 전부 엔진의 표에서 온다**(`enchantOdds`·`enchantSafeMax`).
     *
     * 확률을 감추면 이건 판단이 아니라 그냥 동전 던지기다. 내 물건의 값이라 가릴 까닭도 없다.
     * 축복은 안전 구간 안에서 **범위**를 적는다 — 한 번에 `1~3` 칸이 오르기 때문이고,
     * 천장 위에서는 굴림이 일반과 같아서 같은 줄을 적는다.
     */
    const enchantHint = (it: Item, style: "plain" | "blessed" | "transmute" | "recharge") => {
        if (style === "recharge") {
            return <span className="text-[var(--rg-ring)]"> → 사용 횟수 +{WAND_RECHARGE}</span>;
        }
        // **재련은 숫자가 아니라 종류를 바꾼다.** 줄에 아무것도 안 적으면 강화 창과 똑같이
        // 생겨서, 강화인 줄 알고 눌렀다가 무기가 딴 것이 된다.
        if (style === "transmute") {
            // 조사까지 같이 적는다 — 「갑옷로」가 화면에 뜨면 안 된다.
            const what = it.kind === "weapon" ? "무기로" : it.kind === "armor" ? "갑옷으로" : "반지로";
            return <span className="text-[var(--rg-trap)]"> → 다른 {what} 바뀐다</span>;
        }
        const plus = enchantOf(it);
        const safeMax = enchantSafeMax(it.kind);
        if (style === "blessed" && plus < safeMax) {
            const lo = Math.min(plus + 1, safeMax);
            const hi = Math.min(plus + 3, safeMax);
            return (
                <span className="text-[var(--rg-muted)]">
                    {" "}→ +{lo}
                    {hi > lo ? `~+${hi}` : ""} <span className="text-[var(--rg-ring)]">(안전)</span>
                </span>
            );
        }
        const odds = enchantOdds(plus, it.kind);
        return (
            <span className="text-[var(--rg-muted)]">
                {" "}→ +{plus + 1}{" "}
                <span
                    className={
                        odds >= 1
                            ? "text-[var(--rg-ring)]"
                            : odds < 0.4
                              ? "text-[var(--rg-trap)]"
                              : "text-[var(--rg-gold)]"
                    }
                >
                    ({Math.round(odds * 100)}%{odds >= 1 ? " 안전" : ""})
                </span>
            </span>
        );
    };

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
        /**
         * 모루 줄 — **무기에도 갑옷에도 붙는다.**
         *
         * 나올 것이 없으면(화살 한 대 같은 것) 눌러도 아무 일이 안 나므로 아예 안 세운다:
         * 눌러도 안 되는 줄은 고장처럼 읽힌다.
         *
         * **「최대」라고 적는다.** 강화 칸은 확률로 돌아오므로(`MELT_RETURN`) 장수를
         * 단언하면 화면이 거짓말을 한다 — 이 게임에서 화면이 적는 확률과 엔진이 굴리는
         * 확률은 같은 자리(`items`)에서 온다.
         */
        const meltRow = () => {
            if (!onAnvil) return;
            if (it.kind === "wand") {
                out.push({ label: `녹인다 (충전 주문서 1장 · +${WAND_RECHARGE}회)`, on: go({ t: "melt", letter: it.letter! }) });
                return;
            }
            const { sure, risky } = meltYield(it);
            if (sure + risky <= 0) return;
            const odds = Math.round(MELT_RETURN * 100);
            // **손질 정도를 모르는 물건은 장수도 모른다.** 나올 장수가 곧 `+N` 이라
            // (`meltYield`), 여기 숫자를 적으면 **쥐어 보지도 않고 강화 수치를 읽는** 뒷문이
            // 된다 — 「써 봐야 안다」가 모루 앞에서만 무너진다.
            const label = !it.plusKnown
                ? "녹인다 (나올 장수는 녹여 봐야)"
                : risky > 0
                  ? `녹인다 (최대 ${meltMax(it)}장 · 강화분 ${odds}%)`
                  : `녹인다 (주문서 ${meltMax(it)}장)`;
            out.push({ label, on: go({ t: "melt", letter: it.letter! }) });
        };

        /**
         * 「맡긴다」 — **캠프에서만, 자리가 남았을 때만.**
         *
         * 눌러도 안 되는 줄은 고장처럼 읽히므로 상자가 꽉 찼으면 아예 안 세운다.
         * 증표를 거르는 것은 `isStashable` 한 자리다 — 엔진이 한 번 더 막는다.
         */
        const stashRow = () => {
            if (!onAnvil || !isStashable(it) || hero.chest.length >= CHEST_SLOTS) return;
            out.push({
                label: `맡긴다 (${hero.chest.length}/${CHEST_SLOTS})`,
                on: go({ t: "stash", letter: it.letter! }),
            });
        };

        switch (it.kind) {
            case "weapon":
                if (!worn) out.push({ label: "쥔다", on: go({ t: "wield", letter: it.letter! }) });
                // 이도류 — **값 읽기지 규칙이 아니다**(`canOffHand`). 눌러도 엔진이 한 번 더 본다.
                if (hero.offWeaponId === it.id) {
                    out.push({ label: "보조손에서 내린다", on: go({ t: "offHand", letter: it.letter! }) });
                } else if (canOffHand(hero, it)) {
                    out.push({ label: "보조손에 쥔다", on: go({ t: "offHand", letter: it.letter! }) });
                }
                if (onAnvil && !it.socketGem && hero.pack.some((p) => p.kind === "gem")) {
                    out.push({
                        label: "보석 세공 (모루)",
                        on: () => {
                            const gearLetter = it.letter!;
                            setChosen(null);
                            setPackOpen(false);
                            setPicker({
                                title: "어느 보석을 세공할까",
                                kinds: ["gem"],
                                empty: "세공할 보석이 없다.",
                                make: (gemLetter) => ({ t: "socket", gearLetter, gemLetter }),
                            });
                        },
                    });
                }
                meltRow();
                break;
            case "armor":
                if (!worn) out.push({ label: "입는다", on: go({ t: "wear", letter: it.letter! }) });
                if (onAnvil && !it.socketGem && hero.pack.some((p) => p.kind === "gem")) {
                    out.push({
                        label: "보석 세공 (모루)",
                        on: () => {
                            const gearLetter = it.letter!;
                            setChosen(null);
                            setPackOpen(false);
                            setPicker({
                                title: "어느 보석을 세공할까",
                                kinds: ["gem"],
                                empty: "세공할 보석이 없다.",
                                make: (gemLetter) => ({ t: "socket", gearLetter, gemLetter }),
                            });
                        },
                    });
                }
                meltRow();
                break;
            case "ring":
                if (worn) out.push({ label: "뺀다", on: go({ t: "removeRing", letter: it.letter! }) });
                else out.push({ label: "낀다", on: go({ t: "putOn", letter: it.letter! }) });
                break;
            case "relic":
                if (it.type === "time_hourglass") {
                    if (it.relicCooldown && it.relicCooldown > 0) {
                        out.push({
                            label: `모래시계 쿨다운 (${it.relicCooldown}턴)`,
                            on: () => {},
                        });
                    } else {
                        out.push({
                            label: "시간 정지 (3턴)",
                            on: go({ t: "use_relic", letter: it.letter! }),
                        });
                    }
                }
                break;
            case "gem":
                if (onAnvil) {
                    out.push({
                        label: "보석 세공 (장비 장착)",
                        on: () => {
                            const gemLetter = it.letter!;
                            setChosen(null);
                            setPackOpen(false);
                            setPicker({
                                title: "어느 장비에 세공할까",
                                kinds: ["weapon", "armor"],
                                allow: (p) => !p.socketGem,
                                empty: "소켓이 비어있는 장비가 없다.",
                                make: (gearLetter) => ({ t: "socket", gearLetter, gemLetter }),
                            });
                        },
                    });
                }
                break;
            case "potion":
                out.push({ label: "마신다", on: () => quaffPotion(it.letter!) });
                break;
            case "scroll":
                // **배낭에서 읽어도 같은 길로 보낸다.** 강화 주문서는 고를 것을 한 번 더
                // 묻는데, 여기서 `read` 를 곧장 던지면 대상이 없어 **아무 일도 안 난다** —
                // 화면은 멀쩡하고 주문서만 그대로 남아서 고장처럼 읽힌다.
                out.push({
                    label: "읽는다",
                    on: () => {
                        setChosen(null);
                        setPackOpen(false);
                        readScroll(it.letter!);
                    },
                });
                break;
            case "food":
                out.push({ label: "먹는다", on: go({ t: "eat", letter: it.letter! }) });
                break;
            case "wand":
                out.push({
                    label: "쏜다",
                    on: () => {
                        setChosen(null);
                        setPackOpen(false);
                        setAiming({
                            title: "어디로 쏠까",
                            what: `${name(it)} 를 겨눕니다.`,
                            make: (dx, dy) => ({ t: "zap", letter: it.letter!, dx, dy }),
                        });
                    },
                });
                meltRow();
                break;
        }
        if (isThrowable(it) && (!needsBow(it) || equippedWeapon(hero)?.type === "short bow")) {
            out.push({
                label: "던진다",
                on: () => {
                    setChosen(null);
                    setPackOpen(false);
                    setAiming({
                        title: "어디로 던질까",
                        what: `${name(it)} 를 던집니다.`,
                        make: (dx, dy) => ({ t: "throw", letter: it.letter!, dx, dy }),
                    });
                },
            });
        }
        // **곁에 선 동료에게 건넨다** — 바닥에 놓고 줍는 두 턴을 없앤다. 곁에 없으면 안 세운다:
        // 눌러도 안 되는 줄은 고장처럼 읽힌다(엔진이 한 번 더 막는다 — 자물쇠는 둘이다).
        const mate = state.heroes.find((h) => h !== hero && h.hp > 0);
        if (mate && Math.max(Math.abs(mate.x - hero.x), Math.abs(mate.y - hero.y)) <= 1) {
            out.push({ label: "건넨다", on: go({ t: "give", letter: it.letter! }) });
        }
        // **맡기는 것은 종류를 안 가린다** — 그래서 갈래 문 뒤가 아니라 여기 선다.
        stashRow();
        if (it.kind !== "amulet") out.push({ label: "내려놓는다", on: go({ t: "drop", letter: it.letter! }) });
        return out;
    };


    const closePicker = () => {
        pendingAim.current = null;
        pendingEnchant.current = null;
        pendingEnchantStyle.current = null;
        setPicker(null);
    };
    const clampTo = (n: number, len: number) => Math.max(0, Math.min(len - 1, n));

    const handle: DeskHandle = {
        togglePack() {
            setChosen(null);
            if (picker || aiming) {
                closePicker();
                setAiming(null);
                return;
            }
            setPackOpen((o) => !o);
        },
        craftBlessing,
        openPicker(key) {
            const p = PICKERS[key];
            if (p) openPicker(p);
            return !!p;
        },
        aim: aimAfterPick,
        aimAt(dx, dy) {
            if (!aiming) return false;
            if (dx !== 0 || dy !== 0) {
                run(aiming.make(dx, dy));
                setAiming(null);
            }
            return true;
        },
        soloKey(key, dir) {
            if (aiming) {
                if (dir) {
                    run(aiming.make(dir[0], dir[1]));
                    setAiming(null);
                }
                return true;
            }
            if (picker) {
                if (pickable.some((p) => p.letter === key)) choosePicked(key);
                return true;
            }
            if (packOpen) {
                // **배낭에서도 원작처럼 글자로 고른다** — 줄을 눌러야만 열리면 키보드 쪽이 반 토막이다.
                const picked = hero.pack.find((p) => p.letter === key);
                if (picked) {
                    setChosen(picked.id);
                    setActCursor(0);
                    return true;
                }
                const row = hero.pack.find((p) => p.id === chosen);
                if (row) {
                    const acts = actionsFor(row);
                    // 짚은 줄의 할 일은 **숫자**로 — 그 자리에 번호가 적혀 있다.
                    const n = Number(key);
                    if (n >= 1 && n <= acts.length) acts[n - 1].on();
                    else if (key === "Enter") acts[actCursor]?.on();
                    else if (dir?.[0]) setActCursor((c) => clampTo(c + dir[0], acts.length));
                    else if (dir?.[1]) {
                        // 위아래는 줄을 옮긴다 — 짚은 줄이 따라간다.
                        const at = clampTo(hero.pack.indexOf(row) + dir[1], hero.pack.length);
                        setChosen(hero.pack[at]?.id ?? null);
                        setActCursor(0);
                    }
                } else if (dir?.[1]) {
                    setChosen(hero.pack[dir[1] > 0 ? 0 : hero.pack.length - 1]?.id ?? null);
                }
                return true;
            }
            return false;
        },
        padKey({ dir, act, pack, cancel }) {
            if (pack) return handle.togglePack();
            if (cancel) {
                // 한 단계만 물린다 — 배낭에서 짚은 줄이 있으면 그것부터 푼다.
                if (aiming) setAiming(null);
                else if (picker) closePicker();
                else if (chosen !== null) setChosen(null);
                else setPackOpen(false);
                return;
            }
            if (aiming) {
                if (dir) handle.aimAt(dir[0], dir[1]);
                return;
            }
            if (picker) {
                if (dir) setCursor((c) => clampTo(c + dir[1], pickable.length));
                else if (act && pickable[cursor]) choosePicked(pickable[cursor].letter!);
                return;
            }
            if (!packOpen) return;
            const row = hero.pack[clampTo(cursor, hero.pack.length)];
            if (dir && dir[1]) {
                setCursor((c) => clampTo(c + dir[1], hero.pack.length));
                setActCursor(0);
            } else if (dir && dir[0] && row && chosen === row.id) {
                setActCursor((c) => clampTo(c + dir[0], actionsFor(row).length));
            } else if (act && row) {
                if (chosen !== row.id) {
                    setChosen(row.id);
                    setActCursor(0);
                } else {
                    actionsFor(row)[actCursor]?.on();
                }
            }
        },
    };
    useImperativeHandle(ref, () => handle);

    return (
        <>
            {aiming && (
                <Aim
                    side={side}
                    accent={accent}
                    closeKey={closeKey}
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
                    side={side}
                    accent={accent}
                    closeKey={closeKey}
                    title={who + picker.title}
                    onClose={() => {
                        pendingAim.current = null;
                        pendingEnchant.current = null;
                        pendingEnchantStyle.current = null;
                        setPicker(null);
                    }}
                    footer={
                        // 안전 구간 숫자도 **엔진의 표에서** 읽는다 — 여기 적어 두면 표를 고친 날
                        // 화면만 옛말을 하게 된다.
                        enchantStyle === "transmute"
                            ? "고른 장비가 같은 분류의 다른 종류로 바뀝니다 — 강화 수치는 따라갑니다."
                            : enchantStyle === "recharge"
                              ? `고른 지팡이의 사용 횟수가 ${WAND_RECHARGE}회 늘어납니다.`
                            : enchantStyle === "blessed"
                              ? `안전 구간 안에서 한 번에 1~3 칸 오르고 천장에서 멈춥니다. 그 위로는 보통 주문서와 같습니다.`
                              : enchantStyle
                                ? `실패하면 그 물건은 부서집니다. 무기는 +${enchantSafeMax("weapon")}, 갑옷은 +${enchantSafeMax("armor")} 까지 안전합니다.`
                                : "글자를 누르거나 줄을 눌러 고릅니다."
                    }
                >
                    {pickable.length === 0 ? (
                        <p className="text-[var(--rg-faint)]">{picker.empty}</p>
                    ) : (
                        <ul className="space-y-1">
                            {pickable.map((it, i) => (
                                <li key={it.id}>
                                    <button
                                        type="button"
                                        className={`w-full rounded-[2px] px-1 text-left hover:bg-[var(--rg-raised)] ${side && cursor === i ? CURSOR : ""}`}
                                        onClick={() => choosePicked(it.letter!)}
                                    >
                                        {/* 자리가 없으면 `?` — 「undefined) 식량」이 화면에 뜨면 안 된다. 되읽을 때
                                            `storage.fixLetters` 가 메우지만 끝내 못 메우는 경우가 남는다. */}
                                        {/* 위와 같다 — 화면에 `undefined` 를 내보내지 않는다. */}
                                            <span className="text-[var(--rg-label)]">{it.letter ?? "?"})</span> {name(it)}
                                        {/* **거는 값을 숫자로 보여 준다** — `enchantHint` 한 자리에서. */}
                                        {enchantStyle && enchantHint(it, enchantStyle)}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {packOpen && !picker && !aiming && (
                <Panel
                    side={side}
                    accent={accent}
                    closeKey={closeKey}
                    title={`${who}배낭 (${hero.pack.length}/26)`}
                    onClose={() => {
                        setChosen(null);
                        setPackOpen(false);
                    }}
                    footer={
                        side
                            ? "방향 키로 줄을 옮기고 확인으로 고릅니다."
                            : "물건을 누르거나 그 앞의 글자를 누르면 할 수 있는 일이 뜹니다. 그 일은 앞에 적힌 숫자로 합니다."
                    }
                >
                    {hero.pack.length === 0 ? (
                        <p className="text-[var(--rg-faint)]">아무것도 없다.</p>
                    ) : (
                        <ul className="space-y-1">
                            {packGroups.filter((group) => group.items.length > 0).map((group) => (
                                <li key={group.kind} className="list-none pt-1 first:pt-0">
                                    <div className="border-b border-[var(--rg-line-soft)] pb-0.5 text-[var(--rg-label)]">{group.label}</div>
                                    <ul className="space-y-1 pt-1">
                                    {group.items.map(({ item: it, index: i }) => {
                                const open = chosen === it.id;
                                const worn =
                                    it.id === hero.weaponId
                                        ? "쥐고 있다"
                                        // **보조손도 적는다** — 안 적으면 배낭에서 그냥 놀고 있는 한 자루로 읽힌다.
                                        : it.id === hero.offWeaponId
                                        ? "보조손에 쥐고 있다"
                                        : it.id === hero.armorId
                                          ? "입고 있다"
                                          : it.id === hero.leftRingId || it.id === hero.rightRingId
                                            ? "끼고 있다"
                                            : null;
                                const dualWield = isDualWielding(hero) && (it.id === hero.weaponId || it.id === hero.offWeaponId);
                                const equipped = worn !== null;
                                const comparison = comparedPower(it);
                                const equippedInk = dualWield ? "text-[var(--rg-weapon)]" : "text-[var(--rg-gold)]";
                                const nameInk = equipped ? equippedInk : comparison === "better" ? "font-bold text-[var(--rg-weapon)]" : undefined;
                                return (
                                    <li key={it.id}>
                                        <button
                                            type="button"
                                            onClick={() => setChosen(open ? null : it.id)}
                                            className={`w-full rounded-[2px] px-1 text-left ${dualWield ? "border border-[var(--rg-weapon)] bg-[var(--rg-hover)]" : equipped ? "border border-[var(--rg-gold)] bg-[var(--rg-hover)]" : open ? "bg-[var(--rg-raised)]" : "hover:bg-[var(--rg-hover)]"} ${side && cursor === i ? CURSOR : ""}`}
                                        >
                                            <span className="text-[var(--rg-label)]">{it.letter ?? "?"})</span>{" "}
                                            {/* **종류 표식** — 지도에서 그 물건을 그리는 글자와 색을 그대로 쓴다
                                                (`itemChar`·`--rg-${kind}`). 줄이 길어지면 이름만으로는 무기인지
                                                갑옷인지 한눈에 안 갈린다. */}
                                            <span className="font-bold" style={{ color: `var(--rg-${it.kind})` }}>
                                                {itemChar(it.kind)}
                                            </span>{" "}
                                            <span className={nameInk}>{name(it)}</span>
                                            {it.count > 1 && <span className="text-[var(--rg-faint)]"> ×{it.count}</span>}
                                            {/* 고르는 자리에서 숫자가 보여야 고를 수 있다. **손질이 붙은
                                                값**을 적되(그래야 `+1` 이 더 좋아 보인다) 아직 정체를
                                                모르는 물건은 기본값만 — 화면이 속을 흘리면 안 된다. */}
                                            {(it.kind === "weapon" || it.kind === "armor") && (
                                                <span className={comparison === "better" ? "text-[var(--rg-weapon)]" : comparison === "worse" ? "text-[var(--rg-trap)]" : "text-[var(--rg-faint)]"}>
                                                    {" "}{itemPower(it, state.known)}
                                                </span>
                                            )}
                                            {worn && <span className={equippedInk}> ({worn})</span>}
                                            {dualWield && <span className="font-bold text-[var(--rg-weapon)]"> · 이도류 장착</span>}
                                        </button>
                                        {open && (
                                            <div className="my-1 flex flex-wrap gap-1 pl-5">
                                                {actionsFor(it).map((a, j) => (
                                                    <button
                                                        key={a.label}
                                                        type="button"
                                                        onClick={a.on}
                                                        className={`rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-hover)] px-2 py-1 text-[var(--rg-strong)] active:translate-y-px ${side && cursor === i && actCursor === j ? CURSOR : ""}`}
                                                    >
                                                        {/* 숫자는 **혼자 할 때의 단축키**다. 둘이서는 방향 키로 고른다. */}
                                                        {!side && <span className="text-[var(--rg-label)]">{j + 1} </span>}
                                                        {a.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                );
                                    })}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    )}
                    {/* ── 캠프 상자 — **모루 칸에 섰을 때만 열린다.**
                        배낭과 한 판에 둔다: 맡기는 것도 꺼내는 것도 배낭을 보면서 하는 일이라,
                        판을 따로 세우면 두 판을 오가며 칸을 세게 된다. 캠프 밖에서는 통째로
                        접는다 — 열 수 없는 줄이 늘 떠 있으면 그것도 고장처럼 읽힌다. */}
                    {onAnvil && (
                        <div className="mt-3 border-t border-[var(--rg-line-soft)] pt-2">
                            <div className="text-[var(--rg-label)]">
                                캠프 상자 ({hero.chest.length}/{CHEST_SLOTS})
                            </div>
                            {hero.chest.length === 0 ? (
                                <p className="text-[var(--rg-faint)]">비어 있다 — 맡긴 것은 다음 판까지 남는다.</p>
                            ) : (
                                <ul className="mt-1 space-y-1">
                                    {hero.chest.map((it, i) => (
                                        <li key={it.id} className="flex flex-wrap items-center gap-1">
                                            {/* 자리는 칸 번호가 진다 — 배낭의 글자는 꺼낼 때 새로 받는다. */}
                                            <span className="text-[var(--rg-label)]">{i + 1}.</span> {name(it)}
                                            {it.count > 1 && <span className="text-[var(--rg-faint)]">×{it.count}</span>}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // 꺼내면 배낭 줄이 하나 늘어난다 — 짚고 있던 줄은 푼다.
                                                    setChosen(null);
                                                    run({ t: "unstash", slot: i });
                                                }}
                                                className="rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-hover)] px-2 py-0.5 text-[var(--rg-strong)] active:translate-y-px"
                                            >
                                                꺼낸다
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                </Panel>
            )}

        </>
    );
}
