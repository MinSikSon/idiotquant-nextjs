import type { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import {
    getLedger, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
    getLedgerCategories, addLedgerCategory, deleteLedgerCategory,
    getLedgerAccess, createLedgerInvite,
    type LedgerEntry, type NewLedgerEntry, type LedgerAccess, type LedgerMember,
} from "./ledgerAPI";
import type { LedgerKind, StoredCategory } from "./categories";

/** 사용자가 보는 달은 KST 기준이다 — UTC 로 세면 매달 1일 오전 9시 전에 지난달이 열린다. */
export function currentMonthKst(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

/** thunk 안에서 "지금 보고 있는 가계부" 를 꺼낸다.
 *  store 를 import 하면 순환이 되므로 필요한 모양만 좁게 적는다. */
const ownerOf = (getState: () => unknown) =>
    (getState() as { ledger: { activeOwner: string | null } }).ledger.activeOwner;

/** 최신 날짜가 위. 같은 날은 나중에 넣은 것이 위로 온다 (워커 ORDER BY 와 같은 기준). */
const byRecent = (a: LedgerEntry, b: LedgerEntry) =>
    b.entry_date.localeCompare(a.entry_date) || b.id - a.id;

interface LedgerState {
    state: "init" | "pending" | "fulfilled" | "rejected";
    month: string;              // 'YYYY-MM'
    entries: LedgerEntry[];
    categories: StoredCategory[];   // 사용자가 만든 항목 (프리셋은 categories.ts 상수)
    /** null 이면 내 가계부. 값이 있으면 그 사람 가계부를 보고 있다. */
    activeOwner: string | null;
    ledgers: LedgerAccess[];        // 내가 볼 수 있는 가계부 (내 것이 항상 첫 번째)
    members: LedgerMember[];        // 내 가계부에 들어와 있는 사람들
    inviteToken: string | null;
    mutating: boolean;
    error: string | null;
}

const initialState: LedgerState = {
    state: "init",
    month: currentMonthKst(),
    entries: [],
    categories: [],
    activeOwner: null,
    ledgers: [],
    members: [],
    inviteToken: null,
    mutating: false,
    error: null,
};

export const ledgerSlice = createAppSlice({
    name: "ledger",
    initialState,
    reducers: (create) => ({
        setLedgerMonth: create.reducer((state, action: PayloadAction<string>) => {
            if (state.month === action.payload) return;
            state.month = action.payload;
            // 이전 달 내역을 비운다. 남겨두면 새 응답이 오기 전까지 8월 제목 아래에
            // 7월 합계가 떠 있게 된다 — 잠깐이라도 틀린 숫자를 보여주지 않는다.
            state.entries = [];
            state.state = "pending";
            state.error = null;
        }),

        reqGetLedger: create.asyncThunk(
            async (month: string, { getState }) => {
                const result = await getLedger(ownerOf(getState), month);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.state = "pending"; state.error = null; },
                // ◀▶ 를 연달아 누르면 먼저 보낸 요청이 나중에 도착할 수 있다. 그대로 반영하면
                // 화면은 8월인데 목록은 6월인 상태가 된다 — 지금 보고 있는 달의 응답만 받는다.
                fulfilled: (state, action) => {
                    if (action.meta.arg !== state.month) return;
                    state.entries = (action.payload?.data ?? []) as LedgerEntry[];
                    state.state = "fulfilled";
                },
                rejected: (state, action) => {
                    if (action.meta.arg !== state.month) return;
                    state.state = "rejected";
                    state.error = action.error?.message ?? null;
                },
            }
        ),

        reqAddLedgerEntry: create.asyncThunk(
            async (entry: NewLedgerEntry, { getState }) => {
                const result = await addLedgerEntry(ownerOf(getState), entry);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.mutating = true; state.error = null; },
                fulfilled: (state, action) => {
                    state.mutating = false;
                    const entry = action.payload?.data as LedgerEntry | undefined;
                    if (!entry) return;
                    // 보고 있는 달의 내역일 때만 목록에 얹는다. 다른 달이면 화면이 그 달로
                    // 옮겨가면서 다시 조회하므로 여기서 넣으면 잠깐 남의 달 내역이 섞인다.
                    if (entry.entry_date.startsWith(state.month)) {
                        state.entries = [entry, ...state.entries].sort(byRecent);
                    }
                },
                rejected: (state, action) => {
                    state.mutating = false;
                    state.error = action.error?.message ?? null;
                },
            }
        ),

        /* ── 공유 ── */

        /** 보는 가계부를 바꾼다. 달 전환과 같은 이유로 목록을 비운다 —
            남의 가계부 제목 아래에 내 합계가 잠깐이라도 떠 있으면 안 된다. */
        setActiveOwner: create.reducer((state, action: PayloadAction<string | null>) => {
            if (state.activeOwner === action.payload) return;
            state.activeOwner = action.payload;
            state.entries = [];
            state.categories = [];
            state.state = "pending";
            state.error = null;
        }),

        clearLedgerInvite: create.reducer((state) => { state.inviteToken = null; }),

        reqGetLedgerAccess: create.asyncThunk(
            async () => {
                const result = await getLedgerAccess();
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                fulfilled: (state, action) => {
                    state.ledgers = (action.payload?.data?.ledgers ?? []) as LedgerAccess[];
                    state.members = (action.payload?.data?.members ?? []) as LedgerMember[];
                    // 나가 있던 가계부에서 빠졌다면 내 것으로 되돌린다 — 아니면 계속 404 를 받는다.
                    if (state.activeOwner && !state.ledgers.some(l => l.owner_user_id === state.activeOwner)) {
                        state.activeOwner = null;
                        state.entries = [];
                        state.categories = [];
                    }
                },
                // 공유를 못 불러와도 내 가계부는 그대로 쓸 수 있다 — 화면을 막지 않는다.
                rejected: () => {},
            }
        ),

        reqCreateLedgerInvite: create.asyncThunk(
            async () => {
                const result = await createLedgerInvite();
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.mutating = true; state.error = null; state.inviteToken = null; },
                fulfilled: (state, action) => {
                    state.mutating = false;
                    state.inviteToken = (action.payload?.data?.token as string) ?? null;
                },
                rejected: (state, action) => {
                    state.mutating = false;
                    state.error = action.error?.message ?? null;
                },
            }
        ),

        /* ── 사용자 항목 ── 월과 무관해서 화면이 열릴 때 한 번만 부른다 ── */
        reqGetLedgerCategories: create.asyncThunk(
            async (_: void, { getState }) => {
                const result = await getLedgerCategories(ownerOf(getState));
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                fulfilled: (state, action) => {
                    state.categories = (action.payload?.data ?? []) as StoredCategory[];
                },
                // 항목을 못 불러와도 프리셋으로는 기입할 수 있다 — 화면을 막지 않는다.
                rejected: () => {},
            }
        ),

        reqAddLedgerCategory: create.asyncThunk(
            async ({ kind, label }: { kind: LedgerKind; label: string }, { getState }) => {
                const result = await addLedgerCategory(ownerOf(getState), kind, label);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.mutating = true; state.error = null; },
                fulfilled: (state, action) => {
                    state.mutating = false;
                    const category = action.payload?.data as StoredCategory | undefined;
                    if (!category) return;
                    // 같은 이름을 다시 넣으면 워커가 기존 행을 그대로 준다 — 중복으로 쌓지 않는다.
                    if (state.categories.some((c) => c.id === category.id)) return;
                    state.categories = [...state.categories, category];
                },
                rejected: (state, action) => {
                    state.mutating = false;
                    state.error = action.error?.message ?? null;
                },
            }
        ),

        reqDeleteLedgerCategory: create.asyncThunk(
            async (id: number, { getState }) => {
                const result = await deleteLedgerCategory(ownerOf(getState), id);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return id;
            },
            {
                pending: (state) => { state.mutating = true; state.error = null; },
                fulfilled: (state, action) => {
                    state.mutating = false;
                    state.categories = state.categories.filter((c) => c.id !== action.payload);
                },
                rejected: (state, action) => {
                    state.mutating = false;
                    state.error = action.error?.message ?? null;
                },
            }
        ),

        reqUpdateLedgerEntry: create.asyncThunk(
            async ({ id, entry }: { id: number; entry: NewLedgerEntry }, { getState }) => {
                const result = await updateLedgerEntry(ownerOf(getState), id, entry);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.mutating = true; state.error = null; },
                fulfilled: (state, action) => {
                    state.mutating = false;
                    const entry = action.payload?.data as LedgerEntry | undefined;
                    if (!entry) return;
                    // 날짜를 다른 달로 옮겼으면 이 달 목록에서 빠진다 — 화면이 그 달로
                    // 따라가면서 다시 조회하므로 여기서는 지우기만 한다.
                    if (!entry.entry_date.startsWith(state.month)) {
                        state.entries = state.entries.filter((e) => e.id !== entry.id);
                        return;
                    }
                    state.entries = state.entries
                        .map((e) => (e.id === entry.id ? entry : e))
                        .sort(byRecent);
                },
                rejected: (state, action) => {
                    state.mutating = false;
                    state.error = action.error?.message ?? null;
                },
            }
        ),

        reqDeleteLedgerEntry: create.asyncThunk(
            async (id: number, { getState }) => {
                const result = await deleteLedgerEntry(ownerOf(getState), id);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return id;
            },
            {
                pending: (state) => { state.mutating = true; state.error = null; },
                fulfilled: (state, action) => {
                    state.mutating = false;
                    state.entries = state.entries.filter((e) => e.id !== action.payload);
                },
                rejected: (state, action) => {
                    state.mutating = false;
                    state.error = action.error?.message ?? null;
                },
            }
        ),
    }),
    selectors: {
        selectLedgerMonth: (state) => state.month,
        selectLedgerEntries: (state) => state.entries,
        selectLedgerCategories: (state) => state.categories,
        selectActiveOwner: (state) => state.activeOwner,
        selectLedgerAccess: (state) => state.ledgers,
        selectLedgerMembers: (state) => state.members,
        selectLedgerInviteToken: (state) => state.inviteToken,
        selectLedgerState: (state) => state.state,
        selectLedgerMutating: (state) => state.mutating,
        selectLedgerError: (state) => state.error,
    },
});

export const {
    setLedgerMonth, reqGetLedger, reqAddLedgerEntry, reqUpdateLedgerEntry, reqDeleteLedgerEntry,
    reqGetLedgerCategories, reqAddLedgerCategory, reqDeleteLedgerCategory,
    setActiveOwner, clearLedgerInvite, reqGetLedgerAccess, reqCreateLedgerInvite,
} = ledgerSlice.actions;
export const {
    selectLedgerMonth,
    selectLedgerEntries,
    selectLedgerCategories,
    selectActiveOwner,
    selectLedgerAccess,
    selectLedgerMembers,
    selectLedgerInviteToken,
    selectLedgerState,
    selectLedgerMutating,
    selectLedgerError,
} = ledgerSlice.selectors;
