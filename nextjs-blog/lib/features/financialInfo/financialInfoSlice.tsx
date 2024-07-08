import { createAppSlice } from "@/lib/createAppSlice";
import { getFinancialInfo, getFinancialInfoList, setFinancialInfoList } from "./financialInfoAPI";

interface FinancialInfo {
    state: "init"
    | "get-rejected"
    | "ready-financialInfoList"
    | "loading" | "loaded" | "rejected";
    loaded: boolean;
    financialInfoList: string[];
    value: any;
}
const initialState: FinancialInfo = {
    state: "init",
    loaded: false,
    financialInfoList: [],
    value: {}
}

export const financialInfoSlice = createAppSlice({
    name: "financial",
    initialState,
    reducers: (create) => ({
        getList: create.asyncThunk(
            async () => { return await getFinancialInfoList(); },
            {
                pending: (state) => {
                    // console.log(`[getList] pending`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    // console.log(`[getList] fulfilled`, action.payload, !!action.payload);
                    if (!!action.payload) {
                        state.financialInfoList = action.payload;
                        state.state = "ready-financialInfoList";
                    }
                    else {
                        state.state = "get-rejected";
                    }
                },
                rejected: (state) => {
                    // console.log(`[getList] rejected`);
                    state.state = "get-rejected";
                }
            }
        ),
        setList: create.asyncThunk(
            async (dateList: string[]) => { return await setFinancialInfoList(dateList); },
            {
                pending: (state) => { state.state = "loading"; },
                fulfilled: (state, action) => {
                    state.financialInfoList = action.payload;
                    state.state = "ready-financialInfoList";
                },
                rejected: (state) => { state.state = "rejected"; }
            }
        ),
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
                    // console.log(`fulfilled`);
                    state.value = action.payload;
                    state.loaded = true;
                    // state.state = "loaded";
                },
                rejected: (state) => {
                    // console.log(`rejected`);
                    state.state = "rejected";
                }
            }
        ),
    }),
    selectors: {
        selectLoaded: (state) => state.loaded,
        selectFinancialInfoState: (state) => state.state,
        selectFinancialInfoList: (state) => state.financialInfoList,
        selectFinancialInfo: (state) => state.value,
    }
});

export const { initFinancialInfo } = financialInfoSlice.actions;
export const { getList, setList } = financialInfoSlice.actions;
export const { selectFinancialInfo, selectFinancialInfoList, selectLoaded, selectFinancialInfoState } = financialInfoSlice.selectors;