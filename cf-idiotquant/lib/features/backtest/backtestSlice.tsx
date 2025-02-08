import { createAppSlice } from "@/lib/createAppSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { getFinancialInfo, getFinancialInfoList } from "../financialInfo/financialInfoAPI";

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

interface BackTestConditionFilterResultTypeOutput {
    [date: string]: {
        value: string;
    }
}
export interface BackTestConditionFilterResultType {
    state: string;
    title: string;

    output: BackTestConditionFilterResultTypeOutput[];
}

export interface BackTestConditionFinancialInfoList {
    state: string;
    title: string;

    output1: any[];
    output2: any[];
}

interface BackTestInfo {
    state: "init"
    | "pending"
    | "fulfilled"
    | "rejected"
    | "type1"
    | "type2"
    | "type3"
    | "filter-result"
    ;
    backTestConditionType1: BackTestConditionType1;
    backTestConditionType2: BackTestConditionType2;
    backTestConditionType3: BackTestConditionType3;

    backTestConditionFilterResultType: BackTestConditionFilterResultType;
    backTestConditionFinancialInfoList: BackTestConditionFinancialInfoList;
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
    },
    backTestConditionFilterResultType: {
        state: "init",
        title: "필터결과",
        output: [],
    },
    backTestConditionFinancialInfoList: {
        state: "init",
        title: "재무정보 리스트",
        output1: [],
        output2: [],
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
        }),
        setBackTestConditionFilterResultType: create.reducer((state, action: PayloadAction<BackTestConditionFilterResultType>) => {
            state.backTestConditionFilterResultType = action.payload;
            state.state = "filter-result";
        }),
        reqGetFinancialInfoList: create.asyncThunk(
            // async ({ year, quarter }: { year: string, quarter: string }) => {
            async () => {
                // console.log(`[reqGetFinancialInfoList]`, year, quarter);
                const res: any = await getFinancialInfoList();
                // const res: any = await getFinancialInfo(year, quarter);
                return res;
            },
            {
                pending: (state) => {
                    console.log(`[reqGetFinancialInfoList] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetFinancialInfoList] fulfilled action.payload:`, typeof action.payload, action.payload);
                    state.backTestConditionFinancialInfoList.output1 = JSON.parse(action.payload);
                    const quarterMap: any = { "1Q": "03", "2Q": "06", "3Q": "09", "4Q": "12" };

                    const transformedData = JSON.parse(action.payload).map((item: any) => {
                        const match = item.match(/financialInfo_(\d+)_(\dQ)/); // "YYYY_XQ" 패턴 찾기
                        return match ? `${match[1]}${quarterMap[match[2]]}` : item; // "YYYYMM"으로 변환
                    });

                    state.backTestConditionFinancialInfoList.output2 = transformedData;
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetFinancialInfoList] rejected`);
                    state.state = "rejected";
                }
            },
        ),
        reqGetFinancialInfo: create.asyncThunk(
            async ({ year, quarter }: { year: string, quarter: string }) => {
                // console.log(`[reqGetStartFinancialInfo]`, year, quarter);
                const res: any = await getFinancialInfo(year, quarter);
                return res;
            },
            {
                pending: (state) => {
                    console.log(`[reqGetFinancialInfo] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetFinancialInfo] fulfilled action.payload:`, typeof action.payload, action.payload);
                    state.state = "fulfilled";
                    state.backTestConditionFilterResultType.output = [...state.backTestConditionFilterResultType.output, { "test": action.payload }];
                    // state.backTestConditionFilterResultType.state = "get-financial-info";
                },
                rejected: (state) => {
                    console.log(`[reqGetFinancialInfo] rejected`);
                    state.state = "rejected";
                }
            },
        ),
    }),
    selectors: {
        getBackTestConditionType1: (state) => state.backTestConditionType1,
        getBackTestConditionType2: (state) => state.backTestConditionType2,
        getBackTestConditionType3: (state) => state.backTestConditionType3,
        getBackTestConditionFilterResultType: (state) => state.backTestConditionFilterResultType,
        getBackTestConditionFinancialInfoList: (state) => state.backTestConditionFinancialInfoList,
    }
});
export const { setBackTestConditionType1 } = backtestSlice.actions;
export const { getBackTestConditionType1 } = backtestSlice.selectors;
export const { setBackTestConditionType2 } = backtestSlice.actions;
export const { getBackTestConditionType2 } = backtestSlice.selectors;
export const { setBackTestConditionType3 } = backtestSlice.actions;
export const { getBackTestConditionType3 } = backtestSlice.selectors;
export const { setBackTestConditionFilterResultType } = backtestSlice.actions;
export const { getBackTestConditionFilterResultType } = backtestSlice.selectors;

// request
export const { reqGetFinancialInfoList } = backtestSlice.actions;
export const { getBackTestConditionFinancialInfoList } = backtestSlice.selectors;
export const { reqGetFinancialInfo } = backtestSlice.actions;



