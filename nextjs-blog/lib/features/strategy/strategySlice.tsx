import { createAppSlice } from "@/lib/createAppSlice";
import { setNcavList, getNcavList } from "./strategyAPI";

interface StrategyInfo {
    state: "ready" | "loading" | "loaded" | "rejected" | "retry";
    value: any;
}
const initialState: StrategyInfo = {
    state: "ready",
    value: {}
}

export const strategySlice = createAppSlice({
    name: "strategy",
    initialState,
    reducers: (create) => ({
        setLoading: create.reducer((state) => {
            console.log(`[setRetry]`)
            state.state = "loading";
        }),
        setRetry: create.reducer((state) => {
            console.log(`[setRetry]`)
            state.state = "retry";
        }),
        getStrategyList: create.asyncThunk(
            async ({ financialInfoDate, marketInfoDate }: { financialInfoDate: string, marketInfoDate: string }) => {
                console.log(`[getStrategyList]`);
                const res: any = await getNcavList(`${financialInfoDate}.`, marketInfoDate);
                return res;
            },
            {
                pending: (state) => {
                    console.log(`[getStrategyList] pending`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    state.state = "loaded";
                    state.value = action.payload;
                    console.log(`[getStrategyList] fulfilled - action.payload:`, action.payload);
                },
                rejected: (state) => {
                    console.log(`[getStrategyList] rejected`);
                    state.state = "rejected";
                }
            },
        ),
        setStrategyList: create.asyncThunk(
            async ({ financialInfoDate, marketInfoDate, ncavList }: { financialInfoDate: string, marketInfoDate: string, ncavList: string[] }) => {
                console.log(`[setStrategyList]`);
                const res: any = await setNcavList(financialInfoDate, marketInfoDate, ncavList);
                return res;
            },
            {
                pending: (state) => {
                    console.log(`[setStrategyList] pending`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    state.state = "loaded";
                    state.value = action.payload;
                    console.log(`[setStrategyList] fulfilled - action.payload:`, action.payload);
                },
                rejected: (state) => {
                    console.log(`[setStrategyList] rejected`);
                    state.state = "rejected";
                }
            },
        )
    }),
    selectors: {
        selectNcavList: (state) => state.value,
        selectNcavListState: (state) => state.state,
    }
});

export const { getStrategyList, setStrategyList, setLoading, setRetry } = strategySlice.actions;
export const { selectNcavList, selectNcavListState, } = strategySlice.selectors;