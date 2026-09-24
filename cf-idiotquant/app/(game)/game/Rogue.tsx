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

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";

import {
    type BestiaryRow,
    type Command,
    type Sighting,
    NICK_MAX,
    bestiaryProgress,
    bestiaryRows,
    cleanNick,
    enchantTarget,
    joinGame,
    leaveGame,
    newGame,
    perform,
    score,
    setNick,
    standing,
    survey,
    setChest,
    tombScore,
} from "@/lib/rogue/game";
import {
    ARMORS,
    ENCHANT_MAX,
    CHEST_SLOTS,
    MELT_RETURN,
    POTIONS,
    RING_EFFECTS,
    RINGS,
    SCROLLS,
    WANDS,
    WEAPONS,
    defenseOf,
    isThrowable,
    itemChar,
    itemDepthRange,
    makeItem,
    weaponSkillOf,
} from "@/lib/rogue/items";
import {
    type CodexCategory,
    type CodexEntry,
    CODEX_ENTRIES,
    itemCodexProgress,
    itemCodexStage,
    itemCodexStats,
} from "@/lib/rogue/codexData";
import { DETAIL, isDetail } from "@/lib/rogue/combat";
import { SKILL_PICK_INTERVAL, heroArmor, heroArmorClass, heroStr, hungerOf, weaponSkillLevel, weaponSkillMax, weaponSkillName, weaponSkillRankName, wornRings } from "@/lib/rogue/hero";
import {
    bury,
    clear,
    graves,
    load,
    loadBestiary,
    loadItemCodex,
    loadChest,
    loadItemUsage,
    loadSpecials,
    deserialize,
    save,
    saveBestiary,
    saveItemCodex,
    saveChest,
    saveItemUsage,
    saveSpecials,
    serialize,
    type Tomb,
    type TombHero,
    type TombItem,
} from "@/lib/rogue/storage";
import { T, idx, type GameState, type Item, type ItemKind } from "@/lib/rogue/types";
import { ADVANCE_LEVEL, ORIGINS, ORIGIN_LIST, WEAPON_SKILL_MAX, type HeroOrigin } from "@/lib/rogue/origins";
import { sharedRun, sharedRunUrl } from "@/lib/rogue/share";

import Desk, { type DeskHandle, type DeskMode } from "./components/Desk";
import MapView, { PARTY_BG, PARTY_INK, type CellFlash, type Reveal } from "./components/MapView";
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

/** 기록 한 줄 — 협동의 앞머리를 그 사람 색으로 칠하고, 이름이 있으면 `1P` 대신 쓴다. */
/**
 * 계산 줄 한 줄 — **엔진이 적은 것을 표지에서 접어 보여 준다.**
 *
 * 기록에 이렇게 한 줄로 들어온다:
 *
 * ```
 * · 명중 나 13(d20 굴림) +2(숙련) +3(힘) +2(진은검) = 20(명중)  vs  트롤 7(d20 굴림) +3(숙련) = 10(회피)  → 맞았다
 * ```
 *
 * 390px 에서는 이것이 석 줄로 접히는데, **어디가 내 굴림이고 어디가 상대 것인지**가
 * 글자 사이에 묻힌다. 그래서 엔진이 이미 쓰고 있는 표지(`  vs  ` · `  → ` · `  = ` ·
 * ` · `)에서 갈라 **표지를 왼쪽 칸에 세우고** 값을 오른쪽에 붙인다.
 * 표지는 **앞에 두 칸**이 붙는다 — 뒤는 한 칸일 때도 있다(`  → 맞았다`):
 *
 * ```
 * 명중  나 13(d20 굴림) +2(숙련) +3(힘) +2(진은검) = 20(명중)
 *  vs   트롤 7(d20 굴림) +3(숙련) = 10(회피)
 *  →    맞았다
 * ```
 *
 * **화면이 셈을 다시 하지 않는다**(못 박은 규칙 1). 숫자는 한 자도 안 만들고 안 고친다 —
 * 엔진이 적은 글을 그 문법대로 자를 뿐이다. 표지의 **양옆 두 칸**이 곧 그 문법이라,
 * 한 칸짜리(` = 20` 처럼 한 항 안에서 쓰는 등호)는 안 걸린다.
 */
function Roll({ text }: { text: string }) {
    const body = text.slice(DETAIL.length);
    const head = body.slice(0, body.indexOf(" "));
    const rest = body.slice(head.length + 1);
    // 표지를 남기며 자른다 — `[값, 표지, 값, 표지, 값 …]`
    const parts = rest.split(/ {2}(vs|→|=) +| (·) /).filter((x) => x !== undefined && x !== "");
    const rows: { mark: string; text: string }[] = [{ mark: head, text: parts[0] ?? "" }];
    for (let i = 1; i < parts.length; i += 2) rows.push({ mark: parts[i], text: parts[i + 1] ?? "" });
    return (
        <span className="grid grid-cols-[2.6em_1fr] gap-x-1">
            {rows.map((r, i) => (
                <Fragment key={i}>
                    <span className={i === 0 ? "text-right font-bold text-[var(--rg-label)]" : "text-right text-[var(--rg-faint)]"}>
                        {r.mark}
                    </span>
                    {/* 마지막 줄이 **결과**다 — 한 톤 밝게 둬서 눈이 거기서 멈춘다. */}
                    <span className={i === rows.length - 1 && rows.length > 1 ? "text-[var(--rg-text)]" : ""}>
                        {r.text}
                    </span>
                </Fragment>
            ))}
        </span>
    );
}

function Msg({ text, heroes }: { text: string; heroes: GameState["heroes"] }) {
    // 계산 줄에는 협동 앞머리가 안 붙는다(`game.say`) — 그래서 먼저 걸러도 안전하다.
    if (isDetail(text)) return <Roll text={text} />;
    const turn = /^(T:\d+ )/.exec(text);
    const body = turn ? text.slice(turn[0].length) : text;
    // 엔진은 저장·협동 동기화가 흔들리지 않도록 `1P`라는 붙박이 표식을 남긴다. 화면만
    // 그 표식을 이름으로 읽는다 — 이름을 바꿔도 지난 기록과 네트워크 판의 문법은 같다.
    // `▸`는 행동한 사람, 없는 것은 허기처럼 그 사람의 상태가 바뀐 기록이다.
    const m = /^([1-4])P(▸)? /.exec(body);
    if (!m) return <>{text}</>;
    const who = Number(m[1]) - 1;
    const label = heroes[who]?.nick ?? `${m[1]}P`;
    return (
        <>
            {turn?.[1]}
            <span className="font-bold" style={{ color: PARTY_INK[who] }}>
                {label}{m[2] ?? ""}
            </span>{" "}
            {body.slice(m[0].length)}
        </>
    );
}

/**
 * 직업 표 — **지도의 물건 글자를 그 물건 색으로** 세운다(`]` 갑옷 · `)` 무기 · `!` 포션 ·
 * `?` 주문서). 이름과 표를 여러 화면이 함께 쓰므로 한 자리에서 그린다.
 */
function OriginTag({
    origin,
    nick,
    title = false,
    level,
}: {
    origin?: HeroOrigin;
    nick?: string;
    title?: boolean;
    /** 전직(`ADVANCE_LEVEL`) 여부를 가른다. 없으면 늘 기본 이름 — 방 만들기·손님 화면처럼
        레벨이 아직 뜻이 없는 자리에서 쓴다. */
    level?: number;
}) {
    const o = ORIGINS[origin ?? "knight"];
    if (!o) return null;
    const advanced = (level ?? 0) >= ADVANCE_LEVEL;
    return (
        <>
            {/* **이름이 있으면 직업 앞에 선다.** 직업만 적힌 화면에서는 「누구의 근위대인가」가
                안 보인다 — 지도·상태 줄에서 이름으로 찾아 놓고 여기서 못 찾으면 헛걸음이다.
                혼자 한 판에는 이름이 없어 이 자리가 통째로 빈다(예전 그대로). */}
            {nick && <span className="font-bold">{nick} · </span>}
            <span className="font-[family-name:var(--font-plex-mono)] font-bold" style={{ color: o.iconInk }}>
                {o.icon}
            </span>{" "}
            {advanced ? o.advancedName : o.name}
            {title && <span className="text-[var(--rg-faint)]"> ({advanced ? o.advancedTitle : o.title})</span>}
        </>
    );
}

/** 상대 책상의 이름 — 온라인에서 상대 줄에 붙는다. */
const DESK_DOING: Record<DeskMode, string> = { none: "", pack: "배낭 보는 중", picker: "고르는 중", aim: "겨누는 중" };

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
/** 불 켜진 방이 밝아지는 속도 — 한 겹에 이만큼. 열두 칸짜리 방이 반 초쯤 걸린다. */
const REVEAL_STEP = 40;

const PEER_PREFIX = "idiotquant-rogue-";
/** 들어 있던 방 — 새로고침해도 다시 잇는다. */
const ROOM_KEY = "rogue-room";
/** 지도에 적을 이름 — **판이 아니라 그 사람의 것**이라 저장 판과 따로 둔다. */
const NICK_KEY = "rogue-nick";
const RETRY_MS = 3000;

/**
 * 그 방에서 **이미 고른 직업** — 없으면 아직 안 골랐다.
 *
 * 고르기는 한 번이면 된다. 그런데 끊겨서 다시 잇는 길도 `joinRoom` 을 지나고, 그때
 * 넘어오는 `origin` 은 **처음 붙을 때의 값**이라 비어 있다(그 사이에 골랐으므로).
 * 그래서 「고를 것인가」는 클로저가 아니라 **적어 둔 것**을 봐야 한다 — 안 그러면
 * 끊길 때마다 고르기 창이 다시 뜬다.
 *
 * 방 코드가 다르면 안 쓴다 — 나갔다 다른 방에 들어간 사람에게 옛 직업을 먹이면 안 된다.
 */
function savedOrigin(code: string): HeroOrigin | undefined {
    try {
        const r = JSON.parse(localStorage.getItem(ROOM_KEY) ?? "null");
        if (!r || r.code !== code || typeof r.origin !== "string") return undefined;
        return r.origin in ORIGINS ? (r.origin as HeroOrigin) : undefined;
    } catch {
        return undefined;
    }
}

/** 기억해 둔 이름. 없거나 못 읽으면 빈 값. */
function savedNick(): string | undefined {
    try {
        return cleanNick(localStorage.getItem(NICK_KEY));
    } catch {
        return undefined;
    }
}

/**
 * 이름을 묻는다 — **온라인에 들어설 때만.** 혼자 하는 판은 이름이 필요 없다(`@` 그대로).
 *
 * `ask` 가 거짓이면 기억해 둔 것을 그대로 쓴다 — 초대 링크로 들어온 사람에게 창이 먼저
 * 뜨는 것을 막는다. 취소하면 `undefined`, 그러면 이름표 없이 `@` 로 논다.
 */
function askNick(ask = true): string | undefined {
    const had = savedNick();
    if (!ask && had) return had;
    const typed = window.prompt(`지도에 적을 이름 (한글·영문·숫자·기호, ${NICK_MAX}칸)`, had ?? "");
    if (typed === null) return had;
    const nick = cleanNick(typed);
    try {
        if (nick) localStorage.setItem(NICK_KEY, nick);
        else localStorage.removeItem(NICK_KEY);
    } catch { }
    return nick;
}

/**
 * 온라인에서 오가는 말. **방장이 순서를 정한다** — 손님의 명령도 방장에게 갔다가
 * 방장이 적용한 순서대로 되돌아온다. 엔진이 결정적이라 같은 판에 같은 순서면 같은 판이다
 * (`test/rogue-coop.test.ts`).
 *
 * **방장은 이제 손님을 여럿(`MAX_PARTY - 1`) 받는다.** 그래서 방장이 보내는 것은 전부
 * **모든 이어진 손님에게 뿌린다**(`broadcast`) — 예전에는 손님이 하나라 「보낸다」와
 * 「그 사람에게 보낸다」가 같은 말이었다.
 */
type NetMsg =
    | { t: "init"; state: string }
    | { t: "cmd"; cmd: Command }
    // 손님이 이으면 먼저 제 출신과 이름을 알린다 — 방장이 그 직업으로 동료를 세운다.
    // **이름은 믿고 그리는 값이 아니다** — 받는 쪽이 `cleanNick` 으로 다시 다듬는다.
    // 상자도 같이 보낸다 — **손님의 상자는 손님 브라우저의 것**이라 방장이 알 길이 없다.
    // **자리표(`guestKey`)도 같이 보낸다** — 방장이 이 값으로 「돌아온 그 사람」을 고른다.
    | { t: "hello"; origin: HeroOrigin; nick?: string; chest?: Item[]; guestKey: string }
    // **아직 안 골랐다** — 방장이 지금 누구누구인지부터 묻는다. 이게 있어야 손님이
    // **보고** 고를 수 있다. 이 말로는 판에 들어가지 않는다(자리도 안 차지한다).
    | { t: "peek" }
    // 그 답 — **지금 판에 있는 모두**(방장 + 이미 들어온 손님들)의 출신·이름.
    // 판을 통째로 보내지 않는 까닭은, 아직 손님이 아니기 때문이다.
    | { t: "room"; party: { origin: HeroOrigin; nick?: string }[] }
    // **나간다는 인사.** 이것 없이 끊기면 사고(망 끊김)로 보고 자리를 지켜 기다린다.
    | { t: "bye" }
    // **방장이 내보냈다.** `bye` 와 갈라 둔다 — 손님 화면에 적는 까닭이 다르고,
    // 이쪽은 **그 손님을 다시 안 받는다**(`banned`).
    | { t: "kick" }
    // **방이 이미 찼다** — 정원(`MAX_PARTY`)을 넘겨 붙은 손님에게 보낸다. 자리도 안 주고
    // 곧바로 끊는다.
    | { t: "full" }
    // 살아 있다는 신호. WebRTC 는 상대가 창을 닫아도 한참 「열림」으로 남는다.
    | { t: "ping" }
    // 게임 오버 뒤 다음 판의 직업을 다시 고른다. 방장이 `round`를 열고, 손님은 같은
    // 번호에 자기 선택만 돌려 보낸다 — 늦게 온 지난 선택이 다음 판에 섞이지 않는다.
    | { t: "rematch"; round: number; origin?: HeroOrigin; party?: { origin: HeroOrigin; nick?: string }[] }
    // 내 책상에 무엇이 떠 있나 — 상대 화면이 「2P 배낭 보는 중」을 적는다. `who` 없이
    // 오면 방장이 보낸 것이다(방장은 자신의 `heroes` 칸 번호를 모르는 사람이 없다).
    | { t: "ui"; mode: DeskMode; who?: number };

/** 온라인 방의 정원 — 방장 + 손님 셋. */
const MAX_PARTY = 4;

/**
 * 이 브라우저의 **붙박이 손님 자리표.** 한 번 만들면 계속 쓴다(`localStorage`).
 *
 * 손님이 하나뿐이던 시절에는 「대기석에 있으면 그 사람」으로 충분했다. 손님이 여럿이면
 * **누가 돌아왔는지**를 가려야 하고, 이 값이 그 열쇠다 — 방장은 이 값으로 `state.benched`
 * 를 뒤진다(`joinGame`). 방마다 다를 필요는 없다: 어느 방이든 「이 브라우저」는 하나다.
 */
const GUEST_KEY = "rogue-guest-key";
function guestKey(): string {
    try {
        const had = localStorage.getItem(GUEST_KEY);
        if (had) return had;
        const fresh = crypto.randomUUID();
        localStorage.setItem(GUEST_KEY, fresh);
        return fresh;
    } catch {
        // 저장을 못 쓰면(시크릿 창 등) 이 세션 동안만 쓰는 값 — 재접속 재세우기는 못 하지만
        // 판 자체는 돈다.
        return crypto.randomUUID();
    }
}

/**
 * 연결이 살아 있는지 본다 — **말이 끊긴 지 `DEAD_MS` 가 지나면 닫는다.** 닫히면 양쪽의
 * `close` 처리(방장은 기다리기, 손님은 다시 잇기)가 그대로 돈다. 이게 없으면 방장이 창을
 * 닫았다 열었을 때 손님은 죽은 연결을 쥔 채 영영 다시 잇지 않는다.
 */
const PING_MS = 2000;
const DEAD_MS = 6000;
function watchConn(conn: DataConnection) {
    let last = Date.now();
    conn.on("data", () => {
        last = Date.now();
    });
    const t = setInterval(() => {
        if (Date.now() - last > DEAD_MS) {
            clearInterval(t);
            conn.close();
            return;
        }
        if (conn.open) conn.send({ t: "ping" } satisfies NetMsg);
    }, PING_MS);
    conn.on("close", () => clearInterval(t));
}

/** 판을 넘어 남는 기록 둘을 합칠 때 쓴다 — **칸마다 큰 쪽**을 남긴다. */
function higher(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
    const out = { ...a };
    for (const [ch, n] of Object.entries(b)) out[ch] = Math.max(out[ch] ?? 0, n);
    return out;
}

export default function Rogue() {
    const [state, setState] = useState<GameState | null>(null);
    const [sheet, setSheet] = useState<
        "none" | "log" | "help" | "graves" | "options" | "bestiary" | "origins" | "status"
    >("none");
    const [statusKind, setStatusKind] = useState<"origin" | "str" | "defense" | "wisdom" | "hunger" | "dlvl" | "gold" | "xp" | "turn">("origin");
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
    const [seedLinkNote, setSeedLinkNote] = useState<string | null>(null);
    // 복사는 끝난 일이다 — 확인할 시간만 남기고 지도 위 안내는 저절로 걷는다.
    useEffect(() => {
        if (!seedLinkNote) return;
        const timer = setTimeout(() => setSeedLinkNote(null), 2600);
        return () => clearTimeout(timer);
    }, [seedLinkNote]);
    const buried = useRef(false);

    /** 키를 누르고 있는 동안의 이동 반복 — 판이 바뀌면 반드시 같이 멈춘다. */
    const holds = useRef<({ code: string; timer: ReturnType<typeof setTimeout> } | null)[]>([]);
    const stopHold = useCallback((w: number) => {
        const h = holds.current[w];
        if (h) clearTimeout(h.timer);
        holds.current[w] = null;
    }, []);
    const stopAllHolds = useCallback(() => holds.current.forEach((_, w) => stopHold(w)), [stopHold]);
    useEffect(() => stopAllHolds, [stopAllHolds]);
    // 새 판을 고르는 동안에도 물리 키는 눌린 채일 수 있다. 그 키는 한 번 뗄 때까지 새 판에 안 보낸다.
    const heldDirections = useRef(new Set<string>());
    const ignoredDirections = useRef(new Set<string>());
    const ignoreHeldDirections = useCallback(() => {
        ignoredDirections.current = new Set(heldDirections.current);
    }, []);

    /** 전투 피드백 & 특수 효과 연출 상태 (P6 - 칸 내 색상 점멸) */
    /**
     * 불 켜진 방에 **처음 들어설 때** 빛이 퍼지는 중.
     *
     * 「이 방은 왜 통째로 보이고 저 방은 한 칸씩인가」를 글로 적는 대신 **눈에 보이게** 한다 —
     * 선 자리에서 한 겹씩 밝아지면 「횃불이 켜져 있다」가 저절로 읽힌다. 화면의 연출이라
     * 판에는 없고, 방마다 **한 번만** 돈다(`litRooms`).
     */
    const [reveal, setReveal] = useState<Reveal | null>(null);
    const litRooms = useRef(new Set<string>());
    const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (revealTimer.current) clearTimeout(revealTimer.current);
    }, []);

    const [cellFlashes, setCellFlashes] = useState<Record<string, CellFlash>>({});
    const [projectileCells, setProjectileCells] = useState<{ x: number; y: number; ch: string }[]>([]);
    /** 원작처럼 투사체가 지나가는 동안에는 다음 명령을 받지 않는다. */
    const projectilePlaying = useRef(false);
    const [shake, setShake] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [advanceBanner, setAdvanceBanner] = useState<HeroOrigin | null>(null);
    const lastStateRef = useRef<{
        /** **사람마다** 든다 — 한 사람 것만 보면 동료가 맞아도 낫아도 화면이 가만히 있다. */
        heroes: { hp: number; gold: number; exp: number; level: number }[];
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
        // 공유 링크는 저장된 판보다 먼저다. 링크를 열었는데 내 지난 판이 뜨면 같은 던전을
        // 같이 보자는 약속이 깨진다. 주소는 한 번 읽고 지워 새로고침마다 새 판을 만들지 않는다.
        const shared = sharedRun(location.search);
        if (shared) {
            history.replaceState(null, "", location.pathname);
            setState(newGame(shared.seed, kept, knownSpecials, keptCodex, keptUsage, shared.origin, loadChest(0)));
            return;
        }
        const saved = load();
        if (saved && saved.phase === "playing") {
            // 저장된 판과 저장소의 도감 중 **큰 쪽**을 남긴다. 판을 띄워 둔 채 다른
            // 탭에서 한 판을 더 돌았을 수 있고, 그때 잡은 것을 잃으면 안 된다.
            saved.bestiary = higher(saved.bestiary, kept);
            saved.specials = higher(saved.specials, knownSpecials);
            saved.itemCodex = { ...keptCodex, ...(saved.itemCodex ?? {}) };
            saved.itemUsage = higher(saved.itemUsage ?? {}, keptUsage);
            // **상자는 판이 아니라 그 사람의 것이다.** 저장된 판에도 한 벌이 들어 있지만,
            // 그 사이에 같은 브라우저로 남의 방에 손님으로 들어가 맡겼을 수 있다 — 그쪽이
            // 더 나중이다. 두 벌을 화해시키는 규칙은 하나다: **저장소가 참이다.**
            setState(setChest(saved, 0, loadChest(0)));
            return;
        }
        setState(newGame(undefined, kept, knownSpecials, keptCodex, keptUsage, undefined, loadChest(0)));
    }, []);

    useEffect(() => {
        if (!state) return;
        // 도감은 **판과 따로** 적는다 — 죽어서 판이 지워져도 남아야 한다.
        saveBestiary(state.bestiary);
        saveSpecials(state.specials);
        saveItemCodex(state.itemCodex);
        saveItemUsage(state.itemUsage);
        // ── 캠프 상자 — **제 몫만 적는다.**
        //
        // 상자는 판의 것이 아니라 **그 사람의 것**이라, 판을 저장하느냐와 따로 간다.
        // 그래서 아래의 「손님은 판을 안 적는다」보다 **먼저** 선다 — 손님도 제 상자는
        // 적어야 한다. 누가 무엇을 적는지는 셋뿐이다:
        //
        //   · 손님  → 제 브라우저의 **0번**에. 판에서는 `heroes[who]`(정원이 늘며 1번이라고
        //             못 박을 수 없어졌다 — `who` 로 제 칸을 찾는다)지만 제 브라우저에서는
        //             「나」다. 방장일 때와 손님일 때 딴 상자가 열리면 상자가 둘인 것이다.
        //   · 방장  → 제 **0번**. 온라인 손님들의 자리는 **안 적는다** — 그 상자는 그
        //             손님 브라우저의 것이고, 여기 적으면 방장의 것을 손님 것으로 덮는다.
        //   · 한 화면 둘 → 방장의 0번과 곁의 사람의 **1번**. 한 브라우저에 두 사람이므로
        //             한 칸에 담으면 둘의 상자가 한 벌이 된다.
        if (online === "guest") {
            if (state.heroes[who]) saveChest(0, state.heroes[who].chest);
        } else {
            saveChest(0, state.heroes[0].chest);
            if (!online && state.heroes[1]) saveChest(1, state.heroes[1].chest);
        }
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

    // 원작은 한 글자를 한 칸씩 옮기고, 지난 칸을 바로 원래 바닥으로 되돌렸다. 엔진이
    // 남긴 궤적을 화면에서만 재생한다 — 시간이나 피해는 여기서 계산하지 않는다.
    useEffect(() => {
        const shot = state?.projectile;
        if (!shot || shot.cells.length === 0) return;
        projectilePlaying.current = true;
        // 한 칸을 눈으로 따라갈 수 있어야 한다. 16ms는 브라우저가 여러 칸을 한 번에
        // 그려 투사체가 순간이동하는 것처럼 보일 수 있다.
        const PROJECTILE_STEP_MS = 45;
        let shown = 0;
        let tail: ReturnType<typeof setTimeout> | null = null;
        setProjectileCells([shot.cells[shown++]!]);
        const timer = setInterval(() => {
            if (shown >= shot.cells.length) {
                clearInterval(timer);
                tail = setTimeout(() => {
                    setProjectileCells([]);
                    projectilePlaying.current = false;
                }, 16);
                return;
            }
            // 누적하지 않는다. 원작 터미널도 이 한 칸만 그리고 직전 칸은 곧바로 지웠다.
            setProjectileCells([shot.cells[shown++]!]);
        }, PROJECTILE_STEP_MS);
        return () => {
            clearInterval(timer);
            if (tail) clearTimeout(tail);
            projectilePlaying.current = false;
        };
    }, [state?.projectile?.id]);

    // ── 전투 피드백 & 특수 효과 추적 (P6 - 절제된 칸 내 색상 점멸) ──────────────────────────
    useEffect(() => {
        if (!state) return;
        const prev = lastStateRef.current;
        const curr = {
            heroes: state.heroes.map((h) => ({ hp: h.hp, gold: h.gold, exp: h.exp, level: h.level })),
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
        const advanced = state.heroes.find((h, i) => (prev.heroes[i]?.level ?? h.level) < ADVANCE_LEVEL && h.level >= ADVANCE_LEVEL);
        if (advanced) {
            setAdvanceBanner(advanced.origin ?? "knight");
            setTimeout(() => setAdvanceBanner(null), 3000);
        }

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

        // 4. 영웅 체력 변동 (피격 / 치유 — 그 사람 칸 플래시)
        //
        // **사람마다 본다.** 예전에는 `heroes[0]` 하나만 봤고, 그래서 협동에서 **동료가
        // 맞아도 나아도 화면이 가만히 있었다** — 2P 쪽에서는 무슨 일이 난 건지 기록 줄을
        // 읽어야만 알 수 있었다. 흔드는 것(`shake`)은 화면 전체의 것이라 누구의 일이든 한 번이다.
        for (let i = 0; i < state.heroes.length; i++) {
            const h = state.heroes[i];
            const was = prev.heroes[i];
            if (!was || h.x < 0) continue;
            const hpDiff = h.hp - was.hp;
            const heroKey = `${h.x},${h.y}`;
            if (hpDiff < 0) {
                const isHeavyHit = Math.abs(hpDiff) >= Math.max(6, Math.floor(h.maxHp * 0.3));
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
            if (h.origin === "knight" && h.level >= ADVANCE_LEVEL && was.hp > h.maxHp / 2 && h.hp <= h.maxHp / 2) {
                flashes[heroKey] = { ink: "var(--rg-armor)", bg: "rgba(234, 179, 8, 0.25)" };
            }
            if (newMsgs.some((m) => m.includes("연막")) && h.origin === "rogue") {
                flashes[heroKey] = { ink: "var(--rg-faint)", bg: "rgba(100, 116, 139, 0.3)" };
            } else if (newMsgs.some((m) => m.includes("비전 통찰")) && h.origin === "scholar") {
                flashes[heroKey] = { ink: "var(--rg-scroll)", bg: "rgba(168, 85, 247, 0.25)" };
            }
        }

        if (hasPhoenixMsg) {
            triggerShake = true;
            // 깃털은 **살아난 사람** 칸에서 탄다 — 그 턴에 체력이 최대로 찬 사람이다.
            const rose = state.heroes.find((h, i) => (prev.heroes[i]?.hp ?? 1) <= 0 && h.hp > 0) ?? state.heroes[0];
            flashes[`${rose.x},${rose.y}`] = { ink: "var(--rg-trap)", bg: "rgba(239, 68, 68, 0.35)" };
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

    /**
     * **남의 눈을 빌린다** — 지도가 따라가는 영웅. `null` 이면 내가 조종하는 사람(`who`)이다.
     *
     * `who` 와 **갈라 두는 까닭은 하나**다: 쓰러졌을 때 옮기는 것은 **시점뿐이고 조종은
     * 절대 안 옮긴다.** 한 값으로 묶으면 온라인에서 방장이 손님의 영웅을 움직이게 되고,
     * 그건 협동이 아니라 대리 조종이다. 한 화면 둘이서는 이름표가 조종째 넘기므로
     * (`setWho`) 이 칸을 안 쓴다 — 거기서는 넘기는 것이 곧 옳다.
     */
    const [view, setView] = useState<number | null>(null);

    /** 온라인이면 내 자리와 방 코드. 연결은 `net` 에 든다 — 화면이 다시 그려질 까닭이 아니다. */
    const [online, setOnline] = useState<"host" | "guest" | null>(null);
    const [room, setRoom] = useState<string | null>(null);
    /**
     * **지금 방에 있는 사람들의 출신·이름** — 손님이 제 것을 고르기 전에 본다.
     * 방장이 맨 앞이다.
     *
     * 고르는 줄에 「다른 쪽을 고르면 서로 메웁니다」라고 적어 놓고 정작 **누가 무엇인지는
     * 안 보여 주고 있었다.** 알 길이 붙기 전까지는 그 한 줄이 조언이 아니라 수수께끼다.
     * 손님이 하나뿐이던 시절에는 방장 혼자였지만, 정원이 늘며 **이미 들어온 손님들**도
     * 같이 보여야 한다 — 셋째로 들어오는 사람은 방장뿐 아니라 먼저 온 둘도 보고 고른다.
     */
    const [roomParty, setRoomParty] = useState<{ origin: HeroOrigin; nick?: string }[]>([]);
    /** 지금 상대와 이어져 있는가 — 끊겨도 방(`online`·`room`)은 남는다. 방장은 **손님이 하나라도** 있으면 참이다. */
    const [linked, setLinked] = useState(false);
    /**
     * 방장이 보는 **손님 명부** — 몇째 자리인지 · 자리표 · 이름 · 출신 · 지금 이어져
     * 있는지. 내보내기 단추(사람마다 하나)와 「몇 명 접속」 안내가 이것을 읽는다.
     *
     * `state.heroes` 에서 뽑아낼 수 있는 값(`nick`·`origin`)과 `net` 의 연결 여부를
     * 합친 것이라, 화면이 다시 그려질 자리(state)가 아니면 굳이 하나 더 둘 필요가
     * 없었을 것이다 — 그런데 `net` 은 `ref` 라 그것만으로는 다시 안 그려진다. 그래서
     * 손님이 붙고 떠날 때마다 `syncGuests` 가 이 칸을 **직접** 채운다.
     */
    const [guests, setGuests] = useState<{ who: number; nick?: string; origin?: HeroOrigin; linked: boolean }[]>([]);
    /** 우상단 단추를 눌러 안내를 펼쳤는가 — **지도를 가리는 것은 이때뿐**이다. */
    const [netOpen, setNetOpen] = useState(false);
    /** 좌상단 「성장」 단추를 눌러 펼쳤는가 — 끊김 안내와 같은 자리다(모서리 한 칸). */
    const [skillOpen, setSkillOpen] = useState(false);
    const [altarOpen, setAltarOpen] = useState(false);
    /**
     * 내보낸 손님들의 **자리표**(`guestKey`) — 이 방이 열려 있는 동안 다시 안 받는다.
     *
     * 이게 없으면 내보내도 그 사람이 곧바로 다시 붙어서, 내보낸 것이 아니라 잠깐 끊은
     * 것이 된다. 방을 닫으면(`closeRoom`) 피어가 통째로 사라지므로 명부도 같이 간다.
     *
     * **피어 id 가 아니라 자리표로 막는다.** 피어 id 는 접속마다 새로 뽑는 값이라
     * (`joinRoom` 이 `new Peer()` 를 매번 새로 만든다), 그것으로 막으면 창을 닫았다 다시
     * 열기만 해도 도로 들어온다. 자리표는 그 브라우저가 계속 쓰는 값이라 안 새어 나간다.
     */
    const banned = useRef<Set<string>>(new Set());
    // 다시 이어지면 접어 둔다. 안 그러면 다음에 끊겼을 때 **묻지도 않고 펼쳐진 채로** 뜬다.
    useEffect(() => {
        if (linked) setNetOpen(false);
    }, [linked]);
    /**
     * 이어진 곳 — **방장은 여럿(정원까지), 손님은 하나(방장)뿐이다.**
     *
     * 손님 쪽은 예전 그대로(`conn` 한 칸)다. 방장 쪽만 `guests` 로 늘었다 — 이어진 손님의
     * `DataConnection` 마다 그 사람의 **자리표**(`guestKey`)를 적어 둔다. `who`(그 사람이
     * `heroes` 의 몇 번인가)는 안 적는다 — 가운데 자리가 빠지면 뒤엣사람들이 밀리므로
     * (`leaveGame`), 굳이 캐시해 두면 매번 다시 맞춰야 한다. 필요할 때
     * `state.heroes.findIndex(h => h.guestKey === key)` 로 그때그때 찾는다.
     */
    const net = useRef<
        | { role: "host"; peer: Peer; guests: Map<DataConnection, string> }
        | { role: "guest"; peer: Peer; conn?: DataConnection }
        | null
    >(null);
    /** 이미 열린 다음 판에 아직 합류하지 않은 손님들의 직업 선택. */
    const rematch = useRef<{
        round: number;
        hostOrigin: HeroOrigin;
        picks: Map<string, HeroOrigin>;
        guests: { guestKey: string; nick?: string; chest?: Item[] }[];
    } | null>(null);
    const rematchRound = useRef(0);
    /** 내 선택을 이미 보낸 라운드는, 다른 사람이 고른 뒤 온 현황 갱신으로 다시 열지 않는다. */
    const rematchPicked = useRef<number | null>(null);
    const stateRef = useRef(state);
    stateRef.current = state;
    useEffect(() => () => net.current?.peer.destroy(), []);

    /** 방장이 지금 판의 누가 몇 번인지를 손님 명부에 다시 맞춘다 — 붙고 떠날 때마다 부른다. */
    const syncGuests = useCallback((s: GameState) => {
        const n = net.current;
        const liveKeys = new Set(n?.role === "host" ? [...n.guests.values()] : []);
        const rows = s.heroes.slice(1).map((h, i) => ({
            who: i + 1,
            nick: h.nick,
            origin: h.origin,
            linked: !!h.guestKey && liveKeys.has(h.guestKey),
        }));
        setGuests(rows);
        setLinked(rows.some((g) => g.linked));
    }, []);

    /** 이어진 곳 모두에게 뿌린다 — 방장은 손님 전부에게, 손님은 방장 하나에게. */
    const broadcast = useCallback((msg: NetMsg) => {
        const n = net.current;
        if (!n) return;
        if (n.role === "guest") {
            if (n.conn?.open) n.conn.send(msg);
            return;
        }
        for (const conn of n.guests.keys()) if (conn.open) conn.send(msg);
    }, []);

    /**
     * 명령이 판에 닿는 **유일한 길**. 키보드·단추·네트워크 모두 여기로 온다.
     * 손님은 적용하지 않고 방장에게 보낸다 — 방장이 되돌려 준 것만 적용한다.
     */
    /**
     * **판이 멈추는가 — 멈추는 것은 손님뿐이다.**
     *
     * 손님은 제 화면에서 판을 굴릴 수 없다(굴리면 방장의 판과 갈린다). 방장은 **판의
     * 주인**이라 손님이 끊긴 동안에도 계속 논다 — 방장이 멈추면 방을 열어 둔 채 기다리는
     * 동안 아무것도 못 하고, 그건 방을 연 값이 아니다. 손님이 돌아오면 **그때의 판을
     * 통째로 받아 간다**(`hello` → `init`), 그래서 그 사이의 걸음은 따로 세지 않아도 된다.
     */
    const frozen = online === "guest" && !linked;
    const frozenRef = useRef(frozen);
    frozenRef.current = frozen;

    const dispatchCmd = useCallback(
        (cmd: Command) => {
            // 단추 판도 키와 같이 막는다.
            if (frozenRef.current || projectilePlaying.current) return;
            if (online === "guest") {
                // 끊긴 동안 누른 것은 버린다 — 다시 이어지면 방장의 판을 통째로 받는다.
                broadcast({ t: "cmd", cmd });
                return;
            }
            setState((s) => (s ? perform(s, cmd) : s));
            // **손님 전부에게** 뿌린다 — 방장의 걸음도 다른 손님들의 지도를 움직인다.
            if (online === "host") broadcast({ t: "cmd", cmd });
        },
        [online, linked, broadcast],
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

    /**
     * 방을 **스스로** 나간다(또는 상대가 나간다고 알려 왔다).
     *
     * 상대에게 `bye` 를 보내고 판을 혼자로 되돌린다:
     *   · 방장 — 동료를 보낸다(`leaveGame`). 직업·배낭은 그 판에 남아 다시 들어오면 돌아온다.
     *   · 손님 — 남의 판을 들고 있으면 안 된다. **제 저장 판**으로 돌아간다(손님일 동안은 안 썼다).
     */
    const closeRoom = useCallback((why: string) => {
        const n = net.current;
        net.current = null;
        // **방장은 이어진 손님 전부에게** 인사를 보낸다 — 예전에는 손님이 하나라
        // `n.conn` 한 줄이면 됐다.
        if (n?.role === "guest") {
            if (n.conn?.open) n.conn.send({ t: "bye" } satisfies NetMsg);
        } else if (n?.role === "host") {
            for (const conn of n.guests.keys()) if (conn.open) conn.send({ t: "bye" } satisfies NetMsg);
        }
        // 곧바로 부수면 방금 보낸 인사가 안 나간다.
        setTimeout(() => n?.peer.destroy(), 500);
        try {
            localStorage.removeItem(ROOM_KEY);
        } catch { }
        if (onlineRef.current === "guest") {
            const own = load();
            setState(
                own && own.phase === "playing"
                    // 손님으로 노는 동안 맡긴 것이 있으면 **그쪽이 더 나중**이다 — 세워 둔
                    // 제 판의 상자를 그대로 쓰면 그 사이에 맡긴 물건이 사라진다.
                    ? setChest(own, 0, loadChest(0))
                    : newGame(undefined, loadBestiary(), loadSpecials(), loadItemCodex(), loadItemUsage(), undefined, loadChest(0)),
            );
        } else {
            // 방장 — 손님을 **자리마다 하나씩** 보낸다. 한꺼번에 `heroes.length = 1` 로
            // 자르지 않는 까닭은, 몬스터의 어그로(`m.target`)가 칸 번호라 자리 하나가
            // 빠질 때마다 뒤엣사람들 몫을 다시 매겨야 하기 때문이다(`leaveGame`).
            setState((g) => {
                let s = g;
                while (s && s.heroes.length > 1) s = leaveGame(s, 1);
                return s;
            });
        }
        setOnline(null);
        setRoom(null);
        setLinked(false);
        setGuests([]);
        setWho(0);
        setView(null);
        if (why) note(why);
    }, [note]);
    /**
     * 들어온 손님 하나를 **내보낸다**(`who` = `heroes` 의 그 사람 칸) — 방은 그대로 열어 둔다.
     *
     * 방 나가기(`closeRoom`)와 다르다. 방 코드도 피어도 살아 있고 나가는 것은 그 손님뿐이라,
     * 곧바로 다른 사람을 부를 수 있다. 내보낸 사람은 **이 방이 열려 있는 동안 다시 못
     * 들어온다**(`banned`) — 다시 붙을 수 있으면 그건 내보낸 것이 아니라 잠깐 끊은 것이다.
     * **자리표(`guestKey`)로 막는다** — 접속마다 바뀌는 피어 id로 막으면, 창을 닫았다
     * 새로 열어 딴 id로 오는 순간 도로 들어온다.
     *
     * 동료 자리는 `leaveGame` 이 **그 판 안에** 앉혀 둔다(직업·배낭 그대로). 나가기와 같은
     * 자리를 쓰는 까닭은, 규칙을 두 벌로 두면 한쪽만 고치는 날이 오기 때문이다.
     */
    const kickGuest = useCallback(
        (who: number) => {
            const n = net.current;
            const s = stateRef.current;
            if (!n || n.role !== "host" || !s) return;
            const hero = s.heroes[who];
            if (!hero) return;
            if (hero.guestKey) banned.current.add(hero.guestKey);
            let target: DataConnection | undefined;
            for (const [conn, key] of n.guests) if (key === hero.guestKey) target = conn;
            if (target) {
                if (target.open) target.send({ t: "kick" } satisfies NetMsg);
                // **먼저 명부에서 지운다** — 그래야 뒤따라 오는 `close` 가 「끊겼다」로 안 읽힌다.
                n.guests.delete(target);
                // 곧바로 닫으면 방금 보낸 인사가 안 나간다.
                setTimeout(() => target!.close(), 500);
            }
            setState((g) => {
                if (!g) return g;
                const next = leaveGame(g, who);
                syncGuests(next);
                // **남은 손님 전부에게** 새 판을 보낸다 — 그 자리 뒤의 사람들은 칸 번호가
                // 당겨졌으므로(`leaveGame`), 걸음(`cmd`)만으로는 못 따라잡는다.
                broadcast({ t: "init", state: serialize(next) });
                return next;
            });
            note("동료를 내보냈다. 방은 그대로 열려 있다.");
        },
        [note, syncGuests, broadcast],
    );

    // 네트워크 콜백은 방을 열 때 한 번 걸린다 — 그때의 `online` 이 아니라 **지금** 것을 읽는다.
    const onlineRef = useRef(online);
    onlineRef.current = online;

    /**
     * 이름을 바꾼다 — **판의 주인이 고쳐야** 양쪽 화면이 같은 것을 본다.
     *
     *   · 방장 — 제 판을 고치고 **판을 통째로 다시 보낸다**(`init`). 걸음(`cmd`)만 오가는
     *     사이라 이름 같은 값은 그 길로는 안 건너간다.
     *   · 손님 — 남의 판을 제 손으로 못 고친다. **다시 인사한다**(`hello`) — 방장이
     *     `setNick` 으로 고쳐 `init` 로 되돌려 준다. 들어올 때와 같은 길이다.
     */
    const changeNick = useCallback(() => {
        const nick = askNick();
        if (onlineRef.current === "guest") {
            let origin: HeroOrigin = "knight";
            try {
                const r = JSON.parse(localStorage.getItem(ROOM_KEY) ?? "null");
                if (r?.origin in ORIGINS) origin = r.origin;
            } catch { }
            broadcast({ t: "hello", origin, nick, chest: loadChest(0), guestKey: guestKey() });
            return;
        }
        const s = stateRef.current;
        if (!s) return;
        const next = setNick(s, 0, nick);
        setState(next);
        broadcast({ t: "init", state: serialize(next) });
    }, [broadcast]);
    const closeRoomRef = useRef(closeRoom);
    closeRoomRef.current = closeRoom;

    /**
     * 브로커와의 연결이 깨지면 피어를 새로 만든다. 같은 코드가 브로커에 잠깐 남아 있으면
     * (`unavailable-id`) 그것도 몇 초 뒤 다시 된다. 나간 뒤에는 안 돈다(`net.current` 로 본다).
     */
    const retry = useCallback((peer: Peer, again: () => void) => {
        if (net.current?.peer !== peer) return;
        peer.destroy();
        setTimeout(() => net.current?.peer === peer && again(), RETRY_MS);
    }, []);

    /** 끝난 판에서 남은 화면·입력 상태를 새 판으로 넘기지 않는다. */
    const resetRunInput = useCallback(() => {
        stopAllHolds();
        // 아직 누르고 있는 방향 키는 한 번 떼기 전까지 새 던전을 걷지 않는다.
        ignoreHeldDirections();
        projectilePlaying.current = false;
        setProjectileCells([]);
        setModes(["none", "none"]);
        setPeerModes({});
        setSheet("none");
        setView(null);
        setSkillOpen(false);
        setAltarOpen(false);
    }, [stopAllHolds, ignoreHeldDirections]);

    /** 방장이 고르는 즉시 새 판을 열고, 손님은 자기 선택을 마친 때에만 합류한다. */
    const beginRematch = useCallback((hostOrigin: HeroOrigin): boolean => {
        const n = net.current;
        const s = stateRef.current;
        if (n?.role !== "host" || !s) return false;
        const live = new Set(n.guests.values());
        const guests = s.heroes.slice(1)
            .filter((hero) => !!hero.guestKey && live.has(hero.guestKey))
            .map((hero) => ({ guestKey: hero.guestKey!, nick: hero.nick, chest: hero.chest }));
        if (guests.length === 0) return false;

        const round = ++rematchRound.current;
        rematch.current = { round, hostOrigin, picks: new Map(), guests };
        resetRunInput();
        clear();
        buried.current = false;
        const next = newGame(undefined, loadBestiary(), loadSpecials(), loadItemCodex(), loadItemUsage(), hostOrigin, loadChest(0));
        setState(next);
        syncGuests(next);
        broadcast({ t: "init", state: serialize(next) });
        // `init` 다음에 보내므로 손님은 새 지도를 본 뒤 자기 직업을 고른다. 이때 다른
        // 사람이 아직 고르지 않았어도 방장과 먼저 고른 사람은 이미 걸을 수 있다.
        broadcast({ t: "rematch", round, party: next.heroes.map((hero) => ({ origin: hero.origin ?? "knight", nick: hero.nick })) });
        return true;
    }, [broadcast]);

    const hostRoom = useCallback(async (code = String(1000 + Math.floor(Math.random() * 9000))) => {
        const { Peer } = await import("peerjs");
        const peer = new Peer(PEER_PREFIX + code);
        net.current = { role: "host", peer, guests: new Map() };
        try {
            localStorage.setItem(ROOM_KEY, JSON.stringify({ role: "host", code }));
        } catch { }
        // **내 이름을 판에 올린다** — 판을 통째로 보내므로(`init`) 이 한 줄로 손님 화면까지 간다.
        setState((g) => (g ? setNick(g, 0, savedNick()) : g));
        setOnline("host");
        setRoom(code);
        setLinked(false);
        setGuests([]);
        peer.on("error", () => retry(peer, () => hostRoom(code)));
        peer.on("disconnected", () => !peer.destroyed && peer.reconnect());
        peer.on("connection", (conn) => {
            // **자리는 아직 안 준다.** 예전에는(손님이 하나뿐이던 시절) 붙는 순간 그 사람이
            // 곧 그 자리였는데, 이제는 **`hello` 를 받아야 누구인지, 자리가 있는지 안다**
            // (`peek` 만 하고 갈 수도 있다). 살아 있는지만 여기서부터 지켜본다.
            watchConn(conn);
            conn.on("data", (raw) => {
                const m = raw as NetMsg;
                const n = net.current;
                if (n?.role !== "host") return;
                if (m?.t === "ui") {
                    const key = n.guests.get(conn);
                    const s = stateRef.current;
                    const w = key ? (s?.heroes.findIndex((h) => h.guestKey === key) ?? -1) : -1;
                    if (w < 1) return;
                    setPeerModes((pm) => ({ ...pm, [w]: m.mode in DESK_DOING ? m.mode : "none" }));
                    // 다른 손님들에게도 넘긴다 — 보낸 사람에게도 그대로 가지만 제 것이라 무해하다.
                    broadcast({ t: "ui", mode: m.mode, who: w });
                    return;
                }
                // **아직 손님이 아니다** — 지금 누구누구인지만 알려 주고 자리는 안 준다.
                // `linked` 도 안 세운다: 이어진 것은 사람이 아니라 물음 하나다.
                if (m?.t === "peek") {
                    const s = stateRef.current;
                    if (!s) return;
                    if (s.heroes.length >= MAX_PARTY) {
                        conn.send({ t: "full" } satisfies NetMsg);
                        return;
                    }
                    conn.send({
                        t: "room",
                        party: s.heroes.map((h) => ({ origin: h.origin ?? "knight", nick: h.nick })),
                    } satisfies NetMsg);
                    return;
                }
                if (m?.t === "hello") {
                    const s = stateRef.current;
                    if (!s) return;
                    // **내보낸 사람은 안 받는다.** 자리가 있는지 보기 **전에** 본다 — 자리가
                    // 비었다고 받아 주면 내보내기가 잠깐 끊은 것과 같아진다.
                    if (banned.current.has(m.guestKey)) {
                        conn.send({ t: "kick" } satisfies NetMsg);
                        setTimeout(() => conn.close(), 500);
                        return;
                    }
                    // 남이 보낸 값이다 — 없는 직업이면 기사로 받는다.
                    const origin = m.origin in ORIGINS ? m.origin : "knight";
                    // **이미 앉아 있는 손님인가** — 자리표로 고른다(칸 번호가 아니다, 셋 이상이면
                    // 누가 몇 번인지 이어질 때마다 바뀐다). 방장(0번)은 자리표가 없으니 안 걸린다.
                    const already = s.heroes.findIndex((h) => h.guestKey === m.guestKey);
                    let g: GameState;
                    if (already > 0) {
                        // 다시 들어온 손님에게는 **지금 판**을 통째로 준다 — 끊긴 사이의 명령을
                        // 셀 필요가 없다. 자리는 처음 고른 그대로다. 다만 **이름은 늘 다시
                        // 받는다** — 직업과 달리 그 판의 것이 아니라 그 사람의 것이다.
                        g = setNick(s, already, m.nick);
                    } else if (s.heroes.length >= MAX_PARTY) {
                        // 붙어서 고르는 사이에 자리가 다 찼다 — 늦게 온 사람이 밀린다.
                        conn.send({ t: "full" } satisfies NetMsg);
                        setTimeout(() => conn.close(), 500);
                        return;
                    } else {
                        // **상자도 남이 보낸 값이다** — 칸 수와 물건의 모양은 `joinGame` 쪽에서
                        // 다시 자른다(`seatChest`). 대기석에 이 자리표로 보낸 동료가 있으면
                        // `joinGame` 이 그 사람을 돌려준다(직업·배낭 그대로, 상자는 안 덮는다).
                        g = joinGame(s, origin, m.nick, Array.isArray(m.chest) ? m.chest : [], m.guestKey);
                    }
                    n.guests.set(conn, m.guestKey);
                    setState(g);
                    syncGuests(g);
                    // **모두에게** 판을 다시 보낸다 — 새로 온 사람은 물론, 이미 있던 손님들도
                    // 늘어난(또는 이름이 바뀐) 파티를 봐야 한다.
                    broadcast({ t: "init", state: serialize(g) });
                    return;
                }
                if (m?.t === "rematch") {
                    const key = n.guests.get(conn);
                    const plan = rematch.current;
                    if (!key || !plan || plan.round !== m.round || !m.origin || !(m.origin in ORIGINS)) return;
                    // 이 다음 판에 초대한 사람만 고를 수 있다. 뒤늦게 다시 붙은 다른 연결이
                    // 이전 라운드의 선택을 끼워 넣지 못하게 한다.
                    if (!plan.guests.some((guest) => guest.guestKey === key)) return;
                    if (plan.picks.has(key)) return;
                    plan.picks.set(key, m.origin);
                    const guest = plan.guests.find((entry) => entry.guestKey === key)!;
                    setState((current) => {
                        if (!current) return current;
                        const next = joinGame(current, m.origin!, guest.nick, guest.chest, guest.guestKey);
                        syncGuests(next);
                        broadcast({ t: "init", state: serialize(next) });
                        // 아직 고르는 사람의 패널에도 먼저 고른 사람의 직업을 바로 적는다.
                        broadcast({ t: "rematch", round: plan.round, party: next.heroes.map((hero) => ({ origin: hero.origin ?? "knight", nick: hero.nick })) });
                        return next;
                    });
                    if (plan.picks.size === plan.guests.length) rematch.current = null;
                    return;
                }
                if (m?.t === "bye") {
                    const key = n.guests.get(conn);
                    if (key === undefined) return; // 아직 자리가 없던 연결이 나간 것 — 할 일이 없다.
                    n.guests.delete(conn);
                    setState((g) => {
                        if (!g) return g;
                        const w = g.heroes.findIndex((h) => h.guestKey === key);
                        const next = w > 0 ? leaveGame(g, w) : g;
                        syncGuests(next);
                        broadcast({ t: "init", state: serialize(next) });
                        return next;
                    });
                    note("동료가 방을 나갔다.");
                    return;
                }
                if (m?.t !== "cmd" || !m.cmd) return;
                // **보낸 `who` 를 믿지 않는다** — 이 연결의 자리표로 다시 찾는다.
                const key = n.guests.get(conn);
                const s = stateRef.current;
                const w = key ? (s?.heroes.findIndex((h) => h.guestKey === key) ?? -1) : -1;
                if (w < 1) return;
                const cmd = { ...m.cmd, who: w };
                setState((s2) => (s2 ? perform(s2, cmd) : s2));
                // **손님 전부에게** 뿌린다(보낸 사람에게도 — 제가 한 일의 결과를 그 길로만 받는다).
                broadcast({ t: "cmd", cmd });
            });
            conn.on("close", () => {
                const n = net.current;
                if (n?.role !== "host" || !n.guests.has(conn)) return;
                // **자리는 그대로 둔다** — 사고(망 끊김)로 보고 기다린다. `bye` 를 받아야
                // 자리를 비운다(그건 나가겠다는 인사다).
                n.guests.delete(conn);
                const s = stateRef.current;
                if (s) syncGuests(s);
                note("동료가 끊겼다 — 같은 방에서 기다린다.");
            });
        });
    }, [note, retry, broadcast, syncGuests]);

    /**
     * 방에 들어간다. **`origin` 이 없으면 아직 안 고른 것**이다 — 먼저 붙어서 방장의
     * 직업을 물어보고(`peek`), 그 답(`room`)을 받아 고르기 판을 연다. 고른 뒤에
     * `hello` 를 보내야 비로소 판에 앉는다.
     *
     * 다시 잇는 길(`ROOM_KEY`)에는 이미 고른 직업이 있어 곧바로 `hello` 로 간다.
     */
    const joinRoom = useCallback(async (code: string, origin?: HeroOrigin) => {
        const { Peer } = await import("peerjs");
        const peer = new Peer();
        net.current = { role: "guest", peer };
        // **적어 둔 직업을 지우지 않는다.** 다시 잇는 길도 이 함수를 지나는데, 그때 넘어오는
        // `origin` 은 처음 붙을 때의 값이라 비어 있다 — 그것으로 덮어쓰면 고른 것이 날아가
        // 고르기 창이 다시 뜬다.
        const chosen = origin ?? savedOrigin(code);
        try {
            localStorage.setItem(ROOM_KEY, JSON.stringify({ role: "guest", code, ...(chosen ? { origin: chosen } : {}) }));
        } catch { }
        // **끊긴 동안에도 손님이다** — 제 저장 칸을 안 덮고, 자리를 쥔 채 기다린다.
        setOnline("guest");
        setRoom(code);
        setLinked(false);
        /**
         * **판을 받았는가.** 물어보기만 하는 동안(`peek`)에도 줄은 열려 있어서, 방장이
         * 제 걸음을 실어 보내는 `cmd` 가 그대로 날아온다. 그걸 적용하면 **아직 손님도
         * 아닌 사람의 제 저장 판**이 남의 걸음으로 굴러간다.
         */
        let joined = false;
        const again = () => retry(peer, () => joinRoom(code, origin));
        peer.on("error", again);
        peer.on("open", () => {
            const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
            net.current = { role: "guest", peer, conn };
            watchConn(conn);
            conn.on("open", () => {
                // **이어졌다고 `linked` 가 서지는 않는다** — 판을 받아야(`init`) 같이 보는 것이다.
                // 안 그러면 아직 자리도 없는데 키가 먹어, 방장 쪽에서 없는 영웅을 움직이게 된다.
                // **보낼 때 다시 읽는다** — 붙은 뒤에 고르고서 끊겼으면 이 클로저의
                // `origin` 은 여전히 비어 있다. 그대로 믿으면 다시 물어보게 된다.
                const mine = origin ?? savedOrigin(code);
                conn.send(
                    mine
                        ? ({ t: "hello", origin: mine, nick: savedNick(), chest: loadChest(0), guestKey: guestKey() } satisfies NetMsg)
                        : ({ t: "peek" } satisfies NetMsg),
                );
            });
            conn.on("data", (raw) => {
                const m = raw as NetMsg;
                if (m?.t === "room") {
                    // **이미 고른 사람에게는 다시 안 묻는다.** 방장이 답을 늦게 보냈거나
                    // 그 사이에 골랐을 수 있다 — 고르기 창을 또 띄우면 이미 정해진 것을
                    // 다시 고르게 된다(고쳐도 판에는 안 앉는다, 방장이 그 사람을 이미 안다).
                    const already = savedOrigin(code);
                    if (already) {
                        conn.send({ t: "hello", origin: already, nick: savedNick(), chest: loadChest(0), guestKey: guestKey() } satisfies NetMsg);
                        return;
                    }
                    // 지금 있는 사람들(방장 + 이미 들어온 손님들)을 받았다 — 이제 **그것을 보고** 고른다.
                    setRoomParty(m.party.map((p) => ({ origin: p.origin in ORIGINS ? p.origin : "knight", nick: cleanNick(p.nick) })));
                    setOriginFor({ t: "guest", code });
                    setSheet("origins");
                } else if (m?.t === "rematch" && typeof m.round === "number") {
                    // 방장은 다음 판을 혼자 만들지 않는다. 이 선택만 되돌려 보내고,
                    // 완성된 판은 평소처럼 `init`으로 받는다.
                    if (m.party) setRoomParty(m.party.map((hero) => ({ origin: hero.origin in ORIGINS ? hero.origin : "knight", nick: cleanNick(hero.nick) })));
                    else setRoomParty((stateRef.current?.heroes ?? []).map((hero) => ({ origin: hero.origin ?? "knight", nick: hero.nick })));
                    if (rematchPicked.current === m.round) return;
                    setOriginFor({ t: "rematch", round: m.round });
                    setSheet("origins");
                } else if (m?.t === "init") {
                    const s = deserialize(m.state);
                    if (s) {
                        // 게임 오버 뒤 방장이 여는 새 판이다. 손님 쪽에 남은 배낭·겨누기
                        // 모드가 있으면 키보드가 그 판에만 들어가므로, 새 판을 받는 순간
                        // 입력 상태부터 비운다. 평상시 재접속 `init`은 건드리지 않는다.
                        if (stateRef.current?.phase !== "playing" && s.phase === "playing") resetRunInput();
                        setState(s);
                        // **내 자리는 자리표로 다시 찾는다** — 앞선 누군가 나가면 내 칸 번호가
                        // 당겨질 수 있다(`leaveGame`). `who` 는 판의 값이 아니라 화면의 값이므로
                        // (`GameState.heroes` 의 `guestKey` 로) 여기서 매번 다시 맞춘다.
                        const mine = s.heroes.findIndex((h) => h.guestKey === guestKey());
                        if (mine > 0) setWho(mine);
                    }
                    joined = true;
                    setLinked(true);
                } else if (m?.t === "cmd" && m.cmd && joined) {
                    setState((s) => (s ? perform(s, m.cmd) : s));
                } else if (m?.t === "ui") {
                    if (m.mode in DESK_DOING && typeof m.who === "number") {
                        setPeerModes((pm) => ({ ...pm, [m.who!]: m.mode }));
                    }
                } else if (m?.t === "kick") {
                    closeRoomRef.current("방장이 나를 내보냈다. 내 판으로 돌아왔다.");
                } else if (m?.t === "bye") {
                    closeRoomRef.current("방장의 판이 끝나 방이 닫혔다. 내 판으로 돌아왔다.");
                } else if (m?.t === "full") {
                    closeRoomRef.current("방이 다 찼다(최대 " + (MAX_PARTY - 1) + "명). 내 판으로 돌아왔다.");
                }
            });
            conn.on("close", () => {
                if (net.current?.peer !== peer) return;
                setLinked(false);
                note("방장과 끊겼다 — 다시 잇는 중…");
                again();
            });
        });
    }, [note, retry, resetRunInput]);

    // 새로고침·탭을 닫았다 연 뒤에도 **들어 있던 방으로** 돌아간다.
    /**
     * 같이 보는 판(도감·기록·도움말·옵션·지난 판)을 **연 사람.** 한 화면 둘이서는 그 사람
     * 쪽 반쪽에만 열리고, **그 사람만 멈춘다** — 동료가 도감을 보는 동안 나는 계속 걷는다.
     */
    const [sheetOwner, setSheetOwner] = useState(0);
    const whoRef = useRef(who);
    whoRef.current = who;
    /** 지도가 따라가는 사람 — 빌린 눈이 있으면 그쪽이다. */
    const eye = view ?? who;
    const eyeRef = useRef(eye);
    eyeRef.current = eye;
    /** 내가 조종하는 영웅이 쓰러져 있는가 — 눈은 **그동안만** 빌린다. */
    const iAmDown = !!state && (state.heroes[who]?.hp ?? 1) <= 0;
    useEffect(() => {
        if (!iAmDown) setView(null);
    }, [iAmDown]);
    useEffect(() => {
        if (sheet !== "none" && sheet !== "status") setSheetOwner(whoRef.current);
    }, [sheet]);

    // **불 켜진 방에 처음 들어서면 빛이 한 겹씩 퍼진다.**
    //
    // 어두운 방·미로·안개 층에서는 안 돈다 — 거기서는 원래 한두 칸만 보이므로 퍼질 것이 없고,
    // 「이 방은 왜 좁은가」는 퍼지지 **않는 것**으로 읽힌다.
    //
    // **`useLayoutEffect` 여야 한다.** `useEffect` 는 브라우저가 **그린 뒤**에 돈다. 그러면
    // 방이 통째로 환한 프레임이 먼저 나가고, 그 다음에야 `reveal` 이 걸려 도로 어두워졌다가
    // 번진다 — 「이미 밝혀지고 **다시** 밝혀지는」 것이 이 한 글자에서 났다. 재 봤다(390px,
    // 지도에 보이는 글자 수를 프레임마다):
    //
    //     useEffect       30 30 30 30 30 · 9 9 20 20 25 25 25 · 30 …   ← 다섯 프레임 환하다
    //     useLayoutEffect  9 9 20 20 25 25 25 · 30 …                   ← 어두운 데서 시작한다
    useLayoutEffect(() => {
        if (!state) return;
        const h = state.heroes[eyeRef.current] ?? state.heroes[0];
        if (h.hp <= 0 || (h.blind ?? 0) > 0) return;
        const { level } = state;
        // 문턱에서는 삼각형 시야만 보이고, 방 안으로 들어선 순간에만 전체 방을 펼친다.
        const ri = level.roomAt[idx(h.x, h.y)] >= 0 ? level.roomAt[idx(h.x, h.y)] : -1;
        const room = ri >= 0 ? level.rooms[ri] : undefined;
        if (!room || room.dark || room.gone || room.maze || level.mutator === "fog") return;
        const key = `${level.depth}:${ri}`;
        if (litRooms.current.has(key)) return;
        litRooms.current.add(key);

        if (revealTimer.current) clearTimeout(revealTimer.current);
        // 원형 시야가 방의 먼 모서리까지 닿을 때까지 펼친다.
        const far = Math.ceil(Math.max(
            Math.hypot(room.x - h.x, room.y - h.y),
            Math.hypot(room.x + room.w - 1 - h.x, room.y - h.y),
            Math.hypot(room.x - h.x, room.y + room.h - 1 - h.y),
            Math.hypot(room.x + room.w - 1 - h.x, room.y + room.h - 1 - h.y),
        ));
        setReveal({ cx: h.x, cy: h.y, r: 1, room });
        const step = (r: number) => {
            if (r > far) {
                setReveal(null);
                return;
            }
            setReveal((v) => (v ? { ...v, r } : v));
            revealTimer.current = setTimeout(() => step(r + 1), REVEAL_STEP);
        };
        revealTimer.current = setTimeout(() => step(2), REVEAL_STEP);
    }, [state]);

    /** 남들의 책상에 떠 있는 것 — `heroes` 칸 번호마다. 이어져 있을 때만 적는다. */
    const [peerModes, setPeerModes] = useState<Record<number, DeskMode>>({});
    useEffect(() => {
        if (online && linked) broadcast({ t: "ui", mode: modes[who] ?? "none", who });
    }, [online, linked, modes, who, broadcast]);

    /** 초대 링크 — 받은 사람이 열면 직업만 고르고 바로 들어온다(아래 `?room=`). */
    const copyInvite = useCallback(() => {
        if (!room) return;
        const url = `${location.origin}${location.pathname}?room=${room}`;
        const said = () => note(`초대 링크를 복사했다 — ${url}`);
        navigator.clipboard?.writeText(url).then(said, () => note(`초대 링크: ${url}`)) ?? note(`초대 링크: ${url}`);
    }, [room, note]);

    const resumed = useRef(false);
    useEffect(() => {
        // 개발 모드는 효과를 두 번 돌린다 — 같은 코드로 피어가 둘 서면 서로 자리를 뺏는다.
        if (resumed.current) return;
        resumed.current = true;
        let inRoom = false;
        try {
            const r = JSON.parse(localStorage.getItem(ROOM_KEY) ?? "null");
            if (r?.role === "host") hostRoom(r.code);
            // 직업이 안 적혀 있으면 **아직 안 고르고 나간 것**이다 — 다시 붙어서 다시 묻는다.
            else if (r?.role === "guest") joinRoom(r.code, r.origin);
            inRoom = !!r;
        } catch { }
        // 초대 링크로 왔다 — 주소에서 코드를 걷어 내고(새로고침에 또 묻지 않게) 직업부터 묻는다.
        // 이미 어느 방에 들어 있으면 그 방이 먼저다.
        const invited = new URLSearchParams(location.search).get("room");
        if (invited && /^\d{4}$/.test(invited)) {
            history.replaceState(null, "", location.pathname);
            // **먼저 붙는다** — 방장의 직업을 받아 와야 고르는 판이 열린다(`joinRoom` 의 `room`).
            // 이름은 **묻지 않는다**(`ask = false`) — 링크를 열자마자 창이 뜨면 놀란다.
            // 기억해 둔 것이 없으면 이름 없이 들어가고, 옵션에서 나중에 정할 수 있다.
            if (!inRoom) {
                askNick(false);
                void joinRoom(invited);
            }
        }
        // 첫 그림에서 한 번만.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * 출신 고르기 판을 **누구를 위해** 열었나 — 새 판 · 온라인 방장 · 한 화면 동료 · 온라인 손님(방 코드).
     * 판은 하나고 고른 뒤 갈 곳만 다르다.
     */
    const [originFor, setOriginFor] = useState<
        { t: "new" } | { t: "host" } | { t: "mate" } | { t: "guest"; code: string } | { t: "rematch"; round: number }
    >({ t: "new" });

    const pickOrigin = (origin: HeroOrigin) => {
        const f = originFor;
        setOriginFor({ t: "new" });
        if (f.t === "host") {
            // 방을 열기 전에 방장의 시작 장비부터 정한다. 손님은 이미 `peek` 뒤에 같은
            // 선택 판을 거치므로, 이 둘을 맞추면 온라인 첫 판도 직업이 우연히 정해지지 않는다.
            askNick();
            startWithOrigin(origin);
            void hostRoom();
        } else if (f.t === "mate") {
            // 한 화면 둘이서 — **여기는 정원이 둘로 못 박혀 있다.** 곁의 사람은 이
            // 브라우저의 1번 상자를 들고 온다. `guestKey` 는 안 준다 — 핫시트 동료는
            // 온라인 자리표가 없는 사람이다.
            setState((g) => (g && g.heroes.length < 2 ? joinGame(g, origin, undefined, loadChest(1)) : g));
            setSheet("none");
        } else if (f.t === "guest") {
            setSheet("none");
            const n = net.current;
            const conn = n?.role === "guest" ? n.conn : undefined;
            // 물어보려고 이미 붙어 있으면 **그 줄로 인사만** 보낸다 — 다시 붙으면 방장 쪽에
            // 죽은 연결이 하나 남고, 그 사이에 자리가 찼다고 튕길 수도 있다.
            if (conn?.open) {
                try {
                    localStorage.setItem(ROOM_KEY, JSON.stringify({ role: "guest", code: f.code, origin }));
                } catch { }
                conn.send({ t: "hello", origin, nick: savedNick(), chest: loadChest(0), guestKey: guestKey() } satisfies NetMsg);
            } else {
                void joinRoom(f.code, origin);
            }
        } else if (f.t === "rematch") {
            setSheet("none");
            const n = net.current;
            const conn = n?.role === "guest" ? n.conn : undefined;
            if (!conn?.open) {
                note("방장과 끊겼다 — 직업 선택을 보낼 수 없다.");
                return;
            }
            try {
                if (room) localStorage.setItem(ROOM_KEY, JSON.stringify({ role: "guest", code: room, origin }));
            } catch { }
            rematchPicked.current = f.round;
            conn.send({ t: "rematch", round: f.round, origin } satisfies NetMsg);
        } else {
            startWithOrigin(origin);
        }
    };

    const startWithOrigin = useCallback((origin: HeroOrigin) => {
        setSheet("none");
        // 손님의 새 판은 방장만 연다 — 제멋대로 열면 두 화면이 갈라진다.
        if (online === "guest") return;
        // 온라인 다음 판은 모두가 직업을 고른 뒤에만 연다. 이어진 손님이 없으면 곧바로
        // 혼자 새 판을 시작하는 아래 흐름으로 내려간다.
        if (online === "host" && beginRematch(origin)) return;
        // 이전 판의 키 반복·책상 모드가 새 판의 조작을 가로막지 않게 같이 비운다.
        resetRunInput();
        clear();
        buried.current = false;
        let next = newGame(undefined, loadBestiary(), loadSpecials(), loadItemCodex(), loadItemUsage(), origin, loadChest(0));
        if (online === "host") {
            setState(next);
            syncGuests(next);
            broadcast({ t: "init", state: serialize(next) });
            return;
        }
        setState(next);
    }, [online, resetRunInput, syncGuests, broadcast, beginRematch]);

    const restart = useCallback(() => {
        // 새 던전은 방장이 하나만 만든다. 손님도 방에 남아, 방장이 보낸 새 `init`을
        // 받으면 같은 방·같은 파티로 곧바로 이어서 한다.
        if (online === "guest") {
            note("방장이 새 판을 열기를 기다린다.");
            return;
        }
        setOriginFor({ t: "new" });
        setSheet("origins");
    }, [online, note]);

    const copySeedLink = useCallback(async () => {
        if (!state) return;
        const hero = state.heroes[who] ?? state.heroes[0];
        const url = sharedRunUrl(location.href, { seed: state.seed, origin: hero.origin ?? "knight" });
        try {
            await navigator.clipboard.writeText(url);
            setSeedLinkNote(`시드 ${state.seed} 링크를 복사했다 — 같은 직업으로 새 던전이 열린다.`);
        } catch {
            // 권한 없는 브라우저에서도 링크를 잃지 않는다. 직접 복사할 수 있게 한 번 보여 준다.
            window.prompt("시드 공유 링크", url);
            setSeedLinkNote("시드 링크를 열었다 — 복사해서 동료에게 보내면 된다.");
        }
    }, [state, who]);

    // ── 키보드 ─────────────────────────────────────────────────────────
    /** 한 화면 협동에서 사람마다 꾹 누르고 있는 방향 키. */
    const runAsRef = useRef(runAs);
    runAsRef.current = runAs;
    /**
     * 그 사람의 걷기를 막는가 — **자기 책상**이 떴거나, 둘 다 덮는 판(도감·도움말)이 떴거나.
     * 동료가 배낭을 여는 동안에도 나는 계속 걷는다.
     */
    const blocked = useRef<(w: number) => boolean>(() => false);
    blocked.current = (w) =>
        modes[w] !== "none" ||
        (sheet !== "none" && (w === sheetOwner || !!online)) ||
        frozen ||
        state?.phase !== "playing";

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
            if (KEY_DIRS[key]) {
                heldDirections.current.add(e.code);
                if (ignoredDirections.current.has(e.code)) {
                    e.preventDefault();
                    return;
                }
            }
            const localCoop = !online && state.heroes.length > 1;
            // 멈춘 동안에는 **아무 키도 안 받는다**(모서리 알림이 까닭을 적는다).
            if (frozen) return;
            // 같이 보는 판이 떠 있어도 **연 사람만** 멈춘다(아래 협동 갈래에서 가린다).
            // 혼자·온라인은 화면이 하나뿐이라 그대로 다 멈춘다.
            if (sheet !== "none" && !localCoop) return;

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
                    // 같이 보는 판을 **내가** 열어 뒀으면 내 키는 그 판의 것이다 — 취소로 닫는다.
                    if (sheet !== "none" && w === sheetOwner) {
                        if (isCancel) setSheet("none");
                        return;
                    }
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
            if (localCoop && (sheet !== "none" || modes.some((m) => m !== "none"))) return;

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
            heldDirections.current.delete(e.code);
            ignoredDirections.current.delete(e.code);
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
    }, [state, modes, sheet, sheetOwner, frozen, run, runAs, online, who, stopHold, confirm]);

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
    const onAnvil = !!level.anvil && level.anvil.x === hero.x && level.anvil.y === hero.y;
    const onAltar = onAnvil && level.special?.kind === "altar" && !level.altarUsed;
    const has = (k: ItemKind) => hero.pack.some((p) => p.kind === k);
    // 도감이 읽는 것 — **화면이 세지 않는다.** 엔진이 낸 것을 늘어놓을 뿐이다.
    const sightings = survey(state);
    const progress = bestiaryProgress(state.bestiary);
    const itemProg = itemCodexProgress(state.itemCodex, state.itemUsage);
    const classSkill = ORIGINS[hero.origin ?? "knight"];

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
    // 같이 보는 판도 둘이서면 **연 사람 쪽 반쪽**에 선다 — 그동안 동료는 계속 걷는다.
    const shared = coopKeys
        ? { side: (sheetOwner === 0 ? "left" : "right") as "left" | "right", accent: PARTY_INK[sheetOwner], closeKey: sheetOwner === 0 ? "F" : ";" }
        : {};
    const actions: PadAction[] = [
        // 발밑 — **줍기가 맨 앞이다.** 셋 다 발밑을 보는 일이지만 줍는 것이 압도적으로
        // 잦고(층마다 여러 번), 계단은 층에 한 번씩이다. 잦은 것이 첫 칸에 서야 손가락이
        // 제일 짧은 길을 간다.
        { label: "줍기", hint: ", 또는 g", keys: coopKeys ? "S · K" : "g", on: () => run({ t: "pickup" }), off: hereItem ? undefined : "발밑에 아무것도 없다", hot: !!hereItem },
        { label: "내려간다", hint: ">", keys: coopKeys ? "S · K" : ">", on: () => run({ t: "descend" }), off: onStairs ? undefined : "계단 위가 아니다", hot: onStairs },
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
            hot: onUpStairs && !(level.depth === 1 && !hero.hasAmulet),
        },
        // 배낭에서 꺼내 쓰는 것들
        { label: "배낭", hint: "i — 쥐기·입기·끼기는 여기서", keys: coopKeys ? "R · P" : "i", on: () => desks.current[who]?.togglePack(), hot: onAnvil },
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
    const visibleMessages = state.messages.filter((m) => !isDetail(m));
    const isImportantMessage = (m: string) => /함정|저주|쓰러|피해|반지가.*옮겼|증표/.test(m);
    const latest = visibleMessages.at(-1);
    const important = [...visibleMessages.slice(-8)].reverse().find(isImportantMessage);
    // 중요한 일은 다음 몇 번의 일반 메시지에 밀려나지 않게, 최신 줄과 함께 남긴다.
    // 짧은 두 줄 요약도 기록 판과 같은 규칙으로 최신 줄을 위에 둔다.
    const recent = important && latest && important !== latest
        ? [latest, important]
        : [...visibleMessages.slice(-2)].reverse();
    /** 이번 판이 내 지난 판들 사이에서 선 자리 — 끝난 판에서만 쓴다. */
    const place = standing(score(state), tombs);

    /**
     * 끊긴 동안 우상단에 적는 것 — **한 자리에서 낸다.** 단추의 이름표(`aria-label`)와
     * 펼친 본문이 같은 글을 써야, 읽어 주는 것과 보이는 것이 안 갈린다.
     */
    const netLost = online === "guest" || state.heroes.length > 1;
    const netText = !online
        ? ""
        : online === "guest"
            ? "방장과 잇는 중… 판은 멈춰 있고, 이어지면 그대로 이어서 한다"
            : netLost
                ? `동료와 끊겼다 — 방 ${room} 에서 기다리는 중`
                : `동료를 기다리는 중 · 방 코드 ${room}`;
    return (
        <div className="relative flex h-full w-full flex-col bg-[var(--rg-bg)] text-[var(--rg-text)]">
            {seedLinkNote && (
                <div role="status" className="pointer-events-none absolute top-2 left-1/2 z-30 -translate-x-1/2 rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-panel)] px-3 py-1 text-center text-[11px] text-[var(--rg-strong)] shadow-md">
                    {seedLinkNote}
                </div>
            )}
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
                        <span key={`${state.turn}-${i}`} className={`block truncate ${isImportantMessage(m) ? "font-bold text-[var(--rg-strong)]" : ""}`}>
                            <Msg text={m} heroes={state.heroes} />
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
                <MapView state={state} who={eye} cellFlashes={cellFlashes} projectileCells={projectileCells} shake={shake} reveal={reveal} />

                {/* 온라인에서 **이어져 있지 않은 동안** — 누른 키가 안 먹는 까닭을 알린다.
                    **늘 떠 있는 것은 우상단의 작은 단추 하나**다. 본문은 눌러야 펼쳐진다.

                    거쳐 온 길이 둘이다. 처음에는 지도 한가운데 위에 띠로 떠 있었는데,
                    390px 에서 초대 단추까지 두 줄로 접히며 **내가 선 자리와 앞의 몬스터를
                    덮었다**(재 보니 13285px²). 그래서 지도 밖 한 줄로 내렸더니 이번에는
                    **지도가 그만큼 줄었다.** 둘 다 싫은 것이 맞다 — 끊긴 동안에도 방장은
                    계속 논다. 그래서 지금은 **모서리 한 칸만 쓰고**, 가리는 것은 내가 보자고
                    누른 순간뿐이다. */}
                {online && !linked && (
                    <>
                        <button
                            type="button"
                            onClick={() => setNetOpen((v) => !v)}
                            aria-label={netText}
                            aria-expanded={netOpen}
                            title={netText}
                            className={`absolute top-1 right-1 z-20 grid h-7 w-7 place-items-center rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-panel)]/90 font-[family-name:var(--font-plex-mono)] text-[13px] leading-none ${netLost ? "text-[var(--rg-trap)]" : "text-[var(--rg-gold)]"
                                }`}
                        >
                            {netLost ? "⚠" : "⋯"}
                        </button>
                        {netOpen && (
                            <div className="absolute top-9 right-1 z-20 flex max-w-[calc(100%-0.5rem)] flex-col items-end gap-1.5 rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-panel)] px-3 py-2 font-[family-name:var(--font-plex-mono)] text-[12px] text-[var(--rg-strong)] shadow-[0_0_0_1px_var(--rg-shadow)]">
                                <span className="text-right">{netText}</span>
                                {online === "guest" && (
                                    <button
                                        type="button"
                                        onClick={() => closeRoom("방을 나왔다. 내 판으로 돌아왔다.")}
                                        className="rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-hover)] px-2 py-0.5 hover:bg-[var(--rg-raised)]"
                                    >
                                        기다리지 않고 나가기
                                    </button>
                                )}
                                {online === "host" && (
                                    <button
                                        type="button"
                                        onClick={copyInvite}
                                        className="rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-hover)] px-2 py-0.5 hover:bg-[var(--rg-raised)]"
                                    >
                                        초대 링크 복사
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ── 레벨업 성장 — **좌상단 모서리 한 칸.**
                    끊김 안내와 같은 자리 값이다: 계속 서 있는 알림은 모서리 한 칸만 쓰고,
                    본문은 눌러야 펼쳐진다. 쌓인 것이 없으면 안 그린다 — 못 누르는 단추가
                    늘 떠 있으면 그것도 고장처럼 읽힌다. 캠프가 아니어도, 턴을 안 써도
                    고를 수 있어서 지도를 막을 까닭이 없다. */}
                {hero.pendingSkillPicks > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setSkillOpen((v) => !v)}
                            aria-label={`성장 ${hero.pendingSkillPicks}개를 고를 수 있다`}
                            aria-expanded={skillOpen}
                            title="성장을 고른다"
                            className="absolute top-1 left-1 z-20 grid h-7 w-7 place-items-center rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-panel)]/90 font-[family-name:var(--font-plex-mono)] text-[13px] leading-none text-[var(--rg-gold)]"
                        >
                            ★{hero.pendingSkillPicks}
                        </button>
                        {skillOpen && (
                            <div className="absolute top-9 left-1 z-20 flex w-[min(15rem,calc(100%-0.5rem))] flex-col gap-1.5 rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-panel)] px-3 py-2 font-[family-name:var(--font-plex-mono)] text-[12px] text-[var(--rg-strong)] shadow-[0_0_0_1px_var(--rg-shadow)]">
                                <span className="font-bold text-[var(--rg-gold)]">성장 {hero.pendingSkillPicks}개 선택 가능</span>
                                <span className="text-[var(--rg-muted)]">레벨 {SKILL_PICK_INTERVAL}마다 하나 · 선택해도 턴을 쓰지 않는다</span>
                                <span className="text-[11px] text-[var(--rg-faint)]">
                                    현재: 힘 {heroStr(hero)} · 방어 보너스 +{hero.bonusDefense} · 지혜 {Math.round(hero.itemLuck * 100)}
                                </span>
                                {(
                                    [
                                        ["str", `힘 +1 · 현재 ${heroStr(hero)}`],
                                        ["def", `방어 보너스 +1 · 현재 +${hero.bonusDefense}`],
                                        ["luck", `지혜 +1 · 지팡이 피해 +1 (현재 +${Math.round(hero.itemLuck * 100)})`],
                                    ] as const
                                ).map(([option, label]) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                            run({ t: "pickSkill", option });
                                            setSkillOpen(hero.pendingSkillPicks > 1);
                                        }}
                                        className="rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-hover)] px-2 py-1 text-left hover:bg-[var(--rg-raised)]"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* 액티브 전직 기술만 층마다 한 번 모서리에 선다. 기사의 방벽은 패시브다. */}
                {hero.level >= ADVANCE_LEVEL && classSkill.advancedSkillKind === "active" && (
                    <button
                        type="button"
                        onClick={() => hero.origin === "alchemist" ? desks.current[who]?.craftBlessing() : run({ t: "classSkill" })}
                        disabled={hero.classSkillDepth === level.depth}
                        aria-label={`${classSkill.advancedSkillName} — ${classSkill.advancedSkillDescription}`}
                        title={`${classSkill.advancedSkillName} · ${classSkill.advancedSkillDescription}`}
                        className="absolute top-1 left-9 z-20 h-7 rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-panel)]/90 px-2 font-[family-name:var(--font-plex-mono)] text-[11px] font-bold text-[var(--rg-gold)] disabled:opacity-40"
                    >
                        ★ {classSkill.advancedSkillName}
                    </button>
                )}

                {onAltar && (
                    <>
                        <button type="button" onClick={() => setAltarOpen((v) => !v)} aria-expanded={altarOpen} className="absolute top-9 left-1 z-20 h-7 rounded-[3px] border border-[var(--rg-gold)] bg-[var(--rg-panel)]/90 px-2 font-[family-name:var(--font-plex-mono)] text-[11px] font-bold text-[var(--rg-gold)]">
                            † 선택 제단
                        </button>
                        {altarOpen && (
                            <div className="absolute top-[4.75rem] left-1 z-20 flex w-[min(18rem,calc(100%-0.5rem))] flex-col gap-1.5 rounded-[3px] border border-[var(--rg-gold)] bg-[var(--rg-panel)] px-3 py-2 font-[family-name:var(--font-plex-mono)] text-[12px] text-[var(--rg-strong)] shadow-[0_0_0_1px_var(--rg-shadow)]">
                                <span className="font-bold text-[var(--rg-gold)]">하나만 고른다 · 확정하면 턴을 쓴다</span>
                                {([
                                    ["blood", "피의 서약 · 현재 HP 1/3 (최소 5) → 축복 강화 주문서"],
                                    ["hunger", "굶주림의 서약 · 허기 400 → 지도 · 감정 주문서"],
                                    ["guardian", "수호자의 서약 · 챔피언 전투 → 처치 시 보석"],
                                ] as const).map(([choice, label]) => (
                                    <button key={choice} type="button" onClick={() => { run({ t: "altar", choice }); setAltarOpen(false); }} className="rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-hover)] px-2 py-1 text-left hover:bg-[var(--rg-raised)]">
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {advanceBanner && (
                    <div className="banner-pop pointer-events-none absolute top-3 left-1/2 z-30 -translate-x-1/2 rounded border border-[var(--rg-gold)] bg-[var(--rg-panel)] px-4 py-2 text-center shadow-md">
                        <div className="text-[11px] font-bold text-[var(--rg-gold)]">★ 전직 완료</div>
                        <div className="text-[13px] font-bold text-[var(--rg-strong)]">{ORIGINS[advanceBanner].advancedName}</div>
                        <div className="text-[11px] text-[var(--rg-muted)]">
                            {ORIGINS[advanceBanner].advancedSkillName} 해금 · {ORIGINS[advanceBanner].advancedSkillKind === "active" ? "층마다 한 번" : "지속 효과"}
                        </div>
                    </div>
                )}
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
                누르면 조종이 넘어간다(조종 중인 쪽은 테두리). 층은 하나지만 상태 줄을 각각
                읽을 때도 빠지지 않도록 모든 줄에 적는다. */}
            {(state.heroes.length > 1 ? state.heroes : [hero]).map((h, i) => {
                const coop = state.heroes.length > 1;
                const hHunger = hungerOf(h);
                const hRings = wornRings(h).length;
                const cursedGear = h.pack.some((it) => it.cursed && (it.id === h.weaponId || it.id === h.armorId || it.id === h.leftRingId || it.id === h.rightRingId));
                const emptyWand = h.pack.some((it) => it.kind === "wand" && (it.charges ?? 0) === 0);
                const statChip = "p-0 font-inherit text-inherit hover:underline";
                return (
                    <div
                        key={i}
                className={`flex h-auto shrink-0 content-start flex-wrap items-center gap-x-[1ch] overflow-x-auto overflow-y-hidden whitespace-normal px-2 py-1 font-[family-name:var(--font-plex-mono)] text-[12px] text-[var(--rg-text)] [scrollbar-width:none] [&>*]:order-20 [&_*]:!text-[var(--rg-text)] sm:text-[13px] ${i === 0 ? "border-t border-[var(--rg-line-faint)]" : "pt-0"}`}
                    >
                        {coop && (
                            <button
                                type="button"
                                // **쓰러진 사람에게는 조종을 안 넘긴다** — 넘겨 봐야 아무
                                // 명령도 안 먹는다(엔진이 막는다). 자물쇠는 둘이다.
                                //
                                // 온라인에서는 **내가 쓰러져 있을 때만** 눌린다. 그때 넘어가는
                                // 것은 **눈뿐**이다(`setView`) — 조종까지 넘기면 방장이 손님의
                                // 영웅을 움직이는 대리 조종이 된다.
                                onClick={() => {
                                    if (h.hp <= 0) return;
                                    if (!online) setWho(i);
                                    else if (iAmDown) setView(i);
                                }}
                                disabled={h.hp <= 0 || (!!online && !iAmDown)}
                                className={`shrink-0 rounded-[2px] border-2 px-1.5 font-bold ${i === eye ? "" : "border-transparent"}`}
                                style={{ color: PARTY_INK[i], backgroundColor: PARTY_BG[i], borderColor: i === eye ? PARTY_INK[i] : undefined }}
                            >
                                {/* 이름이 있으면 그것을 적는다 — 넉 자라 `1P` 보다 두 글자 길 뿐이고,
                                    지도에서 찾는 이름과 상태 줄의 이름이 같아야 눈이 안 헤맨다. */}
                                {h.hp > 0 ? "@" : "†"}{h.nick ?? `${i + 1}P`}
                            </button>
                        )}
                        {/* 방장은 언제나 0번 영웅이다. 이름표 바로 뒤에 왕관을 세워, 여러
                            상태 줄을 훑을 때 방의 주인을 먼저 찾게 한다. */}
                        {coop && i === 0 && (
                            <span className="order-20 shrink-0 font-bold !text-[var(--rg-gold)]" title="방장">
                                ♛ 방장
                            </span>
                        )}
                        {/* **쓰러진 사람에게 제일 먼저 알려 줄 것은 이것**이다 — 누워 있는 동안
                            화면에 할 일이 하나도 없으면 판이 끝난 줄 안다. 줄은 가로로 넘치므로
                            (`overflow-x-auto whitespace-nowrap`) **이름표 바로 뒤**에 세운다 —
                            줄 끝에 뒀더니 390px 에서 통째로 밀려 나가 안 보였다(재 봤다). */}
                        {coop && i === who && iAmDown && state.heroes.some((o) => o.hp > 0) && (
                            <span className="font-bold text-[var(--rg-gold)]">
                                쓰러졌다 — 동료 이름표를 누르면 그쪽 눈으로 본다
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => { dispatchCmd({ t: "inspectStatus", who: i, kind: "origin" }); setSheet("log"); }}
                            className={`${statChip} order-0`}
                            title="직업 성장 정보 보기"
                        >
                            [<OriginTag origin={h.origin} level={h.level} />]
                        </button>
                        <button type="button" onClick={() => { dispatchCmd({ t: "inspectStatus", who: i, kind: "str" }); setSheet("log"); }} className={`${statChip} order-1`}>
                            St:{heroStr(h)}
                        </button>
                        <span className="order-4 basis-full h-0 p-0" aria-hidden="true" />
                        <button type="button" onClick={() => { setStatusKind("dlvl"); setSheetOwner(i); setSheet("status"); }} className={`${statChip} order-5 mr-[5ch]`}>Dlvl:{level.depth}</button>
                        <button type="button" onClick={() => { setStatusKind("gold"); setSheetOwner(i); setSheet("status"); }} className={`${statChip} order-6 text-[var(--rg-gold)]`}>$:{h.gold}</button>
                        <span className={`order-7 ${h.hp <= h.maxHp / 4 ? "font-bold text-[var(--rg-trap)]" : "text-[var(--rg-strong)]"}`}>
                            HP:{h.hp}({h.maxHp}){h.hp <= 0 && " 쓰러짐"}
                        </span>
                        {h.hp > 0 && h.hp <= h.maxHp / 4 && <span className="order-30 font-bold text-[var(--rg-trap)]">⚠ HP 낮음</span>}
                        <button type="button" title="방어등급 — 낮을수록 좋음" onClick={() => { dispatchCmd({ t: "inspectStatus", who: i, kind: "defense" }); setSheet("log"); }} className={`${statChip} order-8`}>
                            AC:{heroArmorClass(h)}
                        </button>
                        <button type="button" onClick={() => { dispatchCmd({ t: "inspectStatus", who: i, kind: "wisdom" }); setSheet("log"); }} className={`${statChip} order-2`}>
                            Wi:{Math.round(h.itemLuck * 100)}
                        </button>
                        <button type="button" onClick={() => { setStatusKind("xp"); setSheetOwner(i); setSheet("status"); }} className={`${statChip} order-9`}>Xp:{h.level}/{h.exp}</button>
                        {i === 0 && <button type="button" onClick={() => { setStatusKind("turn"); setSheetOwner(i); setSheet("status"); }} className={`${statChip} order-10 text-[var(--rg-label)]`}>T:{state.turn}</button>}
                        {
                            (h.timeStop ?? 0) > 0 && (
                                <span className="order-30 text-[var(--rg-wand)] font-bold">TimeStop({h.timeStop})</span>
                            )
                        }
                        {h.guarded && <span className="order-30 text-[var(--rg-armor)] font-bold">Guarded ({h.guardTurns ?? 0})</span>}
                        {h.confused > 0 && <span className="text-[var(--rg-potion)]">Confused</span>}
                        {h.blind > 0 && <span className="text-[var(--rg-potion)]">Blind</span>}
                        {h.stuck > 0 && <span className="text-[var(--rg-monster)]">Held</span>}
                        <button type="button" onClick={() => { setStatusKind("hunger"); setSheetOwner(i); setSheet("status"); }} className={`${statChip} order-3 font-bold ${hHunger ? "text-[var(--rg-monster)]" : "text-[var(--rg-faint)]"}`}>
                            {hHunger || "Well-fed"}
                        </button>
                        {i === 0 && level.mutator && FLOOR_EVENT_BANNER[level.mutator] && (
                            <span className="order-3 text-[var(--rg-gold)] font-medium">
                                {FLOOR_EVENT_BANNER[level.mutator].icon} {FLOOR_EVENT_BANNER[level.mutator].title}
                            </span>
                        )}
                        {hRings > 0 && <span className="order-3 text-[var(--rg-ring)]">Ring: {hRings}</span>}
                        {cursedGear && <span className="font-bold text-[var(--rg-trap)]">⚠ 저주 장비</span>}
                        {emptyWand && <span className="text-[var(--rg-wand)]">⚠ 빈 지팡이</span>}
                        {h.hasAmulet && <span className="text-[var(--rg-amulet)] font-bold">Amulet</span>}
                        {
                            online && linked && i !== who && DESK_DOING[peerModes[i] ?? "none"] && (
                                <span className="font-bold" style={{ color: PARTY_INK[i] }}>
                                    {DESK_DOING[peerModes[i] ?? "none"]}
                                </span>
                            )
                        }
                        {
                            coop && i === state.heroes.length - 1 && (
                                <span className="text-[var(--rg-faint)]">
                                    {online
                                        ? `온라인 방 ${room} · ${online === "host" ? "내가 방장" : "내가 동료"}${linked ? "" : " · 잇는 중…"}`
                                        : "? 조작"}
                                </span>
                            )
                        }
                    </div >
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
            {
                (coopKeys ? [0, 1] : [who]).map((w) => (
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
                ))
            }

            {
                sheet === "bestiary" && (
                    <Panel
                        {...shared}
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
                                { id: "potion" as const, label: "포션", countStr: `${itemProg.byCategory.potion.identified}/${itemProg.byCategory.potion.total}` },
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
                                        className={`rounded px-1.5 py-0.5 transition-colors ${active
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
                                                            Lv:{m.level} · HP:{m.hp} · AC:{10 - (m.defense ?? 0)} · Dmg:{" "}
                                                            {m.damage?.join(" + ") || "없음"} · Xp:{m.exp}{m.traits?.length ? ` · ${m.traits.join("")}` : ""}
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
                                                <li key={r.ch} className="border-b border-[var(--rg-line-soft)] pb-1 last:border-b-0">
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
                                                            Lv:{r.level} · HP:{r.hp} · AC:{10 - r.defense} · Dmg:{" "}
                                                            {r.damage.join(" + ") || "없음"} · Xp:{r.exp}{r.traits.length ? ` · ${r.traits.join("")}` : ""}
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
                                <p className="mt-3 border-t border-[var(--rg-line-soft)] pt-2 text-[11px] text-[var(--rg-faint)]">
                                    ※ 특성: M 사나움 · F 비행 · R 재생 · G 탐욕 · I 투명
                                </p>
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

                                    const weaponSkill = entry.kind === "weapon"
                                        ? weaponSkillRankName(weaponSkillLevel(state.heroes[0], entry.type))
                                        : null;
                                    const weaponSkillMaximum = entry.kind === "weapon"
                                        ? weaponSkillRankName(weaponSkillMax(state.heroes[0], entry.type))
                                        : null;
                                    const statsSummary =
                                        stage >= 3
                                            ? `${itemCodexStats(entry)}${entry.kind === "weapon" ? ` · ${weaponSkill} (${weaponSkillMaximum})` : ""}`
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
                                                className={`w-full rounded-[2px] px-1 text-left transition-colors ${stage === 0
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
                                                            className={`truncate ${stage >= 3
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
                                                                            <span className="text-[var(--rg-faint)]">숙련: </span>
                                                                            <span className="text-[var(--rg-strong)]">{weaponSkill} ({weaponSkillMaximum})</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[var(--rg-faint)]">무기 계열: </span>
                                                                            <span>{weaponSkillOf(entry.type)}</span>
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <span className="text-[var(--rg-faint)]">직업별 최대: </span>
                                                                            <span>{ORIGIN_LIST.map((origin) => `${origin.name} ${weaponSkillRankName(Math.max(1, WEAPON_SKILL_MAX[origin.id]?.[weaponSkillOf(entry.type)] ?? WEAPON_SKILL_MAX[origin.id]?.[entry.type] ?? 1))}`).join(" · ")}</span>
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
                                                                        <div className="col-span-2">
                                                                            <span className="text-[var(--rg-faint)]">효과: </span>
                                                                            <span className="text-[var(--rg-strong)]">{RING_EFFECTS[entry.type] ?? "알 수 없음"}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[var(--rg-faint)]">분류: </span>
                                                                            <span>반지</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[var(--rg-faint)]">나오는 층: </span>
                                                                            <span>{itemDepthRange("ring", entry.type) ? `${itemDepthRange("ring", entry.type)!.min}–${itemDepthRange("ring", entry.type)!.max}층` : "1–26층"}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[var(--rg-faint)]">허기: </span>
                                                                            <span>{entry.type === "slow digestion" ? "음식 소모 50% 감소" : "추가 허기 없음"}</span>
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
                )
            }

            {sheet === "status" && (() => {
                const statusHero = state.heroes[sheetOwner] ?? state.heroes[0];
                const origin = ORIGINS[statusHero.origin ?? "knight"];
                const status = statusKind === "origin"
                    ? `직업: ${origin.name}\n전직: ${statusHero.level >= ADVANCE_LEVEL ? origin.advancedName : `${ADVANCE_LEVEL}레벨에 ${origin.advancedName}`}\n${origin.traitDescription}`
                    : statusKind === "str"
                      ? `St:${heroStr(statusHero)}\n현재 공격력에 힘 보정으로 반영됩니다. 물약과 성장 선택으로 올릴 수 있습니다.`
                      : statusKind === "defense"
                        ? `AC:${heroArmorClass(statusHero)}\n방어등급은 낮을수록 좋습니다. 적의 공격 판정에서 받는 피해를 줄입니다.`
                      : statusKind === "wisdom"
                        ? `Wi:${Math.round(statusHero.itemLuck * 100)}\n아이템 등급 판정에 영향을 주며, 공격 지팡이 피해가 지혜 수치만큼 늘어납니다.`
                        : statusKind === "hunger"
                          ? `${hungerOf(statusHero) || "Well-fed"}\n걸음을 옮길 때마다 줄어드는 허기 상태입니다. 식량을 먹으면 회복됩니다.`
                          : statusKind === "dlvl"
                            ? `Dlvl:${level.depth}\n현재 던전 층입니다. 더 깊이 내려갈수록 강한 몬스터와 좋은 아이템이 나타납니다.`
                            : statusKind === "gold"
                              ? `$:${statusHero.gold}\n몬스터를 처치하거나 바닥에서 주워 얻습니다. 현재 판의 점수에 반영됩니다.`
                              : statusKind === "xp"
                                ? `Xp:${statusHero.level}/${statusHero.exp}\n표시 형식은 Xp:레벨/경험치입니다. 몬스터를 처치하면 경험치를 얻고, 일정량이 쌓이면 레벨이 오릅니다.`
                                : `T:${state.turn}\n플레이어가 행동한 횟수입니다. 행동할 때마다 허기와 몬스터의 차례가 진행됩니다.`;
                return (
                    <Panel {...shared} title={`${sheetOwner + 1}P 상태 설명`} onClose={() => setSheet("none")} footer="상태창을 누르면 해당 상태의 설명을 다시 볼 수 있습니다.">
                        <p className="whitespace-pre-line leading-relaxed text-[var(--rg-muted)]">{status}</p>
                    </Panel>
                );
            })()}

            {/*
              * 기록은 **최신이 맨 위**다. 판을 열면 방금 일어난 일이 손 닿는 자리에
              * 있어야 한다 — 아래로 굴려 내려가서 찾을 일이 아니다.
              * 위쪽 두 줄 띠는 그대로 시간순이다(그쪽은 「방금」만 보여 주므로).
              */}
            {
                sheet === "log" && (
                    <Panel
                        {...shared}
                        title="지나온 기록"
                        onClose={() => setSheet("none")}
                        /* 「이 d20 은 뭘 정하는 건가」를 여기서 답한다 — 줄에 이름은 붙였지만
                           스무면체가 명중에만 쓰인다는 것은 한 줄로 말해 주는 편이 빠르다. */
                        footer={`현재 Turn ${state.turn} · d20 은 명중에만 굴립니다 — 나와 상대가 각각 굴려 내 쪽이 높으면 맞습니다. 피해는 공격력(2d4 같은 것)에서 상대의 방어력을 뺀 값입니다.`}
                    >
                        {/* 결과가 먼저, 바로 아래 들여쓴 줄이 그 결과의 산식이다. 엔진이
                            `DETAIL` 로 가른 값을 읽기만 한다 — 화면이 전투 기록을 다시
                            분류하면 전투 규칙과 기록의 뜻이 갈릴 수 있다. */}
                        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--rg-line-soft)] pb-2 text-[11px] text-[var(--rg-faint)]">
                            <span>최근 기록 · 최신순</span>
                            <span className="sr-only">결과를 먼저 읽고, 아래 들여쓴 줄에서 명중·피해 계산을 확인합니다.</span>
                            <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-[var(--rg-label)]" aria-hidden="true" />
                                주요 사건
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-[var(--rg-line)]" aria-hidden="true" />
                                계산 상세
                            </span>
                        </div>
                        <ul className="space-y-2">
                            {state.messages
                                .slice(-80)
                                .reverse()
                                .map((m, i) => {
                                    const detail = isDetail(m);
                                    return (
                                    <li
                                        key={i}
                                        className={detail
                                            ? "ml-3 border-l-2 border-[var(--rg-line-soft)] bg-[var(--rg-bg)]/30 py-1 pl-3 pr-1 text-[var(--rg-muted)] leading-5 break-words"
                                            : `relative border-l-2 ${isImportantMessage(m) ? "border-[var(--rg-label)] bg-[var(--rg-bg)]/35" : "border-transparent"} ${isImportantMessage(m) ? "font-bold" : ""} py-1 pl-3 pr-1 leading-5 break-words text-[var(--rg-strong)]`}
                                    >
                                        <Msg text={m} heroes={state.heroes} />
                                    </li>
                                    );
                                })}
                        </ul>
                    </Panel>
                )
            }

            {/* 걸으면서 쓰지 않는 것들이 여기 모인다. 단추 판에 나란히 세워 두면
                「도움말」이 「마신다」와 같은 무게로 보이고, 급할 때 손가락이 헤맨다. */}
            {
                sheet === "options" && (
                    <Panel {...shared} title="옵션" onClose={() => setSheet("none")} footer="화면의 밝기(밝은 테마·어두운 테마)는 위·왼쪽 바의 단추가 정합니다.">
                        <ul className="space-y-1">
                            {[
                                {
                                    label: "새 판 시작 (출신 직업 선택)", hint: "왕실 근위대 · 도적 · 연금술사 · 연구자", go: () => {
                                        setOriginFor({ t: "new" });
                                        setSheet("origins");
                                    }
                                },
                                {
                                    label: "시드 링크 복사",
                                    hint: `시드 ${state.seed} · ${ORIGINS[(state.heroes[who] ?? state.heroes[0]).origin ?? "knight"].name}로 새 던전을 연다`,
                                    go: () => {
                                        void copySeedLink();
                                        setSheet("none");
                                    },
                                },
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
                                        // 핫시트 동료는 자리표(`guestKey`)가 없는 사람이다 — 온라인 손님이
                                        // 나갔다 대기석에 남긴 것과 섞이면 안 된다.
                                        (() => {
                                            const hotseatBenched = state.benched?.find((h) => h.guestKey === undefined);
                                            return {
                                                label: hotseatBenched ? "동료 다시 부르기 (한 화면에서 둘)" : "동료 부르기 (한 화면에서 둘)",
                                                hint: hotseatBenched
                                                    ? `보냈던 ${ORIGINS[hotseatBenched.origin ?? "knight"]?.name} Lv ${hotseatBenched.level} — 배낭 그대로`
                                                    : "직업을 고르면 내 곁에 선다",
                                                go: () => {
                                                    // 보냈던 동료는 **직업을 다시 안 묻는다** — 그 사람이 돌아온다.
                                                    if (hotseatBenched) {
                                                        setState((g) => (g ? joinGame(g) : g));
                                                        setSheet("none");
                                                        return;
                                                    }
                                                    setOriginFor({ t: "mate" });
                                                    setSheet("origins");
                                                },
                                            };
                                        })(),
                                    ]),
                                // **온라인일 때만** 선다 — 혼자 하는 판의 지도는 `@` 그대로라 적을 데가 없다.
                                ...(online
                                    ? [
                                        {
                                            label: "내 이름 바꾸기",
                                            hint: state.heroes[online === "guest" ? who : 0]?.nick
                                                ? `지금 ${state.heroes[online === "guest" ? who : 0]?.nick} — 지도의 내 칸에 적힌다`
                                                : `영문·숫자 ${NICK_MAX}자 — 지도의 내 칸에 적힌다`,
                                            go: () => {
                                                changeNick();
                                                setSheet("none");
                                            },
                                        },
                                    ]
                                    : []),
                                // **방장이 보는 손님 명부** — 사람마다 내보내기 단추 하나. 정원이
                                // 늘며 「동료 내보내기」한 줄로는 **누구를** 내보내는지 못 적게 됐다.
                                ...(room && online === "host"
                                    ? guests.map((g2) => ({
                                        label: `${g2.nick ?? `${g2.who + 1}P`} 내보내기`,
                                        hint:
                                            (g2.linked ? "연결됨" : "끊긴 채 자리만 지키는 중") +
                                            (g2.origin ? ` · ${ORIGINS[g2.origin]?.name}` : "") +
                                            " — 이 방에 다시 못 들어온다",
                                        go: () => {
                                            kickGuest(g2.who);
                                            setSheet("none");
                                        },
                                    }))
                                    : []),
                                ...(room && online === "host"
                                    ? [
                                        {
                                            // 방을 닫고 **다시 혼자로.** 판이 끝날 때까지 열어 두는 것이 기본이지만
                                            // (창을 닫았다 열어도 손님이 다시 붙는다), 그만두고 싶을 때가 있다.
                                            // 동료 자리는 `closeRoom` 이 `leaveGame` 으로 비운다 — 직업·배낭은 그
                                            // 판 안에 남아, 다시 열어 부르면 그대로 돌아온다.
                                            label: "온라인 방 닫기 (다시 혼자 하기)",
                                            hint: linked
                                                ? "동료는 제 판으로 돌아간다 — 내 판은 이어서 한다"
                                                : "기다리기를 그만두고 혼자 이어서 한다",
                                            go: () => {
                                                closeRoom("방을 닫았다. 다시 혼자다.");
                                                setSheet("none");
                                            },
                                        },
                                    ]
                                    : []),
                                ...(room
                                    ? [
                                        {
                                            // 방은 **판이 끝날 때까지** 열려 있다 — 창을 닫았다 열어도 손님이
                                            // 기다렸다 다시 붙는다. 저절로 닫히는 것은 새 판을 열 때다.
                                            label: online === "guest" ? `온라인 방 나가기 (${room})` : `온라인 방 ${room} — 초대 링크 복사`,
                                            hint:
                                                (online === "guest"
                                                    ? linked ? "연결됨" : "상대를 기다리는 중"
                                                    : `${guests.length}/${MAX_PARTY - 1}명 접속`) +
                                                (online === "guest" ? "" : " · 이 판이 끝나 새 판을 열 때까지 열어 둔다"),
                                            go: () => {
                                                if (online === "guest") closeRoom("방을 나왔다. 내 판으로 돌아왔다.");
                                                else copyInvite();
                                                setSheet("none");
                                            },
                                        },
                                    ]
                                    : [
                                        {
                                            label: "온라인 방 만들기",
                                            hint: `초대 링크나 코드 네 자리를 동료에게 보낸다 — 지금 판에 들어온다 (최대 ${MAX_PARTY - 1}명까지)`,
                                            go: () => {
                                                // 방장의 시작 직업도 손님처럼 먼저 고른다. 방을 열고 난
                                                // 뒤에 고르면 먼저 붙은 손님에게 기본 기사가 보인다.
                                                setOriginFor({ t: "host" });
                                                setSheet("origins");
                                            },
                                        },
                                        {
                                            label: "온라인 방 들어가기",
                                            hint: "동료가 알려 준 코드로 — 내 저장 판은 그대로 남는다",
                                            go: () => {
                                                const code = window.prompt("방 코드 네 자리")?.trim();
                                                if (!code) return;
                                                askNick();
                                                setSheet("none");
                                                // **먼저 붙는다** — 방장의 직업을 받아야 고르는 판이 열린다.
                                                void joinRoom(code);
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
                )
            }

            {
                sheet === "origins" && (
                    <Panel
                        title={originFor.t === "rematch" ? "다음 판의 출신(직업) 선택" : originFor.t === "host" ? "방장의 출신(직업) 선택" : originFor.t === "new" ? "출신(직업) 선택" : "동료의 출신(직업) 선택"}
                        accent={originFor.t === "new" || originFor.t === "host" ? undefined : PARTY_INK[1]}
                        onClose={() => {
                            // **안 고르고 닫으면 방에서 나온다.** 물어보려고 붙어만 있는 상태라,
                            // 그냥 닫으면 들어가지도 나가지도 않은 채 「잇는 중…」으로 남는다.
                            if (originFor.t === "guest") {
                                setOriginFor({ t: "new" });
                                setSheet("none");
                                closeRoom("직업을 안 고르고 방에서 나왔다.");
                            } else if (originFor.t === "rematch") {
                                // 선택 없이 닫아 방장과 다른 동료를 영원히 기다리게 하지 않는다.
                                pickOrigin("knight");
                            } else if (originFor.t !== "new" || (state && state.phase === "playing")) {
                                setOriginFor({ t: "new" });
                                setSheet("none");
                            } else startWithOrigin("knight");
                        }}
                    >
                        <div className="space-y-2 text-xs">
                            <p className="text-[var(--rg-faint)]">
                                {originFor.t === "new"
                                    ? "새 판을 떠날 출신을 고릅니다 — 시작 장비와 고유 특성이 갈립니다."
                                    : originFor.t === "host"
                                        ? "방을 열기 전에 방장의 출신을 고릅니다 — 손님도 방에 들어올 때 자신의 출신을 고릅니다."
                                    : originFor.t === "rematch"
                                        ? "방장이 다음 판을 준비 중입니다 — 내가 맡을 출신을 다시 고릅니다."
                                    : "동료가 맡을 출신을 고릅니다 — 방장과 다른 쪽을 고르면 서로 메웁니다."}
                            </p>
                            {/* **지금 누가 무엇인가.** 위의 「다른 쪽을 고르면 서로 메웁니다」가
                            조언이 되려면 이 줄이 있어야 한다 — 없으면 그건 수수께끼다. 정원이
                            늘며 **방장뿐 아니라 먼저 들어온 손님들**도 같이 보여야 한다 —
                            셋째로 들어오는 사람은 둘을 보고 고른다. */}
                            {(originFor.t === "guest" || originFor.t === "rematch") && roomParty.length > 0 && (
                                <p className="flex flex-col gap-0.5 rounded-[3px] border border-[var(--rg-line-soft)] bg-[var(--rg-raised)] px-2 py-1">
                                    {roomParty.map((p, i) => (
                                        <span key={i} className="font-bold" style={{ color: PARTY_INK[i] }}>
                                            {i === 0 ? "방장은 " : `${i + 1}P는 `}
                                            <OriginTag origin={p.origin} nick={p.nick} title />
                                        </span>
                                    ))}
                                </p>
                            )}
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {ORIGIN_LIST.map((orig) => (
                                    <button
                                        key={orig.id}
                                        type="button"
                                        onClick={() => pickOrigin(orig.id)}
                                        className="flex flex-col text-left rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-raised)] p-3 transition-colors hover:border-[var(--rg-line)] hover:bg-[var(--rg-hover)] focus:outline-none"
                                    >
                                        {/* 이름 · 영문 이름 · 값을 **줄마다 하나씩** 세운다. 한 줄에 다 넣으면
                                        좁은 칸에서 이름이 두 줄로 접히면서 카드 높이가 제각각이 된다. */}
                                        <div className="mb-0.5 flex items-baseline gap-1.5">
                                            {/* 표는 지도에서 그 물건을 칠하는 색으로 — 뜻이 색으로도 읽힌다. */}
                                            <span className="font-mono text-base leading-none" style={{ color: orig.iconInk }}>
                                                {orig.icon}
                                            </span>
                                            <span className="truncate font-bold text-sm text-[var(--rg-strong)]">{orig.name}</span>
                                        </div>
                                        <div className="mb-1.5 flex items-baseline justify-between gap-2 font-mono text-[11px]">
                                            <span className="text-[var(--rg-faint)]">{orig.title}</span>
                                            <span className="shrink-0 text-[var(--rg-gold)]">
                                                Hp {orig.baseHp} · Str {orig.baseStr}
                                            </span>
                                        </div>
                                        <p className="text-[11.5px] text-[var(--rg-muted)] mb-2">
                                            {orig.description}
                                        </p>
                                        <div className="mt-auto border-t border-[var(--rg-line-soft)] pt-1.5 text-[11px]">
                                            <span className="font-bold text-[var(--rg-strong)]">
                                                <span className="font-mono text-[var(--rg-gold)]">*</span> {orig.traitName}:{" "}
                                            </span>
                                            <span className="text-[var(--rg-faint)]">{orig.traitDescription}</span>
                                        </div>
                                        <div className="mt-1.5 border-t border-[var(--rg-line-soft)] pt-1.5 text-[11px]">
                                            <span className="font-bold text-[var(--rg-gold)]">Lv {ADVANCE_LEVEL} 전직 · {orig.advancedName}</span>
                                            <p className="mt-0.5 text-[var(--rg-faint)]">
                                                ★ {orig.advancedSkillName} — {orig.advancedSkillDescription}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Panel>
                )
            }

            {
                sheet === "help" && (
                    <Panel {...shared} title="조작" onClose={() => setSheet("none")} footer="죽으면 그것으로 끝입니다. 저장은 자동이고, 되돌리기는 없습니다.">
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
                                    <dt className="text-[var(--rg-label)]">쓰러지면</dt><dd>살아 있는 사람이 <b>더 깊은 층</b>에 닿으면 체력 1/4 로 일어납니다 (올라갈 때는 안 일어납니다). 계단은 한 명만 눌러도 둘이 함께 옮깁니다</dd>
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
                            <div className="mb-2 rounded-[3px] border border-[var(--rg-line-soft)] bg-[var(--rg-raised)] p-2">
                                <p className="font-bold text-[var(--rg-strong)]">전직과 기술</p>
                                <p className="text-[var(--rg-faint)]">레벨 {ADVANCE_LEVEL}에 전직합니다. 기사단장의 불굴의 방벽은 체력이 절반 이하일 때 항상 발동하고, 다른 전직 기술은 지도 왼쪽 위의 ★ 단추로 층마다 한 번 씁니다.</p>
                            </div>
                            <p className="text-[var(--rg-strong)]">
                                갑옷을 입으려면 <b>배낭</b>을 열고 갑옷을 누른 뒤 <b>「입는다」</b>를 누릅니다.
                                키보드로는 <b>W</b>.
                            </p>
                            <p><span className="text-[var(--rg-hero)]">@</span> 나 · <span className="text-[var(--rg-hero)]">†</span> 쓰러진 사람 · <span className="text-[var(--rg-monster)]">A–Z</span> 몬스터 · <span className="text-[var(--rg-gold)]">*</span> 금화 · <span className="text-[var(--rg-potion)]">!</span> 포션 · <span className="text-[var(--rg-scroll)]">?</span> 주문서</p>
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
                                <b className="text-[var(--rg-muted)]">모루 칸은 캠프이기도 합니다.</b> 그 칸에서{" "}
                                <b>배낭</b>을 열면 <b>캠프 상자</b>가 뜹니다 — <b>{CHEST_SLOTS}칸</b>까지 맡길 수
                                있고, 맡긴 것은{" "}
                                <b className="text-[var(--rg-muted)]">죽어도 사라지지 않아 다음 판에서 그대로
                                    꺼냅니다.</b>{" "}
                                다만 <b>꺼내는 것도 캠프에서만</b> 합니다 — 새 판은 맨손으로 시작하고, 모루를 찾아
                                걸어가야 상자가 열립니다. <b className="text-[var(--rg-trap)]">증표는 못 맡깁니다.</b>{" "}
                                둘이서 할 때는 <b>사람마다 상자가 따로</b>입니다.
                            </p>
                            <p className="text-[var(--rg-faint)]">
                                숨은 문은 벽과 똑같이 보입니다. 막힌 것 같으면 <b>뒤져</b> 보십시오.
                                반지는 끼고 있으면 배가 더 고픕니다.
                            </p>
                            <p className="text-[var(--rg-faint)]">
                                <b className="text-[var(--rg-muted)]">한 종을 한 마리라도 잡으면</b> 그 뒤로는 도감에서
                                레벨·방어·피해를 볼 수 있습니다. 이 도감은 <b className="text-[var(--rg-muted)]">죽어도
                                    남습니다</b> — 포션의 색은 판마다 섞이지만 오크가 얼마나 단단한지는 세상의 사실입니다.
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
                )
            }

            {
                sheet === "graves" && (
                    selectedTomb ? (
                        <Panel
                            {...shared}
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
                                    </div>
                                </div>

                                {/* 2. 영웅 능력치 (Hero Stats) */}
                                {selectedTomb.hero && (
                                    <div>
                                        <div className="mb-1 flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-[var(--rg-label)]">Stats</h4>
                                            {selectedTomb.hero.origin && (
                                                <span className="text-xs font-bold text-[var(--rg-strong)]">
                                                    <OriginTag origin={selectedTomb.hero.origin} nick={selectedTomb.hero.nick} level={selectedTomb.hero.level} title />
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-bg)] p-2.5 text-[var(--rg-muted)]">
                                            <div>
                                                <span className="text-[var(--rg-faint)] text-[11px] block">St</span>
                                                <span className="text-[var(--rg-strong)] font-bold">{selectedTomb.hero.str}({selectedTomb.hero.maxStr})</span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--rg-faint)] text-[11px] block">HP</span>
                                                <span className={selectedTomb.hero.hp <= 0 ? "text-[var(--rg-trap)] font-bold" : "text-[var(--rg-hero)] font-bold"}>
                                                    {selectedTomb.hero.hp}({selectedTomb.hero.maxHp})
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--rg-faint)] text-[11px] block">AC</span>
                                                <span className="text-[var(--rg-armor)] font-bold">{10 - selectedTomb.hero.defense}</span>
                                            </div>
                                            <div>
                                                <span className="text-[var(--rg-faint)] text-[11px] block">Xp</span>
                                                <span className="text-[var(--rg-strong)] font-bold">{selectedTomb.hero.exp}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3. 소지품 배낭 (Inventory) */}
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

                                {/* 4. 마지막 로그 (Recent Log) */}
                                {selectedTomb.recentLog && selectedTomb.recentLog.length > 0 && (
                                    <div>
                                        <h4 className="mb-1 text-xs font-bold text-[var(--rg-label)]">마지막 기록</h4>
                                        <div className="max-h-24 overflow-y-auto rounded-[4px] border border-[var(--rg-line-soft)] bg-[var(--rg-bg)] p-2 font-mono text-[11px] leading-relaxed text-[var(--rg-faint)]">
                                            {[...selectedTomb.recentLog].reverse().map((logMsg, lIdx) => (
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
                        <Panel {...shared} title="지난 판들" onClose={() => setSheet("none")}>
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
                                                            <span className="font-semibold text-[var(--rg-strong)]"><OriginTag origin={t.hero.origin} nick={t.hero.nick} level={t.hero.level} /></span>
                                                            <span>·</span>
                                                        </>
                                                    )}
                                                    <span>{t.depth}층</span>
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
                )
            }

            {
                state.phase !== "playing" && sheet === "none" && modes.every((m) => m === "none") && (
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
                        {state.phase === "dead" && (
                            <div className="mb-3 rounded-[3px] border border-[var(--rg-line-soft)] bg-[var(--rg-raised)] px-3 py-2">
                                <p className="mb-1 font-bold text-[var(--rg-strong)]">마지막 순간</p>
                                <ul className="space-y-0.5 text-[var(--rg-muted)]">
                                    {[...state.messages.filter((m) => !isDetail(m)).slice(-5)].reverse().map((m, i) => (
                                        <li key={i}>· <Msg text={m} heroes={state.heroes} /></li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-[11px] text-[var(--rg-faint)]">
                                    남긴 포션 {hero.pack.filter((it) => it.kind === "potion").reduce((n, it) => n + it.count, 0)} 개
                                    {" · "}미식별 물건 {hero.pack.filter((it) => ["potion", "scroll", "ring", "wand"].includes(it.kind) && !state.known[`${it.kind}:${it.type}`]).length} 종
                                    {" · "}남은 식량 {hero.pack.filter((it) => it.kind === "food").reduce((n, it) => n + it.count, 0)} 개
                                </p >
                            </div >
                        )
                        }
                        <dl className="grid grid-cols-[6em_1fr] gap-y-1 text-[var(--rg-muted)]">
                            <dt>출신</dt><dd className="text-[var(--rg-strong)] font-semibold"><OriginTag origin={hero.origin} nick={hero.nick} level={hero.level} title /></dd>
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
                    </Panel >
                )}
        </div >
    );
}
