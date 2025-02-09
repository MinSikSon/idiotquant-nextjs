import { createAppSlice } from "@/lib/createAppSlice";
import { getMarketInfo } from "../marketInfo/marketInfoAPI";
import { getFinancialInfo } from "../financialInfo/financialInfoAPI";
import { setNcavList } from "../strategy/strategyAPI";

interface BackTestInfo {
    state: "ready" | "loading" | "loaded" | "get-rejected" | "set-rejected" | "retry";
    startFinancialInfo: any;
    startMarketInfo: any;
    endMarketInfo: any;
    value: any;
}

const initialState: BackTestInfo = {
    state: "ready",
    startFinancialInfo: {},
    startMarketInfo: {},
    endMarketInfo: {},
    value: {},
}

export const backtestSlice = createAppSlice({
    name: "backtest",
    initialState,
    reducers: (create) => ({
        reqGetStartFinancialInfo: create.asyncThunk(
            async ({ year, quarter }: { year: string, quarter: string }) => {
                // console.log(`[reqGetStartFinancialInfo]`, year, quarter);
                const res: any = await getFinancialInfo(year, quarter);
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetStartFinancialInfo] pending`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetStartFinancialInfo] fulfilled - action.payload:`, action.payload);
                    state.state = "loaded";
                    state.startFinancialInfo = action.payload["output"];
                },
                rejected: (state) => {
                    // console.log(`[reqGetStartFinancialInfo] rejected`);
                    state.state = "get-rejected";
                }
            },
        ),
        getStartMarketInfo: create.asyncThunk(
            async ({ date }: { date: string }) => {
                console.log(`[getStartMarketInfo]`, date);
                const res: any = await getMarketInfo(date);
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`[getStartMarketInfo] pending`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    // console.log(`[getStartMarketInfo] fulfilled - action.payload:`, action.payload);
                    state.state = "loaded";
                    state.startMarketInfo = action.payload;
                },
                rejected: (state) => {
                    // console.log(`[getStartMarketInfo] rejected`);
                    state.state = "get-rejected";
                }
            },
        ),
        getEndMarketInfo: create.asyncThunk(
            async ({ date }: { date: string }) => {
                // console.log(`[getEndMarketInfo]`, date);
                const res: any = await getMarketInfo(date);
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`[getEndMarketInfo] pending`);
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    // console.log(`[getEndMarketInfo] fulfilled - action.payload:`, action.payload);
                    state.state = "loaded";
                    state.endMarketInfo = action.payload;
                },
                rejected: (state) => {
                    // console.log(`[getEndMarketInfo] rejected`);
                    state.state = "get-rejected";
                }
            },
        ),
        setBackTestStrategyList: create.asyncThunk(
            async ({ financialInfoDate, marketInfoDate, ncavList }: { financialInfoDate: string, marketInfoDate: string, ncavList: string }) => {
                const res: any = await setNcavList(financialInfoDate, marketInfoDate, ncavList);
                return res;
            },
            {
                pending: (state) => {
                    state.state = "loading";
                },
                fulfilled: (state, action) => {
                    state.state = "loaded";
                    const json = JSON.parse(action.payload);
                    state.value = json;
                },
                rejected: (state) => {
                    state.state = "set-rejected";
                }
            },
        )
    }),
    selectors: {
        selectStartFinancialInfo: (state) => state.startFinancialInfo,
        selectStartMarketInfo: (state) => state.startMarketInfo,
        selectEndMarketInfo: (state) => state.endMarketInfo,
        selectBackTestState: (state) => state.state,
        selectBackTestNcavList: (state) => state.value,
    }
});

export const { reqGetStartFinancialInfo, getStartMarketInfo, getEndMarketInfo } = backtestSlice.actions;
export const { selectStartFinancialInfo, selectStartMarketInfo, selectEndMarketInfo } = backtestSlice.selectors;

export const { setBackTestStrategyList } = backtestSlice.actions;
export const { selectBackTestNcavList } = backtestSlice.selectors;
