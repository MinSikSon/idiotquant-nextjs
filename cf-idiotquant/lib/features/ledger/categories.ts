// 가계부 항목. 프리셋은 여기 상수로, 사용자가 만든 것은 D1(ledger_categories)에서 온다.
// 워커는 category 를 문자열로만 저장한다 — 라벨 해석은 전부 여기서 한다.

export type LedgerKind = "income" | "expense";

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
    { key: "invest", label: "투자" },
    { key: "etc", label: "기타" },
];

export const presetsOf = (kind: LedgerKind) =>
    kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

/* 사용자 항목의 키는 항목 "행"을 가리킨다 (cat:12).
   라벨을 키에 담으면(custom:여행) 이름 한 번 바꿀 때마다 내역을 전부 훑어야 한다.
   id 를 가리키면 이름은 ledger_categories 한 행만 고치면 끝난다. */
const CAT_PREFIX = "cat:";
export const catKey = (id: number) => `${CAT_PREFIX}${id}`;

/* 지운 항목으로 적어둔 내역은 custom:<지울 때의 라벨> 로 굳어 있다 (워커가 지우기
   직전에 바꿔둔다). 가리킬 행이 없어진 뒤에도 이름이 남게 하는 유일한 방법이다. */
const FROZEN_PREFIX = "custom:";
export const frozenKey = (label: string) => `${FROZEN_PREFIX}${label}`;

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

    if (key.startsWith(CAT_PREFIX)) {
        const id = Number(key.slice(CAT_PREFIX.length));
        // 이름이 목록에 없다 = 그 항목이 지워졌거나 목록을 아직 못 받았다.
        return custom.find((c) => c.id === id)?.label ?? "지운 항목";
    }

    if (key.startsWith(FROZEN_PREFIX)) return key.slice(FROZEN_PREFIX.length);
    return key;
}
