// 게임 칸의 높이는 **루트 레이아웃과 맞아야 한다.**
//
// Rogue 는 스크롤할 화면이 아니다. 모바일은 Safari 도구 막대가 보이는 `svh` 에 맞춰
// 문서와 게임 칸을 고정한다. `dvh` 가 visual viewport 보다 크게 잡히면 화면이 밀려
// 버튼 아래에 빈 칸이 생긴다.
//
// 뷰포트 동작은 헤드리스 크로뮴에서 재현되지 않으므로, 화면 높이와 상단 여백 계산이
// 서로 맞는지 글자로 확인한다.
//
// 여기서 지키는 것 셋:
//   ① 모바일 게임은 `svh`, 데스크톱은 `dvh` 를 쓴다
//   ② 게임 화면에는 하단 탭이 없으므로 모바일에서 상단 48px 만 뺀다
//   ③ 게임 경로의 `main` 은 하단 padding 을 없애 게임 칸과 화면 높이를 맞춘다

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const LAYOUT = "app/layout.tsx";
const GAME = "app/(game)/games/page.tsx";
const NAV = "components/navigation.tsx";
const TOUCHPAD = "app/(game)/games/components/TouchPad.tsx";

test("모바일 게임은 보이는 브라우저 화면(svh)에 고정한다", () => {
    // ── 루트는 최소한 화면 높이를 보장한다
    {
        const s = read(LAYOUT);
        assert.match(s, /min-h-\[100dvh\]/, `${LAYOUT} 이 100dvh 를 안 쓴다`);
    }

    // ── 모바일 게임 칸은 Safari 도구 막대가 보일 때의 높이를 쓴다
    {
        const s = read(GAME);
        const box = /h-\[calc\(100(\w+)-(\d+)px\)\]/.exec(s);
        assert.ok(box, `${GAME} 에서 높이 식을 못 찾았다`);
        assert.equal(
            [...s.matchAll(/h-\[calc\(100\w+-\d+px\)\]/g)].length,
            1,
            "게임 칸에 서로 다른 모바일 높이 식이 겹쳐 있다",
        );
        assert.equal(
            box![1],
            "svh",
            "모바일 게임 칸은 도구 막대가 보이는 높이(svh)를 써야 한다",
        );
        // 데스크톱 쪽은 주소창 높이가 바뀌지 않으므로 dvh 를 쓴다.
        assert.match(s, /md:h-dvh/, `${GAME} 의 md 높이가 dvh 가 아니다`);
        assert.doesNotMatch(s, /-mb-\[\d+px\]/, "하단 여백을 음수 마진으로 다시 당기고 있다");
    }
});

test("모바일 게임은 상단 헤더만큼만 빼고 하단 여백을 없앤다", () => {
    // ── 게임 경로에는 하단 탭이 없으므로 상단 헤더 높이만 뺀다
    {
        const layout = read(LAYOUT);
        const pt = /pt-\[(\d+)px\]/.exec(layout);
        const pb = /pb-\[(\d+)px\]/.exec(layout);
        assert.ok(pt && pb, `${LAYOUT} 에서 위아래 여백을 못 찾았다`);

        const game = read(GAME);
        const off = /h-\[calc\(100svh-(\d+)px\)\]/.exec(game);
        assert.ok(off, `${GAME} 에서 빼는 숫자를 못 찾았다`);

        assert.equal(
            Number(off![1]),
            Number(pt![1]),
            `게임 칸은 상단 헤더 ${pt![1]}px 만 빼야 한다`,
        );
        assert.match(
            read("app/global.css"),
            /main:has\(#rogue-root\)\s*\{[^}]*height:\s*100svh;[^}]*min-height:\s*100svh;[^}]*padding-bottom:\s*0;[^}]*overflow:\s*hidden;/,
            "모바일 게임이 보이는 화면에 고정되지 않거나 하단 여백·세로 스크롤이 남아 있다",
        );
    }

    // ── 공통 모바일 바의 치수는 레이아웃 여백 값과 맞는다
    {
        const layout = read(LAYOUT);
        const nav = read(NAV);
        const pt = Number(/pt-\[(\d+)px\]/.exec(layout)![1]);
        const pb = Number(/pb-\[(\d+)px\]/.exec(layout)![1]);

        // 공통 상단 머리줄과 하단 탭 바 치수는 레이아웃 여백 값과 일치해야 한다.
        // 게임은 하단 탭이 숨겨져 있어 해당 padding 만 별도로 없앤다.
        assert.ok(
            nav.includes(`h-[${pt}px]`),
            `위 머리줄의 높이가 ${pt}px 가 아니다 — 레이아웃의 pt 와 어긋난다`,
        );
        assert.ok(
            nav.includes(`h-[${pb}px]`),
            `아래 탭 바의 높이가 ${pb}px 가 아니다 — 레이아웃의 pb 와 어긋난다`,
        );
    }
});

test("게임에서는 공통 헤더의 서비스 이름도 idiotgames로 바뀐다", () => {
    const nav = read(NAV);
    assert.match(
        nav,
        /const brandSuffix = inGame \? "GAMES" : "QUANT"/,
        "게임 경로에서 브랜드 접미사를 GAMES로 바꾸지 않는다",
    );
    assert.equal(
        (nav.match(/IDIOT<span className="text-brand">\{brandSuffix\}<\/span>/g) ?? []).length,
        1,
        "공통 게임 내비게이션이 같은 브랜드 변수를 쓰지 않는다",
    );
});

// ── 명령 단추는 **세 개씩 딱 떨어져야** 한다 ────────────────────────────────
//
// 단추 판은 세 칸 격자다(`TouchPad` 의 `grid-cols-3`). 개수가 3의 배수가 아니면
// **마지막 줄만 이가 빠지고**, 그 순간 「한 줄이 한 묶음」이 깨진다 — 계단 둘이 나란히,
// 배낭에서 꺼내 쓰는 것들이 한 줄에, 라는 자리 약속이 거기서 무너진다.
//
// 사람이 세다가 틀리는 자리라 여기서 센다. 단추 하나를 더하거나 뺄 때는 **셋 단위로**.

test("명령 단추는 세 개씩 딱 떨어진다", () => {
    const s = read("app/(game)/games/Rogue.tsx");
    const from = s.indexOf("const actions: PadAction[] = [");
    assert.ok(from >= 0, "Rogue.tsx 에서 명령 단추 목록을 못 찾았다");
    const to = s.indexOf("\n    ];", from);
    assert.ok(to > from, "명령 단추 목록의 끝을 못 찾았다");

    const n = (s.slice(from, to).match(/label:/g) ?? []).length;
    assert.ok(n > 0, "명령 단추가 하나도 없다");
    assert.equal(
        n % 3,
        0,
        `명령 단추가 ${n} 개다 — 세 칸 격자라 마지막 줄만 이가 빠진다. 셋 단위로 더하거나 뺄 것`,
    );
});

test("전직 기술과 사망 회고가 화면에서 사라지지 않는다", () => {
    const s = read("app/(game)/games/Rogue.tsx");
    assert.match(s, /advancedSkillKind === "active"[\s\S]*?run\(\{ t: "classSkill" \}\)/, "액티브 전직 기술 단추가 없다");
    assert.match(s, /★ 전직 완료/, "전직 완료 배너가 없다");
    assert.match(read("lib/rogue/game.ts"), /ADVANCE_LEVEL - hero\.level/, "전직 진행도가 기록에 없다");
    assert.match(s, /orig\.advancedSkillName/, "직업 선택 카드에 전직 기술 미리보기가 없다");
    const game = read("lib/rogue/game.ts");
    assert.doesNotMatch(game, /pendingSkillPicks|SKILL_PICK_INTERVAL|pickSkill/, "삭제한 레벨업 선택이 직업 기록에 남았다");
    assert.match(s, /state\.phase === "dead"[\s\S]*?마지막 순간/, "사망 화면에 마지막 순간 회고가 없다");
    assert.match(s, /state\.messages\.filter\(\(m\) => !isDetail\(m\)\)\.slice\(-5\)/, "사망 직전 기록 다섯 줄을 안 보여 준다");
    assert.match(s, /미식별 물건/, "죽을 때 남긴 미식별 물건을 안 센다");
});

test("시드 링크는 시작 직업과 함께 복사하고, 열면 저장 판보다 먼저 새 판을 연다", () => {
    const s = read("app/(game)/games/Rogue.tsx");
    assert.match(s, /sharedRun\(location\.search\)[\s\S]*?newGame\(shared\.seed[\s\S]*?shared\.origin/, "공유 시드가 새 판으로 이어지지 않는다");
    assert.match(s, /label: "시드 링크 복사"[\s\S]*?copySeedLink\(\)/, "시드 링크 복사 단추가 없다");
    assert.match(s, /sharedRunUrl\(location\.href/, "현재 주소에서 시드 공유 링크를 만들지 않는다");
    assert.match(s, /navigator\.clipboard\.writeText\(url\)/, "시드 링크를 클립보드에 복사하지 않는다");
    assert.match(s, /seedLinkNote[\s\S]*?setTimeout\(\(\) => setSeedLinkNote\(null\), 2600\)/, "시드 링크 복사 안내가 저절로 사라지지 않는다");
});

test("새 판을 열면 눌러 둔 방향 키 반복도 멈춘다", () => {
    const s = read("app/(game)/games/Rogue.tsx");
    assert.match(s, /const resetRunInput[\s\S]*?stopAllHolds\(\)/, "새 판에서 이전 방향 키 반복을 멈추지 않는다");
    assert.match(s, /startWithOrigin[\s\S]*?resetRunInput\(\)/, "새 판 시작이 입력 초기화 함수를 부르지 않는다");
    assert.match(s, /heldDirections[\s\S]*?ignoredDirections[\s\S]*?ignoreHeldDirections\(\)/, "새 판에서 OS 방향 키 반복을 막지 않는다");
    assert.match(s, /ignoredDirections\.current\.delete\(e\.code\)/, "방향 키를 뗀 뒤에도 새 입력을 막는다");
});

test("게임은 위험과 지금 가능한 행동을 눈에 띄게 알린다", () => {
    const rogue = read("app/(game)/games/Rogue.tsx");
    const pad = read(TOUCHPAD);
    const desk = read("app/(game)/games/components/Desk.tsx");
    assert.match(rogue, /\{hHunger \|\| "Well-fed"\}[\s\S]*?⚠ HP 낮음[\s\S]*?⚠ 저주 장비[\s\S]*?⚠ 빈 지팡이/, "위험 상태 요약이 없다");
    assert.match(rogue, /visibleMessages = state\.messages\.filter\(\(m\) => !isDetail\(m\)\)[\s\S]*?isImportantMessage[\s\S]*?\[\.\.\.visibleMessages\.slice\(-4\)\]\.reverse\(\)/, "최근 결과와 중요 메시지 강조가 없다");
    assert.match(pad, /hot\?: boolean[\s\S]*?a\.hot && !a\.off/, "지금 가능한 행동을 강조하지 않는다");
    assert.match(desk, /const comparedPower[\s\S]*?"better"[\s\S]*?"worse"/, "새 장비의 좋고 나쁨을 가르지 않는다");
    assert.doesNotMatch(desk, /현재 .*→/, "배낭에 장비 비교 문구가 과하게 남아 있다");
});

test("옵션 메뉴는 제목과 설명을 나눠 보여 주고 토글 상태를 표시한다", () => {
    const s = read("app/(game)/games/Rogue.tsx");
    const at = s.indexOf('sheet === "options"');
    assert.ok(at >= 0, "옵션 메뉴가 없다");
    const menu = s.slice(at, s.indexOf('sheet === "origins"', at));
    assert.match(menu, /항목 이름과 설명을 나눠 표시합니다/, "옵션 메뉴에 읽는 법을 안내하지 않는다");
    assert.match(menu, /<span className="block font-bold text-\[var\(--rg-strong\)\]">\{o\.label\}<\/span>\s*<span className="mt-0\.5 block text-\[11px\] text-\[var\(--rg-muted\)\]">\{o\.hint\}<\/span>/, "항목 이름과 설명이 한 줄에 붙어 있다");
    assert.match(menu, /label: "자동 줍기",\s*status: .*\? "켜짐" : "꺼짐",\s*pressed:/, "자동 줍기 토글에 현재 상태가 없다");
    assert.match(menu, /aria-pressed=\{\"pressed\" in o \? o\.pressed : undefined\}/, "토글의 현재 상태를 접근성 속성으로 표시하지 않는다");
});

test("상태 줄은 최종 수치를 보여 주고 누르면 근거를 기록에 남긴다", () => {
    const rogue = read("app/(game)/games/Rogue.tsx");
    const game = read("lib/rogue/game.ts");
    assert.match(rogue, /setStatusKind\("str"\); setSheetOwner\(i\); setSheet\("status"\)/, "스탯을 눌러도 설명 창을 열지 않는다");
    assert.match(rogue, /sheet === "status"[\s\S]*?statusKind === "str"[\s\S]*?heroStr\(statusHero\)[\s\S]*?공격 명중·피해/, "스탯 설명 창에 선택한 힘의 설명이 없다");
    assert.match(rogue, /\["defense", `AC:\$\{heroArmorClass\(h\)\}`\]/, "최종 방어 등급이 상태 줄에 없다");
    assert.match(game, /heroArmorClassTerms\(hero\)\.map/, "방어 등급의 실제 계산식을 기록하지 않는다");
    assert.match(game, /St:\$\{heroStr\(hero\)\}/, "힘의 실제 계산식을 기록하지 않는다");
    assert.match(rogue, /Dlvl:\{level\.depth\}/, "현재 층이 Dlvl로 표시된다");
    assert.doesNotMatch(rogue, /i === 0 && <button[^>]*>Dlvl:/, "멀티플레이 동료 상태 줄에 Dlvl이 없다");
    assert.match(rogue, /const statChip = /, "핵심 스탯 표기가 없다");
    assert.doesNotMatch(rogue, /현재 체력 \/ 최대 체력/, "HP에 같은 뜻의 상세 설명이 중복된다");
    assert.doesNotMatch(rogue, /성장: 힘/, "중복 성장 요약이 남아 있다");
    assert.match(
        rogue,
        /\{hHunger \|\| "Well-fed"\}[\s\S]*?FLOOR_EVENT_BANNER\[level\.mutator\]\.title[\s\S]*?Ring: \{hRings\}/,
        "층 이벤트와 반지 표기가 배고픔 뒤에 오지 않는다",
    );
    assert.match(rogue, /FLOOR_EVENT_BANNER\[level\.mutator\]\.title[\s\S]*?Ring: \{hRings\}/, "층 이벤트와 반지 표기가 확장 상태에 없다");
    assert.match(rogue, /최신 기록이 위에 있습니다\.[\s\S]*?명중과 피해 계산/, "기록의 결과·계산 줄 읽는 순서를 안내하지 않는다");
    assert.match(rogue, /const detail = isDetail\(m\)[\s\S]*?ml-4 border-t border-\[var\(--rg-line-faint\)\]/, "계산 줄이 결과 아래에서 묶이지 않는다");
    assert.match(rogue, /isImportantMessage\(m\) \? "bg-\[var\(--rg-raised\)\] font-bold" : ""/, "중요한 결과가 기록에서 두드러지지 않는다");
});

test("상태 줄을 펼쳐도 공통 항목의 순서가 유지된다", () => {
    const rogue = read("app/(game)/games/Rogue.tsx");
    const status = rogue.slice(rogue.indexOf("{/* 캐릭터 상태:"), rogue.indexOf("<TouchPad", rogue.indexOf("{/* 캐릭터 상태:")));
    const labels = ['St:{heroStr(h)}', 'Dx:${heroDexterity(h)}', 'Co:${heroConstitution(h)}', 'In:${h.intelligence}', 'Wi:${h.wisdom}', 'Ch:${h.charisma}', 'Lu:${h.luck}', 'Dlvl:{level.depth}', '$:{h.gold}', 'HP:{h.hp}', 'AC:${heroArmorClass(h)}', 'Xp:${h.level}/${h.exp}', 'T:{coop', '{hHunger || "Well-fed"}'];
    const positions = labels.map((label) => status.indexOf(label));
    assert.ok(positions.every((position) => position >= 0), "상태 항목이 빠졌다");
    assert.ok(positions.every((position, index) => index === 0 || positions[index - 1] < position), "상태 항목이 이름·능력치·층·금화·HP·방어·경험치·턴·허기 순서가 아니다");
    assert.match(status, /\{\(hHunger \|\| expandedPartyStats === i\) && <button/, "허기가 두 보기에 같은 자리를 쓰지 않는다");
    assert.match(status, /max-h-\[3\.5rem\][\s\S]*?overflow-y-auto/, "펼친 상태창이 세 줄 높이를 넘으면 안쪽으로 스크롤되지 않는다");
    const collapseButton = status.indexOf("aria-expanded={true}");
    const identity = status.indexOf("<OriginTag origin={h.origin} level={h.level} />");
    const rightAlignedCollapse = status.indexOf('className="ml-auto shrink-0');
    const firstRowBreak = status.indexOf("basis-full h-0");
    assert.ok(identity >= 0 && rightAlignedCollapse > identity && rightAlignedCollapse < collapseButton && collapseButton < firstRowBreak && firstRowBreak < positions[0], "펼친 상태의 간략히 단추가 첫 줄 오른쪽 끝에 없다");
    assert.doesNotMatch(rogue, /넷핵식 자연 행운/, "상태 설명에 게임 이름을 붙이지 않는다");
});

test("한 글자 이름은 지도 한 칸을 가득 쓴다", () => {
    const s = read("app/(game)/games/components/MapView.tsx");
    assert.match(s, /const cols = chars\.length > 2 \? 2 : 1;\s*const rows = Math\.ceil\(chars\.length \/ cols\)/, "글자 수로 줄 수를 안 가른다 — 한 글자면 한 줄이어야 한다");
    assert.match(s, /const font = cell\.h \/ rows/, "한 글자 이름이 칸 전체 높이를 안 쓴다");
});

test("근위대 장검과 도적 단검 이도류는 배낭에서 눈에 띈다", () => {
    const s = read("app/(game)/games/components/Desk.tsx");
    assert.match(s, /isDualWielding\(hero\)[\s\S]*?hero\.offWeaponId/, "이도류의 두 손을 가르지 않는다");
    assert.match(s, /이도류 장착/, "이도류 장착 표식이 없다");
    assert.match(s, /const equipped = worn !== null/, "일반 장착 장비를 따로 가르지 않는다");
    assert.match(s, /border-\[var\(--rg-gold\)\]/, "장착 장비에 구분 색이 없다");
    assert.match(s, /comparison === "better" \? "font-bold text-\[var\(--rg-weapon\)\]"/, "더 좋은 장비 이름을 초록색으로 강조하지 않는다");
});

test("축복의 기름은 마시지 않고 장비에 바른다", () => {
    const s = read("app/(game)/games/components/Desk.tsx");
    assert.match(s, /it\.type === "blessing" \? "장비에 바른다" : it\.type === "revival" && corpseAtFeet \? "시체를 되살린다" : "마신다"/, "축복의 기름·부활 물약의 행동명이 잘못됐다");
    assert.match(s, /title: "무엇에 축복을 입힐까"[\s\S]*?kinds: \["weapon", "armor"\]/, "기름을 바를 장비를 고르지 않는다");
});

// 누른 단추는 **눌린 뒤 초점을 놓는다.**
//
// 안 놓으면 그 단추가 브라우저 포커스를 쥔 채 남고, 한참 뒤에 상관없는 키(특히 Space —
// 아무 단추나 눌러 버린다)를 누르면 **그 단추가 조용히 다시 눌린다.** 「안 누른 키가
// 눌린다」는 보고가 대개 이 자리다. 실제 포커스는 헤드리스 크로뮴에서도 잴 수는 있지만,
// 이 게임의 단추는 전부 `TouchPad.Key` 하나를 지나므로 **그 자리 하나만** 보면 된다 —
// 글자로 거는 것이 브라우저를 띄우는 것보다 빠르고 확실하다.
test("눌린 단추는 초점을 놓는다 — 안 놓으면 나중에 딴 키가 그 단추를 깨운다", () => {
    const s = read(TOUCHPAD);

    // ── 방향판(hold): pointerdown 에서 쏜 직후, pointerup·pointercancel 에서도
    {
        const from = s.indexOf("onPointerDown=");
        const to = s.indexOf("onContextMenu=", from);
        assert.ok(from >= 0 && to > from, "onPointerDown 블록을 못 찾았다");
        const block = s.slice(from, to);
        assert.match(block, /fire\.current\?\.\(\);[\s\S]*?blur\(\)/, "누른 직후 초점을 안 놓는다");
        assert.match(block, /onPointerUp=[\s\S]*?blur\(\)/, "손을 뗄 때 초점을 안 놓는다");
        assert.match(block, /onPointerCancel=[\s\S]*?blur\(\)/, "포인터가 끊길 때 초점을 안 놓는다");
    }

    // ── 그 밖의 단추(방향판이 아닌 명령 단추 포함): onClick 에서 쏜 뒤
    {
        const from = s.indexOf("onClick=");
        assert.ok(from >= 0, "onClick 블록을 못 찾았다");
        const to = s.indexOf("className=", from);
        const block = s.slice(from, to);
        assert.match(block, /onPress\?\.\(\);[\s\S]*?blur\(\)/, "누른 뒤 초점을 안 놓는다");
    }
});

// 끊김 안내는 **모서리 한 칸만 쓴다.**
//
// 거쳐 온 길이 둘이다. 처음에는 지도 한가운데 위에 띠로 떠 있었고, 390px 에서 초대 단추까지
// 두 줄로 접히며 **내가 선 자리와 앞의 몬스터를 덮었다**(재 보니 13285px²). 그래서 지도 밖
// 한 줄로 내렸더니 이번에는 **지도가 그만큼 줄었다.** 끊긴 동안에도 방장은 계속 논다 —
// 가리는 것도 줄이는 것도 값을 치른다.
//
// 지금 거는 것: **늘 떠 있는 것은 우상단 작은 단추 하나**이고, 본문은 **눌러야** 펼쳐진다.
// 끊긴 상태를 브라우저에서 매번 만들기가 까다로워 글자로 건다.
test("끊김 안내는 늘 떠 있는 작은 단추 하나다 — 본문은 눌러야 뜬다", () => {
    const s = read("app/(game)/games/Rogue.tsx");

    // ── 안내 자체는 있어야 한다 — 없애서 통과시키면 안 된다
    const idx = s.indexOf("{online && !linked && (");
    assert.ok(idx > 0, "끊김 안내가 통째로 사라졌다 — 누른 키가 안 먹는 까닭을 어디서도 안 적는다");
    const stop = s.indexOf("{/* 층 돌발 이벤트", idx);
    assert.ok(stop > idx, "안내 블록의 끝을 못 찾았다 — 이 테스트가 무엇을 재는지 잃었다");
    const block = s.slice(idx, stop);

    // ── 늘 떠 있는 쪽은 **크기가 못 박힌 단추**다 (모서리 한 칸)
    assert.match(block, /\bh-7 w-7\b/, "늘 떠 있는 단추의 크기가 안 박혀 있다 — 글이 길어지면 지도를 덮는다");
    assert.match(block, /absolute top-1 right-1/, "단추가 우상단에 안 붙어 있다");

    // ── 본문은 **눌러야** 뜬다 — 늘 떠 있으면 안 된다
    const bodyAt = block.indexOf("{netOpen && (");
    assert.ok(bodyAt > 0, "본문이 `netOpen` 뒤에 안 숨어 있다 — 안 눌러도 지도를 덮는다");
    assert.ok(
        !block.slice(0, bodyAt).includes("초대 링크 복사"),
        "초대 단추가 늘 떠 있다 — 예전에 두 줄로 접히며 지도를 덮은 자리가 이것이다",
    );

    // ── 지도 **높이는 안 가져간다** — 흐름 안의 줄로 두면 지도가 줄어든다
    const mapOpen = s.indexOf('<div className="relative min-h-0 flex-1">');
    assert.ok(mapOpen > 0 && idx > mapOpen, "안내가 지도 칸 밖에 있다 — 그러면 지도 높이를 가져간다");
    assert.ok(!block.includes("shrink-0"), "안내가 흐름 안의 줄로 서 있다 — 지도가 그만큼 줄어든다");
});

// 엔진이 이미 밝힌 방을 화면에서 다시 가리면 밝음 → 어두움 → 밝음으로 보인다.
test("불 켜진 방은 엔진의 시야를 그대로 그린다", () => {
    const rogue = read("app/(game)/games/Rogue.tsx");
    const map = read("app/(game)/games/components/MapView.tsx");
    assert.doesNotMatch(rogue, /setReveal\(/, "밝은 방을 다시 가리는 연출이 남았다");
    assert.doesNotMatch(map, /reveal\.room|reveal\.r/, "지도에서 밝은 방을 다시 가린다");
});

// 이름은 **직업이 뜨는 자리마다 같이** 뜬다.
//
// 지도와 상태 줄에서 이름으로 찾아 놓고, 정작 「출신」이라고 적힌 자리(죽음 화면·지난 판)
// 에서는 직업만 떠서 **누구의 근위대인지**를 못 찾았다. 이름과 직업을 잇는 자리를
// `OriginTag` **하나**로 두고, 그리는 쪽은 이름을 넘기기만 한다 — 화면마다 따로 이어
// 붙이면 어느 날 한 곳만 이름이 빠진다.
test("직업이 뜨는 자리에는 이름도 같이 뜬다", () => {
    const s = read("app/(game)/games/Rogue.tsx");

    // ── ① 잇는 자리는 `OriginTag` 하나다
    {
        assert.match(
            s,
            /function OriginTag\(\{[\s\S]*?origin,[\s\S]*?nick,[\s\S]*?title = false,[\s\S]*?level,[\s\S]*?\}/,
            "`OriginTag` 가 이름을 안 받는다 — 화면마다 따로 이어 붙이게 된다",
        );
        assert.match(s, /\{nick && <span className="font-bold">\{nick\} · <\/span>\}/, "받은 이름을 안 그린다");
    }

    // ── ② **그 사람의** 직업을 그리는 자리는 전부 이름을 넘긴다
    //
    // 상태 줄만 예외다 — 바로 앞의 이름표 단추(`@MSON`)가 이미 같은 것을 적고 있어서,
    // 넘기면 `@MSON  MSON · 왕실 근위대` 로 두 번 뜬다.
    {
        const tags = [...s.matchAll(/<OriginTag origin=\{([^}]+)\}([^/]*)\/>/g)];
        assert.ok(tags.length >= 5, `직업을 그리는 자리가 ${tags.length} 곳뿐이다 — 이 테스트가 무엇을 재는지 잃었다`);
        const missing = tags
            .filter(([, who, rest]) => !rest.includes("nick=") && who !== "h.origin")
            .map(([, who]) => who);
        assert.deepEqual(missing, [], `이름을 안 넘기는 자리가 있다: ${missing.join(", ")}`);
    }
});

// 칸이 번쩍이는 연출은 **사람마다** 돈다.
//
// `heroes[0]` 하나만 보고 있었다 — 그래서 협동에서 **동료가 맞아도 나아도 화면이 가만히
// 있었다.** 2P 쪽에서는 무슨 일이 난 건지 기록 줄을 읽어야만 알 수 있다. 프레임 단위의
// 연출이라 테스트로 눈으로는 못 잡으니 **무엇을 보고 있는지**를 글자로 건다.
test("피격·치유 번쩍임은 사람마다 돈다", () => {
    const s = read("app/(game)/games/Rogue.tsx");

    // ── ① 지난 판의 기억을 **사람마다** 든다
    {
        assert.match(
            s,
            /heroes:\s*state\.heroes\.map\(\(h\) => \(\{ hp: h\.hp/,
            "지난 값을 한 사람 것만 기억한다 — 동료의 체력 변화가 안 잡힌다",
        );
        assert.ok(
            !/\bhp:\s*state\.heroes\[0\]\.hp\b/.test(s),
            "아직 `heroes[0]` 의 체력 하나만 본다",
        );
    }

    // ── ② 번쩍이는 칸을 **사람마다** 고른다
    {
        const at = s.indexOf("// 4. 영웅 체력 변동");
        assert.ok(at > 0, "체력 변동 연출이 통째로 사라졌다");
        // 깃털(`hasPhoenixMsg`) 갈래는 빼고 본다 — 거기 `heroes[0]` 은 **못 찾았을 때의
        // 대비**지, 누구 칸을 번쩍일지 고르는 자리가 아니다.
        const body = s.slice(at, s.indexOf("if (hasPhoenixMsg)", at));
        assert.match(body, /for \(let i = 0; i < state\.heroes\.length; i\+\+\)/, "사람마다 안 돈다");
        assert.ok(
            !/state\.heroes\[0\]/.test(body),
            "그 안에서 아직 방장을 가리킨다 — 동료가 맞아도 방장 칸이 번쩍인다",
        );
    }
});

// 지도의 이름표는 **한 칸 안에** 산다.
//
// 넉 자를 한 줄로 늘어놓으면 그 줄의 오른쪽이 통째로 밀려 벽 `|` 이 어긋나므로, 폭이
// 정확히 한 칸인 상자를 그 칸 위에 덮고 속을 2×2 로 접는다. 크기는 잰 칸에서 되짚어
// 내는데(`글꼴 = 칸높이 ÷ LEADING`), 그 비율이 `<pre>` 의 `leading-[…]` 과 어긋나면
// 이름표만 칸 밖으로 삐져나간다 — 화면으로는 잘 안 보이는 자리라 글자로 건다.
test("지도의 이름표는 한 칸을 넘지 않는다", () => {
    const s = read("app/(game)/games/components/MapView.tsx");

    // ── ① 줄 높이 비율이 `<pre>` 의 것과 **같은 수**다
    {
        const declared = /const LEADING = ([\d.]+);/.exec(s);
        assert.ok(declared, "이름표가 쓰는 줄 높이 비율을 못 찾았다");
        // `[^>]` 는 줄바꿈도 먹으므로 `s` 플래그가 필요 없다(있으면 es2017 빌드가 막는다).
        const used = /<pre[^>]*?leading-\[([\d.]+)\]/.exec(s);
        assert.ok(used, "지도 `<pre>` 의 leading 클래스를 못 찾았다");
        assert.equal(
            declared![1],
            used![1],
            "이름표의 줄 높이 비율이 지도의 것과 다르다 — 글꼴 크기를 잘못 되짚어 칸 밖으로 나간다",
        );
    }

    // ── ② 상자는 **한 칸 크기**이고 넘치는 것은 잘라 낸다
    {
        const at = s.indexOf("function NickTag");
        assert.ok(at > 0, "이름표가 통째로 사라졌다");
        const end = s.indexOf("export default", at);
        const body = s.slice(at, end > at ? end : s.length);
        assert.match(body, /width:\s*cell\.w,\s*height:\s*cell\.h/, "상자가 한 칸 크기가 아니다");
        assert.match(body, /overflow-hidden/, "칸을 넘긴 것을 안 잘라 낸다");
        assert.match(body, /lengthAdjust: "spacingAndGlyphs"/, "가로만 누르지 않는다 — 균등 축소면 글자가 절반으로 준다");
        assert.match(body, /const glyphH = font \*[\s\S]*fontSize:\s*glyphH/, "글꼴 크기를 칸에서 안 되짚는다");
        // CSS `scaleX` 로 절반 아래까지 누르면(한 자 · 서너 자) 기기에 따라 한글이 잘렸다.
        // 폭은 브라우저가 맞추게 한다 — SVG `textLength` 는 그 글자를 정확히 자리 폭에 그린다.
        assert.match(body, /textLength: glyphW/, "글자를 자리 폭에 맞춰 그리지 않는다 — 한글 한 자·서너 자가 잘린다");
        assert.doesNotMatch(body, /scaleX\(/, "CSS 로 누르는 길이 남았다 — 기기에 따라 한글이 잘린다");
    }

    // ── ③ **쓰러진 사람에게는 안 붙인다** — `†` 를 덮으면 생사가 지도에서 안 보인다
    {
        assert.match(
            s,
            /if \(!h\.nick \|\| h\.hp <= 0/,
            "이름이 없거나 쓰러진 사람에게도 이름표를 붙인다",
        );
    }

    // ── ④ **번쩍임이 이름표를 이긴다**
    //
    // 이름표가 칸을 통째로 덮으므로 아래 `<pre>` 에 칠한 피격·치유 색이 뒤로 숨는다 —
    // 이름을 지은 사람만 맞아도 나아도 화면이 가만히 있게 된다.
    {
        const at = s.indexOf("{state.heroes.map((h, i) => {");
        assert.ok(at > 0, "이름표를 세우는 자리를 못 찾았다");
        const body = s.slice(at, s.indexOf("화면 밖의 동료", at));
        assert.match(body, /cellFlashes\[`\$\{h\.x\},\$\{h\.y\}`\]/, "그 칸의 번쩍임을 안 본다");
        assert.match(body, /ink=\{flash\?\.ink \?\?/, "번쩍임 색이 이름표 글자색을 못 이긴다");
        assert.match(body, /bg=\{flash\?\.bg \? `linear-gradient/, "번쩍임 바닥색을 제 바닥색 위에 안 겹친다 — 반투명이라 밑의 @ 가 비친다");
    }
});

// 쓰러진 사람은 **동료의 눈을 빌린다** — 옮기는 것은 시점(`view`)뿐이고 조종(`who`)은
// 절대 안 옮긴다. 둘을 한 값으로 묶으면 온라인에서 방장이 손님의 영웅을 움직이게 되고,
// 그건 협동이 아니라 대리 조종이다. 브라우저로는 피어 둘을 붙여야 재지는 자리라
// **배선의 모양**을 글자로 건다.
test("쓰러지면 동료의 눈을 빌린다 — 조종은 안 옮긴다", () => {
    const s = read("app/(game)/games/Rogue.tsx");

    // ── ① 시점과 조종은 **다른 값**이다
    {
        assert.match(s, /const \[view, setView\] = useState<number \| null>\(null\)/, "시점 칸이 없다");
        assert.match(s, /const eye = view \?\? who;/, "시점이 조종에서 갈라지지 않는다");
    }

    // ── ② 명령에 실리는 것은 **언제나 `who`** 다 — 지도가 보는 사람이 아니다
    {
        const at = s.indexOf("const run = useCallback");
        assert.ok(at > 0, "명령을 싣는 자리를 못 찾았다");
        const body = s.slice(at, s.indexOf("}, [", at));
        assert.match(body, /who\b/, "명령에 누가 하는지가 안 실린다");
        assert.ok(!/\beye\b|\bview\b/.test(body), "빌린 눈이 명령에 실린다 — 남의 영웅을 조종하게 된다");
    }

    // ── ③ 지도는 **빌린 눈**을 따라간다
    {
        assert.match(s, /<MapView state=\{state\} who=\{eye\}/, "지도가 시점을 안 따라간다");
    }

    // ── ④ 이름표는 온라인에서 **내가 쓰러져 있을 때만** 눌리고, 눈만 옮긴다
    {
        const at = s.indexOf("if (!online) setWho(i);");
        assert.ok(at > 0, "이름표가 시점과 조종을 안 가른다");
        assert.match(s.slice(at, at + 120), /else if \(iAmDown\) setView\(i\)/, "온라인에서 조종이 넘어간다");
        assert.match(s, /disabled=\{h\.hp <= 0 \|\| \(!!online && !iAmDown\)\}/, "쓰러지지도 않았는데 시점을 옮길 수 있다");
    }
});

// 몬스터 칸에는 **바닥색**이 깔린다.
//
// 글자판은 `E`(에뮤)와 `!`(물약)와 `-`(벽)이 모두 같은 바탕 위에 앉아 있어, 방에 들어선
// 순간 "무엇이 나를 노리는가" 를 글자 모양 하나로 골라내야 했다. 바닥을 칠하면 그 셋이
// 한눈에 갈린다.
//
// 다만 바닥은 **이미 셋이 다툰다** — 번쩍임(맞음·나음), 파티 색(영웅), 몬스터. 순서가
// 뒤집히면 맞는 순간의 붉은 번쩍임이 몬스터 바닥에 먹혀 **화면이 아무 일도 없었던 것처럼
// 보인다.** 눈으로는 한 프레임이라 못 잡으니 순서를 글자로 건다.
test("몬스터 칸은 바닥색으로 갈리고, 번쩍임이 그 위에 온다", () => {
    const s = read("app/(game)/games/components/MapView.tsx");

    // ── ① 바닥을 고르는 순서: 번쩍임 > 파티 > 몬스터
    {
        assert.match(
            s,
            /const bg = flash\?\.bg \?\? PARTY_BG\[p\] \?\? monsterBg\(/,
            "바닥색 우선순위가 어긋났다 — 번쩍임이나 파티 색이 몬스터 바닥에 먹힌다",
        );
    }

    // ── ② 본 놈과 **느낀 놈**의 바닥이 다르다 — 잉크를 가른 것과 같은 까닭이다
    {
        const at = s.indexOf("function monsterBg");
        assert.ok(at > 0, "몬스터 바닥을 고르는 자리가 없다");
        const body = s.slice(at, s.indexOf("\n}", at));
        assert.match(body, /monster-sensed[^]*--rg-monster-sensed-bg/, "벽 너머로 느낀 놈이 눈앞의 놈과 같은 바닥을 쓴다");
        assert.match(body, /--rg-monster-bg/, "본 놈의 바닥이 없다");
    }

    // ── ③ 챔피언도 몬스터다 — `champion-` 으로 갈라 두었으므로 빠지기 쉽다
    {
        const at = s.indexOf("function isMonsterKind");
        assert.ok(at > 0, "몬스터를 가리는 자리가 없다");
        const body = s.slice(at, s.indexOf("\n}", at));
        assert.match(body, /startsWith\("champion-"\)/, "챔피언 칸만 바닥이 안 깔린다");
    }
});
