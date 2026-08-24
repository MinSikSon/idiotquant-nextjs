// 가계부 항목. 프리셋은 여기 상수로, 사용자가 만든 것은 D1(ledger_categories)에서 온다.
// 워커는 category 를 문자열로만 저장한다 — 라벨 해석은 전부 여기서 한다.

/* saving 은 저축·투자다. 적금·주식 매수는 쓴 돈이 아니라 옮긴 돈이라
   지출에 섞으면 소비 합계가 부풀고 "이번 달 얼마 썼나"가 읽히지 않는다. */
export type LedgerKind = "income" | "expense" | "saving";

export const KIND_ORDER: LedgerKind[] = ["income", "expense", "saving"];

export interface LedgerCategory {
    key: string;
    label: string;
    /** 사용자가 만든 항목만 D1 행 id 를 갖는다. 프리셋은 지울 수 없다. */
    id?: number;
}

export const INCOME_CATEGORIES: LedgerCategory[] = [
    { key: "salary", label: "급여" },
    { key: "dividend", label: "주식 배당" },
    { key: "interest", label: "이자" },
    { key: "etc", label: "기타" },
];

export const EXPENSE_CATEGORIES: LedgerCategory[] = [
    { key: "fixed", label: "고정비" },
    { key: "living", label: "생활비" },
    { key: "etc", label: "기타" },
];

export const SAVING_CATEGORIES: LedgerCategory[] = [
    { key: "deposit", label: "예·적금" },
    { key: "invest", label: "투자" },
    { key: "pension", label: "연금" },
    { key: "etc", label: "기타" },
];

const PRESETS: Record<LedgerKind, LedgerCategory[]> = {
    income: INCOME_CATEGORIES,
    expense: EXPENSE_CATEGORIES,
    saving: SAVING_CATEGORIES,
};

export const presetsOf = (kind: LedgerKind) => PRESETS[kind];

/* 화면 어디서나 구분 하나에 이름과 색이 따라붙는다 — 세 갈래 삼항을 다섯 군데에
   흩어 놓으면 색 하나 바꿀 때 한 곳을 빠뜨린다. */
export const KIND_STYLE: Record<LedgerKind, {
    label: string;
    /** 눌린 토글·고른 칩 */
    solid: string;
    /** 항목별 막대 */
    bar: string;
    /** 목록의 항목 배지 */
    badge: string;
    /** 목록의 금액 */
    amount: string;
}> = {
    income: {
        label: "수입",
        solid: "bg-[#16a34a] border-[#16a34a] text-white",
        bar: "bg-[#16a34a]",
        badge: "bg-[#dcfce7] text-[#16a34a] dark:bg-[#052e16]/60 dark:text-[#16a34a]",
        amount: "text-[#16a34a]",
    },
    expense: {
        label: "지출",
        solid: "bg-red-600 border-red-600 text-white",
        bar: "bg-red-500",
        badge: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
        amount: "text-neutral-900 dark:text-neutral-100",
    },
    saving: {
        label: "저축",
        solid: "bg-blue-600 border-blue-600 text-white",
        bar: "bg-blue-500",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
        amount: "text-blue-700 dark:text-blue-400",
    },
};

/* 사용자 항목의 키는 항목 "행"을 가리킨다 (cat:12).
   라벨을 키에 담으면(custom:여행) 이름 한 번 바꿀 때마다 내역을 전부 훑어야 한다.
   id 를 가리키면 이름은 ledger_categories 한 행만 고치면 끝난다. */
const CAT_PREFIX = "cat:";
export const catKey = (id: number) => `${CAT_PREFIX}${id}`;

/* 지운 항목으로 적어둔 내역은 custom:<지울 때의 라벨> 로 굳어 있다 (워커가 지우기
   직전에 바꿔둔다). 가리킬 행이 없어진 뒤에도 이름이 남게 하는 유일한 방법이다. */
const FROZEN_PREFIX = "custom:";
export const frozenKey = (label: string) => `${FROZEN_PREFIX}${label}`;

/* 프리셋에서 내려온 키. '투자'는 원래 지출 항목이었다가 saving 으로 옮겼는데,
   그때 적어둔 기록은 여전히 expense/invest 로 저장돼 있다. 데이터를 고치지 않고
   이름만 되살린다 — 고를 수 있는 칩 목록에는 없다. */
const RETIRED_PRESETS: Record<string, string> = {
    "expense:invest": "투자",
};

/** D1 에서 온 항목 한 줄 (kind 별로 나눠 쓰기 위해 kind 를 그대로 갖고 다닌다) */
export interface StoredCategory {
    id: number;
    kind: LedgerKind;
    label: string;
}

/** 프리셋 뒤에 사용자 항목을 붙인 목록. 폼 칩이 이걸 그린다. */
export function categoriesOf(kind: LedgerKind, custom: StoredCategory[] = []): LedgerCategory[] {
    const mine = custom
        .filter((c) => c.kind === kind)
        .map((c) => ({ key: catKey(c.id), label: c.label, id: c.id }));
    return [...presetsOf(kind), ...mine];
}

/**
 * 키를 라벨로. 프리셋 → 사용자 항목(id 로 찾음) → 굳어버린 라벨 → 키 그대로.
 * 어느 단계에서 멈추든 빈칸이 되지 않는 것이 이 함수의 유일한 약속이다.
 */
export function categoryLabel(kind: LedgerKind, key: string, custom: StoredCategory[] = []) {
    const preset = presetsOf(kind).find((c) => c.key === key);
    if (preset) return preset.label;

    const retired = RETIRED_PRESETS[`${kind}:${key}`];
    if (retired) return retired;

    if (key.startsWith(CAT_PREFIX)) {
        const id = Number(key.slice(CAT_PREFIX.length));
        // 이름이 목록에 없다 = 그 항목이 지워졌거나 목록을 아직 못 받았다.
        return custom.find((c) => c.id === id)?.label ?? "지운 항목";
    }

    if (key.startsWith(FROZEN_PREFIX)) return key.slice(FROZEN_PREFIX.length);
    return key;
}
