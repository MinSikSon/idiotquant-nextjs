// 온라인 방의 **문지기** — 들어온 동료를 내보내는 자리.
//
// 이 규칙들은 엔진이 아니라 화면(`Rogue.tsx`)의 네트워크 배선에 산다. 브라우저로 잡으려면
// 피어 둘을 실제로 붙여야 하는데(브로커·NAT 가 끼어든다) 그걸 테스트에서 매번 세울 수는
// 없다. 그래서 **배선의 모양**을 글자로 건다 — 여기서 틀리면 조용히 안 듣는 자리들이다.
//
//   ① 내보내기와 방 나가기는 **다른 인사**다(`kick` vs `bye`). 손님 화면에 적는 까닭이
//      다르고, 내보내기만 그 사람을 명부에 올린다.
//   ② **내보낸 사람은 자리가 비어도 안 받는다.** 명부를 자리 확인보다 **먼저** 본다 —
//      순서가 뒤집히면 내보낸 사람이 곧바로 다시 붙어서, 내보낸 것이 아니라 잠깐 끊은
//      것이 된다.
//   ③ 손님은 `kick` 을 받으면 제 판으로 돌아간다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(path.join(ROOT, "app/(game)/game/Rogue.tsx"), "utf8");

test("내보낸 동료는 방이 열려 있는 동안 다시 못 들어온다", () => {
    // ── ① 내보내기는 방 나가기와 **다른 인사**다
    {
        assert.match(SRC, /\|\s*\{\s*t:\s*"kick"\s*\}/, "규약에 `kick` 이 없다 — 내보내기가 방 닫기와 한 인사를 쓰면 손님이 까닭을 못 읽는다");
        assert.match(SRC, /send\(\{\s*t:\s*"kick"\s*\}/, "내보낼 때 `kick` 을 안 보낸다");
    }

    // ── ② 명부를 **자리 확인보다 먼저** 본다
    {
        const door = SRC.indexOf('peer.on("connection"');
        assert.ok(door > 0, "방장의 손님 받는 자리를 못 찾았다 — 이 테스트가 무엇을 재는지 잃었다");
        const banAt = SRC.indexOf("banned.current.has", door);
        const fullAt = SRC.indexOf("net.current?.conn?.open", door);
        assert.ok(banAt > door, "내보낸 사람을 걸러 내지 않는다 — 내보내도 곧바로 다시 붙는다");
        assert.ok(fullAt > door, "자리가 찼는지 보는 자리를 못 찾았다");
        assert.ok(
            banAt < fullAt,
            "명부를 자리 확인보다 나중에 본다 — 자리가 비면 내보낸 사람이 그대로 다시 들어온다",
        );
    }

    // ── ③ 내보낼 때 그 사람을 명부에 올린다
    {
        const kick = SRC.indexOf("const kickGuest");
        assert.ok(kick > 0, "내보내기가 없다");
        const body = SRC.slice(kick, SRC.indexOf("}, [note]);", kick));
        assert.match(body, /banned\.current\.add/, "내보내면서 명부에 안 올린다");
        assert.match(body, /leaveGame/, "동료 자리를 안 비운다 — 방장 화면에 동료가 남는다");
        assert.match(body, /setLinked\(false\)/, "이어져 있다는 표시가 안 내려간다");
    }

    // ── ④ 손님은 `kick` 을 받으면 제 판으로 돌아간다
    {
        const at = SRC.indexOf('m?.t === "kick"');
        assert.ok(at > 0, "손님이 `kick` 을 안 듣는다 — 내보내도 남의 판을 든 채 남는다");
        const after = SRC.slice(at, at + 260);
        assert.match(after, /closeRoomRef\.current\(/, "`kick` 을 받고도 방을 안 나간다");
        assert.match(after, /내보냈다/, "왜 나가는지를 손님 화면에 안 적는다");
    }
});
