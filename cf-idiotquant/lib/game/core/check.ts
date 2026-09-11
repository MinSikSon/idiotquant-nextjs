// 판정 — **주사위 두 개. 근거가 그 눈을 굽힌다.**
//
// ── 무엇을 굴리는가 ──────────────────────────────────────────
// **「설득」을 굴린다. 「시장」은 굴리지 않는다.** 이 구별이 이 파일의 전부다.
//
// 판정에 성공하면 앞에 앉은 사람이 받아들이고, 그 자리에서 돈을 맡기고, 체결이
// 일어난다. 그 돈이 오르는지 내리는지는 **다음 턴에 시장이 정한다** — 시장은 이미
// 국면과 베타로 굴러가고 있고(`StockEngine`), 거기에 주사위를 하나 더 얹으면
// 「알아본다」가 값어치를 잃는다. 읽어서 이기는 게임이라는 논지가 무너진다.
//
// 그래서 주사위는 **사람 앞에서만** 굴린다. 종목 앞에서는 안 굴린다.
//
// ── 왜 2d6 인가 ─────────────────────────────────────────────
// d20 은 평평하다 — 1 부터 20 까지 전부 5% 씩이라 「보정 +2」가 언제나 10% 다.
// 2d6 은 가운데가 봉긋해서, **같은 +1 이 자리마다 다른 값어치**를 갖는다.
// 7 언저리에서 1 을 깎는 것은 크고, 11 에서 1 을 깎는 것은 작다. 근거를 대는 일이
// 「어려운 사람일수록 덜 먹힌다」가 규칙이 아니라 **확률 분포에서 저절로** 나온다.
//
// ── 문턱은 사람마다 다르고, 근거가 그것을 내린다 ──────────────
// 얼마나 내려가는지가 그 사람의 성격이다(`core/clients.ts` 의 `need`·`needBlind`).
//
//   어머니   5+ / 5+    안 움직인다. 원래 받아 준다 — 그래서 결정은 「설득할까」가
//                       아니라 **「나를 믿는 사람에게 도박을 걸까」** 다
//   박 대리  6+ / 12    제일 크게 움직인다. 그는 나보다 잘 안다
//   김 부장  7+ / 11+   퇴직금을 잃었다. 근거가 있어야 겨우 반이 넘는다
//   최 사장  8+ / 9+    거의 안 움직인다. 사채는 사람을 안 본다
//
// **`acceptsBlind` 는 이 표로 대체됐다.** 「근거 없이 받아들일 확률」을 정하는 값이
// 둘이면 어느 날 한쪽만 바뀐다.

/** 주사위 하나의 면. */
const FACES = 6;
/** 몇 개를 굴리는가. */
export const DICE = 2;

export const MIN_ROLL = DICE;
export const MAX_ROLL = DICE * FACES;

export interface Check {
    /** 굴린 눈 그대로. 화면이 이 둘을 그린다. */
    dice: number[];
    /** 눈의 합. */
    total: number;
    /** 이 값 이상이면 통한다. */
    need: number;
    ok: boolean;
    /** 근거를 대고 굴렸는가. 화면이 「근거가 문턱을 2 내렸다」를 적을 때 쓴다. */
    hadThesis: boolean;
}

/**
 * 한 번 굴린다.
 *
 * @param rand 0 이상 1 미만을 내는 함수. **엔진의 시드 난수를 넘기지 말 것** —
 *   시장 뼈대는 회차를 넘어 같아야 하는데(`chronicle`), 판정이 그 난수를 먹으면
 *   굴린 횟수만큼 시장이 어긋난다. 설득은 판마다 달라도 되는 것이다.
 */
export function roll(need: number, hadThesis: boolean, rand: () => number = Math.random): Check {
    const dice: number[] = [];
    for (let i = 0; i < DICE; i++) dice.push(1 + Math.floor(rand() * FACES));
    const total = dice.reduce((a, n) => a + n, 0);
    return { dice, total, need, ok: total >= need, hadThesis };
}

/* ── 확률 ───────────────────────────────────────────────────── */

/** 합이 `n` 으로 나오는 경우의 수. 2d6 이라 손으로 세도 되지만, 주사위 수가 바뀔 수 있다. */
function ways(n: number): number {
    let count = 0;
    for (let a = 1; a <= FACES; a++) {
        for (let b = 1; b <= FACES; b++) if (a + b === n) count++;
    }
    return count;
}

const TOTAL_WAYS = FACES ** DICE;

/**
 * 이 문턱을 넘을 확률(0~1). **화면이 이 값을 적는다** — 「7+ · 58%」.
 *
 * 확률을 보여 주는 이유: 주사위를 굴리게 하면서 승산을 숨기면 그건 도박이지 결정이
 * 아니다. 이 게임은 근거를 대는 쪽이 이기는 게임이고, 그러려면 **근거가 승산을
 * 얼마나 바꾸는지가 누르기 전에** 보여야 한다.
 */
export function odds(need: number): number {
    if (need <= MIN_ROLL) return 1;
    if (need > MAX_ROLL) return 0;
    let count = 0;
    for (let n = need; n <= MAX_ROLL; n++) count += ways(n);
    return count / TOTAL_WAYS;
}

/** 화면에 그대로 나가는 백분율. 반올림은 한 군데서만 한다. */
export function oddsPct(need: number): number {
    return Math.round(odds(need) * 100);
}

/* ── 사람이 읽을 말 ─────────────────────────────────────────── */

/** 주사위 눈을 글자로. 유니코드 주사위는 고정폭 글꼴에 없을 수 있어 숫자로 적는다. */
export function diceSay(c: Check): string {
    return `${c.dice.join("+")} = ${c.total}`;
}

/**
 * 판정 한 줄. **무엇이 일어났는지 먼저, 왜 그런지 나중.**
 *
 * 「7 이 나왔다」가 아니라 「받아들였다」가 먼저다 — 숫자는 근거고 결과가 사실이다.
 */
export function checkSay(c: Check, who: string): string {
    const head = c.ok ? `${who}이(가) 받아들였다` : `${who}이(가) 고개를 저었다`;
    return `${head}. 주사위 ${diceSay(c)} · ${c.need}+ 필요`;
}
