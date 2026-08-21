import type { LedgerKind, StoredCategory } from "./categories";

export interface LedgerEntry {
    id: number;
    entry_date: string;   // 'YYYY-MM-DD'
    kind: LedgerKind;
    category: string;
    amount: number;       // 원 단위 양수. 부호는 kind 가 정한다.
    memo: string | null;
    created_at: number;
    /* 누가 적었고 누가 고쳤는가. 이름은 워커가 users 에서 붙여 준다 —
       남의 가계부를 볼 때 프론트에는 id 로 이름을 찾을 표가 없다.
       0028 이전에 적힌 내역은 전부 null 이다. */
    created_by?: string | null;
    created_by_name?: string | null;
    updated_by?: string | null;
    updated_by_name?: string | null;
    updated_at?: number | null;
    /** 같은 날 안에서 손으로 정한 순서. 작을수록 위. 0029 이전 줄은 null 이다. */
    position?: number | null;
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

    let res: Response;
    try {
        res = await fetch(url, {
            method,
            credentials: "include",
            headers: { "content-type": "application/json" },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
    } catch {
        return { success: false, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }

    // 워커가 예외를 던지면 JSON 대신 오류 페이지가 돌아온다. 그대로 res.json() 을 부르면
    // 브라우저가 만든 파싱 오류(사파리는 "The string did not match the expected pattern.")가
    // 그대로 화면에 뜨는데, 무엇이 잘못됐는지 알 길이 없다 — 우리 형식으로 바꿔 돌려준다.
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return { success: false, error: `서버 응답을 읽지 못했습니다 (HTTP ${res.status}).` };
    }
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

/** "이 날의 순서는 이것이다". 같은 날 안에서 자리를 바꾼 것도, 다른 날에서
 *  끌어온 것도 도착한 날의 목록으로는 똑같이 표현된다 — 그래서 부르는 곳도 하나다. */
export const reorderLedgerEntries = (owner: Owner, date: string, ids: number[]) =>
    ledgerRequest(`/user/ledger/reorder${q(`date=${date}`, own(owner))}`, "POST", { ids });

/* 사용자가 만든 항목 — 칩으로 무엇을 보여줄지만 정한다. 지워도 과거 내역은 그대로 남는다. */
export type { StoredCategory };

export const getLedgerCategories = (owner: Owner) =>
    ledgerRequest(`/user/ledger/categories${q(own(owner))}`);

export const addLedgerCategory = (owner: Owner, kind: LedgerKind, label: string) =>
    ledgerRequest(`/user/ledger/categories${q(own(owner))}`, "POST", { kind, label });

/* 이름만 바꾼다. 내역은 이 항목의 id 를 가리키고 있어 한 행만 고치면 전부 따라온다. */
export const renameLedgerCategory = (owner: Owner, id: number, label: string) =>
    ledgerRequest(`/user/ledger/categories${q(`id=${id}`, own(owner))}`, "PUT", { label });

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
