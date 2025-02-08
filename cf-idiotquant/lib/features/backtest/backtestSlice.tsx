import { createAppSlice } from "@/lib/createAppSlice";
import { PayloadAction } from "@reduxjs/toolkit";

export interface BackTestConditionType1 {
    state: string;
    title: string;
    strategyList: string[];
    strategy: string;
}
export interface BackTestConditionType2 {
    state: string;
    title: string;
    startDate: string;
}
export interface BackTestConditionType3 {
    state: string;
    title: string;
    endDate: string;
}

interface BackTestInfo {
    state: "init"
    | "type1"
    | "type2"
    | "type3"
    ;
    backTestConditionType1: BackTestConditionType1;
    backTestConditionType2: BackTestConditionType2;
    backTestConditionType3: BackTestConditionType3;
}

const initialState: BackTestInfo = {
    state: "init",
    backTestConditionType1: {
        state: "init",
        title: "전략",
        strategyList: ["none", "NCAV"],
        strategy: "none",
    },
    backTestConditionType2: {
        state: "init",
        title: "시작날짜",
        startDate: "2004-04-01",
    },
    backTestConditionType3: {
        state: "init",
        title: "종료날짜",
        endDate: "2024-04-01",
    }
}
export const backtestSlice = createAppSlice({
    name: "backtest",
    initialState,
    reducers: (create) => ({
        setBackTestConditionType1: create.reducer((state, action: PayloadAction<BackTestConditionType1>) => {
            state.backTestConditionType1 = action.payload;
            state.state = "type1";
        }),
        setBackTestConditionType2: create.reducer((state, action: PayloadAction<BackTestConditionType2>) => {
            state.backTestConditionType2 = action.payload;
            state.state = "type2";
        }),
        setBackTestConditionType3: create.reducer((state, action: PayloadAction<BackTestConditionType3>) => {
            state.backTestConditionType3 = action.payload;
            state.state = "type3";
        })
        // getStartFinancialInfo: create.asyncThunk(
        //     async ({ year, quarter }: { year: string, quarter: string }) => {
        //         // console.log(`[getStartFinancialInfo]`, year, quarter);
        //         const res: any = await getFinancialInfo(year, quarter);
        //         return res;
        //     },
        //     {
        //         pending: (state) => {
        //             // console.log(`[getStartFinancialInfo] pending`);
        //             state.state = "loading";
        //         },
        //         fulfilled: (state, action) => {
        //             // console.log(`[getStartFinancialInfo] fulfilled - action.payload:`, action.payload);
        //             state.state = "loaded";
        //             state.startFinancialInfo = action.payload;
        //         },
        //         rejected: (state) => {
        //             // console.log(`[getStartFinancialInfo] rejected`);
        //             state.state = "get-rejected";
        //         }
        //     },
        // ),
        //     getStartMarketInfo: create.asyncThunk(
        //         async ({ date }: { date: string }) => {
        //             console.log(`[getStartMarketInfo]`, date);
        //             const res: any = await getMarketInfo(date);
        //             return res;
        //         },
        //         {
        //             pending: (state) => {
        //                 // console.log(`[getStartMarketInfo] pending`);
        //                 state.state = "loading";
        //             },
        //             fulfilled: (state, action) => {
        //                 // console.log(`[getStartMarketInfo] fulfilled - action.payload:`, action.payload);
        //                 state.state = "loaded";
        //                 state.startMarketInfo = action.payload;
        //             },
        //             rejected: (state) => {
        //                 // console.log(`[getStartMarketInfo] rejected`);
        //                 state.state = "get-rejected";
        //             }
        //         },
        //     ),
        //     getEndMarketInfo: create.asyncThunk(
        //         async ({ date }: { date: string }) => {
        //             // console.log(`[getEndMarketInfo]`, date);
        //             const res: any = await getMarketInfo(date);
        //             return res;
        //         },
        //         {
        //             pending: (state) => {
        //                 // console.log(`[getEndMarketInfo] pending`);
        //                 state.state = "loading";
        //             },
        //             fulfilled: (state, action) => {
        //                 // console.log(`[getEndMarketInfo] fulfilled - action.payload:`, action.payload);
        //                 state.state = "loaded";
        //                 state.endMarketInfo = action.payload;
        //             },
        //             rejected: (state) => {
        //                 // console.log(`[getEndMarketInfo] rejected`);
        //                 state.state = "get-rejected";
        //             }
        //         },
        //     ),
        //     setBackTestStrategyList: create.asyncThunk(
        //         async ({ financialInfoDate, marketInfoDate, ncavList }: { financialInfoDate: string, marketInfoDate: string, ncavList: string }) => {
        //             const res: any = await setNcavList(financialInfoDate, marketInfoDate, ncavList);
        //             return res;
        //         },
        //         {
        //             pending: (state) => {
        //                 state.state = "loading";
        //             },
        //             fulfilled: (state, action) => {
        //                 state.state = "loaded";
        //                 const json = JSON.parse(action.payload);
        //                 state.value = json;
        //             },
        //             rejected: (state) => {
        //                 state.state = "set-rejected";
        //             }
        //         },
        //     )
    }),
    selectors: {
        // selectStartFinancialInfo: (state) => state.startFinancialInfo,
        // selectStartMarketInfo: (state) => state.startMarketInfo,
        // selectEndMarketInfo: (state) => state.endMarketInfo,
        // selectBackTestState: (state) => state.state,
        // selectBackTestNcavList: (state) => state.value,
        getBackTestConditionType1: (state) => state.backTestConditionType1,
        getBackTestConditionType2: (state) => state.backTestConditionType2,
        getBackTestConditionType3: (state) => state.backTestConditionType3,
    }
});
export const { setBackTestConditionType1 } = backtestSlice.actions;
export const { getBackTestConditionType1 } = backtestSlice.selectors;
export const { setBackTestConditionType2 } = backtestSlice.actions;
export const { getBackTestConditionType2 } = backtestSlice.selectors;
export const { setBackTestConditionType3 } = backtestSlice.actions;
export const { getBackTestConditionType3 } = backtestSlice.selectors;
