import { createAppSlice } from "@/lib/createAppSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { getFinancialInfoList } from "../financialInfo/financialInfoAPI";
import { getFinancialInfoWithMarketInfo, getUsNcavLatest, getUsNcavList } from "./backtestAPI";
import { GetMergedStocksList, GetStocksFilteredByStrategyNCAV } from "@/components/strategy";

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
    min: string;
    max: string;
}
export interface BackTestConditionType3 {
    state: string;
    title: string;
    endDate: string;
    min: string;
    max: string;
}

export interface BackTestConditionFilterResultType {
    state: "init"
    | "loading"
    | "done"
    ;
    title: string;

    startDate: string;
    endDate: string;
    output: any;
    output2: any;
    output3: any;
}

export interface BackTestConditionFinancialInfoList {
    state: "init"
    | "loading"
    | "done"
    ;
    title: string;

    output1: any[];
    output2: string[];
}

export interface StrategyUsNcavListType {
    state: "init"
    | "pending"
    | "fulfilled"
    | "rejected"
    ;

    keys?: string[];
}

export interface StrategyUsNcavCanditateConditionType {
    AssetsCurrent: number;
    LastPrice: number;
    date: string;
    LiabilitiesCurrent: number;
    MarketCapitalization: number;
    NetIncome: number;
    bps: number;
    eps: number;
    pbr: number;
    per: number;
}
export interface CanditateType {
    condition: StrategyUsNcavCanditateConditionType;
    key: string;
    ncavRatio: string;
    symbol: string;
}
export interface DataSourceType {
    balanceSheet: string;     // ex) 'finnhub'
    prices: string;           // ex) 'koreainvestment'
    fetchedAt: string;        // ISO8601 datetime
}
export interface KvFilterType {
    year: string;
    quarter: string;
}
export interface NcavStrategyParamsType {
    ncavToMarketCapMin: number; // 최소 NCAV 비율
    minMarketCap: number;       // 최소 시가총액 (usd)
    minAvgVol30d: number;       // 최소 30일 평균 거래량
}
export interface StrategyUsNcavLatestItemType {

    asOfDate: string;
    candidates: Record<string, CanditateType>;
    dataSource: DataSourceType;
    key: string;
    kvFilter: KvFilterType;
    lastRun: any;
    lastSearchIndex: number;
    name: string;
    notes: string;
    numAllTickers: string;
    numAllKeys: number;
    numCandidates: number;
    numFilteredKeys: number;
    params: NcavStrategyParamsType;
    searchCountPerRequest: number
    status: string;
    strategyId: string;
    universe: string;
}
export interface StrategyUsNcavLatestType {
    state: "init"
    | "pending"
    | "fulfilled"
    | "rejected"
    ;

    list?: StrategyUsNcavLatestItemType[];
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

    // US NCAV
    strategyUsNcavList: StrategyUsNcavListType;
    strategyUsNcavLatest: StrategyUsNcavLatestType;
}

const initialState: BackTestInfo = {
    state: "init",
    backTestConditionType1: {
        state: "init",
        title: "전략",
        // strategyList: ["none", "NCAV"],
        strategyList: ["NCAV"],
        strategy: "NCAV",
    },
    backTestConditionType2: {
        state: "init",
        title: "시작날짜",
        startDate: "2018-12-01",
        min: "2018-12-01",
        max: "2024-11-30",
    },
    backTestConditionType3: {
        state: "init",
        title: "종료날짜",
        endDate: "2024-11-30",
        min: "2018-12-01",
        max: "2024-11-30",
    },
    backTestConditionFilterResultType: {
        state: "init",
        title: "필터결과",
        startDate: "",
        endDate: "",
        output: {},
        output2: {},
        output3: {},
    },
    backTestConditionFinancialInfoList: {
        state: "init",
        title: "재무정보 리스트",
        output1: [],
        output2: [],
    },
    strategyUsNcavList: {
        state: "init",
        keys: [],
    },
    strategyUsNcavLatest: {
        state: "init",
        list: [],
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
            console.log(`[setBackTestConditionFilterResultType] action.payload`, action.payload);
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
                    const quarterMap: any = { "1Q": "03", "2Q": "06", "3Q": "09", "4Q": "12" };
                    const transformedData = JSON.parse(action.payload).map((item: any) => {
                        const match = item.match(/financialInfo_(\d+)_(\dQ)/); // "YYYY_XQ" 패턴 찾기
                        return match ? `${match[1]}${quarterMap[match[2]]}` : item; // "YYYYMM"으로 변환
                    });

                    const output2 = [...state.backTestConditionFinancialInfoList.output2];
                    const condition = (JSON.stringify(output2) != JSON.stringify(transformedData)); // list 중복 갱신 방지
                    // if (condition)
                    {
                        console.log(`[reqGetFinancialInfoList] state.backTestConditionFinancialInfoList`, state.backTestConditionFinancialInfoList);
                        console.log(`[reqGetFinancialInfoList] output2`, typeof output2, output2);
                        console.log(`[reqGetFinancialInfoList] transformedData`, typeof transformedData, transformedData);
                        const newFinancialInfoList = { ...state.backTestConditionFinancialInfoList };
                        newFinancialInfoList.output1 = [...JSON.parse(action.payload)];
                        newFinancialInfoList.output2 = [...transformedData];
                        newFinancialInfoList.state = "loading";
                        console.log(`[reqGetFinancialInfoList] newFinancialInfoList`, typeof newFinancialInfoList, newFinancialInfoList);
                        state.backTestConditionFinancialInfoList = newFinancialInfoList;

                        state.state = "fulfilled";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGetFinancialInfoList] rejected`);
                    state.state = "rejected";
                }
            },
        ),
        reqGetFinancialInfoWithMarketInfo: create.asyncThunk(
            async ({ year, quarter }: { year: string, quarter: string }) => {
                // console.log(`[reqGetStartFinancialInfo]`, year, quarter);
                const res: any = await getFinancialInfoWithMarketInfo(year, quarter);
                return res;
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetFinancialInfo] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetFinancialInfo] fulfilled action.payload:`, typeof action.payload, action.payload);
                    state.state = "fulfilled";
                    const key: string = action.payload["yearQuarter"];
                    const output: any = action.payload["output"];
                    const output2: any = action.payload["output2"];
                    type OutputType = {
                        [key: string]: any;
                    }
                    let newFilterResultType = { ...state.backTestConditionFilterResultType };
                    let newDictionary: OutputType = { ...state.backTestConditionFilterResultType.output };
                    newDictionary[key] = output;
                    newFilterResultType.output = newDictionary;
                    // state.backTestConditionFilterResultType.output = newDictionary;
                    let newDictionary2: OutputType = { ...state.backTestConditionFilterResultType.output2 };
                    newDictionary2[key] = output2;
                    newFilterResultType.output2 = newDictionary2;
                    // state.backTestConditionFilterResultType.output2 = newDictionary2;

                    // filter list
                    if ("NCAV" == state.backTestConditionType1.strategy) {
                        let newDictionary3: OutputType = { ...state.backTestConditionFilterResultType.output3 };

                        const mergedStockInfo = GetMergedStocksList(output, output2);
                        // console.log(`mergedStockInfo`, mergedStockInfo, Object.keys(mergedStockInfo).length);
                        // filter: strategy
                        const filteredByStrategyStocks: any = GetStocksFilteredByStrategyNCAV(mergedStockInfo);
                        // console.log(`defaultStrategy`, defaultStrategy, filteredByStrategyStocks, Object.keys(filteredByStrategyStocks).length);

                        // filter: stock information
                        const filteredStocks = filteredByStrategyStocks;
                        // const filteredStocks = GetStocksFilteredByCustom(filteredByStrategyStocks, ["PER", "PBR", "시가총액최소값", "시가총액", "당기순이익"], [per, pbr, capitalizationMin, capitalization, netIncome]);
                        console.log(`filteredStocks`, filteredStocks, Object.keys(filteredStocks).length);

                        newDictionary3[key] = filteredStocks;
                        newFilterResultType.output3 = newDictionary3;
                        // state.backTestConditionFilterResultType.output3 = newDictionary3;
                    }

                    state.backTestConditionFilterResultType = newFilterResultType;

                },
                rejected: (state) => {
                    console.log(`[reqGetFinancialInfo] rejected`);
                    state.state = "rejected";
                }
            },
        ),
        reqGetUsNcavList: create.asyncThunk(
            async () => {
                // console.log(`[reqGetStartFinancialInfo]`, year, quarter);
                const res: any = await getUsNcavList();
                return res;
            },
            {
                pending: (state) => {
                    console.log(`[reqGetUsNcavList] pending`);
                    state.strategyUsNcavList.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetUsNcavList] fulfilled action.payload:`, typeof action.payload, action.payload);
                    state.strategyUsNcavList.keys = action.payload;
                    state.strategyUsNcavList.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetUsNcavList] rejected`);
                    state.strategyUsNcavList.state = "rejected";
                }
            },
        ),
        reqGetUsNcavLatest: create.asyncThunk(
            async () => {
                // console.log(`[reqGetStartFinancialInfo]`, year, quarter);
                const res: any = await getUsNcavLatest();
                return res;
            },
            {
                pending: (state) => {
                    console.log(`[reqGetUsNcavLatest] pending`);
                    state.strategyUsNcavLatest.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetUsNcavLatest] fulfilled action.payload:`, typeof action.payload, action.payload);
                    state.strategyUsNcavLatest.list = action.payload;
                    state.strategyUsNcavLatest.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetUsNcavLatest] rejected`);
                    state.strategyUsNcavLatest.state = "rejected";
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

        selectStrategyUsNcavList: (state) => state.strategyUsNcavList,
        selectStrategyUsNcavLatest: (state) => state.strategyUsNcavLatest,
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
export const { reqGetFinancialInfoWithMarketInfo } = backtestSlice.actions;

export const { reqGetUsNcavList } = backtestSlice.actions;
export const { selectStrategyUsNcavList } = backtestSlice.selectors;

export const { reqGetUsNcavLatest } = backtestSlice.actions;
export const { selectStrategyUsNcavLatest } = backtestSlice.selectors;


