// 등수 — **내 지난 판들 사이에서만** 센다.
//
// 이 판은 서버에 점수를 안 보낸다. 겨룰 상대는 어제의 나뿐이고, 그래서 등수가
// 「남보다 잘했나」가 아니라 **「지난번보다 깊이 갔나」**를 묻는다.
//
// 거는 것 넷:
//
//   ① **죽음 화면의 점수와 지난 판 목록의 점수가 같다.** 갈리면 등수가 거짓말을 한다 —
//      같은 판이 화면에서는 1,080점, 목록에서는 800점이 되는 식이다. 실제로 갈릴 뻔
//      했다: 무덤에는 **증표 칸이 없었고** 「살아 돌아왔나」로만 세면 **증표를 쥐고
//      죽은 판**의 만 점이 무덤이 되는 순간 날아간다.
//   ② **같은 점수는 같은 등수다.** 시계로 순서를 가르면 똑같이 한 두 판 중 하나가
//      까닭 없이 아래에 선다.
//   ③ **이번 판을 두 번 세지 않는다.** 무덤은 화면이 뜨기 전에 이미 적혔다.
//   ④ **옛 기록도 셈에 든다.** 증표 칸이 없던 때의 무덤을 버리면 등수의 분모가 줄어
//      갑자기 다들 상위권이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, score, standing, tombScore } from "@/lib/rogue/game";
import { bury, type Tomb } from "@/lib/rogue/storage";

/** 지난 판 하나 — 점수에 들어가는 칸만 채운다. */
function tomb(gold: number, depth: number, extra: Partial<Tomb> = {}): Tomb {
    return { at: 0, depth, gold, turns: 100, epitaph: "", won: false, ...extra };
}

/** node 에는 `localStorage` 가 없다 — 적는 쪽까지 재려면 하나 세워 준다. */
function withStorage(fn: () => void): void {
    const store = new Map<string, string>();
    const g = globalThis as unknown as { localStorage?: unknown };
    g.localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
    };
    try {
        fn();
    } finally {
        delete g.localStorage;
    }
}

// 1층에서 금화 없이 죽으면 점수가 늘 50 이다. **처음 켠 사람이 밟는 자리**라, 여기서
// 「최고 기록!」이 뜨면 그 말이 죽을 때마다 뜨고 아무 뜻도 없어진다.
test("등수를 세는 법 — 높은 점수의 수 + 1 · 같은 점수는 공동", () => {
    // ── 등수는 나보다 높은 점수의 수 + 1 이다
    {
        const list = [tomb(100, 10), tomb(500, 10), tomb(0, 1)]; // 600 · 1000 · 50
        assert.equal(standing(1000, list).place, 1);
        assert.equal(standing(600, list).place, 2);
        assert.equal(standing(55, list).place, 3);
        assert.equal(standing(10, list).place, 4);
    }

    // ── 같은 점수는 같은 등수를 나눠 갖고, 다음은 그만큼 건너뛴다
    {
        // 700 · 700 · 700 · 100
        const list = [tomb(200, 10), tomb(200, 10), tomb(200, 10), tomb(50, 1)];
        assert.equal(standing(700, list).place, 1, "나란한 점수인데 아래에 섰다");
        assert.equal(standing(100, list).place, 4, "공동 1등 셋 다음은 4등이다");
    }

    // ── 똑같은 점수가 또 있으면 공동이라고 말한다 — 1등이라고 다 최고 기록이 아니다
    {
        const same = [tomb(0, 1), tomb(0, 1), tomb(0, 1)]; // 전부 50점, 그중 하나가 이번 판
        const a = standing(50, same);
        assert.equal(a.place, 1);
        assert.ok(a.shared, "셋이 나란한데 혼자 1등이라고 한다");

        // 나 혼자 위에 있으면 공동이 아니다.
        const b = standing(900, same);
        assert.equal(b.place, 1);
        assert.ok(!b.shared, "혼자 앞서는데 공동이라고 한다");

        // 목록의 나 자신 하나는 공동으로 안 친다.
        const alone = standing(50, [tomb(0, 1)]);
        assert.ok(!alone.shared, "목록에 든 내 무덤을 남으로 세었다");
    }
});

test("분모와 최고 점수는 이번 판을 포함한다", () => {
    // ── 분모는 이번 판을 포함한다 — 무덤은 화면이 뜨기 전에 이미 적혔다
    {
        const list = [tomb(0, 5), tomb(0, 6), tomb(0, 7)];
        assert.equal(standing(300, list).total, 3, "이번 판을 또 얹었다");
        // 목록이 비면(적기에 실패했다) 그래도 한 판은 있다 — 0판 중 1등은 없다.
        assert.equal(standing(300, []).total, 1);
        assert.equal(standing(300, []).place, 1);
        assert.equal(standing(300, []).best, 300);
    }

    // ── 최고 점수는 이번 판도 센다
    {
        const list = [tomb(0, 5), tomb(400, 20)]; // 250 · 1400
        assert.equal(standing(300, list).best, 1400);
        assert.equal(standing(9999, list).best, 1400, "무덤에 이번 판이 들어 있으면 거기서 나온다");
    }
});

test("죽음 화면의 점수와 무덤의 점수가 같다 — 증표를 쥐고 죽은 판까지", () => {
    // ── 죽음 화면의 점수와 무덤의 점수가 같다 — 증표를 쥐고 죽은 판까지
    {
        for (const amulet of [false, true]) {
            const s = newGame(7);
            s.hero.gold = 380;
            s.deepest = 14;
            s.hero.hasAmulet = amulet;
            s.phase = "dead"; // **죽었다** — 살아 돌아온 것이 아니다
            const mine = score(s);
            const grave = tomb(s.hero.gold, s.deepest, { won: false, amulet });
            assert.equal(
                tombScore(grave),
                mine,
                `증표 ${amulet ? "쥔" : "안 쥔"} 판의 점수가 무덤이 되며 달라졌다`,
            );
        }
    }

    // ── 옛 기록에는 증표 칸이 없다 — 「살아 돌아왔나」로 메운다
    {
        // `amulet` 을 아예 안 적던 때의 무덤 둘.
        const oldWon = tomb(380, 26, { won: true });
        const oldDead = tomb(380, 14, { won: false });
        assert.equal(tombScore(oldWon), 380 + 10000 + 26 * 50, "살아 돌아온 판에서 증표가 빠졌다");
        assert.equal(tombScore(oldDead), 380 + 14 * 50, "죽은 판에 증표가 붙었다");
    }

    // ── 증표 칸이 `won` 을 이긴다 — 쥐고 죽은 판이 살아 돌아온 판처럼 세지지 않게
    {
        const grave = tomb(0, 10, { won: false, amulet: true });
        assert.equal(tombScore(grave), 10000 + 500);
    }
});

test("무덤을 적은 쪽이 목록을 돌려준다 — 서른 판까지", () => {
    // ── 무덤을 적은 쪽이 목록을 돌려준다 — 이번 판이 딱 한 번 들어 있다
    {
        withStorage(() => {
            const s = newGame(9);
            s.hero.gold = 380;
            s.deepest = 14;
            s.hero.hasAmulet = true;
            s.phase = "dead";
            const first = bury(s);
            assert.equal(first.length, 1, "이번 판이 목록에 없거나 두 번 들어갔다");
            assert.equal(first[0].amulet, true, "증표를 쥐고 죽은 것이 안 적혔다");
            assert.equal(tombScore(first[0]), score(s), "적고 나니 점수가 달라졌다");
            assert.deepEqual(
                { place: standing(score(s), first).place, total: standing(score(s), first).total },
                { place: 1, total: 1 },
            );

            // 두 번째 판 — 앞 판이 훨씬 높으니 2등이다.
            const weak = newGame(10);
            weak.deepest = 2;
            weak.phase = "dead";
            const second = bury(weak);
            assert.equal(second.length, 2);
            const st = standing(score(weak), second);
            assert.deepEqual({ place: st.place, total: st.total }, { place: 2, total: 2 });
        });
    }

    // ── 서른 판까지만 남는다 — 분모가 무한정 늘지 않는다
    {
        withStorage(() => {
            let last: Tomb[] = [];
            let deepest = newGame(1);
            for (let i = 0; i < 35; i++) {
                const s = newGame(100 + i);
                s.deepest = i + 1; // 갈수록 깊이 간다
                s.phase = "dead";
                last = bury(s);
                deepest = s;
            }
            assert.equal(last.length, 30, "서른을 넘겨 쌓였다");
            // 마지막 판이 제일 깊었으니 서른 판 중 1등이다.
            const st = standing(score(deepest), last);
            assert.deepEqual({ place: st.place, total: st.total }, { place: 1, total: 30 });
        });
    }
});
