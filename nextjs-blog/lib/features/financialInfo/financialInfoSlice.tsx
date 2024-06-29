import { createAppSlice } from "@/lib/createAppSlice";
import { getFinancialInfo } from "./financialInfoAPI";

interface FinancialInfo {
    state: "loading" | "loaded" | "rejected";
    loaded: boolean;
    value: any;
}
const initialState: FinancialInfo = {
    state: "loading",
    loaded: false,
    value: {}
}

export const financialInfoSlice = createAppSlice({
    name: "financial",
    initialState,
    reducers: (create) => ({
        initFinancialInfo: create.asyncThunk(
            async ({ year, quarter }: { year: string, quarter: string }) => {
                const res: any = await getFinancialInfo(year, quarter);
                // const res = "empty";
                return res;
            },
            {
                pending: (state) => {
                    state.state = "loading";
                    state.loaded = true;
                },
                fulfilled: (state, action) => {
                    console.log(`fulfilled`);
                    state.value = action.payload;
                    state.loaded = true;
                    // state.state = "loaded";
                },
                rejected: (state) => {
                    console.log(`rejected`);
                    state.state = "rejected";
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