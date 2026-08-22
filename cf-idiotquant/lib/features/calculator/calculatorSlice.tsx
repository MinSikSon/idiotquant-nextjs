import { createAppSlice } from "@/lib/createAppSlice";
import {
    getCalculatorRuns, addCalculatorRun, deleteCalculatorRun,
    type CalculatorRun, type NewCalculatorRun,
} from "./calculatorAPI";

interface CalculatorState {
    runs: CalculatorRun[];
    loaded: boolean;
    saving: boolean;
    error: string | null;
}

const initialState: CalculatorState = {
    runs: [],
    loaded: false,
    saving: false,
    error: null,
};

export const calculatorSlice = createAppSlice({
    name: "calculator",
    initialState,
    reducers: (create) => ({
        reqGetCalculatorRuns: create.asyncThunk(
            async () => {
                const result = await getCalculatorRuns();
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                fulfilled: (state, action) => {
                    state.runs = (action.payload?.data ?? []) as CalculatorRun[];
                    state.loaded = true;
                },
                // 저장 목록을 못 불러와도 계산기는 그대로 쓸 수 있다 — 화면을 막지 않는다.
                rejected: (state) => { state.loaded = true; },
            }
        ),

        reqAddCalculatorRun: create.asyncThunk(
            async (run: NewCalculatorRun) => {
                const result = await addCalculatorRun(run);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.saving = true; state.error = null; },
                fulfilled: (state, action) => {
                    state.saving = false;
                    const run = action.payload?.data as CalculatorRun | undefined;
                    if (!run) return;
                    // 워커도 서른 개까지만 들고 있는다 — 화면도 같은 수로 잘라 맞춘다.
                    state.runs = [run, ...state.runs].slice(0, 30);
                },
                rejected: (state, action) => {
                    state.saving = false;
                    state.error = action.error?.message ?? null;
                },
            }
        ),

        reqDeleteCalculatorRun: create.asyncThunk(
            async (id: number) => {
                const result = await deleteCalculatorRun(id);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return id;
            },
            {
                pending: (state) => { state.saving = true; state.error = null; },
                fulfilled: (state, action) => {
                    state.saving = false;
                    state.runs = state.runs.filter((r) => r.id !== action.payload);
                },
                rejected: (state, action) => {
                    state.saving = false;
                    state.error = action.error?.message ?? null;
                },
            }
        ),
    }),
    selectors: {
        selectCalculatorRuns: (state) => state.runs,
        selectCalculatorLoaded: (state) => state.loaded,
        selectCalculatorSaving: (state) => state.saving,
        selectCalculatorError: (state) => state.error,
    },
});

export const {
    reqGetCalculatorRuns, reqAddCalculatorRun, reqDeleteCalculatorRun,
} = calculatorSlice.actions;
export const {
    selectCalculatorRuns, selectCalculatorLoaded, selectCalculatorSaving, selectCalculatorError,
} = calculatorSlice.selectors;
