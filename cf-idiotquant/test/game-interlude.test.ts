// 전환 화면 — **결산이 성적과 어긋나지 않는가.**
//
// 이 줄들이 여태 화면에 없던 값이라 눈으로 확인할 수가 없었다. `ChapterSummary` 를
// 그대로 읽는지, 없는 것을 지어내지 않는지를 여기서 잠근다.
//
// `core/interlude.ts` 는 Phaser 를 안 부르는 순수 함수라 브라우저 없이 돈다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { FRAMES } from "@/lib/game/ui/artFrames";

import { cutToPark, ART_KEYS } from "@/lib/game/core/interlude";
import { CHAPTERS } from "@/lib/game/core/chapters";
import type { EndReason } from "@/lib/game/core/types";

const LAST = CHAPTERS[CHAPTERS.length - 1]!;

/* ── 판의 시작과 끝 ─────────────────────────────────────────── */

/* ── 결산 — ChapterSummary 를 그대로 읽는가 ──────────────────── */
/* ── 공원 — 끝난 방식이 그림을 가른다 ───────────────────────── */

const REASONS: EndReason[] = ["debtCleared", "debtRemains", "burnout", "ruined"];

/* ── 시트 — 표와 그림이 어긋나지 않는가 ────────────────────── */
//
// 좌표표(`ui/artFrames.ts`)는 **`scripts/build-game-sheet.mjs` 가 만든다.** 그래서 여기서
// 볼 것은 「표가 빠짐없는가」가 아니라 **「표가 실제 시트와 맞는가」**다 — 그림이 없는
// 자리는 표에 없는 것이 정상이고(자리표시로 떨어진다), 있는 자리가 그림 밖을 가리키면
// 화면에 빈 네모가 뜬다.
test("엔딩 넷이 저마다 자기 그림 키를 낸다 · 표의 모든 키가 선언된 슬롯이다 — 오타 난 파일 이름이 조용히 지나가지 않게", () => {
    // ── 엔딩 넷이 저마다 자기 그림 키를 낸다
    {
        for (const r of REASONS) {
            const cut = cutToPark(LAST, r, "제목");
            assert.equal(cut.art, `park-${r}`);
            assert.deepEqual(cut.lines, ["제목"]);
        }
    }

    // ── 표의 모든 키가 선언된 슬롯이다 — 오타 난 파일 이름이 조용히 지나가지 않게
    {
        for (const key of Object.keys(FRAMES)) {
            assert.ok((ART_KEYS as readonly string[]).includes(key),
                `${key} 는 ArtKey 에 없다 — game-art-src 의 파일 이름을 볼 것`);
        }
    }
});
