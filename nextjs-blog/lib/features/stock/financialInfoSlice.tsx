import { createAppSlice } from "@/lib/createAppSlice";
import { getFinancialInfo } from "./stockAPI";

interface FinancialInfo {
    state: "loading" | "loaded" | "failed";
    loaded: boolean;
    value: any;
}
const initialState: FinancialInfo = {
    state: "loading",
    loaded: false,
    value: []
}

export const financialInfoSlice = createAppSlice({
    name: "financial",
    initialState,
    reducers: (create) => ({
        initFinancialInfo: create.asyncThunk(
            async () => {
                const res = await getFinancialInfo("2023", "4");
                return res;
            },
            {
                pending: (state) => {
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    console.log(`fulfilled`);
                    state.state = "loaded";
                    state.loaded = true;
                    state.value = JSON.stringify(action.payload);
                },
                rejected: (state) => {
                    state.state = "failed";
                }
            }
        )
    }),
    selectors: {
        selectLoaded: (state) => state.loaded,
        selectFinancialInfo: (state) => state.value,
    }
});

export const { initFinancialInfo } = financialInfoSlice.actions;
export const { selectFinancialInfo, selectLoaded } = financialInfoSlice.selectors;