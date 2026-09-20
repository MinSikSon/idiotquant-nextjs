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

    // ── ② `hello` 안에서 명부를 **자리 확인보다 먼저** 본다
    //
    // 손님이 하나뿐이던 시절에는 「자리가 찼는가」를 붙는 순간(`peer.on("connection")`)
    // 바로 봤다. 이제 정원이 늘며 **`hello` 를 받아야** 누구인지·자리가 있는지 안다 —
    // 자리 확인도 그 안으로 옮겨 갔다.
    {
        const at = SRC.indexOf('m?.t === "hello"');
        assert.ok(at > 0, "방장이 인사를 받는 자리를 못 찾았다");
        const body = SRC.slice(at, SRC.indexOf('m?.t === "bye"', at));
        const banAt = body.indexOf("banned.current.has");
        const fullAt = body.indexOf("s.heroes.length >= MAX_PARTY");
        assert.ok(banAt >= 0, "내보낸 사람을 걸러 내지 않는다 — 내보내도 곧바로 다시 붙는다");
        assert.ok(fullAt >= 0, "자리가 찼는지 보는 자리를 못 찾았다");
        assert.ok(
            banAt < fullAt,
            "명부를 자리 확인보다 나중에 본다 — 자리가 비면 내보낸 사람이 그대로 다시 들어온다",
        );
    }

    // ── ③ 내보낼 때 그 사람을 명부에 올린다
    {
        const kick = SRC.indexOf("const kickGuest");
        assert.ok(kick > 0, "내보내기가 없다");
        const body = SRC.slice(kick, SRC.indexOf("[note, syncGuests, broadcast]", kick));
        assert.match(body, /banned\.current\.add/, "내보내면서 명부에 안 올린다");
        assert.match(body, /leaveGame/, "동료 자리를 안 비운다 — 방장 화면에 동료가 남는다");
        // **이어져 있다는 표시는 명부에서 다시 셈한다**(`syncGuests`) — 남은 손님이 있으면
        // 내보낸 뒤에도 `linked` 는 참이어야 한다. 무조건 `setLinked(false)` 로 내리면
        // 정원이 늘었을 때 딴 손님까지 「끊겼다」고 잘못 뜬다.
        assert.match(body, /syncGuests\(next\)/, "손님을 내보내고도 명부를 다시 안 셈한다");
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

// 방장이 끊겼다 돌아오면 **이어서** 한다.
//
// 방장의 판에는 손님의 영웅도 들어 있고(`heroes[1]`), 그것까지 저장에 남는다. 그래서
// 창을 닫았다 열어도 **같은 코드로 방을 다시 열기만** 하면 기다리던 손님이 붙어 판을
// 통째로 돌려받는다. 새 코드로 열면 손님은 영영 못 찾는다.
test("방장이 돌아오면 같은 방을 다시 연다 — 손님 자리는 판에 남아 있다", () => {
    // ── ① 들어 있던 방을 **그 코드 그대로** 다시 연다
    {
        // `changeNick` 도 같은 칸을 읽으므로 **되살리는 자리**를 따로 짚는다.
        const at = SRC.indexOf("resumed.current = true;");
        assert.ok(at > 0, "들어 있던 방을 되살리는 자리를 못 찾았다");
        const body = SRC.slice(at, at + 500);
        assert.match(body, /r\?\.role === "host"\) hostRoom\(r\.code\)/, "방장이 돌아와도 같은 코드로 안 연다");
        assert.match(body, /r\?\.role === "guest"\) joinRoom\(r\.code/, "손님이 돌아와도 그 방으로 안 간다");
    }

    // ── ② 돌아온 방장은 **이미 앉은 손님을 다시 안 앉힌다** — 판에 이미 있다
    //
    // 손님이 하나뿐이던 시절에는 「동료가 있는가」(`heroes.length > 1`)만 보면 됐다.
    // 정원이 늘며 **그 손님인지**(자리표)를 가려야 한다 — 안 그러면 셋째 손님이 인사할
    // 때 둘째 손님 자리에 `setNick` 을 걸게 된다.
    {
        const at = SRC.indexOf('m?.t === "hello"');
        assert.ok(at > 0, "방장이 인사를 받는 자리를 못 찾았다");
        const body = SRC.slice(at, SRC.indexOf('m?.t === "bye"', at));
        assert.match(
            body,
            /already > 0\s*\)\s*\{[\s\S]*?setNick\(s,\s*already,\s*m\.nick\)/,
            "이미 앉아 있는 손님을 자리표로 못 찾는다 — 엉뚱한 자리에 `setNick` 을 건다",
        );
        assert.match(body, /joinGame\(s, origin, m\.nick,/, "새로 오는 손님에게 `joinGame` 을 안 부른다");
        assert.match(body, /t: "init", state: serialize\(g\)/, "돌아온 손님에게 판을 안 돌려준다");
    }

    // ── ③ 방장의 판은 **저장에 남는다** — 손님이 든 채로
    {
        assert.match(
            SRC,
            /if \(online === "guest"\) return;\n\s*if \(state\.phase === "playing"\) \{\n\s*save\(state\);/,
            "방장이 제 판을 저장하는 자리가 없다 — 창을 닫으면 손님 자리까지 사라진다",
        );
    }
});

test("손님은 방장의 직업을 보고 고른다 — 고르기 전에는 자리에 안 앉는다", () => {
    // ── ① 규약에 물음과 답이 둘 다 있다
    //
    // 정원이 늘며 답(`room`)이 **방장 하나**가 아니라 **지금 있는 모두**를 실어야 한다 —
    // 셋째로 들어오는 사람은 방장뿐 아니라 먼저 온 둘도 보고 고른다.
    {
        assert.match(SRC, /\|\s*\{\s*t:\s*"peek"\s*\}/, "규약에 `peek` 이 없다 — 물어볼 길이 없으면 고르는 화면이 방장을 모른다");
        assert.match(SRC, /\|\s*\{\s*t:\s*"room";\s*party:\s*\{\s*origin:\s*HeroOrigin[^}]*\}\[\]\s*\}/, "규약에 답(`room`)이 없다");
    }

    // ── ② 방장은 `peek` 에 **지금 있는 모두**로 답하되, **자리는 안 준다**
    {
        const at = SRC.indexOf('m?.t === "peek"');
        assert.ok(at > 0, "방장이 `peek` 을 안 듣는다");
        const body = SRC.slice(at, SRC.indexOf('m?.t === "hello"', at));
        assert.match(body, /send\(\{\s*t:\s*"room",\s*party:/, "물어봤는데 지금 있는 사람들을 안 준다");
        assert.ok(!/joinGame|setLinked\(true\)/.test(body), "물어보기만 했는데 자리에 앉혔다 — 고르기 전에 동료가 선다");
    }

    // ── ③ 손님은 **직업이 없으면** 인사 대신 물음을 보낸다
    {
        const open = SRC.indexOf('conn.on("open", () => {', SRC.indexOf("const joinRoom"));
        assert.ok(open > 0, "손님이 잇는 자리를 못 찾았다");
        const body = SRC.slice(open, SRC.indexOf('conn.on("data"', open));
        // **클로저의 `origin` 만 보면 안 된다** — 붙은 뒤에 고르고서 끊기면 그 값은 여전히
        // 비어 있어서, 다시 이을 때마다 고르기 창이 뜬다. 적어 둔 것을 같이 본다.
        assert.match(body, /const mine = origin \?\? savedOrigin\(code\)/, "보낼 때 적어 둔 직업을 안 읽는다");
        assert.match(body, /conn\.send\(\s*mine\b/, "손님이 고른 직업 유무로 갈라 보내지 않는다");
        assert.match(body, /t:\s*"hello",\s*origin: mine/, "고른 뒤에 보내는 인사가 없다");
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
        assert.match(
            SRC.slice(init, SRC.indexOf('m?.t === "cmd"', init)),
            /setLinked\(true\)/,
            "판을 받고도 이어졌다고 안 친다",
        );
    }

    // ── ⑤ **판을 받기 전에는 남의 걸음을 안 듣는다**
    //
    // 물어보기만 하는 동안에도 줄은 열려 있어서, 방장이 제 걸음을 실어 보내는 `cmd` 가
    // 그대로 날아온다. 거르지 않으면 **아직 손님도 아닌 사람의 제 저장 판**이 남의
    // 걸음으로 굴러간다.
    {
        assert.match(SRC, /m\?\.t === "cmd" && m\.cmd && joined/, "판을 받기 전에 온 명령을 그대로 적용한다");
        const init = SRC.indexOf('m?.t === "init"', SRC.indexOf("const joinRoom"));
        assert.match(
            SRC.slice(init, SRC.indexOf('m?.t === "cmd"', init)),
            /joined = true/,
            "판을 받고도 문이 안 열린다 — 손님이 영영 멈춘다",
        );
    }

    // ── ⑥ **이미 고른 사람에게는 다시 안 묻는다**
    //
    // 고른 뒤에 끊기면 다시 잇는 길도 `joinRoom` 을 지나는데, 그때 넘어오는 `origin` 은
    // **처음 붙을 때의 값**이라 비어 있다. 적어 둔 것을 안 보면 끊길 때마다 고르기 창이
    // 뜨고, 이미 판에 앉아 있는 사람에게 그 창은 아무 뜻이 없다.
    {
        assert.match(SRC, /function savedOrigin\(code: string\)/, "적어 둔 직업을 읽는 자리가 없다");
        // 다시 이을 때 **적어 둔 것을 덮어쓰지 않는다**.
        assert.match(
            SRC,
            /const chosen = origin \?\? savedOrigin\(code\);/,
            "다시 이으면서 적어 둔 직업을 빈 값으로 덮는다 — 고른 것이 날아간다",
        );
        const at = SRC.indexOf('m?.t === "room"', SRC.indexOf("const joinRoom"));
        assert.ok(at > 0, "손님이 방장의 답을 듣는 자리를 못 찾았다");
        const body = SRC.slice(at, SRC.indexOf('m?.t === "init"', at));
        assert.match(body, /const already = savedOrigin\(code\);/, "답을 받고도 이미 고른 것을 안 본다");
        assert.match(body, /if \(already\) \{[\s\S]*?t: "hello"/, "이미 골랐는데 인사 대신 고르기 창을 띄운다");
    }

    // ── ⑦ 받은 파티를 **고르는 화면에 적는다**
    {
        assert.match(SRC, /setRoomParty\(/, "받은 파티를 어디에도 안 담는다");
        assert.match(SRC, /방장은 /, "고르는 화면에 방장이 누구인지를 안 적는다");
        // 이름과 직업은 **한 자리에서** 그린다(`OriginTag`) — 화면마다 따로 이어 붙이면
        // 어느 날 한 곳만 이름이 빠진다. `roomParty` 를 **돌며** 적어야 방장뿐 아니라
        // 먼저 들어온 손님들도 보인다.
        assert.match(
            SRC,
            /roomParty\.map\(\(p, i\) => \([\s\S]{0,400}OriginTag origin=\{p\.origin\} nick=\{p\.nick\}/,
            "고르는 화면에 지금 파티의 직업과 이름을 같이 안 적는다",
        );
    }
});
