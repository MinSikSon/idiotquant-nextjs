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
    | "home"
    | "office"
    | "park-debtCleared"
    | "park-debtRemains"
    | "park-trustLost"
    | "park-ruined";

/** 시트 한 변. 프레임이 이 밖으로 나가면 안 된다 — 테스트가 본다. */
export const SHEET_SIZE = 640;

/**
 * 시트 안의 칸. 잘라 붙일 때 격자로 맞춰 두어서 좌표가 지저분하지 않다.
 *
 * **엔딩 넷에 그림은 둘이다.** 아직 굴러가는 둘은 벤치, 무너진 둘은 그 인물. 엔딩의
 * 제목·색·문구는 이미 넷 다 다르므로 그림까지 넷일 필요는 없고, 이 둘로 갈리는 편이
 * 오히려 뜻이 산다. 넷으로 늘릴 자리는 그대로 남아 있다 — 시트에 칸을 더하고 여기
 * 좌표만 바꾸면 된다.
 *
 * 표가 `ui/art.ts` 가 아니라 여기 있는 이유는 `ArtKey` 와 같다 — 그쪽은 Phaser 를
 * 들여와서, 표가 거기 있으면 **브라우저 없이는 검사할 수 없다.**
 */
export const FRAMES: Record<ArtKey, readonly [number, number, number, number]> = {
    home: [0, 0, 320, 320],
    office: [320, 0, 320, 320],
    "park-debtCleared": [0, 320, 320, 320],
    "park-debtRemains": [0, 320, 320, 320],
    "park-trustLost": [320, 320, 320, 320],
    "park-ruined": [320, 320, 320, 320],
};

/** 전환 화면 한 장. */
export interface Cut {
    art: ArtKey;
    /** 굵게 한 줄 — 언제인가. */
    head: string;
    /** 그 아래 몇 줄 — 무슨 일이 있었나. */
    lines: string[];
}

/**
 * 1997년 12월의 집. 게임을 켤 때와 **회귀했을 때** 둘 다 여기로 온다.
 *
 * 첫 회차와 그 뒤가 다른 말을 해야 한다 — 두 번째부터는 "돌아왔다" 는 것이 이 화면의
 * 전부이기 때문이다.
 */
export function cutToHome(ch: Chapter, cycle: number): Cut {
    return {
        art: "home",
        head: `${ch.year}년 12월`,
        lines: cycle <= 1
            ? ["여기서부터다."]
            : [`${cycle}회차`, "눈을 뜨니 다시 1997년 12월이었다."],
    };
}

/** 집에서 나가 회사로. */
export function cutToOffice(ch: Chapter): Cut {
    return {
        art: "office",
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
        `신뢰 ${sum.trust}`,
        sum.debt > 0 ? `남은 빚 ${fmtMoney(sum.debt)}` : "빚을 다 갚았다",
    ];
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
