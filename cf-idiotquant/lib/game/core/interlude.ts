// 장소가 바뀌는 순간이 **무슨 말을 하는가.**
//
// ── 왜 이 파일이 core 에 있나 ───────────────────────────────────
// 씬의 규약 그대로다 — 규칙과 문구는 `core/` 가 내고 화면은 그리기만 한다.
// Phaser 를 안 쓰므로 브라우저 없이 테스트가 돌고, 결산 줄이 실제 성적과 어긋나는지를
// 눈이 아니라 테스트가 본다.
//
// ── 챕터 결산이 여기서 처음 보인다 ──────────────────────────────
// `endChapter()` 가 내는 `ChapterSummary` 는 여태 `remember()` 로 흘러들어가 **화면에
// 한 번도 안 나왔다.** 회사에서 집으로 돌아오는 전환이 그 자리다 — 장소를 넷으로 늘리지
// 않고 결산을 되살린다.

import type { Chapter } from "./chapters";
import type { ChapterSummary, EndReason } from "./types";

/**
 * 그림이 필요한 자리. **`ui/art.ts` 가 이 이름을 시트의 칸에 맞춘다.**
 *
 * 여기(core)에 두는 이유: `Cut` 이 이 타입을 쓰는데, `ui/art.ts` 는 Phaser 를 들여와서
 * core 가 그쪽을 가리키면 테스트가 브라우저를 찾는다. 이름은 core 가 정하고 그리는 법은
 * ui 가 안다.
 */
export type ArtKey =
    /** 시작 화면의 큰 정사각. 이 판이 무엇인지 한 장으로 말하는 자리. */
    | "title"
    /** 집 — 시작·회귀·챕터 결산의 막, 그리고 집 화면의 정사각. */
    | "home"
    /** 회사 — 뉴스 창의 검은 화면 뒤에 어렴풋이 깔린다. */
    | "office"
    /** **그 해의 문을 여는 장면.** 「사무실 문을 열었다」 막이 쓴다. */
    | `year-${ChapterYear}`
    /** 끝 — 넷이 각각 다른 그림을 가질 수 있다. */
    | `park-${EndReason}`
    /** **앞에 앉은 사람.** 뉴스 창의 고객 줄에 작게 선다. */
    | `client-${ClientId}`;

/** 연대 스크립트의 네 해. `chapters.ts` 의 `year` 와 같아야 한다. */
export type ChapterYear = "1997" | "1998" | "1999" | "2000";
/** 고객 넷. `clients.ts` 의 `id` 와 같아야 한다. */
export type ClientId = "kim" | "mother" | "park" | "choi";

/**
 * 그림 한 칸의 한 변. **자리마다 크기가 다르다.**
 *
 * 장면은 화면의 큰 정사각에 들어가므로 320 이 필요하고, 고객 얼굴은 34px 자리에 들어가니
 * DPR 3 을 쳐도 160 이면 남는다. 얼굴까지 320 으로 두면 시트가 두 배가 되는데 그만큼
 * 선명해지지도 않는다.
 */
export function cellOfArt(key: ArtKey): number {
    return key.startsWith("client-") ? 160 : 320;
}

/** 슬롯 전부. 시트를 짜는 순서이자, 그림이 있는지 세는 목록이다. */
export const ART_KEYS: readonly ArtKey[] = [
    "title", "home", "office",
    "year-1997", "year-1998", "year-1999", "year-2000",
    "park-debtCleared", "park-debtRemains", "park-burnout", "park-ruined",
    "client-kim", "client-mother", "client-park", "client-choi",
];

/**
 * ── 좌표는 이제 여기 없다 ──────────────────────────────────────
 * `FRAMES` 와 시트 크기는 **`scripts/build-game-sheet.mjs` 가 만든다**
 * (`lib/game/ui/artFrames.ts`). 그림 한 장을 `game-art-src/<키>.png` 로 넣으면 그 칸이
 * 생기고, 없으면 그 키는 표에 아예 안 들어간다 — 그러면 `drawArt` 가 null 을 내고
 * 화면은 오늘의 자리표시를 그린다. **슬롯마다 따로 떨어진다.**
 *
 * 좌표를 손으로 적던 때는 그림을 다시 뽑을 때마다 표와 시트가 어긋났다. 이제 어긋날
 * 수가 없다 — 폴더가 곧 표다.
 */

/** 전환 화면 한 장. */
export interface Cut {
    art: ArtKey;
    /** 굵게 한 줄 — 언제인가. */
    head: string;
    /** 그 아래 몇 줄 — 무슨 일이 있었나. */
    lines: string[];
}

/** 판이 열릴 때의 형편. 화면이 이 값을 읽어 브리핑을 만든다. */
export interface StartState {
    /** 고객 돈. 프롤로그는 이걸 손에 쥐고 앉아 있다. */
    entrusted: number;
    /** 내 돈. 프롤로그에는 월급 남은 것이 조금 있다. */
    wallet: number;
    /** 1997 이 끝날 때 생기는 빚. */
    debtToCome: number;
}

/**
 * 시작 화면에서 집으로. **한 판이 여기서 시작된다.**
 *
 * 예전에는 이 문구 하나가 「게임을 켰다」와 「회귀했다」를 겸했다. 그래서 판의 경계가
 * 흐렸다 — 어디서 끝나고 어디서 시작하는지 화면에 표시가 없었다. 지금은 시작이 이 막이고
 * 끝은 `cutRegress`·`cutEnded` 가 따로 진다.
 *
 * ── 여기가 브리핑 자리다 ─────────────────────────────────────
 * 예전에는 「여기서부터다.」 한 줄뿐이었다. 그런데 이 막이 **판이 열리기 전 마지막으로
 * 글을 읽는 자리**다 — 다음 화면은 집이고 그다음은 곧장 객장이다. 한 줄만 적어 두면
 * 처음 켠 사람은 자기가 무엇을 얼마나 들고 앉는지 모른 채 첫 턴을 맞는다.
 *
 * 그래서 **지금 손에 무엇이 있고 앞으로 무엇이 오는지**를 여기서 말한다. 숫자는
 * `StartState` 로 받는다 — 이 파일은 엔진을 모르고, 서식은 화면이 정한다.
 */
export function cutStartRun(
    ch: Chapter, cycle: number, st: StartState, fmtMoney: (v: number) => string,
): Cut {
    const lines = cycle <= 1 ? [] : [`${cycle}회차 — 다시 여기서부터다.`];
    lines.push(`고객 돈 ${fmtMoney(st.entrusted)}을 맡고 있다. 아직 아무 데도 안 넣었다.`);
    if (st.wallet > 0) lines.push(`내 지갑에는 월급 남은 ${fmtMoney(st.wallet)}.`);
    // **앞으로 올 것을 미리 말한다.** 넉 턴 뒤에 빚이 생기는데, 그걸 모르고 지나면
    // 1998 의 3,000만이 어디서 왔는지 알 수 없다.
    if (st.debtToCome > 0) {
        lines.push(`이 해가 끝나면 빚 ${fmtMoney(st.debtToCome)}이 남는다.`);
    }
    return { art: "home", head: `${ch.year}년 12월`, lines };
}

/**
 * 공원에서 시작 화면으로. **판 하나가 끝났다는 표시다.**
 *
 * 지는 엔딩 셋은 전부 이리로 온다. 곧장 집으로 들여보내지 않는 이유는 하나다 —
 * 그러면 끝난 줄 모르고 계속 굴러가는 것처럼 보인다. 판과 판 사이에는 문턱이 있어야 한다.
 */
export function cutRegress(cycle: number): Cut {
    return {
        art: "home",
        head: `${cycle}회차 끝`,
        lines: ["눈을 감았다 뜨니 다시 1997년 12월이었다.", `이제 ${cycle + 1}회차다.`],
    };
}

/** 공원에서 끝 화면으로. **빚을 다 갚았을 때만 여기로 온다.** */
export function cutEnded(cycle: number): Cut {
    return {
        art: "park-debtCleared",
        head: "갚았다",
        lines: [`${cycle}회차에 빚이 0 이 됐다.`, "더 돌아가지 않는다."],
    };
}

/**
 * 집에서 나가 회사로. **이 막이 그 해의 얼굴이다.**
 *
 * 넷 다 사무실 그림 하나를 돌려 쓰던 자리였다. 그런데 이 게임은 같은 사무실에서
 * 열두 턴을 보내는 이야기가 아니라 **네 해를 지나는 이야기**다 — 1997 의 환란,
 * 1998 의 빈 골목, 1999 의 열병, 2000 의 청구서. 해가 바뀐 것이 화면에서 바뀌어야 한다.
 *
 * 그림이 아직 없으면 자리표시가 뜬다 — 그때도 머리글의 「1998 · 바닥에서」는 그대로다.
 */
export function cutToOffice(ch: Chapter): Cut {
    return {
        art: `year-${ch.year as ChapterYear}`,
        head: `${ch.year} · ${ch.title}`,
        lines: ["사무실 문을 열었다."],
    };
}

/**
 * 한 챕터가 끝나고 집으로. **여태 버려지던 성적이 이 줄들이다.**
 *
 * @param fmtMoney 금액 표기. `ui/theme.ts` 의 `money` 를 씬이 넘긴다 — 그 파일은
 *   Phaser 를 들여오므로 여기서 직접 부를 수 없고, 그렇다고 같은 규칙을 두 벌 두면
 *   언젠가 한쪽만 고쳐진다.
 */
export function cutOnChapterEnd(
    ch: Chapter, sum: ChapterSummary, fmtMoney: (v: number) => string,
): Cut {
    const lines: string[] = [
        `맡은 돈 ${sum.returnPct >= 0 ? "+" : ""}${sum.returnPct.toFixed(1)}%`,
        `에너지 ${sum.energy}`,
    ];
    // **보수가 어디로 갔는지를 말한다.** 예전에는 「빚을 갚았다」라고 적었는데, 이제
    // 보수는 지갑으로 들어오고 갚는 것은 집에서 내가 누른다(`core/wallet.ts`). 그
    // 한 줄을 안 고치면 화면이 일어나지 않은 일을 말한다.
    if (sum.fee > 0) lines.push(`보수 ${fmtMoney(sum.fee)} — 지갑에 들어왔다`);
    lines.push(`지갑 ${fmtMoney(sum.wallet)}`);
    lines.push(sum.debt > 0 ? `남은 빚 ${fmtMoney(sum.debt)}` : "빚을 다 갚았다");
    // 0 장은 정보가 아니다 — 줄을 아예 안 만든다.
    if (sum.earned.length > 0) lines.push(`새로 겪은 것 ${sum.earned.length}장`);
    // 12턴을 흘려보낸 것은 성적이 아니라 사건이다. 숫자보다 이 한 줄이 아프다.
    if (sum.idle) lines.push("한 번도 권하지 않았다.");

    return { art: "home", head: `${ch.year} 결산`, lines };
}

/** 끝났다. 공원으로. 그림은 **어떻게 끝났는지로 갈린다.** */
export function cutToPark(ch: Chapter, reason: EndReason, title: string): Cut {
    return {
        art: `park-${reason}`,
        head: `${ch.year}년 겨울`,
        lines: [title],
    };
}
