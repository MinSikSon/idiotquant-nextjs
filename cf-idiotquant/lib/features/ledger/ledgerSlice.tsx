import type { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getLedger, addLedgerEntry, deleteLedgerEntry, type LedgerEntry, type NewLedgerEntry } from "./ledgerAPI";

/** 사용자가 보는 달은 KST 기준이다 — UTC 로 세면 매달 1일 오전 9시 전에 지난달이 열린다. */
export function currentMonthKst(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

/** 최신 날짜가 위. 같은 날은 나중에 넣은 것이 위로 온다 (워커 ORDER BY 와 같은 기준). */
const byRecent = (a: LedgerEntry, b: LedgerEntry) =>
    b.entry_date.localeCompare(a.entry_date) || b.id - a.id;

interface LedgerState {
    state: "init" | "pending" | "fulfilled" | "rejected";
    month: string;              // 'YYYY-MM'
    entries: LedgerEntry[];
    mutating: boolean;
    error: string | null;
}

const initialState: LedgerState = {
    state: "init",
    month: currentMonthKst(),
    entries: [],
    mutating: false,
    error: null,
};

export const ledgerSlice = createAppSlice({
    name: "ledger",
    initialState,
    reducers: (create) => ({
        setLedgerMonth: create.reducer((state, action: PayloadAction<string>) => {
            state.month = action.payload;
        }),

        reqGetLedger: create.asyncThunk(
            async (month: string) => {
                const result = await getLedger(month);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.state = "pending"; state.error = null; },
                fulfilled: (state, action) => {
                    state.entries = (action.payload?.data ?? []) as LedgerEntry[];
                    state.state = "fulfilled";
                },
                rejected: (state, action) => {
                    state.state = "rejected";
                    state.error = action.error?.message ?? null;
                },
            }
        ),

        reqAddLedgerEntry: create.asyncThunk(
            async (entry: NewLedgerEntry) => {
                const result = await addLedgerEntry(entry);
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

        reqDeleteLedgerEntry: create.asyncThunk(
            async (id: number) => {
                const result = await deleteLedgerEntry(id);
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
        selectLedgerState: (state) => state.state,
        selectLedgerMutating: (state) => state.mutating,
        selectLedgerError: (state) => state.error,
    },
});

export const { setLedgerMonth, reqGetLedger, reqAddLedgerEntry, reqDeleteLedgerEntry } = ledgerSlice.actions;
export const {
    selectLedgerMonth,
    selectLedgerEntries,
    selectLedgerState,
    selectLedgerMutating,
    selectLedgerError,
} = ledgerSlice.selectors;
