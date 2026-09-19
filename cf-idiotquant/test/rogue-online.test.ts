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
//   ③ 손님은 `kick` 을 받으면 제 판으로 돌아간다
//   ④ **손님은 방장의 직업을 보고 고른다** — 먼저 물어보고(`peek` → `room`), 고른 뒤에야
//      `hello` 로 자리에 앉는다. 그 사이에는 `linked` 가 안 서야 한다(자리도 없는데 키가
//      먹으면 방장 쪽에서 없는 영웅을 움직인다)..

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

test("손님은 방장의 직업을 보고 고른다 — 고르기 전에는 자리에 안 앉는다", () => {
    // ── ① 규약에 물음과 답이 둘 다 있다
    {
        assert.match(SRC, /\|\s*\{\s*t:\s*"peek"\s*\}/, "규약에 `peek` 이 없다 — 물어볼 길이 없으면 고르는 화면이 방장을 모른다");
        assert.match(SRC, /\|\s*\{\s*t:\s*"room";\s*origin:\s*HeroOrigin[^}]*\}/, "규약에 답(`room`)이 없다");
    }

    // ── ② 방장은 `peek` 에 제 직업으로 답하되, **자리는 안 준다**
    {
        const at = SRC.indexOf('m?.t === "peek"');
        assert.ok(at > 0, "방장이 `peek` 을 안 듣는다");
        const body = SRC.slice(at, SRC.indexOf('m?.t === "hello"', at));
        assert.match(body, /send\(\{\s*t:\s*"room",\s*origin:/, "물어봤는데 방장의 직업을 안 준다");
        assert.ok(!/joinGame|setLinked\(true\)/.test(body), "물어보기만 했는데 자리에 앉혔다 — 고르기 전에 동료가 선다");
    }

    // ── ③ 손님은 **직업이 없으면** 인사 대신 물음을 보낸다
    {
        const open = SRC.indexOf('conn.on("open", () => {', SRC.indexOf("const joinRoom"));
        assert.ok(open > 0, "손님이 잇는 자리를 못 찾았다");
        const body = SRC.slice(open, SRC.indexOf('conn.on("data"', open));
        assert.match(body, /conn\.send\(\s*origin\b/, "손님이 고른 직업 유무로 갈라 보내지 않는다");
        assert.match(body, /t:\s*"hello",\s*origin/, "고른 뒤에 보내는 인사가 없다");
        assert.match(body, /t:\s*"peek"/, "안 골랐을 때 보내는 물음이 없다");
    }

    // ── ④ **판을 받아야 이어진 것**이다 — `open` 만으로 `linked` 를 세우지 않는다
    {
        const open = SRC.indexOf('conn.on("open", () => {', SRC.indexOf("const joinRoom"));
        assert.ok(open > 0, "손님이 잇는 자리를 못 찾았다");
        const body = SRC.slice(open, SRC.indexOf('conn.on("data"', open));
        assert.ok(
            !/setLinked\(true\)/.test(body),
            "붙자마자 이어졌다고 친다 — 아직 자리도 없는데 키가 먹어 방장이 없는 영웅을 움직인다",
        );
        const init = SRC.indexOf('m?.t === "init"', open);
        assert.ok(init > 0, "손님이 판을 받는 자리를 못 찾았다");
        assert.match(SRC.slice(init, init + 220), /setLinked\(true\)/, "판을 받고도 이어졌다고 안 친다");
    }

    // ── ⑤ **판을 받기 전에는 남의 걸음을 안 듣는다**
    //
    // 물어보기만 하는 동안에도 줄은 열려 있어서, 방장이 제 걸음을 실어 보내는 `cmd` 가
    // 그대로 날아온다. 거르지 않으면 **아직 손님도 아닌 사람의 제 저장 판**이 남의
    // 걸음으로 굴러간다.
    {
        assert.match(SRC, /m\?\.t === "cmd" && m\.cmd && joined/, "판을 받기 전에 온 명령을 그대로 적용한다");
        const init = SRC.indexOf('m?.t === "init"', SRC.indexOf("const joinRoom"));
        assert.match(SRC.slice(init, init + 220), /joined = true/, "판을 받고도 문이 안 열린다 — 손님이 영영 멈춘다");
    }

    // ── ⑥ 받은 직업을 **고르는 화면에 적는다**
    {
        assert.match(SRC, /setHostOrigin\(/, "받은 직업을 어디에도 안 담는다");
        assert.match(SRC, /방장은 /, "고르는 화면에 방장이 누구인지를 안 적는다");
        assert.match(SRC, /OriginTag origin=\{hostOrigin\}/, "고르는 화면에 방장의 직업을 안 적는다");
        assert.match(SRC, /\{hostNick &&/, "고르는 화면에 방장의 이름을 안 적는다");
    }
});
