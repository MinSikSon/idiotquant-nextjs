/**
 * 아이템 도감 — 56종의 목록과 플레이버 텍스트, 그리고 통달 조건.
 *
 * `DROP-CODEX.md` §4 기획안의 정의를 따른다.
 *
 * ── 5단계 해금 모델 ──────────────────────────────────────────────────────────
 *   0 미발견 (`·`) — 아직 보지도 못함. 줄은 있고 이름/스탯은 숨김.
 *   1 목격   (`◌`) — 시야에 들어옴 (이번 판 한정). 겉모습 이름만 노출. 스탯/층 숨김.
 *   2 획득   (`○`) — 배낭에 들어옴 (이번 판 한정). 겉모습 이름 + 수량. 스탯/층 숨김.
 *   3 식별   (`●`) — 정체 식별 완료 (판을 넘어 영구 보존). 참 이름, 스탯, 나오는 층 띠.
 *   4 통달   (`★`) — 사용 숙련 달성 (판을 넘어 영구 보존). 플레이버 둘째 문단(통달) 해금.
 *
 * ── 통달 조건 ───────────────────────────────────────────────────────────────
 *   무기: 그것으로 20킬
 *   방어구: 입고 1,000걸음
 *   물약·주문서: 5회 마시거나 읽음
 *   지팡이: 15회 쏨
 *   반지: 끼고 1,000걸음
 *   식량·증표: 식별과 동시 (1회)
 */

import {
    ARMORS,
    POTIONS,
    RINGS,
    SCROLLS,
    WANDS,
    WEAPONS,
    armorClassOf,
    defenseOf,
    describe,
    itemChar,
    itemDepthRange,
    makeItem,
} from "./items";
import { type GameState, type Item, type ItemKind } from "./types";

export type CodexCategory =
    | "weapon"
    | "armor"
    | "scroll"
    | "potion"
    | "ring"
    | "wand"
    | "other";

export interface CodexEntry {
    kind: ItemKind;
    type: string;
    key: string;
    name: string;
    category: CodexCategory;
    categoryLabel: string;
    masteryType: "kills" | "steps" | "uses" | "instant";
    masteryGoal: number;
    /** 플레이버 텍스트 1문단 — 식별(3단계) 시 상세에서 보인다. */
    flavor: string;
    /** 플레이버 텍스트 2문단 — 통달(4단계) 시 추가로 열린다. */
    masteryFlavor: string;
}

export const CODEX_ENTRIES: CodexEntry[] = [
    // ── 무기 (13종) ───────────────────────────────────────────────────────────
    {
        kind: "weapon",
        type: "dagger",
        key: "weapon:dagger",
        name: "단검",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "가장 짧고 가벼운 날붙이. 좁은 통로에서도 거추장스럽지 않게 휘두를 수 있다.",
        masteryFlavor: "가볍다고 얕본 괴물들이 수없이 쓰러졌다. 던져서 맞히는 손맛이 일품이다.",
    },
    {
        kind: "weapon",
        type: "mace",
        key: "weapon:mace",
        name: "철퇴",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "묵직한 쇠뭉치가 달린 둔기. 단단한 껍질을 가진 괴물도 뼈째 으스러뜨린다.",
        masteryFlavor: "처음 던전에 발을 들였을 때 손에 쥐여 있던 무게감. 끝까지 믿음직하다.",
    },
    {
        kind: "weapon",
        type: "spear",
        key: "weapon:spear",
        name: "창",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "날카로운 쇠촉이 달린 긴 자루. 거리를 두고 찌르거나 멀리 던지기에 알맞다.",
        masteryFlavor: "적의 손이 닿지 않는 거리에서 급소를 꿰뚫는 법을 완벽히 익혔다.",
    },
    {
        kind: "weapon",
        type: "dart",
        key: "weapon:dart",
        name: "표창",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "한 손에 쏙 들어오는 얇은 쇳조각. 여러 장을 겹쳐 쥐고 빠르게 던진다.",
        masteryFlavor: "손가락 끝의 스냅만으로 날아가는 궤적이 적의 목덜미에 정확히 꽂힌다.",
    },
    {
        kind: "weapon",
        type: "arrow",
        key: "weapon:arrow",
        name: "화살",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "깃이 달린 곧은 살대. 손으로 던져도 날카로운 촉이 상대를 파고든다.",
        masteryFlavor: "활이 없어도 날카로운 투척 무기로서 제 몫을 톡톡히 해냈다.",
    },
    {
        kind: "weapon",
        type: "long sword",
        key: "weapon:long sword",
        name: "장검",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "균형 잡힌 칼날과 손잡이를 지닌 표준 검. 베고 찌르는 데 부족함이 없다.",
        masteryFlavor: "가장 많은 모험가가 쥐고 내려가며 던전의 기본기를 닦은 칼이다.",
    },
    {
        kind: "weapon",
        type: "two-handed sword",
        key: "weapon:two-handed sword",
        name: "양손검",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "두 손으로 온 힘을 실어 내려치는 거대한 검. 휘두르는 궤적마다 바람을 가른다.",
        masteryFlavor: "육중한 무게를 완벽히 통제할 때 나오는 파괴력은 어떤 방어구도 찢는다.",
    },
    {
        kind: "weapon",
        type: "silver arrow",
        key: "weapon:silver arrow",
        name: "은화살",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "순은으로 벼려낸 귀한 화살. 사악한 기운을 태우듯 날카롭게 번뜩인다.",
        masteryFlavor: "은빛 궤적을 남기며 날아가 깊은 층의 요물들을 단숨에 꿰뚫었다.",
    },
    {
        kind: "weapon",
        type: "silver sword",
        key: "weapon:silver sword",
        name: "진은검",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "은을 통째로 두들겨 폈다. 가볍지 않은데 손에 착 붙는다.",
        masteryFlavor: "날이 상하지 않는 것이 이 칼의 값이다. 스물여섯 층을 끝까지 같이 내려간 사람이 적지 않다.",
    },
    {
        kind: "weapon",
        type: "thirsty sword",
        key: "weapon:thirsty sword",
        name: "목마른 자의 검",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "검붉은 칼날이 피를 갈구하듯 섬뜩하게 빛난다. 베인 상처가 쉽게 아물지 않는다.",
        masteryFlavor: "검이 품은 굶주림을 달래며 수많은 적의 숨통을 끊어 놓았다.",
    },
    {
        kind: "weapon",
        type: "magic sword",
        key: "weapon:magic sword",
        name: "마법의 검",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "푸른빛 마력이 칼날 전체를 감싸고 있다. 공기를 벨 때마다 청명한 울림이 난다.",
        masteryFlavor: "마력과 칼끝이 완벽한 일치를 이루어 적의 살과 영혼을 함께 베어 넘긴다.",
    },
    {
        kind: "weapon",
        type: "knight sword",
        key: "weapon:knight sword",
        name: "기사의 검",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "기사단의 영예가 서린 명검. 흠잡을 데 없는 강도와 날카로움을 자랑한다.",
        masteryFlavor: "어둠 속에서도 명예를 잃지 않고 마왕의 권속들을 베어 넘긴 용사의 검이다.",
    },
    {
        kind: "weapon",
        type: "baphomet sword",
        key: "weapon:baphomet sword",
        name: "바포메트의 검",
        category: "weapon",
        categoryLabel: "무기",
        masteryType: "kills",
        masteryGoal: 20,
        flavor: "심연의 지배자가 썼다는 전설의 마검. 손에 쥐는 순간 파멸의 기운이 온몸을 휘감는다.",
        masteryFlavor: "지하 26층의 바닥을 밟고 증표를 탈환한 전설적인 자만이 이 검의 진정한 주인이 된다.",
    },

    // ── 방어구 (9종) ──────────────────────────────────────────────────────────
    {
        kind: "armor",
        type: "leather",
        key: "armor:leather",
        name: "가죽 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "질긴 가죽을 덧대어 만든 경량 갑옷. 움직임이 둔해지지 않는다.",
        masteryFlavor: "가벼운 발걸음으로 천 걸음 넘게 미궁을 누비며 긁힌 상처들을 막아 주었다.",
    },
    {
        kind: "armor",
        type: "ring mail",
        key: "armor:ring mail",
        name: "사슬 고리 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "가죽 겉면에 쇠고리를 촘촘히 엮어 박은 갑옷. 초기 탐색에 든든하다.",
        masteryFlavor: "모험의 첫걸음부터 몸을 지켜 준 쇠고리들. 그 울림이 이제 익숙하다.",
    },
    {
        kind: "armor",
        type: "scale mail",
        key: "armor:scale mail",
        name: "비늘 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "물고기 비늘 모양의 쇠 조각을 겹쳐 만든 갑옷. 베는 공격에 강하다.",
        masteryFlavor: "겹겹이 맞물린 비늘들이 빗발치는 칼날을 튕겨내며 깊은 층까지 버텨냈다.",
    },
    {
        kind: "armor",
        type: "chain mail",
        key: "armor:chain mail",
        name: "사슬 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "단단한 강철 쇠사슬을 꼼꼼하게 엮은 정통 사슬 갑옷.",
        masteryFlavor: "묵직한 쇠사슬의 무게에 익숙해진 발걸음으로 수많은 전장을 돌파했다.",
    },
    {
        kind: "armor",
        type: "banded mail",
        key: "armor:banded mail",
        name: "띠 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "넓은 쇠 띠를 가로로 이어 붙인 갑옷. 몸통을 단단히 조여 보호한다.",
        masteryFlavor: "단단한 강철 띠가 흉부를 든든하게 받쳐 주어 치명적인 타격을 여러 번 넘겼다.",
    },
    {
        kind: "armor",
        type: "plate mail",
        key: "armor:plate mail",
        name: "판금 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "통쇠를 두드려 만든 중갑. 웬만한 괴물의 발톱은 흠집도 내지 못한다.",
        masteryFlavor: "강철의 요새가 되어 미궁의 사투 속에서도 온전한 몸으로 살아남았다.",
    },
    {
        kind: "armor",
        type: "mithril mail",
        key: "armor:mithril mail",
        name: "미스릴 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "은빛 마법 금속으로 직조한 보물. 깃털처럼 가벼우면서도 강철보다 단단하다.",
        masteryFlavor: "마법의 탄성과 가벼움 덕에 어둠 속에서도 바람처럼 거침없이 나아갔다.",
    },
    {
        kind: "armor",
        type: "dragon mail",
        key: "armor:dragon mail",
        name: "용비늘 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "고대 용의 가죽과 비늘을 통째로 가공한 전설의 방어구.",
        masteryFlavor: "용의 위압감이 서린 비늘 아래서 그 어떤 괴물도 두렵지 않게 되었다.",
    },
    {
        kind: "armor",
        type: "baphomet mail",
        key: "armor:baphomet mail",
        name: "바포메트의 갑옷",
        category: "armor",
        categoryLabel: "방어구",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "심연의 군주가 입었던 최고의 갑옷. 물리적인 방어를 초월한 절대적인 위엄을 지닌다.",
        masteryFlavor: "지하 최심부의 악몽을 뚫고 지나온 자만이 걸칠 수 있는 불멸의 갑주다.",
    },

    // ── 주문서 (8종) ─────────────────────────────────────────────────────────
    {
        kind: "scroll",
        type: "magic mapping",
        key: "scroll:magic mapping",
        name: "지도",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "읽는 순간 머릿속에 현재 층의 방과 복도, 비밀문의 배치가 훤히 그려진다.",
        masteryFlavor: "미궁의 윤곽을 꿰뚫어 보며 어둠 속에서도 헤매지 않고 계단을 찾아냈다.",
    },
    {
        kind: "scroll",
        type: "teleport",
        key: "scroll:teleport",
        name: "순간이동",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "공간을 뒤틀어 시전자를 층 내의 무작위 안전한 바닥으로 즉시 옮긴다.",
        masteryFlavor: "절체절명의 위기에서 순간이동 주문서 한 장으로 수없이 목숨을 건졌다.",
    },
    {
        kind: "scroll",
        type: "enchant weapon",
        key: "scroll:enchant weapon",
        name: "무기 강화",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "손에 쥔 무기에 마법을 깃들여 명중과 피해를 높인다. +6 위로는 실패 시 부서질 수 있다.",
        masteryFlavor: "숫자가 올라갈 때마다 뿜어내는 날카로운 빛이 모험의 든든한 힘이 되었다.",
    },
    {
        kind: "scroll",
        type: "enchant armor",
        key: "scroll:enchant armor",
        name: "갑옷 강화",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "착용한 갑옷의 방어력을 1단계 높인다. +4 위로는 실패 시 산산조각이 난다.",
        masteryFlavor: "방어력 한 끗의 차이가 생사를 가르는 순간마다 단단하게 몸을 감싸 주었다.",
    },
    {
        kind: "scroll",
        type: "blessed enchant",
        key: "scroll:blessed enchant",
        name: "축복받은 강화",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor:
            "무기든 갑옷이든 안전 구간 안에서 한 번에 1~3 단계를 끌어올린다. 천장을 넘는 만큼은 흩어지고, " +
            "천장 위에서는 보통 강화 주문서와 다를 바 없다.",
        masteryFlavor: "벼려 올리는 길을 몇 번이고 단숨에 건너뛰어, 아껴 둔 주문서가 그만큼 쌓였다.",
    },
    {
        kind: "scroll",
        type: "identify",
        key: "scroll:identify",
        name: "감정",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "배낭 속 미지의 물건 하나를 골라 진짜 정체와 손질 수치, 저주 여부를 밝혀낸다.",
        masteryFlavor: "의심과 호기심 속에서 물건의 본질을 밝혀내며 지혜를 쌓았다.",
    },
    {
        kind: "scroll",
        type: "remove curse",
        key: "scroll:remove curse",
        name: "저주 해제",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "착용한 장비에 걸린 사악한 저주를 풀어 벗거나 버릴 수 있게 해 준다.",
        masteryFlavor: "손에 달라붙어 떨어지지 않던 저주받은 무기와 반지를 말끔히 정화했다.",
    },
    {
        kind: "scroll",
        type: "aggravate monsters",
        key: "scroll:aggravate monsters",
        name: "도발",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "찢어지는 듯한 괴성을 울려 현재 층의 모든 잠든 괴물을 깨우고 흥분시킨다.",
        masteryFlavor: "위험을 무릅쓰고 적들을 일깨워 한꺼번에 섬멸하는 경지에 다다랐다.",
    },
    {
        kind: "scroll",
        type: "transmutation",
        key: "scroll:transmutation",
        name: "재련",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "배낭의 장비를 같은 종류의 다른 무작위 장비로 신비롭게 재연성한다.",
        masteryFlavor: "연금술의 오의를 깨달아 잉여 장비에서 진귀한 보물을 연성해 냈다.",
    },
    {
        kind: "scroll",
        type: "sleep",
        key: "scroll:sleep",
        name: "수면",
        category: "scroll",
        categoryLabel: "주문서",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "달콤한 최면의 기운이 퍼지며 시전자를 몇 턴 동안 깊은 잠에 빠뜨린다.",
        masteryFlavor: "잠든 사이 덮쳐오는 위험을 겪으며 방심하지 않는 법을 배웠다.",
    },

    // ── 물약 (8종) ───────────────────────────────────────────────────────────
    {
        kind: "potion",
        type: "healing",
        key: "potion:healing",
        name: "체력 회복",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "마시면 상처가 아물며 체력을 회복한다. 체력이 가득 차 있으면 최대 체력이 오른다.",
        masteryFlavor: "피투성이가 된 사투의 현장에서 한 모금의 안식으로 생명을 이어갔다.",
    },
    {
        kind: "potion",
        type: "extra healing",
        key: "potion:extra healing",
        name: "고급 체력 회복",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "진한 생명력이 농축된 물약. 막대한 체력을 회복하고 최대 체력을 크게 늘려 준다.",
        masteryFlavor: "심장이 터질 듯한 중상 속에서도 단번에 온몸에 활력을 되찾아 준 영약이다.",
    },
    {
        kind: "potion",
        type: "strength",
        key: "potion:strength",
        name: "용기",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "마시는 순간 근육이 부풀어 오르며 영구적으로 힘(근력)이 1 증가한다.",
        masteryFlavor: "끓어오르는 용기와 힘으로 거구의 괴물들을 주먹만으로 압도했다.",
    },
    {
        kind: "potion",
        type: "restore strength",
        key: "potion:restore strength",
        name: "해독",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "독이나 괴물의 수법으로 깎여 나간 힘을 원래의 최대치까지 단숨에 되돌린다.",
        masteryFlavor: "탁한 독기를 씻어내고 온전한 근력을 되찾는 비결을 완전히 체득했다.",
    },
    {
        kind: "potion",
        type: "poison",
        key: "potion:poison",
        name: "독",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "지독한 독약. 마시면 근력이 깎여 나가며 힘이 빠진다. 던져서 맞히면 상대에게도 듣는다.",
        masteryFlavor: "쓴맛을 보며 독의 치명성을 깨달았고, 던져서 적을 약화시키는 법을 익혔다.",
    },
    {
        kind: "potion",
        type: "blindness",
        key: "potion:blindness",
        name: "암흑",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "시신경을 마비시켜 잠시 동안 사방이 칠흑 같은 어둠으로 뒤덮인다.",
        masteryFlavor: "앞이 보이지 않는 공포 속에서도 발자국 소리와 육감만으로 살아남았다.",
    },
    {
        kind: "potion",
        type: "confusion",
        key: "potion:confusion",
        name: "혼란",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "마음이 어지러워지며 가려는 방향과 다른 곳으로 발걸음이 헛딛게 된다.",
        masteryFlavor: "비틀거리는 혼란 속에서도 벽을 짚고 균형을 유지하는 요령을 배웠다.",
    },
    {
        kind: "potion",
        type: "detect monsters",
        key: "potion:detect monsters",
        name: "생명 탐지",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        masteryGoal: 5,
        flavor: "벽 너머에 숨어 있는 모든 괴물의 위치와 기척이 훤히 드러난다.",
        masteryFlavor: "어둠 속에 웅크린 매복을 미리 감지하여 언제나 먼저 칼을 뽑았다.",
    },
    {
        kind: "potion",
        type: "revival",
        key: "potion:revival",
        name: "소생",
        category: "potion",
        categoryLabel: "물약",
        masteryType: "uses",
        // 주문서·물약은 다 `5` 다 — 한 종만 다르면 「통달」의 뜻이 종마다 갈린다.
        masteryGoal: 5,
        flavor: "쓰러진 동료의 입에 흘려 넣으면 꺼져 가던 숨이 돌아온다 — 곁에 서야 닿는다.",
        masteryFlavor: "위험을 무릅쓰고 걸어 들어가 동료를 끌어냈다. 혼자였다면 셋 다 남지 않았다.",
    },

    // ── 반지 (8종) ───────────────────────────────────────────────────────────
    {
        kind: "ring",
        type: "protection",
        key: "ring:protection",
        name: "보호",
        category: "ring",
        categoryLabel: "반지",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "착용자의 몸 주위에 보이지 않는 보호막을 둘러 방어력을 높인다.",
        masteryFlavor: "천 걸음을 함께하며 수많은 칼끝을 튕겨내 준 가장 믿음직한 수호의 고리다.",
    },
    {
        kind: "ring",
        type: "add strength",
        key: "ring:add strength",
        name: "힘",
        category: "ring",
        categoryLabel: "반지",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "손가락에 끼고 있는 동안 근력을 추가로 끌어올린다.",
        masteryFlavor: "반지가 주는 강력한 완력으로 무거운 칼을 깃털처럼 휘두르며 걸어왔다.",
    },
    {
        kind: "ring",
        type: "regeneration",
        key: "ring:regeneration",
        name: "재생",
        category: "ring",
        categoryLabel: "반지",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "걸을 때마다 상처가 빠르게 아문다. 대가로 허기가 훨씬 빨리 찾아온다.",
        masteryFlavor: "식량을 태우며 상처를 치유하는 절묘한 타이밍을 완벽히 다루게 되었다.",
    },
    {
        kind: "ring",
        type: "searching",
        key: "ring:searching",
        name: "탐색",
        category: "ring",
        categoryLabel: "반지",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "숨겨진 비밀문과 위험한 함정을 저절로 찾아낼 확률이 크게 오른다.",
        masteryFlavor: "반지의 공명 덕분에 벽 뒤에 숨은 길과 바닥의 덫을 한눈에 간파했다.",
    },
    {
        kind: "ring",
        type: "sustain strength",
        key: "ring:sustain strength",
        name: "힘 유지",
        category: "ring",
        categoryLabel: "반지",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "독이나 괴물의 능력에 의해 힘이 깎이는 것을 완벽하게 막아 준다.",
        masteryFlavor: "어떤 맹독과 흡혈 괴물 앞에서도 근력을 잃지 않고 굳건히 버텨냈다.",
    },
    {
        kind: "ring",
        type: "slow digestion",
        key: "ring:slow digestion",
        name: "소화 억제",
        category: "ring",
        categoryLabel: "반지",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "위장의 활동을 늦춰 배고픔이 찾아오는 속도를 크게 줄인다.",
        masteryFlavor: "식량이 마른 황량한 층에서도 여유롭게 미궁 구석구석을 탐험했다.",
    },
    {
        kind: "ring",
        type: "teleportation",
        key: "ring:teleportation",
        name: "순간이동",
        category: "ring",
        categoryLabel: "반지",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "불안정한 공간 마력이 깃들어 걸핏하면 엉뚱한 곳으로 순간이동한다.",
        masteryFlavor: "시도 때도 없이 뒤틀리는 공간 속에서도 침착하게 전열을 가다듬었다.",
    },
    {
        kind: "ring",
        type: "adornment",
        key: "ring:adornment",
        name: "장식",
        category: "ring",
        categoryLabel: "반지",
        masteryType: "steps",
        masteryGoal: 1000,
        flavor: "눈부시게 아름답지만 특별한 마법적 효과는 없는 화려한 장신구.",
        masteryFlavor: "아무런 힘도 없지만 어두운 미궁에서 손가락을 빛내 준 소박한 벗이다.",
    },

    // ── 지팡이 (8종) ─────────────────────────────────────────────────────────
    {
        kind: "wand",
        type: "magic missile",
        key: "wand:magic missile",
        name: "마법 화살",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "목표를 향해 순수한 마력 탄환(2d4)을 쏘아 보낸다. 빗나가지 않는다.",
        masteryFlavor: "원거리의 적을 정확히 격추하며 지팡이 마법의 기본기를 완성했다.",
    },
    {
        kind: "wand",
        type: "lightning",
        key: "wand:lightning",
        name: "번개",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "눈부신 전격(6d6)을 발사하여 일직선상의 적을 감전시켜 잿더미로 만든다.",
        masteryFlavor: "벽을 울리는 뇌성과 함께 강력한 몬스터 무리를 단숨에 제압했다.",
    },
    {
        kind: "wand",
        type: "fire",
        key: "wand:fire",
        name: "화염",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "맹렬한 불꽃 줄기(6d6)를 뿜어내어 전방의 대상을 불사른다.",
        masteryFlavor: "어두운 복도를 새빨갛게 물들이며 심연의 괴물들을 태워 버렸다.",
    },
    {
        kind: "wand",
        type: "cold",
        key: "wand:cold",
        name: "냉기",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "살을 에는 혹한의 냉기(6d6)를 내뿜어 적의 숨결마저 얼려 붙인다.",
        masteryFlavor: "영하의 냉기로 적의 진격을 꽁꽁 얼려 승기를 굳혔다.",
    },
    {
        kind: "wand",
        type: "slow monster",
        key: "wand:slow monster",
        name: "둔화",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "빛줄기를 맞은 괴물의 몸이 무거워져 이동과 공격 속도가 절반으로 떨어진다.",
        masteryFlavor: "재빠른 요괴들도 달팽이처럼 느리게 만들어 손쉽게 요리했다.",
    },
    {
        kind: "wand",
        type: "haste monster",
        key: "wand:haste monster",
        name: "가속",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "대상을 흥분시켜 속도를 두 배로 빠르게 만든다. 잘못 쏘면 큰 화를 부른다.",
        masteryFlavor: "위험천만한 마력의 흐름을 통제하여 마법의 극의를 이해했다.",
    },
    {
        kind: "wand",
        type: "teleport away",
        key: "wand:teleport away",
        name: "밀어내기",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "눈앞의 괴물을 현재 층의 머나먼 무작위 위치로 즉시 날려 버린다.",
        masteryFlavor: "목숨이 위태로운 근접전에서 위험한 강적을 저 멀리 추방했다.",
    },
    {
        kind: "wand",
        type: "digging",
        key: "wand:digging",
        name: "굴착",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "전방의 단단한 벽을 파괴하여 새로운 통로를 뚫고 파편 피해를 입힌다.",
        masteryFlavor: "미궁의 지형을 제 뜻대로 주무르며 막힌 길을 자유자재로 뚫어냈다.",
    },
    {
        kind: "wand",
        type: "swapping",
        key: "wand:swapping",
        name: "위치 교환",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "시야 내의 괴물과 영웅의 위치를 순식간에 맞바꾸어 위기를 모면한다.",
        masteryFlavor: "공간을 뒤틀어 적을 함정에 빠뜨리고 위험한 포위망을 유유히 탈출했다.",
    },
    {
        kind: "wand",
        type: "gust",
        key: "wand:gust",
        name: "돌풍",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "맹렬한 돌풍을 뿜어 적을 3칸 밀쳐내며, 벽 충돌 시 기절과 큰 피해를 준다.",
        masteryFlavor: "적들을 벽에 처박아 무력화하며 완벽한 전술적 거리두기를 완성했다.",
    },
    {
        kind: "wand",
        type: "cancel",
        key: "wand:cancel",
        name: "무력화",
        category: "wand",
        categoryLabel: "지팡이",
        masteryType: "uses",
        masteryGoal: 15,
        flavor: "괴물이 지닌 모든 특수 수법과 마법 능력을 완전히 지워 버린다.",
        masteryFlavor: "위협적인 특수 공격을 무력화하여 평범한 짐승으로 격하시켰다.",
    },

    // ── 그 밖 (2종) ──────────────────────────────────────────────────────────
    {
        kind: "food",
        type: "food ration",
        key: "food:food ration",
        name: "식량",
        category: "other",
        categoryLabel: "그 밖",
        masteryType: "instant",
        masteryGoal: 1,
        flavor: "말린 고기와 딱딱한 빵으로 구성된 모험가의 비상 식량. 허기를 채워 준다.",
        masteryFlavor: "미궁의 어둠 속에서 한 입 베어 문 식량이 다시 걸어갈 힘을 주었다.",
    },
    {
        kind: "amulet",
        type: "amulet",
        key: "amulet:amulet",
        name: "옌더의 증표",
        category: "other",
        categoryLabel: "그 밖",
        masteryType: "instant",
        masteryGoal: 1,
        flavor: "지하 26층 심연의 제단에 안치된 신비로운 부적. 이것을 쥐고 1층으로 살아 나가야 한다.",
        masteryFlavor: "던전의 가장 깊은 바닥에 도달해 영광의 증표를 손에 넣은 전설적인 위업이다.",
    },
];

export const CODEX_BY_KEY: Record<string, CodexEntry> = Object.fromEntries(
    CODEX_ENTRIES.map((e) => [e.key, e]),
);

/**
 * 5단계 해금 판정.
 *
 * 0: 미발견 (`·`)
 * 1: 목격   (`◌`) — 시야 진입 (이번 판 한정)
 * 2: 획득   (`○`) — 배낭 소지 (이번 판 한정)
 * 3: 식별   (`●`) — 정체 식별 (판을 넘어 영구 보존)
 * 4: 통달   (`★`) — 사용 숙련 달성 (판을 넘어 영구 보존)
 */
export function itemCodexStage(
    entry: CodexEntry,
    state: GameState,
): 0 | 1 | 2 | 3 | 4 {
    const key = entry.key;
    const isIdentified = !!(state.itemCodex?.[key] || state.known?.[key]);
    const usage = state.itemUsage?.[key] ?? 0;

    if (isIdentified) {
        if (usage >= entry.masteryGoal) return 4;
        return 3;
    }

    const inPack = state.heroes[0].pack.some(
        (it) => it.kind === entry.kind && it.type === entry.type,
    );
    if (inPack) return 2;

    if (state.seenItems?.[key]) return 1;

    return 0;
}

export interface CodexProgressSummary {
    identifiedCount: number;
    masteredCount: number;
    totalCount: number;
    byCategory: Record<
        CodexCategory,
        { identified: number; mastered: number; total: number }
    >;
}

export function itemCodexProgress(
    itemCodex: Record<string, boolean> = {},
    itemUsage: Record<string, number> = {},
): CodexProgressSummary {
    const totalCount = CODEX_ENTRIES.length;
    let identifiedCount = 0;
    let masteredCount = 0;

    const byCategory: Record<
        CodexCategory,
        { identified: number; mastered: number; total: number }
    > = {
        weapon: { identified: 0, mastered: 0, total: 0 },
        armor: { identified: 0, mastered: 0, total: 0 },
        scroll: { identified: 0, mastered: 0, total: 0 },
        potion: { identified: 0, mastered: 0, total: 0 },
        ring: { identified: 0, mastered: 0, total: 0 },
        wand: { identified: 0, mastered: 0, total: 0 },
        other: { identified: 0, mastered: 0, total: 0 },
    };

    for (const e of CODEX_ENTRIES) {
        byCategory[e.category].total++;
        const ided = !!itemCodex[e.key];
        const usage = itemUsage[e.key] ?? 0;
        const mastered = ided && usage >= e.masteryGoal;

        if (ided) {
            identifiedCount++;
            byCategory[e.category].identified++;
        }
        if (mastered) {
            masteredCount++;
            byCategory[e.category].mastered++;
        }
    }

    return {
        identifiedCount,
        masteredCount,
        totalCount,
        byCategory,
    };
}

/**
 * 아이템의 통계 요약 (식별된 경우만 출력할 문자열).
 */
export function itemCodexStats(entry: CodexEntry): string {
    const depths = itemDepthRange(entry.kind, entry.type);
    const depthStr = depths ? `${depths.min}–${depths.max}층` : "1–26층";

    switch (entry.kind) {
        case "weapon": {
            const def = WEAPONS[entry.type];
            return `${def?.damage ?? "1d2"} · ${depthStr}`;
        }
        case "armor": {
            const def = ARMORS[entry.type];
            const defVal = defenseOf(def?.armor ?? 10);
            return `방어력 ${defVal} · ${depthStr}`;
        }
        case "potion":
        case "scroll":
        case "wand":
        case "ring":
            return depthStr;
        case "food":
            return "1–26층 · 허기 1300 회복";
        case "amulet":
            return "지하 26층";
        default:
            return depthStr;
    }
}
