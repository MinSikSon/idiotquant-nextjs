import type { LedgerKind, StoredCategory } from "./categories";

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

/* owner 는 "어느 가계부인가" 다. 비우면 내 것 — 워커도 같은 규칙이라
   혼자 쓰는 사람의 요청은 예전과 완전히 같은 모양으로 나간다. */
type Owner = string | null;
const own = (owner: Owner) => (owner ? `owner=${encodeURIComponent(owner)}` : "");
const q = (...parts: string[]) => {
    const joined = parts.filter(Boolean).join("&");
    return joined ? `?${joined}` : "";
};

export const getLedger = (owner: Owner, month: string) =>
    ledgerRequest(`/user/ledger${q(`month=${month}`, own(owner))}`);

export const addLedgerEntry = (owner: Owner, entry: NewLedgerEntry) =>
    ledgerRequest(`/user/ledger${q(own(owner))}`, "POST", entry);

// 수정·삭제의 id 는 쿼리로 보낸다 — 프록시가 non-GET body 에 주문 필드를 병합하기 때문.
export const updateLedgerEntry = (owner: Owner, id: number, entry: NewLedgerEntry) =>
    ledgerRequest(`/user/ledger${q(`id=${id}`, own(owner))}`, "PUT", entry);

export const deleteLedgerEntry = (owner: Owner, id: number) =>
    ledgerRequest(`/user/ledger${q(`id=${id}`, own(owner))}`, "DELETE");

/* 사용자가 만든 항목 — 칩으로 무엇을 보여줄지만 정한다. 지워도 과거 내역은 그대로 남는다. */
export type { StoredCategory };

export const getLedgerCategories = (owner: Owner) =>
    ledgerRequest(`/user/ledger/categories${q(own(owner))}`);

export const addLedgerCategory = (owner: Owner, kind: LedgerKind, label: string) =>
    ledgerRequest(`/user/ledger/categories${q(own(owner))}`, "POST", { kind, label });

export const deleteLedgerCategory = (owner: Owner, id: number) =>
    ledgerRequest(`/user/ledger/categories${q(`id=${id}`, own(owner))}`, "DELETE");

/* ── 공유 ── */

export interface LedgerAccess {
    owner_user_id: string;
    owner_name: string | null;
    is_mine: boolean;
}

export interface LedgerMember {
    user_id: string;
    name: string | null;
    joined_at: number;
}

export interface LedgerInvitePreview {
    owner_user_id: string;
    owner_name: string | null;
    expired: boolean;
    used: boolean;
    already_member: boolean;
    is_mine: boolean;
}

/** 내가 볼 수 있는 가계부 + 내 가계부에 들어와 있는 사람들 */
export const getLedgerAccess = () => ledgerRequest("/user/ledger/access");

/** 초대 링크 발급 (내 가계부만) */
export const createLedgerInvite = () => ledgerRequest("/user/ledger/invite", "POST");

/** 수락 전 미리보기 — 누가 불렀는지, 아직 살아 있는지 */
export const getLedgerInvite = (token: string) =>
    ledgerRequest(`/user/ledger/invite?token=${encodeURIComponent(token)}`);

export const acceptLedgerInvite = (token: string) =>
    ledgerRequest(`/user/ledger/invite?token=${encodeURIComponent(token)}`, "POST");
