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

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";

import {
    type BestiaryRow,
    type Command,
    type Sighting,
    bestiaryProgress,
    bestiaryRows,
    enchantTarget,
    joinGame,
    leaveGame,
    newGame,
    perform,
    score,
    standing,
    survey,
    tombScore,
} from "@/lib/rogue/game";
import {
    ARMORS,
    ENCHANT_MAX,
    MELT_RETURN,
    POTIONS,
    RINGS,
    SCROLLS,
    WANDS,
    WEAPONS,
    defenseOf,
    isThrowable,
    itemChar,
    itemDepthRange,
    makeItem,
} from "@/lib/rogue/items";
import {
    type CodexCategory,
    type CodexEntry,
    CODEX_ENTRIES,
    itemCodexProgress,
    itemCodexStage,
    itemCodexStats,
} from "@/lib/rogue/codexData";
import { isDetail } from "@/lib/rogue/combat";
import { heroArmor, heroStr, hungerOf, wornRings } from "@/lib/rogue/hero";
import {
    bury,
    clear,
    graves,
    load,
    loadBestiary,
    loadItemCodex,
    loadItemUsage,
    loadSpecials,
    deserialize,
    save,
    saveBestiary,
    saveItemCodex,
    saveItemUsage,
    saveSpecials,
    serialize,
    type Tomb,
    type TombHero,
    type TombItem,
} from "@/lib/rogue/storage";
import { T, idx, type GameState, type ItemKind } from "@/lib/rogue/types";
import { ORIGINS, ORIGIN_LIST, type HeroOrigin } from "@/lib/rogue/origins";

import Desk, { type DeskHandle, type DeskMode } from "./components/Desk";
import MapView, { PARTY_BG, PARTY_INK, type CellFlash } from "./components/MapView";
import Panel from "./components/Panel";
import TouchPad, { HOLD_DELAY, HOLD_STEP, type PadAction } from "./components/TouchPad";
import { monsterArt } from "./monsterArt";

const FLOOR_EVENT_BANNER: Record<string, { title: string; desc: string; icon: string }> = {
    fog: {
        title: "짙은 안개",
        desc: "한 치 앞도 보이지 않아 시야가 2칸으로 극도로 좁아집니다.",
        icon: "🌫️",
    },
    frenzy: {
        title: "광기의 둥지",
        desc: "몬스터들이 흥분 상태에 빠져 신속하게 움직입니다!",
        icon: "⚡",
    },
    vault: {
        title: "고대 보물창고",
        desc: "어딘가에 막대한 금화와 진귀한 보석들이 숨겨져 있습니다.",
        icon: "💰",
    },
    armory_floor: {
        title: "버려진 무기고",
        desc: "오래된 모루와 다양한 장비들이 널브러져 있습니다.",
        icon: "⚔️",
    },
};

const KEY_DIRS: Record<string, [number, number]> = {
    h: [-1, 0], ArrowLeft: [-1, 0],
    l: [1, 0], ArrowRight: [1, 0],
    k: [0, -1], ArrowUp: [0, -1],
    j: [0, 1], ArrowDown: [0, 1],
    y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
};

/**
 * 한 화면 협동의 키 — **사람마다 3×3 한 덩이 · 배낭 하나**뿐이다.
 *
 * 덩이의 테두리 여덟이 방향이고 **가운데가 확인**이다(`QWE/ASD/ZXC` 의 `S`,
 * `UIO/JKL/M,.` 의 `K`). 걸을 때는 행동, 배낭·고르기에서는 고르기다.
 *
 * 행동 키는 발밑을 읽어 할 일을 고른다: 물건이 있으면 줍고, 계단이면 내려가고, 아니면
 * 뒤진다(한 턴 쉬는 셈). 마시기·읽기 같은 나머지는 **자기 배낭**을 열어서 한다.
 * 키는 `e.code`(자판 자리)로 읽는다 — 한글 입력 상태에서도 같다.
 */
const COOP_KEYS: { dirs: Record<string, [number, number]>; act: string[]; pack: string[]; cancel: string[] }[] = [
    // 방장 — 왼손
    {
        dirs: {
            KeyW: [0, -1], KeyA: [-1, 0], KeyX: [0, 1], KeyD: [1, 0],
            KeyQ: [-1, -1], KeyE: [1, -1], KeyZ: [-1, 1], KeyC: [1, 1],
        },
        // Space 는 안 쓴다 — 맥북에서는 두 사람 엄지가 다 닿는 한가운데다.
        act: ["KeyS"],
        pack: ["Tab", "KeyR"],
        // **닫기는 사람마다 따로다** — Esc 는 하나라 둘의 판을 한꺼번에 닫는다.
        cancel: ["KeyF"],
    },
    // 동료 — 오른손. 방장의 거울이다: UIO/JKL/M,. = QWE/ASD/ZXC, P = R.
    // (오른쪽 Shift 는 안 쓴다 — `?` 를 누르려다 배낭이 열린다.)
    {
        dirs: {
            KeyI: [0, -1], KeyJ: [-1, 0], Comma: [0, 1], KeyL: [1, 0],
            KeyU: [-1, -1], KeyO: [1, -1], KeyM: [-1, 1], Period: [1, 1],
            ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowRight: [1, 0],
        },
        act: ["KeyK", "Enter"],
        pack: ["KeyP"],
        cancel: ["Semicolon"],
    },
];

/** 온라인 방 코드 앞에 붙는 이름 — 공개 PeerJS 브로커에서 남의 방과 안 겹치게. */
const PEER_PREFIX = "idiotquant-rogue-";
/** 들어 있던 방 — 새로고침해도 다시 잇는다. */
const ROOM_KEY = "rogue-room";
const RETRY_MS = 3000;

/**
 * 온라인에서 오가는 말. **방장이 순서를 정한다** — 손님의 명령도 방장에게 갔다가
 * 방장이 적용한 순서대로 되돌아온다. 엔진이 결정적이라 같은 판에 같은 순서면 같은 판이다
 * (`test/rogue-coop.test.ts`).
 */
type NetMsg =
    | { t: "init"; state: string }
    | { t: "cmd"; cmd: Command }
    // 손님이 이으면 먼저 제 출신을 알린다 — 방장이 그 직업으로 동료를 세운다.
    | { t: "hello"; origin: HeroOrigin };

/** 판을 넘어 남는 기록 둘을 합칠 때 쓴다 — **칸마다 큰 쪽**을 남긴다. */
function higher(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
    const out = { ...a };
    for (const [ch, n] of Object.entries(b)) out[ch] = Math.max(out[ch] ?? 0, n);
    return out;
}

export default function Rogue() {
    const [state, setState] = useState<GameState | null>(null);
    const [sheet, setSheet] = useState<
        "none" | "log" | "help" | "graves" | "options" | "bestiary" | "origins"
    >("none");
    /**
     * 사람마다의 배낭·고르기·겨누기(`Desk`). 둘이서면 둘이 따로 연다.
     * `modes` 는 그 책상이 지금 무엇을 띄웠는지 — 걷기를 막을지, 끝난 판을 덮을지 읽는다.
     */
    const desks = useRef<(DeskHandle | null)[]>([]);
    const [modes, setModes] = useState<DeskMode[]>(["none", "none"]);
    const onDeskMode = useCallback((w: number, m: DeskMode) => {
        setModes((ms) => (ms[w] === m ? ms : Object.assign([...ms], { [w]: m })));
    }, []);
    const [tombs, setTombs] = useState<Tomb[]>([]);
    /** 지난 판들 중 상세 조회로 선택한 판 */
    const [selectedTomb, setSelectedTomb] = useState<Tomb | null>(null);
    /** 도감에서 펼쳐 둔 종 — 그 줄 아래에 얼굴이 뜬다. */
    const [openMon, setOpenMon] = useState<string | null>(null);
    /** 도감에서 선택된 탭 */
    const [codexTab, setCodexTab] = useState<"monster" | CodexCategory>("monster");
    /** 아이템 도감에서 펼쳐 둔 아이템 키 */
    const [openItemKey, setOpenItemKey] = useState<string | null>(null);
    const buried = useRef(false);

    /** 전투 피드백 & 특수 효과 연출 상태 (P6 - 칸 내 색상 점멸) */
    const [cellFlashes, setCellFlashes] = useState<Record<string, CellFlash>>({});
    const [shake, setShake] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const lastStateRef = useRef<{
        hp: number;
        gold: number;
        exp: number;
        depth: number;
        turn: number;
        messagesLen: number;
        monsters: { id: number; x: number; y: number; hp: number }[];
    } | null>(null);

    // 첫 그림은 서버에서 못 그린다 — 새 판이 난수로 만들어지므로 서버와 값이 어긋난다.
    useEffect(() => {
        const kept = loadBestiary();
        const knownSpecials = loadSpecials();
        const keptCodex = loadItemCodex();
        const keptUsage = loadItemUsage();
        const saved = load();
        if (saved && saved.phase === "playing") {
            // 저장된 판과 저장소의 도감 중 **큰 쪽**을 남긴다. 판을 띄워 둔 채 다른
            // 탭에서 한 판을 더 돌았을 수 있고, 그때 잡은 것을 잃으면 안 된다.
            saved.bestiary = higher(saved.bestiary, kept);
            saved.specials = higher(saved.specials, knownSpecials);
            saved.itemCodex = { ...keptCodex, ...(saved.itemCodex ?? {}) };
            saved.itemUsage = higher(saved.itemUsage ?? {}, keptUsage);
            setState(saved);
            return;
        }
        setState(newGame(undefined, kept, knownSpecials, keptCodex, keptUsage));
    }, []);

    useEffect(() => {
        if (!state) return;
        // 도감은 **판과 따로** 적는다 — 죽어서 판이 지워져도 남아야 한다.
        saveBestiary(state.bestiary);
        saveSpecials(state.specials);
        saveItemCodex(state.itemCodex);
        saveItemUsage(state.itemUsage);
        // **손님은 남의 판을 제 저장 칸에 안 쓴다** — 혼자 하던 판이 덮인다.
        if (online === "guest") return;
        if (state.phase === "playing") {
            save(state);
            buried.current = false;
            return;
        }
        if (!buried.current) {
            buried.current = true;
            // **적은 쪽이 돌려준 목록을 그대로 받는다** — 죽음 화면의 등수는 이번 판이
            // 들어 있는 목록에서 센다. 다시 `graves()` 를 부르면 「벌써 들어갔는가」를
            // 여기서 짐작해야 한다.
            setTombs(bury(state));
            clear();
        }
    }, [state]);

    // ── 전투 피드백 & 특수 효과 추적 (P6 - 절제된 칸 내 색상 점멸) ──────────────────────────
    useEffect(() => {
        if (!state) return;
        const prev = lastStateRef.current;
        const curr = {
            hp: state.heroes[0].hp,
            gold: state.heroes[0].gold,
            exp: state.heroes[0].exp,
            depth: state.level.depth,
            turn: state.turn,
            messagesLen: state.messages.length,
            monsters: state.level.monsters.map((m) => ({ id: m.id, x: m.x, y: m.y, hp: m.hp })),
        };
        lastStateRef.current = curr;

        if (!prev) {
            if (state.level.mutator) {
                setShowBanner(true);
                const timer = setTimeout(() => setShowBanner(false), 2600);
                return () => clearTimeout(timer);
            }
            return;
        }
        if (prev.turn === curr.turn && prev.depth === curr.depth) return;

        const flashes: Record<string, CellFlash> = {};
        let triggerShake = false;

        // 1. 층 변경 시 이벤트 배너 (2.6초간 단정하게 표시)
        if (prev.depth !== curr.depth && state.level.mutator) {
            setShowBanner(true);
            setTimeout(() => setShowBanner(false), 2600);
        }

        // 2. 이번 턴에 새롭게 추가된 메시지만 분석
        const newMsgs = state.messages.slice(prev.messagesLen);
        const hasCritMsg = newMsgs.some((m) => m.includes("치명타") || m.includes("CRIT") || m.includes("급소를 찔렀다"));
        const hasPhoenixMsg = newMsgs.some((m) => m.includes("불사조의 깃털이 타오르며"));

        // 3. 몬스터 피격 / 처치 감지 (영웅의 공격 대상 칸 플래시)
        const damagedMonster = prev.monsters?.find((pm) => {
            const cm = state.level.monsters.find((m) => m.id === pm.id);
            return cm && cm.hp < pm.hp;
        });
        const killedMonster = prev.monsters?.find((pm) => !state.level.monsters.some((m) => m.id === pm.id));
        const targetMonster = damagedMonster ?? killedMonster;

        if (targetMonster) {
            const key = `${targetMonster.x},${targetMonster.y}`;
            if (hasCritMsg) {
                // 치명타 적중: 황금빛 텍스트 & 반투명 하이라이트
                flashes[key] = { ink: "var(--rg-gold)", bg: "rgba(234, 179, 8, 0.25)" };
                triggerShake = true;
            } else {
                // 일반 적중: 적색 피격 플래시
                flashes[key] = { ink: "var(--rg-trap)" };
            }
        }

        // 4. 영웅 체력 변동 (피격 / 치유 - 내 캐릭터 칸 플래시)
        const hpDiff = curr.hp - prev.hp;
        const heroKey = `${state.heroes[0].x},${state.heroes[0].y}`;
        if (hpDiff < 0) {
            const isHeavyHit = Math.abs(hpDiff) >= Math.max(6, Math.floor(state.heroes[0].maxHp * 0.3));
            if (hasCritMsg) {
                // 영웅 치명타 피격: 황금+적색 경고
                flashes[heroKey] = { ink: "var(--rg-gold)", bg: "rgba(239, 68, 68, 0.3)" };
                triggerShake = true;
            } else {
                // 영웅 일반 피격: 붉은색 플래시
                flashes[heroKey] = { ink: "var(--rg-trap)" };
                if (isHeavyHit) triggerShake = true;
            }
        } else if (hpDiff > 0 && prev.depth === curr.depth) {
            // 영웅 치유: 녹색 플래시
            flashes[heroKey] = { ink: "var(--rg-ring)", bg: "rgba(34, 197, 94, 0.2)" };
        }

        if (hasPhoenixMsg) {
            triggerShake = true;
            flashes[heroKey] = { ink: "var(--rg-trap)", bg: "rgba(239, 68, 68, 0.35)" };
        }

        if (Object.keys(flashes).length > 0) {
            setCellFlashes(flashes);
            setTimeout(() => {
                setCellFlashes({});
            }, 350);
        }

        if (triggerShake) {
            setShake(true);
            setTimeout(() => setShake(false), 160);
        }
    }, [state]);

    /**
     * 이 화면이 **조종하는** 영웅(`heroes` 의 칸 번호).
     *
     * 화면의 값이지 판의 값이 아니다 — 온라인이 되면 방장 화면은 0, 손님 화면은 1 을
     * 들고 **같은 판**을 본다. 그래서 `GameState` 에 안 넣는다.
     */
    const [who, setWho] = useState(0);

    /** 온라인이면 내 자리와 방 코드. 연결은 `net` 에 든다 — 화면이 다시 그려질 까닭이 아니다. */
    const [online, setOnline] = useState<"host" | "guest" | null>(null);
    const [room, setRoom] = useState<string | null>(null);
    /** 지금 상대와 이어져 있는가 — 끊겨도 방(`online`·`room`)은 남는다. */
    const [linked, setLinked] = useState(false);
    const net = useRef<{ peer: Peer; conn?: DataConnection } | null>(null);
    const stateRef = useRef(state);
    stateRef.current = state;
    useEffect(() => () => net.current?.peer.destroy(), []);

    /**
     * 명령이 판에 닿는 **유일한 길**. 키보드·단추·네트워크 모두 여기로 온다.
     * 손님은 적용하지 않고 방장에게 보낸다 — 방장이 되돌려 준 것만 적용한다.
     */
    const dispatchCmd = useCallback(
        (cmd: Command) => {
            const conn = net.current?.conn;
            if (online === "guest") {
                // 끊긴 동안 누른 것은 버린다 — 다시 이어지면 방장의 판을 통째로 받는다.
                if (conn?.open) conn.send({ t: "cmd", cmd } satisfies NetMsg);
                return;
            }
            setState((s) => (s ? perform(s, cmd) : s));
            if (online === "host" && conn?.open) conn.send({ t: "cmd", cmd } satisfies NetMsg);
        },
        [online],
    );

    const run = useCallback(
        (cmd: Command) => {
            // **누가 하는 명령인지를 여기서 싣는다** — 엔진이 다시 판단하지 않는다.
            dispatchCmd({ ...cmd, who });
        },
        [who, dispatchCmd],
    );

    /** 한 화면 협동 — 누른 키가 누구 것인지로 조종이 따라 넘어간다. */
    const runAs = useCallback(
        (w: number, cmd: Command) => {
            setWho(w);
            dispatchCmd({ ...cmd, who: w });
        },
        [dispatchCmd],
    );

    /** 끊겨도 **방을 안 닫는다** — 나가기를 누르기 전까지 같은 코드로 다시 잇는다. */
    const note = useCallback((m: string) => {
        setState((s) => (s ? { ...s, messages: [...s.messages, m] } : s));
    }, []);

    const closeRoom = useCallback((why: string) => {
        net.current?.peer.destroy();
        net.current = null;
        try {
            localStorage.removeItem(ROOM_KEY);
        } catch {}
        setOnline(null);
        setRoom(null);
        setLinked(false);
        setWho(0);
        note(why);
    }, [note]);

    /**
     * 브로커와의 연결이 깨지면 피어를 새로 만든다. 같은 코드가 브로커에 잠깐 남아 있으면
     * (`unavailable-id`) 그것도 몇 초 뒤 다시 된다. 나간 뒤에는 안 돈다(`net.current` 로 본다).
     */
    const retry = useCallback((peer: Peer, again: () => void) => {
        if (net.current?.peer !== peer) return;
        peer.destroy();
        setTimeout(() => net.current?.peer === peer && again(), RETRY_MS);
    }, []);

    const hostRoom = useCallback(async (code = String(1000 + Math.floor(Math.random() * 9000))) => {
        const { Peer } = await import("peerjs");
        const peer = new Peer(PEER_PREFIX + code);
        net.current = { peer };
        try {
            localStorage.setItem(ROOM_KEY, JSON.stringify({ role: "host", code }));
        } catch {}
        setOnline("host");
        setRoom(code);
        setLinked(false);
        peer.on("error", () => retry(peer, () => hostRoom(code)));
        peer.on("disconnected", () => !peer.destroyed && peer.reconnect());
        peer.on("connection", (conn) => {
            // 방은 둘이다 — 살아 있는 손님이 있으면 돌려보낸다. 죽은 연결이면 새 쪽으로 갈아 낀다.
            if (net.current?.conn?.open) {
                conn.close();
                return;
            }
            net.current = { peer, conn };
            conn.on("data", (raw) => {
                const m = raw as NetMsg;
                if (m?.t === "hello") {
                    const s = stateRef.current;
                    if (!s) return;
                    // 남이 보낸 값이다 — 없는 직업이면 기사로 받는다.
                    guestOrigin.current = m.origin in ORIGINS ? m.origin : "knight";
                    // 다시 들어온 손님에게는 **지금 판**을 통째로 준다 — 끊긴 사이의 명령을 셀 필요가
                    // 없다. 이미 동료가 있으면 그 사람이다(직업은 처음 고른 그대로).
                    const g = s.heroes.length > 1 ? s : joinGame(s, guestOrigin.current);
                    setState(g);
                    setWho(0);
                    setLinked(true);
                    conn.send({ t: "init", state: serialize(g) } satisfies NetMsg);
                    return;
                }
                if (m?.t !== "cmd" || !m.cmd) return;
                // **손님은 동료만 움직인다** — 보낸 `who` 를 믿지 않는다.
                const cmd = { ...m.cmd, who: 1 };
                setState((s) => (s ? perform(s, cmd) : s));
                conn.send({ t: "cmd", cmd } satisfies NetMsg);
            });
            conn.on("close", () => {
                if (net.current?.conn !== conn) return;
                net.current.conn = undefined;
                setLinked(false);
                note("동료가 끊겼다 — 같은 방에서 기다린다.");
            });
        });
    }, [note, retry]);

    const joinRoom = useCallback(async (code: string, origin: HeroOrigin) => {
        const { Peer } = await import("peerjs");
        const peer = new Peer();
        net.current = { peer };
        try {
            localStorage.setItem(ROOM_KEY, JSON.stringify({ role: "guest", code, origin }));
        } catch {}
        // **끊긴 동안에도 손님이다** — 제 저장 칸을 안 덮고, 동료 자리를 쥔 채 기다린다.
        setOnline("guest");
        setWho(1);
        setRoom(code);
        setLinked(false);
        const again = () => retry(peer, () => joinRoom(code, origin));
        peer.on("error", again);
        peer.on("open", () => {
            const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
            net.current = { peer, conn };
            conn.on("open", () => {
                setLinked(true);
                conn.send({ t: "hello", origin } satisfies NetMsg);
            });
            conn.on("data", (raw) => {
                const m = raw as NetMsg;
                if (m?.t === "init") {
                    const s = deserialize(m.state);
                    if (s) setState(s);
                } else if (m?.t === "cmd" && m.cmd) {
                    setState((s) => (s ? perform(s, m.cmd) : s));
                }
            });
            conn.on("close", () => {
                if (net.current?.peer !== peer) return;
                setLinked(false);
                note("방장과 끊겼다 — 다시 잇는 중…");
                again();
            });
        });
    }, [note, retry]);

    // 새로고침·탭을 닫았다 연 뒤에도 **들어 있던 방으로** 돌아간다.
    const resumed = useRef(false);
    useEffect(() => {
        // 개발 모드는 효과를 두 번 돌린다 — 같은 코드로 피어가 둘 서면 서로 자리를 뺏는다.
        if (resumed.current) return;
        resumed.current = true;
        try {
            const r = JSON.parse(localStorage.getItem(ROOM_KEY) ?? "null");
            if (r?.role === "host") hostRoom(r.code);
            else if (r?.role === "guest") joinRoom(r.code, r.origin ?? "knight");
        } catch {}
        // 첫 그림에서 한 번만.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * 출신 고르기 판을 **누구를 위해** 열었나 — 새 판(방장) · 한 화면 동료 · 온라인 손님(방 코드).
     * 판은 하나고 고른 뒤 갈 곳만 다르다.
     */
    const [originFor, setOriginFor] = useState<{ t: "new" } | { t: "mate" } | { t: "guest"; code: string }>({ t: "new" });
    /** 방장이 기억하는 온라인 손님의 직업 — 새 판을 열 때 그 직업으로 다시 세운다. */
    const guestOrigin = useRef<HeroOrigin>("knight");

    const pickOrigin = (origin: HeroOrigin) => {
        const f = originFor;
        setOriginFor({ t: "new" });
        if (f.t === "mate") {
            setState((g) => (g && g.heroes.length < 2 ? joinGame(g, origin) : g));
            setSheet("none");
        } else if (f.t === "guest") {
            setSheet("none");
            void joinRoom(f.code, origin);
        } else {
            startWithOrigin(origin);
        }
    };

    const startWithOrigin = useCallback((origin: HeroOrigin) => {
        setSheet("none");
        // 손님의 새 판은 방장만 연다 — 제멋대로 열면 두 화면이 갈라진다.
        if (online === "guest") return;
        clear();
        buried.current = false;
        let g = newGame(undefined, loadBestiary(), loadSpecials(), loadItemCodex(), loadItemUsage(), origin);
        if (online === "host" && net.current?.conn) {
            g = joinGame(g, guestOrigin.current);
            net.current.conn.send({ t: "init", state: serialize(g) } satisfies NetMsg);
        }
        setState(g);
    }, [online]);

    const restart = useCallback(() => {
        setOriginFor({ t: "new" });
        setSheet("origins");
    }, []);

    // ── 키보드 ─────────────────────────────────────────────────────────
    /** 한 화면 협동에서 사람마다 꾹 누르고 있는 방향 키. */
    const holds = useRef<({ code: string; timer: ReturnType<typeof setTimeout> } | null)[]>([]);
    const stopHold = useCallback((w: number) => {
        const h = holds.current[w];
        if (h) clearTimeout(h.timer);
        holds.current[w] = null;
    }, []);
    useEffect(() => () => holds.current.forEach((_, w) => stopHold(w)), [stopHold]);
    const runAsRef = useRef(runAs);
    runAsRef.current = runAs;
    /**
     * 그 사람의 걷기를 막는가 — **자기 책상**이 떴거나, 둘 다 덮는 판(도감·도움말)이 떴거나.
     * 동료가 배낭을 여는 동안에도 나는 계속 걷는다.
     */
    const blocked = useRef<(w: number) => boolean>(() => false);
    blocked.current = (w) => modes[w] !== "none" || sheet !== "none" || state?.phase !== "playing";

    /**
     * 둘이서의 **확인** — 3×3 덩이의 가운데 키와 화면 방향판의 가운데 단추가 같이 쓴다.
     * 책상이 떠 있으면 거기서 고르고, 아니면 발밑을 읽어 할 일을 고른다.
     */
    const confirm = useCallback(
        (w: number) => {
            const h = state?.heroes[w];
            if (!state || !h || h.hp <= 0) return;
            if (modes[w] !== "none") {
                setWho(w);
                desks.current[w]?.padKey({ act: true });
                return;
            }
            // 발밑을 **읽기만** 한다 — 할 수 있는지는 엔진이 다시 본다.
            const onItem = state.level.items.some((it) => it.x === h.x && it.y === h.y);
            const onDown = state.level.tiles[idx(h.x, h.y)] === T.STAIRS;
            runAs(w, onItem ? { t: "pickup" } : onDown ? { t: "descend" } : { t: "search" });
        },
        [state, modes, runAs],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!state) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

            // **글자는 자판 자리로 읽는다** — 한글 입력 상태면 `e.key` 가 `ㅈ`·`ㅁ` 으로 와서
            // 어떤 키도 안 먹는다. 대문자(`W`·`P`·`R`)는 그대로 둔다.
            const key = /^Key[A-Z]$/.test(e.code) ? (e.shiftKey ? e.code[3] : e.code[3].toLowerCase()) : e.key;
            const localCoop = !online && state.heroes.length > 1;
            // 도감·도움말 같은 판은 둘 다 덮는다 — 그동안은 아무도 안 움직인다.
            if (sheet !== "none") return;

            // Shift 를 누른 것은 두 사람 키가 아니다 — `<` 가 `,`(동료 대각선) 자리에 있다.
            if (localCoop && !e.shiftKey) {
                // **키 반복은 OS 에 맡기지 않는다** — macOS 는 마지막에 누른 키 하나만 반복해서,
                // 한 사람이 꾹 누르고 걷는 중에 다른 사람이 누르면 앞사람이 멈춘다.
                // 사람마다 따로 돌린다(`holds`). 책상의 줄 옮기기는 반복을 받는다.
                if (e.repeat && COOP_KEYS.some((k, w) => k.dirs[e.code] && modes[w] === "none")) {
                    e.preventDefault();
                    return;
                }
                for (let w = 0; w < COOP_KEYS.length; w++) {
                    const keys = COOP_KEYS[w];
                    const h = state.heroes[w];
                    const d = keys.dirs[e.code];
                    const isAct = keys.act.includes(e.code);
                    const isPack = keys.pack.includes(e.code);
                    const isCancel = keys.cancel.includes(e.code);
                    if (!h || (!d && !isAct && !isPack && !isCancel)) continue;
                    e.preventDefault();
                    if (h.hp <= 0) return; // 쓰러진 사람은 조종을 안 받는다
                    // **자기 책상이 떠 있으면 키가 그 판으로 간다** — 줄을 옮기고, 고르고, 닫는다.
                    if (isPack || isCancel || modes[w] !== "none") {
                        setWho(w);
                        desks.current[w]?.padKey({ dir: d, act: isAct, pack: isPack, cancel: isCancel });
                    } else if (isAct) {
                        confirm(w);
                    } else if (d) {
                        const cmd: Command = { t: "move", dx: d[0], dy: d[1] };
                        runAs(w, cmd);
                        stopHold(w);
                        const hold = { code: e.code, timer: 0 as unknown as ReturnType<typeof setTimeout> };
                        holds.current[w] = hold;
                        hold.timer = setTimeout(function step() {
                            if (holds.current[w] !== hold || blocked.current(w)) return stopHold(w);
                            runAsRef.current(w, cmd);
                            hold.timer = setTimeout(step, HOLD_STEP);
                        }, HOLD_DELAY);
                    }
                    return;
                }
            }

            const desk = desks.current[who];
            // 혼자일 때 떠 있는 책상(겨누기·고르기·배낭)이 키를 먼저 먹는다.
            if (!localCoop && desk?.soloKey(key, KEY_DIRS[key])) {
                e.preventDefault();
                return;
            }
            // 둘이서 누구 책상이든 떠 있으면 **글자 명령은 안 받는다** — 판이 겹친다.
            if (localCoop && modes.some((m) => m !== "none")) return;

            const dir = KEY_DIRS[key];
            if (dir) {
                e.preventDefault();
                run({ t: "move", dx: dir[0], dy: dir[1] });
                return;
            }
            switch (key) {
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
                    desk?.aim("zap");
                    break;
                case "t":
                    e.preventDefault();
                    desk?.aim("throw");
                    break;
                // `x` 는 「지금 보이는 놈을 본다」였다. 그 판이 도감 안으로 들어갔으므로
                // 키도 그리로 간다 — 누르던 사람의 손가락이 가던 자리가 그대로 산다.
                case "x":
                    e.preventDefault();
                    setSheet("bestiary");
                    break;
                case "i":
                    e.preventDefault();
                    desk?.togglePack();
                    break;
                case "m":
                    e.preventDefault();
                    setSheet("log");
                    break;
                case "?":
                    e.preventDefault();
                    setSheet("help");
                    break;
                default:
                    if (desk?.openPicker(key)) e.preventDefault();
            }
        };
        const onUp = (e: KeyboardEvent) => {
            holds.current.forEach((h, w) => h?.code === e.code && stopHold(w));
        };
        // 창을 벗어나면 뗀 키를 못 듣는다 — 그대로 두면 혼자 계속 걷는다.
        const onBlur = () => holds.current.forEach((_, w) => stopHold(w));
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onUp);
        window.addEventListener("blur", onBlur);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onUp);
            window.removeEventListener("blur", onBlur);
        };
    }, [state, modes, sheet, run, runAs, online, who, stopHold, confirm]);

    if (!state) {
        return (
            <div className="grid h-full w-full place-items-center bg-[var(--rg-bg)]">
                <span className="font-[family-name:var(--font-plex-mono)] text-[12px] tracking-[0.14em] text-[var(--rg-ghost)]">
                    던전을 파는 중…
                </span>
            </div>
        );
    }

    const { level } = state;
    const hero = state.heroes[who] ?? state.heroes[0];
    const onStairs = level.tiles[idx(hero.x, hero.y)] === T.STAIRS;
    const onUpStairs = !!level.upStairs && level.upStairs.x === hero.x && level.upStairs.y === hero.y;
    const hereItem = level.items.find((i) => i.x === hero.x && i.y === hero.y);
    const has = (k: ItemKind) => hero.pack.some((p) => p.kind === k);
    // 도감이 읽는 것 — **화면이 세지 않는다.** 엔진이 낸 것을 늘어놓을 뿐이다.
    const sightings = survey(state);
    const progress = bestiaryProgress(state.bestiary);
    const itemProg = itemCodexProgress(state.itemCodex, state.itemUsage);

    // **세 개씩 한 묶음**으로 늘어놓는다. 단추 판이 세 칸 격자라(`TouchPad`) 한 줄이
    // 곧 한 묶음이 된다 — 계단 둘이 나란히, 배낭에서 꺼내 쓰는 것들이 한 줄에.
    //
    // **여기 서는 것은 던전을 걷는 동안 쓰는 것들뿐이다.** 열다섯 개가 다섯 줄로 서던
    // 때에는 「도움말」과 「지난 판」이 「마신다」와 같은 크기로 붙어 있었다 — 급할 때
    // 손가락이 찾아야 하는 것과 한 판에 한 번 볼까 말까 한 것이 같은 무게였다.
    // 그래서 셋을 덜어 냈다.
    //
    //   · **기록** → 맨 위 메시지 줄을 누르면 열린다. 요약을 보다가 더 보고 싶어지는
    //     자리가 거기라, 단추를 따로 세울 까닭이 없다.
    //   · **도움말 · 지난 판** → 「⚙ 옵션」 안으로. 걸으면서 쓰는 것이 아니다.
    //   · **조사** → 도감 맨 위로. 「지금 보이는 놈」과 「여태 잡은 놈」은 같은 질문
    //     (이놈이 센가)의 앞뒤라, 판이 둘일 까닭이 없었다.
    /** 한 화면 둘이면 글자 키가 이동이 되므로 단추에 적는 키도 달라진다(`COOP_KEYS`). */
    const coopKeys = !online && state.heroes.length > 1;
    const actions: PadAction[] = [
        // 발밑 — **줍기가 맨 앞이다.** 셋 다 발밑을 보는 일이지만 줍는 것이 압도적으로
        // 잦고(층마다 여러 번), 계단은 층에 한 번씩이다. 잦은 것이 첫 칸에 서야 손가락이
        // 제일 짧은 길을 간다.
        { label: "줍기", hint: ", 또는 g", keys: coopKeys ? "S · K" : "g", on: () => run({ t: "pickup" }), off: hereItem ? undefined : "발밑에 아무것도 없다" },
        { label: "내려간다", hint: ">", keys: coopKeys ? "S · K" : ">", on: () => run({ t: "descend" }), off: onStairs ? undefined : "계단 위가 아니다" },
        {
            label: "올라간다",
            hint: "< — 1층 계단은 증표가 있어야 열린다",
            keys: "<",
            on: () => run({ t: "ascend" }),
            off: !onUpStairs
                ? "계단 위가 아니다"
                : level.depth === 1 && !hero.hasAmulet
                  ? "증표 없이는 못 나간다"
                  : undefined,
        },
        // 배낭에서 꺼내 쓰는 것들
        { label: "배낭", hint: "i — 쥐기·입기·끼기는 여기서", keys: coopKeys ? "R · P" : "i", on: () => desks.current[who]?.togglePack() },
        { label: "마신다", hint: "q", keys: coopKeys ? undefined : "q", on: () => desks.current[who]?.openPicker("q"), off: has("potion") ? undefined : "마실 것이 없다" },
        { label: "읽는다", hint: "r", keys: coopKeys ? undefined : "r", on: () => desks.current[who]?.openPicker("r"), off: has("scroll") ? undefined : "읽을 것이 없다" },
        { label: "먹는다", hint: "e", keys: coopKeys ? undefined : "e", on: () => desks.current[who]?.openPicker("e"), off: has("food") ? undefined : "먹을 것이 없다" },
        { label: "쏜다", hint: "z", keys: coopKeys ? undefined : "z", on: () => desks.current[who]?.aim("zap"), off: has("wand") ? undefined : "지팡이가 없다" },
        {
            label: "던진다",
            hint: "t",
            keys: coopKeys ? undefined : "t",
            on: () => desks.current[who]?.aim("throw"),
            off: hero.pack.some(isThrowable) ? undefined : "던질 만한 것이 없다",
        },
        // 살피는 것 · 그 밖
        { label: "뒤진다", hint: "s — 숨은 문과 함정", keys: coopKeys ? "S · K" : "s", on: () => run({ t: "search" }) },
        {
            label: "도감",
            keys: coopKeys ? undefined : "x",
            hint: `x — 몬스터 ${progress.found}/${progress.total} · 아이템 ${itemProg.identifiedCount}/${itemProg.totalCount}`,
            on: () => setSheet("bestiary"),
        },
        { label: "⚙ 옵션", hint: "도움말 · 지난 판", on: () => setSheet("options") },
    ];

    // 띠는 **일어난 일**만 보여 준다. 계산 줄(`· 명중 …`)까지 넣으면 두 줄이 산수로
    // 차서 정작 무슨 일이 났는지가 밀려난다. 계산은 기록 판이 전부 갖고 있다.
    const recent = state.messages.filter((m) => !isDetail(m)).slice(-2);
    /** 이번 판이 내 지난 판들 사이에서 선 자리 — 끝난 판에서만 쓴다. */
    const place = standing(score(state), tombs);
    return (
        <div className="relative flex h-full w-full flex-col bg-[var(--rg-bg)] text-[var(--rg-text)]">
            {/* 맨 위 두 줄 — 원작의 메시지 줄이다. 높이를 고정해 둔다: 줄 수가 들쭉날쭉하면
                지도가 매 턴 위아래로 흔들린다.

                **이 줄이 곧 「기록」의 문이다.** 요약을 읽다가 더 보고 싶어지는 자리가
                여기라, 단추를 따로 세울 까닭이 없었다. 높이와 글자는 그대로 두고 누를 수
                있게만 했다 — `<button>` 이라 키보드로도 닿고 스크린리더도 읽는다. */}
            <button
                type="button"
                onClick={() => setSheet("log")}
                className="flex h-[2.9em] w-full shrink-0 items-start gap-1 overflow-hidden px-2 pt-1 text-left font-[family-name:var(--font-plex-mono)] text-[12px] leading-[1.45] text-[var(--rg-msg)] hover:bg-[var(--rg-hover)] sm:text-[13px]"
            >
                <span className="min-w-0 flex-1">
                    {recent.map((m, i) => (
                        <span key={`${state.turn}-${i}`} className="block truncate">
                            {m}
                        </span>
                    ))}
                </span>
                {/* 누를 수 있다는 표시. 글자가 아니라 자리라서 줄 수가 바뀌어도 안 흔들린다. */}
                <span aria-hidden className="shrink-0 text-[var(--rg-ghost)]">
                    기록 ▾
                </span>
                {/* **`aria-label` 을 안 단다.** 달면 그것이 이름을 통째로 덮어서 **방금 일어난
                    일이 안 읽힌다** — 이 줄에서 제일 중요한 것이 그것이다. 대신 뒤에 한 마디를
                    붙여 「눌러도 되는 것」임을 알린다. */}
                <span className="sr-only">— 누르면 지나온 기록이 펼쳐집니다</span>
            </button>

            <div className="relative min-h-0 flex-1">
                <MapView state={state} who={who} cellFlashes={cellFlashes} shake={shake} />

                {/* 층 돌발 이벤트 진입 알림 배너 */}
                {showBanner && level.mutator && FLOOR_EVENT_BANNER[level.mutator] && (
                    <div className="banner-pop pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded border border-[var(--rg-line)] bg-[var(--rg-panel)] px-3 py-1.5 shadow-md">
                        <span className="text-base">{FLOOR_EVENT_BANNER[level.mutator].icon}</span>
                        <div className="text-left">
                            <div className="font-bold text-[13px] text-[var(--rg-strong)]">
                                {FLOOR_EVENT_BANNER[level.mutator].title}
                            </div>
                            <div className="text-[11px] text-[var(--rg-muted)]">
                                {FLOOR_EVENT_BANNER[level.mutator].desc}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 상태 줄 — 원작의 맨 아랫줄.
                **한 줄로 묶어 둔다.** 접히게 두면 좁은 폰에서 「금화」가 둘째 줄로 내려가
                그만큼 지도가 줄고, 값이 하나 늘 때마다 지도의 높이가 달라진다. 넘치면
                옆으로 민다 — 세로는 지도의 것이다.

                **둘이면 사람마다 한 줄**이다. 동료의 체력·배고픔을 늘 봐야 하는데 조종을
                넘겨야 보이면 늦는다. 줄머리의 이름표는 지도의 `@` 와 같은 글자색·바닥색이고,
                누르면 조종이 넘어간다(조종 중인 쪽은 테두리). 층은 하나라 첫 줄에만 적는다. */}
            {(state.heroes.length > 1 ? state.heroes : [hero]).map((h, i) => {
                const coop = state.heroes.length > 1;
                const hHunger = hungerOf(h);
                const hRings = wornRings(h).length;
                return (
                    <div
                        key={i}
                        className={`flex shrink-0 items-center gap-x-3 overflow-x-auto whitespace-nowrap px-2 py-1 font-[family-name:var(--font-plex-mono)] text-[12px] text-[var(--rg-muted)] [scrollbar-width:none] sm:text-[13px] ${i === 0 ? "border-t border-[var(--rg-line-faint)]" : "pt-0"}`}
                    >
                        {coop && (
                            <button
                                type="button"
                                // **쓰러진 사람에게는 조종을 안 넘긴다** — 넘겨 봐야 아무
                                // 명령도 안 먹는다(엔진이 막는다). 자물쇠는 둘이다.
                                onClick={() => h.hp > 0 && !online && setWho(i)}
                                disabled={h.hp <= 0 || !!online}
                                className={`shrink-0 rounded-[2px] border-2 px-1.5 font-bold ${i === who ? "" : "border-transparent"}`}
                                style={{ color: PARTY_INK[i], backgroundColor: PARTY_BG[i], borderColor: i === who ? PARTY_INK[i] : undefined }}
                            >
                                {h.hp > 0 ? "@" : "†"}{i === 0 ? "1P" : "2P"}
                            </button>
                        )}
                        <span className="text-[var(--rg-strong)] font-semibold">
                            {ORIGINS[h.origin ?? "knight"]?.icon} {ORIGINS[h.origin ?? "knight"]?.name}
                        </span>
                        {i === 0 && <span>Level: {level.depth}</span>}
                        <span className="text-[var(--rg-gold)]">Gold: {h.gold}</span>
                        <span className={h.hp <= h.maxHp / 4 ? "text-[var(--rg-trap)] font-bold" : undefined}>
                            Hp: {h.hp}({h.maxHp}){h.hp <= 0 && " 쓰러짐"}
                        </span>
                        <span>Str: {heroStr(h)}({h.maxStr})</span>
                        <span>Arm: {heroArmor(h)}</span>
                        <span>Exp: {h.level}/{h.exp}</span>
                        {i === 0 && level.mutator && FLOOR_EVENT_BANNER[level.mutator] && (
                            <span className="text-[var(--rg-gold)] font-medium">
                                {FLOOR_EVENT_BANNER[level.mutator].icon} {FLOOR_EVENT_BANNER[level.mutator].title}
                            </span>
                        )}
                        {(h.timeStop ?? 0) > 0 && (
                            <span className="text-[var(--rg-wand)] font-bold">TimeStop({h.timeStop})</span>
                        )}
                        {hRings > 0 && <span className="text-[var(--rg-ring)]">Ring: {hRings}</span>}
                        {h.guarded && <span className="text-[var(--rg-armor)] font-bold">Guarded</span>}
                        {h.confused > 0 && <span className="text-[var(--rg-potion)]">Confused</span>}
                        {h.blind > 0 && <span className="text-[var(--rg-potion)]">Blind</span>}
                        {h.stuck > 0 && <span className="text-[var(--rg-monster)]">Held</span>}
                        {hHunger && <span className="text-[var(--rg-monster)] font-bold">{hHunger}</span>}
                        {h.hasAmulet && <span className="text-[var(--rg-amulet)] font-bold">Amulet</span>}
                        {coop && i === state.heroes.length - 1 && (
                            <span className="text-[var(--rg-faint)]">
                                {online
                                    ? `온라인 방 ${room} · ${online === "host" ? "내가 방장" : "내가 동료"}${linked ? "" : " · 잇는 중…"}`
                                    : "? 조작"}
                            </span>
                        )}
                    </div>
                );
            })}

            <div className="shrink-0 border-t border-[var(--rg-line-faint)]">
                <TouchPad
                    dirKeys={
                        coopKeys
                            ? [
                                  { ink: PARTY_INK[0], keys: ["Q", "W", "E", "A", "S", "D", "Z", "X", "C"] },
                                  { ink: PARTY_INK[1], keys: ["U", "I", "O", "J", "K", "L", "M", ",", "."] },
                              ]
                            : [{ keys: ["y", "k", "u", "h", ".", "l", "b", "j", "n"] }]
                    }
                    onMove={(dx, dy) => {
                        if (coopKeys && dx === 0 && dy === 0) return confirm(who);
                        if (desks.current[who]?.aimAt(dx, dy)) return;
                        run(dx === 0 && dy === 0 ? { t: "rest" } : { t: "move", dx, dy });
                    }}
                    actions={actions}
                    // 겨누는 중에는 연타를 끈다 — 한 번 고르면 끝나는 판이다.
                    hold={modes[who] !== "aim"}
                />
            </div>

            {/* ── 덮는 판들 ───────────────────────────────────────────── */}
            {/* 사람마다의 책상 — 둘이서면 제 반쪽에, 혼자면 한가운데. */}
            {(coopKeys ? [0, 1] : [who]).map((w) => (
                <Desk
                    key={w}
                    ref={(d) => {
                        desks.current[w] = d;
                    }}
                    state={state}
                    w={w}
                    run={(cmd) => runAs(w, cmd)}
                    side={coopKeys ? (w === 0 ? "left" : "right") : undefined}
                    label={coopKeys ? (w === 0 ? "1P 방장" : "2P 동료") : undefined}
                    accent={coopKeys ? PARTY_INK[w] : undefined}
                    closeKey={coopKeys ? (w === 0 ? "F" : ";") : undefined}
                    onMode={onDeskMode}
                />
            ))}

            {sheet === "bestiary" && (
                <Panel
                    title={
                        codexTab === "monster"
                            ? `몬스터 도감 ${progress.found}/${progress.total}`
                            : `아이템 도감 · 식별 ${itemProg.identifiedCount}/${itemProg.totalCount} · 통달 ${itemProg.masteredCount}/${itemProg.totalCount}`
                    }
                    onClose={() => {
                        setOpenMon(null);
                        setOpenItemKey(null);
                        setSheet("none");
                    }}
                    footer={
                        codexTab === "monster"
                            ? "줄을 누르면 그 놈의 모습이 펼쳐집니다. 한 종은 어디서나 같은 능력치입니다 — 층은 「어느 종이 나오는가」만 정합니다. 펼쳐 보는 데는 턴을 쓰지 않습니다."
                            : "줄을 누르면 상세 제원과 플레이버 텍스트가 펼쳐집니다. 식별(●)과 통달(★)은 판을 넘어 영구 보존됩니다."
                    }
                >
                    {/* 카테고리 탭 목록 */}
                    <div className="mb-2.5 flex flex-wrap gap-1 border-b border-[var(--rg-line-soft)] pb-2 text-[12px]">
                        {[
                            { id: "monster" as const, label: "몬스터", countStr: `${progress.found}/${progress.total}` },
                            { id: "weapon" as const, label: "무기", countStr: `${itemProg.byCategory.weapon.identified}/${itemProg.byCategory.weapon.total}` },
                            { id: "armor" as const, label: "방어구", countStr: `${itemProg.byCategory.armor.identified}/${itemProg.byCategory.armor.total}` },
                            { id: "scroll" as const, label: "주문서", countStr: `${itemProg.byCategory.scroll.identified}/${itemProg.byCategory.scroll.total}` },
                            { id: "potion" as const, label: "물약", countStr: `${itemProg.byCategory.potion.identified}/${itemProg.byCategory.potion.total}` },
                            { id: "ring" as const, label: "반지", countStr: `${itemProg.byCategory.ring.identified}/${itemProg.byCategory.ring.total}` },
                            { id: "wand" as const, label: "지팡이", countStr: `${itemProg.byCategory.wand.identified}/${itemProg.byCategory.wand.total}` },
                            { id: "other" as const, label: "그 밖", countStr: `${itemProg.byCategory.other.identified}/${itemProg.byCategory.other.total}` },
                        ].map((tab) => {
                            const active = codexTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setCodexTab(tab.id);
                                        setOpenMon(null);
                                        setOpenItemKey(null);
                                    }}
                                    className={`rounded px-1.5 py-0.5 transition-colors ${
                                        active
                                            ? "bg-[var(--rg-line)] font-bold text-[var(--rg-strong)]"
                                            : "text-[var(--rg-muted)] hover:bg-[var(--rg-hover)]"
                                    }`}
                                >
                                    {tab.label} <span className="font-normal text-[var(--rg-faint)]">({tab.countStr})</span>
                                </button>
                            );
                        })}
                    </div>

                    {codexTab === "monster" ? (
                        <>
                            {/* 기존 몬스터 도감 내용 */}
                            {sightings.length > 0 && (
                                <div className="mb-3 border-b border-[var(--rg-line-soft)] pb-2">
                                    <p className="mb-1 text-[var(--rg-faint)]">지금 보이는 놈</p>
                                    <ul className="space-y-2">
                                        {sightings.map((m: Sighting) => (
                                            <li key={m.id}>
                                                <div>
                                                    <span className="text-[var(--rg-monster)]">{m.ch}</span>{" "}
                                                    <span className="text-[var(--rg-strong)]">{m.name}</span>
                                                    <span className="text-[var(--rg-faint)]">
                                                        {" "}· {m.distance}칸 · {m.awake ? "쫓고 있다" : "아직 못 봤다"} ·{" "}
                                                    </span>
                                                    <span className={m.condition === "성하다" ? "text-[var(--rg-muted)]" : "text-[var(--rg-trap)]"}>
                                                        {m.condition}
                                                    </span>
                                                </div>
                                                {m.known ? (
                                                    <div className="text-[var(--rg-muted)]">
                                                        Level {m.level} · Arm {10 - (m.defense ?? 0)} · Dmg{" "}
                                                        {m.damage?.join(" + ") || "없음"} · Exp {m.exp} · Hp {m.hp}
                                                        {m.mean && <span className="text-[var(--rg-monster)]"> · 보자마자 달려든다</span>}
                                                    </div>
                                                ) : (
                                                    <div className="text-[var(--rg-faint)]">
                                                        처음 보는 놈이다 — 한 마리를 잡아야 속을 안다.
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {progress.found === 0 ? (
                                <p className="text-[var(--rg-faint)]">아직 아무것도 못 잡았다.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {bestiaryRows(state.bestiary, state.specials).map((r: BestiaryRow) => {
                                        const open = openMon === r.ch;
                                        const art = monsterArt(r.ch);
                                        return (
                                            <li key={r.ch}>
                                                {/* 줄을 누르면 얼굴이 펼쳐진다. 글자 하나로만 아는 놈에게
                                                    모습을 붙여 주는 자리라, **잡아 본 종만** 여기 선다. */}
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenMon(open ? null : r.ch)}
                                                    aria-expanded={open}
                                                    className={`w-full rounded-[2px] px-1 text-left ${open ? "bg-[var(--rg-raised)]" : "hover:bg-[var(--rg-hover)]"}`}
                                                >
                                                    <span className="text-[var(--rg-monster)]">{r.ch}</span>{" "}
                                                    <span className="text-[var(--rg-strong)]">{r.name}</span>
                                                    <span className="text-[var(--rg-gold)]"> ×{r.kills}</span>
                                                    {art && <span className="text-[var(--rg-ghost)]"> {open ? "▾" : "▸"}</span>}
                                                    <div className="text-[var(--rg-muted)]">
                                                        Level {r.level} · Arm {10 - r.defense} · Dmg{" "}
                                                        {r.damage.join(" + ") || "없음"} · Exp {r.exp} · Hp {r.hp}
                                                        {r.mean && <span className="text-[var(--rg-monster)]"> · 보자마자 달려든다</span>}
                                                        {/* 종의 능력치는 층을 안 탄다 — 같은 트롤은 어디서나 같다.
                                                            층이 정하는 것은 **어느 종이 나오는가**뿐이라, 도감이 적을
                                                            수 있는 「층에 따른 것」은 이 띠 하나다. */}
                                                        {r.depths && (
                                                            <div className="text-[var(--rg-faint)]">
                                                                지하 {r.depths.min}–{r.depths.max}층에 나온다 · 어디서 만나도 같은 능력치
                                                            </div>
                                                        )}
                                                        {/* **수법은 잡아서 아는 것이 아니라 당해서 아는 것이다.**
                                                            그래서 잡은 수와 따로 적는다 — 열 마리를 잡고도 한 번도
                                                            안 당했으면 여기는 아직 비어 있어야 맞다. */}
                                                        {r.hasSpecial && (
                                                            r.special ? (
                                                                <div className="text-[var(--rg-trap)]">
                                                                    수법: {r.special} · {r.suffered}번 당했다
                                                                </div>
                                                            ) : (
                                                                <div className="text-[var(--rg-faint)]">
                                                                    수법: 아직 모른다 — 당해 봐야 안다
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </button>
                                                {open && art && (
                                                    /* 고정폭 글꼴 그대로 — 그림은 칸이 어긋나면 무너진다.
                                                       좁은 폰에서도 안 접히게 스무 칸을 안 넘긴다(`monsterArt`). */
                                                    <pre className="mt-1 mb-2 overflow-x-auto whitespace-pre px-1 text-[12px] leading-[1.15] text-[var(--rg-ring)]">
                                                        {art}
                                                    </pre>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    ) : (
                        /* 아이템 도감 목록 */
                        <ul className="space-y-1.5">
                            {CODEX_ENTRIES.filter((e) => e.category === codexTab).map((entry) => {
                                const stage = itemCodexStage(entry, state);
                                const open = openItemKey === entry.key;
                                const usage = state.itemUsage?.[entry.key] ?? 0;
                                const char = itemChar(entry.kind);

                                // 단계 기호와 색상
                                const stageBadge =
                                    stage === 4 ? (
                                        <span className="text-[var(--rg-gold)] font-bold">★</span>
                                    ) : stage === 3 ? (
                                        <span className="text-[var(--rg-strong)]">●</span>
                                    ) : stage === 2 ? (
                                        <span className="text-[var(--rg-muted)]">○</span>
                                    ) : stage === 1 ? (
                                        <span className="text-[var(--rg-faint)]">◌</span>
                                    ) : (
                                        <span className="text-[var(--rg-ghost)]">·</span>
                                    );

                                // 이름 및 상태 문자열
                                const appearanceName = state.appearance[entry.key] ?? entry.categoryLabel;
                                const displayName =
                                    stage >= 3
                                        ? entry.name
                                        : stage >= 1
                                          ? `??? (${appearanceName})`
                                          : "──────";

                                const statsSummary =
                                    stage >= 3
                                        ? itemCodexStats(entry)
                                        : stage === 2
                                          ? "배낭에 있다"
                                          : stage === 1
                                            ? "본 적 있다"
                                            : "";

                                const usageSuffix =
                                    entry.masteryType === "kills"
                                        ? "킬"
                                        : entry.masteryType === "steps"
                                          ? "걸음"
                                          : entry.masteryType === "uses"
                                            ? "회"
                                            : "";

                                const usageStr =
                                    stage === 4
                                        ? `★통달 · ${usage}${usageSuffix}`
                                        : stage === 3 && usageSuffix
                                          ? `${usage}${usageSuffix}`
                                          : "";

                                return (
                                    <li key={entry.key} className="border-b border-[var(--rg-line-soft)] pb-1 last:border-b-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (stage === 0) return;
                                                setOpenItemKey(open ? null : entry.key);
                                            }}
                                            disabled={stage === 0}
                                            aria-expanded={open}
                                            className={`w-full rounded-[2px] px-1 text-left transition-colors ${
                                                stage === 0
                                                    ? "cursor-default opacity-60"
                                                    : open
                                                      ? "bg-[var(--rg-raised)]"
                                                      : "hover:bg-[var(--rg-hover)]"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className="w-4 text-center font-mono">{stageBadge}</span>
                                                    <span className="text-[var(--rg-label)] font-mono">{char}</span>
                                                    <span
                                                        className={`truncate ${
                                                            stage >= 3
                                                                ? "font-medium text-[var(--rg-strong)]"
                                                                : stage >= 1
                                                                  ? "text-[var(--rg-muted)]"
                                                                  : "text-[var(--rg-ghost)]"
                                                        }`}
                                                    >
                                                        {displayName}
                                                    </span>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2 text-[12px]">
                                                    {usageStr && (
                                                        <span className={stage === 4 ? "text-[var(--rg-gold)] font-medium" : "text-[var(--rg-muted)]"}>
                                                            {usageStr}
                                                        </span>
                                                    )}
                                                    {stage > 0 && (
                                                        <span className="text-[var(--rg-ghost)] text-[10px]">
                                                            {open ? "▾" : "▸"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {statsSummary && (
                                                <div className="pl-5 text-[12px] text-[var(--rg-faint)]">
                                                    {statsSummary}
                                                </div>
                                            )}
                                        </button>

                                        {/* 상세 제원 및 플레이버 텍스트 (펼침) */}
                                        {open && stage > 0 && (
                                            <div className="my-1.5 ml-4 rounded border border-[var(--rg-line)] bg-[var(--rg-bg)] p-2.5 text-[12px] space-y-2">
                                                {stage < 3 ? (
                                                    /* 미식별 상세 (정보 누출 차단) */
                                                    <div className="space-y-1 text-[var(--rg-muted)]">
                                                        <div className="flex gap-4">
                                                            <span className="text-[var(--rg-faint)]">분류:</span>
                                                            <span>{entry.categoryLabel}</span>
                                                            <span className="text-[var(--rg-faint)]">나오는 층:</span>
                                                            <span>?</span>
                                                        </div>
                                                        <div className="text-[var(--rg-faint)] italic pt-1">
                                                            {stage === 2
                                                                ? "배낭에 보관 중입니다. 마셔 보거나 읽거나 써 봐야 정체를 알 수 있습니다."
                                                                : "시야에서 목격한 아이템입니다. 직접 획득해 감정하거나 사용해야 속을 알 수 있습니다."}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* 식별 / 통달 상세 */
                                                    <>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[var(--rg-muted)] border-b border-[var(--rg-line-soft)] pb-2">
                                                            {entry.kind === "weapon" && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">피해: </span>
                                                                        <span className="text-[var(--rg-strong)]">{WEAPONS[entry.type]?.damage ?? "1d2"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">나오는 층: </span>
                                                                        <span>{itemDepthRange("weapon", entry.type) ? `${itemDepthRange("weapon", entry.type)!.min}–${itemDepthRange("weapon", entry.type)!.max}층` : "1–26층"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">던지기: </span>
                                                                        <span>{WEAPONS[entry.type]?.throwable ? "가능" : "안 됨"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">잡은 수: </span>
                                                                        <span>{usage}킬</span>
                                                                    </div>
                                                                    <div className="col-span-2 text-[11px] text-[var(--rg-faint)]">
                                                                        강화: +{ENCHANT_MAX}까지 · 모루: 분해 시 주문서 추출({Math.round(MELT_RETURN * 100)}%)
                                                                    </div>
                                                                </>
                                                            )}
                                                            {entry.kind === "armor" && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">방어력: </span>
                                                                        <span className="text-[var(--rg-strong)]">{defenseOf(ARMORS[entry.type]?.armor ?? 10)}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">나오는 층: </span>
                                                                        <span>{itemDepthRange("armor", entry.type) ? `${itemDepthRange("armor", entry.type)!.min}–${itemDepthRange("armor", entry.type)!.max}층` : "1–26층"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">착용 걸음: </span>
                                                                        <span>{usage}걸음</span>
                                                                    </div>
                                                                    <div className="col-span-2 text-[11px] text-[var(--rg-faint)]">
                                                                        강화: +{ENCHANT_MAX}까지 · 모루: 1장 확정 + 분해 추출({Math.round(MELT_RETURN * 100)}%)
                                                                    </div>
                                                                </>
                                                            )}
                                                            {(entry.kind === "potion" || entry.kind === "scroll") && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">분류: </span>
                                                                        <span>{entry.categoryLabel}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">나오는 층: </span>
                                                                        <span>{itemDepthRange(entry.kind, entry.type) ? `${itemDepthRange(entry.kind, entry.type)!.min}–${itemDepthRange(entry.kind, entry.type)!.max}층` : "1–26층"}</span>
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <span className="text-[var(--rg-faint)]">사용 횟수: </span>
                                                                        <span>{usage}회</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {entry.kind === "wand" && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">분류: </span>
                                                                        <span>지팡이</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">나오는 층: </span>
                                                                        <span>{itemDepthRange("wand", entry.type) ? `${itemDepthRange("wand", entry.type)!.min}–${itemDepthRange("wand", entry.type)!.max}층` : "1–26층"}</span>
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <span className="text-[var(--rg-faint)]">발사 횟수: </span>
                                                                        <span>{usage}회</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {entry.kind === "ring" && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">분류: </span>
                                                                        <span>반지</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">나오는 층: </span>
                                                                        <span>{itemDepthRange("ring", entry.type) ? `${itemDepthRange("ring", entry.type)!.min}–${itemDepthRange("ring", entry.type)!.max}층` : "1–26층"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">배고픔 추가: </span>
                                                                        <span>+{RINGS[entry.type]?.hunger ?? 1}/턴</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">착용 걸음: </span>
                                                                        <span>{usage}걸음</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {entry.kind === "food" && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">효과: </span>
                                                                        <span className="text-[var(--rg-strong)]">허기 1300 회복</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">나오는 층: </span>
                                                                        <span>1–26층</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {entry.kind === "amulet" && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">목표: </span>
                                                                        <span className="text-[var(--rg-gold)] font-bold">승리의 증표</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[var(--rg-faint)]">위치: </span>
                                                                        <span>지하 26층</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* 1문단 플레이버 텍스트 */}
                                                        <p className="text-[var(--rg-muted)] leading-relaxed">{entry.flavor}</p>

                                                        {/* 2문단 플레이버 텍스트 (통달 시) */}
                                                        {stage === 4 ? (
                                                            <div className="mt-2 border-t border-[var(--rg-line-soft)] pt-2">
                                                                <div className="mb-1 text-[11px] font-bold text-[var(--rg-gold)] tracking-wider">
                                                                    ── ★ 통달 ──
                                                                </div>
                                                                <p className="text-[var(--rg-strong)] leading-relaxed italic">
                                                                    {entry.masteryFlavor}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-1 border-t border-[var(--rg-line-soft)] pt-1 text-[11px] text-[var(--rg-faint)]">
                                                                ── 통달 목표: {
                                                                    entry.masteryType === "kills"
                                                                        ? `20킬 달성 (${usage}/${entry.masteryGoal})`
                                                                        : entry.masteryType === "steps"
                                                                          ? `1,000걸음 착용 (${usage}/${entry.masteryGoal})`
                                                                          : entry.masteryType === "uses"
                                                                            ? `${entry.masteryGoal}회 사용 (${usage}/${entry.masteryGoal})`
                                                                            : "식별 즉시 통달"
                                                                } ──
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
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
                <Panel
                    title="지나온 기록"
                    onClose={() => setSheet("none")}
                    /* 「이 d20 은 뭘 정하는 건가」를 여기서 답한다 — 줄에 이름은 붙였지만
                       스무면체가 명중에만 쓰인다는 것은 한 줄로 말해 주는 편이 빠르다. */
                    footer="d20 은 명중에만 굴립니다 — 나와 상대가 각각 굴려 내 쪽이 높으면 맞습니다. 피해는 공격력(2d4 같은 것)에서 상대의 방어력을 뺀 값입니다."
                >
                    <ul className="space-y-0.5">
                        {state.messages
                            .slice(-80)
                            .reverse()
                            .map((m, i) => (
                                <li key={i} className="text-[var(--rg-muted)]">
                                    {m}
                                </li>
                            ))}
                    </ul>
                </Panel>
            )}

            {/* 걸으면서 쓰지 않는 것들이 여기 모인다. 단추 판에 나란히 세워 두면
                「도움말」이 「마신다」와 같은 무게로 보이고, 급할 때 손가락이 헤맨다. */}
            {sheet === "options" && (
                <Panel title="옵션" onClose={() => setSheet("none")} footer="화면의 밝기(밝은 테마·어두운 테마)는 위·왼쪽 바의 단추가 정합니다.">
                    <ul className="space-y-1">
                        {[
                            { label: "새 판 시작 (출신 직업 선택)", hint: "왕실 근위대 · 도적 · 연금술사 · 연구자", go: () => {
                                    setOriginFor({ t: "new" });
                                    setSheet("origins");
                                } },
                            // **한 번 누르는 것이라 여기 있다.** 던전을 걷는 동안 누르는
                            // 것만 단추 판에 선다(`CLAUDE.md`).
                            ...(state.heroes.length > 1
                                ? online
                                    ? []
                                    : [
                                          {
                                              label: "동료 보내기 (다시 혼자로)",
                                              hint: state.heroes[0].hp > 0 ? "이 판 안에서는 다시 부르면 직업·배낭 그대로 돌아온다" : "방장이 쓰러져 있으면 못 보낸다",
                                              go: () => {
                                                  setState((g) => (g ? leaveGame(g) : g));
                                                  setWho(0);
                                                  setSheet("none");
                                              },
                                          },
                                      ]
                                : [
                                      {
                                          label: state.benched ? "동료 다시 부르기 (한 화면에서 둘)" : "동료 부르기 (한 화면에서 둘)",
                                          hint: state.benched
                                              ? `보냈던 ${ORIGINS[state.benched.origin ?? "knight"]?.name} Lv ${state.benched.level} — 배낭 그대로`
                                              : "직업을 고르면 내 곁에 선다",
                                          go: () => {
                                              // 보냈던 동료는 **직업을 다시 안 묻는다** — 그 사람이 돌아온다.
                                              if (state.benched) {
                                                  setState((g) => (g ? joinGame(g) : g));
                                                  setSheet("none");
                                                  return;
                                              }
                                              setOriginFor({ t: "mate" });
                                              setSheet("origins");
                                          },
                                      },
                                  ]),
                            ...(room
                                ? [
                                      {
                                          label: `온라인 방 나가기 (${room})`,
                                          hint: linked ? "연결됨" : "상대를 기다리는 중",
                                          go: () => {
                                              closeRoom("방을 닫았다.");
                                              setSheet("none");
                                          },
                                      },
                                  ]
                                : [
                                      {
                                          label: "온라인 방 만들기",
                                          hint: "코드 네 자리를 동료에게 알려 준다 — 지금 판에 들어온다",
                                          go: () => {
                                              void hostRoom();
                                              setSheet("none");
                                          },
                                      },
                                      {
                                          label: "온라인 방 들어가기",
                                          hint: "동료가 알려 준 코드로 — 내 저장 판은 그대로 남는다",
                                          go: () => {
                                              const code = window.prompt("방 코드 네 자리")?.trim();
                                              if (!code) return;
                                              setOriginFor({ t: "guest", code });
                                              setSheet("origins");
                                          },
                                      },
                                  ]),
                            { label: "도움말", hint: "키와 규칙 — ?", go: () => setSheet("help") },
                            {
                                label: "지난 판",
                                hint: "여태 죽은 자리와 점수",
                                go: () => {
                                    setTombs(graves());
                                    setSelectedTomb(null);
                                    setSheet("graves");
                                },
                            },
                        ].map((o) => (
                            <li key={o.label}>
                                <button
                                    type="button"
                                    onClick={o.go}
                                    className="w-full rounded-[2px] px-1 text-left hover:bg-[var(--rg-hover)]"
                                >
                                    <span className="text-[var(--rg-strong)]">{o.label}</span>
                                    <span className="text-[var(--rg-faint)]"> — {o.hint}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}

            {sheet === "origins" && (
                <Panel
                    title={originFor.t === "new" ? "출신(직업) 선택" : "2P 동료의 출신(직업) 선택"}
                    accent={originFor.t === "new" ? undefined : PARTY_INK[1]}
                    onClose={() => {
                        if (originFor.t !== "new" || (state && state.phase === "playing")) {
                            setOriginFor({ t: "new" });
                            setSheet("none");
                        } else startWithOrigin("knight");
                    }}
                >
                    <div className="space-y-2 text-xs">
                        <p className="text-[var(--rg-faint)]">
                            새로운 모험을 떠날 캐릭터의 출신과 고유 특성을 선택하십시오.
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {ORIGIN_LIST.map((orig) => (
                                <button
                                    key={orig.id}
                                    type="button"
                                    onClick={() => pickOrigin(orig.id)}
                                    className="flex flex-col text-left rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-raised)] p-3 transition-colors hover:border-[var(--rg-line)] hover:bg-[var(--rg-hover)] focus:outline-none"
                                >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                        <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--rg-strong)]">
                                            <span>{orig.icon}</span>
                                            <span>{orig.name}</span>
                                            <span className="text-[11px] font-mono text-[var(--rg-muted)] font-normal">({orig.title})</span>
                                        </div>
                                        <span className="font-mono text-[11px] text-[var(--rg-gold)]">
                                            Hp {orig.baseHp} · Str {orig.baseStr}
                                        </span>
                                    </div>
                                    <p className="text-[11.5px] text-[var(--rg-muted)] mb-2">
                                        {orig.description}
                                    </p>
                                    <div className="mt-auto border-t border-[var(--rg-line-soft)] pt-1.5 text-[11px]">
                                        <span className="font-bold text-[var(--rg-strong)]">⚡ {orig.traitName}: </span>
                                        <span className="text-[var(--rg-faint)]">{orig.traitDescription}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </Panel>
            )}

            {sheet === "help" && (
                <Panel title="조작" onClose={() => setSheet("none")} footer="죽으면 그것으로 끝입니다. 저장은 자동이고, 되돌리기는 없습니다.">
                    {/* **한 화면 둘이면 그 키를 보여 준다** — 혼자 키를 늘어놓으면 반은 안 먹는 키다. */}
                    {!online && state.heroes.length > 1 ? (
                        <div className="space-y-3">
                            {[
                                { name: "방장 — 왼손", move: "W A X D", diag: "Q E Z C", act: "S (가운데)", pack: "R · Tab", cancel: "F" },
                                { name: "동료 — 오른손", move: "I J , L (방향키도)", diag: "U O M .", act: "K (가운데) · Enter", pack: "P", cancel: ";" },
                            ].map((k, i) => (
                                <div key={k.name}>
                                    <p className="mb-1 font-bold" style={{ color: PARTY_INK[i] }}>@ {k.name}</p>
                                    <dl className="grid grid-cols-[7.5em_1fr] gap-y-1">
                                        <dt className="text-[var(--rg-label)]">{k.move}</dt><dd>위 왼 아래 오른쪽</dd>
                                        <dt className="text-[var(--rg-label)]">{k.diag}</dt><dd>대각선 — 왼위 · 오른위 · 왼아래 · 오른아래</dd>
                                        <dt className="text-[var(--rg-label)]">{k.act}</dt><dd><b>확인</b> — 걸을 때는 발밑에 물건이 있으면 줍고, 계단이면 내려가고, 아니면 뒤진다. 배낭·고르기에서는 고른다. 화면 방향판의 가운데 단추도 같다</dd>
                                        <dt className="text-[var(--rg-label)]">{k.pack}</dt><dd><b>내 배낭</b> — 화면의 내 반쪽에 열린다. 위아래로 줄을 옮기고 확인으로 짚은 뒤, 좌우로 할 일을 골라 확인으로 한다. 다시 누르면 닫힌다</dd>
                                        <dt className="text-[var(--rg-label)]">{k.cancel}</dt><dd><b>취소</b> — 내 판만 한 단계 물린다(짚은 줄 풀기 → 닫기). Esc 는 둘이서는 안 쓴다</dd>
                                    </dl>
                                </div>
                            ))}
                            <dl className="grid grid-cols-[7.5em_1fr] gap-y-1 border-t border-[var(--rg-line-soft)] pt-2">
                                <dt className="text-[var(--rg-label)]">&lt;</dt><dd>올라간다 — 실수로 오르지 않게 행동 키에서 뺐습니다 (마지막에 움직인 사람)</dd>
                                <dt className="text-[var(--rg-label)]">?</dt><dd>이 화면 (도감은 단추로 — <b>X</b> 는 방장의 아래쪽이다)</dd>
                                <dt className="text-[var(--rg-label)]">단추 판</dt><dd>마지막에 움직인 사람이 합니다 — 파티 줄을 눌러 바꿀 수도 있습니다</dd>
                                <dt className="text-[var(--rg-label)]">쓰러지면</dt><dd>살아 있는 사람이 층을 넘으면 절반의 체력으로 일어납니다</dd>
                            </dl>
                        </div>
                    ) : (
                    <dl className="grid grid-cols-[7.5em_1fr] gap-y-1">
                        <dt className="text-[var(--rg-label)]">h j k l</dt><dd>왼 아래 위 오른쪽 (방향키도 됩니다)</dd>
                        <dt className="text-[var(--rg-label)]">y u b n</dt><dd>대각선 넷</dd>
                        <dt className="text-[var(--rg-label)]">.</dt><dd>제자리에서 쉰다</dd>
                        <dt className="text-[var(--rg-label)]">, 또는 g</dt><dd>발밑의 것을 줍는다</dd>
                        <dt className="text-[var(--rg-label)]">s</dt><dd>벽을 뒤진다 — 숨은 문과 함정이 드러난다</dd>
                        <dt className="text-[var(--rg-label)]">&gt; &lt;</dt><dd>계단을 내려간다 · 올라간다</dd>
                        <dt className="text-[var(--rg-label)]">q r e</dt><dd>마신다 · 읽는다 · 먹는다</dd>
                        <dt className="text-[var(--rg-label)]">w W</dt><dd><b>쥔다 · 입는다</b></dd>
                        <dt className="text-[var(--rg-label)]">P R</dt><dd>반지를 낀다 · 뺀다</dd>
                        <dt className="text-[var(--rg-label)]">z t</dt><dd>지팡이를 쏜다 · 던진다 (고른 뒤 방향)</dd>
                        <dt className="text-[var(--rg-label)]">d</dt><dd>내려놓는다</dd>
                        <dt className="text-[var(--rg-label)]">x</dt><dd><b>도감</b> — 지금 보이는 놈과 여태 잡은 놈 (턴을 안 씁니다)</dd>
                        <dt className="text-[var(--rg-label)]">온라인</dt><dd>옵션의 「온라인 방」 — 각자 이 키를 그대로 씁니다</dd>
                        <dt className="text-[var(--rg-label)]">i m ?</dt><dd>배낭 · 기록 · 이 화면 (기록은 <b>맨 위 메시지 줄</b>을 눌러도 열립니다)</dd>
                    </dl>
                    )}
                    <div className="mt-3 space-y-1 border-t border-[var(--rg-line-soft)] pt-2 text-[var(--rg-muted)]">
                        <p className="text-[var(--rg-strong)]">
                            갑옷을 입으려면 <b>배낭</b>을 열고 갑옷을 누른 뒤 <b>「입는다」</b>를 누릅니다.
                            키보드로는 <b>W</b>.
                        </p>
                        <p><span className="text-[var(--rg-hero)]">@</span> 나 · <span className="text-[var(--rg-hero)]">†</span> 쓰러진 사람 · <span className="text-[var(--rg-monster)]">A–Z</span> 몬스터 · <span className="text-[var(--rg-gold)]">*</span> 금화 · <span className="text-[var(--rg-potion)]">!</span> 물약 · <span className="text-[var(--rg-scroll)]">?</span> 주문서</p>
                        <p><span className="text-[var(--rg-weapon)]">)</span> 무기 · <span className="text-[var(--rg-armor)]">]</span> 갑옷 · <span className="text-[var(--rg-ring)]">=</span> 반지 · <span className="text-[var(--rg-wand)]">/</span> 지팡이 · <span className="text-[var(--rg-food)]">%</span> 식량</p>
                        <p><span className="text-[var(--rg-trap)]">^</span> 함정 · <span className="text-[var(--rg-stairs)]">&gt;</span> 아래 계단 · <span className="text-[var(--rg-stairs)]">&lt;</span> 위 계단 · <span className="text-[var(--rg-door)]">+</span> 문</p>
                        <p className="pt-1 text-[var(--rg-faint)]">
                            <b className="text-[var(--rg-muted)]">명중은 서로 굴려서 겨룹니다.</b>{" "}
                            내 <span className="text-[var(--rg-muted)]">d20 + 숙련 + 힘 + 무기</span>가 상대의{" "}
                            <span className="text-[var(--rg-muted)]">d20 + 숙련</span>보다 <b>높으면</b> 맞습니다
                            (같으면 빗나갑니다). <b>20</b> 은 무조건 맞고 <b>공격력 주사위를 두 번</b> 굴리며,
                            <b>1</b> 은 무조건 빗나갑니다. 자는 놈을 치면 <b>유리</b>(두 번 굴려 높은 쪽),
                            눈이 멀거나 헷갈리면 <b>불리</b>입니다. 굴린 값은 모두 <b>기록</b>에 남습니다.
                        </p>
                        <p className="pt-1 text-[var(--rg-faint)]">
                            <b className="text-[var(--rg-muted)]">피해 = 공격력 − 상대의 방어력.</b>{" "}
                            갑옷은 <b>안 맞게 해 주는 것이 아니라 덜 아프게</b> 해 줍니다. 방어력이 더 크면{" "}
                            <b>0</b> — 갑옷에 튕깁니다. <b>여러 대를 때리는 놈은 대마다 따로 깎이므로</b>{" "}
                            좋은 갑옷이 특히 세게 듣습니다.
                        </p>
                        <p className="text-[var(--rg-faint)]">
                            <b className="text-[var(--rg-muted)]">강화 주문서로 캐릭터를 키웁니다.</b>{" "}
                            <b>무기 강화</b>와 <b>갑옷 강화</b>가 따로 있습니다. 읽으면{" "}
                            <b>배낭의 어느 것에 걸지</b>를 묻습니다. 떨어지는 물건은 <b>+3</b>{" "}
                            까지지만 <b>+5</b> 까지는 안전하게 올릴 수 있고, 그 위는 도박입니다 —{" "}
                            <b className="text-[var(--rg-trap)]">실패하면 그 물건이 부서집니다.</b>{" "}
                            성공률은 고르는 화면에 적혀 있습니다. 끝은 <b>+9</b> 입니다.
                        </p>
                        <p className="text-[var(--rg-faint)]">
                            <b className="text-[var(--rg-anvil)]">&amp;</b> 는{" "}
                            <b className="text-[var(--rg-muted)]">모루</b>입니다. 층마다 하나 있고, 그
                            칸에 서서 <b>배낭</b>을 열면 무기·갑옷에 <b>녹인다</b>가 뜹니다. 그
                            물건은 사라지고 주문서가 나옵니다 — <b>쇠붙이 몫 한 장</b>은 반드시,{" "}
                            <b>걸린 강화는 칸마다 {Math.round(MELT_RETURN * 100)}%</b> 로 돌아옵니다.
                            더 좋은 것을 주웠을 때 <b>강화를 옮겨 심는</b> 길입니다 — 다만 옮길
                            때마다 조금씩 샙니다. 화살·표창은 소모품이라 걸린 강화만 되뽑습니다.
                        </p>
                        <p className="text-[var(--rg-faint)]">
                            숨은 문은 벽과 똑같이 보입니다. 막힌 것 같으면 <b>뒤져</b> 보십시오.
                            반지는 끼고 있으면 배가 더 고픕니다.
                        </p>
                        <p className="text-[var(--rg-faint)]">
                            <b className="text-[var(--rg-muted)]">한 종을 한 마리라도 잡으면</b> 그 뒤로는 도감에서
                            레벨·방어·피해를 볼 수 있습니다. 이 도감은 <b className="text-[var(--rg-muted)]">죽어도
                            남습니다</b> — 물약의 색은 판마다 섞이지만 오크가 얼마나 단단한지는 세상의 사실입니다.
                        </p>
                        <p className="text-[var(--rg-faint)]">
                            <b className="text-[var(--rg-muted)]">위 계단으로 언제든 물러설 수 있습니다.</b> 지나온
                            층은 떠난 그대로 남아 있으니, 두고 온 물건을 가지러 돌아가도 됩니다.
                        </p>
                        <p className="text-[var(--rg-faint)]">
                            지하 26층에 옌더의 증표가 있습니다. <b className="text-[var(--rg-muted)]">1층의 계단은
                            증표가 있어야 열립니다</b> — 그것을 쥐고 밖으로 나오면 이깁니다.
                        </p>
                    </div>
                </Panel>
            )}

            {sheet === "graves" && (
                selectedTomb ? (
                    <Panel
                        title={selectedTomb.won ? "★ 탈출 기록 상세" : "† 지난 판 상세"}
                        onClose={() => setSheet("none")}
                        footer={
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTomb(null)}
                                    className="rounded-[2px] border border-[var(--rg-line-soft)] px-3 py-1 text-[var(--rg-strong)] hover:bg-[var(--rg-raised)]"
                                >
                                    ← 목록으로
                                </button>
                                <span className="text-[11px] text-[var(--rg-faint)]">
                                    {new Date(selectedTomb.at).toLocaleString()}
                                </span>
                            </div>
                        }
                    >
                        <div className="space-y-3.5 text-[13px] leading-relaxed">
                            {/* 1. 기본 판 요약 */}
                            <div className="rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-raised)] p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rg-line-soft)] pb-2">
                                    <span className={selectedTomb.won ? "font-bold text-[var(--rg-amulet)]" : "font-bold text-[var(--rg-strong)]"}>
                                        {selectedTomb.won ? "★ 옌더의 증표를 쥐고 던전을 탈출했다!" : `† ${selectedTomb.epitaph}`}
                                    </span>
                                    <span className="font-mono text-base font-bold text-[var(--rg-gold)]">
                                        {tombScore(selectedTomb)}점
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 sm:grid-cols-4 text-xs text-[var(--rg-muted)]">
                                    <div>가장 깊이: <b className="text-[var(--rg-strong)]">지하 {selectedTomb.depth}층</b></div>
                                    <div>버틴 턴: <b className="text-[var(--rg-strong)]">{selectedTomb.turns}턴</b></div>
                                    <div>소지 금화: <b className="text-[var(--rg-gold)]">{selectedTomb.gold} G</b></div>
                                    <div>결과: <b className={selectedTomb.won ? "text-[var(--rg-amulet)]" : "text-[var(--rg-strong)]"}>{selectedTomb.won ? "승리" : "사망"}</b></div>
                                </div>
                            </div>

                            {/* 2. 영웅 능력치 (Hero Stats) */}
                            {selectedTomb.hero && (
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-[var(--rg-label)]">Stats</h4>
                                        {selectedTomb.hero.origin && (
                                            <span className="text-xs font-bold text-[var(--rg-strong)]">
                                                {ORIGINS[selectedTomb.hero.origin]?.icon} {ORIGINS[selectedTomb.hero.origin]?.name} ({ORIGINS[selectedTomb.hero.origin]?.title})
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-bg)] p-2.5 text-[var(--rg-muted)]">
                                        <div>
                                            <span className="text-[var(--rg-faint)] text-[11px] block">Exp</span>
                                            <span className="text-[var(--rg-strong)] font-bold">{selectedTomb.hero.level}/{selectedTomb.hero.exp}</span>
                                        </div>
                                        <div>
                                            <span className="text-[var(--rg-faint)] text-[11px] block">Hp</span>
                                            <span className={selectedTomb.hero.hp <= 0 ? "text-[var(--rg-trap)] font-bold" : "text-[var(--rg-hero)] font-bold"}>
                                                {selectedTomb.hero.hp}({selectedTomb.hero.maxHp})
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[var(--rg-faint)] text-[11px] block">Str</span>
                                            <span className="text-[var(--rg-strong)] font-bold">{selectedTomb.hero.str}({selectedTomb.hero.maxStr})</span>
                                        </div>
                                        <div>
                                            <span className="text-[var(--rg-faint)] text-[11px] block">Arm</span>
                                            <span className="text-[var(--rg-armor)] font-bold">{10 - selectedTomb.hero.defense}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. 장착 장비 */}
                            {selectedTomb.hero && (
                                <div>
                                    <h4 className="mb-1 text-xs font-bold text-[var(--rg-label)]">장착 장비</h4>
                                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-bg)] p-2.5 text-[var(--rg-muted)] text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[var(--rg-weapon)] font-mono font-bold">)</span>
                                            <span className="text-[var(--rg-faint)]">무기:</span>
                                            <span className="text-[var(--rg-strong)] font-medium">{selectedTomb.hero.weaponName || "맨손"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[var(--rg-armor)] font-mono font-bold">]</span>
                                            <span className="text-[var(--rg-faint)]">갑옷:</span>
                                            <span className="text-[var(--rg-strong)] font-medium">{selectedTomb.hero.armorName || "맨몸"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[var(--rg-ring)] font-mono font-bold">=</span>
                                            <span className="text-[var(--rg-faint)]">왼손 반지:</span>
                                            <span className="text-[var(--rg-strong)]">{selectedTomb.hero.leftRingName || "없음"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[var(--rg-ring)] font-mono font-bold">=</span>
                                            <span className="text-[var(--rg-faint)]">오른손 반지:</span>
                                            <span className="text-[var(--rg-strong)]">{selectedTomb.hero.rightRingName || "없음"}</span>
                                        </div>
                                        {selectedTomb.hero.hasAmulet && (
                                            <div className="col-span-full flex items-center gap-1.5 pt-1 border-t border-[var(--rg-line-soft)] text-[var(--rg-amulet)]">
                                                <span className="font-mono font-bold">,</span>
                                                <span className="font-bold">옌더의 증표 소지</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 4. 소지품 배낭 (Inventory) */}
                            {selectedTomb.hero && (
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-[var(--rg-label)]">
                                            소지품 배낭 ({selectedTomb.hero.pack.length}개)
                                        </h4>
                                    </div>
                                    {selectedTomb.hero.pack.length === 0 ? (
                                        <p className="text-xs text-[var(--rg-faint)]">배낭이 비어 있었습니다.</p>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto space-y-1 rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-bg)] p-2">
                                            {selectedTomb.hero.pack.map((it, idx) => {
                                                const char = itemChar(it.kind);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between gap-2 py-0.5 border-b border-[var(--rg-line-soft)] last:border-b-0 text-xs"
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                                                            <span className="font-mono text-[var(--rg-faint)]">{it.letter ? `${it.letter})` : "·"}</span>
                                                            <span className="font-mono font-bold" style={{ color: `var(--rg-${it.kind})` }}>
                                                                {char}
                                                            </span>
                                                            <span className="text-[var(--rg-strong)] truncate">{it.name}</span>
                                                            {it.count > 1 && !it.name.includes(`${it.count}개`) && (
                                                                <span className="text-[var(--rg-faint)] font-mono">×{it.count}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {it.power && (
                                                                <span className="text-[11px] text-[var(--rg-muted)] bg-[var(--rg-raised)] px-1.5 py-0.5 rounded-[2px]">
                                                                    {it.power}
                                                                </span>
                                                            )}
                                                            {it.equipped === "weapon" && (
                                                                <span className="text-[10px] text-[var(--rg-weapon)] bg-[var(--rg-raised)] px-1.5 py-0.5 rounded-[2px] font-bold">
                                                                    장착 중
                                                                </span>
                                                            )}
                                                            {it.equipped === "armor" && (
                                                                <span className="text-[10px] text-[var(--rg-armor)] bg-[var(--rg-raised)] px-1.5 py-0.5 rounded-[2px] font-bold">
                                                                    착용 중
                                                                </span>
                                                            )}
                                                            {it.equipped === "leftRing" && (
                                                                <span className="text-[10px] text-[var(--rg-ring)] bg-[var(--rg-raised)] px-1.5 py-0.5 rounded-[2px]">
                                                                    왼손
                                                                </span>
                                                            )}
                                                            {it.equipped === "rightRing" && (
                                                                <span className="text-[10px] text-[var(--rg-ring)] bg-[var(--rg-raised)] px-1.5 py-0.5 rounded-[2px]">
                                                                    오른손
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 5. 마지막 로그 (Recent Log) */}
                            {selectedTomb.recentLog && selectedTomb.recentLog.length > 0 && (
                                <div>
                                    <h4 className="mb-1 text-xs font-bold text-[var(--rg-label)]">마지막 기록</h4>
                                    <div className="max-h-24 overflow-y-auto rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-bg)] p-2 font-mono text-[11px] leading-relaxed text-[var(--rg-faint)]">
                                        {selectedTomb.recentLog.map((logMsg, lIdx) => (
                                            <div key={lIdx} className="truncate">
                                                {logMsg}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Panel>
                ) : (
                    <Panel title="지난 판들" onClose={() => setSheet("none")}>
                        {tombs.length === 0 ? (
                            <p className="text-[var(--rg-faint)]">아직 기록이 없습니다.</p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-[var(--rg-faint)]">
                                    총 {tombs.length}판의 기록 — 원하는 판을 누르면 스탯·장비·배낭 상세를 조회할 수 있습니다.
                                </p>
                                <div className="max-h-[60vh] overflow-y-auto space-y-1.5 pr-1">
                                    {tombs.map((t, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setSelectedTomb(t)}
                                            className="w-full text-left rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-raised)] p-2.5 transition-colors hover:border-[var(--rg-line)] hover:bg-[var(--rg-hover)] focus:outline-none"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0 truncate">
                                                    <span className={t.won ? "text-[var(--rg-amulet)] font-bold text-base" : "text-[var(--rg-muted)] font-bold text-base"}>
                                                        {t.won ? "★" : "†"}
                                                    </span>
                                                    <span className="font-bold text-xs text-[var(--rg-strong)] truncate">
                                                        {t.epitaph}
                                                    </span>
                                                </div>
                                                <span className="shrink-0 font-mono text-sm font-bold text-[var(--rg-gold)]">
                                                    {tombScore(t)}점
                                                </span>
                                            </div>

                                            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[var(--rg-muted)]">
                                                {t.hero?.origin && (
                                                    <>
                                                        <span className="font-semibold text-[var(--rg-strong)]">{ORIGINS[t.hero.origin]?.icon} {ORIGINS[t.hero.origin]?.name}</span>
                                                        <span>·</span>
                                                    </>
                                                )}
                                                <span>Level: {t.depth}</span>
                                                <span>·</span>
                                                <span className="text-[var(--rg-gold)]">Gold: {t.gold}</span>
                                                <span>·</span>
                                                <span>{t.turns} turns</span>
                                                {t.hero && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="text-[var(--rg-strong)]">Hp: {t.hero.hp}({t.hero.maxHp})</span>
                                                        <span>·</span>
                                                        <span>Str: {t.hero.str}({t.hero.maxStr})</span>
                                                        <span>·</span>
                                                        <span>Arm: {10 - t.hero.defense}</span>
                                                        <span>·</span>
                                                        <span>Exp: {t.hero.level}/{t.hero.exp}</span>
                                                    </>
                                                )}
                                            </div>

                                            {t.hero && (t.hero.weaponName || t.hero.armorName) && (
                                                <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-[var(--rg-faint)]">
                                                    {t.hero.weaponName && (
                                                        <span className="rounded-[2px] bg-[var(--rg-bg)] px-1 py-0.2">
                                                            ⚔️ {t.hero.weaponName}
                                                        </span>
                                                    )}
                                                    {t.hero.armorName && (
                                                        <span className="rounded-[2px] bg-[var(--rg-bg)] px-1 py-0.2">
                                                            🛡️ {t.hero.armorName}
                                                        </span>
                                                    )}
                                                    {t.hero.hasAmulet && (
                                                        <span className="rounded-[2px] bg-[var(--rg-bg)] px-1 py-0.2 text-[var(--rg-amulet)] font-semibold">
                                                            ✨ 옌더의 증표
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="mt-1 text-right text-[10.5px] text-[var(--rg-faint)]">
                                                {new Date(t.at).toLocaleDateString()} {new Date(t.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · 상세 보기 →
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Panel>
                )
            )}

            {state.phase !== "playing" && sheet === "none" && modes.every((m) => m === "none") && (
                <Panel
                    title={state.phase === "won" ? "살아 돌아왔다" : "여기 잠들다"}
                    footer={
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={restart}
                                className="rounded-[2px] border border-[var(--rg-line)] px-3 py-1 text-[var(--rg-strong)] hover:bg-[var(--rg-raised)] font-bold"
                            >
                                새 판
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const list = graves();
                                    setTombs(list);
                                    setSelectedTomb(list[0] || null);
                                    setSheet("graves");
                                }}
                                className="rounded-[2px] border border-[var(--rg-line)] bg-[var(--rg-raised)] px-3 py-1 text-[var(--rg-strong)] hover:bg-[var(--rg-hover)]"
                            >
                                이번 판 상세 기록
                            </button>
                            <button
                                type="button"
                                onClick={() => setSheet("log")}
                                className="rounded-[2px] border border-[var(--rg-line-soft)] px-3 py-1 hover:bg-[var(--rg-raised)]"
                            >
                                기록
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTombs(graves());
                                    setSelectedTomb(null);
                                    setSheet("graves");
                                }}
                                className="rounded-[2px] border border-[var(--rg-line-soft)] px-3 py-1 hover:bg-[var(--rg-raised)]"
                            >
                                지난 판들
                            </button>
                        </div>
                    }
                >
                    <p className="mb-2 text-[var(--rg-strong)]">{state.epitaph}</p>
                    <dl className="grid grid-cols-[6em_1fr] gap-y-1 text-[var(--rg-muted)]">
                        <dt>출신</dt><dd className="text-[var(--rg-strong)] font-semibold">{ORIGINS[hero.origin ?? "knight"]?.icon} {ORIGINS[hero.origin ?? "knight"]?.name} ({ORIGINS[hero.origin ?? "knight"]?.title})</dd>
                        <dt>Level</dt><dd>지하 {state.deepest}층</dd>
                        <dt>Exp</dt><dd>{hero.level}/{hero.exp}</dd>
                        <dt>Hp</dt><dd>{hero.hp}({hero.maxHp})</dd>
                        <dt>Str</dt><dd>{heroStr(hero)}({hero.maxStr})</dd>
                        <dt>Arm</dt><dd>{heroArmor(hero)}</dd>
                        <dt>Gold</dt><dd className="text-[var(--rg-gold)]">{hero.gold}</dd>
                        <dt>Turns</dt><dd>{state.turn}</dd>
                        <dt>Score</dt><dd className="text-[var(--rg-gold)] font-bold">{score(state)}</dd>
                        <dt>Rank</dt>
                        <dd>
                            {place.total <= 1 ? (
                                "첫 판"
                            ) : place.place === 1 && !place.shared ? (
                                <span className="text-[var(--rg-amulet)]">
                                    {place.total}판 중 1등 — 최고 기록!
                                </span>
                            ) : place.place === 1 ? (
                                <>{place.total}판 중 공동 1등</>
                            ) : (
                                <>
                                    {place.total}판 중 {place.place}등{" "}
                                    <span className="text-[var(--rg-faint)]">(최고 {place.best})</span>
                                </>
                            )}
                        </dd>
                    </dl>
                </Panel>
            )}
        </div>
    );
}
