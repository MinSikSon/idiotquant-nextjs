/**
 * 싸움 — **D&D식 명중 굴림과 깎는 갑옷.**
 *
 * ```
 *   때리는 쪽 = d20 + 숙련 + 능력 보정 + 손질
 *   명중 난이도 = 11 + 수비 보정
 *   맞았다    = 때리는 쪽 ≥ 명중 난이도          ← 때리는 쪽만 굴린다
 *   공격력    = 무기 주사위 + 능력 보정 + 손질
 *   피해      = 공격력 − 상대의 방어력           ← 0 밑은 0, 완전히 막힌다
 * ```
 *
 * 갑옷은 **안 맞게 해 주는 것이 아니라 덜 아프게 해 주는 것**이다. 명중 난이도에는
 * 숙련 기반 수비 보정만 쓰므로, 갑옷을 명중과 피해에서 두 번 세지 않는다.
 *
 * **여러 대를 때리는 놈은 대마다 따로 깎인다.** 트롤의 세 대는 방어력을 세 번 만난다 —
 * 갑옷이 다중 공격에 특히 세게 듣는 자리이고, 그것이 판금을 입을 까닭이 된다.
 *
 * 같이 오는 것 넷:
 *
 *   · **최종 명중값 20 이상은 치명타** — 명중 난이도와 무관하게 맞고 **공격력 주사위를 두 번** 굴린다
 *     (보정은 한 번). 갑옷은 그래도 깎는다.
 *   · **자연 1 은 대실패** — 보정이 아무리 커도 빗나간다.
 *   · **유리/불리** — 때리는 쪽이 d20 을 두 번 굴려 높은/낮은 쪽을 쓴다. 자는 놈을 치면
 *     유리, 눈이 멀거나 헷갈리면 불리.
 *   · **능력 보정 = (능력치 − 10) ÷ 2 내림**, **숙련 = 2 + (레벨−1) ÷ 4 내림.**
 *
 * 특수 공격(0d0)은 피해 대신 **다른 것을 가져간다** — 금화·물건·갑옷·정신. 그 목록이
 * Rogue 를 Rogue 로 만드는 자리라 피해 없는 몬스터도 무섭다.
 */

import {
    Rng,
} from "./rng";
import {
    defenseOf,
    describe,
    makeItem,
} from "./items";
import {
    type Attack,
    type Luck,
    damageRoll,
    luckOf,
    attackRoll,
    hitDifficulty,
    pierce,
    proficiency,
} from "./dnd";

// 방어력으로 옮기는 자리는 `items.ts` 에 있다(갑옷의 값이라서). 싸움 쪽에서 찾는 것이
// 자연스러운 이름이라 여기서 그대로 다시 내보낸다.
export { defenseOf };
import {
    equippedArmor,
    equippedWeapon,
    offHandWeapon,
    heroArmor,
    heroDamTerms,
    heroDamageDice,
    heroDefense,
    heroDodgeBonus,
    heroHitTerms,
    heroStr,
    hasRing,
    strDamBonus,
    strHitBonus,
    takeFromPack,
    trainWeaponSkill,
} from "./hero";
export type { Attack, Luck };
export { heroHitTerms, heroDamTerms };
import {
    type GameState,
    type Hero,
    type Item,
    type Monster,
} from "./types";

/**
 * **계산을 보여 주는 줄**은 이 표시로 시작한다.
 *
 * 화면 위 두 줄 띠는 마지막 두 줄만 보여 준다. 계산 줄이 거기 섞이면 띠가 산수로
 * 가득 차고 **무슨 일이 났는지가 밀려난다.** 그래서 띠는 이 표시가 붙은 줄을 걸러
 * 내고, 기록 판만 전부 보여 준다. 엔진이 붙이고 화면이 읽는다 — 화면이 「이건
 * 계산 줄이군」 하고 다시 판단하지 않게.
 */
export const DETAIL = "· ";

export function isDetail(line: string): boolean {
    return line.startsWith(DETAIL);
}

/**
 * 요약 줄에 피해를 얹는다 — `트롤에게 맞았다. 피해 5`
 *
 * 띠는 계산 줄을 걸러 내므로, **펼치지 않으면 얼마가 오갔는지가 안 보였다.** 내가 맞은
 * 쪽은 상태 줄의 체력이 줄어 대강 알 수 있었지만 내가 때린 값은 어디에도 안 남아서,
 * 「이 놈을 한 대 더 쳐야 하나」를 기록 판을 열어야 알 수 있었다. 숫자 하나면 된다 —
 * **주사위는 여전히 기록 판에만** 있다.
 *
 * **한 자리에서 만든다.** 피해를 주는 자리가 여섯 군데인데 제각각 `(7)`·`-7`·`7 피해`
 * 로 적으면 같은 것이 여섯 모양으로 보인다.
 */
export function withDamage(line: string, n: number): string {
    return n > 0 ? `${line} 피해 ${n}` : line;
}

/** 굴림에 얹히는 것 하나 — 얼마가, 무엇 때문에. */
export interface Term {
    n: number;
    why: string;
    showZero?: boolean;
}

/**
 * `+1(무기)+2(힘)` — 0인 것은 아예 안 적는다. 없는 보정을 적으면 줄만 길어진다.
 *
 * **값 뒤에 이유를 괄호로 붙인다.** `+2(숙련)+3(힘)`이면 한 항의 경계와 그 값의 까닭이
 * 함께 보인다. 긴 무기 이름도 `+2(진은검)`으로 한 항임을 바로 읽는다.
 */
function terms(list: Term[]): string {
    return list
        .filter((t) => t.n !== 0 || t.showZero)
        .map((t) => `${t.n > 0 ? "+" : "−"}${Math.abs(t.n)}(${t.why})`)
        .join("");
}

/** 도감에 오른 종인가 — **잡아 본 적이 있어야 숫자를 준다.** */
export function seenBefore(state: GameState, m: Monster): boolean {
    return (state.bestiary[m.def.ch] ?? 0) > 0;
}

/** `13(d20 굴림)` — 유리·불리면 두 눈과 고른 쪽까지. */
function rollEyes(a: Attack): string {
    const eyes =
        a.luck === "normal"
            ? `${a.roll}(d20 굴림)`
            : `${a.rolls.join(", ")}(d20 ${a.luck === "advantage" ? "유리" : "불리"} → ${a.roll} 채택)`;
    return eyes;
}

/** 공격 굴림이 무엇으로 끝났나 — 치명타·대실패는 따로 말한다. */
export function outcomeOf(a: Attack): string {
    if (a.crit) return "치명타!";
    if (a.fumble) return "대실패";
    return a.hit ? "맞았다" : "빗나갔다";
}

/**
 * 명중 굴림 한 줄 — 결과와 산식을 두 줄로 적는다.
 *
 * ```
 * · 명중 나 d20 13 +2숙련 +3힘 +2장검 = 20  vs  트롤 d20 7 +3숙련 = 10  → 맞았다
 * · 명중 나 d20 20  vs  트롤 d20 18 +3숙련 = 21  → 치명타!
 * · 명중 나 d20 6, 14 (유리 → 14) +2숙련 = 16  vs  에뮤 d20 9 +?  → 맞았다
 * ```
 *
 * **줄 앞에 무슨 굴림인지를 적는다.** 안 적으면 `d20` 만 덩그러니 남아 「이 스무면체가
 * 무엇을 정하는 건가」를 읽는 사람이 알 수 없다 — 실제로 그 물음을 들었다. 이 게임에서
 * d20 이 도는 자리는 **명중 하나뿐**이고, 공격력은 무기 주사위(`2d4` 따위)가 돈다.
 *
 * **상대의 보정은 아는 종에게만 적는다.** 그것은 곧 레벨이고 표의 값이라, 잡아 본 적
 * 없는 종의 것을 보여 주면 「한 마리 잡아야 준다」는 도감 규칙이 뒷문으로 뚫린다. 굴린
 * 눈은 그대로 적는다 — 눈만으로는 아무것도 역산되지 않는다.
 */
export function attackLine(
    who: string,
    a: Attack,
    bonuses: Term[],
): string {
    const add = terms(bonuses);
    const result = a.crit ? "대성공" : a.fumble ? "대실패" : a.hit ? "명중" : "실패";
    return `${DETAIL}명중 굴림: ${who} ${rollEyes(a)}\n  ${a.roll}${add}${add ? `=${a.total}` : ""}(${result})`;
}

/** 여러 번 때리는 놈의 굴림을 한 줄로 — 눈만 늘어놓는다(어느 눈의 합인지 모른다). */
export function multiAttackLine(
    who: string,
    attacks: Attack[],
    bonuses: Term[],
): string {
    const eyes = attacks.map((a) => (a.crit ? `${a.roll}!` : `${a.roll}`)).join(", ");
    const add = terms(bonuses);
    const totals = attacks.map((a) => `${a.roll}${add}${add ? `=${a.total}` : ""}(${a.crit ? "대성공" : a.fumble ? "대실패" : a.hit ? "명중" : "실패"})`).join(" · ");
    return `${DETAIL}명중 굴림: ${who} ${eyes}(d20 굴림)\n  ${totals}`;
}

/**
 * 공격력 줄 — **굴린 값에서 방어력을 빼는 과정을 그대로 적는다.**
 *
 * ```
 * · 공격력 3d4 → 9 +3힘 +2장검 = 14  −4방어력  → 피해 10
 * · 공격력 3d4 두 번 → 5, 7 = 12 +3힘 = 15  −11방어력  → 피해 4
 * · 공격력 1d6 → 3  −7방어력  → 피해 0 (튕겨 나갔다)
 * ```
 *
 * **치명타의 두 굴림은 쉼표로 가른다.** 한때 `+` 로 이었는데(`2d4 두 번 → 5+4`), 그러면
 * **주사위 눈 두 개를 더한 것처럼 읽힌다** — 그런데 `5` 는 네 면짜리에 없는 눈이라 화면이
 * 고장 난 것처럼 보인다. 실제로 그 물음을 들었다. 여기 적히는 숫자 하나하나는 **`2d4`
 * 한 벌을 통째로 굴린 값**(2~8)이지 낱개 눈이 아니다. 쉼표는 이 기록에서 이미 「따로
 * 굴린 것들」을 뜻한다(`d20 4, 20!, 11`).
 *
 * `dice` 가 없으면 **결과만** 적는다. 잡아 본 적 없는 종의 주사위 표기도 방어력도
 * 표의 값이라, 보여 주면 「한 마리 잡아야 준다」는 도감 규칙이 뒷문으로 뚫린다 —
 * 그래서 부르는 쪽이 안 넘기면 여기서도 산수를 안 펼친다.
 *
 * 치명타면 굴린 값이 둘이다 — `2d4 두 번 → 5, 7 = 12` 처럼 둘 다 적는다.
 */
export function damageLine(
    dice: string | null,
    rolled: number[],
    bonuses: Term[],
    power: number,
    defense: number,
    dealt: number,
    hand?: "주손" | "보조손",
): string {
    if (!dice) return `${DETAIL}피해 ${dealt}`;
    const sum = rolled.reduce((a, n) => a + n, 0);
    const add = terms(bonuses);
    const bonus = bonuses.reduce((a, t) => a + t.n, 0);
    const eyes = rolled.length > 1
        ? `${rolled.join(", ")}(${dice} 두 번 굴림)=${sum}(주사위 합)`
        : `${sum}(${dice} 굴림)`;
    const cut = defense > 0 ? `−${defense}(방어력)` : "";
    // **0 은 따로 말해 준다.** 「피해 0」만 적혀 있으면 고장인지 갑옷인지 알 수 없다.
    const tail = dealt === 0 ? `=${dealt}(피해 · 튕겨 나갔다)` : `=${dealt}(피해)`;
    return `${DETAIL}피해 굴림${hand ? ` (${hand})` : ""}: ${eyes}\n  ${sum}${add}${bonus !== 0 ? `=${power}(공격력)` : ""}${cut}${tail}`;
}

/**
 * 여러 대를 때린 놈의 공격력 — **대마다 따로 굴리고 대마다 따로 깎인다.**
 *
 * ```
 * · 공격력 1d8 → 6 −3방어력 → 3 · 2d6 → 9 −3방어력 → 6  = 피해 9
 * ```
 *
 * 치명타의 두 굴림은 **쉼표로 가른다**(`damageLine` 머리말 참고) — `+` 로 이으면 주사위
 * 눈을 더한 것처럼 읽힌다.
 *
 * 갑옷이 **대마다** 듣는다는 것이 이 체계에서 제일 중요한 한 줄이라, 세 대를 뭉쳐
 * 한 번만 빼는 것처럼 적으면 안 된다.
 *
 * `parts` 가 비면 총합만 적는다(모르는 종).
 */
export function monsterDamageLine(
    parts: { dice: string; rolled: number[]; dealt: number }[],
    bonus: number,
    defense: number,
    total: number,
): string {
    if (parts.length === 0) return `${DETAIL}피해 ${total}`;
    // **상대의 보정도 적는다.** 안 적으면 `1d8 → 1 −4방어력 → 3` 처럼 **줄 위에서 셈이
    // 안 맞는다** — 실제로 그랬다. 숫자가 안 맞는 줄은 기록을 통째로 못 믿게 만든다.
    const add = bonus !== 0 ? `${bonus > 0 ? "+" : "−"}${Math.abs(bonus)}(공격 보정)` : "";
    const cut = defense > 0 ? `−${defense}(방어력)` : "";
    const each = parts
        .map(({ dice, rolled, dealt }) => {
            const sum = rolled.reduce((total, n) => total + n, 0);
            const eyes = rolled.length > 1
                ? `${rolled.join(", ")}(${dice} 두 번 굴림)=${sum}(주사위 합)`
                : `${sum}(${dice} 굴림)`;
            return `${eyes}${add}${cut}=${dealt}(피해)`;
        })
        .join(" · ");
    return `${DETAIL}공격력 ${each}  = ${total}(총 피해)`;
}

import { monsterName } from "./monsters";

export interface AttackResult {
    hit: boolean;
    roll: number;
    damage: number;
    killed: boolean;
    crit?: boolean;
    blocked?: boolean;
    messages: string[];
}

/**
 * 내가 때릴 때의 유리·불리.
 *
 * · **자는 놈을 친다** → 유리. 5판에서 의식을 잃은 상대를 치면 유리다.
 * · **눈이 멀었거나 헷갈린다** → 불리.
 *
 * 둘 다면 서로 지운다(`luckOf`) — 이것도 5판의 규칙이다.
 */
export function heroLuck(hero: GameState["heroes"][number], m: Monster): Luck {
    return luckOf([!m.awake], [hero.blind > 0, hero.confused > 0]);
}

/** 몬스터의 명중 난이도에 쓰는 수비 보정 — 숙련 하나뿐이다. */
export function monsterDodgeBonus(m: Monster): number {
    const base = proficiency(m.def.level);
    const shadowBonus = m.champion === "shadow" ? 2 : 0;
    return base + shadowBonus;
}

/** 몬스터의 **방어력** — 맞았을 때 내 공격력에서 빠지는 값. */
export function monsterDefense(m: Monster): number {
    return defenseOf(m.def.armor);
}

/** 내가 몬스터를 때린다. */
/** 이도류의 **보조손이 치르는 값** — 명중에 이만큼 불리하다. */
export const OFF_HAND_HIT = -2;

/**
 * 한 번 휘두른다. `weapon` 이 무엇인지는 부르는 쪽이 정한다.
 *
 * **보조손은 두 가지를 잃는다**: 명중이 `OFF_HAND_HIT` 만큼 불리하고, 피해에 **힘 보정이
 * 안 얹힌다**(D&D 가 그렇다). 그게 없으면 이도류가 그냥 피해 두 배라 한 자루를 쥘
 * 까닭이 사라진다.
 */
function swing(
    state: GameState,
    hero: Hero,
    m: Monster,
    rng: Rng,
    weapon: Item | undefined,
    off: boolean,
): AttackResult {
    const hitTerms = [
        ...heroHitTerms(hero, weapon),
        ...(off ? [{ n: OFF_HAND_HIT, why: "보조손" }] : []),
    ];
    const mName = monsterName(m);
    // 이도류 기록은 두 줄이 한 짝이라는 것을 즉시 보여야 한다. 공격력 줄은 이미
    // 주손/보조손으로 갈리므로, 명중 줄도 같은 이름을 써야 `나`와 `보조손`을 머릿속에서
    // 다시 맞춰 보지 않는다.
    const hand = off ? "보조손" : offHandWeapon(hero) ? "주손" : "나";
    const a = attackRoll(
        hitTerms.reduce((t, b) => t + b.n, 0),
        hitDifficulty(monsterDodgeBonus(m)),
        rng,
        heroLuck(hero, m),
    );
    const messages: string[] = [];

    if (!a.hit) {
        messages.push(attackLine(hand, a, hitTerms));
        messages.push(`${mName}을(를) 헛쳤다.`);
        return { hit: false, roll: a.roll, damage: 0, killed: false, messages };
    }

    const isBackstab = hero.origin === "rogue" && (!m.awake || m.speed < 0);
    const isCrit = a.crit || isBackstab;
    const dice = heroDamageDice(hero, weapon);
    const damTerms = [...heroDamTerms(hero, weapon, !off)];
    if (isBackstab) {
        damTerms.push({ n: 3, why: "기습" });
    }
    const d = damageRoll(dice, damTerms.reduce((t, b) => t + b.n, 0), isCrit, rng);
    const guard = monsterDefense(m);
    const dealt = pierce(d.total, guard);
    m.hp -= dealt;
    const advanced = trainWeaponSkill(hero, weapon, d.rolled.reduce((sum, roll) => sum + roll, 0) > 1);
    if (advanced) messages.push(`⚔ ${advanced}에 도달했다.`);
    // 맞은 순간 깨어난다 — 자던 놈도 이제 쫓아온다. **0 이어도 깨운다**: 갑옷에 튕긴
    // 것도 맞은 것이고, 안 깨우면 못 뚫는 놈 옆에서 영영 안전해진다.
    m.awake = true;
    const killed = m.hp <= 0;
    // **모르는 종에게는 산수를 안 펼친다** — 방어력도 표의 값이라 도감 규칙에 걸린다.
    const dualHand = offHandWeapon(hero) ? (off ? "보조손" : "주손") : undefined;
    messages.push(
        seenBefore(state, m)
            ? damageLine(dice, d.rolled, damTerms, d.total, guard, dealt, dualHand)
            : damageLine(null, [], [], 0, 0, dealt, dualHand),
    );
    messages.push(
        withDamage(
            killed
                ? `${mName}을(를) 쓰러뜨렸다.`
                : dealt === 0
                  ? `${mName}의 갑옷에 튕겼다.`
                  : isBackstab
                    ? `${mName}의 빈틈을 기습하여 급소를 찔렀다!`
                    : a.crit
                      ? `${mName}의 급소를 찔렀다!`
                      : `${mName}을(를) 맞혔다.`,
            dealt,
        ),
    );

    // 기록은 최신순으로 보이므로 결과 아래에 명중, 피해 순서가 되도록 거꾸로 넣는다.
    const damageAt = messages.findIndex(isDetail);
    messages.splice(damageAt < 0 ? 0 : damageAt + 1, 0, attackLine(hand, a, hitTerms));

    // ── 챔피언 피격 특수 반응 ──
    if (m.champion === "blazing") {
        hero.burnTurns = 3;
        messages.push("타오르는 화염이 반사되어 몸에 불이 붙었다! (화상 3턴)");
    } else if (m.champion === "gilded" && dealt > 0) {
        const goldDropped = rng.between(10, 30);
        messages.push(`황금 몬스터가 피격되며 금화 ${goldDropped}G를 흘렸다!`);
        state.level.items.push(makeItem("gold", "gold", state.nextItemId++, m.x, m.y, goldDropped));
    }

    // ── 무기 보석 소켓 효과 — **휘두른 그 칼의 보석**이다 ──
    if (weapon?.socketGem === "ruby") {
        m.burnTurns = 3;
        // **불을 붙인 사람을 적어 둔다** — 화상으로 죽을 때 경험치가 갈 자리다.
        m.burnBy = state.heroes.indexOf(hero);
        messages.push(`루비의 화염이 ${mName}에게 옮겨붙었다! (화상 3턴)`);
    } else if (weapon?.socketGem === "sapphire") {
        if (rng.rnd(100) < 25) {
            m.frozenTurns = 1;
            messages.push(`사파이어의 냉기가 ${mName}을(를) 1턴간 얼어붙게 만들었다!`);
        }
    } else if (weapon?.socketGem === "emerald" && killed) {
        hero.hp = Math.min(hero.maxHp, hero.hp + 2);
        messages.push("에메랄드가 생명력을 흡수했다! (+2 HP)");
    }

    return {
        hit: true,
        roll: a.roll,
        damage: dealt,
        killed,
        crit: isCrit,
        blocked: dealt === 0,
        messages,
    };
}

/**
 * 한 턴의 공격 — **이도류면 두 번 휘두른다.**
 *
 * 주손으로 한 번, 보조손이 있으면 한 번 더. 두 번째는 **상대가 아직 서 있을 때만** 간다
 * — 쓰러진 것을 한 번 더 치는 줄이 기록에 남으면 「죽였는데 또 때렸다」로 읽힌다.
 *
 * 돌려주는 것은 **두 번을 합친 것**이다. `damage` 는 합이고, `killed` 는 둘 중 한 번이라도
 * 죽였으면 참이다 — 부르는 쪽(`heroMove`)이 「죽었나」 하나만 보고 판단하기 때문이다.
 */
export function heroAttack(state: GameState, hero: Hero, m: Monster, rng: Rng): AttackResult {
    const main = swing(state, hero, m, rng, equippedWeapon(hero), false);
    const off = offHandWeapon(hero);
    if (!off || main.killed) return main;

    const second = swing(state, hero, m, rng, off, true);
    return {
        hit: main.hit || second.hit,
        roll: main.roll,
        damage: main.damage + second.damage,
        killed: second.killed,
        crit: main.crit || second.crit,
        blocked: main.blocked && second.blocked,
        messages: [...main.messages, ...second.messages],
    };
}

/**
 * 몬스터가 나를 때린다. 여러 번 때리는 놈은 damage 가 여러 개다 —
 * **하나하나 따로 굴린다**(D&D 의 다중 공격이 그렇다). 트롤이 무서운 이유가 그것이다.
 */
/** `hero` 는 **맞는 사람**이다 — 몬스터가 쫓기로 한 쪽(`monsterTarget`). */
export function monsterAttack(state: GameState, m: Monster, hero: Hero, rng: Rng): AttackResult {
    const messages: string[] = [];
    const attacks: Attack[] = [];
    const mName = monsterName(m);
    const heroIndex = state.heroes.indexOf(hero);
    const target = state.heroes.length > 1
        ? `${heroIndex + 1}P${hero.nick ? `(${hero.nick})` : ""}`
        : "나";
    // **내 방어력** — 대마다 이만큼씩 깎인다. 여러 대를 때리는 놈에게 갑옷이 특히 세게
    // 듣는 자리가 여기다.
    const guard = heroDefense(hero);
    const myDodge = heroDodgeBonus(hero);
    const bonus = monsterHitBonus(m);
    const bonusTerms: Term[] = [{ n: bonus, why: m.champion === "swift" ? "공격+신속" : "공격" }];
    // **내가 자거나 덫에 걸려 있으면 상대가 유리하다** — 못 움직이는 상대를 치는 것이다.
    const luck = luckOf([hero.asleep > 0 || hero.stuck > 0], []);
    let total = 0;
    let hits = 0;
    let crits = 0;
    let blocked = 0;
    let lastRoll = 0;
    /** 맞은 대마다 무슨 주사위로 얼마가 나왔고 갑옷을 지나 얼마가 들어왔나. */
    const dealt: { dice: string; rolled: number[]; dealt: number }[] = [];

    for (const dice of m.def.damage) {
        const a = attackRoll(bonus, hitDifficulty(myDodge), rng, luck);
        attacks.push(a);
        lastRoll = a.roll;
        if (!a.hit) continue;
        hits++;
        if (a.crit) crits++;
        if (dice === "0d0") {
            // 특수 공격은 피해가 아니라 **다른 것을 가져간다** — 갑옷이 못 막는다.
            messages.push(...special(state, m, hero, rng));
            continue;
        }
        const d = damageRoll(dice, monsterDamBonus(m), a.crit, rng);
        const got = pierce(d.total, guard);
        dealt.push({ dice, rolled: d.rolled, dealt: got });
        if (got === 0) blocked++;
        total += got;
        hero.hp -= got;
    }

    // ── 챔피언 공격 특수 효과 ──
    if (m.champion === "vampiric" && total > 0) {
        const leech = Math.ceil(total * 0.5);
        m.hp = Math.min(m.maxHp, m.hp + leech);
        messages.push(`${mName}이(가) 입힌 피해에서 생명력 ${leech}을(를) 흡혈했다!`);
    }
    if (m.champion === "blazing" && hits > 0) {
        hero.burnTurns = 3;
        messages.push("타오르는 일격에 몸에 불이 붙었다! (화상 3턴)");
    }

    // 계산 줄을 맨 앞에 끼운다 — 특수 공격이 이미 남긴 말보다 먼저 와야 한다.
    if (attacks.length > 0) {
        const seen = seenBefore(state, m);
        const outcome =
            attacks.length === 1
                ? outcomeOf(attacks[0])
                : `${attacks.length}대 중 ${hits}대${crits > 0 ? ` (치명타 ${crits})` : ""}`;
        const hitLine =
            attacks.length === 1
                ? attackLine(mName, attacks[0], seen ? bonusTerms : [])
                : multiAttackLine(mName, attacks, seen ? bonusTerms : []);
        // **잡아 본 종이면 상대의 주사위까지 적는다.** 싸움의 절반이 상대의 차례인데
        // 그쪽만 속을 안 보여 주면 내가 왜 죽었는지를 기록에서 되짚을 수가 없다. 모르는
        // 종은 숫자만 — 주사위 표기는 표의 값이라 도감 규칙이 뒷문으로 뚫린다.
        //
        // **한 대라도 갑옷에 튕겼으면 0 이어도 적는다.** 갑옷이 일하고 있다는 것이
        // 이 체계에서 제일 보고 싶은 줄이다.
        const hasDamageLine = total > 0 || blocked > 0;
        if (hasDamageLine) {
            messages.unshift(monsterDamageLine(seen ? dealt : [], monsterDamBonus(m), guard, total));
        }
        messages.splice(hasDamageLine ? 1 : 0, 0, hitLine);
    }

    if (hits === 0) messages.push(`${mName} → ${target}: 공격이 빗나갔다.`);
    else if (total > 0) {
        messages.push(
            withDamage(
                crits > 0 ? `${mName} → ${target}: 급소를 찔렀다!` : `${mName} → ${target}: 맞았다.`,
                total,
            ),
        );
    } else if (blocked > 0) {
        messages.push(`${mName} → ${target}: 공격이 갑옷에 튕겼다.`);
    }

    return {
        hit: hits > 0,
        roll: lastRoll,
        damage: total,
        killed: hero.hp <= 0,
        crit: crits > 0,
        blocked: blocked > 0 && hits > 0 && total === 0,
        messages,
    };
}

/**
 * 몬스터의 공격 보정 — D&D 의 **숙련 + 힘** 모양을 레벨 하나로 낸다.
 *
 * 표에는 공격 보정 칸이 따로 없고 레벨만 있다. 5판의 괴물은 대체로 숙련에 능력 보정이
 * 얹힌 값을 쓰므로, 레벨을 그 둘로 나눠 본다 — 레벨 1 짜리가 +3, 용(10)이 +9 다.
 *
 * **내 방어도는 맨몸 10, 판금 17 언저리**라 이 값이 그 폭과 맞물린다. 숫자를 바꾸면
 * `scripts/measure-rogue.mjs` 로 다시 재 볼 것.
 */
export function monsterHitBonus(m: Monster): number {
    return proficiency(m.def.level) + Math.floor(m.def.level / 2);
}

/**
 * 몬스터의 **공격력 보정** — 내 쪽의 「힘」에 해당한다.
 *
 * 예전에는 0 이었다. 문턱식일 때는 그래도 됐다 — 갑옷은 맞는가 마는가만 정했고 피해
 * 주사위는 통째로 들어갔으니까. **깎는 갑옷으로 바뀌자 그 0 이 한쪽만 손해 보는 식이
 * 됐다**: 나는 힘과 손질을 얹은 값에서 상대 갑옷을 빼는데, 상대는 맨 주사위에서 내 갑옷을
 * 뺀다. 같은 식이 아니면 「공격력 − 방어력」이 한쪽에만 공평하다.
 *
 * 표에는 공격력 칸이 따로 없고 레벨만 있다. 레벨을 그대로 쓴다 — 레벨 1 짜리가 +1,
 * 트롤(6)이 +6, 용(10)이 +10. 숫자를 바꾸면 `scripts/measure-rogue.mjs` 로 다시 잴 것.
 */
export function monsterDamBonus(m: Monster): number {
    return m.def.level;
}

/**
 * 피해 없는 공격들.
 *
 * **적혀 있는 것만 한다.** 하나가 두 가지를 하면 무엇 때문에 무서운지를 알 수 없다.
 */
/**
 * 묶는 수법 — **이미 묶인 사람은 다시 묶이지 않는다.**
 *
 * 그냥 더하면 안 된다. 잠은 **턴당 1씩만** 풀리는데 상대는 매 턴 때리므로, 한 번에
 * 2~4 를 얹으면 쌓이는 속도가 풀리는 속도를 앞질러 **영영 못 움직인다** — 얼음괴물
 * 옆에서 299턴을 내리 묶이는 것을 실제로 쟀다. 얼음괴물은 1층부터 나오는 놈이라
 * 그건 수법이 아니라 사형 선고다.
 *
 * 값에 상한만 씌우는 것으로는 안 된다. 남은 턴이 4 를 안 넘어도 **매 턴 다시 4 로
 * 채워지면** 갇힌 것은 똑같다 — 그것도 재 보고 알았다. 묶는 것은 **한 번에 한 번**이고,
 * 풀리는 그 턴은 반드시 내 차례다.
 */
function freeze(hero: Hero, turns: number): number | null {
    return hero.asleep > 0 ? null : turns;
}

function special(state: GameState, m: Monster, hero: Hero, rng: Rng): string[] {
    // 무력화 지팡이를 맞은 놈은 때리기만 한다. **아무 일도 안 났으니 배울 것도 없다.**
    if (m.cancelled) return [`${m.def.name}이(가) 헛되이 달려든다.`];
    // **당해 봐야 안다** — 잡는 것과 다른 열쇠다(`GameState.specials`). 빈손으로
    // 달아난 님프에게서도 배운다. 수법을 본 것이지 잃은 것을 센 것이 아니다.
    const first = (state.specials[m.def.ch] = (state.specials[m.def.ch] ?? 0) + 1) === 1;
    const said = specialEffect(state, m, hero, rng);
    return first ? [...said, `${m.def.name}의 수법을 알았다.`] : said;
}

/** `hero` 는 **맞은 사람**이다 — 협동에서 방장의 갑옷·금화·배낭이 대신 털리면 안 된다. */
function specialEffect(state: GameState, m: Monster, hero: Hero, rng: Rng): string[] {
    switch (m.def.ch) {
        case "A": {
            // 아쿠에이터 — 갑옷을 녹인다.
            //
            // **손질을 0 아래로는 못 녹인다.** 예전에는 바닥이 없어서, 한 마리에게 오래
            // 붙들리면 `+0` 판금이 `−7` 짜리가 되어 **안 입느니만 못한 갑옷**이 되었다.
            // 그러면 「벗을까」가 아니라 「이 판은 끝났다」가 되고, 되돌릴 길도 강화
            // 주문서뿐이다. 깎을 것이 남았을 때만 녹는다 — 맨 갑옷은 더 나빠지지 않는다.
            const armor = equippedArmor(hero);
            if (!armor) return ["아쿠에이터가 헛되이 녹이려 든다."];
            if (hasRing(hero, "maintain armor")) return ["갑옷 유지 반지가 부식을 막았다."];
            if ((armor.plusArmor ?? 0) <= 0) return ["갑옷을 녹이려 들지만 더 녹을 것이 없다."];
            armor.plusArmor = (armor.plusArmor ?? 0) - 1;
            return ["갑옷이 녹아내렸다!"];
        }
        case "W": {
            // 망령 — 경험을 빨아먹는다. 레벨은 안 내린다(내리면 최대 체력 계산이 꼬인다).
            const drained = Math.min(hero.exp, rng.between(5, 20));
            hero.exp -= drained;
            return drained > 0 ? ["기운이 빠져나간다."] : ["망령이 스쳐 갔다."];
        }
        case "L": {
            // 레프러콘 — 금화를 채고 사라진다.
            const stolen = Math.min(hero.gold, rng.between(10, 60 + state.level.depth * 10));
            hero.gold -= stolen;
            m.hp = 0;
            return stolen > 0
                ? [`레프러콘이 금화 ${stolen}을(를) 채 갔다!`]
                : ["레프러콘이 빈손으로 달아났다."];
        }
        case "N": {
            // 님프 — 물건 하나를 채고 사라진다. 쥐고 입은 것은 안 가져간다.
            // **개수가 있는 것(화살 40대·물약 3병)은 절반만** 채 간다(내림, 한 개짜리는 통째로) —
            // 뭉치째 가져가면 한 번 스친 것으로 레인저의 화살이 통째로 사라진다.
            const loot = hero.pack.filter((i) => i.id !== hero.weaponId && i.id !== hero.armorId);
            const taken = rng.pick(loot);
            m.hp = 0;
            if (!taken) return ["님프가 빈손으로 달아났다."];
            const n = taken.count > 1 ? Math.floor(taken.count / 2) : taken.count;
            const name = describe({ ...taken, count: n }, state.known, state.appearance);
            takeFromPack(hero, taken, n);
            const left = hero.pack.find((i) => i.id === taken.id)?.count ?? 0;
            return [`님프가 ${name}을(를) 채 갔다!${left > 0 ? ` (${left}개 남음)` : ""}`];
        }
        case "I": {
            // 얼음괴물 — 얼린다.
            const t = freeze(hero, rng.between(2, 4));
            if (t === null) return ["얼음괴물이 이미 얼어붙은 몸을 할퀸다."];
            hero.asleep = t;
            return ["몸이 얼어붙어 움직일 수 없다!"];
        }
        case "F": {
            // 파리지옥 — 붙잡는다.
            const t = freeze(hero, 1);
            if (t === null) return ["덩굴이 이미 감긴 발목을 조인다."];
            hero.asleep = t;
            return ["덩굴이 발목을 감았다!"];
        }
        default:
            return [`${m.def.name}이(가) 달라붙는다.`];
    }
}
