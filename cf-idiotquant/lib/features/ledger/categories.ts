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

/* 사용자 항목의 키는 라벨을 그대로 담는다 (custom:여행).
   덕분에 항목을 지워도 그 항목으로 적어둔 내역이 이름을 잃지 않는다 —
   키 하나에서 라벨이 복원되므로 참조가 끊길 자리가 없다. */
const CUSTOM_PREFIX = "custom:";
export const customKey = (label: string) => `${CUSTOM_PREFIX}${label}`;
export const isCustomKey = (key: string) => key.startsWith(CUSTOM_PREFIX);

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
        .map((c) => ({ key: customKey(c.label), label: c.label, id: c.id }));
    return [...presetsOf(kind), ...mine];
}

/**
 * 키를 라벨로. 프리셋에 없으면 custom: 접두사를 벗겨 쓰고, 그것도 아니면 키를 그대로 보여준다
 * — 프리셋이 바뀌어도, 항목을 지워도 옛 내역이 빈칸이 되지 않는다.
 */
export function categoryLabel(kind: LedgerKind, key: string) {
    const preset = presetsOf(kind).find((c) => c.key === key);
    if (preset) return preset.label;
    if (isCustomKey(key)) return key.slice(CUSTOM_PREFIX.length);
    return key;
}
