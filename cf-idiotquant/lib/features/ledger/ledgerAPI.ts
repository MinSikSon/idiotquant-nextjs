import type { LedgerKind } from "./categories";

export interface LedgerEntry {
    id: number;
    entry_date: string;   // 'YYYY-MM-DD'
    kind: LedgerKind;
    category: string;
    amount: number;       // 원 단위 양수. 부호는 kind 가 정한다.
    memo: string | null;
    created_at: number;
}

export interface NewLedgerEntry {
    entry_date: string;
    kind: LedgerKind;
    category: string;
    amount: number;
    memo?: string;
}

async function ledgerRequest(subUrl: string, method = "GET", body?: object) {
    const url = `/api/proxy${subUrl}`;
    const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "content-type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
}

export const getLedger = (month: string) => ledgerRequest(`/user/ledger?month=${month}`);

export const addLedgerEntry = (entry: NewLedgerEntry) => ledgerRequest("/user/ledger", "POST", entry);

// 수정·삭제의 id 는 쿼리로 보낸다 — 프록시가 non-GET body 에 주문 필드를 병합하기 때문.
export const updateLedgerEntry = (id: number, entry: NewLedgerEntry) =>
    ledgerRequest(`/user/ledger?id=${id}`, "PUT", entry);

export const deleteLedgerEntry = (id: number) => ledgerRequest(`/user/ledger?id=${id}`, "DELETE");
