// 가계부 항목 프리셋. 폼 select · 리스트 배지 · 항목별 막대가 같은 출처를 쓰도록 한곳에 둔다.
// 워커는 category 를 문자열로만 저장한다 — 라벨 해석은 전부 여기서 한다.

export type LedgerKind = "income" | "expense";

export interface LedgerCategory {
    key: string;
    label: string;
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

export const categoriesOf = (kind: LedgerKind) =>
    kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

/** 라벨을 못 찾으면 키를 그대로 보여준다 — 프리셋이 바뀌어도 옛 내역이 빈칸이 되지 않는다. */
export const categoryLabel = (kind: LedgerKind, key: string) =>
    categoriesOf(kind).find((c) => c.key === key)?.label ?? key;
